# PressAI — Claude Code Backlog (paste-ready)

Generated from FlowAI Super Customer Audit on 2026-05-05.
Each task is self-contained and ready to dispatch to Claude Code.

---

## P0-001 — Restore /sign-up route with working registration form

**Severity:** P0 (functional)
**Surface:** `https://ourpublishingai.com/sign-up`
**Estimated effort:** small (under 1 hour for an experienced engineer; 1 day with full QA)

### Task

> Fix the broken `/sign-up` route on PressAI. Currently the URL returns a 404 / no rendered form. Every "Get Started Free" CTA on the home and pricing pages routes here, so this is the primary conversion blocker.
>
> 1. Inspect the current routing to determine why `/sign-up` doesn't render.
> 2. Implement (or restore) a registration form component with these fields:
>    - Email (required, type=email, validated)
>    - Password (required, min 8 chars, with strength indicator)
>    - Confirm password (required, must match)
>    - Terms + privacy checkbox (required, links to /terms and /privacy)
>    - Submit button labeled "Create Account"
> 3. On submit, POST to the existing auth API endpoint (find it in the codebase). Surface validation errors inline.
> 4. Add a 301 redirect from `/signup` (no hyphen) to `/sign-up` to catch the alternate URL.
> 5. Add a "Already have an account? Sign in" link routing to `/sign-in`.
> 6. Test by clicking the "Get Started Free" CTA from the homepage; confirm it lands on a working form, not a 404.

### Acceptance criteria

- `/sign-up` returns 200 and renders the form on first paint
- Form posts to backend and returns either redirect-to-onboarding or inline validation error
- "Get Started Free" CTA from `/` reaches the form without intermediate 404

---

## P0-002 — Replace /sign-in marketing payload with authentication form

**Severity:** P0 (functional)
**Surface:** `https://ourpublishingai.com/sign-in`
**Estimated effort:** small (under 1 hour)

### Task

> The `/sign-in` route currently renders the same marketing landing page as `/`. Returning users hitting this URL (e.g., from password manager, browser autofill, or "Sign In" link) cannot log in.
>
> 1. Replace the route handler / page component to render an authentication form on first paint.
> 2. Form fields:
>    - Email (required, type=email)
>    - Password (required)
>    - "Sign in" submit button
>    - "Forgot password?" link routing to `/forgot-password` (verify exists; if not, leave a TODO)
>    - "Don't have an account? Sign up" link to `/sign-up`
>    - Optional: OAuth buttons (Google, Apple) if backend supports them
> 3. On submit, POST to existing auth endpoint. On success, redirect to dashboard. On failure, surface inline error.
> 4. Verify the route works for the password-manager autofill case (browser sees email/password fields and offers to fill).

### Acceptance criteria

- `/sign-in` renders a recognizable login form (not the marketing landing)
- Form is keyboard-navigable (Tab, Enter to submit)
- Successful login redirects; failed login surfaces error

---

## P0-003 — Add inline hero email capture as auth-funnel insurance

**Severity:** P0 (conversion)
**Surface:** `https://ourpublishingai.com` (also pricing)
**Estimated effort:** small (1-2 hours)

### Task

> Until the auth funnel is fully fixed (P0-001 and P0-002), every "Get Started Free" CTA on home and pricing is a blind redirect that may 404. Add an inline hero email-capture field as a fallback that captures lead intent server-side regardless.
>
> 1. Add an inline form to the hero section: single email field + "Notify Me" or "Get Early Access" submit.
> 2. POST to a new endpoint (or extend an existing one) that stores `{ email, source_page, captured_at, user_agent }`.
> 3. Show a confirmation message inline ("We'll email you within 24 hours").
> 4. Keep the "Get Started Free" CTA as well — but visually de-emphasize it as secondary until P0-001 / P0-002 land.
> 5. After P0-001 and P0-002 deploy, this inline email capture stays as a backup conversion path.

### Acceptance criteria

- Hero email capture is visible above the fold on home and pricing
- Submissions are stored server-side with timestamp + source page
- Confirmation feedback appears inline within 1 second of submit

---

## P0-004 — Correct future-dated privacy policy timestamp

**Severity:** P0 (trust)
**Surface:** `https://ourpublishingai.com/privacy`
**Estimated effort:** trivial (under 15 minutes)

### Task

> The privacy policy currently shows "Last updated: April 11, 2026" which is a future date. This reads as placeholder text and undermines policy credibility.
>
> 1. Replace with the actual current effective date (today, 2026-05-05, or whenever the policy was last reviewed).
> 2. Optionally add a separate "Effective date" field if the policy is scheduled to change.
> 3. Add a brief revision history section if you want to track changes.

### Acceptance criteria

- "Last updated" reflects a real date <= today
- Date is in ISO format or unambiguous long form ("May 5, 2026")

---

## P0-005 — Add hero-level trust block (testimonials + logos + sourced stats)

**Severity:** P0 (trust)
**Surface:** `https://ourpublishingai.com` and `/pricing`
**Estimated effort:** medium (1-2 days)

### Task

