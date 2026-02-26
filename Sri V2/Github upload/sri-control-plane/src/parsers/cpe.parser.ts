/**
 * Parser de Carta de Porte Electrónica (CPE)
 * 
 * Extrae datos estructurados del texto crudo de un PDF de CPE
 * emitido por SENASA/AFIP (formato Automotor).
 * 
 * Calibrado con muestras reales:
 *   - cpe-00000-00003905.pdf (Cebada Forrajera, 30160 kg neto)
 *   - cpe-00000-00003906.pdf (Cebada Forrajera, 34120 kg neto)
 */

import { ParsedCPE, CpeParty, CpeParseResult } from '../types/cpe.types';

export class CpeParser {
    private warnings: string[] = [];

    /**
     * Parser principal — recibe texto extraído de un PDF
     */
    parse(text: string): CpeParseResult {
        this.warnings = [];
        const errors: string[] = [];

        try {
            const cpe: ParsedCPE = {
                // Identificación
                cpe_number: this.extractCpeNumber(text),
                ctg_number: this.extractCtgNumber(text),
                document_type: 'CPE',

                // Fechas
                emission_date: this.extractEmissionDate(text),
                expiration_date: this.extractExpirationDate(text),

                // A - INTERVINIENTES
                titular: this.extractParty(text, 'Titular Carta de Porte'),
                destinatario: this.extractParty(text, 'Destinatario'),
                destino: this.extractParty(text, 'Destino'),
                empresa_transportista: this.extractParty(text, 'Empresa Transportista'),
                remitente_comercial_productor: this.extractOptionalParty(text, 'Remitente Comercial Productor'),
                rte_comercial_venta_primaria: this.extractOptionalParty(text, 'Rte\\. Comercial Venta Primaria'),
                corredor_venta_primaria: this.extractOptionalParty(text, 'Corredor Venta Primaria'),
                corredor_venta_secundaria: this.extractOptionalParty(text, 'Corredor Venta Secundaria'),
                representante_entregador: this.extractOptionalParty(text, 'Representante entregador'),
                rte_comercial_venta_secundaria: this.extractOptionalParty(text, 'Rte\\. Comercial Venta secundaria:'),
                flete_pagador: this.extractFletePagador(text),
                chofer: this.extractChofer(text),
                intermediario_flete: this.extractOptionalParty(text, 'Intermediario de flete'),

                // B - GRANO / ESPECIE
                grain_type: this.extractGrainType(text),
                grain_subtype: this.extractGrainSubtype(text),
                quality_declaration: this.extractQualityDeclaration(text),

                // Pesos
                ...this.extractWeights(text),

                // Campaña
                campaign: this.extractCampaign(text),
                observations: this.extractObservations(text),

                // C - PROCEDENCIA
                origin_locality: this.extractOriginLocality(text),
                origin_province: this.extractOriginProvince(text),
                is_field: this.extractIsField(text),
                latitude: this.extractLatitude(text),
                longitude: this.extractLongitude(text),

                // D - DESTINO
                destination_plant_number: this.extractPlantNumber(text),
                destination_locality: this.extractDestinationLocality(text),
                destination_province: this.extractDestinationProvince(text),
                destination_address: this.extractDestinationAddress(text),

                // E - TRANSPORTE
                truck_plates: this.extractTruckPlates(text),
                departure_date: this.extractDepartureDate(text),
                km_to_travel: this.extractKmToTravel(text),
                freight_rate: this.extractFreightRate(text),

                // G - DESCARGA
                discharge_date: this.extractDischargeDate(text),

                // Metadata
                parse_warnings: this.warnings,
            };

            return {
                success: true,
                cpe,
                errors,
                warnings: this.warnings,
            };

        } catch (error: any) {
            errors.push(`Error fatal parseando CPE: ${error.message}`);
            return {
                success: false,
                errors,
                warnings: this.warnings,
            };
        }
    }

    // ==========================================================================
    // IDENTIFICACIÓN
    // ==========================================================================

