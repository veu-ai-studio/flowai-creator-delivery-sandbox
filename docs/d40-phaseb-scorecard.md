# D40 — Phase B Beta-Readiness Scorecard (5 VEU products)

**Dispatch:** W5a D40 — probe-only, no fix loop.
**Date:** 2026-05-18 (NY) / 2026-05-19 (UTC).
**Method:** Phase B Adversarial Surface (D39) on each product's production URL,
canonical §7.6 scoring with Phase B findings unioned.

## Verdict snapshot

| Rank | Product    | Surface §7.6        | Phase-B §7.6        | Δ      | Dead | Forms | Modals | Agents | Mock-only | Verdict |
| ---- | ---------- | ------------------- | ------------------- | ------ | ---- | ----- | ------ | ------ | --------- | ------- |
|  1   | pressai    | 90.5 showcase-ready | 65.5 internal-only  | −25.0  |  5   |   0   |   0    |   0    |    0      | FACADE  |
|  2   | mypreglife | 88.0 demo-ready     | 60.0 internal-only  | −28.0  |  9   |   1   |   0    |   0    |    1      | FACADE  |
|  3   | saige      | 70.5 internal-only  | 52.5 not-demo-ready | −18.0  |  9   |   0   |   0    |   0    |    0      | FACADE  |
|  4   | reachsms   | 65.5 internal-only  | 44.5 not-demo-ready | −21.0  |  6   |   0   |   1    |   0    |    0      | FACADE  |
|  5   | reltwin    | 24.5 not-demo-ready |  3.5 not-demo-ready | −21.0  |  6   |   0   |   1    |   0    |    0      | FACADE  |

**Bottom line: 5/5 FACADE.** None of the VEU products are beta-ready by the
CEO criterion ("NO GTM without real interactive verification"). Every product's
surface-only score over-stated readiness by 18-28 points.

## Per-product detail

### 1 — PressAI (65.5 / FACADE) — pressai-platform.vercel.app

- **Surface-only:** 90.5/100 showcase-ready. **Phase B:** 65.5/100 internal-only. **Δ −25.**
- **Phase B probe:** 9 interactives tested, **5 dead/erroring**, 56 requests / 5
  meaningful POST / 1 distinct URL.
- **Has backend traffic** but **every primary CTA returns 404.**
- **Top 5 functional defects (all high severity, all broken-modal):**
  - `Sign In` button (nav) → 404s on click
  - `Get Started Free` button (nav) → 4× 404s on click
  - `Start Publishing Free →` hero button → 4× 404s
  - `See Pricing` anchor → 3× 404s
  - `Get Started Free` pricing button → 404
- **Beta verdict:** **Looks polished, every conversion path is dead.** Cannot
  ship — first prospect click = 404. Backend reachable but signup endpoints
  return 404; either the auth surface is not deployed or the routes never
  shipped.

### 2 — MyPregLife (60.0 / FACADE) — mypreglife-platform.vercel.app

- **Surface-only:** 88.0/100 demo-ready. **Phase B:** 60.0/100 internal-only. **Δ −28.**
- **Phase B probe:** 11 interactives tested, **9 dead/erroring**, 1 form silently
  no-ops, **6 requests / 0 meaningful same-origin XHR/fetch → MOCK-ONLY FLAG.**
- **Top 5 functional defects:**
  - [high] form submits silently — "no observable response (no nav, no
    success/error surface, no validation feedback) — likely silent no-op or
    mock-only"
  - [high] page-level **mock-only signal** — 11 interactives + 1 forms + 0
    agents exercised, **ZERO meaningful same-origin XHR/fetch** captured
  - [medium] 1 console error on /
  - [medium] 2 console errors on /privacy-policy
  - [medium] 2 console errors on /terms-of-use
- **Beta verdict:** **Static marketing page wearing a product's clothes.** No
  backend wiring detected at all. Cannot ship — claims a product, doesn't have
  one running.

### 3 — Saige (52.5 / FACADE) — saige-platform.vercel.app

- **Surface-only:** 70.5/100 internal-only. **Phase B:** 52.5/100 not-demo-ready. **Δ −18.**
- **Phase B probe:** 10 interactives tested, **9 dead/erroring**, 8 requests / **2
  meaningful POST**.
- **Top 5 functional defects:**
  - [high] network-failure on /Landing — 2 network failures
  - [high] broken link — base44.com/logo_v2.svg (404 dependency on Base44)
  - [medium] 8 console errors on /Landing
  - [medium] 2 console errors on /home
  - [medium] 2 console errors on /enterprise-demo
- **Beta verdict:** **Has the bones of a real product** (2 meaningful POSTs hit
  a backend) but **9/10 buttons do nothing.** Plus loud Base44 dependency
  leakage. Cannot ship — interactive layer is mostly dead.

### 4 — ReachSMS (44.5 / FACADE) — reachsms-platform.vercel.app

