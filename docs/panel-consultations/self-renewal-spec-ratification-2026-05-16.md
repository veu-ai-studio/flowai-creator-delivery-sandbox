# Panel Consultation — Self-Renewal Spec (Option C PR+Preview+Delta) — ADVERSARIAL RATIFICATION (2026-05-16)

**Mode:** ADVERSARIAL — locked W5b format (precondition: `b1cd827` / `ad2ab28` / `3f9dede` / `7ff4f49` MET).

**Spec under ratification:** `docs/specs/SELF_RENEWAL_SPEC.md` (commit `e6d650b`, 641 lines).

**Started:** 2026-05-17T00:54:26.353Z
**Finished:** 2026-05-17T00:56:25.912Z
**Bundle:** 86994 chars (compact §10+§11+§14+§15+§22+§25 canonical excerpt + full spec).
**Panel audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"cohere":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}
**Seed:** `self-renewal-spec-ratification-2026-05-16`

---

## 🚨 PLAIN RATIFICATION VERDICT

**Status:** `NOT_RATIFIED`

Spec NOT ratified — 5 question(s) lack clear Panel majority.

**Remaining conditions:**
1. **G-Q1** — Single-file-only fix scope for Phase A (multi-file deferred to Phase B)
   - Verdict: `PLURALITY_GQ1-2-3`. Drafted (`GQ1-SINGLE`) did NOT reach quorum. 6 of 8 on GQ1-2-3 (below 7/10 quorum).

2. **G-Q2** — "Fix must pass npm test" gate sufficiency for fix application
   - Verdict: `SPLIT`. Drafted (`GQ2-NPMTEST`) did NOT reach quorum. top tie at 3 between GQ2-TYPECHECK / GQ2-SMOKE.

3. **G-Q3** — GitHub PAT minimum permissions (contents:write + pull-requests:write)
   - Verdict: `PLURALITY_GQ3-NARROW`. Drafted (`GQ3-OK`) did NOT reach quorum. 4 of 8 on GQ3-NARROW (below 7/10 quorum).

4. **G-Q4** — Negative-delta PR opening (open PR even if fix makes the score worse, with "no improvement" banner)
   - Verdict: `PLURALITY_GQ4-ALWAYS`. Drafted (`GQ4-ALWAYS`) did NOT reach quorum. 4 of 8 on GQ4-ALWAYS (below 7/10 quorum).

5. **G-Q6** — Minimum-delta threshold for PR opening (related to but distinct from Q4)
   - Verdict: `PLURALITY_GQ6-PERPROD`. Drafted (`GQ6-NONE`) did NOT reach quorum. 6 of 8 on GQ6-PERPROD (below 7/10 quorum).

**Alternative-winning positions to substitute:**
1. **G-Q7** — Overall Self-Renewal spec disposition
   - Substitute: "Revise — identify specific sections that need revision before promotion."
   - Verdict: `QUORUM_PLURALITY_GQ7-REVISE`

---

## DISSENT-FLOOR EVALUATION

Drafted alignment: **15/56** = 26.8%
Distinct objections: **32**