    private extractCpeNumber(text: string): string {
        // Formato: "00000-00003905" — aparece en la línea después de "N° CPE:"
        // En el PDF la línea "00000-00003905" aparece antes de "N° CPE:" o como
        // texto suelto. Lo buscamos directamente por formato.
        const match = text.match(/(\d{5}-\d{8})/);
        if (match) return match[1];

        this.warnings.push('No se pudo extraer N° CPE');
        return '';
    }

    private extractCtgNumber(text: string): string {
        const match = text.match(/CTG:\s*(\d+)/i);
        if (match) return match[1];

        this.warnings.push('No se pudo extraer CTG');
        return '';
    }

    // ==========================================================================
    // FECHAS
    // ==========================================================================

    private extractEmissionDate(text: string): string {
        // La fecha de emisión aparece como "DD/MM/YYYY HH:MM" justo después del 
        // número de CPE. Es la fecha del "Vencimiento:" label.
        // Estructura observada:
        //   16/02/2026 21:44
        //   Fecha:
        //   Vencimiento:
        //   13/02/2026
        //
        // La primera fecha (con hora) es la de emisión/vencimiento del documento,
        // la segunda es la fecha de la operación.

        // Buscar fecha con hora (formato DD/MM/YYYY HH:MM)
        const match = text.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
        if (match) return match[1].trim();

        this.warnings.push('No se pudo extraer fecha de emisión');
        return '';
    }

    private extractExpirationDate(text: string): string {
        // Buscar la fecha que aparece después de "Vencimiento:" 
        // En el texto crudo el patrón es:
        //   Vencimiento:
        //   13/02/2026
        const match = text.match(/Vencimiento:\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (match) return match[1];

        // Fallback: buscar la segunda fecha DD/MM/YYYY (sin hora)
        const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g);
        if (dates && dates.length >= 2) return dates[1];

        this.warnings.push('No se pudo extraer fecha de vencimiento');
        return '';
    }

    // ==========================================================================
    // A - INTERVINIENTES
    // ==========================================================================

    /**
     * Extrae un CUIT + Razón Social del formato "DDDDDDDDDDDD - NOMBRE"
     * 
     * En el PDF, las partes aparecen como líneas con formato:
     *   30711629048 - ARGENTRADING S.A.
     * 
     * El truco es que en el texto crudo aparecen DESPUÉS de sus labels,
     * pero agrupados secuencialmente en el bloque de intervinientes.
     */
    private extractParty(text: string, label: string): CpeParty {
        const party = this.extractOptionalParty(text, label);
        if (party) return party;

        this.warnings.push(`No se pudo extraer parte: ${label}`);
        return { cuit: '', name: '' };
    }

    private extractOptionalParty(text: string, label: string): CpeParty | undefined {
        // Estrategia: buscar el label y luego buscar el patrón CUIT - Nombre
        // en las líneas siguientes del bloque de intervinientes

        // El texto del PDF tiene un orden particular:
        // Labels primero (Titular, Remitente..., Destinatario, Destino, Empresa Transportista)
        // Luego los valores CUIT - Nombre en el mismo orden

        // Intentar encontrar el CUIT-Nombre directamente después del label
        const labelRegex = new RegExp(label + '[:\\s]*\\n?\\s*(\\d{11})\\s*-\\s*(.+)', 'i');
        const match = text.match(labelRegex);
        if (match) {
            return {
                cuit: match[1].trim(),
                name: this.cleanName(match[2].trim()),
            };
        }

        return undefined;
    }

    /**
     * Extrae las partes en orden secuencial del bloque de intervinientes.
     * 
     * El PDF tiene esta estructura (observada en las muestras):
     * 
     *   Titular Carta de Porte:
     *   Remitente Comercial Productor:
     *   Rte. Comercial Venta Primaria:
     *   ...
     *   Destinatario:
     *   Destino:
     *   Empresa Transportista:
     *   30711629048 - ARGENTRADING S.A.          ← estos son los valores
     *   30663290262 - INTAGRO SOCIEDAD ANONIMA   ← en orden
     *   ...
     */
    extractPartiesSequential(text: string): Map<string, CpeParty> {
        const parties = new Map<string, CpeParty>();

        // Extraer todos los CUIT - Nombre del texto
        const cuitPattern = /(\d{11})\s*-\s*([^\n]+)/g;
        const allParties: CpeParty[] = [];
        let match;

        while ((match = cuitPattern.exec(text)) !== null) {
            allParties.push({
                cuit: match[1],
                name: this.cleanName(match[2].trim()),
            });
        }

        // Mapear por posición según el orden del PDF
        // Posiciones observadas en las muestras (puede variar):
        const labels = [
            'titular',
            'rte_comercial_venta_primaria',
            'destinatario_interviniente',
            'destinatario',
            'destino',
            'empresa_transportista',
        ];

        allParties.forEach((party, index) => {
            if (index < labels.length) {
                parties.set(labels[index], party);
            }
        });

        return parties;
    }

