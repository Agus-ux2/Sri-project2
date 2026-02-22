import 'dotenv/config';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import providerRoutes from './routes/provider.routes';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import grainStockRoutes from './routes/grain-stock.routes';

const server = Fastify({ logger: true });

// Register CORS
server.register(fastifyCors, {
    origin: true
});

// Register Multipart
server.register(fastifyMultipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});

// Register JWT
server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'super-secret-sri-key-2026'
});

// Authenticate Decorator
server.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Register routes
server.register(async (fastify) => {
    fastify.register(authRoutes, { prefix: '/auth' });
    fastify.register(providerRoutes, { prefix: '/providers' });
    fastify.register(documentRoutes, { prefix: '/documents' });
    fastify.register(grainStockRoutes, { prefix: '/stocks' });
    fastify.register(import('./routes/quality.routes'), { prefix: '/quality' });
}, { prefix: '/api' });

// Add decoration types
declare module 'fastify' {
    export interface FastifyInstance {
        authenticate: any;
    }
}

// Health check
server.get('/health', async () => {
    return { status: 'ok', version: '2.1' };
});

const start = async () => {
    const port = 3010;

    // Initialize Redis Subscriber
    try {
        const { initRedisSubscriber } = await import('./services/redis.service');
        await initRedisSubscriber();
    } catch (err) {
        console.error('Failed to init Redis Subscriber:', err);
    }

    console.log(`[PID:${process.pid}] Starting SRI API on port ${port}...`);
    try {
        const address = await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`Server listening at ${address}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

// Guard against double execution
const START_SYMBOL = Symbol.for('sri.server.started');
if (!(global as any)[START_SYMBOL]) {
    (global as any)[START_SYMBOL] = true;
    start();
}
