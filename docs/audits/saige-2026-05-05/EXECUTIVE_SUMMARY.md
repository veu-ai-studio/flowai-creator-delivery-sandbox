# SAIGE — Super Customer Audit (Executive Summary)

**Product:** SAIGE — Enterprise Impact Performance Platform
**Target:** https://saigedemo.com
**Date:** 2026-05-05
**Auditor:** FlowAI Super Customer Agent v1
**Method:** Browserless full-render capture + 453 KB screenshot + Claude Sonnet 4.6 architecture/improvement-plan analysis + Claude Opus 4.7 buyer/investor-readiness aggregation
**Cost:** $0.28 ($0.06 capture + $0.22 aggregation)
**Audit objective:** Investor and enterprise-buyer review readiness — what would a sustainability-tech VC or ESG analyst notice on first visit?

> **Coverage note:** SAIGE's public surface today is a single waitlist landing page at saigedemo.com (the production domain `SaigePlatform.com` is referenced but not live). The audit covers everything visible at the public URL. Auth-gated content (the actual EIP scoring engine) is not yet available for crawling.

---

## Overall Health Score: **58 / 100**

SAIGE has a strong conceptual narrative, credible third-party stats from KPMG/MIT/Deloitte/Gartner, and a working live demo widget — but multiple credibility, compliance, and conversion gaps make it not yet investor- or enterprise-buyer-ready on first visit. The single biggest issue is a meta-irony: a compliance/ESG product whose own marketing site has no cookie consent, no real privacy policy, and accessibility violations.

---

## Issue counts by severity

| Severity | Count | Pattern |
|---|---|---|
| **P0** (blocks core flow) | **5** | Compliance gaps, dead production URL, lead capture wiring, CTA overload |
| **P1** (blocks important secondary flow) | **7** | Trust signals weak; launch timeline absent; sources uncited; accessibility |
| **P2** (degrades UX) | **5** | Animation accessibility, social proof near CTA, security disclosure |
| **P3** (cosmetic) | **1** | Character-encoding artifacts in CTA labels |
| **Total** | **18** | |

---

## Top 10 most critical issues

1. **[P0] [compliance]** Missing cookie consent + functional Privacy Policy — Add a GDPR/CCPA-compliant consent banner and publish a real Privacy Policy/Terms before any form capture, since SAIGE pitches itself as a compliance platform. — `https://saigedemo.com`

2. **[P0] [trust]** Footer copyright dated 2026 — Change to 2025 or reframe as "founded 2024, platform launching 2026" so enterprise procurement teams don't flag it as a placeholder error. — `https://saigedemo.com`

3. **[P0] [trust]** Production domain (`SaigePlatform.com`) referenced but not live — Either stand up a holding page on that domain or remove the reference; a dead production URL signals vaporware to a diligence-stage VC. — `https://saigedemo.com`

4. **[P0] [conversion]** Eight competing CTAs on a single landing page — Consolidate to one primary CTA per viewport (Request Early Access) and demote White Paper / LinkedIn / Send Message / Explore Demo to secondary placement. — `https://saigedemo.com`

5. **[P0] [data]** No confirmation that form submissions are being captured or delivered — Wire both forms to a verified backend (HubSpot / Mailchimp / Notion API) with success + error states and an internal email confirmation, otherwise leads are silently lost. — `https://saigedemo.com`

6. **[P1] [trust]** Single anonymised testimonial ("Sustainability Director, Manufacturing (Beta)") — Replace with 2-3 quotes carrying role, sector, headcount tier, and geography; one anonymous quote is below the floor for enterprise B2B credibility. — `https://saigedemo.com`

7. **[P1] [content]** No concrete launch timeline — Replace "Coming Soon" with a quarter or month (e.g., "Founding cohort onboarding Q3 2025") so risk-averse buyers can plan procurement cycles. — `https://saigedemo.com`

8. **[P1] [trust]** No funding, team, or company entity disclosure — Add a brief "About / Company" block stating legal entity, jurisdiction of incorporation, funding stage, and team size; founder bio alone (Victor Udo, FNSE, PhD) is insufficient for VC diligence. — `https://saigedemo.com`

9. **[P1] [trust]** Statistics cited without linked sources — Hyperlink the KPMG, MIT Sloan, Deloitte, and Gartner figures to their original reports; uncited stats on a compliance product are an instant credibility flag. — `https://saigedemo.com`

10. **[P1] [conversion]** Early access form has unlabelled fields and no value exchange — Add visible labels, a privacy microcopy line, and explicit benefits ("First 100 get free pilot + onboarding workshop") next to the CTA. — `https://saigedemo.com`

---

## Themes (cross-cutting patterns)

1. **Credibility theatre vs. first-party proof.** Third-party stats from KPMG / MIT / Deloitte / Gartner do the heavy lifting, but SAIGE itself offers only one anonymous testimonial, no named pilots, no funding disclosure, and no live production domain. Diligence-stage investors will read this as borrowing credibility while having none of their own to show.

2. **Compliance product, non-compliant marketing site.** No cookie banner, no real Privacy Policy, accessibility violations (heading hierarchy skipping h1 → h3, emoji-only icons without aria-labels, auto-cycling animation without pause control), and uncited claims — on a site whose product sells ESG, CSRD, and GDPR-adjacent compliance. This is the single sharpest credibility risk.

3. **Pre-launch ambiguity.** "Coming Soon" without dates, a 2026 copyright, and a missing production domain together read as vaporware to a diligence-stage investor.

4. **CTA overload diluting the single conversion that matters.** Eight CTAs compete with the one form (Request Early Access) that defines the page's primary objective. Click intent is split eight ways.

