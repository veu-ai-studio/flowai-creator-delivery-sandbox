# Panel — Build/Wire v2 re-Panel · run-4-S7-S8 (2026-05-19)

**Spec:** docs/specs/BUILD_WIRE_ENGINE_SPEC_V2_DRAFT.md (commit 448932b)
**Started:** 2026-05-19T12:59:24.159Z · **Finished:** 2026-05-19T13:00:11.986Z
**Bundle:** 20827 chars (target ≤30K)
**Engaged:** 9/10 · Tangential: 1 · Silent: 0
**Objections:** 31
**Alignment:** 11.1% · ✅ PASS

## Per-invariant
| Q | Verdict | Top key | Top / Engaged | Cleared (≥7) | NON-OVERRIDABLE |
|---|---|---|---|---|---|
| **J2v2-S7** | `PLURALITY_REJECT` | `REJECT` | 6/9 | — |  |
| **J2v2-S8** | `PLURALITY_S8V2-SIMPLIFY` | `S8V2-SIMPLIFY` | 6/9 | — |  |

## Detail
### J2v2-S7
J2v2-S7 — v2 adds per-session sub-branches within per-product `self_renewal_branch` for CA-16-B multi-construction redesign sessions; squash-merge to per-product branch on operator approval; per-product branch remains merge target. Right discipline? (PANEL-RATIFIABLE.)

Tally (n=9):
  - `S7V2-RATIFY` "Ratify S7 v2 as drafted (sub-branches for multi-construction; squash-merge; per-product branch remains target)." → **1**
  - `S7V2-EVERY` "Strengthen — every construction (not just multi-construction sessions) uses a per-construction sub-branch; squash-merges to per-product bran" → **1**
  - `S7V2-REJECT` "Reject sub-branches — keep v1 behavior (every construction commits directly to per-product `self_renewal_branch`); sub-branches add complexi" → **0**
  - `S7V2-PERCLASS` "Adjust — sub-branches per construction-class instead of per-session (`<self_renewal_branch>/<class>/<runId>`)." → **1**
  - `REJECT` → 6
**Verdict:** PLURALITY_REJECT — 6 of 9 on REJECT (below 7/10 quorum)

### J2v2-S8
J2v2-S8 — v2 extends S8 with: live-preview Phase B post-PR-merge (auto-rollback on failure within 1h) + dual-load testing for endpoint_generation + backend probes (connection-pool / memory-leak / transaction-deadlock). PANEL-RATIFIABLE per §3.8 (reject path present). Right scope?

Tally (n=9):
  - `S8V2-RATIFY` "Ratify S8 v2 as drafted (3 Phase B runs incl live-preview; dual-load; backend probes)." → **1**
  - `S8V2-STRENGTHEN` "Strengthen further — add load-profile-shadow-traffic (replay 30 minutes of real production traffic against preview URL before merge) OR fail" → **2**
  - `S8V2-SIMPLIFY` "Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend probes); rely on post-deploy moni" → **6**
  - `S8V2-REJECT` "Reject S8 v2 — Phase B against construction artifacts is duplicative of S4 + S3 + operator PR review; remove the mandatory Phase B step enti" → **0**
**Verdict:** PLURALITY_S8V2-SIMPLIFY — 6 of 9 on S8V2-SIMPLIFY (below 7/10 quorum)


## All distinct objections (31)
**01. [Slot 1] Squash-merge destroys forensic history**

> §3.7's squash-merge for multi-construction redesign sessions collapses multiple construction commits into one, making it impossible to bisect which specific construction in a session caused a regression. This directly conflicts with §7.6(e) per-fix attribution requirement for Self-Heal forensics.

**02. [Slot 1] 1-hour rollback window too narrow**

> §3.8's live-preview Phase B auto-rollback triggers only within 1 hour of PR merge. Many production issues (memory leaks under real traffic patterns, slow query degradation) manifest after hours or days, leaving the system vulnerable after the 1-hour window expires.

**03. [Slot 1] Backend probes miss distributed failures**

> §3.8's backend probes test only single-endpoint behaviors (connection pools, memory, deadlocks). They completely miss distributed system failures like cascading timeouts between services, eventual consistency violations, or message queue backpressure that only appear when multiple endpoints interact.

**04. [Slot 2] Sub-branch complexity**

