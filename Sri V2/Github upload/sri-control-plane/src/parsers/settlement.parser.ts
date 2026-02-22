/**
 * Parser Completo de Liquidaciones Primarias de Granos
 * 
 * Implementa toda la lógica validada:
 * - Identificación de tipo por cantidad (0 Kg = final/ajuste)
 * - Factor de calidad aplicado correctamente
 * - Orden de descuentos: Comercial → Factor → Flete
 * - Desglose de descuento comercial (comisión + paritarias)
 * - Múltiples CTGs por liquidación
 * - Grado FG cuando factor ≠ 100
 */

import { ParsedDocument, Settlement, CTG, PriceBreakdown } from '../types';
import { logger } from '../utils/logger';

export class SettlementParser {

  /**
   * Parser principal
   */
  parse(document: ParsedDocument): Settlement {
    logger.info('Parsing settlement', { coe: document.coe });

    try {
      // 1. Identificar tipo de liquidación
      const settlementType = this.identifySettlementType(document);

      // 2. Extraer datos básicos
      const basicData = this.extractBasicData(document);

      // 3. Extraer operación
      const operation = this.extractOperation(document);

      // 4. Extraer deducciones y retenciones
      const deductions = this.extractDeductions(document);
      const withholdings = this.extractWithholdings(document);

      // 5. Extraer CTGs
      const ctgs = this.extractCTGs(document);

      // 6. Extraer datos adicionales y desglosar precios
      const priceBreakdown = this.extractPriceBreakdown(document);

      // 7. Calcular porcentajes (si es parcial)
      const percentages = settlementType === 'partial'
        ? this.calculatePercentages(deductions, operation.subtotal)
        : null;

      // 8. Extraer vinculación (si es final/ajuste)
      const linking = ['final', 'adjustment'].includes(settlementType)
        ? this.extractLinking(document)
        : null;

      // 9. Determinar si es operación en canje (IVA $0)
      const isCanje = this.detectCanje(document);

      // 10. Ensamblar resultado
      const settlement: Settlement = {
        // Identificación
        id: this.generateId(),
        coe: basicData.coe,
        settlement_type: settlementType,
        settlement_date: basicData.date,

        // Partes
        buyer_cuit: basicData.buyer_cuit,
        buyer_name: basicData.buyer_name,
        seller_cuit: basicData.seller_cuit,
        seller_name: basicData.seller_name,
        broker_cuit: basicData.broker_cuit,
        broker_name: basicData.broker_name,

        // Producto
        product: operation.product,
        contracted_grade: operation.contracted_grade,
        delivered_grade: operation.delivered_grade,
        quality_factor: operation.factor,
        protein_content: operation.protein_content,

        // Operación
        quantity_kg: operation.quantity_kg,
        price_per_kg: operation.price_per_kg,
        subtotal: operation.subtotal,

        // Montos
        iva_rate: operation.iva_rate,
        iva_amount: operation.iva_amount,
        total_operation: operation.total_operation,
        total_deductions: this.sumDeductions(deductions),
        total_withholdings: this.sumWithholdings(withholdings),
        net_amount: operation.net_amount,

        // Porcentajes (si parcial)
        percentage_liquidated: percentages?.liquidated,
        percentage_retained: percentages?.retained,
        retained_amount: percentages?.amount,

        // Vinculación (si final/ajuste)
        original_coe: linking?.original_coe,
        adjustment_type: linking?.adjustment_type as any,

        // Desglose de precios
        price_breakdown: priceBreakdown,

        // CTGs
        ctgs: ctgs,
        total_ctgs: ctgs.length,

        // Deducciones y retenciones
        deductions: deductions,
        withholdings: withholdings,

        // Flags
        is_canje: isCanje,
        is_out_of_grade: operation.factor !== 100,

        // Metadata
        additional_data: document.datos_adicionales,
        raw_data: document,

        // Timestamps
        created_at: new Date(),
        updated_at: new Date()
      };

      logger.info('Settlement parsed successfully', {
        coe: settlement.coe,
        type: settlement.settlement_type,
        amount: settlement.net_amount
      });

      return settlement;

    } catch (error) {
      logger.error('Error parsing settlement', { error, coe: document.coe });
      throw error;
    }
  }

