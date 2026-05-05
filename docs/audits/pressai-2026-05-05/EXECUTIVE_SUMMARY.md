# PressAI — Super Customer Audit (Executive Summary)

**Product:** PressAI — Agentic AI Publishing Platform
**Target:** https://ourpublishingai.com
**Date:** 2026-05-05
**Auditor:** FlowAI Super Customer Agent v1
**Method:** Browserless full-render capture of 5 surfaces (home, pricing, sign-in, sign-up, privacy) + Claude Sonnet 4.6 per-surface architecture + improvement plan + Claude Opus 4.7 cross-surface aggregation
**Total Cost:** $0.66 (capture) + $0.32 (aggregation) = **$0.98**
**Surfaces audited:** 5 of ~15 visible from the homepage (auth-gated content not exercised in V1 — see TODO)

---

## Overall Health Score: **38 / 100**

PressAI has a coherent marketing narrative across home and pricing, but the entire authentication funnel is broken or misrouted (`/sign-up` returns 404, `/sign-in` renders the marketing landing page instead of a login form), making the product effectively unusable for a real prospect on first visit. The capture also revealed systemic trust signal absence and content patterns that read as pre-launch placeholder rather than $29-$99/mo SaaS.

---

## Issue counts by severity

| Severity | Count | Notes |
|---|---|---|
| **P0** (blocks core flow) | **5** | Auth funnel broken; trust deficit; future-dated privacy policy |
| **P1** (blocks important secondary flow) | **5** | Conversion gaps; unsourced claims; compliance friction; copy weakness |
| **P2** (degrades UX) | not enumerated in this run | Implied by Claude-level findings — heading hierarchy, accessibility, etc. |
| **P3** (cosmetic) | not enumerated in this run | — |
| **Total enumerated** | **10 critical** | |

---

## Top 10 most critical issues

1. **[P0] [functional]** `/sign-up` returns 404 — Restore the sign-up route and deploy an actual registration form (email, password, submit) so visitors can register at all. — `https://ourpublishingai.com/sign-up`

2. **[P0] [functional]** `/sign-in` renders the marketing landing page instead of a login form — Replace the route's component with a real email/password (and/or OAuth) authentication form so returning users and password-manager redirects don't dead-end. — `https://ourpublishingai.com/sign-in`

3. **[P0] [conversion]** Every "Get Started Free" CTA on home and pricing exits to an off-page destination that is currently 404'd — Either fix the destination (see issue 1) or add inline hero email capture so leads aren't silently destroyed. — `https://ourpublishingai.com`

4. **[P0] [trust]** Privacy policy carries a future-dated "Last updated: April 11, 2026" timestamp — Correct to the actual current effective date or add an explicit "scheduled effective date" annotation so the policy doesn't read as placeholder text. — `https://ourpublishingai.com/privacy`

5. **[P0] [trust]** Zero third-party social proof anywhere in the funnel (no named testimonials, customer logos, review badges, or press mentions) — Add 3-5 attributed testimonials and a logo bar (Amazon KDP, Ingram, Apple Books are already cited as integrations) above the fold on home and pricing. — `https://ourpublishingai.com`

6. **[P1] [conversion]** Hero presents two near-identical CTAs ("Get Started Free →" and "Start Publishing Free →") in the same viewport — Consolidate to one dominant primary CTA plus a secondary "Sign In" text link to stop splitting click intent. — `https://ourpublishingai.com`

7. **[P1] [content]** The nine workflow taglines (e.g., "Scope → Governed Execution → Delivery", "Idea → Manuscript → Published & Selling") describe internal process, not outcomes — Rewrite each tagline to lead with a measurable user outcome (e.g., "Turn a rough idea into a royalty-generating manuscript in under 30 days"). — `https://ourpublishingai.com`

8. **[P1] [trust]** Quantified hero badges ("9 AI Workflows", "50+ Distribution Channels", "100% AI-Powered Global Reach") are unsourced assertions — Add tooltips/footnotes substantiating each figure or replace the vaguest ("100% AI-Powered Global Reach") with a concrete claim like "Publish to Amazon, Apple Books, Ingram + 47 more". — `https://ourpublishingai.com/pricing`

9. **[P1] [compliance]** Privacy Section 5 ("Your Rights") forces users to email `privacy@ourpublishingai.com` to exercise GDPR/CCPA rights — Embed a self-serve rights-request form (name, email, request type) with auto-confirmation so rights are actually "easily exercisable". — `https://ourpublishingai.com/privacy`

10. **[P1] [trust]** Privacy Section 2 names encryption standards (TLS 1.3, AES-256) but lists no third-party audits or certifications — Add SOC 2 Type II / ISO 27001 references (or "in progress" status) so enterprise evaluators have something verifiable. — `https://ourpublishingai.com/privacy`

---

