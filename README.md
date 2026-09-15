Therainwill
777ibrahimshaik777@gmail.com


# Islamic Community Platform

A multi-tenant SaaS platform for Islamic community centers and their members in India.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Hono on Cloudflare Workers (wrangler dev) |
| Database | PostgreSQL via Neon (Serverless) + Drizzle ORM |
| Package Manager | pnpm (monorepo workspaces) |

---

## Project Structure

```
islamic-community-platform/
├── packages/
│   ├── api/                  # Hono backend (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts      # Main app entry
│   │   │   ├── auth/         # Login, register, sessions, RBAC
│   │   │   ├── admin/        # Super Admin routes
│   │   │   ├── community/    # Community management
│   │   │   ├── merchant/     # Merchant management
│   │   │   ├── marketplace/  # Product catalog
│   │   │   ├── orders/       # Order management
│   │   │   ├── kameti/       # Kameti (community savings)
│   │   │   ├── messaging/    # Real-time messaging
│   │   │   ├── services/     # I Need / I Offer services
│   │   │   ├── zakat/        # Zakat calculator
│   │   │   ├── crowdfunding/ # Sadaqah + Investment projects
│   │   │   ├── finance/      # Islamic finance contracts
│   │   │   └── db/           # Drizzle schema + migrations
│   │   ├── wrangler.toml     # Cloudflare Workers config
│   │   └── .dev.vars         # Local dev secrets
│   └── web/                  # React SPA frontend
│       ├── src/
│       │   ├── pages/        # All page components
│       │   ├── context/      # Auth, Cart context providers
│       │   ├── components/   # Shared UI components
│       │   └── lib/          # API client, types, hooks
│       ├── public/           # PWA manifest, service worker, icons
│       └── vite.config.ts    # Vite + API proxy config
├── docs/                     # PRD, Architecture, Security docs
├── package.json              # Root monorepo config
└── .env                      # Environment variables
```

---

## How to Run

### Prerequisites

- **Node.js** v18+ (tested with v24)
- **pnpm** installed and available on PATH
- **Windows**: Add `D:\npm-global` to your PATH (or wherever pnpm is installed)

### 1. Install Dependencies

```bash
cd G:\islamic-community-platform
pnpm install
```

### 2. Start the Backend (API)

Open a **new terminal** and run:

```bash
cd G:\islamic-community-platform\packages\api
set PATH=D:\npm-global;%PATH%
npx wrangler dev --port 8787
```

Wait ~15 seconds for wrangler to compile. You'll see output like:
```
wrangler dev now listening on http://localhost:8787
```

### 3. Start the Frontend (Web)

Open a **second terminal** and run:

```bash
cd G:\islamic-community-platform\packages\web
set PATH=D:\npm-global;%PATH%
pnpm dev
```

Wait ~10 seconds. You'll see:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 4. Open in Browser

Go to **http://localhost:5173**

---

## Getting Started

### Fresh Setup

The database has been reset. Register your first account:

1. Open http://localhost:5173/register
2. Register as a **Super Admin** (first user gets admin role)
3. Create a community from the admin dashboard
4. Register additional accounts for testing (Community Owner, Merchant, Customer)

### Dashboard Routes

| Dashboard | URL Path | What You See |
|-----------|----------|-------------|
| Super Admin | `/admin/dashboard` | Platform overview, all communities, users, merchants, audit logs, fraud risk |
| Community | `/community/dashboard` | Community stats, members, merchants, kameti, services, messages, finance |
| Merchant | `/merchant/dashboard` | Products, orders, customers, messages |
| Customer | `/app` | Marketplace, orders, kameti, services, zakat, sadaqah, finance, messages |

---

## Login Flow

1. Open http://localhost:5173/signin
2. Enter email and password from the table above
3. Click **Sign In**
4. You'll be redirected to the correct dashboard based on your role:
   - Super Admin → `/admin/dashboard`
   - Community Owner/Admin → `/community/dashboard`
   - Merchant/Merchant Staff → `/merchant/dashboard`
   - Customer → `/app`

---

## PWA (Progressive Web App)

The customer app (`/app`) is PWA-enabled:

- **Install**: Click the browser's "Install" prompt or "Add to Home Screen"
- **Offline**: Basic offline caching via service worker
- **Mobile**: Optimized mobile-first design with bottom navigation
- **Icons**: Custom Islamic-themed icons in `packages/web/public/`

PWA files:
- `public/manifest.json` — App manifest
- `public/sw.js` — Service worker (network-first for HTML, skips Vite internals)
- `public/icon-192.png` / `public/icon-512.png` — App icons

---

## API Endpoints

Base URL: `http://localhost:8787/api/v1` (or via proxy `http://localhost:5173/api/v1`)

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Sign in |
| POST | `/auth/logout` | Yes | Sign out |
| GET | `/auth/me` | Yes | Current user |
| GET | `/auth/my-memberships` | Yes | User's community memberships |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |

### Key Features Implemented
- **Kameti**: Group savings with contribution tracking, payout scheduling
- **Services**: I Need / I Offer marketplace with search and filtering
- **Messaging**: Real-time desktop + mobile responsive chat
- **Zakat**: 3-step guided calculator (assets → deductions → result)
- **Sadaqah**: Donation crowdfunding (separate from investment)
- **Crowdfunding**: Donation vs Investment projects with Express Interest
- **Islamic Finance**: Qard Hasan, Mudarabah, Musharakah, Murabahah, Ijarah

---

## Development Commands

```bash
# Run all tests (363 tests)
cd packages\api && npx vitest run

# Run frontend tests (4 tests)
cd packages\web && npx vitest run

# Typecheck
cd packages\web && npx tsc --noEmit
cd packages\api && npx tsc --noEmit

# Build frontend for production
cd packages\web && npx vite build

# Build backend for deployment
cd packages\api && npx wrangler deploy --dry-run --outdir dist
```

---

## Database

- **Provider**: Neon PostgreSQL (serverless)
- **Schema**: 39 tables, UUID primary keys
- **ORM**: Drizzle ORM v0.35
- **Connection**: HTTP (neon-http) — compatible with Cloudflare Workers runtime

---

## Architecture Notes

- **Multi-tenant**: Every data record is scoped to a `community_id`
- **RBAC**: 8 roles with hierarchy (SUPER_ADMIN > CUSTOMER)
- **Financial Safety**: NUMERIC types for money, no floating-point
- **Islamic Finance**: Proper contract types, not renamed conventional products
- **No Platform Custody**: MVP does not hold customer funds

---

## Troubleshooting

### "Failed to fetch" on login
- Make sure **both** servers are running (backend on :8787, frontend on :5173)
- Check terminal windows for errors
- Wait 15-20 seconds after starting each server

### Backend won't start
- Make sure `packages/api/.dev.vars` exists with DATABASE_URL
- Make sure port 8787 is not in use by another process

### Frontend won't start
- Make sure port 5173 is not in use
- Run `pnpm install` first

### Login works but redirects to wrong page
- Check the role in the database matches expected
- The AuthContext determines redirect based on membership roles
