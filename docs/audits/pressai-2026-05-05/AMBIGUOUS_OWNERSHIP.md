# PressAI Fix Sprint — Ambiguous Ownership

This file captures the ownership-call reasoning for issues that could plausibly be assigned to either Code or Base44. The sprint defaulted to Code if the issue touches `/api` or routing, and to Base44 if it's surface-level.

---

## P0-001 — `/sign-up` route returns 404

**Could be Code (route definition + redirect handling) OR Base44 (page component).**

- **Code aspect:** Whether `/sign-up` returns 200 vs 404 is determined by whether the SPA's catch-all rewrite is in place AND whether a backend handler exists for the form submission.
- **Base44 aspect:** The actual `/sign-up` page component (form fields, layout, validation feedback) lives in PressAI's `/src/pages` (Base44 territory).

**Resolution:** **SHARED**. Code built the `/api/auth/sign-up` backend (the wire); Base44 must ship the page component + form. Tracked as a SHARED entry in [`CODE_FIX_REPORT.md`](CODE_FIX_REPORT.md) with both halves listed.

**Why not pure Code:** the 404 itself is fixed at the routing level (vercel.json or equivalent), but vercel.json doesn't exist in PressAI's repo (its routing is determined by Base44's framework). Even if Code added a vercel.json rewrite to FlowAI's repo, it wouldn't apply to ourpublishingai.com. So the route fix is Base44.

**Why not pure Base44:** without a backend endpoint to POST to, the form Base44 ships would have nowhere to send credentials. Code owns the endpoint.

---

## P0-002 — `/sign-in` renders the marketing landing instead of a login form

**Could be Code (route handler + redirect) OR Base44 (page component routing).**

Same reasoning as P0-001. The route currently resolves to the wrong component — that's a Base44-side router config issue. The login form's submission needs a backend — that's Code.

**Resolution:** **SHARED**. Tracked the same way.

---

## P0-003 — Hero email capture missing

**Could be Code (no endpoint exists to receive captures) OR Base44 (no form rendered in hero).**

- **Code aspect:** No backend endpoint accepts lead emails; even if Base44 shipped a form, there'd be nowhere to POST.
- **Base44 aspect:** The hero region currently has no inline form — that's a UI gap.

**Resolution:** **SHARED**. Code built `/api/leads/capture`; Base44 ships the form.

**Why not pure Code:** the gap is visible at the UI level — without the visible form, no submission ever happens.

**Why not pure Base44:** even if Base44 shipped the form, the action="" target wouldn't exist. Code provided the endpoint.

---

## P0-004 — Privacy policy timestamp is future-dated

**Could be Code (text content might be served from a CMS or DB) OR Base44 (text in component).**

- **Code aspect:** If the privacy policy were served from an `/api/privacy` endpoint (with text in a database), the date would live in the database row.
- **Base44 aspect:** Current capture suggests the text is hardcoded in a component or markdown file under `/src/pages` or similar.

**Resolution:** **BASE44**. Default-to-Base44 when the issue is surface-level text. The audit's Browserless capture rendered `/privacy` and the text appeared inline in the rendered DOM — no `/api/privacy` call observed. Most likely a string literal in a component.

**If wrong:** if PressAI's privacy is actually served from a CMS / DB, this would re-route to Code. Base44 will surface it during their fix attempt; we'd then move it.

---

## P0-005 — Hero trust block missing

**Could be Code (if testimonials live in a database with an `/api/testimonials` endpoint) OR Base44 (UI component + content).**

- **Code aspect:** If trust signals were dynamic (e.g., pulling testimonial JSON from a CMS), Code would need an endpoint to deliver them.
- **Base44 aspect:** The trust block doesn't exist at all today — this is a UI gap (component missing) + content gap (no testimonials sourced).

**Resolution:** **BASE44 + Decision**. The component itself is UI work; the content (which testimonials, which logos, which sourced stats) is Victor's decision. No Code-side dependency for V1 — the testimonials can ship as a static array in a TrustBlock component until they're numerous enough to warrant a backend.

**Future:** if PressAI ever needs dozens of dynamically-rotated testimonials, Code adds an `/api/testimonials/:product_id` endpoint and Base44 wires the component to it. Not in scope today.

---

## P1-001 — Hero CTA consolidation

**Pure Base44 (UI text + button removal).**

No backend dependency. **Resolution:** **BASE44 + Decision** (Victor picks the dominant CTA copy).

---

## P1-002 — Workflow taglines

**Pure Base44 (copy strings in a component).**

Same as P1-001. **Resolution:** **BASE44 + Decision** (Victor approves the drafted batch).

---

## P1-003 — Stat badge sourcing

**Could be Code (a `/methodology` endpoint or footnote API) OR Base44 (tooltip text + content).**

- **Code aspect:** "9 AI Workflows" could link to a `/workflows` page that's content-only OR pulls from a workflows-list endpoint.
- **Base44 aspect:** The tooltip text + the link itself + the stat values are component-level.

**Resolution:** **BASE44 + Decision**. Same reasoning as P0-005 — the per-stat decision (substantiate vs replace) is Victor's; the implementation is component text + link wiring. If a `/workflows` page is added with detailed methodology, that's an additional content page (Base44).

---

## P1-004 — GDPR rights-request form

**Could be Code (the rights-request endpoint) OR Base44 (the inline form).**

Same shape as P0-003.

**Resolution:** **SHARED**. Code built `/api/compliance/rights-request`; Base44 ships the form on `/privacy`.

---

## P1-005 — SOC 2 / ISO 27001 references

**Pure Base44 (copy + image).**

Compliance certifications are referenced in policy text + image badges. No backend dependency.

**Resolution:** **BASE44 + Decision** (Victor confirms actual compliance status).

---

## Summary

Of 10 P0+P1 issues:

| Decision | Count | Issues |
|---|---|---|
| **SHARED** (Code + Base44) | **4** | P0-001, P0-002, P0-003, P1-004 |
| **BASE44** (pure UI / copy) | **6** | P0-004, P0-005, P1-001, P1-002, P1-003, P1-005 |
| **CODE only** | **0** | (no issue's fix is purely backend with no UI dependency) |
| **AMBIGUOUS — unresolved** | **0** | All ambiguous issues had a reasoned default |

The pattern: every audit finding on a SaaS product touches the UI side at minimum (a real customer interacts with the UI, not the API). Code-only fixes appear when the audit specifically tests a backend endpoint in isolation (rare in customer-facing audits).

For the four SHARED issues, Code's contribution unblocks Base44 — they can now ship the UI knowing the wires exist.
