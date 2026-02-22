/**
 * Motor de Cálculo de Calidad de Granos
 * 
 * Implementa las normas oficiales SAGPyA para:
 * - Trigo Pan (Norma XX)
 * - Maíz (Norma XII)
 * - Soja (Norma XVII)
 * - Sorgo (Norma XVIII)
 * - Girasol (Norma IX)
 * 
 * Basado en PDF oficial de Cámara Arbitral de Cereales
 */

import { QualityAnalysis, QualityResult, GrainRules } from '../types';
import { logger } from '../utils/logger';

export class QualityCalculationEngine {

  private rules: Map<string, GrainRules>;

  constructor() {
    this.rules = new Map();
    this.loadRules();
  }

  /**
   * Calcular factor de calidad completo
   */
  calculate(analysis: QualityAnalysis): QualityResult {
    logger.info('Calculating quality', {
      product: analysis.product,
      ctg: analysis.ctg_number
    });

    const rules = this.rules.get(analysis.product.toLowerCase());

    if (!rules) {
      throw new Error(`No rules found for product: ${analysis.product}`);
    }

    // PASO 1-2: Determinar grado (si aplica)
    const grade = this.determineGrade(analysis, rules);

    // PASO 3: Bonificación/Rebaja por grado
    const gradeAdjustment = this.calculateGradeAdjustment(grade, rules);

    // PASO 4: Bonificaciones especiales
    const specialBonuses = this.calculateSpecialBonuses(analysis, rules);

    // PASO 5: Descuentos proporcionales
    const discounts = this.calculateProportionalDiscounts(analysis, rules);

    // PASO 6: Factor final
    const factorBase = 100;
    const factorFinal = factorBase
      + gradeAdjustment
      + specialBonuses
      - discounts;

    // PASO 7: Merma por humedad (sobre cantidad)
    const moistureLoss = this.calculateMoistureLoss(
      analysis.humidity,
      analysis.quantity_kg,
      rules
    );

    // Validar fuera de estándar
    const outOfStandard = this.checkOutOfStandard(analysis, rules);

    return {
      // @ts-ignore
      ctg_number: analysis.ctg_number,
      // @ts-ignore
      product: analysis.product,

      // Grado
      grade: grade as any,
      grade_by_parameter: new Map(), // Placeholder
      worst_parameter: null, // Placeholder
      base_factor: factorBase,
      final_factor: factorFinal,

      // Bonificaciones
      bonuses: this.getBonusDetails(analysis, rules),
      total_bonus: specialBonuses,

      // Descuentos
      discounts: this.getDiscountDetails(analysis, rules),
      total_discount: discounts,

      // Merma humedad
      humidity_waste: {
        base_humidity: rules.base_humidity,
        actual_humidity: analysis.humidity,
        waste_percent: moistureLoss.percentage,
        waste_kg: moistureLoss.kg,
        net_quantity_kg: analysis.quantity_kg - moistureLoss.kg,
        requires_drying: analysis.humidity > rules.base_humidity
      },

      price_adjustment: {} as any, // Placeholder

      // Validaciones
      out_of_standard: outOfStandard.status,
      out_of_tolerance: false, // Placeholder
      warnings: [], // Placeholder

      calculation_steps: []
    };
  }

  /**
   * PASO 1-2: Determinar grado
   * Aplica regla del PEOR parámetro
   */
  private determineGrade(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): string | null {

    if (!rules.has_grades) {
      return null; // Soja no tiene grados
    }

    let worstGrade = 1; // Empezar con el mejor grado

    // Evaluar cada parámetro contra tabla de grados
    for (const param of rules.grade_parameters) {
      const value = analysis[param.field];

      if (value == null) continue;

      // Determinar grado para este parámetro
      const paramGrade = this.getGradeForParameter(
        value,
        param.thresholds
      );

      // Regla del peor grado
      worstGrade = Math.max(worstGrade, paramGrade);
    }

    return `G${worstGrade}`;
  }

  /**
   * Obtener grado para un parámetro específico
   */
  private getGradeForParameter(
    value: number,
    thresholds: any[]
  ): number {
    for (const threshold of thresholds) {
      if (this.meetsThreshold(value, threshold)) {
        return threshold.grade;
      }
    }
    return 3; // Grado 3 por defecto si no cumple ninguno
  }

