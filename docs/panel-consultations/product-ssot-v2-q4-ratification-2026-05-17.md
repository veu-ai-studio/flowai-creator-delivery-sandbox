# Panel — ProductSSOT v2 §9 Q4 ADVERSARIAL RATIFICATION (2026-05-17)

**Spec:** docs/specs/PRODUCT_SSOT_SPEC.md (commit c59326a)
**Scope:** §9 Q4 sole open question. Q1/Q2/Q3/Q5 RATIFIED 2026-05-16.
**Mode:** ADVERSARIAL — locked W5b format.
**Started:** 2026-05-17T07:23:03.840Z  ·  **Finished:** 2026-05-17T07:25:34.259Z
**Bundle:** 56311 chars
**Audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"amazon":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}

## 🚨 RATIFICATION VERDICT — `NOT_RATIFIED`
§9 Q4 lacks clear Panel majority — append-only-vs-UPDATE-with-revision unresolved.

## DISSENT-FLOOR
Alignment 2/9 = **22.2%** · objections **33** · ✅ PASS

## PS-Q4 tally
### PS-Q4 — ProductSSOT §9 Q4 — override semantics. Option Y (append-only, current §3 + §13.1): every mutation appends a NEW override entry; "revoke" = new entry with replacementContent. Option N (UPDATE-with-revision): each override is a top-level entry with a `revisions[]` sub-array; "revoke" = append to that array, current state = LAST revision. Which semantics is canonical for ProductSSOT override mutation?

Tally (ENGAGED-only, 9):
  - `PSQ4-Y` "Y / Append-only — every mutation is a new row; revoke = new override entry with replacementContent. Simpler audit (every change → new product_ssot_version row), matches §28.3's "audit trail preserved""  →  **2**
  - `PSQ4-N` "N / UPDATE-with-revision — each override is one top-level entry with revisions[] sub-array; revoke = append to revisions[]. Friendlier UI (single revision-history pane per override), avoids duplicate-"  →  **0**
  - `PSQ4-HYBRID` "Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot/:productId` UI synthesises an UPDATE-with-revision VIEW from the append-only lo"  →  **4**
  - `PSQ4-DIFF` "Different shape entirely — revoke is its own first-class operation (e.g. an `overrideRevocations[]` jsonb that points at active overrides by id), not a synthetic "new override that restores the origin"  →  **0**
  - `REJECT` (free-text) → 3

**Verdict:** `PLURALITY_PSQ4-HYBRID` — 4 of 9 on PSQ4-HYBRID (below 7/10 quorum).


## All distinct objections (33)
**01. [Slot 1] Unbounded jsonb array growth**

> §2.1 delta_log[] and governance_record[] are append-only jsonb arrays with no retention policy or archival mechanism. A product with 365 daily runs accumulates thousands of entries, degrading query performance and making the 'one row per product+environment' design a liability.

**02. [Slot 1] Hash chain verification gap**

> §3.1 computes this_hash during write but §8 criterion #6 only verifies nightly. A corrupted hash chain could persist for up to 24 hours before detection, and the spec provides no remediation path when divergence is found.

**03. [Slot 1] Concurrent write serialization failure**

> §8 criterion #3 acknowledges concurrent writes may abort with serialization_failure but provides no retry logic or queue mechanism. High-traffic products could see frequent write failures during peak Self-Renewal hours.

**04. [Slot 1] Override revocation creates infinite loops**

> §9 Q4 Option Y's 'revoke = new override with replacementContent' means revoking a revocation creates a third override. There's no mechanism to prevent oscillating override chains or to determine the 'true' original value after multiple revocations.

**05. [Slot 2] Atomicity interpretation issues**

> The proposal uses a saga pattern for atomicity (§3.2), which may lead to inconsistencies if compensating actions fail. This could result in partial updates that are difficult to reconcile, especially if external systems like Vercel fail after the database transaction commits.

