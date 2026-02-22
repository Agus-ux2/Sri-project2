const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3010/api';

async function test() {
    const email = `test_${Date.now()}@example.com`;
    try {
        console.log('1. Registering...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: email,
            password: 'Password123!',
            name: 'Verifier',
            company: 'VerifyCorp',
            username: 'verifier',
            zones: []
        });
        const token = regRes.data.token;
        console.log('✓ Registered and token obtained:', token.substring(0, 20) + '...');

        console.log('2. Uploading dummy.pdf...');
        const form = new FormData();
        form.append('file', fs.createReadStream(path.join(__dirname, 'dummy.pdf')));

        const uploadRes = await axios.post(`${API_URL}/documents/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✓ Upload successful:', uploadRes.data);
        const docId = uploadRes.data.document.id;
        console.log(`✓ Document ID: ${docId}`);
        console.log('3. Polling for completion...');

        // Poll for status
        let attempts = 0;
        const maxAttempts = 20;
        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s

            // Assuming we have a way to list documents or get by ID
            // Ideally GET /documents returns a list
            const listRes = await axios.get(`${API_URL}/documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const doc = listRes.data.documents.find(d => d.id === docId);
            if (doc) {
                console.log(`   Attempt ${attempts}: Status = ${doc.ocr_status}`);
                if (doc.ocr_status === 'completed') {
                    console.log('✓ SUCCESS: Document processed successfully!');
                    console.log('   Metadata:', JSON.stringify(doc.metadata, null, 2));
                    return;
                } else if (doc.ocr_status === 'failed') {
                    console.error('❌ FAILURE: Document processing failed.');
                    process.exit(1);
                }
            }
        }
        console.error('❌ TIMEOUT: Document processing took too long.');
        process.exit(1);

    } catch (error) {
        console.error('Test failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
        process.exit(1);
    }
}

test();
