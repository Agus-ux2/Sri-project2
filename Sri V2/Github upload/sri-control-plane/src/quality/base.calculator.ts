/**
 * Motor de Cálculo de Calidad de Granos
 * 
 * Implementa normas oficiales SAGPyA/SENASA de la Cámara Arbitral de Cereales
 * para los 5 granos principales: Trigo, Maíz, Soja, Sorgo, Girasol
 */

// ============================================================================
// TIPOS
// ============================================================================

import {
  GrainType, Grade, QualityAnalysis, QualityResult, BonusDetail, DiscountDetail,
  TierDetail, HumidityWaste, PriceAdjustment, QualityWarning, CalculationStep
} from '../types';

// ============================================================================
// CLASE BASE ABSTRACTA
// ============================================================================

export abstract class QualityCalculator {
  protected grainType: GrainType;
  protected rules: any; // Reglas cargadas del JSON

  constructor(grainType: GrainType, rules: any) {
    this.grainType = grainType;
    this.rules = rules;
  }

  /**
   * Método principal: Calcular factor de calidad
   */
  calculate(
    analysis: QualityAnalysis,
    grossQuantityKg: number,
    basePricePerTon: number
  ): QualityResult {

    const steps: CalculationStep[] = [];
    let stepNumber = 1;

    // PASO 1: Determinar grado por parámetro
    const gradeByParameter = this.determineGradeByParameter(analysis);
    steps.push({
      step: stepNumber++,
      description: 'Determinar grado por cada parámetro',
      input: analysis,
      output: Object.fromEntries(gradeByParameter)
    });

    // PASO 2: Aplicar regla del peor grado
    const { grade, worstParameter } = this.applyWorstGradeRule(gradeByParameter);
    steps.push({
      step: stepNumber++,
      description: 'Aplicar regla del peor grado',
      formula: 'Grado Final = min(todos los grados)',
      input: gradeByParameter,
      output: { grade, worstParameter }
    });

    // PASO 3: Bonificación/Descuento por grado
    const gradeFactor = this.calculateGradeFactor(grade);
    steps.push({
      step: stepNumber++,
      description: 'Bonificación/Descuento por grado',
      input: grade,
      output: gradeFactor
    });

    // PASO 4: Bonificaciones especiales
    const bonuses = this.calculateBonuses(analysis);
    const totalBonus = bonuses.reduce((sum, b) => sum + b.bonus_percent, 0);
    steps.push({
      step: stepNumber++,
      description: 'Calcular bonificaciones especiales',
      input: analysis,
      output: { bonuses, totalBonus }
    });

    // PASO 5: Descuentos proporcionales
    const discounts = this.calculateDiscounts(analysis);
    const totalDiscount = discounts.reduce((sum, d) => sum + d.discount_percent, 0);
    steps.push({
      step: stepNumber++,
      description: 'Calcular descuentos proporcionales',
      input: analysis,
      output: { discounts, totalDiscount }
    });

    // PASO 6: Factor final
    const baseFactor = 100;
    const finalFactor = baseFactor + gradeFactor + totalBonus - totalDiscount;
    steps.push({
      step: stepNumber++,
      description: 'Calcular factor final',
      formula: 'Factor = 100 + Bonif_Grado + Bonif_Especiales - Descuentos',
      input: { baseFactor, gradeFactor, totalBonus, totalDiscount },
      output: finalFactor
    });

    // PASO 7: Merma por humedad (sobre cantidad)
    const humidityWaste = this.calculateHumidityWaste(
      analysis.humidity,
      grossQuantityKg
    );
    steps.push({
      step: stepNumber++,
      description: 'Calcular merma por humedad (sobre cantidad)',
      input: { humidity: analysis.humidity, grossQuantityKg },
      output: humidityWaste
    });

    // PASO 8: Ajuste de precio
    const priceAdjustment = this.calculatePriceAdjustment(
      basePricePerTon,
      finalFactor,
      grossQuantityKg,
      humidityWaste.net_quantity_kg
    );
    steps.push({
      step: stepNumber++,
      description: 'Calcular precio ajustado',
      input: { basePricePerTon, finalFactor, grossQuantityKg },
      output: priceAdjustment
    });

    // PASO 9: Validaciones
    const warnings = this.validateQuality(analysis);
    const outOfStandard = warnings.some(w => w.type === 'out_of_standard');
    const outOfTolerance = warnings.some(w => w.type === 'out_of_tolerance');

    return {
      final_factor: finalFactor,
      base_factor: baseFactor,
      grade,
      grade_by_parameter: gradeByParameter,
      worst_parameter: worstParameter,
      bonuses,
      total_bonus: totalBonus,
      discounts,
      total_discount: totalDiscount,
      humidity_waste: humidityWaste,
      price_adjustment: priceAdjustment,
      out_of_standard: outOfStandard,
      out_of_tolerance: outOfTolerance,
      warnings,
      calculation_steps: steps
    };
  }

