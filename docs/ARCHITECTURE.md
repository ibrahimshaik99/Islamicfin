# Architecture

## Islamic Community Platform

Version: 1.0

---

# 1. Architecture Goals

The architecture must provide:

* multi-tenancy
* strong tenant isolation
* secure authentication
* role-based access control
* reliable financial records
* mobile-first UX
* low infrastructure cost
* scalability
* maintainability
* clear domain boundaries

---

# 2. Recommended Stack

## Frontend

```text
React
TypeScript
Tailwind CSS
shadcn/ui
```

---

## Backend

Preferred:

```text
TypeScript
Cloudflare Workers
```

---

## Database

Preferred relational database:

```text
PostgreSQL-compatible database
Drizzle ORM
```

For an early Cloudflare-only MVP, Cloudflare D1 may be used if its limitations are acceptable.

The database must remain relational and authoritative for business/financial state.

---

## Object Storage

```text
Cloudflare R2
```

Use for:

* product images
* payment proofs
* avatars
* finance documents
* project documents

Sensitive documents should not be publicly accessible.

---

## Cache / Configuration

```text
Cloudflare KV
```

KV must not be the authoritative source for financial records.

---

## Background Jobs

```text
Cloudflare Queues
```

Use for:

* notifications
* asynchronous processing
* non-critical background tasks

Do not move critical transactional database updates into unreliable client-side workflows.

---

## Validation

```text
Zod
```

---

## Testing

```text
Vitest
Playwright
```

---

## Package Manager

```text
pnpm
```

---

# 3. Deployment

Suggested routing:

```text
admin.yourapp.in
```

Super Admin.

```text
community-slug.yourapp.in
```

Community dashboard.

```text
community-slug.yourapp.in/merchant
```

Merchant dashboard.

```text
community-slug.yourapp.in/app
```

Customer application.

The exact domain can be changed during deployment.

---

# 4. Multi-Tenancy

A community is a tenant.

Most domain entities must contain:

```text
community_id
```

Example:

```text
products.community_id
orders.community_id
messages.community_id
services.community_id
crowdfunding_projects.community_id
finance_contracts.community_id
```

---

# 5. Tenant Resolution

Recommended request flow:

```text
Request
   ↓
Authenticate user
   ↓
Resolve requested community
   ↓
Verify membership
   ↓
Determine role
   ↓
Authorize action
   ↓
Apply tenant scope
   ↓
Execute operation
   ↓
Audit if required
   ↓
Response
```

Never accept arbitrary tenant IDs from an untrusted client.

---

# 6. Domain Structure

Organize backend code by domain.

Example:

```text
src/
├── auth/
├── tenancy/
├── users/
├── communities/
├── merchants/
├── marketplace/
├── orders/
├── kameti/
├── messaging/
├── services/
├── zakat/
├── sadaqah/
├── qard-hasan/
├── crowdfunding/
├── islamic-finance/
├── notifications/
├── audit/
├── subscriptions/
├── security/
└── shared/
```

The exact framework folder structure may vary.

The architectural separation should remain.

---

# 7. Layering

Use:

```text
HTTP/API
   ↓
Validation
   ↓
Authorization
   ↓
Domain Service
   ↓
Repository/Data Access
   ↓
Database
```

Do not let controllers contain all business logic.

Do not let UI components contain business rules.

---

# 8. Financial Domain

Financial functionality must use dedicated domain services.

Examples:

```text
OrderPricingService
KametiService
ZakatCalculationService
QardHasanService
CrowdfundingService
FinanceContractService
LedgerService
```

A generic ledger may record actual financial movements/references, but must never falsely imply custody or settlement.

---

# 9. Ledger

If implemented, ledger entries should represent actual recorded movements.

Suggested fields:

```text
id
community_id
account_type
account_id
reference_type
reference_id
direction
amount
currency
description
status
created_by
created_at
```

The ledger must not become a fake bank balance.

---

# 10. Authentication

Authentication should support:

* registration
* login
* logout
* session refresh
* password reset
* current user
* session revocation

Use secure password hashing.

Do not store plaintext passwords.

---

# 11. Authorization

Roles:

```text
SUPER_ADMIN
COMMUNITY_OWNER
COMMUNITY_ADMIN
COMMUNITY_MODERATOR
COMMUNITY_FINANCE_MANAGER
MERCHANT
MERCHANT_STAFF
CUSTOMER
```

Authorization should check:

1. authenticated user
2. tenant membership
3. role
4. resource ownership/access
5. requested action

---

# 12. Four Dashboard Architecture

## Super Admin

Platform-wide.

```text
Dashboard
Communities
Users
Merchants
Finance
Crowdfunding
Kameti
Fraud & Risk
Security
Reports
Audit Logs
Shariah Governance
Settings
```

---

## Community

Tenant-level.

```text
Home
Members
Groups
Announcements
Merchants
Marketplace
Orders
Kameti
Jobs & Services
Sadaqah
Qard Hasan
Crowdfunding
Islamic Finance
Zakat
Messages
Reports
Settings
```

---

## Merchant

Merchant-level.

```text
Overview
Products
Categories
Inventory
Orders
Payments
Customers
WhatsApp Orders
Sales Reports
Settings
```

---

## Customer

Member/customer experience.

```text
Home
Marketplace
Cart
Orders
Kameti
Messages
Jobs & Services
Zakat
Projects
Profile
```

---

# 13. File Storage

All uploads must pass:

* authentication
* authorization
* file type validation
* file size validation
* safe filename handling
* malware/security scanning where available
* access-control checks

Do not expose private finance documents publicly.

---

# 14. Observability

Production system should eventually include:

* structured logs
* error tracking
* request IDs
* audit logs
* security event logs
* performance monitoring

Never log:

* passwords
* authentication tokens
* private keys
* unnecessary personal data
* sensitive payment credentials

---

# 15. Scalability

The initial architecture should work for small communities but avoid assumptions that prevent growth.

Avoid:

* global in-memory state
* hard-coded community IDs
* synchronous heavy processing
* database queries without tenant filters
* unbounded message retrieval
* unbounded report queries

Use pagination.

---

# 16. Reliability

Important operations should be idempotent where appropriate.

Examples:

* payment proof submission
* order creation
* contribution recording
* payout recording
* notifications

Use unique idempotency/reference keys where necessary.

---

# 17. Architecture Principle

Prefer:

```text
Simple
Explicit
Auditable
Secure
Testable
```

over:

```text
Clever
Highly abstract
Prematurely distributed
Difficult to debug
```

Do not introduce microservices unless scale or operational requirements justify them.
