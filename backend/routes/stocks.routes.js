/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STOCKS ROUTES - Rutas de stock de granos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const StocksController = require('../controllers/stocks.controller');

const router = express.Router();

/**
 * GET /api/stocks
 * Listar stocks de granos
 */
router.get('/', authMiddleware, StocksController.list);

module.exports = router;
