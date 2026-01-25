/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AUTH MIDDLEWARE - Verificación de autenticación JWT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const TokenService = require('../services/token.service');
const UserModel = require('../models/user.model');

/**
 * Middleware de autenticación
 * Verifica que el request tenga un token JWT válido
 */
async function authMiddleware(req, res, next) {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token no proporcionado'
            });
        }

        const token = authHeader.substring(7); // Remover "Bearer "

        // Verificar token
        const decoded = TokenService.verify(token);

        // Verificar que el usuario existe
        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no encontrado'
            });
        }

        // Agregar usuario al request (sin password)
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Error en auth middleware:', error);
        return res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }
}

module.exports = authMiddleware;
