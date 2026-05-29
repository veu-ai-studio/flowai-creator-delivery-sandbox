# Panel — FlowAI self-testing capability emergency (2026-05-20)

**Dispatch:** W6 Emergency Panel — FlowAI cannot complete a full improvement cycle through its own UI; CA-18 §1 ("URL in -> new URL out") + §5 ("FlowAI applies to its own development") are at stake.
**Bundle:** 29782 chars
**Started:** 2026-05-20T06:45:50.696Z · **Finished:** 2026-05-20T06:47:27.473Z
**Engaged:** 8/10 · Tangential: 1 · Silent: 1
**Distinct objections:** 30
**Alignment:** 75.0% · ✅ PASS
**Quorum:** ≥7/10 ENGAGED per Locked Rule 17

## Per-question
| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥7) |
|---|---|---|---|---|
| **J1** | `UNANIMOUS_J1-FLAW` | `J1-FLAW` | 8/8 | ✅ |
| **J2** | `QUORUM_PLURALITY_J2-UI-CONSTRUCT` | `J2-UI-CONSTRUCT` | 7/8 | ✅ |
| **J3** | `PLURALITY_J3-SELF-FIRST` | `J3-SELF-FIRST` | 4/8 | — |
| **J4** | `PLURALITY_J4-INVALIDATES` | `J4-INVALIDATES` | 5/8 | — |

## Detail
### J1
J1 — Is PATH B (audit-only, no fixes, no new deployable URL) an acceptable design for FlowAI, or a fundamental flaw that must be fixed for FlowAI to deliver its promise per CA-18 §1 ("any URL in -> new deployable URL out, perfected across all 10 quality dimensions per run")?

Tally (n=8):
  - `J1-FLAW` "Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces no new URL is not F" → **8**
  - `J1-ACCEPTABLE` "Acceptable design — audit-only is a legitimate Mode A (read-only inspection) and the "new URL out" promise applies only when the user explicitly requests constr" → **0**
  - `J1-DEFERRABLE` "Flaw but deferrable — PATH B violates §1 in principle but the proof-phase exemption allows shipping audit-only externally while construction matures internally;" → **0**
  - `J1-REFRAME` "Reframe the question — PATH B is fine IF the UI labels it explicitly as "Audit" (a distinct surface from "Improve"); the §1 promise applies to the Improve surfa" → **0**
**Verdict:** UNANIMOUS_J1-FLAW — 8 of 8 ENGAGED on J1-FLAW (unanimous)

### J2
J2 — What is the minimum architectural change to enable FlowAI to improve any URL submitted through its own UI (including its own URL flowai-dun.vercel.app/flowai), without CLI workarounds — i.e., to satisfy CA-18 §1 end-to-end through the UI?

Tally (n=8):
  - `J2-UI-CONSTRUCT` "Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 deploy-to-new-URL, w" → **7**
  - `J2-ENGINE-MERGE` "Merge PATH A (CLI construction) and PATH B (UI audit) into a single canonical FlowAI Engine that any caller (UI, CLI, API, agent) invokes the same way; PATHs be" → **0**
  - `J2-NEW-PRODUCT-ROUTE` "Add a "submit any URL" canonical entry-point that registers the URL as a new product_registry entry and triggers the standard §11 Six-Step Clearance + §29 Build" → **0**
  - `J2-MANUAL-MIGRATION` "Provide the operator a UI affordance to migrate any submitted URL into the existing product_registry manually (one-click "adopt as product"), then run the exist" → **0**
  - `REJECT` → 1
**Verdict:** QUORUM_PLURALITY_J2-UI-CONSTRUCT — 7 of 8 on J2-UI-CONSTRUCT (≥ quorum 7/10)

### J3
J3 — Should FlowAI-on-FlowAI (the platform improving its own UI/source) be the PRIMARY proof-of-concept — i.e., fix the product's ability to improve itself BEFORE testing any external product (RelTwin, SAIGE, etc.) — per CA-18 §5 ("FlowAI applies to its own development process")?

