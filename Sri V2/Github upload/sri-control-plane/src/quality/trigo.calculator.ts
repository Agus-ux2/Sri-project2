/**
 * Calculador de Calidad para TRIGO PAN
 * Norma XX - Resolución SAGPyA 1262/04
 * 
 * Características:
 * - Grados G1, G2, G3 (según PH y otros parámetros)
 * - Proteína con bonificación/rebaja progresiva
 * - Condición especial: PH < 75 kg/hl no bonifica proteína
 * - Múltiples parámetros para determinar grado
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, Grade, BonusDetail, DiscountDetail, QualityWarning } from '../types';

export class TrigoQualityCalculator extends QualityCalculator {

  /**
   * Determinar grado por cada parámetro
   * 
   * Se evalúan múltiples parámetros y se aplica regla del peor
   */
  protected determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade> {

    const grades = new Map<string, Grade>();

    // Peso Hectolítrico
    if (analysis.hectoliter_weight) {
      if (analysis.hectoliter_weight >= 79) {
        grades.set('peso_hectolitrico', 'G1');
      } else if (analysis.hectoliter_weight >= 76) {
        grades.set('peso_hectolitrico', 'G2');
      } else if (analysis.hectoliter_weight >= 73) {
        grades.set('peso_hectolitrico', 'G3');
      } else {
        // Fuera de estándar
        grades.set('peso_hectolitrico', 'G3');
      }
    }

    // Materias Extrañas
    if (analysis.foreign_matter <= 0.20) {
      grades.set('materias_extranas', 'G1');
    } else if (analysis.foreign_matter <= 0.80) {
      grades.set('materias_extranas', 'G2');
    } else if (analysis.foreign_matter <= 1.50) {
      grades.set('materias_extranas', 'G3');
    } else {
      grades.set('materias_extranas', 'G3');
    }

    // Granos Dañados
    const totalDamaged = analysis.damaged_grains + (analysis.burned_grains || 0);
    if (totalDamaged <= 2.0) {
      grades.set('granos_danados', 'G1');
    } else if (totalDamaged <= 3.0) {
      grades.set('granos_danados', 'G2');
    } else if (totalDamaged <= 5.0) {
      grades.set('granos_danados', 'G3');
    } else {
      grades.set('granos_danados', 'G3');
    }

    // Granos Quebrados
    if (analysis.broken_grains) {
      if (analysis.broken_grains <= 1.0) {
        grades.set('granos_quebrados', 'G1');
      } else if (analysis.broken_grains <= 2.0) {
        grades.set('granos_quebrados', 'G2');
      } else if (analysis.broken_grains <= 3.0) {
        grades.set('granos_quebrados', 'G3');
      } else {
        grades.set('granos_quebrados', 'G3');
      }
    }

    // Panza Blanca
    if (analysis.panza_blanca !== undefined) {
      if (analysis.panza_blanca <= 15.0) {
        grades.set('panza_blanca', 'G1');
      } else if (analysis.panza_blanca <= 25.0) {
        grades.set('panza_blanca', 'G2');
      } else if (analysis.panza_blanca <= 40.0) {
        grades.set('panza_blanca', 'G3');
      } else {
        grades.set('panza_blanca', 'G3');
      }
    }

    return grades;
  }

  /**
   * Bonificación/Rebaja por Grado
   * 
   * G1: +1.5%
   * G2: 0%
   * G3: -1.0%
   */
  protected calculateGradeFactor(grade: Grade): number {
    if (grade === 'G1') return 1.5;
    if (grade === 'G2') return 0;
    if (grade === 'G3') return -1.0;
    return 0;
  }

  /**
   * Bonificaciones Especiales - Proteína
   * 
   * Base: 11.0%
   * CONDICIÓN: Si PH < 75 kg/hl, NO bonifica
   * 
   * Bonificaciones (proteína >= 11%):
   * - Factor 2.0
   * 
   * Rebajas (proteína < 11%):
   * - 10% <= proteína < 11%: factor 2.0
   * - 9% <= proteína < 10%: factor 3.0
   * - proteína < 9%: factor 4.0
   */
  protected calculateBonuses(analysis: QualityAnalysis): BonusDetail[] {
    const bonuses: BonusDetail[] = [];

    if (!analysis.protein || !analysis.hectoliter_weight) {
      return bonuses;
    }

    const BASE_PROTEIN = 11.0;
    const MIN_PH_FOR_BONUS = 75.0;

    // Bonificación por proteína
    if (analysis.protein >= BASE_PROTEIN) {
      // Verificar condición de PH
      if (analysis.hectoliter_weight < MIN_PH_FOR_BONUS) {
        // NO bonifica
        return bonuses;
      }

      const excess = analysis.protein - BASE_PROTEIN;
      const bonus = excess * 2.0;

      bonuses.push({
        concept: 'Proteína (>= 11%)',
        parameter: 'protein',
        value: analysis.protein,
        base: BASE_PROTEIN,
        factor: 2.0,
        bonus_percent: bonus,
        calculation: `(${analysis.protein} - ${BASE_PROTEIN}) × 2.0 = ${bonus.toFixed(2)}%`
      });
    }

    return bonuses;
  }

  /**
   * Descuentos - Incluye rebaja por proteína baja
   */
  protected calculateDiscounts(analysis: QualityAnalysis): DiscountDetail[] {
    const discounts: DiscountDetail[] = [];

    // 1. Rebaja por Proteína Baja (si < 11%)
    if (analysis.protein && analysis.protein < 11.0) {
      const proteinDiscount = this.calculateProteinDiscount(analysis.protein);
      if (proteinDiscount.discount_percent > 0) {
        discounts.push(proteinDiscount);
      }
    }

    // 2. Materias Extrañas
    const foreignBase = this.rules.parametros_base.materias_extranas;
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

    // 3. Granos Dañados
    const damagedBase = this.rules.parametros_base.granos_danados;
    const totalDamaged = analysis.damaged_grains + (analysis.burned_grains || 0);
    if (totalDamaged > damagedBase) {
      const excess = totalDamaged - damagedBase;
      const discount = excess * 1.0;

      discounts.push({
        concept: 'Granos Dañados',
        parameter: 'damaged_grains',
        value: totalDamaged,
        base: damagedBase,
        factor: 1.0,
        discount_percent: discount,
        calculation: `(${totalDamaged} - ${damagedBase}) × 1.0 = ${discount.toFixed(2)}%`
      });
    }

    // 4. Panza Blanca
    if (analysis.panza_blanca && analysis.panza_blanca > 20.0) {
      const excess = analysis.panza_blanca - 20.0;
      const discount = excess * 0.25;

      discounts.push({
        concept: 'Granos Panza Blanca',
        parameter: 'panza_blanca',
        value: analysis.panza_blanca,
        base: 20.0,
        factor: 0.25,
        discount_percent: discount,
        calculation: `(${analysis.panza_blanca} - 20.0) × 0.25 = ${discount.toFixed(2)}%`
      });
    }

    return discounts;
  }

  /**
   * Rebaja por Proteína Baja - Progresiva
   * 
   * 10% <= proteína < 11%: factor 2.0
   * 9% <= proteína < 10%: factor 3.0
   * proteína < 9%: factor 4.0
   */
  private calculateProteinDiscount(protein: number): DiscountDetail {
    const BASE = 11.0;
    const deficiency = BASE - protein;

    let factor: number;
    let range: string;

    if (protein >= 10.0) {
      factor = 2.0;
      range = '10-11%';
    } else if (protein >= 9.0) {
      factor = 3.0;
      range = '9-10%';
    } else {
      factor = 4.0;
      range = '<9%';
    }

    const discount = deficiency * factor;

    return {
      concept: `Proteína Baja (${range})`,
      parameter: 'protein',
      value: protein,
      base: BASE,
      factor,
      discount_percent: discount,
      calculation: `(${BASE} - ${protein}) × ${factor} = ${discount.toFixed(2)}%`
    };
  }

  /**
   * Validaciones Fuera de Estándar
   */
  protected checkOutOfStandard(
    analysis: QualityAnalysis,
    condition: string
  ): QualityWarning | null {

    // "Humedad > 18.0"
    if (condition.includes('Humedad') && condition.includes('>')) {
      const threshold = 18.0;
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

    // "Peso Hectolítrico < 68.0"
    if (condition.includes('Peso Hectolítrico') && condition.includes('<')) {
      const threshold = 68.0;
      if (analysis.hectoliter_weight && analysis.hectoliter_weight < threshold) {
        return {
          type: 'out_of_standard',
          severity: 'critical',
          parameter: 'hectoliter_weight',
          message: `Peso Hectolítrico ${analysis.hectoliter_weight} kg/hl por debajo de ${threshold} kg/hl`,
          value: analysis.hectoliter_weight,
          threshold
        };
      }
    }

    // "Materias Extrañas > 2.0"
    if (condition.includes('Materias Extrañas') && condition.includes('>')) {
      const threshold = 2.0;
      if (analysis.foreign_matter > threshold) {
        return {
          type: 'out_of_standard',
          severity: 'critical',
          parameter: 'foreign_matter',
          message: `Materias Extrañas ${analysis.foreign_matter}% excede límite de ${threshold}%`,
          value: analysis.foreign_matter,
          threshold
        };
      }
    }

    return null;
  }
}

export default TrigoQualityCalculator;
