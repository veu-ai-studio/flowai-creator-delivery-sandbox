# 14 — Part 1 ↔ Part 2 cross-reference

Date: 2026-05-07

## 1. Method

Re-read `tests/W1_OVERNIGHT_REPORT.md` (Part 1 summary). For each Part 1 finding or recommendation, cross-reference against the corresponding Part 2 report. Categorize each as:

- **CLOSED ON PAPER** — Part 2 produces a draft / proposal that fully addresses the finding. Implementation still pending.
- **EXPANDED** — Part 2 deepens or revises the Part 1 finding with new context.
- **UNRESOLVED** — Part 2 could not address the finding (typically because it requires implementation work, not spec authoring).

## 2. Part 1 top-5 gaps revisited

### Gap 1 — `OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET` are uninventoried

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Catalog of 9 missing entries | YES (Job 3 §4) | EXPANDED (`12-inventory-expansion.md` §2) |
| File:line evidence per missing var | Partial | EXPANDED — full per-var read-site list |
| Section-by-section additions to `docs/ENV_VARS.md` | Not specified | DRAFTED — 6 new sections (9–14) proposed |
| Activation-checklist update | Not specified | DRAFTED `12-inventory-expansion.md §5` |

**Status:** **CLOSED ON PAPER**. Part 2 produces a copy-pasteable expansion to `docs/ENV_VARS.md`. Implementation is "documentation PR" — 30–60 min effort.

### Gap 2 — Hard-coded `'flowai-webhook-secret'` plaintext default

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Site identification | YES (2 files) | RE-VERIFIED (`11-plaintext-remediation.md §2`) |
| Why it matters | YES (one paragraph) | EXPANDED (`§3` — explains paired-default failure mode) |
| Concrete fix | "delete the fallback" | DRAFTED — Phase 1 fail-closed AND Phase 2 zero-downtime variants (`§5`) |
| Migration order | Not specified | DRAFTED `§6` |
| Regression-prevention test | Not specified | DRAFTED `§7` |

**Status:** **CLOSED ON PAPER**. Part 2 provides ready-to-paste fix code for both files plus a CI test that prevents regression. Implementation is two short edits.

### Gap 3 — Zero rotation procedures

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Coverage table per credential type | YES — 8 types × 3 columns, all empty | EXPANDED (`09-rotation-completeness.md §2.1`) — same table now populated with cadences |
| Generic rotation procedure | "add a section" | DRAFTED `§2.2` (6 steps) |
| Per-credential variations | Not specified | DRAFTED `§2.3` for 12 specific credentials |
| Rollback procedure | Not specified | DRAFTED `§2.4` |
| Tracking schema | Anticipated by `gov.secrets_hygiene` rubric | DRAFTED `§2.6` (Supabase migration shape) |
| Reminder automation | Not specified | DRAFTED `§2.5` (Inngest cron pattern) |

**Status:** **CLOSED ON PAPER**. Part 2 produces ~80% of the runbook content. Remaining 20% is incident-response detail per credential, which can land as the platform matures.

