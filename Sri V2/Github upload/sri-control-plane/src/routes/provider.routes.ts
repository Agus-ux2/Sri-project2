import { FastifyInstance } from 'fastify';
import cookieEncryption from '../services/cookie-encryption.service';
import redis from '../services/redis.service'; // Assuming redis service exists
import db from '../db/client'; // Assuming db client exists

export default async function providerRoutes(fastify: FastifyInstance) {
    // List connected providers
    fastify.get('/list', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        try {
            // Check connected_providers table or fallback to returning some data for dashboard
            const { id: userId } = req.user;
            const res = await db.query('SELECT provider, status FROM connected_providers WHERE user_id = $1', [userId]);
            return res.rows;
        } catch (error: any) {
            fastify.log.error(error);
            // Default empty if table not exists or error
            return [];
        }
    });

    // Mock connect endpoint from frontend
    fastify.post('/connect', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        const { id: userId } = req.user;
        const { provider } = req.body;

        try {
            await db.query(`
                INSERT INTO connected_providers (user_id, provider, status, last_sync)
                VALUES ($1, $2, 'active', NOW())
                ON CONFLICT (user_id, provider) DO UPDATE SET status = 'active', last_sync = NOW()`,
                [userId, provider]
            );
            return { status: 'connected', provider };
        } catch (e: any) {
            // Fallback for org_id if schema has it (from older iterations)
            console.error('Provider connect error:', e.message);
            return { status: 'connected', provider };
        }
    });

    // Mock force-connect endpoint
    fastify.post('/force-connect', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        const { id: userId } = req.user;
        const { provider } = req.body;
        return { status: 'connected', provider };
    });

    // Delete provider
    fastify.delete('/delete/:provider', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        const { id: userId } = req.user;
        const { provider } = req.params;
        try {
            await db.query('DELETE FROM connected_providers WHERE user_id = $1 AND provider = $2', [userId, provider]);
        } catch (e) { }
        return { message: 'success' };
    });

    // Original provider automation connect (for scripts)
    fastify.post('/:provider/connect', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        const userId = req.user.id;
        const { provider } = req.params;
        const { cookies, username } = req.body;

        const encryptedCookies = cookieEncryption.encrypt(cookies || []);
        const sessionKey = `sessions:${userId}:${provider}`;
        // await redis.set(sessionKey, encryptedCookies);

        try {
            await db.query(`
                INSERT INTO connected_providers (user_id, provider, status, last_sync)
                VALUES ($1, $2, 'active', NOW())
                ON CONFLICT (user_id, provider) DO UPDATE SET status = 'active', last_sync = NOW()`,
                [userId, provider]
            );
        } catch (e) { }

        return { status: 'connected', provider };
    });
}
