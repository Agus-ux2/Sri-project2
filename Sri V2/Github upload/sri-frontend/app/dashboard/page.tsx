'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Upload,
    Search,
    Bell,
    ChevronRight,
    Filter,
    MoreVertical,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import API from '@/lib/api';
import Session from '@/lib/session';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        completed: 0
    });

    useEffect(() => {
        if (!Session.isAuthenticated()) {
            router.push('/login');
            return;
        }

        const userData = Session.getUser();
        setUser(userData);
        fetchDocuments();
    }, [router]);

    const fetchDocuments = async () => {
        try {
            const data = await API.get('/documents');
            const docs = data.documents || [];
            setDocuments(docs);

            // Calculate stats
            setStats({
                total: docs.length,
                pending: docs.filter((d: any) => d.ocr_status === 'pending' || d.ocr_status === 'processing').length,
                completed: docs.filter((d: any) => d.ocr_status === 'completed').length
            });
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = Session.getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api'}/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al subir archivo');
            }

            // Refresh list
            await fetchDocuments();
            alert('Archivo subido con éxito');
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.message || 'Error al subir el archivo');
        } finally {
            setLoading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const triggerUpload = () => {
        document.getElementById('file-upload')?.click();
    };

    if (loading && !user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-green-700 font-bold">Cargando SRI...</div>;

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Dashboard Forense</span>
                    <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">Bienvenido, {user?.name?.split(' ')[0]}</h2>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                    />
                    <button className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">Descargar Reporte</button>
                    <button
                        onClick={triggerUpload}
                        className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
                    >
                        <Upload size={18} />
                        Nueva Carga
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 group hover:border-green-500/30 transition-all hover:shadow-xl hover:shadow-gray-200/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <FileText size={28} />
                        </div>
                        <div className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-full">+12%</div>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.total}</h3>
                    <p className="text-gray-500 font-bold text-sm mt-2 uppercase tracking-wide">Documentos Totales</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 group hover:border-yellow-500/30 transition-all hover:shadow-xl hover:shadow-gray-200/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <Clock size={28} />
                        </div>
                        <div className="text-xs font-black text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">EN COLA</div>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.pending}</h3>
                    <p className="text-gray-500 font-bold text-sm mt-2 uppercase tracking-wide">Procesando OCR</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 group hover:border-green-600/30 transition-all hover:shadow-xl hover:shadow-gray-200/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={28} />
                        </div>
                        <div className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-full">LISTO</div>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.completed}</h3>
                    <p className="text-gray-500 font-bold text-sm mt-2 uppercase tracking-wide">Auditados</p>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Actividad Reciente</h3>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                            <Filter size={18} />
                            Filtros
                        </button>
                        <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><MoreVertical size={20} /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-10 py-5">Nombre del Archivo</th>
                                <th className="px-10 py-5">Fecha Carga</th>
                                <th className="px-10 py-5">Estado Auditoría</th>
                                <th className="px-10 py-5 text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {documents.length > 0 ? documents.map((doc: any) => (
                                <tr key={doc.id} className="hover:bg-green-50/30 transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-green-600 shadow-sm transition-all font-bold text-xs uppercase">
                                                PDF
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 leading-tight">{doc.original_name}</p>
                                                <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest">Remito de Granos</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-sm font-bold text-gray-500">
                                        {new Date(doc.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2">
                                            {doc.ocr_status === 'completed' ? (
                                                <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">Completado</span>
                                            ) : doc.ocr_status === 'failed' ? (
                                                <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">Error</span>
                                            ) : (
                                                <span className="px-4 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Procesando</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <button className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm hover:shadow-lg hover:shadow-green-600/20">
                                            <ChevronRight size={20} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center max-w-xs mx-auto">
                                            <div className="w-20 h-20 bg-gray-100 text-gray-200 rounded-[30px] flex items-center justify-center mb-6">
                                                <Upload size={40} />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 mb-2">Comienza la auditoría</h4>
                                            <p className="text-gray-400 text-sm font-medium mb-8">Sube tus remitos o contratos en PDF para que SRI los procese automáticamente.</p>
                                            <button
                                                onClick={triggerUpload}
                                                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-600/20"
                                            >
                                                SUBIR DOCUMENTO
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
