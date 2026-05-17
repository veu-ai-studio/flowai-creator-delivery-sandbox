# Panel — Self-Renewal v4 ADVERSARIAL RATIFICATION (2026-05-17)

**Spec:** docs/specs/SELF_RENEWAL_SPEC.md (commit ab01583)
**Mode:** ADVERSARIAL — locked W5b format. Re-rates G-Q1/G-Q3/G-Q4/G-Q6/G-Q7. G-Q2 + G-Q5 carry RATIFIED.
**Started:** 2026-05-17T16:38:11.423Z  ·  **Finished:** 2026-05-17T16:40:09.788Z
**Bundle:** 107983 chars (compact §10+§11+§15.1 canonical + full v4 spec).
**Audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"amazon":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}

## 🚨 RATIFICATION VERDICT — `NOT_RATIFIED`
5 of 5 re-rated question(s) lack clear Panel majority on draft.

## DISSENT-FLOOR
Alignment 12/45 = **26.7%** · objections **33** · ✅ PASS

## Per-question tally
| Q | Top key | Top / Engaged | Verdict |
|---|---|---|---|
| **G-Q1** | `GQ1v4-A` | 3 / 9 | `SPLIT` |
| **G-Q3** | `GQ3v4-C` | 4 / 9 | `PLURALITY_GQ3v4-C` |
| **G-Q4** | `GQ4v4-A` | 4 / 9 | `PLURALITY_GQ4v4-A` |
| **G-Q6** | `GQ6v4-D` | 4 / 9 | `PLURALITY_GQ6v4-D` |
| **G-Q7** | `GQ7v4-B` | 4 / 9 | `SPLIT` |

## Per-question detail
### G-Q1 — Self-Renewal §4.3 v4 R4 — Phase B graduation requires three-condition AND-gate (≥30 days production + zero material incidents + NEW Panel ratification of Phase B spec); per-product `selfRenewalScopeRollback` boolean (default false) allows operators to revert any product back to MAX_FILES=1 even after Phase B ships. Is this the right scope-graduation model?

Tally (ENGAGED-only, 9):
  - `GQ1v4-A` "Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversarial review at each authority expansion; per-product rollback bounds blast radiu"  →  **3**
  - `GQ1v4-B` "Insufficient — Phase A should also require per-finding-category opt-in for multi-file in Phase B (e.g. "this product's accessibility findings can use multi-file, but performance fi"  →  **3**
  - `GQ1v4-C` "Over-engineered — the per-product selfRenewalScopeRollback boolean is config-creep. Phase B should ship as fleet-wide MAX_FILES=3 with no per-product override; a misbehaving produc"  →  **3**
  - `GQ1v4-D` "Graduation conditions correct but the "material incident" definition (regression revert, credential exfiltration, 5× cost overrun) is too narrow — should also include "operator mer"  →  **0**

**Verdict:** `SPLIT` — top tie at 3 between GQ1v4-A / GQ1v4-B / GQ1v4-C.

### G-Q3 — Self-Renewal §3.2 v4 R3 — GitHub App as default + branch-scoped PAT fallback behind per-product feature flag `selfRenewalCredentialMode ∈ { app (default), pat_fallback }`. PAT must be branch-scoped to flowai/* via dedicated machine user + branch protection. App permission manifest pinned in-repo at .github/flowai-app-manifest.yml. Is this the right credential model for Phase A?

Tally (ENGAGED-only, 9):
  - `GQ3v4-A` "App-default + opt-in PAT fallback + in-repo manifest is correct — keeps the safe path as default, gives stuck-mid-install operators an escape hatch, and manifest pinning means oper"  →  **2**
  - `GQ3v4-B` "Insufficient — Phase A should additionally require PAT fallback usage to expire automatically (selfRenewalCredentialMode auto-reverts to "app" after 30 days of pat_fallback usage),"  →  **3**
  - `GQ3v4-C` "Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 eliminated; Phase A should keep App-only and accept the mid-install friction. The man"  →  **4**
  - `GQ3v4-D` "Wrong shape on the manifest — pinning at .github/flowai-app-manifest.yml inside the FlowAI repo doesn't help operators (they don't read FlowAI's repo); the manifest should be cross"  →  **0**

**Verdict:** `PLURALITY_GQ3v4-C` — 4 of 9 on GQ3v4-C (below 7/10 quorum).

### G-Q4 — Self-Renewal §6.4 v4 R2 + R8 — reverts v3's `selfRenewalOpenPolicy` enum; restores v2 two-field model: `selfRenewalNegativeDeltaPolicy` (ALWAYS_OPEN default | DISCARD_ON_NEGATIVE) + `selfRenewalMinimumDelta` (integer, default 0). Cross-field validation (R2) rejects DISCARD_ON_NEGATIVE + selfRenewalMinimumDelta < 0 at registry-write time. Silent-close audit invariant (R8) makes full pre/post/delta governance_record_entry emission a HARD MUST for both discarded_negative_delta and below_threshold paths. Is this the right shape?

Tally (ENGAGED-only, 9):
  - `GQ4v4-A` "Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give operators independent negative-delta and minimum-improvement controls; the cross-fiel"  →  **4**
  - `GQ4v4-B` "Insufficient — Phase A should expose `selfRenewalMinimumPerLayerDelta` map (per-Five-Layer minima) so an operator can require improvement on a specific layer (e.g. {L1:0,L2:0,L3:0,"  →  **2**
  - `GQ4v4-C` "Over-engineered — Phase A should ship DISCARD_ON_NEGATIVE policy AS THE DEFAULT (not ALWAYS_OPEN); the audit-log invariant is enough to surface negative-delta runs to operators who"  →  **1**
  - `GQ4v4-D` "Wrong invariant on R8 — silent-close audit emissions should NOT include the full preScore/postScore payload; that bloats ProductSSOT.governance_record over time and operators rarel"  →  **2**

**Verdict:** `PLURALITY_GQ4v4-A` — 4 of 9 on GQ4v4-A (below 7/10 quorum).

