import db from '../db/client';
import { logger } from '../utils/logger';

/**
 * Sistema de Alertas para Liquidaciones Pendientes
 * 
 * Detecta liquidaciones parciales que no tienen su correspondiente
 * liquidación final después de 30 días.
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
  status: 'pending' | 'notified' | 'resolved';
  notified_at?: Date;
  resolved_at?: Date;
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
        EXTRACT(DAY FROM (NOW() - s.settlement_date)) as days_since_partial
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
        
        -- Que no estén ya notificadas o resueltas
        AND s.id NOT IN (
          SELECT settlement_id FROM pending_final_alerts
          WHERE status IN ('notified', 'resolved')
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
   * Crear alerta en base de datos
   */
  async createAlert(alert: PendingFinalAlert): Promise<void> {
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
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
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

      logger.info('Pending final alert created', {
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
   * Enviar notificación
   */
  async notifyPendingFinal(alert: PendingFinalAlert): Promise<void> {
    try {
      // Construir mensaje
      const message = this.buildNotificationMessage(alert);

      // Enviar notificación (email, Slack, etc.)
      await this.sendNotification(message, alert);

      // Marcar como notificada
      await this.markAsNotified(alert.id);

      logger.info('Pending final notification sent', {
        alertId: alert.id,
        partialCoe: alert.partial_coe,
        daysOverdue: alert.days_overdue
      });
    } catch (error) {
      logger.error('Error sending notification', { error, alert });
      throw error;
    }
  }

  /**
   * Construir mensaje de notificación
   */
  private buildNotificationMessage(alert: PendingFinalAlert): string {
    const contractInfo = alert.contract_number
      ? `Contrato: ${alert.contract_number}`
      : '';

    return `
🚨 LIQUIDACIÓN FINAL PENDIENTE

⏰ VENCIDA: ${alert.days_overdue} días de retraso

📄 Liquidación Parcial
   • COE: ${alert.partial_coe}
   • Fecha: ${alert.partial_date.toLocaleDateString('es-AR')}
   • Porcentaje retenido: ${alert.percentage_retained.toFixed(1)}%

💰 Monto Pendiente
   • Importe retenido: $${alert.retained_amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}

🏢 Partes
   • Comprador: ${alert.buyer_name}
   • Vendedor: ${alert.seller_name}

📦 Producto
   • ${alert.product}
   • Cantidad: ${alert.quantity_kg.toLocaleString('es-AR')} Kg

${contractInfo}

⚠️ Acción Requerida:
Se debe solicitar al comprador la emisión de la liquidación final correspondiente al ${alert.percentage_retained.toFixed(1)}% retenido.

---
Fecha de vencimiento original: ${this.getExpectedFinalDate(alert.partial_date).toLocaleDateString('es-AR')}
Días de retraso: ${alert.days_overdue} días
    `.trim();
  }

  /**
   * Enviar notificación (múltiples canales)
   */
  private async sendNotification(
    message: string,
    alert: PendingFinalAlert
  ): Promise<void> {
    // 1. Email
    await this.sendEmail({
      to: ['finanzas@example.com', 'admin@example.com'],
      subject: `⚠️ Liquidación Final Pendiente - COE ${alert.partial_coe}`,
      body: message,
      priority: alert.days_overdue > 60 ? 'high' : 'normal'
    });

    // 2. Slack (si está configurado)
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(message, alert);
    }

    // 3. Notificación in-app
    await this.createInAppNotification(alert);
  }

  /**
   * Enviar email
   */
  private async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    priority: 'high' | 'normal';
  }): Promise<void> {
    // Implementar con servicio de email (SendGrid, SES, etc.)
    logger.info('Email notification queued', {
      to: params.to,
      subject: params.subject,
      priority: params.priority
    });

    // TODO: Implementar envío real
    // await emailService.send(params);
  }

  /**
   * Enviar notificación a Slack
   */
  private async sendSlackNotification(
    message: string,
    alert: PendingFinalAlert
  ): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      text: '🚨 Liquidación Final Pendiente',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Liquidación Final Pendiente'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*COE Parcial:*\n${alert.partial_coe}`
            },
            {
              type: 'mrkdwn',
              text: `*Días de retraso:*\n${alert.days_overdue} días`
            },
            {
              type: 'mrkdwn',
              text: `*Comprador:*\n${alert.buyer_name}`
            },
            {
              type: 'mrkdwn',
              text: `*Monto pendiente:*\n$${alert.retained_amount.toLocaleString('es-AR')}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Ver Detalles'
              },
              url: `${process.env.APP_URL}/settlements/${alert.partial_settlement_id}`,
              style: 'primary'
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.statusText}`);
      }

      logger.info('Slack notification sent', { alertId: alert.id });
    } catch (error) {
      logger.error('Error sending Slack notification', { error, alert });
    }
  }

  /**
   * Crear notificación in-app
   */
  private async createInAppNotification(alert: PendingFinalAlert): Promise<void> {
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
        'Liquidación Final Pendiente',
        $1,
        $2,
        'settlement',
        $3,
        $4,
        false,
        NOW()
      )
    `;

    const severity = alert.days_overdue > 60 ? 'critical' : 'warning';
    const message = `La liquidación final del COE ${alert.partial_coe} está pendiente hace ${alert.days_overdue} días. Monto retenido: $${alert.retained_amount.toLocaleString('es-AR')}`;

    try {
      await db.query(query, [
        message,
        severity,
        alert.partial_settlement_id,
        JSON.stringify({
          partial_coe: alert.partial_coe,
          contract_number: alert.contract_number,
          retained_amount: alert.retained_amount,
          days_overdue: alert.days_overdue
        })
      ]);
    } catch (error) {
      logger.error('Error creating in-app notification', { error });
    }
  }

  /**
   * Marcar alerta como notificada
   */
  private async markAsNotified(alertId: string): Promise<void> {
    const query = `
      UPDATE pending_final_alerts
      SET 
        status = 'notified',
        notified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [alertId]);
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
        logger.info('Pending final alert resolved', {
          partialCoe,
          finalCoe
        });

        // Enviar notificación de resolución
        await this.notifyResolution(partialCoe, finalCoe);
      }
    } catch (error) {
      logger.error('Error resolving alert', { error, partialCoe, finalCoe });
      throw error;
    }
  }

  /**
   * Notificar resolución
   */
  private async notifyResolution(partialCoe: string, finalCoe: string): Promise<void> {
    const message = `
✅ LIQUIDACIÓN FINAL RECIBIDA

La liquidación final correspondiente a la parcial COE ${partialCoe} ha sido recibida.

📄 Liquidación Final: ${finalCoe}
✓ Alerta resuelta automáticamente
    `.trim();

    await this.sendEmail({
      to: ['finanzas@example.com'],
      subject: `✅ Liquidación Final Recibida - COE ${partialCoe}`,
      body: message,
      priority: 'normal'
    });
  }

  /**
   * Helpers
   */
  private generateAlertId(partialCoe: string): string {
    return `pending-final-${partialCoe}`;
  }

  private extractContractNumber(additionalData: string): string | undefined {
    const match = additionalData?.match(/Contrato[:\s]+(\d+)/i);
    return match?.[1];
  }

  private getExpectedFinalDate(partialDate: Date): Date {
    const expected = new Date(partialDate);
    expected.setDate(expected.getDate() + this.FINAL_DUE_DAYS);
    return expected;
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

      // 2. Crear/actualizar alertas
      for (const alert of pendingAlerts) {
        await this.createAlert(alert);
      }

      // 3. Enviar notificaciones (solo nuevas o que superan umbrales)
      const alertsToNotify = pendingAlerts.filter(a =>
        this.shouldNotify(a)
      );

      logger.info('Alerts to notify', { count: alertsToNotify.length });

      for (const alert of alertsToNotify) {
        await this.notifyPendingFinal(alert);
      }

      logger.info('Daily pending finals check completed', {
        detected: pendingAlerts.length,
        notified: alertsToNotify.length
      });
    } catch (error) {
      logger.error('Error in daily pending finals check', { error });
      throw error;
    }
  }

  /**
   * Determinar si se debe notificar
   */
  private shouldNotify(alert: PendingFinalAlert): boolean {
    // Notificar en estos casos:
    // 1. Primera vez (31 días)
    // 2. Cada 15 días adicionales (45, 60, 75, etc.)
    const daysOverdue = alert.days_overdue;

    if (daysOverdue === 1) {
      // Primer día de retraso
      return true;
    }

    if (daysOverdue > 1 && daysOverdue % 15 === 1) {
      // Cada 15 días (16, 31, 46, 61, etc.)
      return true;
    }

    return false;
  }
}

export default new SettlementAlertService();
