/**
 * Tipos TypeScript para el Sistema de Liquidaciones
 */

// ============================================================================
// TIPOS DE LIQUIDACIÓN
// ============================================================================

export type SettlementType = 'unique' | 'partial' | 'final' | 'adjustment';

export type AdjustmentType = 
  | 'final_settlement'      // Devolución saldo pendiente
  | 'quality_bonus'         // Bonificación por calidad
  | 'quality_discount'      // Descuento por calidad
  | 'correction'            // Corrección de error
  | 'technical_adjustment'  // Ajuste técnico/administrativo
  | 'other';                // Otro tipo

export type QualityGrade = 'G1' | 'G2' | 'G3' | 'FG' | string;

// ============================================================================
// LIQUIDACIÓN COMPLETA
// ============================================================================

export interface Settlement {
  // Identificación
  id: string;
  coe: string;
  settlement_type: SettlementType;
  settlement_date: Date;
  
  // Partes
  buyer_cuit: string;
  buyer_name: string;
  seller_cuit: string;
  seller_name: string;
  broker_cuit?: string;
  broker_name?: string;
  
  // Producto
  product: string;
  contracted_grade: QualityGrade;
  delivered_grade: QualityGrade;
  quality_factor: number;
  protein_content: number;
  
  // Operación
  quantity_kg: number;
  price_per_kg: number;
  subtotal: number;
  
  // Montos
  iva_rate: number;
  iva_amount: number;
  total_operation: number;
  total_deductions: number;
  total_withholdings: number;
  net_amount: number;
  
  // Porcentajes (si es parcial)
  percentage_liquidated?: number;
  percentage_retained?: number;
  retained_amount?: number;
  
  // Vinculación (si es final/ajuste)
  original_coe?: string;
  adjustment_type?: AdjustmentType;
  
  // Desglose de precios
  price_breakdown?: PriceBreakdown;
  
  // CTGs
  ctgs: CTG[];
  total_ctgs: number;
  
  // Deducciones y retenciones
  deductions: Deduction[];
  withholdings: Withholding[];
  
  // Flags
  is_canje: boolean;
  is_out_of_grade: boolean;
  
  // Validación
  validation_status?: 'pending' | 'validated' | 'failed';
  validation_errors?: ValidationError[];
  amount_difference?: number;
  is_within_threshold?: boolean;
  
  // Metadata
  additional_data?: string;
  raw_data?: any;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  validated_at?: Date;
}

// ============================================================================
// DESGLOSE DE PRECIOS
// ============================================================================

export interface PriceBreakdown {
  contract_number?: string;
  
  // Precio base
  base_price_per_ton: number;
  
  // Paso 1: Descuento Comercial
  commercial_discount: CommercialDiscount;
  price_after_commercial: number;
  
  // Paso 2: Factor de Calidad
  quality_factor: number;
  factor_adjustment: number;
  factor_adjustment_document?: number;  // Del documento (puede variar por redondeos)
  price_after_factor: number;
  
  // Paso 3: Flete
  freight: number;
  
  // Resultado
  net_price_per_ton: number;
  net_price_per_ton_document?: number;  // Del documento (puede variar por redondeos)
  net_price_per_kg: number;
  
  // Validación
  calculation_matches?: boolean | null;
}

export interface CommercialDiscount {
  total: number;
  commission: number;
  paritarias: number | null;
}

// ============================================================================
// CTG (CARTA DE PORTE)
// ============================================================================

export interface CTG {
  ctg_number: string;
  quantity_kg: number;
  quantity_tons: number;
  grade: string;
  factor: number;
  protein_content: number;
  origin: string;
  
  // Validaciones
  is_within_range: boolean;  // 15-38 Tn
  
  // Vinculación con calidad (cuando esté disponible)
  quality_report_id?: string;
}

// ============================================================================
// DEDUCCIONES
// ============================================================================

export interface Deduction {
  concept: string;
  detail: string;
  percentage?: number;
  base_amount: number;
  iva_rate: number;
  iva_amount: number;
  amount: number;
}

// ============================================================================
// RETENCIONES
// ============================================================================