  /**
   * Métodos abstractos (cada grano implementa su lógica)
   */
  protected abstract determineGradeByParameter(
    analysis: QualityAnalysis
  ): Map<string, Grade>;

  protected abstract calculateGradeFactor(grade: Grade): number;

  protected abstract calculateBonuses(
    analysis: QualityAnalysis
  ): BonusDetail[];

  protected abstract calculateDiscounts(
    analysis: QualityAnalysis
  ): DiscountDetail[];

  /**
   * Métodos comunes
   */

  protected applyWorstGradeRule(
    gradeByParameter: Map<string, Grade>
  ): { grade: Grade; worstParameter: string | null } {

    const grades = Array.from(gradeByParameter.entries());

    if (grades.length === 0) {
      return { grade: null, worstParameter: null };
    }

    // Orden de peor a mejor: G3 > G2 > G1
    const gradeOrder: Record<string, number> = { 'G3': 3, 'G2': 2, 'G1': 1 };

    let worstGrade: Grade = null;
    let worstParameter: string | null = null;
    let worstValue = 0;

    for (const [param, grade] of grades) {
      if (grade === null) continue;

      const value = gradeOrder[grade];
      if (value > worstValue) {
        worstValue = value;
        worstGrade = grade;
        worstParameter = param;
      }
    }

    return { grade: worstGrade, worstParameter };
  }

  protected calculateHumidityWaste(
    actualHumidity: number,
    grossQuantityKg: number
  ): HumidityWaste {

    const baseHumidity = this.rules.parametros_base.humedad;

    if (actualHumidity <= baseHumidity) {
      return {
        base_humidity: baseHumidity,
        actual_humidity: actualHumidity,
        waste_percent: 0,
        waste_kg: 0,
        net_quantity_kg: grossQuantityKg,
        requires_drying: false
      };
    }

    // Buscar en tabla de mermas
    const mermaTable = this.rules.mermas_humedad;
    const mermaEntry = mermaTable.find((m: any) => m.valor === actualHumidity);

    const wastePercent = mermaEntry ? mermaEntry.merma : 0;
    const wasteKg = grossQuantityKg * (wastePercent / 100);
    const netQuantityKg = grossQuantityKg - wasteKg;

    return {
      base_humidity: baseHumidity,
      actual_humidity: actualHumidity,
      waste_percent: wastePercent,
      waste_kg: wasteKg,
      net_quantity_kg: netQuantityKg,
      requires_drying: true
    };
  }

  protected calculatePriceAdjustment(
    basePricePerTon: number,
    factor: number,
    grossQuantityKg: number,
    netQuantityKg: number
  ): PriceAdjustment {

    const adjustedPricePerTon = basePricePerTon * (factor / 100);
    const adjustmentPercent = factor - 100;

    const grossQuantityTon = grossQuantityKg / 1000;
    const netQuantityTon = netQuantityKg / 1000;

    const grossAmount = grossQuantityTon * basePricePerTon;
    const netAmount = netQuantityTon * adjustedPricePerTon;

    return {
      base_price_per_ton: basePricePerTon,
      adjusted_price_per_ton: adjustedPricePerTon,
      adjustment_percent: adjustmentPercent,
      gross_quantity_kg: grossQuantityKg,
      net_quantity_kg: netQuantityKg,
      gross_amount: grossAmount,
      net_amount: netAmount
    };
  }

  protected validateQuality(analysis: QualityAnalysis): QualityWarning[] {
    const warnings: QualityWarning[] = [];

    // Validar contra fuera de estándar
    if (this.rules.fuera_de_estandar) {
      for (const condition of this.rules.fuera_de_estandar) {
        const warning = this.checkOutOfStandard(analysis, condition);
        if (warning) {
          warnings.push(warning);
        }
      }
    }

    return warnings;
  }

  protected abstract checkOutOfStandard(
    analysis: QualityAnalysis,
    condition: string
  ): QualityWarning | null;

  /**
   * Helpers
   */

  protected calculateProportionalDiscount(
    value: number,
    base: number,
    factor: number
  ): number {
    if (value <= base) {
      return 0;
    }

    const excess = value - base;
    return excess * factor;
  }

  protected calculateProgressiveDiscount(
    value: number,
    tiers: Array<{ from: number; to: number; factor: number }>
  ): { total: number; tiers: TierDetail[] } {

    let totalDiscount = 0;
    const appliedTiers: TierDetail[] = [];

    for (const tier of tiers) {
      if (value <= tier.from) {
        break;
      }

      const applicableValue = Math.min(value, tier.to) - tier.from;
      const tierDiscount = applicableValue * tier.factor;

      totalDiscount += tierDiscount;

      appliedTiers.push({
        from: tier.from,
        to: Math.min(value, tier.to),
        factor: tier.factor,
        amount: tierDiscount
      });

      if (value <= tier.to) {
        break;
      }
    }

    return { total: totalDiscount, tiers: appliedTiers };
  }
}
