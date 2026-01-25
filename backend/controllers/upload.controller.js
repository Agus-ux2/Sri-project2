/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * UPLOAD CONTROLLER - Manejo de uploads y procesamiento OCR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const OCRService = require('../services/ocr.service');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Almacén en memoria de tareas (en producción usar Redis o DB)
const tasks = new Map();

class UploadController {
    /**
     * Upload y procesar archivos PDF
     */
    static async upload(req, res) {
        try {
            console.log('📥 Request recibido en /api/upload');
            console.log('Files:', req.files ? req.files.length : 'NULL');
            console.log('Body:', req.body);

            if (!req.files || req.files.length === 0) {
                console.log('❌ No se recibieron archivos');
                return res.status(400).json({
                    error: 'No se recibieron archivos'
                });
            }

            const docType = req.body.docType || 'CP';
            const taskId = uuidv4();

            console.log(`📤 Upload iniciado - TaskID: ${taskId}`);
            console.log(`📁 Archivos recibidos: ${req.files.length}`);
            console.log(`📋 Tipo de documento: ${docType}`);

            // Crear tarea
            tasks.set(taskId, {
                status: 'processing',
                results: [],
                totalFiles: req.files.length,
                processedFiles: 0
            });

            // Procesar archivos async
            UploadController.processFiles(taskId, req.files, docType, req.user.id);

            res.json({
                taskId,
                message: 'Procesamiento iniciado',
                filesCount: req.files.length
            });

        } catch (error) {
            console.error('❌ Error en upload:', error);
            res.status(500).json({
                error: 'Error al procesar archivos'
            });
        }
    }

    /**
     * Procesar archivos de forma asíncrona
     */
    static async processFiles(taskId, files, docType, userId) {
        try {
            const task = tasks.get(taskId);
            const results = [];

            // Lazy load services to ensure connection
            const StorageService = require('../services/storage.service');
            const DocumentModel = require('../models/document.model');

            for (const file of files) {
                try {
                    console.log(`🔄 Procesando: ${file.originalname}`);

                    // 1. Subir a Cloudinary (Persistencia)
                    const uploadResult = await StorageService.uploadFile(file.path);

                    // 2. Crear registro en BD
                    const document = await DocumentModel.create({
                        user_id: userId,
                        filename: file.filename,
                        original_name: file.originalname,
                        file_path: uploadResult.url,
                        file_type: file.mimetype,
                        file_size: file.size
                    });

                    // 3. Procesar OCR
                    const result = await OCRService.processPDF(uploadResult.url, docType);

                    result.filename = file.originalname;
                    results.push(result);

                    // 4. Guardar resultados OCR en BD
                    await DocumentModel.updateOCRStatus(document.id, 'completed', result);

                    task.processedFiles++;
                    console.log(`✓ Procesado y Guardado: ${file.originalname}`);

                    // 5. Limpiar archivo local temporal
                    const fs = require('fs');
                    try {
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (e) { }

                } catch (error) {
                    console.error(`✗ Error procesando ${file.originalname}:`, error);
                    results.push({
                        filename: file.originalname,
                        extractionSource: 'ERROR',
                        confidenceScore: 0,
                        datos: [
                            { label: 'Error', value: error.message }
                        ]
                    });
                }
            }

            // Actualizar tarea
            task.status = 'completed';
            task.results = results;
            tasks.set(taskId, task);

            console.log(`✅ Tarea ${taskId} completada`);

        } catch (error) {
            console.error(`❌ Error en procesamiento de tarea ${taskId}:`, error);
            const task = tasks.get(taskId);
            if (task) {
                task.status = 'error';
                task.error = error.message;
                tasks.set(taskId, task);
            }
        }
    }

    /**
     * Obtener estado de tarea
     */
    static async getStatus(req, res) {
        try {
            const { taskId } = req.params;
            const task = tasks.get(taskId);

            if (!task) {
                return res.status(404).json({
                    error: 'Tarea no encontrada'
                });
            }

            res.json(task);

        } catch (error) {
            console.error('❌ Error obteniendo estado:', error);
            res.status(500).json({
                error: 'Error al obtener estado'
            });
        }
    }
}

module.exports = UploadController;
