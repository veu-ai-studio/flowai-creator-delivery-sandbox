# W1 Overnight Report — Part 2

**Date:** 2026-05-07
**Repo:** `C:\Users\victo\Downloads\truthful-flow-logic-lab` (branch `main`)
**Scope:** Part 2 — extended overnight assignment, Jobs 5–15. Read-only and spec-authoring only. No source code modified outside `specs/w1-overnight/` and `tests/`. No commits, no pushes, no branches created. No outbound API calls. No service signups.

---

## 1. Headline finding

**Part 1 catalogued the gaps; Part 2 closes them on paper.**

Of Part 1's 5 priority gaps:
- **4 are now CLOSED ON PAPER** — Part 2 produces implementation-ready specifications, code shapes, schemas, and migration plans.
- **1 is EXPANDED but UNRESOLVED on disk** — the canonical W1 spec directories (`specs/w1-vault/`, `specs/w1-credentials/`, `specs/w1-cloudflare/`, `specs/w1-dns/`, `specs/w1-dmca/`) still don't exist, but Part 2's reports contain the source material to populate each.

The W1 spec corpus is no longer a green field. It is a queue of copy-paste-and-decide tasks.

---

## 2. Part 2 jobs — verdicts

| # | Part 2 Job | Output | Status |
|---|---|---|---|
| 5 | Cloudflare deep dive | `specs/w1-overnight/05-cloudflare-checklist.md` | ✅ Implementable per-domain config across 9 control families |
| 6 | DNS hygiene | `specs/w1-overnight/06-dns-checklist.md` | ✅ Concrete SPF/DKIM/DMARC/CAA values for 6 of 8 zones (2 blocked on ownership) |
| 7 | DMCA inventory | `specs/w1-overnight/07-dmca-inventory.md` | ✅ Agent #13 charter sketch + 7-day build plan |
| 8 | Vendor procurement | `specs/w1-overnight/08-vendor-readiness.md` | ✅ 4-tier procurement queue, all 32 known vendors classified |
| 9 | Rotation completeness | `specs/w1-overnight/09-rotation-completeness.md` | ✅ Cadence + procedure + rollback drafted for 8 credential types |
| 10 | Stripe Connect | `specs/w1-overnight/10-stripe-status.md` | ✅ Code shape for webhook + 15% fee + revenue split + 3-table schema |
| 11 | Plaintext remediation | `specs/w1-overnight/11-plaintext-remediation.md` | ✅ Phase 1 + Phase 2 fix sketches + regression test |
| 12 | Inventory expansion | `specs/w1-overnight/12-inventory-expansion.md` | ✅ 9 missing entries fully specified with section assignments |
| 13 | Tax readiness | `specs/w1-overnight/13-tax-readiness.md` | ✅ EIN integration + Stripe Tax recommendation + Africa-tier stance |
| 14 | Cross-reference | `specs/w1-overnight/14-cross-reference.md` | ✅ Part 1 ↔ Part 2 reconciliation, 14 unresolved items called out |
| 15 | This summary | `tests/W1_OVERNIGHT_REPORT_PART2.md` | ✅ This document |

---

## 3. Overall W1 readiness (after Parts 1 + 2)

| Plane | Part 1 status | Part 2 status |
|---|---|---|
| Consumer-side vault contract (`CredentialAdapter`) | READY (92 tests) | UNCHANGED |
| Inventory completeness | NEAR-READY (1-hour gap) | DRAFTED in `12-inventory-expansion.md` |
| Vault provisioning (Doppler-side) | NOT STARTED | UNCHANGED |
| `dopplerClient` implementation | NOT STARTED | UNCHANGED — recommend deferring to follow-on sprint |
| Bootstrap / `setDefaultCredentialAdapter` wiring | NOT STARTED | UNCHANGED |
| Cloudflare configuration | NOT STARTED | DRAFTED with concrete values |
| DNS records (SPF/DKIM/DMARC/CAA) | NOT STARTED | DRAFTED with concrete values |
| DMCA flow + Agent #13 | NOT STARTED | DRAFTED — charter, vendors, response SLAs |
| Stripe Connect | NOT STARTED | DRAFTED — code shape, schema, fee constant |
| 15% platform fee | NOT DOCUMENTED | DRAFTED — `PLATFORM_FEE_BPS = 1500` |
| Tax compliance code surface | NOT STARTED | DRAFTED — `legalEntity.js` + Stripe Tax + Africa-tier |
| Rotation runbook | NOT STARTED | DRAFTED — 8 credential types, 12 specific credentials |
| Plaintext webhook secret remediation | NOT STARTED | DRAFTED — Phase 1 + Phase 2 + regression test |
| W1 spec corpus | MISSING — 5 directories absent | EXPANDED but still on `specs/w1-overnight/` paths |

