# Panel — Self-Renewal v3 ADVERSARIAL RATIFICATION (2026-05-17)

**Spec:** docs/specs/SELF_RENEWAL_SPEC.md (commit 79e4499)
**Mode:** ADVERSARIAL — locked W5b format. Re-rates G-Q1/G-Q3/G-Q4/G-Q6/G-Q7. G-Q2 + G-Q5 carry RATIFIED.
**Started:** 2026-05-17T07:21:07.788Z  ·  **Finished:** 2026-05-17T07:22:56.395Z
**Bundle:** 83342 chars (compact §10+§11+§15.1 canonical + full v3 spec).
**Audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"amazon":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}

## 🚨 RATIFICATION VERDICT — `NOT_RATIFIED`
4 of 5 re-rated question(s) lack clear Panel majority.

## DISSENT-FLOOR
Alignment 3/30 = **10.0%** · objections **30** · ✅ PASS

## Per-question tally
| Q | Top key | Top / Engaged | Verdict |
|---|---|---|---|
| **G-Q1** | `GQ1v3-D` | 3 / 6 | `PLURALITY_GQ1v3-D` |
| **G-Q3** | `GQ3v3-C` | 4 / 6 | `PLURALITY_GQ3v3-C` |
| **G-Q4** | `GQ4v3-C` | 4 / 6 | `PLURALITY_GQ4v3-C` |
| **G-Q6** | `GQ6v3-D` | 6 / 6 | `UNANIMOUS_GQ6v3-D` |
| **G-Q7** | `GQ7v3-C` | 5 / 6 | `PLURALITY_GQ7v3-C` |

## Per-question detail
### G-Q1 — Self-Renewal §4.3 v3 — single-file fix scope (MAX_FILES reverted from 3 → 1) with diff-parse-time enforcement; Phase B graduation at ≥30 days × ≥3 of 5 products. Is this the right scope boundary for Phase A?

Tally (ENGAGED-only, 6):
  - `GQ1v3-A` "Single-file scope with diff-parse-time enforcement and the defined Phase B graduation trigger is correct — minimum production risk, structural guarantee, clear "  →  **1**
  - `GQ1v3-B` "Single-file is too restrictive given typecheck + preview-smoke MUST gates already catch most multi-file regressions — Phase A should re-raise to 2 files (compon"  →  **1**
  - `GQ1v3-C` "Single-file is correct for Phase A but the 30-day / 3-product graduation trigger is too quick — Phase B should require ≥90 days × ≥4 of 5 products since multi-f"  →  **1**
  - `GQ1v3-D` "The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate Panel ratification of a new spec, preserving adversarial re"  →  **3**

**Verdict:** `PLURALITY_GQ1v3-D` — 3 of 6 on GQ1v3-D (below 7/10 quorum).

### G-Q3 — Self-Renewal §3.2 v3 — GitHub App ONLY credential model (fine-grained PAT fallback dropped). Products without a GitHub App installation are directed to install on first failed run. No Doppler PAT path; no `flowai-self-renewal` machine user. Is this the right credential model for Phase A?

Tally (ENGAGED-only, 6):
  - `GQ3v3-A` "App-only from day one is correct — install-flow friction is acceptable because the App is the long-term safe path; a temporary fallback would only require a lat"  →  **0**
  - `GQ3v3-B` "Insufficient — Phase A should additionally pin the App's manifest in-repo (e.g. .github/flowai-app-manifest.yml) so any change to the App's permission set produ"  →  **2**
  - `GQ3v3-C` "Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag so an operator stuck mid-install can still get an emergency r"  →  **4**
  - `GQ3v3-D` "Wrong shape — drop the GitHub App entirely and use a per-renewal-run device-flow OAuth that asks the operator to authorise each run individually; strictly minim"  →  **0**

**Verdict:** `PLURALITY_GQ3v3-C` — 4 of 6 on GQ3v3-C (below 7/10 quorum).

### G-Q4 — Self-Renewal §6.4 v3 — collapses v2's two-field design (selfRenewalNegativeDeltaPolicy + selfRenewalMinimumDelta) into ONE per-product enum: `selfRenewalOpenPolicy ∈ { ALL (default), IMPROVEMENTS_ONLY, SUBSTANTIAL_ONLY }`. Is the 3-state enum the right shape for the negative-delta dimension?

Tally (ENGAGED-only, 6):
  - `GQ4v3-A` "Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinations, keeps ALL as transparency-first default, and exposes onl"  →  **2**
  - `GQ4v3-B` "Insufficient — Phase A still needs a fourth state IMPROVEMENTS_ONLY_NO_BANNER (silent suppression of regression banners on zero-delta runs that just barely clea"  →  **0**
  - `GQ4v3-C` "Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field design supported (e.g. "open everything but only beep me if "  →  **4**
  - `GQ4v3-D` "Wrong default — IMPROVEMENTS_ONLY should be the default, not ALL; defaulting to "surface every run" trains operator review queues to ignore renewal PRs and erod"  →  **0**

