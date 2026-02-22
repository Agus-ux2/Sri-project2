import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SettlementProcessingService } from '../services/settlement-processing.service';

export default async function qualityRoutes(fastify: FastifyInstance) {
    const processingService = new SettlementProcessingService();

    // Upload Settlement PDF
    fastify.post('/settlements/upload', {
        onRequest: [fastify.authenticate]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const data = await request.file();
        
        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' });
        }

        if (data.mimetype !== 'application/pdf') {
            return reply.status(400).send({ error: 'File must be a PDF' });
        }
        
        const buffer = await data.toBuffer();
        const user = request.user as any;
        
        // TODO: Get real companyId from user context or request body
        // For now, using a placeholder or one from the user profile if available
        const companyId = user.companyId || 'default-company-id'; 

        try {
            const result = await processingService.processPDF(buffer, companyId, user.id);
            return reply.send(result);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ 
                success: false, 
                error: error.message || 'Internal Server Error' 
            });
        }
    });

    // Recalculate Quality for a Settlement
    fastify.post('/settlements/:id/recalculate', {
        onRequest: [fastify.authenticate]
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        try {
            const result = await processingService.recalculateQuality(id);
            return reply.send(result);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    });
}
