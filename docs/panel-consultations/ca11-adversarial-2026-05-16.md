# Panel Consultation — CA-11 ADVERSARIAL (de-anchored, dissent-floor enforced) — 2026-05-16

**Mode:** ADVERSARIAL — anti-rubber-stamp controls active. Options shown without "(as drafted)" tags; options shuffled deterministically (seed `ca11-adversarial-2026-05-16`); reviewers MUST produce ≥3 concrete objections + 1 worse-than-status-quo scenario + 1 real-world precedent + a rejection steelman BEFORE any vote is counted; dissent floor of <5 distinct objections + > 80 % drafted-direction alignment triggers `INVALID — re-run required`.

**Lineage:** W05 dispatch → W6 execution. Review of W3 draft `docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md` (commit `1a020f7`). Canonical anchor: Rev-2.1 `docs/CANONICAL_REFERENCE.md` (`9495b26`).

**Bundle:** 146754 chars (full CANONICAL_REFERENCE + CA-11 draft).
**Started:** 2026-05-16T04:41:54.308Z
**Finished:** 2026-05-16T04:44:43.388Z
**Panel audit:** {"providerCounts":{"openai":1,"anthropic":1,"google":1,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"meta-llama":1,"x-ai":1},"maxPerProvider":1,"slots":10} — strict 10-unique-provider roster.

---

## DISSENT-FLOOR EVALUATION (Control 4)

Drafted-direction alignment across Q1+Q2+Q3+Q4+Q6 (Q5 excluded — no drafted answer):
  Aligned: **12 of 40** ENGAGED votes  (30.0 %)
Distinct substantive objections across all reviewers: **22**
Trigger condition: alignment > 80 % AND distinct objections < 5.

**✅ RESULT: Adversarial signal passes dissent floor.** alignment 30.0 %, distinct objections 22.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup? | Status | State | Invalid reason |
|------|----------|-------|-------------|---------|--------|-------|----------------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | YES → openrouter:anthropic/claude-opus-4 | LIVE-OK | `ENGAGED` | — |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | — | LIVE-OK | `ENGAGED` | — |
| 3 | openrouter | `google/gemini-2.5-pro` | US · frontier multimodal | — | LIVE-OK | `ENGAGED` | — |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | — | LIVE-OK | `ENGAGED` | — |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | — | LIVE-OK | `SILENT` | — |
| 6 | openrouter | `minimax/minimax-m2.7` | Asia · Asia generalist | — | DEGRADED | `SILENT` | — |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | — | LIVE-OK | `ENGAGED` | — |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | — | LIVE-OK | `ENGAGED` | — |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | — | LIVE-OK | `ENGAGED` | — |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | — | LIVE-OK | `ENGAGED` | — |

LIVE-OK: 9/10. Backups applied: 1. Quorum met (≥7 LIVE-OK): true.

Adversarial-protocol classification:
  **ENGAGED** (adversarial pass complete + steelman + all 6 votes parsed): 8 / 10
  TANGENTIAL: 0
  INVALID (controls failed — votes DISCARDED): 0
  SILENT: 2

---

## Per-question tally (ENGAGED only, controls 1+2+3 enforced)

| Q | Topic | Top option | Top count | Verdict |
|---|---|---|---:|---|
| **Q1** | Minimum ToolMenu size per agent | 3 tools | 3 / 8 | `SPLIT` |
| **Q2** | When is the tool chosen | Once per step, ranked upfront | 4 / 8 | `PLURALITY_Q2-UPFRONT` |
| **Q3** | Does per-agent self-orchestration add more risk th | Net negative, centralized is safer | 4 / 8 | `SPLIT` |
| **Q4** | Tool list maintenance model | Auto-updated quarterly by agents | 5 / 8 | `PLURALITY_Q4-AUTO` |
| **Q5** | Biggest unmitigated risk in CA-11 | Per-agent scoring data sparsity | 6 / 8 | `PLURALITY_Q5-SPARSE` |
| **Q6** | Disposition | Defer pending a prototype/spike | 5 / 8 | `PLURALITY_Q6-DEFER` |

### Per-question detail

### Q1 — Minimum ToolMenu size per agent

Tally (ENGAGED-only, 8 reviewers):
  - "3 tools"  →  3
  - "5 tools"  →  2
  - "Variable by agent mode"  →  3
  - "No minimum (let it emerge)"  →  0

**Verdict:** `SPLIT` — top tie at 3 between Q1-3 / Q1-VAR.

### Q2 — When is the tool chosen

Tally (ENGAGED-only, 8 reviewers):
  - "Once per step, ranked upfront"  →  4
  - "Adaptively at each invocation"  →  1
  - "Hybrid"  →  3
  - "Tool choice should not be dynamic at all"  →  0

**Verdict:** `PLURALITY_Q2-UPFRONT` — 4 of 8 on Q2-UPFRONT (below 7/10 quorum).

### Q3 — Does per-agent self-orchestration add more risk than value vs central OrchestratorHub routing

Tally (ENGAGED-only, 8 reviewers):
  - "Net positive, ship it"  →  0
  - "Net negative, centralized is safer"  →  4
  - "Depends on guardrails not yet specified"  →  4
  - "Cannot determine from spec"  →  0

**Verdict:** `SPLIT` — top tie at 4 between Q3-NEG / Q3-GUARDS.

### Q4 — Tool list maintenance model

Tally (ENGAGED-only, 8 reviewers):
  - "Auto-updated quarterly by agents"  →  5
  - "Frozen, manual changes only"  →  1
  - "Panel-reviewed every change"  →  2
  - "Tool list should not be canonical at all"  →  0

**Verdict:** `PLURALITY_Q4-AUTO` — 5 of 8 on Q4-AUTO (below 7/10 quorum).

### Q5 — Biggest unmitigated risk in CA-11

Tally (ENGAGED-only, 8 reviewers):
  - "Cost blowout from fallback chains"  →  1
  - "Non-determinism / unreproducible runs"  →  1
  - "Per-agent scoring data sparsity"  →  6
  - "Complexity exceeding maintenance capacity"  →  0

**Verdict:** `PLURALITY_Q5-SPARSE` — 6 of 8 on Q5-SPARSE (below 7/10 quorum).

### Q6 — Disposition

Tally (ENGAGED-only, 8 reviewers):
  - "Promote all 5 sub-amendments"  →  0
  - "Promote a reduced subset"  →  2
  - "Defer pending a prototype/spike"  →  5
  - "Reject — concept is unsound as specified"  →  1

**Verdict:** `PLURALITY_Q6-DEFER` — 5 of 8 on Q6-DEFER (below 7/10 quorum).


---

## All distinct substantive objections (verbatim, deduplicated, contributing-slot tagged)

Total distinct: **22**

**01. [Slot 1] Fallback chain thundering herd**

> CA-11-A.4 caps fallback at 3 hops but with 26 agents × avg 5 tools × parallel runs, a widespread outage of a primary tool like anthropic-api could trigger 100+ simultaneous fallback attempts to secondary tools, overwhelming them and cascading failures.

**02. [Slot 1] Per-agent scoring data sparsity**

> CA-11-D.3 tracks scores per (agent, adapter, capability) triple, but many agent-tool combinations will see <10 invocations/month, making the 0.6×performance weight in Locked Rule 18 statistically meaningless and causing erratic tool selection behavior.

**03. [Slot 1] CEO constraint explosion complexity**

> CA-11-E allows per-product per-agent constraints with both allowedTools and blockedTools arrays, creating 2^n possible constraint states that can silently conflict across products, making debugging tool selection failures a combinatorial nightmare.

**04. [Slot 3] Per-Agent Scoring Creates Data Sparsity**

> CA-11-D.3's proposal to track performance scores per (agent, adapter, capability) triple will lead to extreme data sparsity. An agent may only invoke a specific tool for a niche capability a few times, making the resulting performance score statistically volatile and unreliable for ranking, potentially causing unstable and suboptimal tool selection.

**05. [Slot 3] Fallback Chains Obscure True Invocation Cost**

> The fallback mechanism in CA-11-A.4, while capped at 3 hops, can lead to significant cost blowouts. If an agent's top-ranked tool is cheap but flaky, it may frequently fall back to a more expensive second- or third-choice tool, rapidly consuming the product's per-run budget (§7.6) on a single step without a clear per-invocation cost governor.

**06. [Slot 3] ToolMenus Introduce Significant "Spec Debt"**

> CA-11-B introduces numerous new, unwired Orchestra adapters (Sentry, Datadog, Netlify, etc.) across the 26 ToolMenus. This creates significant 'spec debt' by canonizing aspirational tools, misrepresenting the system's current capabilities, and bloating the agent charters with placeholders that have no clear implementation path or capacity estimate, contrary to the already-deferred adapters in §8.1.

**07. [Slot 4] Unclear Tool Selection Timing**

> CA-11-A.3 does not specify the exact timing of tool selection within the agent's lifecycle. It is unclear whether the tool is selected at the beginning of the step or dynamically during the execution. This ambiguity could lead to inconsistent behavior across different agents and steps.

**08. [Slot 4] Potential Cost Overruns**

> The fallback mechanism in CA-11-A.4 could lead to significant cost overruns if the primary tool fails and the fallback tools are more expensive. There is no specified budget or cost control mechanism to prevent this.

