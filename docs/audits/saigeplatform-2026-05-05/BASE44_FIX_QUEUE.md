# SAIGE saigeplatform.com — Base44 Fix Queue (UI-side, paste-ready)

Generated from the FlowAI Super Customer independent verification audit on 2026-05-05.
Source: [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md)

This file lists ONLY the issues with a Base44 / UI-side fix component. Routing / backend issues route to [`CLAUDE_CODE_BACKLOG.md`](CLAUDE_CODE_BACKLOG.md). Items needing Victor's input (real testimonials, claim-substantiation, etc.) live in [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md).

---

## Common context for SAIGE tasks

- **Live URL:** https://saigeplatform.com
- **Backend base URL:** https://flowai-dun.vercel.app/api
- **Product slug:** `"saige"`
- **Org id:** `"veu-ai-studio"` (header `x-flowai-org-id`)

All API responses include `x-flowai-request-id` header — log on UI side for support correlation.

---

## P0-001 — Remove `[ENTERPRISE PARTNER LOGO PENDING]` and `[ENTERPRISE TESTIMONIAL PENDING]` placeholder strings from home

**Severity:** P0 (trust)
**Surface:** `https://saigeplatform.com/`
**Estimated effort:** trivial (under 30 minutes)
**Decision-gated:** see [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) — Victor decides what fills the slots

### Task

> The home page currently renders literal placeholder strings: "[ENTERPRISE PARTNER LOGO PENDING]" and "[ENTERPRISE TESTIMONIAL PENDING]". Production pages with `[PENDING]` strings broadcast pre-launch state to any buyer doing diligence — this is the single most damaging surface signal for an investor or enterprise procurement review.
>
> Pick one based on Victor's decision:
>
> **Option A — Real content:** replace with actual partner logos + 1-2 attributed testimonials (Bucknell already cited as a methodology reference; if SAIGE has a direct platform-use testimonial, surface it).
>
> **Option B — Trust-equivalent fallback:** replace with a single line that doesn't read as placeholder:
> - For the partner-logo slot: "References available under NDA" + a "Request references" button linking to the contact form.
> - For the testimonial slot: a quoted line from the EIP methodology paper (with attribution to the methodology author) framed as "Why we built this" rather than as a customer quote.
>
> **Option C — Remove the slots entirely:** if the design doesn't fall apart without them, just delete the placeholder elements. Cleaner than fake content.

### Acceptance criteria

