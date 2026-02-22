import React from 'react';
import { X } from 'lucide-react';
import { ContractStats, AuditUtils } from '@/lib/audit-utils';
import { AuditSection } from './AuditSection';

interface ContractDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    contract: { id: string, product: string, buyer: string, stats: ContractStats } | null;
}

export function ContractDrawer({ isOpen, onClose, contract }: ContractDrawerProps) {
    if (!contract) return null;

    const commissionAudit = AuditUtils.auditCommission(contract.stats);

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 right-0 w-[600px] h-full bg-white z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transition-transform duration-300 p-10 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">Contrato {contract.id}</h2>
                        <div className="text-gray-400 font-medium">{contract.product} - {contract.buyer}</div>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                    <span className="text-gray-400 font-medium">Base Humedad Contrato</span>
                    <span className="font-bold text-gray-900">{contract.stats.baseHumedad}%</span>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8">
                    <div className="text-red-500 font-black text-sm mb-3">Excesos de Humedad Detectados:</div>
                    <div className="flex justify-between text-sm text-red-500 mb-2 font-medium">
                        <span>CP 3459: 14.5% (+1.0 pts)</span>
                        <span>-446 kg</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500 font-black pt-2 border-t border-red-100 mt-2">
                        <span>Total Merma Kilos</span>
                        <span>-446 kg</span>
                    </div>
                </div>

                <AuditSection
                    title="💰 AUDITORÍA DE LIQUIDACIÓN"
                    audits={[
                        {
                            label: '📋 Control de Comisiones',
                            result: commissionAudit,
                            expectedLabel: 'Comisión Pactada (1%)',
                            expectedValue: `$${(contract.stats.precio * 0.01 * 10).toLocaleString('es-AR')}/TN`, // Demo math
                            actualLabel: 'Comisión Cobrada',
                            actualValue: `$${(contract.stats.comisionCobrada).toLocaleString('es-AR')}/TN (${((contract.stats.comisionCobrada / contract.stats.precio) * 100).toFixed(2)}%)`
                        },
                        {
                            label: '⚖️ Control de Factor (Ponderado)',
                            result: { hasDeviation: true, message: 'Desvío', value: 0, diff: 707549.7 },
                            expectedLabel: 'Total Descuento Esperado',
                            expectedValue: '-',
                            actualLabel: 'Total Descuento Auditado',
                            actualValue: '$707.549,70'
                        }
                    ]}
                />
            </div>
        </>
    );
}
