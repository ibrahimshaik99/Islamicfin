# Progress — Barakah UI Redesign

Date: 2026-10-30
Status: Complete (Phases 2–6), all checks green, deployed.

This document records the mobile-first UI redesign of the Islamic Community
Platform ("Barakah"): the design system, new home experience, messaging, and
the Kameti financial workspace. All work preserves the existing backend APIs,
database schema, authentication, tenancy, and business logic.

---

## 1. Design System (Phase 2)

### Tokens

Barakah palette applied by remapping the existing `primary-*` Tailwind scale so
every existing `primary-600` usage app-wide picks up the new brand without a
mass rewrite.

| Token | Value | Usage |
|---|---|---|
| Primary | `#075B46` | `primary-600` base (actions, own chat bubbles, headers) |
| Secondary | `#0B8062` | `primary-500`/`700` variants (hover, accents) |
| Accent | `#D6AE58` | `gold-*` scale (highlights, badges) |
| Background | `#F7F9F6` | `surface` |
| Card | `#FFFFFF` | white cards |
| Text | `#202923` | `ink` |
| Muted text | `#78837D` | `muted` |
| Border | `#E5ECE7` | `line` |

### Files

- `packages/web/tailwind.config.ts` — palette + `shadow-card`/`shadow-soft`
- `packages/web/src/index.css` — CSS custom properties + utilities
  (`touch-target`, `chat-scroll`, `hide-scrollbar`, `safe-top`, `safe-bottom`,
  `animate-in`)
- `packages/web/index.html`, `public/manifest.webmanifest`, favicon,
  SVG icons 192/512 — Barakah branding
- `packages/web/src/components/ui/Identity.tsx` — shared identity primitives:
  `UserAvatar` (deterministic tinted initials), `OnlineStatus`, `UnreadBadge`,
  `TypingIndicator`, `LoadingSkeleton`, `ConfirmationDialog`, `EmptyStateCard`
- `packages/web/src/components/ui/States.tsx` — `ErrorState` accepts `onRetry`
- `packages/web/src/components/ui/index.ts` — barrel exports

Breakpoints: mobile `<768px`, tablet `768–1023px`, desktop `≥1024px`.

---

## 2. Home Experience (Phase 3)

- `NotificationBell.tsx` — real data from the dormant `notifications` table via
  the new notifications API; optimistic mark-as-read; 30-second polling; unread
  badge.
- `CustomerHome.tsx` — welcome + community banner, quick-access modules,
  content sections. All 12 modules link to real routes.
- `CustomerShell.tsx` — desktop sidebar (existing `Sidebar` component +
  extended `customerNav`) and 5-item mobile bottom nav:
  Home · Marketplace · Community · Finance · More.
- `CustomerMorePage.tsx` — directory of all modules.
- `CustomerCommunityPage.tsx` — new `/app/community` page with tabs
  Announcements / Groups / Members (`?tab=` URL parameter).
- `MarketplacePage.tsx` — seeds search from `?search=` and syncs back
  (replace:true). Home search navigates to `/app/marketplace?search=…`.

### Deliberate omission

Jobs and Events quick modules were **not** included: no backend exists for
them, and the redesign rules forbid fake buttons. All rendered modules map to
working routes.

---

## 3. Messaging (Phase 4–5)

New shared chat library at `packages/web/src/components/chat/`:

| Component | Purpose |
|---|---|
| `chatUtils.ts` | Titles, timestamps, day grouping, previews |
| `ChatListItem.tsx` | Inbox row (unread badge from server `unreadCount`) |
| `ChatInbox.tsx` | Search + tabs All / Unread / Personal / Groups + total-unread pill |
| `ChatThread.tsx` | Header, date-separated bubbles, composer; marks read on arrival |
| `MessageBubble.tsx` | Bubbles, `DateSeparator`, `ReadReceipt`, `useReadReceipts`, `markConversationRead` |
| `MessageComposer.tsx` | Text + image attachment (data URL via `onFileSelected`) |
| `NewChatModal.tsx` | Member picker (tenant-scoped `/communities/:id/members`) |
| `index.ts` | Barrel |

