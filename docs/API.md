# API Specification

## Islamic Community Platform

Version: 1.0

Base URL:

```text
/api/v1
```

---

# 1. API Principles

All APIs must:

* validate input
* authenticate
* authorize
* enforce tenant scope
* use consistent errors
* use correct HTTP status codes
* avoid leaking internal information
* support pagination where appropriate

---

# 2. Error Format

All API errors should use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Do not expose stack traces in production.

---

# 3. Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

---

# 4. Communities

```text
GET    /communities
POST   /communities
GET    /communities/:id
PATCH  /communities/:id
DELETE /communities/:id
```

Super Admin controls platform-level community management.

Community administrators control their own tenant resources according to role.

---

# 5. Members

```text
GET    /communities/:communityId/members
POST   /communities/:communityId/members
GET    /members/:id
PATCH  /members/:id
PATCH  /members/:id/status
PATCH  /members/:id/role
```

The server must verify the caller belongs to/controls the target community.

Do not trust the URL community ID alone.

---

# 6. Merchants

```text
GET    /merchants
POST   /merchants
GET    /merchants/:id
PATCH  /merchants/:id
POST   /merchants/:id/approve
POST   /merchants/:id/suspend
```

Only authorized users can approve/suspend merchants.

---

# 7. Product Categories

```text
GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id
```

Category queries must be tenant-scoped.

---

# 8. Products

```text
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
PATCH  /products/:id/inventory
```

Customers may read active products.

Merchants may modify only their own products.

Community administrators may manage marketplace records according to permissions.

---

# 9. Cart

```text
GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id
DELETE /cart
```

The server must recalculate prices/totals.

Never trust a client-supplied total.

---

# 10. Orders

```text
GET    /orders
POST   /orders
GET    /orders/:id
PATCH  /orders/:id/status
POST   /orders/:id/cancel
```

Order creation must be protected against duplicate submission.

---

# 11. Order Payments

```text
POST /orders/:id/payment-report
POST /orders/:id/payment-proof
POST /orders/:id/payment-verify
POST /orders/:id/payment-reject
```

Payment verification must require appropriate authorization.

A payment report does not automatically mean verified payment.

---

# 12. Kameti

```text
GET  /kameti/groups
POST /kameti/groups
GET  /kameti/groups/:id
PATCH /kameti/groups/:id

POST /kameti/groups/:id/members
DELETE /kameti/groups/:id/members/:memberId

GET  /kameti/groups/:id/periods

POST /kameti/contributions
GET  /kameti/contributions/:id
POST /kameti/contributions/:id/verify

POST /kameti/payouts
GET  /kameti/payouts/:id

GET /kameti/groups/:id/report
```

All amounts must be validated server-side.

---

# 13. Messaging

```text
GET  /conversations
POST /conversations
GET  /conversations/:id
POST /conversations/:id/messages
GET  /conversations/:id/messages
PATCH /messages/:id
DELETE /messages/:id
POST /messages/:id/report
POST /conversations/:id/mute
POST /users/:id/block
```

Only conversation members may access private conversation content.

---

# 14. Jobs & Services

```text
GET  /services/categories
POST /services/categories

GET  /services/listings
POST /services/listings
GET  /services/listings/:id
PATCH /services/listings/:id

POST /services/requests
GET  /services/requests
PATCH /services/requests/:id/status
```

---

# 15. Zakat

```text
POST /zakat/calculate
GET  /zakat/methodology
```

The calculation endpoint should receive a validated structured input.

Do not calculate money using floating-point arithmetic.

---

# 16. Sadaqah

```text
GET  /sadaqah
POST /sadaqah
GET  /sadaqah/:id
```

Records should clearly identify charitable giving.

---

# 17. Qard Hasan

```text
GET  /qard-hasan
POST /qard-hasan
GET  /qard-hasan/:id
PATCH /qard-hasan/:id
POST /qard-hasan/:id/approve
POST /qard-hasan/:id/reject
POST /qard-hasan/:id/repayment
GET  /qard-hasan/:id/report
```

No interest field should exist unless there is a separately reviewed reason unrelated to interest; the default model is principal repayment without interest.

---

# 18. Crowdfunding

```text
GET  /crowdfunding/projects
POST /crowdfunding/projects
GET  /crowdfunding/projects/:id
PATCH /crowdfunding/projects/:id
POST /crowdfunding/projects/:id/contributions
GET  /crowdfunding/projects/:id/contributions
POST /crowdfunding/contributions/:id/verify
```

Project type:

```text
DONATION
INVESTMENT
```

The API must prevent contribution-type confusion.

---

# 19. Islamic Finance

```text
GET  /finance/contracts
POST /finance/contracts
GET  /finance/contracts/:id
PATCH /finance/contracts/:id

POST /finance/contracts/:id/participants
GET  /finance/contracts/:id/participants

GET  /finance/contracts/:id/terms
POST /finance/contracts/:id/terms

GET  /finance/contracts/:id/assets
POST /finance/contracts/:id/assets

GET  /finance/contracts/:id/documents
POST /finance/contracts/:id/documents

GET  /finance/contracts/:id/transactions
POST /finance/contracts/:id/transactions

GET  /finance/contracts/:id/reviews
POST /finance/contracts/:id/reviews
```

Contract type:

```text
MUDARABAH
MUSHARAKAH
MURABAHAH
IJARAH
QARD_HASAN
SADAQAH
```

---

# 20. Shariah Review

```text
GET  /finance/reviews
POST /finance/contracts/:id/reviews
PATCH /finance/reviews/:id
```

Only authorized reviewers may modify review state.

---

# 21. Notifications

```text
GET  /notifications
PATCH /notifications/:id/read
POST /notifications/read-all
```

---

# 22. Reports

Examples:

```text
GET /reports/members
GET /reports/merchants
GET /reports/orders
GET /reports/sales
GET /reports/kameti
GET /reports/donations
GET /reports/finance
```

Every report must enforce tenant scope.

Use pagination or asynchronous report generation for large datasets.

---

# 23. Audit Logs

```text
GET /audit-logs
GET /audit-logs/:id
```

Only authorized administrative users may access audit logs.

---

# 24. Subscriptions

```text
GET  /subscriptions
POST /subscriptions
GET  /subscriptions/:id
PATCH /subscriptions/:id
```

Initial subscription target:

```text
₹499/month/community
```

Payment processing is a separate concern.

---

# 25. Security Endpoints

Potential endpoints:

```text
GET /security/sessions
POST /security/sessions/:id/revoke
GET /security/events
```

Access must be restricted.

---

# 26. Pagination

Use a consistent pagination structure.

Example:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
}
```

Cursor pagination may be preferred for large/high-volume resources.

---

# 27. Authentication Response

Avoid returning unnecessary sensitive information.

Example:

```json
{
  "data": {
    "id": "user-id",
    "name": "User",
    "role": "CUSTOMER",
    "community": {
      "id": "community-id",
      "name": "Community"
    }
  }
}
```

---

# 28. Idempotency

Use idempotency mechanisms for operations that could accidentally be repeated.

Especially:

```text
order creation
payment reporting
Kameti contribution recording
payout recording
financial transactions
```

---

# 29. HTTP Status Codes

Use standard meanings:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Do not use 200 for every failure.

---

# 30. API Security Rule

Every endpoint should answer:

```text
Who is calling?
Which community are they operating in?
What role do they have?
Do they own/control this resource?
Is this action permitted?
Is the input valid?
Should this action be audited?
```
