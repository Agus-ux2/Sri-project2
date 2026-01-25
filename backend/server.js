/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SERVIDOR EXPRESS - ENTRYPOINT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const { initDatabase } = require('./config/database');

// Crear directorios necesarios
[env.STORAGE_PATH, env.UPLOADS_PATH, env.LOGS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const app = express();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MIDDLEWARE GLOBALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// CORS
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Logging simple
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RUTAS API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentsRoutes = require('./routes/documents.routes');
const ocrRoutes = require('./routes/ocr.routes');
const uploadRoutes = require('./routes/upload.routes');
const providersRoutes = require('./routes/providers.routes');

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api', uploadRoutes); // Para /api/upload

// Ruta para admin (si existe el archivo)
try {
    const adminRoutes = require('./routes/admin.routes');
    app.use('/api/admin', adminRoutes);
} catch (err) {
    console.log('ℹ️  Admin routes no disponibles todavía');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FALLBACK: Servir index.html para rutas no API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('*', (req, res) => {
    const isApi = req.path.startsWith('/api');
    const hasExtension = path.extname(req.path) !== '';

    if (!isApi && !hasExtension) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.status(404).json({ error: 'Recurso no encontrado' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANEJO DE ERRORES GLOBAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);

    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INICIALIZACIÓN DEL SERVIDOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function startServer() {
    try {
        // Inicializar base de datos
        await initDatabase();

        // Inicializar Redis (no bloqueante)
        const RedisService = require('./services/redis.service');
        try {
            await RedisService.connect();
        } catch (err) {
            console.warn('⚠️  Redis no disponible, usando fallback a archivos:', err.message);
        }

        // Inicializar MCP Service (Sin bloquear el inicio del servidor)
        const MCPService = require('./services/mcp.service');
        MCPService.connect().catch(err => console.error('Fallo inicial MCP:', err));

        // Inicializar Programador de Tareas (00:00 hs)
        const SchedulerService = require('./services/scheduler.service');
        SchedulerService.init();

        // Iniciar servidor
        const server = app.listen(env.PORT, '0.0.0.0', () => {
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('  🌾 SRI - Soluciones Rurales Integradas');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`  🚀 Servidor corriendo en el puerto: ${env.PORT}`);
            console.log(`  📊 API disponible en /api`);
            console.log(`  🌍 Ambiente: ${env.NODE_ENV}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
        });

        // Manejo de señales para cierre limpio
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM recibido. Cerrando servidor...');
            server.close(() => {
                console.log('💤 Servidor cerrado.');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('❌ Error inicializando servidor:', error);
        process.exit(1);
    }
}

// Iniciar
startServer();

module.exports = app;
