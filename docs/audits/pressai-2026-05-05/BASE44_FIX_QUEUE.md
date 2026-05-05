# PressAI — Base44 Fix Queue

**Date:** 2026-05-05
**Source:** [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) · [`CODE_FIX_REPORT.md`](CODE_FIX_REPORT.md)
**Audience:** Base44 UI team. These are paste-ready task descriptions covering the UI / copy / layout half of the audit findings. Code-side backends already shipped (see CODE_FIX_REPORT.md commit `b176518`).

---

## Common context for all PressAI tasks

- **Live URL:** https://ourpublishingai.com
- **Backend base URL:** https://flowai-dun.vercel.app/api
- **Product slug to pass on every API call:** `"pressai"`
- **Org id to pass:** `"veu-ai-studio"` (header `x-flowai-org-id` — backend defaults to this if header omitted; explicit is better)
- **Multi-tenancy:** every backend call is scoped by `(org_id, product_id)` — same shape will work for SAIGE / MyBirthSafe later

All API responses include `x-flowai-request-id` header — log it on the UI side for support correlation.

---

## SHARED issues — UI work that wires to a Code-side backend

### P0-001 — Restore `/sign-up` route with working registration form

**Surface:** `/sign-up`
**What was found:** Route returns 404. Every "Get Started Free" CTA on home and pricing routes here.
**Estimated effort:** small (UI: 1-2 hours)

**UI deliverable:**

Build `/sign-up` page component with this form:

```tsx
// Fields
email          (type=email, required, validated)
password       (type=password, required, min 8 chars, with strength indicator)
confirmPassword (type=password, required, must match password)
acceptTerms    (type=checkbox, required, links to /privacy and /terms)

// Submit handler
async function onSubmit(values) {
  const res = await fetch('https://flowai-dun.vercel.app/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flowai-org-id': 'veu-ai-studio' },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      product_id: 'pressai',
      metadata: { source: 'pressai_signup_page' }
    }),
  });
  const data = await res.json();

  if (res.status === 201 && data.ok) {
    // Save session token securely (httpOnly cookie via your existing pattern)
    // OR localStorage if that's the existing convention
    localStorage.setItem('pressai_session_token', data.session.token);
    router.push('/onboarding');                // or wherever the post-signup flow goes
  } else if (res.status === 409) {
    setError('email', 'An account with this email already exists. Try signing in?');
  } else if (res.status === 400) {
    setError('form', data.error);              // Validation error message
  } else if (res.status === 429) {
    setError('form', 'Too many attempts. Please retry in a minute.');
  } else {
    setError('form', 'Something went wrong. Please try again.');
  }
}
```

Add a 301 redirect from `/signup` (no hyphen) → `/sign-up` to catch the alternate URL.
Add a "Already have an account? [Sign in](/sign-in)" link below the form.

**Acceptance:** `/sign-up` returns 200 and renders the form on first paint. Submitting with valid credentials shows the new account in PressAI's auth state. "Get Started Free" CTA from `/` reaches the form without 404.

---

### P0-002 — Replace `/sign-in` marketing payload with authentication form

**Surface:** `/sign-in`
**What was found:** Currently renders the same marketing landing as `/`. Returning users hitting this URL (from password manager, "Sign In" link) cannot log in.
**Estimated effort:** small (UI: 1 hour)

**UI deliverable:**

Replace the `/sign-in` route component with this form:

```tsx
email      (type=email, required)
password   (type=password, required)
rememberMe (type=checkbox, optional)

async function onSubmit(values) {
  const res = await fetch('https://flowai-dun.vercel.app/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flowai-org-id': 'veu-ai-studio' },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      product_id: 'pressai',
    }),
  });
  const data = await res.json();

  if (res.status === 200 && data.ok) {
    localStorage.setItem('pressai_session_token', data.session.token);
    router.push('/dashboard');
  } else if (res.status === 401) {
    setError('form', 'Invalid email or password.');   // Don't disclose which
  } else if (res.status === 429) {
    setError('form', 'Too many sign-in attempts. Please retry in a minute.');
  } else if (res.status === 400) {
    setError('form', data.error);
  } else {
    setError('form', 'Something went wrong. Please try again.');
  }
}
```

