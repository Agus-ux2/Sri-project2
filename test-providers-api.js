// Quick test to check providers API response
const fetch = require('node-fetch');

async function testProvidersAPI() {
    try {
        // First login to get token
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'agustin@sri.com.ar',
                password: 'Sripass2024!'
            })
        });

        const loginData = await loginRes.json();
        console.log('✅ Login response:', JSON.stringify(loginData, null, 2));

        if (!loginData.token) {
            console.error('❌ No token received');
            return;
        }

        // Now call providers/list with the token
        const providersRes = await fetch('http://localhost:3000/api/providers/list', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
            }
        });

        const providersData = await providersRes.json();
        console.log('\n📋 Providers response:', JSON.stringify(providersData, null, 2));
        console.log('\n📊 Connected providers count:', providersData.providers?.length || 0);

        if (providersData.providers) {
            providersData.providers.forEach(p => {
                console.log(`  ✅ ${p.provider} connected`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testProvidersAPI();
