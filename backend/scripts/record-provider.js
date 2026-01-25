/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RECORD PROVIDER - Puente con Playwright Codegen
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Uso: node backend/scripts/record-provider.js --provider=cargill --token=JWT
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const PROVIDER_URLS = {
    cargill: "https://www.mycargill.com/cascsa/v2/login",
    ldc: "https://mildc.com/webportal",
    bunge: "https://operacionesbasa.bunge.ar/operacionesbasa/",
    cofco: "https://ar.cofcointernational.com/acceso-clientes",
    fyo: "https://www.fyodigital.com",
    aca: "https://www.acabase.com.ar/index.asp#"
};

// CLI args
const args = {};
process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.replace(/^--/, '').split('=');
        args[key] = value;
    }
});

async function main() {
    const { provider, token } = args;

    if (!provider || !token) {
        console.error("❌ USO: node record-provider.js --provider=nombre --token=JWT");
        process.exit(1);
    }

    const url = PROVIDER_URLS[provider];
    if (!url) {
        console.error(`❌ Proveedor desconocido: ${provider}`);
        process.exit(1);
    }

    console.log(`🔍 Obteniendo sesión de ${provider} desde el backend...`);

    try {
        const res = await fetch(`${SERVER_URL}/api/providers/session/${provider}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("No se pudo obtener la sesión (¿Token expirado?)");

        const session = await res.json();
        if (!session.success || !session.cookies) throw new Error("No hay sesión guardada para este proveedor.");

        // Crear Storage State para Playwright
        const storageState = {
            cookies: session.cookies.map(c => {
                const { sameSite, ...rest } = c;
                let validSameSite = "Lax"; // Default seguro
                if (sameSite === 'Strict' || sameSite === 'Lax' || sameSite === 'None') validSameSite = sameSite;
                return { ...rest, sameSite: validSameSite };
            }),
            origins: []
        };

        const statePath = path.join(__dirname, `../../storage/state_${provider}.json`);
        fs.writeFileSync(statePath, JSON.stringify(storageState, null, 2));

        console.log(`✅ Sesión cargada. Lanzando grabador para ${provider}...`);
        console.log(`🚀 TIP: Realizá los clics de descarga y cerrá el navegador al terminar.`);
        console.log(`📁 El código se mostrará en la ventana de Codegen.`);

        // Lanzar Codegen
        // Nota: En Windows usamos npx directamente
        execSync(`npx playwright codegen --load-storage="${statePath}" ${url}`, { stdio: 'inherit' });

        console.log(`\n✨ Grabación finalizada. Podés guardar el código generado en backend/automation/${provider}_sync.js`);

        // Limpiar archivo temporal si deseás
        // fs.unlinkSync(statePath);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

main();
