/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * USER MODEL - Gestión de usuarios en base de datos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { getDatabase } = require('../config/database');

class UserModel {
    /**
     * Crear nuevo usuario
     */
    static create(userData) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            const { name, email, password, role = 'user' } = userData;

            db.run(
                `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, password, role],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, name, email, role });
                    }
                }
            );
        });
    }

    /**
     * Buscar usuario por email
     */
    static findByEmail(email) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.get(
                `SELECT * FROM users WHERE email = ?`,
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    /**
     * Buscar usuario por ID
     */
    static findById(id) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.get(
                `SELECT * FROM users WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    /**
     * Actualizar usuario
     */
    static update(id, updates) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            const fields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                if (key !== 'id' && key !== 'password') {
                    fields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });

            if (fields.length === 0) {
                resolve();
                return;
            }

            values.push(id);

            db.run(
                `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Listar todos los usuarios (admin)
     */
    static findAll() {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.all(
                `SELECT id, name, email, role, email_verified, created_at FROM users ORDER BY created_at DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

module.exports = UserModel;
