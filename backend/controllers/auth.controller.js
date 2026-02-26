/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AUTH CONTROLLER - Lógica de autenticación
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const TokenService = require('../services/token.service');

class AuthController {
    /**
     * Registro de usuario
     */
    static async register(req, res) {
        try {
            const { name, email, password } = req.body;

            // Validaciones
            if (!name || !email || !password) {
                return res.status(400).json({
                    error: 'Todos los campos son requeridos'
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    error: 'La contraseña debe tener al menos 8 caracteres'
                });
            }

            // Verificar si el email ya existe
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    error: 'El email ya está registrado'
                });
            }

            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Crear usuario
            const user = await UserModel.create({
                name,
                email,
                password: hashedPassword
            });

            // Generar token
            const token = TokenService.generate({
                id: user.id,
                email: user.email,
                role: user.role
            });

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error en register:', error);
            res.status(500).json({
                error: 'Error al registrar usuario'
            });
        }
    }

    /**
     * Inicio de sesión
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validaciones
            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email y contraseña son requeridos'
                });
            }

            // Buscar usuario
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            // Generar token
            const token = TokenService.generate({
                id: user.id,
                email: user.email,
                role: user.role
            });

            res.json({
                message: 'Inicio de sesión exitoso',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                error: 'Error al iniciar sesión'
            });
        }
    }

    /**
     * Verificar email (placeholder)
     */
    static async verifyEmail(req, res) {
        res.status(501).json({
            message: 'Verificación de email - En desarrollo'
        });
    }

    /**
     * Recuperar contraseña (placeholder)
     */
    static async resetPassword(req, res) {
        res.status(501).json({
            message: 'Recuperación de contraseña - En desarrollo'
        });
    }

    /**
     * Obtener el usuario actual
     */
    static async me(req, res) {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const { query } = require('../config/database');
            let zones = [];
            try {
                const zRes = await query('SELECT * FROM production_zones WHERE user_id = $1', [req.user.id]);
                zones = zRes.rows;

                // Si el usuario no tiene zonas de producción, crear una por defecto
                if (zones.length === 0) {
                    const defaultZone = await query(`
                        INSERT INTO production_zones (user_id, name, location, hectares)
                        VALUES ($1, 'Establecimiento Principal', 'Sede Central', 500)
                        RETURNING *
                    `, [req.user.id]);
                    zones = [defaultZone.rows[0]];
                }
            } catch (e) {
                console.error('Error fetching/creating zones in auth/me:', e);
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
                zones: zones
            });
        } catch (error) {
            console.error('Error en auth/me:', error);
            res.status(500).json({ error: 'Error al obtener usuario' });
        }
    }
}

module.exports = AuthController;
