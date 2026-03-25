# FieldCast Hardening Implementation Plan

## What Changed

### 1. Strict RBAC at Every Layer
- **`src/lib/authz/index.ts`** — Centralized authz utilities: `requireAuth()`, `requireRole()`, `requireFarmerWithFarm()`. Used by all API routes.
- **`src/lib/supabase/middleware.ts`** — Role-gated middleware: farmer-only paths (`/dashboard`, `/record`, `/drafts`, `/setup-farm`) redirect buyers to `/listings`. Auth-required paths redirect unauthenticated users to `/login`.
- **All API routes** — Hard role checks at the server boundary, not relying on client-side nav visibility.

### 2. Role Integrity
- **`src/app/api/auth/callback/route.ts`** — Role is now **immutable after first creation**. Existing users cannot change role via URL parameter. Prevents role escalation attacks.

### 3. Data Boundaries
- **Dashboard** (`dashboard/page.tsx`) — Explicit column selects instead of `*` wildcards.
- **Listings API** (`api/listings/route.ts`) — Buyer-safe columns only; no internal fields exposed.
- **Subscriptions API** (`api/subscriptions/route.ts`) — Explicit column selects.
- Voice note transcripts remain farmer-only (accessed only via farmer auth in draft review page).

### 4. AI Pipeline Hardening
- **`src/lib/ai/schema.ts`** — Zod schemas for AI output validation:
  - Type coercion (string numbers → numbers)
  - Category normalization (case-insensitive, prefix matching)
  - Fulfillment type normalization
  - Confidence range clamping with fallback defaults
  - Safe defaults for all optional fields
- **`src/lib/ai/extract.ts`** — Production-safe extraction pipeline:
  - Retry with repair prompt (up to 2 retries)
  - Schema validation after each attempt
  - Fallback draft with `needs_review` status on total failure
  - Structured metrics logging (attempts, parse failures, validation failures, latency)
- **Idempotency** — Voice transcribe route checks for recent duplicate drafts (10-second window).

### 5. Notification Delivery System
- **`src/lib/notifications/types.ts`** — Interfaces: `ChannelAdapter`, `NotificationJob`, `DeliveryResult`, `DeliveryStatus`
- **`src/lib/notifications/adapters.ts`** — Mock email/SMS adapters (swap for real providers)
- **`src/lib/notifications/dispatcher.ts`** — Full delivery workflow:
  - State machine: `pending → sending → sent | failed → dead_letter`
  - Retry with capped backoff (1s, 3s, 5s)
  - Dead-letter strategy for permanently failed notifications
  - Structured logging throughout
- **`src/app/api/drafts/publish/route.ts`** — Uses dispatcher instead of raw DB inserts.

### 6. UX Improvements
- **Draft edit** — `saving` loading state on Save button, prevents double-clicks.
- **Publish** — Double-publish guard (`if (publishing) return`).
- **Pickup times** — Formatted as "2:00 PM" instead of raw ISO strings.
- **Edit form** — Time inputs correctly pre-populated from ISO timestamps.

### 7. Tests (32 passing)
- **`src/tests/ai-schema.test.ts`** (11 tests) — Schema validation: valid inputs, category normalization, type coercion, defaults, edge cases.
- **`src/tests/notifications.test.ts`** (5 tests) — Notification dispatch: delivery, filtering, retry, dead-letter, empty case.
- **`src/tests/utils.test.ts`** (16 tests) — Utility functions: time normalization, formatting, price formatting.

## New Dependencies
- `zod` — Schema validation for AI outputs
- `vitest` (dev) — Test runner

## New Environment Variables
None — all existing env vars remain unchanged.

## Risks & Tradeoffs
- **Notification delivery is synchronous** — runs in the publish API response. For high subscriber counts, consider moving to a background job queue. The adapter pattern makes this a straightforward future migration.
- **Mock adapters** — Email/SMS adapters log instead of sending. Replace `MockEmailAdapter`/`MockSmsAdapter` with real provider SDKs (Resend, Twilio) when ready.
- **Role immutability** — Users cannot switch roles. If needed, add an admin mechanism.
- **Middleware role check** queries the `users` table on every farmer-path request. This adds one lightweight DB call per request but ensures security.