**06. [Slot 2] RLS policy complexity**

> The split into three explicit per-role policies (§4.6) increases complexity and potential for misconfiguration. This could lead to unauthorized access or denial of access to legitimate users, impacting data security and usability.

**07. [Slot 2] Cost implications of re-assessment crawl**

> The re-assessment crawl adds significant cost per Self-Renewal cycle (§7.1), which could become prohibitive as the number of products and environments scales. This might deter adoption or lead to budget overruns.

**08. [Slot 3] Lack of rollback**

> The proposal does not provide a clear rollback strategy in case of failures during the atomic write transaction, which could lead to data inconsistencies and errors. Specifically, §3.1 does not specify how to handle failures during the transaction.

**09. [Slot 3] Insufficient RLS**

> The RLS policies defined in §4.6 may not be sufficient to prevent unauthorized access to the ProductSSOT data, as they rely on the `auth.jwt()` function which may be vulnerable to tampering or spoofing. Additionally, the policies do not account for potential conflicts between different roles or users.

**10. [Slot 3] Inadequate testing**

> The acceptance criteria defined in §8 may not be comprehensive enough to ensure the correct functioning of the ProductSSOT system, as they do not cover all possible scenarios or edge cases. For example, the criteria do not test the behavior of the system in case of concurrent updates or failures during the atomic write transaction.

**11. [Slot 4] Complexity in Self-Governance**

> The Self-Governance Layer introduces multiple components that need to interact seamlessly. The Self-Test component, for instance, requires a scheduledSelfTest that might conflict with other scheduled tasks, leading to resource contention. The Self-Audit component's five-dimension scoring engine adds complexity, especially with the introduction of the Security Posture dimension, which could lead to false positives and unnecessary Self-Protection triggers.

**12. [Slot 4] Risk of Self-Protection Rollback**

> The Self-Protect component's snapshot and rollback mechanism before any state mutation is critical but risky. If the rollback mechanism fails or is improperly triggered, it could lead to data loss or inconsistent states. The proposal does not detail the failure recovery process for the rollback mechanism.

**13. [Slot 4] Human Gates Bottleneck**

> The four Human Gates introduce potential bottlenecks in the system. The Approval gate, for instance, requires elevated roles for overrides, which could delay critical decisions. The Testing gate's re-fix and escalate options add complexity and potential delays in the approval process.

**14. [Slot 5] Complexity of Append-Only**

> The append-only model for overrides (§3 + §13.1) adds complexity to the system, as it requires maintaining a full history of changes, which can lead to performance issues and increased storage requirements over time.

**15. [Slot 5] UI Friendliness**

> The append-only model may not be as user-friendly as the UPDATE-with-revision model, as it does not provide a consolidated view of an override's history, potentially leading to confusion for operators.

**16. [Slot 5] RLS Policy Complexity**

> The append-only model may complicate the implementation of RLS policies, as it requires handling each override as a separate entry, which could lead to more complex policy definitions and potential security risks.

**17. [Slot 6] RLS complexity**

> The RLS policies in §4.6, while seemingly straightforward, introduce significant complexity. The OR-combined policies, while semantically equivalent to the prior single policy, are harder to reason about and debug. Misconfiguration could lead to unintended data access or denial of service.

**18. [Slot 6] Saga pattern risks**

> The saga pattern in §3.2, while pragmatic, introduces potential inconsistencies. If the post-commit side effects (Stage C) fail, the system logs the error but doesn't roll back the transaction. This could lead to a state where the ProductSSOT is updated, but the operator isn't notified or the UI isn't updated, leading to confusion and potential errors.

**19. [Slot 6] Cost estimation uncertainty**

> The cost estimation in §7.1 for the re-assessment crawl is highly variable (~$0.30 – $2.00). This wide range makes it difficult to accurately budget for the feature and could lead to unexpected cost overruns if the actual cost trends towards the higher end of the estimate. The reliance on external services like Browserless and Anthropic introduces further uncertainty.

