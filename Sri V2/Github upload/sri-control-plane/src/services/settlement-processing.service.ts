/**
 * Settlement Processing Service
 * Integra TODO el sistema: Parser → DB → Calidad → Validación
 * 
 * Este es el servicio principal que orquesta:
 * 1. Parseo de PDFs
 * 2. Guardado en base de datos
 * 3. Cálculo de calidad
 * 4. Comparación de factores
 * 5. Generación de alertas
 */

import { PrismaClient } from '@prisma/client';
import { SettlementParser } from '../parsers/settlement.parser';
import { QualityService } from '../quality/quality.service';
import { SettlementRepository } from '../repositories/settlement.repository';
import { QualityAnalysisRepository } from '../repositories/quality-analysis.repository';
import { QualityResultRepository } from '../repositories/quality-result.repository';
import { Settlement } from '../types/settlement.types';
import { QualityAnalysis } from '../types';

export interface ProcessingResult {
  success: boolean;
  settlement: {
    id: string;
    number: string;
    date: Date;
    totalAmount: number;
    status: string;
  };
  ctgs: {
    total: number;
    processed: number;
    withAnalysis: number;
    withQuality: number;
  };
  discrepancies: Array<{
    ctgNumber: string;
    liquidatedFactor: number;
    calculatedFactor: number;
    difference: number;
    status: 'OK' | 'WARNING' | 'CRITICAL';
  }>;
  warnings: string[];
  errors: string[];
}

export class SettlementProcessingService {
  private prisma: PrismaClient;
  private settlementParser: SettlementParser;
  private qualityService: QualityService;
  private settlementRepo: SettlementRepository;
  private analysisRepo: QualityAnalysisRepository;
  private resultRepo: QualityResultRepository;

  constructor() {
    this.prisma = new PrismaClient();
    this.settlementParser = new SettlementParser();
    this.qualityService = new QualityService();
    this.settlementRepo = new SettlementRepository(this.prisma);
    this.analysisRepo = new QualityAnalysisRepository(this.prisma);
    this.resultRepo = new QualityResultRepository(this.prisma);
  }