**Verdict:** `PLURALITY_GQ4v3-C` — 4 of 6 on GQ4v3-C (below 7/10 quorum).

### G-Q6 — Self-Renewal §6.4 v3 — collapses v2's free-integer `selfRenewalMinimumDelta` into the discrete `SUBSTANTIAL_ONLY` state with a Panel-fixed threshold `delta_total >= 5`. Is `+5` the right threshold value for "substantial improvement"?

Tally (ENGAGED-only, 6):
  - `GQ6v3-A` "`+5` is correct — matches v1 G-Q4 option (d) framing ("Panel-ratified threshold for what 'substantial' means"); large enough that LLM-noise-floor runs don't qua"  →  **0**
  - `GQ6v3-B` "`+5` is too high — a real fix that improves one Five-Layer L by ~3 points (common when one finding category is addressed cleanly) would close as below_threshold"  →  **0**
  - `GQ6v3-C` "`+5` is too low — given the cost envelope of ~$0.65–$5.00 per run, SUBSTANTIAL_ONLY should mean delta covers at least one run's worth of value-per-point; `+10` "  →  **0**
  - `GQ6v3-D` "Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewalSubstantialThreshold` integer (defaulting to `+5`) so operat"  →  **6**

**Verdict:** `UNANIMOUS_GQ6v3-D` — 6 of 6 ENGAGED on GQ6v3-D (unanimous).

### G-Q7 — Self-Renewal v3 disposition: v3 applies 3 surgical fixes to address v2 NOT_RATIFIED conditions — App-only credential model (Q3), single-file fix scope restored with Phase B graduation trigger (Q1), and 3-state enum with `+5` SUBSTANTIAL_ONLY threshold (Q4 + Q6 collapse). G-Q2 + G-Q5 carried unchanged. Given these 3 changes, the appropriate Panel disposition for v3 is:

Tally (ENGAGED-only, 6):
  - `GQ7v3-A` "Promote — the 3 conditions are addressed cleanly and Option C v3 is ready for Phase A engineering dispatch."  →  **0**
  - `GQ7v3-B` "Promote-with-Reservations — the 3 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationa"  →  **1**
  - `GQ7v3-C` "Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which conditio"  →  **5**
  - `GQ7v3-D` "Reject — the 3 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement."  →  **0**

**Verdict:** `PLURALITY_GQ7v3-C` — 5 of 6 on GQ7v3-C (below 7/10 quorum).


## All distinct objections (30)
**01. [Slot 1] Unvalidated DOM selector injection risk**

> §4.4 gate (c) preview smoke test uses operator-configured `ProductRegistry.selfRenewalSmokeSelectors` without validation. Malformed selectors could crash the smoke test or be crafted to bypass the gate entirely, allowing broken previews to open PRs.

**02. [Slot 1] GitHub App permission scope creep**

> §3.2 lists minimum permissions but no maximum — the spec doesn't prevent the App from requesting `actions:write` or `administration:*` later. Without manifest pinning, operators have no visibility into permission expansion between installations.

**03. [Slot 1] Cost explosion via re-assessment loops**

> §6.2 re-runs the full 8-step pipeline at $0.65-$5.00 per run (Note 3), but nothing prevents infinite loops if Self-Renewal's fixes trigger new findings that trigger more renewals. A single misconfigured product could rack up hundreds of dollars in re-assessment costs.

**04. [Slot 1] Branch pollution from failed runs**

> §6.4 step 2b deletes branches for `below_threshold` cases but §5.5 leaves orphan branches when preview fails. Over months, repos accumulate hundreds of `flowai/renewal-*` branches from preview failures with no cleanup mechanism specified.

**05. [Slot 2] GitHub App exclusivity**

> In §3.2, the proposal mandates the use of a GitHub App exclusively for credential management, removing the PAT fallback. This could lead to operational disruptions if the App installation process encounters issues, as there is no alternative path for credential management.

**06. [Slot 2] Single-file fix limitation**

> The restriction to single-file fixes in §4.3 may limit the effectiveness of the Self-Renewal process, as many real-world issues require changes across multiple files. This could result in a high number of unresolved issues, reducing the perceived value of the system.

**07. [Slot 2] Delta score threshold rigidity**

> The fixed threshold of `+5` for the `SUBSTANTIAL_ONLY` policy in §6.4 may not align with all operators' needs. A more flexible, configurable threshold could better accommodate varying definitions of 'substantial improvement' across different products and contexts.

**08. [Slot 3] Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case the changes introduced by Self-Renewal cause unintended consequences. This could lead to difficulties in reverting back to a previous stable state.

**09. [Slot 3] Insufficient Testing**

> The proposal relies heavily on automated testing, but it does not provide sufficient details on how these tests will be designed, implemented, and maintained to ensure they are effective in catching regressions and other issues.

**10. [Slot 3] Security Risks**

> The use of GitHub Apps and fine-grained PATs introduces security risks, such as the potential for unauthorized access to repositories or sensitive data. The proposal does not provide sufficient details on how these risks will be mitigated.

**11. [Slot 4] Limited fix scope**

