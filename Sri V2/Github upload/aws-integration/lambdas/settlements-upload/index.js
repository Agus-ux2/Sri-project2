const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
let prisma = null;

function getPrisma() {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };

    try {
        const tenantId = event.requestContext?.authorizer?.claims?.['custom:tenantId']
            || event.headers?.['x-tenant-id']
            || 'default-tenant';
        const userId = event.requestContext?.authorizer?.claims?.sub
            || event.headers?.['x-user-id']
            || 'system';

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'No file provided' }),
            };
        }

        const pdfBuffer = Buffer.from(event.body, 'base64');
        const timestamp = Date.now();
        const s3Key = `settlements/${tenantId}/${timestamp}.pdf`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.SETTLEMENTS_BUCKET,
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
                error: error.message || 'Unknown error',
            }),
        };
    }
};
