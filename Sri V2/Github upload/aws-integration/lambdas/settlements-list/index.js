const { Pool } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let pool = null;
const s3Client = new S3Client({ region: 'us-east-2' });

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`,
            ssl: { rejectUnauthorized: false },
            max: 1,
            idleTimeoutMillis: 120000,
            connectionTimeoutMillis: 10000,
        });
    }
    return pool;
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
    let client;
    try {
        const queryParams = event.queryStringParameters || {};
        const { grainType, status, dateFrom, dateTo, limit = '50', offset = '0' } = queryParams;
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (grainType) {
            conditions.push(`s.grain_type = $${paramIndex++}`);
            params.push(grainType.toUpperCase());
        }
        if (status) {
            conditions.push(`s.status = $${paramIndex++}`);
            params.push(status);
        }
        if (dateFrom) {
            conditions.push(`s.settlement_date >= $${paramIndex++}`);
            params.push(dateFrom);
        }
        if (dateTo) {
            conditions.push(`s.settlement_date <= $${paramIndex++}`);
            params.push(dateTo);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const db = getPool();
        client = await db.connect();
        const query = `
      SELECT s.id, s.settlement_number as number, s.settlement_date as date,
        s.grain_type as "grainType", s.total_net_kg as "totalNetKg",
        s.net_amount as "netAmount", s.status, s.s3_key as "s3Key",
        c.id as "companyId", c.name as "companyName", c.tax_id as "companyTaxId",
        (SELECT COUNT(*) FROM ctg_entries WHERE settlement_id = s.id) as "ctgCount"
      FROM settlements s
      LEFT JOIN companies c ON s.company_id = c.id
      ${whereClause}
      ORDER BY s.settlement_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));
        const [dataResult, countResult] = await Promise.all([
            client.query(query, params),
            client.query(`SELECT COUNT(*) as total FROM settlements s ${whereClause}`, params.slice(0, -2)),
        ]);
        const dataWithUrls = await Promise.all(
            dataResult.rows.map(async (row) => ({
                id: row.id,
                number: row.number,
                date: row.date,
                grainType: row.grainType,
                totalNetKg: parseFloat(row.totalNetKg) || 0,
                netAmount: parseFloat(row.netAmount) || 0,
                status: row.status,
                ctgCount: parseInt(row.ctgCount) || 0,
                pdfUrl: await generatePresignedUrl(row.s3Key),
                company: row.companyId ? {
                    id: row.companyId,
                    name: row.companyName,
                    taxId: row.companyTaxId,
                } : null,
            }))
        );
        const total = parseInt(countResult.rows[0].total);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: dataWithUrls,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + dataWithUrls.length < total,
                },
            }),
        };
    } catch (error) {
        console.error('Error in settlements-list:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
        };
    } finally {
        if (client) client.release();
    }
};