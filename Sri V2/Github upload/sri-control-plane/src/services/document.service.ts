import db from '../db/client';
import { enqueueJob } from './redis.service';

export interface DocumentData {
    id: string;
    user_id: string;
    original_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    ocr_status: string;
    ocr_data: any;
    created_at: Date;
}

class DocumentService {
    /**
     * List documents for a specific user
     */
    async listUserDocuments(userId: string): Promise<DocumentData[]> {
        const query = `
            SELECT * FROM documents 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;
        const res = await db.query(query, [userId]);
        return res.rows;
    }

    /**
     * Get a document by ID and verify ownership
     */
    async getDocumentById(id: string, userId: string): Promise<DocumentData | null> {
        const query = `
            SELECT * FROM documents 
            WHERE id = $1 AND user_id = $2
        `;
        const res = await db.query(query, [id, userId]);
        return res.rows[0] || null;
    }

    /**
     * Create/Register a new document
     */
    async createDocument(data: Partial<DocumentData>) {
        const query = `
            INSERT INTO documents (user_id, original_name, file_path, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const res = await db.query(query, [
            data.user_id,
            data.original_name,
            data.file_path,
            data.file_size,
            data.mime_type
        ]);

        const document = res.rows[0];

        // Trigger OCR job
        try {
            // Get user's company for the queue (as orgId)
            const userRes = await db.query('SELECT company FROM users WHERE id = $1', [data.user_id]);
            const orgId = userRes.rows[0]?.company || 'default-org';

            await enqueueJob(orgId, {
                jobId: document.id,
                orgId: orgId,
                userId: data.user_id,
                type: 'OCR_PROCESS',
                filePath: data.file_path,
                mimeType: data.mime_type,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to enqueue OCR job:', error);
        }

        return document;
    }
    /**
     * Update document status/metadata
     */
    async updateDocument(id: string, data: Partial<DocumentData>) {
        // Build dynamic query
        const fields = Object.keys(data).map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = Object.values(data);

        const query = `
            UPDATE documents 
            SET ${fields} 
            WHERE id = $1
            RETURNING *
        `;

        const res = await db.query(query, [id, ...values]);
        return res.rows[0];
    }
}

export default new DocumentService();
