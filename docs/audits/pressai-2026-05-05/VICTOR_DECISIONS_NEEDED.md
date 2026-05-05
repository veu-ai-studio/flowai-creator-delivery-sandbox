# PressAI Fix Sprint — Decisions Needed from Victor

**Date:** 2026-05-05
**Source audit:** [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) · [`CLAUDE_CODE_BACKLOG.md`](CLAUDE_CODE_BACKLOG.md)

---

## Constraint discovered before any fix could be applied

PressAI's source code is not in the FlowAI repo (`victor2081new-cloud/flowai`). The audited site lives at `ourpublishingai.com`, which is a separate codebase. From this repo I cannot:
- Edit `/sign-up`, `/sign-in`, hero, pricing, or privacy-policy components
- Deploy a registration form
- Modify the Base44-hosted PressAI app

**Every P0 and P1 from the audit therefore needs Victor's hand off** — either via dispatching Claude Code against the PressAI repo, or via a business decision that gates the fix. Each item below carries full context so Victor can act in <2 minutes per item.

The 10 items split:
- **5 are pure code dispatches** — paste the task block from `CLAUDE_CODE_BACKLOG.md` into Claude Code with the PressAI repo loaded; no further decision needed.
- **5 require a business / content decision first** before any code can land.

---

## Code dispatches — no decision needed, just dispatch

These five tasks are ready to dispatch verbatim. Open Claude Code in the PressAI repo, paste the corresponding section from `CLAUDE_CODE_BACKLOG.md`, and run.

### [P0-001] Restore /sign-up route with working registration form
- **What was found:** `/sign-up` returns 404. Every "Get Started Free" CTA on home and pricing routes here.
- **What's needed:** Apply `CLAUDE_CODE_BACKLOG.md` section `P0-001` against the PressAI repo. No business decisions; the proposed solution is unambiguous.
- **Recommendation:** Dispatch first. Single highest-leverage P0 — fixes the auth funnel for every CTA on the site.

### [P0-002] Replace /sign-in marketing payload with auth form
- **What was found:** `/sign-in` renders the marketing landing page instead of a login form.
- **What's needed:** Apply `CLAUDE_CODE_BACKLOG.md` section `P0-002`. Backend auth endpoint already exists (per architecture analysis); just needs the form component routed correctly.
- **Recommendation:** Dispatch immediately after P0-001 — together they restore the full auth funnel.

### [P0-003] Add inline hero email capture (auth-funnel insurance)
- **What was found:** Every CTA blind-redirects off-page; no inline capture so hesitating visitors leak.
- **What's needed:** Apply `CLAUDE_CODE_BACKLOG.md` section `P0-003`. Plus one decision: **which backend stores the captured emails?** (Recommendation below.)
- **Recommendation:** Dispatch the form component + endpoint; route stored emails to whatever PressAI uses for its existing newsletter signups (HubSpot most likely; verify in the PressAI repo first). If no email backend exists, store in Supabase / Notion / Mailchimp — Victor's call which.
- **Sub-decision:** **Which email backend?**
  - HubSpot (recommended if PressAI uses it elsewhere — keeps lead routing consistent)
  - Mailchimp (cheapest, simplest)
  - Supabase row insert (most flexible, requires followup automation)
  - Notion API (good for low-volume, easy operator review)

### [P0-004] Correct future-dated privacy policy timestamp
- **What was found:** Privacy policy reads "Last updated: April 11, 2026" — a future date. Reads as placeholder text, undermines policy credibility.
- **What's needed:** Apply `CLAUDE_CODE_BACKLOG.md` section `P0-004`. Trivial change.
- **Recommendation:** Dispatch immediately. Under 5 minutes. Pick "May 5, 2026" (today) or whatever the actual last-edit date is.

