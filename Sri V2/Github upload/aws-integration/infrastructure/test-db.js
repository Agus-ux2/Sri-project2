const { Client } = require('pg');

const config = {
    host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
    user: 'sri_admin',
    password: 'Stich2009!',
    port: 5432,
    database: 'sri2026db', // Will test this first
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
};

async function testConnection() {
    console.log('Testing connection to:', config.host);
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected successfully to database:', config.database);
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.message.includes('does not exist')) {
            console.log('Try connecting to default "postgres" database...');
            await testDefaultDB();
        }
    }
}

async function testDefaultDB() {
    const defaultConfig = { ...config, database: 'postgres' };
    const client = new Client(defaultConfig);
    try {
        await client.connect();
        console.log('Connected successfully to database: postgres');
        // List databases
        const res = await client.query('SELECT datname FROM pg_database');
        console.log('Databases available:', res.rows.map(r => r.datname));
        await client.end();
    } catch (err) {
        console.error('Failed to connect to postgres DB:', err.message);
    }
}

testConnection();