**20. [Slot 6] Version monotonicity enforcement**

> §3.3 states that version monotonicity is enforced by the write contract, not by SQL. This relies on application-level logic to prevent race conditions and ensure correct versioning. While the acceptance criteria include a test for this, relying on application logic instead of database constraints increases the risk of data corruption or inconsistencies.

**21. [Slot 7] Saga leaves unverified deployments**

> §3.2's saga pattern risks leaving live deployments in 'unverified' states if SSOT writes fail. This violates §7's output contract atomicity principle, as users could interact with functionally deployed but unrecorded products. The lack of auto-undeploy creates security drift where ProductSSOT diverges from reality.

**22. [Slot 7] RLS policy bypass risk**

> §3.4 service-role writes bypass RLS without org-scoped validation. A compromised service role could inject cross-org data into any ProductSSOT row. The absence of product-org linkage checks during writes contradicts §4.6's read isolation guarantees.

**23. [Slot 7] Unbounded override accumulation**

> §4.4's append-only overrides lack expiry mechanisms. Indefinite overrides in governance_record could mask recurring issues (e.g., suppressed security scores), violating §10.2's reconciliation principle where issues must be resolved, not perpetually overridden.

**24. [Slot 7] Cost scaling blindspot**

> §7.1's $0.30-$2.00/run cost assumes static product volume. At 50 products with daily cycles, annual costs hit $11k-$73k with no dynamic throttling (e.g., cadence adjustment for low-priority products). This violates §7.6's cost governance intent.

**25. [Slot 8] Append-only is underspecified**

> §9 Q4 is still explicitly marked OPEN, but §3 and §13.1 act as if append-only is already canonical. That creates a governance mismatch: implementers are told not to build revoke/revision UI until Q4 lands, yet the core write contract and data model already bake in one interpretation without settling the unresolved semantic question.

**26. [Slot 8] Version rows conflate concerns**

> §2.2 `product_ssot_version` stores both immutable snapshots and operational metadata like `write_kind`, `written_by`, and the derived hash chain. That mixes audit, provenance, and state capture into one artifact, which makes later correction or replay logic brittle if the canonical meaning of an override changes or if a write is partially synthesized from multiple sources.

**27. [Slot 8] RLS and admin overrides conflict**

> §4.4 says admin annotations + overrides must be honoured as CEO-equivalent directives, but §3.4 and §4.6 separately restrict direct table writes and rely on server-side functions. The proposal never defines whether an operator-visible override is read-time interpretation, write-time mutation, or both, so different services can easily diverge on whether an override is active.

**28. [Slot 9] Append-only override semantics may lead to unbounded growth**

> §3 and §13.1 specify append-only semantics for overrides, which could result in unbounded growth in the `overrides[]` jsonb array. This may impact performance and storage requirements.

**29. [Slot 9] Lack of explicit override revocation mechanism**

> The proposal relies on appending a new override entry to 'revoke' an existing one (§9 Q4). This may lead to confusion and potential inconsistencies if not properly handled by the UI and downstream consumers.

**30. [Slot 9] RLS policies may not be robust against concurrent writes**

> §4.6 defines RLS policies for `product_ssot`, but there is a risk of concurrent writes causing inconsistencies or policy violations if not properly synchronized.

**31. [Slot 10] §3.2 saga omits external failure compensation**

> The three-stage saga table in §3.2 defines compensating actions only for Postgres txn failure (mark unverified) but provides no handler for Vercel deploy succeeding while delta report file write fails; this leaves the run in a half-cleared state where ClearanceRecord Step 6 can still pass despite missing §7 item #3 source disclosure.

**32. [Slot 10] §4.6 RLS policies share mutable predicate**

