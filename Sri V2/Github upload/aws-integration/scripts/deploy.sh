#!/bin/bash
# SRI Control Plane - Deploy Script
# Usage: ./deploy.sh [stage]

set -e

STAGE=${1:-prod}
STACK_NAME="sri-control-plane-$STAGE"
REGION=${AWS_REGION:-us-east-1}

echo "🚀 Deploying SRI Control Plane to $STAGE..."

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required"
    exit 1
fi

if [ -z "$VPC_ID" ]; then
    echo "❌ VPC_ID is required"
    exit 1
fi

if [ -z "$PRIVATE_SUBNET_1" ] || [ -z "$PRIVATE_SUBNET_2" ]; then
    echo "❌ PRIVATE_SUBNET_1 and PRIVATE_SUBNET_2 are required"
    exit 1
fi

if [ -z "$COGNITO_USER_POOL_ARN" ]; then
    echo "❌ COGNITO_USER_POOL_ARN is required"
    exit 1
fi

# Build each Lambda
echo "📦 Building Lambda functions..."

cd lambdas

for dir in */; do
    echo "  Building $dir..."
    cd "$dir"
    npm install
    npm run build
    cd ..
done

cd ..

# Build Prisma Layer
echo "📦 Building Prisma Layer..."
cd layers/prisma-layer
npm install
npx prisma generate
mkdir -p nodejs/node_modules
cp -r node_modules/@prisma nodejs/node_modules/
cp -r node_modules/.prisma nodejs/node_modules/
cd ../..

# SAM build
echo "🔧 Running SAM build..."
sam build --use-container

# SAM deploy
echo "☁️ Deploying to AWS..."
sam deploy \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
    --parameter-overrides \
        DatabaseUrl="$DATABASE_URL" \
        VpcId="$VPC_ID" \
        PrivateSubnet1="$PRIVATE_SUBNET_1" \
        PrivateSubnet2="$PRIVATE_SUBNET_2" \
        CognitoUserPoolArn="$COGNITO_USER_POOL_ARN" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get outputs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --output table
