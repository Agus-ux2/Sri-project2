/**
 * Servicio Principal de Liquidaciones
 * 
 * Orquesta:
 * - Parseo de documentos
 * - Validación
 * - Almacenamiento en DB
 * - Generación de alertas
 * - Notificaciones
 */

import { Settlement, ParsedDocument, ValidationResult } from '../types';
import settlementParser from '../parsers/settlement.parser';
import settlementValidator from '../validators/settlement.validator';
import settlementAlertService from './settlement-alerts-inapp.service';
import { logger } from '../utils/logger';
import db from '../db/client';

export class SettlementService {
  
  /**
   * Procesar una liquidación completa
   * (parseo, validación, almacenamiento, alertas)
   */
  async processSettlement(document: ParsedDocument): Promise<{
    success: boolean;
    settlement?: Settlement;
    validation?: ValidationResult;
    errors?: string[];
  }> {
    try {
      logger.info('Processing settlement', { coe: document.coe });
      
      // 1. Parsear documento
      const settlement = settlementParser.parse(document);
      
      // 2. Validar
      const validation = await settlementValidator.validate(settlement);
      
      // 3. Guardar en base de datos
      const saved = await this.saveSettlement(settlement, validation);
      
      if (!saved) {
        return {
          success: false,
          errors: ['Failed to save settlement to database']
        };
      }
      
      // 4. Generar alertas (si corresponde)
      await this.generateAlerts(settlement);
      
      // 5. Crear notificaciones
      await this.createNotifications(settlement, validation);
      
      logger.info('Settlement processed successfully', {
        coe: settlement.coe,
        type: settlement.settlement_type,
        valid: validation.valid
      });
      
      return {
        success: true,
        settlement,
        validation
      };
      
    } catch (error) {
      logger.error('Error processing settlement', { error, coe: document.coe });
      
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
  
  /**
   * Guardar liquidación en base de datos
   */
  private async saveSettlement(
    settlement: Settlement,
    validation: ValidationResult
  ): Promise<boolean> {
    try {
      const query = `
        INSERT INTO settlements (
          id, coe, settlement_type, settlement_date,
          buyer_cuit, buyer_name, seller_cuit, seller_name,
          broker_cuit, broker_name,
          product, contracted_grade, delivered_grade,
          quality_factor, protein_content,
          quantity_kg, price_per_kg, subtotal,
          iva_rate, iva_amount, total_operation,
          total_deductions, total_withholdings, net_amount,
          percentage_liquidated, percentage_retained, retained_amount,
          original_coe, adjustment_type,
          price_breakdown, ctgs, total_ctgs,
          deductions, withholdings,
          is_canje, is_out_of_grade,
          validation_status, validation_errors,
          additional_data, raw_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34,
          $35, $36, $37, $38, $39, $40, $41, $42
        )
        ON CONFLICT (coe) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          validation_status = EXCLUDED.validation_status,
          validation_errors = EXCLUDED.validation_errors
      `;
      
      const values = [
        settlement.id,
        settlement.coe,
        settlement.settlement_type,
        settlement.settlement_date,
        settlement.buyer_cuit,
        settlement.buyer_name,
        settlement.seller_cuit,
        settlement.seller_name,
        settlement.broker_cuit,
        settlement.broker_name,
        settlement.product,
        settlement.contracted_grade,
        settlement.delivered_grade,
        settlement.quality_factor,
        settlement.protein_content,
        settlement.quantity_kg,
        settlement.price_per_kg,
        settlement.subtotal,
        settlement.iva_rate,
        settlement.iva_amount,
        settlement.total_operation,
        settlement.total_deductions,
        settlement.total_withholdings,
        settlement.net_amount,
        settlement.percentage_liquidated,
        settlement.percentage_retained,
        settlement.retained_amount,
        settlement.original_coe,
        settlement.adjustment_type,
        JSON.stringify(settlement.price_breakdown),
        JSON.stringify(settlement.ctgs),
        settlement.total_ctgs,
        JSON.stringify(settlement.deductions),
        JSON.stringify(settlement.withholdings),
        settlement.is_canje,
        settlement.is_out_of_grade,
        validation.valid ? 'validated' : 'failed',
        JSON.stringify([...validation.errors, ...validation.warnings]),
        settlement.additional_data,
        JSON.stringify(settlement.raw_data),
        settlement.created_at,
        settlement.updated_at
      ];
      
      await db.query(query, values);
      
      logger.info('Settlement saved to database', { coe: settlement.coe });
      
      return true;
      
    } catch (error) {
      logger.error('Error saving settlement', { error, coe: settlement.coe });
      return false;
    }
  }
  
  /**
   * Generar alertas según el tipo de liquidación
   */
  private async generateAlerts(settlement: Settlement): Promise<void> {
    try {
      // Alerta 1: Liquidación parcial sin final (después de 30 días)
      if (settlement.settlement_type === 'partial') {
        // El sistema de alertas lo detectará en el chequeo diario
        logger.info('Partial settlement registered, will check for final after 30 days', {
          coe: settlement.coe
        });
      }
      
      // Alerta 2: Liquidación final → resolver alerta de parcial
      if (settlement.settlement_type === 'final' && settlement.original_coe) {
        await settlementAlertService.resolveAlert(
          settlement.original_coe,
          settlement.coe
        );
        
        logger.info('Alert resolved for partial settlement', {
          partialCoe: settlement.original_coe,
          finalCoe: settlement.coe
        });
      }
      
      // Alerta 3: Diferencia de monto significativa
      if (settlement.validation_errors?.some(e => e.type === 'amount_mismatch')) {
        logger.warn('Amount mismatch detected', {
          coe: settlement.coe,
          errors: settlement.validation_errors
        });
        // TODO: Crear alerta específica para diferencia de monto
      }
      
    } catch (error) {
      logger.error('Error generating alerts', { error, coe: settlement.coe });
    }
  }
  
  /**
   * Crear notificaciones para el usuario
   */
  private async createNotifications(
    settlement: Settlement,
    validation: ValidationResult
  ): Promise<void> {
    try {
      // Notificación 1: Liquidación procesada exitosamente
      if (validation.valid) {
        await this.createNotification({
          type: 'settlement_processed',
          title: `Liquidación ${settlement.settlement_type} procesada`,
          message: `COE ${settlement.coe} - ${settlement.product} - $${settlement.net_amount.toLocaleString('es-AR')}`,
          severity: 'info',
          entity_type: 'settlement',
          entity_id: settlement.id,
          metadata: {
            coe: settlement.coe,
            type: settlement.settlement_type,
            amount: settlement.net_amount
          }
        });
      }
      
      // Notificación 2: Advertencias de validación
      if (validation.warnings.length > 0) {
        await this.createNotification({
          type: 'validation_warnings',
          title: `Advertencias en liquidación ${settlement.coe}`,
          message: `Se encontraron ${validation.warnings.length} advertencias`,
          severity: 'warning',
          entity_type: 'settlement',
          entity_id: settlement.id,
          metadata: {
            coe: settlement.coe,
            warnings: validation.warnings
          }
        });
      }
      
      // Notificación 3: Errores críticos
      if (validation.errors.length > 0) {
        await this.createNotification({
          type: 'validation_errors',
          title: `Errores en liquidación ${settlement.coe}`,
          message: `Se encontraron ${validation.errors.length} errores críticos`,
          severity: 'critical',
          entity_type: 'settlement',
          entity_id: settlement.id,
          metadata: {
            coe: settlement.coe,
            errors: validation.errors
          }
        });
      }
      
    } catch (error) {
      logger.error('Error creating notifications', { error, coe: settlement.coe });
    }
  }
  
  /**
   * Helper para crear notificación
   */
  private async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    entity_type: string;
    entity_id: string;
    metadata: any;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO notifications (
          id, type, title, message, severity,
          entity_type, entity_id, metadata,
          read, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false, NOW()
        )
      `;
      
      await db.query(query, [
        notification.type,
        notification.title,
        notification.message,
        notification.severity,
        notification.entity_type,
        notification.entity_id,
        JSON.stringify(notification.metadata)
      ]);
      
    } catch (error) {
      logger.error('Error creating notification', { error });
    }
  }
  
  /**
   * Obtener liquidaciones por vendedor
   */
  async getSettlementsBySeller(sellerCuit: string, options?: {
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Settlement[]> {
    try {
      let query = `
        SELECT * FROM settlements
        WHERE seller_cuit = $1
      `;
      
      const params: any[] = [sellerCuit];
      let paramIndex = 2;
      
      if (options?.type) {
        query += ` AND settlement_type = $${paramIndex}`;
        params.push(options.type);
        paramIndex++;
      }
      
      if (options?.dateFrom) {
        query += ` AND settlement_date >= $${paramIndex}`;
        params.push(options.dateFrom);
        paramIndex++;
      }
      
      if (options?.dateTo) {
        query += ` AND settlement_date <= $${paramIndex}`;
        params.push(options.dateTo);
        paramIndex++;
      }
      
      query += ` ORDER BY settlement_date DESC`;
      
      if (options?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }
      
      if (options?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }
      
      const result = await db.query(query, params);
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error getting settlements by seller', { error, sellerCuit });
      return [];
    }
  }
  
  /**
   * Obtener liquidación por COE
   */
  async getSettlementByCOE(coe: string): Promise<Settlement | null> {
    try {
      const result = await db.query(
        `SELECT * FROM settlements WHERE coe = $1`,
        [coe]
      );
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error getting settlement by COE', { error, coe });
      return null;
    }
  }
}

export default new SettlementService();
