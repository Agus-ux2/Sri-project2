/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PROVIDERS CONTROLLER - Gestión de conexiones
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ProvidersController {
    /**
     * Lista proveedores conectados del usuario
     */
    static async list(req, res) {
        try {
            const RedisService = require('../services/redis.service');

            console.log('📋 [PROVIDERS LIST] User ID:', req.user.id);

            let providers = [];

            // Intentar obtener desde Redis
            if (RedisService.isReady()) {
                console.log('📋 [PROVIDERS LIST] Usando Redis');
                providers = await RedisService.listProviderSessions(req.user.id);
            } else {
                // Fallback a archivos JSON
                console.log('📋 [PROVIDERS LIST] Usando archivos JSON (fallback)');
                const sessionsDir = path.join(__dirname, '../../storage/sessions');
                if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

                const availableProviders = ['cargill', 'ldc', 'bunge', 'cofco', 'fyo', 'aca'];

                for (const p of availableProviders) {
                    const sessionPath = path.join(sessionsDir, `${req.user.id}_${p}.json`);
                    const exists = fs.existsSync(sessionPath);

                    if (exists) {
                        providers.push({ provider: p, connected_at: fs.statSync(sessionPath).mtime });
                    }
                }
            }

            console.log('📋 [PROVIDERS LIST] Connected providers:', providers.length);

            res.json({
                success: true,
                providers: providers
            });
        } catch (error) {
            console.error('Error listando proveedores:', error);
            res.status(500).json({ error: 'Error al listar proveedores' });
        }
    }

    /**
     * Inicia flujo de conexión (abre ventana del proveedor)
     */
    static async connect(req, res) {
        try {
            const { provider } = req.body;
            console.log(`🚀 Iniciando conexión con ${provider} para usuario ${req.user.id}`);

            const scriptPath = path.join(__dirname, '../scripts/open-provider.js');
            const token = req.headers.authorization.split(' ')[1];
            const email = req.user.email;

            // Crear archivo de log para este proceso
            const logsDir = path.join(__dirname, '../../logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            const logFile = path.join(logsDir, `provider_${provider}_${Date.now()}.log`);
            const logStream = fs.createWriteStream(logFile, { flags: 'a' });

            console.log(`📝 Logs del proveedor se guardarán en: ${logFile}`);

            // Disparar proceso independiente (detached) - TEMPORAL: usando inherit para debug
            const child = spawn('node', [
                scriptPath,
                `--provider=${provider}`,
                `--email=${email}`,
                `--token=${token}`
            ], {
                detached: false, // Cambiado a false para ver errores
                stdio: 'inherit' // Cambiado a inherit para ver output en consola
            });

            // child.unref(); // Comentado temporalmente

            res.json({
                success: true,
                message: `Script de conexión para ${provider} iniciado correctamente.`,
                logFile: logFile
            });
        } catch (error) {
            console.error('Error al conectar proveedor:', error);
            res.status(500).json({ error: 'Error al iniciar conexión' });
        }
    }

    /**
     * Guarda la sesión (cookies) enviada desde el script/navegador
     */
    static async saveSession(req, res) {
        try {
            const { provider, cookies } = req.body;
            const userId = req.user.id;
            const RedisService = require('../services/redis.service');

            console.log(`📥 Guardando sesión de ${provider} para usuario ${userId}`);

            // Intentar guardar en Redis primero
            if (RedisService.isReady()) {
                await RedisService.saveProviderSession(userId, provider, { cookies });
            } else {
                // Fallback a archivos JSON
                console.log('⚠️  Redis no disponible, guardando en archivo');
                const sessionsDir = path.join(__dirname, '../../storage/sessions');
                if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

                const sessionPath = path.join(sessionsDir, `${userId}_${provider}.json`);
                fs.writeFileSync(sessionPath, JSON.stringify({
                    userId,
                    provider,
                    cookies,
                    savedAt: new Date()
                }, null, 2));
            }

            res.json({ success: true, message: 'Sesión guardada correctamente' });
        } catch (error) {
            console.error('Error guardando sesión:', error);
            res.status(500).json({ error: 'Error al guardar sesión' });
        }
    }

    /**
     * Fuerza la conexión - Mantenemos por compatibilidad con la UI de polling si es necesario
     */
    static async forceConnect(req, res) {
        try {
            const { provider } = req.body;
            res.json({ success: true, message: `Conexión con ${provider} confirmada` });
        } catch (error) {
            res.status(500).json({ error: 'Error al confirmar conexión' });
        }
    }

    /**
     * Elimina una conexión existente
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const RedisService = require('../services/redis.service');

            // Eliminar de Redis si está disponible
            if (RedisService.isReady()) {
                await RedisService.deleteProviderSession(userId, id);
            }

            // También eliminar archivo JSON si existe
            const sessionPath = path.join(__dirname, '../../storage/sessions', `${userId}_${id}.json`);
            if (fs.existsSync(sessionPath)) {
                fs.unlinkSync(sessionPath);
            }

            res.json({ success: true, message: 'Proveedor desconectado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar conexión:', error);
            res.status(500).json({ error: 'Error al desconectar proveedor' });
        }
    }

    /**
     * Obtiene sesión/cookies para el script de automatización
     */
    static async getSession(req, res) {
        try {
            const { provider } = req.params;
            const userId = req.user.id;
            const RedisService = require('../services/redis.service');

            let sessionData = null;

            // Intentar obtener desde Redis
            if (RedisService.isReady()) {
                sessionData = await RedisService.getProviderSession(userId, provider);
            }

            // Fallback a archivo JSON si no está en Redis
            if (!sessionData) {
                console.log('📁 Buscando sesión en archivo JSON...');
                const sessionPath = path.join(__dirname, '../../storage/sessions', `${userId}_${provider}.json`);

                if (fs.existsSync(sessionPath)) {
                    sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

                    // Auto-migrar a Redis si está disponible
                    if (RedisService.isReady() && sessionData) {
                        console.log('🔄 Auto-migrando sesión a Redis...');
                        await RedisService.saveProviderSession(userId, provider, { cookies: sessionData.cookies });
                    }
                }
            }

            if (sessionData) {
                return res.json({
                    success: true,
                    cookies: sessionData.cookies
                });
            }

            res.json({ success: false, error: 'No hay sesión guardada' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error al obtener sesión' });
        }
    }
}

module.exports = ProvidersController;
