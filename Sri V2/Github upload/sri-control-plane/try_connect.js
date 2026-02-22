const { Client } = require('pg');

const passwords = [
    'postgres',
    'admin',
    'password',
    '1234',
    '12345',
    'root',
    'sri',
    'master',
    'welcome'
];

async function testConnection() {
    console.log('Testing common passwords for user "postgres"...');

    for (const password of passwords) {
        const client = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres', // Connect to default db first
            password: password,
            port: 5432,
        });

        try {
            await client.connect();
            console.log(`\nSUCCESS! Password found: "${password}"`);
            await client.end();
            process.exit(0);
        } catch (err) {
            process.stdout.write('.');
            await client.end();
        }
    }

    console.log('\n\nFailed to find password in common list.');
    process.exit(1);
}

testConnection();