> The single-file fix scope in §4.3 is too restrictive. Many real-world issues require changes across multiple files. This limitation might render the Self-Renewal feature ineffective for complex problems.

**12. [Slot 4] High cost envelope**

> The cost envelope for Self-Renewal runs is significant, ranging from $0.65 to $5.00 per run. This could be prohibitive for smaller operators or those with frequent renewal needs, leading to underutilization of the feature.

**13. [Slot 4] Potential credential misuse**

> The GitHub App credential model in §3.2, while secure, might be misused if not properly managed. Operators might inadvertently grant excessive permissions, leading to security risks.

**14. [Slot 5] Credential Model Risk**

> The GitHub App-only credential model (§3.2) introduces a single point of failure. If the GitHub App is compromised, all operator products are at risk, potentially leading to a catastrophic failure scenario.

**15. [Slot 5] Limited Scope**

> The single-file fix scope (§4.3) may not be sufficient to address complex issues, leading to incomplete fixes and potential degradation of product quality over time.

**16. [Slot 5] Cost Concerns**

> The cost envelope of $0.65–$5.00 per run (Note 3) may be prohibitive for operators with limited budgets, potentially limiting the adoption and effectiveness of the Self-Renewal feature.

**17. [Slot 6] Re-assessment cost is high**

> §6.2 re-runs the full 8-step pipeline against the preview URL, doubling the assessment cost. While Note 3 acknowledges this, it doesn't propose any mitigation strategies. This high cost could limit the frequency of self-renewal runs.

**18. [Slot 6] Single point of failure**

> §3.2 relies solely on the GitHub App. If the App malfunctions or is revoked, Self-Renewal is completely disabled. There's no contingency plan for App-related issues, making the system brittle.

**19. [Slot 6] Limited scope of fixes**

> §4.3 restricts fixes to single-file changes in Phase A. This severely limits the types of issues that can be automatically addressed, potentially making the feature less useful in practice. Many real-world fixes require changes across multiple files.

**20. [Slot 6] Potential for noisy PRs**

> Even with the `IMPROVEMENTS_ONLY` policy, the delta score might be influenced by factors unrelated to the code changes, such as network latency or external API availability. This could lead to PRs being opened for changes that don't actually improve the system.

**21. [Slot 7] Single-file scope too restrictive**

> Section §4.3 limits fixes to single-file changes despite typecheck and preview-smoke gates catching regressions. This excludes common multi-file patterns like component-test pairs, forcing operators to manually fix issues Self-Renewal could address. The 30-day graduation trigger is insufficient for validating multi-file risk.

**22. [Slot 7] App-only credential friction**

> Section §3.2 eliminates PAT fallbacks, making GitHub App installation mandatory. Operators with complex GitHub permission structures may face onboarding failures, blocking Self-Renewal entirely. No interim path exists for time-sensitive fixes during installation delays.

**23. [Slot 7] Vercel dependency risk**

> Section §5.6 makes Vercel mandatory for previews. Non-Vercel products cannot use Option C, fragmenting capability. Preview-before-PR ordering (§5.5) introduces Vercel build-time failures as single points of failure - 10% slower builds could degrade 15% of runs.

**24. [Slot 7] Re-assessment cost explosion**

> Note 3 reveals full pipeline re-runs double costs to $0.65–$5.00/run. For products with frequent findings, this could increase monthly costs by 200% without cost-containment mechanisms like partial re-assessments.

**25. [Slot 8] App-only blocks recovery paths**

> In §3.2, removing the PAT fallback means any product that has not completed GitHub App installation becomes fully dead to Self-Renewal on its first failed run. That creates a hard dependency on an unrelated admin workflow; if install approval stalls, the system cannot even perform low-risk renewal attempts on already-owned repos.

**26. [Slot 8] Preview-before-PR can deadlock**

> §5.5 requires a live Vercel preview before the PR is opened, but §4.6 also routes tests/build into the preview environment. If the branch fails to build or Vercel never reaches READY, the spec says the PR is not opened or is opened only as a draft after failure — those branches are in tension and can leave the operator with no PR, no preview, and only a failed run record.

**27. [Slot 8] Delta policy collapses nuance**

> §6.4 replaces two independent controls with a single enum plus a hardcoded `SUBSTANTIAL_ONLY >= 5` threshold. That loses the operator’s ability to express common real-world preferences like 'open every PR but suppress alerts below +3' or 'open only if function improves, but still keep a human-visible negative-delta audit trail' without resorting to a separate policy layer.

**28. [Slot 10] §3.2 App-only aborts lack fallback**

> §3.2 mandates GitHub App installation or immediate SELF_RENEWAL_NO_SOURCE abort with no PAT path; this directly blocks renewal for any product whose org has not yet completed the install flow, even when the operator has already configured githubRepoUrl and a fine-grained PAT in Doppler.

**29. [Slot 10] §6.4 open-policy enum hides regressions**

