'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center p-6">
            <div className="card max-w-lg w-full p-10 text-center">
                <div className="flex justify-center mb-6">
                    <img src="/sri_logo_v2.png" alt="SRI Logo" className="h-16 w-auto" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Contacto</h1>
                <p className="text-gray-500 mb-8">Estamos para ayudarte.</p>

                <div className="space-y-6 text-left">
                    <div className="flex items-start gap-4">
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Email</p>
                            <p className="text-gray-900 font-bold">info@solucionesruralesintegradas.com.ar</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Teléfono</p>
                            <p className="text-gray-900 font-bold">+54 11 0000-0000</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Ubicación</p>
                            <p className="text-gray-900 font-bold">Buenos Aires, Argentina</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-100">
                    <Link href="/" className="text-green-600 font-bold hover:underline flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