**09. [Slot 4] Lack of Detail on CEO Constraints**

> CA-11-E introduces CEO constraints but does not provide detailed scenarios or examples of how these constraints might be applied and resolved in practice. This lack of detail could lead to misunderstandings and misapplications of the constraints.

**10. [Slot 7] Fallback chain fragility**

> CA-11-A.4 caps fallback at 3 hops without considering cumulative error propagation. In complex agents like #21 (Aggressive Crawl), consecutive retryable errors across tools could exhaust fallbacks mid-crawl, truncating critical interactions like modal probing or AI-agent validation. Unlike current OrchestratorHub's global error budget, per-agent chains lack cross-step resilience.

**11. [Slot 7] Per-agent score sparsity**

> CA-11-D.3's per-agent performance scoring will suffer data sparsity for dormant/niche agents (e.g., #20 Environmental Impacts). With infrequent invocations, ranking formulas will rely on stale/bootstrap data, causing tool misselection. Current global Orchestra scoring aggregates all invocations, providing statistically robust rankings.

**12. [Slot 7] Constraint-induced capability gaps**

> CA-11-E CEO constraints could create capability holes when allowedTools/blockedTools mismatch required contextTypes. If Agent #7 Design is blocked from v0/Lovable but Bolt.new lacks 'design' capability, the agent becomes non-functional. Current routing lacks such product-specific veto points.

**13. [Slot 7] ToolMenu validator rigidity**

> CA-11-C.2's ≥3-tool minimum forces artificial entries for niche agents like #16 Productivity. This violates 'best-in-industry' principle by including subpar tools (e.g., PostHog for HR signals) solely to satisfy validator, degrading output quality versus today's capability-driven routing.

**14. [Slot 8] Constraint layer can dead-end**

> CA-11-E.4 allows `allowedTools` and `blockedTools` to combine into an empty candidate set, and CA-11-A.3 then throws `RegistryError`. That means a stale ProductRegistry edit can hard-fail an agent before any fallback, even when the underlying global Orchestra still has viable adapters.

**15. [Slot 8] Per-agent scores will starve**

> CA-11-D.3 introduces rolling outcome scores per `(agent, adapter, capability)` triple, but most agents only have a handful of invocations today. For dormant or low-frequency agents like #16 or #20, the ranking will be driven by sparse bootstraps and noisy first impressions, making the ToolMenu look precise while actually being underfit.

**16. [Slot 8] Selection path increases nondeterminism**

> CA-11-A.4 combines per-invocation re-ranking, dynamic fallback, and mode-dependent user choice. Even with a 3-hop cap, the same agent/action can traverse different tools across retries due to latency and retryable errors, which weakens reproducibility relative to the current centralized OrchestratorHub routing.

**17. [Slot 9] Insufficient fallback handling**

> CA-11-A.4's fallback chain is capped at min(toolMenu.length, 3), which may not be sufficient for agents with fewer than 3 tools. This could lead to premature exhaustion and failure.

**18. [Slot 9] Lack of real-time adaptivity**

> CA-11-A.3's selectTool() method does not re-rank tools during fallback, potentially leading to suboptimal tool selection if the initial ranking is inaccurate or if runtime conditions change.

**19. [Slot 9] Overly rigid ToolMenu structure**

> CA-11-B's flat ToolMenu for cross-step agents may not be suitable for all use cases, as different steps may require different tools. A stepKey-conditional ToolMenu could provide more flexibility.

**20. [Slot 10] CA-11-A.4 fallback cap**

> The min(toolMenu.length, 3) cap in dispatchWithFallback still permits thundering-herd rate-limit cascades when three high-cost adapters (e.g. claude-code + openai-codex + devin) share the same upstream provider; no global back-pressure exists unlike the current OrchestratorHub.

**21. [Slot 10] CA-11-B.10 TBD placeholders**

> Agents #22–#25 are listed with literal 'TBD' ToolMenus yet CA-11-C.2 validator will reject any roster entry having fewer than three concrete entries at promotion time, creating an immediate schema violation on first load.

**22. [Slot 10] CA-11-D.3 score table bypass**

> The new flowai_agent_tool_outcome table writes per-(agent,adapter) scores without the prevHash / hash_chain_pointer discipline required by §14.2 GovernanceAuditLog, breaking the tamper-evidence invariant for all future tool-selection decisions.


---

## Strongest single argument AGAINST CA-11 (longest rejection steelman)

**From Slot 3 (openrouter:google/gemini-2.5-pro):**

> CA-11 introduces a significant layer of complexity and non-determinism into a system where 20 of 26 agents are still dormant and core stability is paramount. The current centralized routing is simple, predictable, and auditable. Deferring this proposal would allow engineering to focus on the higher-priority work of graduating dormant agents and hardening production infrastructure, ensuring the system is stable before we optimize it with a feature that fundamentally increases its operational complexity and surface area for emergent failures.

---

## Per-reviewer adversarial pass + steelman + votes

## Slot 1 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Fallback chain thundering herd**

> CA-11-A.4 caps fallback at 3 hops but with 26 agents × avg 5 tools × parallel runs, a widespread outage of a primary tool like anthropic-api could trigger 100+ simultaneous fallback attempts to secondary tools, overwhelming them and cascading failures.

**Objection 2 — Per-agent scoring data sparsity**

> CA-11-D.3 tracks scores per (agent, adapter, capability) triple, but many agent-tool combinations will see <10 invocations/month, making the 0.6×performance weight in Locked Rule 18 statistically meaningless and causing erratic tool selection behavior.

**Objection 3 — CEO constraint explosion complexity**

> CA-11-E allows per-product per-agent constraints with both allowedTools and blockedTools arrays, creating 2^n possible constraint states that can silently conflict across products, making debugging tool selection failures a combinatorial nightmare.

**Worse-than-status-quo scenario:** Today's centralized OrchestratorHub routing has a single point of control for tool selection logic; CA-11 distributes this across 26 agents with independent ToolMenus, making it impossible to enforce system-wide policies like 'never use AWS-based tools for EU customers' without touching all 26 agent definitions.

**Precedent:** Kubernetes' early scheduler design allowed each pod to specify its own node affinity rules, leading to the 'scheduler hot loops' problem where conflicting constraints caused pods to be repeatedly scheduled and evicted, consuming massive cluster resources until they added centralized admission control.

### Rejection steelman

> CA-11 introduces 26 independent tool selection engines (one per agent) with sparse performance data, creating non-deterministic behavior that will make production issues unreproducible. The complexity of debugging why Agent #17 picked tool X instead of Y for tenant Z requires correlating per-agent scores, CEO constraints, and fallback chains across multiple tables, making the system unmaintainable for the engineering team size implied by the 13 W-day estimate.

### Votes

- **Q1** = `Q1-5` ("5 tools")
  > With fallback chains capped at 3 hops, having 5 tools provides redundancy without encouraging lazy 'kitchen sink' tool lists that increase complexity.
- **Q2** = `Q2-UPFRONT` ("Once per step, ranked upfront")
  > Adaptive re-ranking during fallback would make debugging non-deterministic failures nearly impossible, violating the principle of reproducible runs.
- **Q3** = `Q3-NEG` ("Net negative, centralized is safer")
  > The distributed tool selection across 26 agents creates 26 potential failure points versus one, and the sparse scoring data will produce erratic behavior.
- **Q4** = `Q4-PANEL` ("Panel-reviewed every change")
  > Given the security implications of auto-admitting new tools to agent ToolMenus, human review is essential to prevent supply chain attacks.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > With 26 agents × ~5 tools × multiple capabilities, most combinations will have insufficient invocation history to produce statistically valid performance scores.
- **Q6** = `Q6-DEFER` ("Defer pending a prototype/spike")
  > The 13 W-day estimate vastly underestimates the complexity of making 26 independent tool selection engines work reliably; a spike would reveal the true scope.

Overall: CA-11's distributed tool selection model fundamentally conflicts with FlowAI's need for deterministic, auditable behavior in production systems serving multiple tenants.

---

## Slot 2 — openrouter:anthropic/claude-opus-4 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Fallback chain thundering herd**

> CA-11-A.4 caps fallback at 3 hops but with 26 agents × avg 5 tools × parallel runs, a widespread outage of a primary tool like anthropic-api could trigger 100+ simultaneous fallback attempts to secondary tools, overwhelming them and cascading failures.

**Objection 2 — Per-agent scoring data sparsity**

> CA-11-D.3 tracks scores per (agent, adapter, capability) triple, but many agent-tool combinations will see <10 invocations/month, making the 0.6×performance weight in Locked Rule 18 statistically meaningless and causing erratic tool selection behavior.

**Objection 3 — CEO constraint explosion complexity**

> CA-11-E allows per-product per-agent constraints with both allowedTools and blockedTools arrays, creating 2^n possible constraint states that can silently conflict across the 26 agents, making debugging tool selection failures a combinatorial nightmare.

**Worse-than-status-quo scenario:** Today's centralized OrchestratorHub routing has a single point of control for tool selection; CA-11 distributes this across 26 independent ToolMenus that can drift out of sync, creating scenarios where Agent #3 and Agent #21 select different tools for the same 'crawl' action, producing inconsistent results.

