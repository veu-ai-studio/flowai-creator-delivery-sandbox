# 12 — RelTwin / ReachSMS / MyBirthSafe backlog inventory

**Generated:** 2026-05-07.

There are **no per-product spec files** for RelTwin, ReachSMS, or
MyBirthSafe in this repo. None of the three has a counterpart to PressAI's
`docs/audits/pressai-2026-05-05/` or SAIGE's
`docs/audits/saige{,platform}-2026-05-05/`. The available cross-portfolio
material is `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md`, which audits all
five products in one pass.

The portfolio audit yields each product's P0 set; this report consolidates
those plus codebase evidence of any fix.

## RelTwin

### Source of truth

- `src/lib/veuProducts.js:78-101` — name, tagline, audience, demo-org config.
- `api/_lib/productDomains.js:96-109` — slug, status, live_url (empty), tags.
- `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:76-89` — portfolio audit result.

### Audit findings (P0 set)

| ID | Surface | Issue |
|---|---|---|
| RT-P0-001 | `https://reltwin.com` | Domain serves Base44 placeholder ("Your app is waiting to shine!") instead of product. Score 4/100, NOT CLEARED. |
| RT-P0-002 | `reltwin.com` | If publication is blocked, replace with a one-page coming-soon that captures emails. |
| RT-P0-003 | (governance) | Add to portfolio Self-Renewal cron so daily score drops below 30 page on-call. |

### Codebase evidence

- `productDomains.js:96-109` carries `status: 'draft'`, `live_url: ''`. The
  config has been demoted out of the active set, **which is the right
  decision** but it's only a registry-level fix; the actual `reltwin.com`
  domain still serves the placeholder (cannot be fixed from this repo —
  the domain points at a Base44 app under a separate account).
- `src/lib/veuProducts.js:79` still claims `url: 'https://reltwin.com'`.
  **Drift** between the two sources — fix path: reconcile both files.

### Status verdict

| P0 | Addressed in this repo? | Where |
|---|---|---|
| RT-P0-001 | ❌ — fix is on RelTwin's Base44 app deployment. | RelTwin's separate Base44 account. |
| RT-P0-002 | ❌ — same reason. | Same. |
| RT-P0-003 | ⚠️ partial — Inngest job machinery exists but no scheduled clearance for RelTwin specifically. | `api/_lib/jobs/scheduledClearance.js` is the natural home. |

## ReachSMS

### Source of truth

- `src/lib/veuProducts.js:53-75` — config (claims `https://reachsms.base44.app`).
- `api/_lib/productDomains.js:82-95` — slug, status, **live_url empty**.
- `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:91-101` — audit result.

### Audit findings (P0 set)

| ID | Surface | Issue |
|---|---|---|
| RS-P0-001 | (registry) | The portfolio audit attempted `https://ourcommunitiesai.com` and got `ERR_NAME_NOT_RESOLVED`. The seed registry referenced a domain that does not resolve. |
| RS-P0-002 | (registry) | Either update the registry to the correct URL or move ReachSMS to `status: 'draft'` until a real URL exists. |

### Codebase evidence

- `productDomains.js:82-95` is already at `status: 'draft'` and `live_url:
  ''` with comment `// TODO Victor — domain unknown`. **Audit-flagged
  remediation has been applied to the productDomains source of truth.**
- `src/lib/veuProducts.js:54` still references `https://reachsms.base44.app`.
  **Drift** — old client-side seed lists a URL the server-side registry has
  retracted.

### Status verdict

| P0 | Addressed in this repo? | Where |
|---|---|---|
| RS-P0-001 | ✅ at the productDomains layer (status flipped to draft, URL cleared). | `api/_lib/productDomains.js:82-95`. |
| RS-P0-002 | ✅ same place. | Same. |
| **Drift to fix** | ⚠️ `veuProducts.js` still references `reachsms.base44.app`. | `src/lib/veuProducts.js:54` — should be reconciled with productDomains. |

## MyBirthSafe

