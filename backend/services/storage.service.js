/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STORAGE SERVICE - Gestión de archivos en Cloudinary
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const fs = require('fs');
const path = require('path');

class StorageService {
    constructor() {
        // Configurar Cloudinary
        const cloudUrl = process.env.CLOUDINARY_URL;

        if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: env.CLOUDINARY_CLOUD_NAME,
                api_key: env.CLOUDINARY_API_KEY,
                api_secret: env.CLOUDINARY_API_SECRET
            });
            this.isConfigured = true;
            console.log('✅ Cloudinary configurado correctamente (Variables)');
        } else if (cloudUrl) {
            // Fallback: Parse from CLOUDINARY_URL if set
            // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
            try {
                const regex = /cloudinary:\/\/(\d+):([a-zA-Z0-9_-]+)@([a-zA-Z0-9_-]+)/;
                const match = cloudUrl.match(regex);
                if (match) {
                    cloudinary.config({
                        cloud_name: match[3],
                        api_key: match[1],
                        api_secret: match[2]
                    });
                    this.isConfigured = true;
                    console.log('✅ Cloudinary configurado correctamente (URL)');
                }
            } catch (e) {
                console.error("Error parsing CLOUDINARY_URL", e);
            }
        }

        if (!this.isConfigured) {
            console.warn('⚠️ Cloudinary no configurado. Usando almacenamiento local efímero.');
            this.isConfigured = false;
        }
    }

    /**
     * Sube un archivo a Cloudinary (o local si no está configurado)
     * @param {string} filePath - Ruta absoluta al archivo local
     * @param {string} folder - Carpeta destino en Cloudinary
     */
    async uploadFile(filePath, folder = 'sri_documents') {
        if (!this.isConfigured) {
            // Fallback local: devolver ruta relativa
            return {
                url: `/uploads/${path.basename(filePath)}`,
                public_id: null,
                storage_type: 'local'
            };
        }

        try {
            console.log(`📤 Subiendo archivo a Cloudinary: ${filePath}`);

            const result = await cloudinary.uploader.upload(filePath, {
                folder: folder,
                resource_type: 'auto', // Auto-detectar (pdf, imagen, etc)
                use_filename: true,
                unique_filename: true
            });

            console.log(`✅ Archivo subido: ${result.secure_url}`);

            return {
                url: result.secure_url,
                public_id: result.public_id,
                storage_type: 'cloudinary',
                format: result.format,
                size: result.bytes
            };
        } catch (error) {
            console.error('❌ Error subiendo a Cloudinary:', error);
            throw new Error(`Error subiendo archivo: ${error.message}`);
        }
    }

    /**
     * Elimina un archivo
     */
    async deleteFile(publicId) {
        if (!this.isConfigured || !publicId) return;

        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Error eliminando de Cloudinary:', error);
        }
    }
}

module.exports = new StorageService();
