import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Encolar un job para un worker
 */
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Encolar un job para un worker
 */
export async function enqueueJob(orgId: string, jobData: any) {
    const queueKey = `sri:org:${orgId}:jobs`;
    await redis.lpush(queueKey, JSON.stringify(jobData));
}

/**
 * Initialize Redis Subscriber for job results
 */
export async function initRedisSubscriber() {
    // Import dynamically to avoid circular dependencies if any
    const documentService = (await import('./document.service')).default;

    // Pattern to match all org results
    // Assuming worker publishes to "sri:org:{orgId}:results"
    // Or if checking logs: "sri:org:VerifyCorp:results" -> "sri:org:*:results"
    await subscriber.psubscribe('sri:org:*:results');

    subscriber.on('pmessage', async (pattern, channel, message) => {
        console.log(`[Redis] Received result on ${channel}`);
        try {
            const result = JSON.parse(message);
            // Result structure depends on worker. 
            // Assuming: { jobId: string, status: 'completed'|'failed', result: any, error?: string }

            if (result.jobId) {
                const updateData: any = {};

                if (result.status === 'completed') {
                    updateData.ocr_status = 'completed';
                    updateData.ocr_data = result.result; // Metadata extracted
                } else if (result.status === 'failed') {
                    updateData.ocr_status = 'failed';
                    // Store error somewhere?
                }

                if (Object.keys(updateData).length > 0) {
                    console.log(`[Redis] Updating document ${result.jobId} status to ${updateData.ocr_status}`);
                    await documentService.updateDocument(result.jobId, updateData);
                }
            }

        } catch (err) {
            console.error('[Redis] Failed to handle message:', err);
        }
    });

    console.log('[Redis] Subscriber initialized for results.');
}

export default redis;