> In §3.7, the introduction of sub-branches for multi-construction redesign sessions adds complexity to the branch management process. This could lead to increased overhead in managing branches and potential confusion among developers, especially if the sub-branching strategy is not well understood or documented.

**05. [Slot 2] Phase B redundancy**

> The proposal in §3.8 to run Phase B three times, including a live-preview Phase B, may be redundant. The pre-PR Phase B and operator PR review should already catch most issues, and the additional live-preview Phase B could be seen as an unnecessary duplication of effort, increasing the time and resources required for each deployment.

**06. [Slot 2] Backend probe limitations**

> The backend probes introduced in §3.8 for `endpoint_generation` may not cover all potential failure modes. For example, the memory-leak probe only checks for RSS growth over 60 seconds, which might not be sufficient to detect leaks that manifest over longer periods or under different load conditions.

**07. [Slot 3] Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case of failures during the construction process, which could lead to system instability. This is particularly concerning in §3.7 S7, where the use of sub-branches for multi-construction redesign sessions may introduce additional complexity.

**08. [Slot 3] Insufficient Testing**

> The testing strategy outlined in §3.8 S8, while improved, may still not be sufficient to catch all potential issues, particularly in the context of endpoint_generation and schema_migration. The addition of dual-load testing and backend probes is a step in the right direction, but may not be enough to guarantee the stability of the system.

**09. [Slot 3] Over-Reliance on Automation**

> The proposal's emphasis on automation, while efficient, may lead to over-reliance on automated systems, potentially masking human errors or oversights. This is particularly concerning in the context of the Self-Governance Layer, where automated decision-making may not always align with human intent.

**10. [Slot 4] Complexity in Branch Management**

> The introduction of sub-branches for multi-construction redesign sessions in §3.7 S7 adds unnecessary complexity. Managing sub-branches and ensuring their proper squash-merge could lead to operational overhead and potential errors in branch management.

**11. [Slot 4] Overhead in Phase B Testing**

> The extended Phase B testing in §3.8 S8, including live-preview Phase B, dual-load testing, and backend probes, may introduce significant overhead. This could slow down the deployment process and increase the computational resources required for testing.

**12. [Slot 4] Potential for False Positives**

> The backend probes in §3.8 S8, such as the memory-leak probe and transaction-deadlock probe, might generate false positives. These could lead to unnecessary rollbacks and delays in the deployment process, impacting the system's overall efficiency.

**13. [Slot 5] Sub-branch complexity**

> The introduction of per-session sub-branches in §3.7 S7 adds unnecessary complexity without a clear safety benefit, potentially leading to confusion and errors in branch management.

**14. [Slot 5] Live-preview risk**

> The live-preview Phase B in §3.8 S8 could introduce risks if the preview environment does not accurately reflect production conditions, leading to false positives or negatives in testing.

**15. [Slot 5] Backend probe overhead**

> The addition of backend probes in §3.8 S8 may introduce significant overhead and complexity, potentially slowing down the construction process without a commensurate increase in safety.

**16. [Slot 6] Sub-branch complexity**

> The introduction of sub-branches for multi-construction redesign sessions in §3.7 adds complexity to the branching strategy.  The benefits of this added complexity, such as isolation, may not outweigh the cognitive overhead and potential for merge conflicts, especially if session IDs are not globally unique.

**17. [Slot 6] Live-preview rollback window**

> The 1-hour auto-rollback window after PR merge in §3.8 for live-preview Phase B failures might be insufficient for detecting certain types of regressions, especially those that manifest under sustained load or specific usage patterns. A longer monitoring period with more sophisticated anomaly detection might be necessary.

**18. [Slot 6] Redesign scope creep**

> The `redesign_implementation` construction class in §2, while bounded, still allows for significant changes. The reliance on operator-declared scope, even with system caps, introduces a risk of scope creep and unintended consequences, especially if the operator lacks a comprehensive understanding of the system's dependencies.

**19. [Slot 7] S7 squash-merge obscures history**

> §3.7 S7's sub-branch squash-merges erase granular commit history for multi-construction sessions, violating Locked Rule #1 (source-of-truth hierarchy) by making forensic analysis of individual session steps dependent on 30-day-retained sub-branches rather than canonical branch history.