> Zero third-party social proof exists anywhere in the funnel. Page asks visitors to trust a "From Idea to Global Impact" promise and $29-$99/mo pricing with no validation. Add an above-the-fold trust block to home and pricing.
>
> 1. Build a reusable `<TrustBlock />` component with three sub-sections:
>    - **Logo bar:** 6-8 recognizable distribution partner logos (Amazon KDP, Apple Books, Ingram, Barnes & Noble, etc. — these are already cited as integrations on the page).
>    - **Testimonial cards:** 3 named author or publisher testimonials with headshot + name + title + organisation + quantified outcome (copies sold, time saved, revenue generated).
>    - **Sourced stat row:** Replace unsourced "9 AI Workflows / 50+ Distribution Channels / 100% AI-Powered Global Reach" badges with real stats that link to a methodology page or footnote.
> 2. Insert the component immediately after the hero, before the workflow grid.
> 3. Mobile-responsive: testimonials stack vertically below 768px.
> 4. If real testimonials don't exist yet: collect 2-3 from current users this week; commit the component and ship with placeholder + "More testimonials coming" badge.

### Acceptance criteria

- TrustBlock component is reusable and rolled into both home and pricing
- Logo bar renders 6+ partner logos
- 3 testimonials with full attribution (name, title, org, outcome)
- All stat claims have either a tooltip with source or a methodology link

---

## P1-001 — Consolidate hero CTAs (currently two near-identical)

**Severity:** P1 (conversion)
**Surface:** `https://ourpublishingai.com`
**Estimated effort:** trivial (under 15 minutes)

### Task

> Hero shows both "Get Started Free →" and "Start Publishing Free →" in the same viewport. Click intent is split between near-identical CTAs.
>
> 1. Pick the stronger phrasing ("Start Publishing Free" is more specific to the product).
> 2. Demote the other to a smaller secondary "Sign In" text link in the top nav (if not already there).
> 3. Keep one dominant primary CTA above the fold.

---

## P1-002 — Rewrite 9 workflow taglines as outcome-led copy

**Severity:** P1 (content)
**Surface:** `https://ourpublishingai.com`
**Estimated effort:** small (a few hours of copywriting)

### Task

> The 9 workflow taglines describe internal process ("Idea → Manuscript → Published & Selling") rather than outcomes. Rewrite each to lead with a measurable user outcome.
>
> Examples of better framing:
> - Before: "Scope → Governed Execution → Delivery"
> - After: "Turn a rough idea into a royalty-generating manuscript in under 30 days"
>
> - Before: "Idea → Manuscript → Published & Selling"
> - After: "Publish your first book on Amazon, Apple Books, and Ingram in 14 days"
>
> Aim for: outcome + timeline + concrete platform/market reference. Keep each tagline under 80 characters.

---

## P1-003 — Source or replace unsourced hero stat badges

**Severity:** P1 (trust)
**Surface:** `https://ourpublishingai.com/pricing`
**Estimated effort:** small (a few hours of stat verification + tooltip wiring)

### Task

> "9 AI Workflows", "50+ Distribution Channels", "100% AI-Powered Global Reach" read as marketing assertions with no methodology.
>
> 1. For "9 AI Workflows": link to a `/workflows` page (or anchor) that lists each named workflow.
> 2. For "50+ Distribution Channels": tooltip listing the actual platforms (Amazon KDP, Apple Books, Ingram, Barnes & Noble, Kobo, Google Play Books, Smashwords, Draft2Digital, etc.). Replace round number with exact count.
> 3. Replace "100% AI-Powered Global Reach" with concrete claim like "Publish to 50+ platforms across 195 countries". Vague claims hurt trust more than they help.

---

## P1-004 — Embed self-serve GDPR/CCPA rights-request form

**Severity:** P1 (compliance)
**Surface:** `https://ourpublishingai.com/privacy`
**Estimated effort:** small (a few hours)

### Task

> Privacy Section 5 forces users to email `privacy@ourpublishingai.com` to exercise GDPR/CCPA rights. The policy claims rights are "easily exercisable" but the email-only path violates GDPR's "without undue delay" + "easy means" expectations.
>
> 1. Add an inline form near the rights section: name, email, request type dropdown (Access, Deletion, Correction, Portability, Object to processing), free-text details.
> 2. POST to a backend endpoint that creates a tracked request and emails the privacy team.
> 3. Show inline confirmation with an estimated response time ("We'll respond within 30 days").
> 4. Send the user an auto-confirmation email with a request reference number.

---

## P1-005 — Add SOC 2 / ISO 27001 references (or "in progress" status)

**Severity:** P1 (trust)
**Surface:** `https://ourpublishingai.com/privacy`
**Estimated effort:** trivial-small (15 min if statuses known; a day if formalising compliance work)

### Task

> Privacy Section 2 names encryption standards (TLS 1.3, AES-256) but has no third-party audits or certifications. Enterprise evaluators need verifiable compliance signals.
>
> 1. If audited: add SOC 2 Type II / ISO 27001 logos with link to the report (gated by NDA if needed).
> 2. If not audited: add an "Compliance roadmap" section listing target frameworks and target dates.
> 3. Even "SOC 2 audit in progress (target Q3 2026)" beats silence.

---

## Suggested execution order

**Day 1:** P0-001 + P0-002 + P0-004 (auth funnel + privacy timestamp). 1.5 days.
**Day 2-3:** P0-005 (trust block — biggest qualitative lift). 2 days.
**Day 3-4:** P0-003 (hero email capture). Half a day. Plus P1-001 (CTA consolidation, trivial). Plus P1-002 (workflow taglines). Half a day.
**Day 4-5:** P1-003 (stat sourcing) + P1-004 (rights form) + P1-005 (compliance refs). 1.5 days.

After this sprint, re-run the Super Customer audit:

```bash
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{"url":"https://ourpublishingai.com","product_id":"pressai","depth":"quick","max_page_count":5}'
```

The diff between this audit and the next will tell us which fixes landed cleanly. Target health score after sprint: **75+**.
