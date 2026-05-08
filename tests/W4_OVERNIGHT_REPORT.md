# W4 Overnight Audit — Final Consolidated Report

**Generated:** 2026-05-07.
**Scope:** Jobs 1-12 from the W4 overnight directive. Each job has a
detailed spec under `specs/w4-overnight/`; this file is the per-job summary
plus the consolidated W4 readiness verdict.

**Constraints honored.** No outbound HTTP. No file modifications outside
`tests/` and `specs/w4-overnight/` (the latter explicitly requested by the
job instructions). No commits, no pushes.

**ID note.** Several user-supplied identifiers (`SG-P0-01`, `SG-P0-02`,
`PA-STRIPE-01`, `PA-STRIPE-02`, `PA-AUTH-05`, `PA-DEMO-01`) do not appear
anywhere in the codebase or in `docs/`. Each is mapped to the closest
existing audit ID where one exists; otherwise the absence is recorded
verbatim.

---

## Job 1 — API + pages inventory

→ Full report: [`specs/w4-overnight/01-api-inventory.md`](../specs/w4-overnight/01-api-inventory.md)

`api/` mounts **53 handlers** (top-level + `auth/`, `audits/super-customer/`,
`admin/`, `clearance/`, `compliance/`, `configuration/`, `email/`,
`governance/`, `leads/`, `marketplace/`, `orchestrator/`, `products/`,
`self-renewal/`) plus `_lib/` helpers (memory + supabase backend, Clerk
session verification, scrypt auth, Axiom logger, Inngest serve, etc.).

`src/pages/` contains **79 React pages** (Vite SPA). The vast majority
import `@/api/base44Client` (Base44 SDK) — only `DemoSandbox.jsx`,
`EnterpriseDemo.jsx`, `LiveDemo.jsx`, and `BaseAgentTest.jsx` reach the
local backend directly.

---

## Job 2 — Vercel deployment config

→ Full report: [`specs/w4-overnight/02-vercel-config.md`](../specs/w4-overnight/02-vercel-config.md)

`vercel.json` (199 b) contains only two rewrites: `/api/*` passthrough +
SPA fallback. No explicit route list; Vercel auto-mounts every `api/**.js`.

Build command inferred from `package.json` (`vite build`). No env vars
declared in `vercel.json`; **30+ env vars** are read from code (catalogued
in the spec).

**Critical mismatch.** UI POSTs `/api/leads` from `DemoSandbox.jsx:48` and
`EnterpriseDemo.jsx:104`, but the file is at `api/leads/capture.js` →
**404**. Silent lead loss. Cheapest fix: change the two UI call sites to
`/api/leads/capture`.

---

## Job 3 — HubSpot integration audit

→ Full report: [`specs/w4-overnight/03-hubspot.md`](../specs/w4-overnight/03-hubspot.md)

**Not started.** Pattern search (`hubspot|HubSpot|hsapi|@hubspot`) matches
**only in documentation** — six audit / migration MD files recommend
HubSpot. No code import, no SDK in `package.json`, no `src/lib/leads/`
directory.

W0-ruled `veu_`-prefixed property names (`veu_product_interest`,
`veu_lead_source`, `veu_demo_requested`, `veu_demo_scheduled_at`,
`veu_utm_source`, `veu_utm_medium`, `veu_utm_campaign`, `veu_message`):
**0 of 8 implemented.** Spec file proposes the canonical
`leadToHubspotProperties(lead)` shape; the test (Job 4) pins it as a
reference implementation pending a real `api/_lib/leads/hubspot.js`.

---

## Job 4 — Lead-capture tests

→ Test file: [`tests/leads.test.js`](leads.test.js)

39 tests total. Run command:

```
npx vitest run tests/leads.test.js
```

```
 Test Files  1 passed (1)
      Tests  39 passed (39)
   Duration  ~720ms
```

**PASS — 39/39 on the first iteration.** Coverage:

- Pure validators (`isValidEmail`, `rateLimitOk`, `clientIp`,
  `hashPassword` / `verifyPassword`, `resolveOrgId`, `resolveProductId`).
- Schema validation against the candidate body shape.
- W0-ruled `veu_`-prefixed HubSpot field map (8 of 8 properties; Boolean
  coercion; UTM extraction with `metadata.campaign` / `metadata.source`
  fallbacks per the SAIGE BASE44_FIX_QUEUE.md sample payload).
- Demo-namespace resolver covering all three W0 patterns
  (`saigedemo.com`, `*.demo.veuaistudio.com`, `sandbox.*`) plus port
  stripping and prod fallthrough.
