# SAIGE saigeplatform.com Audit — Decisions Needed from Victor

**Date:** 2026-05-05
**Source:** [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md)

---

These are the decisions blocking the post-audit fix sprint. Each is a 1-2 minute decision; total ~10-15 minutes of Victor's time. After these are answered, both Code and Base44 can dispatch their respective task lists.

---

## Decision 1 — Routing strategy for `/investor` and `/app` (gates P0-001 in CLAUDE_CODE_BACKLOG.md)

**What was found:** Both URLs return HTTP 200 but render the application's "Page Not Found" component. From a buyer's perspective they're broken links advertised on a live domain.

**What's needed:** Pick one strategy per surface. Different choices for `/investor` vs `/app` are fine.

### Options for `/investor` (Tier 4 — Investor Demo)

- **A) Build a minimum-viable investor surface (2-3 days):** thesis + 1-line traction + team headshots + contact button. Real Tier 4 surface.
- **B) 302-redirect to `/live-demo?from=investor` (under 1 hour):** interim until Strategy A ships. The `from` param lets the live-demo surface optionally render a tweaked variant for investor traffic.
- **C) Remove all references to `/investor` from home / nav / footer (under 1 hour):** let the soft-404 stand but ensure no one is told it exists. Cleanest interim.

**Recommendation:** **B + a 1-day Strategy A in parallel.** Ship the redirect today (under 1 hour) so direct hits don't soft-404. Build the real investor surface within the week — even a 1-page surface is enough for Tier 4 readiness, and it's a high-leverage artifact for the buyer-review cycle.

### Options for `/app` (Tier 1 — Live App)

- **A) Build the auth-gated app shell (1-2 days):** even a "Sign in to see your dashboard" gate beats a 404. Routes to `/sign-in` if not authenticated.
- **B) 302-redirect to `/live-demo?from=app`:** sandbox-as-substitute until the real app ships.
- **C) Remove all `/app` references:** if the SAIGE product isn't yet ready for real usage, don't advertise the surface.

**Recommendation:** **A** if the auth flow has any usable shell already; otherwise **C** until the app is genuinely ready. Strategy B is ok but reads "we're hiding the empty room" if a buyer notices.

---

## Decision 2 — Replace the `[PENDING]` placeholder strings on home (gates P0-001 in BASE44_FIX_QUEUE.md)

**What was found:** Home page renders literal "[ENTERPRISE PARTNER LOGO PENDING]" and "[ENTERPRISE TESTIMONIAL PENDING]" strings.

**What's needed:** Pick what fills the slots.

### Options

- **A) Real partner logos + 2 attributed testimonials:** if any exist with permission. Highest credibility.
- **B) "References available under NDA" + "Why we built this" methodology quote:** trust-equivalent fallback that doesn't read as placeholder.
- **C) Remove the slots entirely:** if the design holds up without them.

**Recommendation:** **B for now, A within 2 weeks.** Strategy B is shippable today. Strategy A requires testimonial sourcing — start the outreach this week, swap in once permissions land.

**Sub-decision:** for Strategy A, which 2-3 partners / customers does SAIGE have permission to name? Bucknell already cited as a methodology reference; is there a direct platform-use customer to quote alongside?

---

## Decision 3 — EIP methodology document (gates P1-003 in BASE44_FIX_QUEUE.md)

**What was found:** EIP scores rendered without methodology link or scale explanation. Hallucination-risk perception is non-trivial — buyers can't distinguish a real model from an LLM estimate.

**What's needed:** Confirm the EIP methodology document is publishable.

### Options

- **A) Methodology paper exists and can be published:** Base44 wires the explainer + link, points to the existing doc.
- **B) Methodology paper exists but is gated:** Base44 wires the explainer + a "Request methodology" form that captures the request via `/api/leads/capture` with `metadata: { request: 'methodology' }`.
- **C) Methodology paper doesn't yet exist as a public artifact:** ship a 1-pager that covers scale + frameworks + inputs at minimum. Effort: 1-2 days of Victor's writing.

**Recommendation:** **C with B as the path-forward.** Even a 1-page methodology summary published today eliminates the hallucination-risk perception. The full paper can stay gated and be requested through the demo form.

---

## Decision 4 — Cost / confidence claims substantiation (gates P1-002 in EXECUTIVE_SUMMARY top issues, also B44 work)

