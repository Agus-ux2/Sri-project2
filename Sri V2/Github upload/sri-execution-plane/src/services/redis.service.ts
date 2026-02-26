import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

/**
 * Cliente Redis para Workers
 * SOLO lee de colas y sesiones
 * NO tiene acceso a la base de datos
 */
class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error', { error: err });
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Obtener job de la cola de una organización
   * Blocking pop con timeout
   */
  async dequeueJob(orgId: string, timeout: number = 5): Promise<any | null> {
    const queueKey = `sri:org:${orgId}:jobs`;

    try {
      // BRPOP: blocking right pop
      const result = await this.client.brpop(queueKey, timeout);

      if (!result) {
        return null;
      }

      const [_key, jobData] = result;
      return JSON.parse(jobData);
    } catch (error) {
      logger.error('Error dequeuing job', { error, orgId });
      return null;
    }
  }

  /**
   * Obtener job de cualquier organización
   * El worker itera por todas las orgs activas
   */
  async dequeueJobFromAnyOrg(orgIds: string[], timeout: number = 5): Promise<any | null> {
    if (orgIds.length === 0) {
      return null;
    }

    // Construir array de keys
    const queueKeys = orgIds.map(orgId => `sri:org:${orgId}:jobs`);

    try {
      // BRPOP con múltiples keys
      const result = await this.client.brpop(...queueKeys, timeout);

      if (!result) {
        return null;
      }

      const [_key, jobData] = result;
      return JSON.parse(jobData);
    } catch (error) {
      logger.error('Error dequeuing job from any org', { error });
      return null;
    }
  }

  /**
   * Obtener sesión de usuario (cookies)
   */
  async getUserSession(
    orgId: string,
    userId: string,
    provider: string
  ): Promise<any | null> {
    const key = `sri:sessions:${orgId}:${userId}:${provider}`;

    try {
      const data = await this.client.get(key);

      if (!data) {
        logger.warn('Session not found', { orgId, userId, provider });
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Error getting session', { error, orgId, userId, provider });
      return null;
    }
  }

  /**
   * Actualizar estado de job
   */
  async setJobStatus(jobId: string, status: string): Promise<void> {
    const key = `sri:job:${jobId}:status`;
    await this.client.set(key, status, 'EX', 30 * 24 * 60 * 60); // 30 días
  }

  /**
   * Publicar resultado en canal de completados
   */
  async publishJobResult(orgId: string, result: any): Promise<void> {
    const channel = `sri:org:${orgId}:results`;
    await this.client.publish(channel, JSON.stringify(result));
    logger.info('Job result published', { orgId, jobId: result.jobId, channel });
  }

  /**
   * Heartbeat del worker
   */
  async heartbeat(): Promise<void> {
    const key = `sri:worker:${config.workerId}:heartbeat`;
    await this.client.set(key, Date.now().toString(), 'EX', 30);
  }

  /**
   * Listar organizaciones activas (para polling)
   * NOTA: En un sistema real, esto vendría de un endpoint seguro
   * o de una configuración compartida en Redis
   */
  async getActiveOrgIds(): Promise<string[]> {
    try {
      // Buscar todas las colas que existan
      const keys = await this.client.keys('sri:org:*:jobs');

      // Extraer orgIds
      const orgIds = keys.map(key => {
        const match = key.match(/sri:org:(.+):jobs/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];

      return orgIds;
    } catch (error) {
      logger.error('Error getting active org IDs', { error });
      return [];
    }
  }

  getClient(): Redis {
    return this.client;
  }
}

export default new RedisClient();
