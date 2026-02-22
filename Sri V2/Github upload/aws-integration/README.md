# SRI Control Plane - AWS Integration

## Overview

This directory contains the AWS Lambda functions and infrastructure for the SRI Grain Quality System.

## Deployed Backend (Prod)

**API URL:** `https://av580yf5w8.execute-api.us-east-2.amazonaws.com/prod/`
**Region:** `us-east-2`

## Directory Structure

```
aws-integration/
├── lambdas/
│   ├── settlements-upload/     # POST /settlements/upload
│   ├── settlements-list/       # GET /settlements
│   ├── settlements-detail/     # GET /settlements/:id
│   ├── settlements-recalculate/# POST /settlements/:id/recalculate
│   └── quality-calculate/      # GET /ctgs/:ctgNumber/quality
├── layers/
│   └── prisma-layer/           # Prisma Client for Lambda
├── infrastructure/
│   └── template.yaml           # SAM template
└── scripts/
    └── deploy.sh               # Deployment script
```

## Prerequisites

1. AWS CLI configured (`aws configure`)
2. SAM CLI installed (`brew install aws-sam-cli` or equivalent)
3. Docker (for SAM build)
4. Environment variables set (see below)

## Environment Variables

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export VPC_ID="vpc-xxx"
export PRIVATE_SUBNET_1="subnet-xxx"
export PRIVATE_SUBNET_2="subnet-xxx"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:region:account:userpool/pool-id"
export AWS_REGION="us-east-1"
```

## Deployment

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh prod

# Deploy to staging
./scripts/deploy.sh staging
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /settlements/upload | Upload PDF for processing |
| GET | /settlements | List settlements with filters |
| GET | /settlements/{id} | Get settlement details |
| POST | /settlements/{id}/recalculate | Recalculate quality |
| GET | /ctgs/{ctgNumber}/quality | Get CTG quality info |

## Testing

```bash
# Upload a PDF
curl -X POST https://api.example.com/prod/settlements/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/pdf" \
  --data-binary @settlement.pdf

# List settlements
curl https://api.example.com/prod/settlements \
  -H "Authorization: Bearer $TOKEN"

# Get details
curl https://api.example.com/prod/settlements/uuid \
  -H "Authorization: Bearer $TOKEN"
```
