# SAIGE — Independent Verification Audit (saigeplatform.com)

**Product:** SAIGE — Enterprise Impact Performance Platform
**Target:** https://saigeplatform.com (the live product domain — independent of saigedemo.com baseline)
**Date:** 2026-05-05
**Auditor:** FlowAI Super Customer Agent v1 — **blind audit** (agent does not see prior baselines or self-reported fixes)
**Method:** Browserless full-render capture of all four tier surfaces (home, live-demo, investor, app) + Claude Sonnet 4.6 per-surface architecture/improvement analysis + Claude Opus 4.7 cross-surface aggregation
**Cost:** $0.53 (capture × 4 surfaces + Opus aggregation)

> **Strategic context:** A buyer reviews SAIGE this week. Earlier today Base44 applied 9 self-reported fixes and reported an estimated post-fix score of ~63. This audit grades the live product blind. The score below is the only number that's been independently verified.

---

## Overall Health Score: **47 / 100**

Two of the four audited tier surfaces (`/investor` and `/app`) return soft-404s on a live production domain that's being shown to a buyer this week. That structural failure no amount of polish on home and live-demo can offset.

---

## Score comparison

| Reference | Score | Delta |
|---|---|---|
| **saigedemo.com baseline** (this morning) | 58 | — |
| **Base44 self-reported** (after their 9 fixes) | ~63 | +5 |
| **🎯 saigeplatform.com blind audit (today)** | **47** | **-11 vs baseline · -16 vs self-report** |

**Interpretation:** the live SAIGE product on saigeplatform.com scores **lower** than the legacy saigedemo.com domain that's being retired. Specifically: half the four-tier surfaces don't exist as routes, and the ones that do exist still have placeholder strings and unsubstantiated claims visible on the homepage. Base44's self-reported fixes did improve some elements (the live-demo tier scores 62, marginally above the 58 baseline) but the score gap traces to **un-shipped tiers** rather than regressed quality on the shipped ones.

---

## Issue counts by severity

| Severity | Count |
|---|---|
| **P0** (blocks core flow — buyer demo killers) | **4** |
| **P1** (blocks important secondary flow) | **5** |
| **P2** (degrades UX) | **1+** |
| **Total** | **10+** |

---

## Per-tier breakdown

| Tier | Path | Status | Score | Notes |
|---|---|---|---|---|
| **Tier 2 — Waitlist / Marketing** | `/` | ✅ 200 | **54** | Real content but with `[PENDING]` placeholder strings and no inline form. |
| **Tier 3 — Audited Demo** | `/live-demo` | ✅ 200 | **62** | Highest-scoring tier — real demo cards with EIP scores 64-78. Lacks methodology link. |
| **Tier 4 — Investor Demo** | `/investor` | 🟡 200 (soft-404) | **4** | Renders "404 \| Page Not Found" with `Go Home` link only. |
| **Tier 1 — Live App** | `/app` | 🟡 200 (soft-404) | **4** | Same as `/investor` — soft-404 page with no real content. |

> **Soft-404:** the page returns HTTP 200 but the rendered DOM is the application's fallback "Page Not Found" component. From a buyer's perspective this is a broken link.

---

## Top 10 most critical issues

1. **[P0] [functional]** `/investor` returns soft-404 — Build a real investor surface (thesis, traction, team, contact) or 301-redirect to a working surface; do not ship a buyer review with this URL dead. — `https://saigeplatform.com/investor`

2. **[P0] [functional]** `/app` returns soft-404 — Either ship the authenticated app shell, redirect `/app` to live-demo or sign-in, or remove all internal/external references to `/app`. — `https://saigeplatform.com/app`

3. **[P0] [trust]** Visible `[ENTERPRISE PARTNER LOGO PENDING]` and `[ENTERPRISE TESTIMONIAL PENDING]` placeholder strings on the home page — Replace with real references or a single "References available under NDA" line; placeholder strings on a production page broadcast pre-launch state. — `https://saigeplatform.com/`

4. **[P0] [conversion]** "Request Demo" hero CTA has no inline form — Embed a 3-field inline form (name, work email, company) under the hero so intent is captured at peak attention rather than routed away. — `https://saigeplatform.com/`