### G-Q6 — Self-Renewal §6.4 v4 R1 — restores configurability via `ProductRegistry.selfRenewalSubstantialThreshold` (integer, default +5, operator-configurable per product). v3's hardcoded +5 removed. Threshold controls when delta is labelled "substantial improvement" in PR body + audit-log entries. Cross-field validation requires selfRenewalSubstantialThreshold > selfRenewalMinimumDelta. Is configurable +5-default the right shape?

Tally (ENGAGED-only, 9):
  - `GQ6v4-A` "Configurable integer with +5 default is correct — operators tune "substantial" to their product's value model (e.g. raise to +10 for products where each Five-Layer point is a major"  →  **3**
  - `GQ6v4-B` "Insufficient — Phase A should expose `selfRenewalModestThreshold` (integer, default +1) so PR-body labels can distinguish "no improvement / modest / substantial" with three bands i"  →  **1**
  - `GQ6v4-C` "Over-engineered — the substantial-vs-modest label is cosmetic; collapse selfRenewalSubstantialThreshold into selfRenewalMinimumDelta (one field, one knob) and let operators who wan"  →  **1**
  - `GQ6v4-D` "Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict; operators may legitimately want selfRenewalMinimumDelta=5 (open only substanti"  →  **4**

**Verdict:** `PLURALITY_GQ6v4-D` — 4 of 9 on GQ6v4-D (below 7/10 quorum).

### G-Q7 — Self-Renewal v4 disposition: v4 applies 8 surgical fixes (R1 configurable substantial threshold, R2 two-field model restored, R3 PAT fallback behind per-product flag + manifest, R4 three-condition graduation + scope-rollback, R5 rate cap + runaway detector, R6 nightly branch cleanup, R7 smoke-selector validation at registry-write time, R8 silent-close audit invariant) to address the conditions from v3 NOT_RATIFIED. G-Q2 + G-Q5 carried unchanged. Given all 8 conditions addressed, the appropriate Panel disposition for v4 is:

Tally (ENGAGED-only, 9):
  - `GQ7v4-A` "Promote — the 8 conditions are addressed cleanly and Option C v4 is ready for Phase A engineering dispatch."  →  **0**
  - `GQ7v4-B` "Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking)."  →  **4**
  - `GQ7v4-C` "Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect)."  →  **4**
  - `GQ7v4-D` "Reject — the 8 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement (specify the architectur"  →  **0**
  - `REJECT` (free-text) → 1

**Verdict:** `SPLIT` — top tie at 4 between GQ7v4-B / GQ7v4-C.


## All distinct objections (33)
**01. [Slot 1] Unvalidated Claude fix generation**

> §4.1 sends operator source code to Claude with no validation of the fix generation prompt template. A malicious finding could inject prompt instructions via the 'evidence' field, causing Claude to generate destructive diffs that pass syntax checks but introduce backdoors.

**02. [Slot 1] Preview URL crawl amplification attack**

> §6.2 re-runs the full 8-step pipeline including Agent #21's aggressive crawl against every preview URL. A single renewal run could trigger hundreds of crawl requests against the preview, potentially overwhelming Vercel's preview infrastructure or triggering rate limits.

**03. [Slot 1] Branch cleanup race condition**

> §5.7's nightly cleanup job checks for open PRs then deletes branches, but between the PR check and deletion, a new PR could be opened on that branch. The cleanup job lacks atomic branch-deletion-with-PR-check, risking deletion of branches with just-opened PRs.

**04. [Slot 1] Smoke selector injection via admin UI**

> §4.4.1 validates selectors at registry-write time using document.querySelector equivalents, but malicious operators could craft selectors that are valid CSS but execute expensive DOM traversals (e.g., ':has(:has(:has(...)))' deeply nested) causing preview smoke tests to timeout or consume excessive CPU.

**05. [Slot 2] Credential model complexity**

> Section §3.2 introduces a dual credential model with a GitHub App as the default and a PAT fallback. This complexity could lead to security risks if operators do not manage the PATs properly, especially since the PAT fallback can become a long-term default if not monitored.

**06. [Slot 2] Silent-close audit-log bloat**

> Section §6.4 mandates full pre/post/delta payloads in audit logs for silent-close paths. This could lead to significant bloat in the ProductSSOT.governance_record over time, making it difficult for operators to manage and review historical data.

**07. [Slot 2] Phase B graduation criteria**

> Section §4.3 requires a three-condition AND-gate for Phase B graduation, which may be overly restrictive and delay necessary improvements. The criteria could be simplified to ensure timely progression without compromising safety.

**08. [Slot 3] Lack of Human Oversight**

> The proposal relies heavily on automated decision-making, which may lead to unintended consequences without sufficient human oversight. Section §4.4 discusses the discard gates, but it is unclear how these gates will be effective in preventing harmful changes.

**09. [Slot 3] Insufficient Testing**

> The proposal mentions testing in §4.4, but it is unclear how comprehensive the testing will be, and whether it will cover all possible scenarios. This lack of testing may lead to regressions or other issues.

**10. [Slot 3] Security Risks**

> The proposal discusses security controls in §8, but it is unclear whether these controls will be sufficient to prevent security breaches. The use of GitHub PATs and Vercel previews may introduce additional security risks.

**11. [Slot 4] Complexity of Phase B Graduation**

> The proposed three-condition AND-gate for Phase B graduation introduces unnecessary complexity. The per-product `selfRenewalScopeRollback` boolean adds to this complexity, making the system harder to manage and understand. Simplifying the graduation process and removing the rollback boolean would make the system more straightforward and easier to maintain.

**12. [Slot 4] Security Risks with PAT Fallback**

> The inclusion of a branch-scoped PAT fallback introduces security risks. Despite the safeguards, using PATs can lead to credential leakage and unauthorized access. Keeping the GitHub App as the only credential model would eliminate this risk and ensure better security.

**13. [Slot 4] Inadequate Delta Policy Validation**

> The cross-field validation for `selfRenewalNegativeDeltaPolicy` and `selfRenewalMinimumDelta` is insufficient. The proposal does not account for scenarios where an operator might want to set a minimum delta threshold that is negative. This could lead to inconsistent behavior and potential misuse of the system.

**14. [Slot 5] Credential Security**