**✅ Dissent floor PASSED — verdict valid.** alignment 26.8 %, distinct objections 32.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |
|------|----------|-------|-------------|---------|--------|-----------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning (post-GPT-5-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `openai/gpt-4o` | US · reasoning (post-mirror-fix 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `meta-llama/llama-3.3-70b-instruct` | US · frontier reasoning (post-Gemini-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `TANGENTIAL` | 6/7 votes parsed |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | — | LIVE-OK | `SILENT` | — |
| 6 | openrouter | `google/gemini-2.0-flash-001` | US · US large-context multimodal (post-minimax-demote 2026-05-16) | — | LIVE-OK | `ENGAGED` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `ENGAGED` | — |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 10/10. Backups: 0. Quorum met: true.
Adversarial classification: ENGAGED=8, TANGENTIAL=1, INVALID=0, SILENT=1.

---

## Per-question tally

| Q | Topic | Top key | Top count | Verdict |
|---|---|---|---:|---|
| **G-Q1** | Single-file-only fix scope for Phase A (multi-file deferred  | `GQ1-2-3` | 6 / 8 | `PLURALITY_GQ1-2-3` |
| **G-Q2** | "Fix must pass npm test" gate sufficiency for fix applicatio | `GQ2-TYPECHECK` | 3 / 8 | `SPLIT` |
| **G-Q3** | GitHub PAT minimum permissions (contents:write + pull-reques | `GQ3-NARROW` | 4 / 8 | `PLURALITY_GQ3-NARROW` |
| **G-Q4** | Negative-delta PR opening (open PR even if fix makes the sco | `GQ4-ALWAYS` | 4 / 8 | `PLURALITY_GQ4-ALWAYS` |
| **G-Q5** | Preview-before-PR ordering (Vercel preview must be live HTTP | `GQ5-PREFIRST` | 7 / 8 | `QUORUM_PLURALITY_GQ5-PREFIRST` |
| **G-Q6** | Minimum-delta threshold for PR opening (related to but disti | `GQ6-PERPROD` | 6 / 8 | `PLURALITY_GQ6-PERPROD` |
| **G-Q7** | Overall Self-Renewal spec disposition | `GQ7-REVISE` | 7 / 8 | `QUORUM_PLURALITY_GQ7-REVISE` |

### Per-question detail

### G-Q1 — Single-file-only fix scope for Phase A (multi-file deferred to Phase B)

Tally (ENGAGED-only, 8):
  - `GQ1-SINGLE` "Single-file scope is correct — multi-file fixes are too risky for the first production deployment of automated fix application."  →  **2**
  - `GQ1-2-3` "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test,"  →  **6**
  - `GQ1-FN` "Single-file scope is too permissive — Phase A should restrict further (e.g., single-function-only within a file)."  →  **0**
  - `GQ1-FILETYPE` "The single-file vs multi-file framing is the wrong question — Phase A should restrict by file type (e.g., *.jsx only, no *.json / "  →  **0**

**Verdict:** `PLURALITY_GQ1-2-3` — 6 of 8 on GQ1-2-3 (below 7/10 quorum).

### G-Q2 — "Fix must pass npm test" gate sufficiency for fix application

Tally (ENGAGED-only, 8):
  - `GQ2-NPMTEST` "npm test is sufficient — existing test suite is the canonical pre-merge gate; if a fix breaks a test, the discard gate catches it."  →  **0**
  - `GQ2-TYPECHECK` "npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit) where applicable."  →  **3**
  - `GQ2-SMOKE` "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert "  →  **3**
  - `GQ2-OPTOPT` "npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at all, which is unacceptable; the gate shoul"  →  **2**

**Verdict:** `SPLIT` — top tie at 3 between GQ2-TYPECHECK / GQ2-SMOKE.

### G-Q3 — GitHub PAT minimum permissions (contents:write + pull-requests:write)

Tally (ENGAGED-only, 8):
  - `GQ3-OK` "contents:write + pull-requests:write is the correct minimum — narrow enough to prevent abuse, broad enough to do the job."  →  **1**
  - `GQ3-MORE` "Insufficient — Phase A also needs metadata:read (likely implicit) and commit-statuses:read (to surface CI status in PR body)."  →  **0**
  - `GQ3-NARROW` "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower "  →  **4**
  - `GQ3-APP` "Different permission model entirely — Phase A should use a GitHub App rather than fine-grained PAT, with installation-time consent"  →  **3**

**Verdict:** `PLURALITY_GQ3-NARROW` — 4 of 8 on GQ3-NARROW (below 7/10 quorum).

### G-Q4 — Negative-delta PR opening (open PR even if fix makes the score worse, with "no improvement" banner)

Tally (ENGAGED-only, 8):
  - `GQ4-ALWAYS` "Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs."  →  **4**
  - `GQ4-NEVER` "Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions."  →  **3**
  - `GQ4-DISCARD` "Open the PR but mark it explicitly "discarded by FlowAI" — branch deleted, PR closed in same commit, operator gets a record but no"  →  **0**
  - `GQ4-THRESH` "Threshold-based — open the PR if delta ≥ a configurable minimum (e.g., delta_total ≥ +5); below that, close as failed."  →  **1**

**Verdict:** `PLURALITY_GQ4-ALWAYS` — 4 of 8 on GQ4-ALWAYS (below 7/10 quorum).

### G-Q5 — Preview-before-PR ordering (Vercel preview must be live HTTP 2xx before PR opens)

Tally (ENGAGED-only, 8):
  - `GQ5-PREFIRST` "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code."  →  **7**
  - `GQ5-CONCUR` "Too strict — Phase A should open the PR concurrently with preview build (PR opens immediately on branch creation; preview URL adde"  →  **0**
  - `GQ5-SMOKE` "Too lax — Phase A should additionally require the preview URL to pass a smoke-test assessment (Agent #21 quick crawl) before the P"  →  **0**
  - `GQ5-NOPRE` "Wrong gate entirely — for non-Vercel-hosted operators there is no preview; Phase A should support a "no preview" path with explici"  →  **1**

**Verdict:** `QUORUM_PLURALITY_GQ5-PREFIRST` — 7 of 8 on GQ5-PREFIRST (≥ quorum 7/10).

### G-Q6 — Minimum-delta threshold for PR opening (related to but distinct from Q4)

Tally (ENGAGED-only, 8):
  - `GQ6-NONE` "Always open the PR (no minimum delta required) — operator sees everything."  →  **1**
  - `GQ6-PERPROD` "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides."  →  **6**
  - `GQ6-PLUS1` "Hard-coded minimum delta of +1 — FlowAI never opens PRs that don't show measurable improvement."  →  **0**
  - `GQ6-PLUS5` "Hard-coded minimum delta of +5 — FlowAI only opens PRs with substantial improvement (per a Panel-ratified threshold for what "subs"  →  **1**

**Verdict:** `PLURALITY_GQ6-PERPROD` — 6 of 8 on GQ6-PERPROD (below 7/10 quorum).

### G-Q7 — Overall Self-Renewal spec disposition

Tally (ENGAGED-only, 8):
  - `GQ7-PROMOTE` "Promote — spec is ready for Phase A engineering dispatch."  →  **0**
  - `GQ7-REVISE` "Revise — identify specific sections that need revision before promotion."  →  **7**
  - `GQ7-DEFER` "Defer — Phase A is not the right next investment; some other engineering work should land first (specify in rationale)."  →  **1**
  - `GQ7-REJECT` "Reject — Option C is the wrong architectural approach; a different approach should be pursued (specify in rationale)."  →  **0**

**Verdict:** `QUORUM_PLURALITY_GQ7-REVISE` — 7 of 8 on GQ7-REVISE (≥ quorum 7/10).


---

## All distinct substantive objections (verbatim)

Total distinct: **32**

**01. [Slot 1] Unvalidated PR body injection risk**

> §5.4 claims deterministic template prevents injection but §6.5 shows evidence strings from assessments are included. If finding.evidence contains malicious markdown/HTML that bypasses the 500-char cap + HTML-escape, it could execute in GitHub's PR renderer.

**02. [Slot 1] Preview polling creates DoS vector**

> §5.5 polls Vercel API for 10 minutes waiting for READY state. A malicious actor could trigger many renewal runs simultaneously, exhausting Vercel API rate limits and blocking legitimate deployments across all operator products.

**03. [Slot 1] Delta score gaming via test deletion**

> §4.4 only checks that npm test passes, not that tests weren't deleted. A fix could improve the delta score by removing failing tests rather than fixing the underlying issues, creating false confidence in degraded code.

**04. [Slot 2] Limited fix scope**

> Section §4.3 restricts fix generation to single-file changes only in Phase A. This limitation may prevent addressing issues that inherently require multi-file changes, potentially leaving significant issues unresolved and reducing the effectiveness of the Self-Renewal process.

**05. [Slot 2] Potential security risks with PAT**

> Section §3.2 outlines the use of GitHub PATs with `contents:write` permissions. This could pose a security risk if the PAT is compromised, as it allows writing to repositories. The proposal lacks detailed mitigation strategies for such scenarios.

**06. [Slot 2] High operational costs**

> Section §6.2 and Note 3 highlight the potential high costs of running the full 8-step pipeline twice per renewal. This could lead to significant operational expenses, especially for products with frequent renewal cycles, potentially making the process economically unviable.

**07. [Slot 3] Single-file fix scope**

> The proposal restricts fix generation to single-file changes, which may not be sufficient for complex issues that require multi-file fixes. This limitation may lead to incomplete or inaccurate fixes, potentially causing more harm than good. (§4.3)

**08. [Slot 3] Lack of regression testing**

> The proposal relies on the human PR reviewer to catch regressions, which may not be effective in all cases. The absence of automated regression testing may lead to unintended consequences, such as introducing new bugs or breaking existing functionality. (§2, §7.5)

**09. [Slot 3] Insufficient security controls**

> The proposal's security controls, such as the use of fine-grained GitHub PATs and scrubbing of credentials, may not be sufficient to prevent unauthorized access or data breaches. Additional security measures, such as encryption and access controls, may be necessary to ensure the security and integrity of the system. (§3.2, §8.1)

**10. [Slot 4] Over-broad GitHub PAT permissions**

> The proposal grants 'contents:write' and 'pull-requests:write' permissions to the GitHub PAT. This is over-broad and allows for force-pushing to the default branch, which is not necessary for the proposed functionality. The permission should be narrowed to prevent abuse.

**11. [Slot 4] Lack of regression testing**

> The proposal does not include regression testing as part of the fix-discard gates. This means that even if a fix passes all the current tests, it could still introduce regressions that are not caught until the human review stage.

**12. [Slot 4] Vercel-only preview limitation**

> The proposal requires Vercel for preview deployment, which limits its applicability to products hosted on Vercel. This excludes a significant portion of potential users who may use other hosting providers. The proposal should include a path for non-Vercel-hosted products.

**13. [Slot 4] Risk of credential leakage**

> While the proposal includes measures to prevent credential leakage, the use of fine-grained PATs and the handling of credentials in process memory introduce risks. Any leakage of these credentials could have severe security implications.

**14. [Slot 6] Source acquisition risk**

> §3.5 uses the GitHub REST API directly, which is different from the existing tarball mechanism. This introduces a new code path with potential security vulnerabilities and requires careful scrutiny to ensure it doesn't expose sensitive information or allow unauthorized access.

**15. [Slot 6] Fix generation limitations**

> §4.3 restricts fix generation to single-file changes in Phase A. This limitation may prevent the system from addressing more complex issues that require modifications across multiple files, reducing the overall effectiveness of the self-renewal process.

**16. [Slot 6] Delta score reliability**

> §6.2 relies on re-running the full 8-step pipeline against the Vercel preview URL to generate the post-renewal score. This re-assessment may not accurately reflect the actual impact of the fix due to differences between the preview environment and the production environment, leading to misleading delta scores.

**17. [Slot 6] Credential exposure risk**

> While §3.3 outlines measures to protect the GitHub PAT, the risk of accidental credential exposure remains a concern. A single coding error could lead to the PAT being logged, persisted, or sent to an external service, compromising the security of the system.

**18. [Slot 6] Test gate limitations**

> §4.4 relies on `npm test` as a primary gate for fix application. However, many projects lack comprehensive test suites, making this gate ineffective at preventing regressions. This could lead to the deployment of broken code, despite passing the test gate.

**19. [Slot 7] Single-file fix limitation**

> §4.3 restricts Phase A to single-file fixes only. This excludes common multi-file patterns like component-test pairs, forcing manual fixes for interconnected issues. The arbitrary constraint reduces utility for operators with complex codebases where most meaningful fixes span multiple files.

**20. [Slot 7] Test-dependent discard gates**

> §4.4 gates require passing npm test/lint/build. Projects without tests (common in early-stage products) become ineligible for auto-fixes. This violates §22 Product-Agnostic Rule by implicitly requiring test infrastructure, excluding operators without comprehensive test suites from Self-Renewal benefits.

**21. [Slot 7] Vercel vendor lock-in**

> §5.6 makes Vercel mandatory for preview deployment. Non-Vercel operators (e.g., AWS/Netlify users) are excluded without fallback. This contradicts §25 Locked Rule 4 (Product-Agnostic Principle) and creates a fragmented experience where core functionality is unavailable to subsets of users.

**22. [Slot 7] Credential exposure risk**

> §3.3-3.4 relies on GitHub PATs in Doppler. While scrubbing is implemented, the Contents API writes require broad contents:write permissions. A compromised renewal run could inject malicious code into operator repos via §3.5's file-write mechanism, exploiting the elevated PAT scope.

**23. [Slot 8] Preview gating can deadlock**

> §5.5 requires a live Vercel preview before opening the PR, but §5.6 also makes Option C unavailable for non-Vercel products. That creates a hard failure mode where a product with a valid GitHub repo but slow or flaky preview builds can never produce a reviewable PR, even when the code change is obviously safe.

**24. [Slot 8] Single-file scope misses real fixes**

> §4.3 limits Phase A to one file per finding, yet the spec itself acknowledges common fixes are component+test or route+layout pairs. This means the system will systematically discard many correct remediation paths as out-of-scope, biasing the tool toward cosmetic fixes and leaving substantive defects open.

**25. [Slot 8] Test gate is under-specified**

> §4.4 accepts 'npm test (or equivalent)' without requiring typecheck or a meaningful preview smoke test. In a TypeScript or Vite/Next codebase, a fix can pass tests while still breaking compilation, routing, or runtime behavior in the preview; the proposal partially admits this by treating Vercel build failure as a discard signal, but that is a late and noisy guard.

**26. [Slot 8] Negative delta still opens PR**

> §6.4 explicitly opens PRs even when the before/after delta is negative, relying on a banner to warn the operator. This risks normalizing regressions as reviewable artifacts, increasing review burden and making it easier for a low-quality fix set to consume human attention despite being worse than the original state.

**27. [Slot 9] Overly broad GitHub PAT permissions**

> §3.2 requires `contents:write` + `pull-requests:write` permissions for the GitHub PAT. This could allow Self-Renewal to push to any branch, not just `flowai/*` branches (§5.1). A more restricted permission set, such as `contents:write` scoped to specific branches, would mitigate this risk.

**28. [Slot 9] Lack of explicit error handling for Vercel preview failures**

> §5.5 outlines the preview-before-PR ordering but doesn't specify what happens if the Vercel preview build fails. The spec should explicitly state how Self-Renewal handles such failures, including any notifications to the operator or fallback behaviors.

**29. [Slot 9] Insufficient testing for fix generation**

> §4.4 lists several discard gates for fix generation, including `npm test`. However, it doesn't address the case where a project lacks a comprehensive test suite. The spec should consider additional measures or alternative gates for projects with inadequate testing.

**30. [Slot 10] §3.6 PAT abort lacks update path**

> Source acquisition aborts on PAT scope mismatch or attestation failure with only SELF_RENEWAL_NO_SOURCE error and governance_record_entry; no operator UI or retry mechanism exists in ProductRegistry or admin surfaces to refresh the Doppler path without full product re-onboarding.

**31. [Slot 10] §6.2 Re-assessment cost unbounded**

> Re-running the full 8-step pipeline on the Vercel preview URL per §6.2 doubles cost to the $0.60–$5.00 envelope noted in Note 3, yet ProductRegistry.selfRenewalSeverityFloor and selfRenewalMinimumDelta provide no cost or invocation cap, and no integration with Orchestra cost ledger exists.

**32. [Slot 10] §5.5 Draft PR on preview failure**

> When Vercel poll times out or smoke-test fails, §5.5 still creates a draft PR explaining the failure instead of cleanly aborting; this injects noise into the operator's repo and contradicts the 'never a broken PR' claim in §4.4.


---

## Strongest single argument AGAINST the spec

**From Slot 8 (openrouter:perplexity/sonar):**

> The strongest case for rejecting or deferring is that the spec mixes three high-risk capabilities at once: code generation, repository write access, and deployment-triggered verification. That combination creates many ways to fail silently or to produce expensive, low-signal churn, especially because Phase A deliberately excludes multi-file fixes and regression-aware test generation. Deferring would let the team first harden source acquisition, diff validation, and preview smoke-testing in a narrower internal loop before granting the system a human-visible PR workflow.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Unvalidated PR body injection risk**

> §5.4 claims deterministic template prevents injection but §6.5 shows evidence strings from assessments are included. If finding.evidence contains malicious markdown/HTML that bypasses the 500-char cap + HTML-escape, it could execute in GitHub's PR renderer.

**Objection 2 — Preview polling creates DoS vector**

> §5.5 polls Vercel API for 10 minutes waiting for READY state. A malicious actor could trigger many renewal runs simultaneously, exhausting Vercel API rate limits and blocking legitimate deployments across all operator products.

**Objection 3 — Delta score gaming via test deletion**

> §4.4 only checks that npm test passes, not that tests weren't deleted. A fix could improve the delta score by removing failing tests rather than fixing the underlying issues, creating false confidence in degraded code.

**Worse-than-status-quo scenario:** Status quo has humans manually fixing issues with full context. Option C could create alert fatigue where operators rubber-stamp PRs with positive deltas without understanding that the 'fixes' achieved scores by removing security checks or error handling.

**Precedent:** Dependabot's automated PR generation created similar review fatigue where maintainers merged updates without proper review, leading to the 2021 ua-parser-js supply chain attack that affected millions.

### Rejection steelman

> Option C fundamentally violates the principle of least privilege by granting write access to production codebases before proving the system can correctly identify issues. The spec should require 90+ days of recommend-only operation with accuracy metrics before any write authority is granted. Additionally, the re-assessment cost ($0.65-$5.00 per run per Note 3) creates a multiplicative expense that could exceed the engineering cost of manual fixes for low-severity issues.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > Most real-world fixes require updating tests alongside implementation; artificially limiting to single files will cause Phase A to skip the majority of actionable findings.
- **G-Q2** = `GQ2-OPTOPT` — npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at al
  > Many production systems have minimal test coverage; requiring tests excludes precisely the products that most need automated assistance with quality issues.
- **G-Q3** = `GQ3-APP` — Different permission model entirely — Phase A should use a GitHub App rather than fine-gra
  > GitHub Apps provide better audit trails, automatic token rotation, and installation-time consent that makes the security model explicit to operators.
- **G-Q4** = `GQ4-NEVER` — Never open the PR if delta is negative — close the renewal run as failed; don't waste oper
  > Opening PRs that make things worse trains operators to ignore Self-Renewal output, defeating the system's purpose.
- **G-Q5** = `GQ5-NOPRE` — Wrong gate entirely — for non-Vercel-hosted operators there is no preview; Phase A should 
  > Limiting Self-Renewal to Vercel-only creates vendor lock-in; many operators use Netlify, AWS, or self-hosted deployments.
- **G-Q6** = `GQ6-PLUS5` — Hard-coded minimum delta of +5 — FlowAI only opens PRs with substantial improvement (per a
  > Without a meaningful threshold, operators will be flooded with marginal-improvement PRs that consume review cycles for minimal benefit.
- **G-Q7** = `GQ7-DEFER` — Defer — Phase A is not the right next investment; some other engineering work should land 
  > The system should first prove accuracy in recommend-only mode for 90+ days, building operator trust and refinement metrics before requesting write access to production code.

Overall: The spec's core flaw is attempting to jump directly to write authority without establishing trust through proven read-only recommendations first.

---

## Slot 2 — openrouter:openai/gpt-4o — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Limited fix scope**

> Section §4.3 restricts fix generation to single-file changes only in Phase A. This limitation may prevent addressing issues that inherently require multi-file changes, potentially leaving significant issues unresolved and reducing the effectiveness of the Self-Renewal process.

**Objection 2 — Potential security risks with PAT**

> Section §3.2 outlines the use of GitHub PATs with `contents:write` permissions. This could pose a security risk if the PAT is compromised, as it allows writing to repositories. The proposal lacks detailed mitigation strategies for such scenarios.

**Objection 3 — High operational costs**

> Section §6.2 and Note 3 highlight the potential high costs of running the full 8-step pipeline twice per renewal. This could lead to significant operational expenses, especially for products with frequent renewal cycles, potentially making the process economically unviable.

**Worse-than-status-quo scenario:** The proposal could lead to increased operational costs without guaranteeing significant improvements, as the single-file fix scope may not address all critical issues, and the high cost of re-assessment could outweigh the benefits.

**Precedent:** no precedent known

### Rejection steelman

> The proposal should be rejected or deferred because it introduces significant operational costs and security risks without adequately addressing multi-file issues, which are common in real-world applications. The limited scope of fixes and potential for high costs could outweigh the benefits, making the system less efficient than the status quo.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > Restricting to single-file changes may not address issues that span multiple files, which are common in complex systems.
- **G-Q2** = `GQ2-TYPECHECK` — npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit)
  > Type checking is crucial for catching errors that tests might not cover, especially in TypeScript projects.
- **G-Q3** = `GQ3-NARROW` — Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal nev
  > Narrowing permissions reduces security risks by limiting the scope of potential damage if the PAT is compromised.
- **G-Q4** = `GQ4-THRESH` — Threshold-based — open the PR if delta ≥ a configurable minimum (e.g., delta_total ≥ +5); 
  > Opening PRs only for significant improvements prevents unnecessary review work for minor or negative changes.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > Ensuring the preview is live before PR opening allows operators to verify changes visually, which is crucial for effective review.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > Allowing operators to set their own thresholds provides flexibility and ensures that the process aligns with their specific needs.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > The proposal needs revisions to address security concerns, operational costs, and the limited scope of fixes before it can be promoted.

Overall: The proposal introduces valuable automation but requires revisions to address security, cost, and scope limitations.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Single-file fix scope**

> The proposal restricts fix generation to single-file changes, which may not be sufficient for complex issues that require multi-file fixes. This limitation may lead to incomplete or inaccurate fixes, potentially causing more harm than good. (§4.3)

**Objection 2 — Lack of regression testing**

> The proposal relies on the human PR reviewer to catch regressions, which may not be effective in all cases. The absence of automated regression testing may lead to unintended consequences, such as introducing new bugs or breaking existing functionality. (§2, §7.5)

**Objection 3 — Insufficient security controls**

> The proposal's security controls, such as the use of fine-grained GitHub PATs and scrubbing of credentials, may not be sufficient to prevent unauthorized access or data breaches. Additional security measures, such as encryption and access controls, may be necessary to ensure the security and integrity of the system. (§3.2, §8.1)

**Worse-than-status-quo scenario:** The proposal's limitations and potential security risks may lead to a worse outcome than the current status quo, where human reviewers and developers manually review and fix issues. The automated fix generation and PR creation process may introduce new errors or security vulnerabilities, potentially causing more harm than good.

**Precedent:** No precedent known

### Rejection steelman

> The proposal's limitations and potential security risks, combined with the lack of regression testing and insufficient security controls, make it a high-risk proposition. Rejecting or deferring the proposal would allow for further refinement and addressing of these concerns, ensuring a more robust and secure solution.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > This option acknowledges the potential limitations of single-file fixes and proposes a more flexible approach to address complex issues.
- **G-Q2** = `GQ2-SMOKE` — npm test is insufficient — Phase A should also require a smoke test of the Vercel preview 
  > This option recognizes the importance of regression testing and proposes an additional test to ensure the fix does not introduce new errors.
- **G-Q3** = `GQ3-OK` — contents:write + pull-requests:write is the correct minimum — narrow enough to prevent abu
  > This option strikes a balance between security and functionality, ensuring that the proposal has the necessary permissions to operate effectively.
- **G-Q4** = `GQ4-ALWAYS` — Always open the PR — surface the data; let the human decide. Negative deltas are informati
  > This option prioritizes transparency and human judgment, allowing operators to make informed decisions about the proposed fixes.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > This option ensures that operators have a clear understanding of the proposed changes and can make informed decisions about the fix.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > This option provides flexibility and allows operators to tailor the minimum delta threshold to their specific needs and preferences.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > This option acknowledges the potential limitations and risks of the proposal and recommends further refinement before proceeding.

Overall: The proposal has potential, but its limitations and potential security risks need to be addressed through further refinement and testing. A more cautious approach, prioritizing security and regression testing, would be preferable to ensure a robust and reliable solution.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `TANGENTIAL`

**Invalid reason:** 6/7 votes parsed

### Adversarial pass

**Objection 1 — Over-broad GitHub PAT permissions**

> The proposal grants 'contents:write' and 'pull-requests:write' permissions to the GitHub PAT. This is over-broad and allows for force-pushing to the default branch, which is not necessary for the proposed functionality. The permission should be narrowed to prevent abuse.

**Objection 2 — Lack of regression testing**

> The proposal does not include regression testing as part of the fix-discard gates. This means that even if a fix passes all the current tests, it could still introduce regressions that are not caught until the human review stage.

**Objection 3 — Vercel-only preview limitation**

> The proposal requires Vercel for preview deployment, which limits its applicability to products hosted on Vercel. This excludes a significant portion of potential users who may use other hosting providers. The proposal should include a path for non-Vercel-hosted products.

**Objection 4 — Risk of credential leakage**

> While the proposal includes measures to prevent credential leakage, the use of fine-grained PATs and the handling of credentials in process memory introduce risks. Any leakage of these credentials could have severe security implications.

**Worse-than-status-quo scenario:** The proposal's requirement for Vercel-only preview deployment makes the system worse than the status quo for non-Vercel-hosted products, as it introduces an additional barrier to using the self-renewal feature.

**Precedent:** no precedent known

### Rejection steelman

> The proposal should be rejected because it introduces significant security risks with over-broad GitHub PAT permissions and the handling of credentials in process memory. Additionally, the lack of regression testing and the Vercel-only preview limitation make the system less flexible and more risky than the current status quo.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > Supporting multi-file fixes would make the self-renewal process more comprehensive and align better with real-world use cases.
- **G-Q2** = `GQ2-SMOKE` — npm test is insufficient — Phase A should also require a smoke test of the Vercel preview 
  > Adding a smoke test would provide an additional layer of validation and help catch issues that might not be covered by the existing test suite.
- **G-Q3** = `UNMATCHED` — Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrowed (e.g., contents:write scoped to branches matching flowai/*).
  > Narrowing the permissions would reduce the risk of abuse and align better with the actual requirements of the self-renewal process.
- **G-Q4** = `GQ4-NEVER` — Never open the PR if delta is negative — close the renewal run as failed; don't waste oper
  > Opening PRs with negative deltas wastes operator time and resources, and could lead to the merging of regressions.
- **G-Q5** = `GQ5-CONCUR` — Too strict — Phase A should open the PR concurrently with preview build (PR opens immediat
  > Opening the PR concurrently with the preview build would streamline the process and reduce waiting times for operators.
- **G-Q6** = `GQ6-PLUS1` — Hard-coded minimum delta of +1 — FlowAI never opens PRs that don't show measurable improve
  > Setting a minimum delta threshold ensures that only meaningful improvements are surfaced to the operator, reducing noise and unnecessary reviews.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > The proposal has several areas that need revision, including the handling of GitHub PAT permissions, the lack of regression testing, and the Vercel-only preview limitation.

Overall: The proposal introduces significant risks and limitations that need to be addressed before it can be promoted. Specific revisions are required to improve security, flexibility, and comprehensiveness.

---

## Slot 5 — openrouter:cohere/command-r-plus-08-2024 — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 6 — openrouter:google/gemini-2.0-flash-001 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Source acquisition risk**

> §3.5 uses the GitHub REST API directly, which is different from the existing tarball mechanism. This introduces a new code path with potential security vulnerabilities and requires careful scrutiny to ensure it doesn't expose sensitive information or allow unauthorized access.

**Objection 2 — Fix generation limitations**

> §4.3 restricts fix generation to single-file changes in Phase A. This limitation may prevent the system from addressing more complex issues that require modifications across multiple files, reducing the overall effectiveness of the self-renewal process.

**Objection 3 — Delta score reliability**

> §6.2 relies on re-running the full 8-step pipeline against the Vercel preview URL to generate the post-renewal score. This re-assessment may not accurately reflect the actual impact of the fix due to differences between the preview environment and the production environment, leading to misleading delta scores.

**Objection 4 — Credential exposure risk**

> While §3.3 outlines measures to protect the GitHub PAT, the risk of accidental credential exposure remains a concern. A single coding error could lead to the PAT being logged, persisted, or sent to an external service, compromising the security of the system.

**Objection 5 — Test gate limitations**

> §4.4 relies on `npm test` as a primary gate for fix application. However, many projects lack comprehensive test suites, making this gate ineffective at preventing regressions. This could lead to the deployment of broken code, despite passing the test gate.

**Worse-than-status-quo scenario:** If the delta score is inaccurate and misleading, and the human reviewer trusts it, the system could merge a change that actually makes the system worse, believing it to be an improvement. This is worse than the status quo because it introduces a false sense of security.

**Precedent:** no precedent known

### Rejection steelman

> This proposal introduces significant complexity and risk with limited immediate benefit. The single-file fix scope and reliance on potentially unreliable delta scores may not justify the engineering effort required. Deferring this proposal would allow for further exploration of alternative approaches and a more thorough assessment of the potential risks and benefits.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > Single-file scope is too limiting. Many fixes involve changes to a component and its corresponding test file, or changes that span a route and its layout.
- **G-Q2** = `GQ2-SMOKE` — npm test is insufficient — Phase A should also require a smoke test of the Vercel preview 
  > Relying solely on `npm test` is insufficient. A smoke test of the Vercel preview would provide an additional layer of confidence by verifying that the fix functions correctly in a live environment.
- **G-Q3** = `GQ3-APP` — Different permission model entirely — Phase A should use a GitHub App rather than fine-gra
  > Using a GitHub App would provide a more secure and manageable approach to granting permissions. Installation-time consent and webhook subscriptions would allow for finer-grained control and better auditing.
- **G-Q4** = `GQ4-ALWAYS` — Always open the PR — surface the data; let the human decide. Negative deltas are informati
  > Opening the PR, even with a negative delta, provides valuable information to the operator. The human reviewer can then assess the changes and determine whether to merge them, regardless of the score.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > Ensuring the preview is live before opening the PR is crucial. The operator needs to see the changes in action before reviewing the code to make an informed decision.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > Allowing the operator to configure the minimum delta provides flexibility and control. Different products may have different requirements, and the operator is best positioned to determine the appropriate threshold.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > The proposal has potential but requires revisions to address the identified risks and limitations. Specifically, the source acquisition method, fix generation scope, and delta score reliability need further scrutiny.

Overall: The proposal is ambitious but needs more work to address security concerns and ensure the reliability of the delta score. A more gradual approach with tighter scope and more robust testing may be warranted.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Single-file fix limitation**

> §4.3 restricts Phase A to single-file fixes only. This excludes common multi-file patterns like component-test pairs, forcing manual fixes for interconnected issues. The arbitrary constraint reduces utility for operators with complex codebases where most meaningful fixes span multiple files.

**Objection 2 — Test-dependent discard gates**

> §4.4 gates require passing npm test/lint/build. Projects without tests (common in early-stage products) become ineligible for auto-fixes. This violates §22 Product-Agnostic Rule by implicitly requiring test infrastructure, excluding operators without comprehensive test suites from Self-Renewal benefits.

**Objection 3 — Vercel vendor lock-in**

> §5.6 makes Vercel mandatory for preview deployment. Non-Vercel operators (e.g., AWS/Netlify users) are excluded without fallback. This contradicts §25 Locked Rule 4 (Product-Agnostic Principle) and creates a fragmented experience where core functionality is unavailable to subsets of users.

**Objection 4 — Credential exposure risk**

> §3.3-3.4 relies on GitHub PATs in Doppler. While scrubbing is implemented, the Contents API writes require broad contents:write permissions. A compromised renewal run could inject malicious code into operator repos via §3.5's file-write mechanism, exploiting the elevated PAT scope.

**Worse-than-status-quo scenario:** An operator with partial test coverage and non-Vercel deployment attempts Self-Renewal. All fixes are discarded due to missing tests (§4.4), while preview deployment fails (§5.6), flooding ProductSSOT with auto_fix_attempted_failed and out_of_scope entries. The operator now manages false alerts plus manual fixes, with doubled pipeline costs from failed re-assessments (§6.2), making automation more burdensome than manual intervention.

**Precedent:** The 2012 Knight Capital incident, where untested deployment automation caused $460M loss in 45 minutes. Similar to §4.4's test-dependent gates, Knight's system lacked safeguards for incomplete test coverage, allowing a faulty deployment to trigger catastrophic failure when partial tests passed.

### Rejection steelman

> The proposal introduces substantial complexity for limited initial value. Single-file restrictions exclude most meaningful fixes, Vercel dependency fragments the user base, and test-gating renders the system unusable for early-stage products. With high implementation cost (3-4 weeks) and unresolved security risks in credential handling, deferring until Phase A includes multi-file support, cloud-agnostic previews, and test-free operation modes would better align with product-agnostic principles and deliver broader utility.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > Many critical fixes inherently span 2-3 files; excluding them severely limits real-world applicability while providing minimal risk reduction.
- **G-Q2** = `GQ2-OPTOPT` — npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at al
  > Mandatory tests violate product-agnostic principles and exclude valid use cases; opt-in preserves safety while expanding accessibility.
- **G-Q3** = `GQ3-NARROW` — Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal nev
  > Current permissions are excessively permissive; branch-scoped write access maintains functionality while reducing attack surface.
- **G-Q4** = `GQ4-ALWAYS` — Always open the PR — surface the data; let the human decide. Negative deltas are informati
  > Transparency trumps optimization; hiding regressions undermines trust and prevents learning from failures.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > Functional verification before code review reduces cognitive load and ensures proposed changes resolve visible issues.
- **G-Q6** = `GQ6-NONE` — Always open the PR (no minimum delta required) — operator sees everything.
  > Arbitrary thresholds risk hiding valuable context; operators should assess all outcomes given their unique priorities.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > The spec has merit but requires amendments to §4.3 (multi-file), §4.4 (test opt-out), and §5.6 (cloud-agnostic previews) to achieve viability.

Overall: Addressing the objections would make Option C transformative, but current constraints risk limiting adoption to niche scenarios.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Preview gating can deadlock**

> §5.5 requires a live Vercel preview before opening the PR, but §5.6 also makes Option C unavailable for non-Vercel products. That creates a hard failure mode where a product with a valid GitHub repo but slow or flaky preview builds can never produce a reviewable PR, even when the code change is obviously safe.

**Objection 2 — Single-file scope misses real fixes**

> §4.3 limits Phase A to one file per finding, yet the spec itself acknowledges common fixes are component+test or route+layout pairs. This means the system will systematically discard many correct remediation paths as out-of-scope, biasing the tool toward cosmetic fixes and leaving substantive defects open.

**Objection 3 — Test gate is under-specified**

> §4.4 accepts 'npm test (or equivalent)' without requiring typecheck or a meaningful preview smoke test. In a TypeScript or Vite/Next codebase, a fix can pass tests while still breaking compilation, routing, or runtime behavior in the preview; the proposal partially admits this by treating Vercel build failure as a discard signal, but that is a late and noisy guard.

**Objection 4 — Negative delta still opens PR**

> §6.4 explicitly opens PRs even when the before/after delta is negative, relying on a banner to warn the operator. This risks normalizing regressions as reviewable artifacts, increasing review burden and making it easier for a low-quality fix set to consume human attention despite being worse than the original state.

**Worse-than-status-quo scenario:** A flaky preview build returns a misleading READY state, the PR is opened anyway with a negative delta banner, and the operator is forced to inspect a branch that cannot merge cleanly and may have regressed the product. Compared with the current analyzer-only flow, this adds time, noise, and a new failure surface without guaranteeing a better fix outcome.

**Precedent:** The 'preview-first' idea has a real analogue in Vercel/Netlify-style preview deployments, but those systems are typically used to assist human review, not to gate the existence of the review artifact itself. I am not aware of a precise precedent where a PR is withheld until a preview is healthy; no precedent known.

### Rejection steelman

> The strongest case for rejecting or deferring is that the spec mixes three high-risk capabilities at once: code generation, repository write access, and deployment-triggered verification. That combination creates many ways to fail silently or to produce expensive, low-signal churn, especially because Phase A deliberately excludes multi-file fixes and regression-aware test generation. Deferring would let the team first harden source acquisition, diff validation, and preview smoke-testing in a narrower internal loop before granting the system a human-visible PR workflow.

### Votes

- **G-Q1** = `GQ1-2-3` — Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common
  > The proposal’s own scope admits many legitimate fixes are paired changes, and the single-file rule will misclassify them as out-of-scope. That makes Phase A less a safety boundary and more a productivity cap.
- **G-Q2** = `GQ2-TYPECHECK` — npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit)
  > Tests alone do not protect TypeScript compilation or many structural failures, especially in codebases with partial test coverage. Typecheck is a cheap and direct guard that fits the proposal’s existing discard-gate model.
- **G-Q3** = `GQ3-APP` — Different permission model entirely — Phase A should use a GitHub App rather than fine-gra
  > A GitHub App better matches least-privilege, repo scoping, and auditability than a per-product PAT. The PAT model is workable, but for write-enabled automation it is the weaker security primitive.
- **G-Q4** = `GQ4-NEVER` — Never open the PR if delta is negative — close the renewal run as failed; don't waste oper
  > If the system measured a regression, the default should be to stop, not to solicit human attention for a clearly worse outcome. Negative-delta PRs create review fatigue and can disguise failure as normal workflow.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > The preview is the user-facing proof that the change actually works in context, so requiring it before PR creation is coherent and safety-improving. It prevents review of code that has no live manifestation yet.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > A product-specific threshold preserves the ability to tune strictness by product risk profile and business context. Hard-coding a universal threshold would be too blunt for heterogeneous products.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > The overall direction is promising, but several sections need tightening: §4.3 single-file scope, §4.4 gate sufficiency, §5.5 preview ordering failure modes, and §6.4 negative-delta handling. Those are material enough to revise before any engineering dispatch.

Overall: The proposal is directionally useful, but the current draft overcommits on write/deploy flow while leaving too many operational edge cases implicit. The main risk is not just security; it is shipping a high-friction system that generates more review work than actionable self-renewal.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Overly broad GitHub PAT permissions**

> §3.2 requires `contents:write` + `pull-requests:write` permissions for the GitHub PAT. This could allow Self-Renewal to push to any branch, not just `flowai/*` branches (§5.1). A more restricted permission set, such as `contents:write` scoped to specific branches, would mitigate this risk.

**Objection 2 — Lack of explicit error handling for Vercel preview failures**

> §5.5 outlines the preview-before-PR ordering but doesn't specify what happens if the Vercel preview build fails. The spec should explicitly state how Self-Renewal handles such failures, including any notifications to the operator or fallback behaviors.

**Objection 3 — Insufficient testing for fix generation**

> §4.4 lists several discard gates for fix generation, including `npm test`. However, it doesn't address the case where a project lacks a comprehensive test suite. The spec should consider additional measures or alternative gates for projects with inadequate testing.

**Worse-than-status-quo scenario:** If Self-Renewal's fix generation introduces regressions that aren't caught by the discard gates (§4.4) or human review, it could lead to worse outcomes than the current manual process, potentially decreasing overall system quality and reliability.

**Precedent:** Similar automated code fix systems, such as those using GitHub's CodeQL or Dependabot, have faced challenges with overly broad permissions, incomplete fix validation, and inadequate error handling. For example, Dependabot has had issues with PRs being opened for dependencies that weren't actually updated.

### Rejection steelman

> The strongest argument for rejecting this proposal is that it doesn't adequately address the risk of introducing regressions or handling edge cases, such as projects without comprehensive test suites or Vercel preview build failures. The proposal relies heavily on human review and existing test suites, which may not always be robust or present.

### Votes

- **G-Q1** = `GQ1-SINGLE` — Single-file scope is correct — multi-file fixes are too risky for the first production dep
  > Restricting to single-file changes reduces the risk of introducing unforeseen interactions or regressions, making it a more cautious and manageable first step for production deployment.
- **G-Q2** = `GQ2-TYPECHECK` — npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit)
  > Adding type checking can help catch type-related errors that might not be covered by the test suite alone, providing an additional layer of validation for the generated fixes.
- **G-Q3** = `GQ3-NARROW` — Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal nev
  > Narrowing the `contents:write` permission to specific branches (e.g., `flowai/*`) would prevent potential misuse or accidental pushes to critical branches, enhancing security.
- **G-Q4** = `GQ4-ALWAYS` — Always open the PR — surface the data; let the human decide. Negative deltas are informati
  > Opening PRs even with negative deltas provides valuable information to the operator about the effectiveness of the fixes, allowing for informed decisions and potential improvements to the Self-Renewal process.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > Ensuring the preview is live before opening the PR allows the operator to review the changes in context, which is crucial for understanding the impact of the fixes and making informed decisions.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > Allowing operators to configure the minimum delta threshold provides flexibility to tailor the Self-Renewal process to their specific needs and risk tolerance, potentially increasing adoption and effectiveness.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > While the proposal is comprehensive, certain areas such as error handling for Vercel preview failures and the handling of projects without comprehensive test suites need further clarification or revision to strengthen the spec before proceeding to Phase A engineering dispatch.

Overall: The proposal is generally well-structured but requires revisions to address specific risks and edge cases before it is ready for implementation.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §3.6 PAT abort lacks update path**

> Source acquisition aborts on PAT scope mismatch or attestation failure with only SELF_RENEWAL_NO_SOURCE error and governance_record_entry; no operator UI or retry mechanism exists in ProductRegistry or admin surfaces to refresh the Doppler path without full product re-onboarding.

**Objection 2 — §6.2 Re-assessment cost unbounded**

> Re-running the full 8-step pipeline on the Vercel preview URL per §6.2 doubles cost to the $0.60–$5.00 envelope noted in Note 3, yet ProductRegistry.selfRenewalSeverityFloor and selfRenewalMinimumDelta provide no cost or invocation cap, and no integration with Orchestra cost ledger exists.

**Objection 3 — §5.5 Draft PR on preview failure**

> When Vercel poll times out or smoke-test fails, §5.5 still creates a draft PR explaining the failure instead of cleanly aborting; this injects noise into the operator's repo and contradicts the 'never a broken PR' claim in §4.4.

**Worse-than-status-quo scenario:** Operators currently triage findings manually with full context; the proposal surfaces negative-delta PRs and draft failure PRs that increase review load and risk accidental merges of regressions or incomplete fixes, degrading rather than improving the existing human-gated workflow.

**Precedent:** Dependabot and Renovate automated PR floods in large monorepos have produced review fatigue, stale branches, and overlooked security regressions when negative-impact changes were not auto-rejected.

### Rejection steelman

> The spec's reliance on fine-grained PATs, preview-before-PR ordering, and honest negative-delta reporting introduces new credential, cost, and noise surfaces without corresponding rollback or budget controls; deferring until a narrower read-only delta-only pilot proves the delta computation and audit trail in isolation would reduce operational risk while still addressing the core Self-Heal gap.

### Votes

- **G-Q1** = `GQ1-SINGLE` — Single-file scope is correct — multi-file fixes are too risky for the first production dep
  > Phase A single-file limit directly mitigates the architectural and cross-file consistency risks called out in §2 and §4.3.
- **G-Q2** = `GQ2-SMOKE` — npm test is insufficient — Phase A should also require a smoke test of the Vercel preview 
  > §4.4 test gate alone cannot catch runtime or rendering regressions that the preview re-assessment in §6.2 is meant to surface.
- **G-Q3** = `GQ3-NARROW` — Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal nev
  > §3.2 minimum permissions still grant more scope than the explicit branch-naming contract in §5.1 requires.
- **G-Q4** = `GQ4-NEVER` — Never open the PR if delta is negative — close the renewal run as failed; don't waste oper
  > §6.4's banner approach still burdens operators with review of known regressions, contradicting the 'human review burden' reduction goal.
- **G-Q5** = `GQ5-PREFIRST` — Preview-before-PR is correct — operator MUST see the renewed result in-browser before bein
  > The ordering in §5.5 is the only safeguard against presenting broken previews, even though it adds latency.
- **G-Q6** = `GQ6-PERPROD` — Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 b
  > A hard-coded threshold would conflict with the honest-reporting philosophy in §6.4 while still allowing operator control.
- **G-Q7** = `GQ7-REVISE` — Revise — identify specific sections that need revision before promotion.
  > Cost controls, PAT update paths, and preview-failure abort behavior require tightening before Phase A dispatch.

Overall: The proposal's security invariants are strong but its operational guardrails remain incomplete.


---

## Raw reviewer responses (first 8K each)

### Slot 1 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 73599 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Unvalidated PR body injection risk",
        "detail": "§5.4 claims deterministic template prevents injection but §6.5 shows evidence strings from assessments are included. If finding.evidence contains malicious markdown/HTML that bypasses the 500-char cap + HTML-escape, it could execute in GitHub's PR renderer."
      },
      {
        "title": "Preview polling creates DoS vector",
        "detail": "§5.5 polls Vercel API for 10 minutes waiting for READY state. A malicious actor could trigger many renewal runs simultaneously, exhausting Vercel API rate limits and blocking legitimate deployments across all operator products."
      },
      {
        "title": "Delta score gaming via test deletion",
        "detail": "§4.4 only checks that npm test passes, not that tests weren't deleted. A fix could improve the delta score by removing failing tests rather than fixing the underlying issues, creating false confidence in degraded code."
      }
    ],
    "worse_than_status_quo": "Status quo has humans manually fixing issues with full context. Option C could create alert fatigue where operators rubber-stamp PRs with positive deltas without understanding that the 'fixes' achieved scores by removing security checks or error handling.",
    "precedent": "Dependabot's automated PR generation created similar review fatigue where maintainers merged updates without proper review, leading to the 2021 ua-parser-js supply chain attack that affected millions."
  },
  "rejection_steelman": "Option C fundamentally violates the principle of least privilege by granting write access to production codebases before proving the system can correctly identify issues. The spec should require 90+ days of recommend-only operation with accuracy metrics before any write authority is granted. Additionally, the re-assessment cost ($0.65-$5.00 per run per Note 3) creates a multiplicative expense that could exceed the engineering cost of manual fixes for low-severity issues.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).",
      "rationale": "Most real-world fixes require updating tests alongside implementation; artificially limiting to single files will cause Phase A to skip the majority of actionable findings."
    },
    "G-Q2": {
      "pick_text": "npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at all, which is unacceptable; the gate should be optional with operator opt-in.",
      "rationale": "Many production systems have minimal test coverage; requiring tests excludes precisely the products that most need automated assistance with quality issues."
    },
    "G-Q3": {
      "pick_text": "Different permission model entirely — Phase A should use a GitHub App rather than fine-grained PAT, with installation-time consent + webhook subscription.",
      "rationale": "GitHub Apps provide better audit trails, automatic token rotation, and installation-time consent that makes the security model explicit to operators."
    },
    "G-Q4": {
      "pick_text": "Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.",
      "rationale": "Opening PRs that make things worse trains operators to ignore Self-Renewal output, defeating the system's purpose."
    },
    "G-Q5": {
      "pick_text": "Wrong gate entirely — for non-Vercel-hosted operators there is no preview; Phase A should support a \"no preview\" path with explicit operator opt-in.",
      "rationale": "Limiting Self-Renewal to Vercel-only creates vendor lock-in; many operators use Netlify, AWS, or self-hosted deployments."
    },
    "G-Q6": {
      "pick_text": "Hard-coded minimum delta of +5 — FlowAI only opens PRs with substantial improvement (per a Panel-ratified threshold for what \"substantial\" means).",
      "rationale": "Without a meaningful threshold, operators will be flooded with marginal-improvement PRs that consume review cycles for minimal benefit."
    },
    "G-Q7": {
      "pick_text": "Defer — Phase A is not the right next investment; some other engineering work should land first (specify in rationale).",
      "rationale": "The system should first prove accuracy in recommend-only mode for 90+ days, building operator trust and refinement metrics before requesting write access to production code."
    }
  },
  "overall_notes": "The spec's core flaw is attempting to jump directly to write authority without establishing trust through proven read-only recommendations first."
}
```

---

### Slot 2 — openrouter:openai/gpt-4o

- Provider: `openrouter`
- Latency: 10856 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Limited fix scope",
        "detail": "Section §4.3 restricts fix generation to single-file changes only in Phase A. This limitation may prevent addressing issues that inherently require multi-file changes, potentially leaving significant issues unresolved and reducing the effectiveness of the Self-Renewal process."
      },
      {
        "title": "Potential security risks with PAT",
        "detail": "Section §3.2 outlines the use of GitHub PATs with `contents:write` permissions. This could pose a security risk if the PAT is compromised, as it allows writing to repositories. The proposal lacks detailed mitigation strategies for such scenarios."
      },
      {
        "title": "High operational costs",
        "detail": "Section §6.2 and Note 3 highlight the potential high costs of running the full 8-step pipeline twice per renewal. This could lead to significant operational expenses, especially for products with frequent renewal cycles, potentially making the process economically unviable."
      }
    ],
    "worse_than_status_quo": "The proposal could lead to increased operational costs without guaranteeing significant improvements, as the single-file fix scope may not address all critical issues, and the high cost of re-assessment could outweigh the benefits.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposal should be rejected or deferred because it introduces significant operational costs and security risks without adequately addressing multi-file issues, which are common in real-world applications. The limited scope of fixes and potential for high costs could outweigh the benefits, making the system less efficient than the status quo.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).",
      "rationale": "Restricting to single-file changes may not address issues that span multiple files, which are common in complex systems."
    },
    "G-Q2": {
      "pick_text": "npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit) where applicable.",
      "rationale": "Type checking is crucial for catching errors that tests might not cover, especially in TypeScript projects."
    },
    "G-Q3": {
      "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).",
      "rationale": "Narrowing permissions reduces security risks by limiting the scope of potential damage if the PAT is compromised."
    },
    "G-Q4": {
      "pick_text": "Threshold-based — open the PR if delta ≥ a configurable minimum (e.g., delta_total ≥ +5); below that, close as failed.",
      "rationale": "Opening PRs only for significant improvements prevents unnecessary review work for minor or negative changes."
    },
    "G-Q5": {
      "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.",
      "rationale": "Ensuring the preview is live before PR opening allows operators to verify changes visually, which is crucial for effective review."
    },
    "G-Q6": {
      "pick_text": "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.",
      "rationale": "Allowing operators to set their own thresholds provides flexibility and ensures that the process aligns with their specific needs."
    },
    "G-Q7": {
      "pick_text": "Revise — identify specific sections that need revision before promotion.",
      "rationale": "The proposal needs revisions to address security concerns, operational costs, and the limited scope of fixes before it can be promoted."
    }
  },
  "overall_notes": "The proposal introduces valuable automation but requires revisions to address security, cost, and scope limitations."
}
```

---

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct

- Provider: `openrouter`
- Latency: 48313 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Single-file fix scope", "detail": "The proposal restricts fix generation to single-file changes, which may not be sufficient for complex issues that require multi-file fixes. This limitation may lead to incomplete or inaccurate fixes, potentially causing more harm than good. (§4.3)" },
      { "title": "Lack of regression testing", "detail": "The proposal relies on the human PR reviewer to catch regressions, which may not be effective in all cases. The absence of automated regression testing may lead to unintended consequences, such as introducing new bugs or breaking existing functionality. (§2, §7.5)" },
      { "title": "Insufficient security controls", "detail": "The proposal's security controls, such as the use of fine-grained GitHub PATs and scrubbing of credentials, may not be sufficient to prevent unauthorized access or data breaches. Additional security measures, such as encryption and access controls, may be necessary to ensure the security and integrity of the system. (§3.2, §8.1)" }
    ],
    "worse_than_status_quo": "The proposal's limitations and potential security risks may lead to a worse outcome than the current status quo, where human reviewers and developers manually review and fix issues. The automated fix generation and PR creation process may introduce new errors or security vulnerabilities, potentially causing more harm than good.",
    "precedent": "No precedent known"
  },
  "rejection_steelman": "The proposal's limitations and potential security risks, combined with the lack of regression testing and insufficient security controls, make it a high-risk proposition. Rejecting or deferring the proposal would allow for further refinement and addressing of these concerns, ensuring a more robust and secure solution.",
  "answers": {
    "G-Q1": { "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).", "rationale": "This option acknowledges the potential limitations of single-file fixes and proposes a more flexible approach to address complex issues." },
    "G-Q2": { "pick_text": "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + key DOM elements present).", "rationale": "This option recognizes the importance of regression testing and proposes an additional test to ensure the fix does not introduce new errors." },
    "G-Q3": { "pick_text": "contents:write + pull-requests:write is the correct minimum — narrow enough to prevent abuse, broad enough to do the job.", "rationale": "This option strikes a balance between security and functionality, ensuring that the proposal has the necessary permissions to operate effectively." },
    "G-Q4": { "pick_text": "Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.", "rationale": "This option prioritizes transparency and human judgment, allowing operators to make informed decisions about the proposed fixes." },
    "G-Q5": { "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.", "rationale": "This option ensures that operators have a clear understanding of the proposed changes and can make informed decisions about the fix." },
    "G-Q6": { "pick_text": "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.", "rationale": "This option provides flexibility and allows operators to tailor the minimum delta threshold to their specific needs and preferences." },
    "G-Q7": { "pick_text": "Revise — identify specific sections that need revision before promotion.", "rationale": "This option acknowledges the potential limitations and risks of the proposal and recommends further refinement before proceeding." }
  },
  "overall_notes": "The proposal has potential, but its limitations and potential security risks need to be addressed through further refinement and testing. A more cautious approach, prioritizing security and regression testing, would be preferable to ensure a robust and reliable solution."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 42685 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Over-broad GitHub PAT permissions",
        "detail": "The proposal grants 'contents:write' and 'pull-requests:write' permissions to the GitHub PAT. This is over-broad and allows for force-pushing to the default branch, which is not necessary for the proposed functionality. The permission should be narrowed to prevent abuse."
      },
      {
        "title": "Lack of regression testing",
        "detail": "The proposal does not include regression testing as part of the fix-discard gates. This means that even if a fix passes all the current tests, it could still introduce regressions that are not caught until the human review stage."
      },
      {
        "title": "Vercel-only preview limitation",
        "detail": "The proposal requires Vercel for preview deployment, which limits its applicability to products hosted on Vercel. This excludes a significant portion of potential users who may use other hosting providers. The proposal should include a path for non-Vercel-hosted products."
      },
      {
        "title": "Risk of credential leakage",
        "detail": "While the proposal includes measures to prevent credential leakage, the use of fine-grained PATs and the handling of credentials in process memory introduce risks. Any leakage of these credentials could have severe security implications."
      }
    ],
    "worse_than_status_quo": "The proposal's requirement for Vercel-only preview deployment makes the system worse than the status quo for non-Vercel-hosted products, as it introduces an additional barrier to using the self-renewal feature.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposal should be rejected because it introduces significant security risks with over-broad GitHub PAT permissions and the handling of credentials in process memory. Additionally, the lack of regression testing and the Vercel-only preview limitation make the system less flexible and more risky than the current status quo.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).",
      "rationale": "Supporting multi-file fixes would make the self-renewal process more comprehensive and align better with real-world use cases."
    },
    "G-Q2": {
      "pick_text": "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + key DOM elements present).",
      "rationale": "Adding a smoke test would provide an additional layer of validation and help catch issues that might not be covered by the existing test suite."
    },
    "G-Q3": {
      "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrowed (e.g., contents:write scoped to branches matching flowai/*).",
      "rationale": "Narrowing the permissions would reduce the risk of abuse and align better with the actual requirements of the self-renewal process."
    },
    "G-Q4": {
      "pick_text": "Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.",
      "rationale": "Opening PRs with negative deltas wastes operator time and resources, and could lead to the merging of regressions."
    },
    "G-Q5": {
      "pick_text": "Too strict — Phase A should open the PR concurrently with preview build (PR opens immediately on branch creation; preview URL added as PR comment when ready).",
      "rationale": "Opening the PR concurrently with the preview build would streamline the process and reduce waiting times for operators."
    },
    "G-Q6": {
      "pick_text": "Hard-coded minimum delta of +1 — FlowAI never opens PRs that don't show measurable improvement.",
      "rationale": "Setting a minimum delta threshold ensures that only meaningful improvements are surfaced to the operator, reducing noise and unnecessary reviews."
    },
    "G-Q7": {
      "pick_text": "Revise — identify specific sections that need revision before promotion.",
      "rationale": "The proposal has several areas that need revision, including the handling of GitHub PAT permissions, the lack of regression testing, and the Vercel-only preview limitation."
    }
  },
  "overall_notes": "The proposal introduces significant risks and limitations that need to be addressed before it can be promoted. Specific revisions are required to improve security, flexibility, and comprehensiveness."
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 49602 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "GitHub PAT minimum permissions",
        "detail": "The GitHub PAT minimum permissions should be more restrictive to prevent potential abuse. The current permissions allow for force-pushing to the default branch, which Self-Renewal never does. A more narrow permission scope, such as 'contents:write' scoped to branches matching 'flowai/*', would be more appropriate."
      },
      {
        "title": "Negative-delta PR opening",
        "detail": "The proposal suggests always opening a PR, even if the fix makes the score worse. This could lead to a waste of operator review time on regressions. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR."
      },
      {
        "title": "Preview-before-PR ordering",
        "detail": "The proposal requires the Vercel preview to be live before the PR is opened, which is too strict. A more flexible approach would be to open the PR concurrently with the preview build, and add the preview URL as a PR comment when ready. This would allow for a more efficient workflow and reduce the time between the PR being opened and the operator being able to review the code."
      }
    ],
    "worse_than_status_quo": "The proposal could lead to a waste of operator review time on regressions, as it always opens a PR even if the fix makes the score worse. This could result in operators spending time reviewing code that is not an improvement, and potentially even introducing regressions into their codebase.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "The proposal should be rejected because it does not sufficiently address the risk of introducing regressions. The current approach of always opening a PR, even if the fix makes the score worse, could lead to operators spending time reviewing code that is not an improvement, and potentially even introducing regressions into their codebase. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR. This would ensure that operators only review code that is an improvement, and reduce the risk of introducing regressions."
  },
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too permissive — Phase A should restrict further (e.g., single-function-only within a file).",
      "rationale": "The single-file scope is too permissive and could lead to potential issues. By restricting further, such as to single-function-only within a file, the risk of introducing regressions is reduced, and the operator is less likely to spend time reviewing code that is not an improvement."
    },
    "G-Q2": {
      "pick_text": "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + assert key DOM elements present).",
      "rationale": "The 'npm test' gate is insufficient to catch potential issues. By adding a smoke test of the Vercel preview, the operator can be more confident that the code is working as expected, and the risk of introducing regressions is reduced."
    },
    "G-Q3": {
      "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).",
      "rationale": "The current GitHub PAT minimum permissions are too broad and could lead to potential abuse. By narrowing the permissions to 'contents:write' scoped to branches matching 'flowai/*', the risk of abuse is reduced, and the operator can be more confident that the code is not being force-pushed to the default branch."
    },
    "G-Q4": {
      "pick_text": "Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.",
      "rationale": "The proposal suggests always opening a PR, even if the fix makes the score worse. This could lead to a waste of operator review time on regressions. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR."
    },
    "G-Q5": {
      "pick_text": "Too strict — Phase A should open the PR concurrently with preview build (PR opens immediately on branch creation; preview URL added as PR comment when ready).",
      "rationale": "The proposal requires the Vercel preview to be live before the PR is opened, which is too strict. A more flexible approach would be to open the PR concurrently with the preview build, and add the preview URL as a PR comment when ready. This would allow for a more efficient workflow and reduce the time between the PR being opened and the operator being able to review the code."
    },
    "G-Q6": {
      "pick_text": "REJECT — none of the listed options is acceptable as specified",
      "rationale": "The proposal does not provide a sufficient mechanism for handling negative deltas. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR. This would ensure that operators only review code that is an improvement, and reduce the risk of introducing regressions."
    },
    "G-Q7": {
      "pick_text": "Reject — Option C is the wrong architectural approach; a different approach should be pursued (specify in rationale).",
      "rationale": "The proposal does not sufficiently address the risk of introducing regressions. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR. This would ensure that operators only review code that is an improvement, and reduce the risk of introducing regressions."
    }
  },
  "overall_notes": "The proposal should be rejected because it does not sufficiently address the risk of introducing regressions. A better approach would be to close the renewal run as failed if the delta is negative, and not open a PR. This would ensure that operators only review code that is an improvement, and reduce the risk of introducing regressions."
}
```

---

### Slot 6 — openrouter:google/gemini-2.0-flash-001

- Provider: `openrouter`
- Latency: 10870 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Source acquisition risk",
        "detail": "§3.5 uses the GitHub REST API directly, which is different from the existing tarball mechanism. This introduces a new code path with potential security vulnerabilities and requires careful scrutiny to ensure it doesn't expose sensitive information or allow unauthorized access."
      },
      {
        "title": "Fix generation limitations",
        "detail": "§4.3 restricts fix generation to single-file changes in Phase A. This limitation may prevent the system from addressing more complex issues that require modifications across multiple files, reducing the overall effectiveness of the self-renewal process."
      },
      {
        "title": "Delta score reliability",
        "detail": "§6.2 relies on re-running the full 8-step pipeline against the Vercel preview URL to generate the post-renewal score. This re-assessment may not accurately reflect the actual impact of the fix due to differences between the preview environment and the production environment, leading to misleading delta scores."
      },
      {
        "title": "Credential exposure risk",
        "detail": "While §3.3 outlines measures to protect the GitHub PAT, the risk of accidental credential exposure remains a concern. A single coding error could lead to the PAT being logged, persisted, or sent to an external service, compromising the security of the system."
      },
      {
        "title": "Test gate limitations",
        "detail": "§4.4 relies on `npm test` as a primary gate for fix application. However, many projects lack comprehensive test suites, making this gate ineffective at preventing regressions. This could lead to the deployment of broken code, despite passing the test gate."
      }
    ],
    "worse_than_status_quo": "If the delta score is inaccurate and misleading, and the human reviewer trusts it, the system could merge a change that actually makes the system worse, believing it to be an improvement. This is worse than the status quo because it introduces a false sense of security.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "This proposal introduces significant complexity and risk with limited immediate benefit. The single-file fix scope and reliance on potentially unreliable delta scores may not justify the engineering effort required. Deferring this proposal would allow for further exploration of alternative approaches and a more thorough assessment of the potential risks and benefits.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).",
      "rationale": "Single-file scope is too limiting. Many fixes involve changes to a component and its corresponding test file, or changes that span a route and its layout."
    },
    "G-Q2": {
      "pick_text": "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + key DOM elements present).",
      "rationale": "Relying solely on `npm test` is insufficient. A smoke test of the Vercel preview would provide an additional layer of confidence by verifying that the fix functions correctly in a live environment."
    },
    "G-Q3": {
      "pick_text": "Different permission model entirely — Phase A should use a GitHub App rather than fine-grained PAT, with installation-time consent + webhook subscription.",
      "rationale": "Using a GitHub App would provide a more secure and manageable approach to granting permissions. Installation-time consent and webhook subscriptions would allow for finer-grained control and better auditing."
    },
    "G-Q4": {
      "pick_text": "Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.",
      "rationale": "Opening the PR, even with a negative delta, provides valuable information to the operator. The human reviewer can then assess the changes and determine whether to merge them, regardless of the score."
    },
    "G-Q5": {
      "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.",
      "rationale": "Ensuring the preview is live before opening the PR is crucial. The operator needs to see the changes in action before reviewing the code to make an informed decision."
    },
    "G-Q6": {
      "pick_text": "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.",
      "rationale": "Allowing the operator to configure the minimum delta provides flexibility and control. Different products may have different requirements, and the operator is best positioned to determine the appropriate threshold."
    },
    "G-Q7": {
      "pick_text": "Revise — identify specific sections that need revision before promotion.",
      "rationale": "The proposal has potential but requires revisions to address the identified risks and limitations. Specifically, the source acquisition method, fix generation scope, and delta score reliability need further scrutiny."
    }
  },
  "overall_notes": "The proposal is ambitious but needs more work to address security concerns and ensure the reliability of the delta score. A more gradual approach with tighter scope and more robust testing may be warranted."
}
```
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 118290 ms
- HTTP status: OK

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Single-file fix limitation",
        "detail": "§4.3 restricts Phase A to single-file fixes only. This excludes common multi-file patterns like component-test pairs, forcing manual fixes for interconnected issues. The arbitrary constraint reduces utility for operators with complex codebases where most meaningful fixes span multiple files."
      },
      {
        "title": "Test-dependent discard gates",
        "detail": "§4.4 gates require passing npm test/lint/build. Projects without tests (common in early-stage products) become ineligible for auto-fixes. This violates §22 Product-Agnostic Rule by implicitly requiring test infrastructure, excluding operators without comprehensive test suites from Self-Renewal benefits."
      },
      {
        "title": "Vercel vendor lock-in",
        "detail": "§5.6 makes Vercel mandatory for preview deployment. Non-Vercel operators (e.g., AWS/Netlify users) are excluded without fallback. This contradicts §25 Locked Rule 4 (Product-Agnostic Principle) and creates a fragmented experience where core functionality is unavailable to subsets of users."
      },
      {
        "title": "Credential exposure risk",
        "detail": "§3.3-3.4 relies on GitHub PATs in Doppler. While scrubbing is implemented, the Contents API writes require broad contents:write permissions. A compromised renewal run could inject malicious code into operator repos via §3.5's file-write mechanism, exploiting the elevated PAT scope."
      }
    ],
    "worse_than_status_quo": "An operator with partial test coverage and non-Vercel deployment attempts Self-Renewal. All fixes are discarded due to missing tests (§4.4), while preview deployment fails (§5.6), flooding ProductSSOT with auto_fix_attempted_failed and out_of_scope entries. The operator now manages false alerts plus manual fixes, with doubled pipeline costs from failed re-assessments (§6.2), making automation more burdensome than manual intervention.",
    "precedent": "The 2012 Knight Capital incident, where untested deployment automation caused $460M loss in 45 minutes. Similar to §4.4's test-dependent gates, Knight's system lacked safeguards for incomplete test coverage, allowing a faulty deployment to trigger catastrophic failure when partial tests passed."
  },
  "rejection_steelman": "The proposal introduces substantial complexity for limited initial value. Single-file restrictions exclude most meaningful fixes, Vercel dependency fragments the user base, and test-gating renders the system unusable for early-stage products. With high implementation cost (3-4 weeks) and unresolved security risks in credential handling, deferring until Phase A includes multi-file support, cloud-agnostic previews, and test-free operation modes would better align with product-agnostic principles and deliver broader utility.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).",
      "rationale": "Many critical fixes inherently span 2-3 files; excluding them severely limits real-world applicability while providing minimal risk reduction."
    },
    "G-Q2": {
      "pick_text": "npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at all, which is unacceptable; the gate should be optional with operator opt-in.",
      "rationale": "Mandatory tests violate product-agnostic principles and exclude valid use cases; opt-in preserves safety while expanding accessibility."
    },
    "G-Q3": {
      "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).",
      "rationale": "Current permissions are excessively permissive; branch-scoped write access maintains functionality while reducing attack surface."
    },
    "G-Q4": {
      "pick_text": "Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.",
      "rationale": "Transparency trumps optimization; hiding regressions undermines trust and prevents learning from failures."
    },
    "G-Q5": {
      "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.",
      "rationale": "Functional verification before code review reduces cognitive load and ensures proposed changes resolve visible issues."
    },
    "G-Q6": {
      "pick_text": "Always open the PR (no minimum delta required) — operator sees everything.",
      "rationale": "Arbitrary thresholds risk hiding valuable context; operators should assess all outcomes given their unique priorities."
    },
    "G-Q7": {
      "pick_text": "Revise — identify specific sections that need revision before promotion.",
      "rationale": "The spec has merit but requires amendments to §4.3 (multi-file), §4.4 (test opt-out), and §5.6 (cloud-agnostic previews) to achieve viability."
    }
  },
  "overall_notes": "Addressing the objections would make Option C transformative, but current constraints risk limiting adoption to niche scenarios."
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 10127 ms
- HTTP status: OK

```
{"reviewer_slot":3,"adversarial_pass":{"objections":[{"title":"Preview gating can deadlock","detail":"§5.5 requires a live Vercel preview before opening the PR, but §5.6 also makes Option C unavailable for non-Vercel products. That creates a hard failure mode where a product with a valid GitHub repo but slow or flaky preview builds can never produce a reviewable PR, even when the code change is obviously safe."},{"title":"Single-file scope misses real fixes","detail":"§4.3 limits Phase A to one file per finding, yet the spec itself acknowledges common fixes are component+test or route+layout pairs. This means the system will systematically discard many correct remediation paths as out-of-scope, biasing the tool toward cosmetic fixes and leaving substantive defects open."},{"title":"Test gate is under-specified","detail":"§4.4 accepts 'npm test (or equivalent)' without requiring typecheck or a meaningful preview smoke test. In a TypeScript or Vite/Next codebase, a fix can pass tests while still breaking compilation, routing, or runtime behavior in the preview; the proposal partially admits this by treating Vercel build failure as a discard signal, but that is a late and noisy guard."},{"title":"Negative delta still opens PR","detail":"§6.4 explicitly opens PRs even when the before/after delta is negative, relying on a banner to warn the operator. This risks normalizing regressions as reviewable artifacts, increasing review burden and making it easier for a low-quality fix set to consume human attention despite being worse than the original state."}],"worse_than_status_quo":"A flaky preview build returns a misleading READY state, the PR is opened anyway with a negative delta banner, and the operator is forced to inspect a branch that cannot merge cleanly and may have regressed the product. Compared with the current analyzer-only flow, this adds time, noise, and a new failure surface without guaranteeing a better fix outcome.","precedent":"The 'preview-first' idea has a real analogue in Vercel/Netlify-style preview deployments, but those systems are typically used to assist human review, not to gate the existence of the review artifact itself. I am not aware of a precise precedent where a PR is withheld until a preview is healthy; no precedent known."},"rejection_steelman":"The strongest case for rejecting or deferring is that the spec mixes three high-risk capabilities at once: code generation, repository write access, and deployment-triggered verification. That combination creates many ways to fail silently or to produce expensive, low-signal churn, especially because Phase A deliberately excludes multi-file fixes and regression-aware test generation. Deferring would let the team first harden source acquisition, diff validation, and preview smoke-testing in a narrower internal loop before granting the system a human-visible PR workflow.","answers":{"G-Q1":{"pick_text":"Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).","rationale":"The proposal’s own scope admits many legitimate fixes are paired changes, and the single-file rule will misclassify them as out-of-scope. That makes Phase A less a safety boundary and more a productivity cap."},"G-Q2":{"pick_text":"npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit) where applicable.","rationale":"Tests alone do not protect TypeScript compilation or many structural failures, especially in codebases with partial test coverage. Typecheck is a cheap and direct guard that fits the proposal’s existing discard-gate model."},"G-Q3":{"pick_text":"Different permission model entirely — Phase A should use a GitHub App rather than fine-grained PAT, with installation-time consent + webhook subscription.","rationale":"A GitHub App better matches least-privilege, repo scoping, and auditability than a per-product PAT. The PAT model is workable, but for write-enabled automation it is the weaker security primitive."},"G-Q4":{"pick_text":"Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.","rationale":"If the system measured a regression, the default should be to stop, not to solicit human attention for a clearly worse outcome. Negative-delta PRs create review fatigue and can disguise failure as normal workflow."},"G-Q5":{"pick_text":"Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.","rationale":"The preview is the user-facing proof that the change actually works in context, so requiring it before PR creation is coherent and safety-improving. It prevents review of code that has no live manifestation yet."},"G-Q6":{"pick_text":"Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.","rationale":"A product-specific threshold preserves the ability to tune strictness by product risk profile and business context. Hard-coding a universal threshold would be too blunt for heterogeneous products."},"G-Q7":{"pick_text":"Revise — identify specific sections that need revision before promotion.","rationale":"The overall direction is promising, but several sections need tightening: §4.3 single-file scope, §4.4 gate sufficiency, §5.5 preview ordering failure modes, and §6.4 negative-delta handling. Those are material enough to revise before any engineering dispatch."}},"overall_notes":"The proposal is directionally useful, but the current draft overcommits on write/deploy flow while leaving too many operational edge cases implicit. The main risk is not just security; it is shipping a high-friction system that generates more review work than actionable self-renewal."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 38624 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Overly broad GitHub PAT permissions",
        "detail": "§3.2 requires `contents:write` + `pull-requests:write` permissions for the GitHub PAT. This could allow Self-Renewal to push to any branch, not just `flowai/*` branches (§5.1). A more restricted permission set, such as `contents:write` scoped to specific branches, would mitigate this risk."
      },
      {
        "title": "Lack of explicit error handling for Vercel preview failures",
        "detail": "§5.5 outlines the preview-before-PR ordering but doesn't specify what happens if the Vercel preview build fails. The spec should explicitly state how Self-Renewal handles such failures, including any notifications to the operator or fallback behaviors."
      },
      {
        "title": "Insufficient testing for fix generation",
        "detail": "§4.4 lists several discard gates for fix generation, including `npm test`. However, it doesn't address the case where a project lacks a comprehensive test suite. The spec should consider additional measures or alternative gates for projects with inadequate testing."
      }
    ],
    "worse_than_status_quo": "If Self-Renewal's fix generation introduces regressions that aren't caught by the discard gates (§4.4) or human review, it could lead to worse outcomes than the current manual process, potentially decreasing overall system quality and reliability.",
    "precedent": "Similar automated code fix systems, such as those using GitHub's CodeQL or Dependabot, have faced challenges with overly broad permissions, incomplete fix validation, and inadequate error handling. For example, Dependabot has had issues with PRs being opened for dependencies that weren't actually updated."
  },
  "rejection_steelman": "The strongest argument for rejecting this proposal is that it doesn't adequately address the risk of introducing regressions or handling edge cases, such as projects without comprehensive test suites or Vercel preview build failures. The proposal relies heavily on human review and existing test suites, which may not always be robust or present.",
  "answers": {
    "G-Q1": {
      "pick_text": "Single-file scope is correct — multi-file fixes are too risky for the first production deployment of automated fix application.",
      "rationale": "Restricting to single-file changes reduces the risk of introducing unforeseen interactions or regressions, making it a more cautious and manageable first step for production deployment."
    },
    "G-Q2": {
      "pick_text": "npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit) where applicable.",
      "rationale": "Adding type checking can help catch type-related errors that might not be covered by the test suite alone, providing an additional layer of validation for the generated fixes."
    },
    "G-Q3": {
      "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).",
      "rationale": "Narrowing the `contents:write` permission to specific branches (e.g., `flowai/*`) would prevent potential misuse or accidental pushes to critical branches, enhancing security."
    },
    "G-Q4": {
      "pick_text": "Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.",
      "rationale": "Opening PRs even with negative deltas provides valuable information to the operator about the effectiveness of the fixes, allowing for informed decisions and potential improvements to the Self-Renewal process."
    },
    "G-Q5": {
      "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.",
      "rationale": "Ensuring the preview is live before opening the PR allows the operator to review the changes in context, which is crucial for understanding the impact of the fixes and making informed decisions."
    },
    "G-Q6": {
      "pick_text": "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.",
      "rationale": "Allowing operators to configure the minimum delta threshold provides flexibility to tailor the Self-Renewal process to their specific needs and risk tolerance, potentially increasing adoption and effectiveness."
    },
    "G-Q7": {
      "pick_text": "Revise — identify specific sections that need revision before promotion.",
      "rationale": "While the proposal is comprehensive, certain areas such as error handling for Vercel preview failures and the handling of projects without comprehensive test suites need further clarification or revision to strengthen the spec before proceeding to Phase A engineering dispatch."
    }
  },
  "overall_notes": "The proposal is generally well-structured but requires revisions to address specific risks and edge cases before it is ready for implementation."
}```
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 19513 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      { "title": "§3.6 PAT abort lacks update path", "detail": "Source acquisition aborts on PAT scope mismatch or attestation failure with only SELF_RENEWAL_NO_SOURCE error and governance_record_entry; no operator UI or retry mechanism exists in ProductRegistry or admin surfaces to refresh the Doppler path without full product re-onboarding." },
      { "title": "§6.2 Re-assessment cost unbounded", "detail": "Re-running the full 8-step pipeline on the Vercel preview URL per §6.2 doubles cost to the $0.60–$5.00 envelope noted in Note 3, yet ProductRegistry.selfRenewalSeverityFloor and selfRenewalMinimumDelta provide no cost or invocation cap, and no integration with Orchestra cost ledger exists." },
      { "title": "§5.5 Draft PR on preview failure", "detail": "When Vercel poll times out or smoke-test fails, §5.5 still creates a draft PR explaining the failure instead of cleanly aborting; this injects noise into the operator's repo and contradicts the 'never a broken PR' claim in §4.4." }
    ],
    "worse_than_status_quo": "Operators currently triage findings manually with full context; the proposal surfaces negative-delta PRs and draft failure PRs that increase review load and risk accidental merges of regressions or incomplete fixes, degrading rather than improving the existing human-gated workflow.",
    "precedent": "Dependabot and Renovate automated PR floods in large monorepos have produced review fatigue, stale branches, and overlooked security regressions when negative-impact changes were not auto-rejected."
  },
  "rejection_steelman": "The spec's reliance on fine-grained PATs, preview-before-PR ordering, and honest negative-delta reporting introduces new credential, cost, and noise surfaces without corresponding rollback or budget controls; deferring until a narrower read-only delta-only pilot proves the delta computation and audit trail in isolation would reduce operational risk while still addressing the core Self-Heal gap.",
  "answers": {
    "G-Q1": { "pick_text": "Single-file scope is correct — multi-file fixes are too risky for the first production deployment of automated fix application.", "rationale": "Phase A single-file limit directly mitigates the architectural and cross-file consistency risks called out in §2 and §4.3." },
    "G-Q2": { "pick_text": "npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + key DOM elements present).", "rationale": "§4.4 test gate alone cannot catch runtime or rendering regressions that the preview re-assessment in §6.2 is meant to surface." },
    "G-Q3": { "pick_text": "Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).", "rationale": "§3.2 minimum permissions still grant more scope than the explicit branch-naming contract in §5.1 requires." },
    "G-Q4": { "pick_text": "Never open the PR if delta is negative — close the renewal run as failed; don't waste operator review time on regressions.", "rationale": "§6.4's banner approach still burdens operators with review of known regressions, contradicting the 'human review burden' reduction goal." },
    "G-Q5": { "pick_text": "Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.", "rationale": "The ordering in §5.5 is the only safeguard against presenting broken previews, even though it adds latency." },
    "G-Q6": { "pick_text": "Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.", "rationale": "A hard-coded threshold would conflict with the honest-reporting philosophy in §6.4 while still allowing operator control." },
    "G-Q7": { "pick_text": "Revise — identify specific sections that need revision before promotion.", "rationale": "Cost controls, PAT update paths, and preview-failure abort behavior require tightening before Phase A dispatch." }
  },
  "overall_notes": "The proposal's security invariants are strong but its operational guardrails remain incomplete."
}
```