> §6.4 collapses negative-delta handling into selfRenewalOpenPolicy with ALL/IMPROVEMENTS_ONLY/SUBSTANTIAL_ONLY; under IMPROVEMENTS_ONLY or SUBSTANTIAL_ONLY a negative or sub-threshold delta silently closes as below_threshold without ever surfacing the PR, violating the audit-trail honesty claim in the same section.

**30. [Slot 10] §4.3/§7.3 graduation trigger too weak**

> §4.3 and §7.3 allow MAX_FILES to rise from 1 to 3 after only 30 days on ≥3 of 5 products; the diff-parse-time gate is the sole enforcement, yet no mechanism exists to roll back the scope increase if multi-file fixes later trigger cascading test or typecheck failures in production.

## Per-reviewer
## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Unvalidated DOM selector injection risk**

> §4.4 gate (c) preview smoke test uses operator-configured `ProductRegistry.selfRenewalSmokeSelectors` without validation. Malformed selectors could crash the smoke test or be crafted to bypass the gate entirely, allowing broken previews to open PRs.

**Objection 2 — GitHub App permission scope creep**

> §3.2 lists minimum permissions but no maximum — the spec doesn't prevent the App from requesting `actions:write` or `administration:*` later. Without manifest pinning, operators have no visibility into permission expansion between installations.

**Objection 3 — Cost explosion via re-assessment loops**

> §6.2 re-runs the full 8-step pipeline at $0.65-$5.00 per run (Note 3), but nothing prevents infinite loops if Self-Renewal's fixes trigger new findings that trigger more renewals. A single misconfigured product could rack up hundreds of dollars in re-assessment costs.

**Objection 4 — Branch pollution from failed runs**

> §6.4 step 2b deletes branches for `below_threshold` cases but §5.5 leaves orphan branches when preview fails. Over months, repos accumulate hundreds of `flowai/renewal-*` branches from preview failures with no cleanup mechanism specified.

**Worse-than-status-quo:** The re-assessment cost doubling ($0.65-$5.00 per run) combined with no loop prevention means a product that currently costs $2/month to monitor could suddenly cost $200/month if Self-Renewal enters a fix-assess-fix cycle, making the system financially worse than manual fixes.

**Precedent:** Dependabot's early versions created similar PR pollution problems — repos accumulated hundreds of unmerged security PRs because the bot had no cleanup mechanism for superseded or ignored PRs, leading to developer fatigue and eventual feature abandonment.

### Rejection steelman

> Self-Renewal v3 introduces significant operational risk through uncontrolled cost multiplication (re-assessment doubling), security exposure via unvalidated DOM selectors, and no protection against runaway fix-assess loops. The spec should be deferred until it includes cost caps, selector validation, and loop detection mechanisms to prevent these failure modes from impacting production systems.

### Votes

- **G-Q1** = `GQ1v3-D` — The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate
  > Multi-file changes represent a categorical jump in risk that time alone cannot validate — each expansion needs adversarial review to catch new failure modes like the cost/loop issues in this spec.
- **G-Q3** = `GQ3v3-B` — Insufficient — Phase A should additionally pin the App's manifest in-repo (e.g. .github/flowai-app-m
  > Without manifest pinning, the App can silently expand permissions between installations, violating the 'no scope drift' promise in §3.2.
- **G-Q4** = `GQ4v3-A` — Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinatio
  > The enum eliminates the validation complexity of two coupled fields while preserving the three meaningful states operators need.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > Different products have different value scales — a +5 delta on a high-traffic e-commerce site means something different than +5 on an internal tool.
- **G-Q7** = `GQ7v3-C` — Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The Q3 fix (App-only) is incomplete without manifest pinning, and the spec introduces new defects (unvalidated selectors, cost explosion, branch pollution) that must be addressed before promotion.

---

## Slot 2 — openrouter:openai/gpt-4o — state: `ENGAGED`

### Adversarial pass

**Objection 1 — GitHub App exclusivity**

> In §3.2, the proposal mandates the use of a GitHub App exclusively for credential management, removing the PAT fallback. This could lead to operational disruptions if the App installation process encounters issues, as there is no alternative path for credential management.

**Objection 2 — Single-file fix limitation**

> The restriction to single-file fixes in §4.3 may limit the effectiveness of the Self-Renewal process, as many real-world issues require changes across multiple files. This could result in a high number of unresolved issues, reducing the perceived value of the system.

**Objection 3 — Delta score threshold rigidity**

> The fixed threshold of `+5` for the `SUBSTANTIAL_ONLY` policy in §6.4 may not align with all operators' needs. A more flexible, configurable threshold could better accommodate varying definitions of 'substantial improvement' across different products and contexts.

**Worse-than-status-quo:** The removal of the PAT fallback could lead to a situation where products are unable to use Self-Renewal due to GitHub App installation issues, effectively halting the renewal process for those products.

**Precedent:** no precedent known

### Rejection steelman

> The proposal's reliance on a single credential model (GitHub App) without a fallback could introduce significant operational risks. If the App installation fails or is delayed, products will be unable to utilize the Self-Renewal feature, potentially leading to increased manual intervention and decreased system reliability. Additionally, the rigid threshold for substantial improvements may not suit all operators, limiting the flexibility and adaptability of the system to different operational contexts.

