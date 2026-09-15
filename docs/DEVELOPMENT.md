# Development Guide

## Islamic Community Platform

Version: 1.0

---

# 1. Development Philosophy

Build the platform incrementally.

Do not generate the whole system in one AI coding operation.

Use:

```text
Plan
↓
Implement
↓
Test
↓
Review
↓
Commit
↓
Next phase
```

---

# 2. Before Coding

OpenCode must read:

```text
AGENTS.md
docs/PRD.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/SECURITY.md
docs/SHARIAH.md
docs/API.md
docs/UI.md
docs/DEVELOPMENT.md
docs/IMPLEMENTATION_PLAN.md
```

Then inspect the repository.

---

# 3. Development Environment

Recommended:

```text
Node.js LTS
pnpm
TypeScript
Git
```

Use the project's configured versions where they already exist.

Do not upgrade major dependencies without a reason.

---

# 4. Environment Variables

Use environment variables for:

* database connection
* session secrets
* storage configuration
* service credentials
* deployment configuration

Never commit secrets.

Create:

```text
.env.example
```

with placeholders only.

---

# 5. Branching

Use feature branches where practical.

Examples:

```text
feature/auth
feature/marketplace
feature/kameti
feature/crowdfunding
fix/order-total
```

---

# 6. Commit Strategy

Use meaningful commits.

Examples:

```text
feat(auth): add login and session handling
feat(tenancy): enforce community authorization
feat(members): add community member management
feat(marketplace): add product catalog
feat(orders): add order creation
fix(orders): prevent duplicate submissions
test(security): add tenant isolation tests
```

Avoid:

```text
update
changes
stuff
final
final2
```

---

# 7. Implementation Phases

## Phase 0 — Repository Inspection

Tasks:

* inspect existing code
* determine framework
* determine package manager
* inspect configuration
* inspect existing database
* inspect tests

Do not implement features yet.

---

# 8. Phase 1 — Project Foundation

Build:

* project configuration
* TypeScript
* linting
* formatting
* testing
* environment configuration
* base application structure
* CI where appropriate

Acceptance:

```text
install succeeds
typecheck succeeds
lint succeeds
tests succeed
build succeeds
```

---

# 9. Phase 2 — Database

Implement:

* database connection
* ORM
* migrations
* core schema
* seed strategy for local development

Core tables:

```text
users
communities
community_memberships
```

Acceptance:

* migration works
* constraints work
* indexes exist
* tests pass

---

# 10. Phase 3 — Authentication

Implement:

* registration
* login
* logout
* sessions
* password reset
* current user

Test:

* valid login
* invalid password
* session expiration
* logout
* reset flow
* brute-force/rate limiting

---

# 11. Phase 4 — Multi-Tenancy

Implement:

* community resolution
* membership
* tenant context
* tenant-scoped repositories/services
* authorization

Critical test:

```text
Community A user
cannot access
Community B resources
```

Do not continue until this passes.

---

# 12. Phase 5 — RBAC

Implement:

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

Test every sensitive permission.

---

# 13. Phase 6 — Super Admin

Build:

* community management
* user overview
* merchant oversight
* subscriptions
* reports
* audit logs
* security
* risk
* Shariah governance

Do not expose unnecessary private tenant data.

---

# 14. Phase 7 — Community Dashboard

Build:

* community profile
* members
* groups
* announcements
* merchant management
* marketplace
* orders
* reports

---

# 15. Phase 8 — Merchant

Build:

* merchant onboarding
* approval
* products
* categories
* inventory
* orders
* payment references
* WhatsApp orders
* sales reports

---

# 16. Phase 9 — Marketplace

Build:

* catalog
* product details
* cart
* checkout
* COD
* direct merchant UPI
* order creation
* order status

Test price manipulation.

The server must calculate:

```text
subtotal
delivery
total
```

---

# 17. Phase 10 — Orders

Implement:

```text
order state
payment state
order items
status transitions
payment reporting
proof upload
verification
```

Ensure order state and payment state remain separate.

---

# 18. Phase 11 — Kameti

Implement:

* groups
* members
* periods
* contributions
* verification
* payouts
* reports
* notifications

Test:

* incorrect amounts
* duplicate contributions
* unauthorized verification
* wrong member
* wrong community
* payout consistency

---

# 19. Phase 12 — Messaging

Implement:

* direct messages
* group messages
* order conversations
* Kameti conversations
* project conversations
* attachments
* reporting
* mute
* block

Test conversation membership.

---

# 20. Phase 13 — Jobs & Services

