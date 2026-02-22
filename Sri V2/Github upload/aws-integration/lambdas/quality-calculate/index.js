const { Pool } = require('pg');

let pool = null;

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

function getUserInfo(event) {
    const authorizer = event.requestContext?.authorizer || {};
    // Custom authorizer puts userId directly in context
    if (authorizer.userId) return { userId: authorizer.userId };

    const claims = authorizer.claims || {};
    const userId = claims.sub || event.headers?.['x-user-id'];
    return { userId };
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    let client;
    try {
        // --- REGLA 2: JWT en cada request ---
        const { userId } = getUserInfo(event);
        if (!userId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, error: 'Unauthorized — no userId in token' }),
            };
        }

        const ctgNumber = event.pathParameters?.ctgNumber;
        if (!ctgNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'CTG number required' }),
            };
        }

        const db = getPool();
        client = await db.connect();

        // --- REGLA 1: Aislamiento total por usuario ---
        // JOIN settlements para filtrar por user_id del JWT
        const ctgQuery = `
            SELECT
                ce.id, ce.ctg_number, ce.cp_number, ce.line_number,
                ce.gross_kg, ce.net_kg, ce.waste_kg, ce.factor,
                s.id AS settlement_id,
                s.settlement_number, s.settlement_date, s.grain_type
            FROM ctg_entries ce
            JOIN settlements s ON ce.settlement_id = s.id
            WHERE ce.ctg_number = $1
              AND s.user_id = $2
            LIMIT 1
        `;

        const ctgResult = await client.query(ctgQuery, [ctgNumber, userId]);

        if (ctgResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'CTG not found' }),
            };
        }

        const ctg = ctgResult.rows[0];

        // Get latest quality analysis for this CTG
        const analysisQuery = `
            SELECT
                id, ctg_number, grain_type, analysis_date, laboratory,
                humidity, foreign_matter, damaged_grains, hectoliter_weight,
                protein, broken_grains, green_grains, burned_grains,
                live_insects, observations
            FROM quality_analyses
            WHERE ctg_entry_id = $1
            ORDER BY analysis_date DESC
            LIMIT 1
        `;
        const analysisResult = await client.query(analysisQuery, [ctg.id]);
        const latestAnalysis = analysisResult.rows[0] || null;

        // Get latest quality result
        const resultQuery = `
            SELECT
                id, final_factor, base_factor, grade, grade_adjustment,
                total_bonus, bonus_details, total_discount, discount_details,
                base_humidity, actual_humidity,
                drying_waste_pct, handling_waste_pct, total_waste_pct, waste_kg,
                requires_drying, gross_quantity_kg, net_quantity_kg,
                calculation_version, created_at
            FROM quality_results
            WHERE ctg_entry_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const qualityResult = await client.query(resultQuery, [ctg.id]);
        const latestResult = qualityResult.rows[0] || null;

        // Build response
        const qualityData = {
            ctg: {
                number: ctg.ctg_number,
                cpNumber: ctg.cp_number,
                lineNumber: ctg.line_number,
                grossKg: parseFloat(ctg.gross_kg) || 0,
                netKg: parseFloat(ctg.net_kg) || 0,
                wasteKg: parseFloat(ctg.waste_kg) || 0,
                originalFactor: ctg.factor ? parseFloat(ctg.factor) : null,
            },
            settlement: {
                id: ctg.settlement_id,
                number: ctg.settlement_number,
                date: ctg.settlement_date,
                grainType: ctg.grain_type,
            },
            analysis: latestAnalysis ? {
                id: latestAnalysis.id,
                date: latestAnalysis.analysis_date,
                laboratory: latestAnalysis.laboratory,
                humidity: latestAnalysis.humidity ? parseFloat(latestAnalysis.humidity) : null,
                foreignMatter: latestAnalysis.foreign_matter ? parseFloat(latestAnalysis.foreign_matter) : null,
                damagedGrains: latestAnalysis.damaged_grains ? parseFloat(latestAnalysis.damaged_grains) : null,
                hectoliterWeight: latestAnalysis.hectoliter_weight ? parseFloat(latestAnalysis.hectoliter_weight) : null,
                protein: latestAnalysis.protein ? parseFloat(latestAnalysis.protein) : null,
                brokenGrains: latestAnalysis.broken_grains ? parseFloat(latestAnalysis.broken_grains) : null,
                greenGrains: latestAnalysis.green_grains ? parseFloat(latestAnalysis.green_grains) : null,
                burntGrains: latestAnalysis.burned_grains ? parseFloat(latestAnalysis.burned_grains) : null,
                liveInsects: latestAnalysis.live_insects,
                observations: latestAnalysis.observations,
            } : null,
            qualityResult: latestResult ? {
                id: latestResult.id,
                baseFactor: parseFloat(latestResult.base_factor),
                finalFactor: parseFloat(latestResult.final_factor),
                grade: latestResult.grade,
                gradeAdjustment: parseFloat(latestResult.grade_adjustment) || 0,
                totalBonus: parseFloat(latestResult.total_bonus) || 0,
                bonusDetails: latestResult.bonus_details,
                totalDiscount: parseFloat(latestResult.total_discount) || 0,
                discountDetails: latestResult.discount_details,
                baseHumidity: latestResult.base_humidity ? parseFloat(latestResult.base_humidity) : null,
                actualHumidity: latestResult.actual_humidity ? parseFloat(latestResult.actual_humidity) : null,
                dryingWastePct: latestResult.drying_waste_pct ? parseFloat(latestResult.drying_waste_pct) : null,
                handlingWastePct: latestResult.handling_waste_pct ? parseFloat(latestResult.handling_waste_pct) : null,
                totalWastePct: latestResult.total_waste_pct ? parseFloat(latestResult.total_waste_pct) : null,
                wasteKg: latestResult.waste_kg ? parseFloat(latestResult.waste_kg) : null,
                requiresDrying: latestResult.requires_drying,
                calculationVersion: latestResult.calculation_version,
                calculatedAt: latestResult.created_at,
            } : null,
            // Discrepancy detection: compare original factor vs calculated factor
            discrepancy: latestResult && ctg.factor ? (() => {
                const diff = parseFloat(latestResult.final_factor) - parseFloat(ctg.factor);
                const absDiff = Math.abs(diff);
                return {
                    hasDiscrepancy: absDiff > 0.5,
                    difference: diff,
                    status: absDiff > 2 ? 'CRITICAL' : absDiff > 0.5 ? 'WARNING' : 'OK',
                };
            })() : null,
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: qualityData }),
        };

    } catch (error) {
        console.error('Error in quality-calculate:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
            }),
        };
    } finally {
        if (client) client.release();
    }
};
