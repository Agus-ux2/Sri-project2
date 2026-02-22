import db from '../db/client';
import { logger } from '../utils/logger';

/**
 * Sistema de Alertas In-App - Liquidaciones Finales Pendientes
 * 
 * Detecta liquidaciones parciales sin final después de 30 días
 * y crea notificaciones in-app (campana en dashboard).
 * 
 * NO envía emails ni notificaciones externas.
 */

interface PendingFinalAlert {
  id: string;
  partial_settlement_id: string;
  partial_coe: string;
  contract_number?: string;
  buyer_name: string;
  seller_name: string;
  product: string;
  quantity_kg: number;
  retained_amount: number;
  percentage_retained: number;
  partial_date: Date;
  days_overdue: number;
  expected_final_amount: number;
  status: 'pending' | 'resolved';
}

export class SettlementAlertService {
  private readonly FINAL_DUE_DAYS = 30;

  /**
   * Detectar liquidaciones finales pendientes
   */
  async detectPendingFinals(): Promise<PendingFinalAlert[]> {
    const query = `
      SELECT 
        s.id,
        s.coe as partial_coe,
        s.buyer_name,
        s.seller_name,
        s.product,
        s.quantity_kg,
        s.retained_amount,
        s.percentage_retained,
        s.settlement_date as partial_date,
        s.additional_data,
        EXTRACT(DAY FROM (NOW() - s.settlement_date))::INTEGER as days_since_partial
      FROM settlements s
      WHERE 
        -- Solo liquidaciones PARCIALES
        s.settlement_type = 'partial'
        
        -- Que NO tengan liquidación final vinculada
        AND NOT EXISTS (
          SELECT 1 FROM settlements f
          WHERE f.settlement_type IN ('final', 'adjustment')
          AND f.original_coe = s.coe
        )
        
        -- Que hayan pasado más de 30 días
        AND s.settlement_date < NOW() - INTERVAL '30 days'
        
        -- Que no estén ya resueltas
        AND s.id NOT IN (
          SELECT settlement_id FROM pending_final_alerts
          WHERE status = 'resolved'
        )
      ORDER BY s.settlement_date ASC
    `;

    try {
      const result = await db.query(query);

      return result.rows.map(row => ({
        id: this.generateAlertId(row.partial_coe),
        partial_settlement_id: row.id,
        partial_coe: row.partial_coe,
        contract_number: this.extractContractNumber(row.additional_data),
        buyer_name: row.buyer_name,
        seller_name: row.seller_name,
        product: row.product,
        quantity_kg: parseFloat(row.quantity_kg),
        retained_amount: parseFloat(row.retained_amount),
        percentage_retained: parseFloat(row.percentage_retained),
        partial_date: row.partial_date,
        days_overdue: parseInt(row.days_since_partial) - this.FINAL_DUE_DAYS,
        expected_final_amount: parseFloat(row.retained_amount),
        status: 'pending'
      }));
    } catch (error) {
      logger.error('Error detecting pending finals', { error });
      throw error;
    }
  }

  /**
   * Crear o actualizar alerta en base de datos
   */
  async createOrUpdateAlert(alert: PendingFinalAlert): Promise<void> {
    const query = `
      INSERT INTO pending_final_alerts (
        id,
        settlement_id,
        partial_coe,
        contract_number,
        buyer_name,
        seller_name,
        product,
        quantity_kg,
        retained_amount,
        percentage_retained,
        partial_date,
        days_overdue,
        expected_final_amount,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        days_overdue = $12,
        updated_at = NOW()
    `;

    try {
      await db.query(query, [
        alert.id,
        alert.partial_settlement_id,
        alert.partial_coe,
        alert.contract_number,
        alert.buyer_name,
        alert.seller_name,
        alert.product,
        alert.quantity_kg,
        alert.retained_amount,
        alert.percentage_retained,
        alert.partial_date,
        alert.days_overdue,
        alert.expected_final_amount,
        alert.status
      ]);

      logger.info('Alert created/updated', {
        alertId: alert.id,
        partialCoe: alert.partial_coe,
        daysOverdue: alert.days_overdue
      });
    } catch (error) {
      logger.error('Error creating alert', { error, alert });
      throw error;
    }
  }

