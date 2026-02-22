'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import API from '@/lib/api';
import Session from '@/lib/session';

export default function UploadPage() {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [recentUploads, setRecentUploads] = useState<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchRecentUploads();
    }, []);

    const fetchRecentUploads = async () => {
        try {
            const data = await API.get('/documents');
            const docs = data.documents || [];
            setRecentUploads(docs.slice(0, 5)); // Show only last 5
        } catch (error) {
            console.error('Error fetching uploads:', error);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList: FileList) => {
        const validFiles = Array.from(fileList).filter(file => file.type === 'application/pdf');

        if (validFiles.length !== fileList.length) {
            alert('Solo se permiten archivos PDF');
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const token = Session.getToken();
        let successCount = 0;

        for (const file of files) {
            try {
                // Convert to Base64
                const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });

                const base64File = await toBase64(file);

                // Send JSON payload
                const payload = {
                    file: base64File,
                    fileName: file.name,
                    mimeType: file.type
                };

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api'}/documents/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successCount++;
                }
            } catch (error) {
                console.error('Upload failed for', file.name, error);
            }
        }

        setUploading(false);
        if (successCount === files.length) {
            alert('Todos los archivos se subieron correctamente');
            setFiles([]);
            fetchRecentUploads();
        } else {
            alert(`Se subieron ${successCount} de ${files.length} archivos.`);
            fetchRecentUploads();
        }
    };

    return (
        <section className="flex-1 overflow-y-auto p-10 space-y-10">
            <div>
                <span className="text-green-600 font-black text-sm uppercase tracking-[0.2em]">Gestión Documental</span>
                <h2 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">Carga OCR</h2>
                <p className="text-gray-400 font-medium mt-2">Sube tus remitos y contratos (PDF) para procesamiento automático.</p>
            </div>

            {/* Upload Zone */}
            <div
                className={`
                    relative border-4 border-dashed rounded-[40px] p-12 text-center transition-all duration-300
                    ${dragActive ? 'border-green-500 bg-green-50 scale-[1.02]' : 'border-gray-200 bg-white'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf"
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors ${dragActive ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-300'}`}>
                        <Upload size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Arrastra tus archivos aquí</h3>
                    <p className="text-gray-400 font-medium mb-8">o haz clic para seleccionar desde tu equipo</p>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="pointer-events-auto px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                        Seleccionar Archivos
                    </button>
                    <p className="mt-6 text-sm text-gray-300 font-bold uppercase tracking-wider">Solo archivos PDF (Máx 10MB)</p>
                </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">{files.length}</div>
                        Archivos listos para subir
                    </h3>
                    <div className="space-y-3">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-700">{file.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button onClick={() => removeFile(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={uploadFiles}
                            disabled={uploading}
                            className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                        >
                            {uploading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Upload size={20} />
                                    SUBIR {files.length} ARCHIVOS
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Recent Uploads */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-black text-gray-900 mb-6">Últimas Cargas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-4 rounded-l-xl">Archivo</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 rounded-r-xl text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentUploads.map((doc: any) => (
                                <tr key={doc.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center">
                                                <FileText size={16} />
                                            </div>
                                            <span className="font-bold text-gray-700 text-sm">{doc.original_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {doc.ocr_status === 'completed' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                <CheckCircle2 size={12} /> Completado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                <Clock size={12} /> Procesando
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-bold text-green-600 hover:text-green-700 uppercase tracking-wider">Ver</button>
                                    </td>
                                </tr>
                            ))}
                            {recentUploads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                                        No hay cargas recientes
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