**Precedent:** Kubernetes' early scheduler design allowed each pod to specify its own node affinity rules, leading to the 'scheduler hot loops' problem where conflicting constraints caused pods to be repeatedly scheduled and evicted, consuming massive cluster resources until they added the PodDisruptionBudget controller.

### Rejection steelman

> CA-11 introduces 26 independent tool selection paths with sparse performance data, creating non-deterministic behavior that will make FlowAI runs unreproducible. The complexity of debugging why Agent #17 selected tool X instead of Y when constrained by product-specific overrides across a 3-hop fallback chain exceeds the maintenance capacity of the current team structure, and the distributed nature prevents the centralized monitoring and circuit-breaking that OrchestratorHub currently provides.

### Votes

- **Q1** = `Q1-5` ("5 tools")
  > With fallback chains capped at 3 hops, having 5 tools ensures redundancy even after constraints eliminate some options, while 3 tools is too close to the fallback limit.
- **Q2** = `Q2-HYBRID` ("Hybrid")
  > Pre-step ranking provides determinism but re-ranking on observed failures prevents repeatedly hitting a degraded service during the same run.
- **Q3** = `Q3-NEG` ("Net negative, centralized is safer")
  > The distributed tool selection creates 26 independent failure modes and prevents centralized circuit-breaking when a tool provider has an outage.
- **Q4** = `Q4-AUTO` ("Auto-updated quarterly by agents")
  > Manual updates can't keep pace with the tool landscape, but Panel review of every change would create bottlenecks; quarterly automation with audit trails balances these concerns.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > Many agent-tool pairs will see <10 invocations/month, making the performance score statistically meaningless and causing erratic selection behavior that compounds over time.
- **Q6** = `Q6-DEFER` ("Defer pending a prototype/spike")
  > The interaction between 26 ToolMenus, CEO constraints, fallback chains, and sparse scoring data needs empirical validation before committing to this architecture.

Overall: CA-11's distributed tool selection model has merit but needs stronger guardrails around data sparsity and constraint complexity before promotion.

---

## Slot 3 — openrouter:google/gemini-2.5-pro — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Per-Agent Scoring Creates Data Sparsity**

> CA-11-D.3's proposal to track performance scores per (agent, adapter, capability) triple will lead to extreme data sparsity. An agent may only invoke a specific tool for a niche capability a few times, making the resulting performance score statistically volatile and unreliable for ranking, potentially causing unstable and suboptimal tool selection.

**Objection 2 — Fallback Chains Obscure True Invocation Cost**

> The fallback mechanism in CA-11-A.4, while capped at 3 hops, can lead to significant cost blowouts. If an agent's top-ranked tool is cheap but flaky, it may frequently fall back to a more expensive second- or third-choice tool, rapidly consuming the product's per-run budget (§7.6) on a single step without a clear per-invocation cost governor.

**Objection 3 — ToolMenus Introduce Significant "Spec Debt"**

> CA-11-B introduces numerous new, unwired Orchestra adapters (Sentry, Datadog, Netlify, etc.) across the 26 ToolMenus. This creates significant 'spec debt' by canonizing aspirational tools, misrepresenting the system's current capabilities, and bloating the agent charters with placeholders that have no clear implementation path or capacity estimate, contrary to the already-deferred adapters in §8.1.

**Worse-than-status-quo scenario:** A critical agent like Agent #3 (Self-Renewal) could, due to sparse and volatile per-agent scoring data, demote its reliable primary tool and switch to a less-tested or deferred tool for a critical `code-patch` operation. This introduces a subtle, hard-to-detect bug into a product, making the system less safe and predictable than the current stable, auditable, centralized routing from OrchestratorHub.

**Precedent:** The transition from monoliths to microservices architectures demonstrates this risk; the promise of local component autonomy often leads to a 'distributed monolith' with chaotic, emergent runtime dependencies. Systems like service meshes (e.g., Istio) were created specifically to rein in this complexity, proving that such decentralized orchestration requires a heavy, complex control plane to be viable, which CA-11 lacks.

### Rejection steelman

> CA-11 introduces a significant layer of complexity and non-determinism into a system where 20 of 26 agents are still dormant and core stability is paramount. The current centralized routing is simple, predictable, and auditable. Deferring this proposal would allow engineering to focus on the higher-priority work of graduating dormant agents and hardening production infrastructure, ensuring the system is stable before we optimize it with a feature that fundamentally increases its operational complexity and surface area for emergent failures.

### Votes

- **Q1** = `Q1-3` ("3 tools")
  > While the number is less important than the flawed scoring mechanism, 3 provides a minimal balance of redundancy and focus without exacerbating the data sparsity problem as much as a higher number would.
- **Q2** = `Q2-UPFRONT` ("Once per step, ranked upfront")
  > This approach is the most deterministic and auditable, mitigating some of the risks of non-reproducible runs. Real-time adaptive ranking would amplify the instability caused by sparse performance data.
- **Q3** = `Q3-NEG` ("Net negative, centralized is safer")
  > The proposal introduces multiple vectors for unpredictable, emergent behavior (volatile scoring, fallback cascades) that make the system less safe and auditable than the current predictable, centralized model.
- **Q4** = `Q4-AUTO` ("Auto-updated quarterly by agents")
  > This aligns with FlowAI's ethos of self-renewal and automation (e.g., Agent #26), but it carries the risk of introducing instability if the update process isn't rigorously monitored and gated.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > This is the most fundamental and unmitigated flaw in the proposed mechanism; many other risks, like non-determinism and poor tool selection, are direct consequences of building a ranking system on statistically insignificant data.
- **Q6** = `Q6-DEFER` ("Defer pending a prototype/spike")
  > The concept introduces significant architectural risk and complexity. A targeted prototype is necessary to empirically validate the scoring model's stability and the fallback chain's cost implications before committing the entire system to this change.

Overall: CA-11 is a major architectural shift that prioritizes local optimization at the cost of global stability and predictability. The core mechanism of per-agent scoring is fundamentally flawed due to data sparsity, and the proposal should be deferred until a prototype can prove its viability.

---

## Slot 4 — openrouter:mistralai/mistral-large-2411 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Unclear Tool Selection Timing**

> CA-11-A.3 does not specify the exact timing of tool selection within the agent's lifecycle. It is unclear whether the tool is selected at the beginning of the step or dynamically during the execution. This ambiguity could lead to inconsistent behavior across different agents and steps.

**Objection 2 — Potential Cost Overruns**

> The fallback mechanism in CA-11-A.4 could lead to significant cost overruns if the primary tool fails and the fallback tools are more expensive. There is no specified budget or cost control mechanism to prevent this.

**Objection 3 — Lack of Detail on CEO Constraints**

> CA-11-E introduces CEO constraints but does not provide detailed scenarios or examples of how these constraints might be applied and resolved in practice. This lack of detail could lead to misunderstandings and misapplications of the constraints.

**Worse-than-status-quo scenario:** In scenarios where the primary tool fails and the fallback tools are significantly more expensive, CA-11 could lead to uncontrolled cost overruns, making it worse than the current centralized OrchestratorHub routing which has predictable costs.

**Precedent:** no precedent known

### Rejection steelman

> CA-11 introduces significant complexity and potential cost risks without clear benefits over the current centralized routing. The lack of detailed scenarios for CEO constraints and the ambiguity in tool selection timing could lead to unintended consequences and inconsistent behavior.

### Votes

- **Q1** = `Q1-VAR` ("Variable by agent mode")
  > Different agents have different requirements and risks, so a variable minimum based on the agent's mode would be most appropriate.
- **Q2** = `Q2-HYBRID` ("Hybrid")
  > A hybrid approach allows for initial upfront ranking while still adapting to real-time failures, providing a balance between planning and flexibility.
- **Q3** = `Q3-GUARDS` ("Depends on guardrails not yet specified")
  > The risk and value depend heavily on the guardrails and controls put in place, which are not sufficiently detailed in the current spec.
- **Q4** = `Q4-AUTO` ("Auto-updated quarterly by agents")
  > Automatic updates ensure the tool list stays current with the industry landscape, reducing the manual overhead and potential for outdated information.
- **Q5** = `Q5-COST` ("Cost blowout from fallback chains")
  > The most significant unmitigated risk is the potential for cost overruns due to fallback chains, as there is no specified budget or cost control mechanism.
- **Q6** = `Q6-DEFER` ("Defer pending a prototype/spike")
  > The specification has several ambiguities and potential risks that need to be addressed before it can be safely promoted. A prototype or spike would help resolve these uncertainties.

---

## Slot 5 — openrouter:cohere/command-r-plus-08-2024 — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 6 — openrouter:minimax/minimax-m2.7 — state: `SILENT`

_(degraded / parse-failure)_

---

## Slot 7 — openrouter:deepseek/deepseek-r1 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Fallback chain fragility**

> CA-11-A.4 caps fallback at 3 hops without considering cumulative error propagation. In complex agents like #21 (Aggressive Crawl), consecutive retryable errors across tools could exhaust fallbacks mid-crawl, truncating critical interactions like modal probing or AI-agent validation. Unlike current OrchestratorHub's global error budget, per-agent chains lack cross-step resilience.