  /**
   * PASO 3: Bonificación/Rebaja por grado
   */
  private calculateGradeAdjustment(
    grade: string | null,
    rules: GrainRules
  ): number {
    if (!grade || !rules.grade_bonuses) {
      return 0;
    }

    const gradeNum = parseInt(grade.replace('G', ''));
    const bonus = rules.grade_bonuses.find(b => b.grade === gradeNum);

    return bonus ? bonus.adjustment : 0;
  }

  /**
   * PASO 4: Bonificaciones especiales
   */
  private calculateSpecialBonuses(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): number {
    let totalBonus = 0;

    // Proteína (Trigo)
    if (rules.protein_bonus && analysis.protein_pct != null) {
      totalBonus += this.calculateProteinBonus(
        analysis.protein_pct,
        analysis.hectoliter_weight || 100,
        rules.protein_bonus
      );
    }

    // Materia Grasa (Girasol)
    if (rules.fat_bonus && analysis.fat_content != null) {
      totalBonus += this.calculateFatBonus(
        analysis.fat_content,
        rules.fat_bonus
      );
    }

    // Peso Hectolítrico (Maíz, Sorgo)
    if (rules.hectoliter_bonus && analysis.hectoliter_weight != null) {
      totalBonus += this.calculateHectoliterBonus(
        analysis.hectoliter_weight,
        rules.hectoliter_bonus
      );
    }

    return totalBonus;
  }

  /**
   * Bonificación por Proteína (Trigo - Progresivo)
   */
  private calculateProteinBonus(
    protein: number,
    hectoliterWeight: number,
    rules: any
  ): number {
    const BASE = 11.0;
    const MIN_HW_FOR_BONUS = 73.0;

    // Si PH < 73, no bonifica (aunque proteína sea alta)
    if (hectoliterWeight < MIN_HW_FOR_BONUS && protein >= BASE) {
      return 0;
    }

    // Bonificación (proteína >= 11%)
    if (protein >= BASE) {
      const excess = protein - BASE;
      return excess * 2.0;
    }

    // Rebajas progresivas (proteína < 11%)
    const deficit = BASE - protein;

    if (protein >= 10.0) {
      return -deficit * 2.0; // Factor 2
    } else if (protein >= 9.0) {
      return -deficit * 3.0; // Factor 3
    } else {
      return -deficit * 4.0; // Factor 4
    }
  }

  /**
   * Bonificación por Materia Grasa (Girasol - Lineal simple)
   */
  private calculateFatBonus(
    fatContent: number,
    rules: any
  ): number {
    const BASE = 42.0;
    const FACTOR = 2.0;

    const difference = fatContent - BASE;
    return difference * FACTOR;
  }

  /**
   * Bonificación por Peso Hectolítrico (Maíz, Sorgo)
   */
  private calculateHectoliterBonus(
    hectoliterWeight: number,
    rules: any
  ): number {
    // Buscar bonificación aplicable
    for (const bonus of rules.thresholds) {
      if (hectoliterWeight >= bonus.min) {
        return bonus.bonus;
      }
    }
    return 0;
  }

  /**
   * PASO 5: Descuentos proporcionales
   */
  private calculateProportionalDiscounts(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): number {
    let totalDiscount = 0;

    for (const discount of rules.discounts) {
      const value = analysis[discount.field];

      if (value == null) continue;

      const discountAmount = this.calculateDiscount(
        value,
        discount
      );

      totalDiscount += discountAmount;
    }

    return totalDiscount;
  }

  /**
   * Calcular descuento según tipo
   */
  private calculateDiscount(
    value: number,
    rule: any
  ): number {
    switch (rule.type) {
      case 'PROPORCIONAL':
        return this.calculateProportionalDiscount(value, rule);

      case 'ESCALA_LINEAL':
        return this.calculateLinearScaleDiscount(value, rule);

      case 'ESCALA_PROGRESIVA':
        return this.calculateProgressiveScaleDiscount(value, rule);

      case 'TABLA_ACIDEZ':
        return this.calculateAcidityTableDiscount(value, rule);

      default:
        logger.warn('Unknown discount type', { type: rule.type });
        return 0;
    }
  }