- UTM parameter capture from body / query / metadata fallbacks.
- Handler-level tests against `api/leads/capture.js`: OPTIONS preflight,
  405 on bad method, 400 on missing fields, 201 on happy path, 401 on
  unauthorized GET, 200 on admin-keyed GET (env stubbed in test).

Outbound HTTP is guarded by stubbing `globalThis.fetch` to throw.

---

## Job 5 — Five-product backend inventory

→ Full report: [`specs/w4-overnight/05-five-product-backend.md`](../specs/w4-overnight/05-five-product-backend.md)

The backend is **product-id-pivoted** — all five products (SAIGE, PressAI,
ReachSMS, RelTwin, MyBirthSafe) share the same generic endpoints
(`/api/auth/*`, `/api/leads/capture`, `/api/audits/super-customer/*`,
`/api/configuration/*`, `/api/compliance/rights-request`). There are no
per-product route folders, and no `api/demo/` or `api/<slug>/` routes.

Canonical config: `api/_lib/productDomains.js` (server) and
`src/lib/veuProducts.js` (client). **The two diverge** on URLs for every
product except SAIGE and ReachSMS — a known cleanup that's flagged in
specs 05 and 12.

| Slug | Status | Live URL (productDomains) | Live URL (veuProducts) | URLs match? |
|---|---|---|---|---|
| `saige` | active | `saigedemo.com` | `saige.base44.app` | partial |
| `pressai` | active | `ourpublishingai.com` | `pressai1.base44.app` | **drift** |
| `reachsms` | draft | (empty) | `reachsms.base44.app` | **drift** |
| `reltwin` | draft | (empty) | `reltwin.com` | **drift** |
| `mybirthsafe` | active | `safe-path.base44.app` | `mybirthsafe.base44.app` | **drift** |

---

## Job 6 — SAIGE P0 audit

→ Full report: [`specs/w4-overnight/06-saige-p0.md`](../specs/w4-overnight/06-saige-p0.md)

User-supplied IDs `SG-P0-01` and `SG-P0-02` do not exist verbatim. Closest
mappings:

- `SG-P0-01` → `saigeplatform-2026-05-05` P0-001 (`/investor` and `/app`
  soft-404, **or** `[ENTERPRISE … PENDING]` placeholder strings on home).
- `SG-P0-02` → no clean match. Codebase grep for `/get-access`: zero hits.
  Best inference is the saigeplatform-2026-05-05 BASE44 P0-003 (sandbox
  warning banner reframe).

**Categorization.**

