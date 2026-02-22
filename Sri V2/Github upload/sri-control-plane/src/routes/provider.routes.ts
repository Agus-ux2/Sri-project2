import { FastifyInstance } from 'fastify';
import cookieEncryption from '../services/cookie-encryption.service';
import redis from '../services/redis.service'; // Assuming redis service exists
import db from '../db/client'; // Assuming db client exists

export default async function providerRoutes(fastify: FastifyInstance) {
    fastify.post('/:provider/connect', async (req: any, reply) => {
        const { orgId, userId } = req.user; // Assuming JWT auth middleware
        const { provider } = req.params;
        const { cookies, username } = req.body;

        // 1. Encrypt Cookies (Security Fix)
        const encryptedCookies = cookieEncryption.encrypt(cookies);

        // 2. Store in Redis
        const sessionKey = `sessions:${orgId}:${userId}:${provider}`;
        await redis.set(sessionKey, encryptedCookies);

        // 3. Update DB status
        await db.query(
            `INSERT INTO connected_providers (org_id, user_id, provider, status, last_sync)
       VALUES ($1, $2, $3, 'active', NOW())
       ON CONFLICT (org_id, user_id, provider) 
       DO UPDATE SET status = 'active', last_sync = NOW()`,
            [orgId, userId, provider]
        );

        return { status: 'connected', provider };
    });
}
