/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STOCKS CONTROLLER - Lógica de stock de granos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { q } = require('../config/database');

class StocksController {
    /**
     * Listar stocks del usuario
     */
    static async list(req, res) {
        try {
            const stocks = await q('SELECT * FROM grain_stocks WHERE user_id = $1', [req.user.id]);
            res.json(stocks);
        } catch (error) {
            console.error('Error listando stocks (posible tabla no existe):', error);
            res.json([]); // Return empty array to avoid 500 error in frontend
        }
    }
}

module.exports = StocksController;
