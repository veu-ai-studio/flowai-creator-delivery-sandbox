# GTM Fix Priority — CEO-Actionable List (3 Products)

**Date:** 2026-05-16
**Author:** W4 (Smoke Testing + QA), per W04 dispatch
**Scope:** Public-facing surfaces of `saigedemo.com`, `saigeplatform.com`, `ourpublishingai.com`. No auth-gated content. No code changes (this doc is the only deliverable).
**Grounding:** Today's assessment scores (see §0) + the explicit "Key findings known" list in the dispatch + the 2026-05-05 blind audits of `saigeplatform.com` (`docs/audits/saigeplatform-2026-05-05/EXECUTIVE_SUMMARY.md`, 47/100) and `ourpublishingai.com` (`docs/audits/pressai-2026-05-05/EXECUTIVE_SUMMARY.md`, 38/100). Every fix below traces to a finding in those sources.

---

## 0. Today's assessment scores (NOT CLEARED)

| Domain | Score | Status | Prior baseline (2026-05-05) |
|---|---|---|---|
| `saigedemo.com` | **15 / 50** | NOT CLEARED | 58 / 100 (saigedemo legacy) |
| `saigeplatform.com` | **20 / 50** | NOT CLEARED | 47 / 100 |
| `ourpublishingai.com` | **19 / 50** | NOT CLEARED | 38 / 100 |
| `reltwin.com` | not yet assessed | — | — |
| `reachsms.*` | not yet assessed | — | — |

Trend: every product that has been re-assessed scores **lower** than its 2026-05-05 baseline. The placeholder/forward-dated/unverified content patterns are the dominant cause — same root issues, more surfaces exposing them.

---

## 1. Fix-priority taxonomy

| Field | Meaning |
|---|---|
| **Fix** | Exact change the CEO or a W workstream applies. |
| **Effort** | `CEO ≤ 30 min` (text edit / link swap / file replace) **or** `W-session` (needs a W dispatch to ship). |
| **Impact** | Which score layer it improves: `trust`, `functional`, `conversion`, `compliance`, `content`, `accessibility`. |
| **Priority** | `P0` (do today, blocks any prospect being shown the surface) · `P1` (this week) · `P2` (before next investor demo). |

A "P0" here means the score CANNOT clear with the issue present, not "the world ends." The CEO can ship most P0s in a single 30-min copy-paste session if they're text/link issues.

---

## 2. saigedemo.com — 15/50 NOT CLEARED

### 2.1 CEO-actionable fixes (≤ 30 min each)

| # | Fix | Effort | Impact | Priority |
|---|---|---|---|---|
| **D1** | Remove the **"LIVE DEMO"** label from the teaser/pre-launch page. Replace with `"Coming Soon"` or `"Early Access — Beta"`. The label currently advertises functionality the page does not yet provide. | CEO 5 min | trust + functional | **P0** |
| **D2** | Fix the **forward-dated `© 2026` copyright**. Replace with `© 2025` (or `© 2024–2025` if the brand was active prior). Forward-dating reads as careless or AI-generated to procurement. | CEO 2 min | trust | **P0** |
| **D3** | Reconcile the **ICP cycling animation** with the page detail. Either (a) remove `Energy`, `Mining`, `Real Estate` from the cycling animation until detail cards exist for each, **or** (b) add a single sentence under the animation: `"Detail playbooks ship Q4. Email founders@ for sector-specific briefs."` Don't show capability you can't substantiate. | CEO 10 min | trust + conversion | **P0** |
| **D4** | Add a one-line **backend confirmation** next to the early-access form: `"Submissions go to founders@saigedemo.com. We reply within 48h."` If no backend is wired, point the form `mailto:` instead — at least submissions reach a human. | CEO 10 min | functional + conversion | **P0** |
| **D5** | Verify and label the **white paper link**. Either replace the unverified destination with a working PDF link, or remove the link and replace with `"White paper available on request — email founders@"`. A dead authoritative-source link is worse than no link. | CEO 5 min | trust | **P1** |

### 2.2 W-dispatch fixes (need a workstream)

| # | Fix | Owner | Impact | Priority |
|---|---|---|---|---|
| **D6** | Author & host **Privacy Policy + Terms of Use**. Both are currently unverified. Procurement gates close instantly when these are missing or dead. | W5b (GTM doc/legal) | compliance + trust | **P0** |
| **D7** | Build the **detail cards for Energy/Mining/Real Estate** referenced in the ICP animation (each: pain → playbook → outcome). Unblocks D3 option (a) becoming option (b). | W2 (frontend) + W5b (copy) | content + trust | **P1** |
| **D8** | Wire a **real intake backend** for the early-access form (HubSpot/Resend webhook + confirmation email). Replace D4's `mailto:` with a tracked submission. | W5b (intake plumbing) | functional + conversion | **P1** |