  /**
   * 1. Identificar tipo de liquidación
   * 
   * REGLA DE ORO: Cantidad = 0 Kg → FINAL o AJUSTE
   */
  private identifySettlementType(doc: ParsedDocument): 'unique' | 'partial' | 'final' | 'adjustment' {
    const quantity = doc.operacion.cantidad_kg;

    // Cantidad = 0 → FINAL o AJUSTE
    if (quantity === 0) {
      // Verificar si es ajuste por tipo de operación
      if (doc.tipo_operacion.toLowerCase().includes('ajuste')) {
        return 'adjustment';
      }
      return 'final';
    }

    // Cantidad > 0 → ÚNICA o PARCIAL
    // Buscar retención en deducciones
    const hasRetention = doc.deducciones?.some(d =>
      d.detalle.toLowerCase().includes('cobrar en liquid') ||
      d.detalle.toLowerCase().includes('a cobrar en final')
    );

    if (hasRetention) {
      return 'partial';
    }

    return 'unique';
  }

  /**
   * 2. Extraer datos básicos
   */
  private extractBasicData(doc: ParsedDocument) {
    return {
      coe: doc.coe,
      date: this.parseDate(doc.fecha),
      buyer_cuit: doc.comprador.cuit,
      buyer_name: doc.comprador.razon_social,
      seller_cuit: doc.vendedor.cuit,
      seller_name: doc.vendedor.razon_social,
      broker_cuit: doc.corredor?.cuit,
      broker_name: doc.corredor?.razon_social
    };
  }

  /**
   * 3. Extraer operación
   */
  private extractOperation(doc: ParsedDocument) {
    const op = doc.operacion;

    // Determinar grado entregado
    const deliveredGrade = this.determineDeliveredGrade(
      doc.mercaderia_entregada,
      op.grado
    );

    return {
      product: op.grano,
      contracted_grade: doc.condiciones_operacion.grado,
      delivered_grade: deliveredGrade,
      factor: this.extractFactor(doc.mercaderia_entregada),
      protein_content: this.extractProteinContent(doc.mercaderia_entregada),

      quantity_kg: op.cantidad_kg,
      price_per_kg: op.precio_kg,
      subtotal: op.subtotal,

      iva_rate: op.alicuota_iva,
      iva_amount: op.importe_iva,
      total_operation: op.operacion_con_iva,

      net_amount: doc.importes_totales.importe_neto_pagar
    };
  }

  /**
   * Determinar grado entregado
   * 
   * Regla: Si factor ≠ 100 → FG (Fuera de Grado)
   */
  private determineDeliveredGrade(
    mercaderiaEntregada: any[],
    contractedGrade: string
  ): string {
    // Obtener factor del primer CTG (asumimos todos iguales)
    const factor = mercaderiaEntregada[0]?.factor || 100;

    if (factor === 100) {
      return contractedGrade; // Grado exacto
    }

    // Factor ≠ 100 → Fuera de Grado
    return 'FG';
  }

  /**
   * Extraer factor promedio de CTGs
   */
  private extractFactor(mercaderiaEntregada: any[]): number {
    if (!mercaderiaEntregada || mercaderiaEntregada.length === 0) {
      return 100;
    }

    // Calcular promedio de factores
    const factors = mercaderiaEntregada
      .map(m => m.factor)
      .filter(f => f != null);

    if (factors.length === 0) {
      return 100;
    }

    const avgFactor = factors.reduce((sum, f) => sum + f, 0) / factors.length;
    return Math.round(avgFactor * 1000) / 1000; // 3 decimales
  }

  /**
   * Extraer contenido proteico
   */
  private extractProteinContent(mercaderiaEntregada: any[]): number {
    if (!mercaderiaEntregada || mercaderiaEntregada.length === 0) {
      return 0;
    }

    const proteins = mercaderiaEntregada
      .map(m => m.contenido_proteico)
      .filter(p => p != null && p > 0);

    if (proteins.length === 0) {
      return 0;
    }

    return proteins.reduce((sum, p) => sum + p, 0) / proteins.length;
  }

