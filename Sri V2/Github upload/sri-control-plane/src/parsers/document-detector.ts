/**
 * Document Type Detector
 * 
 * Detecta si un PDF es una Carta de Porte Electrónica (CPE) o una Liquidación
 * basándose en el texto extraído del documento.
 */

export type DocumentType = 'CPE' | 'LIQUIDACION' | 'UNKNOWN';

/**
 * Detecta si el texto corresponde a una CPE
 */
export function isCPE(text: string): boolean {
    const lower = text.toLowerCase();
    return (
        lower.includes('carta de porte electrónica') ||
        lower.includes('carta de porte electronica') ||
        (lower.includes('carta de porte') && lower.includes('automotor'))
    );
}

/**
 * Detecta si el texto corresponde a una Liquidación
 */
export function isLiquidacion(text: string): boolean {
    const lower = text.toLowerCase();
    return (
        lower.includes('liquidación primaria de granos') ||
        lower.includes('liquidacion primaria de granos') ||
        lower.includes('formulario c1116') ||
        (lower.includes('liquidación') && lower.includes('c.o.e'))
    );
}

/**
 * Detectar tipo de documento
 */
export function detectDocumentType(text: string): DocumentType {
    if (isCPE(text)) return 'CPE';
    if (isLiquidacion(text)) return 'LIQUIDACION';
    return 'UNKNOWN';
}
