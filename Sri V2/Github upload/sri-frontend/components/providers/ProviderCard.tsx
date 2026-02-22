import React, { useState } from 'react';
import { ProviderConfig, ProviderUtils } from '@/lib/provider-utils';
import { ExternalLink, Check, X, Loader2 } from 'lucide-react';

interface ProviderCardProps {
    provider: ProviderConfig;
    isConnected: boolean;
    onStatusChange: () => void;
}

export function ProviderCard({ provider, isConnected, onStatusChange }: ProviderCardProps) {
    const [loading, setLoading] = useState(false);
    const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            // 1. Notify Backend (optional per legacy code, but good practice)
            await ProviderUtils.connectProvider(provider.id).catch(console.warn);

            // 2. Open Popup
            const win = ProviderUtils.openProviderWindow(provider.id);

            if (!win) {
                alert('⚠️ Permite ventanas emergentes (pop-ups) para conectar este proveedor.');
                setLoading(false);
                return;
            }

            alert(`🚀 VENTANA DE PROVEEDOR ABIERTA\n\nPor favor, ingresá tus credenciales en la ventana de ${provider.name}.`);
            setWaitingForConfirmation(true);
            setLoading(false);

        } catch (error) {
            console.error(error);
            setLoading(false);
            alert('Error al iniciar conexión');
        }
    };

    const handleConfirm = async () => {
        if (!confirm(`¿Ya iniciaste sesión exitosamente en ${provider.name}?`)) return;

        setLoading(true);
        try {
            await ProviderUtils.forceConnect(provider.id);
            alert(`✅ Conexión confirmada con ${provider.name}`);
            onStatusChange(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Error al confirmar conexión en el servidor.');
        } finally {
            setLoading(false);
            setWaitingForConfirmation(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(`¿Desconectar cuenta de ${provider.name}?`)) return;

        setLoading(true);
        try {
            await ProviderUtils.disconnect(provider.id);
            onStatusChange();
        } catch (error) {
            console.error(error);
            alert('Error al desconectar');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPortal = () => {
        ProviderUtils.openProviderWindow(provider.id);
    };

    return (
        <div
            className={`bg-white rounded-[32px] p-8 shadow-sm border transition-all hover:-translate-y-1 hover:shadow-xl ${isConnected ? 'border-green-200 shadow-green-100' : 'border-gray-100'}`}
        >
            <div className="flex flex-col items-center text-center h-full">
                {/* Logo Area */}
                <div className="h-24 w-full flex items-center justify-center mb-6">
                    {imgError ? (
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-md"
                            style={{ backgroundColor: provider.color }}
                        >
                            {provider.initials}
                        </div>
                    ) : (
                        <img
                            src={provider.logo}
                            alt={provider.name}
                            className={`max-h-20 max-w-[140px] object-contain transition-all duration-300 ${isConnected ? 'grayscale-0 opacity-100' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
                            style={provider.filter ? { filter: isConnected ? 'none' : provider.filter } : {}}
                            onError={() => setImgError(true)}
                        />
                    )}
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-2">{provider.name}</h3>

                {/* Status Badge */}
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                    {isConnected ? (
                        <><Check size={12} strokeWidth={4} /> Conectado</>
                    ) : (
                        <><X size={12} strokeWidth={4} /> Desconectado</>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-auto w-full space-y-3">
                    {isConnected ? (
                        <>
                            <button
                                onClick={handleOpenPortal}
                                className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-colors"
                            >
                                <ExternalLink size={18} />
                                Abrir Portal
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 transition-colors text-sm"
                                disabled={loading}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Desconectar'}
                            </button>
                        </>
                    ) : (
                        waitingForConfirmation ? (
                            <button
                                onClick={handleConfirm}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                disabled={loading}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar Conexión'}
                            </button>
                        ) : (
                            <button
                                onClick={handleConnect}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                disabled={loading}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Conectar'}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