> The proposal's reliance on GitHub Personal Access Tokens (PATs) for source acquisition and PR creation introduces a significant security risk. PATs are long-lived and have broad permissions, making them a prime target for attackers. The proposal's mitigation of using branch-scoped PATs and a dedicated machine user is insufficient, as it still requires operators to manually provision and manage these tokens. This increases the attack surface and the likelihood of credential leakage or misuse.

**15. [Slot 5] Limited Scope**

> The proposal limits Phase A to single-file fix generation, which may not be sufficient to address complex issues that require multi-file changes. This limitation could result in incomplete or ineffective fixes, leading to a degraded user experience and reduced trust in the Self-Renewal system.

**16. [Slot 5] Regression Risk**

> The proposal acknowledges that it cannot guarantee that fixes will not introduce regressions. While it includes several gates to catch regressions, such as test suite, typecheck, and preview smoke tests, these gates may not be sufficient to catch all types of regressions. This could result in the deployment of broken code, leading to production issues and a loss of operator trust.

**17. [Slot 6] Credential Rotation**

> The proposal lacks a mechanism for automatic credential rotation.  If a PAT or App key is compromised, there's no automated way to force a refresh across all products using it, requiring manual intervention and potentially leading to prolonged exposure.  This is especially concerning with the PAT fallback.

**18. [Slot 6] Runaway Detection Incompleteness**

> The runaway detector in §4.7 only considers consecutive failures of the *same* gate.  A product could still experience a runaway scenario if it fails different gates consecutively, leading to excessive resource consumption and potentially broken code being proposed without triggering the auto-disable mechanism.  This limits the effectiveness of the runaway protection.

**19. [Slot 6] Lack of Input Validation**

> While the proposal validates CSS selectors at registry-write time (§4.4.1), it lacks sufficient input validation for other operator-configurable parameters.  For example, `githubRepoUrl` is not validated for format or existence, potentially leading to runtime errors and a degraded user experience.  More comprehensive input validation is needed.

**20. [Slot 6] Incomplete Cost Controls**

> While Note 3 acknowledges the cost of re-assessment, the proposal doesn't include any mechanisms to limit the overall cost of Self-Renewal.  There's no budget control or circuit breaker to prevent excessive spending if multiple products experience high finding-throughput, potentially leading to unexpected cost overruns.  The `selfRenewalMaxPerDay` only limits runs, not cost.

**21. [Slot 7] PAT fallback security regression**

> §3.2 reintroduces branch-scoped PAT fallback despite v3 eliminating long-lived tokens. This expands attack surface: PATs stored in Doppler are long-lived credentials vulnerable to exfiltration, contradicting AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant 2. The 'flowai-self-renewal' machine user with branch-scoped write creates new credential management overhead and potential misconfiguration risks.

**22. [Slot 7] Re-assessment cost explosion**

> §6.2 mandates full 8-step pipeline re-run per renewal, doubling assessment costs. Note 3 estimates $0.65-$5.00/run, unsustainable at scale. No cost-throttling mechanism exists beyond hard rate caps, creating runaway expenditure risk especially for high-finding-density products. This violates CA-9-C cost governance principles.

**23. [Slot 7] Silent-close audit bloat**

> R8 mandates full pre/post/delta payload in governance_record_entry for every silent-close run. §6.4 shows each entry contains 15+ numerical fields. At proposed default settings, high-volume products could generate hundreds of entries weekly, exponentially inflating ProductSSOT storage and degrading query performance without cold-storage strategy.

**24. [Slot 7] Smoke selector runtime fragility**

> §4.4.1 validates CSS selectors at write-time but runtime execution (§4.4c) lacks timeout/retry for dynamic content. Selectors like '#root' may fail during hydration, causing false-positive discards. No error budget for network flakes or Vercel edge-case rendering, making preview-smoke gate unreliable for SSR frameworks.

**25. [Slot 8] PAT fallback reintroduces latent risk**

> Section §3.2 adds `selfRenewalCredentialMode='pat_fallback'` back into Phase A after v3 explicitly removed it. Even with branch-scoping claims, the design depends on branch-protection behavior and a dedicated machine user, which are both easier to misconfigure than the App path and create a long-lived credential surface that the App model avoids.

**26. [Slot 8] Preview-before-PR can deadlock runs**

> Section §5.5 requires the Vercel preview to be live and smoke-tested before the PR is opened. If Vercel is degraded, the branch is pushed but no PR exists yet, leaving the operator with an invisible in-flight change and forcing a draft PR fallback that contradicts the stated ordering and can confuse review-state semantics.

**27. [Slot 8] Silent-close audit payload may bloat SSOT**

> Section §6.4 / §6.5 mandates full pre/post/delta payloads even when no PR opens. That is useful for transparency, but the proposal stores these as `governance_record_entry` rows on every silent-close path, which can turn routine negative runs into a high-volume history and make ProductSSOT operationally noisy over time.

**28. [Slot 9] Insufficient error handling in source acquisition**

> §3.6 lists 6 abort conditions for source acquisition, but does not specify how these errors are propagated to the operator or handled in subsequent renewal runs. For example, if a PAT scope mismatch occurs (§3.6), the run aborts with 'pat_scope_mismatch', but it's unclear if the operator is notified or if the error is logged for later review.

**29. [Slot 9] Lack of explicit validation for Vercel preview URL**

> §5.5 requires the Vercel preview to be live before opening the PR, but the validation only checks for HTTP 2xx status. It does not verify the content or functionality of the preview, which could lead to a misleading PR if the preview is broken but returns a 2xx status.

**30. [Slot 9] Unclear handling of consecutive renewal failures**

> §4.7 introduces a runaway detector that disables Self-Renewal after N consecutive same-gate failures. However, it's unclear how this interacts with the hard renewal rate cap (§4.7) or what happens if the operator doesn't re-enable Self-Renewal after auto-disable. For instance, are there any notifications or logs that persist after auto-disable to help the operator diagnose the issue?

**31. [Slot 10] §4.3 Phase B AND-gate undefined**

> The three-condition graduation (≥30 days + zero incidents + new Panel ratification) in §4.3 names no integration point with CANONICAL_REFERENCE §15.1 Agent #3 Executor or §10.2 Human Gates; a new ratification dispatch could bypass the existing Approval gate at 95/95 evaluation.

