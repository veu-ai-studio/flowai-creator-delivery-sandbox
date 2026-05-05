# SAIGE — Claude Code Backlog (paste-ready)

Generated from FlowAI Super Customer Audit on 2026-05-05.
Source: `EXECUTIVE_SUMMARY.md` + raw captures in `raw-captures/`.
Each task is self-contained and ready to dispatch to Claude Code against the SAIGE codebase.

---

## P0-001 — Add cookie consent banner + publish real Privacy Policy and Terms

**Severity:** P0 (compliance)
**Surface:** `https://saigedemo.com`
**Estimated effort:** medium (1 day legal review + 2 hours implementation)

### Task

> SAIGE markets itself as a compliance / ESG platform but the marketing site has no GDPR/CCPA cookie consent banner and no Privacy Policy or Terms accessible from the footer or form fields. Capturing emails / org details on the early-access form without these in place is itself a regulatory exposure for SAIGE and an instant credibility flag for any sustainability-aware buyer.
>
> 1. **Privacy Policy:** publish a real policy at `/privacy` covering data collection (email, organisation name, role, IP, browser, cookies), purpose (early-access waitlist + product communication), retention, lawful basis (legitimate interest + consent), data subject rights, and data residency. If a template is needed, base on the iubenda or termly generators with SAIGE-specific edits.
> 2. **Terms of Service:** publish at `/terms` covering acceptable use of the demo widget, IP ownership, founding-member pricing terms, and disclaimer of liability for pre-launch state.
> 3. **Cookie consent banner:** install a consent-management platform (Cookiebot free tier, Iubenda, or roll your own with `js-cookie`) that blocks any analytics/tracking until the user accepts. Default to "essential cookies only" until consent.
> 4. Wire footer links to both pages. Add a privacy microcopy line below each form: "We'll only use this to contact you about SAIGE early access. Read our [Privacy Policy](/privacy)."

### Acceptance criteria

- `/privacy` and `/terms` return 200 and render real content (not Lorem ipsum)
- Cookie banner appears on first visit, blocks tracking until consent, persists choice
- Footer links to both pages
- Form fields have privacy microcopy adjacent to submit

---

## P0-002 — Fix footer copyright dated 2026

**Severity:** P0 (trust)
**Surface:** `https://saigedemo.com`
**Estimated effort:** trivial (under 5 minutes)

### Task

> The footer reads "© 2026" as the copyright year. Today's date is 2026-05-05 — but on a pre-launch site this can read as either an honest reflection of brand-launch year or a placeholder error depending on context. Either way, enterprise procurement teams will flag it.
>
> Pick one of:
> - Change to "© 2025" (most conservative, factually accurate as the founding/operating year if SAIGE was incorporated in 2025).
> - Reframe as "Founded 2024 · Platform launching 2026 · © VEU AI Studio" so the dates context-cue rather than read as errors.

### Acceptance criteria

- Footer copyright reflects an explicit, intentional date framing
- No bare "© 2026" if the platform isn't yet launched

---

## P0-003 — Address dead production domain reference (`SaigePlatform.com`)

**Severity:** P0 (trust)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (one of two paths)

### Task

> The page references `SaigePlatform.com` as the production domain in the footer / proprietary notice / "Full Platform (Coming Soon)" link. The domain is not currently serving a holding page; clicking through reads as vaporware to any diligence-stage VC.
>
> Pick one of:
>
> **Option A (preferred):** Stand up a one-page holding site at `SaigePlatform.com` that:
> - Renders the same logo + headline as saigedemo.com
> - States "Full SAIGE platform launching [concrete quarter]"
> - Provides one CTA back to `saigedemo.com` for the early-access form
> - 301-redirects all sub-routes to the demo site
>
> **Option B (faster):** Remove every reference to `SaigePlatform.com` from `saigedemo.com` and use `saigedemo.com` as the canonical brand URL for the duration of the pre-launch period.
>
> Verify by clicking every "Full Platform" / "Production" link on saigedemo.com and confirming each lands on a working page.

### Acceptance criteria

- No page on saigedemo.com links to a 404'd or unreachable destination
- Either `SaigePlatform.com` resolves to a real holding page OR all references to it are removed

---

## P0-004 — Consolidate the eight competing CTAs into one primary path

**Severity:** P0 (conversion)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (a few hours of design + content review)

### Task

> The landing page currently exposes eight CTAs in similar visual weight: "Join the Early Access List →", "Read the full White Paper →", "What does this demo show vs. the full platform?", "Request Early Access →", "Explore the Demo →", "LinkedIn Profile", "Send Message", "Full Platform (Coming Soon)". This splits click intent across paths the page didn't intend to optimize for.
>
> 1. Identify the **single primary action** for the page. Per the architecture summary, this is "Request Early Access" — the waitlist form.
> 2. Visually demote the others:
>    - White Paper, Explore Demo → secondary text links in a single "Resources" cluster.
>    - LinkedIn Profile, Send Message → footer-only.
>    - "Full Platform (Coming Soon)" → either remove or rephrase as a small announcement banner near the hero (not a CTA).
> 3. Keep the demo animation visible, but only one button next to the form: "Request Early Access".
> 4. Add a sticky-header CTA that mirrors the primary action and persists on scroll.

