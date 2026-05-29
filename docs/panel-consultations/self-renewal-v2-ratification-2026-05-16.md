# Panel Consultation — Self-Renewal Spec v2 — ADVERSARIAL RE-RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format.
**Spec:** `docs/specs/SELF_RENEWAL_SPEC.md` (v2, commit `10ab940`, 641+ lines).
**v1 verdict:** NOT_RATIFIED at 26.8% alignment (`ab398b9`).
**Carried RATIFIED from v1 (NOT re-voted):** G-Q5 `QUORUM_PLURALITY_GQ5-PREFIRST` 7/8.

**Started:** 2026-05-17T04:01:05.516Z
**Finished:** 2026-05-17T04:03:02.914Z
**Bundle:** 82624 chars.
**Panel audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"amazon":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}

---
## 🚨 PLAIN RATIFICATION VERDICT
**Status:** `NOT_RATIFIED`

Spec v2 NOT ratified — 6 question(s) lack clear Panel majority.

**Conditions:**
1. **G-Q1-v2** — 3-file-max fix scope with diff-parse-time enforcement
   - `PLURALITY_GQ1v2-1FILE` 4 of 7 on GQ1v2-1FILE (below 7/10 quorum).

2. **G-Q2-v2** — Three MUST gates: tests + typecheck + preview-smoke
   - `PLURALITY_GQ2v2-MORE` 3 of 7 on GQ2v2-MORE (below 7/10 quorum).

3. **G-Q3-v2** — GitHub App primary, fine-grained PAT (branch-scoped) as INTERIM fallback
   - `PLURALITY_GQ3v2-APPONLY` 5 of 7 on GQ3v2-APPONLY (below 7/10 quorum).

4. **G-Q4-v2** — Per-product configurable negative-delta policy (ALWAYS_OPEN default | DISCARD_ON_NEGATIVE)
   - `PLURALITY_GQ4v2-HARD` 3 of 7 on GQ4v2-HARD (below 7/10 quorum).

5. **G-Q6-v2** — Per-product configurable minimum-delta threshold (selfRenewalMinimumDelta default 0)
   - `SPLIT` top tie at 2 between GQ6v2-PROD / GQ6v2-LAYER / GQ6v2-COLL.

6. **G-Q7-v2** — v2 disposition — is v2 ready for promotion now that the 5 conditions are addressed?
   - `PLURALITY_GQ7v2-REV` 5 of 7 on GQ7v2-REV (below 7/10 quorum).



---
## DISSENT-FLOOR
Alignment: 9/42 = **21.4%** · objections: **34** · ✅ PASS

LIVE-OK: 10/10 · Backups: 0 · ENGAGED: 7 · TANGENTIAL: 3 · SILENT: 0