**32. [Slot 10] §4.7 runaway detector overlaps Self-Audit**

> selfRenewalRunawayThreshold (default 3) auto-disables on consecutive same-gate failures but §10.1 Self-Audit already scores Security Posture 0–10 and triggers Self-Protection; no defined precedence or merge rule between the two auto-disable paths.

**33. [Slot 10] §3.5 Contents API vs Clearance Data Export**

> §3.5 writes via GitHub Contents API after reading Doppler PRODUCT_<id>_GITHUB_PAT, yet CANONICAL_REFERENCE §11 step 4 Data Export must emit full ProductSSOT JSON including governance_record; no scrub or filter prevents PAT metadata leakage into the exported payload.

## Per-reviewer
## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Unvalidated Claude fix generation**

> §4.1 sends operator source code to Claude with no validation of the fix generation prompt template. A malicious finding could inject prompt instructions via the 'evidence' field, causing Claude to generate destructive diffs that pass syntax checks but introduce backdoors.

**Objection 2 — Preview URL crawl amplification attack**

> §6.2 re-runs the full 8-step pipeline including Agent #21's aggressive crawl against every preview URL. A single renewal run could trigger hundreds of crawl requests against the preview, potentially overwhelming Vercel's preview infrastructure or triggering rate limits.

**Objection 3 — Branch cleanup race condition**

> §5.7's nightly cleanup job checks for open PRs then deletes branches, but between the PR check and deletion, a new PR could be opened on that branch. The cleanup job lacks atomic branch-deletion-with-PR-check, risking deletion of branches with just-opened PRs.

**Objection 4 — Smoke selector injection via admin UI**

> §4.4.1 validates selectors at registry-write time using document.querySelector equivalents, but malicious operators could craft selectors that are valid CSS but execute expensive DOM traversals (e.g., ':has(:has(:has(...)))' deeply nested) causing preview smoke tests to timeout or consume excessive CPU.

**Worse-than-status-quo:** The re-assessment cost doubling (§6.2 + Note 3) means every Self-Renewal run costs $0.65-$5.00, and with the default rate cap of 1/day across 5 products, operators could burn $25/day on automated PR generation that they might never merge, versus status quo of manual fixes costing only engineer time.

**Precedent:** Dependabot's early versions generated security fix PRs that passed CI but introduced subtle compatibility regressions, leading to 'Dependabot fatigue' where maintainers auto-closed PRs without review - similar risk here with Self-Renewal generating syntactically correct but semantically problematic fixes.

### Rejection steelman

> Self-Renewal v4 introduces significant operational complexity (8 new ProductRegistry fields, dual credential paths, re-assessment costs) while providing no guarantee against regressions (§2, §7.5) and requiring human review of every PR anyway. The engineering effort (3-4 weeks per §9) would be better spent on improving the assessment pipeline's fix hints so developers can implement fixes faster, rather than automating fix generation that still requires full human validation.

### Votes

- **G-Q1** = `GQ1v4-A` — Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversa
  > The three-condition gate prevents premature authority expansion while the rollback mechanism provides necessary operational flexibility when specific products prove unsuitable for multi-file changes.
