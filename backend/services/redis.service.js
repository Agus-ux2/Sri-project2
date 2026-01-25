/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * REDIS SERVICE - Gestión de caché y sesiones
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const redis = require('redis');
const env = require('../config/env');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Conectar a Redis
     */
    async connect() {
        try {
            const config = env.REDIS_URL ? {
                url: env.REDIS_URL
            } : {
                socket: {
                    host: env.REDIS_HOST,
                    port: env.REDIS_PORT
                },
                password: env.REDIS_PASSWORD || undefined,
                database: env.REDIS_DB
            };

            this.client = redis.createClient(config);

            // Agregar timeout de conexión para no bloquear el inicio del servidor
            // Si no conecta en 5 segundos, fallará y el servidor usará el fallback
            const connectTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    console.error('❌ Timeout de conexión a Redis (5s)');
                    // No podemos abortar el connect() de redis fácilmente, 
                    // pero podemos dejar de esperar aquí si fuera necesario.
                }
            }, 5000);

            // Event handlers
            this.client.on('error', (err) => {
                console.error('❌ Redis Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('🔄 Conectando a Redis...');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis conectado correctamente');
                this.isConnected = true;
                clearTimeout(connectTimeout);
            });

            this.client.on('end', () => {
                console.log('🔌 Redis desconectado');
                this.isConnected = false;
            });

            await this.client.connect();
            clearTimeout(connectTimeout);
            return this.client;
        } catch (error) {
            this.isConnected = false;
            // No hacemos throw aquí para que el servidor pueda arrancar con el fallback
            console.error('❌ Error conectando a Redis:', error.message);
            return null;
        }
    }

    /**
     * Desconectar de Redis
     */
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    /**
     * Verificar si está conectado
     */
    isReady() {
        return this.isConnected && this.client;
    }

    /**
     * Obtener cliente de Redis
     */
    getClient() {
        if (!this.isReady()) {
            throw new Error('Redis no está conectado');
        }
        return this.client;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERACIONES GENÉRICAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Guardar valor en Redis
     * @param {string} key - Clave
     * @param {any} value - Valor (se serializa a JSON si es objeto)
     * @param {number} ttl - Tiempo de vida en segundos (opcional)
     */
    async set(key, value, ttl = null) {
        try {
            const client = this.getClient();
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);

            if (ttl) {
                await client.setEx(key, ttl, serialized);
            } else {
                await client.set(key, serialized);
            }
            return true;
        } catch (error) {
            console.error(`Error guardando en Redis [${key}]:`, error);
            return false;
        }
    }

    /**
     * Obtener valor de Redis
     * @param {string} key - Clave
     * @param {boolean} parse - Si debe parsear JSON
     */
    async get(key, parse = true) {
        try {
            const client = this.getClient();
            const value = await client.get(key);

            if (!value) return null;

            if (parse) {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            }

            return value;
        } catch (error) {
            console.error(`Error obteniendo de Redis [${key}]:`, error);
            return null;
        }
    }

    /**
     * Eliminar clave de Redis
     */
    async delete(key) {
        try {
            const client = this.getClient();
            await client.del(key);
            return true;
        } catch (error) {
            console.error(`Error eliminando de Redis [${key}]:`, error);
            return false;
        }
    }

    /**
     * Verificar si existe una clave
     */
    async exists(key) {
        try {
            const client = this.getClient();
            const result = await client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`Error verificando existencia en Redis [${key}]:`, error);
            return false;
        }
    }

    /**
     * Obtener tiempo de vida restante (en segundos)
     */
    async ttl(key) {
        try {
            const client = this.getClient();
            return await client.ttl(key);
        } catch (error) {
            console.error(`Error obteniendo TTL de Redis [${key}]:`, error);
            return -1;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SESIONES DE PROVEEDORES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Guardar sesión de proveedor
     * @param {number} userId - ID del usuario
     * @param {string} provider - Nombre del proveedor (cargill, ldc, etc.)
     * @param {object} sessionData - Datos de la sesión (cookies, etc.)
     * @param {number} ttl - Tiempo de vida en segundos (null = indefinido)
     */
    async saveProviderSession(userId, provider, sessionData, ttl = null) {
        const key = `session:provider:${userId}:${provider}`;
        const data = {
            userId,
            provider,
            ...sessionData,
            savedAt: new Date().toISOString()
        };

        console.log(`💾 Guardando sesión de ${provider} para usuario ${userId} en Redis (TTL: ${ttl ? ttl + 's' : 'indefinido'})`);
        return await this.set(key, data, ttl);
    }

    /**
     * Obtener sesión de proveedor
     */
    async getProviderSession(userId, provider) {
        const key = `session:provider:${userId}:${provider}`;
        console.log(`📥 Obteniendo sesión de ${provider} para usuario ${userId} desde Redis`);
        return await this.get(key);
    }

    /**
     * Eliminar sesión de proveedor
     */
    async deleteProviderSession(userId, provider) {
        const key = `session:provider:${userId}:${provider}`;
        console.log(`🗑️  Eliminando sesión de ${provider} para usuario ${userId}`);
        return await this.delete(key);
    }

    /**
     * Listar todas las sesiones de proveedores para un usuario
     */
    async listProviderSessions(userId) {
        try {
            const client = this.getClient();
            const pattern = `session:provider:${userId}:*`;
            const keys = await client.keys(pattern);

            const sessions = [];
            for (const key of keys) {
                const provider = key.split(':')[3]; // Extraer proveedor del key
                const data = await this.get(key);
                if (data) {
                    sessions.push({
                        provider,
                        connected_at: data.savedAt
                    });
                }
            }

            return sessions;
        } catch (error) {
            console.error('Error listando sesiones de proveedores:', error);
            return [];
        }
    }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
