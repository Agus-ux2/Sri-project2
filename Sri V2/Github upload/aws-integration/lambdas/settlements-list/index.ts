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

        const queryParams = event.queryStringParameters || {};
        const { grainType, status, dateFrom, dateTo, limit = '50', offset = '0' } = queryParams;

        const db = getPrisma();

        // Build filter conditions
        const where: any = { companyId: tenantId };

        if (grainType) {
            where.grainType = grainType.toUpperCase();
        }
        if (status) {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.settlementDate = {};
            if (dateFrom) where.settlementDate.gte = new Date(dateFrom);
            if (dateTo) where.settlementDate.lte = new Date(dateTo);
        }

        // Query settlements
        const [settlements, total] = await Promise.all([
            db.settlement.findMany({
                where,
                include: {
                    company: {
                        select: { id: true, name: true, taxId: true }
                    },
                    _count: {
                        select: { ctgEntries: true }
                    }
                },
                orderBy: { settlementDate: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset),
            }),
            db.settlement.count({ where }),
        ]);

        // Transform for response
        const data = settlements.map(s => ({
            id: s.id,
            number: s.settlementNumber,
            date: s.settlementDate,
            grainType: s.grainType,
            totalNetKg: Number(s.totalNetKg),
            netAmount: Number(s.netAmount),
            status: s.status,
            ctgCount: s._count.ctgEntries,
            company: s.company,
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + data.length < total,
                },
            }),
        };

    } catch (error) {
        console.error('Error in settlements-list:', error);

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
