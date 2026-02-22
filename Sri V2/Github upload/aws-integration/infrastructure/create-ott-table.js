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

async function createOttTable() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected.\n');

        await client.query(`
            CREATE TABLE IF NOT EXISTS ott_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Table ott_tokens created.');

        await client.query(`
            CREATE INDEX IF NOT EXISTS ott_tokens_expires_idx ON ott_tokens(expires_at)
        `);
        console.log('Index created.');

        // Verify
        const cols = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'ott_tokens' ORDER BY ordinal_position
        `);
        console.log('\nott_tokens columns:');
        cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

        console.log('\nDone!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

createOttTable();
