const { Client } = require('pg');

const config = {
    host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
    user: 'sri_admin',
    password: 'SriAdmin2026!',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
};

async function fix() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected.\n');

        // Step 1: Add user_id column to settlements if it doesn't exist
        console.log('Step 1: Adding user_id column to settlements...');
        await client.query(`
            ALTER TABLE settlements 
            ADD COLUMN IF NOT EXISTS user_id UUID
        `);
        console.log('  -> Column user_id added (or already exists).\n');

        // Step 2: Add an index for performance (Regla 1: all queries filter by user_id)
        console.log('Step 2: Adding index on user_id...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS settlements_user_id_idx ON settlements(user_id)
        `);
        console.log('  -> Index created.\n');

        // Step 3: Get the main user (Agustin Lorenzo)
        const users = await client.query(`SELECT id, email, name FROM users ORDER BY created_at ASC`);
        console.log('Users found:');
        users.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.name}`));

        const mainUser = users.rows[0]; // First user = Agustin Lorenzo
        console.log(`\nAssigning all settlements to: ${mainUser.name} (${mainUser.email})\n`);

        // Step 4: Update all settlements with NULL user_id
        console.log('Step 3: Updating settlements with NULL user_id...');
        const result = await client.query(
            `UPDATE settlements SET user_id = $1 WHERE user_id IS NULL RETURNING id, settlement_number`,
            [mainUser.id]
        );
        console.log(`  -> Updated ${result.rowCount} settlements:`);
        result.rows.forEach(r => console.log(`     ${r.id} | ${r.settlement_number}`));

        // Step 5: Verify
        console.log('\nVerification:');
        const verify = await client.query(`SELECT id, settlement_number, user_id FROM settlements`);
        verify.rows.forEach(r => console.log(`  ${r.settlement_number} -> user_id: ${r.user_id}`));

        const nullCount = await client.query(`SELECT COUNT(*) as c FROM settlements WHERE user_id IS NULL`);
        console.log(`\nSettlements with NULL user_id: ${nullCount.rows[0].c}`);
        console.log('\nDone!');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

fix();
