/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OCR ROUTES - Rutas de procesamiento OCR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const OCRController = require('../controllers/ocr.controller');

const router = express.Router();

/**
 * POST /api/ocr/process
 * Procesar documento con OCR
 */
router.post('/process', authMiddleware, OCRController.process);

/**
 * GET /api/ocr/status/:taskId
 * Obtener estado de procesamiento
 */
router.get('/status/:taskId', authMiddleware, OCRController.getStatus);

module.exports = router;
