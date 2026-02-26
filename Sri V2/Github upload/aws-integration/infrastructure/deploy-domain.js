const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST_ID = 'E21QO1TPFVEQUS';
const REGION = 'us-east-1';
const FUNCTION_NAME = 'SRI-WWW-Redirect';

function aws(cmd) {
    console.log(`Running: ${cmd}`);
    return execSync(cmd, { env: { ...process.env, AWS_PAGER: '' }, encoding: 'utf-8' }).trim();
}

async function deploy() {
    try {
        // 1. Crear/Actualizar CloudFront Function
        console.log('--- Step 1: CloudFront Function ---');
        const functionCode = fs.readFileSync(path.join(__dirname, 'redirect.js'), 'utf-8');

        let etag;
        try {
            const desc = JSON.parse(aws(`aws cloudfront describe-function --name ${FUNCTION_NAME} --region ${REGION}`));
            etag = desc.ETag;
            console.log(`Function exists, updating... (ETag: ${etag})`);
            aws(`aws cloudfront update-function --name ${FUNCTION_NAME} --function-config "Comment='Redirect www to naked domain',Runtime='cloudfront-js-2.0'" --function-code "${Buffer.from(functionCode).toString('base64')}" --if-match ${etag} --region ${REGION}`);
        } catch (e) {
            console.log('Function does not exist, creating...');
            aws(`aws cloudfront create-function --name ${FUNCTION_NAME} --function-config "Comment='Redirect www to naked domain',Runtime='cloudfront-js-2.0'" --function-code "${Buffer.from(functionCode).toString('base64')}" --region ${REGION}`);
        }

        // 2. Publicar función
        console.log('\n--- Step 2: Publishing Function ---');
        const publishDesc = JSON.parse(aws(`aws cloudfront describe-function --name ${FUNCTION_NAME} --region ${REGION}`));
        aws(`aws cloudfront publish-function --name ${FUNCTION_NAME} --if-match ${publishDesc.ETag} --region ${REGION}`);

        // 3. Obtener config de distribución
        console.log('\n--- Step 3: Updating Distribution ---');
        const configOutput = JSON.parse(aws(`aws cloudfront get-distribution-config --id ${DIST_ID} --region ${REGION}`));
        const config = configOutput.DistributionConfig;
        const distEtag = configOutput.ETag;

        // 4. Modificar config (Aliases y FunctionAssociations)
        console.log('Modifying configuration...');

        // Agregar www alias si no existe
        if (!config.Aliases.Items.includes('www.solucionesruralesintegradas.com.ar')) {
            config.Aliases.Items.push('www.solucionesruralesintegradas.com.ar');
            config.Aliases.Quantity = config.Aliases.Items.length;
        }

        // Asociar función
        const functionArn = `arn:aws:cloudfront::248825820462:function/${FUNCTION_NAME}`;
        const associations = config.DefaultCacheBehavior.FunctionAssociations;
        const viewerRequest = associations.Items.find(a => a.EventType === 'viewer-request');

        if (viewerRequest) {
            viewerRequest.FunctionARN = functionArn;
        } else {
            associations.Items.push({
                FunctionARN: functionArn,
                EventType: 'viewer-request'
            });
            associations.Quantity = associations.Items.length;
        }

        // 5. Aplicar cambios
        fs.writeFileSync(path.join(__dirname, 'temp_config.json'), JSON.stringify(config));

        console.log('Applying distribution update...');
        aws(`aws cloudfront update-distribution --id ${DIST_ID} --distribution-config file://temp_config.json --if-match ${distEtag} --region ${REGION}`);

        console.log('\n✅ Deployment completed successfully!');
        console.log('Note: DNS CNAME record for www still needs to be created in Route53.');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.log(error.stderr);
    }
}

deploy();
