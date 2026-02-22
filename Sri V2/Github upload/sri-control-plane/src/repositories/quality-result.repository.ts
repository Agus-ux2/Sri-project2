/**
 * Quality Result Repository
 * Maneja resultados de cálculos de calidad
 */

import { PrismaClient, QualityResult, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface QualityResultWithRelations extends QualityResult {
  analysis?: any;
  ctgEntry?: any;
}

export class QualityResultRepository extends BaseRepository<QualityResult> {
  
  constructor(prisma: PrismaClient) {
    super(prisma);
  }
  
  /**
   * Crear nuevo resultado
   */
  async create(data: Prisma.QualityResultCreateInput): Promise<QualityResult> {
    return this.prisma.qualityResult.create({
      data,
      include: {
        analysis: true,
        ctgEntry: true
      }
    });
  }
  
  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<QualityResultWithRelations | null> {
    return this.prisma.qualityResult.findUnique({
      where: { id },
      include: {
        analysis: {
          include: {
            ctgEntry: true
          }
        },
        ctgEntry: true
      }
    });
  }
  
  /**
   * Buscar por análisis
   */
  async findByAnalysis(analysisId: string): Promise<QualityResult | null> {
    return this.prisma.qualityResult.findFirst({
      where: { analysisId },
      include: {
        analysis: true,
        ctgEntry: true
      },
      orderBy: {
        calculationDate: 'desc'
      }
    });
  }
  
  /**
   * Buscar por CTG entry
   */
  async findByCTGEntry(ctgEntryId: string): Promise<QualityResult | null> {
    return this.prisma.qualityResult.findFirst({
      where: { ctgEntryId },
      include: {
        analysis: true,
        ctgEntry: true
      },
      orderBy: {
        calculationDate: 'desc'
      }
    });
  }
  
  /**
   * Listar todos
   */
  async findAll(filters?: any): Promise<QualityResult[]> {
    return this.prisma.qualityResult.findMany({
      include: {
        analysis: {
          include: {
            ctgEntry: true
          }
        },
        ctgEntry: true
      },
      orderBy: {
        calculationDate: 'desc'
      }
    });
  }
  
  /**
   * Actualizar resultado
   */
  async update(id: string, data: Prisma.QualityResultUpdateInput): Promise<QualityResult> {
    return this.prisma.qualityResult.update({
      where: { id },
      data
    });
  }
  
  /**
   * Eliminar resultado
   */
  async delete(id: string): Promise<void> {
    await this.prisma.qualityResult.delete({
      where: { id }
    });
  }
  
  /**
   * Buscar resultados fuera de estándar
   */
  async findOutOfStandard(): Promise<QualityResult[]> {
    return this.prisma.qualityResult.findMany({
      where: {
        OR: [
          { outOfStandard: true },
          { outOfTolerance: true }
        ]
      },
      include: {
        analysis: {
          include: {
            ctgEntry: true
          }
        }
      },
      orderBy: {
        calculationDate: 'desc'
      }
    });
  }
  
  /**
   * Estadísticas de factores
   */
  async getFactorStatistics(grainType?: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.QualityResultWhereInput = {};
    
    if (grainType || dateFrom || dateTo) {
      where.analysis = {};
      
      if (grainType) {
        where.analysis.grainType = grainType;
      }
      
      if (dateFrom || dateTo) {
        where.analysis.analysisDate = {};
        if (dateFrom) where.analysis.analysisDate.gte = dateFrom;
        if (dateTo) where.analysis.analysisDate.lte = dateTo;
      }
    }
    
    const stats = await this.prisma.qualityResult.aggregate({
      where,
      _count: true,
      _avg: {
        finalFactor: true,
        totalBonus: true,
        totalDiscount: true,
        totalWastePct: true
      },
      _min: {
        finalFactor: true
      },
      _max: {
        finalFactor: true
      }
    });
    
    return {
      totalResults: stats._count,
      averageFactor: stats._avg.finalFactor?.toNumber() || 0,
      averageBonus: stats._avg.totalBonus?.toNumber() || 0,
      averageDiscount: stats._avg.totalDiscount?.toNumber() || 0,
      averageWaste: stats._avg.totalWastePct?.toNumber() || 0,
      minFactor: stats._min.finalFactor?.toNumber() || 0,
      maxFactor: stats._max.finalFactor?.toNumber() || 0
    };
  }
  
  /**
   * Comparar factor calculado vs liquidado
   */
  async compareFactors(settlementId: string) {
    const results = await this.prisma.$queryRaw`
      SELECT 
        ce.ctg_number,
        ce.factor as liquidated_factor,
        qr.final_factor as calculated_factor,
        (qr.final_factor - ce.factor) as difference,
        ABS(qr.final_factor - ce.factor) as abs_difference,
        CASE 
          WHEN ABS(qr.final_factor - ce.factor) < 0.1 THEN 'OK'
          WHEN ABS(qr.final_factor - ce.factor) < 0.5 THEN 'WARNING'
          ELSE 'CRITICAL'
        END as status
      FROM ctg_entries ce
      INNER JOIN quality_results qr ON ce.id = qr.ctg_entry_id
      WHERE ce.settlement_id = ${settlementId}::uuid
      ORDER BY abs_difference DESC
    `;
    
    return results;
  }
}

export default QualityResultRepository;
