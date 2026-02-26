/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STOCKS CONTROLLER - Lógica de stock de granos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { query } = require('../config/database');

class StocksController {
    /**
     * Listar stocks del usuario (con join a zonas de producción)
     */
    static async list(req, res) {
        try {
            const result = await query(`
                SELECT gs.*, pz.name as establishment 
                FROM grain_stocks gs 
                LEFT JOIN production_zones pz ON gs.production_zone_id = pz.id 
                WHERE gs.user_id = $1
            `, [req.user.id]);
            res.json(result.rows || []);
        } catch (error) {
            console.error('Error listando stocks (posible tabla no existe):', error);
            res.json([]); // Oculta 500 para el fallback de FE
        }
    }

    /**
     * Upsert stock de granos
     */
    static async upsert(req, res) {
        try {
            const {
                production_zone_id,
                grain_type,
                campaign,
                initial_stock,
                sold_delivered,
                livestock_consumption,
                seeds,
                extruder_own,
                extruder_exchange,
                exchanges,
                committed_sales
            } = req.body;

            const userId = req.user.id;

            // Validar campos requeridos
            if (!production_zone_id || !grain_type || !campaign) {
                return res.status(400).json({ error: 'Faltan campos requeridos (production_zone_id, grain_type, campaign)' });
            }

            const result = await query(`
                INSERT INTO grain_stocks (
                    user_id, production_zone_id, grain_type, campaign,
                    initial_stock, sold_delivered, livestock_consumption,
                    seeds, extruder_own, extruder_exchange, exchanges,
                    committed_sales, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, production_zone_id, grain_type, campaign)
                DO UPDATE SET
                    initial_stock = EXCLUDED.initial_stock,
                    sold_delivered = EXCLUDED.sold_delivered,
                    livestock_consumption = EXCLUDED.livestock_consumption,
                    seeds = EXCLUDED.seeds,
                    extruder_own = EXCLUDED.extruder_own,
                    extruder_exchange = EXCLUDED.extruder_exchange,
                    exchanges = EXCLUDED.exchanges,
                    committed_sales = EXCLUDED.committed_sales,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                userId, production_zone_id, grain_type, campaign,
                initial_stock || 0, sold_delivered || 0, livestock_consumption || 0,
                seeds || 0, extruder_own || 0, extruder_exchange || 0, exchanges || 0,
                committed_sales || 0
            ]);

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error guardando stock:', error);
            res.status(500).json({ error: 'Error interno guardando stock' });
        }
    }
}

module.exports = StocksController;
