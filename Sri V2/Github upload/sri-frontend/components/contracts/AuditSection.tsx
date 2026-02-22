import React from 'react';
import { AuditResult } from '@/lib/audit-utils';

interface AuditSectionProps {
    title: string;
    audits: {
        label: string;
        result: AuditResult;
        expectedLabel: string;
        expectedValue: string;
        actualLabel: string;
        actualValue: string;
    }[];
}

export function AuditSection({ title, audits }: AuditSectionProps) {
    return (
        <div className="mt-10">
            <div className="flex items-center gap-2 font-black text-gray-400 text-xs uppercase tracking-widest mb-5 border-b border-gray-100 pb-2">
                {title}
            </div>

            {audits.map((audit, idx) => (
                <div key={idx} className={`border border-gray-100 rounded-2xl p-5 mb-4 relative overflow-hidden ${audit.result.hasDeviation ? 'border-l-4 border-l-red-500' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                            {audit.label}
                        </span>
                        {audit.result.hasDeviation && (
                            <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                                ⚠️ Desvío Detectado
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-gray-900">{audit.expectedLabel}</span>
                        <span className="font-bold text-gray-900">{audit.expectedValue}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-gray-900">{audit.actualLabel}</span>
                        <span className={`font-bold ${audit.result.hasDeviation ? 'text-red-500' : 'text-gray-900'}`}>{audit.actualValue}</span>
                    </div>
                    {audit.result.hasDeviation && (
                        <div className="flex justify-between text-sm pt-2 border-t border-red-50 font-bold text-red-600 mt-2">
                            <span>Exceso cobrado</span>
                            <span>${audit.result.diff.toLocaleString('es-AR')}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
