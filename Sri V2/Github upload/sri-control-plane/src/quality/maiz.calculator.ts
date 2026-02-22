/**
 * Calculador de Calidad para MAÍZ
 * Norma XII - Resolución SAGPyA (también conocida como Norma II)
 * 
 * Características:
 * - Grados G1, G2, G3
 * - Bonificación por Peso Hectolítrico
 * - Descuentos proporcionales simples
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, Grade, BonusDetail, DiscountDetail, QualityWarning } from '../types';

export class MaizQualityCalculator extends QualityCalculator {

  /**
   * Determinar grado por parámetros
   * 
   * Según PDF oficial (Norma XII):
   * - Peso Hectolítrico
   * - Granos Dañados
   * - Granos Quebrados
   * - Materias Extrañas
   */
  protected determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade> {

    const grades = new Map<string, Grade>();

    // Peso Hectolítrico
    if (analysis.hectoliter_weight) {
      if (analysis.hectoliter_weight >= 75) {
        grades.set('peso_hectolitrico', 'G1');
      } else if (analysis.hectoliter_weight >= 72) {
        grades.set('peso_hectolitrico', 'G2');
      } else if (analysis.hectoliter_weight >= 69) {
        grades.set('peso_hectolitrico', 'G3');
      } else {
        grades.set('peso_hectolitrico', 'G3');
      }
    }

    // Granos Dañados
    if (analysis.damaged_grains <= 3.0) {
      grades.set('granos_danados', 'G1');
    } else if (analysis.damaged_grains <= 5.0) {
      grades.set('granos_danados', 'G2');
    } else if (analysis.damaged_grains <= 8.0) {
      grades.set('granos_danados', 'G3');
    } else {
      grades.set('granos_danados', 'G3');
    }

    // Granos Quebrados
    if (analysis.broken_grains) {
      if (analysis.broken_grains <= 2.0) {
        grades.set('granos_quebrados', 'G1');
      } else if (analysis.broken_grains <= 3.0) {
        grades.set('granos_quebrados', 'G2');
      } else if (analysis.broken_grains <= 5.0) {
        grades.set('granos_quebrados', 'G3');
      } else {
        grades.set('granos_quebrados', 'G3');
      }
    }

    // Materias Extrañas
    if (analysis.foreign_matter <= 1.0) {
      grades.set('materias_extranas', 'G1');
    } else if (analysis.foreign_matter <= 1.5) {
      grades.set('materias_extranas', 'G2');
    } else if (analysis.foreign_matter <= 2.0) {
      grades.set('materias_extranas', 'G3');
    } else {
      grades.set('materias_extranas', 'G3');
    }

    return grades;
  }

  /**
   * Bonificación/Rebaja por Grado
   * 
   * G1: +1.0%
   * G2: 0%
   * G3: -1.5%
   */
  protected calculateGradeFactor(grade: Grade): number {
    if (grade === 'G1') return 1.0;
    if (grade === 'G2') return 0;
    if (grade === 'G3') return -1.5;
    return 0;
  }

  /**
   * Bonificaciones Especiales - Peso Hectolítrico
   * 
   * PH >= 75: 0% (base)
   * PH >= 76: +0.5%
   * PH >= 77: +1.0%
   */
  protected calculateBonuses(analysis: QualityAnalysis): BonusDetail[] {
    const bonuses: BonusDetail[] = [];

    if (!analysis.hectoliter_weight) {
      return bonuses;
    }

    let bonus = 0;
    let description = '';

    if (analysis.hectoliter_weight >= 77.0) {
      bonus = 1.0;
      description = 'PH >= 77 kg/hl';
    } else if (analysis.hectoliter_weight >= 76.0) {
      bonus = 0.5;
      description = 'PH >= 76 kg/hl';
    } else if (analysis.hectoliter_weight >= 75.0) {
      bonus = 0;
      description = 'PH = 75 kg/hl (base)';
    }

    if (bonus > 0) {
      bonuses.push({
        concept: 'Peso Hectolítrico',
        parameter: 'hectoliter_weight',
        value: analysis.hectoliter_weight,
        base: 75.0,
        factor: bonus,
        bonus_percent: bonus,
        calculation: `${description} → +${bonus}%`
      });
    }

    return bonuses;
  }

  /**
   * Descuentos - Proporcionales simples
   * 
   * 1. Materias Extrañas: base 1.5%, factor 1.0
   * 2. Granos Quebrados: base 3.0%, factor 1.0
   * 3. Granos Dañados: base 5.0%, factor 1.0
   */
  protected calculateDiscounts(analysis: QualityAnalysis): DiscountDetail[] {
    const discounts: DiscountDetail[] = [];

    // 1. Materias Extrañas
    const foreignBase = 1.5;
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

    // 2. Granos Quebrados
    if (analysis.broken_grains) {
      const brokenBase = 3.0;
      if (analysis.broken_grains > brokenBase) {
        const excess = analysis.broken_grains - brokenBase;
        const discount = excess * 1.0;

        discounts.push({
          concept: 'Granos Quebrados',
          parameter: 'broken_grains',
          value: analysis.broken_grains,
          base: brokenBase,
          factor: 1.0,
          discount_percent: discount,
          calculation: `(${analysis.broken_grains} - ${brokenBase}) × 1.0 = ${discount.toFixed(2)}%`
        });
      }
    }

    // 3. Granos Dañados
    const damagedBase = 5.0;
    if (analysis.damaged_grains > damagedBase) {
      const excess = analysis.damaged_grains - damagedBase;
      const discount = excess * 1.0;

      discounts.push({
        concept: 'Granos Dañados',
        parameter: 'damaged_grains',
        value: analysis.damaged_grains,
        base: damagedBase,
        factor: 1.0,
        discount_percent: discount,
        calculation: `(${analysis.damaged_grains} - ${damagedBase}) × 1.0 = ${discount.toFixed(2)}%`
      });
    }

    return discounts;
  }

  /**
   * Validaciones Fuera de Estándar
   */
  protected checkOutOfStandard(
    analysis: QualityAnalysis,
    condition: string
  ): QualityWarning | null {

    // "Humedad > 21.0"
    if (condition.includes('Humedad') && condition.includes('>')) {
      const threshold = 21.0;
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
      return null; // No implementado aún
    }

    // "Olores comercialmente objetables"
    if (condition.includes('Olores')) {
      return null; // Requiere campo específico
    }

    return null;
  }
}

export default MaizQualityCalculator;