### Acceptance criteria

- Above-the-fold viewport contains exactly one primary CTA at any breakpoint
- Sticky header surfaces "Request Early Access" once the user scrolls past the hero
- All non-primary actions are visually de-emphasized but still discoverable

---

## P0-005 — Wire forms to a verified backend with success + error states

**Severity:** P0 (data)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (a few hours)

### Task

> Both forms on the page (Early Access registration and the contact "Send Message") have no observable success or error feedback. There is no confirmation that submissions actually post to a backend, get stored, and trigger an internal notification. On a pre-launch waitlist, silent lead loss is catastrophic.
>
> 1. Pick the backend: HubSpot (best for B2B + investor diligence), Mailchimp (cheapest), or a simple Supabase / Notion API endpoint. HubSpot recommended.
> 2. Wire each form to POST to the backend; await response.
> 3. On success: replace the form with a success state ("✓ You're on the list. We'll email confirmation within 24 hours.") + send an internal Slack / email notification.
> 4. On error: surface inline error message ("Something went wrong. Please email hello@saige.ai if this continues."). Don't silently fail.
> 5. Verify by submitting a synthetic test email through the form and confirming the entry lands in the backend.

### Acceptance criteria

- Form submission shows visible success or error state
- Backend stores the submission with timestamp + source page
- Internal notification fires (Slack webhook, email, etc.) on every submission

---

## P1-001 — Replace single anonymous testimonial with 2-3 attributed quotes

**Severity:** P1 (trust)
**Surface:** `https://saigedemo.com`
**Estimated effort:** medium (1-2 days for testimonial collection)

### Task

> The current page has one testimonial attributed only to "Sustainability Director, Manufacturing (Beta)". For enterprise B2B, one anonymous testimonial reads as either fictitious or insufficient.
>
> 1. Reach out to 3-5 beta participants. Get permission to quote with: name, title, organisation name (or anonymized sector + size if NDA), region, and a quantified outcome.
> 2. Format each as: "[2-line outcome quote] — [Name], [Title], [Organisation], [Region]"
> 3. Place 2-3 quotes between the live demo block and the value proposition section.
> 4. If real beta-customer quotes don't exist yet, replace the current single quote with: "Beta testing kicks off Q3 2025. Be among the first 50 organisations on the list to shape the platform." — i.e., absence is more honest than the current anonymous quote.

### Acceptance criteria

- Either 2-3 fully-attributed quotes appear in the trust section, or the current anonymous quote is removed and replaced with the explicit early-access framing

---

## P1-002 — Replace "Coming Soon" with a concrete launch timeline

**Severity:** P1 (content)
**Surface:** `https://saigedemo.com`
**Estimated effort:** trivial (15 minutes once the date is decided)

### Task

> The page currently uses "Coming Soon" without dates for the platform launch. Risk-averse enterprise buyers can't plan procurement cycles around "Coming Soon" — it forces them to put SAIGE on a deferred-evaluation pile.
>
> Pick a quarter and commit:
> - "Founding cohort onboarding Q3 2025" (most conservative, signals real but distant)
> - "Beta access Q1 2026 · GA Q3 2026" (broader timeline, reads as funded roadmap)
> - "Founding members onboarding October 2025" (specific, drives urgency)
>
> Whichever you pick, replace EVERY "Coming Soon" instance on the page with the concrete framing.

### Acceptance criteria

- Zero "Coming Soon" without a date qualifier on the page
- All timeline references match the same chosen framing

---

## P1-003 — Add About / Company block with entity + funding disclosure

**Severity:** P1 (trust)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (a few hours including legal review)

### Task

> The page surfaces the founder bio (Victor Udo, FNSE, PhD, 35+ years experience) but not the company entity, jurisdiction, funding stage, or team size. VC diligence requires this surface-level transparency or the founder profile alone reads as solo-founder + slide-deck rather than a real company.
>
> Add a brief "About SAIGE / VEU AI Studio" block:
> - Legal entity name (LLC, Ltd, Inc?)
> - Jurisdiction (Delaware? UK? Nigeria?)
> - Founded year
> - Funding stage if any (bootstrapped? pre-seed? grant?)
> - Team size (e.g., "Currently a 3-person founding team across Lagos and London")
> - Optionally: 2-3 advisors / institutional connections
>
> Place this block between the founder bio section and the early-access form.

### Acceptance criteria

- About block surfaces legal entity + jurisdiction + funding stage + team size
- Block is discoverable above the form

---

## P1-004 — Hyperlink the cited statistics to original sources

**Severity:** P1 (trust)
**Surface:** `https://saigedemo.com`
**Estimated effort:** trivial (15-30 minutes)

