const https = require('https');
const fs = require('fs');
const path = require('path');

const logos = {
    'cargill.svg': 'https://upload.wikimedia.org/wikipedia/commons/3/30/Cargill_logo.svg',
    'ldc.svg': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Louis_dreyfus_logo.svg',
    'bunge.svg': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Bunge_Limited_Logo.svg',
    'cofco.png': 'https://www.cofcointernational.com/assets/img/logo-cofco.png',
    'fyo.png': 'https://www.fyo.com/wp-content/uploads/2021/08/logo-fyo.png',
    'aca.png': 'https://www.acacoop.com.ar/images/logo.png'
};

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (u) => {
            const protocol = u.startsWith('https') ? https : require('http');
            protocol.get(u, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }, response => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    request(response.headers.location);
                    return;
                }
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to get '${u}' (${response.statusCode})`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }).on('error', err => {
                fs.unlink(dest, () => { });
                reject(err);
            });
        };
        request(url);
    });
};

async function run() {
    const dir = path.join(__dirname, 'public', 'images', 'logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (const [name, url] of Object.entries(logos)) {
        console.log(`Downloading ${name}...`);
        try {
            await download(url, path.join(dir, name));
            console.log(`Success: ${name}`);
        } catch (e) {
            console.error(`Error: ${name} - ${e.message}`);
        }
    }
}

run();
