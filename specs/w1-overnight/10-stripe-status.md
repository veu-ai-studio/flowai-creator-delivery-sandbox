# 10 — Stripe Connect integration status (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `10-stripe-integration-status.md`. Part 1 catalogued zero implementation; Part 2 produces concrete code shape.

## 1. Touchpoint inventory (re-verified from Part 1)

| Surface | File:line | What it is |
|---|---|---|
| Doppler path scheme | `src/lib/shared/CredentialAdapter.js:13, 96–104` | `getStripeConnect(providerId)` — returns credential record only |
| Test of Stripe path | `tests/credentialadapter-integration.test.js:167–178` | Path construction asserted |
| UI placeholder #1 | `src/pages/Billing.jsx:84–86` | `alert()` only |
| UI placeholder #2 | `src/components/gtm/BillingPanel.jsx:66` | `alert()` only |
| Marketplace catalog entry | `src/lib/toolRegistry.js:46`, `api/_lib/marketplaceSeed.js` | Informational |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` references | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181` | Documentation only — **NEVER read in code** |
| Webhook handler | NONE | No `api/billing/*` or `api/stripe-*` files |
| Package declarations | `package.json:51, 52` | `@stripe/react-stripe-js@^3.0.0`, `@stripe/stripe-js@^5.2.0` — bundled, never imported |

## 2. Critical findings (still apply)

1. **Webhook signature verification: NONE.** No `stripe.webhooks.constructEvent` call anywhere.
2. **Idempotency handling: NONE.** No `processed_webhook_events` table; no `(event_id, source)` unique constraint.
3. **15% platform fee implementation: NONE.** Zero hits for `application_fee_amount`, `0.15`, `platform_fee`. The 15% W0 ruling exists only in the user's brief; not committed to any spec or doc.
4. **Provider revenue split: NONE.** Vault path `STRIPE_CONNECT_<providerId>` is reserved; nothing populates it.

## 3. Concrete implementation plan

### 3.1 New files needed (proposed)

| Path | Purpose |
|---|---|
| `api/billing/checkout.js` | Create Stripe Connect Checkout Session with `application_fee_amount` set per W0's 15% |
| `api/billing/stripe-webhook.js` | Raw-body capture; `constructEvent`; idempotency check; routing |
| `api/billing/subscription.js` | Read current subscription from local mirror |
| `api/billing/payouts.js` | Admin reporting of provider payouts |
| `api/_lib/stripe.js` | Lazy-loaded Stripe SDK client |
| `api/_lib/billing/idempotency.js` | `webhookSeen(eventId)` helper |
| `api/_lib/billing/platformFee.js` | Single source of truth: `PLATFORM_FEE_BPS = 1500` (15.00% in basis points) |
| `api/_lib/billing/providerLedger.js` | Append-only revenue ledger per provider |
| `supabase/migrations/0007_billing_tables.sql` | `processed_webhook_events`, `provider_payouts`, `platform_revenue` |

### 3.2 `api/_lib/billing/platformFee.js` (proposed shape)

Single constant + helpers — pin the 15% so it can never drift across endpoints.

```js
// api/_lib/billing/platformFee.js
export const PLATFORM_FEE_BPS = 1500; // 15.00%, basis-points form

export function computeApplicationFee(amountSubunits) {
  // Stripe sends amounts in smallest unit (cents for USD).
  // Math.round avoids fractional-cent fees.
  return Math.round(amountSubunits * PLATFORM_FEE_BPS / 10000);
}

export function describeSplit(amountSubunits) {
  const platform = computeApplicationFee(amountSubunits);
  const provider = amountSubunits - platform;
  return { total: amountSubunits, platform, provider };
}
```

Rationale for basis-points: avoids floating-point drift; matches Stripe's API expectation (integer subunits).

### 3.3 `api/billing/checkout.js` (proposed shape)

```js
// api/billing/checkout.js
import Stripe from 'stripe';
import { getStripeConnect } from '../_lib/credentialAdapterBootstrap.js';
import { computeApplicationFee } from '../_lib/billing/platformFee.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { provider_id, line_items, customer_email, success_url, cancel_url } = req.body;
  if (!provider_id || !Array.isArray(line_items)) {
    return res.status(400).json({ error: 'provider_id and line_items required' });
  }

  const connectAcct = await getStripeConnect(provider_id);
  if (connectAcct.status !== 'present') {
    return res.status(400).json({ error: `provider ${provider_id} has no Stripe Connect account` });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const amount_total = line_items.reduce(
    (sum, li) => sum + li.price_data.unit_amount * li.quantity, 0
  );
  const application_fee_amount = computeApplicationFee(amount_total);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    customer_email,
    success_url,
    cancel_url,
    payment_intent_data: {
      application_fee_amount,
      transfer_data: { destination: connectAcct.value },
    },
  });

  return res.status(200).json({ session_id: session.id, url: session.url });
}
```

### 3.4 `api/billing/stripe-webhook.js` (proposed shape)

```js
// api/billing/stripe-webhook.js
export const config = { api: { bodyParser: false } }; // raw body required

import Stripe from 'stripe';
import { buffer } from 'micro';
import { webhookSeen } from '../_lib/billing/idempotency.js';
import { recordPayout } from '../_lib/billing/providerLedger.js';

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: skip if event.id already processed
  if (await webhookSeen(event.id, 'stripe')) {
    return res.status(200).json({ received: true, idempotent: true });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      // Record platform fee and provider amount in our ledger
      await recordPayout(event.data.object);
      break;
    case 'application_fee.created':
      // Stripe confirms the fee was taken — informational
      break;
    case 'payout.paid':
      // Provider received funds
      break;
    default:
      // ignore
  }

  return res.status(200).json({ received: true });
}
```