Add:
- "[Forgot password?](/forgot-password)" link (if `/forgot-password` doesn't exist, leave a TODO — out of scope here)
- "Don't have an account? [Sign up](/sign-up)" link
- Optional OAuth buttons (Google, Apple) if backend supports them — out of scope for V1 here

Verify the form is recognized by browser password managers (`<input type="email">` + `<input type="password">` + `<form>` wrapper, with `autocomplete="email"` and `autocomplete="current-password"`).

**Acceptance:** `/sign-in` renders a recognizable login form on first paint. Submitting valid credentials redirects to `/dashboard`. Invalid credentials surface a uniform error (not "user not found" — that's an info leak).

---

### P0-003 — Add inline hero email capture (auth-funnel insurance)

**Surface:** `/` (home) and `/pricing`
**What was found:** Every "Get Started Free" CTA blind-redirects off-page. Hesitating visitors leave zero retargetable signal. Until `/sign-up` is fixed, this is also the only path that's guaranteed to work.
**Estimated effort:** small (UI: 1-2 hours)

**UI deliverable:**

Add an inline form to the hero on `/` and `/pricing`:

```tsx
// Single field + submit
email          (type=email, required, autocomplete="email")
              "Notify Me" or "Get Early Access" submit button

async function onSubmit(values) {
  const res = await fetch('https://flowai-dun.vercel.app/api/leads/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flowai-org-id': 'veu-ai-studio' },
    body: JSON.stringify({
      email: values.email,
      product_id: 'pressai',
      source_page: window.location.pathname,
      metadata: { campaign: getQueryParam('utm_campaign'), source: getQueryParam('utm_source') }
    }),
  });
  const data = await res.json();

  if (res.status === 201 && data.ok) {
    setState('success');                       // Show: data.message ("You're on the list. We'll email confirmation within 24 hours.")
  } else if (res.status === 429) {
    setState('rate_limited');
  } else if (res.status === 400) {
    setError('email', data.error);
  } else {
    setState('error');
  }
}
```

Visually demote the existing "Get Started Free" CTA to secondary while `/sign-up` is being fixed. After P0-001 and P0-002 deploy, this inline capture stays as a backup conversion path.

**Acceptance:** Hero email capture is visible above the fold on both `/` and `/pricing`. Submissions are stored server-side (verifiable via `GET /api/leads/capture` with admin key). Confirmation feedback appears inline within 1 second of submit.

---

### P1-004 — Embed self-serve GDPR/CCPA rights-request form

**Surface:** `/privacy`
**What was found:** Privacy Section 5 forces users to email `privacy@ourpublishingai.com` to exercise GDPR/CCPA rights. Violates GDPR's "easy means" expectation.
**Estimated effort:** small (UI: 2-3 hours)

**UI deliverable:**

Add an inline form on `/privacy` (typically in the "Your Rights" section):

```tsx
name           (type=text, required)
email          (type=email, required, autocomplete="email")
country        (type=select, ISO-3166 alpha-2, optional)
requestType    (type=radio or select, required)
                 options: 'access' | 'deletion' | 'correction' |
                          'portability' | 'objection' | 'restriction'
                 with friendly labels:
                   "Access my data" / "Delete my data" / "Correct my data" /
                   "Export my data" / "Object to processing" / "Restrict processing"
details        (type=textarea, optional, max 4000 chars)

async function onSubmit(values) {
  const res = await fetch('https://flowai-dun.vercel.app/api/compliance/rights-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flowai-org-id': 'veu-ai-studio' },
    body: JSON.stringify({
      email: values.email,
      product_id: 'pressai',
      request_type: values.requestType,
      details: values.details,
      country: values.country,
    }),
  });
  const data = await res.json();

  if (res.status === 201 && data.ok) {
    showSuccess({
      title: 'Request received',
      body: data.message,                      // Includes reference + 30-day due date
      reference: data.reference,
    });
  } else if (res.status === 429) {
    setError('form', 'Too many requests from this IP. Please contact privacy@ourpublishingai.com directly if urgent.');
  } else {
    setError('form', data.error || 'Submission failed. Please email privacy@ourpublishingai.com.');
  }
}
```

After successful submission, surface the human-readable reference (`RR-XXXXXX-XX`) + the 30-day due date. The user should be able to screenshot or save this for their records.

**Acceptance:** Form appears in the "Your Rights" section of `/privacy`. Submitting a deletion request returns a reference number within 1 second. Reference is visibly displayed in the success state.

---

## PURE BASE44 issues — no Code-side dependency

### P0-004 — Correct future-dated privacy policy timestamp

**Surface:** `/privacy`
**What was found:** Privacy policy reads "Last updated: April 11, 2026" — a future date. Reads as placeholder text and undermines policy credibility.
**Estimated effort:** trivial (under 5 minutes)

**Deliverable:**

Open the privacy policy component. Change "Last updated: April 11, 2026" to today's actual date or whenever the policy was last legitimately reviewed. If the policy is scheduled to change, add a separate "Effective date" field rather than backdating "Last updated."

Recommended format: ISO long form ("May 5, 2026") or unambiguous date.

**Acceptance:** Timestamp reflects a real date <= today. No "Last updated" text in the future tense.

---

### P0-005 — Add hero-level trust block (testimonials + logos + sourced stats)

**Surface:** `/` and `/pricing`
**What was found:** Zero third-party social proof. Page asks visitors to trust a "From Idea to Global Impact" promise + $29-$99/mo pricing with no validation.
**Estimated effort:** medium (UI: 1-2 days; depends on Victor's content decisions)
**Decision-gated:** see [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) → Decision 1 (testimonials), Decision 2 (logos), Decision 3 (stats)

**Deliverable (once decisions are made):**

Build a reusable `<TrustBlock />` component:

1. **Logo bar** — 6-8 verified-live partner logos. Decision needed: which integrations are demonstrably live vs aspirational?
2. **Testimonial cards** — 3 named author or publisher testimonials with headshot + name + title + organisation + quantified outcome. Decision needed: which 3 testimonials to use?
3. **Sourced stat row** — replace the 3 unsourced hero badges. Decision needed per stat (see VICTOR_DECISIONS_NEEDED.md → P1-003).

Insert the component immediately after the hero, before the workflow grid. Mobile-responsive: testimonials stack vertically below 768px.

**Acceptance:** TrustBlock component is reusable, rolled into both `/` and `/pricing`. All testimonials carry full attribution. All stat claims have a tooltip with source or methodology link.

---

### P1-001 — Consolidate hero CTAs (currently two near-identical)

**Surface:** `/`
**What was found:** Hero shows both "Get Started Free →" and "Start Publishing Free →" in the same viewport. Click intent is split.
**Estimated effort:** trivial (15 minutes)
**Decision-gated:** see VICTOR_DECISIONS_NEEDED.md → P1-001 (recommendation: "Start Publishing Free")

**Deliverable (once Victor confirms which CTA wins):**

- Pick the chosen CTA copy.
- Demote the other to a small "Sign In" text link in the top nav.
- Keep one dominant primary CTA above the fold.

---

### P1-002 — Rewrite 9 workflow taglines as outcome-led copy

**Surface:** `/` (workflow grid section)
**What was found:** All 9 taglines describe internal process ("Idea → Manuscript → Published & Selling") rather than user outcomes.
**Estimated effort:** small (1-2 hours, mostly content review)
**Decision-gated:** see VICTOR_DECISIONS_NEEDED.md → P1-002 (recommendation: approve Claude-drafted batch against the supplied template)

**Deliverable (once Victor approves the batch):**

Replace the 9 workflow tagline strings in the home component with the approved outcome-led versions. Sample drafts (Victor reviews + approves):

| Original | Drafted |
|---|---|
| "Scope → Governed Execution → Delivery" | "Turn a rough idea into a royalty-generating manuscript in under 30 days" |
| "Idea → Manuscript → Published & Selling" | "Publish your first book on Amazon, Apple Books, and Ingram in 14 days" |
| (etc. — full 9 in the decisions doc) | |

---

### P1-003 — Source or replace unsourced hero stat badges

**Surface:** `/pricing` (hero stat row)
**What was found:** "9 AI Workflows", "50+ Distribution Channels", "100% AI-Powered Global Reach" are unsourced.
**Estimated effort:** small (1 hour after Victor decides per-stat treatment)
**Decision-gated:** see VICTOR_DECISIONS_NEEDED.md → P1-003

**Deliverable (per Victor's per-stat decision):**

- "9 AI Workflows" — link to a `/workflows` page that lists each named workflow OR add a tooltip listing them.
- "50+ Distribution Channels" — replace with exact count + tooltip listing the actual platforms (Amazon KDP, Apple Books, Ingram, etc.).
- "100% AI-Powered Global Reach" — replace with concrete claim like "Publish to 50+ platforms across 195 countries".

---

### P1-005 — Add SOC 2 / ISO 27001 references (or "in progress" status)

**Surface:** `/privacy` (Section 2)
**What was found:** Section names encryption standards (TLS 1.3, AES-256) but lists no third-party audits. Enterprise evaluators screen this out.
**Estimated effort:** trivial-small (15 min if status is known; 1 day if formalising)
**Decision-gated:** see VICTOR_DECISIONS_NEEDED.md → P1-005 (recommendation: "SOC 2 readiness assessment scheduled Q3 2026" if nothing started)

**Deliverable (once Victor confirms compliance status):**

Add references in privacy Section 2:
- If audited: SOC 2 Type II / ISO 27001 logos + link to report (NDA-gated if needed)
- If in progress: "SOC 2 audit in progress (target Q3 2026)" or similar
- If not started: "Compliance roadmap" section listing target frameworks + target dates

---

## Suggested execution order (UI side)

**Day 1:** P0-001 + P0-002 + P0-004 (auth funnel + privacy timestamp). 1.5 days. Backend already shipped — UI just wires to existing endpoints.

**Day 2-3:** P0-005 (trust block) once Victor decides testimonials + logos + stats. 2 days.

**Day 3-4:** P0-003 (hero email capture). Half a day. Plus P1-001 (CTA consolidation, trivial). Plus P1-002 (workflow taglines if approved). Half a day.

**Day 4-5:** P1-003 (stat sourcing) + P1-004 (rights form, UI side) + P1-005 (compliance refs). 1.5 days.

**Total:** ~5 working days of UI work after Victor's decisions land.

After this sprint, run the re-audit per the schedule in [`CODE_FIX_REPORT.md`](CODE_FIX_REPORT.md).
