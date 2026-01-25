/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOCUMENTS CONTROLLER - Lógica de gestión de documentos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const DocumentModel = require('../models/document.model');

class DocumentsController {
    /**
     * Subir documento
     */
    static async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: 'No se proporcionó ningún archivo'
                });
            }

            const document = await DocumentModel.create({
                user_id: req.user.id,
                filename: req.file.filename,
                original_name: req.file.originalname,
                file_path: req.file.path,
                file_type: req.file.mimetype,
                file_size: req.file.size
            });

            res.status(201).json({
                message: 'Documento subido exitosamente',
                document: {
                    id: document.id,
                    filename: document.filename,
                    original_name: document.original_name,
                    file_type: document.file_type,
                    ocr_status: 'pending'
                }
            });
        } catch (error) {
            console.error('Error subiendo documento:', error);
            res.status(500).json({
                error: 'Error al subir documento'
            });
        }
    }

    /**
     * Listar documentos del usuario
     */
    static async list(req, res) {
        try {
            const documents = await DocumentModel.findByUserId(req.user.id);

            res.json({
                documents: documents.map(doc => ({
                    id: doc.id,
                    filename: doc.filename,
                    original_name: doc.original_name,
                    file_type: doc.file_type,
                    file_size: doc.file_size,
                    ocr_status: doc.ocr_status,
                    ocr_data: doc.ocr_data ? JSON.parse(doc.ocr_data) : null,
                    created_at: doc.created_at
                }))
            });
        } catch (error) {
            console.error('Error listando documentos:', error);
            res.status(500).json({
                error: 'Error al listar documentos'
            });
        }
    }

    /**
     * Obtener documento específico
     */
    static async getById(req, res) {
        try {
            const document = await DocumentModel.findById(req.params.id);

            if (!document) {
                return res.status(404).json({
                    error: 'Documento no encontrado'
                });
            }

            // Verificar que el documento pertenece al usuario
            if (document.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    error: 'No tiene permiso para acceder a este documento'
                });
            }

            res.json({
                document: {
                    id: document.id,
                    filename: document.filename,
                    original_name: document.original_name,
                    file_type: document.file_type,
                    file_size: document.file_size,
                    ocr_status: document.ocr_status,
                    ocr_data: document.ocr_data ? JSON.parse(document.ocr_data) : null,
                    created_at: document.created_at
                }
            });
        } catch (error) {
            console.error('Error obteniendo documento:', error);
            res.status(500).json({
                error: 'Error al obtener documento'
            });
        }
    }
}

module.exports = DocumentsController;