## Themes (cross-cutting patterns)

1. **Authentication funnel is the single largest failure mode.** 2 of the 5 captured surfaces (sign-up, sign-in) do not perform their stated function. Every home/pricing CTA depends on them. Fixing this category alone moves the health score from 38 → ~65.

2. **Trust signals are systemically absent across the entire funnel** — no testimonials, customer logos, review badges, or third-party certifications appear on home, pricing, sign-in, or privacy. This is a portfolio-level pattern (also observed on SAIGE) — VEU is investing in problem framing and pricing tiers but underweighting third-party validation across products.

3. **Every conversion CTA is a blind off-page redirect.** No inline email capture exists anywhere, so hesitating visitors leave zero retargetable signal. Compounds with Theme 1 — when the off-page destination 404s, all signal is lost.

4. **Marketing copy is process-descriptive rather than outcome-led.** Workflow taglines, stat badges, and pricing tiers all describe what PressAI does internally rather than what the customer gets. This is rewriteable in a single content sprint.

5. **Pre-launch posture vs paid pricing mismatch.** Domain/brand mismatch (`ourpublishingai.com` hosting "PressAI") combined with future-dated privacy policy and broken auth routes signals an unfinished/pre-launch posture inconsistent with the $29-$99/mo pricing on display.

---

## Effort estimate

**Total: ~14-18 person-days** to clear all P0s and P1s.

| Category | Days | Detail |
|---|---|---|
| Engineering | 3 | Restore `/sign-up` and `/sign-in` with working forms + redirects |
| Design + content | 2 | Testimonials, logo bar, consolidated hero CTAs |
| Content rewrite | 3 | 9 workflow taglines, stat badge sourcing, pricing ROI anchors |
| Legal / compliance | 2 | Privacy timestamp, rights-request form, consent model |
| Accessibility | 2 | Heading hierarchy, emoji aria, alt-text |
| QA / copy review / deploy | 2-4 | Verification across surfaces |

---

## Next-week priorities (3 deliverables)

1. **[1 day]** Restore `/sign-up` route with a working registration form (email, password, submit, privacy/terms links) and 301 redirects from any orphaned variants.

2. **[1 day]** Replace `/sign-in` route's marketing payload with an authentication form that renders on first paint (email + password + OAuth options).

3. **[2 days]** Ship a hero-level trust block on home and pricing: 3 named testimonials with photos/titles, a 6-8 logo bar (Amazon KDP, Ingram, Apple Books, others already cited as integrations), and stat badges sourced via tooltip/footnote.

---

## Methodology

This V1 audit captures rendered DOM via Browserless, runs Claude Sonnet 4.6 per-surface for architecture + improvement plan analysis, then runs Claude Opus 4.7 across all surfaces for cross-cutting issue identification + severity classification. Surfaces were captured sequentially with 4-second pacing to respect Browserless rate limits.

**V1 limitations (all documented as TODOs in `/api/_lib/superCustomerAgent.js`):**
- No test account created — auth-gated surfaces (workflows, dashboard, account settings) not exercised
- Forms not actually submitted — submission flow not verified
- No Stripe test-mode payment surface walk
- Visual regression diffs not run (no baseline)
- axe-core accessibility checks not yet injected (using DOM heuristics only)
- HAR network capture not enabled

**V1 strengths:**
- Real-browser JS-rendered capture (not simple HTTP fetch)
- Console error + network error capture per surface
- Heading hierarchy + alt-text accessibility heuristics
- Severity-classified action plan with effort estimates
- Cross-surface theme detection
- Cost-bounded with hard cap

---

## Run artifacts

| File | Description |
|---|---|
| `EXECUTIVE_SUMMARY.md` | this file |
| `CLAUDE_CODE_BACKLOG.md` | paste-ready Claude Code task list per issue |
| `raw-captures/home.json` | full architecture + improvement plan for homepage |
| `raw-captures/clone-pricing.json` | same for /pricing |
| `raw-captures/clone-signin.json` | same for /sign-in (which renders marketing) |
| `raw-captures/clone-signup.json` | same for /sign-up (which 404s) |
| `raw-captures/clone-privacy.json` | same for /privacy |
| `raw-captures/aggregate-text.md` | raw Claude Opus aggregation output |

## Reproducing this audit

```bash
# Single-URL (sync, blocks ~70-90s)
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{"url":"https://ourpublishingai.com","product_id":"pressai","depth":"quick","max_page_count":1,"sync":true}'

# Multi-URL (async + poll)
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{"url":"https://ourpublishingai.com","product_id":"pressai","depth":"quick","max_page_count":5}'

# Then poll (first poll drives the work):
curl "https://flowai-dun.vercel.app/api/audits/super-customer/run?run_id=<id>"
```

Once Inngest activates, the multi-URL path becomes truly async and reliable.
