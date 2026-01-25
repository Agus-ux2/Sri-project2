/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOCUMENT MODEL - Gestión de documentos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { query } = require('../config/database');

class DocumentModel {
    /**
     * Crear nuevo documento
     */
    static async create(documentData) {
        const { user_id, filename, original_name, file_path, file_type, file_size } = documentData;

        const text = `
            INSERT INTO documents (user_id, filename, original_name, file_path, file_type, file_size)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [user_id, filename, original_name, file_path, file_type, file_size];

        try {
            const result = await query(text, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar documentos por usuario
     */
    static async findByUserId(userId) {
        const text = `SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`;
        try {
            const result = await query(text, [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar documento por ID
     */
    static async findById(id) {
        const text = `SELECT * FROM documents WHERE id = $1`;
        try {
            const result = await query(text, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Actualizar estado OCR
     */
    static async updateOCRStatus(id, status, ocrData = null) {
        const text = `UPDATE documents SET ocr_status = $1, ocr_data = $2 WHERE id = $3`;
        const values = [status, ocrData ? JSON.stringify(ocrData) : null, id];

        try {
            await query(text, values);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DocumentModel;