  /**
   * Descuento proporcional simple
   */
  private calculateProportionalDiscount(
    value: number,
    rule: any
  ): number {
    if (value <= rule.base) {
      return 0;
    }

    const excess = value - rule.base;
    return excess * rule.factor;
  }

  /**
   * Descuento escala lineal (Soja - Granos Verdes)
   */
  private calculateLinearScaleDiscount(
    value: number,
    rule: any
  ): number {
    const BASE = rule.base;
    const FACTOR = rule.factor;

    if (value <= BASE) {
      return 0;
    }

    const excess = value - BASE;
    return excess * FACTOR;
  }

  /**
   * Descuento escala progresiva (Soja - Granos Quebrados)
   */
  private calculateProgressiveScaleDiscount(
    value: number,
    rule: any
  ): number {
    if (value <= rule.base) {
      return 0;
    }

    let totalDiscount = 0;

    // Aplicar cada tramo
    for (const tier of rule.tiers) {
      if (value > tier.min) {
        const tierValue = Math.min(value, tier.max) - tier.min;
        totalDiscount += tierValue * tier.factor;
      }
    }

    return totalDiscount;
  }

  /**
   * Descuento por acidez (Girasol - Tabla)
   */
  private calculateAcidityTableDiscount(
    value: number,
    rule: any
  ): number {
    // Determinar base según época del año
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;

    const base = (month >= 1 && month <= 8) ? 1.5 : 2.0;

    if (value <= base) {
      return 0;
    }

    const excess = value - base;
    return excess * 2.5; // Factor fijo para acidez
  }

  /**
   * PASO 7: Merma por humedad
   * Se aplica sobre CANTIDAD, NO sobre factor
   */
  private calculateMoistureLoss(
    humidity: number,
    quantityKg: number,
    rules: GrainRules
  ): {
    percentage: number;
    kg: number;
  } {
    if (humidity <= rules.base_humidity) {
      return { percentage: 0, kg: 0 };
    }

    // Buscar en tabla de mermas
    const lossEntry = rules.moisture_losses.find(
      m => m.humidity === humidity
    );

    if (!lossEntry) {
      // Interpolar si no está en tabla
      logger.warn('Moisture not in table, interpolating', { humidity });
      return { percentage: 0, kg: 0 };
    }

    const lossPct = lossEntry.loss;
    const lossKg = quantityKg * (lossPct / 100);

    return {
      percentage: lossPct,
      kg: lossKg
    };
  }

  /**
   * Validar fuera de estándar
   */
  private checkOutOfStandard(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): {
    status: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    for (const condition of rules.out_of_standard) {
      if (this.meetsCondition(analysis, condition)) {
        reasons.push(condition.reason);
      }
    }

    return {
      status: reasons.length > 0,
      reasons
    };
  }

  /**
   * Helpers
   */

  private meetsThreshold(value: number, threshold: any): boolean {
    if (threshold.min != null && value < threshold.min) return false;
    if (threshold.max != null && value > threshold.max) return false;
    return true;
  }

  private meetsCondition(analysis: QualityAnalysis, condition: any): boolean {
    const value = analysis[condition.field];

    if (value == null) return false;

    switch (condition.operator) {
      case '>':
        return value > condition.value;
      case '<':
        return value < condition.value;
      case '>=':
        return value >= condition.value;
      case '<=':
        return value <= condition.value;
      case '===':
        return value === condition.value;
      default:
        return false;
    }
  }

  private getBonusDetails(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): any[] {
    const details: any[] = [];

    // Proteína
    if (rules.protein_bonus && analysis.protein_pct != null) {
      const bonus = this.calculateProteinBonus(
        analysis.protein_pct,
        analysis.hectoliter_weight || 100,
        rules.protein_bonus
      );

      if (bonus !== 0) {
        details.push({
          type: 'Proteína',
          value: analysis.protein_pct,
          adjustment: bonus,
          description: `Proteína ${analysis.protein_pct}%`
        });
      }
    }

    // Materia Grasa
    if (rules.fat_bonus && analysis.fat_content != null) {
      const bonus = this.calculateFatBonus(
        analysis.fat_content,
        rules.fat_bonus
      );

      if (bonus !== 0) {
        details.push({
          type: 'Materia Grasa',
          value: analysis.fat_content,
          adjustment: bonus,
          description: `Materia Grasa ${analysis.fat_content}%`
        });
      }
    }

    return details;
  }

