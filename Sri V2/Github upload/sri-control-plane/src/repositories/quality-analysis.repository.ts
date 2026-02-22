/**
 * Quality Analysis Repository
 * Maneja análisis de laboratorio
 */

import { PrismaClient, QualityAnalysis, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface QualityAnalysisWithRelations extends QualityAnalysis {
  ctgEntry?: any;
  qualityResults?: any[];
}

export interface AnalysisFilters {
  ctgNumber?: string;
  grainType?: string;
  laboratory?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class QualityAnalysisRepository extends BaseRepository<QualityAnalysis> {
  
  constructor(prisma: PrismaClient) {
    super(prisma);
  }
  
  /**
   * Crear nuevo análisis
   */
  async create(data: Prisma.QualityAnalysisCreateInput): Promise<QualityAnalysis> {
    return this.prisma.qualityAnalysis.create({
      data,
      include: {
        ctgEntry: true,
        qualityResults: true
      }
    });
  }
  
  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<QualityAnalysisWithRelations | null> {
    return this.prisma.qualityAnalysis.findUnique({
      where: { id },
      include: {
        ctgEntry: true,
        qualityResults: true
      }
    });
  }
  
  /**
   * Buscar por CTG
   */
  async findByCTG(ctgNumber: string): Promise<QualityAnalysis | null> {
    return this.prisma.qualityAnalysis.findFirst({
      where: { ctgNumber },
      include: {
        ctgEntry: true,
        qualityResults: true
      },
      orderBy: {
        analysisDate: 'desc'
      }
    });
  }
  
  /**
   * Listar con filtros
   */
  async findAll(filters?: AnalysisFilters): Promise<QualityAnalysis[]> {
    const where: Prisma.QualityAnalysisWhereInput = {};
    
    if (filters) {
      if (filters.ctgNumber) {
        where.ctgNumber = {
          contains: filters.ctgNumber,
          mode: 'insensitive'
        };
      }
      if (filters.grainType) where.grainType = filters.grainType;
      if (filters.laboratory) {
        where.laboratory = {
          contains: filters.laboratory,
          mode: 'insensitive'
        };
      }
      if (filters.dateFrom || filters.dateTo) {
        where.analysisDate = {};
        if (filters.dateFrom) where.analysisDate.gte = filters.dateFrom;
        if (filters.dateTo) where.analysisDate.lte = filters.dateTo;
      }
    }
    
    return this.prisma.qualityAnalysis.findMany({
      where,
      include: {
        ctgEntry: true,
        qualityResults: true
      },
      orderBy: {
        analysisDate: 'desc'
      }
    });
  }
  
  /**
   * Actualizar análisis
   */
  async update(id: string, data: Prisma.QualityAnalysisUpdateInput): Promise<QualityAnalysis> {
    return this.prisma.qualityAnalysis.update({
      where: { id },
      data
    });
  }
  
  /**
   * Eliminar análisis
   */
  async delete(id: string): Promise<void> {
    await this.prisma.qualityAnalysis.delete({
      where: { id }
    });
  }
  
  /**
   * Buscar análisis sin resultado calculado
   */
  async findWithoutResults(): Promise<QualityAnalysis[]> {
    return this.prisma.qualityAnalysis.findMany({
      where: {
        qualityResults: {
          none: {}
        }
      },
      include: {
        ctgEntry: true
      }
    });
  }
  
  /**
   * Estadísticas por grano
   */
  async getStatisticsByGrain(grainType: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.QualityAnalysisWhereInput = {
      grainType
    };
    
    if (dateFrom || dateTo) {
      where.analysisDate = {};
      if (dateFrom) where.analysisDate.gte = dateFrom;
      if (dateTo) where.analysisDate.lte = dateTo;
    }
    
    const stats = await this.prisma.qualityAnalysis.aggregate({
      where,
      _count: true,
      _avg: {
        humidity: true,
        foreignMatter: true,
        damagedGrains: true
      }
    });
    
    return {
      totalAnalyses: stats._count,
      averageHumidity: stats._avg.humidity?.toNumber() || 0,
      averageForeignMatter: stats._avg.foreignMatter?.toNumber() || 0,
      averageDamagedGrains: stats._avg.damagedGrains?.toNumber() || 0
    };
  }
}

export default QualityAnalysisRepository;