---

## 3. saigeplatform.com — 20/50 NOT CLEARED

### 3.1 CEO-actionable fixes (≤ 30 min each)

| # | Fix | Effort | Impact | Priority |
|---|---|---|---|---|
| **P1a** | Replace `"Certification pending"` SOC 2 language with **`"SOC 2 Type II in audit — targeted completion {{month YYYY}}. Letter of engagement available under NDA."`** A specific in-flight commitment beats a passive "pending." | CEO 5 min | compliance + trust | **P0** |
| **P1b** | Remove every visible **placeholder string** on the home page: `[ENTERPRISE PARTNER LOGO PENDING]`, `[ENTERPRISE TESTIMONIAL PENDING]`. Replace with a single line: `"References available under NDA — request via founders@"`. (Per 2026-05-05 audit issue #3.) | CEO 10 min | trust | **P0** |
| **P1c** | Add **founder-credibility anchor** to surface the single-founder model as intentional, not as a risk. Add a one-line bio + photo + link to LinkedIn at the bottom of the home page: `"Built by Victor Udo — 10+ yrs in {{domain}}. Connect on LinkedIn."` The single-founder dependency exists either way; transparency converts better than concealment. | CEO 15 min | trust | **P1** |
| **P1d** | Replace cost/confidence claims (`"Cut ESG reporting cost by 60%"`, `"Raise audit confidence by 100%"`) with **single named pilot outcome**: `"Bucknell pilot: {{specific outcome from methodology}}"`. (Per 2026-05-05 audit issue #8.) | CEO 10 min | trust | **P1** |

### 3.2 W-dispatch fixes (need a workstream)

| # | Fix | Owner | Impact | Priority |
|---|---|---|---|---|
| **P2a** | Build **`/investor` surface** (thesis, traction, team, contact) **or 301-redirect to `/live-demo`**. Currently returns a soft-404. (Per 2026-05-05 audit issue #1.) Single highest score-layer impact on this product. | W2 (frontend) | functional | **P0** |
| **P2b** | Build **`/app` shell or 301-redirect**. Same soft-404 pattern as `/investor`. (Per 2026-05-05 audit issue #2.) | W2 (frontend) | functional | **P0** |
| **P2c** | Add **inline 3-field demo form** under the hero (`name`, `work email`, `company`) — currently the "Request Demo" CTA routes away from peak attention. (Per 2026-05-05 audit issue #4.) | W2 (frontend) + W5b (intake) | conversion | **P1** |

---

## 4. ourpublishingai.com — 19/50 NOT CLEARED

### 4.1 CEO-actionable fixes (≤ 30 min each)

| # | Fix | Effort | Impact | Priority |
|---|---|---|---|---|
| **O1** | Remove every **`[TESTIMONIAL PENDING]`** placeholder from prospect-facing surfaces. If no real testimonial yet, replace the entire testimonial block with the integration partners line: `"Publish to Amazon KDP, Apple Books, Ingram + 47 more."` — converts the trust gap into a capability statement. | CEO 5 min | trust | **P0** |
| **O2** | Remove every **`PARTNER LOGO 1-4`** placeholder block. If no logos are licensed yet, hide the whole logo bar (`display:none`) — broken trust signal is worse than no trust signal. | CEO 5 min | trust | **P0** |
| **O3** | Remove the **`"Simulated Demo Environment"`** disclaimer from prospect surfaces. Either (a) the surface is the real product (no disclaimer needed), (b) it's a true demo (rename surface to `/demo` and keep disclaimer there only), or (c) hide both surface and disclaimer until real. Disclaimer on a prospect-facing surface advertises pre-launch state. | CEO 10 min | trust + functional | **P0** |
| **O4** | Resolve **brand/domain mismatch** (`PressAI` brand vs `ourpublishingai.com` domain). Pick one and surface it consistently in the `<title>`, hero H1, footer, and meta description. Mixed naming reads as identity drift to procurement and confuses search ranking. Recommendation: keep the domain (changing it breaks links) and **rename the brand to "OurPublishingAI"** site-wide. | CEO 20 min (text + nav + footer + meta) | trust + content | **P0** |
| **O5** | Fix the **forward-dated `© 2026` copyright** (same as D2). Replace with `© 2025`. | CEO 2 min | trust | **P0** |

### 4.2 W-dispatch fixes (need a workstream)

| # | Fix | Owner | Impact | Priority |
|---|---|---|---|---|
| **O6** | Either **ship a working demo route** or **remove "Try the Demo" CTA** from the home page. (Today: there is no working demo route or dashboard entry.) Without a real demo behind the CTA, every demo click goes nowhere. | W2 (frontend) + W5x | functional + conversion | **P0** |
| **O7** | Fix **`/sign-up` (returns 404)** + **`/sign-in` (renders marketing page)** auth funnel — the entire conversion path is dead at the routing layer. (Per 2026-05-05 audit issues #1+#2.) | W2 (frontend) + W5x (Vercel rewrites) | functional + conversion | **P0** |
| **O8** | Add **3-5 attributed testimonials and a real logo bar** above the fold (publishers / authors who have used the platform, even unpaid early-access users). Unblocks O1+O2. | W5b (sales/marketing) | trust + conversion | **P1** |

---

## 5. Single highest-impact fix across all 3 products

> **CEO-actionable, today, ≤ 60 minutes total work across all 3 domains:**
> **Strip every visible placeholder string** (`[TESTIMONIAL PENDING]`, `[PARTNER LOGO PENDING]`, `[ENTERPRISE PARTNER LOGO PENDING]`, `PARTNER LOGO 1-4`, `"Simulated Demo Environment"`, `"Certification pending"`, `"LIVE DEMO"` on the teaser).

**Why this is the highest-impact single move:**
- It is the **only finding that appears on all 3 products** in today's assessment.
- It is the cheapest possible fix (find/replace + a CSS `display:none` on the logo bar) — no engineering, no dispatch, no copy-rewrite.
- It addresses the **trust** layer, which is the score layer dragging every product below clearance. Today's `15/50`, `19/50`, `20/50` scores are dominated by trust-layer deductions (placeholders + unverified-link + forward-dated copyright); functional/conversion/content layers are scoring meaningfully better.
- The 2026-05-05 audit of saigeplatform.com noted: "Fixing this category alone moves the health score from 38 → ~65" (re: a different blocker on PressAI; same dynamic applies — single-category fixes carry disproportionate leverage when one trust signal is broken site-wide).

**Companion 2-minute fix to bundle in:** strip `© 2026` from all three domains' footers and replace with `© 2025` (or whatever year is currently true). This is one find/replace across three repos and removes the forward-dated copyright finding from every product simultaneously.

---

## 6. Estimated score improvement if P0 fixes applied

Conservative estimates — net of any new findings W4 hasn't yet surfaced:

| Product | Today | If all P0 CEO-fixes shipped | If P0 CEO + P0 W-dispatch shipped |
|---|---:|---:|---:|
| `saigedemo.com` | 15 / 50 | **23 – 27 / 50** | **30 – 35 / 50** |
| `saigeplatform.com` | 20 / 50 | **26 – 30 / 50** | **34 – 40 / 50** |
| `ourpublishingai.com` | 19 / 50 | **27 – 32 / 50** | **34 – 40 / 50** |

**Methodology:** each P0 CEO-fix retires one trust-layer deduction (typical weight: 2–4 points on a 50-point scale per the 2026-05-05 audit rubric). P0 W-dispatch fixes (soft-404, broken auth funnel, missing demo route) retire functional-layer deductions which are weighted heavier (typical 4–6 points each). Numbers above assume **no regressions** introduced by the fixes and **no new findings** from re-assessment surfaces W4 hasn't yet crawled.

**Clearance threshold:** none of these get a product to "CLEARED" (typically ≥ 35–40 / 50 in the current rubric) on CEO-only fixes. Clearance requires the W-dispatch tier as well. But the trust-floor improvement from the CEO-only fixes is the highest-leverage move available *today*.

---

## 7. What's NOT in this list (and why)

- **`reltwin.com` and `reachsms.*`** — no assessment available; cannot author grounded fixes without a baseline run. **Action:** W04 dispatch the Super Customer Agent v1 against both domains; circle back here with the same per-product template once findings land.
- **Code changes beyond this doc** — per dispatch constraint. Even when a code-level fix is obvious (e.g., the soft-404 routes), the deliverable here is the prioritized list, not the patch.
- **Auth-gated content** — per dispatch scope (public-facing surfaces only).
- **Speculative GTM advice** — every fix above maps to a specific finding in the dispatch's "Key findings known" list or in the 2026-05-05 audits at `docs/audits/saigeplatform-2026-05-05/` and `docs/audits/pressai-2026-05-05/`. No fix is invented; no finding is fabricated.