---

## All P1 + P2 + P3 issues (beyond top 10)

11. **[P1] [accessibility]** Heading hierarchy skips levels (h1 → h3) — Restructure so every h3 is nested under an h2; this is a WCAG 1.3.1 failure that ESG-aware buyers will notice given accessibility's place in social-pillar reporting.

12. **[P1] [data]** Demo numbers (EIP scores, domain confidence %, sector averages) lack methodology disclosure — Add a "How scores are calculated" link or modal; an unexplained scoring engine on a compliance product is a screen-out for any serious sustainability lead.

13. **[P2] [conversion]** No waitlist size / social proof near CTA — Add "Join N organisations already on the list" next to Request Early Access.

14. **[P2] [accessibility]** Emoji-only org-type icons without aria-labels — Add aria-labels to each org-type element so screen readers can navigate the demo cycler.

15. **[P2] [content]** Two separate forms (contact "Send Message" and Early Access) compete — Merge or clearly differentiate; an unlabelled contact form with generic "Send Message" looks unfinished.

16. **[P2] [trust]** No security / data handling statement — Add a one-liner on data residency, encryption, and SOC2 roadmap; ESG analysts will ask before submitting org data.

17. **[P2] [performance]** Auto-cycling 3-second demo animation cannot be paused — Add play / pause control; auto-rotating content fails WCAG 2.2.2 and frustrates users trying to read sector averages.

18. **[P3] [content]** Inconsistent capitalisation / spacing in CTA labels with character-encoding artefacts — Audit and clean up character encoding so CTAs render arrows correctly.

---

## Effort estimate

**Total: ~10-14 person-days** to clear all P0s and P1s.

| Category | Days | Detail |
|---|---|---|
| Compliance / legal | 2 | Privacy Policy, Terms, cookie banner |
| Engineering | 2 | Wire forms to backend, fix heading hierarchy, add aria-labels |
| Content / copy | 2 | Launch timeline, source-link the stats, value exchange microcopy, About block |
| Trust signals | 2 | 2-3 named testimonials with attribution, funding/entity disclosure |
| Design / UX | 2 | CTA consolidation, demo pause control, character encoding cleanup |
| QA + deploy | 0-2 | Verification across breakpoints |

---

## Next-week priorities (3 deliverables)

1. **[2 days]** **Compliance + Privacy Policy + Terms + cookie consent.** This is the highest-leverage trust win on a compliance product. Pair with hyperlinked stat sources for double impact.

2. **[1 day]** **Wire both forms (Early Access + Send Message) to a verified backend** — HubSpot / Notion / Mailchimp API with success + error states and an internal email notification. Silent lead loss on a pre-launch waitlist is the single worst possible failure mode.

3. **[1-2 days]** **Replace "Coming Soon" with a concrete timeline AND add an About / Company block** with legal entity, jurisdiction, funding stage, founding date, and team size. Combine with copyright fix and either standing up `SaigePlatform.com` as a holding page or removing the reference.

---

## Buyer-readiness assessment

- **Ready to demo today (with caveats):** The conceptual narrative, the live demo widget, the cited third-party problem stats, and the founder credentials work. A first conversation can be had on the strength of the headline pitch.
- **Avoid in the demo until fixed:** Don't draw attention to the privacy/compliance gaps (P0 #1) on a compliance product. Don't click through to `SaigePlatform.com` (it's dead). Don't show the form-submission flow (no confirmation that leads are captured).
- **Will be ready after these decisions are made:** Concrete launch timeline (Q3 2025? Q1 2026?), legal entity / funding stage to disclose, named pilot customers to quote, value exchange offer for early access (free pilot? onboarding? extended trial?).

---

## Methodology

This V1 audit captures rendered DOM via Browserless on the homepage (full JS rendering), runs Claude Sonnet 4.6 for architecture + improvement plan analysis, then runs Claude Opus 4.7 with the explicit "investor and buyer review readiness" lens for cross-cutting issue identification + severity classification.

**V1 limitations** (also true for the PressAI baseline):
- No test account creation — the actual EIP scoring engine wasn't exercised
- Forms not submitted (we don't know whether the backend wiring exists or works)
- No axe-core injection — accessibility is checked via DOM heuristics
- Single-page coverage — saigedemo.com appears to have no other public routes; once the production platform launches at SaigePlatform.com, run a multi-page audit there

**V1 strengths:**
- Real-browser capture (not simple HTTP fetch) — captures the JS-rendered demo widget
- Severity-classified action plan with effort estimates
- Themes layer for portfolio-pattern detection
- Cost-bounded ($0.28 vs $25 hard cap)

---

## Run artifacts

| File | Description |
|---|---|
| `EXECUTIVE_SUMMARY.md` | this file |
| `CLAUDE_CODE_BACKLOG.md` | paste-ready Claude Code task list per issue |
| `raw-captures/home.json` | full architecture + improvement plan + 453 KB screenshot for the homepage |
| `raw-captures/agent-run.json` | Super Customer Agent run record (single-surface, JSON envelope parsing failed but capture succeeded) |
| `raw-captures/aggregate-text.md` | raw Claude Opus aggregation output |
| `raw-captures/aggregate-response.json` | full aggregation response with cost + usage |

## Reproducing this audit

```bash
# Single-page sync run (works in <90s on Vercel)
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{"url":"https://saigedemo.com","product_id":"saige","depth":"quick","max_page_count":1,"sync":true}'
```

Once Inngest activates, full-depth (`max_page_count=200`) runs become possible and would re-discover any new routes added between now and then.
