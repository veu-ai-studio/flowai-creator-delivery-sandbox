# 05 — Five-product backend inventory

**Generated:** 2026-05-07. **Products audited:** SAIGE, RelTwin, ReachSMS,
PressAI, MyBirthSafe.

## Method

Searched code under `api/` and `src/` for product-specific routes, helpers,
or hard-coded slugs. The architecture is **product-id-pivoted**: there is a
single set of generic endpoints (`/api/auth/*`, `/api/leads/capture`,
`/api/audits/super-customer/*`, `/api/configuration/*`, etc.) and every call
carries a `product_id` (or `org_id` + `product_id`) tuple to scope reads and
writes. There are no per-product route folders (no `api/saige/`, no
`api/pressai/`, etc.).

## Canonical config — `api/_lib/productDomains.js`

The single source of truth for the five-product registry:

| Slug | Name | Status | live_url | target_url | Legacy domains |
|---|---|---|---|---|---|
| `saige` | SAIGE | active | `https://saigedemo.com` | `https://saigeplatform.com` | `saigedemo.com → /live-demo` (status: `active`, not yet redirected) |
| `pressai` | PressAI | active | `https://ourpublishingai.com` | (TBD) | (none) |
| `reachsms` | ReachSMS | **draft** | (empty — Victor TBD) | (TBD) | (none) |
| `reltwin` | RelTwin | **draft** | (empty — Victor TBD) | (TBD) | (none) |
| `mybirthsafe` | MyBirthSafe | active | `https://safe-path.base44.app` | (TBD) | (none) |

Helpers exported: `getProductDomainConfig(slug)`, `getCurrentLiveUrl(slug)`,
`getTargetUrl(slug)`, `getLegacyDomains(slug)`, `resolveLegacyDomain(host)`,
`listActiveLegacyRedirects()`, `veuSeed({orgId})`.

Every entry has an `objectives[]` array used by `api/audits/super-customer/*`
and `api/configuration/synthesize.js` to scope audit prompts.

A second source `src/lib/veuProducts.js` repeats the same five products with
client-only metadata (`tagline`, `audience`, `demo_org`, `synthetic_prompt`).
This duplication is a known cleanup item but the slugs match.

## Per-product breakdown

### SAIGE (`saige`)

- **Status:** active.
- **Live URL:** `https://saigedemo.com` (legacy; cutover to `saigeplatform.com` planned).
- **Backend code that mentions SAIGE specifically:**
  - `api/_lib/productDomains.js` entry (config only).
  - `src/lib/veuProducts.js` entry (config only).
  - Audit reports under `docs/audits/saige-2026-05-05/` and
    `docs/audits/saigeplatform-2026-05-05/`.
- **Routes used:** the generic ones via `product_id: 'saige'` (sign-up,
  sign-in, leads/capture, super-customer audit, configuration synthesize).
