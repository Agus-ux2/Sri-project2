const { execSync } = require('child_process');
const fs = require('fs');

const REGION = 'us-east-2';
const NEW_DATABASE_URL = 'postgresql://sri_admin:SriAdmin2026!@sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require';

function aws(cmd) {
    return execSync(cmd, { env: { ...process.env, AWS_PAGER: '' }, encoding: 'utf-8' }).trim();
}

// 1. List all functions
console.log('Listing Lambda functions...');
const names = JSON.parse(aws(`aws lambda list-functions --region ${REGION} --query "Functions[].FunctionName" --output json`));
const sriLambdas = names.filter(f => f.startsWith('sri-'));
console.log('SRI Lambdas:', sriLambdas);

let updated = 0;
for (const fn of sriLambdas) {
    // 2. Get current env vars
    const raw = aws(`aws lambda get-function-configuration --function-name ${fn} --region ${REGION} --output json`);
    const config = JSON.parse(raw);
    const vars = config.Environment?.Variables || {};

    if (!vars.DATABASE_URL) {
        console.log(`\n[SKIP] ${fn} — no DATABASE_URL`);
        continue;
    }

    console.log(`\n[UPDATE] ${fn}`);
    console.log(`  Old: ${vars.DATABASE_URL.substring(0, 40)}...`);

    // 3. Patch DATABASE_URL
    vars.DATABASE_URL = NEW_DATABASE_URL;

    // 4. Write env to temp file (avoids shell escaping issues)
    const envPayload = JSON.stringify({ Variables: vars });
    const tmpFile = `tmp-env-${fn}.json`;
    fs.writeFileSync(tmpFile, envPayload, 'utf-8');

    // 5. Update Lambda
    aws(`aws lambda update-function-configuration --function-name ${fn} --region ${REGION} --environment file://${tmpFile}`);
    console.log(`  New: ${NEW_DATABASE_URL.substring(0, 40)}...`);
    console.log(`  -> Updated!`);

    // Cleanup
    fs.unlinkSync(tmpFile);
    updated++;
}

console.log(`\nDone! Updated ${updated} Lambdas.`);