  /**
   * Crear notificación in-app (para mostrar en campana)
   */
  async createNotification(alert: PendingFinalAlert): Promise<void> {
    // Verificar si ya existe notificación para esta alerta
    const existingQuery = `
      SELECT id FROM notifications
      WHERE metadata->>'partial_coe' = $1
      AND read = false
    `;

    const existing = await db.query(existingQuery, [alert.partial_coe]);

    if (existing.rows.length > 0) {
      // Ya existe notificación no leída, no crear duplicada
      return;
    }

    const severity = this.calculateSeverity(alert.days_overdue);
    const title = this.buildNotificationTitle(alert);
    const message = this.buildNotificationMessage(alert);

    const query = `
      INSERT INTO notifications (
        id,
        type,
        title,
        message,
        severity,
        entity_type,
        entity_id,
        metadata,
        read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        'pending_final_settlement',
        $1,
        $2,
        $3,
        'settlement',
        $4,
        $5,
        false,
        NOW()
      )
    `;

    try {
      await db.query(query, [
        title,
        message,
        severity,
        alert.partial_settlement_id,
        JSON.stringify({
          partial_coe: alert.partial_coe,
          contract_number: alert.contract_number,
          retained_amount: alert.retained_amount,
          days_overdue: alert.days_overdue,
          buyer_name: alert.buyer_name,
          product: alert.product
        })
      ]);

      logger.info('In-app notification created', {
        alertId: alert.id,
        partialCoe: alert.partial_coe
      });
    } catch (error) {
      logger.error('Error creating notification', { error });
    }
  }

  /**
   * Construir título de notificación
   */
  private buildNotificationTitle(alert: PendingFinalAlert): string {
    return `Liquidación Final Pendiente - ${alert.product}`;
  }

  /**
   * Construir mensaje de notificación
   */
  private buildNotificationMessage(alert: PendingFinalAlert): string {
    const contractInfo = alert.contract_number
      ? `Contrato ${alert.contract_number} - `
      : '';

    return `${contractInfo}El comprador ${alert.buyer_name} adeuda la liquidación final del COE ${alert.partial_coe} (${alert.percentage_retained.toFixed(1)}% retenido = $${alert.retained_amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}). Vencida hace ${alert.days_overdue} días.`;
  }

  /**
   * Calcular severidad basada en días de retraso
   */
  private calculateSeverity(daysOverdue: number): 'info' | 'warning' | 'critical' {
    if (daysOverdue > 90) return 'critical';
    if (daysOverdue > 60) return 'critical';
    if (daysOverdue > 30) return 'warning';
    return 'warning';
  }

  /**
   * Resolver alerta (cuando se detecta la liquidación final)
   */
  async resolveAlert(partialCoe: string, finalCoe: string): Promise<void> {
    const query = `
      UPDATE pending_final_alerts
      SET 
        status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW(),
        final_coe = $2
      WHERE partial_coe = $1
      AND status != 'resolved'
    `;

    try {
      const result = await db.query(query, [partialCoe, finalCoe]);

      if (result.rowCount > 0) {
        logger.info('Alert resolved', {
          partialCoe,
          finalCoe
        });

        // Marcar notificaciones relacionadas como leídas
        await this.markNotificationsAsRead(partialCoe);
      }
    } catch (error) {
      logger.error('Error resolving alert', { error, partialCoe, finalCoe });
      throw error;
    }
  }

  /**
   * Marcar notificaciones como leídas cuando se resuelve
   */
  private async markNotificationsAsRead(partialCoe: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET 
        read = true,
        read_at = NOW()
      WHERE metadata->>'partial_coe' = $1
      AND read = false
    `;

    try {
      await db.query(query, [partialCoe]);
    } catch (error) {
      logger.error('Error marking notifications as read', { error });
    }
  }

  /**
   * Ejecutar chequeo diario
   */
  async runDailyCheck(): Promise<void> {
    logger.info('Starting daily pending finals check');

    try {
      // 1. Detectar pendientes
      const pendingAlerts = await this.detectPendingFinals();

      logger.info('Pending finals detected', { count: pendingAlerts.length });

      // 2. Crear/actualizar alertas y notificaciones
      for (const alert of pendingAlerts) {
        // Crear/actualizar alerta
        await this.createOrUpdateAlert(alert);

        // Crear notificación in-app (solo si no existe)
        await this.createNotification(alert);
      }

      logger.info('Daily pending finals check completed', {
        detected: pendingAlerts.length
      });
    } catch (error) {
      logger.error('Error in daily pending finals check', { error });
      throw error;
    }
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getUnreadCount(userId?: string): Promise<number> {
    let query = `
      SELECT COUNT(*)::INTEGER as count
      FROM notifications
      WHERE read = false
    `;

    const params: any[] = [];

    // TODO: Filtrar por userId cuando tengamos multi-usuario
    // if (userId) {
    //   query += ` AND user_id = $1`;
    //   params.push(userId);
    // }

    try {
      const result = await db.query(query, params);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting unread count', { error });
      return 0;
    }
  }

  /**
   * Helpers
   */
  private generateAlertId(partialCoe: string): string {
    return `pending-final-${partialCoe}`;
  }

  private extractContractNumber(additionalData: string): string | undefined {
    const match = additionalData?.match(/Contrato[:\s]+(\d+)/i) ||
      additionalData?.match(/Nro\.?\s*Contrato[:\s]+(\d+)/i);
    return match?.[1];
  }
}

export default new SettlementAlertService();
