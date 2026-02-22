/**
 * Factory y Servicio Principal de Calidad
 * 
 * Orquesta el cálculo de calidad para todos los granos
 */

import { QualityCalculator } from './base.calculator';
import { QualityAnalysis, QualityResult, GrainType } from '../types';
import SojaQualityCalculator from './soja.calculator';
import TrigoQualityCalculator from './trigo.calculator';
import MaizQualityCalculator from './maiz.calculator';
import SorgoQualityCalculator from './sorgo.calculator';
import GirasolQualityCalculator from './girasol.calculator';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// ============================================================================
// FACTORY
// ============================================================================

export class QualityCalculatorFactory {
  private static rulesCache: Map<GrainType, any> = new Map();

  /**
   * Crear calculador específico para el grano
   */
  static create(grainType: GrainType): QualityCalculator {
    // Cargar reglas del JSON
    const rules = this.loadRules(grainType);

    switch (grainType) {
      case 'soja':
        return new SojaQualityCalculator(grainType, rules);

      case 'trigo':
        return new TrigoQualityCalculator(grainType, rules);

      case 'maiz':
        return new MaizQualityCalculator(grainType, rules);

      case 'sorgo':
        return new SorgoQualityCalculator(grainType, rules);

      case 'girasol':
        return new GirasolQualityCalculator(grainType, rules);

      default:
        throw new Error(`Unknown grain type: ${grainType}`);
    }
  }

  /**
   * Cargar reglas desde JSON
   */
  private static loadRules(grainType: GrainType): any {
    // Verificar cache
    if (this.rulesCache.has(grainType)) {
      return this.rulesCache.get(grainType);
    }

    // Cargar desde archivo
    const rulesPath = path.join(__dirname, '../../rules', `${grainType}.json`);

    try {
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      const rules = JSON.parse(rulesContent);

      // Guardar en cache
      this.rulesCache.set(grainType, rules);

      return rules;
    } catch (error) {
      logger.error('Error loading quality rules', { grainType, error });
      throw new Error(`Failed to load rules for ${grainType}`);
    }
  }

  /**
   * Limpiar cache de reglas
   */
  static clearCache(): void {
    this.rulesCache.clear();
  }
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

export class QualityService {

  /**
   * Calcular factor de calidad
   */
  async calculateQuality(
    analysis: QualityAnalysis,
    grossQuantityKg: number,
    basePricePerTon: number
  ): Promise<QualityResult> {

    try {
      logger.info('Calculating quality', {
        grain: analysis.grain_type,
        ctg: analysis.ctg_number
      });

      // Crear calculador específico
      const calculator = QualityCalculatorFactory.create(analysis.grain_type);

      // Calcular
      const result = calculator.calculate(
        analysis,
        grossQuantityKg,
        basePricePerTon
      );

      // Guardar resultado en DB
      await this.saveQualityResult(analysis, result);

      logger.info('Quality calculated successfully', {
        grain: analysis.grain_type,
        ctg: analysis.ctg_number,
        factor: result.final_factor
      });

      return result;

    } catch (error) {
      logger.error('Error calculating quality', {
        grain: analysis.grain_type,
        ctg: analysis.ctg_number,
        error
      });
      throw error;
    }
  }

  /**
   * Calcular para múltiples CTGs (promedio ponderado)
   */
  async calculateForMultipleCTGs(
    analyses: Array<{ analysis: QualityAnalysis; quantityKg: number }>,
    basePricePerTon: number
  ): Promise<QualityResult> {

    // Calcular para cada CTG
    const results = await Promise.all(
      analyses.map(({ analysis, quantityKg }) =>
        this.calculateQuality(analysis, quantityKg, basePricePerTon)
      )
    );

    // Calcular factor promedio ponderado
    const totalQuantity = analyses.reduce((sum, a) => sum + a.quantityKg, 0);

    let weightedFactor = 0;
    let weightedBonus = 0;
    let weightedDiscount = 0;

    for (let i = 0; i < results.length; i++) {
      const weight = analyses[i].quantityKg / totalQuantity;
      weightedFactor += results[i].final_factor * weight;
      weightedBonus += results[i].total_bonus * weight;
      weightedDiscount += results[i].total_discount * weight;
    }

    // Determinar peor grado
    const grades = results
      .map(r => r.grade)
      .filter(g => g !== null);

    const worstGrade = grades.length > 0
      ? this.getWorstGrade(grades as any[])
      : null;

    // Calcular merma total
    const totalGrossQuantity = analyses.reduce((sum, a) => sum + a.quantityKg, 0);
    const totalNetQuantity = results.reduce((sum, r) => sum + r.humidity_waste.net_quantity_kg, 0);
    const totalWasteKg = totalGrossQuantity - totalNetQuantity;
    const totalWastePercent = (totalWasteKg / totalGrossQuantity) * 100;

    // Construir resultado consolidado
    return {
      final_factor: weightedFactor,
      base_factor: 100,
      grade: worstGrade,
      grade_by_parameter: new Map(),
      worst_parameter: null,
      bonuses: [],
      total_bonus: weightedBonus,
      discounts: [],
      total_discount: weightedDiscount,
      humidity_waste: {
        base_humidity: 0,
        actual_humidity: 0,
        waste_percent: totalWastePercent,
        waste_kg: totalWasteKg,
        net_quantity_kg: totalNetQuantity,
        requires_drying: results.some(r => r.humidity_waste.requires_drying)
      },
      price_adjustment: {
        base_price_per_ton: basePricePerTon,
        adjusted_price_per_ton: basePricePerTon * (weightedFactor / 100),
        adjustment_percent: weightedFactor - 100,
        gross_quantity_kg: totalGrossQuantity,
        net_quantity_kg: totalNetQuantity,
        gross_amount: 0,
        net_amount: 0
      },
      out_of_standard: results.some(r => r.out_of_standard),
      out_of_tolerance: results.some(r => r.out_of_tolerance),
      warnings: results.flatMap(r => r.warnings),
      calculation_steps: []
    };
  }

  /**
   * Guardar resultado en base de datos
   */
  private async saveQualityResult(
    analysis: QualityAnalysis,
    result: QualityResult
  ): Promise<void> {
    try {
      // TODO: Implementar guardado en DB
      logger.debug('Quality result saved', {
        ctg: analysis.ctg_number,
        factor: result.final_factor
      });
    } catch (error) {
      logger.error('Error saving quality result', { error });
    }
  }

  /**
   * Helper: Determinar peor grado
   */
  private getWorstGrade(grades: Array<'G1' | 'G2' | 'G3'>): 'G1' | 'G2' | 'G3' {
    if (grades.includes('G3')) return 'G3';
    if (grades.includes('G2')) return 'G2';
    return 'G1';
  }

  /**
   * Obtener análisis por CTG
   */
  async getAnalysisByCTG(ctgNumber: string): Promise<QualityAnalysis | null> {
    try {
      // TODO: Implementar consulta a DB
      return null;
    } catch (error) {
      logger.error('Error getting analysis by CTG', { ctgNumber, error });
      return null;
    }
  }

  /**
   * Obtener todos los análisis de una liquidación
   */
  async getAnalysesBySettlement(settlementId: string): Promise<QualityAnalysis[]> {
    try {
      // TODO: Implementar consulta a DB
      return [];
    } catch (error) {
      logger.error('Error getting analyses by settlement', { settlementId, error });
      return [];
    }
  }
}

export default new QualityService();
