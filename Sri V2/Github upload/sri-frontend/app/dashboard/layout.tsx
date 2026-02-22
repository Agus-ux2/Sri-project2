'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Bell, Search } from 'lucide-react';
import Session from '@/lib/session';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const userData = Session.getUser();
        setUser(userData);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 z-10">
                    <div className="flex items-center gap-4 bg-gray-100/50 px-6 py-3 rounded-2xl max-w-md w-full border border-gray-200/50 focus-within:border-green-500/50 transition-all">
                        <Search size={18} className="text-gray-400" />
                        <input type="text" placeholder="Buscar en auditorías..." className="bg-transparent border-none outline-none text-sm w-full font-medium" />
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500">
                            <Bell size={22} />
                            <span className="absolute top-2 right-2 bg-red-500 border-2 border-white text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">2</span>
                        </div>
                        <div className="flex items-center gap-4 pl-8 border-l border-gray-100">
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900 leading-none">{user?.name || 'Productor SRI'}</p>
                                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mt-1">{user?.company || 'Agro Empresa'}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 p-0.5 rounded-2xl shadow-lg shadow-green-500/20">
                                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-green-600 text-lg">
                                    {user?.name?.substring(0, 1) || 'S'}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                {children}
            </main>
        </div>
    );
}
