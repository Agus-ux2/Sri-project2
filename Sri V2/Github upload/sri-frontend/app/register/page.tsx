'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/lib/api';
import Session from '@/lib/session';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        company: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [zones, setZones] = useState([{ location: '', hectares: '' }]);

    useEffect(() => {
        if (Session.isAuthenticated()) {
            router.push('/dashboard');
        }
    }, [router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleZoneChange = (index: number, field: string, value: string) => {
        setZones(prevZones => {
            const newZones = [...prevZones];
            newZones[index] = { ...newZones[index], [field]: value };
            return newZones;
        });
    };

    const addZone = () => {
        setZones([...zones, { location: '', hectares: '' }]);
    };

    const removeZone = (index: number) => {
        if (zones.length > 1) {
            setZones(zones.filter((_, i) => i !== index));
        }
    };

    const goToStep2 = () => {
        if (!formData.name || !formData.email || !formData.company) {
            setError('Por favor complete todos los campos obligatorios');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formattedZones = zones
                .filter(z => z.location.trim())
                .map(z => ({
                    location: z.location.trim(),
                    hectares: parseInt(z.hectares) || 0
                }));

            const response = await API.post('/auth/register', {
                ...formData,
                zones: formattedZones
            }, { auth: false });

            if (response.token && response.user) {
                Session.login(response.token, response.user);
                router.push('/dashboard');
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            setError(err.message || 'Error al registrarse. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-300 to-gray-500">
            <div className="register-container card max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <div className="register-header text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img src="/sri_logo_v2.png" alt="SRI Logo" className="h-16 w-auto" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Crea tu cuenta</h1>
                    <p className="text-gray-600">Registrá tu empresa para comenzar la auditoría</p>
                </div>

                {/* Progress Bar */}
                <div className="progress-section mb-8">
                    <div className="text-center text-sm font-semibold text-gray-700 mb-2">
                        Paso {step} de 2 - {step === 1 ? 'Datos básicos' : 'Zonas y seguridad'}
                    </div>
                    <div className="progress-bar-container bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                            className="progress-bar bg-green-600 h-full transition-all duration-300"
                            style={{ width: step === 1 ? '50%' : '100%' }}
                        ></div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-md mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                        <div id="step1">
                            <div className="form-group">
                                <label htmlFor="name" className="form-label">Nombre y Apellido</label>
                                <input type="text" id="name" className="form-input" placeholder="Ej: Juan Pérez" value={formData.name} onChange={handleInputChange} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email</label>
                                <input type="email" id="email" className="form-input" placeholder="ejemplo@campo.com" value={formData.email} onChange={handleInputChange} required />
                                <small className="text-gray-500 text-xs mt-1 block">Usalo para verificar tu cuenta y recuperar tu contraseña.</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="username" className="form-label">Nombre de Usuario <span className="font-normal text-gray-500">(Opcional)</span></label>
                                <input type="text" id="username" className="form-input" placeholder="Tu apodo o nombre corto" value={formData.username} onChange={handleInputChange} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="company" className="form-label">Empresa / Razón Social</label>
                                <input type="text" id="company" className="form-input" placeholder="Ej: Estancia La Paz S.A." value={formData.company} onChange={handleInputChange} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone" className="form-label">Teléfono de contacto <span className="font-normal text-gray-500">(Opcional)</span></label>
                                <input type="tel" id="phone" className="form-input" placeholder="+54 9 291 ..." value={formData.phone} onChange={handleInputChange} />
                            </div>

                            <button type="button" className="btn-primary w-full py-4 text-lg" onClick={goToStep2}>
                                CONTINUAR
                            </button>

                            <div className="register-footer text-center mt-6 text-sm text-gray-600">
                                ¿Ya tienes cuenta? <Link href="/login" className="text-green-600 font-bold hover:underline">Inicia sesión aquí</Link>
                            </div>
                        </div>
                    ) : (
                        <div id="step2">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-semibold text-gray-800">Zonas de Producción</span>
                                <button type="button" className="text-green-600 text-sm font-semibold hover:opacity-70" onClick={addZone}>+ Agregar Localidad</button>
                            </div>

                            <div id="zones-container" className="mb-6 space-y-3">
                                {zones.map((zone, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ej: Bahía Blanca, PBA"
                                            className="form-input flex-[3] min-w-0"
                                            value={zone.location}
                                            onChange={(e) => handleZoneChange(index, 'location', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Has"
                                            className="form-input flex-1 min-w-[80px]"
                                            value={zone.hectares}
                                            onChange={(e) => handleZoneChange(index, 'hectares', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="bg-red-50 text-red-600 p-2 rounded-md hover:bg-red-600 hover:text-white transition-colors w-10 flex items-center justify-center font-bold"
                                            onClick={() => removeZone(index)}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Contraseña</label>
                                <input type="password" id="password" className="form-input" value={formData.password} onChange={handleInputChange} minLength={8} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword" className="form-label">Confirmar contraseña</label>
                                <input type="password" id="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleInputChange} minLength={8} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button type="button" className="bg-gray-200 text-gray-800 py-3 rounded-md font-bold hover:bg-gray-300 transition-colors" onClick={() => setStep(1)}>
                                    Volver
                                </button>
                                <button type="submit" className="btn-primary py-3" disabled={loading}>
                                    {loading ? 'Procesando...' : 'FINALIZAR REGISTRO'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="text-center mt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-green-600">← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
}
