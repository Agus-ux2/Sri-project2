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
            const OCRService = require('../services/ocr.service'); // Ensure OCRService is loaded
            const ParserService = require('../services/parser.service');
            const ContractModel = require('../models/contract.model'); // Importar modelo

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

                    // 3. Procesar Contenido (OCR o Parser)
                    let result;

                    // Robustez: Chequear extensión también por si el mimetype viene mal del browser
                    const path = require('path');
                    const ext = path.extname(file.originalname).toLowerCase();
                    const isExcelOrTxt = ['.xlsx', '.xls', '.csv', '.txt'].includes(ext);

                    const isPdfOrImage = (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) && !isExcelOrTxt;

                    const env = require('../config/env');
                    const isSupportedExtension = ['.xlsx', '.xls', '.pdf', '.jpg', '.png', '.jpeg'].includes(ext);
                    const hasNanonetsKeys = env.NANONETS_API_KEY && env.NANONETS_MODEL_ID;

                    const useNanonets = hasNanonetsKeys && isSupportedExtension;

                    console.log(`🤖 Debug Nanonets Decision:`);
                    console.log(`   - File Ext: ${ext}`);
                    console.log(`   - Supported Ext: ${isSupportedExtension}`);
                    console.log(`   - Has Keys: ${hasNanonetsKeys} (Key: ${!!env.NANONETS_API_KEY}, Model: ${!!env.NANONETS_MODEL_ID})`);
                    console.log(`   - Will Use Nanonets: ${useNanonets}`);

                    if (useNanonets) {
                        try {
                            console.log('🤖 Intentando Nanonets para:', file.originalname);
                            // Usar URL remota (Cloudinary)
                            result = await OCRService.processWithNanonets(uploadResult.url, docType);
                        } catch (e) {
                            console.warn('⚠️ Nanonets falló, intentando fallback local:', e.message);
                        }
                    } else if (!hasNanonetsKeys) {
                        console.warn('⚠️ Nanonets saltado: Falta API Key o Model ID en variables de entorno.');
                    }

                    // Si no hubo resultado (Nanonets falló o no estaba config), usar Fallback Local
                    if (!result) {
                        if (isExcelOrTxt) {
                            console.log('📊 Usando Parser Local (Excel/Txt)');
                            result = await ParserService.processFile(file.path, file.mimetype);
                        } else {
                            // PDF o Imagen Local (Regex)
                            console.log('📄 Usando OCR Service (Hybrid/Local)');
                            let fileToProcess = uploadResult.storage_type === 'local' ? file.path : uploadResult.url;
                            result = await OCRService.processPDF(fileToProcess, docType);
                        }
                    }

                    result.filename = file.originalname;
                    results.push(result);

                    // 4. Guardar resultados Extraction en BD
                    await DocumentModel.updateOCRStatus(document.id, 'completed', result);

                    // 5. AUTO-CREAR CONTRATO (Si hay suficientes datos)
                    if (result.datos && result.datos.length > 0) {
                        const product = result.datos.find(d => d.label === 'Producto' || d.label.includes('Prod'))?.value;
                        const kilos = result.datos.find(d => d.label === 'Peso Neto' || d.label === 'Kilos' || d.label.includes('Peso'))?.value;
                        const cpe = result.datos.find(d => d.label === 'CPE/CTG' || d.label.includes('CPE') || d.label.includes('Ref'))?.value;

                        // Solo crear si tenemos al menos Producto y Kilos
                        if (product && kilos) {
                            try {
                                await ContractModel.create({
                                    user_id: userId,
                                    contract_number: cpe || 'S/N',
                                    provider: 'Proveedor S/D',
                                    grain_type: product,
                                    quantity: parseFloat(kilos.replace(',', '.').replace(/[^\d.]/g, '')),
                                    price: 0,
                                    delivery_date: new Date(),
                                    status: 'draft'
                                });
                                console.log('✅ Contrato Borrador creado automáticamente');
                            } catch (err) {
                                console.error('Error creando contrato automático:', err);
                            }
                        }
                    }

                    task.processedFiles++;
                    console.log(`✓ Procesado y Guardado: ${file.originalname}`);

                    // 6. Limpiar archivo local temporal
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

            // Actualizar tarea de UI
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
