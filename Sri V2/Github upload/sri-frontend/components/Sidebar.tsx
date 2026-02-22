import React from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    Upload,
    LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Session from '@/lib/session';

export function Sidebar() {
    const pathname = usePathname();

    const handleLogout = () => {
        Session.logout();
        window.location.href = '/login';
    };

    const isActive = (path: string) => {
        return pathname === path ? 'bg-green-600/10 text-green-400 font-bold border border-green-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white';
    };

    return (
        <aside className="w-64 bg-[#1a2325] text-white flex flex-col shadow-2xl z-20">
            <div className="p-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
                        <img src="/sri_logo_v2.png" alt="SRI" className="h-8 w-auto invert brightness-0" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-white">SRI</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard')}`}>
                    <LayoutDashboard size={20} />
                    Panel Principal
                </Link>
                <Link href="/dashboard/contracts" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard/contracts')}`}>
                    <FileText size={20} />
                    Contratos
                </Link>
                <Link href="/dashboard/upload" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard/upload')}`}>
                    <Upload size={20} />
                    Carga OCR
                </Link>
                <Link href="/dashboard/grains" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard/grains')}`}>
                    <FileText size={20} />
                    Mis Granos
                </Link>
                <Link href="/dashboard/providers" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard/providers')}`}>
                    <Users size={20} />
                    Proveedores
                </Link>
            </nav>

            <div className="p-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-gray-400 mb-2 uppercase font-black tracking-widest">Soporte</p>
                    <button className="text-sm font-bold text-white hover:text-green-400 transition-colors">Contactar Ayuda</button>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-xl transition-all mt-4 font-bold"
                >
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
