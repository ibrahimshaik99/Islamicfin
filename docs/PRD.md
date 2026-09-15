# Product Requirements Document

## Islamic Community Platform

Version: 1.0

Status: Product Specification

---

# 1. Product Vision

Build a trustworthy digital platform for Islamic community centers in India.

The platform should allow a community to manage its members and activities while giving members access to:

* marketplace services
* merchants
* Kameti
* community communication
* jobs and services
* Zakat tools
* Sadaqah
* Qard Hasan
* community projects
* Islamic finance opportunities

The platform should help communities become digitally organized without requiring them to build or maintain their own software.

---

# 2. Target Users

## 2.1 Super Admin

Platform operator.

Responsible for:

* communities
* platform users
* subscriptions
* system governance
* security
* risk
* platform-level reporting
* Shariah governance administration

---

## 2.2 Community

Islamic community center/organization.

Responsible for:

* members
* announcements
* groups
* merchants
* marketplace
* orders
* Kameti
* services
* community finance
* projects
* reports

---

## 2.3 Merchant

A community-approved merchant.

Responsible for:

* products
* inventory
* orders
* payment references
* customers
* WhatsApp orders
* sales reporting

---

## 2.4 Customer/User

Community member/customer.

Can:

* browse marketplace
* place orders
* contact merchants
* participate in Kameti
* chat
* find services
* request services
* calculate Zakat
* support projects
* access permitted finance features

---

# 3. Dashboard Rule

There are exactly four dashboard experiences.

```text
1. Super Admin
2. Community
3. Merchant
4. Customer/User
```

Roles do not create additional dashboards.

---

# 4. Pricing

Initial target:

```text
₹499 INR / community / month
```

The platform should not charge transaction fees during the initial MVP unless explicitly approved later.

The ₹499 subscription is the primary platform revenue model.

---

# 5. MVP Scope

## Phase 1

Foundation:

* project setup
* database
* authentication
* sessions
* multi-tenancy
* RBAC

---

## Phase 2

Super Admin:

* dashboard
* community management
* user management
* merchant oversight
* subscriptions
* reports
* audit logs
* security/risk overview

---

## Phase 3

Community:

* community profile
* members
* groups
* announcements
* merchant management
* marketplace management
* orders
* reports

---

## Phase 4

Merchant:

* merchant onboarding
* product management
* categories
* inventory
* orders
* payment references
* WhatsApp order workflow
* sales reports

---

## Phase 5

Customer:

* registration/login
* marketplace
* product details
* cart
* orders
* merchant contact
* profile
* notifications

---

## Phase 6

Kameti:

* create group
* invite/join members
* contribution schedule
* payment records
* verification
* payout records
* reports
* notifications

---

## Phase 7

Communication:

* direct chat
* group chat
* order chat
* Kameti chat
* project chat
* attachments
* reporting
* mute/block

---

## Phase 8

Jobs & Services:

* service categories
* provider profiles
* "I NEED A SERVICE"
* "I OFFER A SERVICE"
* requests
* status tracking
* contact

---

## Phase 9

Zakat:

* calculator
* methodology explanation
* calculation history where appropriate
* educational information

The calculator must clearly state its methodology and should not pretend that one calculation method is universally accepted where legitimate differences exist.

---

## Phase 10

Sadaqah:

* community giving
* donation records
* receipts/reference records
* project support

---

## Phase 11

Qard Hasan:

* request
* review
* approval
* agreement
* repayment tracking
* records
* notifications

No interest.

No interest-like fees disguised as service charges.

---

## Phase 12

Donation Crowdfunding:

* projects
* goals
* updates
* contributions
* payment references
* proof
* reporting

Donation projects must not promise financial returns.

---

## Phase 13

Islamic Finance

Initial supported contract models:

* Mudarabah
* Musharakah
* Murabahah
* Ijarah

Every contract requires:

* contract type
* parties
* roles
* amount
* terms
* duration
* risk information
* documents
* Shariah review state

---

# 6. Marketplace

Customers should be able to:

1. browse products
2. filter/search
3. open product details
4. add to cart
5. checkout
6. choose payment method
7. place order
8. track order
9. contact merchant