---
## Per-question tally
| Q | Topic | Top key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q1-v2** | 3-file-max fix scope with diff-parse-time enforcement | `GQ1v2-1FILE` | 4 / 7 | `PLURALITY_GQ1v2-1FILE` |
| **G-Q2-v2** | Three MUST gates: tests + typecheck + preview-smoke | `GQ2v2-MORE` | 3 / 7 | `PLURALITY_GQ2v2-MORE` |
| **G-Q3-v2** | GitHub App primary, fine-grained PAT (branch-scoped) as INTE | `GQ3v2-APPONLY` | 5 / 7 | `PLURALITY_GQ3v2-APPONLY` |
| **G-Q4-v2** | Per-product configurable negative-delta policy (ALWAYS_OPEN  | `GQ4v2-HARD` | 3 / 7 | `PLURALITY_GQ4v2-HARD` |
| **G-Q6-v2** | Per-product configurable minimum-delta threshold (selfRenewa | `GQ6v2-PROD` | 2 / 7 | `SPLIT` |
| **G-Q7-v2** | v2 disposition — is v2 ready for promotion now that the 5 co | `GQ7v2-REV` | 5 / 7 | `PLURALITY_GQ7v2-REV` |

### Detail
### G-Q1-v2 — 3-file-max fix scope with diff-parse-time enforcement

Tally (ENGAGED-only, 7):
  - `GQ1v2-3FILE` "3-file cap with diff-parse-time enforcement is correct — covers common multi-file patterns (component + test + parent route) while preventin"  →  **1**
  - `GQ1v2-1FILE` "3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in production; raise to 3 only in Phase B."  →  **4**
  - `GQ1v2-5FILE` "3-file cap is too restrictive — Phase A should allow up to 5 files for "small refactor" findings tagged by Agent #6 Research; parse-time gat"  →  **0**
  - `GQ1v2-LOC` "File-count framing misses the real risk — Phase A should cap by total diff hunk count or LOC changed (e.g. ≤ 50 LOC across all files), not f"  →  **2**

**Verdict:** `PLURALITY_GQ1v2-1FILE` — 4 of 7 on GQ1v2-1FILE (below 7/10 quorum).

### G-Q2-v2 — Three MUST gates: tests + typecheck + preview-smoke

Tally (ENGAGED-only, 7):
  - `GQ2v2-THREE` "Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct failure class (logic / type / runtime-SSR regressio"  →  **2**
  - `GQ2v2-MORE` "Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (screenshot diff against pre-renewal baseline) before"  →  **3**
  - `GQ2v2-LESS` "Too strict — typecheck-skip-when-no-tsconfig and DOM-default ["html","body"] are loopholes; either MUST-universal or drop the gates entirely"  →  **1**
  - `GQ2v2-ADVIS` "MUST framing is wrong — Phase A should treat all gates as advisory with a single "operator confidence threshold" parameter; let operators tu"  →  **0**
  - `REJECT` (free-text REJECT bucket) → 1

**Verdict:** `PLURALITY_GQ2v2-MORE` — 3 of 7 on GQ2v2-MORE (below 7/10 quorum).

### G-Q3-v2 — GitHub App primary, fine-grained PAT (branch-scoped) as INTERIM fallback

Tally (ENGAGED-only, 7):
  - `GQ3v2-APPINT` "App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is pragmatic migration affordance Phase B retires (A"  →  **2**
  - `GQ3v2-APPONLY` "Drop the PAT fallback entirely from Phase A — App-only from day one; products without App installation cannot use Self-Renewal until they in"  →  **5**
  - `GQ3v2-PATPRIM` "Keep PAT as primary in Phase A — App adds installation friction (operator click-through) that blocks adoption; defer App to Phase B once Sel"  →  **0**
  - `GQ3v2-OAUTH` "Two credential paths is wrong shape — Phase A should use a single OAuth-on-behalf-of-operator flow with the operator's own user token, scope"  →  **0**

**Verdict:** `PLURALITY_GQ3v2-APPONLY` — 5 of 7 on GQ3v2-APPONLY (below 7/10 quorum).

### G-Q4-v2 — Per-product configurable negative-delta policy (ALWAYS_OPEN default | DISCARD_ON_NEGATIVE)

Tally (ENGAGED-only, 7):
  - `GQ4v2-ENUM` "Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have different reviewer-bandwidth profiles; operator ch"  →  **2**
  - `GQ4v2-THIRD` "Insufficient — Phase A also needs a third option OPEN_AS_CLOSED_PR (open the PR but immediately close it; operator gets record without inbox"  →  **0**
  - `GQ4v2-HARD` "Over-engineered — Phase A should hard-code ALWAYS_OPEN (transparency-first) until usage data justifies a per-product knob; one configurable "  →  **3**
  - `GQ4v2-AUTH` "Wrong axis — policy should not be operator-configurable at all; tie to Authority posture (Supervised → ALWAYS_OPEN, Autonomous → DISCARD_ON_"  →  **2**

**Verdict:** `PLURALITY_GQ4v2-HARD` — 3 of 7 on GQ4v2-HARD (below 7/10 quorum).

### G-Q6-v2 — Per-product configurable minimum-delta threshold (selfRenewalMinimumDelta default 0)

Tally (ENGAGED-only, 7):
  - `GQ6v2-PROD` "Per-product integer with default 0 is correct — operator decides "what counts as worth my review time"; default of 0 preserves surface-every"  →  **2**
  - `GQ6v2-PLUS1` "Default should be +1, not 0 — "open PR only if measurable improvement" is safer default than "open PR for break-even runs that just preserve"  →  **1**
  - `GQ6v2-LAYER` "Threshold should be per-layer not just delta_total — operators may care about L1 Functionality regressions even when delta_total is positive"  →  **2**
  - `GQ6v2-COLL` "Threshold mechanism is redundant with G-Q4 DISCARD_ON_NEGATIVE — drop per-product integer; collapse into single 3-state enum (ALL | IMPROVEM"  →  **2**

**Verdict:** `SPLIT` — top tie at 2 between GQ6v2-PROD / GQ6v2-LAYER / GQ6v2-COLL.

### G-Q7-v2 — v2 disposition — is v2 ready for promotion now that the 5 conditions are addressed?

Tally (ENGAGED-only, 7):
  - `GQ7v2-PROM` "Promote — 5 conditions addressed cleanly; Option C v2 is ready for Phase A engineering dispatch."  →  **0**
  - `GQ7v2-RESV` "Promote-with-Reservations — 5 conditions addressed but Panel surfaces residual issues that the engineering dispatch should track (non-blocki"  →  **2**
  - `GQ7v2-REV` "Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify whi"  →  **5**
  - `GQ7v2-REJ` "Reject — 5 edits expose a deeper architectural problem with Option C that surgical revisions cannot fix; spec needs ground-up rework or repl"  →  **0**

**Verdict:** `PLURALITY_GQ7v2-REV` — 5 of 7 on GQ7v2-REV (below 7/10 quorum).


---
## All distinct objections
Total: **34**

**01. [Slot 1] Credential fallback creates security debt**

> §3.2's PAT fallback path contradicts the security posture by maintaining long-lived tokens in Doppler even after claiming 'memory-only' in §3.3. The INTERIM label doesn't eliminate the attack surface during Phase A's entire lifetime.

**02. [Slot 1] Re-assessment cost doubles operator burden**

> §6.2 requires running the full 8-step pipeline twice per renewal, costing $0.65-$5.00 per run (Note 3). For products under continuous crawl (Locked Rule 14), this could mean hundreds of dollars monthly with no guarantee of positive outcomes.

**03. [Slot 1] Preview-smoke gate has trivial bypass**

> §4.4 gate (c) accepts default selectors ['html', 'body'] which any broken app satisfies. A completely white-screened React app with a JS error still passes because the HTML skeleton renders, making this gate theatrical rather than functional.

**04. [Slot 1] Delta score computation ignores user experience**

> §6.3 computes delta purely from Five-Layer Framework scores, but a fix that improves L2 Operational metrics while breaking critical user flows would show positive delta. No gate validates actual user-facing functionality preservation.

**05. [Slot 2] Credential management complexity**

> Section §3.2 introduces a dual credential model with GitHub App as primary and PAT as an interim fallback. This increases complexity and potential security risks, as managing two credential paths can lead to misconfigurations or overlooked security vulnerabilities.

**06. [Slot 2] Limited regression detection**

> Section §2 acknowledges that Self-Renewal cannot guarantee fixes won't introduce regressions, relying solely on human review. This could lead to undetected issues in production if human reviewers miss subtle regressions.

**07. [Slot 2] High operational cost**

> Section §6.2 and Note 3 highlight the cost of running the full 8-step pipeline twice per renewal, potentially reaching $5.00 per run. This could become financially unsustainable for operators with frequent renewals or multiple products.

**08. [Slot 3] Insufficient Testing**

> The proposal does not provide sufficient testing for the Self-Renewal feature, which could lead to unforeseen consequences and errors. Specifically, §4.4 only mentions testing for syntax and type errors, but does not account for other potential issues such as performance or security vulnerabilities.

**09. [Slot 3] Over-Reliance on Claude**

> The proposal relies heavily on Claude for fix generation, which may not always produce optimal or correct results. This could lead to a situation where the Self-Renewal feature introduces more problems than it solves. §4.1 mentions that Claude is used for fix generation, but does not provide any information on how its performance will be evaluated or improved.

**10. [Slot 3] Lack of Human Oversight**

> While the proposal mentions that human review is required for PRs, it does not provide sufficient details on how this oversight will be implemented or enforced. This could lead to a situation where the Self-Renewal feature is used without proper human review, potentially introducing errors or security vulnerabilities. §5.3 mentions that the PR is created in draft state, but does not specify how the human review process will be conducted.

**11. [Slot 4] Over-reliance on Claude**

> The proposal heavily relies on Claude for fix generation. This introduces a significant risk as Claude's outputs can be unpredictable and may not always adhere to the expected standards. This reliance could lead to inconsistent or incorrect fixes, which could compromise the integrity of the codebase.

**12. [Slot 4] Complexity of Discard Gates**

> The fix-discard gates in §4.4 introduce multiple layers of complexity. The gates are crucial for ensuring the quality of the fixes, but the implementation details are intricate and could be prone to errors. The proposal does not provide a clear mechanism for handling edge cases where a fix might pass some gates but fail others.

**13. [Slot 4] Security Risks with PAT**

> The use of fine-grained PATs, even as an interim fallback, poses security risks. PATs are less secure compared to GitHub Apps, and their usage could lead to unauthorized access or misuse. The proposal should emphasize the security benefits of using GitHub Apps and provide a clearer pathway for transitioning away from PATs.

**14. [Slot 5] Credential Management**

> The proposal relies on a fine-grained PAT as an interim fallback, which could pose security risks if not managed properly. The fallback should be removed as soon as possible to avoid potential vulnerabilities.

**15. [Slot 5] Limited Scope**

> The current scope of the proposal is limited to single-file fixes, which may not be sufficient for more complex issues that require multi-file changes.

**16. [Slot 5] Human Dependency**

> The proposal heavily relies on human review for merging PRs and catching regressions, which could introduce delays and inconsistencies in the renewal process.

**17. [Slot 6] Credential Fallback Complexity**

> §3.2 introduces significant complexity with the GitHub App primary and PAT fallback.  Managing two credential paths increases the attack surface and operational overhead, especially during the transition period. The logic for selecting and validating the correct credential adds potential for errors and vulnerabilities.

**18. [Slot 6] Limited Regression Detection**

> §2 acknowledges the inability to guarantee no regressions, relying heavily on human review.  While §7.5 mentions Phase D will address this, the current reliance on human review is a significant risk, especially as the number of automated fixes increases. The test suite may not cover all edge cases, and visual regressions can easily be missed.

**19. [Slot 6] Re-assessment Cost**

> §6.2 and Note 3 highlight the cost of re-running the full 8-step pipeline for re-assessment.  This doubles the assessment cost and significantly increases the overall cost of the Self-Renewal cycle.  The cost may become prohibitive, especially for products with frequent renewal runs.

**20. [Slot 6] Preview Smoke Test Weakness**

> §4.4 (c) defines the preview smoke test as checking for HTTP 2xx and at least one key DOM element. The default DOM element check of `['html', 'body']` is effectively useless.  Even with stricter selectors, this provides minimal assurance that the preview is actually functional or visually correct.

**21. [Slot 7] Insufficient Preview Smoke Test**

> §4.4's preview smoke test only checks HTTP 2xx and presence of generic DOM elements like 'html' or 'body'. This fails to detect functional regressions in complex applications. For example, a broken checkout flow would pass this gate while being functionally unusable. The default selectors are too permissive to provide meaningful validation before PR creation.

**22. [Slot 7] PAT Fallback Security Risk**

> §3.2's interim PAT fallback introduces long-lived credentials stored in Doppler, contradicting the memory-only principle in §8.1. The branch-scoping relies on operator-configured GitHub protections, which may be misconfigured. This creates an attack surface window before Phase B removal, especially since the fallback is triggered automatically when App installation lags.

**23. [Slot 7] Delta Threshold Policy Conflict**

> §6.4's selfRenewalMinimumDelta and selfRenewalNegativeDeltaPolicy interact poorly. A negative delta below the minimum threshold would trigger branch deletion without audit trail differentiation from positive-but-small deltas. This conflates two distinct failure modes in governance_record_entry, reducing diagnostic value for operators troubleshooting regressions.

**24. [Slot 7] Re-assessment Cost Blindspot**

> Note 3 acknowledges doubled pipeline costs but provides no mitigation strategy. For products with frequent findings, the $0.60-$4.00 per-run cost could accumulate rapidly without budget controls. The spec lacks integration with Orchestra's cost dashboard or alerting mechanisms, risking unexpected operational expenses.

**25. [Slot 8] Preview-before-PR deadlocks flow**

> §5.5 requires the Vercel preview to be live before the PR is opened, but §4.4 makes preview smoke a MUST gate and §5.5 says a failed preview can still yield a draft PR. Those rules conflict operationally: if preview build failure is what the operator most needs to inspect, the spec both forbids opening a PR and then immediately allows a draft PR, creating an ambiguous control path and likely branch clutter.

**26. [Slot 8] Two credential paths expand attack surface**

> §3.2 keeps both GitHub App and PAT fallback in Phase A, with different storage, authorization, and branch-protection assumptions. That increases the number of ways a run can leak or mis-scope credentials, and the fallback is especially risky because it preserves a long-lived machine-user path precisely in the phase that is supposed to de-risk automation.

**27. [Slot 8] Delta thresholds can hide regressions**

> §6.4 lets operators set `selfRenewalMinimumDelta` above zero and also optionally `DISCARD_ON_NEGATIVE`, which means runs can be suppressed before a PR is ever opened. Combined with §6.5 making the audit trail the source of truth, this can systematically hide small but important regressions from human review even when the PR preview would have revealed them.

**28. [Slot 8] Three-file cap misses semantic risk**

> §4.3 uses file count as the primary safety boundary, but a 2-file change can still be a major architectural mutation while a 6-file patch can be a trivial doc/string fix. The spec relies on diff-parse-time enforcement, yet the real risk surface is lines changed, coupling introduced, and dependency edges touched, not the raw number of files.

**29. [Slot 9] Overly complex fix generation**

> §4.4 introduces multiple MUST gates (tests, typecheck, preview-smoke) that may be too strict or too lax, potentially leading to false positives or negatives in fix validation.

**30. [Slot 9] Credential management risk**

> §3.2 retains a fine-grained PAT as an interim fallback, which adds attack surface and may be forgotten in Phase B, potentially leading to security vulnerabilities.

**31. [Slot 9] Lack of explicit regression handling**

> §2 and §7.5 highlight that Self-Renewal cannot guarantee no regressions until Phase D, relying on human review as the canonical regression gate, which may be error-prone.

**32. [Slot 10] §3.2 App/PAT dual credential paths**

> The primary GitHub App + documented INTERIM PAT fallback in §3.2 creates two credential surfaces with separate Doppler paths and selection logic; the fallback emits governance_record_entry on every use but still requires branch-protection rules and machine-user setup that must be manually maintained until Phase B deletes it.

**33. [Slot 10] §6.4 negative-delta + minimum-delta policies**

> ProductRegistry.selfRenewalNegativeDeltaPolicy and selfRenewalMinimumDelta allow per-product tuning after the fact, yet the decision sequence in §6.4 still opens PRs under ALWAYS_OPEN even when delta_total ≤ 0; this can flood the operator inbox with regression banners while the audit trail is preserved only in governance_record_entry.

**34. [Slot 10] Note 1 source-acquisition duplication**

> api/_lib/sourceAcquisition.js (tarball, read-only) and §3.5 (Contents + Git Data API, read-write) both read the same PRODUCT_<productId>_GITHUB_PAT credential; the spec only notes that Phase A should refactor them but provides no unified boundary or single-run credential lifetime guarantee.


---
## Strongest argument against
**Slot 3 (openrouter:meta-llama/llama-3.3-70b-instruct):**

> The proposal for the Self-Renewal feature is incomplete and lacks sufficient testing, evaluation, and validation. The feature's reliance on Claude for fix generation and the lack of human oversight could lead to unforeseen consequences and errors. Therefore, it is recommended to reject the proposal and require further development and testing before considering implementation. Specifically, the proposal should be revised to include more comprehensive testing, evaluation, and validation of the Self-Renewal feature, as well as more detailed information on how human oversight will be implemented and enforced.

---
## Per-reviewer
## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential fallback creates security debt**

> §3.2's PAT fallback path contradicts the security posture by maintaining long-lived tokens in Doppler even after claiming 'memory-only' in §3.3. The INTERIM label doesn't eliminate the attack surface during Phase A's entire lifetime.

**Objection 2 — Re-assessment cost doubles operator burden**

> §6.2 requires running the full 8-step pipeline twice per renewal, costing $0.65-$5.00 per run (Note 3). For products under continuous crawl (Locked Rule 14), this could mean hundreds of dollars monthly with no guarantee of positive outcomes.

**Objection 3 — Preview-smoke gate has trivial bypass**

> §4.4 gate (c) accepts default selectors ['html', 'body'] which any broken app satisfies. A completely white-screened React app with a JS error still passes because the HTML skeleton renders, making this gate theatrical rather than functional.

**Objection 4 — Delta score computation ignores user experience**

> §6.3 computes delta purely from Five-Layer Framework scores, but a fix that improves L2 Operational metrics while breaking critical user flows would show positive delta. No gate validates actual user-facing functionality preservation.

**Worse-than-status-quo:** The spec enables FlowAI to automatically push broken code to public GitHub repos and Vercel previews that are internet-accessible, creating a public attack surface for malicious actors to exploit half-fixed vulnerabilities before human review.

**Precedent:** Dependabot's early auto-PR system created similar review fatigue when it opened dozens of dependency update PRs without meaningful filtering, leading many teams to disable it entirely rather than wade through low-value automated changes.

### Rejection steelman

> This spec should be rejected because it fundamentally misaligns incentives: operators pay for expensive re-assessments ($0.65-$5 per run) while receiving PRs that may degrade their products (negative delta), creating a system where FlowAI profits from generating noise. The 3-file scope expansion without architectural understanding guarantees that fixes touching multiple files will be internally inconsistent, and the preview-smoke gate's default ['html','body'] configuration provides false confidence while allowing broken applications through.

### Votes

- **G-Q1-v2** = `GQ1v2-LOC` — File-count framing misses the real risk — Phase A should cap by total diff hunk count or L
  > A 3-file change could modify thousands of lines while a 5-file change might touch only 10 lines total; the risk correlates with change magnitude, not file count.
- **G-Q2-v2** = `GQ2v2-LESS` — Too strict — typecheck-skip-when-no-tsconfig and DOM-default ["html","body"] are loopholes
  > The typecheck gate only applies to TypeScript projects and the preview-smoke gate's default selectors are meaningless, creating an inconsistent safety posture.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > Maintaining two credential paths increases complexity and the PAT fallback contradicts the security controls in §8.1 by requiring long-lived token storage.
- **G-Q4-v2** = `GQ4v2-AUTH` — Wrong axis — policy should not be operator-configurable at all; tie to Authority posture (
  > Making this operator-configurable allows them to hide FlowAI's failures; the policy should be deterministic based on the authority model to maintain transparency.
- **G-Q6-v2** = `GQ6v2-LAYER` — Threshold should be per-layer not just delta_total — operators may care about L1 Functiona
  > A positive total delta could hide critical L1 functionality regressions; operators need granular control to prevent user-facing breakage.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > The preview-smoke gate (Q2 condition) is ineffective with default selectors, and the cost implications of re-assessment weren't addressed despite being a fundamental operational concern.

---

## Slot 2 — openrouter:openai/gpt-4o — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential management complexity**

> Section §3.2 introduces a dual credential model with GitHub App as primary and PAT as an interim fallback. This increases complexity and potential security risks, as managing two credential paths can lead to misconfigurations or overlooked security vulnerabilities.

**Objection 2 — Limited regression detection**

> Section §2 acknowledges that Self-Renewal cannot guarantee fixes won't introduce regressions, relying solely on human review. This could lead to undetected issues in production if human reviewers miss subtle regressions.

**Objection 3 — High operational cost**

> Section §6.2 and Note 3 highlight the cost of running the full 8-step pipeline twice per renewal, potentially reaching $5.00 per run. This could become financially unsustainable for operators with frequent renewals or multiple products.

**Worse-than-status-quo:** The proposal could lead to increased operational costs and complexity without significantly improving the reliability of the system, as it relies heavily on human intervention for regression detection.

**Precedent:** No precedent known

### Rejection steelman

> The proposal introduces significant complexity and potential security risks with its dual credential model, while also increasing operational costs. The reliance on human review for regression detection could lead to undetected issues, making the system less reliable than the status quo. These factors suggest that the proposal should be deferred until these concerns are addressed more robustly.

### Votes

- **G-Q1-v2** = `GQ1v2-1FILE` — 3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in pro
  > Starting with a single-file scope minimizes risk and allows for a controlled evaluation of the system's performance before expanding the scope.
- **G-Q2-v2** = `GQ2v2-MORE` — Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (sc
  > Adding more gates would ensure a more comprehensive validation of changes, reducing the risk of introducing regressions or accessibility issues.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > Eliminating the PAT fallback reduces complexity and potential security risks, focusing efforts on the more secure GitHub App model.
- **G-Q4-v2** = `GQ4v2-HARD` — Over-engineered — Phase A should hard-code ALWAYS_OPEN (transparency-first) until usage da
  > Starting with a simpler, transparent approach allows for better data collection and understanding of the system's impact before introducing more complexity.
- **G-Q6-v2** = `GQ6v2-PLUS1` — Default should be +1, not 0 — "open PR only if measurable improvement" is safer default th
  > Setting a default of +1 ensures that only meaningful improvements are surfaced, reducing noise and focusing reviewer attention on significant changes.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > The dual credential model and reliance on human review for regression detection introduce significant risks that need to be addressed before proceeding.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `TANGENTIAL`

**Invalid reason:** 5/6 votes parsed

### Adversarial pass

**Objection 1 — Insufficient Testing**

> The proposal does not provide sufficient testing for the Self-Renewal feature, which could lead to unforeseen consequences and errors. Specifically, §4.4 only mentions testing for syntax and type errors, but does not account for other potential issues such as performance or security vulnerabilities.

**Objection 2 — Over-Reliance on Claude**

> The proposal relies heavily on Claude for fix generation, which may not always produce optimal or correct results. This could lead to a situation where the Self-Renewal feature introduces more problems than it solves. §4.1 mentions that Claude is used for fix generation, but does not provide any information on how its performance will be evaluated or improved.

**Objection 3 — Lack of Human Oversight**

> While the proposal mentions that human review is required for PRs, it does not provide sufficient details on how this oversight will be implemented or enforced. This could lead to a situation where the Self-Renewal feature is used without proper human review, potentially introducing errors or security vulnerabilities. §5.3 mentions that the PR is created in draft state, but does not specify how the human review process will be conducted.

**Worse-than-status-quo:** If the Self-Renewal feature is implemented without proper testing and human oversight, it could lead to a situation where the system is worse than the status quo. For example, if the feature introduces errors or security vulnerabilities, it could compromise the entire system and lead to significant losses. This could happen if the feature is used without proper evaluation and validation, and if the human review process is not rigorous enough to catch potential issues.

**Precedent:** A similar issue occurred with the Microsoft Azure DevOps pipeline, where a faulty automated deployment feature led to a significant outage. This highlights the importance of proper testing and human oversight in automated systems, and the need for careful evaluation and validation of new features like Self-Renewal.

### Rejection steelman

> The proposal for the Self-Renewal feature is incomplete and lacks sufficient testing, evaluation, and validation. The feature's reliance on Claude for fix generation and the lack of human oversight could lead to unforeseen consequences and errors. Therefore, it is recommended to reject the proposal and require further development and testing before considering implementation. Specifically, the proposal should be revised to include more comprehensive testing, evaluation, and validation of the Self-Renewal feature, as well as more detailed information on how human oversight will be implemented and enforced.

### Votes

- **G-Q1-v2** = `GQ1v2-1FILE` — 3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in pro
  > This option is chosen because it prioritizes caution and careful evaluation of the Self-Renewal feature, rather than rushing to implement a potentially flawed system.
- **G-Q2-v2** = `GQ2v2-THREE` — Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct f
  > This option is chosen because it recognizes the importance of comprehensive testing and evaluation in ensuring the quality and reliability of the Self-Renewal feature.
- **G-Q3-v2** = `GQ3v2-APPINT` — App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is
  > This option is chosen because it prioritizes the long-term security and reliability of the system, while also providing a pragmatic solution for the short-term.
- **G-Q4-v2** = `GQ4v2-ENUM` — Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have 
  > This option is chosen because it recognizes the importance of flexibility and customization in the Self-Renewal feature, while also providing a default setting that prioritizes transparency and openness.
- **G-Q6-v2** = `UNMATCHED` — Per-product integer with default 0 is correct — operator decides 'what counts as worth my review time'; default of 0 preserves surface-everything posture for operators who don't tune.
  > This option is chosen because it prioritizes the needs and preferences of the operators, while also providing a default setting that ensures the feature is used effectively.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > This option is chosen because it recognizes that the proposal is incomplete and requires further development and testing before it can be considered for implementation.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Over-reliance on Claude**

> The proposal heavily relies on Claude for fix generation. This introduces a significant risk as Claude's outputs can be unpredictable and may not always adhere to the expected standards. This reliance could lead to inconsistent or incorrect fixes, which could compromise the integrity of the codebase.

**Objection 2 — Complexity of Discard Gates**

> The fix-discard gates in §4.4 introduce multiple layers of complexity. The gates are crucial for ensuring the quality of the fixes, but the implementation details are intricate and could be prone to errors. The proposal does not provide a clear mechanism for handling edge cases where a fix might pass some gates but fail others.

**Objection 3 — Security Risks with PAT**

> The use of fine-grained PATs, even as an interim fallback, poses security risks. PATs are less secure compared to GitHub Apps, and their usage could lead to unauthorized access or misuse. The proposal should emphasize the security benefits of using GitHub Apps and provide a clearer pathway for transitioning away from PATs.

**Worse-than-status-quo:** In the current system, human reviewers have full control over the code changes and can ensure the quality of the code. The proposed Self-Renewal Spec introduces automated fixes that could introduce subtle bugs or inconsistencies that are harder to detect, making the system worse than the status quo.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant risks and complexities that outweigh the benefits. The reliance on Claude for fix generation, the intricate discard gates, and the security risks associated with PATs are all valid concerns that need to be addressed. The system's current state, where human reviewers have full control, ensures higher code quality and security. Therefore, the proposal should be rejected or deferred until these issues are adequately addressed.

### Votes

- **G-Q1-v2** = `GQ1v2-1FILE` — 3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in pro
  > Expanding the file cap to 3 files introduces additional complexity and risk. It is prudent to start with a single-file scope to ensure the system's stability and reliability before expanding.
- **G-Q2-v2** = `REJECT` — REJECT
  > The proposed gates are complex and may not cover all edge cases. A more comprehensive set of gates or a different approach to ensuring code quality should be considered.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > Using PATs introduces security risks that are not present with GitHub Apps. Dropping the PAT fallback ensures a more secure and streamlined process.
- **G-Q4-v2** = `GQ4v2-HARD` — Over-engineered — Phase A should hard-code ALWAYS_OPEN (transparency-first) until usage da
  > Introducing configurable flags for every minor decision adds unnecessary complexity. Hard-coding ALWAYS_OPEN ensures transparency and simplicity.
- **G-Q6-v2** = `GQ6v2-COLL` — Threshold mechanism is redundant with G-Q4 DISCARD_ON_NEGATIVE — drop per-product integer;
  > The threshold mechanism overlaps with the negative-delta policy, adding unnecessary complexity. Collapsing into a single 3-state enum simplifies the decision-making process.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > The proposal introduces complexities and risks that need to be addressed before promotion. Specifically, the reliance on Claude and the security risks associated with PATs are significant concerns that require revision.

---

## Slot 5 — openrouter:amazon/nova-pro-v1 — state: `TANGENTIAL`

**Invalid reason:** 5/6 votes parsed

### Adversarial pass

**Objection 1 — Credential Management**

> The proposal relies on a fine-grained PAT as an interim fallback, which could pose security risks if not managed properly. The fallback should be removed as soon as possible to avoid potential vulnerabilities.

**Objection 2 — Limited Scope**

> The current scope of the proposal is limited to single-file fixes, which may not be sufficient for more complex issues that require multi-file changes.

**Objection 3 — Human Dependency**

> The proposal heavily relies on human review for merging PRs and catching regressions, which could introduce delays and inconsistencies in the renewal process.

**Worse-than-status-quo:** If the human reviewer is unavailable or makes an error, the renewal process could be delayed or result in a broken product, making the system worse than the status quo.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant changes to the renewal process without sufficient testing and validation. The reliance on human review and the interim PAT fallback could introduce security risks and delays, making it unsuitable for promotion at this time.

### Votes

- **G-Q1-v2** = `GQ1v2-3FILE` — 3-file cap with diff-parse-time enforcement is correct — covers common multi-file patterns
  > The 3-file cap provides a balance between allowing necessary multi-file fixes and preventing excessive scope.
- **G-Q2-v2** = `GQ2v2-THREE` — Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct f
  > The three MUST gates provide a comprehensive set of checks to ensure the quality of the fixes.
- **G-Q3-v2** = `GQ3v2-APPINT` — App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is
  > The GitHub App provides a more secure and scalable solution, while the PAT fallback allows for a smooth transition.
- **G-Q4-v2** = `GQ4v2-ENUM` — Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have 
  > Allowing operators to choose the negative-delta policy provides flexibility and accommodates different product needs.
- **G-Q6-v2** = `UNMATCHED` — Per-product integer with default 0 is correct — operator decides 'what counts as worth my review time'; default of 0 preserves surface-everything posture for operators who don't tune.
  > The default of 0 allows operators to review all changes, while still providing the option to set a higher threshold if desired.
- **G-Q7-v2** = `REJECT` — REJECT
  > The proposal introduces significant changes without sufficient testing and validation, and relies heavily on human review, making it unsuitable for promotion at this time.

---

## Slot 6 — openrouter:google/gemini-2.0-flash-001 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential Fallback Complexity**

> §3.2 introduces significant complexity with the GitHub App primary and PAT fallback.  Managing two credential paths increases the attack surface and operational overhead, especially during the transition period. The logic for selecting and validating the correct credential adds potential for errors and vulnerabilities.

**Objection 2 — Limited Regression Detection**

> §2 acknowledges the inability to guarantee no regressions, relying heavily on human review.  While §7.5 mentions Phase D will address this, the current reliance on human review is a significant risk, especially as the number of automated fixes increases. The test suite may not cover all edge cases, and visual regressions can easily be missed.

**Objection 3 — Re-assessment Cost**

> §6.2 and Note 3 highlight the cost of re-running the full 8-step pipeline for re-assessment.  This doubles the assessment cost and significantly increases the overall cost of the Self-Renewal cycle.  The cost may become prohibitive, especially for products with frequent renewal runs.

**Objection 4 — Preview Smoke Test Weakness**

> §4.4 (c) defines the preview smoke test as checking for HTTP 2xx and at least one key DOM element. The default DOM element check of `['html', 'body']` is effectively useless.  Even with stricter selectors, this provides minimal assurance that the preview is actually functional or visually correct.

**Worse-than-status-quo:** If the Self-Renewal process introduces regressions that are not caught by the limited testing and human review, it could lead to broken production deployments and a degradation of the overall system. This would be worse than the current state where issues are identified but not automatically fixed.

**Precedent:** no precedent known

### Rejection steelman

> While the proposal aims to automate the fix-and-preview cycle, the reliance on human review for regression detection and the complexity of the credential fallback mechanism introduce significant risks. The cost of re-assessment and the weakness of the preview smoke test further undermine the value proposition. Deferring the proposal would allow for a more thorough evaluation of these risks and a refinement of the testing and credential management strategies.

### Votes

- **G-Q1-v2** = `GQ1v2-LOC` — File-count framing misses the real risk — Phase A should cap by total diff hunk count or L
  > Limiting by file count is arbitrary. A small change across many files is less risky than a large change in a single file. LOC or hunk count provides a better measure of complexity.
- **G-Q2-v2** = `GQ2v2-MORE` — Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (sc
  > Accessibility and visual regressions are critical aspects of quality. Failing to include these in the MUST gates leaves a significant gap in the automated testing process.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > The PAT fallback introduces unnecessary complexity and security risks. Enforcing App-only from day one simplifies the credential management and reduces the attack surface.
- **G-Q4-v2** = `GQ4v2-HARD` — Over-engineered — Phase A should hard-code ALWAYS_OPEN (transparency-first) until usage da
  > Configurability should be added only when there is a clear need. Starting with ALWAYS_OPEN simplifies the initial implementation and allows for data-driven decisions about future configurability.
- **G-Q6-v2** = `GQ6v2-LAYER` — Threshold should be per-layer not just delta_total — operators may care about L1 Functiona
  > A single total delta can mask regressions in specific layers. Providing per-layer thresholds allows operators to focus on the areas that are most important to them.
- **G-Q7-v2** = `GQ7v2-RESV` — Promote-with-Reservations — 5 conditions addressed but Panel surfaces residual issues that
  > The proposal addresses the previous conditions, but the issues with regression detection, credential complexity, re-assessment cost, and preview smoke test weakness warrant careful tracking during the engineering dispatch.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `TANGENTIAL`

**Invalid reason:** 5/6 votes parsed

### Adversarial pass

**Objection 1 — Insufficient Preview Smoke Test**

> §4.4's preview smoke test only checks HTTP 2xx and presence of generic DOM elements like 'html' or 'body'. This fails to detect functional regressions in complex applications. For example, a broken checkout flow would pass this gate while being functionally unusable. The default selectors are too permissive to provide meaningful validation before PR creation.

**Objection 2 — PAT Fallback Security Risk**

> §3.2's interim PAT fallback introduces long-lived credentials stored in Doppler, contradicting the memory-only principle in §8.1. The branch-scoping relies on operator-configured GitHub protections, which may be misconfigured. This creates an attack surface window before Phase B removal, especially since the fallback is triggered automatically when App installation lags.

**Objection 3 — Delta Threshold Policy Conflict**

> §6.4's selfRenewalMinimumDelta and selfRenewalNegativeDeltaPolicy interact poorly. A negative delta below the minimum threshold would trigger branch deletion without audit trail differentiation from positive-but-small deltas. This conflates two distinct failure modes in governance_record_entry, reducing diagnostic value for operators troubleshooting regressions.

**Objection 4 — Re-assessment Cost Blindspot**

> Note 3 acknowledges doubled pipeline costs but provides no mitigation strategy. For products with frequent findings, the $0.60-$4.00 per-run cost could accumulate rapidly without budget controls. The spec lacks integration with Orchestra's cost dashboard or alerting mechanisms, risking unexpected operational expenses.

**Worse-than-status-quo:** If the preview smoke test passes but introduces subtle business logic flaws (e.g., miscalculated pricing), operators might merge PRs based on positive delta scores. This could deploy broken functionality to production faster than manual review, whereas the status quo's slower human process would likely catch such issues during code examination.

**Precedent:** GitHub Actions token leakage incidents (2022-2023) where long-lived credentials stored in Doppler equivalents were exfiltrated via environment variable mishandling, leading to repository compromises. Similar risks exist with PAT fallback despite scrubCredentials() protections.

### Rejection steelman

> The proposal introduces substantial new attack surfaces (GitHub write access, PAT storage) and cost liabilities (doubled pipeline runs) without commensurate safety mechanisms. The discard gates remain easily gameable—LLMs could satisfy DOM checks while breaking key flows—and the per-product configuration complexity risks misconfiguration. Given the skeleton state of Agent #3, deferring until Phase A proves its security invariants in staging would be prudent.

### Votes

- **G-Q1-v2** = `GQ1v2-LOC` — File-count framing misses the real risk — Phase A should cap by total diff hunk count or L
  > A 3-file change could still introduce massive refactors (e.g., 500+ LOC). LOC/hunk limits directly constrain change magnitude, aligning better with human review capacity.
- **G-Q2-v2** = `GQ2v2-MORE` — Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (sc
  > Current gates miss UI-layer regressions critical for operator trust. Axe-core is lightweight; screenshot diffs could sample key pages to catch rendering breaks.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > The interim PAT creates immediate security debt. Installation friction is a feature forcing explicit operator consent, not a bug.
- **G-Q4-v2** = `GQ4v2-ENUM` — Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have 
  > Operators managing critical systems may need to see regressions immediately, while others may filter noise. The enum preserves flexibility without overcomplication.
- **G-Q6-v2** = `UNMATCHED` — Per-product integer with default 0 is correct — operator decides 'what counts as worth my review time'; default of 0 preserves surface-everything posture for operators who don't tune.
  > MinimumDelta complements NegativeDeltaPolicy by filtering trivial wins. Per-layer thresholds would overcomplicate Phase A.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > Q3's PAT fallback introduces security flaws, and Q2's smoke test remains inadequate. These require resolution before promotion.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Preview-before-PR deadlocks flow**

> §5.5 requires the Vercel preview to be live before the PR is opened, but §4.4 makes preview smoke a MUST gate and §5.5 says a failed preview can still yield a draft PR. Those rules conflict operationally: if preview build failure is what the operator most needs to inspect, the spec both forbids opening a PR and then immediately allows a draft PR, creating an ambiguous control path and likely branch clutter.

**Objection 2 — Two credential paths expand attack surface**

> §3.2 keeps both GitHub App and PAT fallback in Phase A, with different storage, authorization, and branch-protection assumptions. That increases the number of ways a run can leak or mis-scope credentials, and the fallback is especially risky because it preserves a long-lived machine-user path precisely in the phase that is supposed to de-risk automation.

**Objection 3 — Delta thresholds can hide regressions**

> §6.4 lets operators set `selfRenewalMinimumDelta` above zero and also optionally `DISCARD_ON_NEGATIVE`, which means runs can be suppressed before a PR is ever opened. Combined with §6.5 making the audit trail the source of truth, this can systematically hide small but important regressions from human review even when the PR preview would have revealed them.

**Objection 4 — Three-file cap misses semantic risk**

> §4.3 uses file count as the primary safety boundary, but a 2-file change can still be a major architectural mutation while a 6-file patch can be a trivial doc/string fix. The spec relies on diff-parse-time enforcement, yet the real risk surface is lines changed, coupling introduced, and dependency edges touched, not the raw number of files.

**Worse-than-status-quo:** If Self-Renewal starts auto-fixing, opening previews, and then suppresses PR creation whenever the preview build or delta threshold fails, operators may lose the visible paper trail they currently get from a pure analysis-only system. In that scenario the system produces hidden branch churn and partial audit records without delivering a reviewable artifact, which is worse than the current analyzer-only status quo.

**Precedent:** GitHub Actions and similar CI/CD bots have repeatedly created branch-management and credential-scoping incidents when mixing bot tokens, branch protection exceptions, and auto-generated PRs; a well-known class of failures is automation creating or updating PRs in ways maintainers did not expect, especially when fallback credentials exist.

### Rejection steelman

> The strongest case for rejecting or deferring this spec is that it tries to land too many high-risk capabilities at once: source acquisition, code mutation, preview deployment, re-assessment, scoring, and policy-driven PR suppression. Each layer has distinct failure modes, and the spec still depends on a human to catch regressions, which means the complexity cost may exceed the marginal benefit over the current analyzer-only flow. Deferring until the authority model, credential model, and suppression rules are simpler would likely reduce operational risk and make failures easier to diagnose.

### Votes

- **G-Q1-v2** = `GQ1v2-1FILE` — 3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in pro
  > The spec’s own safety story rests on Phase A being narrowly bounded, but the 3-file allowance broadens blast radius before there is live evidence. Single-file scope is easier to reason about and aligns better with the draft’s claim that Phase B should absorb broader refactors.
- **G-Q2-v2** = `GQ2v2-THREE` — Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct f
  > These gates are complementary rather than duplicative, and the preview-smoke check adds a real-world rendering signal that tests alone cannot provide. The spec also appropriately skips typecheck when no tsconfig exists, avoiding a universal false blocker for non-TS repos.
- **G-Q3-v2** = `GQ3v2-APPINT` — App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is
  > This is the least disruptive migration path while still making the secure credential model the long-term default. The fallback is ugly, but the spec includes a concrete retirement trigger rather than leaving PAT use open-ended.
- **G-Q4-v2** = `GQ4v2-ENUM` — Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have 
  > This policy is genuinely a product-level preference, not a universal invariant, so making it configurable is defensible. The default preserves transparency while allowing bandwidth-constrained teams to suppress low-value regression PRs.
- **G-Q6-v2** = `GQ6v2-PROD` — Per-product integer with default 0 is correct — operator decides "what counts as worth my 
  > A default of zero avoids silently hiding borderline improvements and keeps the system maximally observable unless the operator opts out. Thresholding by total delta is crude, but acceptable as a first-order control as long as the audit trail remains intact.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > The preview-before-PR / preview-failure draft-PR behavior is not fully coherent, and the combined policy knobs for negative delta and minimum delta can suppress important review artifacts. The architecture is promising, but these inconsistencies mean it is not yet ready for promotion as written.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Overly complex fix generation**

> §4.4 introduces multiple MUST gates (tests, typecheck, preview-smoke) that may be too strict or too lax, potentially leading to false positives or negatives in fix validation.

**Objection 2 — Credential management risk**

> §3.2 retains a fine-grained PAT as an interim fallback, which adds attack surface and may be forgotten in Phase B, potentially leading to security vulnerabilities.

**Objection 3 — Lack of explicit regression handling**

> §2 and §7.5 highlight that Self-Renewal cannot guarantee no regressions until Phase D, relying on human review as the canonical regression gate, which may be error-prone.

**Worse-than-status-quo:** If the fix generation and validation gates are too strict, it may lead to a significant number of false negatives, making the system worse than the status quo by missing potential fixes.

**Precedent:** Similar complex AI-driven code generation systems have faced challenges with false positives/negatives and security vulnerabilities, such as GitHub Copilot's early versions.

### Rejection steelman

> The proposal's reliance on multiple complex gates and AI-driven fix generation without a clear mechanism for handling regressions or ensuring the quality of generated fixes across different products and environments could lead to inconsistent outcomes and potential security risks.

### Votes

- **G-Q1-v2** = `GQ1v2-3FILE` — 3-file cap with diff-parse-time enforcement is correct — covers common multi-file patterns
  > The 3-file cap seems reasonable for Phase A as it balances the need for multi-file fixes with the risk of scope sprawl.
- **G-Q2-v2** = `GQ2v2-THREE` — Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct f
  > The three gates cover different aspects of potential regressions, making them complementary and necessary for robust validation.
- **G-Q3-v2** = `GQ3v2-APPINT` — App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is
  > Using the GitHub App as primary with a PAT fallback for migration seems like a reasonable approach, given the need for a smooth transition.
- **G-Q4-v2** = `GQ4v2-ENUM` — Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have 
  > Allowing operators to choose based on their product's needs is sensible, and the default setting ensures transparency.
- **G-Q6-v2** = `GQ6v2-PROD` — Per-product integer with default 0 is correct — operator decides "what counts as worth my 
  > This approach gives operators flexibility while maintaining a default that surfaces all results.
- **G-Q7-v2** = `GQ7v2-RESV` — Promote-with-Reservations — 5 conditions addressed but Panel surfaces residual issues that
  > While the 5 conditions are addressed, there are still concerns regarding the complexity of the gates and the reliance on human review for regression handling that should be tracked.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §3.2 App/PAT dual credential paths**

> The primary GitHub App + documented INTERIM PAT fallback in §3.2 creates two credential surfaces with separate Doppler paths and selection logic; the fallback emits governance_record_entry on every use but still requires branch-protection rules and machine-user setup that must be manually maintained until Phase B deletes it.

**Objection 2 — §6.4 negative-delta + minimum-delta policies**

> ProductRegistry.selfRenewalNegativeDeltaPolicy and selfRenewalMinimumDelta allow per-product tuning after the fact, yet the decision sequence in §6.4 still opens PRs under ALWAYS_OPEN even when delta_total ≤ 0; this can flood the operator inbox with regression banners while the audit trail is preserved only in governance_record_entry.

**Objection 3 — Note 1 source-acquisition duplication**

> api/_lib/sourceAcquisition.js (tarball, read-only) and §3.5 (Contents + Git Data API, read-write) both read the same PRODUCT_<productId>_GITHUB_PAT credential; the spec only notes that Phase A should refactor them but provides no unified boundary or single-run credential lifetime guarantee.

**Worse-than-status-quo:** If the PAT fallback is used on even one product and the branch-protection rules are misconfigured, a compromised Self-Renewal run can push to flowai/* branches that later get merged by a distracted reviewer, introducing untested code into production faster than the prior manual-fix workflow.

**Precedent:** GitHub's 2023 PAT rotation incident showed that long-lived fine-grained tokens scoped to specific branches still leaked via logs and CI artifacts when dual credential paths existed without a single enforced boundary.

### Rejection steelman

> The proposal layers five new per-product registry fields, two credential paths, three MUST gates, and a full re-assessment pipeline on top of an already complex Self-Governance and Clearance system; this increases attack surface and operational surface area before any production data shows that the simpler single-file analyzer in the current Agent #3 skeleton is insufficient.

### Votes

- **G-Q1-v2** = `GQ1v2-1FILE` — 3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in pro
  > The parse-time enforcement is welcome but the jump from 1 to 3 files still risks scope sprawl before real usage data exists.
- **G-Q2-v2** = `GQ2v2-MORE` — Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (sc
  > Adding typecheck and preview-smoke is positive but still omits common regression classes that human reviewers will otherwise have to catch manually.
- **G-Q3-v2** = `GQ3v2-APPONLY` — Drop the PAT fallback entirely from Phase A — App-only from day one; products without App 
  > The interim path duplicates credential handling and creates exactly the dual-surface risk highlighted in the adversarial pass.
- **G-Q4-v2** = `GQ4v2-AUTH` — Wrong axis — policy should not be operator-configurable at all; tie to Authority posture (
  > Per-product knobs increase configuration debt without addressing the core supervised-authority contract already defined elsewhere.
- **G-Q6-v2** = `GQ6v2-COLL` — Threshold mechanism is redundant with G-Q4 DISCARD_ON_NEGATIVE — drop per-product integer;
  > Two separate numeric and enum controls on the same delta value create overlapping and potentially conflicting policy surfaces.
- **G-Q7-v2** = `GQ7v2-REV` — Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defec
  > The credential-duplication and policy-overlap issues introduced by the v2 edits must be resolved before any engineering dispatch.