  /**
   * PROCESO COMPLETO: PDF → DB → Calidad → Validación
   */
  async processPDF(
    pdfBuffer: Buffer,
    companyId: string,
    userId?: string
  ): Promise<ProcessingResult> {

    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // ========================================================================
      // PASO 1: PARSEAR PDF
      // ========================================================================
      console.log('📄 Paso 1: Parseando PDF...');
      const parsedSettlement: any = await this.settlementParser.parse(pdfBuffer as any);

      console.log(`✅ PDF parseado: ${parsedSettlement.number}`);
      console.log(`   CTGs encontrados: ${parsedSettlement.ctgs.length}`);

      // ========================================================================
      // PASO 2: GUARDAR EN BASE DE DATOS
      // ========================================================================
      console.log('\n💾 Paso 2: Guardando en base de datos...');

      // Verificar si ya existe
      const existing = await this.settlementRepo.findByNumber(parsedSettlement.number);
      if (existing) {
        warnings.push(`Liquidación ${parsedSettlement.number} ya existe en la base de datos`);

        // Opción: actualizar o retornar error
        return {
          success: false,
          settlement: {
            id: existing.id,
            number: existing.settlementNumber,
            date: existing.settlementDate,
            totalAmount: existing.netAmount.toNumber(),
            status: existing.status
          },
          ctgs: { total: 0, processed: 0, withAnalysis: 0, withQuality: 0 },
          discrepancies: [],
          warnings,
          errors: ['Liquidación duplicada']
        };
      }

      // Guardar settlement
      const savedSettlement = await this.prisma.settlement.create({
        data: {
          settlementNumber: parsedSettlement.number,
          companyId,
          settlementDate: parsedSettlement.date,
          operationDate: parsedSettlement.operation_date,
          grainType: parsedSettlement.grain_type,
          basePricePerTon: parsedSettlement.base_price_per_ton,
          totalGrossKg: parsedSettlement.gross_kg,
          totalNetKg: parsedSettlement.net_kg,
          totalWasteKg: parsedSettlement.gross_kg - parsedSettlement.net_kg,
          averageFactor: parsedSettlement.avg_factor,
          grossAmount: parsedSettlement.gross_amount,
          commercialDiscount: parsedSettlement.commercial_discount || 0,
          commissionAmount: parsedSettlement.commission || 0,
          netAmount: parsedSettlement.net_amount,
          status: 'draft',
          createdBy: userId,
          // Guardar CTGs
          ctgEntries: {
            create: parsedSettlement.ctgs.map((ctg, index) => ({
              ctgNumber: ctg.ctg_number,
              cpNumber: ctg.cp_number,
              grossKg: ctg.gross_kg,
              netKg: ctg.net_kg,
              wasteKg: ctg.gross_kg - ctg.net_kg,
              factor: ctg.factor,
              basePricePerTon: parsedSettlement.base_price_per_ton,
              adjustedPricePerTon: ctg.adjusted_price,
              commercialDiscount: ctg.commercial_discount || 0,
              freightPerTon: ctg.freight || 0,
              grossAmount: ctg.gross_amount,
              netAmount: ctg.net_amount,
              lineNumber: index + 1
            }))
          }
        },
        include: {
          ctgEntries: true
        }
      });

      console.log(`✅ Liquidación guardada: ID ${savedSettlement.id}`);
      console.log(`   CTGs guardados: ${savedSettlement.ctgEntries.length}`);

      // ========================================================================
      // PASO 3: PROCESAR CALIDAD PARA CADA CTG
      // ========================================================================
      console.log('\n🔬 Paso 3: Procesando calidad de CTGs...');

      const discrepancies: ProcessingResult['discrepancies'] = [];
      let ctgsWithAnalysis = 0;
      let ctgsWithQuality = 0;

      for (const ctgEntry of savedSettlement.ctgEntries) {
        try {
          // Buscar análisis en DB
          const analysis = await this.analysisRepo.findByCTG(ctgEntry.ctgNumber);

          if (!analysis) {
            warnings.push(`CTG ${ctgEntry.ctgNumber}: No se encontró análisis de calidad`);
            continue;
          }

          ctgsWithAnalysis++;
          console.log(`   Procesando CTG ${ctgEntry.ctgNumber}...`);

          // Calcular calidad
          const qualityResult = await this.qualityService.calculateQuality(
            this.mapAnalysisToQualityInput(analysis),
            ctgEntry.grossKg.toNumber(),
            savedSettlement.basePricePerTon.toNumber()
          );

          // Guardar resultado en DB
          const savedResult = await this.prisma.qualityResult.create({
            data: {
              analysisId: analysis.id,
              ctgEntryId: ctgEntry.id,
              baseFactor: qualityResult.base_factor,
              finalFactor: qualityResult.final_factor,
              grade: qualityResult.grade,
              gradeAdjustment: qualityResult.grade ? this.getGradeAdjustment(qualityResult.grade) : 0,
              worstParameter: qualityResult.worst_parameter,
              totalBonus: qualityResult.total_bonus,
              bonusDetails: qualityResult.bonuses as any,
              totalDiscount: qualityResult.total_discount,
              discountDetails: qualityResult.discounts as any,
              baseHumidity: qualityResult.humidity_waste.base_humidity,
              actualHumidity: qualityResult.humidity_waste.actual_humidity,
              dryingWastePct: (qualityResult.humidity_waste as any).drying_waste_percent || 0,
              handlingWastePct: (qualityResult.humidity_waste as any).handling_waste_percent || 0,
              totalWastePct: qualityResult.humidity_waste.waste_percent,
              wasteKg: qualityResult.humidity_waste.waste_kg,
              requiresDrying: qualityResult.humidity_waste.requires_drying,
              grossQuantityKg: ctgEntry.grossKg,
              netQuantityKg: qualityResult.humidity_waste.net_quantity_kg,
              basePricePerTon: qualityResult.price_adjustment.base_price_per_ton,
              adjustedPricePerTon: qualityResult.price_adjustment.adjusted_price_per_ton,
              priceAdjustmentPct: qualityResult.price_adjustment.adjustment_percent,
              grossAmount: qualityResult.price_adjustment.gross_amount,
              netAmount: qualityResult.price_adjustment.net_amount,
              outOfStandard: qualityResult.out_of_standard,
              outOfTolerance: qualityResult.out_of_tolerance,
              warnings: qualityResult.warnings as any,
              calculationVersion: '1.0.0',
              calculationSteps: qualityResult.calculation_steps as any
            }
          });

          ctgsWithQuality++;
          console.log(`   ✅ Calidad calculada: Factor ${qualityResult.final_factor.toFixed(3)}`);

          // Comparar con factor liquidado
          const liquidatedFactor = ctgEntry.factor?.toNumber() || 0;
          const calculatedFactor = qualityResult.final_factor;
          const difference = calculatedFactor - liquidatedFactor;
          const absDifference = Math.abs(difference);

          let status: 'OK' | 'WARNING' | 'CRITICAL';
          if (absDifference < 0.1) status = 'OK';
          else if (absDifference < 0.5) status = 'WARNING';
          else status = 'CRITICAL';

          if (status !== 'OK') {
            discrepancies.push({
              ctgNumber: ctgEntry.ctgNumber,
              liquidatedFactor,
              calculatedFactor,
              difference,
              status
            });

            console.log(`   ⚠️  Discrepancia: Liquidado ${liquidatedFactor.toFixed(3)} vs Calculado ${calculatedFactor.toFixed(3)} (Δ ${difference.toFixed(3)})`);
          }

        } catch (error) {
          errors.push(`CTG ${ctgEntry.ctgNumber}: Error procesando calidad - ${error.message}`);
          console.error(`   ❌ Error en CTG ${ctgEntry.ctgNumber}:`, error.message);
        }
      }

      // ========================================================================
      // PASO 4: ACTUALIZAR ESTADO SI APLICA
      // ========================================================================
      console.log('\n📊 Paso 4: Finalizando...');

      let finalStatus = 'draft';
      if (discrepancies.length === 0 && ctgsWithQuality === savedSettlement.ctgEntries.length) {
        finalStatus = 'validated';
        await this.settlementRepo.update(savedSettlement.id, {
          status: finalStatus,
          validatedAt: new Date(),
          validatedBy: userId
        });
      }

      // ========================================================================
      // RESULTADO FINAL
      // ========================================================================
      const result: ProcessingResult = {
        success: true,
        settlement: {
          id: savedSettlement.id,
          number: savedSettlement.settlementNumber,
          date: savedSettlement.settlementDate,
          totalAmount: savedSettlement.netAmount.toNumber(),
          status: finalStatus
        },
        ctgs: {
          total: savedSettlement.ctgEntries.length,
          processed: savedSettlement.ctgEntries.length,
          withAnalysis: ctgsWithAnalysis,
          withQuality: ctgsWithQuality
        },
        discrepancies: discrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
        warnings,
        errors
      };

      // Log resumen
      console.log('\n' + '='.repeat(70));
      console.log('✅ PROCESO COMPLETADO');
      console.log('='.repeat(70));
      console.log(`Liquidación: ${result.settlement.number}`);
      console.log(`CTGs procesados: ${result.ctgs.processed}/${result.ctgs.total}`);
      console.log(`Con análisis: ${result.ctgs.withAnalysis}`);
      console.log(`Con calidad calculada: ${result.ctgs.withQuality}`);
      console.log(`Discrepancias: ${result.discrepancies.length}`);
      console.log(`Estado final: ${result.settlement.status}`);
      console.log('='.repeat(70));

      return result;

    } catch (error) {
      console.error('❌ Error en procesamiento:', error);
      throw error;
    }
  }

  /**
   * Recalcular calidad para CTGs existentes
   */
  async recalculateQuality(settlementId: string): Promise<ProcessingResult> {
    console.log(`🔄 Recalculando calidad para liquidación ${settlementId}...`);

    const settlement = await this.settlementRepo.findById(settlementId);
    if (!settlement) {
      throw new Error(`Liquidación ${settlementId} no encontrada`);
    }

    const discrepancies: ProcessingResult['discrepancies'] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    let ctgsWithAnalysis = 0;
    let ctgsWithQuality = 0;

    for (const ctgEntry of settlement.ctgEntries || []) {
      try {
        const analysis = await this.analysisRepo.findByCTG(ctgEntry.ctgNumber);

        if (!analysis) {
          warnings.push(`CTG ${ctgEntry.ctgNumber}: No tiene análisis`);
          continue;
        }

        ctgsWithAnalysis++;

        // Eliminar resultado anterior si existe
        const existingResult = await this.resultRepo.findByCTGEntry(ctgEntry.id);
        if (existingResult) {
          await this.resultRepo.delete(existingResult.id);
        }

        // Calcular nuevamente
        const qualityResult = await this.qualityService.calculateQuality(
          this.mapAnalysisToQualityInput(analysis),
          ctgEntry.grossKg.toNumber(),
          settlement.basePricePerTon.toNumber()
        );

        // Guardar resultado
        await this.prisma.qualityResult.create({
          data: {
            analysisId: analysis.id,
            ctgEntryId: ctgEntry.id,
            finalFactor: qualityResult.final_factor,
            // ... resto de campos
          } as any
        });

        ctgsWithQuality++;

        // Comparar
        const difference = qualityResult.final_factor - (ctgEntry.factor?.toNumber() || 0);
        if (Math.abs(difference) > 0.1) {
          discrepancies.push({
            ctgNumber: ctgEntry.ctgNumber,
            liquidatedFactor: ctgEntry.factor?.toNumber() || 0,
            calculatedFactor: qualityResult.final_factor,
            difference,
            status: Math.abs(difference) < 0.5 ? 'WARNING' : 'CRITICAL'
          });
        }

      } catch (error) {
        errors.push(`CTG ${ctgEntry.ctgNumber}: ${error.message}`);
      }
    }

    return {
      success: true,
      settlement: {
        id: settlement.id,
        number: settlement.settlementNumber,
        date: settlement.settlementDate,
        totalAmount: settlement.netAmount.toNumber(),
        status: settlement.status
      },
      ctgs: {
        total: settlement.ctgEntries?.length || 0,
        processed: settlement.ctgEntries?.length || 0,
        withAnalysis: ctgsWithAnalysis,
        withQuality: ctgsWithQuality
      },
      discrepancies,
      warnings,
      errors
    };
  }

  /**
   * Helper: Mapear análisis de DB a formato de calidad
   */
  private mapAnalysisToQualityInput(analysis: any): QualityAnalysis {
    return {
      id: analysis.id,
      ctg_number: analysis.ctgNumber,
      grain_type: analysis.grainType as any,
      analysis_date: analysis.analysisDate,
      humidity: analysis.humidity.toNumber(),
      foreign_matter: analysis.foreignMatter.toNumber(),
      damaged_grains: analysis.damagedGrains.toNumber(),
      hectoliter_weight: analysis.hectoliterWeight?.toNumber(),
      protein: analysis.protein?.toNumber(),
      fat_content: analysis.fatContent?.toNumber(),
      broken_grains: analysis.brokenGrains?.toNumber(),
      green_grains: analysis.greenGrains?.toNumber(),
      black_grains: analysis.blackGrains?.toNumber(),
      panza_blanca: analysis.panzaBlanca?.toNumber(),
      acidity: analysis.acidity?.toNumber(),
      laboratory: analysis.laboratory || '',
      analyst: analysis.analyst || ''
    };
  }

  /**
   * Helper: Obtener ajuste de grado
   */
  private getGradeAdjustment(grade: string): number {
    switch (grade) {
      case 'G1': return 1.0;
      case 'G2': return 0;
      case 'G3': return -1.5;
      default: return 0;
    }
  }

  /**
   * Cerrar conexiones
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default SettlementProcessingService;