**Net W1 readiness:** ~10% in Part 1 → **~50% draft-complete after Part 2** (with implementation pending).

---

## 4. Top 10 gaps (consolidated, priority-ordered)

### Gap 1 — Plaintext `'flowai-webhook-secret'` is a hardcoded backdoor (still committed)

**Severity:** CRITICAL.
**Source:** `11-plaintext-remediation.md §2`.
**Effort to close:** 30 min for Phase 1; 1–14 days for Phase 2.
**Decision needed:** can external webhook sources update synchronously? If yes → Phase 1; if no → Phase 2.

### Gap 2 — `OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET` uninventoried

**Severity:** HIGH.
**Source:** `12-inventory-expansion.md §2`.
**Effort to close:** 30–60 min documentation PR.
**Decision needed:** none — all 9 entries fully specified with section assignments.

### Gap 3 — Stripe Connect 0% implemented; 15% fee not in code

**Severity:** HIGH.
**Source:** `10-stripe-status.md §3`.
**Effort to close:** 3–5 day implementation sprint.
**Decision needed:** `merchant_of_record: 'platform'` vs `'connected_account'` (drives tax engine — see Gap 4).

### Gap 4 — `merchant_of_record` decision not made

**Severity:** HIGH.
**Source:** `13-tax-readiness.md §3.1`.
**Effort to close:** business decision; once made, drives Stripe Tax integration choice.
**Decision needed:** legal/business decision.

### Gap 5 — Five W1 spec directories missing on canonical paths

**Severity:** HIGH (process/audit-trail issue).
**Source:** Part 1 Gap 5; Part 2 §1 of every report re-verifies.
**Effort to close:** 4–6 hours moving Part 2 content into canonical paths.
**Decision needed:** none — Part 2 reports contain implementation-grade source material.

### Gap 6 — Zero rotation procedures committed (despite drafted runbook)

**Severity:** HIGH (rotation events are regulatory/audit-relevant).
**Source:** `09-rotation-completeness.md §2`.
**Effort to close:** 1–2 hours moving §2 into `docs/w1-ops/ROTATION.md` + Supabase migration apply.
**Decision needed:** none.

### Gap 7 — Cloudflare zones not consolidated; no controls applied

**Severity:** HIGH (no DDoS, WAF, or HSTS today).
**Source:** `05-cloudflare-checklist.md §5`.
**Effort to close:** 2-day Cloudflare provisioning sprint.
**Decision needed:** Pro plan tier ($160/mo for 5 zones) or Free across the board.

### Gap 8 — `veuaistudio.com` (de facto sender) has no DNS hygiene records

**Severity:** HIGH (DMARC will reject sends from a misaligned origin).
**Source:** `06-dns-checklist.md §3`.
**Effort to close:** 30 min DNS publish + 14-day DMARC monitoring rollout to `p=reject`.
**Decision needed:** inbound MX choice (Workspace / Microsoft / Fastmail).

### Gap 9 — DMCA: zero implementation, no Designated Agent, no templates

**Severity:** MEDIUM (rises to HIGH on first infringement claim).
**Source:** `07-dmca-inventory.md §3`.
**Effort to close:** 7-day build plan + Markify procurement + $6/yr Copyright Office filing.
**Decision needed:** procure Markify (W0-locked, pricing TBD).

### Gap 10 — Tax compliance code surface at 0%

**Severity:** MEDIUM (rises to HIGH at year-end if 1099 thresholds crossed).
**Source:** `13-tax-readiness.md §3`.
**Effort to close:** 2-day sprint after Stripe Connect lands.
**Decision needed:** see Gap 4.

---

## 5. Top 10 recommendations (sequenced)

### Within 1 hour

1. **Apply `12-inventory-expansion.md`** — add 9 entries to `docs/ENV_VARS.md`. No code changes.
2. **Apply `11-plaintext-remediation.md` Phase 1** — delete `'flowai-webhook-secret'` literal in 2 files. Coordinate with whoever holds external webhook configurations.

### Within 1 day

3. **Make the `merchant_of_record` decision** (drives tax + Stripe Tax engine).
4. **Provision Cloudflare account + add 6 verified zones**; enable DNSSEC; apply `05-cloudflare-checklist.md` headers in CSP report-only mode.
5. **Publish DNS records** per `06-dns-checklist.md` for the 6 verified zones; start `veuaistudio.com` DMARC at stage 1.
6. **Move Part 2 reports** into canonical paths: `specs/w1-vault/`, `specs/w1-credentials/`, `specs/w1-cloudflare/`, `specs/w1-dns/`, `specs/w1-dmca/`, `specs/w1-billing/`, `specs/w1-ops/`.