- **Stub / missing:** no SAIGE-specific UI in `src/pages/`. The audit's P0-001
  (saigeplatform.com `/investor` and `/app` soft-404) is **SAIGE's own repo**,
  not reachable from this repo (per the FIX_SPRINT_REPORT.md note that
  PressAI's source isn't in flowai — same applies to SAIGE's own product code).

### PressAI (`pressai`)

- **Status:** active.
- **Live URL:** `https://ourpublishingai.com`.
- **Backend code that mentions PressAI specifically:**
  - `api/_lib/productDomains.js` entry.
  - `src/lib/veuProducts.js` entry (with `https://pressai1.base44.app` —
    inconsistent with productDomains.js's `ourpublishingai.com`; **flag**).
  - Audit + fix-sprint reports under `docs/audits/pressai-2026-05-05/`.
- **Routes used:** generic (auth + leads/capture + compliance/rights-request).
- **Backend half of the audit's P0s:** `b176518` shipped `/api/auth/sign-up`,
  `/api/auth/sign-in`, `/api/auth/session`, `/api/leads/capture`, and
  `/api/compliance/rights-request` — all generic, all multi-tenant.
- **What's stubbed:** Stripe billing — `src/pages/Billing.jsx:84-86` shows a
  literal `alert('To enable Pro billing, connect Stripe or Wix Payments…')`.
  No `api/billing/`, no `api/stripe/`, no webhook handler. (See `07-pressai-stripe.md`.)
- **What's missing:** PressAI repo's UI is **not in this repo** — the
  CLAUDE_CODE_BACKLOG.md's P0-001 / P0-002 (`/sign-up`, `/sign-in` UI) live in
  PressAI's repo (deployed at `ourpublishingai.com`), not here.

### ReachSMS (`reachsms`)

- **Status:** **draft** (URL unknown; demoted in `productDomains.js`).
- **Live URL:** empty.
- **Backend code that mentions ReachSMS specifically:**
  - `api/_lib/productDomains.js` entry (no live_url).
  - `src/lib/veuProducts.js` entry (`https://reachsms.base44.app` — listed
    here but not in productDomains).
- **Routes used:** none in production paths. The product is gated behind a
  draft status — `api/admin/seed.js` will still upsert it on seed but no
  auth / lead flow has been exercised against `product_id: 'reachsms'` in
  any captured request log.
- **Stub / missing:** everything beyond config is missing.

### RelTwin (`reltwin`)

- **Status:** **draft**.
- **Live URL:** empty in `productDomains.js`. `src/lib/veuProducts.js` claims
  `https://reltwin.com` (mismatch — flag).
- **Backend code that mentions RelTwin specifically:** config entries only.
- **Routes used:** none active.
- **Stub / missing:** same as ReachSMS — config exists, no flow exercised.

### MyBirthSafe (`mybirthsafe`)

- **Status:** active.
- **Live URL (productDomains):** `https://safe-path.base44.app`.
- **Live URL (veuProducts):** `https://mybirthsafe.base44.app` (mismatch — flag).
- **Backend code that mentions MyBirthSafe specifically:** config entries only.
- **Constraints:** `objectives` carry a `constraint: PII / health-data
  compliance (HIPAA-equivalent jurisdictional rules)` with weight 2 — used to
  bias audit prompts toward privacy.
- **Stub / missing:** no MyBirthSafe-specific code path in `api/` other than
  the seed and audit-prompt routing.

## Cross-product summary

### What every product gets for free today

- `POST /api/auth/sign-up` — keyed by `(org_id, product_id, email)`. Same
  scrypt store, same uniform-error 401 on sign-in.
- `POST /api/auth/sign-in`, `GET/DELETE /api/auth/session`.
- `POST /api/leads/capture` — multi-tenant; lead store keyed similarly.
- `POST /api/compliance/rights-request` — generic GDPR / DSAR pipeline.
- `POST /api/audits/super-customer/run` — accepts `product_id`.
- `POST /api/configuration/clone` / `synthesize` / `describe` — accept
  `product_id` and use `productDomains.js` to look up `live_url` and
  objectives.
- Inngest jobs (cost rollup, scheduled clearance) iterate every product
  registered via `productDomains.js`.

### What's missing per product

| Concern | SAIGE | PressAI | ReachSMS | RelTwin | MyBirthSafe |
|---|---|---|---|---|---|
| Live URL set | ✅ | ✅ | ❌ | ❌ | ✅ |
| URL parity between `productDomains.js` and `veuProducts.js` | partial (`saigedemo.com` vs `saige.base44.app`) | **mismatch** (`ourpublishingai.com` vs `pressai1.base44.app`) | n/a (draft) | **mismatch** (`reltwin.com` vs empty) | **mismatch** (`safe-path.base44.app` vs `mybirthsafe.base44.app`) |
| Auth UI shipped (Base44) | TBD | TBD | TBD | TBD | TBD |
| Lead-capture UI wired (correct path) | partial — UI POSTs `/api/leads` (404) | partial (same) | n/a | n/a | TBD |
| Stripe billing | n/a | **stubbed** alert | n/a | n/a | n/a |
| HubSpot field map | ❌ | ❌ | ❌ | ❌ | ❌ |
| Demo namespace isolation server-side | ❌ | ❌ | ❌ | ❌ | ❌ |

### Recommended next action

Reconcile `api/_lib/productDomains.js` and `src/lib/veuProducts.js` into a
single source of truth (or document the split — server-only domains vs
client-only marketing copy). The current divergence is a maintenance hazard
for any per-product migration cutover.

## Per-product route patterns the user asked about

- `api/auth/*` — generic, multi-product; every call carries `product_id`.
  No per-product subfolders exist or are needed today.
- `api/leads/*` — single `capture.js`, multi-product via `product_id`. The
  UI's path is wrong (`/api/leads` vs `/api/leads/capture`); see `02-vercel-config.md`.
- `api/demo/*` — **does not exist as a route folder.** The demo flows live
  client-side (`src/pages/DemoSandbox.jsx`, `LiveDemo.jsx`,
  `EnterpriseDemo.jsx`) and reach into `/api/configuration/clone` or
  `/api/leads/capture` rather than calling a dedicated demo-namespaced API.
  No backend enforces a demo-org quarantine; the client sends
  `org_id: 'demo-org-public'` literally and the orchestrator trusts the
  value.
