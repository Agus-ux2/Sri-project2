/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * FILE SYNC UTILITY - Gestión de deduplicación inteligente
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const fs = require('fs');
const path = require('path');

class FileSync {
    /**
     * Verifica si un archivo descargado es nuevo o actualizado
     * @param {string} tempPath - Ruta del archivo recién descargado
     * @param {string} targetDir - Directorio de destino final
     * @returns {Object} { action: 'skip' | 'update' | 'new', finalPath: string }
     */
    static checkAndSync(tempPath, targetDir) {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const fileName = path.basename(tempPath);
        const finalPath = path.join(targetDir, fileName);

        // Caso 1: El archivo no existe -> Es nuevo
        if (!fs.existsSync(finalPath)) {
            fs.renameSync(tempPath, finalPath);
            return { action: 'new', finalPath };
        }

        // Caso 2: El archivo existe -> Comparar tamaños
        const oldStats = fs.statSync(finalPath);
        const newStats = fs.statSync(tempPath);

        if (oldStats.size === newStats.size) {
            // Tamaños iguales -> Descartar el nuevo
            fs.unlinkSync(tempPath);
            return { action: 'skip', finalPath };
        } else {
            // Tamaños distintos -> Reemplazar
            fs.unlinkSync(finalPath);
            fs.renameSync(tempPath, finalPath);
            return { action: 'update', finalPath };
        }
    }
}

module.exports = FileSync;