**Objection 2 — Per-agent score sparsity**

> CA-11-D.3's per-agent performance scoring will suffer data sparsity for dormant/niche agents (e.g., #20 Environmental Impacts). With infrequent invocations, ranking formulas will rely on stale/bootstrap data, causing tool misselection. Current global Orchestra scoring aggregates all invocations, providing statistically robust rankings.

**Objection 3 — Constraint-induced capability gaps**

> CA-11-E CEO constraints could create capability holes when allowedTools/blockedTools mismatch required contextTypes. If Agent #7 Design is blocked from v0/Lovable but Bolt.new lacks 'design' capability, the agent becomes non-functional. Current routing lacks such product-specific veto points.

**Objection 4 — ToolMenu validator rigidity**

> CA-11-C.2's ≥3-tool minimum forces artificial entries for niche agents like #16 Productivity. This violates 'best-in-industry' principle by including subpar tools (e.g., PostHog for HR signals) solely to satisfy validator, degrading output quality versus today's capability-driven routing.

**Worse-than-status-quo scenario:** In a multi-tenant environment, a CEO constraint blocking Claude Code for Agent #2 (Code Builder) on product A would force lower-ranked tools. When combined with a Playwright outage during Agent #21's crawl, the 3-hop fallback cap would fail the entire run. Currently, OrchestratorHub would reroute to Browserless + Anthropic globally, completing the crawl.

**Precedent:** Google's Borg cell isolation failures in 2015, where per-service scheduling constraints created resource deadlocks that global schedulers would have avoided, mirroring CA-11's risk of tool-selection silos causing systemic fragility.

### Rejection steelman

> CA-11's decentralization fragments FlowAI's core orchestration intelligence, introducing per-agent failure modes without proportional benefit. The current global Orchestra already supports agent-specific preferences via capability matrices. Adding 69 new audit topics and per-agent scoring would bloat the codebase for marginal gains, violating Locked Rule 3's governance simplicity. Defer until post-Layer 4 hardening.

### Votes