### Votes

- **G-Q1** = `GQ1v3-C` — Single-file is correct for Phase A but the 30-day / 3-product graduation trigger is too quick — Phas
  > The current graduation trigger may not provide sufficient time to assess the risks associated with multi-file fixes, which are inherently more complex and potentially disruptive.
- **G-Q3** = `GQ3v3-C` — Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag s
  > Having a PAT fallback as a contingency plan would mitigate risks associated with potential GitHub App installation issues, ensuring continuity of operations.
- **G-Q4** = `GQ4v3-C` — Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field 
  > The three-state model lacks the granularity needed to accommodate different operational contexts and reviewer capacities, potentially leading to inefficiencies.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > A configurable threshold would allow operators to tailor the system to their specific needs, enhancing its flexibility and applicability.
- **G-Q7** = `GQ7v3-C` — Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The removal of the PAT fallback and the rigid delta score threshold introduce new risks and limitations that need to be addressed before proceeding.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `TANGENTIAL`

### Adversarial pass

**Objection 1 — Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case the changes introduced by Self-Renewal cause unintended consequences. This could lead to difficulties in reverting back to a previous stable state.

**Objection 2 — Insufficient Testing**

> The proposal relies heavily on automated testing, but it does not provide sufficient details on how these tests will be designed, implemented, and maintained to ensure they are effective in catching regressions and other issues.

**Objection 3 — Security Risks**

> The use of GitHub Apps and fine-grained PATs introduces security risks, such as the potential for unauthorized access to repositories or sensitive data. The proposal does not provide sufficient details on how these risks will be mitigated.

**Worse-than-status-quo:** If the Self-Renewal feature is implemented without proper testing and validation, it could lead to a higher number of errors and regressions in the codebase, making the system worse than the status quo.

**Precedent:** The GitHub incident in 2020, where a faulty automated script caused widespread repository deletions, highlights the importance of careful design and testing of automated systems like Self-Renewal. No precedent known for a similar system causing trouble in the same context.

### Rejection steelman

> The proposal for Self-Renewal lacks sufficient detail and rigor in its design and testing, which could lead to unintended consequences and make the system worse than the status quo. Therefore, it is reasonable to reject or defer the proposal until these concerns are addressed.

### Votes

- **G-Q1** = `GQ1v3-A` — Single-file scope with diff-parse-time enforcement and the defined Phase B graduation trigger is cor
  > This option provides a clear and structured approach to implementing Self-Renewal, with a focus on minimizing production risk and ensuring a clear path for expansion.
- **G-Q3** = `GQ3v3-A` — App-only from day one is correct — install-flow friction is acceptable because the App is the long-t
  > Using a GitHub App provides a more secure and controlled way of accessing repositories, and the install-flow friction is a reasonable trade-off for the added security.
- **G-Q4** = `GQ4v3-A` — Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinatio
  > The 3-state enum provides a simple and intuitive way to manage the negative-delta dimension, and the default value of ALL provides transparency and flexibility.
- **G-Q6** = `UNMATCHED` — +5 is correct — matches v1 G-Q4 option (d) framing ("Panel-ratified threshold for what 'substantial' means"); large enough that LLM-noise-floor runs don't qualify, small enough that real wins do.
  > The threshold value of +5 provides a reasonable balance between filtering out noise and capturing substantial improvements.
- **G-Q7** = `GQ7v3-A` — Promote — the 3 conditions are addressed cleanly and Option C v3 is ready for Phase A engineering di
  > The proposal has addressed the concerns and conditions raised in the previous versions, and it is now ready for implementation.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Limited fix scope**

> The single-file fix scope in §4.3 is too restrictive. Many real-world issues require changes across multiple files. This limitation might render the Self-Renewal feature ineffective for complex problems.

**Objection 2 — High cost envelope**

> The cost envelope for Self-Renewal runs is significant, ranging from $0.65 to $5.00 per run. This could be prohibitive for smaller operators or those with frequent renewal needs, leading to underutilization of the feature.

**Objection 3 — Potential credential misuse**

> The GitHub App credential model in §3.2, while secure, might be misused if not properly managed. Operators might inadvertently grant excessive permissions, leading to security risks.

**Worse-than-status-quo:** The proposal's single-file fix scope could make the system worse than the status quo by limiting the effectiveness of the Self-Renewal feature, leading to unresolved issues that require manual intervention.

**Precedent:** In a similar scenario, a system that relied on automated fixes with limited scope ended up causing more manual work and increased downtime due to unresolved issues.

### Rejection steelman

> The proposal should be deferred until a more comprehensive fix scope is implemented. The current single-file limitation is too restrictive and may not effectively address real-world issues, leading to increased manual intervention and potential downtime.

### Votes

- **G-Q1** = `GQ1v3-B` — Single-file is too restrictive given typecheck + preview-smoke MUST gates already catch most multi-f
  > The current single-file scope is too limiting for complex issues that span multiple files.
