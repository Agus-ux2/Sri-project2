/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AUTH ROUTES - Rutas de autenticación
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', AuthController.register);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', AuthController.login);

/**
 * GET /api/auth/me
 * Obtener perfil del usuario actual (alias para el dashboard de React)
 */
router.get('/me', authMiddleware, AuthController.me);

/**
 * POST /api/auth/verify-email
 * Verificar email
 */
router.post('/verify-email', AuthController.verifyEmail);

/**
 * POST /api/auth/reset-password
 * Recuperar contraseña
 */
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;
