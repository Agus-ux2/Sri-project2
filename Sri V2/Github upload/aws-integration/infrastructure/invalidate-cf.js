const { execSync } = require('child_process');
const result = execSync(
    'aws cloudfront create-invalidation --distribution-id E21QO1TPFVEQUS --paths "/*"',
    { env: { ...process.env, AWS_PAGER: '' }, encoding: 'utf-8' }
);
console.log(result);
