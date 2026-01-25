/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TOKEN SERVICE - Generación y validación de JWT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

class TokenService {
    /**
     * Generar token JWT
     */
    static generate(payload) {
        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN
        });
    }

    /**
     * Verificar y decodificar token
     */
    static verify(token) {
        try {
            return jwt.verify(token, env.JWT_SECRET);
        } catch (error) {
            throw new Error('Token inválido o expirado');
        }
    }

    /**
     * Decodificar token sin verificar (útil para debugging)
     */
    static decode(token) {
        return jwt.decode(token);
    }
}

module.exports = TokenService;