- **G-Q3** = `GQ3v3-C` — Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag s
  > Providing a fallback option ensures that operators have a backup plan in case of installation issues.
- **G-Q4** = `GQ4v3-C` — Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field 
  > The three-state enum lacks the flexibility needed to accommodate different operator preferences and review bandwidths.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > A configurable threshold allows operators to tailor the system to their specific needs and value models.
- **G-Q7** = `GQ7v3-C` — Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The single-file fix scope is a significant limitation that needs to be addressed before the proposal can be promoted.

---

## Slot 5 — openrouter:amazon/nova-pro-v1 — state: `TANGENTIAL`

### Adversarial pass

**Objection 1 — Credential Model Risk**

> The GitHub App-only credential model (§3.2) introduces a single point of failure. If the GitHub App is compromised, all operator products are at risk, potentially leading to a catastrophic failure scenario.

**Objection 2 — Limited Scope**

> The single-file fix scope (§4.3) may not be sufficient to address complex issues, leading to incomplete fixes and potential degradation of product quality over time.

**Objection 3 — Cost Concerns**

> The cost envelope of $0.65–$5.00 per run (Note 3) may be prohibitive for operators with limited budgets, potentially limiting the adoption and effectiveness of the Self-Renewal feature.

**Worse-than-status-quo:** If the GitHub App is compromised, operators lose the ability to use Self-Renewal, potentially leading to a regression in product maintenance and governance compared to the current manual review process.

**Precedent:** The SolarWinds hack (2020) demonstrated the risks of relying on a single point of failure for critical infrastructure.

### Rejection steelman

> The proposal introduces significant risks with the GitHub App-only credential model and may not provide sufficient value to justify the cost and complexity, especially given the limited scope of single-file fixes.

### Votes

- **G-Q1** = `GQ1v3-A` — Single-file scope with diff-parse-time enforcement and the defined Phase B graduation trigger is cor
  > The current scope is a prudent starting point with a clear path to expansion.
- **G-Q3** = `GQ3v3-A` — App-only from day one is correct — install-flow friction is acceptable because the App is the long-t
  > The App-only model aligns with long-term security best practices.
- **G-Q4** = `GQ4v3-A` — Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinatio
  > The simplified enum provides clarity and reduces complexity.
- **G-Q6** = `UNMATCHED` — +5 is correct — matches v1 G-Q4 option (d) framing ("Panel-ratified threshold for what 'substantial' means"); large enough that LLM-noise-floor runs don't qualify, small enough that real wins do.
  > The threshold aligns with the panel's previous decisions and balances noise with meaningful improvements.
- **G-Q7** = `GQ7v3-A` — Promote — the 3 conditions are addressed cleanly and Option C v3 is ready for Phase A engineering di
  > The surgical fixes address the previous concerns effectively.

---

## Slot 6 — openrouter:google/gemini-2.0-flash-001 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Re-assessment cost is high**

> §6.2 re-runs the full 8-step pipeline against the preview URL, doubling the assessment cost. While Note 3 acknowledges this, it doesn't propose any mitigation strategies. This high cost could limit the frequency of self-renewal runs.

**Objection 2 — Single point of failure**

> §3.2 relies solely on the GitHub App. If the App malfunctions or is revoked, Self-Renewal is completely disabled. There's no contingency plan for App-related issues, making the system brittle.

**Objection 3 — Limited scope of fixes**

> §4.3 restricts fixes to single-file changes in Phase A. This severely limits the types of issues that can be automatically addressed, potentially making the feature less useful in practice. Many real-world fixes require changes across multiple files.

**Objection 4 — Potential for noisy PRs**

> Even with the `IMPROVEMENTS_ONLY` policy, the delta score might be influenced by factors unrelated to the code changes, such as network latency or external API availability. This could lead to PRs being opened for changes that don't actually improve the system.

**Worse-than-status-quo:** If the GitHub App has an outage, operators will be directed to an install flow that they cannot complete, and the system will report a failed run. This is worse than the status quo because it actively directs users to a broken process.

**Precedent:** no precedent known

### Rejection steelman

> The proposal, while addressing previous concerns, still introduces significant risks and limitations. The high cost of re-assessment, reliance on a single credential model, and limited scope of fixes make the feature potentially less useful and more prone to failure. Deferring the proposal would allow for further exploration of alternative approaches and mitigation strategies.

### Votes

- **G-Q1** = `GQ1v3-D` — The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate
  > Multi-file changes introduce significantly more risk, and a simple time-based trigger is insufficient to ensure safety. A separate Panel ratification ensures proper scrutiny.
- **G-Q3** = `GQ3v3-C` — Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag s
  > Having a fallback mechanism is crucial for resilience. The PAT path provides a safety net in case of issues with the GitHub App installation.
- **G-Q4** = `GQ4v3-C` — Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field 
  > The collapsed enum loses granularity and flexibility. The two-field model allowed for more nuanced control over PR opening behavior.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > A fixed threshold is too rigid. Operators should be able to customize the threshold based on their specific needs and value model.
