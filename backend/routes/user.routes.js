/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * USER ROUTES - Rutas de usuario
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const UserModel = require('../models/user.model');

const router = express.Router();

/**
 * GET /api/user/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

/**
 * PUT /api/user/profile
 * Actualizar perfil del usuario
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }

        await UserModel.update(req.user.id, { name });

        res.json({
            message: 'Perfil actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

/**
 * GET /api/user/stats
 * Obtener estadísticas del usuario (placeholder)
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        // TODO: Implementar cálculo real de estadísticas
        res.json({
            documents: 0,
            grains: 0,
            contracts: 0,
            alerts: 0
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
