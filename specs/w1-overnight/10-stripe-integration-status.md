# 10 — Stripe Connect integration status

Date: 2026-05-07

## 1. Search basis

Patterns: `stripe`, `Stripe`, `STRIPE_*`, `@stripe/`, `/webhooks/stripe`, `stripe.webhooks.constructEvent`, `application_fee_amount`, `on_behalf_of`, `transfer_data`, `15%`, `platform_fee`, `application_fee`, `revenue.?split`.

## 2. Touchpoint inventory

| Surface | File:line | What it is |
|---|---|---|
| Doppler path scheme | `src/lib/shared/CredentialAdapter.js:13` (docblock), `:96–104` (`getStripeConnect()` method), `:101` (path `STRIPE_CONNECT_${providerId}`) | Defines per-provider Stripe Connect credential location. **Does not call Stripe.** Returns `{status, value, path, source, fetchedAt}`. |
| Test of Stripe path | `tests/credentialadapter-integration.test.js:167–178` | Asserts that `getStripeConnect('acme')` builds Doppler call `{project: 'flowai', config: 'prod', name: 'STRIPE_CONNECT_acme'}` |
| UI placeholder #1 | `src/pages/Billing.jsx:84–86` | `await new Promise(r => setTimeout(r, 1500)); alert('To enable Pro billing, connect Stripe or Wix Payments…');` — fake upgrade flow |
| UI placeholder #2 | `src/components/gtm/BillingPanel.jsx:66` | Same pattern — `alert()` mentioning Stripe |
| Marketplace catalog entry | `src/lib/toolRegistry.js:46` | Stripe listed in Payments category — informational only |
| Marketplace seed | `api/_lib/marketplaceSeed.js:266–302` (per `specs/w4-overnight/07-pressai-stripe.md:14`) | Catalogs Stripe + Plaid as marketplace tools — informational only |
| Vendor-stability signal | `api/_lib/marketplace.js:40` (per `specs/w4-overnight/07-pressai-stripe.md:13`) | Classifies `acquired_by_stripe` as a vendor-stability signal — not an integration |
| Package declarations | `package.json:51, 52` | `@stripe/react-stripe-js@^3.0.0`, `@stripe/stripe-js@^5.2.0` |
| Package import sites | (none) | Grep `from '@stripe/` in `src/`, `api/`, `base44/` returns **0 matches** — packages bundled, never used |
| `STRIPE_SECRET_KEY` references | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181` | Documentation only — env var is **never read in code** |
| `STRIPE_WEBHOOK_SECRET` references | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181` | Documentation only — env var is **never read in code** |
| `/api/stripe*` or `/api/billing*` endpoint | `api/billing.js`, `api/stripe-webhook.js`, etc. | **NONE** — no such files exist |
| `/webhooks/stripe` route | (none) | No webhook handler in `api/` or `base44/functions/` |

## 3. Webhook signature verification

| Item | Status |
|---|---|
| Webhook handler file | **MISSING** — no `api/billing/stripe-webhook.js` or equivalent |
| `stripe.webhooks.constructEvent` call | **NONE** — Grep returns 0 matches |
| Raw-body capture (Vercel `bodyParser: false`) | **NOT CONFIGURED** — would be required if a handler existed |
| `STRIPE_WEBHOOK_SECRET` read in code | **NONE** — env var named in docs only |
| Replay protection / signature timing-attack resistance | **N/A** — handler doesn't exist |

**Status:** placeholder only. The W4 audit (`specs/w4-overnight/07-pressai-stripe.md:50–64`) already documents the full implementation plan: new `api/billing/stripe-webhook.js` endpoint, `bodyParser: false`, `stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)`. None of this is built.

## 4. Idempotency handling

| Item | Status |
|---|---|
| Idempotency-key check on inbound webhook | **MISSING** |
| `processed_webhook_events` table or in-memory map | **MISSING** |
| `(event_id, source)` unique constraint | **MISSING** |
| `webhookSeen(eventId)` helper | **MISSING** |
| Replay-safe side effects | **N/A** (no handler) |
| Retention policy aligned with Stripe ~3-day replay window | **MISSING** |

**Status:** zero idempotency surface. The closest primitive in the repo is the generic audit log via `api/_lib/db.js:appendAuditEntry` (per `specs/w4-overnight/07-pressai-stripe.md:69`), which is append-only but not unique-keyed by webhook event ID.

