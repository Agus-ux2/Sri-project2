/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PARSER SERVICE - Extracción de datos de Excel/TXT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const xlsx = require('xlsx');
const fs = require('fs');

class ParserService {
    /**
     * Procesar archivo no-PDF
     */
    static async processFile(filePath, mimeType) {
        console.log(`📊 Procesando archivo estructurado: ${filePath}`);

        try {
            let textContent = '';

            // Estrategia según tipo de archivo
            if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || filePath.endsWith('.xlsx') || filePath.endsWith('.xls') || filePath.endsWith('.csv')) {
                // Leer Excel/CSV con SheetJS
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convertir a texto crudo (CSV) para buscar con regex
                textContent = xlsx.utils.sheet_to_csv(sheet);
            } else {
                // Leer Texto plano
                textContent = fs.readFileSync(filePath, 'utf8');
            }

            console.log(`📝 Contenido extraído (Primeros 100 caracteres): ${textContent.substring(0, 100)}...`);

            // Usar lógica de extracción existente (reutilizamos la lógica de OCRService porque busca patrones de texto)
            // En el futuro, esto podría ser más sofisticado mapeando columnas específicas de Excel.
            const extractedData = this.extractFields(textContent);

            return {
                extractionSource: 'PARSER_LOCAL',
                confidenceScore: 100, // Al ser digital, la lectura es perfecta
                datos: extractedData
            };

        } catch (error) {
            console.error('Error parsing file:', error);
            throw new Error(`Error analizando archivo: ${error.message}`);
        }
    }

    /**
     * Extraer campos (Reutiliza lógica similar a OCRService por ahora)
     */
    static extractFields(text) {
        const fields = [];

        // CPE/CTG Number
        const cpeMatch = text.match(/(?:CPE|CTG|CP)[^\d]*(\d{4,})/i);
        if (cpeMatch) fields.push({ label: 'CPE/CTG', value: cpeMatch[1] });

        // Peso Bruto
        const pesoMatch = text.match(/(?:peso|neto|bruto).*?(\d+[.,]\d+)/i);
        if (pesoMatch) fields.push({ label: 'Kilos', value: pesoMatch[1] });

        // Producto
        const productoMatch = text.match(/(soja|maiz|trigo|girasol|cebada|sorgo)/i);
        if (productoMatch) fields.push({ label: 'Producto', value: productoMatch[0].toUpperCase() });

        // Fecha (dd/mm/yyyy o yyyy-mm-dd)
        const fechaMatch = text.match(/(\d{2}[\/-]\d{2}[\/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/);
        if (fechaMatch) fields.push({ label: 'Fecha', value: fechaMatch[0] });

        return fields;
    }
}

module.exports = ParserService;