- **Q1** = `Q1-3` ("3 tools")
  > Balances redundancy with practicality; niche agents (e.g., #16) can include lower-ranked tools without mandating unrealistic breadth.
- **Q2** = `Q2-UPFRONT` ("Once per step, ranked upfront")
  > Adaptive re-ranking mid-step would introduce nondeterminism and break audit trails; pre-step selection aligns with FlowAI's step-boundary governance model.
- **Q3** = `Q3-GUARDS` ("Depends on guardrails not yet specified")
  > While conceptually aligned with autonomy goals, the spec lacks circuit-breakers for constraint-induced deadlocks and sparse-data fallbacks.
- **Q4** = `Q4-AUTO` ("Auto-updated quarterly by agents")
  > Aligns with Orchestra self-expansion mechanics (§8.1) and reduces Panel overhead, while quarterly cadence prevents drift.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > Agents with low invocation rates (e.g., #19 Technological Evolution) will produce unreliable rankings, leading to pathological tool selection that global scoring avoids.
- **Q6** = `Q6-REDUCED` ("Promote a reduced subset")
  > Core mechanism (CA-11-A/C) is viable, but tool lists (B) and CEO constraints (E) need more tenant-isolation safeguards before full promotion.

Overall: Objections center on fragmentation risks; if promoted, implement cross-agent fallback pools and sparse-data alarms.

---

## Slot 8 — openrouter:perplexity/sonar — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Constraint layer can dead-end**

> CA-11-E.4 allows `allowedTools` and `blockedTools` to combine into an empty candidate set, and CA-11-A.3 then throws `RegistryError`. That means a stale ProductRegistry edit can hard-fail an agent before any fallback, even when the underlying global Orchestra still has viable adapters.

**Objection 2 — Per-agent scores will starve**

> CA-11-D.3 introduces rolling outcome scores per `(agent, adapter, capability)` triple, but most agents only have a handful of invocations today. For dormant or low-frequency agents like #16 or #20, the ranking will be driven by sparse bootstraps and noisy first impressions, making the ToolMenu look precise while actually being underfit.

**Objection 3 — Selection path increases nondeterminism**

> CA-11-A.4 combines per-invocation re-ranking, dynamic fallback, and mode-dependent user choice. Even with a 3-hop cap, the same agent/action can traverse different tools across retries due to latency and retryable errors, which weakens reproducibility relative to the current centralized OrchestratorHub routing.

**Worse-than-status-quo scenario:** A bad CEO constraint or sparse per-agent score can cause a previously working agent run to fail early with `all_tools_exhausted` or an empty candidate set, while the current centralized OrchestratorHub would have simply routed to the best available global adapter. In that case CA-11 turns a recoverable run into a blocked run, reducing throughput and increasing operator intervention.

**Precedent:** Kubernetes admission controllers and policy engines like OPA/Gatekeeper have repeatedly shown that distributed policy plus per-workload constraints can create surprising dead-ends when policy is over-constrained; the system becomes harder to reason about than a centralized scheduler. Similar operational friction also appears in feature-flag platforms when layered allow/block rules conflict and silently exclude all variants.

### Rejection steelman

> The strongest case for rejecting or deferring CA-11 is that it formalizes a large, cross-cutting control plane before the empirical data exists to justify it. Centralized OrchestratorHub routing is simpler, more deterministic, and easier to debug; CA-11 adds schema bloat, per-agent score tables, and a new class of failure modes without proving that current global ranking is insufficient. A prudent panel could ask for a prototype on one or two agents first, then promote only the parts that show measurable reliability gains.

### Votes

- **Q1** = `Q1-3` ("3 tools")
  > This is the smallest threshold that still gives genuine fallback coverage while keeping the schema and validator burden manageable. It also matches the draft’s own minimum and avoids overfitting niche agents to arbitrary larger menus.
- **Q2** = `Q2-UPFRONT` ("Once per step, ranked upfront")
  > This best preserves auditability and makes fallback behavior explainable. Fully adaptive selection at each invocation would amplify non-determinism and complicate incident review.
- **Q3** = `Q3-GUARDS` ("Depends on guardrails not yet specified")
  > The spec adds useful flexibility, but the safety case depends on constraint precedence, rollback semantics, and how sparse per-agent scoring is handled. Without those guardrails, it is not safe to call the change net positive or net negative.
- **Q4** = `Q4-FROZEN` ("Frozen, manual changes only")
  > Canonical tool lists should not churn automatically because the ranking inputs are already dynamic. Freezing the lists reduces review overhead and prevents quarterly drift from becoming a hidden source of behavior changes.
- **Q5** = `Q5-NONDET` ("Non-determinism / unreproducible runs")
  > The fallback chain and per-agent re-ranking create the most immediate operational risk. Cost can be capped, and sparsity can be bootstrapped, but run-to-run variance will make debugging and audit trails materially harder.
- **Q6** = `Q6-DEFER` ("Defer pending a prototype/spike")
  > CA-11 is broad enough that a targeted prototype would expose whether per-agent ToolMenus genuinely improve outcomes over centralized routing. Deferral avoids locking in a complicated control plane before the maintenance and reproducibility costs are measured.

Overall: My vote is conservative because CA-11 introduces a second ranking plane plus policy overlays that can fail in ways the current system does not. The most defensible next step is a limited spike, not full canonical promotion.

---

## Slot 9 — openrouter:meta-llama/llama-4-maverick — state: `ENGAGED`

### Adversarial pass

**Objection 1 — Insufficient fallback handling**

> CA-11-A.4's fallback chain is capped at min(toolMenu.length, 3), which may not be sufficient for agents with fewer than 3 tools. This could lead to premature exhaustion and failure.

**Objection 2 — Lack of real-time adaptivity**

> CA-11-A.3's selectTool() method does not re-rank tools during fallback, potentially leading to suboptimal tool selection if the initial ranking is inaccurate or if runtime conditions change.

**Objection 3 — Overly rigid ToolMenu structure**

> CA-11-B's flat ToolMenu for cross-step agents may not be suitable for all use cases, as different steps may require different tools. A stepKey-conditional ToolMenu could provide more flexibility.

**Worse-than-status-quo scenario:** If CA-11's per-agent self-orchestration introduces significant complexity and the fallback chain is frequently exhausted, it could lead to more failures than the current centralized OrchestratorHub routing, making FlowAI worse than the status quo.

**Precedent:** The 'every-component-self-orchestrates' design in the Kubernetes project initially caused trouble due to increased complexity and debugging challenges, but was eventually stabilized with robust guardrails and testing.

### Rejection steelman

> CA-11 introduces significant complexity with per-agent self-orchestration and ToolMenus, which may exceed the current maintenance capacity of the FlowAI team. The added flexibility could lead to non-determinism and unreproducible runs if not properly guarded.

### Votes

- **Q1** = `Q1-VAR` ("Variable by agent mode")
  > Different agents have different requirements; always-on agents may need more tools for redundancy, while step-owner agents might be fine with fewer.
- **Q2** = `Q2-HYBRID` ("Hybrid")
  > A hybrid approach that ranks tools upfront but re-ranks remaining candidates on retryable failures could balance determinism with adaptivity.
- **Q3** = `Q3-GUARDS` ("Depends on guardrails not yet specified")
  > The value of per-agent self-orchestration depends on the effectiveness of guardrails such as testing, monitoring, and constraint mechanisms.
- **Q4** = `Q4-AUTO` ("Auto-updated quarterly by agents")
  > Automated quarterly updates by agents like #26, #11, and #15 could keep the tool lists current without overwhelming the Panel, while maintaining an audit trail.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > With many agents and tools, some agents may not have enough invocation data to accurately rank their tools, potentially leading to suboptimal choices.
- **Q6** = `Q6-REDUCED` ("Promote a reduced subset")
  > Promoting the core mechanism (CA-11-A, C, D) while deferring the tool lists (B) and CEO constraints (E) could allow for initial deployment and testing before fully committing to the new design.

Overall: CA-11 introduces a significant change to FlowAI's orchestration model, and while it offers potential benefits, it also carries substantial risks that need careful mitigation.

---

## Slot 10 — openrouter:x-ai/grok-4.3 — state: `ENGAGED`

### Adversarial pass

**Objection 1 — CA-11-A.4 fallback cap**

> The min(toolMenu.length, 3) cap in dispatchWithFallback still permits thundering-herd rate-limit cascades when three high-cost adapters (e.g. claude-code + openai-codex + devin) share the same upstream provider; no global back-pressure exists unlike the current OrchestratorHub.

**Objection 2 — CA-11-B.10 TBD placeholders**

> Agents #22–#25 are listed with literal 'TBD' ToolMenus yet CA-11-C.2 validator will reject any roster entry having fewer than three concrete entries at promotion time, creating an immediate schema violation on first load.

**Objection 3 — CA-11-D.3 score table bypass**

> The new flowai_agent_tool_outcome table writes per-(agent,adapter) scores without the prevHash / hash_chain_pointer discipline required by §14.2 GovernanceAuditLog, breaking the tamper-evidence invariant for all future tool-selection decisions.

**Worse-than-status-quo scenario:** A single mis-ranked adapter inside Agent #3's ToolMenu can silently lower Self-Renewal success rate across every product while the central OrchestratorHub's global visibility and single audit surface would have flagged the regression within one nightly cycle.

**Precedent:** The 2023 AutoGPT 'agent swarm' rollout where decentralized per-agent tool selection produced repeated 429 storms and untraceable cost overruns that only became visible after the central dispatcher was restored.

### Rejection steelman

> CA-11 fragments the single audited choke-point that OrchestratorHub currently provides into 26 independent ranking surfaces; the added per-agent state, new Supabase table, and dispatch wrapper increase both maintenance surface area and the blast radius of any single adapter compromise, while the claimed per-agent performance gains remain unproven in production. Deferring until a working spike demonstrates measurable improvement over the existing hub is the lower-risk path.

### Votes

- **Q1** = `Q1-VAR` ("Variable by agent mode")
  > A flat minimum of three ignores the documented reality that several cross-step agents still lack concrete ToolMenus.
- **Q2** = `Q2-ADAPTIVE` ("Adaptively at each invocation")
  > Static pre-step ranking cannot react to the per-run latency and cost signals that the fallback chain is explicitly intended to observe.
- **Q3** = `Q3-NEG` ("Net negative, centralized is safer")
  > The added per-agent surfaces remove the single point of global visibility and audit that the current OrchestratorHub supplies.
- **Q4** = `Q4-PANEL` ("Panel-reviewed every change")
  > Quarterly auto-updates would silently alter production behavior without the engagement filter required by Locked Rule 17.
- **Q5** = `Q5-SPARSE` ("Per-agent scoring data sparsity")
  > Most agents will have far fewer than 30 invocations per (agent,adapter,capability) triple, rendering the new per-agent rank scores statistically unreliable.
- **Q6** = `Q6-REJECT` ("Reject — concept is unsound as specified")
  > The design trades a single audited routing surface for 26 independent ones without demonstrated net reliability gains.

Overall: All objections are drawn directly from CA-11-A through CA-11-E sections; the rejection case prioritizes preservation of the existing central audit surface.


---

## Raw reviewer responses

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 63231 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      { "title": "Fallback chain thundering herd", "detail": "CA-11-A.4 caps fallback at 3 hops but with 26 agents × avg 5 tools × parallel runs, a widespread outage of a primary tool like anthropic-api could trigger 100+ simultaneous fallback attempts to secondary tools, overwhelming them and cascading failures." },
      { "title": "Per-agent scoring data sparsity", "detail": "CA-11-D.3 tracks scores per (agent, adapter, capability) triple, but many agent-tool combinations will see <10 invocations/month, making the 0.6×performance weight in Locked Rule 18 statistically meaningless and causing erratic tool selection behavior." },
      { "title": "CEO constraint explosion complexity", "detail": "CA-11-E allows per-product per-agent constraints with both allowedTools and blockedTools arrays, creating 2^n possible constraint states that can silently conflict across products, making debugging tool selection failures a combinatorial nightmare." }
    ],
    "worse_than_status_quo": "Today's centralized OrchestratorHub routing has a single point of control for tool selection logic; CA-11 distributes this across 26 agents with independent ToolMenus, making it impossible to enforce system-wide policies like 'never use AWS-based tools for EU customers' without touching all 26 agent definitions.",
    "precedent": "Kubernetes' early scheduler design allowed each pod to specify its own node affinity rules, leading to the 'scheduler hot loops' problem where conflicting constraints caused pods to be repeatedly scheduled and evicted, consuming massive cluster resources until they added centralized admission control."
  },
  "rejection_steelman": "CA-11 introduces 26 independent tool selection engines (one per agent) with sparse performance data, creating non-deterministic behavior that will make production issues unreproducible. The complexity of debugging why Agent #17 picked tool X instead of Y for tenant Z requires correlating per-agent scores, CEO constraints, and fallback chains across multiple tables, making the system unmaintainable for the engineering team size implied by the 13 W-day estimate.",
  "answers": {
    "Q1": { "pick_text": "5 tools", "rationale": "With fallback chains capped at 3 hops, having 5 tools provides redundancy without encouraging lazy 'kitchen sink' tool lists that increase complexity." },
    "Q2": { "pick_text": "Once per step, ranked upfront", "rationale": "Adaptive re-ranking during fallback would make debugging non-deterministic failures nearly impossible, violating the principle of reproducible runs." },
    "Q3": { "pick_text": "Net negative, centralized is safer", "rationale": "The distributed tool selection across 26 agents creates 26 potential failure points versus one, and the sparse scoring data will produce erratic behavior." },
    "Q4": { "pick_text": "Panel-reviewed every change", "rationale": "Given the security implications of auto-admitting new tools to agent ToolMenus, human review is essential to prevent supply chain attacks." },
    "Q5": { "pick_text": "Per-agent scoring data sparsity", "rationale": "With 26 agents × ~5 tools × multiple capabilities, most combinations will have insufficient invocation history to produce statistically valid performance scores." },
    "Q6": { "pick_text": "Defer pending a prototype/spike", "rationale": "The 13 W-day estimate vastly underestimates the complexity of making 26 independent tool selection engines work reliably; a spike would reveal the true scope." }
  },
  "overall_notes": "CA-11's distributed tool selection model fundamentally conflicts with FlowAI's need for deterministic, auditable behavior in production systems serving multiple tenants."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 67185 ms
- HTTP status: OK

```
{
  "reviewer_slot": 7,
  "adversarial_pass": {
    "objections": [
      { "title": "Fallback chain thundering herd", "detail": "CA-11-A.4 caps fallback at 3 hops but with 26 agents × avg 5 tools × parallel runs, a widespread outage of a primary tool like anthropic-api could trigger 100+ simultaneous fallback attempts to secondary tools, overwhelming them and cascading failures." },
      { "title": "Per-agent scoring data sparsity", "detail": "CA-11-D.3 tracks scores per (agent, adapter, capability) triple, but many agent-tool combinations will see <10 invocations/month, making the 0.6×performance weight in Locked Rule 18 statistically meaningless and causing erratic tool selection behavior." },
      { "title": "CEO constraint explosion complexity", "detail": "CA-11-E allows per-product per-agent constraints with both allowedTools and blockedTools arrays, creating 2^n possible constraint states that can silently conflict across the 26 agents, making debugging tool selection failures a combinatorial nightmare." }
    ],
    "worse_than_status_quo": "Today's centralized OrchestratorHub routing has a single point of control for tool selection; CA-11 distributes this across 26 independent ToolMenus that can drift out of sync, creating scenarios where Agent #3 and Agent #21 select different tools for the same 'crawl' action, producing inconsistent results.",
    "precedent": "Kubernetes' early scheduler design allowed each pod to specify its own node affinity rules, leading to the 'scheduler hot loops' problem where conflicting constraints caused pods to be repeatedly scheduled and evicted, consuming massive cluster resources until they added the PodDisruptionBudget controller."
  },
  "rejection_steelman": "CA-11 introduces 26 independent tool selection paths with sparse performance data, creating non-deterministic behavior that will make FlowAI runs unreproducible. The complexity of debugging why Agent #17 selected tool X instead of Y when constrained by product-specific overrides across a 3-hop fallback chain exceeds the maintenance capacity of the current team structure, and the distributed nature prevents the centralized monitoring and circuit-breaking that OrchestratorHub currently provides.",
  "answers": {
    "Q1": { "pick_text": "5 tools", "rationale": "With fallback chains capped at 3 hops, having 5 tools ensures redundancy even after constraints eliminate some options, while 3 tools is too close to the fallback limit." },
    "Q2": { "pick_text": "Hybrid", "rationale": "Pre-step ranking provides determinism but re-ranking on observed failures prevents repeatedly hitting a degraded service during the same run." },
    "Q3": { "pick_text": "Net negative, centralized is safer", "rationale": "The distributed tool selection creates 26 independent failure modes and prevents centralized circuit-breaking when a tool provider has an outage." },
    "Q4": { "pick_text": "Auto-updated quarterly by agents", "rationale": "Manual updates can't keep pace with the tool landscape, but Panel review of every change would create bottlenecks; quarterly automation with audit trails balances these concerns." },
    "Q5": { "pick_text": "Per-agent scoring data sparsity", "rationale": "Many agent-tool pairs will see <10 invocations/month, making the performance score statistically meaningless and causing erratic selection behavior that compounds over time." },
    "Q6": { "pick_text": "Defer pending a prototype/spike", "rationale": "The interaction between 26 ToolMenus, CEO constraints, fallback chains, and sparse scoring data needs empirical validation before committing to this architecture." }
  },
  "overall_notes": "CA-11's distributed tool selection model has merit but needs stronger guardrails around data sparsity and constraint complexity before promotion."
}
```

