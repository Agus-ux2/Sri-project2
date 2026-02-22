import React from 'react';
import { ContractStats, AuditUtils } from '@/lib/audit-utils';

interface ContractCardProps {
    id: string;
    product: string;
    buyer: string;
    stats: ContractStats;
    onClick: () => void;
}

export function ContractCard({ id, product, buyer, stats, onClick }: ContractCardProps) {
    const progress = AuditUtils.calculateProgress(stats.entregadas, stats.toneladas);

    return (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 cursor-pointer transition-transform hover:-translate-y-1 relative" onClick={onClick}>
            <div className="absolute top-5 right-5 text-[10px] font-bold bg-gray-50 px-2 py-1 rounded-full text-gray-400 uppercase tracking-wider">
                Completado
            </div>
            <div className="text-sm text-gray-400 mb-2">#{id}</div>
            <div className="flex items-center gap-2 text-2xl font-black text-gray-900 mb-4">
                <div className="w-8 h-8 bg-yellow-50 rounded-full flex items-center justify-center text-lg">🌾</div>
                {product}
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-6 font-bold">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span> {buyer}
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TONELADAS</div>
                    <div className="text-lg font-black text-gray-900">{stats.toneladas} tn</div>
                </div>
                <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PRECIO</div>
                    <div className="text-lg font-black text-gray-900">USD {stats.precio}</div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold">
                    <span>Avance Entrega</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className="text-xs text-gray-400 mb-4 font-bold">{stats.entregadas} tn entregadas</div>

            <div className="bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Cerrado al Peso de Destino
            </div>
        </div>
    );
}