**What was found:** Claims on home: "Cut ESG reporting cost by 60%", "Raise audit confidence by 100%". Footnoted only as "based on EIP methodology benchmarks" — no linked source.

**What's needed:** Either ground the claims with a verifiable source, soften them, or remove.

### Options

- **A) Link to a methodology excerpt or pilot outcome:** if a real pilot generated these numbers, surface the source. Most credible.
- **B) Reframe as projections:** "Designed to cut ESG reporting cost by up to 60%" or "Targeting a 100% lift in audit confidence vs current baseline." Honest forward-looking framing.
- **C) Remove the specific percentages, replace with qualitative claims:** "Materially cut ESG reporting cost; meaningfully raise audit confidence." Loses punch but eliminates the "show me the source" diligence question.

**Recommendation:** **B** unless real pilot data exists. A specific number with no source on a compliance product is a procurement red flag. Forward-looking framing keeps the claim's strategic intent without inviting a source-citation drill.

---

## Decision 5 — Customer testimonials sourcing (gates P2-001 in BASE44_FIX_QUEUE.md)

**What was found:** Single testimonial framed as "SAIGE-style methodology" endorsement (Bucknell), not direct platform use.

**What's needed:** Are there 2+ named, attributed platform-use testimonials available?

### Options

- **A) Yes, 2+ available now with permission:** Base44 ships them in a customer-testimonials section.
- **B) Outreach in progress, expect 1-2 within 1-2 weeks:** ship with the Bucknell quote demoted to "Methodology endorsements" + a separate empty-but-labelled "Customer testimonials — coming Q3 2025" section. (Option C from Decision 2 partially overlaps.)
- **C) Not yet — no platform-use customers to quote:** acknowledge the pre-launch state. Either keep just the methodology endorsement (clearly labelled) or temporarily remove the testimonials slot entirely.

**Recommendation:** **B** if outreach is realistic this week; otherwise **C** with the slot temporarily removed. A blank "Customer testimonials" section reads as honest pre-launch; placeholder strings in that slot read as broken.

---

## Decision 6 — Buyer demo timing

**What was found:** Health score 47/100. Two of four tier surfaces soft-404. Placeholder strings on home.

**What's needed:** Ship the buyer demo this week as-is, after immediate fixes, or postpone?

### Options

- **A) Ship the demo as scheduled:** demo only `/` and `/live-demo`; never click `/investor` or `/app`. Hope the buyer doesn't manually try them. **Risk: high.**
- **B) Ship the demo this week AFTER the immediate fixes (Day 0 + Day 1 from BASE44_FIX_QUEUE.md):** placeholder strings gone; redirects in place; sandbox copy reframed. Effort: ~6 hours total. Health score moves to ~60.
- **C) Postpone the demo by 5-7 days:** Day 0 + 1 + 2-3 from both backlogs ship. Real `/investor` surface up. Methodology explainer in place. Heading hierarchy fixed. Health score moves to ~70-75.

**Recommendation:** **B for low-stakes buyer conversations, C for any institutional VC / enterprise-procurement diligence.** The placeholder strings are the credibility-killer regardless of conversation flow — even a casual buyer skim catches them. With ~6 hours of focused work the demo passes the "would I be embarrassed by this" test. Adding the additional 5-7 days takes it from passable to credible.

---

## Summary of decisions

| # | Decision | Recommendation | Time to act |
|---|---|---|---|
| 1 | `/investor` strategy | B + parallel A | <1h immediate, 2-3 days for A |
| 1b | `/app` strategy | A or C (depends on app readiness) | 1-2 days for A, <1h for C |
| 2 | `[PENDING]` placeholders | B now, A within 2 weeks | <1h immediate |
| 3 | EIP methodology doc | C (1-pager) with path to B | 1-2 days |
| 4 | Cost / confidence claims | B (forward-looking framing) | 30 min |
| 5 | Customer testimonials | B if outreach realistic, C if not | 1-2 weeks for B |
| 6 | Buyer demo timing | B for casual, C for VC / procurement | gates everything else |

**Fastest path to a credible buyer-ready SAIGE:** make decisions 1-5 in 15 minutes; dispatch Code + Base44 backlogs; demo on Day 6-7 instead of this week. Total Victor time: ~30 minutes upfront + decision-gated reviews.