Implement:

* categories
* service listings
* provider profile
* service requests
* status updates
* contact

---

# 21. Phase 14 — Zakat

Implement:

* methodology
* input form
* calculation service
* result
* optional history

Test deterministic calculations.

Do not hard-code unexplained assumptions.

---

# 22. Phase 15 — Sadaqah

Implement:

* giving records
* community giving
* donation receipts/references
* donation reporting

No financial return.

---

# 23. Phase 16 — Qard Hasan

Implement:

* requests
* review
* approval
* agreement
* repayment schedule
* repayment records
* outstanding principal

No interest.

---

# 24. Phase 17 — Donation Crowdfunding

Implement:

* project creation
* project approval
* project page
* goal
* contributions
* payment references
* proof
* updates
* reports

Keep donation and investment models separate.

---

# 25. Phase 18 — Islamic Finance

Implement contract models:

```text
Mudarabah
Musharakah
Murabahah
Ijarah
```

Each requires:

* participants
* roles
* terms
* contract version
* documents
* risk information
* Shariah review
* audit trail

---

# 26. Phase 19 — Legal/Shariah Gate

Before real-money investment functionality:

```text
STOP
↓
Legal review
↓
Regulatory review
↓
Shariah review
↓
Contract review
↓
Risk review
↓
Only then enable appropriate functionality
```

If approval is not complete:

```text
Express Interest
```

may be used instead of actual investment execution.

---

# 27. Phase 20 — Production Hardening

Review:

* authentication
* authorization
* tenant isolation
* rate limiting
* file uploads
* API validation
* security headers
* logging
* monitoring
* backups
* error handling
* privacy
* audit logs

---

# 28. Testing Strategy

## Unit Tests

Test:

* money calculations
* order totals
* Zakat calculations
* status transitions
* finance contract validation

---

## Integration Tests

Test:

* authentication
* database
* APIs
* authorization
* tenant isolation

---

## End-to-End Tests

Use Playwright.

Critical journeys:

```text
register
login
community management
merchant onboarding
add product
customer checkout
COD order
UPI payment report
Kameti contribution
chat
service request
Zakat calculation
donation contribution
Qard Hasan request
```

---

# 29. Two-Tenant Testing

Always maintain test data for:

```text
Community A
Community B
```

Test that:

```text
A user → A data = allowed
A user → B data = denied
B user → B data = allowed
B user → A data = denied
```

---

# 30. Money Testing

Test:

```text
0
negative
very large
decimal
rounding
duplicate
concurrent
missing
invalid currency
```

Do not use JavaScript floating-point calculations for authoritative money.

---

# 31. API Testing

For every protected API test:

```text
unauthenticated
wrong role
wrong tenant
wrong owner
valid authorized user
invalid input
duplicate request
```

---

# 32. UI Testing

Test:

* mobile
* tablet
* desktop
* keyboard navigation
* loading state
* empty state
* error state
* validation
* disabled states

---

# 33. Definition of Done

A feature is Done only if:

```text
[ ] Database migration
[ ] Backend/domain logic
[ ] Authentication
[ ] Authorization
[ ] Tenant isolation
[ ] Input validation
[ ] API
[ ] Frontend
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Mobile UI
[ ] Tests
[ ] Typecheck
[ ] Lint
[ ] Build
[ ] Documentation
[ ] Security review
```

---

# 34. AI Development Rules

When OpenCode implements a task:

1. Read relevant documentation.
2. Inspect current code.
3. Create a plan.
4. Implement only the requested scope.
5. Run tests.
6. Run typecheck.
7. Run lint.
8. Run build.
9. Review security.
10. Report changes.

Do not automatically proceed to unrelated features.

---

# 35. Never Do This

Never:

* bypass tenant checks
* disable authorization to make tests pass
* remove validation because it is inconvenient
* store passwords in plaintext
* use floating point for financial calculations
* invent payment success
* create fake financial balances
* create fake Shariah approval
* guarantee investment returns
* silently change historical financial records
* commit secrets
* deploy untested financial functionality

---

# 36. Production Rule

Before deployment, the system must pass:

```text
install
lint
typecheck
unit tests
integration tests
E2E tests
build
security review
database migration review
tenant isolation tests
```

---

# 37. Change Management

For significant architectural changes:

1. Update documentation.
2. Explain why the change is required.
3. Update affected schemas/API/UI.
4. Add migration if needed.
5. Add tests.
6. Review security implications.
7. Commit all related changes together.

Documentation and implementation must not drift apart.