Tally (n=8):
  - `J3-SELF-FIRST` "YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demonstrated the §1 promis" → **4**
  - `J3-PARALLEL` "No — self-loop and external-loop should proceed in parallel. Self-loop matures the engine; external-loop matures the I/O surface (jurisdictional declarations, d" → **1**
  - `J3-EXTERNAL-FIRST` "No — external products are higher fidelity proofs. FlowAI itself is too small/familiar a target; improving its own static dashboard does not exercise the full §" → **0**
  - `J3-MILESTONE-GATED` "Self-first ONLY through a defined milestone (e.g. one full improvement cycle completed against flowai-dun.vercel.app/flowai with measurable score delta + new UR" → **3**
**Verdict:** PLURALITY_J3-SELF-FIRST — 4 of 8 on J3-SELF-FIRST (below 7/10 quorum)

### J4
J4 — Is the current testing approach (running improvement cycles via CLI scripts invoked through Claude Code agents, with the UI unable to complete a full cycle) valid evidence that FlowAI works as a product, or does it invalidate the proof because the product is not being exercised through its own product surface?

Tally (n=8):
  - `J4-INVALIDATES` "INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code CLI workarounds prov" → **5**
  - `J4-VALID-ENGINE-PROOF` "VALID as engine-level proof; INVALID as product-level proof. Distinguish the two: the CLI runs prove the §29 Construction Engine + §10 Self-Audit work end-to-en" → **1**
  - `J4-VALID-INTERIM` "VALID for the proof phase. CLI/Claude-Code invocation is the same FlowAI engine; the UI is a deployment surface, not the engine. Proof-of-concept requires the e" → **0**
  - `J4-INVALID-AND-MISLEADING` "Worse than invalid — actively misleading. Reporting "FlowAI improved product X" when the only invocation path was a Claude-Code-operated CLI builds false expect" → **2**
**Verdict:** PLURALITY_J4-INVALIDATES — 5 of 8 on J4-INVALIDATES (below 7/10 quorum)


## All distinct objections (30)
**01. [Slot 1] §5 self-application creates infinite regress**

> CA-18 §5 mandates FlowAI applies to its own development, but if FlowAI must improve itself before being considered functional, and it needs to be functional to improve itself, the system enters an unresolvable bootstrap paradox. The spec provides no escape hatch or initial bootstrap mechanism.

**02. [Slot 1] PATH B violates core §1 promise**

> The proposal admits PATH B produces no new URL despite CA-18 §1 explicitly stating 'Output: ALWAYS a new, separate, deployable URL'. This isn't a minor gap - it's a fundamental violation of the core product definition that the UI actively advertises but cannot deliver.

**03. [Slot 1] No rollback for self-improvement failures**

> CA-18 §5 requires FlowAI to improve its own source tree via §29 Build/Wire Construction Engine, but neither §5 nor the proposal defines what happens when FlowAI damages itself during self-improvement. Unlike external products where both URLs are preserved, self-modification could brick the platform.

**04. [Slot 1] Proof validation relies on deceptive evidence**

> The proposal reveals PATH A testing uses 'Claude-Code-operated CLI scripts' - an external LLM agent manually operating FlowAI, not FlowAI operating itself. This fundamentally misrepresents the product's actual capabilities to stakeholders reviewing proof artifacts.

**05. [Slot 3] Lack of UI**

> The current implementation of FlowAI does not have a functional UI that can complete a full improvement cycle, which contradicts the promise made in CA-18 §1. The UI at `flowai-dun.vercel.app/flowai` only accepts URL input and runs a partial audit, but does not generate fixes or deploy a new URL.

**06. [Slot 3] Insufficient Testing**

> The current testing approach relies on CLI scripts invoked through Claude Code agents, which may not be representative of real-world usage and may not exercise the product surface as intended. This could lead to a false sense of security and mask potential issues with the product.

**07. [Slot 3] Inconsistent Architecture**

> The existence of two separate paths, PATH A and PATH B, may indicate an inconsistent architecture that could lead to maintenance and scalability issues. The lack of a unified canonical FlowAI Engine that can be invoked by any caller (UI, CLI, API, agent) may cause problems in the long run.

**08. [Slot 4] Incomplete UI Integration**