### Within 1 week

7. **Implement Stripe Connect** per `10-stripe-status.md` (3–5 day sprint). Pin 15% fee in `api/_lib/billing/platformFee.js`. Apply `provider_payouts` migration.
8. **Apply rotation runbook** — move `09-rotation-completeness.md §2` into `docs/w1-ops/ROTATION.md`; apply `credential_rotation_log` migration; wire weekly Inngest reminder.

### Within 2 weeks

9. **Author Agent #13** per `07-dmca-inventory.md §2`; provision `dmca@veuaistudio.com` mailbox; file Designated Agent at copyright.gov ($6/yr); procure Markify.

### Within 1 month

10. **Activate Stripe Tax** for North America / Europe; document Africa-tier deferral; surface EIN on legal pages via `13-tax-readiness.md §3.1` `legalEntity.js`.

---

## 6. Files created during Part 2

All files are net-new under `specs/w1-overnight/` and `tests/`. Zero source files outside these directories were modified. No commits, no branches, no pushes.

| Path | Type | Approx. lines |
|---|---|---|
| `specs/w1-overnight/05-cloudflare-checklist.md` | Part 2 report (Job 5) | ~205 |
| `specs/w1-overnight/06-dns-checklist.md` | Part 2 report (Job 6) | ~200 |
| `specs/w1-overnight/07-dmca-inventory.md` | Part 2 report (Job 7) | ~155 |
| `specs/w1-overnight/08-vendor-readiness.md` | Part 2 report (Job 8) | ~125 |
| `specs/w1-overnight/09-rotation-completeness.md` | Part 2 report (Job 9, supersedes Part 1) | ~250 |
| `specs/w1-overnight/10-stripe-status.md` | Part 2 report (Job 10) | ~270 |
| `specs/w1-overnight/11-plaintext-remediation.md` | Part 2 report (Job 11) | ~205 |
| `specs/w1-overnight/12-inventory-expansion.md` | Part 2 report (Job 12) | ~225 |
| `specs/w1-overnight/13-tax-readiness.md` | Part 2 report (Job 13) | ~175 |
| `specs/w1-overnight/14-cross-reference.md` | Part 2 report (Job 14) | ~165 |
| `tests/W1_OVERNIGHT_REPORT_PART2.md` | This summary (Job 15) | ~210 |

Part 1 files retained alongside Part 2:
- `specs/w1-overnight/01-credential-inventory.md`
- `specs/w1-overnight/02-vault-spec-compliance.md`
- `specs/w1-overnight/03-credential-cross-check.md`
- `specs/w1-overnight/04-cloudflare-checklist.md`
- `specs/w1-overnight/05-dns-hygiene-checklist.md`
- `specs/w1-overnight/06-dmca-inventory.md`
- `specs/w1-overnight/07-vendor-readiness.md`
- `specs/w1-overnight/08-doppler-readiness.md`
- `specs/w1-overnight/10-stripe-integration-status.md`
- `specs/w1-overnight/11-tax-readiness.md`
- `specs/w1-overnight/12-w1-test-results.md`
- `tests/w1-utilities.test.js` (66 tests)
- `tests/W1_OVERNIGHT_REPORT.md` (Part 1 summary)

The Part 2 file `09-rotation-completeness.md` superseded Part 1's file at the same path (intentional — Part 2's content fully subsumes Part 1's).

---

## 7. Constraint compliance

| Rule | Honored? |
|---|---|
| Stay on `main` branch | ✅ — `git branch --show-current` returned `main` at start; no branch switch |
| No commits | ✅ |
| No pushes | ✅ |
| No source modifications outside `specs/w1-overnight/` and `tests/` | ✅ |
| No outbound API calls | ✅ |
| No service signups | ✅ |
| No `package.json`, `vercel.json`, `.doppler.yaml`, or config-file edits | ✅ |
| Reports saved incrementally | ✅ — each report written as completed |

---

## 8. Awaiting human review

Per the brief, this run stops here. Recommend reviewing:

1. **`specs/w1-overnight/14-cross-reference.md` §7** — gating questions for the user (6 decisions needed).
2. **Top-10 gaps list above** — sequenced by severity + effort.
3. **Top-10 recommendations above** — sequenced by time-to-close.

Implementation work and procurement are explicitly out of scope for this read-only Part 2. The next sprint can pick up at any of the 10 recommendations independently.

---

*Part 2 ends. No commits made. No source files outside `tests/` and `specs/w1-overnight/` modified. Awaiting human review.*
