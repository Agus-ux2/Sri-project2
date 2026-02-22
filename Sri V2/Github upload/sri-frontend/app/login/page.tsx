'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/lib/api';
import Session from '@/lib/session';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    useEffect(() => {
        if (Session.isAuthenticated()) {
            router.push('/dashboard');
        }
    }, [router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError('');

        try {
            const response = await API.post('/auth/login', formData, { auth: false });

            if (response.token && response.user) {
                Session.login(response.token, response.user);
                router.push('/dashboard');
            } else {
                setError('Respuesta inválida del servidor');
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-800 to-green-600">
            <div className="login-container card max-w-md w-full">
                <div className="login-header text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <img src="/sri_logo_v2.png" alt="SRI Logo" className="h-20 w-auto" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Iniciar Sesión</h1>
                    <p className="text-gray-600">Acceda a su plataforma de gestión agropecuaria</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-md mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="su@email.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                className="form-input pr-10"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <Link href="/auth/forgot-password" title="Recover" className="block text-right mt-2 text-sm text-green-600 hover:underline">
                            ¿Olvidó su contraseña?
                        </Link>
                    </div>

                    <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>

                <div className="login-footer text-center mt-8 text-sm text-gray-600">
                    ¿No tiene una cuenta? <Link href="/register" className="text-green-600 font-bold hover:underline">Registrarse</Link>
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-green-600">← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
}
