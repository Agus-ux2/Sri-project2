/**
 * Calculador de Calidad para GIRASOL
 * Norma IX - Resolución SAGPyA (también conocida como Norma XV)
 * 
 * Características:
 * - NO tiene grados G1/G2/G3
 * - Materia Grasa: bonificación/rebaja lineal bidireccional
 * - Acidez: descuento progresivo según época del año
 * - Base de humedad más baja (11.0%)
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, Grade, BonusDetail, DiscountDetail, QualityWarning } from '../types';

export class GirasolQualityCalculator extends QualityCalculator {

  /**
   * Girasol NO tiene grados G1/G2/G3
   */
  protected determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade> {
    return new Map(); // Girasol no usa sistema de grados
  }

  protected calculateGradeFactor(grade: Grade): number {
    return 0; // Girasol no tiene bonificación/descuento por grado
  }

  /**
   * Bonificaciones - Materia Grasa (Lineal bidireccional)
   * 
   * Base: 42.0%
   * Factor: 2.0
   * 
   * Si > 42%: bonifica
   * Si < 42%: rebaja
   */
  protected calculateBonuses(analysis: QualityAnalysis): BonusDetail[] {
    const bonuses: BonusDetail[] = [];

    if (!analysis.fat_content) {
      return bonuses;
    }

    const BASE = 42.0;
    const FACTOR = 2.0;

    const difference = analysis.fat_content - BASE;
    const adjustment = difference * FACTOR;

    if (adjustment !== 0) {
      bonuses.push({
        concept: 'Materia Grasa',
        parameter: 'fat_content',
        value: analysis.fat_content,
        base: BASE,
        factor: FACTOR,
        bonus_percent: adjustment,
        calculation: `(${analysis.fat_content} - ${BASE}) × ${FACTOR} = ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}%`
      });
    }

    return bonuses;
  }

  /**
   * Descuentos
   * 
   * 1. Materias Extrañas: base 3.0%, factor 1.0
   * 2. Acidez: progresivo según época del año (factor 2.5)
   */
  protected calculateDiscounts(analysis: QualityAnalysis): DiscountDetail[] {
    const discounts: DiscountDetail[] = [];

    // 1. Materias Extrañas
    const foreignBase = 3.0;
    if (analysis.foreign_matter > foreignBase) {
      const excess = analysis.foreign_matter - foreignBase;
      const discount = excess * 1.0;

      discounts.push({
        concept: 'Materias Extrañas',
        parameter: 'foreign_matter',
        value: analysis.foreign_matter,
        base: foreignBase,
        factor: 1.0,
        discount_percent: discount,
        calculation: `(${analysis.foreign_matter} - ${foreignBase}) × 1.0 = ${discount.toFixed(2)}%`
      });
    }

    // 2. Acidez (según época del año)
    if (analysis.acidity) {
      const acidityDiscount = this.calculateAcidityDiscount(
        analysis.acidity,
        analysis.analysis_date
      );

      if (acidityDiscount.discount_percent > 0) {
        discounts.push(acidityDiscount);
      }
    }

    return discounts;
  }

  /**
   * Descuento por Acidez
   * 
   * Según PDF oficial (Norma IX):
   * - Temporada cosecha (hasta 31/agosto): base 1.5%
   * - Resto del año (desde 1/sept): base 2.0%
   * - Factor: 2.5 (proporcional)
   * 
   * NOTA: El JSON dice tabla con descuento fijo 0.5%, 
   * pero el PDF oficial dice factor 2.5 proporcional.
   * Usamos lo del PDF oficial.
   */
  private calculateAcidityDiscount(
    acidity: number,
    analysisDate: Date
  ): DiscountDetail {

    // Determinar base según época del año
    const month = analysisDate.getMonth() + 1; // 1-12
    const base = (month >= 1 && month <= 8) ? 1.5 : 2.0;
    const period = (month >= 1 && month <= 8)
      ? 'Temporada Cosecha'
      : 'Resto del Año';

    if (acidity <= base) {
      return {
        concept: 'Acidez',
        parameter: 'acidity',
        value: acidity,
        base: base,
        factor: 0,
        discount_percent: 0,
        calculation: `Acidez ${acidity}% <= ${base}% (${period}), sin descuento`
      };
    }

    // Si acidez > 2.0% → puede ser rechazo (según PDF)
    if (acidity > 2.0) {
      return {
        concept: 'Acidez (Crítica)',
        parameter: 'acidity',
        value: acidity,
        base: base,
        factor: 2.5,
        discount_percent: 999, // Indicador de rechazo
        calculation: `Acidez ${acidity}% > 2.0% → Puede ser RECHAZO`
      };
    }

    // Descuento proporcional
    const excess = acidity - base;
    const discount = excess * 2.5;

    return {
      concept: `Acidez (${period})`,
      parameter: 'acidity',
      value: acidity,
      base: base,
      factor: 2.5,
      discount_percent: discount,
      calculation: `(${acidity} - ${base}) × 2.5 = ${discount.toFixed(2)}%`
    };
  }

  /**
   * Validaciones Fuera de Estándar
   */
  protected checkOutOfStandard(
    analysis: QualityAnalysis,
    condition: string
  ): QualityWarning | null {

    // "Humedad > 16.0"
    if (condition.includes('Humedad') && condition.includes('>')) {
      const threshold = 16.0;
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

    // "Acidez > 2.0"
    if (condition.includes('Acidez') && condition.includes('>')) {
      const threshold = 2.0;
      if (analysis.acidity && analysis.acidity > threshold) {
        return {
          type: 'out_of_standard',
          severity: 'critical',
          parameter: 'acidity',
          message: `Acidez ${analysis.acidity}% excede límite de ${threshold}% → PUEDE SER RECHAZO`,
          value: analysis.acidity,
          threshold
        };
      }
    }

    // "Insectos Vivos Presentes"
    if (condition.includes('Insectos')) {
      return null; // No implementado aún
    }

    // "Semillas de Chamico > 2/kg"
    if (condition.includes('Chamico')) {
      return null; // Requiere campo específico
    }

    return null;
  }
}

export default GirasolQualityCalculator;
