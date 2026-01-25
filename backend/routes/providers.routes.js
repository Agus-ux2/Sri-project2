/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PROVIDERS ROUTES - Rutas de proveedores
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const ProvidersController = require('../controllers/providers.controller');

const router = express.Router();

// Todas estas rutas requieren autenticación
router.get('/list', authMiddleware, ProvidersController.list);
router.post('/connect', authMiddleware, ProvidersController.connect);
router.post('/save-session', authMiddleware, ProvidersController.saveSession);
router.post('/force-connect', authMiddleware, ProvidersController.forceConnect);
router.delete('/delete/:id', authMiddleware, ProvidersController.delete);

// Ruta especial para el script de automatización (usa el mismo token de usuario)
router.get('/session/:provider', authMiddleware, ProvidersController.getSession);

module.exports = router;
