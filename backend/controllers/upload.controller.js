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
            UploadController.processFiles(taskId, req.files, docType);

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
    static async processFiles(taskId, files, docType) {
        try {
            const task = tasks.get(taskId);
            const results = [];

            for (const file of files) {
                try {
                    console.log(`🔄 Procesando: ${file.originalname}`);

                    const result = await OCRService.processPDF(file.path, docType);
                    result.filename = file.originalname; // Usar nombre original
                    results.push(result);

                    task.processedFiles++;
                    console.log(`✓ Procesado: ${file.originalname}`);

                    // Limpiar archivo después de procesar
                    fs.unlinkSync(file.path);

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
