/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * UPLOAD ROUTES - Rutas de carga de archivos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const UploadController = require('../controllers/upload.controller');

const router = express.Router();

/**
 * POST /api/upload
 * Upload y procesar múltiples archivos PDF
 */
router.post('/upload',
    authMiddleware,
    uploadMiddleware.array('files', 10), // Hasta 10 archivos
    UploadController.upload
);

/**
 * GET /api/upload/status/:taskId
 * Obtener estado de procesamiento
 */
router.get('/upload/status/:taskId',
    authMiddleware,
    UploadController.getStatus
);

module.exports = router;
