// backend/scripts/open-provider.js
const { chromium } = require("playwright");
const fetch = require('node-fetch');
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

const DASHBOARD_URLS = {
    cargill: "https://argentina.cargill.com/es/documentos"
};

// read CLI args
const args = {};
process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, ...valueParts] = arg.replace(/^--/, '').split('=');
        const value = valueParts.join('=');
        if (key && value) {
            args[key] = value;
        }
    }
});

async function main() {
    const provider = args.provider;
    const email = args.email;

    if (!provider || !email) {
        console.error("USAGE: node open-provider.js --provider=cargill --email=user@mail.com --token=JWT");
        process.exit(1);
    }

    const loginUrl = PROVIDER_URLS[provider];
    if (!loginUrl) {
        console.error("Unknown provider: " + provider);
        process.exit(1);
    }

    console.log("🌐 Opening login page for:", provider);
    console.log("🛠️ Launching Chromium (Headless: FALSE)...");

    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const ctx = await browser.newContext({ viewport: null });

    // --- SESSION RESTORATION LOGIC ---
    try {
        console.log(`🔍 Checking for existing session cache for ${provider}...`);
        const sessionRes = await fetch(`${SERVER_URL}/api/providers/session/${provider}`, {
            headers: { "Authorization": `Bearer ${args.token}` }
        });

        if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.success && Array.isArray(sessionData.cookies) && sessionData.cookies.length > 0) {
                console.log(`🍪 Found ${sessionData.cookies.length} cached cookies. Restoring session...`);

                const cleanCookies = sessionData.cookies.map(c => {
                    const { sameSite, ...rest } = c;
                    let validSameSite = undefined;
                    if (sameSite === 'Strict' || sameSite === 'Lax' || sameSite === 'None') validSameSite = sameSite;
                    return { ...rest, sameSite: validSameSite };
                });

                await ctx.addCookies(cleanCookies);
                console.log("✅ Session restored! Navigating as authenticated user.");
            } else {
                console.log("ℹ️ No valid cache found. Starting fresh login.");
            }
        }
    } catch (err) {
        console.error("⚠️ Failed to restore session:", err.message);
    }

    const page = await ctx.newPage();

    console.log("➡ Navigate:", loginUrl);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    if (provider === 'cargill') {
        try {
            console.log("🕵️ Checking if session is active...");
            const isLoggedIn = await page.evaluate(() => {
                return !!(document.querySelector('.user-name') ||
                    document.querySelector('.username') ||
                    document.querySelector('a[href*="logout"]'));
            });

            if (isLoggedIn) {
                console.log("✅ CACHE HIT: Detected active session!");
                if (DASHBOARD_URLS[provider]) {
                    console.log("🚀 Auto-navigating to dashboard/documents...");
                    await page.goto(DASHBOARD_URLS[provider]);
                }
            } else {
                console.log("ℹ️ Cache miss or expired. Please login manually.");
            }
        } catch (e) {
            console.log("⚠️ Could not verify session status automatically.");
        }
    }

    // Exponer función para guardar desde el navegador
    await page.exposeFunction('saveAndClose', async () => {
        console.log("📥 User requested save. Capturing cookies...");
        const cookies = await ctx.cookies();

        console.log("➡ Sending cookies to backend...");
        try {
            const response = await fetch(`${SERVER_URL}/api/providers/save-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${args.token}`
                },
                body: JSON.stringify({ provider, cookies })
            });
            console.log("✅ Session saved:", await response.text());
        } catch (e) {
            console.error("❌ Error saving session:", e);
        }

        console.log("🔚 Closing browser...");
        await browser.close();
        process.exit(0);
    });

    // Inyectar botón flotante
    await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
            const btn = document.createElement('button');
            btn.innerText = "💾 GUARDAR CONEXIÓN";
            btn.style.position = "fixed";
            btn.style.bottom = "20px";
            btn.style.right = "20px";
            btn.style.zIndex = "99999";
            btn.style.padding = "15px 25px";
            btn.style.backgroundColor = "#28a745";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.borderRadius = "50px";
            btn.style.fontWeight = "bold";
            btn.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "16px";
            btn.onclick = () => window.saveAndClose();
            document.body.appendChild(btn);
        });
    });

    // --- NUEVO: INTERCEPTAR DESCARGAS CON SINCRONIZACIÓN INTELIGENTE ---
    console.log("📥 Activando interceptor de descargas...");
    page.on('download', async (download) => {
        console.log(`⬇ Detectada descarga: ${download.suggestedFilename()}`);
        const FileSync = require('../utils/file-sync');
        const uploadDir = path.join(__dirname, '../uploads');
        const tempPath = path.join(uploadDir, `temp_${Date.now()}_${download.suggestedFilename()}`);

        try {
            await download.saveAs(tempPath);
            const syncResult = FileSync.checkAndSync(tempPath, uploadDir);

            if (syncResult.action === 'skip') {
                console.log(`ℹ️ Archivo omitido (ya existe y pesa lo mismo): ${download.suggestedFilename()}`);
            } else if (syncResult.action === 'update') {
                console.log(`🔄 Archivo actualizado (distinto tamaño): ${download.suggestedFilename()}`);
                // Aquí podrías disparar el re-análisis OCR
            } else {
                console.log(`✅ Nuevo archivo capturado: ${download.suggestedFilename()}`);
                // Aquí disparas el primer análisis OCR
            }
        } catch (e) {
            console.error("❌ Error en sincronización de descarga:", e);
        }
    });

    // Auto-login para Cargill
    if (provider === 'cargill') {
        console.log("🤖 Intentando Auto-Login para Cargill...");
        try {
            await page.waitForTimeout(3000);

            const userSelector = 'input[name="username"], input[id="username"], input[type="email"]';
            const passSelector = 'input[name="password"], input[id="password"], input[type="password"]';

            if (await page.$(userSelector)) {
                await page.fill(userSelector, "f.dearteche@edjulia.com.ar");
                if (await page.$(passSelector)) {
                    await page.fill(passSelector, "Julia2021");
                    const btnSelector = 'button[type="submit"], input[type="submit"], #kc-login';
                    if (await page.$(btnSelector)) {
                        await page.click(btnSelector);
                    }
                }
            }
        } catch (err) {
            console.log("⚠️ No se pudo autocompletar:", err.message);
        }
    }

    // Mantener activo
    setInterval(() => { }, 1000);
    browser.on('disconnected', () => {
        process.exit(0);
    });
}
main().catch(async (err) => {
    console.error("CRITICAL ERROR IN MAIN:", err);
    console.error("\nStack trace:", err.stack);
    console.log("\n\n==================================================");
    console.log("ERROR DETECTADO - Presiona ENTER para cerrar...");
    console.log("==================================================");

    // Esperar a que el usuario presione Enter
    process.stdin.resume();
    process.stdin.once('data', () => {
        process.exit(1);
    });
});
