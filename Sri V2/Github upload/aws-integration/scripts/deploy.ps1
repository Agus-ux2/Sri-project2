# SRI Control Plane - Deploy Script (Windows)
# Usage: .\deploy.ps1 [-Stage prod]

param(
    [string]$Stage = "prod"
)

$ErrorActionPreference = "Stop"
$StackName = "sri-control-plane-$Stage"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

Write-Host "🚀 Deploying SRI Control Plane to $Stage..." -ForegroundColor Cyan

# Check for required environment variables
$requiredVars = @{
    "DATABASE_URL" = $env:DATABASE_URL
    "VPC_ID" = $env:VPC_ID
    "PRIVATE_SUBNET_1" = $env:PRIVATE_SUBNET_1
    "PRIVATE_SUBNET_2" = $env:PRIVATE_SUBNET_2
    "COGNITO_USER_POOL_ARN" = $env:COGNITO_USER_POOL_ARN
}

$missingVars = @()
foreach ($var in $requiredVars.GetEnumerator()) {
    if (-not $var.Value) {
        $missingVars += $var.Key
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Set them using:" -ForegroundColor White
    Write-Host '  $env:DATABASE_URL = "postgresql://user:pass@host:5432/db"'
    Write-Host '  $env:VPC_ID = "vpc-xxx"'
    Write-Host '  $env:PRIVATE_SUBNET_1 = "subnet-xxx"'
    Write-Host '  $env:PRIVATE_SUBNET_2 = "subnet-xxx"'
    Write-Host '  $env:COGNITO_USER_POOL_ARN = "arn:aws:cognito-idp:..."'
    exit 1
}

# Build each Lambda
Write-Host "📦 Building Lambda functions..." -ForegroundColor Yellow

$lambdasPath = Join-Path $PSScriptRoot "..\lambdas"
$lambdaDirs = Get-ChildItem -Path $lambdasPath -Directory

foreach ($dir in $lambdaDirs) {
    Write-Host "  Building $($dir.Name)..." -ForegroundColor Gray
    Push-Location $dir.FullName
    try {
        npm install --silent 2>$null
        npm run build --silent 2>$null
    } finally {
        Pop-Location
    }
}

# Build Prisma Layer
Write-Host "📦 Building Prisma Layer..." -ForegroundColor Yellow
$prismaLayerPath = Join-Path $PSScriptRoot "..\layers\prisma-layer"
Push-Location $prismaLayerPath
try {
    npm install --silent 2>$null
    npx prisma generate 2>$null
    
    $nodejsPath = Join-Path $prismaLayerPath "nodejs\node_modules"
    if (-not (Test-Path $nodejsPath)) {
        New-Item -ItemType Directory -Path $nodejsPath -Force | Out-Null
    }
    
    Copy-Item -Path "node_modules\@prisma" -Destination "nodejs\node_modules\" -Recurse -Force
    if (Test-Path "node_modules\.prisma") {
        Copy-Item -Path "node_modules\.prisma" -Destination "nodejs\node_modules\" -Recurse -Force
    }
} finally {
    Pop-Location
}

# SAM build
Write-Host "🔧 Running SAM build..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "..")
try {
    sam build --use-container 2>&1 | Write-Host
} finally {
    Pop-Location
}

# SAM deploy
Write-Host "☁️ Deploying to AWS..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "..")
try {
    sam deploy `
        --stack-name $StackName `
        --region $Region `
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND `
        --parameter-overrides `
            "DatabaseUrl=$($env:DATABASE_URL)" `
            "VpcId=$($env:VPC_ID)" `
            "PrivateSubnet1=$($env:PRIVATE_SUBNET_1)" `
            "PrivateSubnet2=$($env:PRIVATE_SUBNET_2)" `
            "CognitoUserPoolArn=$($env:COGNITO_USER_POOL_ARN)" `
        --no-confirm-changeset `
        --no-fail-on-empty-changeset 2>&1 | Write-Host
} finally {
    Pop-Location
}

# Get outputs
Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Stack Outputs:" -ForegroundColor Cyan

aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query 'Stacks[0].Outputs' `
    --output table
