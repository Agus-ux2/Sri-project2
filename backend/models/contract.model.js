/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CONTRACT MODEL - Gestión de contratos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { query } = require('../config/database');

class ContractModel {
    /**
     * Crear nuevo contrato
     */
    static async create(contractData) {
        const {
            user_id,
            contract_number,
            provider,
            grain_type,
            quantity,
            price,
            delivery_date,
            status = 'active'
        } = contractData;

        const text = `
            INSERT INTO contracts (
                user_id, contract_number, provider, grain_type, 
                quantity, price, delivery_date, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            user_id, contract_number, provider, grain_type,
            quantity, price, delivery_date, status
        ];

        try {
            const result = await query(text, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating contract:', error);
            throw error;
        }
    }

    /**
     * Buscar contratos por usuario
     */
    static async findByUserId(userId) {
        const text = `SELECT * FROM contracts WHERE user_id = $1 ORDER BY created_at DESC`;

        try {
            const result = await query(text, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Error finding contracts:', error);
            throw error;
        }
    }
}

module.exports = ContractModel;