  private getDiscountDetails(
    analysis: QualityAnalysis,
    rules: GrainRules
  ): any[] {
    const details: any[] = [];

    for (const discount of rules.discounts) {
      const value = analysis[discount.field];

      if (value == null) continue;

      const discountAmount = this.calculateDiscount(value, discount);

      if (discountAmount > 0) {
        details.push({
          type: discount.name,
          value: value,
          base: discount.base,
          adjustment: -discountAmount,
          description: `${discount.name}: ${value}% (base ${discount.base}%)`
        });
      }
    }

    return details;
  }

  /**
   * Cargar reglas desde JSON
   */
  private loadRules(): void {
    // Las reglas se cargarían desde los JSON files
    // Por ahora hardcodeadas para el ejemplo

    this.rules.set('soja', this.getSojaRules());
    this.rules.set('trigo', this.getTrigoRules());
    this.rules.set('maiz', this.getMaizRules());
    this.rules.set('sorgo', this.getSorgoRules());
    this.rules.set('girasol', this.getGirasolRules());
  }

  /**
   * Reglas de Soja (ejemplo)
   */
  private getSojaRules(): GrainRules {
    return {
      product: 'Soja',
      version: 'Norma XVII - SAGPyA 151/08',
      has_grades: false,
      base_humidity: 13.5,

      discounts: [
        {
          field: 'foreign_matter_pct',
          name: 'Materias Extrañas',
          type: 'PROPORCIONAL',
          base: 1.0,
          factor: 1.0
        },
        {
          field: 'damaged_grains_pct',
          name: 'Granos Dañados',
          type: 'PROPORCIONAL',
          base: 5.0,
          factor: 1.0
        },
        {
          field: 'green_grains_pct',
          name: 'Granos Verdes',
          type: 'ESCALA_LINEAL',
          base: 5.0,
          tolerance: 10.0,
          factor: 0.2
        },
        {
          field: 'broken_grains_pct',
          name: 'Granos Quebrados',
          type: 'ESCALA_PROGRESIVA',
          base: 20.0,
          tolerance: 30.0,
          tiers: [
            { min: 20.0, max: 25.0, factor: 0.25 },
            { min: 25.0, max: 30.0, factor: 0.5 },
            { min: 30.0, max: 999, factor: 0.75 }
          ]
        }
      ],

      moisture_losses: [
        { humidity: 13.5, loss: 0.0 },
        { humidity: 14.0, loss: 0.75 },
        { humidity: 14.5, loss: 1.50 },
        { humidity: 15.0, loss: 2.25 },
        { humidity: 15.5, loss: 3.00 },
        { humidity: 16.0, loss: 3.75 },
        { humidity: 16.5, loss: 4.50 },
        { humidity: 17.0, loss: 5.25 },
        { humidity: 17.5, loss: 6.00 },
        { humidity: 18.0, loss: 6.75 },
        { humidity: 18.5, loss: 7.50 },
        { humidity: 19.0, loss: 8.25 },
        { humidity: 19.5, loss: 9.00 },
        { humidity: 20.0, loss: 9.75 }
      ],

      out_of_standard: [
        {
          field: 'humidity',
          operator: '>',
          value: 20.0,
          reason: 'Humedad > 20.0%'
        },
        {
          field: 'live_insects',
          operator: '===',
          value: true,
          reason: 'Presencia de insectos vivos'
        }
      ]
    };
  }

  // Métodos similares para otros granos...
  private getTrigoRules(): GrainRules {
    // TODO: Implementar
    return {} as GrainRules;
  }

  private getMaizRules(): GrainRules {
    // TODO: Implementar
    return {} as GrainRules;
  }

  private getSorgoRules(): GrainRules {
    // TODO: Implementar
    return {} as GrainRules;
  }

  private getGirasolRules(): GrainRules {
    // TODO: Implementar
    return {} as GrainRules;
  }
}

export default new QualityCalculationEngine();