> The proposal does not address the integration of the Construction Engine with the UI. §10 Self-Audit engine is functional, but there is no mechanism to trigger the Construction Engine from the UI, which is a critical gap.

**09. [Slot 4] Lack of Operator Control**

> The current design lacks operator control over the improvement cycle. Operators cannot initiate or control the construction process from the UI, which contradicts the user agency principle in CA-18 §1.

**10. [Slot 4] Potential for Infinite Self-Loop**

> The proposal suggests prioritizing FlowAI-on-FlowAI improvements, which could lead to an infinite self-loop. This focus may delay the platform's ability to improve external products, limiting its practical utility.

**11. [Slot 5] PATH B audit-only**

> PATH B currently only performs an audit and does not generate a new deployable URL, which contradicts CA-18 §1.

**12. [Slot 5] No UI-driven construction**

> There is no operator-reachable path through the UI to complete a full improvement cycle as required by CA-18 §1.

**13. [Slot 5] Self-application gap**

> FlowAI's self-application to its own development process (CA-18 §5) is not fully realized through the UI, creating a gap in the symbiotic relationship.

**14. [Slot 6] Conflicting definitions of 'product'**

> The document uses 'product' to refer to both FlowAI itself and the external URLs it processes. This ambiguity, especially in J4, makes it difficult to assess whether the 'product' is being adequately tested.

**15. [Slot 6] Unclear 'substantial transformation' metric**

> CA-18 §1 emphasizes 'substantial transformation' as a quality guarantee, but the definition of 'substantial' is subjective and lacks concrete metrics. This makes it difficult to objectively determine whether FlowAI is meeting its promise, especially in self-testing scenarios.

**16. [Slot 6] Risk of over-optimization on self-loop**

> Focusing solely on FlowAI-on-FlowAI (J3) could lead to over-optimization for a narrow use case, potentially neglecting the broader range of inputs and edge cases encountered with external products. This could result in a system that performs well on itself but poorly on real-world applications.

**17. [Slot 6] Lack of rollback strategy for UI wiring**

> Wiring the UI directly to the Construction Engine (J2) without a clear rollback strategy poses a risk. If the integration introduces bugs or instability, it could disrupt the entire FlowAI workflow, including the CLI-based construction path.

**18. [Slot 7] PATH B violates §1 output requirement**

> CA-18 §1 mandates 'Output: ALWAYS a new, separate, deployable URL' for any input. PATH B's audit-only output without a deployable URL fundamentally fails this core promise. The proposal acknowledges this gap but offers no interim mitigation.

**19. [Slot 7] Self-application failure in §5**

> The absence of UI-path self-improvement violates CA-18 §5's requirement that FlowAI applies to its own development. PATH A's CLI dependency creates a special-case exemption where FlowAI-on-FlowAI requires non-canonical operator intervention, undermining the symbiotic principle.

**20. [Slot 7] Proof validity misrepresentation risk**

> Reporting external product improvements via PATH A while the UI remains broken creates false product readiness signals. This risks stakeholder deception by demonstrating capabilities through non-product-surface mechanisms (Claude Code CLI), contravening honest assessment obligations in §1.

**21. [Slot 7] Architectural fragmentation**

> Maintaining separate PATH A (construction) and PATH B (audit) engines violates §5's symbiotic principle by preventing knowledge transfer between internal and external improvement cycles. Findings from PATH B audits don't feed into PATH A's construction logic, creating disjointed learning loops.

**22. [Slot 8] Audit-only breaks §1 promise**

> In PATH B, the UI accepts a URL but terminates at findings instead of producing a new deployable URL. That directly conflicts with CA-18 §1’s explicit “Output: ALWAYS a new, separate, deployable URL,” so the UI is not implementing the advertised product promise. The proposal treats this as a gap, but it may actually be a separate product class (audit) mislabeled as improvement.

**23. [Slot 8] Self-loop not proven in UI**

> CA-18 §5 says FlowAI applies to its own development process, including its own UI and source tree. The proposal admits the current self-improvement path is CLI-only via Claude Code, which means the canonical self-application is not reachable through the product surface. That makes the self-reference claim operationally unverified and creates a mismatch between canonical language and user-facing behavior.