> All three org-scoped policies duplicate the identical `exists (select 1 from products p where p.id = product_ssot.product_id and p.org_id = ...)` subquery; any future change to the products RLS or JWT claim shape requires coordinated edits across four policies with no single source of truth or test macro.

**33. [Slot 10] §7.1 re-assessment cost bound unenforced**

> The $0.30–$2.00 per-cycle estimate and $15/run ceiling are stated as design assumptions but no mechanism (token counter, Browserless quota guard, or §10 Self-Protect integration) is wired to actually cap or reject runs that would exceed them once Agent #21 Aggressive Crawl is active.

## Per-reviewer
## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Unbounded jsonb array growth**

> §2.1 delta_log[] and governance_record[] are append-only jsonb arrays with no retention policy or archival mechanism. A product with 365 daily runs accumulates thousands of entries, degrading query performance and making the 'one row per product+environment' design a liability.

**Objection 2 — Hash chain verification gap**

> §3.1 computes this_hash during write but §8 criterion #6 only verifies nightly. A corrupted hash chain could persist for up to 24 hours before detection, and the spec provides no remediation path when divergence is found.

**Objection 3 — Concurrent write serialization failure**

> §8 criterion #3 acknowledges concurrent writes may abort with serialization_failure but provides no retry logic or queue mechanism. High-traffic products could see frequent write failures during peak Self-Renewal hours.

**Objection 4 — Override revocation creates infinite loops**

> §9 Q4 Option Y's 'revoke = new override with replacementContent' means revoking a revocation creates a third override. There's no mechanism to prevent oscillating override chains or to determine the 'true' original value after multiple revocations.

**Worse-than-status-quo:** Today's silent failures at least complete the pipeline run; with this spec, a transient Postgres connectivity issue during §3.1's atomic write marks the entire run INCOMPLETE and potentially undeploys a working fix, making the system less reliable than status quo.

**Precedent:** Kubernetes ConfigMap revision history faced similar unbounded-growth issues with append-only changes, leading to the introduction of revisionHistoryLimit to prevent resource exhaustion.

### Rejection steelman

> This spec introduces a single point of failure (ProductSSOT write) that can halt all pipeline runs, while providing no operational tooling for the inevitable issues: pruning unbounded arrays, repairing hash chain divergence, or handling write contention. The implementation should be deferred until these operational concerns are addressed with concrete limits, archival strategies, and failure recovery paths.

### Votes

- **PS-Q4** = `PSQ4-HYBRID` — Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot
  > This preserves the audit integrity requirement while avoiding the UI confusion of multiple override entries for the same target, and doesn't require complex UPDATE semantics on jsonb arrays.

---

## Slot 2 — openrouter:openai/gpt-4o — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Atomicity interpretation issues**

> The proposal uses a saga pattern for atomicity (§3.2), which may lead to inconsistencies if compensating actions fail. This could result in partial updates that are difficult to reconcile, especially if external systems like Vercel fail after the database transaction commits.

**Objection 2 — RLS policy complexity**

> The split into three explicit per-role policies (§4.6) increases complexity and potential for misconfiguration. This could lead to unauthorized access or denial of access to legitimate users, impacting data security and usability.

**Objection 3 — Cost implications of re-assessment crawl**

> The re-assessment crawl adds significant cost per Self-Renewal cycle (§7.1), which could become prohibitive as the number of products and environments scales. This might deter adoption or lead to budget overruns.

**Worse-than-status-quo:** The proposal could lead to increased operator-visible failure rates due to previously silent errors becoming visible, causing confusion and potential operational disruptions.

**Precedent:** No precedent known

### Rejection steelman

> The proposal introduces significant complexity and cost, particularly with the saga pattern for atomicity and the re-assessment crawl. These could lead to operational inefficiencies and budget overruns, suggesting a need for further simplification or cost analysis before implementation.

### Votes

- **PS-Q4** = `PSQ4-HYBRID` — Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot
  > This option balances audit trail integrity with UI usability, providing a clear audit log while offering a user-friendly interface for operators.

