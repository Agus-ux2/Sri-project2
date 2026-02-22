const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://sri:sri@localhost:5432/postgres'
});

async function run() {
    console.log('Attempting to connect with: postgres:**redacted**...');
    try {
        await client.connect();
        console.log('✅ Connection SUCCESSFUL!');
        await client.end();
    } catch (e) {
        console.error('❌ Connection FAILED:', e.message);
    }
}

run();
