'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, ArrowLeft, Download } from 'lucide-react';

export default function AppPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center p-6">
            <div className="card max-w-lg w-full p-10 text-center">
                <div className="flex justify-center mb-6">
                    <img src="/sri_logo_v2.png" alt="SRI Logo" className="h-16 w-auto" />
                </div>
                <div className="bg-green-50 text-green-600 p-4 rounded-2xl inline-block mb-6">
                    <Smartphone size={48} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">App Móvil</h1>
                <p className="text-gray-500 mb-8">
                    La app móvil de SRI estará disponible próximamente.
                    Registrate para ser notificado cuando esté lista.
                </p>

                <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 opacity-50 cursor-not-allowed" disabled>
                    <Download size={20} />
                    Próximamente
                </button>

                <div className="mt-8">
                    <Link href="/" className="text-green-600 font-bold hover:underline flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