5. **[P1] [trust]** Sandbox warning banner leads with risk language ("do not enter real organizational data") — Reframe as positive sandbox assurance and demote the caveat to a tooltip; current copy primes distrust at the conversion moment. — `https://saigeplatform.com/live-demo`

6. **[P1] [conversion]** "Book Enterprise Demo" is treated as a peer to sandbox exploration — Promote to a sticky, high-contrast CTA with a value qualifier (private env, dedicated CSM) so the highest-value action is unmistakable. — `https://saigeplatform.com/live-demo`

7. **[P1] [ai-quality]** EIP score (64-78 on demo cards) is shown with no scale, methodology link, or interpretation guide — Add an inline explainer ("0-100, Environmental Impact Performance across GRI/TCFD/STARS") and a link to the EIP methodology doc on every score surface. — `https://saigeplatform.com/live-demo`

8. **[P1] [trust]** Cost/confidence claims ("Cut ESG reporting cost by 60%", "Raise audit confidence by 100%") footnoted only as "based on EIP methodology benchmarks" — Replace with a linked methodology excerpt or a named pilot outcome procurement can validate. — `https://saigeplatform.com/`

9. **[P1] [accessibility]** Heading hierarchy on home jumps h1 → h3 → h2 — Re-tag the framework-coverage section as h2 and audit downstream levels to enforce sequential order (WCAG 1.3.1). — `https://saigeplatform.com/`

10. **[P2] [trust]** Single Bucknell testimonial framed as "SAIGE-style methodology" rather than direct platform use — Secure and surface at least two named enterprise testimonials with quantified outcomes, or remove the pending-slots framing. — `https://saigeplatform.com/`

---

## Themes (cross-cutting patterns)

1. **Tier completeness is broken.** Of the four surfaces audited, only two render real product content. `/investor` and `/app` both soft-404. The buyer-readiness story has visible holes on the live domain.

2. **Production page broadcasts unfinished state.** Literal `[PENDING]` placeholder strings, missing partner logos, and unsourced outcome claims appear on the home page — the first thing the buyer will see.

3. **Conversion paths exist but are undersupported.** Primary CTAs are present on home and live-demo but route away with no inline form, no sticky enterprise CTA, and no micro-conversion fallback (sample report, gated PDF).

4. **AI / EIP methodology is asserted but not substantiated.** The platform leans heavily on the EIP score as its differentiator, yet the score is shown without scale explanation, methodology link, or accuracy/validation evidence on the surfaces a buyer actually touches.

5. **Accessibility hygiene is inconsistent.** Heading order broken on home, emoji icons lack labels on the demo, 404 pages use "404" as h1. Each is small; cumulative they're a quality signal under audit.

---

## AI engine + agent quality findings

(Separate section — SAIGE-specific because the product centres on an AI scoring engine.)

- **Taxonomy asserted, not shown.** The product claims "22 agents across 5 domains and 16+ frameworks," but no agent is demonstrated, named with a sample output, or linked to a methodology artifact in the captured surfaces.

- **EIP scores rendered without provenance.** Live-demo shows EIP scores of 64-78 for three pre-loaded organizations. There's no visible explanation of how those scores are computed, what inputs drive them, or what the confidence interval is. **Hallucination risk is non-trivial** because a buyer cannot distinguish a deterministic scoring model from an LLM-generated estimate.

- **No latency, model-version, or methodology disclosure visible.** The "Read the EIP Methodology" CTA exists on home, but its destination quality wasn't verified in this capture set (the capture was bounded to the four tier URLs).

- **The "1 analysis per email per day" rate limit is the only operational engine signal.** This is a usage constraint, not a quality or accuracy signal.

- **"Live backend · Real AI" claim unsubstantiated.** Without an EIP methodology excerpt, sample-input/sample-output traces, or a model-version disclosure visible at the conversion moment, this reads as marketing copy rather than verifiable technical claim.

---

## Buyer readiness verdict

**🔴 NOT READY.**

Two of the four advertised tier surfaces (`/investor`, `/app`) return soft-404s. The home page contains literal `[PENDING]` placeholder strings. A buyer doing standard diligence — opening the obvious tier URLs, scanning the homepage for trust signals — will hit broken state within the first 60 seconds.

