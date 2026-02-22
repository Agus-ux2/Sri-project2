/**
 * Settlement Repository
 * Maneja todas las operaciones de base de datos para liquidaciones
 */

import { PrismaClient, Settlement, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface SettlementWithRelations extends Settlement {
  company?: any;
  ctgEntries?: any[];
}

export interface SettlementFilters {
  companyId?: string;
  grainType?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  settlementNumber?: string;
}

export class SettlementRepository extends BaseRepository<Settlement> {
  
  constructor(prisma: PrismaClient) {
    super(prisma);
  }
  
  /**
   * Crear nueva liquidación
   */
  async create(data: Prisma.SettlementCreateInput): Promise<Settlement> {
    return this.prisma.settlement.create({
      data,
      include: {
        company: true,
        ctgEntries: true
      }
    });
  }
  
  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<SettlementWithRelations | null> {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: {
        company: true,
        ctgEntries: {
          include: {
            qualityAnalyses: true,
            qualityResults: true
          }
        }
      }
    });
  }
  
  /**
   * Buscar por número de liquidación
   */
  async findByNumber(settlementNumber: string): Promise<SettlementWithRelations | null> {
    return this.prisma.settlement.findUnique({
      where: { settlementNumber },
      include: {
        company: true,
        ctgEntries: {
          include: {
            qualityAnalyses: true,
            qualityResults: true
          }
        }
      }
    });
  }
  
  /**
   * Listar con filtros
   */
  async findAll(filters?: SettlementFilters): Promise<Settlement[]> {
    const where: Prisma.SettlementWhereInput = {};
    
    if (filters) {
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.grainType) where.grainType = filters.grainType;
      if (filters.status) where.status = filters.status;
      if (filters.settlementNumber) {
        where.settlementNumber = {
          contains: filters.settlementNumber,
          mode: 'insensitive'
        };
      }
      if (filters.dateFrom || filters.dateTo) {
        where.settlementDate = {};
        if (filters.dateFrom) where.settlementDate.gte = filters.dateFrom;
        if (filters.dateTo) where.settlementDate.lte = filters.dateTo;
      }
    }
    
    return this.prisma.settlement.findMany({
      where,
      include: {
        company: true,
        ctgEntries: true
      },
      orderBy: {
        settlementDate: 'desc'
      }
    });
  }
  
  /**
   * Actualizar liquidación
   */
  async update(id: string, data: Prisma.SettlementUpdateInput): Promise<Settlement> {
    return this.prisma.settlement.update({
      where: { id },
      data
    });
  }
  
  /**
   * Eliminar liquidación
   */
  async delete(id: string): Promise<void> {
    await this.prisma.settlement.delete({
      where: { id }
    });
  }
  
  /**
   * Validar liquidación
   */
  async validate(id: string, userId: string, notes?: string): Promise<Settlement> {
    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'validated',
        validatedAt: new Date(),
        validatedBy: userId,
        validationNotes: notes
      }
    });
  }
  
  /**
   * Obtener estadísticas
   */
  async getStatistics(filters?: SettlementFilters) {
    const where: Prisma.SettlementWhereInput = {};
    
    if (filters) {
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.grainType) where.grainType = filters.grainType;
      if (filters.dateFrom || filters.dateTo) {
        where.settlementDate = {};
        if (filters.dateFrom) where.settlementDate.gte = filters.dateFrom;
        if (filters.dateTo) where.settlementDate.lte = filters.dateTo;
      }
    }
    
    const stats = await this.prisma.settlement.aggregate({
      where,
      _count: true,
      _sum: {
        totalNetKg: true,
        netAmount: true
      },
      _avg: {
        averageFactor: true
      }
    });
    
    return {
      totalSettlements: stats._count,
      totalKg: stats._sum.totalNetKg?.toNumber() || 0,
      totalAmount: stats._sum.netAmount?.toNumber() || 0,
      averageFactor: stats._avg.averageFactor?.toNumber() || 0
    };
  }
  
  /**
   * Buscar liquidaciones con discrepancias de factor
   */
  async findWithFactorDiscrepancies(threshold: number = 0.5): Promise<any[]> {
    // Query complejo usando raw SQL
    const results = await this.prisma.$queryRaw`
      SELECT 
        s.settlement_number,
        s.settlement_date,
        c.ctg_number,
        c.factor as liquidated_factor,
        qr.final_factor as calculated_factor,
        ABS(c.factor - qr.final_factor) as difference
      FROM settlements s
      INNER JOIN ctg_entries c ON s.id = c.settlement_id
      INNER JOIN quality_results qr ON c.id = qr.ctg_entry_id
      WHERE ABS(c.factor - qr.final_factor) > ${threshold}
      ORDER BY difference DESC
    `;
    
    return results as any[];
  }
}

export default SettlementRepository;
