# Cloudflare Deployment Guide - Islamic Community Platform

## Architecture

```
Browser → Cloudflare Pages (SPA) → _worker.js proxy → Cloudflare Workers (API) → Neon PostgreSQL
```

All running on Cloudflare's free tier: **$0/month** for up to 1000+ users.

---

## Step 1: Prerequisites

1. **Cloudflare Account** (free): https://dash.cloudflare.com/sign-up
2. **Neon Account** (free): https://neon.tech (already have DB)
3. **GitHub Account**: https://github.com
4. **Node.js 20+** and **pnpm** installed

---

## Step 2: Setup Cloudflare

### 2a. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2b. Login to Cloudflare
```bash
wrangler login
```
This opens a browser. Authorize the CLI.

### 2c. Create R2 Storage Bucket (for future file uploads)
```bash
wrangler r2 bucket create icp-storage
```

---

## Step 3: Deploy API (Cloudflare Workers)

```bash
cd packages/api

# Set production secrets (never commit these!)
echo "postgresql://your-neon-url" | wrangler secret put DATABASE_URL --env production
echo "your-random-64-char-secret" | wrangler secret put SESSION_SECRET --env production

# Deploy to Workers
wrangler deploy --env production
```

Your API will be at: `https://icp-api.<your-subdomain>.workers.dev`

**Note the URL** - you'll need it for the frontend proxy.

---

## Step 4: Deploy Frontend (Cloudflare Pages)

```bash
cd packages/web

# Build
pnpm build

# Deploy to Pages
wrangler pages deploy dist --project-name=icp-frontend --branch=production
```

Your frontend will be at: `https://icp-frontend.pages.dev`

---

## Step 5: Connect Frontend to API

After deploying the API, update `packages/web/public/_worker.js`:

```javascript
// Replace this line:
apiUrl.hostname = env.API_HOST || 'icp-api.islamic-community-platform.workers.dev';

// With your actual Workers URL:
apiUrl.hostname = 'icp-api.your-subdomain.workers.dev';
```

Then redeploy:
```bash
cd packages/web
pnpm build
wrangler pages deploy dist --project-name=icp-frontend --branch=production
```

---

## Step 6: Setup GitHub Actions CI/CD

### 6a. Push to GitHub
```bash
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/yourusername/islamic-community-platform.git
git push -u origin main
```

### 6b. Add GitHub Secrets
Go to: **GitHub repo → Settings → Secrets and variables → Actions**

Add these secrets:
| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | Random 64+ char string |

### 6c. Get Cloudflare API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Use "Cloudflare Pages" template
3. Add Workers permissions too
4. Copy the token

---

## Step 7: Access All 4 Dashboards

Once deployed, all dashboards are on the **same URL**:

| Dashboard | URL | Access |
|-----------|-----|--------|
| **Landing** | `https://icp-frontend.pages.dev/` | Public |
| **Login** | `https://icp-frontend.pages.dev/signin` | Public |
| **Super Admin** | `https://icp-frontend.pages.dev/admin` | SUPER_ADMIN role |
| **Community** | `https://icp-frontend.pages.dev/community` | COMMUNITY_OWNER role |
| **Merchant** | `https://icp-frontend.pages.dev/merchant` | MERCHANT role |
| **Customer PWA** | `https://icp-frontend.pages.dev/app` | CUSTOMER role |

### URLs to Share:

**For Community Owners:**
```
https://icp-frontend.pages.dev/signup
```
→ Register → Wait for admin approval → Create/join community

**For Merchants:**
```
https://icp-frontend.pages.dev/signin
```
→ Login → Join community → Apply as merchant → Wait for approval

**For Customers/Users:**
```
https://icp-frontend.pages.dev/signup
```
→ Register → Join community → Browse marketplace

---

## Cost Breakdown (Free Tier)

| Service | Free Tier Limit | Est. Usage (1000 users) |
|---------|----------------|------------------------|
| Cloudflare Pages | 500 builds/mo, unlimited requests | ~50 builds, ~50k req/day |
| Cloudflare Workers | 100k req/day, 10ms CPU | ~20k req/day |
| Neon PostgreSQL | 0.5 GB storage, 24/7 compute | ~100 MB |
| **Total** | | **$0/month** |

---

## Monitoring

```bash
# View API logs in real-time
wrangler tail --env production

# View in Cloudflare Dashboard
# https://dash.cloudflare.com → Workers & Pages → icp-api
```

---

## Updating (After Bug Fixes)

```bash
# Push changes to GitHub
git add .
git commit -m "fix: description"
git push

# GitHub Actions auto-deploys to Cloudflare!
```

Or manual deploy:
```bash
# API
cd packages/api && wrangler deploy --env production

# Frontend
cd packages/web && pnpm build && wrangler pages deploy dist --project-name=icp-frontend --branch=production
```

---

## Custom Domain (Optional)

1. Buy a domain (e.g., `islamiccommunity.com`)
2. Add it to Cloudflare (free DNS)
3. In Cloudflare Pages → Custom domains → Add
4. Your app is now at `https://islamiccommunity.com`
