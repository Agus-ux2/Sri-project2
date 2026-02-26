const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'postgres',
    user: 'sri_admin',
    password: 'Stich2009!',
    ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
    const newPassword = 'SriAdmin2026!';
    const hash = await bcrypt.hash(newPassword, 10);

    console.log('New password:', newPassword);
    console.log('Hash:', hash);

    try {
        // Update all users with the new password
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 RETURNING email',
            [hash]
        );

        console.log('\nUpdated users:');
        result.rows.forEach(row => console.log(' -', row.email));
        console.log('\nPassword reset complete!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

resetPassword();