  /**
   * 4. Extraer deducciones
   */
  private extractDeductions(doc: ParsedDocument) {
    if (!doc.deducciones) return [];

    return doc.deducciones.map(d => ({
      concept: d.concepto,
      detail: d.detalle,
      percentage: d.porcentaje,
      base_amount: d.base_calculo,
      iva_rate: d.alicuota,
      iva_amount: d.importe_iva,
      amount: d.deducciones
    }));
  }

  /**
   * 5. Extraer retenciones
   */
  private extractWithholdings(doc: ParsedDocument) {
    if (!doc.retenciones) return [];

    return doc.retenciones.map(r => ({
      concept: r.concepto,
      detail: r.detalle,
      certificate: r.certificado_retencion,
      certificate_amount: r.importe_certificado,
      certificate_date: r.fecha_certificado,
      base_amount: r.base_calculo,
      rate: r.alicuota,
      amount: r.retenciones
    }));
  }

  /**
   * 6. Extraer CTGs
   */
  private extractCTGs(doc: ParsedDocument): CTG[] {
    if (!doc.mercaderia_entregada) return [];

    return doc.mercaderia_entregada.map(m => ({
      ctg_number: m.numero_comprobante,
      quantity_kg: m.peso_kg,
      quantity_tons: m.peso_kg / 1000,
      grade: m.grado,
      factor: m.factor,
      protein_content: m.contenido_proteico,
      origin: m.procedencia,

      // Validaciones
      is_within_range: this.isWithinCTGRange(m.peso_kg / 1000)
    }));
  }

  /**
   * Validar rango de CTG (15-38 Tn)
   */
  private isWithinCTGRange(tons: number): boolean {
    return tons >= 15 && tons <= 38;
  }

  /**
   * 7. Extraer y desglosar precios de Datos Adicionales
   * 
   * ORDEN CORRECTO:
   * 1. Precio Base
   * 2. - Descuento Comercial (comisión + paritarias)
   * 3. × Factor (calidad)
   * 4. - Flete
   */
  private extractPriceBreakdown(doc: ParsedDocument): PriceBreakdown | null {
    const additionalData = doc.datos_adicionales;
    if (!additionalData) return null;

    try {
      // Extraer valores
      const contractMatch = additionalData.match(/Contrato:(\d+)/);
      const priceMatch = additionalData.match(/Precio:\s*([\d,\.]+)\$\/TN/);
      const factorMatch = additionalData.match(/Factor:\s*(-?[\d,\.]+)/);
      const discountMatch = additionalData.match(/Desc\.Comercial:\s*(-?[\d,\.]+)\$\/TN/);
      const freightMatch = additionalData.match(/Flete:\s*(-?[\d,\.]+)\$\/TN/);
      const netPriceMatch = additionalData.match(/Px Neto:\s*([\d,\.]+)\$\/TN/);

      if (!priceMatch) return null;

      const basePrice = this.parseNumber(priceMatch[1]);
      const factorAdjustment = factorMatch ? this.parseNumber(factorMatch[1]) : 0;
      const commercialDiscount = discountMatch ? Math.abs(this.parseNumber(discountMatch[1])) : 0;
      const freight = freightMatch ? Math.abs(this.parseNumber(freightMatch[1])) : 0;
      const netPrice = netPriceMatch ? this.parseNumber(netPriceMatch[1]) : null;

      // Obtener factor de la mercadería
      const factor = this.extractFactor(doc.mercaderia_entregada);

      // Calcular paso a paso (ORDEN CORRECTO)

      // Paso 1: Descuento Comercial
      const priceAfterCommercial = basePrice - commercialDiscount;

      // Desglosar descuento comercial
      const commission = basePrice * 0.01; // Comisión 1%
      const paritarias = commercialDiscount - commission;

      // Paso 2: Factor de Calidad
      const priceAfterFactor = priceAfterCommercial * (factor / 100);
      const calculatedFactorAdjustment = priceAfterFactor - priceAfterCommercial;

      // Paso 3: Flete
      const finalNetPrice = priceAfterFactor - freight;

      return {
        contract_number: contractMatch?.[1],

        // Precio base
        base_price_per_ton: basePrice,

        // Paso 1: Descuento Comercial
        commercial_discount: {
          total: commercialDiscount,
          commission: commission,
          paritarias: paritarias > 0 ? paritarias : null
        },
        price_after_commercial: priceAfterCommercial,

        // Paso 2: Factor de Calidad
        quality_factor: factor,
        factor_adjustment: calculatedFactorAdjustment,
        factor_adjustment_document: factorAdjustment, // Del documento (puede variar por redondeos)
        price_after_factor: priceAfterFactor,

        // Paso 3: Flete
        freight: freight,

        // Resultado
        net_price_per_ton: finalNetPrice,
        net_price_per_ton_document: netPrice, // Del documento (puede variar por redondeos)
        net_price_per_kg: finalNetPrice / 1000,

        // Validación
        calculation_matches: netPrice ? Math.abs(finalNetPrice - netPrice) < 1 : null
      };

    } catch (error) {
      logger.error('Error extracting price breakdown', { error });
      return null;
    }
  }

