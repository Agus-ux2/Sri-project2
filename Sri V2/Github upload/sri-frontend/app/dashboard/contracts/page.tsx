'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ContractDrawer } from '@/components/contracts/ContractDrawer';
import { ContractStats } from '@/lib/audit-utils';

// Mock Data
const MOCK_CONTRACTS = [
    {
        id: '459392',
        product: 'Soja',
        buyer: 'Cargill',
        stats: {
            toneladas: 4500,
            precio: 345,
            entregadas: 3200,
            baseHumedad: 13.5,
            comisionPactada: 34.5,
            comisionCobrada: 38.2, // Intentional deviation for demo
            factorPactado: 100,
            factorAuditado: 98
        } as ContractStats
    },
    {
        id: '459393',
        product: 'Maíz',
        buyer: 'Gaw',
        stats: {
            toneladas: 2000,
            precio: 190,
            entregadas: 200,
            baseHumedad: 14.0,
            comisionPactada: 19.0,
            comisionCobrada: 19.0,
            factorPactado: 100,
            factorAuditado: 100
        } as ContractStats
    }
];

export default function ContractsPage() {
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleContractClick = (contract: any) => {
        setSelectedContract(contract);
        setIsDrawerOpen(true);
    };

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Gestión Comercial</span>
                    <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">Contratos Activos</h2>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                        <Filter size={18} />
                        Filtros
                    </button>
                    <button className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2">
                        <Plus size={18} />
                        Nuevo Contrato
                    </button>
                </div>
            </div>

            {/* Contract List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {MOCK_CONTRACTS.map((contract) => (
                    <ContractCard
                        key={contract.id}
                        {...contract}
                        onClick={() => handleContractClick(contract)}
                    />
                ))}
            </div>

            <ContractDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                contract={selectedContract}
            />
        </section>
    );
}
