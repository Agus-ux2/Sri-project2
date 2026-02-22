import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Initialize clients outside handler for connection reuse
const s3Client = new S3Client({ region: process.env.AWS_REGION });
let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };

    try {
        // Extract tenant info from authorizer (JWT claims)
        const tenantId = event.requestContext?.authorizer?.claims?.['custom:tenantId']
            || event.headers['x-tenant-id']
            || 'default-tenant';
        const userId = event.requestContext?.authorizer?.claims?.sub
            || event.headers['x-user-id']
            || 'system';

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'No file provided' }),
            };
        }

        // Decode base64 PDF
        const pdfBuffer = Buffer.from(event.body, 'base64');
        const timestamp = Date.now();
        const s3Key = `settlements/${tenantId}/${timestamp}.pdf`;

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.SETTLEMENTS_BUCKET!,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            Metadata: {
                tenantId,
                userId,
                uploadedAt: new Date().toISOString(),
            },
        }));

        const db = getPrisma();

        // Create settlement record (actual PDF parsing would be in shared layer)
        // For now, create a placeholder that can be processed async
        const settlement = await db.settlement.create({
            data: {
                settlementNumber: `PENDING-${timestamp}`,
                companyId: tenantId,
                settlementDate: new Date(),
                grainType: 'PENDING',
                totalGrossKg: 0,
                totalNetKg: 0,
                price: 0,
                grossAmount: 0,
                retentions: 0,
                commissions: 0,
                expenses: 0,
                paritariasAmount: 0,
                freightAmount: 0,
                netAmount: 0,
                originalPdfPath: `s3://${process.env.SETTLEMENTS_BUCKET}/${s3Key}`,
                status: 'pending_processing',
                createdBy: userId,
            },
        });

        // Trigger async processing (could be SNS/SQS in production)
        // For now, we'll process synchronously in the next iteration

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    settlementId: settlement.id,
                    settlementNumber: settlement.settlementNumber,
                    status: settlement.status,
                    s3Url: `s3://${process.env.SETTLEMENTS_BUCKET}/${s3Key}`,
                },
                message: 'PDF uploaded successfully. Processing will begin shortly.',
            }),
        };

    } catch (error) {
        console.error('Error in settlements-upload:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