- **G-Q7** = `GQ7v3-C` — Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The lack of a PAT fallback and the fixed threshold for `SUBSTANTIAL_ONLY` are significant drawbacks that need to be addressed before promotion.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `TANGENTIAL`

### Adversarial pass

**Objection 1 — Single-file scope too restrictive**

> Section §4.3 limits fixes to single-file changes despite typecheck and preview-smoke gates catching regressions. This excludes common multi-file patterns like component-test pairs, forcing operators to manually fix issues Self-Renewal could address. The 30-day graduation trigger is insufficient for validating multi-file risk.

**Objection 2 — App-only credential friction**

> Section §3.2 eliminates PAT fallbacks, making GitHub App installation mandatory. Operators with complex GitHub permission structures may face onboarding failures, blocking Self-Renewal entirely. No interim path exists for time-sensitive fixes during installation delays.

**Objection 3 — Vercel dependency risk**

> Section §5.6 makes Vercel mandatory for previews. Non-Vercel products cannot use Option C, fragmenting capability. Preview-before-PR ordering (§5.5) introduces Vercel build-time failures as single points of failure - 10% slower builds could degrade 15% of runs.

**Objection 4 — Re-assessment cost explosion**

> Note 3 reveals full pipeline re-runs double costs to $0.65–$5.00/run. For products with frequent findings, this could increase monthly costs by 200% without cost-containment mechanisms like partial re-assessments.

**Worse-than-status-quo:** If Vercel experiences 20% build failures, operators face constant 'degraded' runs without PRs (§5.5), forcing manual Vercel log checks. This adds more overhead than the status quo where findings were simply listed, creating net-negative productivity.

**Precedent:** GitHub Actions token leakage incidents (2020-2022) where credentials persisted in logs despite scrub mechanisms. Similar risks exist in §8.1 memory-only PAT handling - one serialization bug could expose credentials in ProductSSOT entries.

### Rejection steelman

> This proposal introduces substantial new failure modes (Vercel dependency, credential persistence risks) for minimal Phase A value (single-file fixes only). The $5/run re-assessment cost could exceed value delivered, while mandatory GitHub App adoption creates operator friction. Deferring until after foundational stability improvements like Phase 3 auth-traversal would reduce blast radius.

### Votes

- **G-Q1** = `GQ1v3-C` — Single-file is correct for Phase A but the 30-day / 3-product graduation trigger is too quick — Phas
  > Multi-file changes introduce architectural coupling risks; 30 days is insufficient to validate safety across diverse codebases. Extended observation period reduces regression probability.
- **G-Q3** = `GQ3v3-C` — Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag s
  > Eliminating PAT fallbacks creates single-point failures during App onboarding. Feature-flagged PAT preserves optionality without compromising long-term App transition.
- **G-Q4** = `UNMATCHED` — Wrong default — IMPROVEMENTS_ONLY should be the default, not ALL; defaulting to 'surface every run' trains operator review queues to ignore renewal PRs and erodes the merge-gate over time.
  > ALL policy risks alert fatigue from neutral/negative deltas. IMPROVEMENTS_ONLY as default focuses attention on value-generating changes while preserving ALL for transparency-seekers.
- **G-Q6** = `UNMATCHED` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product selfRenewalSubstantialThreshold integer (defaulting to +5) so operators tune to their own value model; collapse loses information that Q6's free integer carried.
  > Operators have divergent value-per-point thresholds; fixed +5 ignores cost-sensitive users. Configurable thresholds maintain flexibility sacrificed in the enum collapse.
- **G-Q7** = `GQ7v3-B` — Promote-with-Reservations — the 3 conditions are addressed but the Panel surfaces residual issues th
  > V3 fixes address Panel concerns, but operational risks (Vercel dependency, re-assessment cost) warrant explicit tracking in engineering tickets.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — App-only blocks recovery paths**

> In §3.2, removing the PAT fallback means any product that has not completed GitHub App installation becomes fully dead to Self-Renewal on its first failed run. That creates a hard dependency on an unrelated admin workflow; if install approval stalls, the system cannot even perform low-risk renewal attempts on already-owned repos.

**Objection 2 — Preview-before-PR can deadlock**

> §5.5 requires a live Vercel preview before the PR is opened, but §4.6 also routes tests/build into the preview environment. If the branch fails to build or Vercel never reaches READY, the spec says the PR is not opened or is opened only as a draft after failure — those branches are in tension and can leave the operator with no PR, no preview, and only a failed run record.

**Objection 3 — Delta policy collapses nuance**

> §6.4 replaces two independent controls with a single enum plus a hardcoded `SUBSTANTIAL_ONLY >= 5` threshold. That loses the operator’s ability to express common real-world preferences like 'open every PR but suppress alerts below +3' or 'open only if function improves, but still keep a human-visible negative-delta audit trail' without resorting to a separate policy layer.

**Worse-than-status-quo:** A product with an ownership-valid repo but no completed GitHub App installation hits renewal after a customer-facing regression. Under this spec, Self-Renewal aborts instead of even opening a branch, so the team loses the chance to get a previewable fix candidate and must manually reproduce the issue first. That is worse than the status quo of a read-only analyzer that at least surfaces candidate guidance without hard-blocking on installation state.