    private extractFletePagador(text: string): CpeParty | undefined {
        const match = text.match(/Flete\s+pagador\s*:\s*\n?\s*(\d{11})\s*-\s*([^\n]+)/i);
        if (match) {
            return { cuit: match[1], name: this.cleanName(match[2]) };
        }
        // A veces el flete pagador está en la línea del titular
        const inlineMatch = text.match(/(\d{11})\s*-\s*([^\n]+?)Flete\s+pagador/i);
        if (inlineMatch) {
            return { cuit: inlineMatch[1], name: this.cleanName(inlineMatch[2]) };
        }
        return undefined;
    }

    private extractChofer(text: string): CpeParty | undefined {
        const match = text.match(/Chofer\s*:\s*(\d{11})\s*-\s*([^\n]+)/i);
        if (match) {
            return { cuit: match[1], name: this.cleanName(match[2]) };
        }
        return undefined;
    }

    // ==========================================================================
    // B - GRANO / ESPECIE
    // ==========================================================================

    private extractGrainType(text: string): string {
        // Buscar sección B y extraer el grano
        // En las muestras: las líneas después de "Grano /Tipo:" y antes de los pesos
        // contienen el tipo y subtipo en líneas separadas:
        //   Cebada
        //   Cebada Forrajera
        const section = this.extractSection(text, 'B - GRANO', 'C - PROCEDENCIA');

        // Buscar línea con nombre de grano (después de labels de calidad)
        if (section) {
            // Los granos conocidos del agro argentino
            const grains = [
                'Trigo', 'Soja', 'Maíz', 'Girasol', 'Cebada', 'Sorgo',
                'Avena', 'Centeno', 'Arroz', 'Colza', 'Lino', 'Maní',
                'Algodón', 'Cártamo'
            ];

            for (const grain of grains) {
                if (section.includes(grain)) {
                    return grain;
                }
            }
        }

        this.warnings.push('No se pudo extraer tipo de grano');
        return '';
    }

    private extractGrainSubtype(text: string): string {
        const section = this.extractSection(text, 'B - GRANO', 'C - PROCEDENCIA');
        if (!section) return '';

        // Buscar línea con subtipo (ej: "Cebada Forrajera", "Trigo Pan", "Soja Común")
        const subtypes = [
            'Cebada Forrajera', 'Cebada Cervecera',
            'Trigo Pan', 'Trigo Candeal', 'Trigo Fideo',
            'Maíz Flint', 'Maíz Dentado', 'Maíz Pisingallo',
            'Soja',
            'Girasol',
            'Sorgo Granífero',
        ];

        for (const sub of subtypes) {
            if (section.includes(sub)) {
                return sub;
            }
        }

        // Fallback: buscar segunda línea con nombre de grano
        const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const grainLineIdx = lines.findIndex(l =>
            /^(Trigo|Soja|Maíz|Girasol|Cebada|Sorgo|Avena)/i.test(l)
        );
        if (grainLineIdx >= 0 && grainLineIdx + 1 < lines.length) {
            const nextLine = lines[grainLineIdx + 1];
            if (/^(Trigo|Soja|Maíz|Girasol|Cebada|Sorgo|Avena)/i.test(nextLine)) {
                return nextLine;
            }
        }

        return '';
    }

    private extractQualityDeclaration(text: string): string {
        if (text.includes('Conforme') && !text.includes('Condicional')) {
            return 'Conforme';
        }
        if (text.includes('Condicional')) {
            return 'Condicional';
        }
        return '';
    }

    // ==========================================================================
    // PESOS — Lógica especial para pesos concatenados
    // ==========================================================================