export interface Withholding {
  concept: string;
  detail: string;
  certificate?: string;
  certificate_amount?: number;
  certificate_date?: string;
  base_amount: number;
  rate: number;
  amount: number;
}

// ============================================================================
// VALIDACIÓN
// ============================================================================

export interface ValidationError {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  field?: string;
  expected?: any;
  actual?: any;
  difference?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// DOCUMENTO PARSEADO (INPUT DEL PARSER)
// ============================================================================

export interface ParsedDocument {
  // Identificación
  coe: string;
  tipo_operacion: string;
  actividad: string;
  fecha: string;
  
  // Partes
  comprador: {
    razon_social: string;
    cuit: string;
    domicilio: string;
    localidad: string;
    iva: string;
    ingresos_brutos: string;
  };
  
  vendedor: {
    razon_social: string;
    cuit: string;
    domicilio: string;
    localidad: string;
    iva: string;
    ingresos_brutos: string;
  };
  
  corredor?: {
    razon_social: string;
    cuit: string;
    actuo: boolean;
  };
  
  // Condiciones de la operación
  condiciones_operacion: {
    fecha: string;
    precio_tn: number;
    grado: string;
    grano: string;
    flete_tn: number;
    puerto: string;
  };
  
  // Mercadería entregada (CTGs)
  mercaderia_entregada: Array<{
    numero_comprobante: string;
    grado: string;
    factor: number;
    contenido_proteico: number;
    peso_kg: number;
    procedencia: string;
  }>;
  
  // Operación
  operacion: {
    cantidad_kg: number;
    precio_kg: number;
    subtotal: number;
    alicuota_iva: number;
    importe_iva: number;
    operacion_con_iva: number;
    grado: string;
    grano: string;
  };
  
  // Deducciones
  deducciones?: Array<{
    concepto: string;
    detalle: string;
    porcentaje?: number;
    base_calculo: number;
    alicuota: number;
    importe_iva: number;
    deducciones: number;
  }>;
  
  // Retenciones
  retenciones?: Array<{
    concepto: string;
    detalle: string;
    certificado_retencion?: string;
    importe_certificado?: number;
    fecha_certificado?: string;
    base_calculo: number;
    alicuota: number;
    retenciones: number;
  }>;
  
  // Importes totales
  importes_totales: {
    total_operacion: number;
    total_percepciones: number;
    total_retenciones_afip: number;
    total_otras_retenciones: number;
    total_deducciones: number;
    importe_neto_pagar: number;
    iva_diferido?: number;
    iva_diferido_resolucion?: string;
    pago_segun_condiciones: number;
  };
  
  // Datos adicionales
  datos_adicionales?: string;
}

// ============================================================================
// SERVICIOS OPCIONALES
// ============================================================================

export interface OptionalServices {
  paritarias?: {
    usd_per_ton: number;
    exchange_rate: number;
    amount_ars: number;
    applied: boolean;
  };
  
  drying?: {
    free_points: number;
    excess_points: number;
    rate_usd_per_point: number;
    exchange_rate: number;
    total_cost: number;
    applied: boolean;
  };
  
  storage?: {
    free_months: number;
    discharge_date: Date;
    settlement_date: Date;
    months_stored: number;
    rate_usd_per_month: number;
    exchange_rate: number;
    total_cost: number;
    applied: boolean;
  };
}

// ============================================================================
// CONDICIONES DE CONTRATO
// ============================================================================

export interface ContractConditions {
  contract_number: string;
  base_price: number;
  
  quality: {
    contracted_grade: string;
    humidity_free_points: number;
    bonuses: {
      G1: boolean;
    };
    discounts: {
      G3: boolean;
    };
  };
  
  services: {
    paritarias?: {
      rate_usd: number;
    };
    drying?: {
      free_points: number;
      rate_usd_per_point: number;
    };
    storage?: {
      free_months: number;
      rate_usd_per_month: number;
    };
  };
  
  logistics: {
    delivery_period: string;
    payment_days: number;
    condition: string;
  };
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface SettlementResponse {
  success: boolean;
  settlement?: Settlement;
  errors?: ValidationError[];
  message?: string;
}

export interface SettlementsListResponse {
  success: boolean;
  settlements: Settlement[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  settlement?: Settlement;
}
