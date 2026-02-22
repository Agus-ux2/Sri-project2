'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GrainStock, GrainUtils } from '@/lib/grain-utils';
import API from '@/lib/api';
import { Wheat, ChevronRight, TrendingUp } from 'lucide-react';

// Color map for grain types
const GRAIN_CONFIG: Record<string, { color: string, bg: string, iconColor: string }> = {
    'Maíz': { color: 'text-yellow-600', bg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    'Soja': { color: 'text-green-600', bg: 'bg-green-50', iconColor: 'text-green-600' },
    'Trigo': { color: 'text-amber-600', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
    'Cebada': { color: 'text-orange-600', bg: 'bg-orange-50', iconColor: 'text-orange-600' },
    'Girasol': { color: 'text-yellow-500', bg: 'bg-yellow-50', iconColor: 'text-yellow-500' },
    'Sorgo': { color: 'text-red-600', bg: 'bg-red-50', iconColor: 'text-red-600' }
};

export default function GrainSelectorPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch user to get zones
                const user = await API.get('/auth/me');
                const userZones = user.zones || [];

                // Fetch real stocks
                const storedStocks = await GrainUtils.fetchStocks('');

                // Generate stocks based on real zones if available, merged with DB data
                let allStocks: GrainStock[] = [];

                if (userZones.length > 0) {
                    const rows = GrainUtils.generateStocksForZones(userZones);
                    allStocks = rows.map(row => {
                        const match = storedStocks.find((s: any) =>
                            s.establishment === row.establishment &&
                            s.grainType === row.grainType &&
                            s.campaign === row.campaign
                        );

                        if (match) {
                            return {
                                ...row,
                                initialStock: match.initialStock,
                                soldDelivered: match.soldDelivered,
                                livestockConsumption: match.livestockConsumption,
                                seeds: match.seeds,
                                extruderOwn: match.extruderOwn,
                                extruderExchange: match.extruderExchange,
                                exchanges: match.exchanges,
                                committedSales: match.committedSales
                            };
                        }
                        return row;
                    });
                } else {
                    allStocks = GrainUtils.getMockData();
                }

                const grainTypes = ['Maíz', 'Soja', 'Trigo', 'Cebada', 'Girasol', 'Sorgo'];

                const calculatedSummary = grainTypes.map(type => {
                    const grainStocks = allStocks.filter(s => s.grainType === type);
                    const totalReal = grainStocks.reduce((acc, curr) => acc + GrainUtils.calculateStocks(curr).realStock, 0);

                    return {
                        type,
                        count: grainStocks.length,
                        totalStock: totalReal
                    };
                });

                setSummary(calculatedSummary);
            } catch (error) {
                console.error('Failed to load grain data', error);

                // Fallback to static mock
                const allStocks = GrainUtils.getMockData();
                const grainTypes = ['Maíz', 'Soja', 'Trigo', 'Cebada', 'Girasol', 'Sorgo'];
                const calculatedSummary = grainTypes.map(type => {
                    const grainStocks = allStocks.filter(s => s.grainType === type);
                    const totalReal = grainStocks.reduce((acc, curr) => acc + GrainUtils.calculateStocks(curr).realStock, 0);
                    return {
                        type,
                        count: grainStocks.length,
                        totalStock: totalReal
                    };
                });
                setSummary(calculatedSummary);
            }
        };

        loadData();
    }, []);

    const handleSelect = (type: string) => {
        // Normalize for URL (Lowercase, remove accents)
        const slug = type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        router.push(`/dashboard/grains/${slug}`);
    };

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            <div>
                <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Gestión de Stock</span>
                <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">Mis Granos</h2>
                <p className="text-gray-400 font-medium mt-2">Selecciona un cultivo para ver el detalle de stock por establecimiento.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {summary.map((item) => {
                    const config = GRAIN_CONFIG[item.type] || GRAIN_CONFIG['Maíz'];

                    return (
                        <div
                            key={item.type}
                            onClick={() => handleSelect(item.type)}
                            className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 cursor-pointer group hover:border-green-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${config.bg} ${config.iconColor} group-hover:scale-110 transition-transform`}>
                                    <Wheat size={32} />
                                </div>
                                <div className="p-2 text-gray-300 group-hover:text-green-600 transition-colors">
                                    <ChevronRight size={24} />
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 mb-1">{item.type}</h3>
                            <p className="text-gray-400 font-medium text-sm mb-6">{item.count} Establecimientos</p>

                            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Stock Disponible</p>
                                    <p className={`text-xl font-black ${config.color}`}>
                                        {GrainUtils.formatNumber(item.totalStock)} <span className="text-xs text-gray-400">tn</span>
                                    </p>
                                </div>
                                <div className="text-gray-300">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
