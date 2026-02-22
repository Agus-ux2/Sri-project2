import db from '../db/client';

export interface GrainStockData {
    production_zone_id: number;
    grain_type: string;
    campaign: string;
    initial_stock: number;
    sold_delivered: number;
    livestock_consumption: number;
    seeds: number;
    extruder_own: number;
    extruder_exchange: number;
    exchanges: number;
    committed_sales: number;
}

class GrainStockService {
    /**
     * Get all stocks for a user, joined with production zone names
     */
    async getStocksByUserId(userId: number) {
        const query = `
            SELECT 
                gs.*,
                pz.location as establishment
            FROM grain_stocks gs
            JOIN production_zones pz ON gs.production_zone_id = pz.id
            WHERE gs.user_id = $1
        `;
        const res = await db.query(query, [userId]);
        return res.rows;
    }

    /**
     * Upsert a grain stock record (Insert or Update)
     */
    async upsertStock(userId: number, data: GrainStockData) {
        try {
            const query = `
                INSERT INTO grain_stocks (
                    user_id, production_zone_id, grain_type, campaign,
                    initial_stock, sold_delivered, livestock_consumption, seeds,
                    extruder_own, extruder_exchange, exchanges, committed_sales,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    NOW()
                )
                ON CONFLICT (production_zone_id, grain_type, campaign) 
                DO UPDATE SET
                    initial_stock = EXCLUDED.initial_stock,
                    sold_delivered = EXCLUDED.sold_delivered,
                    livestock_consumption = EXCLUDED.livestock_consumption,
                    seeds = EXCLUDED.seeds,
                    extruder_own = EXCLUDED.extruder_own,
                    extruder_exchange = EXCLUDED.extruder_exchange,
                    exchanges = EXCLUDED.exchanges,
                    committed_sales = EXCLUDED.committed_sales,
                    updated_at = NOW()
                RETURNING *;
            `;

            const values = [
                userId,
                data.production_zone_id,
                data.grain_type,
                data.campaign,
                data.initial_stock,
                data.sold_delivered,
                data.livestock_consumption,
                data.seeds,
                data.extruder_own,
                data.extruder_exchange,
                data.exchanges,
                data.committed_sales
            ];

            const res = await db.query(query, values);
            return res.rows[0];
        } catch (error) {
            console.error('Error upserting stock:', error);
            throw error;
        }
    }
}

export default new GrainStockService();
