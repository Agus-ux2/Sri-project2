/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OCR SERVICE - Extracción de datos de PDFs agropecuarios
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');
const env = require('../config/env');

class OCRService {
    /**
     * Procesar PDF y extraer datos
     * @param {string} filePath - Ruta del archivo PDF
     * @param {string} docType - Tipo: 'CP' o 'CED'
     * @returns {Promise<Object>} Datos extraídos
     */
    static async processPDF(filePath, docType = 'CP') {
        try {
            let dataBuffer;

            // 1. INTENTO NANONETS (Solo si es URL remota y hay Keys)
            if (env.NANONETS_API_KEY && env.NANONETS_MODEL_ID && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
                try {
                    return await this.processWithNanonets(filePath, docType);
                } catch (e) {
                    console.error("⚠️ Nanonets falló, usaré fallback local:", e.message);
                    // Continuar con lógica local...
                }
            }

            // 2. FALLBACK: PROCESAMIENTO LOCAL
            // Determinar si es URL remota o archivo local
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                console.log(`🌐 Descargando PDF remoto (Fallback): ${filePath}`);
                const fetch = require('node-fetch');
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`Error descargando archivo: ${response.statusText}`);
                dataBuffer = await response.buffer();
            } else {
                console.log(`📂 Leyendo archivo local: ${filePath}`);
                dataBuffer = fs.readFileSync(filePath);
            }

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
     * Procesar con Nanonets API
     */
    static async processWithNanonets(fileUrl, docType) {
        console.log('🤖 Enviando archivo a Nanonets AI...');
        const fetch = require('node-fetch');
        const { URLSearchParams } = require('url');

        const params = new URLSearchParams();
        params.append('urls', fileUrl);

        const response = await fetch(`https://app.nanonets.com/api/v2/OCR/Model/${env.NANONETS_MODEL_ID}/LabelUrls/`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${env.NANONETS_API_KEY}:`).toString('base64'),
            },
            body: params
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Nanonets Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const result = data.result && data.result[0];

        if (!result) throw new Error("No devolvió resultados");

        console.log('✨ Nanonets respondió exitosamente');

        // Mapear predicciones
        const fields = result.prediction.map(p => ({
            label: p.label,
            value: p.ocr_text,
            confidence: p.score
        }));

        return {
            filename: fileUrl.split('/').pop(),
            extractionSource: 'NANONETS_AI',
            confidenceScore: Math.round(result.score * 100) || 95,
            datos: fields
        };
    }

    /**
     * Extraer campos de CP/CTG (Legacy Local)
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
