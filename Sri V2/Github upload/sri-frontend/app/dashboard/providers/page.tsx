'use client';

import React, { useEffect, useState } from 'react';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderUtils, PROVIDERS } from '@/lib/provider-utils';
import { HelpCircle } from 'lucide-react';

export default function ProvidersPage() {
    const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProviders = async () => {
        try {
            const data = await ProviderUtils.listProviders();
            const connected = (data.providers || []).map((p: any) => p.provider);
            setConnectedProviders(connected);
        } catch (error) {
            console.error('Error loading providers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Cargando proveedores...</div>;

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Configuración</span>
                    <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter flex items-center gap-3">
                        Conexión con Proveedores
                        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest hidden md:inline-block">Beta</span>
                    </h2>
                    <p className="text-gray-400 font-medium mt-2 max-w-2xl">
                        Conectá tus cuentas para descargar análisis, comprobantes y contratos automáticamente. SRI sincronizará la información cada 24 horas.
                    </p>
                </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Object.values(PROVIDERS).map((provider) => (
                    <ProviderCard
                        key={provider.id}
                        provider={provider}
                        isConnected={connectedProviders.includes(provider.id)}
                        onStatusChange={fetchProviders}
                    />
                ))}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-[32px] p-8 mt-12 flex items-start gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl">
                    <HelpCircle size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-black text-blue-900 mb-1">¿No encontrás tu acopio?</h4>
                    <p className="text-blue-700/80 text-sm font-medium leading-relaxed max-w-2xl">
                        Estamos agregando nuevos proveedores constantemente. Si tu acopio o cooperativa no figura en la lista,
                        por favor contactanos para priorizar su integración en la próxima actualización.
                    </p>
                    <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                        Solicitar Integración
                    </button>
                </div>
            </div>
        </section>
    );
}
