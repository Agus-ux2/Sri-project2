const { Client } = require('pg');
const fs = require('fs');

const config = {
    host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
    user: 'sri_admin',
    password: 'SriAdmin2026!',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
};

let output = '';
function log(msg) { output += msg + '\n'; }

async function diagnose() {
    const client = new Client(config);
    try {
        await client.connect();
        log('Connected to RDS successfully.\n');

        const colCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'settlements' 
            ORDER BY ordinal_position
        `);
        log('=== SETTLEMENTS TABLE COLUMNS ===');
        colCheck.rows.forEach(r => log(`  ${r.column_name} (${r.data_type})`));

        const hasUserId = colCheck.rows.some(r => r.column_name === 'user_id');
        if (hasUserId) {
            log('\n=== SETTLEMENTS WITH user_id = NULL ===');
            const nullRows = await client.query(`
                SELECT id, settlement_number, settlement_date, grain_type, user_id, company_id, created_by, status
                FROM settlements WHERE user_id IS NULL
            `);
            log(`Found ${nullRows.rows.length} settlements with NULL user_id:`);
            nullRows.rows.forEach(r => log(JSON.stringify(r)));

            log('\n=== ALL USERS ===');
            const users = await client.query(`SELECT id, email, name, company FROM users`);
            users.rows.forEach(r => log(`  ${r.id} | ${r.email} | ${r.name} | ${r.company}`));

            const total = await client.query(`SELECT COUNT(*) as total FROM settlements`);
            log(`\nTotal settlements: ${total.rows[0].total}`);

            log('\n=== SETTLEMENTS BY user_id ===');
            const dist = await client.query(`SELECT user_id, COUNT(*) as count FROM settlements GROUP BY user_id ORDER BY count DESC`);
            dist.rows.forEach(r => log(`  user_id=${r.user_id || 'NULL'}: ${r.count} settlements`));
        } else {
            log('\n!! Column user_id does NOT exist in settlements table!');
            const allSettlements = await client.query(`SELECT id, settlement_number, company_id, created_by, status FROM settlements LIMIT 20`);
            log('\nSample settlements:');
            allSettlements.rows.forEach(r => log(JSON.stringify(r)));

            log('\n=== ALL USERS ===');
            const users = await client.query(`SELECT id, email, name, company FROM users`);
            users.rows.forEach(r => log(`  ${r.id} | ${r.email} | ${r.name} | ${r.company}`));
        }
    } catch (err) {
        log('Error: ' + err.message);
    } finally {
        await client.end();
        fs.writeFileSync('diagnose-output.txt', output, 'utf-8');
        console.log('Done. Output saved to diagnose-output.txt');
    }
}

diagnose();