**20. [Slot 7] S8 memory-leak probe false negatives**

> §3.8 S8's 20% RSS growth threshold for memory leaks allows dangerous accumulation (e.g. 19% growth per deploy). Combined with CA-14-B's continuous crawl cadence, this could permit exponential memory growth across deployments while passing Phase B.

**21. [Slot 7] Live-preview Phase B time window gap**

> The 1-hour auto-rollback window for live-preview Phase B failures (§3.8 S8-CT4) creates a race condition: latency-sensitive production traffic hitting the preview URL between merge and test completion could experience errors before rollback triggers.

**22. [Slot 8] Sub-branch merge hides provenance**

> In §3.7 S7, multi-construction redesign sessions squash-merge several commits from `<self_renewal_branch>/redesign-session-<sessionId>` into one per-product branch commit. That preserves history compactness, but it weakens forensic traceability promised elsewhere in the artifact because per-construction blame and intermediate rollback points disappear at the branch-of-record. The spec says `governance_record_entry` will record the merge, but that is not the same as retaining navigable source history.

**23. [Slot 8] Live-preview rollback window is narrow**

> §3.8 S8 requires a live-preview Phase B rerun only after PR merge, and failures within 1 hour trigger auto-rollback. Failures that surface after one hour are now outside the hard rollback guarantee, even though they may still be caused by the construction; that creates a blind spot versus status quo monitoring. The proposal adds a brittle temporal boundary where the system may silently drift into a bad state after the protection window closes.

**24. [Slot 8] Heavy-load probe is under-specified**

> The `endpoint_generation` dual-load requirement in §3.8 names 1 req/s and 100 req/s, but it does not define data volume, request mix, warmup, or success thresholds beyond generic correctness/latency/error-shape. In practice this can produce false confidence: a trivial endpoint can pass 100 req/s for 60s while still failing under bursty, stateful, or tenant-skewed traffic. The added probes may therefore certify the wrong thing while consuming nontrivial CI/runtime budget.

**25. [Slot 8] Connection-pool metric can misfire**

> The backend probe in §3.8 says pool size should be at least `p99 concurrent connections`, but the spec does not define how p99 is measured or over what interval. That can make compliant implementations fail due to measurement noise, while noncompliant implementations can tune superficially to the probe instead of actual workload behavior. This is a classic metric-gaming surface, especially for systems with short-lived spikes.

**26. [Slot 9] Sub-branch complexity**

> §3.7 introduces per-session sub-branches for multi-construction redesign sessions, adding complexity to the branch management process. The benefits of this added complexity are not clearly justified.

**27. [Slot 9] Live-preview Phase B timing**

> §3.8 introduces a live-preview Phase B run after PR merge, which may not be sufficient to catch issues that arise from the merge itself. The 1-hour window for auto-rollback may be too short for some constructions.

**28. [Slot 9] Backend probe coverage**

> §3.8 introduces three backend probes for endpoint_generation constructions, but it is unclear whether these probes are comprehensive enough to cover all potential issues, such as performance regressions under varying loads.

**29. [Slot 10] S7 sub-branch squash-merge**

> §3.7 defines per-session sub-branches with 30-day retention and squash-merge on approval, but provides no mechanism to prevent sub-branch divergence from the per-product self_renewal_branch HEAD during the session window, violating the CA-14-D invariant that every construction commit must land on the branch-of-record.

**30. [Slot 10] S8 live-preview 1-hour rollback**

> §3.8 S8-CT-4 triggers S5 auto-rollback only on Phase B failure within 1 hour of PR merge against the Vercel preview URL, yet the proposal gives no definition of how transient preview-environment differences (cold starts, env var propagation) are distinguished from genuine regressions.

**31. [Slot 10] S8 backend probe thresholds**

> §3.8 mandates RSS growth ≤20% and pool size ≥ p99 concurrent connections for endpoint_generation, but these numeric bounds appear in the conformance tests without reference to any measurement baseline or adjustment for the project's existing connection-pool configuration in api/_lib.


## Per-reviewer
### Slot 1 — openrouter:anthropic/claude-opus-4 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Squash-merge destroys forensic history**
  > §3.7's squash-merge for multi-construction redesign sessions collapses multiple construction commits into one, making it impossible to bisect which specific construction in a session caused a regression. This directly conflicts with §7.6(e) per-fix attribution requirement for Self-Heal forensics.
