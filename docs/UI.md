# UI/UX Specification

## Islamic Community Platform

Version: 1.0

---

# 1. Design Goal

The application should feel:

* trustworthy
* modern
* clean
* welcoming
* community-oriented
* Islamic without being visually excessive

Avoid overusing:

* green
* gold
* Arabic patterns
* decorative Islamic imagery

The interface should feel like a modern SaaS product with subtle Islamic identity.

---

# 2. Responsive Design

Mobile-first.

Breakpoints:

```text
<768px
Mobile

768–1023px
Tablet

>=1024px
Desktop
```

Every major workflow must work on mobile.

---

# 3. Four Dashboard Experiences

Exactly:

```text
Super Admin
Community
Merchant
Customer/User
```

Do not create additional dashboard categories.

---

# 4. Super Admin UI

Navigation:

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

Dashboard cards may include:

* active communities
* subscriptions
* users
* merchants
* orders
* projects
* risk alerts
* security events

Do not expose unnecessary tenant data on overview screens.

---

# 5. Community UI

Navigation:

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

# 6. Merchant UI

Navigation:

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

Merchant users must not see other merchants' private management data.

---

# 7. Customer UI

Navigation:

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

Mobile bottom navigation:

```text
Home
Marketplace
Kameti
Chat
Profile
```

---

# 8. Home Screen

Customer home may contain:

* community announcements
* marketplace highlights
* Kameti reminders
* service listings
* donation projects
* relevant notifications

Avoid overwhelming the user.

---

# 9. Marketplace

Product cards should show:

* image
* name
* price
* sale price where applicable
* merchant
* availability

Product detail:

* images
* description
* price
* stock
* merchant
* contact
* add to cart

---

# 10. Checkout

Checkout must clearly show:

```text
Items
Subtotal
Delivery
Total
Payment Method
Delivery Address
Notes
```

Payment methods:

```text
Cash on Delivery
Direct Merchant UPI
```

For UPI:

```text
Pay directly to merchant
UPI ID
QR
Amount
Reference number
Payment proof
```

Clearly state that payment is made directly to the merchant where applicable.

---

# 11. Order Tracking

Display:

```text
Order Placed
Confirmed
Processing
Ready
Out for Delivery
Delivered
```

If cancelled/rejected:

```text
Cancelled
Rejected
```

Payment status must be displayed separately.

---

# 12. Kameti UI

Show:

* group name
* contribution amount
* frequency
* members
* current period
* due date
* contribution status
* payout schedule
* history

Avoid making the interface imply that the platform is holding funds.

---

# 13. Jobs & Services

Prominent actions:

```text
I NEED A SERVICE
I OFFER A SERVICE
```

Use simple cards for:

* category
* provider
* location
* availability
* price where provided

---

# 14. Zakat UI

Use a guided step-by-step flow.

Example:

```text
1. Cash
2. Bank balances
3. Gold/Silver
4. Business assets
5. Debts/liabilities
6. Other applicable assets
7. Methodology
8. Result
```

Show the methodology.

For complex cases, encourage qualified scholarly consultation.

---

# 15. Sadaqah UI

Clearly label giving as:

```text
Sadaqah
Donation
```

Do not use investment terminology.

---

# 16. Qard Hasan UI

Display:

```text
Interest-free loan
Principal
Repayment schedule
Outstanding principal
Status
```

Avoid conventional loan terminology where it creates confusion.

No interest calculation.

---

# 17. Crowdfunding UI

Donation and investment projects must look visibly different.

## Donation

Display:

```text
Community Support
Goal
Raised
Supporters
```

CTA:

```text
Support Project
```

## Investment

Display:

```text
Investment Opportunity
Contract Type
Capital
Terms
Duration
Risks
Shariah Review
Legal Eligibility
Documents
```

CTA before full approval:

```text
Express Interest
```

---

# 18. Islamic Finance UI

Every finance contract page should show:

```text
Contract Type
Parties
Roles
Capital/Amount
Duration
Terms
Profit Sharing / Ownership where applicable
Risks
Documents
Shariah Review
Version
Status
```

Do not hide important terms behind tiny links.

---

# 19. Shariah Review Display

Use a transparent status component.

Example:

```text
Shariah Review
Status: Reviewed
Reviewer: Authorized Reviewer
Version: 2
Reviewed: 10 Sep 2026
```

Do not automatically show:

```text
HALAL
```

unless there is an appropriate governance reason and human approval.

---

# 20. Notifications

Use:

* notification bell
* unread count
* clear categories
* timestamps
* read/unread state

Security notifications should be visually distinct.

---

# 21. Forms

Forms should:

* have clear labels
* show validation errors
* preserve user input when safe
* show required fields
* prevent accidental duplicate submission
* show success feedback

Do not rely only on placeholder text as labels.

---

# 22. Loading States

Every page that fetches data should have a loading state.

Use:

* skeletons
* spinners where appropriate
* disabled submit states

Avoid blank screens.

---

# 23. Empty States

Every list needs a useful empty state.

Example:

```text
No products yet.

Add your first product to start selling to community members.
```

Do not show empty tables without explanation.

---

# 24. Error States

Errors should be:

* understandable
* actionable
* non-technical

Bad:

```text
ERR_DB_23505
```

Better:

```text
This product could not be saved because its SKU is already in use.
```

Do not expose internal implementation details.

---

# 25. Confirmation

Require confirmation for destructive actions:

* deleting products
* suspending merchants
* removing members
* cancelling important transactions
* administrative changes

For irreversible actions, explain consequences.

---

# 26. Accessibility

Support:

* keyboard navigation
* visible focus
* semantic HTML
* labels
* alt text
* sufficient contrast
* accessible dialogs
* screen reader-friendly controls

---

# 27. Mobile

On mobile:

* avoid wide tables
* use cards or horizontal scrolling where necessary
* keep important actions reachable
* use bottom navigation for customer app
* use sticky actions only when helpful
* avoid tiny buttons

---

# 28. Desktop

On desktop:

* use side navigation
* use responsive content widths
* support tables where useful
* provide filters/search
* avoid excessive empty space

---

# 29. Trust

Financial interfaces must be especially clear.

Always show:

```text
What is happening?
Who is paying whom?
What does the platform do?
What does the platform not do?
What is the financial obligation?
What is the risk?
```

Never use deceptive urgency.

---

# 30. Visual Language

Suggested design:

```text
Background: neutral/light
Primary: deep green or similarly trustworthy color
Accent: restrained
Cards: subtle borders/shadows
Typography: clean sans-serif
Icons: simple
```

Islamic identity should be subtle and dignified.

---

# 31. UI Architecture

Use reusable components:

```text
Button
Input
Select
Modal
Drawer
Card
Table
Badge
Tabs
Toast
Alert
EmptyState
LoadingState
ErrorState
Pagination
FileUpload
MoneyInput
StatusBadge
```

Create domain-specific components where useful:

```text
OrderStatus
PaymentStatus
KametiContributionStatus
FinanceReviewStatus
RiskStatus
```

---

# 32. Frontend Security

Never assume hiding a UI element is authorization.

Example:

```text
Hide "Approve Merchant"
```

does not replace server-side authorization.

The API must enforce the permission.

---

# 33. UI Completion Standard

A page is not complete until it has:

* responsive design
* loading state
* empty state
* error state
* validation
* accessibility
* authorization-aware actions
* mobile support
* appropriate confirmation
* tests where applicable
