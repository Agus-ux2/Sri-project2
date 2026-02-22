export type GrainType = 'trigo' | 'maiz' | 'soja' | 'sorgo' | 'girasol';

export type Grade = 'G1' | 'G2' | 'G3' | null;

export interface QualityAnalysis {
    // Identificación
    id: string;
    ctg_number: string;
    grain_type: GrainType;
    analysis_date: Date;

    // Parámetros medidos
    humidity: number;                    // Humedad (%)
    hectoliter_weight?: number;          // Peso hectolítrico (kg/hl)
    protein?: number;                    // Proteína (%) - Trigo
    fat_content?: number;                // Materia grasa (%) - Girasol
    foreign_matter: number;              // Materias extrañas (%)
    damaged_grains: number;              // Granos dañados (%)
    broken_grains?: number;              // Granos quebrados (%)
    green_grains?: number;               // Granos verdes (%) - Soja
    black_grains?: number;               // Granos negros (%) - Soja
    panza_blanca?: number;               // Granos panza blanca (%) - Trigo
    acidity?: number;                    // Acidez (%) - Girasol
    burned_grains?: number;              // Granos quemados (%)
    sprouted_grains?: number;            // Granos brotados (%)
    pest_damaged?: number;               // Granos picados (%)

    // Laboratorio
    laboratory: string;
    analyst: string;
    observations?: string;

    // Campos adicionales requeridos por el motor de cálculo
    product?: string;
    quantity_kg?: number;
    protein_pct?: number;
}

export interface QualityResult {
    // Factor calculado
    final_factor: number;
    base_factor: number;

    // Grado determinado
    grade: Grade;
    grade_by_parameter: Map<string, Grade>;
    worst_parameter: string | null;

    // Bonificaciones
    bonuses: BonusDetail[];
    total_bonus: number;

    // Descuentos
    discounts: DiscountDetail[];
    total_discount: number;

    // Merma por humedad
    humidity_waste: HumidityWaste;

    // Precio ajustado
    price_adjustment: PriceAdjustment;

    // Alertas y validaciones
    out_of_standard: boolean;
    out_of_tolerance: boolean;
    warnings: QualityWarning[];

    // Cálculo detallado
    calculation_steps: CalculationStep[];
}

export interface BonusDetail {
    concept: string;
    parameter: string;
    value: number;
    base: number;
    factor: number;
    bonus_percent: number;
    calculation: string;
}

export interface DiscountDetail {
    concept: string;
    parameter: string;
    value: number;
    base: number;
    tolerance?: number;
    factor: number;
    discount_percent: number;
    calculation: string;
    progressive?: boolean;
    tiers?: TierDetail[];
}

export interface TierDetail {
    from: number;
    to: number;
    factor: number;
    amount: number;
}

export interface HumidityWaste {
    base_humidity: number;
    actual_humidity: number;
    waste_percent: number;
    waste_kg: number;
    net_quantity_kg: number;
    requires_drying: boolean;
    drying_cost?: number;
}

export interface PriceAdjustment {
    base_price_per_ton: number;
    adjusted_price_per_ton: number;
    adjustment_percent: number;
    gross_quantity_kg: number;
    net_quantity_kg: number;
    gross_amount: number;
    net_amount: number;
}

export interface QualityWarning {
    type: 'out_of_tolerance' | 'out_of_standard' | 'special_condition' | 'info';
    severity: 'critical' | 'warning' | 'info';
    parameter: string;
    message: string;
    value: number;
    threshold: number;
}

export interface CalculationStep {
    step: number;
    description: string;
    formula?: string;
    input: any;
    output: any;
}

export type GrainRules = any;
