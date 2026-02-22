/**
 * Calculador de Calidad para SORGO
 * Norma XVIII - Resolución SENASA 554/2011 (también conocida como Norma V)
 * 
 * Características:
 * - Grados G1, G2, G3
 * - Bonificación simple por Peso Hectolítrico
 * - Descuentos proporcionales simples
 * - Similar a Maíz pero con valores diferentes
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, Grade, BonusDetail, DiscountDetail, QualityWarning } from '../types';

export class SorgoQualityCalculator extends QualityCalculator {

  /**
   * Determinar grado por parámetros
   * 
   * Según PDF oficial (Norma XVIII):
   * - Granos Dañados
   * - Materias Extrañas y sorgo no granífero
   * - Granos Quebrados
   * - Granos Picados
   */
  protected determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade> {

    const grades = new Map<string, Grade>();

    // Granos Dañados
    if (analysis.damaged_grains <= 2.0) {
      grades.set('granos_danados', 'G1');
    } else if (analysis.damaged_grains <= 4.0) {
      grades.set('granos_danados', 'G2');
    } else if (analysis.damaged_grains <= 6.0) {
      grades.set('granos_danados', 'G3');
    } else {
      grades.set('granos_danados', 'G3');
    }

    // Materias Extrañas
    if (analysis.foreign_matter <= 2.0) {
      grades.set('materias_extranas', 'G1');
    } else if (analysis.foreign_matter <= 3.0) {
      grades.set('materias_extranas', 'G2');
    } else if (analysis.foreign_matter <= 4.0) {
      grades.set('materias_extranas', 'G3');
    } else {
      grades.set('materias_extranas', 'G3');
    }

    // Granos Quebrados
    if (analysis.broken_grains) {
      if (analysis.broken_grains <= 3.0) {
        grades.set('granos_quebrados', 'G1');
      } else if (analysis.broken_grains <= 5.0) {
        grades.set('granos_quebrados', 'G2');
      } else if (analysis.broken_grains <= 7.0) {
        grades.set('granos_quebrados', 'G3');
      } else {
        grades.set('granos_quebrados', 'G3');
      }
    }

    // Granos Picados
    if (analysis.pest_damaged !== undefined) {
      if (analysis.pest_damaged <= 0.5) {
        grades.set('granos_picados', 'G1');
      } else if (analysis.pest_damaged <= 1.0) {
        grades.set('granos_picados', 'G2');
      } else {
        grades.set('granos_picados', 'G3');
      }
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
   * PH >= 74: +0.5%
   */
  protected calculateBonuses(analysis: QualityAnalysis): BonusDetail[] {
    const bonuses: BonusDetail[] = [];

    if (!analysis.hectoliter_weight) {
      return bonuses;
    }

    if (analysis.hectoliter_weight >= 74.0) {
      bonuses.push({
        concept: 'Peso Hectolítrico',
        parameter: 'hectoliter_weight',
        value: analysis.hectoliter_weight,
        base: 72.0,
        factor: 0.5,
        bonus_percent: 0.5,
        calculation: `PH >= 74 kg/hl → +0.5%`
      });
    }

    return bonuses;
  }

  /**
   * Descuentos - Proporcionales simples
   * 
   * 1. Materias Extrañas: base 1.0%, factor 1.0
   * 2. Granos Quebrados: base 2.0%, factor 1.0
   * 3. Granos Dañados: base 2.0%, factor 1.0
   */
  protected calculateDiscounts(analysis: QualityAnalysis): DiscountDetail[] {
    const discounts: DiscountDetail[] = [];

    // 1. Materias Extrañas
    const foreignBase = 1.0;
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
      const brokenBase = 2.0;
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
    const damagedBase = 2.0;
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

    // "Humedad > 20.0"
    if (condition.includes('Humedad') && condition.includes('>')) {
      const threshold = 20.0;
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

    // "Semillas de Chamico > 2 semillas/kg"
    if (condition.includes('Chamico')) {
      return null; // Requiere campo específico
    }

    return null;
  }
}

export default SorgoQualityCalculator;
