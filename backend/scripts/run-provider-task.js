// backend/scripts/run-provider-task.js
// Ejecutar: node backend/scripts/run-provider-task.js --provider=cargill --email=demo@campo.com

const { chromium } = require("playwright");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const PROVIDER_URLS = {
    cargill: "https://www.mycargill.com/cascsa/v2/login",
    ldc: "https://mildc.com/webportal",
    bunge: "https://operacionesbasa.bunge.ar/operacionesbasa/",
    cofco: "https://agdxez8jd.accounts.ondemand.com/saml2/idp/sso/agdxez8jd.accounts.ondemand.com",
    fyo: "https://www.fyodigital.com",
    aca: "https://www.acabase.com.ar/index.asp#"
};

// CLI args
const args = Object.fromEntries(
    process.argv.slice(2).map(x => x.replace("--", "").split("="))
);

async function main() {
    const provider = args.provider;
    const email = args.email;

    if (!provider) {
        console.error("❌ No provider specified. Use --provider=name");
        process.exit(1);
    }

    console.log("⚡ Fetching stored cookies for provider:", provider);

    try {
        const session = await fetch(`${SERVER_URL}/api/providers/session/${provider}`, {
            headers: { "Authorization": `Bearer ${process.env.USER_JWT}` }
        }).then(r => r.json());

        if (!session.success) {
            console.error("❌ No stored session found or unauthorized.");
            process.exit(1);
        }

        const cookies = session.cookies;

        const browser = await chromium.launch({ headless: false });
        const ctx = await browser.newContext();

        // Restore cookies
        await ctx.addCookies(cookies);

        const page = await ctx.newPage();
        await page.goto(PROVIDER_URLS[provider], { waitUntil: "domcontentloaded" });

        console.log("🟢 Logged in using stored cookies.");

        // TODO: scraping logic
        console.log("⚠️ Add scraping logic here...");

        // Mantener abierto para debug o cerrar si es automático
        // await browser.close();
    } catch (error) {
        console.error("❌ Execution failed:", error.message);
        process.exit(1);
    }
}

main();
