const { PrismaClient } = require('@prisma/client');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let prisma = null;
const s3Client = new S3Client({ region: 'us-east-2' });

function getPrisma() {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

async function generatePresignedUrl(s3Key) {
    if (!s3Key) return null;
    
    const command = new GetObjectCommand({
        Bucket: 'sri-settlements-248825820462',
        Key: s3Key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
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

        const settlementId = event.pathParameters?.id;
        if (!settlementId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Settlement ID required' }),
            };
        }

        const db = getPrisma();
        const settlement = await db.settlement.findFirst({
            where: {
                id: settlementId,
                companyId: tenantId,
            },
            include: {
                company: true,
                ctgEntries: {
                    include: {
                        qualityAnalyses: true,
                        qualityResults: true,
                    },
                    orderBy: { lineNumber: 'asc' },
                },
            },
        });

        if (!settlement) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'Settlement not found' }),
            };
        }

        // Generate presigned URL for PDF if s3Key exists
        let pdfUrl = null;
        if (settlement.s3Key) {
            pdfUrl = await generatePresignedUrl(settlement.s3Key);
        }

        const summary = {
            totalCTGs: settlement.ctgEntries.length,
            ctgsWithAnalysis: settlement.ctgEntries.filter(c => c.qualityAnalyses.length > 0).length,
            ctgsWithQuality: settlement.ctgEntries.filter(c => c.qualityResults.length > 0).length,
            totalGrossKg: Number(settlement.totalGrossKg),
            totalNetKg: Number(settlement.totalNetKg),
            netAmount: Number(settlement.netAmount),
        };

        const ctgEntries = settlement.ctgEntries.map(ctg => ({
            id: ctg.id,
            ctgNumber: ctg.ctgNumber,
            cpNumber: ctg.cpNumber,
            lineNumber: ctg.lineNumber,
            grossKg: Number(ctg.grossKg),
            netKg: Nu


$newCode = @'
const { PrismaClient } = require('@prisma/client');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let prisma = null;
const s3Client = new S3Client({ region: 'us-east-2' });

function getPrisma() {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

async function generatePresignedUrl(s3Key) {
    if (!s3Key) return null;
    
    const command = new GetObjectCommand({
        Bucket: 'sri-settlements-248825820462',
        Key: s3Key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
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

        const settlementId = event.pathParameters?.id;
        if (!settlementId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Settlement ID required' }),
            };
        }

        const db = getPrisma();
        const settlement = await db.settlement.findFirst({
            where: {
                id: settlementId,
                companyId: tenantId,
            },
            include: {
                company: true,
                ctgEntries: {
                    include: {
                        qualityAnalyses: true,
                        qualityResults: true,
                    },
                    orderBy: { lineNumber: 'asc' },
                },
            },
        });

        if (!settlement) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'Settlement not found' }),
            };
        }

        let pdfUrl = null;
        if (settlement.s3Key) {
            pdfUrl = await generatePresignedUrl(settlement.s3Key);
        }

        const summary = {
            totalCTGs: settlement.ctgEntries.length,
            ctgsWithAnalysis: settlement.ctgEntries.filter(c => c.qualityAnalyses.length > 0).length,
            ctgsWithQuality: settlement.ctgEntries.filter(c => c.qualityResults.length > 0).length,
            totalGrossKg: Number(settlement.totalGrossKg),
            totalNetKg: Number(settlement.totalNetKg),
            netAmount: Number(settlement.netAmount),
        };

        const ctgEntries = settlement.ctgEntries.map(ctg => ({
            id: ctg.id,
            ctgNumber: ctg.ctgNumber,
            cpNumber: ctg.cpNumber,
            lineNumber: ctg.lineNumber,
            grossKg: Number(ctg.grossKg),
            netKg: Number(ctg.netKg),
            humidity: ctg.humidity ? Number(ctg.humidity) : null,
            factor: ctg.factor ? Number(ctg.factor) : null,
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    id: settlement.id,
                    number: settlement.settlementNumber,
                    date: settlement.settlementDate,
                    grainType: settlement.grainType,
                    status: settlement.status,
                    pdfUrl,
                    company: settlement.company,
                    ctgEntries,
                },
                summary,
            }),
        };
    } catch (error) {
        console.error('Error in settlements-detail:', error);
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