### Task

> The "Why SAIGE Matters" section cites four statistics (KPMG Global ESG Survey 2024, MIT Sloan 2024, Deloitte Insights 2024, Gartner 2024). The figures appear without hyperlinks. On a compliance/ESG product, uncited claims are an instant credibility flag — buyers expect linkable provenance.
>
> 1. For each statistic, find the original report URL.
> 2. Wrap the citation in a hyperlink: "(KPMG Global ESG Survey 2024)" → linked anchor.
> 3. Open in new tab. Confirm each link still works (no link rot).
> 4. If a source is no longer publicly available, either swap to a replacement statistic with a working source or replace with a quoted figure from a published SAIGE position paper.

### Acceptance criteria

- Each cited statistic has a working external hyperlink
- Hyperlinks open in `target="_blank"` with `rel="noopener noreferrer"`

---

## P1-005 — Add labels + privacy microcopy + value exchange to early-access form

**Severity:** P1 (conversion)
**Surface:** `https://saigedemo.com`
**Estimated effort:** trivial (15-30 minutes)

### Task

> The early-access form has fields (Work Email, Organisation Name, Role dropdown, Organisation Type dropdown) but minimal value-exchange copy and no inline privacy reassurance.
>
> 1. Add visible labels above each field (currently relies on placeholder text, which disappears on focus).
> 2. Add a one-liner above the submit button: "First 100 founding members get free pilot + onboarding workshop. Join the list →"
> 3. Add privacy microcopy below the submit: "We'll only use your email for SAIGE early-access updates. Unsubscribe anytime. [Privacy Policy](/privacy)"
> 4. Verify the form is keyboard-navigable end-to-end (Tab through fields → Enter to submit).

### Acceptance criteria

- All form fields have visible labels (not placeholder-only)
- Value exchange copy appears above the submit
- Privacy microcopy appears below
- Form is fully keyboard-navigable

---

## P1-006 — Fix heading hierarchy (h1 → h3 skip)

**Severity:** P1 (accessibility)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (a few hours)

### Task

> The DOM scan flagged that h3 elements appear before h2 elements in document order. This is a WCAG 1.3.1 (Info and Relationships) failure. Screen readers navigate by heading; skipped levels create a confusing landmark structure. ESG-aware buyers who care about social-pillar reporting will notice this on a compliance product.
>
> 1. Audit the page DOM for every heading.
> 2. Restructure so the order is strictly h1 → h2 → h3 (no skips, no out-of-order).
> 3. Where the visual layout makes h2 inappropriate (e.g., inline subtitle), use a `<p class="subtitle">` instead of demoting/promoting heading levels.

### Acceptance criteria

- Every h3 is preceded by at least one h2 in document order
- WAVE / axe-core scan passes WCAG 1.3.1 for headings

---

## P1-007 — Disclose demo scoring methodology

**Severity:** P1 (data)
**Surface:** `https://saigedemo.com`
**Estimated effort:** small (a few hours of writing)

### Task

> The live demo widget cycles through org types showing EIP scores, domain confidence percentages, and sector averages. None of these numbers come with methodology disclosure. On a compliance product, an unexplained scoring engine is a screen-out for any serious sustainability lead — they need to know what the model actually does before submitting their org's data to it.
>
> 1. Add a "How EIP scores are calculated" link or modal accessible from the demo widget.
> 2. The disclosure should cover:
>    - Inputs the scoring engine takes (data sources, frameworks aligned to)
>    - Weighting methodology (qualitative? quantitative? hybrid?)
>    - How "domain confidence %" is computed
>    - What "sector average" baselines are derived from
> 3. If the methodology hasn't been finalized yet, write "Methodology paper publishing Q3 2025 — preview the framework alignment here" and link to a 1-page summary.

### Acceptance criteria

- Demo widget surfaces a "How scores are calculated" entry point
- Disclosure page or modal explains inputs, weighting, baselines

---

## Suggested execution order

**Day 1 (compliance bedrock):** P0-001 (Privacy / Terms / cookie banner) + P0-002 (footer copyright). 1.5 days.
**Day 2:** P0-003 (production-domain decision) + P0-005 (form backend wiring). 1 day.
**Day 3:** P0-004 (CTA consolidation) + P1-002 (concrete timeline) + P1-005 (form labels + microcopy). 1 day.
**Day 4-5:** P1-001 (testimonial collection + replacement) + P1-003 (About / Company block). 2 days (gated by testimonial outreach).
**Day 6:** P1-004 (source links) + P1-006 (heading hierarchy) + P1-007 (methodology disclosure). 1 day.

After this sprint, re-run the audit:

```bash
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{"url":"https://saigedemo.com","product_id":"saige","depth":"quick","max_page_count":1,"sync":true,"objective":"Verify previous audit fixes landed"}'
```

Target health score after sprint: **80+**. The compliance fixes alone (P0-001) lift the score meaningfully because they remove the most visible self-contradiction on the page.