### 3.5 Idempotency table

```sql
-- supabase/migrations/0007_billing_tables.sql

CREATE TABLE processed_webhook_events (
  source TEXT NOT NULL,                -- 'stripe' | 'github' | 'inngest' | etc.
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, event_id)
);

CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,           -- slug-safe per CredentialAdapter convention
  stripe_event_id TEXT NOT NULL,
  amount_total_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  provider_amount_cents BIGINT NOT NULL,
  customer_email TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_event JSONB,
  UNIQUE (stripe_event_id)
);

CREATE INDEX idx_provider_payouts_provider_at
  ON provider_payouts (provider_id, occurred_at DESC);

CREATE TABLE platform_revenue (
  month DATE NOT NULL,                 -- first day of month
  total_revenue_cents BIGINT NOT NULL DEFAULT 0,
  total_fee_cents BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (month)
);
```

The `(source, event_id)` PK on `processed_webhook_events` is the critical guarantee — Stripe replays on non-2xx responses (~3 days), so this prevents double-recording the same payout.

### 3.6 Provider-side onboarding flow

When provider onboarding runs (Agent #4 — currently absent per `BaseAgent.AGENT_IDS:21`):

```
1. UI calls POST /api/providers/onboard with {provider_id, contact_email}.
2. Backend creates a Stripe Connect Express account: stripe.accounts.create({ type: 'express', email }).
3. Backend stores the resulting `acct_xxx` ID at Doppler path `flowai/<env>/STRIPE_CONNECT_<provider_id>`.
4. Backend returns a Stripe-issued onboarding link (account_links).
5. Provider completes Stripe's hosted KYC.
6. Stripe webhook event 'account.updated' confirms onboarding; backend marks provider as billing-ready.
```

This integrates with `12-inventory-expansion.md` (which adds `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the canonical inventory).

## 4. Spec ambiguity resolution (from Part 1 §7)

Part 1 noted that `STRIPE_CONNECT_<providerId>` and `getProviderSecret(<providerId>, 'STRIPE_CONNECT')` are both valid call paths in the adapter. Resolution:

**Pin to `getStripeConnect(<providerId>)`.** The dedicated method exists; subkey-based access via `getProviderSecret` should be considered deprecated for Stripe Connect. Add a runtime warning in `CredentialAdapter._resolve` that logs when `secret === 'STRIPE_CONNECT_*'` arrives via `getProviderSecret`; deprecate after one release. (Out of scope for this spec-only report; flagged here for the implementation sprint.)

## 5. 15% platform fee documentation

Add to a new file `specs/w1-billing/platform-fee.md` (or to `docs/ARCHITECTURE.md`):

> ## Platform fee (W0 ruling)
>
> VEU AI Studio LLC retains a **15.00% platform fee** on every Stripe Connect transaction routed through the marketplace. The fee is implemented as `application_fee_amount` on the `payment_intent_data` of every Checkout Session.
>
> Single source of truth: `api/_lib/billing/platformFee.js` exporting `PLATFORM_FEE_BPS = 1500`. Endpoints MUST import from this file rather than re-deriving the constant.
>
> The split is recorded at webhook time in `provider_payouts` (raw `(stripe_event_id)`-keyed) and rolled up monthly in `platform_revenue`. Reconciliation against Stripe's monthly statements is a manual procedure today.

## 6. Provider revenue split tracking

Per the §3.5 schema above, three tables jointly answer "what is owed to whom":

- `processed_webhook_events` — idempotency
- `provider_payouts` — per-event split
- `platform_revenue` — monthly rollup of platform fees

A new endpoint `GET /api/billing/payouts?provider_id=<id>` (admin-gated by `ADMIN_SEED_KEY`) returns the per-provider history.

## 7. Sequenced build (estimate: 3–5 days)

1. **Day 1** — Author the migration (§3.5); apply to Supabase.
2. **Day 2** — Author `api/_lib/stripe.js`, `api/_lib/billing/{platformFee,idempotency,providerLedger}.js`. Unit tests under `tests/billing-*.test.js`.
3. **Day 3** — Author `api/billing/{checkout,stripe-webhook,subscription,payouts}.js`. Integration tests with Stripe test mode.
4. **Day 4** — Wire UI: replace `alert()` placeholders in `src/pages/Billing.jsx:84–86` and `src/components/gtm/BillingPanel.jsx:66` with real Checkout flow.
5. **Day 5** — Provider onboarding flow integration with Agent #4 (when that agent lands).

Out-of-repo:
- Provision Stripe account (CEO confirmed)
- Decide platform-vs-merchant-of-record stance (drives whether VEU collects sales tax — see `13-tax-readiness.md`)
- Write public-facing platform terms

## 8. Verdict

| Aspect | Status |
|---|---|
| Webhook handler | Code shape DRAFTED §3.4 |
| Signature verification | DRAFTED via `constructEvent` pattern |
| Idempotency ledger | DRAFTED §3.5 with PK guarantee |
| 15% platform fee constant | DRAFTED §3.2 (basis-points form) |
| Revenue split tracking | DRAFTED §3.5 (3-table schema) |
| Provider Connect onboarding | DRAFTED §3.6 (depends on Agent #4) |
| `STRIPE_*` envs in inventory | Will be added per `12-inventory-expansion.md` |
| `@stripe/*` packages used | Still NO — implementation work hasn't started |
| Net implementation status | **Still 0%** — but the entire surface is now drafted and ready for a 3–5 day sprint |

Stripe Connect implementation is unblocked: CEO has the account, this report has the code shape, the W0 15% ruling has a documented basis-points constant, the schema is drafted. The next concrete step is the implementation sprint itself — explicitly out of scope for this read-only Part 2 report.