---

## Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Lack of rollback**

> The proposal does not provide a clear rollback strategy in case of failures during the atomic write transaction, which could lead to data inconsistencies and errors. Specifically, §3.1 does not specify how to handle failures during the transaction.

**Objection 2 — Insufficient RLS**

> The RLS policies defined in §4.6 may not be sufficient to prevent unauthorized access to the ProductSSOT data, as they rely on the `auth.jwt()` function which may be vulnerable to tampering or spoofing. Additionally, the policies do not account for potential conflicts between different roles or users.

**Objection 3 — Inadequate testing**

> The acceptance criteria defined in §8 may not be comprehensive enough to ensure the correct functioning of the ProductSSOT system, as they do not cover all possible scenarios or edge cases. For example, the criteria do not test the behavior of the system in case of concurrent updates or failures during the atomic write transaction.

**Worse-than-status-quo:** The proposal's introduction of a new atomic write transaction and RLS policies may actually make the system more complex and prone to errors, potentially leading to a worse outcome than the current status quo where pipeline runs silently complete without writing to ProductSSOT.

**Precedent:** No precedent known

### Rejection steelman

> The proposal's lack of a clear rollback strategy, insufficient RLS policies, and inadequate testing make it difficult to ensure the correct functioning of the ProductSSOT system. Therefore, it may be prudent to reject or defer the proposal until these issues are addressed.

### Votes