    /**
     * Los pesos en el texto crudo del PDF vienen concatenados sin espacios.
     * 
     * Ejemplo observado: "4340013240" seguido de "30160"
     * Donde:
     *   - 43400 = Peso Bruto
     *   - 13240 = Peso Tara  
     *   - 30160 = Peso Neto
     * 
     * Verificación: Bruto - Tara = 43400 - 13240 = 30160 = Neto ✓
     * 
     * La estrategia es:
     * 1. Encontrar el bloque de pesos (número largo + número corto)
     * 2. Usar el neto para deducir cómo separar bruto y tara
     */
    private extractWeights(text: string): {
        gross_weight_kg: number;
        tare_weight_kg: number;
        net_weight_kg: number;
    } {
        const section = this.extractSection(text, 'B - GRANO', 'C - PROCEDENCIA');
        if (!section) {
            this.warnings.push('No se pudo encontrar sección de pesos');
            return { gross_weight_kg: 0, tare_weight_kg: 0, net_weight_kg: 0 };
        }

        // Buscar números que representan pesos concatenados
        // Patrón: un número largo (bruto+tara concatenados) seguido de un número (neto)
        const weightMatch = section.match(/(\d{8,12})\s*\n?\s*(\d{4,6})/);

        if (weightMatch) {
            const concatenated = weightMatch[1];
            const netWeight = parseInt(weightMatch[2], 10);

            // Probar diferentes posiciones de split para bruto/tara
            const result = this.splitBrutoTara(concatenated, netWeight);

            if (result) {
                return {
                    gross_weight_kg: result.bruto,
                    tare_weight_kg: result.tara,
                    net_weight_kg: netWeight,
                };
            }
        }

        // Fallback: buscar "Peso Bruto" / "Peso Tara" / "Peso Neto" con valores
        const brutoMatch = text.match(/Peso\s*Bruto\s*\(?kg\)?\s*:\s*(\d+)/i);
        const taraMatch = text.match(/Peso\s*Tara\s*\(?kg\)?\s*:\s*(\d+)/i);
        const netoMatch = text.match(/Peso\s*Neto\s*\(?kg\)?\s*:\s*(\d+)/i);

        if (brutoMatch && taraMatch && netoMatch) {
            return {
                gross_weight_kg: parseInt(brutoMatch[1], 10),
                tare_weight_kg: parseInt(taraMatch[1], 10),
                net_weight_kg: parseInt(netoMatch[1], 10),
            };
        }

        this.warnings.push('No se pudieron extraer los pesos');
        return { gross_weight_kg: 0, tare_weight_kg: 0, net_weight_kg: 0 };
    }

    /**
     * Intenta separar un string concatenado de bruto+tara
     * verificando que bruto - tara = neto
     */
    private splitBrutoTara(
        concatenated: string,
        expectedNet: number
    ): { bruto: number; tara: number } | null {
        const len = concatenated.length;

        // Probar split en cada posición posible
        for (let i = 3; i <= len - 3; i++) {
            const bruto = parseInt(concatenated.substring(0, i), 10);
            const tara = parseInt(concatenated.substring(i), 10);

            if (bruto - tara === expectedNet && bruto > tara && tara > 0) {
                return { bruto, tara };
            }
        }

        return null;
    }

    // ==========================================================================
    // CAMPAÑA Y OBSERVACIONES
    // ==========================================================================

    private extractCampaign(text: string): string {
        const match = text.match(/Campa[ñn]a:\s*(\d{4})/i);
        if (match) return match[1];
        return '';
    }

    private extractObservations(text: string): string {
        const match = text.match(/Observaciones:\s*([^\n]+)/i);
        if (match) return match[1].trim();
        return '';
    }

    // ==========================================================================
    // C - PROCEDENCIA
    // ==========================================================================

