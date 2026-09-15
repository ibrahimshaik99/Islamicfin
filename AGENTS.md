# AGENTS.md

## Project Identity

Project name: Islamic Community Platform

This repository contains a multi-tenant SaaS platform for Islamic community centers and their members in India.

The platform connects:

* Islamic communities
* Community administrators
* Merchants
* Customers/members
* Service providers
* Community finance activities
* Donation and community projects

The initial target subscription is ₹499 INR per community per month.

The platform must be trustworthy, secure, mobile-first, financially accurate, and respectful of Islamic principles.

---

# 1. Non-Negotiable Rules

These rules apply to every change in this repository.

## 1.1 Exactly Four User Experiences

The product has exactly four dashboards:

1. Super Admin
2. Community
3. Merchant
4. Customer/User

Do not create a fifth dashboard.

Different roles may see different navigation items inside one of these four dashboard experiences.

---

## 1.2 Multi-Tenant Architecture

The application is multi-tenant.

A community is a tenant.

Every community-owned record must be associated with a `community_id`.

Never trust a `community_id` supplied by the browser.

The server must determine the authenticated user's active community and authorize access before executing tenant-scoped operations.

A user belonging to Community A must never be able to read, modify, delete, or infer private data belonging to Community B.

Always test tenant isolation.

---

## 1.3 Financial Safety

Money must never use JavaScript floating-point arithmetic for financial calculations.

Use:

* integer minor units where appropriate, or
* a database-supported exact decimal/numeric type.

Validate:

* zero values
* negative values
* excessive values
* decimal precision
* rounding
* duplicate transactions
* repeated submissions
* concurrent updates

Financial state changes must use database transactions where required.

Never silently alter financial records.

Use corrections/reversals/audit records where appropriate.

---

## 1.4 No Platform Custody in MVP

The MVP must not create a platform wallet.

Do not implement:

* stored customer balances
* platform escrow
* cryptocurrency wallets
* automatic investment payouts
* guaranteed returns
* interest-bearing lending
* platform custody of customer funds
* fake payment settlement

Initial payment methods may include:

* Cash on Delivery
* Direct merchant UPI
* Community-recorded payment references
* Payment proof uploads

The platform records information about a payment. It must not falsely claim to have processed or held money when it did not.

---

## 1.5 Islamic Finance

Islamic finance features must model the actual contract type.

Do not rename conventional interest-based products using Islamic terminology.

Supported contract concepts include:

* Sadaqah
* Qard Hasan
* Mudarabah
* Musharakah
* Murabahah
* Ijarah

Each contract must clearly identify:

* parties
* roles
* contributions
* ownership where applicable
* profit-sharing where applicable
* duration
* obligations
* risks
* documents
* contract version
* Shariah review status

AI must never present itself as issuing a fatwa.

AI may assist with:

* explanations
* summaries
* document organization
* navigation
* educational content

Actual Shariah approval belongs to qualified human reviewers.

---

## 1.6 Donation vs Investment

Donation crowdfunding and investment crowdfunding are completely separate concepts.

Donation:

* no financial return
* contribution/support
* project/community benefit

Investment:

* financial participation
* contract-specific rights and risks
* legal/regulatory requirements
* Shariah review

Never display an investment opportunity as a donation.

Never display a donation as an investment.

---

## 1.7 India Legal/Regulatory Safety

The product is intended for India.

Features involving:

* investment
* crowdfunding
* lending
* financial intermediation
* payment processing
* money transmission
* securities
* regulated financial activity

must be designed so that the MVP does not accidentally operate as an unauthorized regulated financial intermediary.

Before enabling real-money investment functionality, require appropriate legal and regulatory review.

Where necessary, the initial user action should be:

> Express Interest

rather than:

> Invest Now

until the legal and Shariah framework is approved.

---

# 2. Source of Truth

Before implementing a feature, read the relevant documentation.

Required project documents:

