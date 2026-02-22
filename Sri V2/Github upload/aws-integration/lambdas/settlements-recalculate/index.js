const { PrismaClient } = require('@prisma/client');

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
                ctgEntries: {
                    include: { qualityAnalyses: true },
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

        const results = [];

        for (const ctg of settlement.ctgEntries) {
            const analysis = ctg.qualityAnalyses[0];

            if (!analysis) {
                results.push({ ctgNumber: ctg.ctgNumber, status: 'skipped', reason: 'No quality analysis' });
                continue;
            }

            const humidity = analysis.humidity ? Number(analysis.humidity) : 0;
            let finalFactor = 100;

            // Simple moisture discount
            if (humidity > 14) {
                finalFactor -= (humidity - 14) * 1.5;
            }

            await db.qualityResult.upsert({
                where: {
                    analysisId_ctgEntryId: {
                        analysisId: analysis.id,
                        ctgEntryId: ctg.id,
                    },
                },
                update: { finalFactor, calculationVersion: 'v2.0-lambda' },
                create: {
                    analysisId: analysis.id,
                    ctgEntryId: ctg.id,
                    finalFactor,
                    calculationVersion: 'v2.0-lambda',
                },
            });

            results.push({ ctgNumber: ctg.ctgNumber, status: 'recalculated', finalFactor });
        }

        await db.settlement.update({
            where: { id: settlementId },
            data: { status: 'validated', updatedAt: new Date() },
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: { settlementId, results },
                message: `Quality recalculated for ${results.length} CTGs`,
            }),
        };

    } catch (error) {
        console.error('Error in settlements-recalculate:', error);

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
