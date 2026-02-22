/**
 * Validador de Liquidaciones
 * 
 * Implementa todas las validaciones:
 * - Diferencia de importe (umbral $100,000)
 * - Suma de CTGs = Cantidad total
 * - Rango de peso por CTG (15-38 Tn)
 * - Liquidación final pendiente (>30 días)
 * - Suma parcial + final = Subtotal
 */

import { Settlement, ValidationError, ValidationResult } from '../types';
import { logger } from '../utils/logger';
import db from '../db/client';

export class SettlementValidator {
  
  private readonly AMOUNT_THRESHOLD = 100000; // $100,000
  private readonly CTG_MIN_TONS = 15;
  private readonly CTG_MAX_TONS = 38;
  private readonly FINAL_DUE_DAYS = 30;
  
  /**
   * Validación completa de una liquidación
   */
  async validate(settlement: Settlement): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    try {
      // 1. Validar importe total (crítico)
      const amountValidation = await this.validateAmount(settlement);
      if (!amountValidation.valid) {
        errors.push(...amountValidation.errors);
      }
      warnings.push(...amountValidation.warnings);
      
      // 2. Validar CTGs
      const ctgValidation = this.validateCTGs(settlement);
      if (!ctgValidation.valid) {
        errors.push(...ctgValidation.errors);
      }
      warnings.push(...ctgValidation.warnings);
      
      // 3. Validar liquidación final (si es parcial)
      if (settlement.settlement_type === 'partial') {
        const finalValidation = await this.validateHasFinal(settlement);
        warnings.push(...finalValidation.warnings);
      }
      
      // 4. Validar suma parcial + final (si es final)
      if (settlement.settlement_type === 'final') {
        const sumValidation = await this.validatePartialPlusFinal(settlement);
        if (!sumValidation.valid) {
          errors.push(...sumValidation.errors);
        }
        warnings.push(...sumValidation.warnings);
      }
      
      // 5. Validar precio breakdown (si existe)
      if (settlement.price_breakdown) {
        const priceValidation = this.validatePriceBreakdown(settlement.price_breakdown);
        warnings.push(...priceValidation.warnings);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      logger.error('Error validating settlement', { error, coe: settlement.coe });
      
      errors.push({
        type: 'validation_error',
        severity: 'critical',
        message: 'Error during validation process',
        field: 'general'
      });
      
      return { valid: false, errors, warnings };
    }
  }
  
  /**
   * 1. Validar importe total
   * 
   * Umbral: $100,000 de diferencia
   */
  async validateAmount(settlement: Settlement): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Buscar contrato asociado
    const contract = await this.findContract(settlement);
    
    if (!contract) {
      warnings.push({
        type: 'contract_not_found',
        severity: 'warning',
        message: 'Contract not found, cannot validate amount',
        field: 'contract'
      });
      return { valid: true, errors, warnings };
    }
    
    // Calcular total liquidado (si hay múltiples liquidaciones del mismo contrato)
    const settlements = await this.getSettlementsByContract(contract.id);
    const totalLiquidated = settlements
      .filter(s => s.settlement_type !== 'adjustment')
      .reduce((sum, s) => sum + s.net_amount, 0);
    
    // Calcular diferencia
    const expectedAmount = contract.total_amount;
    const difference = Math.abs(totalLiquidated - expectedAmount);
    
