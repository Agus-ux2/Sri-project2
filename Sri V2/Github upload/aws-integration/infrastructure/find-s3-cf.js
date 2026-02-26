const { execSync } = require('child_process');
function aws(cmd) { return execSync(cmd, { env: { ...process.env, AWS_PAGER: '' }, encoding: 'utf-8' }).trim(); }

// Find S3 bucket
console.log('Looking for SRI S3 bucket...');
const buckets = JSON.parse(aws('aws s3api list-buckets --query "Buckets[].Name" --output json'));
const sriBucket = buckets.find(b => b.includes('sri') || b.includes('frontend') || b.includes('soluciones'));
console.log('All buckets:', buckets);
console.log('SRI bucket:', sriBucket);

// Find CloudFront distribution
console.log('\nLooking for CloudFront distribution...');
const dists = JSON.parse(aws('aws cloudfront list-distributions --query "DistributionList.Items[].{Id:Id,Domain:DomainName,Aliases:Aliases.Items[0],Origins:Origins.Items[0].DomainName}" --output json --region us-east-1'));
console.log('Distributions:', JSON.stringify(dists, null, 2));
