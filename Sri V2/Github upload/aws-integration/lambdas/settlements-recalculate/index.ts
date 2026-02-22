import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// This would import from Lambda Layer in production
// import { QualityService } from '/opt/nodejs/services/quality.service';

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

// Moisture discount tables (simplified - full version in Layer)
const MOISTURE_TABLES: Record<string, { base: number; entries: { humidity: number; waste: number }[] }> = {
    SOJA: {
        base: 13.5,
        entries: [
            { humidity: 13.5, waste: 0 },
            { humidity: 14.0, waste: 0.75 },
            { humidity: 14.5, waste: 1.5 },
            { humidity: 15.0, waste: 2.25 },
            { humidity: 15.5, waste: 3.0 },
            { humidity: 16.0, waste: 3.75 },
        ],
    },
    TRIGO: {
        base: 14.0,
        entries: [
            { humidity: 14.0, waste: 0 },
            { humidity: 14.5, waste: 0.75 },
            { humidity: 15.0, waste: 1.5 },
            { humidity: 15.5, waste: 2.25 },
            { humidity: 16.0, waste: 3.0 },
        ],
    },
    MAIZ: {
        base: 14.5,
        entries: [
            { humidity: 14.5, waste: 0 },
            { humidity: 15.0, waste: 0.75 },
            { humidity: 15.5, waste: 1.5 },
            { humidity: 16.0, waste: 2.25 },
        ],
    },
};

function calculateMoistureDiscount(grainType: string, humidity: number): number {
    const table = MOISTURE_TABLES[grainType.toUpperCase()];
    if (!table) return 0;

    if (humidity <= table.base) return 0;

    // Find closest entry
    for (let i = table.entries.length - 1; i >= 0; i--) {
        if (humidity >= table.entries[i].humidity) {
            return table.entries[i].waste;
        }
    }
    return 0;
}

function calculateFinalFactor(
    humidity: number,
    grainType: string,
    damagedGrains?: number,
    foreignMatter?: number
): number {
    let factor = 100;

    // Moisture discount
    factor -= calculateMoistureDiscount(grainType, humidity);

    // Damaged grains discount (simplified)
    if (damagedGrains && damagedGrains > 5) {
        factor -= (damagedGrains - 5) * 0.5;
    }

    // Foreign matter discount
    if (foreignMatter && foreignMatter > 1) {
        factor -= (foreignMatter - 1) * 1;
    }

    return Math.max(0, Math.round(factor * 100) / 100);
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };

    try {
        const tenantId = event.requestContext?.authorizer?.claims?.['custom:tenantId']
            || event.headers['x-tenant-id']
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

        // Verify ownership and get settlement with CTGs
        const settlement = await db.settlement.findFirst({
            where: {
                id: settlementId,
                companyId: tenantId,
            },
            include: {
                ctgEntries: {
                    include: {
                        qualityAnalyses: true,
                    },
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

        const results: any[] = [];
        const discrepancies: any[] = [];

        // Recalculate quality for each CTG
        for (const ctg of settlement.ctgEntries) {
            const analysis = ctg.qualityAnalyses[0]; // Get latest analysis

            if (!analysis) {
                results.push({
                    ctgNumber: ctg.ctgNumber,
                    status: 'skipped',
                    reason: 'No quality analysis found',
                });
                continue;
            }

            const humidity = analysis.humidity ? Number(analysis.humidity) : 0;
            const damagedGrains = analysis.damagedGrains ? Number(analysis.damagedGrains) : 0;
            const foreignMatter = analysis.foreignMatter ? Number(analysis.foreignMatter) : 0;

            const finalFactor = calculateFinalFactor(
                humidity,
                settlement.grainType,
                damagedGrains,
                foreignMatter
            );

            const moistureDiscount = calculateMoistureDiscount(settlement.grainType, humidity);

            // Upsert quality result
            const qualityResult = await db.qualityResult.upsert({
                where: {
                    analysisId_ctgEntryId: {
                        analysisId: analysis.id,
                        ctgEntryId: ctg.id,
                    },
                },
                update: {
                    finalFactor,
                    moistureDiscount,
                    calculationVersion: 'v2.0-lambda',
                },
                create: {
                    analysisId: analysis.id,
                    ctgEntryId: ctg.id,
                    finalFactor,
                    moistureDiscount,
                    calculationVersion: 'v2.0-lambda',
                },
            });

            // Check for discrepancy with original factor
            const originalFactor = ctg.factor ? Number(ctg.factor) : 100;
            const difference = Math.abs(originalFactor - finalFactor);

            if (difference > 0.5) {
                discrepancies.push({
                    ctgNumber: ctg.ctgNumber,
                    originalFactor,
                    calculatedFactor: finalFactor,
                    difference,
                    status: difference > 2 ? 'CRITICAL' : 'WARNING',
                });
            }

            results.push({
                ctgNumber: ctg.ctgNumber,
                status: 'recalculated',
                finalFactor,
                moistureDiscount,
                originalFactor,
                difference,
            });
        }

        // Update settlement status
        await db.settlement.update({
            where: { id: settlementId },
            data: {
                status: discrepancies.length > 0 ? 'needs_review' : 'validated',
                updatedAt: new Date(),
            },
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    settlementId,
                    totalCTGs: settlement.ctgEntries.length,
                    recalculated: results.filter(r => r.status === 'recalculated').length,
                    skipped: results.filter(r => r.status === 'skipped').length,
                    discrepancies,
                    results,
                },
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
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
