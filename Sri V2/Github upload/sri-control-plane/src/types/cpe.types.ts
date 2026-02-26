/**
 * Tipos TypeScript para Carta de Porte Electrónica (CPE)
 * 
 * Basado en el formato estándar de SENASA/AFIP (Automotor)
 */

// ============================================================================
// INTERVINIENTES
// ============================================================================

export interface CpeParty {
    cuit: string;
    name: string;
}

// ============================================================================
// CPE PARSEADA
// ============================================================================

export interface ParsedCPE {
    // Identificación
    cpe_number: string;           // Ej: "00000-00003905"
    ctg_number: string;           // Ej: "10129495788"
    document_type: 'CPE';

    // Fechas
    emission_date: string;        // Fecha del documento
    expiration_date: string;      // Vencimiento

    // A - INTERVINIENTES
    titular: CpeParty;
    remitente_comercial_productor?: CpeParty;
    rte_comercial_venta_primaria?: CpeParty;
    corredor_venta_primaria?: CpeParty;
    corredor_venta_secundaria?: CpeParty;
    representante_entregador?: CpeParty;
    destinatario: CpeParty;
    destino: CpeParty;
    empresa_transportista: CpeParty;

    // Otros intervinientes
    rte_comercial_venta_secundaria?: CpeParty;
    flete_pagador?: CpeParty;
    chofer?: CpeParty;
    intermediario_flete?: CpeParty;

    // B - GRANO / ESPECIE
    grain_type: string;           // Ej: "Cebada"
    grain_subtype: string;        // Ej: "Cebada Forrajera"
    quality_declaration: 'Conforme' | 'Condicional' | string;

    // Pesos
    gross_weight_kg: number;      // Peso Bruto
    tare_weight_kg: number;       // Peso Tara
    net_weight_kg: number;        // Peso Neto

    // Campaña
    campaign: string;             // Ej: "2526"
    observations?: string;

    // C - PROCEDENCIA
    origin_locality: string;
    origin_province: string;
    is_field: boolean;
    latitude?: string;
    longitude?: string;

    // D - DESTINO DE LA MERCADERÍA
    destination_plant_number?: string;
    destination_locality: string;
    destination_province: string;
    destination_address?: string;

    // E - DATOS DEL TRANSPORTE
    truck_plates: string;         // Ej: "WVI661 - UZB903"
    departure_date?: string;
    km_to_travel?: number;
    freight_rate?: number;

    // G - DESCARGA
    discharge_date?: string;
    arrival_date?: string;
    discharge_gross_kg?: number;
    discharge_tare_kg?: number;
    discharge_net_kg?: number;

    // Metadata
    raw_text?: string;
    parse_warnings: string[];
}

// ============================================================================
// RESPUESTAS
// ============================================================================

export interface CpeParseResult {
    success: boolean;
    cpe?: ParsedCPE;
    errors: string[];
    warnings: string[];
}
