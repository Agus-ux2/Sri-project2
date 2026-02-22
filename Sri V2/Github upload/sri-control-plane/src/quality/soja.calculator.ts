/**
 * Calculador de Calidad para SOJA
 * Norma XVII - Resolución SAGPyA 151/08
 * 
 * Características:
 * - NO tiene grados G1/G2/G3
 * - Descuentos progresivos complejos (granos quebrados)
 * - Escala lineal (granos verdes)
 * - Merma sobre cantidad (no sobre factor)
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, Grade, BonusDetail, DiscountDetail, QualityWarning } from '../types';

export class SojaQualityCalculator extends QualityCalculator {

  /**
   * Soja NO tiene grados G1/G2/G3
   */
  protected determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade> {
    return new Map(); // Soja no usa sistema de grados
  }

  protected calculateGradeFactor(grade: Grade): number {
    return 0; // Soja no tiene bonificación/descuento por grado
  }

  /**
   * Soja NO tiene bonificaciones (salvo casos especiales no implementados)
   */
  protected calculateBonuses(analysis: QualityAnalysis): BonusDetail[] {
    return [];
  }

  /**
   * Descuentos - La parte más compleja de Soja
   */
  protected calculateDiscounts(analysis: QualityAnalysis): DiscountDetail[] {
    const discounts: DiscountDetail[] = [];

    // 1. Materias Extrañas (Proporcional con escalas)
    const foreignMatterDiscount = this.calculateForeignMatterDiscount(
      analysis.foreign_matter
    );
    if (foreignMatterDiscount.discount_percent > 0) {
      discounts.push(foreignMatterDiscount);
    }

    // 2. Granos Dañados (Proporcional simple)
    if (analysis.damaged_grains > this.rules.parametros_base.granos_danados) {
      const base = this.rules.parametros_base.granos_danados;
      const excess = analysis.damaged_grains - base;
      const discount = excess * 1.0; // Factor 1.0

      discounts.push({
        concept: 'Granos Dañados',
        parameter: 'damaged_grains',
        value: analysis.damaged_grains,
        base: base,
        factor: 1.0,
        discount_percent: discount,
        calculation: `(${analysis.damaged_grains} - ${base}) × 1.0 = ${discount.toFixed(2)}%`
      });
    }

    // 3. Granos Verdes (Escala Lineal)
    if (analysis.green_grains) {
      const greenDiscount = this.calculateGreenGrainsDiscount(analysis.green_grains);
      if (greenDiscount.discount_percent > 0) {
        discounts.push(greenDiscount);
      }
    }

    // 4. Granos Quebrados (Progresivo complejo)
    if (analysis.broken_grains) {
      const brokenDiscount = this.calculateBrokenGrainsDiscount(analysis.broken_grains);
      if (brokenDiscount.discount_percent > 0) {
        discounts.push(brokenDiscount);
      }
    }

    // 5. Granos Negros
    if (analysis.black_grains && analysis.black_grains > 0.5) {
      const excess = analysis.black_grains - 0.5;
      const discount = excess * 1.5; // Factor 1.5

      discounts.push({
        concept: 'Granos Negros',
        parameter: 'black_grains',
        value: analysis.black_grains,
        base: 0.5,
        factor: 1.5,
        discount_percent: discount,
        calculation: `(${analysis.black_grains} - 0.5) × 1.5 = ${discount.toFixed(2)}%`
      });
    }

    return discounts;
  }

  /**
   * Materias Extrañas - Escalas progresivas
   * 
   * Base: 1.0%
   * - 1.0% a 3.0%: factor 1.0
   * - > 3.0%: factor 1.5
   */
  private calculateForeignMatterDiscount(value: number): DiscountDetail {
    const base = 1.0;
    const threshold = 3.0;

    if (value <= base) {
      return {
        concept: 'Materias Extrañas',
        parameter: 'foreign_matter',
        value,
        base,
        factor: 0,
        discount_percent: 0,
        calculation: 'Dentro de base, sin descuento'
      };
    }

    let discount = 0;
    const tiers: any[] = [];

    // Tramo 1: 1.0% a 3.0% (factor 1.0)
    if (value <= threshold) {
      discount = (value - base) * 1.0;
      tiers.push({
        from: base,
        to: value,
        factor: 1.0,
        amount: discount
      });
    } else {
      // Suma tramo 1 completo
      const tier1 = (threshold - base) * 1.0;
      discount += tier1;
      tiers.push({
        from: base,
        to: threshold,
        factor: 1.0,
        amount: tier1
      });

      // Tramo 2: > 3.0% (factor 1.5)
      const tier2 = (value - threshold) * 1.5;
      discount += tier2;
      tiers.push({
        from: threshold,
        to: value,
        factor: 1.5,
        amount: tier2
      });
    }

    return {
      concept: 'Materias Extrañas',
      parameter: 'foreign_matter',
      value,
      base,
      factor: value <= threshold ? 1.0 : 1.5,
      discount_percent: discount,
      progressive: true,
      tiers,
      calculation: value <= threshold
        ? `(${value} - ${base}) × 1.0 = ${discount.toFixed(2)}%`
        : `Tramo1: ${tiers[0].amount.toFixed(2)}% + Tramo2: ${tiers[1].amount.toFixed(2)}% = ${discount.toFixed(2)}%`
    };
  }

  /**
   * Granos Verdes - Escala Lineal
   * 
   * Base: 5.0%
   * Tolerancia: 10.0%
   * Factor: 0.2
   * 
   * Si > 5.0%: descuento = (valor - 5.0) × 0.2
   * Si > 10.0%: fuera de tolerancia (continúa con factor 0.2)
   */
  private calculateGreenGrainsDiscount(value: number): DiscountDetail {
    const base = 5.0;
    const tolerance = 10.0;
    const factor = 0.2;

    if (value <= base) {
      return {
        concept: 'Granos Verdes',
        parameter: 'green_grains',
        value,
        base,
        tolerance,
        factor: 0,
        discount_percent: 0,
        calculation: 'Dentro de base, sin descuento'
      };
    }

    const excess = value - base;
    const discount = excess * factor;

    return {
      concept: 'Granos Verdes (Escala Lineal)',
      parameter: 'green_grains',
      value,
      base,
      tolerance,
      factor,
      discount_percent: discount,
      calculation: `(${value} - ${base}) × ${factor} = ${discount.toFixed(2)}%`
    };
  }

  /**
   * Granos Quebrados - Progresivo MUY complejo
   * 
   * Base: 20.0%
   * Tolerancia: 30.0%
   * 
   * Escalas:
   * - 20% a 25%: factor 0.25
   * - 25% a 30%: factor 0.5
   * - > 30%: factor 0.75
   */
  private calculateBrokenGrainsDiscount(value: number): DiscountDetail {
    const base = 20.0;
    const tier1Max = 25.0;
    const tolerance = 30.0;

    if (value <= base) {
      return {
        concept: 'Granos Quebrados',
        parameter: 'broken_grains',
        value,
        base,
        tolerance,
        factor: 0,
        discount_percent: 0,
        calculation: 'Dentro de base, sin descuento'
      };
    }

    const tiers: Array<{ from: number; to: number; factor: number }> = [
      { from: 20.0, to: 25.0, factor: 0.25 },
      { from: 25.0, to: 30.0, factor: 0.5 },
      { from: 30.0, to: 999.0, factor: 0.75 }
    ];

    const result = this.calculateProgressiveDiscount(value, tiers);

    return {
      concept: 'Granos Quebrados (Progresivo)',
      parameter: 'broken_grains',
      value,
      base,
      tolerance,
      factor: 0, // Variable
      discount_percent: result.total,
      progressive: true,
      tiers: result.tiers,
      calculation: result.tiers
        .map(t => `[${t.from}-${t.to}]: ${t.amount.toFixed(2)}%`)
        .join(' + ') + ` = ${result.total.toFixed(2)}%`
    };
  }

  /**
   * Validaciones Fuera de Estándar
   */
  protected checkOutOfStandard(
    analysis: QualityAnalysis,
    condition: string
  ): QualityWarning | null {

    // "Humedad > 20.0"
    if (condition.includes('Humedad') && condition.includes('>')) {
      const threshold = parseFloat(condition.match(/[\d.]+/)?.[0] || '20');
      if (analysis.humidity > threshold) {
        return {
          type: 'out_of_standard',
          severity: 'critical',
          parameter: 'humidity',
          message: `Humedad ${analysis.humidity}% excede límite de ${threshold}%`,
          value: analysis.humidity,
          threshold
        };
      }
    }

    // "Insectos Vivos Presentes"
    if (condition.includes('Insectos')) {
      // Asumimos que si hay este campo en analysis, hay insectos
      // En producción esto vendría del análisis
      return null; // No implementado aún
    }

    // "Chamico > 5 cada 100g"
    if (condition.includes('Chamico')) {
      // Similar, no implementado
      return null;
    }

    return null;
  }
}

export default SojaQualityCalculator;