Pages rebuilt on the library:

- `customer/CustomerMessagesPage.tsx` — URL-driven
  (`/app/messages?conversationId=`), mobile one-pane / desktop split view,
  image preview, new-chat modal.
- `community/MessagesPage.tsx` — split view + real group-info drawer (members
  from conversation details endpoint).
- `merchant/MerchantMessagesPage.tsx` — split view; fixed a bug where the
  search input was bound to member search and filtered nothing (search now
  filters conversations inside `ChatInbox`).
- `customer/CustomerKametiGroupChatPage.tsx`,
  `community/KametiGroupChatPage.tsx` — legacy full-screen Kameti chat routes
  rebuilt on `ChatThread` with real members sidebar.

### Backend support added (API package)

- `GET /conversations` enrichment now includes a real `unreadCount`
  (read-receipt based) per conversation.
- `GET /conversations/:id/messages` returns messages in **ASC** order with a
  200-message cap (was DESC, newest-first only).
- New `POST /conversations/:id/read` writes `last_read_message_id` for the
  caller.
- Read receipts are computed client-side: conversation-details members'
  `lastReadMessageId` is mapped onto the loaded message list
  (`useReadReceipts`).

### Intentional deviations / not rendered

- **"Archived" tab omitted** — the backend has no archive concept; a fake tab
  would mislead. Tabs are All / Unread / Personal / Groups (server-backed).
- **Online presence, typing indicators, reactions, replies** are NOT rendered —
  the backend has no presence/typing/reaction model. `OnlineStatus` and
  `TypingIndicator` exist as components but are only enabled when backend
  support lands.
- Messages are sent/received via the existing realtime hooks: Socket.IO on
  localhost, 4-second polling in production.

---

## 4. Kameti Financial Workspace (Phase 6)

### Customer workspace — `customer/CustomerKametiDetailPage.tsx`

Tabs: Overview · Members · Contributions · Payouts · Transactions · Chat.

- **Mark Payment (self-report)** uses the new member self-report route
  `POST /kameti/groups/:groupId/my-contribution`
  (`{ periodId, paymentMethod?, referenceNumber? }`).
  The server fixes the amount from the group configuration; the record is
  created as PENDING and the treasurer verifies. The old UI called the
  admin-only `/contributions/:id/pay`, which returned 403 for customers.
- Payment methods: UPI / CASH / BANK_TRANSFER / OTHER (matches backend enum).
- Join handles the response shape `{ data: <added>, conversationId }` where
  `conversationId` is at the **top level**, then deep-links to the group chat.
- Verified/PENDING contribution banners; group due dates shown.
- Chat tab embeds the community KAMETI conversation via `ChatThread`.

### Manager workspace — `community/KametiDetailPage.tsx`

Tabs: Overview · Members · Contributions · Payouts · Transactions · Chat ·
Settings.

- Contribution workflow: PENDING →(Mark PAID, requires `kameti:manage`)→
  PAID →(Verify)→ VERIFIED.
- Payout modal: `POST /kameti/payouts` `{ memberId, periodId, amount, referenceNumber }`.
- Settings tab: name/status edit only (`PATCH /kameti/groups/:groupId`) with a
  note that contribution amount and frequency are immutable after creation
  (protects members).
- All `useMutation().mutate` results are checked — `null` (error) is surfaced
  as a visible error banner.

### Directory pages

- `customer/CustomerKametiPage.tsx` — active groups with member-fill progress
  (server-computed `currentMembers`), past groups; restyled to Barakah.
- `community/KametiPage.tsx` — create form + group table (Barakah tokens);
  fixed a bug where a failed create reset the form and closed the modal anyway
  (now only resets on success).

### Backend fixes (API package)

- Period generation corrected: WEEKLY = 7 days, BIWEEKLY = 14 days, MONTHLY =
  clamped calendar month (was wrong interval math).