---

### Slot 3 — openrouter:google/gemini-2.5-pro

- Provider: `openrouter`
- Latency: 37519 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 4,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Per-Agent Scoring Creates Data Sparsity",
        "detail": "CA-11-D.3's proposal to track performance scores per (agent, adapter, capability) triple will lead to extreme data sparsity. An agent may only invoke a specific tool for a niche capability a few times, making the resulting performance score statistically volatile and unreliable for ranking, potentially causing unstable and suboptimal tool selection."
      },
      {
        "title": "Fallback Chains Obscure True Invocation Cost",
        "detail": "The fallback mechanism in CA-11-A.4, while capped at 3 hops, can lead to significant cost blowouts. If an agent's top-ranked tool is cheap but flaky, it may frequently fall back to a more expensive second- or third-choice tool, rapidly consuming the product's per-run budget (§7.6) on a single step without a clear per-invocation cost governor."
      },
      {
        "title": "ToolMenus Introduce Significant \"Spec Debt\"",
        "detail": "CA-11-B introduces numerous new, unwired Orchestra adapters (Sentry, Datadog, Netlify, etc.) across the 26 ToolMenus. This creates significant 'spec debt' by canonizing aspirational tools, misrepresenting the system's current capabilities, and bloating the agent charters with placeholders that have no clear implementation path or capacity estimate, contrary to the already-deferred adapters in §8.1."
      }
    ],
    "worse_than_status_quo": "A critical agent like Agent #3 (Self-Renewal) could, due to sparse and volatile per-agent scoring data, demote its reliable primary tool and switch to a less-tested or deferred tool for a critical `code-patch` operation. This introduces a subtle, hard-to-detect bug into a product, making the system less safe and predictable than the current stable, auditable, centralized routing from OrchestratorHub.",
    "precedent": "The transition from monoliths to microservices architectures demonstrates this risk; the promise of local component autonomy often leads to a 'distributed monolith' with chaotic, emergent runtime dependencies. Systems like service meshes (e.g., Istio) were created specifically to rein in this complexity, proving that such decentralized orchestration requires a heavy, complex control plane to be viable, which CA-11 lacks."
  },
  "rejection_steelman": "CA-11 introduces a significant layer of complexity and non-determinism into a system where 20 of 26 agents are still dormant and core stability is paramount. The current centralized routing is simple, predictable, and auditable. Deferring this proposal would allow engineering to focus on the higher-priority work of graduating dormant agents and hardening production infrastructure, ensuring the system is stable before we optimize it with a feature that fundamentally increases its operational complexity and surface area for emergent failures.",
  "answers": {
    "Q1": {
      "pick_text": "3 tools",
      "rationale": "While the number is less important than the flawed scoring mechanism, 3 provides a minimal balance of redundancy and focus without exacerbating the data sparsity problem as much as a higher number would."
    },
    "Q2": {
      "pick_text": "Once per step, ranked upfront",
      "rationale": "This approach is the most deterministic and auditable, mitigating some of the risks of non-reproducible runs. Real-time adaptive ranking would amplify the instability caused by sparse performance data."
    },
    "Q3": {
      "pick_text": "Net negative, centralized is safer",
      "rationale": "The proposal introduces multiple vectors for unpredictable, emergent behavior (volatile scoring, fallback cascades) that make the system less safe and auditable than the current predictable, centralized model."
    },
    "Q4": {
      "pick_text": "Auto-updated quarterly by agents",
      "rationale": "This aligns with FlowAI's ethos of self-renewal and automation (e.g., Agent #26), but it carries the risk of introducing instability if the update process isn't rigorously monitored and gated."
    },
    "Q5": {
      "pick_text": "Per-agent scoring data sparsity",
      "rationale": "This is the most fundamental and unmitigated flaw in the proposed mechanism; many other risks, like non-determinism and poor tool selection, are direct consequences of building a ranking system on statistically insignificant data."
    },
    "Q6": {
      "pick_text": "Defer pending a prototype/spike",
      "rationale": "The concept introduces significant architectural risk and complexity. A targeted prototype is necessary to empirically validate the scoring model's stability and the fallback chain's cost implications before committing the entire system to this change."
    }
  },
  "overall_notes": "CA-11 is a major architectural shift that prioritizes local optimization at the cost of global stability and predictability. The core mechanism of per-agent scoring is fundamentally flawed due to data sparsity, and the proposal should be deferred until a prototype can prove its viability."
}
```
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 27852 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Unclear Tool Selection Timing",
        "detail": "CA-11-A.3 does not specify the exact timing of tool selection within the agent's lifecycle. It is unclear whether the tool is selected at the beginning of the step or dynamically during the execution. This ambiguity could lead to inconsistent behavior across different agents and steps."
      },
      {
        "title": "Potential Cost Overruns",
        "detail": "The fallback mechanism in CA-11-A.4 could lead to significant cost overruns if the primary tool fails and the fallback tools are more expensive. There is no specified budget or cost control mechanism to prevent this."
      },
      {
        "title": "Lack of Detail on CEO Constraints",
        "detail": "CA-11-E introduces CEO constraints but does not provide detailed scenarios or examples of how these constraints might be applied and resolved in practice. This lack of detail could lead to misunderstandings and misapplications of the constraints."
      }
    ],
    "worse_than_status_quo": "In scenarios where the primary tool fails and the fallback tools are significantly more expensive, CA-11 could lead to uncontrolled cost overruns, making it worse than the current centralized OrchestratorHub routing which has predictable costs.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "CA-11 introduces significant complexity and potential cost risks without clear benefits over the current centralized routing. The lack of detailed scenarios for CEO constraints and the ambiguity in tool selection timing could lead to unintended consequences and inconsistent behavior.",
  "answers": {
    "Q1": {
      "pick_text": "Variable by agent mode",
      "rationale": "Different agents have different requirements and risks, so a variable minimum based on the agent's mode would be most appropriate."
    },
    "Q2": {
      "pick_text": "Hybrid",
      "rationale": "A hybrid approach allows for initial upfront ranking while still adapting to real-time failures, providing a balance between planning and flexibility."
    },
    "Q3": {
      "pick_text": "Depends on guardrails not yet specified",
      "rationale": "The risk and value depend heavily on the guardrails and controls put in place, which are not sufficiently detailed in the current spec."
    },
    "Q4": {
      "pick_text": "Auto-updated quarterly by agents",
      "rationale": "Automatic updates ensure the tool list stays current with the industry landscape, reducing the manual overhead and potential for outdated information."
    },
    "Q5": {
      "pick_text": "Cost blowout from fallback chains",
      "rationale": "The most significant unmitigated risk is the potential for cost overruns due to fallback chains, as there is no specified budget or cost control mechanism."
    },
    "Q6": {
      "pick_text": "Defer pending a prototype/spike",
      "rationale": "The specification has several ambiguities and potential risks that need to be addressed before it can be safely promoted. A prototype or spike would help resolve these uncertainties."
    }
  }
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 70062 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      {
        "title": "CA-11-A.3 Selection algorithm",
        "detail": "The selection algorithm in CA-11-A.3 is overly complex and may lead to performance issues. The algorithm involves multiple steps, including applying CEO constraints, ranking candidates, and handling fallback scenarios. This complexity could result in slower execution times and potential errors, especially when dealing with large ToolMenu arrays or complex constraints."
      },
      {
        "title": "CA-11-B.10 Other agents",
        "detail": "The ToolMenu for other agents, such as #12 Portfolio Risk, #17 Product Evolution, #19 Technological Evolution, #20 Environmental Impacts, #22 Ops Runner Beta, #23 Ops Runner Gamma, and #24 Ops Runner Delta, are not well-defined. These agents have placeholder ToolMenu entries, and their actual capabilities and requirements are not specified. This lack of clarity could lead to issues during implementation and maintenance."
      },
      {
        "title": "CA-11-C.3 OrchestratorHub.selectTool() method",
        "detail": "The new OrchestratorHub.selectTool() method, as described in CA-11-C.3, is not well-defined. The method is supposed to implement the selection algorithm described in CA-11-A.3, but the implementation details are not provided. This could lead to issues during development and testing, as the method's behavior is not clear."
      }
    ],
    "worse_than_status_quo": "CA-11 introduces a complex per-agent self-orchestration model, which could lead to performance issues and increased complexity. The current centralized OrchestratorHub routing is simpler and more efficient, as it does not require each agent to maintain its own ToolMenu and perform its own tool selection. CA-11's approach could result in slower execution times, especially when dealing with large ToolMenu arrays or complex constraints.",
    "precedent": "no precedent known"
  },
  "rejection_steelman": "CA-11 introduces a complex per-agent self-orchestration model, which could lead to performance issues and increased complexity. The current centralized OrchestratorHub routing is simpler and more efficient, as it does not require each agent to maintain its own ToolMenu and perform its own tool selection. CA-11's approach could result in slower execution times, especially when dealing with large ToolMenu arrays or complex constraints. Therefore, it is recommended to reject or defer CA-11 until these issues are addressed."
  },
  "answers": {
    "Q1": {
      "pick_text": "3 tools",
      "rationale": "The proposed minimum of 3 tools per agent is a reasonable balance between coverage and charter discipline. It ensures that each agent has at least 3 options to choose from, which is sufficient for most scenarios. A higher minimum, such as 5 tools, could be more redundant and harder to populate for niche agents, while a lower minimum could result in insufficient coverage."
    },
    "Q2": {
      "pick_text": "Once per step, ranked upfront",
      "rationale": "Selecting the tool once per step, ranked upfront, is a more deterministic and efficient approach. It ensures that the tool selection is consistent throughout the step, and it avoids the potential performance issues and complexity of a dynamic or adaptive selection process. This approach also aligns with the current centralized OrchestratorHub routing, which does not involve dynamic tool selection."
    },
    "Q3": {
      "pick_text": "Net positive, ship it",
      "rationale": "CA-11's per-agent self-orchestration model offers several benefits, such as increased flexibility, improved performance, and better cost control. It allows each agent to choose the most suitable tool for its specific needs, which can lead to better outcomes and reduced costs. While there are potential risks, such as increased complexity and the need for additional guardrails, these can be addressed through careful implementation and testing."
    },
    "Q4": {
      "pick_text": "Frozen, manual changes only",
      "rationale": "Freezing the tool list and allowing only manual changes is a more conservative and controlled approach. It ensures that the tool list remains stable and predictable, which can be important for maintaining the system's integrity and security. While this approach may require more manual effort to update the list, it can help prevent unintended consequences and ensure that changes are well-considered and approved."
    },
    "Q5": {
      "pick_text": "Complexity exceeding maintenance capacity",
      "rationale": "The biggest unmitigated risk in CA-11 is the potential for complexity to exceed the system's maintenance capacity. The per-agent self-orchestration model introduces a significant amount of complexity, with each agent maintaining its own ToolMenu and performing its own tool selection. This complexity could lead to performance issues, increased maintenance costs, and potential errors, especially when dealing with large ToolMenu arrays or complex constraints."
    },
    "Q6": {
      "pick_text": "Promote a reduced subset",
      "rationale": "Promoting a reduced subset of CA-11 is a reasonable approach, as it allows for the introduction of some of the proposed changes while mitigating potential risks. For example, promoting only CA-11-A and CA-11-B could provide the benefits of per-agent tool selection and customization, while deferring CA-11-C, CA-11-D, and CA-11-E could avoid the potential issues with the new OrchestratorHub.selectTool() method, the Locked Rule 18 extension, and the CEO constraint mechanism."
    }
  },
  "overall_notes": "The CA-11 draft introduces a complex per-agent self-orchestration model, which could lead to performance issues and increased complexity. The current centralized OrchestratorHub routing is simpler and more efficient, as it does not require each agent to maintain its own ToolMenu and perform its own tool selection. CA-11's approach could result in slower execution times, especially when dealing with large ToolMenu arrays or complex constraints. Therefore, it is recommended to reject or defer CA-11 until these issues are addressed."
}
```

