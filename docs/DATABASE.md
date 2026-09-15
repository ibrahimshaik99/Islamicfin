# Database Specification

## Islamic Community Platform

Version: 1.0

---

# 1. Database Principles

Use a relational database.

Every tenant-owned entity must be associated with a community.

Use:

* foreign keys
* unique constraints
* indexes
* transactions
* timestamps
* appropriate numeric types

Do not use floating-point types for money.

---

# 2. ID Strategy

Use UUIDs or another secure non-sequential identifier strategy.

Do not expose predictable sequential IDs for sensitive resources where avoidable.

---

# 3. Common Timestamp Fields

Most tables should contain:

```text
created_at
updated_at
```

Use UTC internally.

Convert to the user's/community's timezone for display.

---

# 4. Users

```text
users

id
name
email
phone
password_hash
avatar_url
status
last_login
created_at
updated_at
```

Possible status:

```text
ACTIVE
SUSPENDED
DISABLED
PENDING
```

Email/phone uniqueness rules must be defined consistently.

---

# 5. Communities

```text
communities

id
name
slug
description
logo_url
address
city
state
country
contact_phone
status
created_at
updated_at
```

Slug must be unique.

---

# 6. Community Memberships

```text
community_memberships

id
community_id
user_id
role
status
joined_at
created_at
updated_at
```

Constraint:

```text
UNIQUE(community_id, user_id)
```

Role:

```text
COMMUNITY_OWNER
COMMUNITY_ADMIN
COMMUNITY_MODERATOR
COMMUNITY_FINANCE_MANAGER
MERCHANT
MERCHANT_STAFF
CUSTOMER
```

A platform-level Super Admin is not required to belong to every community.

---

# 7. Merchants

```text
merchants

id
community_id
user_id
business_name
description
phone
whatsapp
upi_id
upi_qr_url
address
verification_status
created_at
updated_at
```

Verification:

```text
PENDING
APPROVED
REJECTED
SUSPENDED
```

---

# 8. Product Categories

```text
product_categories

id
community_id
name
slug
status
created_at
updated_at
```

Category uniqueness should be tenant-scoped.

---

# 9. Products

```text
products

id
community_id
merchant_id
category_id
name
description
price
sale_price
sku
stock_quantity
status
created_at
updated_at
```

Money:

```text
NUMERIC
```

or integer minor units.

Never use floating-point money.

---

# 10. Product Images

```text
product_images

id
product_id
url
sort_order
created_at
```

---

# 11. Orders

```text
orders

id
community_id
order_number
customer_id
merchant_id
subtotal
delivery_fee
total
payment_method
payment_status
order_status
shipping_address
notes
created_at
updated_at
```

Order number should be unique within the community.

---

# 12. Order Items

```text
order_items

id
order_id
product_id
product_name_snapshot
quantity
unit_price
total
created_at
```

Store product name and price snapshots so historical orders do not change when the product changes later.

---

# 13. Payment Records

Payment information should be modeled separately from order state.

Suggested:

```text
payment_records

id
community_id
order_id
payment_method
amount
reference_number
proof_url
status
reported_by
verified_by
verified_at
created_at
updated_at
```

Status:

```text
REPORTED
VERIFIED
REJECTED
NOT_REQUIRED
```

The existence of a proof image does not automatically mean payment is verified.

---

# 14. Kameti Groups

```text
kameti_groups

id
community_id
name
description
contribution_amount
frequency
total_members
start_date
end_date
status
created_by
created_at
updated_at
```

---

# 15. Kameti Members

```text
kameti_members

id
kameti_group_id
user_id
position
status
joined_at
created_at
updated_at
```

---

# 16. Kameti Periods

```text
kameti_periods

id
kameti_group_id
period_number
due_date
status
created_at
updated_at
```

---

# 17. Kameti Contributions

```text
kameti_contributions

id
kameti_group_id
member_id
period_id
amount
payment_method
reference_number
proof_url
status
verified_by
verified_at
created_at
updated_at
```

---

# 18. Kameti Payouts

```text
kameti_payouts

id
kameti_group_id
member_id
period_id
amount
status
paid_at
reference_number
created_at
updated_at
```

The system must distinguish:

```text
contribution
payout
```

They are not the same transaction.

---

# 19. Conversations

```text
conversations

id
community_id
type
created_at
updated_at
```

Types:

```text
DIRECT
GROUP
ORDER
KAMETI
PROJECT
```

---

# 20. Conversation Members

```text
conversation_members

conversation_id
user_id
joined_at
last_read_message_id
```

Constraint:

```text
UNIQUE(conversation_id, user_id)
```