| Category | Count | Items |
|---|---|---|
| Addressed in this repo (backend ready) | 3 | `/api/auth/sign-up`, `/api/auth/sign-in`, `/api/leads/capture` (per `b176518`) |
| Unfixed (in SAIGE's separate Base44 repo) | 6+ | `/investor` + `/app` routing, `[PENDING]` strings, hero inline form, sandbox banner reframe, privacy timestamp, trust block |
| Ambiguous (user ID has no codebase match) | 1 | `SG-P0-02 /get-access demo disclaimer` |

---

## Job 7 — PressAI Stripe integration audit

→ Full report: [`specs/w4-overnight/07-pressai-stripe.md`](../specs/w4-overnight/07-pressai-stripe.md)

**Not started.** No `api/billing/`, no webhook handler, no Stripe SDK
imported anywhere. `package.json` declares `@stripe/{react-stripe-js,stripe-js}`
but they are never imported. `src/lib/shared/CredentialAdapter.js` defines
a Doppler path scheme `STRIPE_CONNECT_<providerId>` and
`getStripeConnect(providerId)` — these resolve a credential record from the
vault but make no HTTP call.

PressAI billing UI shows a literal `alert('To enable Pro billing, connect
Stripe…')` placeholder.

| User ID | Status |
|---|---|
| **PA-STRIPE-01** (signature verification) | **N/A** — no webhook handler exists. Spec proposes the `stripe.webhooks.constructEvent` pattern with raw-body parsing for when this lands. |
| **PA-STRIPE-02** (idempotency ledger) | **N/A** — no `processed_webhook_events` table or equivalent. Spec proposes the canonical `(event_id, source)` unique-key approach. |

---

## Job 8 — PressAI auth hardening audit

→ Full report: [`specs/w4-overnight/08-pressai-auth.md`](../specs/w4-overnight/08-pressai-auth.md)

**No JWT in use anywhere.** Local stack uses scrypt-hashed passwords and
opaque 256-bit hex session tokens (`api/_lib/authBackend.js`). Clerk path
delegates to Clerk's SDK (when `AUTH_REQUIRED=true`). Base44 path uses
Base44's SDK.

| User ID | Status |
|---|---|
| **PA-AUTH-05** (fail-closed JWT secret signing) | **N/A** — no JWT signing path exists. Spec proposes a fail-closed reference signer (throws when secret missing or shorter than 32 chars) for future use. |

Existing hardening (passing): scrypt N=16384, uniform-error 401 on
sign-in, rate limits (sign-up 5/min, sign-in 10/min, leads 8/min),
audit-logged `auth.sign_*`, 256-bit session tokens, 30-day TTL,
revocation. Missing: email verification, password reset, magic link, MFA,
account lockout.

---

## Job 9 — Demo namespace isolation audit

→ Full report: [`specs/w4-overnight/09-demo-namespace.md`](../specs/w4-overnight/09-demo-namespace.md)

**No central `resolveEnv(req)` helper exists.** The W0-ruled three demo
patterns (`saigedemo.com`, `*.demo.veuaistudio.com`, `sandbox.*`) are
**not recognized** in any backend route. Closest existing logic:

- `api/_lib/productDomains.js:resolveLegacyDomain('saigedemo.com')` —
  recognizes the host but returns a redirect target, not an `environment`
  flag.
- `BaseAgent.js` + `CredentialAdapter.js` — validate the `environment`
  *string* (`prod` / `staging` / `demo` / `live-demo` / `sales-demo`) but
  never derive it from a hostname.
- `LiveDemo.jsx:15` — hard-codes `org_id: 'demo-org-public'`. Server
  trusts the value with no allowlist.

| User ID | Status |
|---|---|
| **PA-DEMO-01** (3-pattern recognition + isolation) | **Unaddressed.** Spec proposes a `resolveEnv(req)` extension to `api/_lib/tenant.js` that pattern-matches the three hostnames and propagates the resolved env through `getRequestContext`. |

---

## Job 10 — Auth flow tests

→ Test file: [`tests/auth.test.js`](auth.test.js)

35 tests total. Run command:

```
npx vitest run tests/auth.test.js
```

```
 Test Files  1 passed (1)
      Tests  35 passed (35)
   Duration  ~1.6s
```

**PASS — 35/35 on the first iteration.** Coverage:

- `authBackend` primitives: `createUser` (multi-tenant key), duplicate
  rejection, cross-tenant uniqueness, `userToPublic` strips
  `password_hash`, `createSession` / `getSession` / `revokeSession`
  round-trip, expired sessions, deterministic HMAC `sign`.
- `/api/auth/sign-up` handler: OPTIONS 204, non-POST 405, missing
  `product_id` 400, invalid email 400, short password 400, happy path 201
  with full `{user, session}` shape, duplicate 409, RL 429 at 6th request.
- `/api/auth/sign-in` handler: happy path 200, wrong-password 401 with
  uniform `{ok:false, reason:'invalid_credentials'}`, unknown-email 401
  with the same payload (no enumeration), missing-product 400, invalid
  email 400, RL 429 at 11th request.
- `/api/auth/session` handler: GET no-token 401, GET invalid 401, GET
  Bearer 200, GET `?token=` 200, DELETE 200 + subsequent GET 401, other
  methods 405.
- **Pinning the absence** of `/api/auth/forgot-password.js`,
  `/api/auth/reset-password.js`, `/api/auth/magic-link.js` (no such
  file). Pinning the absence of `jsonwebtoken` / `jose` in package.json.
- **Fail-closed JWT signer reference** — pure-function pin per the
  PA-AUTH-05 pattern: throws on missing secret, throws on too-short
  secret (<32 chars), emits a 3-segment JWT only when the secret is
  well-formed. To be replaced by the real signer when one ships.

---

## Job 11 — Tier 2 / Tier 3 sandbox readiness

→ Full report: [`specs/w4-overnight/11-tier23-readiness.md`](../specs/w4-overnight/11-tier23-readiness.md)

Spec source is `src/docs/FLOWAI_GTM_DEMO.md` (no `specs/w4-pressai/`
exists).

**Tier 2 — `/demo` (DemoSandbox.jsx):** components and mock data shipped;
backend wiring is the gap. Lead capture POSTs to wrong path; Resend
unwired; video frame placeholder unimplemented.

**Tier 3 — `/live-demo` (LiveDemo.jsx):** front-end shipped; backend
half-built. **Missing:** `GET /api/admin/seed-demo` daily seed cron, per-email
rate limit (1 run / day), server-side org quarantine for
`org_id: 'demo-org-public'`.

Five concrete actions to close the gap are listed in the spec.

---

## Job 12 — RelTwin / ReachSMS / MyBirthSafe backlog

→ Full report: [`specs/w4-overnight/12-other-products.md`](../specs/w4-overnight/12-other-products.md)

No per-product audit folders for these three. Cross-portfolio audit is in
`docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md`.

| Product | P0s found in audit | Addressed in this repo |
|---|---|---|
| RelTwin | 3 | 0 (fix is in RelTwin's separate Base44 deployment) |
| ReachSMS | 2 | 2 (registry already demoted to `draft`, URL cleared in productDomains.js) |
| MyBirthSafe | 3 | 0 (registry still points at the broken `safe-path.base44.app`; HIPAA-equivalent constraint declared but unenforced) |

Every product has **drift between** `api/_lib/productDomains.js` and
`src/lib/veuProducts.js`. Reconciliation is the single highest-leverage
cleanup: delete the URL field from `veuProducts.js` and import
`getCurrentLiveUrl(slug)` from `productDomains.js`.

---

## Test summary

```
$ npx vitest run tests/leads.test.js tests/auth.test.js
 Test Files  2 passed (2)
      Tests  74 passed (74)
   Duration  ~2.2s
```

The other 41 test failures in the repo (`tests/audit-*` files) are
pre-existing W3 contract pins for unbuilt `src/lib/audits/*` modules —
unrelated to W4.

---

## Consolidated W4 readiness verdict

| Surface / capability | State | W4 blocker? |
|---|---|---|
| `api/auth/*` backend | ✅ shipped (scrypt, RL, audit-logged) | No |
| `api/auth/*` Base44 UI hookup | ❌ Base44 still uses Base44 SDK | Yes if W4 = "dogfood the local stack" |
| `api/leads/capture` backend | ✅ shipped | No |
| Lead capture UI wiring (`/api/leads` vs `/api/leads/capture`) | ❌ silent 404 | **Yes** — silent lead loss |
| HubSpot integration | ❌ not started | Yes if W4 promised CRM routing; no if it only promised capture-to-DB |
| `veu_`-prefixed property names | ❌ none implemented | Same |
| Stripe billing (PressAI) | ❌ not started; UI is a placeholder `alert()` | Yes if W4 promised billing live |
| JWT / fail-closed signer | n/a — no JWT in use | No (architecturally not needed today) |
| Demo namespace isolation server-side | ❌ no `resolveEnv` helper | Yes for any production-data exposure |
| Tier 2 sandbox | ⚠️ shipped + wrong lead path | Tightly coupled to lead-path fix |
| Tier 3 live demo | ⚠️ shipped + missing seed cron, RL, quarantine | Yes for buyer-facing trial |
| Five-product registry parity | ⚠️ drift between server and client sources | Soft — maintenance hazard |
| MyBirthSafe live-URL accuracy | ❌ registry points at broken host | Yes — every audit re-flags |
| Test coverage | ✅ 74/74 W4 tests passing | No |
| `vercel.json` | ✅ minimal but correct | No |

### Recommended W4 close-out (not performed by this audit)

1. **Lead path fix (1 line × 2 files)** — change `/api/leads` →
   `/api/leads/capture` in `DemoSandbox.jsx:48` and
   `EnterpriseDemo.jsx:104`.
2. **Add `resolveEnv(req)`** to `api/_lib/tenant.js` covering the W0 three
   patterns, and propagate the resolved env through `getRequestContext`.
3. **Demote MyBirthSafe** in `productDomains.js:115` (or update its
   `live_url`) — the audit re-flags this every cycle.
4. **Reconcile** `productDomains.js` ↔ `veuProducts.js` URLs — single
   source of truth.
5. **Add `api/admin/seed-demo.js`** + Inngest cron at 06:00 UTC for
   Tier 3.
6. **Decide HubSpot vs Mailchimp vs Supabase-only** — once decided, ship
   `api/_lib/leads/hubspot.js` (or equivalent) with the
   `leadToHubspotProperties` field map already pinned in
   `tests/leads.test.js`.
7. **Stripe** — only if W4 includes billing. If yes, add
   `api/billing/stripe-webhook.js` with raw-body signature verification +
   an idempotency ledger keyed by `event.id`.

— end of report —