    private extractOriginLocality(text: string): string {
        // Formato observado: "Localidad:ProvinciaGARREBUENOS AIRES"
        // El texto se concatena. Necesitamos buscar entre "Localidad:" y "Provincia"
        const match = text.match(/C\s*-\s*PROCEDENCIA[\s\S]*?Localidad:\s*(?:Provincia)?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:BUENOS|SANTA|ENTRE|MENDOZA|CÓRDOBA|CORRIENTES|MISIONES|CHACO|FORMOSA|SANTIAGO|TUCUMÁN|SALTA|JUJUY|CATAMARCA|LA\s+RIOJA|SAN\s+JUAN|SAN\s+LUIS|NEUQUÉN|RÍO\s+NEGRO|CHUBUT|TIERRA|LA\s+PAMPA)/i);
        if (match) return match[1].trim();

        // Fallback simpler pattern
        const simpleMatch = text.match(/C\s*-\s*PROCEDENCIA[\s\S]*?Localidad:\s*(?:Provincia)?\s*(\w+)/i);
        if (simpleMatch) return simpleMatch[1].trim();

        this.warnings.push('No se pudo extraer localidad de procedencia');
        return '';
    }

    private extractOriginProvince(text: string): string {
        // Buscar en la sección C la provincia
        const section = this.extractSection(text, 'C - PROCEDENCIA', 'D - DESTINO');
        if (section) {
            const provinces = [
                'BUENOS AIRES', 'SANTA FE', 'CÓRDOBA', 'ENTRE RIOS', 'ENTRE RÍOS',
                'MENDOZA', 'CORRIENTES', 'MISIONES', 'CHACO', 'FORMOSA',
                'SANTIAGO DEL ESTERO', 'TUCUMÁN', 'SALTA', 'JUJUY', 'CATAMARCA',
                'LA RIOJA', 'SAN JUAN', 'SAN LUIS', 'NEUQUÉN', 'RÍO NEGRO',
                'CHUBUT', 'TIERRA DEL FUEGO', 'LA PAMPA', 'SANTA CRUZ'
            ];

            for (const prov of provinces) {
                if (section.toUpperCase().includes(prov)) {
                    return prov;
                }
            }
        }

        this.warnings.push('No se pudo extraer provincia de procedencia');
        return '';
    }

    private extractIsField(text: string): boolean {
        const section = this.extractSection(text, 'C - PROCEDENCIA', 'D - DESTINO');
        if (!section) return false;

        // "Es un campo:" seguido de "Si" o "No"
        const match = section.match(/Es\s+un\s+campo:\s*(Si|No)/i);
        return match ? match[1].toLowerCase() === 'si' : false;
    }

    private extractLatitude(text: string): string | undefined {
        const match = text.match(/Latitud:\s*([^\n]*?\d+°[^\n]*?'')/i);
        return match ? match[1].trim() : undefined;
    }

    private extractLongitude(text: string): string | undefined {
        const match = text.match(/Longitud:\s*\.?([^\n]*?\d+°[^\n]*?'')/i);
        if (match) return match[1].trim();

        // Fallback: buscar segundo patrón de coordenadas
        const matches = text.match(/(\d+°\s*\d+'\s*\d+'')/g);
        return matches && matches.length >= 2 ? matches[1] : undefined;
    }

    // ==========================================================================
    // D - DESTINO DE LA MERCADERÍA
    // ==========================================================================

    private extractPlantNumber(text: string): string | undefined {
        const section = this.extractSection(text, 'D - DESTINO', 'E - DATOS');
        if (!section) return undefined;

        const match = section.match(/N°\s*Planta\s*[\s\S]*?(\d{4,6})/i);
        return match ? match[1] : undefined;
    }

    private extractDestinationLocality(text: string): string {
        const section = this.extractSection(text, 'D - DESTINO', 'E - DATOS');
        if (!section) {
            this.warnings.push('No se pudo extraer localidad de destino');
            return '';
        }

        const match = section.match(/Localidad:\s*(?:Provincia:)?\s*\n?\s*([A-ZÁÉÍÓÚÑ\s]+)/i);
        if (match) return match[1].trim();

        // Fallback: buscar la ciudad directamente
        const cities = section.split('\n')
            .map(l => l.trim())
            .filter(l => /^[A-ZÁÉÍÓÚÑ\s]+$/.test(l) && l.length > 3);

        return cities.length > 0 ? cities[0] : '';
    }

    private extractDestinationProvince(text: string): string {
        const section = this.extractSection(text, 'D - DESTINO', 'E - DATOS');
        if (!section) return '';

        const provinces = [
            'BUENOS AIRES', 'SANTA FE', 'CÓRDOBA', 'ENTRE RIOS',
            'MENDOZA', 'LA PAMPA', 'NEUQUÉN', 'RÍO NEGRO'
        ];

        for (const prov of provinces) {
            if (section.toUpperCase().includes(prov)) {
                return prov;
            }
        }

        return '';
    }

    private extractDestinationAddress(text: string): string | undefined {
        const section = this.extractSection(text, 'D - DESTINO', 'E - DATOS');
        if (!section) return undefined;

        const match = section.match(/Direcci[oó]n:\s*\n?\s*(.+)/i);
        // Sometimes address is concatenated with plant number
        const addrMatch = section.match(/\d{5}([A-ZÁÉÍÓÚÑ\s\d]+)/);
        if (addrMatch) return addrMatch[1].trim();
        if (match) return match[1].trim();
        return undefined;
    }

    // ==========================================================================
    // E - DATOS DEL TRANSPORTE
    // ==========================================================================

    private extractTruckPlates(text: string): string {
        // Formato observado: "WVI661 - UZB903" o "GKX707 - AH590UE"
        // Patentes argentinas: 3 letras + 3 números, o 2 letras + 3 números + 2 letras
        const match = text.match(/([A-Z]{2,3}\d{3}[A-Z]{0,2})\s*-\s*([A-Z]{2,3}\d{3}[A-Z]{0,2})/i);
        if (match) return `${match[1]} - ${match[2]}`;

        this.warnings.push('No se pudieron extraer dominios');
        return '';
    }

    private extractDepartureDate(text: string): string | undefined {
        // Buscar en sección E — "Partida:" seguido de fecha
        const section = this.extractSection(text, 'E - DATOS', 'F - CONTINGENCIAS');
        if (!section) return undefined;

        const match = section.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
        return match ? match[1] : undefined;
    }

    private extractKmToTravel(text: string): number | undefined {
        const section = this.extractSection(text, 'E - DATOS', 'F - CONTINGENCIAS');
        if (!section) return undefined;

        // "Kms. a recorrer:" seguido del número, podría estar en otra línea
        // En las muestras: "280" aparece como línea separada
        const match = section.match(/Kms?\.\s*a\s*recorrer:\s*(?:Partida:)?\s*\n?[\s\S]*?(?:[A-Z]{2,3}\d{3}[\s\S]*?\n)?\s*(?:\d{2}\/\d{2}\/\d{4}[\s\S]*?\n)?\s*(\d{1,5})\s*\n/i);
        if (match) return parseInt(match[1], 10);

        // Simpler fallback: just find a 3-digit number in the transport section
        const lines = section.split('\n').map(l => l.trim());
        for (const line of lines) {
            if (/^\d{1,4}$/.test(line)) {
                const val = parseInt(line, 10);
                if (val >= 1 && val <= 9999) return val;
            }
        }

        return undefined;
    }

    private extractFreightRate(text: string): number | undefined {
        const match = text.match(/Tarifa:\s*\n?\s*([\d.,]+)/i);
        if (match) return this.parseNumber(match[1]);
        return undefined;
    }

    // ==========================================================================
    // G - DESCARGA
    // ==========================================================================

    private extractDischargeDate(text: string): string | undefined {
        const section = this.extractSection(text, 'G - DESCARGA', 'HISTORIAL');
        if (!section) return undefined;

        const match = section.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
        return match ? match[1] : undefined;
    }

    // ==========================================================================
    // HELPERS
    // ==========================================================================

    private extractSection(text: string, startMarker: string, endMarker: string): string | null {
        const startIdx = text.indexOf(startMarker);
        if (startIdx === -1) return null;

        const endIdx = text.indexOf(endMarker, startIdx);
        if (endIdx === -1) return text.substring(startIdx);

        return text.substring(startIdx, endIdx);
    }

    private cleanName(name: string): string {
        // Limpiar caracteres extraños del OCR
        return name
            .replace(/Flete\s*pagador\s*:/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private parseNumber(str: string): number {
        return parseFloat(str.replace(',', '.'));
    }
}

export default new CpeParser();
