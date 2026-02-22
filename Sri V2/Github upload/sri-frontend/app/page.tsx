// app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
    return (
        <div className="relative min-h-screen">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url(/images/campo-agricola.png)',
                    filter: 'brightness(0.5)'
                }}
            />

            {/* Content */}
            <div className="relative z-10">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-2">
                        <img src="/sri_logo_v2.png" alt="SRI" className="h-16 w-auto" />
                        <span className="text-white text-xl font-bold">SRI</span>
                    </div>

                    <div className="flex items-center gap-6 text-white">
                        <Link href="/register" className="hover:text-green-400">
                            Registración
                        </Link>
                        <Link href="/contact" className="hover:text-green-400">
                            Contacto
                        </Link>
                        <Link href="/app" className="hover:text-green-400">
                            App Móvil
                        </Link>
                        <Link href="/login">
                            <Button className="bg-[#27ae60] hover:bg-[#229954] text-white">
                                Acceso Clientes
                            </Button>
                        </Link>
                    </div>
                </nav>

                {/* Hero */}
                <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center text-white">
                    <h1 className="text-7xl font-bold mb-6 max-w-5xl">
                        Soluciones Rurales Integradas
                    </h1>
                    <p className="text-2xl max-w-3xl leading-relaxed">
                        Auditoría forense y control de gestión para productores agropecuarios.
                    </p>
                </div>
            </div>

            {/* Green Footer Bar */}
            <div className="absolute bottom-0 w-full h-24 bg-[#27ae60]" />

            {/* Chat Bubble */}
            <div className="fixed bottom-8 right-8 z-50">
                <button className="bg-[#00d4aa] hover:bg-[#00b894] w-16 h-16 rounded-full shadow-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