Initial payment methods:

```text
COD
Direct Merchant UPI
```

The platform records payment information but does not act as a wallet or escrow.

---

# 7. Merchant UPI

Merchant profile may contain:

* UPI ID
* QR code
* phone/WhatsApp
* business details

The checkout can instruct the customer to pay directly to the merchant.

The merchant/customer can record:

* UPI reference
* payment timestamp
* proof image where required

The platform must not claim successful payment solely because a user uploaded a screenshot.

Payment verification status must be separate from order status.

---

# 8. Order States

Example:

```text
PENDING
CONFIRMED
PROCESSING
READY
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
REJECTED
```

Payment states:

```text
UNPAID
PAYMENT_REPORTED
PAYMENT_VERIFIED
PAYMENT_REJECTED
REFUNDED
NOT_REQUIRED
```

Do not combine order state and payment state.

---

# 9. Kameti

Kameti must support:

* group creation
* contribution amount
* frequency
* member ordering/positions
* periods
* contribution records
* verification
* payout records
* reports

The system must clearly explain that the platform is recording and organizing the arrangement.

Do not imply that the platform is holding member money if it is not.

---

# 10. Jobs & Services

Two primary actions:

```text
I NEED A SERVICE
I OFFER A SERVICE
```

Examples:

* electrician
* plumber
* tutor
* accountant
* designer
* mechanic
* healthcare professional
* legal professional
* home services
* business services

The platform should support discovery and communication.

It must not imply professional licensing or certification unless actually verified.

---

# 11. Zakat

The Zakat module should provide:

* calculator
* assets/liabilities input
* methodology explanation
* result
* optional history

The methodology should be transparent.

Users should be encouraged to consult a qualified scholar for complicated cases.

---

# 12. Sadaqah

Sadaqah is donation/giving.

No financial return is promised.

Records should distinguish:

```text
SADAQAH
DONATION
INVESTMENT
QARD_HASAN
```

These are not interchangeable.

---

# 13. Qard Hasan

Qard Hasan means an interest-free loan.

The platform may organize:

* request
* lender/community review
* agreement
* principal amount
* repayment schedule
* repayments
* outstanding amount
* completion

The platform must never calculate interest.

---

# 14. Crowdfunding

Two distinct project types:

```text
DONATION
INVESTMENT
```

## Donation project

Shows:

* goal
* amount raised
* supporters
* project description
* updates
* contribution records

No financial return.

## Investment project

Requires much stronger safeguards.

Shows:

* contract type
* capital required
* participant role
* expected profit-sharing mechanism
* risks
* duration
* documents
* Shariah review
* legal eligibility

Until appropriate approval exists, user CTA may be:

```text
EXPRESS INTEREST
```

rather than:

```text
INVEST NOW
```

---

# 15. Notifications

Notifications may include:

* new announcement
* order update
* payment verification
* Kameti reminder
* Kameti payout
* service request
* project update
* finance review update
* subscription status
* security alerts

---

# 16. Reports

Community reports:

* members
* merchants
* marketplace
* orders
* sales
* Kameti
* donations
* projects
* permitted finance records

Super Admin reports:

* communities
* subscriptions
* system activity
* security
* risk
* platform usage

Reports must respect tenant boundaries.

---

# 17. Non-Goals for MVP

Do not implement:

* platform wallet
* cryptocurrency
* automatic investment payouts
* guaranteed returns
* interest-based loans
* platform escrow
* unauthorized financial intermediation
* complex payment gateway integration unless separately approved
* unnecessary social media features
* AI fatwa engine

---

# 18. Success Criteria

The MVP succeeds if:

1. Two communities can operate independently.
2. Community A cannot access Community B data.
3. Users can authenticate securely.
4. Community administrators can manage members.
5. Merchants can manage products.
6. Customers can place orders.
7. Direct UPI/COD flows work without platform custody.
8. Kameti records are accurate.
9. Zakat calculations are deterministic and documented.
10. Donation and investment concepts remain separate.
11. Islamic finance contracts are modeled explicitly.
12. Audit records exist for sensitive operations.
13. Application is usable on mobile.
14. Security tests pass.
15. Production build succeeds.
