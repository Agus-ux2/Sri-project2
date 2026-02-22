import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import documentService from '../services/document.service';
import storageService from '../services/storage.service';

export default async function documentRoutes(fastify: FastifyInstance) {
    // List user documents
    fastify.get('/', {
        onRequest: [fastify.authenticate]
    }, async (req: FastifyRequest) => {
        const userId = (req.user as any).id;
        const documents = await documentService.listUserDocuments(userId);
        return { documents };
    });

    // Upload document
    fastify.post('/upload', {
        onRequest: [fastify.authenticate]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = (req.user as any).id;
        const data = await req.file();

        if (!data) {
            return reply.code(400).send({ message: 'No file uploaded' });
        }

        try {
            const buffer = await data.toBuffer();
            const filename = data.filename;
            const mimeType = data.mimetype;
            const fileSize = buffer.length;

            const fileKey = `${userId}/${Date.now()}-${filename}`;

            console.log(`[Upload Debug] User: ${userId}, Key: ${fileKey}, Size: ${fileSize}, Mime: ${mimeType}`);

            // 1. Upload to Storage (MinIO)
            try {
                console.log('[Upload Debug] Starting S3 upload...');
                await storageService.uploadFile(fileKey, buffer, mimeType);
                console.log('[Upload Debug] S3 upload complete.');
            } catch (s3Error: any) {
                console.error('[Upload Debug] S3 Error:', s3Error);
                throw new Error(`S3 Upload Failed: ${s3Error.message}`);
            }

            // 2. Register in DB
            console.log('[Upload Debug] Registering in DB...');
            const document = await documentService.createDocument({
                user_id: userId,
                original_name: filename,
                file_path: fileKey,
                file_size: fileSize,
                mime_type: mimeType
            });
            console.log('[Upload Debug] DB registration complete.');

            return { message: 'File uploaded successfully', document };
        } catch (error: any) {
            fastify.log.error(error);
            console.error('[Upload Debug] Route Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            return reply.code(500).send({ message: error.message });
        }
    });

    // Get document detail
    fastify.get('/:id', {
        onRequest: [fastify.authenticate]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = (req.user as any).id;
        const { id } = req.params as any;

        const document = await documentService.getDocumentById(id, userId);
        if (!document) {
            return reply.code(404).send({ message: 'Document not found' });
        }

        return document;
    });
}