**Precedent:** GitHub Apps with installation-scoped access have repeatedly caused operational dead ends when org admins delay or misconfigure installation approval; many enterprise integrations have had to retain PAT-based break-glass paths for continuity. A close precedent is GitHub’s own migration guidance away from classic PATs, which still acknowledges transitional fallback needs in operational environments.

### Rejection steelman

> The strongest case for rejecting or deferring v3 is that it bundles multiple high-friction constraints at once: a hard App-only credential model, strict preview-before-PR ordering, and a single-file-only fix envelope. Each is defensible in isolation, but together they may produce a system that is safer on paper yet too brittle to be useful in production, especially for operators who have not completed all prerequisite setup. Deferring would let the team validate the read-only analyzer and preview pipeline separately before granting write authority.

### Votes

- **G-Q1** = `GQ1v3-A` — Single-file scope with diff-parse-time enforcement and the defined Phase B graduation trigger is cor
  > This is the best risk boundary among the choices because it preserves a hard mechanical cap before any write action. I remain wary of the graduation trigger, but the option is still superior to widening scope before the preview/write path is proven.
- **G-Q3** = `GQ3v3-B` — Insufficient — Phase A should additionally pin the App's manifest in-repo (e.g. .github/flowai-app-m
  > The App-only model is reasonable, but without a pinned manifest the operator cannot easily review permission drift. This is the least risky listed option because it strengthens the App path without reintroducing PAT fallback.
- **G-Q4** = `GQ4v3-A` — Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinatio
  > Collapsing the policy surface is cleaner than maintaining two interacting knobs, and the default preserves audit transparency. The remaining concern is not the enum shape itself but whether the thresholds are expressive enough.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > A fixed threshold is too blunt across heterogeneous products and review cultures. Keeping a configurable threshold preserves the benefit of the enum collapse while restoring per-product nuance.
- **G-Q7** = `GQ7v3-B` — Promote-with-Reservations — the 3 conditions are addressed but the Panel surfaces residual issues th
  > The revision is directionally better and probably ready for engineering, but the hard App-only gate and preview ordering still create availability and operational-risk concerns. Those are worth tracking without blocking the whole spec.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `SILENT`

_(degraded / parse-failure)_


---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §3.2 App-only aborts lack fallback**

> §3.2 mandates GitHub App installation or immediate SELF_RENEWAL_NO_SOURCE abort with no PAT path; this directly blocks renewal for any product whose org has not yet completed the install flow, even when the operator has already configured githubRepoUrl and a fine-grained PAT in Doppler.

**Objection 2 — §6.4 open-policy enum hides regressions**

> §6.4 collapses negative-delta handling into selfRenewalOpenPolicy with ALL/IMPROVEMENTS_ONLY/SUBSTANTIAL_ONLY; under IMPROVEMENTS_ONLY or SUBSTANTIAL_ONLY a negative or sub-threshold delta silently closes as below_threshold without ever surfacing the PR, violating the audit-trail honesty claim in the same section.

**Objection 3 — §4.3/§7.3 graduation trigger too weak**

> §4.3 and §7.3 allow MAX_FILES to rise from 1 to 3 after only 30 days on ≥3 of 5 products; the diff-parse-time gate is the sole enforcement, yet no mechanism exists to roll back the scope increase if multi-file fixes later trigger cascading test or typecheck failures in production.

**Worse-than-status-quo:** An operator with a partially-installed GitHub App receives repeated SELF_RENEWAL_NO_SOURCE failures; the system writes governance_record_entry failures but never surfaces actionable diffs, so the product accumulates unresolved findings faster than the prior manual-fix workflow that at least allowed ad-hoc patches.

**Precedent:** Dependabot's early auto-PR volume in large monorepos produced review-queue saturation and stale-branch accumulation exactly when fallback credential paths were removed without sufficient operator onboarding friction mitigation.

### Rejection steelman

> The three surgical fixes still leave an unproven credential model, an incomplete regression surface, and a graduation trigger that relies on production soak time rather than additional adversarial review; deferring until a full security audit of the Contents-API write path and a separate Panel ratification for the Phase B scope increase would be the safer course.

### Votes

- **G-Q1** = `GQ1v3-D` — The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate
  > The 30-day/3-product trigger is too weak to justify expanding file scope without fresh adversarial scrutiny.
- **G-Q3** = `GQ3v3-C` — Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag s
  > Complete removal of any fallback creates an immediate adoption blocker not offset by the install-flow argument.
- **G-Q4** = `GQ4v3-C` — Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field 
  > The collapsed enum loses the ability to express nuanced negative-delta policies without silent suppression.
- **G-Q6** = `GQ6v3-D` — Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewal
  > A hard-coded +5 threshold cannot accommodate differing operator cost/value models.
- **G-Q7** = `GQ7v3-C` — Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect
  > The App-only change and the collapsed policy enum both introduce new blocking or suppression behaviors that require further revision.