**24. [Slot 8] Registry adoption adds hidden coupling**

> The proposed “adopt as product” / product_registry-based path in J2 risks adding manual classification just to make URL improvement possible. That injects operator judgment and schema coupling into what should be a direct URL-in/URL-out flow, increasing the chance of misregistration, stale registry state, and ambiguous provenance for outputs. It also creates a new failure mode where the system can appear to support arbitrary URLs only after a non-obvious manual step.

**25. [Slot 9] PATH B contradicts CA-18 §1**

> The current UI implementation (PATH B) does not produce a new deployable URL, violating the canonical promise of 'any URL in -> new deployable URL out'.

**26. [Slot 9] Lack of self-improvement capability**

> FlowAI cannot improve its own UI through its own UI, contradicting CA-18 §5 which states that FlowAI applies to its own development process.

**27. [Slot 9] CLI workaround is not product-level proof**

> The current testing approach using CLI scripts invoked through Claude Code agents does not exercise the product surface, potentially invalidating the proof that FlowAI works as a product.

**28. [Slot 10] §1 output guarantee unmet by PATH B**

> CA-18 §1 explicitly requires 'ALWAYS a new, separate, deployable URL' for any input URL, yet PATH B (UI arbitrary-URL submission) only runs §10 Self-Audit and terminates without invoking the §29 Construction Engine or producing a new URL; the audit-only short-circuit directly violates the 'substantial transformation per run' metric.

**29. [Slot 10] §5 self-application lacks UI path**

> CA-18 §5 mandates FlowAI-on-FlowAI via the §29 Build/Wire engine and §11 Clearance Protocol, but the only working path (PATH A) requires Claude-Code CLI invocation outside the operator-facing UI at flowai-dun.vercel.app/flowai, collapsing the published 'self-application is canonical operating mode' claim.

**30. [Slot 10] 8-Step Pipeline omits UI wiring**

> The canonical 8-step pipeline (§9) places 'build' (step 3) and 'deploy' (step 5) after research/design, yet no mechanism connects the UI form input to product_registry registration or S1-S8 execution; the Self-Governance Layer (§10) components trigger only on existing registered products, leaving arbitrary-URL flows stranded at audit.


## Per-reviewer
### Slot 1 — openrouter:anthropic/claude-opus-4 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §5 self-application creates infinite regress**
  > CA-18 §5 mandates FlowAI applies to its own development, but if FlowAI must improve itself before being considered functional, and it needs to be functional to improve itself, the system enters an unresolvable bootstrap paradox. The spec provides no escape hatch or initial bootstrap mechanism.
- **Obj 2 — PATH B violates core §1 promise**
  > The proposal admits PATH B produces no new URL despite CA-18 §1 explicitly stating 'Output: ALWAYS a new, separate, deployable URL'. This isn't a minor gap - it's a fundamental violation of the core product definition that the UI actively advertises but cannot deliver.
- **Obj 3 — No rollback for self-improvement failures**
  > CA-18 §5 requires FlowAI to improve its own source tree via §29 Build/Wire Construction Engine, but neither §5 nor the proposal defines what happens when FlowAI damages itself during self-improvement. Unlike external products where both URLs are preserved, self-modification could brick the platform.
- **Obj 4 — Proof validation relies on deceptive evidence**
  > The proposal reveals PATH A testing uses 'Claude-Code-operated CLI scripts' - an external LLM agent manually operating FlowAI, not FlowAI operating itself. This fundamentally misrepresents the product's actual capabilities to stakeholders reviewing proof artifacts.

**Steelman:**
> The proposal should be rejected because it attempts to paper over a fundamental architectural flaw with process band-aids. FlowAI's UI cannot deliver its core §1 promise (URL in -> new URL out), and the proposed fixes either require massive architectural changes or perpetuate the current deception of using external LLM agents to simulate functionality. The platform should first be architected to actually work through its own UI before any self-improvement capabilities are considered.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > The specification is unambiguous - 'ALWAYS a new, separate, deployable URL' leaves no room for audit-only paths to claim compliance with §1.
- **J2** = `REJECT` — REJECT
  > All options assume the Construction Engine is production-ready for arbitrary URLs, but the proposal admits it only works via 'Claude-Code-operated CLI scripts' - none address the fundamental issue that the engine itself may not be ready for UI integration.