```text
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

If this file conflicts with another document, this file's non-negotiable safety rules take priority.

If requirements are ambiguous, do not invent a financial or security-sensitive behavior.

Ask for clarification or choose the safer behavior and document the assumption.

---

# 3. Implementation Rules

## 3.1 Inspect Before Editing

Before changing code:

1. Inspect repository structure.
2. Inspect existing package configuration.
3. Inspect existing database configuration.
4. Inspect existing authentication.
5. Inspect existing migrations.
6. Inspect existing API routes.
7. Inspect existing tests.
8. Read relevant documentation.

Do not overwrite existing functionality blindly.

---

## 3.2 Small Vertical Slices

Do not build the entire platform in one operation.

Implement one phase or vertical slice at a time.

A feature is not complete until it includes, where applicable:

* database schema/migration
* backend/domain logic
* authentication
* authorization
* tenant isolation
* validation
* API
* frontend
* loading state
* empty state
* error state
* tests
* typecheck
* lint
* production build

---

## 3.3 Business Logic Location

Do not place important business rules inside React components.

Business rules belong in backend/domain services.

Examples:

```text
Zakat calculation → domain/service layer
Order totals → order service
Kameti contribution verification → finance/domain service
Finance contract rules → finance domain service
Authorization → server-side authorization layer
```

Frontend code should display and collect data, not become the authoritative source of financial rules.

---

# 4. Security

Never:

* expose secrets
* commit credentials
* commit production database dumps
* trust client-side roles
* trust client-supplied community IDs
* bypass authorization for convenience
* return sensitive records unnecessarily
* log passwords, tokens, or sensitive financial information

Use server-side authorization for every protected operation.

---

# 5. Database

Use migrations.

Never manually modify production schema without a migration.

Use foreign keys and appropriate indexes.

Use unique constraints for business invariants.

Examples:

```text
community_memberships:
unique(community_id, user_id)

products:
unique(community_id, sku) where applicable

orders:
unique(community_id, order_number)

conversation_members:
unique(conversation_id, user_id)
```

Use timestamps consistently.

Use soft deletion only where business requirements justify it.

Financial records should generally be immutable or correction-oriented rather than destructively edited.

---

# 6. API

All APIs must:

* authenticate where required
* authorize
* validate input
* enforce tenant scope
* return consistent errors
* avoid leaking internal details
* use appropriate HTTP status codes
* be versioned

Base path:

```text
/api/v1
```

Error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

# 7. Frontend

The application must be:

* mobile-first
* responsive
* accessible
* fast
* clear
* trustworthy

Breakpoints:

```text
< 768px      Mobile
768-1023px   Tablet
>= 1024px    Desktop
```

Do not build desktop-only interfaces and attempt to shrink them afterward.

---

# 8. Islamic UX

Islamic terminology must be used accurately.

Do not use Arabic/Islamic terminology merely for branding.

Examples:

Correct:

> Qard Hasan — interest-free loan with repayment of principal

Incorrect:

> Halal Loan — guaranteed return

Correct:

> Mudarabah — profit-sharing partnership subject to contract terms and business risk

Incorrect:

> Islamic investment with guaranteed monthly profit

---

# 9. Testing

At minimum, test:

* authentication
* authorization
* tenant isolation
* role restrictions
* financial calculations
* duplicate submissions
* invalid money amounts
* order totals
* Kameti calculations
* Zakat calculations
* finance contract validation
* file upload restrictions
* API validation

Use at least two communities during tenant-isolation tests:

```text
Community A
Community B
```

A user authorized for A must not access B's records.

---

# 10. AI Coding Behavior

When using AI coding tools:

* do not blindly accept generated code
* inspect migrations
* inspect authorization
* inspect financial calculations
* inspect API handlers
* inspect file uploads
* inspect authentication
* run tests
* run typecheck
* run lint
* run build

If generated code introduces a shortcut that violates this file, reject the shortcut.

---

# 11. Git

Use meaningful commits.

Examples:

```text
feat(auth): add session authentication
feat(tenancy): enforce community isolation
feat(merchant): add merchant onboarding
feat(marketplace): add product catalog
fix(order): prevent duplicate order submission
test(authz): add tenant isolation tests
```

Never commit:

* `.env`
* credentials
* private keys
* production secrets
* production dumps
* unnecessary personal data

---

# 12. Completion Standard

Do not say a feature is "complete" merely because the UI exists.

A feature is complete only when the relevant:

* schema
* backend
* authorization
* tenant isolation
* validation
* UI
* tests
* error states
* documentation
* lint
* typecheck
* build

are complete.

After each phase, report:

1. What changed
2. Files changed
3. Database changes
4. API changes
5. Tests
6. Commands executed
7. Remaining risks/issues

Do not silently move to the next phase.