- Zero `[PENDING]`, `[TBD]`, `[XXX]`, or other placeholder strings in any rendered page on saigeplatform.com.
- A `grep -r '\[PENDING\]\|\[TBD\]\|\[XXX\]' src/` (in SAIGE's repo) returns zero matches.

---

## P0-002 — Embed inline 3-field form under home hero "Request Demo" CTA

**Severity:** P0 (conversion)
**Surface:** `https://saigeplatform.com/`
**Estimated effort:** small (1-2 hours)
**Wires to:** existing `/api/leads/capture` endpoint (already shipped in commit `b176518`)

### Task

> The home hero has a "Request Demo" CTA but no inline form — clicking the CTA routes the visitor away from the page. Hesitating visitors leak. Embed an inline 3-field form directly under the hero so intent is captured at peak attention.
>
> ```tsx
> // Form fields
> name           (type=text, required, autocomplete="name")
> workEmail      (type=email, required, autocomplete="email")
> company        (type=text, required, autocomplete="organization")
>                "Request Demo" submit button
>
> async function onSubmit(values) {
>   const res = await fetch('https://flowai-dun.vercel.app/api/leads/capture', {
>     method: 'POST',
>     headers: { 'Content-Type': 'application/json', 'x-flowai-org-id': 'veu-ai-studio' },
>     body: JSON.stringify({
>       email: values.workEmail,
>       product_id: 'saige',
>       source_page: '/',
>       metadata: {
>         form: 'home_hero_demo_request',
>         name: values.name,
>         company: values.company,
>         campaign: getQueryParam('utm_campaign') || null,
>         source: getQueryParam('utm_source') || null,
>       },
>     }),
>   });
>   const data = await res.json();
>
>   if (res.status === 201 && data.ok) {
>     setState('success');                      // Show: data.message
>   } else if (res.status === 429) {
>     setState('rate_limited');
>   } else {
>     setState('error');
>     setError('form', data.error || 'Submission failed. Please email hello@saige.ai.');
>   }
> }
> ```
>
> Keep the larger "Book Enterprise Demo" CTA visible nearby for visitors who want a sales conversation rather than the self-serve form.

### Acceptance criteria

- Inline form visible above the fold on home (1280px desktop) and within the first viewport on mobile (375px).
- Submission stores a lead via `/api/leads/capture` — verifiable via the audit-log endpoint.
- Confirmation feedback appears inline within 1 second of submit.

---

## P1-001 — Reframe sandbox warning banner on `/live-demo`

**Severity:** P1 (trust / conversion)
**Surface:** `https://saigeplatform.com/live-demo`
**Estimated effort:** trivial (30 minutes)

### Task

> The `/live-demo` page currently leads with a warning banner using risk-language ("do not enter real organizational data"). At the conversion moment, this primes distrust — the visitor reads "this might compromise my data" rather than "this is a safe sandbox to explore."
>
> Reframe as positive sandbox assurance and demote the caveat to a tooltip:
>
> **Before:** "⚠️ Sandbox Environment — Do not enter real organizational data."
>
> **After:**
> - Top of page: "🧪 Sandbox Environment — Three pre-loaded sample organisations. Try them, tweak inputs, see the EIP score change in real time."
> - Below the title: an "ⓘ Why is this a sandbox?" tooltip / disclosure containing: "We don't process or store the data you enter here. To run analysis on your real organisation, request a private environment via Book Enterprise Demo."

### Acceptance criteria

- No risk-language as the dominant top-of-page message on `/live-demo`.
- Sandbox explanation accessible but secondary.

---

## P1-002 — Promote "Book Enterprise Demo" to sticky CTA on `/live-demo`

**Severity:** P1 (conversion)
**Surface:** `https://saigeplatform.com/live-demo`
**Estimated effort:** trivial (30-60 minutes)

### Task

> "Book Enterprise Demo" is the highest-value action on the live-demo page — it converts a sandbox-explorer into a sales conversation. It currently sits as a peer to "Run Sample Analysis" buttons.
>
> 1. Add a sticky-position CTA in the top-right of the page (or sticky bottom-bar on mobile) titled "Book Enterprise Demo →"
> 2. Add a value qualifier microcopy line beneath: "Private environment · Dedicated CSM · Full data integration"
> 3. Make the sticky CTA visually distinct (high-contrast accent colour) so it's the obvious enterprise path while the visitor explores the sandbox.

### Acceptance criteria

- "Book Enterprise Demo" persists in viewport throughout `/live-demo` scroll on both desktop and mobile.
- Visually distinct from sandbox/exploration buttons.

---

## P1-003 — Add inline EIP methodology explainer on every score surface

**Severity:** P1 (ai-quality / trust)
**Surface:** `https://saigeplatform.com/live-demo` (and any other score surface)
**Estimated effort:** small (1-2 hours)

### Task

> EIP scores (64-78 on the live-demo cards) are shown without a scale, methodology link, or interpretation guide. A buyer cannot distinguish a deterministic scoring model from an LLM-generated estimate. **Hallucination risk perception is non-trivial** until methodology is visibly grounded.
>
> 1. Beside every EIP score, add a tooltip or inline explainer:
>    ```
>    EIP — Environmental Impact Performance
>    Scale: 0-100 (higher is better)
>    Frameworks aligned: GRI · TCFD · STARS · CSRD · UN SDGs
>    [Read the methodology →]
>    ```
> 2. The "[Read the methodology →]" link points to the existing `/methodology` page (or wherever the EIP methodology document lives). Verify that destination exists and is publishable; if it doesn't, **block this task and escalate to Victor — see VICTOR_DECISIONS_NEEDED.md**.
> 3. Apply consistently to every page that surfaces an EIP score (live-demo cards, any future investor / app surfaces).

### Acceptance criteria

- Every EIP score on every page has the explainer tooltip or inline component.
- The methodology link resolves to a 200 page with a real methodology document (not a placeholder).

---

## P1-004 — Fix heading hierarchy on home (h1 → h3 → h2 jump)

**Severity:** P1 (accessibility — WCAG 1.3.1 violation)
**Surface:** `https://saigeplatform.com/`
**Estimated effort:** trivial (under 1 hour)

### Task

> The home page DOM has heading hierarchy out of sequence: h1 followed by an h3 followed by an h2. WCAG 1.3.1 (Info and Relationships) requires sequential heading structure. Screen readers navigate by heading; skipped levels create a confusing landmark structure. Sustainability buyers care about social-pillar reporting — accessibility violations on a sustainability product self-undermine.
>
> 1. Audit the home page DOM. Identify every heading element.
> 2. Restructure so the order is h1 → h2 → h3 (no skips).
> 3. Where the visual layout makes h2 inappropriate (e.g., inline subtitle), use a styled `<p class="subtitle">` rather than misusing heading levels.

### Acceptance criteria

- WAVE / axe-core scan passes WCAG 1.3.1 for headings on home.
- Manual DOM inspection: every h3 follows at least one h2 in document order.

---

## P1-005 — Add aria-labels to emoji icons on `/live-demo` org-type cards

**Severity:** P1 (accessibility — WCAG 4.1.2)
**Surface:** `https://saigeplatform.com/live-demo`
**Estimated effort:** trivial (15 minutes)

### Task

> The org-type cards on `/live-demo` use emoji-only icons (🏫 🏛️ 🏢 etc.) with no aria-labels. Screen readers either skip them or produce inconsistent output. Same WCAG concern as P1-004 above on a sustainability product.
>
> ```html
> <!-- Before -->
> <span>🏫</span>
>
> <!-- After -->
> <span aria-label="School / Education organisation type" role="img">🏫</span>
> ```
>
> Apply to every emoji-as-functional-icon throughout the demo widget.

### Acceptance criteria

- Every functional emoji on `/live-demo` carries an aria-label.
- Screen reader announces meaningful labels when navigating the demo cards.

---

## P2-001 — Replace single Bucknell methodology testimonial with platform-use testimonials

**Severity:** P2 (trust)
**Surface:** `https://saigeplatform.com/`
**Estimated effort:** small (UI: 30 min once content is sourced; gated by Victor's decision on which testimonials to use)
**Decision-gated:** see VICTOR_DECISIONS_NEEDED.md

### Task

> The single testimonial currently on home is framed as "SAIGE-style methodology" rather than direct platform use. It reads as "we like the approach" rather than "we use this product." For an enterprise B2B sale, that's a meaningful credibility gap.
>
> Either:
> - Source 2 named, attributed testimonials from organisations actually using SAIGE (with permission to quote with name + title + org + quantified outcome), OR
> - Demote the Bucknell quote to a "Methodology endorsements" section and add a separate "Customer testimonials" section that's empty until 2+ real customer quotes are available.

### Acceptance criteria

- Either 2+ named platform-use testimonials are visible on home, or the methodology endorsement is clearly labelled as such (not as a customer testimonial).

---

## Suggested execution order (UI side)

**Day 0 (immediate, before buyer demo):**
- P0-001 — remove `[PENDING]` placeholder strings (replace per Victor's choice). 30 min.
- P1-001 — reframe sandbox warning. 30 min.
- P1-005 — add emoji aria-labels. 15 min.

**Day 1:**
- P0-002 — embed inline form under home hero (wires to existing `/api/leads/capture`). 2 hours.
- P1-002 — sticky "Book Enterprise Demo" CTA on /live-demo. 1 hour.
- P1-004 — fix heading hierarchy on home. 1 hour.

**Day 2-3:**
- P1-003 — EIP methodology explainer (gated by methodology doc existing — see VICTOR_DECISIONS_NEEDED.md).

**Day 3-5:**
- P2-001 — testimonial sourcing + replacement (gated by Victor sourcing real customer quotes).

After this sprint, re-run the audit per the schedule in CLAUDE_CODE_BACKLOG.md.