## 5. Stripe Connect platform fee (W0 ruling: 15%)

| Item | Status |
|---|---|
| `application_fee_amount` parameter usage | **NONE** — Grep returns 0 hits across repo |
| `on_behalf_of` parameter usage | **NONE** |
| `transfer_data[destination]` usage | **NONE** |
| Hardcoded 15% fee constant anywhere | **NONE** — Grep `15%`, `0.15`, `platform_fee`, `application_fee` returns 0 functional hits |
| Documentation of the 15% fee | **NONE** found in repo. The W0 ruling for 15% is referenced in this overnight brief but not committed to any spec or doc on disk. |
| Revenue-split tracking schema | **MISSING** — no `revenue_splits` table, no `provider_payouts` table |
| Provider payout reporting endpoint (e.g. `/api/billing/payouts`) | **MISSING** |
| Audit event for `application_fee.created` / `payout.paid` | **MISSING** — no consumer of these Stripe events |

**Status:** the 15% platform fee is **entirely unimplemented**. There is no fee constant, no Stripe API call that sets `application_fee_amount`, no audit trail that records platform vs provider revenue.

## 6. Provider revenue split tracking

| Item | Status |
|---|---|
| Per-provider Stripe Connect account ID storage | **PARTIAL** — vault path `flowai/<env>/STRIPE_CONNECT_<providerId>` is reserved per `CredentialAdapter.js:101`, but no provider has been onboarded and no Stripe Connect account ID has been provisioned |
| Per-provider charge → provider mapping | **MISSING** |
| Per-provider running ledger | **MISSING** |
| Reconciliation job between Stripe transfers and local ledger | **MISSING** |
| Statement / 1099 generation pipeline (also see Job 11) | **MISSING** |

**Status:** the data model for provider revenue split exists only as a credential path in the vault adapter. No production data structures, no reconciliation, no reporting.

## 7. Spec ambiguity surfaced in `02-vault-spec-compliance.md` §8 item 6

The Doppler path scheme allows a Stripe Connect account ID for `acme` to be stored at **either** `flowai/<env>/STRIPE_CONNECT_acme` (via `getStripeConnect('acme')`) **or** `flowai/<env>/PROVIDERS_acme_STRIPE_CONNECT` (via `getProviderSecret('acme', 'STRIPE_CONNECT')`). The `CredentialAdapter` accepts both call conventions; nothing enforces one path over the other.

Recommendation: pin the convention to `STRIPE_CONNECT_<providerId>` (the dedicated method) before any provider is onboarded.

## 8. Verdict

| Area | Status |
|---|---|
| Vault-side credential path scheme | **DEFINED** in `CredentialAdapter.js`; **TESTED** via `credentialadapter-integration.test.js`; **UNUSED** by any production code |
| Stripe SDK packages declared | YES (`@stripe/react-stripe-js`, `@stripe/stripe-js`) |
| Stripe SDK actually imported | NO |
| Webhook handler | MISSING |
| Webhook signature verification | MISSING |
| Idempotency ledger | MISSING |
| 15% platform fee implementation | MISSING |
| 15% platform fee documented anywhere | NO |
| Revenue split / payout tracking | MISSING |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in inventory | YES (in `docs/RUNBOOK.md` + `docs/ARCHITECTURE.md` only); **NOT read by any code** |

**Bottom line:** Stripe Connect integration is at **0% implementation**. The only thing in place is a vault path convention + tests for it. Every functional aspect — checkout, webhooks, fee splitting, provider payouts, reconciliation — is a green-field build. The `@stripe/*` npm packages are dead weight in the bundle until the integration begins.

The CEO's confirmed Stripe acquisition unblocks **procurement** of a Stripe account, but it does not unblock any of the implementation work above. A minimum-viable Stripe Connect surface needs at least:
- `POST /api/billing/checkout` — create Connect-aware Checkout Session with `application_fee_amount` set to `Math.round(amount_total * 0.15)`
- `POST /api/billing/stripe-webhook` — raw-body capture, `constructEvent`, idempotency check on `event.id`
- `processed_webhook_events` table + retention
- `provider_payouts` table mirroring Stripe transfers
- `/api/billing/payouts` admin reporting endpoint
- Spec doc fixing the platform fee at 15% and documenting Connect account onboarding flow

None of these exist today.
