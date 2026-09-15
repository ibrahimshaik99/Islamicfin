# Cloudflare Deployment Setup - Islamic Community Platform
# Run this script to deploy the full stack

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Islamic Community Platform - Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

try {
    $wrangler = npx wrangler --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "wrangler not found" }
    Write-Host "  Wrangler: OK" -ForegroundColor Green
} catch {
    Write-Host "  Installing wrangler..." -ForegroundColor Yellow
    npm install -g wrangler
}

try {
    node --version | Out-Null
    Write-Host "  Node.js: OK" -ForegroundColor Green
} catch {
    Write-Host "  Node.js not found! Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

try {
    pnpm --version | Out-Null
    Write-Host "  pnpm: OK" -ForegroundColor Green
} catch {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Step 2: Login to Cloudflare
Write-Host "`n[2/7] Cloudflare Login..." -ForegroundColor Yellow
Write-Host "  A browser window will open. Please log in." -ForegroundColor Gray
npx wrangler login

# Step 3: Create R2 bucket
Write-Host "`n[3/7] Creating R2 storage bucket..." -ForegroundColor Yellow
try {
    npx wrangler r2 bucket create icp-storage 2>&1
    Write-Host "  R2 bucket 'icp-storage' created" -ForegroundColor Green
} catch {
    Write-Host "  R2 bucket may already exist, continuing..." -ForegroundColor Gray
}

# Step 4: Set up database secrets
Write-Host "`n[4/7] Setting production secrets..." -ForegroundColor Yellow
Write-Host "  Enter your Neon DATABASE_URL when prompted" -ForegroundColor Gray
Write-Host "  (Format: postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require)" -ForegroundColor Gray

$dbUrl = Read-Host "  DATABASE_URL"
$sessionSecret = -join ((1..64) | ForEach-Object { '{0}' -f ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' | Get-Random -Count 1) })

Write-Host "  Setting DATABASE_URL secret..." -ForegroundColor Gray
$dbUrl | npx wrangler secret put DATABASE_URL --env production 2>&1

Write-Host "  Setting SESSION_SECRET..." -ForegroundColor Gray
$sessionSecret | npx wrangler secret put SESSION_SECRET --env production 2>&1

Write-Host "  Secrets configured!" -ForegroundColor Green

# Step 5: Deploy API
Write-Host "`n[5/7] Deploying API to Cloudflare Workers..." -ForegroundColor Yellow
cd packages/api
npx wrangler deploy --env production
$apiUrl = npx wrangler tail --format json 2>&1 | Select-Object -First 1
cd ../..

Write-Host "  API deployed!" -ForegroundColor Green

# Step 6: Deploy Frontend
Write-Host "`n[6/7] Deploying Frontend to Cloudflare Pages..." -ForegroundColor Yellow
cd packages/web
pnpm build
npx wrangler pages deploy dist --project-name=icp-frontend --branch=production
cd ../..

Write-Host "  Frontend deployed!" -ForegroundColor Green

# Step 7: Update _worker.js with API URL
Write-Host "`n[7/7] Updating API proxy configuration..." -ForegroundColor Yellow
Write-Host "  Note: Update packages/web/public/_worker.js with your actual Workers URL" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend: https://icp-frontend.pages.dev" -ForegroundColor White
Write-Host "  API:      https://icp-api.<your-subdomain>.workers.dev" -ForegroundColor White
Write-Host ""
Write-Host "  All 4 dashboards are accessible at the same URL:" -ForegroundColor White
Write-Host "    /signin        - Login page" -ForegroundColor Gray
Write-Host "    /admin         - Super Admin dashboard" -ForegroundColor Gray
Write-Host "    /community     - Community dashboard" -ForegroundColor Gray
Write-Host "    /merchant      - Merchant dashboard" -ForegroundColor Gray
Write-Host "    /app           - Customer PWA" -ForegroundColor Gray
