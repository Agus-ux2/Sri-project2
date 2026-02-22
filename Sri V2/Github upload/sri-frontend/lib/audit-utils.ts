export interface ContractStats {
    toneladas: number;
    precio: number;
    entregadas: number;
    baseHumedad: number;
    comisionPactada: number;
    comisionCobrada: number;
    factorPactado: number;
    factorAuditado: number;
}

export interface AuditResult {
    hasDeviation: boolean;
    message: string;
    value: number;
    diff: number;
}

export const AuditUtils = {
    calculateMerma: (pesoNeto: number, humedad: number, base: number = 13.5) => {
        if (humedad <= base) return 0;
        // Simple linear merma calculation for demo purposes (usually tables are used)
        const excess = humedad - base;
        const penalty = excess * 1.5; // 1.5% deduction per point of excess
        return (pesoNeto * penalty) / 100;
    },

    auditCommission: (stats: ContractStats): AuditResult => {
        const pactadaPct = 1; // 1%
        const cobradaPct = (stats.comisionCobrada / stats.precio) * 100;

        if (cobradaPct > pactadaPct + 0.1) {
            return {
                hasDeviation: true,
                message: 'Exceso cobrado',
                value: stats.comisionCobrada,
                diff: stats.comisionCobrada - (stats.precio * (pactadaPct / 100))
            };
        }
        return { hasDeviation: false, message: 'OK', value: stats.comisionCobrada, diff: 0 };
    },

    calculateProgress: (entregadas: number, total: number) => {
        return Math.min(Math.round((entregadas / total) * 100), 100);
    }
};