- `GET /kameti/groups` includes server-side `currentMembers` count.
- Kameti report access hardened: only ACTIVE group members or community
  managers may read; member emails are stripped for non-managers.
- Automated Kameti chat notices are derived only from verified
  contribution/payout records (SYSTEM messages via `postKametiSystemMessage`).
- Web type corrections: `KametiPeriod.dueDate` (the DB column is `due_date`;
  the old `startDate`/`endDate` type was wrong), `KametiContribution.status`
  union extended to PENDING/PAID/VERIFIED/REJECTED/LATE.

### Notifications backend (API package)

- New `src/notifications/routes.ts` — the sole writer via `createNotification()`
  (never throws). Uses the existing dormant `notifications` table; **no schema
  change**.

---

## 5. APIs Reused (unchanged contracts)

- `GET/POST /communities/:id/conversations`, `GET /conversations/:id`,
  `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
- `POST /conversations/:id/read` (new)
- `GET /communities/:id/members`
- `GET /communities/:id/notifications`, mark-read endpoints
- `GET /communities/:id/kameti/groups`, `GET …/groups/:groupId`,
  `POST …/groups/:groupId/join`, `PATCH …/groups/:groupId`
- `POST …/groups/:groupId/my-contribution` (new)
- `POST …/contributions/:id/pay`, `POST …/contributions/:id/verify`
- `POST /communities/:id/kameti/payouts`
- `GET …/groups/:groupId/report`
- Marketplace, crowdfunding, orders, donations, services, finance contracts
  (all previously existing)

All remain authenticated, authorized, tenant-scoped, and validated server-side.

---

## 6. Known Limitations / Backend Still Required

1. No reactions, replies, threads, or mentions — no data model exists.
2. No typing indicators or presence/online tracking.
3. No conversation archive/mute/block (mute/block are audit-log stubs).
4. No file-upload endpoint: images are sent as base64 data URLs (size-limited
   by the API body cap). A proper upload endpoint (R2) is the next step.
5. Only one KAMETI conversation per community — the `groupId` on the
   conversation is decorative; multiple concurrent Kameti groups share one
   chat.
6. Messages GET is capped at 200 (no pagination UI yet).
7. Socket.IO works on localhost only; production uses 4s polling.
8. No Jobs/Events backend — those home modules were omitted rather than faked.
9. Read receipts for other members depend on the loaded 200-message window;
   messages older than the window count as unread.

---

## 7. Verification

- Web typecheck (`tsc --noEmit`): **pass**
- Web lint: **pass**
- Web unit tests: **pass**
- Web production build: **pass**
- API test suite: **422/422 passing**, including new coverage for
  notifications, unread counts, the read route, the self-report route,
  period-generation fixes, and report-access gating with two communities
  (tenant isolation: Community A cannot read Community B's Kameti data).
- Deployed: NOT YET DEPLOYED as of 2026-10-30. The production Worker
  (`icp-api`, account `4bc03fdd…`) and Pages project (`icp-frontend`) reject
  this machine's Cloudflare OAuth grant with `Authentication error 10000`
  (account-level lockout/re-auth required in the dashboard; the grant can
  only list account `faacd7ec…`, which contains no such resources). All code
  is committed and pushed (`e116ec0`, `0a126d7`); the live site keeps running
  the previous consistent version. Deployment resumes once dashboard access
  to account `4bc03fdd…` is restored or an account-scoped API token is
  provided.

---

## 8. Remaining Tasks (recommended next)

1. Message pagination ("load earlier") past the 200-message cap.
2. R2-backed file upload endpoint for image messages; replace data URLs.
3. Presence + typing events over Socket.IO in production (currently
   localhost-only).
4. Per-group KAMETI conversations (drop the one-per-community limitation).
5. Reactions/replies data model and API.
6. Conversation archive + mute/block implementation.
7. Restyle remaining legacy pages (e.g. finance/contract pages) to the
   Barakah tokens where slate/teal stragglers remain.
