const { execSync } = require('child_process');
const result = execSync('aws lambda get-function-configuration --function-name sri-auth-handler --region us-east-2 --query "{FunctionName: FunctionName, LastModified: LastModified, CodeSize: CodeSize}" --output json', { env: { ...process.env, AWS_PAGER: '' }, encoding: 'utf-8' });
console.log(result);
