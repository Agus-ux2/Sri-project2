import { FastifyInstance } from 'fastify';
import grainStockService, { GrainStockData } from '../services/grain-stock.service';

export default async function grainStockRoutes(fastify: FastifyInstance) {
    // GET /stocks - Get all stocks for the authenticated user
    fastify.get('/', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        try {
            const userId = req.user.id;
            const stocks = await grainStockService.getStocksByUserId(userId);
            return stocks;
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ message: error.message || 'Failed to fetch stocks' });
        }
    });

    // POST /stocks - Upsert a stock record
    fastify.post('/', {
        onRequest: [fastify.authenticate]
    }, async (req: any, reply) => {
        try {
            const userId = req.user.id;
            const data: GrainStockData = req.body;

            // Basic validation
            if (!data.production_zone_id || !data.grain_type || !data.campaign) {
                return reply.code(400).send({ message: 'Missing required fields' });
            }

            const stock = await grainStockService.upsertStock(userId, data);
            return stock;
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ message: error.message || 'Failed to save stock' });
        }
    });
}
