const { Pool } = require('pg');

// Railway database
const railwayPool = new Pool({
    connectionString: 'postgresql://postgres:yNfbYxYBbjyHEcQOBFQroLBtnxeWLkJR@crossover.proxy.rlwy.net:11331/railway',
    ssl: { rejectUnauthorized: false }
});

// AWS RDS database
const rdsPool = new Pool({
    host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'postgres',
    user: 'sri_admin',
    password: 'Stich2009!',
    ssl: { rejectUnauthorized: false }
});

async function migrateUsers() {
    try {
        // Get users from Railway
        console.log('Fetching users from Railway...');
        const railwayUsers = await railwayPool.query('SELECT * FROM users');
        console.log('Found', railwayUsers.rows.length, 'users in Railway');

        for (const user of railwayUsers.rows) {
            console.log('\nMigrating user:', user.email);

            // Check if user exists in RDS
            const existing = await rdsPool.query('SELECT id FROM users WHERE email = $1', [user.email]);
            if (existing.rows.length > 0) {
                console.log('  -> Already exists in AWS RDS, skipping');
                continue;
            }

            // Insert into RDS with the same password_hash (so same password works)
            try {
                await rdsPool.query(`
          INSERT INTO users (email, password_hash, name, username, company, phone, role, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
                    user.email,
                    user.password_hash || user.password, // Railway might have 'password' or 'password_hash'
                    user.name || 'User',
                    user.name?.split(' ')[0]?.toLowerCase() || user.email.split('@')[0],
                    user.company || 'SRI',
                    user.phone || null,
                    user.role || 'user',
                    user.created_at || new Date()
                ]);
                console.log('  -> Successfully migrated to AWS RDS');
            } catch (insertErr) {
                console.log('  -> Error inserting:', insertErr.message);
            }
        }

        console.log('\nMigration complete!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await railwayPool.end();
        await rdsPool.end();
    }
}

migrateUsers();