**Recommendation:** Do not ship the buyer demo as-is. Even if Victor steers the conversation away from `/investor` and `/app`, those URLs will appear in any thoughtful buyer's manual exploration (or any auto-crawled site map an analyst runs). The placeholder strings on home are the credibility-killer regardless of demo flow.

---

## Path to READY

| Effort | Required move |
|---|---|
| **2-3 days** | Build a minimum-viable `/investor` page (thesis + 1-line traction + team headshots + contact). Soft-404 → real surface. **Blocking.** |
| **1-2 days** | Either ship `/app` (auth-gated dashboard placeholder is fine — even a "Sign in to see your dashboard" gate beats 404) OR remove all references to `/app` from the homepage / nav. **Blocking.** |
| **1 day** | Replace every `[PENDING]` placeholder string on the home page. Either ship real partner logos / testimonials, or replace with "References available under NDA" + a contact link. **Blocking.** |
| **0.5 days** | Embed inline 3-field form under the home hero (name, work email, company) wired to `/api/leads/capture` (already shipped this evening). |
| **0.5 days** | Reframe sandbox warning + promote "Book Enterprise Demo" to sticky CTA on `/live-demo`. |
| **0.5-1 days** | Add inline EIP methodology explainer on every score surface; link to full methodology doc (verify the doc itself is publishable). |
| **0.5 days** | Fix heading hierarchy on home; add aria-labels to demo emoji icons. |

**Total to READY:** **5-7 working days** of focused work. Less if Victor accepts "redirect-to-existing" workarounds for `/investor` and `/app` (e.g., redirect both to `/live-demo` until the proper surfaces ship).

---

## Methodology

This V1 audit captures rendered DOM via Browserless on each of the four tier surfaces, runs Claude Sonnet 4.6 for per-surface architecture + improvement plan analysis, then runs Claude Opus 4.7 with the explicit "blind buyer-readiness verification" lens for cross-cutting issue identification + severity classification.

The agent was not told what (if anything) was changed before this audit. The score is independent of any prior reports.

**V1 limitations** (same as all Super Customer Agent runs):
- No test account creation — auth-gated content (the actual EIP scoring engine, if any) wasn't exercised
- Forms not actually submitted
- No axe-core injection — accessibility checked via DOM heuristics
- Single-pass per surface — interactive state changes (modals, dropdowns) not exercised

**Coverage:** 4 of 4 advertised tier surfaces (home / live-demo / investor / app). All other URLs (e.g., `/methodology`, `/pricing` if it exists) were out-of-scope for this targeted run; they'd be picked up in a deeper crawl.

---

## Run artifacts

| File | Description |
|---|---|
| `EXECUTIVE_SUMMARY.md` | this file |
| `CLAUDE_CODE_BACKLOG.md` | Code-side paste-ready task list |
| `BASE44_FIX_QUEUE.md` | UI-side paste-ready task list |
| `VICTOR_DECISIONS_NEEDED.md` | items requiring human judgment |
| `raw-captures/home.json` | full architecture + improvement plan + 250 KB screenshot |
| `raw-captures/live-demo.json` | same for /live-demo, 99 KB screenshot |
| `raw-captures/investor.json` | same for /investor (soft-404), 20 KB screenshot |
| `raw-captures/app.json` | same for /app (soft-404), 19 KB screenshot |
| `raw-captures/aggregate-text.md` | raw Claude Opus aggregation output |

## Reproducing this audit

```bash
for entry in \
  "home|https://saigeplatform.com/" \
  "live-demo|https://saigeplatform.com/live-demo" \
  "investor|https://saigeplatform.com/investor" \
  "app|https://saigeplatform.com/app"; do
  IFS='|' read -r SLUG URL <<< "$entry"
  curl -s -X POST https://flowai-dun.vercel.app/api/configuration/clone \
    -H "Content-Type: application/json" \
    -H "x-flowai-org-id: veu-ai-studio" \
    -d "{\"url\":\"$URL\",\"product_id\":\"saige\",\"options\":{\"captureScreenshot\":true,\"architectureAnalysis\":true,\"improvementPlan\":true}}" \
    --max-time 120 > "/tmp/$SLUG.json"
done
```

Then aggregate via a single `/api/llm-step` Opus call with the per-surface bundles.
