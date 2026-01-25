/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OCR SERVICE - Extracción de datos de PDFs agropecuarios
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');

class OCRService {
    /**
     * Procesar PDF y extraer datos
     * @param {string} filePath - Ruta del archivo PDF
     * @param {string} docType - Tipo: 'CP' o 'CED'
     * @returns {Promise<Object>} Datos extraídos
     */
    static async processPDF(filePath, docType = 'CP') {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const text = pdfData.text;

            console.log(`📄 Procesando PDF (${docType}): ${filePath}`);
            console.log(`📝 Texto extraído: ${text.substring(0, 200)}...`);

            let extractedData = [];
            let extractionSource = 'ADVANCED';
            let confidenceScore = 85;

            if (docType === 'CP') {
                extractedData = this.extractCPFields(text);
            } else if (docType === 'CED') {
                extractedData = this.extractQualityFields(text);
            }

            // Si no se encontró nada, marcar como legacy
            if (extractedData.length === 0) {
                extractionSource = 'LEGACY_FALLBACK';
                confidenceScore = 50;
                extractedData = [
                    { label: 'Estado', value: 'No se pudieron extraer datos' }
                ];
            }

            return {
                filename: filePath.split(/[\/\\]/).pop(),
                extractionSource,
                confidenceScore,
                datos: extractedData
            };
        } catch (error) {
            console.error('❌ Error procesando PDF:', error);
            throw new Error(`Error al procesar PDF: ${error.message}`);
        }
    }

    /**
     * Extraer campos de CP/CTG
     */
    static extractCPFields(text) {
        const fields = [];

        // CPE/CTG Number
        const cpeMatch = text.match(/(?:CPE|CTG|CP[-\s]?[EC]?)\s*[:\.]?\s*(\d+[-\/]\d+)/i);
        if (cpeMatch) {
            fields.push({ label: 'CPE/CTG', value: cpeMatch[1] });
        }

        // Peso Bruto
        const pesoBrutoMatch = text.match(/peso\s+bruto\s*[:\.]?\s*([\d,.]+)\s*(?:kg|kilos?)?/i);
        if (pesoBrutoMatch) {
            fields.push({ label: 'Peso Bruto', value: `${pesoBrutoMatch[1]} kg` });
        }

        // Tara
        const taraMatch = text.match(/tara\s*[:\.]?\s*([\d,.]+)\s*(?:kg|kilos?)?/i);
        if (taraMatch) {
            fields.push({ label: 'Tara', value: `${taraMatch[1]} kg` });
        }

        // Peso Neto
        const pesoNetoMatch = text.match(/peso\s+neto\s*[:\.]?\s*([\d,.]+)\s*(?:kg|kilos?)?/i);
        if (pesoNetoMatch) {
            fields.push({ label: 'Peso Neto', value: `${pesoNetoMatch[1]} kg` });
        }

        // Producto
        const productoMatch = text.match(/(?:producto|cereal|grano)\s*[:\.]?\s*(soja|maiz|trigo|girasol|cebada)/i);
        if (productoMatch) {
            fields.push({ label: 'Producto', value: productoMatch[1].toUpperCase() });
        }

        // Destino
        const destinoMatch = text.match(/(?:destino|planta)\s*[:\.]?\s*([A-Za-zÁ-ú\s]+?)(?:\n|$)/i);
        if (destinoMatch) {
            fields.push({ label: 'Destino', value: destinoMatch[1].trim() });
        }

        return fields;
    }

    /**
     * Extraer campos de Análisis de Calidad
     */
    static extractQualityFields(text) {
        const fields = [];

        // Producto
        const productoMatch = text.match(/(?:producto|cereal|grano)\s*[:\.]?\s*(soja|maiz|trigo|girasol|cebada)/i);
        if (productoMatch) {
            fields.push({ label: 'Producto', value: productoMatch[1].toUpperCase() });
        }

        // Humedad
        const humedadMatch = text.match(/humedad\s*[:\.]?\s*(\d+[.,]\d+)\s*%?/i);
        if (humedadMatch) {
            fields.push({ label: 'Humedad', value: `${humedadMatch[1].replace(',', '.')}%` });
        }

        // Proteína
        const proteinaMatch = text.match(/prote[ií]na\s*[:\.]?\s*(\d+[.,]\d+)\s*%?/i);
        if (proteinaMatch) {
            fields.push({ label: 'Proteína', value: `${proteinaMatch[1].replace(',', '.')}%` });
        }

        // Grado
        const gradoMatch = text.match(/grado\s*[:\.]?\s*([1-3]|G[1-3]|base|conforme)/i);
        if (gradoMatch) {
            fields.push({ label: 'Grado', value: gradoMatch[1].toUpperCase() });
        }

        // Factor
        const factorMatch = text.match(/factor\s*[:\.]?\s*(\d+[.,]\d+)\s*%?/i);
        if (factorMatch) {
            fields.push({ label: 'Factor', value: `${factorMatch[1].replace(',', '.')}%` });
        }

        // Peso Hectolítrico
        const pesoHectolitricoMatch = text.match(/peso\s+hectol[ií]trico\s*[:\.]?\s*(\d+[.,]\d+)/i);
        if (pesoHectolitricoMatch) {
            fields.push({ label: 'Peso Hectolítrico', value: `${pesoHectolitricoMatch[1].replace(',', '.')} kg/hl` });
        }

        // Volátil
        const volatilMatch = text.match(/vol[aá]til\s*[:\.]?\s*(\d+[.,]\d+)\s*%?/i);
        if (volatilMatch) {
            fields.push({ label: 'Volátil', value: `${volatilMatch[1].replace(',', '.')}%` });
        }

        // Merma
        const mermaMatch = text.match(/merma\s*[:\.]?\s*(\d+[.,]\d+)\s*%?/i);
        if (mermaMatch) {
            fields.push({ label: 'Merma', value: `${mermaMatch[1].replace(',', '.')}%` });
        }

        return fields;
    }
}

module.exports = OCRService;