### Gap 4 — Stripe Connect 0% implemented + 15% fee not documented

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Touchpoint inventory | YES (`10-stripe-integration-status.md` Part 1 §2) | RE-VERIFIED (`10-stripe-status.md §1`) |
| Webhook handler shape | "implement that plan" (referencing W4 audit) | DRAFTED `10-stripe-status.md §3.4` (full code) |
| 15% fee constant | "hardcode it" | DRAFTED `§3.2` — basis-points form `PLATFORM_FEE_BPS = 1500` |
| Idempotency schema | "no idempotency surface" | DRAFTED `§3.5` — 3-table schema with PK guarantee |
| Provider revenue split | "missing" | DRAFTED `§3.5` + `§6` |
| Connect onboarding flow | Not specified | DRAFTED `§3.6` (depends on Agent #4) |
| 15% documentation | "not committed to any spec" | DRAFTED `§5` — text for `specs/w1-billing/platform-fee.md` |

**Status:** **CLOSED ON PAPER**. Part 2 produces the entire code shape for a 3–5 day implementation sprint.

### Gap 5 — Five W1 spec directories don't exist

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Identification | YES (Jobs 2, 3, 4, 5, 6) | RE-VERIFIED (every Part 2 §1 spec discovery section) |
| Recommended order | DRAFTED in Part 1 §4 Recommendation 4 | UNCHANGED |
| Per-spec content draft | "Each report... is a starting checklist" | EXPANDED — Part 2 produces concrete recommended values, code shapes, and decisions |

**Status:** **EXPANDED**. The directories themselves are still missing on disk, but Part 2's reports now contain enough material that a spec author can convert each into a canonical spec in 1–2 hours rather than 1–2 days.

## 3. Part 1 top-5 recommendations revisited

### Recommendation 1 — Fix the inventory (1 hour)

| Aspect | Part 1 | Part 2 |
|---|---|---|
| What to add | 9 entries listed | All 9 + section assignments + table shapes (`12-inventory-expansion.md`) |
| Implementation | Not done | Still pending — read-only constraint blocks edits to `docs/ENV_VARS.md` |

**Status:** **EXPANDED but UNRESOLVED**. Part 2 provides everything needed to do the edit; the actual edit is gated by future write permission.

### Recommendation 2 — Resolve split `vercel.json` (15 min)

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Identification | YES — root vs `src/vercel.json` | RE-VERIFIED in Part 2 jobs that touch deployment |
| Decision | Not made | Still pending — out-of-scope for W1 spec authorship; closer to W4 deployment workstream |

**Status:** **UNRESOLVED**. Decision crosses into W4 territory. Recommend handing off to W4.

### Recommendation 3 — Replace `'flowai-webhook-secret'` (30 min)

**Status:** Same as Gap 2 above — **CLOSED ON PAPER** by `11-plaintext-remediation.md`. Implementation pending.

### Recommendation 4 — Author the five missing spec directories (1–2 days each)

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Spec directory order | DRAFTED | UNCHANGED |
| Spec content drafts | "starting checklist" | EXPANDED — Part 2 reports now contain implementation-grade content |

**Status:** **EXPANDED**. Specs still need to be moved out of `specs/w1-overnight/` and into their canonical homes, but the source material is ~80% ready.

### Recommendation 5 — Stay in Mode B; sequence Mode A as follow-on

| Aspect | Part 1 | Part 2 |
|---|---|---|
| Decision | YES | UNCHANGED — Part 2 jobs reinforce this |

**Status:** **CLOSED**. No further work needed in spec-only Part 2.

## 4. Findings new in Part 2 (not in Part 1)

| Finding | Source | Implication |
|---|---|---|
| Domain-role classification per zone (sender vs non-sender vs broken vs unverified) | `06-dns-checklist.md §2` | Determines per-domain DNS template (sender alignment vs null SPF + reject DMARC) |
| Recommended Cloudflare values per control are now copy-pasteable | `05-cloudflare-checklist.md §3` | A spec author can lift these directly |
| `STRIPE_CONNECT_<providerId>` vs `getProviderSecret(<providerId>, 'STRIPE_CONNECT')` ambiguity should pin to the dedicated method | `10-stripe-status.md §4` | Prevents path collision when providers onboard |
| `merchant_of_record: 'platform'` vs `'connected_account'` is the gating tax-policy decision | `13-tax-readiness.md §3.1` | Drives whether VEU collects sales tax or each provider does |
| Cloudflare Pro plan needed for 5 of 8 zones (Super Bot Fight Mode) | `08-vendor-readiness.md §5` | ~$160/mo cost line item |
| Markify pricing unknown — quote needed | `08-vendor-readiness.md §5` | Cost-of-DMCA workstream uncertain |
| Stripe Tax recommended for North America / Europe; Africa-tier deferred to per-country | `13-tax-readiness.md §3.6, §3.7` | Tax engine choice has regional split |
| `LEGAL_EIN` should be an env var, not a literal | `13-tax-readiness.md §3.1` | Surfaced on receipts but not browser-safe to commit |
| Africa-first products (MyPregLife + Paystack/Flutterwave/Termii) shape the tax stance | `13-tax-readiness.md §3.7` | Per-country VAT registration triggers |

## 5. Findings UNRESOLVED after Part 2

These require either external decisions, implementation sprints, or out-of-scope information.

| Finding | Why unresolved |
|---|---|
| `ourcommunitiesai.com` DNS-broken | Domain-registration / removal decision — out-of-repo |
| `sustainabilityleadership.com` ownership unverified | Out-of-repo |
| `reltwin.com` `live_url` empty | `productDomains.js:103` placeholder; needs Victor's confirmation |
| `merchant_of_record` decision (`platform` vs `connected_account`) | Business / legal decision — flagged in `13-tax-readiness.md §3.1` |
| Inbound MX choice for `veuaistudio.com` (Workspace / Microsoft / Fastmail) | Business decision |
| Vercel CA identity (for CAA `issue` line precision) | Information-gathering decision |
| Mode A Doppler implementation | Requires authoring `dopplerClient` + bootstrap; out-of-scope for read-only Part 2 |
| Agent #13 implementation | Spec-authoring is in-scope; implementation is W2 territory |
| Stripe Connect implementation | 3–5 day implementation sprint; out-of-scope here |
| `gov.secrets_hygiene` evaluator | W3 territory per `specs/w3-overnight/06-score-eval-integration.md` |
| `provider_payouts` schema apply | Supabase migration — implementation, not spec |
| Procurement of Markify | Vendor purchase — out-of-repo |
| Procurement of Cloudflare Pro plan | Vendor purchase — out-of-repo |
| Cloudflare zone consolidation (8 domains into 1 account) | Out-of-repo provisioning |

## 6. Tally

| Category | Count |
|---|---|
| Part 1 gaps now CLOSED ON PAPER by Part 2 | 4 of 5 |
| Part 1 gaps EXPANDED but still UNRESOLVED | 1 of 5 (Gap 5 — specs not yet committed to canonical paths) |
| Part 1 recommendations CLOSED by Part 2 | 1 of 5 (Recommendation 5 — already a decision) |
| Part 1 recommendations EXPANDED with implementation-ready content | 3 of 5 (Recommendations 1, 3, 4) |
| Part 1 recommendations UNRESOLVED | 1 of 5 (Recommendation 2 — split `vercel.json` is W4 territory) |
| Net new Part 2 findings | 9 |
| Findings UNRESOLVED after both parts (require external action) | 14 |

## 7. Recommendation: implementation sequence post-Part-2

Putting Parts 1 + 2 together, the cheapest-to-most-expensive sequence is:

1. **Within 1 hour** — apply `12-inventory-expansion.md`'s expansion to `docs/ENV_VARS.md`
2. **Within 1 hour** — apply `11-plaintext-remediation.md` Phase 1 (delete the literal default)
3. **Within 1 day** — provision Cloudflare account + zones, apply `05-cloudflare-checklist.md` configuration, publish `06-dns-checklist.md` records (start at DMARC stage 1)
4. **Within 1 day** — move Part 2 reports into canonical `specs/w1-vault/`, `specs/w1-credentials/`, `specs/w1-cloudflare/`, `specs/w1-dns/`, `specs/w1-dmca/`, `specs/w1-billing/`, `specs/w1-ops/` directories
5. **Within 1 week** — implement Stripe Connect per `10-stripe-status.md`
6. **Within 2 weeks** — implement Agent #13 + DMCA flow per `07-dmca-inventory.md`
7. **Post-MVP** — Mode A Doppler, contractor 1099-NEC pipeline, BIMI

The gating questions for the user are:

1. **Merchant-of-record:** platform or connected accounts? (drives tax engine)
2. **Inbound MX:** Workspace / Microsoft / Fastmail? (drives DNS records)
3. **Cloudflare plan:** Pro on 5 product zones, Free elsewhere? Or Free across the board?
4. **`reltwin.com`:** confirm `live_url`
5. **`ourcommunitiesai.com`:** register or remove from registry?
6. **`sustainabilityleadership.com`:** confirm ownership?
