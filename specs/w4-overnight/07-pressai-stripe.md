# 07 — PressAI Stripe integration audit

**Generated:** 2026-05-07.

## Search for Stripe code

Patterns searched: `stripe`, `Stripe`, `STRIPE`. Match summary across the
repo:

| Surface | File | What it is |
|---|---|---|
| **Backend (`api/`)** | (none — all Stripe matches are in marketplace seeds and prose) | |
| `api/_lib/marketplace.js:40` | classifies `acquired_by_stripe` as a vendor-stability signal — not an integration. |
| `api/_lib/marketplaceSeed.js:266-302` | catalogs Stripe + Plaid as marketplace tools (description, pricing prose). Not an integration. |
| **Browser (`src/`)** | `src/pages/Billing.jsx:84-86` | `alert('To enable Pro billing, connect Stripe or Wix Payments…')` placeholder. |
| `src/components/gtm/BillingPanel.jsx:66` | another `alert('Upgrade flow — connect Stripe or Wix Payments')` placeholder. |
| `src/lib/toolRegistry.js:46,105,116,138` | tool-catalog metadata only. |
| `src/lib/shared/CredentialAdapter.js:13,96-104` | declares the Doppler path scheme `flowai/<environment>/STRIPE_CONNECT_<providerId>` and a `getStripeConnect(providerId)` accessor that returns a credential record (no HTTP call). Path scheme only — no actual Stripe API call exists anywhere. |
| **Tests** | `tests/W{1,3,5}_OVERNIGHT_REPORT.md` reference Stripe in the credential-adapter context only. |
| **`package.json`** | `@stripe/react-stripe-js@^3.0.0`, `@stripe/stripe-js@^5.2.0` — declared but **not imported anywhere in `api/` or `src/`** (verified). |

Patterns also searched: `webhook`, `signature`. Hits in `api/`:

- `api/_lib/authBackend.js:153` — comment header "HMAC for webhook + token
  signing" introducing the generic `sign(value, secret)` helper. Not bound to
  any webhook.
- `api/_lib/inngest.js:70` — Inngest function `signature` (different
  webhook).
- `api/_lib/marketplace.js`, `marketplaceSeed.js` — prose only.

## Touchpoint table

| Surface | File path | Behavior | Webhook sig verify | Idempotency |
|---|---|---|---|---|
| Stripe Checkout / Subscriptions | (none) | n/a | n/a | n/a |
| Stripe webhook receiver | (none) | n/a | n/a | n/a |
| Stripe Connect credential path | `src/lib/shared/CredentialAdapter.js:96-104` | `getStripeConnect(providerId)` resolves a Doppler secret named `STRIPE_CONNECT_<providerId>`. Returns `{status, value, path, source, fetchedAt}`. **Does not call Stripe.** | n/a — never reaches a webhook. | n/a — never makes API calls. |
| UI billing CTA | `src/pages/Billing.jsx:84-86`, `src/components/gtm/BillingPanel.jsx:66` | `alert(...)` placeholder copy mentioning "connect Stripe or Wix Payments in your Base44 dashboard settings." No SDK use. | n/a | n/a |

## Cross-reference: PA-STRIPE-01 + PA-STRIPE-02

The user-supplied IDs `PA-STRIPE-01` (signature verification) and
`PA-STRIPE-02` (idempotency ledger) **do not appear anywhere in the
codebase or docs**. There is no `specs/w4-pressai/` directory; the closest
PressAI audit material is `docs/audits/pressai-2026-05-05/`, and that audit
**does not flag any Stripe integration item** — its P0s and P1s are about
the auth funnel, hero email capture, privacy timestamp, trust block, GDPR
rights form, and unsourced stats. None mention Stripe.

### PA-STRIPE-01 (signature verification)

**Status:** **N/A — there is no Stripe integration to verify signatures
against.** No webhook handler exists. Implementing this would require:

1. A new endpoint, e.g. `api/billing/stripe-webhook.js`, that reads the raw
   body, calls `stripe.webhooks.constructEvent(rawBody, sig,
   process.env.STRIPE_WEBHOOK_SECRET)`, and rejects on
   `Error: 'No signatures found matching expected signature for payload'`.
2. Vercel function config `bodyParser: false` so the raw body reaches
   `constructEvent` (the JSON body parser would corrupt the HMAC).
3. The `STRIPE_WEBHOOK_SECRET` env var added to Vercel project settings
   (and surfaced in `api/diagnostic.js`).

None of these exist today.

### PA-STRIPE-02 (idempotency ledger)

**Status:** **N/A — no idempotency ledger exists.** `api/_lib/db.js`
provides `appendAuditEntry` and a memory/Supabase abstraction, but there is
no `processed_webhook_events` table, no `(event_id, source)` unique
constraint, no `webhookSeen(eventId)` helper. The closest primitive is the
generic audit log, which is append-only but not unique-keyed by webhook
event ID.

Implementing this would require:

1. A new table or in-memory map keyed by Stripe `event.id` (and source
   namespace, in case other webhook providers join later). On each webhook
   POST, check-and-insert atomically before performing the side effect.
2. Replay safety: a webhook delivered twice (Stripe retries on
   non-2xx responses) must produce the same observable state. The
   side-effect logic must be idempotent given the same `event.id`.
3. A retention policy (Stripe replays for ~3 days; ledger entries should
   live at least that long).

None of these exist today.

## Verdict

PressAI Stripe integration **is not started**. The fix-sprint sweep under
`docs/audits/pressai-2026-05-05/` did not include billing/Stripe in the
in-scope P0/P1 set. The product UI shows a placeholder `alert()` in two
spots. The dependency `@stripe/stripe-js` is declared in `package.json` but
not actually imported.

**`PA-STRIPE-01` and `PA-STRIPE-02` are unaddressed.**

When billing ships, the minimum-viable Stripe surface is:
- `POST /api/billing/checkout` — create a Checkout Session.
- `POST /api/billing/stripe-webhook` — verify signature with raw body, look
  up `event.id` in an idempotency table, perform the side effect once.
- `GET /api/billing/subscription` — read the current subscription status
  from the local mirror (which the webhook keeps fresh).

These are the natural ports that PA-STRIPE-01/02 attach to.