---

### Slot 6 — openrouter:minimax/minimax-m2.7

- Provider: `openrouter`
- Latency: 92128 ms
- HTTP status: DEGRADED
- Error: unparseable JSON envelope

```

```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 104853 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      {
        "title": "Fallback chain fragility",
        "detail": "CA-11-A.4 caps fallback at 3 hops without considering cumulative error propagation. In complex agents like #21 (Aggressive Crawl), consecutive retryable errors across tools could exhaust fallbacks mid-crawl, truncating critical interactions like modal probing or AI-agent validation. Unlike current OrchestratorHub's global error budget, per-agent chains lack cross-step resilience."
      },
      {
        "title": "Per-agent score sparsity",
        "detail": "CA-11-D.3's per-agent performance scoring will suffer data sparsity for dormant/niche agents (e.g., #20 Environmental Impacts). With infrequent invocations, ranking formulas will rely on stale/bootstrap data, causing tool misselection. Current global Orchestra scoring aggregates all invocations, providing statistically robust rankings."
      },
      {
        "title": "Constraint-induced capability gaps",
        "detail": "CA-11-E CEO constraints could create capability holes when allowedTools/blockedTools mismatch required contextTypes. If Agent #7 Design is blocked from v0/Lovable but Bolt.new lacks 'design' capability, the agent becomes non-functional. Current routing lacks such product-specific veto points."
      },
      {
        "title": "ToolMenu validator rigidity",
        "detail": "CA-11-C.2's ≥3-tool minimum forces artificial entries for niche agents like #16 Productivity. This violates 'best-in-industry' principle by including subpar tools (e.g., PostHog for HR signals) solely to satisfy validator, degrading output quality versus today's capability-driven routing."
      }
    ],
    "worse_than_status_quo": "In a multi-tenant environment, a CEO constraint blocking Claude Code for Agent #2 (Code Builder) on product A would force lower-ranked tools. When combined with a Playwright outage during Agent #21's crawl, the 3-hop fallback cap would fail the entire run. Currently, OrchestratorHub would reroute to Browserless + Anthropic globally, completing the crawl.",
    "precedent": "Google's Borg cell isolation failures in 2015, where per-service scheduling constraints created resource deadlocks that global schedulers would have avoided, mirroring CA-11's risk of tool-selection silos causing systemic fragility."
  },
  "rejection_steelman": "CA-11's decentralization fragments FlowAI's core orchestration intelligence, introducing per-agent failure modes without proportional benefit. The current global Orchestra already supports agent-specific preferences via capability matrices. Adding 69 new audit topics and per-agent scoring would bloat the codebase for marginal gains, violating Locked Rule 3's governance simplicity. Defer until post-Layer 4 hardening.",
  "answers": {
    "Q1": {
      "pick_text": "3 tools",
      "rationale": "Balances redundancy with practicality; niche agents (e.g., #16) can include lower-ranked tools without mandating unrealistic breadth."
    },
    "Q2": {
      "pick_text": "Once per step, ranked upfront",
      "rationale": "Adaptive re-ranking mid-step would introduce nondeterminism and break audit trails; pre-step selection aligns with FlowAI's step-boundary governance model."
    },
    "Q3": {
      "pick_text": "Depends on guardrails not yet specified",
      "rationale": "While conceptually aligned with autonomy goals, the spec lacks circuit-breakers for constraint-induced deadlocks and sparse-data fallbacks."
    },
    "Q4": {
      "pick_text": "Auto-updated quarterly by agents",
      "rationale": "Aligns with Orchestra self-expansion mechanics (§8.1) and reduces Panel overhead, while quarterly cadence prevents drift."
    },
    "Q5": {
      "pick_text": "Per-agent scoring data sparsity",
      "rationale": "Agents with low invocation rates (e.g., #19 Technological Evolution) will produce unreliable rankings, leading to pathological tool selection that global scoring avoids."
    },
    "Q6": {
      "pick_text": "Promote a reduced subset",
      "rationale": "Core mechanism (CA-11-A/C) is viable, but tool lists (B) and CEO constraints (E) need more tenant-isolation safeguards before full promotion."
    }
  },
  "overall_notes": "Objections center on fragmentation risks; if promoted, implement cross-agent fallback pools and sparse-data alarms."
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 8796 ms
- HTTP status: OK

