const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:yNfbYxYBbjyHEcQOBFQroLBtnxeWLkJR@crossover.proxy.rlwy.net:11331/railway',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        // Get table columns
        const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log('=== USERS TABLE COLUMNS ===');
        console.log(JSON.stringify(cols.rows, null, 2));

        // Get all users
        const users = await pool.query('SELECT * FROM users');
        console.log('\n=== USERS DATA ===');
        console.log('Count:', users.rows.length);
        console.log(JSON.stringify(users.rows, null, 2));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
