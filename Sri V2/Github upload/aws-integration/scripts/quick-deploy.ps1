# SRI Control Plane - Quick Deploy (Windows)
# This script sets up environment and runs the full deploy

Write-Host "🔧 SRI Control Plane Quick Setup" -ForegroundColor Cyan
Write-Host ""

# Prompt for values if not set
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = Read-Host "Enter DATABASE_URL (postgresql://user:pass@host:5432/db)"
}

if (-not $env:VPC_ID) {
    $env:VPC_ID = Read-Host "Enter VPC_ID (vpc-xxx)"
}

if (-not $env:PRIVATE_SUBNET_1) {
    $env:PRIVATE_SUBNET_1 = Read-Host "Enter PRIVATE_SUBNET_1 (subnet-xxx)"
}

if (-not $env:PRIVATE_SUBNET_2) {
    $env:PRIVATE_SUBNET_2 = Read-Host "Enter PRIVATE_SUBNET_2 (subnet-xxx)"
}

if (-not $env:COGNITO_USER_POOL_ARN) {
    $env:COGNITO_USER_POOL_ARN = Read-Host "Enter COGNITO_USER_POOL_ARN (arn:aws:cognito-idp:...)"
}

if (-not $env:AWS_REGION) {
    $env:AWS_REGION = Read-Host "Enter AWS_REGION (default: us-east-1)"
    if (-not $env:AWS_REGION) { $env:AWS_REGION = "us-east-1" }
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL: $($env:DATABASE_URL.Substring(0, [Math]::Min(30, $env:DATABASE_URL.Length)))..."
Write-Host "  VPC_ID: $($env:VPC_ID)"
Write-Host "  PRIVATE_SUBNET_1: $($env:PRIVATE_SUBNET_1)"
Write-Host "  PRIVATE_SUBNET_2: $($env:PRIVATE_SUBNET_2)"
Write-Host "  COGNITO_USER_POOL_ARN: $($env:COGNITO_USER_POOL_ARN.Substring(0, [Math]::Min(40, $env:COGNITO_USER_POOL_ARN.Length)))..."
Write-Host "  AWS_REGION: $($env:AWS_REGION)"
Write-Host ""

$confirm = Read-Host "Proceed with deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Run main deploy script
& "$PSScriptRoot\deploy.ps1"
