const http = require('http');

const urls = [
    'http://localhost:3000/images/logos/cargill.png',
    'http://localhost:3000/images/logos/ldc.png',
    'http://localhost:3000/images/logos/bunge.png',
    'http://localhost:3000/images/logos/aca.png'
];

urls.forEach(url => {
    http.get(url, (res) => {
        console.log(`${url} - Status: ${res.statusCode} - Content-Length: ${res.headers['content-length']}`);
    }).on('error', (err) => {
        console.error(`${url} - Error: ${err.message}`);
    });
});
