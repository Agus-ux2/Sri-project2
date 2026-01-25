/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOCUMENTS ROUTES - Rutas de documentos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const DocumentsController = require('../controllers/documents.controller');

const router = express.Router();

/**
 * POST /api/documents/upload
 * Subir documento
 */
router.post('/upload', authMiddleware, upload.single('file'), DocumentsController.upload);

/**
 * GET /api/documents
 * Listar documentos del usuario
 */
router.get('/', authMiddleware, DocumentsController.list);

/**
 * GET /api/documents/:id
 * Obtener documento específico
 */
router.get('/:id', authMiddleware, DocumentsController.getById);

module.exports = router;
