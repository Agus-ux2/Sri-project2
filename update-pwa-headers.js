// Script to add PWA headers to all dashboard HTML files
const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, 'public', 'dashboard');
const filesToUpdate = ['contracts.html', 'providers.html', 'upload.html'];

const pwaMetaTags = `    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover\">
    
    <!-- PWA Meta Tags -->
    <meta name=\"description\" content=\"Dashboard de auditoría forense y control de gestión para productores agropecuarios\">
    <meta name=\"theme-color\" content=\"#78b13f\">
    <meta name=\"mobile-web-app-capable\" content=\"yes\">
    <meta name=\"apple-mobile-web-app-capable\" content=\"yes\">
    <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\">
    <meta name=\"apple-mobile-web-app-title\" content=\"SRI Agro\">
    <link rel=\"manifest\" href=\"/manifest.json\">
    <link rel=\"apple-touch-icon\" href=\"/sri_pwa_icon.png\">`;

const mobileCSS = `    <link rel=\"stylesheet\" href=\"/assets/css/mobile-nav.css\">`;

const mobileScripts = `    <script src=\"/assets/js/mobile-nav.js\"></script>
    <script src=\"/assets/js/pwa-install.js\"></script>`;

filesToUpdate.forEach(file => {
    const filePath = path.join(dashboardDir, file);

    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace viewport meta tag
    content = content.replace(
        /<meta name="viewport" content="[^"]*">/,
        pwaMetaTags
    );

    // Add mobile CSS after base.css
    if (!content.includes('mobile-nav.css')) {
        content = content.replace(
            /(<link rel="stylesheet" href="\/assets\/css\/base\.css">)/,
            `$1\n${mobileCSS}`
        );
    }

    // Add mobile scripts before main script tag
    if (!content.includes('mobile-nav.js')) {
        content = content.replace(
            /(<script src="\/assets\/js\/session\.js"><\/script>)/,
            `$1\n${mobileScripts}`
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${file}`);
});

console.log('\nAll dashboard files updated with PWA support!');
