Shariah Governance and Islamic Finance Specification
Islamic Community Platform

Version: 1.0

1. Purpose

This document defines how the platform should represent Islamic financial concepts.

It is a product and software specification, not a fatwa.

Final Shariah determinations should be made by qualified scholars/reviewers appropriate to the relevant context.

2. Core Principle

Do not make conventional financial products appear Islamic merely by changing their names.

The software must represent the actual economic and contractual structure.

3. Financial Categories

The platform distinguishes:

SADAQAH
DONATION
QARD_HASAN
MUDARABAH
MUSHARAKAH
MURABAHAH
IJARAH

These must not be collapsed into one generic "Islamic finance" transaction.

4. Sadaqah

Sadaqah is voluntary charitable giving.

Product behavior:

contribution
no promised financial return
no investment ownership
no repayment obligation

The interface should communicate its charitable nature clearly.

5. Donation Crowdfunding

Donation crowdfunding is charitable/community support.

A project may contain:

title
description
goal
amount raised
deadline
updates
contribution records

Do not display:

expected profit
ROI
guaranteed return
investment yield

for donation projects.

6. Qard Hasan

Qard Hasan is an interest-free loan.

Core principle:

Principal is advanced and repaid without interest.

The software may manage:

request
review
approval
agreement
principal
repayment schedule
repayments
outstanding principal
completion

Do not calculate interest.

Do not disguise interest as an arbitrary fee.

Any administrative cost structure requires appropriate legal and Shariah review.

7. Mudarabah

Mudarabah is a partnership structure involving capital and entrepreneurial management.

The software should represent:

capital provider(s)
entrepreneur/manager
contributed capital
agreed profit-sharing ratio
business/project
duration
risk disclosures
accounting/reporting

Do not promise a guaranteed fixed profit merely because a user invested capital.

Profit-sharing must be represented according to the approved contract.

8. Musharakah

Musharakah is a partnership involving contributions/ownership interests.

The platform should record:

participants
contributions
ownership shares where applicable
profit-sharing terms
loss rules where applicable
project/assets
duration
exit/termination terms

Do not represent every partnership as a debt.

9. Murabahah

Murabahah is a cost-plus sale structure.

Where used, the software should be capable of representing the relevant sequence, including:

asset identification
↓
purchase/acquisition
↓
ownership/possession as applicable
↓
sale to customer
↓
disclosed cost
↓
disclosed profit
↓
sale price
↓
payment terms

Do not merely label an interest-bearing cash loan "Murabahah."

The exact Shariah requirements must be reviewed by qualified scholars.

10. Ijarah

Ijarah is a leasing structure.

The platform may record:

asset
owner/lessor
lessee
rent
rental periods
maintenance responsibilities
commencement
end date
termination
ownership/end-of-term arrangements where relevant

Do not automatically convert every rental-like transaction into Ijarah without review.

11. Investment Crowdfunding

Investment projects must be completely separate from donation projects.

Before enabling real-money investment functionality, require:

Shariah review
legal/regulatory review
contract documentation
participant eligibility
risk disclosure
appropriate records

Until approved, use:

EXPRESS INTEREST

instead of an unconditional:

INVEST NOW

where appropriate.

12. No Guaranteed Returns

Do not create UI language such as:

Guaranteed 12% return
Guaranteed monthly profit
Risk-free Islamic investment
Fixed halal return

unless a qualified legal/Shariah framework explicitly supports the statement—and in many investment structures such guarantees would be inappropriate.

The software should clearly communicate risk.

13. Shariah Review Workflow

Every sensitive Islamic finance contract/project should support:

PENDING_REVIEW
REVIEWED
NEEDS_REVISION
ARCHIVED

A review record should contain:

reviewer
review status
comments
review date
document/version
14. No Generic "HALAL" Label

Do not display:

HALAL
SHARIAH COMPLIANT

as a generic automated label.

Instead display specific review information, such as:

Shariah Review: Reviewed
Reviewer: [authorized reviewer]
Review Version: 1
Reviewed On: [date]

where appropriate.

15. Contract Versioning

A contract must have a version.

If material terms change:

create new version
record review state
retain historical version

Do not silently rewrite an already-approved contract.

16. Documents

Finance contracts may require:

agreement
terms
asset documents
disclosures
review documents
receipts
payment records

Documents should be versioned and access controlled.

17. AI Restrictions

AI must not:

issue fatwas
declare a novel transaction halal/haram with certainty
override a qualified reviewer
fabricate scholarly approval
invent citations
present generated text as an official Shariah ruling

AI may:

explain approved concepts
summarize approved documents
help users navigate the application
provide educational information
flag a case for human review
18. Zakat

The Zakat calculator must state its methodology.

Different scholarly approaches can exist regarding certain assets, liabilities, valuation methods, and details.

Therefore:

expose the methodology
avoid pretending there is only one universally accepted calculation in every case
allow appropriate configuration where required
advise consultation with a qualified scholar for complex cases

The software should calculate according to the selected methodology consistently.

19. Islamic Terminology

Use terminology accurately and respectfully.

Examples:

Qard Hasan
Mudarabah
Musharakah
Murabahah
Ijarah
Sadaqah
Zakat

Do not use terminology as decorative branding.

20. Community Governance

Communities may have their own qualified scholars or Shariah advisors.

The system should support:

reviewer identity
review status
review comments
versioning
review history

Super Admin may manage governance metadata, but should not fabricate religious approval.

21. Legal vs Shariah Approval

These are different.

A transaction may require:

Shariah review
AND
legal/regulatory review

One does not automatically replace the other.

22. User Disclosures

Sensitive financial screens should clearly show:

contract type
parties
amount
duration
financial terms
risks
fees if any
obligations
Shariah review status
legal eligibility/status where applicable

Avoid dark patterns.

Do not hide material terms.

23. Governance Principle

The software should help users understand the structure rather than making unsupported religious claims.

The principle is:

Accurate representation, transparency, accountability, and human review.