### [P1-004] Embed self-serve GDPR/CCPA rights-request form
- **What was found:** Privacy Section 5 forces users to email `privacy@ourpublishingai.com` to exercise rights. Violates GDPR's "easy means" expectation.
- **What's needed:** Apply `CLAUDE_CODE_BACKLOG.md` section `P1-004`. Backend can be a simple email-relay; no complex storage required.
- **Recommendation:** Dispatch when convenient. Not blocking demos but reduces compliance exposure.

---

## Decisions required before any code can land

These need Victor's input first. After he answers, Claude Code can then be dispatched against the PressAI repo with the answer baked in.

### [P0-005] Hero-level trust block — testimonials / logos / sourced stats

- **Surface:** `https://ourpublishingai.com` and `/pricing`
- **What was found:** Zero third-party social proof anywhere in the funnel — no testimonials, no customer logos, no review badges. Top P0 in the audit's improvement-plan ranking.
- **What's needed:** Three content decisions before Claude Code can draft the trust block.

**Decision 1 — Which testimonials?**
- Pull from existing PressAI beta users (need 2-3 with permission to attribute)
- Pull from author / publisher partnerships if any exist
- Use placeholder + "More testimonials coming soon" badge for now (least credible)
- Decline trust-block deployment until real quotes are collectable (riskiest — ships nothing)

**Recommendation:** Reach out to 3-5 existing beta users TODAY for permission to quote. If outreach takes >48h, ship with the placeholder + "More coming" badge so the visual block exists; backfill quotes within a week.

**Decision 2 — Which partner logos?**
- Audit captured: Amazon KDP, Apple Books, Ingram, Barnes & Noble, Kobo, Google Play Books, Smashwords, Draft2Digital are all referenced as integrations on the existing pricing page. Are these all live integrations, or are some aspirational?

**Recommendation:** List only the integrations that are demonstrably live (verify by attempting a publish flow). For partial-readiness platforms, mark them as "coming soon" via a smaller sub-row.

**Decision 3 — Which stats to substantiate vs replace?**
- Current hero badges: "9 AI Workflows", "50+ Distribution Channels", "100% AI-Powered Global Reach"
- Each is unsourced. Substantiate or replace?

**Recommendation:** Replace "100% AI-Powered Global Reach" (vaguely defined; not substantiable) with a concrete claim like "Publish to 50+ platforms across 195 countries". Keep "9 AI Workflows" and link to a `/workflows` page that lists each. Replace "50+ Distribution Channels" with the exact count + tooltip listing the platforms.

---

### [P1-001] Consolidate hero CTAs (currently two near-identical)

- **Surface:** `https://ourpublishingai.com`
- **What was found:** Hero shows both "Get Started Free →" and "Start Publishing Free →" in the same viewport. Click intent is split.
- **What's needed:** Pick the dominant CTA copy.

**Options:**
- "Start Publishing Free" (more product-specific, action-led)
- "Get Started Free" (more familiar, generic SaaS phrasing)
- "Start Your First Book Free" (most concrete user outcome)
- "Try PressAI Free" (brand-led)

**Recommendation:** "Start Publishing Free" — keeps the action-led framing but trims to one. Demote the other to a small "Sign In" text link in the top nav. Trivial dispatch once chosen.

---

### [P1-002] Rewrite 9 workflow taglines as outcome-led copy

- **Surface:** `https://ourpublishingai.com`
- **What was found:** All 9 workflow taglines describe internal process ("Idea → Manuscript → Published & Selling") rather than user outcomes.
- **What's needed:** Either Victor writes the new outcome-led taglines, OR Victor approves a Claude-drafted set before dispatch.