- **PS-Q4** = `PSQ4-Y` — Y / Append-only — every mutation is a new row; revoke = new override entry with replacementContent. Simpler audit (every
  > This option provides the simplest audit trail and cleanest RLS WITH CHECK semantics, making it the most appealing choice.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Complexity in Self-Governance**

> The Self-Governance Layer introduces multiple components that need to interact seamlessly. The Self-Test component, for instance, requires a scheduledSelfTest that might conflict with other scheduled tasks, leading to resource contention. The Self-Audit component's five-dimension scoring engine adds complexity, especially with the introduction of the Security Posture dimension, which could lead to false positives and unnecessary Self-Protection triggers.

**Objection 2 — Risk of Self-Protection Rollback**

> The Self-Protect component's snapshot and rollback mechanism before any state mutation is critical but risky. If the rollback mechanism fails or is improperly triggered, it could lead to data loss or inconsistent states. The proposal does not detail the failure recovery process for the rollback mechanism.

**Objection 3 — Human Gates Bottleneck**

> The four Human Gates introduce potential bottlenecks in the system. The Approval gate, for instance, requires elevated roles for overrides, which could delay critical decisions. The Testing gate's re-fix and escalate options add complexity and potential delays in the approval process.

**Worse-than-status-quo:** The introduction of the Self-Governance Layer could lead to increased complexity and potential bottlenecks, making the system less efficient and more prone to failures compared to the current status quo.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant complexity with the Self-Governance Layer, which includes multiple interacting components and human gates that could lead to bottlenecks and delays. The rollback mechanism in the Self-Protect component is critical but risky, and the proposal lacks details on failure recovery. Given these risks, it would be prudent to defer the proposal until these issues are addressed.

### Votes

- **PS-Q4** = `PSQ4-Y` — Y / Append-only — every mutation is a new row; revoke = new override entry with replacementContent. Simpler audit (every
  > This option ensures a clear audit trail and simpler RLS WITH CHECK semantics, which is crucial for maintaining data integrity and compliance.

---

## Slot 5 — openrouter:amazon/nova-pro-v1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Complexity of Append-Only**

> The append-only model for overrides (§3 + §13.1) adds complexity to the system, as it requires maintaining a full history of changes, which can lead to performance issues and increased storage requirements over time.

**Objection 2 — UI Friendliness**

> The append-only model may not be as user-friendly as the UPDATE-with-revision model, as it does not provide a consolidated view of an override's history, potentially leading to confusion for operators.

**Objection 3 — RLS Policy Complexity**

> The append-only model may complicate the implementation of RLS policies, as it requires handling each override as a separate entry, which could lead to more complex policy definitions and potential security risks.

**Worse-than-status-quo:** If the append-only model is implemented without careful consideration of performance and storage implications, it could lead to a system that is less efficient and more costly to maintain than the current status quo.

**Precedent:** no precedent known

### Rejection steelman

> The append-only model for overrides, while simpler for audit purposes, may introduce unnecessary complexity and costs to the system, and could be less user-friendly than alternative models. Therefore, it may be prudent to reconsider the UPDATE-with-revision model or explore a hybrid approach that balances auditability with operational efficiency.

### Votes

- **PS-Q4** = `REJECT` — REJECT
  > The current options do not adequately address the concerns raised by the append-only model, and a more balanced approach may be necessary.

---

## Slot 6 — openrouter:google/gemini-2.0-flash-001 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — RLS complexity**

> The RLS policies in §4.6, while seemingly straightforward, introduce significant complexity. The OR-combined policies, while semantically equivalent to the prior single policy, are harder to reason about and debug. Misconfiguration could lead to unintended data access or denial of service.

**Objection 2 — Saga pattern risks**

> The saga pattern in §3.2, while pragmatic, introduces potential inconsistencies. If the post-commit side effects (Stage C) fail, the system logs the error but doesn't roll back the transaction. This could lead to a state where the ProductSSOT is updated, but the operator isn't notified or the UI isn't updated, leading to confusion and potential errors.

**Objection 3 — Cost estimation uncertainty**

> The cost estimation in §7.1 for the re-assessment crawl is highly variable (~$0.30 – $2.00). This wide range makes it difficult to accurately budget for the feature and could lead to unexpected cost overruns if the actual cost trends towards the higher end of the estimate. The reliance on external services like Browserless and Anthropic introduces further uncertainty.

**Objection 4 — Version monotonicity enforcement**

> §3.3 states that version monotonicity is enforced by the write contract, not by SQL. This relies on application-level logic to prevent race conditions and ensure correct versioning. While the acceptance criteria include a test for this, relying on application logic instead of database constraints increases the risk of data corruption or inconsistencies.

**Worse-than-status-quo:** If the atomic write fails due to a transient error (e.g., network blip), the pipeline run is marked as INCOMPLETE, and the Vercel deployment is marked as unverified. This could lead to unnecessary rollbacks and disruptions, even if the underlying product functionality is working correctly, making the system less reliable than the current state where these failures are silent.

**Precedent:** no precedent known

### Rejection steelman

> The proposal introduces significant complexity with the saga pattern, RLS policies, and application-level versioning. The cost estimation is uncertain, and the potential for inconsistencies due to post-commit side-effect failures raises concerns about data integrity. Deferring the proposal would allow for further refinement of the design and a more thorough evaluation of the risks and costs.

### Votes

- **PS-Q4** = `PSQ4-HYBRID` — Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot
  > This option provides the best of both worlds: the append-only database layer ensures a complete audit trail, while the UI provides a more user-friendly experience by presenting the data in an UPDATE-with-revision format. This approach balances data integrity with usability.

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `TANGENTIAL`

### Adversarial pass

**Objection 1 — Saga leaves unverified deployments**

> §3.2's saga pattern risks leaving live deployments in 'unverified' states if SSOT writes fail. This violates §7's output contract atomicity principle, as users could interact with functionally deployed but unrecorded products. The lack of auto-undeploy creates security drift where ProductSSOT diverges from reality.

**Objection 2 — RLS policy bypass risk**

> §3.4 service-role writes bypass RLS without org-scoped validation. A compromised service role could inject cross-org data into any ProductSSOT row. The absence of product-org linkage checks during writes contradicts §4.6's read isolation guarantees.

**Objection 3 — Unbounded override accumulation**

> §4.4's append-only overrides lack expiry mechanisms. Indefinite overrides in governance_record could mask recurring issues (e.g., suppressed security scores), violating §10.2's reconciliation principle where issues must be resolved, not perpetually overridden.

**Objection 4 — Cost scaling blindspot**

> §7.1's $0.30-$2.00/run cost assumes static product volume. At 50 products with daily cycles, annual costs hit $11k-$73k with no dynamic throttling (e.g., cadence adjustment for low-priority products). This violates §7.6's cost governance intent.

**Worse-than-status-quo:** A Postgres outage during §3.1 transactions causes mass SSOT_WRITE_FAILED errors. Operators overwhelmed by new visibility (§7.2) create hasty overrides to silence alerts, masking genuine deployment issues. Meanwhile, accumulating 'unverified' deployments create undetected attack surfaces worse than today's consistent lack of SSOT.

**Precedent:** GitLab's 2017 database outage: a failed write saga left inconsistent deployment states causing prolonged service degradation. Similar partial-commit risks here could create 'unverified' deployment sprawl analogous to GitLab's orphaned artifacts.

### Rejection steelman

> The proposal introduces critical new risks: saga-based atomicity failures could spawn unverified deployments, RLS bypass enables cross-org data leaks, and unbounded override costs may escalate exponentially. Since current pipelines function without SSOT, deferring until true 2PC with Vercel integration exists would prevent systemic integrity erosion.

### Votes

- **PS-Q4** = `UNMATCHED` — Y / Append-only — every mutation is a new row; revoke = new override entry with replacementContent. Simpler audit (every change → new product_ssot_version row), matches §28.3's 'audit trail preserved' verbatim; cleanest RLS WITH CHECK semantics.
  > Append-only ensures tamper-evident auditing via product_ssot_version and avoids complex UPDATE semantics that could complicate RLS policies and hash-chain verification.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Append-only is underspecified**

> §9 Q4 is still explicitly marked OPEN, but §3 and §13.1 act as if append-only is already canonical. That creates a governance mismatch: implementers are told not to build revoke/revision UI until Q4 lands, yet the core write contract and data model already bake in one interpretation without settling the unresolved semantic question.

**Objection 2 — Version rows conflate concerns**

> §2.2 `product_ssot_version` stores both immutable snapshots and operational metadata like `write_kind`, `written_by`, and the derived hash chain. That mixes audit, provenance, and state capture into one artifact, which makes later correction or replay logic brittle if the canonical meaning of an override changes or if a write is partially synthesized from multiple sources.

**Objection 3 — RLS and admin overrides conflict**

> §4.4 says admin annotations + overrides must be honoured as CEO-equivalent directives, but §3.4 and §4.6 separately restrict direct table writes and rely on server-side functions. The proposal never defines whether an operator-visible override is read-time interpretation, write-time mutation, or both, so different services can easily diverge on whether an override is active.

**Worse-than-status-quo:** If Q4 is implemented as append-only but the UI or downstream agents assume update-with-revision semantics, a revoked override will remain semantically active in some consumers and inactive in others. That can cause Self-Renewal or Quality Audit to keep applying a stale directive that humans believe they have withdrawn, making the system less safe than the current absence of ProductSSOT overrides.

**Precedent:** GitHub issue tracking and audit-log systems commonly prefer immutable append-only history, but a close real-world cautionary example is Kubernetes' admission/mutation model: when policy intent is split across multiple layers, operators often misread whether a change is enforced at write time or only at admission. no precedent known

### Rejection steelman

> The strongest case for rejecting or deferring is that Q4 is still open, so ratifying any concrete override mutation semantics now would effectively pre-decide a disputed governance question. Since overrides directly affect CEO-equivalent directives and downstream agent behavior, a wrong choice could hard-code irreversible workflow assumptions across storage, APIs, and UI before the Panel settles the canonical form. A short deferral would preserve flexibility and avoid shipping an audit model that later needs a disruptive migration.

### Votes

- **PS-Q4** = `REJECT` — REJECT
  > The proposal itself says Q4 is open and defers it to a follow-on Panel cycle, so none of the listed options is fully acceptable as currently specified. The safest vote is to reject until the canonical override semantics are explicitly resolved rather than inferred from conflicting sections.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Append-only override semantics may lead to unbounded growth**

> §3 and §13.1 specify append-only semantics for overrides, which could result in unbounded growth in the `overrides[]` jsonb array. This may impact performance and storage requirements.

**Objection 2 — Lack of explicit override revocation mechanism**

> The proposal relies on appending a new override entry to 'revoke' an existing one (§9 Q4). This may lead to confusion and potential inconsistencies if not properly handled by the UI and downstream consumers.

**Objection 3 — RLS policies may not be robust against concurrent writes**

> §4.6 defines RLS policies for `product_ssot`, but there is a risk of concurrent writes causing inconsistencies or policy violations if not properly synchronized.

**Worse-than-status-quo:** If the append-only semantics lead to performance issues or storage constraints, the system may become unresponsive or lose data integrity, making it worse than the current status quo where such data is not persisted.

**Precedent:** The GitLab database decomposition project faced similar challenges with append-only audit logs, leading to significant storage and performance issues. While their context differs, the principle of managing rapidly growing audit or override data is relevant.

### Rejection steelman

> Rejecting the proposal could be justified if the potential drawbacks of append-only override semantics and the lack of an explicit revocation mechanism are deemed too significant to proceed without further refinement or alternative designs.

### Votes

- **PS-Q4** = `PSQ4-HYBRID` — Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot
  > This approach balances the need for audit trail preservation with operator ergonomics, providing a viable compromise between the append-only and UPDATE-with-revision semantics.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — §3.2 saga omits external failure compensation**

> The three-stage saga table in §3.2 defines compensating actions only for Postgres txn failure (mark unverified) but provides no handler for Vercel deploy succeeding while delta report file write fails; this leaves the run in a half-cleared state where ClearanceRecord Step 6 can still pass despite missing §7 item #3 source disclosure.

**Objection 2 — §4.6 RLS policies share mutable predicate**

> All three org-scoped policies duplicate the identical `exists (select 1 from products p where p.id = product_ssot.product_id and p.org_id = ...)` subquery; any future change to the products RLS or JWT claim shape requires coordinated edits across four policies with no single source of truth or test macro.

**Objection 3 — §7.1 re-assessment cost bound unenforced**

> The $0.30–$2.00 per-cycle estimate and $15/run ceiling are stated as design assumptions but no mechanism (token counter, Browserless quota guard, or §10 Self-Protect integration) is wired to actually cap or reject runs that would exceed them once Agent #21 Aggressive Crawl is active.

**Worse-than-status-quo:** Making SSOT_WRITE_FAILED visible will convert today's silent bypasses into frequent ERROR verdicts on every transient Postgres blip or hash-chain mismatch, causing more pipeline runs to be marked INCOMPLETE and requiring manual re-trigger than the current zero-visibility status quo.

**Precedent:** no precedent known

### Rejection steelman

> The six-block jsonb-plus-saga design adds substantial operational surface (hash-chain verification, version monotonicity under concurrency, four-way RLS duplication) while the only concrete benefit cited is preserving §7.5 living-document semantics that could be achieved with a simpler append-only event log table; until the open Q4 override semantics and the missing cost-guard implementation are resolved, the spec risks locking in an over-engineered substrate that later waves must carry.

### Votes

- **PS-Q4** = `REJECT` — REJECT
  > All four listed shapes either overload the overrides[] array or require UPDATE-in-place; none addresses the need for a first-class revocation entry type that can be independently RLS-gated and cross-referenced from delta_log without polluting the primary override history.