  /**
   * 8. Calcular porcentajes de liquidación (para parciales)
   */
  private calculatePercentages(deductions: any[], subtotal: number) {
    // Buscar deducción de retención
    const retention = deductions.find(d =>
      d.detail.toLowerCase().includes('cobrar en liquid') ||
      d.detail.toLowerCase().includes('a cobrar en final')
    );

    if (!retention) {
      return null;
    }

    const retainedAmount = retention.amount;
    const percentageRetained = (retainedAmount / subtotal) * 100;
    const percentageLiquidated = 100 - percentageRetained;

    return {
      liquidated: Math.round(percentageLiquidated * 10) / 10,
      retained: Math.round(percentageRetained * 10) / 10,
      amount: retainedAmount
    };
  }

  /**
   * 9. Extraer vinculación (para finales/ajustes)
   */
  private extractLinking(doc: ParsedDocument) {
    const additionalData = doc.datos_adicionales;
    if (!additionalData) return null;

    // Método 1: Campo COE ORIGINAL
    const coeOriginalMatch = additionalData.match(/COE ORIGINAL:\s*(\d+)/i);
    if (coeOriginalMatch) {
      return {
        original_coe: coeOriginalMatch[1],
        adjustment_type: this.identifyAdjustmentType(additionalData)
      };
    }

    // Método 2: "Parcial: XXXX-XXXXXXX"
    const parcialMatch = additionalData.match(/Parcial:\s*(\d+)-(\d+)/i);
    if (parcialMatch) {
      return {
        original_coe: parcialMatch[1] + parcialMatch[2],
        adjustment_type: this.identifyAdjustmentType(additionalData)
      };
    }

    return null;
  }

  /**
   * Identificar tipo de ajuste
   */
  private identifyAdjustmentType(additionalData: string): string | null {
    const lower = additionalData.toLowerCase();

    if (lower.includes('devol') || lower.includes('saldo pte')) {
      return 'final_settlement';
    }
    if (lower.includes('bonif')) {
      return 'quality_bonus';
    }
    if (lower.includes('descuento')) {
      return 'quality_discount';
    }
    if (lower.includes('error') || lower.includes('corrección')) {
      return 'correction';
    }
    if (lower.includes('ajuste pe')) {
      return 'technical_adjustment';
    }

    return 'other';
  }

  /**
   * 10. Detectar operación en canje (IVA $0)
   */
  private detectCanje(doc: ParsedDocument): boolean {
    const additionalData = doc.datos_adicionales?.toLowerCase() || '';

    return additionalData.includes('canje') ||
      additionalData.includes('pago en especie') ||
      doc.operacion.importe_iva === 0;
  }

  /**
   * Helpers
   */
  private sumDeductions(deductions: any[]): number {
    return deductions.reduce((sum, d) => sum + d.amount, 0);
  }

  private sumWithholdings(withholdings: any[]): number {
    return withholdings.reduce((sum, w) => sum + w.amount, 0);
  }

  private parseDate(dateStr: string): Date {
    // Formato esperado: "DD/MM/YYYY" o similar
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[2]), // año
        parseInt(parts[1]) - 1, // mes (0-indexed)
        parseInt(parts[0]) // día
      );
    }
    return new Date(dateStr);
  }

  private parseNumber(str: string): number {
    return parseFloat(str.replace(',', '.'));
  }

  private generateId(): string {
    return `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new SettlementParser();