- **G-Q3** = `GQ3v4-B` — Insufficient — Phase A should additionally require PAT fallback usage to expire automatically (selfR
  > The PAT fallback creates a long-lived credential risk that operators may forget to migrate away from; automatic expiration forces intentional renewal of the less-secure path.
- **G-Q4** = `GQ4v4-A` — Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give opera
  > The two-field model provides necessary flexibility while the validation and audit requirements ensure configuration coherence and operational visibility.
- **G-Q6** = `GQ6v4-D` — Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict
  > The current validation prevents the reasonable configuration where operators only want PRs for substantial improvements, making every opened PR inherently substantial.
- **G-Q7** = `GQ7v4-B` — Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues th
  > While R1-R8 are addressed, the spec still has operational concerns around re-assessment costs, lack of regression guarantees, and the G-Q6 validation logic that should be tracked during implementation.

---

## Slot 2 — openrouter:openai/gpt-4o — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential model complexity**

> Section §3.2 introduces a dual credential model with a GitHub App as the default and a PAT fallback. This complexity could lead to security risks if operators do not manage the PATs properly, especially since the PAT fallback can become a long-term default if not monitored.

**Objection 2 — Silent-close audit-log bloat**

> Section §6.4 mandates full pre/post/delta payloads in audit logs for silent-close paths. This could lead to significant bloat in the ProductSSOT.governance_record over time, making it difficult for operators to manage and review historical data.

**Objection 3 — Phase B graduation criteria**

> Section §4.3 requires a three-condition AND-gate for Phase B graduation, which may be overly restrictive and delay necessary improvements. The criteria could be simplified to ensure timely progression without compromising safety.

**Worse-than-status-quo:** The introduction of a PAT fallback could lead to security vulnerabilities if operators fail to manage PATs properly, potentially exposing repositories to unauthorized access.

**Precedent:** The Equifax data breach in 2017 was partly due to inadequate patch management and credential handling, highlighting the risks of complex credential systems.

### Rejection steelman

> The proposal introduces significant complexity in credential management and audit logging, which could lead to security vulnerabilities and operational inefficiencies. The dual credential model with a PAT fallback increases the risk of long-lived token exposure, and the audit-log requirements could result in unmanageable data bloat. These issues suggest that the proposal may need further refinement before implementation.

### Votes

- **G-Q1** = `GQ1v4-C` — Over-engineered — the per-product selfRenewalScopeRollback boolean is config-creep. Phase B should s
  > The per-product rollback adds unnecessary complexity and could be managed at the engineering level instead.
- **G-Q3** = `GQ3v4-C` — Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 elimi
  > The PAT fallback reintroduces security risks that were previously mitigated by using the GitHub App exclusively.
- **G-Q4** = `GQ4v4-D` — Wrong invariant on R8 — silent-close audit emissions should NOT include the full preScore/postScore 
  > Including full pre/post scores in audit logs could lead to data bloat and inefficiencies in managing historical records.
- **G-Q6** = `GQ6v4-C` — Over-engineered — the substantial-vs-modest label is cosmetic; collapse selfRenewalSubstantialThresh
  > The distinction between substantial and modest improvements is largely cosmetic and could be simplified.
- **G-Q7** = `GQ7v4-C` — Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The credential model and audit-log requirements introduce potential security and operational issues that need addressing before promotion.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Lack of Human Oversight**

> The proposal relies heavily on automated decision-making, which may lead to unintended consequences without sufficient human oversight. Section §4.4 discusses the discard gates, but it is unclear how these gates will be effective in preventing harmful changes.

**Objection 2 — Insufficient Testing**

> The proposal mentions testing in §4.4, but it is unclear how comprehensive the testing will be, and whether it will cover all possible scenarios. This lack of testing may lead to regressions or other issues.

**Objection 3 — Security Risks**

> The proposal discusses security controls in §8, but it is unclear whether these controls will be sufficient to prevent security breaches. The use of GitHub PATs and Vercel previews may introduce additional security risks.

**Worse-than-status-quo:** The proposal may lead to a situation where the system is worse than the status quo if the automated decision-making and lack of human oversight result in unintended consequences, such as introducing security vulnerabilities or causing regressions.

**Precedent:** No precedent known

### Rejection steelman

> The proposal should be rejected because it relies too heavily on automated decision-making and lacks sufficient human oversight, which may lead to unintended consequences. Additionally, the testing and security controls may not be comprehensive enough to prevent regressions or security breaches.

### Votes

- **G-Q1** = `GQ1v4-B` — Insufficient — Phase A should also require per-finding-category opt-in for multi-file in Phase B (e.
  > This option is chosen because it highlights the need for more granular control over the scope of changes, which is essential for preventing unintended consequences.
- **G-Q3** = `GQ3v4-A` — App-default + opt-in PAT fallback + in-repo manifest is correct — keeps the safe path as default, gi
  > This option is chosen because it provides a balanced approach to credential management, allowing for flexibility while maintaining security.
- **G-Q4** = `GQ4v4-A` — Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give opera
  > This option is chosen because it provides a robust and transparent approach to delta scoring and audit logging.
- **G-Q6** = `GQ6v4-A` — Configurable integer with +5 default is correct — operators tune "substantial" to their product's va
  > This option is chosen because it provides flexibility and a sensible default value for the substantial threshold.
- **G-Q7** = `GQ7v4-B` — Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues th
  > This option is chosen because it acknowledges the progress made in addressing the conditions while also recognizing the need for ongoing scrutiny and potential improvements.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Complexity of Phase B Graduation**

> The proposed three-condition AND-gate for Phase B graduation introduces unnecessary complexity. The per-product `selfRenewalScopeRollback` boolean adds to this complexity, making the system harder to manage and understand. Simplifying the graduation process and removing the rollback boolean would make the system more straightforward and easier to maintain.

**Objection 2 — Security Risks with PAT Fallback**

> The inclusion of a branch-scoped PAT fallback introduces security risks. Despite the safeguards, using PATs can lead to credential leakage and unauthorized access. Keeping the GitHub App as the only credential model would eliminate this risk and ensure better security.

**Objection 3 — Inadequate Delta Policy Validation**

> The cross-field validation for `selfRenewalNegativeDeltaPolicy` and `selfRenewalMinimumDelta` is insufficient. The proposal does not account for scenarios where an operator might want to set a minimum delta threshold that is negative. This could lead to inconsistent behavior and potential misuse of the system.

**Worse-than-status-quo:** The proposed `selfRenewalRunawayThreshold` could lead to a situation where legitimate fixes are discarded due to consecutive failures, even if the issues are unrelated. This could result in important fixes being missed, making the system worse than the status quo where all fixes are considered.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant complexity and security risks that outweigh the benefits. The three-condition AND-gate for Phase B graduation and the per-product rollback boolean add unnecessary complexity. The PAT fallback introduces security risks that could lead to credential leakage. The delta policy validation is insufficient and could lead to inconsistent behavior. Additionally, the runaway detector could result in important fixes being missed. Given these issues, the proposal should be deferred until these concerns are adequately addressed.

### Votes

- **G-Q1** = `GQ1v4-C` — Over-engineered — the per-product selfRenewalScopeRollback boolean is config-creep. Phase B should s
  > The per-product rollback boolean adds unnecessary complexity and makes the system harder to manage.
- **G-Q3** = `GQ3v4-C` — Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 elimi
  > The PAT fallback introduces security risks that could lead to credential leakage and unauthorized access.
- **G-Q4** = `GQ4v4-D` — Wrong invariant on R8 — silent-close audit emissions should NOT include the full preScore/postScore 
  > Including the full pre/post payload in silent-close audit emissions is unnecessary and could lead to bloat in the ProductSSOT.governance_record.
- **G-Q6** = `GQ6v4-D` — Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict
  > The current validation is too strict and does not account for scenarios where an operator might want to set a minimum delta threshold that is equal to the substantial threshold.
- **G-Q7** = `GQ7v4-C` — Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The proposal introduces significant complexity and security risks that need to be addressed before promotion.

---

## Slot 5 — openrouter:amazon/nova-pro-v1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential Security**

> The proposal's reliance on GitHub Personal Access Tokens (PATs) for source acquisition and PR creation introduces a significant security risk. PATs are long-lived and have broad permissions, making them a prime target for attackers. The proposal's mitigation of using branch-scoped PATs and a dedicated machine user is insufficient, as it still requires operators to manually provision and manage these tokens. This increases the attack surface and the likelihood of credential leakage or misuse.

**Objection 2 — Limited Scope**

> The proposal limits Phase A to single-file fix generation, which may not be sufficient to address complex issues that require multi-file changes. This limitation could result in incomplete or ineffective fixes, leading to a degraded user experience and reduced trust in the Self-Renewal system.

**Objection 3 — Regression Risk**

> The proposal acknowledges that it cannot guarantee that fixes will not introduce regressions. While it includes several gates to catch regressions, such as test suite, typecheck, and preview smoke tests, these gates may not be sufficient to catch all types of regressions. This could result in the deployment of broken code, leading to production issues and a loss of operator trust.

**Worse-than-status-quo:** If the Self-Renewal system introduces regressions or incomplete fixes due to its limited scope, it could result in a worse user experience compared to the status quo, where operators manually review and apply fixes.

**Precedent:** The use of long-lived, broad-permission tokens for automated systems has been a common source of security breaches in the past. For example, the 2018 GitHub breach was partially attributed to the misuse of PATs by an attacker.

### Rejection steelman

> Given the significant security risks associated with the use of PATs, the limited scope of Phase A, and the potential for regressions, it would be prudent to reject or defer the proposal until these issues can be adequately addressed. The Panel should consider alternative credential models, such as short-lived, narrowly-scoped tokens, and expand the scope of Phase A to include multi-file fix generation. Additionally, the Panel should ensure that the proposal includes robust regression testing and detection mechanisms to minimize the risk of deploying broken code.

### Votes

- **G-Q1** = `GQ1v4-A` — Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversa
  > The three-condition AND-gate and per-product rollback mechanism provide a balanced approach to expanding the scope of Self-Renewal, while minimizing the risk of widespread issues.
- **G-Q3** = `GQ3v4-C` — Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 elimi
  > The use of PATs introduces a significant security risk, and the opt-in PAT fallback mechanism does not adequately mitigate this risk.
- **G-Q4** = `GQ4v4-A` — Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give opera
  > The two-field model provides operators with the necessary controls to manage the behavior of the Self-Renewal system, while the cross-field validation and audit-log invariant ensure that the system operates transparently and consistently.
- **G-Q6** = `GQ6v4-A` — Configurable integer with +5 default is correct — operators tune "substantial" to their product's va
  > The configurable threshold allows operators to tailor the behavior of the Self-Renewal system to their specific needs, while the default value provides a reasonable starting point.
- **G-Q7** = `REJECT` — REJECT
  > The proposal's reliance on PATs, limited scope, and potential for regressions indicate a need for a more fundamental redesign of the Self-Renewal system.

---

## Slot 6 — openrouter:google/gemini-2.0-flash-001 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Credential Rotation**

> The proposal lacks a mechanism for automatic credential rotation.  If a PAT or App key is compromised, there's no automated way to force a refresh across all products using it, requiring manual intervention and potentially leading to prolonged exposure.  This is especially concerning with the PAT fallback.

**Objection 2 — Runaway Detection Incompleteness**

> The runaway detector in §4.7 only considers consecutive failures of the *same* gate.  A product could still experience a runaway scenario if it fails different gates consecutively, leading to excessive resource consumption and potentially broken code being proposed without triggering the auto-disable mechanism.  This limits the effectiveness of the runaway protection.

**Objection 3 — Lack of Input Validation**

> While the proposal validates CSS selectors at registry-write time (§4.4.1), it lacks sufficient input validation for other operator-configurable parameters.  For example, `githubRepoUrl` is not validated for format or existence, potentially leading to runtime errors and a degraded user experience.  More comprehensive input validation is needed.

**Objection 4 — Incomplete Cost Controls**

> While Note 3 acknowledges the cost of re-assessment, the proposal doesn't include any mechanisms to limit the overall cost of Self-Renewal.  There's no budget control or circuit breaker to prevent excessive spending if multiple products experience high finding-throughput, potentially leading to unexpected cost overruns.  The `selfRenewalMaxPerDay` only limits runs, not cost.

**Worse-than-status-quo:** If a compromised PAT is used to create malicious branches and PRs across multiple repositories before the compromise is detected, the cleanup process could inadvertently delete legitimate branches, causing data loss and disrupting development workflows. This is worse than the current state where no automated branch creation/deletion occurs.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant complexity with the PAT fallback and the various configuration options, increasing the risk of misconfiguration and security vulnerabilities. The lack of automated credential rotation and comprehensive cost controls makes the system potentially dangerous and expensive to operate. Deferring the proposal would allow for a simpler, more secure, and cost-effective design to be developed.

### Votes

- **G-Q1** = `GQ1v4-B` — Insufficient — Phase A should also require per-finding-category opt-in for multi-file in Phase B (e.
  > Limiting multi-file changes by category provides finer-grained control and reduces the risk of unintended consequences from broad multi-file changes.
- **G-Q3** = `GQ3v4-B` — Insufficient — Phase A should additionally require PAT fallback usage to expire automatically (selfR
  > An automatic expiration for PAT fallback ensures that the more secure App-based approach is prioritized and prevents the fallback from becoming a permanent, less secure solution.
- **G-Q4** = `GQ4v4-B` — Insufficient — Phase A should expose `selfRenewalMinimumPerLayerDelta` map (per-Five-Layer minima) s
  > Per-layer minimum delta provides more granular control over the types of improvements that are considered acceptable, preventing regressions in specific areas from being masked by overall positive scores.
- **G-Q6** = `GQ6v4-D` — Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict
  > The current validation is overly restrictive and prevents operators from defining a scenario where all opened PRs are considered substantial improvements.
- **G-Q7** = `GQ7v4-C` — Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The lack of automated credential rotation and comprehensive cost controls, as well as the incomplete runaway detection, necessitate further revisions before the proposal is ready for promotion.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `TANGENTIAL`

### Adversarial pass

**Objection 1 — PAT fallback security regression**

> §3.2 reintroduces branch-scoped PAT fallback despite v3 eliminating long-lived tokens. This expands attack surface: PATs stored in Doppler are long-lived credentials vulnerable to exfiltration, contradicting AUTH_TRAVERSAL_SECURITY_SPEC v3 Invariant 2. The 'flowai-self-renewal' machine user with branch-scoped write creates new credential management overhead and potential misconfiguration risks.

**Objection 2 — Re-assessment cost explosion**

> §6.2 mandates full 8-step pipeline re-run per renewal, doubling assessment costs. Note 3 estimates $0.65-$5.00/run, unsustainable at scale. No cost-throttling mechanism exists beyond hard rate caps, creating runaway expenditure risk especially for high-finding-density products. This violates CA-9-C cost governance principles.

**Objection 3 — Silent-close audit bloat**

> R8 mandates full pre/post/delta payload in governance_record_entry for every silent-close run. §6.4 shows each entry contains 15+ numerical fields. At proposed default settings, high-volume products could generate hundreds of entries weekly, exponentially inflating ProductSSOT storage and degrading query performance without cold-storage strategy.

**Objection 4 — Smoke selector runtime fragility**

> §4.4.1 validates CSS selectors at write-time but runtime execution (§4.4c) lacks timeout/retry for dynamic content. Selectors like '#root' may fail during hydration, causing false-positive discards. No error budget for network flakes or Vercel edge-case rendering, making preview-smoke gate unreliable for SSR frameworks.

**Worse-than-status-quo:** A product with misconfigured selfRenewalSmokeSelectors experiences consecutive preview-smoke failures, triggering runaway detector auto-disable (R5). The operator misses alerts, leaving findings unaddressed while manual remediation backlog grows. Simultaneously, PAT fallback credentials for another product leak via Doppler compromise, allowing attackers to create malicious 'flowai/renewal-*' branches across repositories before detection.

**Precedent:** 2017 GitLab database deletion incident: an automated maintenance script with excessive privileges (analogous to PAT fallback's branch-scoped write) executed destructive operations during production stress, causing catastrophic data loss. Similar privilege overreach risk exists here if branch protections fail.

### Rejection steelman

> This proposal introduces unacceptable credential regression (PAT fallback), unsustainable cost model (double assessments), and SSOT-bloating audit trails without solving core limitations like architectural fixes. The 8 fixes add configuration complexity that increases operator cognitive load and failure modes. Defer until: 1) Eliminating PAT fallback entirely 2) Implementing lightweight re-assessment 3) Adding cold-storage for audit logs 4) Proving value in single-file scope before multi-file graduation.

### Votes

- **G-Q1** = `GQ1v4-A` — Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversa
  > The AND-gate ensures rigorous progression validation, while per-product rollback contains failures without fleet-wide impact.
- **G-Q3** = `GQ3v4-C` — Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 elimi
  > PAT fallback fundamentally undermines the zero-long-lived-credential principle; installation friction is preferable to credential leakage risks.
- **G-Q4** = `GQ4v4-A` — Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give opera
  > The model balances flexibility with coherence checks, and R8's audit guarantee ensures operational transparency.
- **G-Q6** = `UNMATCHED` — Configurable integer with +5 default is correct — operators tune 'substantial' to their product's value model (e.g. raise to +10 for products where each Five-Layer point is a major win, lower to +3 for high-finding-density products); +5 default preserves a sensible out-of-box meaning.
  > Configurability addresses product heterogeneity while +5 default maintains reasonable standardization.
- **G-Q7** = `GQ7v4-B` — Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues th
  > While fixes satisfy ratification conditions, PAT fallback and cost issues warrant explicit engineering tracking.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — PAT fallback reintroduces latent risk**

> Section §3.2 adds `selfRenewalCredentialMode='pat_fallback'` back into Phase A after v3 explicitly removed it. Even with branch-scoping claims, the design depends on branch-protection behavior and a dedicated machine user, which are both easier to misconfigure than the App path and create a long-lived credential surface that the App model avoids.

**Objection 2 — Preview-before-PR can deadlock runs**

> Section §5.5 requires the Vercel preview to be live and smoke-tested before the PR is opened. If Vercel is degraded, the branch is pushed but no PR exists yet, leaving the operator with an invisible in-flight change and forcing a draft PR fallback that contradicts the stated ordering and can confuse review-state semantics.

**Objection 3 — Silent-close audit payload may bloat SSOT**

> Section §6.4 / §6.5 mandates full pre/post/delta payloads even when no PR opens. That is useful for transparency, but the proposal stores these as `governance_record_entry` rows on every silent-close path, which can turn routine negative runs into a high-volume history and make ProductSSOT operationally noisy over time.

**Worse-than-status-quo:** If preview builds intermittently fail, the system will create renewal branches and spend on fix-generation/tests, but then be unable to open a PR or give the operator a simple review artifact. That is worse than the current status quo of a pure recommendation system, because the operator now has hidden partial state plus cleanup chores without a mergeable output.

**Precedent:** GitHub App vs personal access token design tradeoffs are a well-known source of incidents; several GitHub integrations have suffered from over-broad or long-lived token misuse when fallback PATs were introduced. A close real-world analogue is the industry’s repeated migration away from classic PATs toward GitHub Apps and fine-grained tokens because token scope and revocation mistakes caused production exposure; no single exact precedent known for this exact branch-scoped fallback pattern.

### Rejection steelman

> The strongest case for rejecting or deferring this spec is that it expands self-renewal from advisory analysis into a write-capable deployment loop before the surrounding governance and rollback surfaces are mature. The design still depends on multiple brittle external systems—GitHub permissions, Vercel preview readiness, selector validation, and audit-log integrity—and any one misconfiguration can turn a “helpful automation” into an operational burden. Deferring would let the team harden the underlying executor and reduce the chance that the first shipped version creates more review load than it saves.

### Votes

- **G-Q1** = `GQ1v4-A` — Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversa
  > The additional Panel ratification is the key safety lever; it prevents silent graduation of authority. Per-product rollback is actually useful here because multi-file brittleness can be product-specific, not fleet-wide.
- **G-Q3** = `GQ3v4-A` — App-default + opt-in PAT fallback + in-repo manifest is correct — keeps the safe path as default, gi
  > The App should remain the default because it has better revocation and installation semantics. The fallback is risky, but the feature flag and manifest diff at least make the risk visible and intentionally chosen.
- **G-Q4** = `GQ4v4-A` — Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give opera
  > This preserves operator control while preventing contradictory settings. The full audit payload is heavy, but it is the right default for traceability on silent-close paths.
- **G-Q6** = `GQ6v4-A` — Configurable integer with +5 default is correct — operators tune "substantial" to their product's va
  > A separate substantial-threshold is semantically useful and does not need to be collapsed into the minimum-open gate. The default of +5 is understandable and keeps the label meaningful without forcing tuning.
- **G-Q7** = `GQ7v4-B` — Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues th
  > The spec meaningfully closes the earlier gaps, but PAT fallback, preview gating, and SSOT verbosity remain real operational risks. These are manageable enough to engineer against, but not trivial enough to ignore.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Insufficient error handling in source acquisition**

> §3.6 lists 6 abort conditions for source acquisition, but does not specify how these errors are propagated to the operator or handled in subsequent renewal runs. For example, if a PAT scope mismatch occurs (§3.6), the run aborts with 'pat_scope_mismatch', but it's unclear if the operator is notified or if the error is logged for later review.

**Objection 2 — Lack of explicit validation for Vercel preview URL**

> §5.5 requires the Vercel preview to be live before opening the PR, but the validation only checks for HTTP 2xx status. It does not verify the content or functionality of the preview, which could lead to a misleading PR if the preview is broken but returns a 2xx status.

**Objection 3 — Unclear handling of consecutive renewal failures**

> §4.7 introduces a runaway detector that disables Self-Renewal after N consecutive same-gate failures. However, it's unclear how this interacts with the hard renewal rate cap (§4.7) or what happens if the operator doesn't re-enable Self-Renewal after auto-disable. For instance, are there any notifications or logs that persist after auto-disable to help the operator diagnose the issue?

**Worse-than-status-quo:** If the runaway detector (§4.7) incorrectly identifies a runaway failure pattern and auto-disables Self-Renewal for a product, the system becomes worse than the status quo because it loses the ability to propose fixes for that product without manual intervention.

**Precedent:** A similar design caused problems in the GitHub Dependabot system, where overly aggressive update rules led to frequent breakages and required manual intervention to correct.

### Rejection steelman

> The proposal could be rejected or deferred because it introduces multiple complex mechanisms (e.g., source acquisition, fix generation, PR creation, Vercel preview) that interact in non-trivial ways, increasing the risk of unforeseen failures or security vulnerabilities. For example, the use of a fine-grained PAT fallback (§3.2) re-introduces long-lived token risks that were previously mitigated.

### Votes

- **G-Q1** = `GQ1v4-B` — Insufficient — Phase A should also require per-finding-category opt-in for multi-file in Phase B (e.
  > The current three-condition AND-gate is a good start, but lacks granularity to handle different finding categories with varying levels of risk or complexity.
- **G-Q3** = `GQ3v4-B` — Insufficient — Phase A should additionally require PAT fallback usage to expire automatically (selfR
  > The PAT fallback is a necessary escape hatch, but without an automatic expiration mechanism, it risks becoming a permanent workaround for operators who forget to switch back to the App.
- **G-Q4** = `GQ4v4-B` — Insufficient — Phase A should expose `selfRenewalMinimumPerLayerDelta` map (per-Five-Layer minima) s
  > The two-field model is a good start, but lacks the granularity to handle layer-specific requirements or regressions.
- **G-Q6** = `GQ6v4-B` — Insufficient — Phase A should expose `selfRenewalModestThreshold` (integer, default +1) so PR-body l
  > The current configurable substantial threshold is useful, but having only two labels (substantial vs not) may not provide enough nuance for operators to triage PRs effectively.
- **G-Q7** = `GQ7v4-B` — Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues th
  > While the 8 surgical fixes address the immediate concerns, there are residual issues such as the lack of per-finding-category opt-in for multi-file fixes (§4.3) and the need for finer-grained delta labelling (§6.4) that should be tracked for future improvement.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §4.3 Phase B AND-gate undefined**

> The three-condition graduation (≥30 days + zero incidents + new Panel ratification) in §4.3 names no integration point with CANONICAL_REFERENCE §15.1 Agent #3 Executor or §10.2 Human Gates; a new ratification dispatch could bypass the existing Approval gate at 95/95 evaluation.

**Objection 2 — §4.7 runaway detector overlaps Self-Audit**

> selfRenewalRunawayThreshold (default 3) auto-disables on consecutive same-gate failures but §10.1 Self-Audit already scores Security Posture 0–10 and triggers Self-Protection; no defined precedence or merge rule between the two auto-disable paths.

**Objection 3 — §3.5 Contents API vs Clearance Data Export**

> §3.5 writes via GitHub Contents API after reading Doppler PRODUCT_<id>_GITHUB_PAT, yet CANONICAL_REFERENCE §11 step 4 Data Export must emit full ProductSSOT JSON including governance_record; no scrub or filter prevents PAT metadata leakage into the exported payload.

**Worse-than-status-quo:** A product with selfRenewalCredentialMode=pat_fallback and selfRenewalMaxPerDay=3 could silently accumulate three consecutive preview_smoke_failure runs, auto-disable itself, then still emit a full pre/post/delta governance_record_entry containing the PAT-derived branch name—creating an audit trail that the prior manual-fix workflow never exposed.

**Precedent:** no precedent known

### Rejection steelman

> The proposal layers eight new per-product registry fields, two credential paths, a nightly cleanup job, and cross-field validation rules on top of an already complex Self-Governance Layer (§10) and Clearance Protocol (§11). Until the existing 26-agent roster and Human Gates have demonstrated stable operation for a full quarter, adding this surface area risks configuration drift and credential-handling regressions that outweigh the incremental benefit of automated PR+preview cycles.

### Votes

- **G-Q1** = `GQ1v4-C` — Over-engineered — the per-product selfRenewalScopeRollback boolean is config-creep. Phase B should s
  > Adds yet another operator-tunable flag without addressing how rollback interacts with the canonical Human Gates.
- **G-Q3** = `GQ3v4-C` — Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 elimi
  > Re-opens the exact credential risk the prior revision had closed.
- **G-Q4** = `GQ4v4-C` — Over-engineered — Phase A should ship DISCARD_ON_NEGATIVE policy AS THE DEFAULT (not ALWAYS_OPEN); t
  > Default ALWAYS_OPEN increases review load without proven operator demand.
- **G-Q6** = `GQ6v4-D` — Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict
  > The strict inequality creates an artificial inconsistency for operators who want a single threshold value.
- **G-Q7** = `GQ7v4-C` — Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > R3 re-introduces PAT surface area and R4 leaves graduation integration undefined; both require further revision.