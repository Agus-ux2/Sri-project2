'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrainStock, GrainUtils } from '@/lib/grain-utils';
import API from '@/lib/api';
import { Edit2, Save, Download, Wheat, AlertCircle, ArrowLeft } from 'lucide-react';

interface GrainDetailClientProps {
    grainSlug: string;
}

export default function GrainDetailClient({ grainSlug }: GrainDetailClientProps) {
    const router = useRouter();
    const [stocks, setStocks] = useState<GrainStock[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<GrainStock>>({});
    const [grainType, setGrainType] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            const typeMap: Record<string, string> = {
                'maiz': 'Maíz',
                'soja': 'Soja',
                'trigo': 'Trigo',
                'cebada': 'Cebada',
                'girasol': 'Girasol',
                'sorgo': 'Sorgo'
            };

            const typeName = typeMap[grainSlug];
            if (typeName) {
                setGrainType(typeName);

                try {
                    // 1. Fetch Zones & User Info
                    const user = await API.get('/auth/me');
                    const userZones = user.zones || [];

                    // 2. Fetch Stored Stocks from DB
                    const storedStocks = await GrainUtils.fetchStocks(''); // Token handled by API interceptor via session

                    // 3. Merge: Generate rows for ALL zones, filling with stored data if exists
                    const rows = GrainUtils.generateStocksForZones(userZones);

                    // Overwrite generated rows with real stored data if it matches (Zone + GrainType)
                    const mergedStocks = rows.map(row => {
                        if (row.grainType !== typeName) return row; // Should be filtered later anyway

                        // Find matching stored record
                        // Note: We match by zone location. 
                        // Ideally we should use IDs, but generateStocksForZones creates mocks with IDs.
                        // Real implementation: generateStocksForZones should probably return empty structure with correct Zone IDs.
                        // For now, we match by Establishment Name to link mock-generated row with DB data.
                        const match = storedStocks.find((s: any) =>
                            s.establishment === row.establishment &&
                            s.grain_type === row.grainType &&
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

                    setStocks(mergedStocks.filter(s => s.grainType === typeName));
                } catch (e) {
                    console.error("Error loading stocks:", e);
                    // Fallback
                    const allStocks = GrainUtils.getMockData();
                    setStocks(allStocks.filter(s => s.grainType === typeName));
                }
            } else {
                router.push('/dashboard/grains');
            }
        };
        init();
    }, [grainSlug, router]);

    const handleEdit = (stock: GrainStock) => {
        setEditingId(stock.id);
        setEditForm(stock);
    };

    const handleSave = async () => {
        if (!editingId) return;

        // Optimistic Update
        const updatedStocks = stocks.map(s => s.id === editingId ? { ...s, ...editForm } : s);
        setStocks(updatedStocks);

        // Find the full updated stock object
        const stockToSave = updatedStocks.find(s => s.id === editingId);
        if (stockToSave) {
            try {
                // We need to resolve the Production Zone ID.
                // Since our rows are currently generated from zones (mock-style), 
                // we assume we can look up the zone again or pass it if we stored it.
                // For this MVP, we will fetch user zones again or refactor generateStocksForZones to include ID.
                // Quick fix: Fetch user zones to map Name -> ID.
                const user = await API.get('/auth/me');
                const zone = user.zones?.find((z: any) => z.location.toUpperCase() === stockToSave.establishment);

                if (zone) {
                    await GrainUtils.saveStock(stockToSave as GrainStock, {
                        productionZoneId: zone.id,
                        grainType: stockToSave.grainType,
                        campaign: stockToSave.campaign
                    });
                    console.log("Stock saved successfully");
                } else {
                    console.error("Could not find zone ID for establishment:", stockToSave.establishment);
                }

            } catch (err) {
                console.error("Failed to persist stock:", err);
                // Ideally revert optimistic update here
            }
        }

        setEditingId(null);
        setEditForm({});
    };

    const handleChange = (field: keyof GrainStock, value: string) => {
        const numValue = parseFloat(value) || 0;
        setEditForm(prev => ({ ...prev, [field]: numValue }));
    };

    const totals = stocks.reduce((acc, curr) => {
        const computed = GrainUtils.calculateStocks(curr);
        return {
            initial: acc.initial + computed.initialStock,
            sold: acc.sold + computed.soldDelivered,
            physical: acc.physical + computed.physicalStock,
            real: acc.real + computed.realStock
        };
    }, { initial: 0, sold: 0, physical: 0, real: 0 });

    const handleExport = () => {
        // Calculate all stocks before exporting to ensure computed values are included
        const computedStocks = stocks.map(stock => GrainUtils.calculateStocks(stock));
        GrainUtils.exportToExcel(computedStocks, grainType);
    };

    if (!grainType) return <div className="p-10 font-bold text-gray-400">Cargando...</div>;

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <button
                        onClick={() => router.push('/dashboard/grains')}
                        className="flex items-center gap-2 text-gray-400 hover:text-green-600 font-bold mb-4 transition-colors text-sm"
                    >
                        <ArrowLeft size={16} /> Volver a Granos
                    </button>
                    <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Detalle de Stock</span>
                    <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter flex items-center gap-3">
                        {grainType}
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest hidden md:inline-block">Campaña 2025/26</span>
                    </h2>
                </div>
                <button
                    onClick={handleExport}
                    className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                >
                    <Download size={18} />
                    Exportar Excel
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Stock Inicial Total</p>
                    <h3 className="text-2xl font-black text-gray-900">{GrainUtils.formatNumber(totals.initial)} <span className="text-sm text-gray-400 font-medium">tn</span></h3>
                </div>
                <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Entregado</p>
                    <h3 className="text-2xl font-black text-gray-900">{GrainUtils.formatNumber(totals.sold)} <span className="text-sm text-gray-400 font-medium">tn</span></h3>
                </div>
                <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                    <p className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-2">Stock Físico</p>
                    <h3 className="text-2xl font-black text-gray-900">{GrainUtils.formatNumber(totals.physical)} <span className="text-sm text-gray-400 font-medium">tn</span></h3>
                </div>
                <div className={`bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 border-l-4 ${totals.real < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                    <p className={`${totals.real < 0 ? 'text-red-500' : 'text-green-500'} font-bold text-xs uppercase tracking-wider mb-2`}>Stock Real (Venta)</p>
                    <h3 className="text-2xl font-black text-gray-900">{GrainUtils.formatNumber(totals.real)} <span className="text-sm text-gray-400 font-medium">tn</span></h3>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-5 sticky left-0 bg-gray-50/80 z-10 border-b border-gray-100">Establecimiento</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right">Stock Inicio</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right">Venta (Entregado)</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right text-orange-600">Ganadería</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right text-yellow-600">Semillas</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right text-purple-600">Extrusora</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right text-gray-400">Canjes</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-center bg-blue-50/50 text-blue-700">Stock Físico</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-right text-red-500">Comprometido</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-center bg-green-50/50 text-green-700">Stock Real</th>
                                <th className="px-4 py-5 border-b border-gray-100 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
                            {stocks.map((stock) => {
                                const isEditing = editingId === stock.id;
                                const computed = GrainUtils.calculateStocks(isEditing ? { ...stock, ...editForm } as GrainStock : stock);

                                return (
                                    <tr key={stock.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 sticky left-0 bg-white z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                                    <Wheat size={16} />
                                                </div>
                                                {stock.establishment}
                                            </div>
                                        </td>

                                        {/* Editable Cells */}
                                        <td className="px-4 py-4 text-right">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-gray-50" value={editForm.initialStock} onChange={(e) => handleChange('initialStock', e.target.value)} /> : GrainUtils.formatNumber(stock.initialStock)}</td>
                                        <td className="px-4 py-4 text-right">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-gray-50" value={editForm.soldDelivered} onChange={(e) => handleChange('soldDelivered', e.target.value)} /> : GrainUtils.formatNumber(stock.soldDelivered)}</td>
                                        <td className="px-4 py-4 text-right text-orange-600">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-orange-50 text-orange-700" value={editForm.livestockConsumption} onChange={(e) => handleChange('livestockConsumption', e.target.value)} /> : GrainUtils.formatNumber(stock.livestockConsumption)}</td>
                                        <td className="px-4 py-4 text-right text-yellow-600">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-yellow-50 text-yellow-700" value={editForm.seeds} onChange={(e) => handleChange('seeds', e.target.value)} /> : GrainUtils.formatNumber(stock.seeds)}</td>
                                        <td className="px-4 py-4 text-right text-purple-600">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-purple-50 text-purple-700" value={editForm.extruderOwn} onChange={(e) => handleChange('extruderOwn', e.target.value)} /> : GrainUtils.formatNumber(stock.extruderOwn + stock.extruderExchange)}</td>
                                        <td className="px-4 py-4 text-right text-gray-400">{isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-gray-50" value={editForm.exchanges} onChange={(e) => handleChange('exchanges', e.target.value)} /> : GrainUtils.formatNumber(stock.exchanges)}</td>

                                        {/* Computed Cells */}
                                        <td className="px-4 py-4 text-center bg-blue-50/30 font-black text-blue-700">
                                            {GrainUtils.formatNumber(computed.physicalStock)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-red-500 font-black">
                                            {isEditing ? <input type="number" className="w-24 p-1 border rounded text-right bg-red-50 text-red-700" value={editForm.committedSales} onChange={(e) => handleChange('committedSales', e.target.value)} /> : GrainUtils.formatNumber(stock.committedSales)}
                                        </td>
                                        <td className={`px-4 py-4 text-center bg-green-50/30 font-black ${computed.realStock < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                            {GrainUtils.formatNumber(computed.realStock)}
                                            {computed.realStock < 0 && <AlertCircle size={14} className="inline ml-1 text-red-500" />}
                                        </td>

                                        <td className="px-4 py-4 text-center">
                                            {isEditing ? (
                                                <button onClick={handleSave} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-600/20">
                                                    <Save size={16} />
                                                </button>
                                            ) : (
                                                <button onClick={() => handleEdit(stock)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-100 font-black text-gray-900">
                            <tr>
                                <td className="px-6 py-5">TOTAL</td>
                                <td className="px-4 py-5 text-right">{GrainUtils.formatNumber(totals.initial)}</td>
                                <td className="px-4 py-5 text-right">{GrainUtils.formatNumber(totals.sold)}</td>
                                <td className="px-4 py-5 text-right text-orange-600">-</td>
                                <td className="px-4 py-5 text-right text-yellow-600">-</td>
                                <td className="px-4 py-5 text-right text-purple-600">-</td>
                                <td className="px-4 py-5 text-right text-gray-400">-</td>
                                <td className="px-4 py-5 text-center text-blue-700">{GrainUtils.formatNumber(totals.physical)}</td>
                                <td className="px-4 py-5 text-right text-red-500">-</td>
                                <td className={`px-4 py-5 text-center ${totals.real < 0 ? 'text-red-600' : 'text-green-700'}`}>{GrainUtils.formatNumber(totals.real)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </section>
    );
}