- **J3** = `J3-SELF-FIRST` — YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demons
  > If FlowAI cannot improve itself through its own UI, it has not proven it can improve anything - external tests would be meaningless theater when the core loop is broken.
- **J4** = `J4-INVALID-AND-MISLEADING` — Worse than invalid — actively misleading. Reporting "FlowAI improved product X" when the only invocation path was a Claude-Code-operated CLI
  > Using an external LLM to manually operate CLI scripts fundamentally misrepresents the product's capabilities - stakeholders believe FlowAI is self-operating when it's actually being puppeted by Claude.

### Slot 2 — openrouter:openai/gpt-4o — `SILENT`

_(degraded)_


### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Lack of UI**
  > The current implementation of FlowAI does not have a functional UI that can complete a full improvement cycle, which contradicts the promise made in CA-18 §1. The UI at `flowai-dun.vercel.app/flowai` only accepts URL input and runs a partial audit, but does not generate fixes or deploy a new URL.
- **Obj 2 — Insufficient Testing**
  > The current testing approach relies on CLI scripts invoked through Claude Code agents, which may not be representative of real-world usage and may not exercise the product surface as intended. This could lead to a false sense of security and mask potential issues with the product.
- **Obj 3 — Inconsistent Architecture**
  > The existence of two separate paths, PATH A and PATH B, may indicate an inconsistent architecture that could lead to maintenance and scalability issues. The lack of a unified canonical FlowAI Engine that can be invoked by any caller (UI, CLI, API, agent) may cause problems in the long run.

**Steelman:**
> The proposal should be rejected or deferred because it does not provide a clear plan for addressing the fundamental flaws in the current implementation of FlowAI. The lack of a functional UI and the inconsistent architecture may lead to significant problems down the line, and the current testing approach may not be sufficient to ensure the product works as intended. It is better to take the time to address these issues now rather than risking a failed product launch.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > PATH B as audit-only does not meet the promise made in CA-18 §1, and it is essential to fix this flaw to ensure the product works as intended.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This option seems to be the most straightforward way to address the issue, as it leverages existing architecture and removes the need for CLI workarounds.
- **J3** = `J3-SELF-FIRST` — YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demons
  > It is essential to ensure that FlowAI can improve itself before testing external products, as this demonstrates the product's ability to work as intended and builds trust in its capabilities.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The current testing approach does not provide valid evidence that the product works as intended, as it relies on CLI workarounds and does not exercise the product surface through the UI.

### Slot 4 — openrouter:mistralai/mistral-large-2411 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Incomplete UI Integration**
  > The proposal does not address the integration of the Construction Engine with the UI. §10 Self-Audit engine is functional, but there is no mechanism to trigger the Construction Engine from the UI, which is a critical gap.
- **Obj 2 — Lack of Operator Control**
  > The current design lacks operator control over the improvement cycle. Operators cannot initiate or control the construction process from the UI, which contradicts the user agency principle in CA-18 §1.
- **Obj 3 — Potential for Infinite Self-Loop**
  > The proposal suggests prioritizing FlowAI-on-FlowAI improvements, which could lead to an infinite self-loop. This focus may delay the platform's ability to improve external products, limiting its practical utility.

