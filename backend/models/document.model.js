/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOCUMENT MODEL - Gestión de documentos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { getDatabase } = require('../config/database');

class DocumentModel {
    /**
     * Crear nuevo documento
     */
    static create(documentData) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            const { user_id, filename, original_name, file_path, file_type, file_size } = documentData;

            db.run(
                `INSERT INTO documents (user_id, filename, original_name, file_path, file_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [user_id, filename, original_name, file_path, file_type, file_size],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...documentData });
                    }
                }
            );
        });
    }

    /**
     * Buscar documentos por usuario
     */
    static findByUserId(userId) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.all(
                `SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    /**
     * Buscar documento por ID
     */
    static findById(id) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.get(
                `SELECT * FROM documents WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    /**
     * Actualizar estado OCR
     */
    static updateOCRStatus(id, status, ocrData = null) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();

            db.run(
                `UPDATE documents SET ocr_status = ?, ocr_data = ? WHERE id = ?`,
                [status, ocrData ? JSON.stringify(ocrData) : null, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

module.exports = DocumentModel;