**Options:**
- Victor writes the 9 taglines himself (highest fidelity to brand voice)
- Approve Claude-drafted taglines (faster — sample below)
- Hire a copywriter (overkill for 9 taglines)
- Defer (not recommended — these are top-of-funnel copy, fixing them improves every CTA's clickthrough)

**Recommendation:** Approve a Claude-drafted set. Sample drafts below for the first three workflows — if Victor approves the pattern, we run all 9 through the same template:

| Original (process-led) | Drafted (outcome-led) |
|---|---|
| "Scope → Governed Execution → Delivery" | "Turn a rough idea into a royalty-generating manuscript in under 30 days" |
| "Idea → Manuscript → Published & Selling" | "Publish your first book on Amazon, Apple Books, and Ingram in 14 days" |
| "Research → Outline → Draft → Polish" | "Cut your draft cycle from months to days with agentic editing" |

If Victor approves the pattern, fastest dispatch path: have Claude generate all 9 against the same template, then Victor approves the batch in one review.

---

### [P1-003] Source or replace unsourced hero stat badges

- **Surface:** `https://ourpublishingai.com/pricing`
- **What was found:** Hero stats unsourced. Same root issue as the trust block (P0-005).
- **What's needed:** For each of the 3 stat badges, decide: substantiate (with what source?) or replace (with what concrete claim?).

**Options for "9 AI Workflows":**
- Link to a `/workflows` page listing each named workflow (recommended — simplest)
- Tooltip with brief workflow names (also fine)
- Replace with a more outcome-led claim ("9 ways to ship faster")

**Options for "50+ Distribution Channels":**
- Replace with exact count + tooltip listing the platforms (recommended)
- Link to a `/distribution` page with the full list
- Keep "50+" but add a footnote with the methodology

**Options for "100% AI-Powered Global Reach":**
- Replace with a concrete claim ("Publish to 50+ platforms across 195 countries") (recommended — measurable)
- Replace with "Built end-to-end on agentic AI"
- Remove entirely (lose the stat-row symmetry)

**Recommendation:** Apply all three "(recommended)" options above. Total dispatch effort < 1 hour once Victor confirms.

---

### [P1-005] Add SOC 2 / ISO 27001 references (or "in progress" status)

- **Surface:** `https://ourpublishingai.com/privacy`
- **What was found:** Privacy Section 2 names encryption standards (TLS 1.3, AES-256) but no third-party audits or certifications.
- **What's needed:** What's PressAI's actual compliance status?

**Options:**
- Has SOC 2 / ISO 27001 → add logos + link to report (gated by NDA if needed)
- In progress → add "SOC 2 audit in progress (target Q3 2026)" or similar
- Not started → add a "Compliance roadmap" section listing target frameworks + target dates
- Decline disclosure → no fix; accept the credibility gap (least recommended)

**Recommendation:** Even "in progress" beats silence. If nothing's started, "SOC 2 readiness assessment scheduled Q3 2026" is a defensible placeholder that signals serious intent without overclaiming. Pair with the encryption-standards already listed.

---

## Summary

| Item | Type | Blocked by | Time to dispatch once decided |
|---|---|---|---|
| P0-001 | Code | nothing | 1 day |
| P0-002 | Code | nothing | 1 day |
| P0-003 | Code | email-backend choice | 0.5 day after decision |
| P0-004 | Code | nothing | 15 min |
| P0-005 | Decisions | testimonials + logos + stats | 2 days after decisions |
| P1-001 | Decision | CTA copy | 15 min after decision |
| P1-002 | Decision | tagline batch approval | 0.5 day after approval |
| P1-003 | Decisions | stat substantiation/replacement | 1 hour after decisions |
| P1-004 | Code | nothing | 0.5 day |
| P1-005 | Decision | compliance status | 30 min after decision |

**Fastest path to a fixed PressAI:**
1. **Dispatch P0-001, P0-002, P0-004 immediately** (no decisions needed) — restores the auth funnel + privacy timestamp in 2-3 days.
2. **Make the 5 decisions above** (~30 minutes of Victor's time).
3. **Dispatch P0-003, P0-005, P1-001, P1-002, P1-003, P1-005** — 4-5 days of engineering with decisions baked in.
4. **Re-audit** at end of next week to confirm fixes landed and health score moved from 38 → 75+.
