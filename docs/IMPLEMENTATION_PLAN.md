# Implementation Plan

## Islamic Community Platform

Version: 1.0

---

# 1. Purpose

This document defines the order in which the application should be built.

OpenCode must not skip ahead without explicit instruction.

---

# 2. Golden Rule

Build the foundation before features.

Build one vertical slice at a time.

Do not build:

```text
Marketplace
+
Kameti
+
Finance
+
Chat
+
Crowdfunding
```

all at once.

---

# 3. Phase Dependency Graph

```text
Foundation
    ↓
Database
    ↓
Authentication
    ↓
Multi-Tenancy
    ↓
RBAC
    ↓
Dashboards
    ↓
Merchant
    ↓
Marketplace
    ↓
Orders
    ↓
Kameti
    ↓
Messaging
    ↓
Services
    ↓
Zakat
    ↓
Sadaqah
    ↓
Qard Hasan
    ↓
Donation Crowdfunding
    ↓
Islamic Finance
    ↓
Production Hardening
```

---

# 4. Phase 0 — Inspection

## Goal

Understand the existing repository.

## Tasks

* inspect files
* inspect package.json
* inspect lockfile
* inspect framework
* inspect database
* inspect deployment configuration
* inspect tests

## Output

A short plan.

No feature implementation.

---

# 5. Phase 1 — Foundation

## Goal

Create a clean development environment.

## Deliverables

* TypeScript
* lint
* formatter
* testing
* environment configuration
* basic application structure

## Acceptance

```text
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

all succeed.

---

# 6. Phase 2 — Database

## Goal

Create the relational foundation.

## Deliverables

```text
users
communities
community_memberships
```

Then supporting tables as required.

## Acceptance

* migrations work
* foreign keys work
* indexes exist
* constraints work
* tests pass

---

# 7. Phase 3 — Authentication

## Goal

Secure user accounts.

## Deliverables

* register
* login
* logout
* session
* password reset
* current user

## Acceptance

Unauthenticated users cannot access protected resources.

---

# 8. Phase 4 — Multi-Tenancy

## Goal

Guarantee tenant isolation.

## Deliverables

* tenant resolution
* membership
* tenant context
* tenant-scoped repositories
* authorization

## Mandatory Acceptance Test

```text
Community A user cannot access Community B.
```

This must pass before continuing.

---

# 9. Phase 5 — RBAC

## Goal

Implement roles.

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

## Acceptance

Each role can perform only permitted actions.

---

# 10. Phase 6 — Super Admin

## Goal

Provide platform administration.

## Features

* dashboard
* communities
* users
* merchants
* subscriptions
* reports
* audit logs
* security
* fraud/risk
* Shariah governance

---

# 11. Phase 7 — Community Dashboard

## Features

* community profile
* members
* groups
* announcements
* merchants
* marketplace
* orders
* reports

---

# 12. Phase 8 — Merchant

## Features

* onboarding
* approval
* products
* categories
* inventory
* orders
* payment references
* WhatsApp orders
* sales reports

---

# 13. Phase 9 — Marketplace

## Features

* product browsing
* search/filter
* product details
* cart
* checkout

Payment methods:

```text
COD
Direct Merchant UPI
```

---

# 14. Phase 10 — Orders

## Features

* order creation
* item snapshots
* order state
* payment state
* payment reference
* proof upload
* verification
* cancellation

## Critical Rule

Order state and payment state remain separate.

---

# 15. Phase 11 — Kameti

## Features

* groups
* members
* periods
* contributions
* verification
* payouts
* reports
* notifications

---

# 16. Phase 12 — Messaging

## Features

* direct
* group
* order
* Kameti
* project
* attachments
* report
* mute
* block

---

# 17. Phase 13 — Jobs & Services

## Features

```text
I NEED A SERVICE
I OFFER A SERVICE
```

Include:

* categories
* listings
* requests
* status
* contact

---

# 18. Phase 14 — Zakat

## Features

* methodology
* calculator
* results
* optional history

## Acceptance

Given the same inputs and methodology, the result is deterministic.

---

# 19. Phase 15 — Sadaqah

## Features

* donation records
* community giving
* receipts/references
* reporting

---

# 20. Phase 16 — Qard Hasan

## Features

* request
* review
* approval
* agreement
* repayment
* outstanding principal
* completion

No interest.

---

# 21. Phase 17 — Donation Crowdfunding

## Features

* project creation
* approval
* project page
* goal
* contributions
* payment references
* proof
* updates
* reporting

No investment returns.

---

# 22. Phase 18 — Islamic Finance

## Contract Types

```text
MUDARABAH
MUSHARAKAH
MURABAHAH
IJARAH
```

## Required

* parties
* roles
* terms
* documents
* risk
* review
* versioning
* audit

---

# 23. Phase 19 — Investment Gate

Do not enable real-money investment functionality merely because the UI/API is finished.

Required:

```text
Legal review
Regulatory review
Shariah review
Contract review
Risk review
Security review
```

Until complete:

```text
Express Interest
```

may be used.

---

# 24. Phase 20 — Production Hardening

Complete:

* security testing
* tenant isolation
* performance
* monitoring
* backups
* rate limits
* audit logs
* privacy
* error handling
* deployment
* documentation

---

# 25. Phase Checkpoint

At the end of every phase, OpenCode must report:

```text
Phase:
Status:

Implemented:
- ...

Files created:
- ...

Files modified:
- ...

Database:
- ...

API:
- ...

Tests:
- ...

Commands:
- ...

Security review:
- ...

Known issues:
- ...

Next phase:
- ...
```

OpenCode must not begin the next phase automatically.

---

# 26. Git Checkpoint

After a successful phase:

```text
run tests
run typecheck
run lint
run build
review diff
commit
```

Example:

```text
git commit -m "feat(auth): implement secure authentication foundation"
```

---

# 27. Rollback Principle

If a phase introduces severe problems:

```text
stop
inspect
test
fix or rollback
```

Do not continue building additional features on a broken foundation.

---

# 28. Final MVP Acceptance

The MVP is acceptable only when:

```text
[ ] Four dashboards only
[ ] Authentication works
[ ] Multi-tenancy works
[ ] Tenant isolation tested
[ ] RBAC works
[ ] Community management works
[ ] Merchant workflow works
[ ] Marketplace works
[ ] Orders work
[ ] COD works
[ ] Direct merchant UPI recording works
[ ] Kameti works
[ ] Messaging works
[ ] Jobs & Services works
[ ] Zakat works
[ ] Sadaqah works
[ ] Qard Hasan works
[ ] Donation crowdfunding works
[ ] Islamic finance structure exists
[ ] Shariah review workflow exists
[ ] Audit logs exist
[ ] Security tests pass
[ ] Mobile UI works
[ ] Typecheck passes
[ ] Lint passes
[ ] Tests pass
[ ] Production build passes
```

---

# 29. Explicitly Out of Scope Until Approved

Do not add:

```text
platform wallet
escrow
cryptocurrency
guaranteed investment returns
interest-bearing lending
automatic investment payouts
unauthorized payment custody
unauthorized financial intermediation
AI fatwa generation
```

---

# 30. Final Principle

The objective is not:

> Generate as much code as possible.

The objective is:

> Build a secure, maintainable, auditable and genuinely useful Islamic community platform one verified step at a time.