    // Validar contra umbral
    if (difference >= this.AMOUNT_THRESHOLD) {
      errors.push({
        type: 'amount_mismatch',
        severity: 'critical',
        message: `Amount difference of $${difference.toFixed(2)} exceeds threshold of $${this.AMOUNT_THRESHOLD}`,
        field: 'net_amount',
        expected: expectedAmount,
        actual: totalLiquidated,
        difference: difference
      });
    } else if (difference > 0) {
      warnings.push({
        type: 'amount_difference',
        severity: 'info',
        message: `Amount difference of $${difference.toFixed(2)} within acceptable threshold`,
        field: 'net_amount',
        expected: expectedAmount,
        actual: totalLiquidated,
        difference: difference
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 2. Validar CTGs
   */
  validateCTGs(settlement: Settlement): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    if (!settlement.ctgs || settlement.ctgs.length === 0) {
      // No hay CTGs, no es necesariamente un error
      // (liquidaciones finales pueden no tener CTGs)
      if (settlement.settlement_type !== 'final' && settlement.settlement_type !== 'adjustment') {
        warnings.push({
          type: 'no_ctgs',
          severity: 'warning',
          message: 'No CTGs found in settlement',
          field: 'ctgs'
        });
      }
      return { valid: true, errors, warnings };
    }
    
    // Validación 1: Suma de CTGs = Cantidad total
    const totalCTGKg = settlement.ctgs.reduce((sum, ctg) => sum + ctg.quantity_kg, 0);
    const difference = Math.abs(totalCTGKg - settlement.quantity_kg);
    
    if (difference > 0.1) { // Tolerancia 0.1 Kg
      errors.push({
        type: 'ctg_quantity_mismatch',
        severity: 'critical',
        message: `Sum of CTGs (${totalCTGKg} Kg) does not match total quantity (${settlement.quantity_kg} Kg)`,
        field: 'ctgs',
        expected: settlement.quantity_kg,
        actual: totalCTGKg,
        difference: difference
      });
    }
    
    // Validación 2: Rango de peso por CTG
    settlement.ctgs.forEach((ctg, index) => {
      const tons = ctg.quantity_tons;
      
      if (tons < this.CTG_MIN_TONS || tons > this.CTG_MAX_TONS) {
        warnings.push({
          type: 'ctg_weight_out_of_range',
          severity: 'warning',
          message: `CTG ${ctg.ctg_number} weight (${tons.toFixed(1)} Tn) is outside normal range (${this.CTG_MIN_TONS}-${this.CTG_MAX_TONS} Tn)`,
          field: `ctgs[${index}]`,
          actual: tons
        });
      }
    });
    
    // Validación 3: CTGs únicos (no duplicados)
    const ctgNumbers = settlement.ctgs.map(ctg => ctg.ctg_number);
    const uniqueCTGs = new Set(ctgNumbers);
    
    if (uniqueCTGs.size !== ctgNumbers.length) {
      errors.push({
        type: 'duplicate_ctg',
        severity: 'critical',
        message: 'Duplicate CTG numbers found',
        field: 'ctgs'
      });
    }
    
    // Validación 4: Factores consistentes
    const factors = settlement.ctgs.map(ctg => ctg.factor);
    const uniqueFactors = new Set(factors);
    
    if (uniqueFactors.size > 1) {
      warnings.push({
        type: 'inconsistent_factors',
        severity: 'info',
        message: `Multiple different factors found across CTGs: ${Array.from(uniqueFactors).join(', ')}`,
        field: 'ctgs'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 3. Validar que parcial tenga final (después de 30 días)
   */
  async validateHasFinal(settlement: Settlement): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Buscar liquidación final
    const final = await db.query(
      `SELECT * FROM settlements
       WHERE original_coe = $1
       AND settlement_type IN ('final', 'adjustment')`,
      [settlement.coe]
    );
    
    if (final.rowCount === 0) {
      // No hay final, verificar si ya pasaron 30 días
      const daysSince = this.daysBetween(settlement.settlement_date, new Date());
      
      if (daysSince > this.FINAL_DUE_DAYS) {
        warnings.push({
          type: 'missing_final',
          severity: 'warning',
          message: `Final settlement pending for ${daysSince - this.FINAL_DUE_DAYS} days (overdue)`,
          field: 'original_coe',
          actual: daysSince
        });
      } else {
        warnings.push({
          type: 'final_pending',
          severity: 'info',
          message: `Final settlement expected within ${this.FINAL_DUE_DAYS - daysSince} days`,
          field: 'original_coe'
        });
      }
    } else if (final.rowCount > 1) {
      warnings.push({
        type: 'multiple_finals',
        severity: 'warning',
        message: `Multiple final settlements found (${final.rowCount})`,
        field: 'original_coe'
      });
    }
    
    return {
      valid: true, // No es error crítico
      errors,
      warnings
    };
  }
  
  /**
   * 4. Validar suma parcial + final
   */
  async validatePartialPlusFinal(settlement: Settlement): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    if (!settlement.original_coe) {
      warnings.push({
        type: 'no_original_coe',
        severity: 'warning',
        message: 'Final settlement without reference to original partial',
        field: 'original_coe'
      });
      return { valid: true, errors, warnings };
    }
    
    // Buscar liquidación parcial
    const partial = await db.query(
      `SELECT * FROM settlements WHERE coe = $1`,
      [settlement.original_coe]
    );
    
    if (partial.rowCount === 0) {
      errors.push({
        type: 'partial_not_found',
        severity: 'critical',
        message: `Original partial settlement ${settlement.original_coe} not found`,
        field: 'original_coe',
        expected: settlement.original_coe
      });
      return { valid: false, errors, warnings };
    }
    
    const partialData = partial.rows[0];
    
    // Validar suma
    const totalPaid = partialData.net_amount + settlement.net_amount;
    const expectedTotal = partialData.subtotal;
    const difference = Math.abs(totalPaid - expectedTotal);
    
    // Umbral: 1% o $100,000 (el menor)
    const percentThreshold = expectedTotal * 0.01;
    const threshold = Math.min(percentThreshold, this.AMOUNT_THRESHOLD);
    
    if (difference > threshold) {
      errors.push({
        type: 'partial_final_sum_mismatch',
        severity: 'critical',
        message: `Sum of partial + final (${totalPaid.toFixed(2)}) does not match expected total (${expectedTotal.toFixed(2)})`,
        field: 'net_amount',
        expected: expectedTotal,
        actual: totalPaid,
        difference: difference
      });
    } else if (difference > 0) {
      warnings.push({
        type: 'partial_final_difference',
        severity: 'info',
        message: `Small difference in partial + final sum: $${difference.toFixed(2)}`,
        field: 'net_amount',
        difference: difference
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 5. Validar price breakdown
   */
  validatePriceBreakdown(priceBreakdown: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Validar que los cálculos coincidan
    if (priceBreakdown.calculation_matches === false) {
      warnings.push({
        type: 'price_calculation_mismatch',
        severity: 'warning',
        message: 'Calculated price does not match document price (rounding differences)',
        field: 'price_breakdown',
        expected: priceBreakdown.net_price_per_ton_document,
        actual: priceBreakdown.net_price_per_ton,
        difference: Math.abs(
          priceBreakdown.net_price_per_ton - (priceBreakdown.net_price_per_ton_document || 0)
        )
      });
    }
    
    return {
      valid: true,
      errors,
      warnings
    };
  }
  
  /**
   * Helpers
   */
  
  private async findContract(settlement: Settlement): Promise<any | null> {
    try {
      // Buscar por número de contrato en price_breakdown
      if (settlement.price_breakdown?.contract_number) {
        const result = await db.query(
          `SELECT * FROM contracts WHERE contract_number = $1`,
          [settlement.price_breakdown.contract_number]
        );
        
        if (result.rowCount > 0) {
          return result.rows[0];
        }
      }
      
      // TODO: Implementar otros métodos de búsqueda
      // (por vendedor, fecha, producto, etc.)
      
      return null;
    } catch (error) {
      logger.error('Error finding contract', { error });
      return null;
    }
  }
  
  private async getSettlementsByContract(contractId: string): Promise<Settlement[]> {
    try {
      const result = await db.query(
        `SELECT * FROM settlements WHERE contract_id = $1`,
        [contractId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting settlements by contract', { error });
      return [];
    }
  }
  
  private daysBetween(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

export default new SettlementValidator();