- **Obj 2 — 1-hour rollback window too narrow**
  > §3.8's live-preview Phase B auto-rollback triggers only within 1 hour of PR merge. Many production issues (memory leaks under real traffic patterns, slow query degradation) manifest after hours or days, leaving the system vulnerable after the 1-hour window expires.
- **Obj 3 — Backend probes miss distributed failures**
  > §3.8's backend probes test only single-endpoint behaviors (connection pools, memory, deadlocks). They completely miss distributed system failures like cascading timeouts between services, eventual consistency violations, or message queue backpressure that only appear when multiple endpoints interact.

**Steelman:**
> The v2 additions create a false sense of security through incomplete testing that catches obvious failures but misses the subtle distributed-system bugs that cause real outages. The added complexity of sub-branches and multi-phase testing increases cognitive load on operators without proportionally reducing production risk, especially given that S4 Quality Audit and operator PR review already provide construction validation.

**Votes:**

- **J2v2-S7** = `S7V2-EVERY` — Strengthen — every construction (not just multi-construction sessions) uses a per-construction sub-branch; squ
  > This preserves per-construction isolation while maintaining a clean per-product branch history, and aligns with the §7.6(e) per-fix attribution requirement by keeping each construction's commit hash traceable.
- **J2v2-S8** = `S8V2-STRENGTHEN` — Strengthen further — add load-profile-shadow-traffic (replay 30 minutes of real production traffic against pre
  > Shadow traffic would catch the distributed-system failures that the current backend probes miss, while fail-injection would validate graceful degradation under real-world failure conditions beyond the happy-path testing.

### Slot 2 — openrouter:openai/gpt-4o — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Sub-branch complexity**
  > In §3.7, the introduction of sub-branches for multi-construction redesign sessions adds complexity to the branch management process. This could lead to increased overhead in managing branches and potential confusion among developers, especially if the sub-branching strategy is not well understood or documented.
- **Obj 2 — Phase B redundancy**
  > The proposal in §3.8 to run Phase B three times, including a live-preview Phase B, may be redundant. The pre-PR Phase B and operator PR review should already catch most issues, and the additional live-preview Phase B could be seen as an unnecessary duplication of effort, increasing the time and resources required for each deployment.
- **Obj 3 — Backend probe limitations**
  > The backend probes introduced in §3.8 for `endpoint_generation` may not cover all potential failure modes. For example, the memory-leak probe only checks for RSS growth over 60 seconds, which might not be sufficient to detect leaks that manifest over longer periods or under different load conditions.

**Steelman:**
> The proposal introduces additional complexity and redundancy that may not provide sufficient benefits to justify the increased overhead. The sub-branching strategy and multiple Phase B runs could slow down the development process and lead to confusion, without significantly improving the safety or reliability of the system. It may be more prudent to defer these changes until a clearer need is demonstrated or a more streamlined approach is developed.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > The added complexity of sub-branches does not provide enough safety benefits to justify the overhead and potential for confusion.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The additional Phase B runs and backend probes may be redundant and resource-intensive, and existing pre-PR checks should suffice.

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — `TANGENTIAL`

**Adversarial pass:**

- **Obj 1 — Lack of Rollback**
  > The proposal does not provide a clear rollback strategy in case of failures during the construction process, which could lead to system instability. This is particularly concerning in §3.7 S7, where the use of sub-branches for multi-construction redesign sessions may introduce additional complexity.
- **Obj 2 — Insufficient Testing**
  > The testing strategy outlined in §3.8 S8, while improved, may still not be sufficient to catch all potential issues, particularly in the context of endpoint_generation and schema_migration. The addition of dual-load testing and backend probes is a step in the right direction, but may not be enough to guarantee the stability of the system.
- **Obj 3 — Over-Reliance on Automation**
  > The proposal's emphasis on automation, while efficient, may lead to over-reliance on automated systems, potentially masking human errors or oversights. This is particularly concerning in the context of the Self-Governance Layer, where automated decision-making may not always align with human intent.

**Steelman:**
> The proposal's introduction of new complexity and potential errors, combined with the potential for over-reliance on automation, may outweigh the potential benefits of the proposed changes. Therefore, it may be prudent to reject or defer the proposal until these concerns can be fully addressed and mitigated.

**Votes:**

- **J2v2-S7** = `UNMATCHED` — Adjust — sub-branches per construction-class instead of per-session (<self_renewal_branch>/<class>/<runId>)
  > This option provides a more nuanced approach to branch management, allowing for greater flexibility and control over the construction process.
- **J2v2-S8** = `S8V2-STRENGTHEN` — Strengthen further — add load-profile-shadow-traffic (replay 30 minutes of real production traffic against pre
  > This option provides additional testing and validation, which can help to ensure the stability and reliability of the system.

### Slot 4 — openrouter:mistralai/mistral-large-2411 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Complexity in Branch Management**
  > The introduction of sub-branches for multi-construction redesign sessions in §3.7 S7 adds unnecessary complexity. Managing sub-branches and ensuring their proper squash-merge could lead to operational overhead and potential errors in branch management.
- **Obj 2 — Overhead in Phase B Testing**
  > The extended Phase B testing in §3.8 S8, including live-preview Phase B, dual-load testing, and backend probes, may introduce significant overhead. This could slow down the deployment process and increase the computational resources required for testing.
- **Obj 3 — Potential for False Positives**
  > The backend probes in §3.8 S8, such as the memory-leak probe and transaction-deadlock probe, might generate false positives. These could lead to unnecessary rollbacks and delays in the deployment process, impacting the system's overall efficiency.

**Steelman:**
> The proposal should be rejected or deferred because the added complexity in branch management and the extensive Phase B testing could introduce significant operational overhead and potential delays. These changes may not provide commensurate benefits and could negatively impact the system's efficiency and reliability.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > The introduction of sub-branches adds unnecessary complexity and operational overhead without clear safety benefits.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The extended Phase B testing introduces significant overhead and potential for false positives, which could delay deployments and impact system efficiency.

### Slot 5 — openrouter:amazon/nova-pro-v1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Sub-branch complexity**
  > The introduction of per-session sub-branches in §3.7 S7 adds unnecessary complexity without a clear safety benefit, potentially leading to confusion and errors in branch management.
- **Obj 2 — Live-preview risk**
  > The live-preview Phase B in §3.8 S8 could introduce risks if the preview environment does not accurately reflect production conditions, leading to false positives or negatives in testing.
- **Obj 3 — Backend probe overhead**
  > The addition of backend probes in §3.8 S8 may introduce significant overhead and complexity, potentially slowing down the construction process without a commensurate increase in safety.

**Steelman:**
> The proposal introduces significant complexity with sub-branches and additional Phase B tests without a clear, compelling safety benefit, potentially leading to more errors and a less stable system.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > The added complexity of sub-branches does not provide a clear safety benefit.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The additional Phase B tests introduce unnecessary complexity and potential for errors.

### Slot 6 — openrouter:google/gemini-2.0-flash-001 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Sub-branch complexity**
  > The introduction of sub-branches for multi-construction redesign sessions in §3.7 adds complexity to the branching strategy.  The benefits of this added complexity, such as isolation, may not outweigh the cognitive overhead and potential for merge conflicts, especially if session IDs are not globally unique.
- **Obj 2 — Live-preview rollback window**
  > The 1-hour auto-rollback window after PR merge in §3.8 for live-preview Phase B failures might be insufficient for detecting certain types of regressions, especially those that manifest under sustained load or specific usage patterns. A longer monitoring period with more sophisticated anomaly detection might be necessary.
- **Obj 3 — Backend probe limitations**
  > The backend probes introduced in §3.8 for `endpoint_generation` have limitations. The memory-leak probe's 20% RSS growth threshold might be too lenient, allowing small but persistent leaks to go undetected. The transaction-deadlock probe's concurrent-write workload might not be representative of real-world deadlock scenarios.
- **Obj 4 — Redesign scope creep**
  > The `redesign_implementation` construction class in §2, while bounded, still allows for significant changes. The reliance on operator-declared scope, even with system caps, introduces a risk of scope creep and unintended consequences, especially if the operator lacks a comprehensive understanding of the system's dependencies.

**Steelman:**
> The proposal introduces unnecessary complexity with sub-branches and live-preview rollbacks, while the backend probes might provide a false sense of security due to their limited scope. The potential for increased merge conflicts and developer confusion outweighs the marginal safety gains, making the system more cumbersome and error-prone than the status quo.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > The added complexity of sub-branches does not justify the potential for merge conflicts and developer confusion. Keeping the v1 behavior simplifies the branching strategy and reduces cognitive overhead.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The v2 additions to S8 introduce complexity and potential for false positives without a clear demonstration of significant improvement in detecting regressions. Relying on post-deploy monitoring provides a more comprehensive and realistic assessment of system behavior.

### Slot 7 — openrouter:deepseek/deepseek-r1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — S7 squash-merge obscures history**
  > §3.7 S7's sub-branch squash-merges erase granular commit history for multi-construction sessions, violating Locked Rule #1 (source-of-truth hierarchy) by making forensic analysis of individual session steps dependent on 30-day-retained sub-branches rather than canonical branch history.
- **Obj 2 — S8 memory-leak probe false negatives**
  > §3.8 S8's 20% RSS growth threshold for memory leaks allows dangerous accumulation (e.g. 19% growth per deploy). Combined with CA-14-B's continuous crawl cadence, this could permit exponential memory growth across deployments while passing Phase B.
- **Obj 3 — Live-preview Phase B time window gap**
  > The 1-hour auto-rollback window for live-preview Phase B failures (§3.8 S8-CT4) creates a race condition: latency-sensitive production traffic hitting the preview URL between merge and test completion could experience errors before rollback triggers.

**Steelman:**
> The proposal adds substantial complexity (sub-branch management, triple Phase B passes, backend probes) without proving these layers meaningfully improve over v1's already-validated S3/S4/S5 stack. The 95/95 governance threshold might be better served by strengthening existing schema/load tests rather than adding post-merge phases that risk production availability.

**Votes:**

- **J2v2-S7** = `S7V2-RATIFY` — Ratify S7 v2 as drafted (sub-branches for multi-construction; squash-merge; per-product branch remains target)
  > While squash-merges have drawbacks, the 30-day sub-branch retention and explicit governance records (redesign_session_subbranch_merged.v1) provide adequate auditability without violating CA-14-D invariants.
- **J2v2-S8** = `S8V2-RATIFY` — Ratify S8 v2 as drafted (3 Phase B runs incl live-preview; dual-load; backend probes).
  > The live-preview and backend probes directly address Slot 6/Slot 8 concerns about production-regression gaps, though the 1-hour window and memory thresholds warrant future calibration.

### Slot 8 — openrouter:perplexity/sonar — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Sub-branch merge hides provenance**
  > In §3.7 S7, multi-construction redesign sessions squash-merge several commits from `<self_renewal_branch>/redesign-session-<sessionId>` into one per-product branch commit. That preserves history compactness, but it weakens forensic traceability promised elsewhere in the artifact because per-construction blame and intermediate rollback points disappear at the branch-of-record. The spec says `governance_record_entry` will record the merge, but that is not the same as retaining navigable source history.
- **Obj 2 — Live-preview rollback window is narrow**
  > §3.8 S8 requires a live-preview Phase B rerun only after PR merge, and failures within 1 hour trigger auto-rollback. Failures that surface after one hour are now outside the hard rollback guarantee, even though they may still be caused by the construction; that creates a blind spot versus status quo monitoring. The proposal adds a brittle temporal boundary where the system may silently drift into a bad state after the protection window closes.
- **Obj 3 — Heavy-load probe is under-specified**
  > The `endpoint_generation` dual-load requirement in §3.8 names 1 req/s and 100 req/s, but it does not define data volume, request mix, warmup, or success thresholds beyond generic correctness/latency/error-shape. In practice this can produce false confidence: a trivial endpoint can pass 100 req/s for 60s while still failing under bursty, stateful, or tenant-skewed traffic. The added probes may therefore certify the wrong thing while consuming nontrivial CI/runtime budget.
- **Obj 4 — Connection-pool metric can misfire**
  > The backend probe in §3.8 says pool size should be at least `p99 concurrent connections`, but the spec does not define how p99 is measured or over what interval. That can make compliant implementations fail due to measurement noise, while noncompliant implementations can tune superficially to the probe instead of actual workload behavior. This is a classic metric-gaming surface, especially for systems with short-lived spikes.

**Steelman:**
> The strongest case for rejecting or deferring is that both S7 and S8 add process overhead without fully closing the failure modes they target. S7’s sub-branching improves organization, but squash-merging reduces audit granularity, and S8’s extra Phase B runs may create expensive false negatives while still missing long-tail or production-only behaviors. If the goal is safer construction, a narrower pilot with explicit rollback, measurement definitions, and provenance requirements would be more defensible than broad ratification now.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > The proposal’s sub-branch model adds a second branch topology plus squash-merge semantics, but it does not materially improve safety over v1 for single-construction work. Given the provenance and bisectability loss from squash merges, rejecting the added branch layer is the safer choice.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The v2 additions are the most ambiguous and operationally expensive parts of §3.8, especially the post-merge rollback window and the loosely specified load/probe thresholds. Keeping the pre-PR gate while relying on downstream monitoring is the only listed option that avoids encoding brittle new failure criteria.

### Slot 9 — openrouter:meta-llama/llama-4-maverick — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Sub-branch complexity**
  > §3.7 introduces per-session sub-branches for multi-construction redesign sessions, adding complexity to the branch management process. The benefits of this added complexity are not clearly justified.
- **Obj 2 — Live-preview Phase B timing**
  > §3.8 introduces a live-preview Phase B run after PR merge, which may not be sufficient to catch issues that arise from the merge itself. The 1-hour window for auto-rollback may be too short for some constructions.
- **Obj 3 — Backend probe coverage**
  > §3.8 introduces three backend probes for endpoint_generation constructions, but it is unclear whether these probes are comprehensive enough to cover all potential issues, such as performance regressions under varying loads.

**Steelman:**
> The proposal introduces significant changes to the branch management and testing processes without clear evidence that these changes will improve the overall quality or safety of the constructions. The added complexity could lead to increased maintenance burdens and potential points of failure.

**Votes:**

- **J2v2-S7** = `S7V2-PERCLASS` — Adjust — sub-branches per construction-class instead of per-session (`<self_renewal_branch>/<class>/<runId>`).
  > This approach could potentially simplify the branch management by aligning sub-branch creation with the type of construction being performed, rather than the session.
- **J2v2-S8** = `S8V2-STRENGTHEN` — Strengthen further — add load-profile-shadow-traffic (replay 30 minutes of real production traffic against pre
  > Adding more comprehensive testing, such as load-profile-shadow-traffic or fail-injection, could further enhance the robustness of the constructions by simulating real-world conditions and potential failure scenarios.

### Slot 10 — openrouter:x-ai/grok-4.3 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — S7 sub-branch squash-merge**
  > §3.7 defines per-session sub-branches with 30-day retention and squash-merge on approval, but provides no mechanism to prevent sub-branch divergence from the per-product self_renewal_branch HEAD during the session window, violating the CA-14-D invariant that every construction commit must land on the branch-of-record.
- **Obj 2 — S8 live-preview 1-hour rollback**
  > §3.8 S8-CT-4 triggers S5 auto-rollback only on Phase B failure within 1 hour of PR merge against the Vercel preview URL, yet the proposal gives no definition of how transient preview-environment differences (cold starts, env var propagation) are distinguished from genuine regressions.
- **Obj 3 — S8 backend probe thresholds**
  > §3.8 mandates RSS growth ≤20% and pool size ≥ p99 concurrent connections for endpoint_generation, but these numeric bounds appear in the conformance tests without reference to any measurement baseline or adjustment for the project's existing connection-pool configuration in api/_lib.

**Steelman:**
> The proposal layers three new mandatory execution points (sub-branch creation, post-merge Phase B, and three backend probes) on top of an already gated Self-Renewal pipeline without demonstrating that the current failure rate justifies the added latency and operational surface; deferral would allow the existing S1–S6 gates plus post-deploy monitoring to continue collecting data before further automation is locked in.

**Votes:**

- **J2v2-S7** = `REJECT` — REJECT
  > Sub-branches introduce retention, naming, and merge-order invariants that are not justified by any measured failure mode in the current per-product branch discipline.
- **J2v2-S8** = `S8V2-SIMPLIFY` — Simplify — keep v1's pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend pro
  > The three new Phase B executions duplicate coverage already provided by S4, S3, and operator PR review while adding unproven numeric thresholds.