**Steelman:**
> The proposal should be rejected because it prioritizes self-improvement over external product improvement, which contradicts the platform's mission to democratize AI-powered product creation for a global audience. The current design also lacks critical UI integration and operator control, making it incomplete and impractical.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > The core promise of FlowAI is to produce a new, improved URL. An audit-only path does not fulfill this promise and should be considered a fundamental flaw.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This option leverages existing capabilities and integrates the Construction Engine with the UI, addressing the critical gap in the current design.
- **J3** = `J3-PARALLEL` — No — self-loop and external-loop should proceed in parallel. Self-loop matures the engine; external-loop matures the I/O surface (jurisdicti
  > Parallel development allows for a more balanced and comprehensive testing approach, ensuring that FlowAI is effective at improving both itself and external products.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The current testing approach does not validate the product's UI, which is a critical component of FlowAI's promise. Therefore, it invalidates the proof that FlowAI works as a product.

### Slot 5 — openrouter:amazon/nova-pro-v1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — PATH B audit-only**
  > PATH B currently only performs an audit and does not generate a new deployable URL, which contradicts CA-18 §1.
- **Obj 2 — No UI-driven construction**
  > There is no operator-reachable path through the UI to complete a full improvement cycle as required by CA-18 §1.
- **Obj 3 — Self-application gap**
  > FlowAI's self-application to its own development process (CA-18 §5) is not fully realized through the UI, creating a gap in the symbiotic relationship.

**Steelman:**
> Rejecting the proposal allows for a thorough re-evaluation of the architecture to ensure it aligns with the canonical promise of CA-18 §1, preventing future misalignments and user disappointment.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > PATH B must be fixed to align with the canonical promise.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This option leverages existing architecture to fulfill the canonical promise without introducing new complexity.
- **J3** = `J3-SELF-FIRST` — YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demons
  > Ensuring FlowAI can improve itself through its UI is a critical proof of concept before external testing.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The current testing approach does not validate the product as a whole, only the engine.

### Slot 6 — openrouter:google/gemini-2.0-flash-001 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Conflicting definitions of 'product'**
  > The document uses 'product' to refer to both FlowAI itself and the external URLs it processes. This ambiguity, especially in J4, makes it difficult to assess whether the 'product' is being adequately tested.
- **Obj 2 — Unclear 'substantial transformation' metric**
  > CA-18 §1 emphasizes 'substantial transformation' as a quality guarantee, but the definition of 'substantial' is subjective and lacks concrete metrics. This makes it difficult to objectively determine whether FlowAI is meeting its promise, especially in self-testing scenarios.
- **Obj 3 — Risk of over-optimization on self-loop**
  > Focusing solely on FlowAI-on-FlowAI (J3) could lead to over-optimization for a narrow use case, potentially neglecting the broader range of inputs and edge cases encountered with external products. This could result in a system that performs well on itself but poorly on real-world applications.
- **Obj 4 — Lack of rollback strategy for UI wiring**
  > Wiring the UI directly to the Construction Engine (J2) without a clear rollback strategy poses a risk. If the integration introduces bugs or instability, it could disrupt the entire FlowAI workflow, including the CLI-based construction path.

**Steelman:**
> The proposal should be rejected because it attempts to address a conformance gap without a clear understanding of the underlying architectural implications. Rushing to wire the UI to the construction engine without a robust testing and rollback strategy could introduce instability and undermine the overall reliability of the FlowAI platform. A more thorough analysis of the architectural dependencies and potential risks is needed before proceeding with any implementation.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > The core promise of FlowAI is to produce a new, deployable URL. An audit-only path fundamentally violates this promise and should be addressed.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This option leverages existing architecture and directly addresses the gap by enabling the UI to trigger the full construction pipeline. It's the most direct path to fulfilling CA-18 §1.
- **J3** = `J3-MILESTONE-GATED` — Self-first ONLY through a defined milestone (e.g. one full improvement cycle completed against flowai-dun.vercel.app/flowai with measurable 
  > Prioritizing self-improvement up to a defined milestone ensures that the core functionality is working before expanding to external products, while also preventing the risk of getting stuck in an endless self-optimization loop.
- **J4** = `J4-VALID-ENGINE-PROOF` — VALID as engine-level proof; INVALID as product-level proof. Distinguish the two: the CLI runs prove the §29 Construction Engine + §10 Self-
  > The CLI-based testing provides valuable evidence that the underlying engine is functional, but it does not validate the end-to-end user experience through the UI. Both types of proof are necessary for a complete assessment.

### Slot 7 — openrouter:deepseek/deepseek-r1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — PATH B violates §1 output requirement**
  > CA-18 §1 mandates 'Output: ALWAYS a new, separate, deployable URL' for any input. PATH B's audit-only output without a deployable URL fundamentally fails this core promise. The proposal acknowledges this gap but offers no interim mitigation.
- **Obj 2 — Self-application failure in §5**
  > The absence of UI-path self-improvement violates CA-18 §5's requirement that FlowAI applies to its own development. PATH A's CLI dependency creates a special-case exemption where FlowAI-on-FlowAI requires non-canonical operator intervention, undermining the symbiotic principle.
- **Obj 3 — Proof validity misrepresentation risk**
  > Reporting external product improvements via PATH A while the UI remains broken creates false product readiness signals. This risks stakeholder deception by demonstrating capabilities through non-product-surface mechanisms (Claude Code CLI), contravening honest assessment obligations in §1.
- **Obj 4 — Architectural fragmentation**
  > Maintaining separate PATH A (construction) and PATH B (audit) engines violates §5's symbiotic principle by preventing knowledge transfer between internal and external improvement cycles. Findings from PATH B audits don't feed into PATH A's construction logic, creating disjointed learning loops.

**Steelman:**
> This proposal should be rejected because it documents but does not resolve fundamental contradictions between canonical requirements and implementation. Deploying audit-only PATH B while §1 mandates URL-out functionality creates legal liability for false advertising. Prioritizing external product tests via CLI workarounds before closing the self-loop per §5 risks cementing architectural debt that may require costly rewrites later.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > CA-18 §1 explicitly requires new URL output for any input; audit-only PATH B violates this core definition and cannot coexist with the promise without misleading users.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This directly satisfies §1 with minimal change by repurposing proven components, avoiding new registries or workflow interruptions while maintaining architectural coherence.
- **J3** = `J3-MILESTONE-GATED` — Self-first ONLY through a defined milestone (e.g. one full improvement cycle completed against flowai-dun.vercel.app/flowai with measurable 
  > Balances §5's canonical imperative with delivery pragmatism by setting a concrete self-improvement gate before external validation, preventing infinite self-iteration traps.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The CLI path demonstrates technical components but fails to validate the integrated product experience promised in §1, creating misleading evidence of completeness.

### Slot 8 — openrouter:perplexity/sonar — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Audit-only breaks §1 promise**
  > In PATH B, the UI accepts a URL but terminates at findings instead of producing a new deployable URL. That directly conflicts with CA-18 §1’s explicit “Output: ALWAYS a new, separate, deployable URL,” so the UI is not implementing the advertised product promise. The proposal treats this as a gap, but it may actually be a separate product class (audit) mislabeled as improvement.
- **Obj 2 — Self-loop not proven in UI**
  > CA-18 §5 says FlowAI applies to its own development process, including its own UI and source tree. The proposal admits the current self-improvement path is CLI-only via Claude Code, which means the canonical self-application is not reachable through the product surface. That makes the self-reference claim operationally unverified and creates a mismatch between canonical language and user-facing behavior.
- **Obj 3 — Registry adoption adds hidden coupling**
  > The proposed “adopt as product” / product_registry-based path in J2 risks adding manual classification just to make URL improvement possible. That injects operator judgment and schema coupling into what should be a direct URL-in/URL-out flow, increasing the chance of misregistration, stale registry state, and ambiguous provenance for outputs. It also creates a new failure mode where the system can appear to support arbitrary URLs only after a non-obvious manual step.

**Steelman:**
> The strongest case for rejecting or deferring is that the proposal seems to conflate a backend capability with a product capability. Until the UI itself can complete URL-in to new-URL-out, any claim of “FlowAI works” is at best incomplete and at worst misleading. Deferring would preserve honesty, avoid overpromising, and force the team to unify the experience before expanding scope.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > This is the clearest reading of the canonical promise: URL in must yield a new deployable URL out. An audit-only surface cannot satisfy that requirement and therefore cannot stand as a compliant FlowAI path.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This is the minimum change that directly closes the gap described in the proposal without inventing a new product model. It preserves the existing engine while making the UI actually satisfy the canonical flow.
- **J3** = `J3-MILESTONE-GATED` — Self-first ONLY through a defined milestone (e.g. one full improvement cycle completed against flowai-dun.vercel.app/flowai with measurable 
  > This best balances the canonical self-application requirement with a practical milestone to prevent endless self-referential work. It establishes a concrete proof gate before external expansion.
- **J4** = `J4-INVALID-AND-MISLEADING` — Worse than invalid — actively misleading. Reporting "FlowAI improved product X" when the only invocation path was a Claude-Code-operated CLI
  > This goes beyond merely distinguishing engine vs product; it flags the communication risk created by the current evidence. If the UI path fails, presenting CLI runs as product proof is misleading unless carefully labeled.

### Slot 9 — openrouter:meta-llama/llama-4-maverick — `TANGENTIAL`

**Adversarial pass:**

- **Obj 1 — PATH B contradicts CA-18 §1**
  > The current UI implementation (PATH B) does not produce a new deployable URL, violating the canonical promise of 'any URL in -> new deployable URL out'.
- **Obj 2 — Lack of self-improvement capability**
  > FlowAI cannot improve its own UI through its own UI, contradicting CA-18 §5 which states that FlowAI applies to its own development process.
- **Obj 3 — CLI workaround is not product-level proof**
  > The current testing approach using CLI scripts invoked through Claude Code agents does not exercise the product surface, potentially invalidating the proof that FlowAI works as a product.

**Steelman:**
> Rejecting the proposal is justified because the current implementation does not satisfy the canonical promises made in CA-18 §1 and §5, and the testing approach does not adequately prove the product's functionality through its intended user interface.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > PATH B's audit-only functionality does not align with the canonical definition of FlowAI.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > This option directly addresses the gap between PATH A and PATH B by utilizing existing architecture.
- **J3** = `UNMATCHED` — YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demonstrated in the §1 promise; testing external products before the self-test is theatre. Lock external proof until self-loop closes.
  > CA-18 §5 requires FlowAI to apply to its own development process, making self-improvement a prerequisite for external testing.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The product surface is critical to proving FlowAI's functionality as per CA-18 §1.

### Slot 10 — openrouter:x-ai/grok-4.3 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §1 output guarantee unmet by PATH B**
  > CA-18 §1 explicitly requires 'ALWAYS a new, separate, deployable URL' for any input URL, yet PATH B (UI arbitrary-URL submission) only runs §10 Self-Audit and terminates without invoking the §29 Construction Engine or producing a new URL; the audit-only short-circuit directly violates the 'substantial transformation per run' metric.
- **Obj 2 — §5 self-application lacks UI path**
  > CA-18 §5 mandates FlowAI-on-FlowAI via the §29 Build/Wire engine and §11 Clearance Protocol, but the only working path (PATH A) requires Claude-Code CLI invocation outside the operator-facing UI at flowai-dun.vercel.app/flowai, collapsing the published 'self-application is canonical operating mode' claim.
- **Obj 3 — 8-Step Pipeline omits UI wiring**
  > The canonical 8-step pipeline (§9) places 'build' (step 3) and 'deploy' (step 5) after research/design, yet no mechanism connects the UI form input to product_registry registration or S1-S8 execution; the Self-Governance Layer (§10) components trigger only on existing registered products, leaving arbitrary-URL flows stranded at audit.

**Steelman:**
> The proposal treats ratified canonical text (CA-18 §1 and §5) as immediately binding on the live UI surface, yet the documented gap shows the product cannot yet deliver its own stated promise; deferring until the Construction Engine is wired to the UI would avoid shipping a system whose core guarantee is known to be broken and whose self-application claim rests on non-UI workarounds.

**Votes:**

- **J1** = `J1-FLAW` — Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces
  > PATH B directly violates the explicit output requirement in the canonical §1 text.
- **J2** = `J2-UI-CONSTRUCT` — Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 
  > Reuses the proven §29 engine without introducing new registry or clearance layers.
- **J3** = `J3-SELF-FIRST` — YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demons
  > Honors the symbiotic meta-principle without allowing external testing to mask the UI gap.
- **J4** = `J4-INVALIDATES` — INVALIDATES the proof. FlowAI's product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code 
  > The product claim is defined by the UI surface, not the underlying engine.