---

# 21. Messages

```text
messages

id
conversation_id
sender_id
message_type
body
attachment_url
created_at
edited_at
deleted_at
```

Do not expose deleted content unnecessarily.

---

# 22. Service Categories

```text
service_categories

id
community_id
name
status
created_at
updated_at
```

---

# 23. Service Listings

```text
service_listings

id
community_id
provider_id
category_id
title
description
price
location
availability
status
created_at
updated_at
```

---

# 24. Service Requests

```text
service_requests

id
community_id
requester_id
service_id
description
status
created_at
updated_at
```

---

# 25. Crowdfunding Projects

```text
crowdfunding_projects

id
community_id
creator_id
title
description
goal_amount
raised_amount
project_type
status
start_date
end_date
created_at
updated_at
```

Project type:

```text
DONATION
INVESTMENT
```

Never use one generic project type for both.

---

# 26. Crowdfunding Contributions

```text
crowdfunding_contributions

id
project_id
contributor_id
amount
contribution_type
payment_method
reference_number
proof_url
status
created_at
updated_at
```

Contribution type must remain consistent with the project type.

---

# 27. Finance Contracts

```text
finance_contracts

id
community_id
contract_type
title
description
initiator_id
status
currency
principal_amount
start_date
end_date
terms_version
shariah_review_status
created_at
updated_at
```

Contract types:

```text
MUDARABAH
MUSHARAKAH
MURABAHAH
IJARAH
QARD_HASAN
SADAQAH
```

---

# 28. Finance Participants

```text
finance_participants

id
contract_id
user_id
participant_role
contribution_amount
profit_share
ownership_share
created_at
updated_at
```

Not every field applies to every contract type.

Do not populate irrelevant financial fields merely to satisfy a schema.

---

# 29. Finance Terms

```text
finance_terms

id
contract_id
version
terms_json
effective_at
created_at
```

Terms must be versioned.

Historical contracts should retain the terms applicable at the relevant time.

---

# 30. Finance Assets

Required especially for asset-based structures such as Murabahah/Ijarah.

```text
finance_assets

id
contract_id
description
seller
purchase_price
purchase_date
ownership_status
possession_status
sale_price
sale_date
created_at
updated_at
```

The application must not imply ownership or possession merely because a record exists.

---

# 31. Finance Transactions

```text
finance_transactions

id
contract_id
type
amount
reference
payment_method
status
recorded_by
created_at
```

---

# 32. Finance Documents

```text
finance_documents

id
contract_id
document_type
file_url
version
created_at
```

Documents may be private.

Use access controls.

---

# 33. Finance Reviews

```text
finance_reviews

id
contract_id
reviewer
status
comments
reviewed_at
version
created_at
```

Review statuses:

```text
PENDING_REVIEW
REVIEWED
NEEDS_REVISION
ARCHIVED
```

---

# 34. Notifications

```text
notifications

id
user_id
community_id
type
title
body
data
read_at
created_at
```

---

# 35. Audit Logs

```text
audit_logs

id
community_id
actor_id
action
entity_type
entity_id
old_values
new_values
ip_hash
user_agent
created_at
```

Sensitive operations must generate audit records.

---

# 36. Subscriptions

```text
subscriptions

id
community_id
plan
price
currency
billing_period
status
started_at
expires_at
created_at
updated_at
```

Initial plan:

```text
₹499 / month
```

Do not assume payment processing functionality unless separately implemented.

---

# 37. Ledger Entries

If required:

```text
ledger_entries

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

This ledger records actual known transactions/records.

It must not create fictional platform balances.

---

# 38. Indexing

At minimum, index:

```text
community_id
user_id
merchant_id
customer_id
created_at
status
foreign keys
```

Use composite indexes for frequent tenant-scoped queries.

Examples:

```text
(community_id, status)
(community_id, created_at)
(community_id, merchant_id)
(community_id, customer_id)
```

---

# 39. Data Integrity

Use:

* foreign keys
* check constraints
* unique constraints
* transactions
* enum validation where appropriate

Examples:

```text
amount > 0
quantity > 0
goal_amount > 0
```

Do not rely only on frontend validation.

---

# 40. Deletion

Do not hard-delete financial history merely because a user requests deletion.

Follow applicable privacy/legal requirements while preserving required financial/audit records.

Use anonymization or controlled deletion where legally appropriate.

---

# 41. Migration Rules

Every schema change must use a migration.

Migration workflow:

```text
modify schema
↓
generate migration
↓
review migration
↓
apply locally
↓
run tests
↓
review indexes/constraints
↓
commit
```

Never blindly run generated destructive migrations against production.
