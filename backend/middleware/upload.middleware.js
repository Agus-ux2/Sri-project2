/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * UPLOAD MIDDLEWARE - Configuración de Multer
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

// Crear directorio de uploads si no existe
if (!fs.existsSync(env.UPLOADS_PATH)) {
    fs.mkdirSync(env.UPLOADS_PATH, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, env.UPLOADS_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, PDF'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

module.exports = upload;
