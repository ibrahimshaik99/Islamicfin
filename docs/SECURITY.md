# Security Specification

## Islamic Community Platform

Version: 1.0

---

# 1. Security Objective

Protect:

* user accounts
* community data
* merchant data
* customer information
* payment references
* financial records
* uploaded documents
* private messages
* audit logs

The platform must assume that clients can be malicious.

---

# 2. Threat Model

Assume attackers may attempt:

* account takeover
* password attacks
* session theft
* IDOR
* tenant escape
* privilege escalation
* fake payment proof
* duplicate submissions
* API abuse
* malicious file uploads
* SQL injection
* XSS
* CSRF where applicable
* rate-limit bypass
* unauthorized financial record changes

---

# 3. Authentication

Use secure authentication.

Requirements:

* password hashing
* secure sessions
* session expiration
* session revocation
* password reset
* login rate limiting
* suspicious login monitoring where feasible

Never store plaintext passwords.

Never return password hashes through APIs.

---

# 4. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this action?

Every protected endpoint requires authorization.

Never rely on:

```text
hidden buttons
frontend role checks
URL obscurity
client-supplied roles
```

---

# 5. Tenant Isolation

Tenant isolation is one of the highest-priority security requirements.

Every tenant-scoped query must apply the authenticated tenant context.

Unsafe:

```sql
SELECT * FROM orders WHERE id = ?
```

Safer concept:

```sql
SELECT *
FROM orders
WHERE id = ?
AND community_id = ?
```

The server must derive the community context from authenticated state and authorized membership.

---

# 6. IDOR Protection

An attacker must not be able to change:

```text
/order/123
```

to:

```text
/order/124
```

and access another user's order.

Check:

* tenant
* ownership
* role
* resource permissions

for every resource.

---

# 7. Role Security

Roles are server-controlled.

Never accept:

```json
{
  "role": "SUPER_ADMIN"
}
```

from an untrusted registration request.

Role changes must require authorization and should be audited.

---

# 8. Super Admin

Super Admin access is extremely sensitive.

Require:

* strong authentication
* strict authorization
* audit logs
* rate limiting
* secure session management

High-risk actions should require explicit confirmation.

Consider stronger authentication controls for production.

---

# 9. Financial Security

Financial operations must:

* validate amounts
* prevent negative values
* prevent duplicate submissions
* prevent replay
* use database transactions
* maintain audit history
* avoid floating-point calculations

Never trust:

```text
client-calculated total
client-calculated balance
client-supplied permission
```

Recalculate authoritative values on the server.

---

# 10. Payment Proof

A screenshot or reference number is evidence submitted by a user.

It is not automatic proof of successful settlement.

Statuses should distinguish:

```text
REPORTED
VERIFIED
REJECTED
```

Verification requires an authorized actor/process.

---

# 11. File Upload Security

For every upload:

* authenticate
* authorize
* validate size
* validate content type
* generate safe storage names
* avoid executable files
* store private files privately
* use signed URLs where appropriate
* prevent path traversal

Do not trust:

```text
filename
MIME type
extension
```

alone.

---

# 12. API Security

Validate:

* route parameters
* query parameters
* body
* headers where relevant
* uploaded files

Use Zod or equivalent schema validation.

Reject malformed input.

Do not return stack traces in production.

---

# 13. SQL Injection

Use parameterized queries/ORM APIs.

Never concatenate untrusted strings into SQL.

---

# 14. XSS

Escape output appropriately.

Sanitize rich text if rich text is supported.

Do not render arbitrary HTML from users.

---

# 15. CSRF

If cookie-based authentication is used, implement appropriate CSRF protections.

Use:

* SameSite cookies
* CSRF tokens where necessary
* origin checks where appropriate

---

# 16. CORS

Allow only required origins.

Do not use unrestricted:

```text
*
```

for sensitive authenticated APIs unless the architecture explicitly makes it safe.

---

# 17. Rate Limiting

Apply rate limits to:

* login
* password reset
* registration
* OTP flows if used
* messaging
* payment proof submissions
* sensitive admin APIs
* expensive calculations/reports

---

# 18. Secrets

Never commit:

```text
.env
API keys
database passwords
private keys
JWT secrets
service credentials
```

Use environment/secret management.

---

# 19. Logging

Log useful security events.

Do not log:

* passwords
* access tokens
* session secrets
* private payment credentials
* unnecessary personal information

Use request IDs for tracing.

---

# 20. Audit Logs

Audit:

* role changes
* community creation/deletion
* merchant approval
* financial record verification
* Kameti payout records
* finance contract changes
* Shariah review changes
* subscription changes
* security settings
* sensitive administrative actions

Audit logs should be difficult for ordinary users to modify.

---

# 21. Fraud & Risk

Risk detection should produce signals, not accusations.

Example status:

```text
FLAGGED
UNDER_REVIEW
CONFIRMED
DISMISSED
```

A flag does not prove fraud.

Do not publicly label a user fraudulent merely because an automated rule triggered.

---

# 22. Messaging Security

Users must only access conversations they belong to.

Check membership on:

* reading
* sending
* attachments
* editing
* deleting
* reporting

Do not expose message data through predictable IDs.

---

# 23. Privacy

Collect only data required for the feature.

Provide appropriate:

* privacy notice
* account controls
* data access/export where required
* deletion mechanisms where legally appropriate

Retain financial/audit information where necessary for legitimate legal/accounting purposes.

---

# 24. Security Headers

Use appropriate production security headers.

Examples:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Strict-Transport-Security
Frame protections
```

Exact configuration should match deployment architecture.

---

# 25. Dependency Security

Regularly review dependencies.

Avoid unnecessary packages.

Use lockfiles.

Do not install packages merely because generated code suggests them.

---

# 26. Security Tests

Required test categories:

```text
authentication bypass
authorization bypass
tenant isolation
IDOR
privilege escalation
SQL injection
XSS
CSRF where applicable
file upload abuse
rate-limit bypass
session attacks
```

---

# 27. Tenant Isolation Test

Create:

```text
Community A
Community B
```

Create resources in both.

Authenticate a user from A.

Attempt to access B resources through:

* direct API calls
* modified IDs
* modified URLs
* query parameters
* request bodies

Every unauthorized attempt must fail.

---

# 28. Production Security Checklist

Before production:

* HTTPS enabled
* secrets configured securely
* debug disabled
* production error responses sanitized
* rate limiting active
* database backups configured
* monitoring configured
* audit logs active
* authorization tested
* tenant isolation tested
* file upload security tested
* dependency audit performed
* financial calculations tested
* legal/privacy review completed

---

# 29. Security Principle

Assume:

> The browser is hostile.

The server is responsible for enforcing trust.
