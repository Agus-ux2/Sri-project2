/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OCR CONTROLLER - Lógica de procesamiento OCR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const DocumentModel = require('../models/document.model');

class OCRController {
    /**
     * Procesar documento con OCR
     */
    static async process(req, res) {
        try {
            const { documentId } = req.body;

            if (!documentId) {
                return res.status(400).json({
                    error: 'ID de documento requerido'
                });
            }

            const document = await DocumentModel.findById(documentId);

            if (!document) {
                return res.status(404).json({
                    error: 'Documento no encontrado'
                });
            }

            // Verificar permisos
            if (document.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    error: 'No tiene permiso para procesar este documento'
                });
            }

            // Iniciar procesamiento asíncrono real
            const OCRService = require('../services/ocr.service');

            // No esperamos el await para no bloquear la respuesta (procesamiento background)
            OCRService.processPDF(document.file_path, 'CP') // Default a CP, idealmente detectar tipo
                .then(async (result) => {
                    console.log('✅ OCR Completado para documento:', documentId);
                    await DocumentModel.updateOCRStatus(documentId, 'completed', result);
                })
                .catch(async (error) => {
                    console.error('❌ Error en OCR background:', error);
                    await DocumentModel.updateOCRStatus(documentId, 'failed', { error: error.message });
                });

            // Actualizar estado inicial
            await DocumentModel.updateOCRStatus(documentId, 'processing');

            res.json({
                message: 'Procesamiento OCR iniciado',
                documentId,
                status: 'processing'
            });
        } catch (error) {
            console.error('Error procesando OCR:', error);
            res.status(500).json({
                error: 'Error al procesar documento con OCR'
            });
        }
    }

    /**
     * Obtener estado de procesamiento OCR
     */
    static async getStatus(req, res) {
        try {
            const { taskId } = req.params;

            const document = await DocumentModel.findById(taskId);

            if (!document) {
                return res.status(404).json({
                    error: 'Tarea no encontrada'
                });
            }

            res.json({
                taskId,
                status: document.ocr_status,
                data: document.ocr_data ? JSON.parse(document.ocr_data) : null
            });
        } catch (error) {
            console.error('Error obteniendo estado OCR:', error);
            res.status(500).json({
                error: 'Error al obtener estado de procesamiento'
            });
        }
    }
}

module.exports = OCRController;
