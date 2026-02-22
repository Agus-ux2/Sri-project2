import { PrismaClient } from '@prisma/client';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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

        // Get settlement with full details (security: only tenant's data)
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

        // Calculate summary statistics
        const summary = {
            totalCTGs: settlement.ctgEntries.length,
            ctgsWithAnalysis: settlement.ctgEntries.filter(c => c.qualityAnalyses.length > 0).length,
            ctgsWithQuality: settlement.ctgEntries.filter(c => c.qualityResults.length > 0).length,
            discrepancies: settlement.ctgEntries.filter(c => {
                if (!c.qualityResults.length) return false;
                const result = c.qualityResults[0];
                const diff = Math.abs(Number(c.factor) - Number(result.finalFactor));
                return diff > 0.5;
            }).length,
            totalGrossKg: Number(settlement.totalGrossKg),
            totalNetKg: Number(settlement.totalNetKg),
            netAmount: Number(settlement.netAmount),
        };

        // Transform CTG entries for response
        const ctgEntries = settlement.ctgEntries.map(ctg => ({
            id: ctg.id,
            ctgNumber: ctg.ctgNumber,
            cpNumber: ctg.cpNumber,
            lineNumber: ctg.lineNumber,
            grossKg: Number(ctg.grossKg),
            netKg: Number(ctg.netKg),
            humidity: ctg.humidity ? Number(ctg.humidity) : null,
            factor: ctg.factor ? Number(ctg.factor) : null,
            qualityAnalyses: ctg.qualityAnalyses.map(qa => ({
                id: qa.id,
                humidity: qa.humidity ? Number(qa.humidity) : null,
                damagedGrains: qa.damagedGrains ? Number(qa.damagedGrains) : null,
                foreignMatter: qa.foreignMatter ? Number(qa.foreignMatter) : null,
                brokenGrains: qa.brokenGrains ? Number(qa.brokenGrains) : null,
                analysisDate: qa.analysisDate,
            })),
            qualityResults: ctg.qualityResults.map(qr => ({
                id: qr.id,
                finalFactor: Number(qr.finalFactor),
                moistureDiscount: qr.moistureDiscount ? Number(qr.moistureDiscount) : null,
                gradeDiscount: qr.gradeDiscount ? Number(qr.gradeDiscount) : null,
                wastePercent: qr.wastePercent ? Number(qr.wastePercent) : null,
                calculatedAt: qr.createdAt,
            })),
            hasDiscrepancy: ctg.qualityResults.length > 0 &&
                Math.abs(Number(ctg.factor) - Number(ctg.qualityResults[0].finalFactor)) > 0.5,
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
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