### Source of truth

- `src/lib/veuProducts.js:103-126` — config (claims `mybirthsafe.base44.app`).
- `api/_lib/productDomains.js:111-124` — slug, status, live_url
  (`https://safe-path.base44.app`), with `objectives` carrying a weight-2
  `PII / health-data compliance` constraint.
- `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:63-75` — audit result.

### Audit findings (P0 set)

| ID | Surface | Issue |
|---|---|---|
| MB-P0-001 | `https://safe-path.base44.app` | Endpoint returns JSON `App not found.`. Visitor sees a naked exception. Score 2/100, NOT CLEARED. |
| MB-P0-002 | (host) | If app moved, set up 301; if retired, replace with holding page. |
| MB-P0-003 | (governance) | This is a class-of-failure — audit which other Base44-hosted apps are in the same state. |

### Codebase evidence

- `productDomains.js:111-124` keeps `status: 'active'` and
  `live_url: 'https://safe-path.base44.app'` — the same URL the audit
  flagged as broken. **The audit recommendation has not been propagated to
  the registry.** Remediation either:
  - Flip `status: 'draft'` until the Base44 app is restored, or
  - Update `live_url` to the new domain (if known).
- `src/lib/veuProducts.js:104` claims `https://mybirthsafe.base44.app` —
  again, **drift**. Different URL than productDomains.js.
- The compliance constraint (HIPAA-equivalent) is **declared** in the
  objectives but not enforced anywhere — there's no PHI scrubber, no
  region-locked storage, no audit policy specific to MyBirthSafe.

### Status verdict

| P0 | Addressed in this repo? | Where |
|---|---|---|
| MB-P0-001 | ❌ — registry still points at the broken host. | `api/_lib/productDomains.js:117`. |
| MB-P0-002 | ❌ — neither the app nor the registry has been touched. | Same. |
| MB-P0-003 | ❌ — no portfolio-wide scan job exists yet. | Natural home: `api/_lib/jobs/scheduledClearance.js`. |
| Compliance constraint | ⚠️ declared but unenforced. | `productDomains.js:121`. |

## Cross-product summary

| Product | Status (productDomains) | Live URL parity (veuProducts vs productDomains) | P0s addressed in this repo |
|---|---|---|---|
| RelTwin | draft | mismatch (`reltwin.com` vs empty) | 0 of 3 |
| ReachSMS | draft | mismatch (`reachsms.base44.app` vs empty) | 2 of 2 (registry fix done; veuProducts.js drift remains) |
| MyBirthSafe | active | mismatch (`mybirthsafe.base44.app` vs `safe-path.base44.app`) | 0 of 3 |

## Recommended W4 actions for these three products

1. **Reconcile** `src/lib/veuProducts.js` and `api/_lib/productDomains.js`
   into a single source of truth. The simpler path is to delete the URL
   field from `veuProducts.js` and import `getCurrentLiveUrl(slug)` from
   `productDomains.js` everywhere it's needed.
2. **Demote MyBirthSafe** from `active` to `draft` in
   `productDomains.js:115` until either `safe-path.base44.app` is restored
   or a new URL is registered. Without this, every audit cycle re-flags the
   same broken URL.
3. **Scheduled clearance Inngest cron** — extend
   `api/_lib/jobs/scheduledClearance.js` to iterate every product where
   `status: 'active'` and post a Slack/Resend alert if the score drops
   below 30. (Already recommended in the portfolio health report.)
4. **Per-product audit specs** — when each product gets its own
   `docs/audits/<product>-YYYY-MM-DD/` folder (matching the SAIGE/PressAI
   pattern), the cross-portfolio audit can be retired in favor of a faster
   product-by-product cycle.
5. **Compliance scaffolding for MyBirthSafe** — once the app is back
   online, the HIPAA-equivalent constraint declared in `objectives[]`
   needs at minimum a privacy-policy reference, a regional-storage flag,
   and a separate audit-log namespace. None of those exist today.