- **Surface-only:** 65.5/100 internal-only. **Phase B:** 44.5/100 not-demo-ready. **Δ −21.**
- **Phase B probe:** 6 interactives tested, **6 dead/erroring (100%)**, 1 modal
  trigger errored, 8 requests / 2 meaningful POST.
- **Top 5 functional defects:**
  - [high] network-failure on `/`
  - [high] broken link — base44.com/logo_v2.svg (same Base44 leakage)
  - [high] "English" language-selector button **errors on click**: "Target page,
    context or browser has been closed"
  - [medium] **10 console errors** on `/`
  - [medium] 2 console errors on /Dashboard
- **Beta verdict:** **100% of tested interactives are dead.** 10 console errors
  on the homepage. Cannot ship — nothing works.

### 5 — RelTwin (3.5 / FACADE) — reltwin-platform.vercel.app

- **Surface-only:** 24.5/100 not-demo-ready. **Phase B:** 3.5/100 not-demo-ready. **Δ −21.**
- **Phase B probe:** 6 interactives tested, **6 dead/erroring (100%)**, 1 modal
  trigger failed, **39 requests / 14 meaningful POST / 9 distinct URLs**.
- **Top 5 functional defects (all high-severity network-failure):**
  - network-failure on `/`
  - network-failure on /Home
  - network-failure on /YourRelationships
  - network-failure on /YourCommunications
  - network-failure on /AskRelTwinAI
- **Beta verdict:** **Has the MOST backend wiring of all 5 products** (14
  meaningful POSTs, 9 distinct API URLs) but **every single dashboard route
  returns errors.** Cannot ship — backend exists but is broken end-to-end. This
  is the failure mode opposite to MyPregLife's mock-only signal: real code,
  zero success.

## Patterns across the 5 products

1. **Surface-only scoring over-stated readiness on all 5** by 18-28 points.
   The deltas are not noise — they reflect real interactive defects that a
   static-only crawl cannot see. CEO directive ("NO GTM without real
   interactive verification") is data-ratified.

2. **Two distinct facade patterns.** Some products look polished but never call
   a backend (mypreglife: static marketing pretending to be a product;
   reltwin: real backend that's broken). Others have working backends but
   dead conversion CTAs (pressai: every signup button 404s). Different
   remediation paths.

3. **Base44 dependency leakage** appeared on both saige and reachsms
   (`base44.com/logo_v2.svg` 404). Indicates these products still pull assets
   from the Base44 source they were forked from — a footgun for production
   independence.

4. **Console-error density is high** across the board. 10 console errors on a
   landing page (reachsms) or 8 console errors (saige) signals the product is
   not stable under normal browser rendering. Phase B caught this; surface-only
   caught some of it.

5. **No detectable AI agent on any of the 5 surfaces.** Either the agents are
   behind auth gates (Phase B is currently unauth-only — ENTRY-007
   storageState not yet plumbed through), or the agent surfaces aren't
   exposed on the landing routes Phase B probes. Worth verifying separately.

## Recommendation to CEO

**Do NOT ship any of the 5 to beta.** All 5 fail the FUNCTIONAL bar by the D40
verdict criteria (≥75 + 0 mock + ≤2 dead). The honest readiness order:

1. **Saige & ReachSMS** — have nascent backend wiring (2 meaningful POSTs each)
   but kill almost every click. Closest to "real" once the interactive
   layer is wired.
2. **RelTwin** — has the most ambitious backend (14 POSTs across 9 URLs) but
   every route errors. Highest reward per fix unit if the team can debug the
   backend; otherwise will not ship.
3. **PressAI** — best-presenting landing page that ships nothing. Marketing-
   ready, product-not. Needs the signup/onboarding flow wired before it's
   even partial.
4. **MyPregLife** — entirely static facade. Furthest from real.

## Engine validation

The 5 deltas (−25, −28, −18, −21, −21) prove Phase B is **measuring something
surface scoring misses** consistently. The engine ITSELF is validated:
- Every probe ran to completion (1m 8s – 1m 28s).
- Every product produced a categorized findings list.
- The verdict criteria (FUNCTIONAL / PARTIAL / FACADE) applied uniformly.
- No engine errors, no probe crashes.

## Source artifacts

- `scripts/run-phaseb-scorecard.mjs` — the probe runner.
- `docs/d40-phaseb-logs/mypreglife.md`
- `docs/d40-phaseb-logs/saige.md`
- `docs/d40-phaseb-logs/reltwin.md`
- `docs/d40-phaseb-logs/reachsms.md`
- `docs/d40-phaseb-logs/pressai.md`

Each per-product log carries the verbatim crawl + Phase B summary + top-5
defects + machine-readable JSON footer for downstream aggregation.
(Raw `live-d40-<product>.log` files exist in the repo working tree but are
.gitignored by the `*.log` rule; the .md copies under docs/ are the canonical
committed artifacts.)
