/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * USER MODEL - Gestión de usuarios en PostgreSQL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { getDatabase } = require('../config/database');

class UserModel {
    /**
     * Crear nuevo usuario
     */
    static async create(userData) {
        const pool = getDatabase();
        const { name, email, password, role = 'user' } = userData;

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, role`,
            [name, email, password, role]
        );

        return result.rows[0];
    }

    /**
     * Buscar usuario por email
     */
    static async findByEmail(email) {
        const pool = getDatabase();

        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        return result.rows[0];
    }

    /**
     * Buscar usuario por ID
     */
    static async findById(id) {
        const pool = getDatabase();

        const result = await pool.query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        return result.rows[0];
    }

    /**
     * Actualizar usuario
     */
    static async update(id, updates) {
        const pool = getDatabase();
        const fields = [];
        const values = [];
        let paramCounter = 1;

        Object.keys(updates).forEach(key => {
            if (key !== 'id' && key !== 'password') {
                fields.push(`${key} = $${paramCounter}`);
                values.push(updates[key]);
                paramCounter++;
            }
        });

        if (fields.length === 0) {
            return;
        }

        values.push(id);

        await pool.query(
            `UPDATE users 
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${paramCounter}`,
            values
        );
    }

    /**
     * Listar todos los usuarios (admin)
     */
    static async findAll() {
        const pool = getDatabase();

        const result = await pool.query(
            `SELECT id, name, email, role, email_verified, created_at 
             FROM users 
             ORDER BY created_at DESC`
        );

        return result.rows;
    }

    /**
     * Eliminar usuario
     */
    static async delete(id) {
        const pool = getDatabase();

        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [id]
        );
    }
}

module.exports = UserModel;