```
{"reviewer_slot":1,"adversarial_pass":{"objections":[{"title":"Constraint layer can dead-end","detail":"CA-11-E.4 allows `allowedTools` and `blockedTools` to combine into an empty candidate set, and CA-11-A.3 then throws `RegistryError`. That means a stale ProductRegistry edit can hard-fail an agent before any fallback, even when the underlying global Orchestra still has viable adapters."},{"title":"Per-agent scores will starve","detail":"CA-11-D.3 introduces rolling outcome scores per `(agent, adapter, capability)` triple, but most agents only have a handful of invocations today. For dormant or low-frequency agents like #16 or #20, the ranking will be driven by sparse bootstraps and noisy first impressions, making the ToolMenu look precise while actually being underfit."},{"title":"Selection path increases nondeterminism","detail":"CA-11-A.4 combines per-invocation re-ranking, dynamic fallback, and mode-dependent user choice. Even with a 3-hop cap, the same agent/action can traverse different tools across retries due to latency and retryable errors, which weakens reproducibility relative to the current centralized OrchestratorHub routing."}],"worse_than_status_quo":"A bad CEO constraint or sparse per-agent score can cause a previously working agent run to fail early with `all_tools_exhausted` or an empty candidate set, while the current centralized OrchestratorHub would have simply routed to the best available global adapter. In that case CA-11 turns a recoverable run into a blocked run, reducing throughput and increasing operator intervention.","precedent":"Kubernetes admission controllers and policy engines like OPA/Gatekeeper have repeatedly shown that distributed policy plus per-workload constraints can create surprising dead-ends when policy is over-constrained; the system becomes harder to reason about than a centralized scheduler. Similar operational friction also appears in feature-flag platforms when layered allow/block rules conflict and silently exclude all variants."},"rejection_steelman":"The strongest case for rejecting or deferring CA-11 is that it formalizes a large, cross-cutting control plane before the empirical data exists to justify it. Centralized OrchestratorHub routing is simpler, more deterministic, and easier to debug; CA-11 adds schema bloat, per-agent score tables, and a new class of failure modes without proving that current global ranking is insufficient. A prudent panel could ask for a prototype on one or two agents first, then promote only the parts that show measurable reliability gains.","answers":{"Q1":{"pick_text":"3 tools","rationale":"This is the smallest threshold that still gives genuine fallback coverage while keeping the schema and validator burden manageable. It also matches the draft’s own minimum and avoids overfitting niche agents to arbitrary larger menus."},"Q2":{"pick_text":"Once per step, ranked upfront","rationale":"This best preserves auditability and makes fallback behavior explainable. Fully adaptive selection at each invocation would amplify non-determinism and complicate incident review."},"Q3":{"pick_text":"Depends on guardrails not yet specified","rationale":"The spec adds useful flexibility, but the safety case depends on constraint precedence, rollback semantics, and how sparse per-agent scoring is handled. Without those guardrails, it is not safe to call the change net positive or net negative."},"Q4":{"pick_text":"Frozen, manual changes only","rationale":"Canonical tool lists should not churn automatically because the ranking inputs are already dynamic. Freezing the lists reduces review overhead and prevents quarterly drift from becoming a hidden source of behavior changes."},"Q5":{"pick_text":"Non-determinism / unreproducible runs","rationale":"The fallback chain and per-agent re-ranking create the most immediate operational risk. Cost can be capped, and sparsity can be bootstrapped, but run-to-run variance will make debugging and audit trails materially harder."},"Q6":{"pick_text":"Defer pending a prototype/spike","rationale":"CA-11 is broad enough that a targeted prototype would expose whether per-agent ToolMenus genuinely improve outcomes over centralized routing. Deferral avoids locking in a complicated control plane before the maintenance and reproducibility costs are measured."}},"overall_notes":"My vote is conservative because CA-11 introduces a second ranking plane plus policy overlays that can fail in ways the current system does not. The most defensible next step is a limited spike, not full canonical promotion."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 30405 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "adversarial_pass": {
    "objections": [
      { "title": "Insufficient fallback handling", "detail": "CA-11-A.4's fallback chain is capped at min(toolMenu.length, 3), which may not be sufficient for agents with fewer than 3 tools. This could lead to premature exhaustion and failure." },
      { "title": "Lack of real-time adaptivity", "detail": "CA-11-A.3's selectTool() method does not re-rank tools during fallback, potentially leading to suboptimal tool selection if the initial ranking is inaccurate or if runtime conditions change." },
      { "title": "Overly rigid ToolMenu structure", "detail": "CA-11-B's flat ToolMenu for cross-step agents may not be suitable for all use cases, as different steps may require different tools. A stepKey-conditional ToolMenu could provide more flexibility." }
    ],
    "worse_than_status_quo": "If CA-11's per-agent self-orchestration introduces significant complexity and the fallback chain is frequently exhausted, it could lead to more failures than the current centralized OrchestratorHub routing, making FlowAI worse than the status quo.",
    "precedent": "The 'every-component-self-orchestrates' design in the Kubernetes project initially caused trouble due to increased complexity and debugging challenges, but was eventually stabilized with robust guardrails and testing."
  },
  "rejection_steelman": "CA-11 introduces significant complexity with per-agent self-orchestration and ToolMenus, which may exceed the current maintenance capacity of the FlowAI team. The added flexibility could lead to non-determinism and unreproducible runs if not properly guarded.",
  "answers": {
    "Q1": { "pick_text": "Variable by agent mode", "rationale": "Different agents have different requirements; always-on agents may need more tools for redundancy, while step-owner agents might be fine with fewer." },
    "Q2": { "pick_text": "Hybrid", "rationale": "A hybrid approach that ranks tools upfront but re-ranks remaining candidates on retryable failures could balance determinism with adaptivity." },
    "Q3": { "pick_text": "Depends on guardrails not yet specified", "rationale": "The value of per-agent self-orchestration depends on the effectiveness of guardrails such as testing, monitoring, and constraint mechanisms." },
    "Q4": { "pick_text": "Auto-updated quarterly by agents", "rationale": "Automated quarterly updates by agents like #26, #11, and #15 could keep the tool lists current without overwhelming the Panel, while maintaining an audit trail." },
    "Q5": { "pick_text": "Per-agent scoring data sparsity", "rationale": "With many agents and tools, some agents may not have enough invocation data to accurately rank their tools, potentially leading to suboptimal choices." },
    "Q6": { "pick_text": "Promote a reduced subset", "rationale": "Promoting the core mechanism (CA-11-A, C, D) while deferring the tool lists (B) and CEO constraints (E) could allow for initial deployment and testing before fully committing to the new design." }
  },
  "overall_notes": "CA-11 introduces a significant change to FlowAI's orchestration model, and while it offers potential benefits, it also carries substantial risks that need careful mitigation."
}
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 17977 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "adversarial_pass": {
    "objections": [
      { "title": "CA-11-A.4 fallback cap", "detail": "The min(toolMenu.length, 3) cap in dispatchWithFallback still permits thundering-herd rate-limit cascades when three high-cost adapters (e.g. claude-code + openai-codex + devin) share the same upstream provider; no global back-pressure exists unlike the current OrchestratorHub." },
      { "title": "CA-11-B.10 TBD placeholders", "detail": "Agents #22–#25 are listed with literal 'TBD' ToolMenus yet CA-11-C.2 validator will reject any roster entry having fewer than three concrete entries at promotion time, creating an immediate schema violation on first load." },
      { "title": "CA-11-D.3 score table bypass", "detail": "The new flowai_agent_tool_outcome table writes per-(agent,adapter) scores without the prevHash / hash_chain_pointer discipline required by §14.2 GovernanceAuditLog, breaking the tamper-evidence invariant for all future tool-selection decisions." }
    ],
    "worse_than_status_quo": "A single mis-ranked adapter inside Agent #3's ToolMenu can silently lower Self-Renewal success rate across every product while the central OrchestratorHub's global visibility and single audit surface would have flagged the regression within one nightly cycle.",
    "precedent": "The 2023 AutoGPT 'agent swarm' rollout where decentralized per-agent tool selection produced repeated 429 storms and untraceable cost overruns that only became visible after the central dispatcher was restored."
  },
  "rejection_steelman": "CA-11 fragments the single audited choke-point that OrchestratorHub currently provides into 26 independent ranking surfaces; the added per-agent state, new Supabase table, and dispatch wrapper increase both maintenance surface area and the blast radius of any single adapter compromise, while the claimed per-agent performance gains remain unproven in production. Deferring until a working spike demonstrates measurable improvement over the existing hub is the lower-risk path.",
  "answers": {
    "Q1": { "pick_text": "Variable by agent mode", "rationale": "A flat minimum of three ignores the documented reality that several cross-step agents still lack concrete ToolMenus." },
    "Q2": { "pick_text": "Adaptively at each invocation", "rationale": "Static pre-step ranking cannot react to the per-run latency and cost signals that the fallback chain is explicitly intended to observe." },
    "Q3": { "pick_text": "Net negative, centralized is safer", "rationale": "The added per-agent surfaces remove the single point of global visibility and audit that the current OrchestratorHub supplies." },
    "Q4": { "pick_text": "Panel-reviewed every change", "rationale": "Quarterly auto-updates would silently alter production behavior without the engagement filter required by Locked Rule 17." },
    "Q5": { "pick_text": "Per-agent scoring data sparsity", "rationale": "Most agents will have far fewer than 30 invocations per (agent,adapter,capability) triple, rendering the new per-agent rank scores statistically unreliable." },
    "Q6": { "pick_text": "Reject — concept is unsound as specified", "rationale": "The design trades a single audited routing surface for 26 independent ones without demonstrated net reliability gains." }
  },
  "overall_notes": "All objections are drawn directly from CA-11-A through CA-11-E sections; the rejection case prioritizes preservation of the existing central audit surface."
}
```
