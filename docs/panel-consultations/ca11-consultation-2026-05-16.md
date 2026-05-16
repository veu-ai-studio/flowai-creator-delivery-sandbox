# Panel Consultation — CA-11 Agent Self-Orchestration + Per-Agent Tool Intelligence (2026-05-16)

**Lineage:** W05 dispatch → W6 execution. Review of W3 draft `docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md` (commit `1a020f7`). Canonical anchor: Rev-2.1 `docs/CANONICAL_REFERENCE.md` (`9495b26`).

**Mode:** read-only Panel consultation. 7 multi-choice questions, 4 options each (option (d) = INSUFFICIENT_INFORMATION).

**Started:** 2026-05-16T02:48:04.567Z
**Finished:** 2026-05-16T02:51:01.877Z
**Bundle size:** 146383 chars (full CANONICAL_REFERENCE.md + CA-11 draft attached).
**Panel composition audit:** {"providerCounts":{"openai":1,"anthropic":1,"google":1,"mistralai":1,"cohere":1,"minimax":1,"deepseek":1,"perplexity":1,"meta-llama":1,"x-ai":1},"maxPerProvider":1,"slots":10} — strict 10-unique-provider roster.

**W6 thresholds:** Quorum = 7/10 · Supermajority = 8/10 · Unanimous = all-ENGAGED on one option.

---

## Slot status

| Slot | Provider | Model | Region/Role | Backup adapter | Status | Backup fired? | Latency (ms) | Error |
|------|----------|-------|-------------|----------------|--------|---------------|--------------|-------|
| 1 | openrouter | `anthropic/claude-opus-4` | US · frontier reasoning | `openrouter:anthropic/claude-opus-4` | LIVE-OK | YES (openrouter:openrouter:openai/gpt-5 → openrouter:openrouter:anthropic/claude-opus-4) | 59476 |  |
| 2 | openrouter | `anthropic/claude-opus-4` | US · reasoning | `openrouter:openai/gpt-5` | LIVE-OK | — | 58878 |  |
| 3 | openrouter | `mistralai/mistral-large-2411` | US · frontier multimodal | `openrouter:mistralai/mistral-large-2411` | LIVE-OK | YES (openrouter:openrouter:google/gemini-2.5-pro → openrouter:openrouter:mistralai/mistral-large-2411) | 24891 |  |
| 4 | openrouter | `mistralai/mistral-large-2411` | Europe · European frontier | `openrouter:cohere/command-r-plus-08-2024` | LIVE-OK | — | 24053 |  |
| 5 | openrouter | `cohere/command-r-plus-08-2024` | Europe/CA · European RAG-tuned | `openrouter:mistralai/mistral-large-2411` | LIVE-OK | — | 54628 |  |
| 6 | openrouter | `minimax/minimax-m2.7` | Asia · Asia generalist | `openrouter:qwen/qwen-2.5-72b-instruct` | LIVE-OK | — | 52839 |  |
| 7 | openrouter | `deepseek/deepseek-r1` | Asia · Asia reasoning | `openrouter:qwen/qwen-2.5-72b-instruct` | LIVE-OK | — | 90226 |  |
| 8 | openrouter | `perplexity/sonar` | US web-grounded · web-grounded research | `openrouter:google/gemini-2.5-pro` | LIVE-OK | — | 11321 |  |
| 9 | openrouter | `meta-llama/llama-4-maverick` | Asia (Beijing → US/Meta after swap) · frontier coding + agentic | `openrouter:moonshotai/kimi-k2.6` | LIVE-OK | — | 9401 |  |
| 10 | openrouter | `x-ai/grok-4.3` | US · real-time web-aware reasoning | `openrouter:minimax/minimax-m2.7` | LIVE-OK | — | 18576 |  |

LIVE-OK: 10/10. Backups applied: 2. Quorum met (≥7 LIVE-OK): true. Supermajority achievable (≥8 LIVE-OK): true.

Engagement: **ENGAGED=8** · TANGENTIAL=2 · SILENT=0 · EVASIVE=0 (of 10 slots). `INSUFFICIENT_INFORMATION` responses: **0**.

---

## Tally + verdicts (ENGAGED-only)

| Q | Topic | (a) | (b) | (c) | (d) INSUFF | other | Top | Verdict |
|---|---|---:|---:|---:|---:|---:|---|---|
| **CA-11-Q1** | ToolMenu validator threshold (per-agent minimum entries) | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **CA-11-Q2** | Tool selection timing | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **CA-11-Q3** | Cross-step agent tool scope | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **CA-11-Q4** | Industry tool list canonicalization cadence | 7 | 1 | 0 | 0 | 0 | `(a)` | `QUORUM_PLURALITY_(a)` |
| **CA-11-Q5** | CEO constraint granularity | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **CA-11-Q6** | Fallback failure handling (all tools in agent's ToolMenu fail) | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |
| **CA-11-Q7** | Combined CA-11 disposition (sub-amendments A + B + C + D + E) | 8 | 0 | 0 | 0 | 0 | `(a)` | `UNANIMOUS_(a)` |

---

## Highest-conviction (UNANIMOUS / SUPERMAJORITY)

- **CA-11-Q1** — `UNANIMOUS_(a)` · winning option `(a)`: ≥3 entries per agent (as drafted)
- **CA-11-Q2** — `UNANIMOUS_(a)` · winning option `(a)`: Pre-step ranking (as drafted) — ToolMenu ranking computed before step starts
- **CA-11-Q3** — `UNANIMOUS_(a)` · winning option `(a)`: Flat ToolMenu (as drafted) — single ranked list applies to all cross-step invocations
- **CA-11-Q5** — `UNANIMOUS_(a)` · winning option `(a)`: Per-agent only (as drafted) — CEO sets cost/budget/policy at the agent level
- **CA-11-Q6** — `UNANIMOUS_(a)` · winning option `(a)`: Medium-finding + continue (as drafted) — log medium severity, run continues with degraded output
- **CA-11-Q7** — `UNANIMOUS_(a)` · winning option `(a)`: Promote all 5 sub-amendments together

## Lower-conviction (SPLIT / PLURALITY / NO_QUORUM)

- **CA-11-Q4** — `QUORUM_PLURALITY_(a)` — 7 of 8 ENGAGED on (a) (≥ 7/10 quorum, < 8/10 supermajority)

---

## Per-question detail

### CA-11-Q1 — ToolMenu validator threshold (per-agent minimum entries)

- (a) ≥3 entries per agent (as drafted)
- (b) ≥5 entries per agent (stricter floor)
- (c) Flexible — step-owner ≥3, others ≥1
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### CA-11-Q2 — Tool selection timing

- (a) Pre-step ranking (as drafted) — ToolMenu ranking computed before step starts
- (b) Real-time adaptive per call — re-rank at each tool invocation based on live signals
- (c) Hybrid — pre-step default ranking, adaptive override permitted on cost/health changes mid-step
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### CA-11-Q3 — Cross-step agent tool scope

- (a) Flat ToolMenu (as drafted) — single ranked list applies to all cross-step invocations
- (b) stepKey-conditional menus — different ranked list per pipeline step the agent enters
- (c) Hybrid opt-in — flat by default, agent can declare step-conditional menus when needed
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### CA-11-Q4 — Industry tool list canonicalization cadence

- (a) Quarterly automated via Agent #26 + #11 + #15 (as drafted)
- (b) Frozen at promotion time — list ratified now, changes require explicit CA-n
- (c) Panel-reviewed every change — each tool addition/removal goes through W6 Panel
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `QUORUM_PLURALITY_(a)` — 7 of 8 ENGAGED on (a) (≥ 7/10 quorum, < 8/10 supermajority).

### CA-11-Q5 — CEO constraint granularity

- (a) Per-agent only (as drafted) — CEO sets cost/budget/policy at the agent level
- (b) Per-step only — constraints attach to the pipeline step, not the agent
- (c) Per-product only — constraints attach to the product tenant, not the agent/step
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### CA-11-Q6 — Fallback failure handling (all tools in agent's ToolMenu fail)

- (a) Medium-finding + continue (as drafted) — log medium severity, run continues with degraded output
- (b) Human-gate + halt — pause run for human Approve/Modify/Skip
- (c) Critical-halt immediately — escalate to critical, halt the run
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).

### CA-11-Q7 — Combined CA-11 disposition (sub-amendments A + B + C + D + E)

- (a) Promote all 5 sub-amendments together
- (b) Promote A + C + D only (defer B + E)
- (c) Promote A only (defer B + C + D + E)
- (d) INSUFFICIENT_INFORMATION

**Verdict:** `UNANIMOUS_(a)` — 8 of 8 ENGAGED on (a) (unanimous).


---

## Conflicts with canonical SSOT (flagged by reviewers)

_(no reviewer flagged any conflict with canonical SSOT)_

---

## Per-reviewer picks + rationales

**Slot 1** [ENGAGED] — openrouter:anthropic/claude-opus-4

- **CA-11-Q1** = `(a)`
  > The ≥3 entries threshold strikes the right balance between redundancy and practicality. CA-11-C.2 validator enforces this across all 26 agents, and CA-11-B demonstrates feasibility by populating every agent's ToolMenu with 3+ entries, including niche agents like Agent #16 Productivity/HR.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking aligns with the existing Locked Rule 18 formula and CA-11-D.3's per-agent score tracking mechanism. Real-time adaptation would add complexity without clear benefit, as the fallback chain in CA-11-A.4 already provides resilience through sequential tool attempts.
- **CA-11-Q3** = `(a)`
  > Flat ToolMenu for cross-step agents maintains consistency with the schema in CA-11-C.1 where toolMenu is a simple array. CA-11-B.10 successfully assigns flat menus to all cross-step agents (#11, #12, #14, #17, #19, #20), demonstrating this approach works without stepKey conditioning.
- **CA-11-Q4** = `(a)`
  > Quarterly automated updates via Agent #26 (Orchestra Research Agent) align with its charter in §15.1 and CA-9-B's auto-admission mechanism. This maintains the canonical SSOT's living-document nature while avoiding excessive Panel overhead, consistent with §8.1's auto-admission philosophy.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints as specified in CA-11-E align perfectly with §22 Product-Agnostic Rule's metadata-driven architecture. The agentToolConstraints field in ProductRegistry allows CEO control without violating the zero-code-changes principle, as demonstrated in CA-11-E.2.
- **CA-11-Q6** = `(a)`
  > Medium-finding + continue matches the graceful degradation pattern established in §6's resolution contract where issues reach terminal decisions without necessarily halting execution. CA-11-A.4's audit-log topic 'agent.tool_selection.exhausted.v1' provides visibility while allowing the pipeline to complete.
- **CA-11-Q7** = `(a)`
  > All five sub-amendments form a coherent capability that depends on each other: CA-11-A's selection model requires CA-11-B's tool lists, CA-11-C's schema extension, CA-11-D's ranking extension, and CA-11-E's constraint mechanism. The engineering scope estimate of ~13 W-days confirms this is implementable as a unit.

Overall notes: CA-11 extends the existing Orchestra framework to per-agent granularity while maintaining canonical patterns. The amendment respects all Locked Rules, particularly Rule 18's ranking formula and Rule 2's 26-agent roster lock.

---

**Slot 2** [ENGAGED] — openrouter:anthropic/claude-opus-4

- **CA-11-Q1** = `(a)`
  > The ≥3 entries threshold strikes the right balance between redundancy and practicality. CA-11-C.2 validator enforces this across all 26 agents, and CA-11-B demonstrates feasibility by populating every agent's ToolMenu with 3+ entries, including niche agents like Agent #16 Productivity/HR.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking aligns with the existing Locked Rule 18 formula and CA-11-D.3's per-agent score tracking mechanism. Real-time adaptation would add complexity without clear benefit, as the fallback chain in CA-11-A.4 already provides resilience through sequential tool attempts.
- **CA-11-Q3** = `(a)`
  > Flat ToolMenu for cross-step agents maintains consistency with the schema in CA-11-C.1 where toolMenu is a simple array. CA-11-B.10 successfully assigns flat menus to all cross-step agents (#11, #12, #14, #17, #19, #20), demonstrating this approach works without stepKey conditioning.
- **CA-11-Q4** = `(a)`
  > Quarterly automated updates via Agent #26 (Orchestra Research Agent) align with its charter in §15.1 and CA-9-B's auto-admission mechanism. This maintains the canonical SSOT's living-document nature while avoiding excessive Panel overhead, consistent with §8.1's auto-admission philosophy.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints as specified in CA-11-E align perfectly with §22 Product-Agnostic Rule's metadata-driven architecture. The agentToolConstraints field in ProductRegistry allows CEO control without violating the zero-code-changes principle, as demonstrated in CA-11-E.2.
- **CA-11-Q6** = `(a)`
  > Medium-finding + continue matches the graceful degradation pattern established in §6's resolution contract where issues reach terminal decisions without necessarily halting execution. CA-11-A.4's audit-log topic 'agent.tool_selection.exhausted.v1' provides visibility while allowing the pipeline to complete.
- **CA-11-Q7** = `(a)`
  > All five sub-amendments form a coherent capability that depends on each other: CA-11-A's selection model requires CA-11-B's tool lists, CA-11-C's schema extension, CA-11-D's ranking extension, and CA-11-E's constraint mechanism. The engineering scope estimate of ~13 W-days confirms this is implementable as a unit.

Overall notes: CA-11 extends the existing Orchestra framework to per-agent granularity while maintaining canonical patterns. The amendment respects all Locked Rules, particularly Rule 18's ranking formula and Rule 2's 26-agent roster lock.

---

**Slot 3** [TANGENTIAL] — openrouter:mistralai/mistral-large-2411

- **CA-11-Q1** = `(a)`
  > The proposed threshold of ≥3 entries per agent strikes a good balance between coverage and charter discipline, ensuring that each agent has sufficient tools while maintaining a manageable list.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking is deterministic and cost-effective, aligning with the current design and ensuring that tool selection is consistent and reliable throughout the pipeline steps.
- **CA-11-Q3** = `(a)`
  > A flat ToolMenu simplifies the schema and ensures that cross-step agents have a consistent set of tools available, reducing complexity and potential errors.
- **CA-11-Q4** = `(b)`
  > Freezing the tool list at promotion ensures stability and predictability, while allowing for explicit amendments through the CA-n process to update the list as needed.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints provide a straightforward and effective mechanism for CEOs to set cost, budget, and policy constraints at the agent level, simplifying the constraint application process.
- **CA-11-Q6** = `(a)`
  > Logging a medium-severity finding and continuing the run with degraded output ensures that the pipeline can still complete, providing valuable insights even if some tools fail.
- **CA-11-Q7** = `(a)`
  > Promoting all five sub-amendments together ensures that the complete capabilities of CA-11 are integrated cohesively, providing a comprehensive solution for agent self-orchestration and per-agent tool intelligence.

Overall notes: The proposed amendments in CA-11 are well-aligned with the existing SSOT and provide a robust framework for agent self-orchestration and tool intelligence.

---

**Slot 4** [ENGAGED] — openrouter:mistralai/mistral-large-2411

- **CA-11-Q1** = `(a)`
  > The current threshold of ≥3 entries per agent is a balanced approach. It ensures a minimum level of redundancy while allowing for niche agents with fewer tool options. This threshold is practical and maintains charter discipline.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking is deterministic and computationally cheap. It aligns with the draft's recommendation and ensures that the tool selection process is straightforward and efficient.
- **CA-11-Q3** = `(a)`
  > A flat ToolMenu for cross-step agents simplifies the schema and maintains consistency. It avoids the complexity of step-conditional menus, which could introduce unnecessary overhead.
- **CA-11-Q4** = `(a)`
  > Quarterly automated updates via Agent #26, #11, and #15 ensure that the tool lists remain current with industry standards. This approach balances flexibility with the need for regular updates.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints provide a focused and manageable scope for CEO oversight. It allows for granular control without introducing excessive complexity in the constraint application process.
- **CA-11-Q6** = `(a)`
  > Treating fallback failure as a medium-severity finding allows the run to continue with degraded output, which is practical and non-blocking. It aligns with the draft's recommendation for handling such scenarios.
- **CA-11-Q7** = `(a)`
  > Promoting all five sub-amendments together ensures a coherent and comprehensive introduction of the agent self-orchestration and per-agent tool intelligence capabilities.

---

**Slot 5** [TANGENTIAL] — openrouter:cohere/command-r-plus-08-2024

- **CA-11-Q1** = `(a)`
  > The proposed threshold of ≥3 entries per agent is a reasonable balance between coverage and charter discipline. It ensures that each agent has a sufficient number of tools to choose from, while also maintaining a manageable list for validation. This threshold is in line with the W3 recommendation and is a practical choice for the current state of the system.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking is a deterministic and cost-effective approach that aligns with the W3 recommendation. It ensures that the tool selection is made before the step begins, allowing for a more efficient and predictable process. Real-time adaptive ranking, while potentially useful in certain scenarios, may introduce additional complexity and cost, especially for niche agents like #16 Productivity / HR. Therefore, adopting the pre-step ranking as proposed is a more practical and efficient choice.
- **CA-11-Q3** = `(a)`
  > A flat ToolMenu for cross-step agents is a simpler and more straightforward approach, as it avoids the need for stepKey-conditional menus. This design choice reduces the complexity of the schema and makes it easier to manage and validate. While stepKey-conditional menus may offer more flexibility, they also introduce additional complexity and potential for errors. Therefore, adopting a flat ToolMenu for cross-step agents is a more practical and maintainable choice.
- **CA-11-Q4** = `(b)`
  > Updating the industry tool list quarterly via Agent #26, #11, and #15 is a practical and efficient approach that ensures the list stays current without requiring frequent Panel reviews. This approach strikes a balance between maintaining an up-to-date list and avoiding unnecessary overhead. Frozen lists at promotion time may become outdated quickly, and Panel-reviewed changes for every addition/removal could be cumbersome. Therefore, the proposed quarterly automated update is a more efficient and sustainable solution.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints provide a straightforward and manageable way to set cost, budget, and policy parameters at the agent level. This granularity is sufficient for most use cases and aligns with the W3 recommendation. Per-step constraints, while potentially useful in certain scenarios, introduce additional complexity and may not be necessary for all agents. Per-product constraints, while offering the most flexibility, could lead to a complex and hard-to-manage system. Therefore, adopting per-agent constraints as proposed is a more practical and manageable choice.
- **CA-11-Q6** = `(a)`
  > Surfacing the failure as a medium-severity finding and continuing the run is a reasonable approach that allows the system to proceed with degraded output. This option maintains the system's functionality and provides a clear indication of the issue without halting the entire pipeline. Human-gating and critical-halting, while potentially useful in certain scenarios, may introduce unnecessary complexity and overhead. Therefore, adopting the proposed medium-finding and continue approach is a more practical and efficient choice.
- **CA-11-Q7** = `(a)`
  > Promoting all five sub-amendments together is a logical and efficient approach that ensures the system remains consistent and coherent. Splitting the amendments could introduce potential inconsistencies and require additional coordination. Therefore, adopting the proposed approach of promoting all five sub-amendments together is a more practical and manageable choice.

Overall notes: The CA-11 amendment draft is well-structured and addresses important aspects of agent self-orchestration and per-agent tool intelligence. The proposed changes enhance the system's flexibility, adaptability, and performance, while maintaining a clear and manageable structure. The draft is comprehensive and provides a solid foundation for further development and refinement.

---

**Slot 6** [ENGAGED] — openrouter:minimax/minimax-m2.7

- **CA-11-Q1** = `(a)`
  > The ≥3 entries minimum in CA-11-C.2 validator is a reasonable engineering floor that balances coverage breadth against the practical constraint that some agents (e.g., Agent #16 Productivity/HR or Agent #22 Ops Runner Beta with TBD step assignments per Rev-2.1 §27 OQ-2) cannot credibly populate 5 entries today. Tightening to ≥5 would create validator failures for placeholder agents before their step bindings are canonicalised. Option (a) matches W3's explicit recommendation.
- **CA-11-Q2** = `(a)`
  > The pre-step ranking algorithm in CA-11-A.3 is canonical as written and aligns with the Orchestra Integration Spec §4.2 approach to rolling outcome scores. Pre-step ranking is deterministic, cheap to compute, and avoids introducing latency jitter mid-step. The canonical SSOT does not prescribe real-time adaptive re-ranking; CA-11-A.4 retryable-error patterns (429, 5xx, timeout) already provide a clean failure-to-next mechanism without adding in-run re-ranking complexity.
- **CA-11-Q3** = `(a)`
  > CA-11-B.10 explicitly assigns flat ToolMenus to cross-step agents (#11 Strategic Intelligence, #12 Portfolio Risk, #14 Public Policy, #17 Product Evolution, #19 Technological Evolution, #20 Environmental Impacts). A stepKey-conditional schema (option b) would require a structural change to the `toolMenu` field shape — from `readonly ToolEntry[]` to `readonly { [stepKey: string]: ToolEntry[] }` — which cascades into `selectTool()` algorithm changes (CA-11-A.3), validator logic (CA-11-C.2), and Supabase schema extensions. The flat model matches the simpler schema design intent of CA-11-A and the Rev-2.1 §15.2 MessageBus interaction pattern.
- **CA-11-Q4** = `(a)`
  > CA-11-D extends Locked Rule 18 with per-agent score tracking via Agent #26 + #11 + #15, explicitly referencing the CA-9-A self-expansion and CA-9-B charter expansions as the canonical mechanism. The §8.1 auto-admission pipeline already requires Agent #26 to maintain a seed evaluation list with quarterly re-scoring cadence. Locked Rule 16 mandates continuous marketplace intelligence. Option (a) aligns with the draft's own §15.1 row 26 charter consuming `vendor.changelog.poll.v1` — a signal designed for automated periodic polling, not ad-hoc Panel review. The commit `1a020f7` anchor confirms the quarterly cadence is intentional.
- **CA-11-Q5** = `(a)`
  > CA-11-E.1 defines `AgentToolConstraints` at the per-agent level as the canonical constraint unit. Per Rev-2.1 §22 Product-Agnostic Rule, all constraints live in metadata (Supabase `flowai_product_config` or Doppler vault) with zero code changes — the per-agent level is the coarsest granularity that preserves this property. Per-step constraints (b) would require step-key routing in the metadata schema; per-product only (c) would collapse to a blanket block/allow for the entire tenant. The draft's explicit rationale for option (a) is the simple model — and CA-11-A.3 algorithm already handles the blocked-all edge case cleanly at the per-agent level.
- **CA-11-Q6** = `(a)`
  > The §12 severity routing table classifies `medium` as the highest severity eligible for fork-and-fix auto-deploy without a human gate. Exhausted fallback returning a medium finding is consistent with this model — it is a degraded-output signal, not a blocking violation. Critical-halt (c) is reserved for `xss-in-form-echo` and `auth-gate-leak` per ENTRY 006 escalation rules in §15.1 row 21, not tool-exhaustion scenarios. Human gate (b) applies to `high`/`critical` severity per §10.2 — medium is below that threshold. CA-11-A.4 explicitly returns `{ok: false, error: 'all_tools_exhausted'}` without throwing, confirming non-halt behaviour.
- **CA-11-Q7** = `(a)`
  > CA-11-A (OrchestratorHub.selectTool() algorithm), CA-11-B (all 26 agent ToolMenus), CA-11-C (schema + validator), CA-11-D (Locked Rule 18 extension), and CA-11-E (CEO constraint metadata) are tightly coupled: the validator in CA-11-C.2 enforces ≥3 entries referenced by CA-11-B; the selection algorithm in CA-11-A.3 reads the schema produced by CA-11-C.1; the per-agent score tracking in CA-11-D.3 writes to the `flowai_agent_tool_outcome` table created by CA-11-C's Supabase migration; CEO constraints in CA-11-E feed into CA-11-A.3's constraint-filtering step. Splitting B from A, or D from A, breaks the end-to-end contract. The co-sequencing section confirms CA-11 is independent of prior CAs and introduces no new blockers.

Overall notes: All seven answers align with the draft's own W3 recommendations and the canonical SSOT Rev-2.1 architecture. CA-11-Q4 option (a) draws directly from the CA-9-A/CA-9-B charter expansion lineage (Agent #26 + #11 + #15 tri-agent maintenance role); CA-11-Q6 option (a) is consistent with §12 severity routing and ENTRY 006 escalation rules for Agent #21.

---

**Slot 7** [ENGAGED] — openrouter:deepseek/deepseek-r1

- **CA-11-Q1** = `(a)`
  > CA-11-C.2 validator explicitly mandates ≥3 ToolMenu entries per agent per the draft specification. This balances redundancy with practical constraints for niche agents like #16, avoiding the overcomplication of option (c).
- **CA-11-Q2** = `(a)`
  > CA-11-A.3 algorithm specifies pre-step ranking via OrchestratorHub.selectTool(), with fallback handling in §A.4. Real-time adaptation would violate the deterministic design and increase complexity without documented justification.
- **CA-11-Q3** = `(a)`
  > CA-11-B.10 assigns cross-step agents (#11, #14, etc.) flat ToolMenus without stepKey-conditionality. Introducing per-step variations would contradict the schema simplicity prioritized in CA-11-C and require unratified validator changes.
- **CA-11-Q4** = `(a)`
  > CA-11-D.2 Locked Rule 18 extension mandates quarterly updates via Agent #26, #11, and #15 per the automated pipeline described in CA-9-A/B. This aligns with Orchestra self-expansion mechanics in §8.1.
- **CA-11-Q5** = `(a)`
  > CA-11-E.1 defines constraints solely at the agentId level in ProductRegistry metadata. Granular per-step or per-product constraints aren't proposed and would violate §22's zero-code-change principle for new tenants.
- **CA-11-Q6** = `(a)`
  > CA-11-A.4 fallback failure emits 'all_tools_exhausted' but doesn't prescribe agent behavior. Option (a) follows W3's recommendation cited in the draft, treating it as a medium-severity non-blocking issue per §6 resolution semantics.
- **CA-11-Q7** = `(a)`
  > CA-11-Q7 explicitly recommends promoting all five sub-amendments (A-E) as a coherent unit. Splitting would fracture interdependent mechanisms like ToolMenu schema (C) and CEO constraints (E) tied to the selection model (A).

---

**Slot 8** [ENGAGED] — openrouter:perplexity/sonar

- **CA-11-Q1** = `(a)`
  > CA-11-C explicitly proposes a validator minimum of ≥3 entries per agent, and the draft frames this as the workable baseline for all 26 agents. That matches Rev-2.1 §22’s product-agnostic/metadata-driven pattern: the mechanism should be uniform and avoid special-case code paths.
- **CA-11-Q2** = `(a)`
  > CA-11-A.4 defines fallback from a precomputed ranked list, and CA-11-A.3 shows `selectTool()` happening before dispatch. This keeps the selection deterministic and consistent with Locked Rule 18’s canonical ranking model rather than making the runtime path unstable.
- **CA-11-Q3** = `(a)`
  > CA-11-B.10 gives cross-step agents a flat ToolMenu, and CA-11-A.3/CA-11-C.3 are written around a single ranked list. A flat menu also aligns with §15.2’s message-bus simplicity and avoids adding schema branching where the draft does not require it.
- **CA-11-Q4** = `(a)`
  > CA-11-Q4 is directly answered in CA-11-B and CA-11-E: quarterly automated refresh via Agent #26 + #11 + #15 is the drafted canonicalization cadence. That fits the CA-9-B/CA-9-A quarterly re-score model and preserves CA-n amendment discipline without forcing W6 review on every routine tool update.
- **CA-11-Q5** = `(a)`
  > CA-11-E.1 and CA-11-E.2 define `agentToolConstraints` at the agent level, with per-product metadata storage but not per-step scoping. This is the cleanest fit for §22 Product-Agnostic Rule because it keeps constraints as runtime metadata rather than introducing extra structural dimensions.
- **CA-11-Q6** = `(a)`
  > CA-11-A.4 says exhausted fallback returns `ok: false` and CA-11-Q6 explicitly describes that as a medium-finding while the run continues. That behavior is consistent with §6’s terminal-decision philosophy and avoids turning a tool-routing miss into a pipeline-wide hard stop.
- **CA-11-Q7** = `(a)`
  > The five sub-amendments are mutually reinforcing: CA-11-A defines the mechanism, CA-11-B supplies the menus, CA-11-C adds schema/validation, CA-11-D extends Locked Rule 18, and CA-11-E adds the CEO constraint layer. Splitting them would leave the feature set partially canonicalized and weaken the end-to-end contract the draft is trying to establish.

Overall notes: The draft is internally coherent and largely aligned with Rev-2.1’s metadata-driven and audit-log-heavy architecture. No direct conflict with the canonical SSOT is apparent from the provided text; the main choice is whether to promote the bundle as a unit or serialize it by dependency.

---

**Slot 9** [ENGAGED] — openrouter:meta-llama/llama-4-maverick

- **CA-11-Q1** = `(a)`
  > The ≥3 entries per agent threshold strikes a balance between coverage and charter discipline, as seen in CA-11-B where most agents have 3+ tools listed.
- **CA-11-Q2** = `(a)`
  > Pre-step ranking is deterministic and computationally efficient, aligning with the W3 recommendation and existing Locked Rule 18 formula application in §8.
- **CA-11-Q3** = `(a)`
  > Flat ToolMenu for cross-step agents simplifies the schema and aligns with W3's recommendation, as seen in CA-11-B.10 where cross-step agents are assigned a flat ToolMenu.
- **CA-11-Q4** = `(b)`
  > Freezing the lists at promotion time maintains canonical stability, requiring explicit CA-n amendments for updates, which aligns with the proposed Locked Rule 17 discipline.
- **CA-11-Q5** = `(a)`
  > Per-agent constraints as proposed in CA-11-E provide a simple yet effective model for CEO control, with the granularity being sufficient for most use cases as demonstrated in the draft.
- **CA-11-Q6** = `(a)`
  > Logging a medium-severity finding and continuing the run as drafted in CA-11-A.4 is non-blocking and aligns with the W3 recommendation, allowing for degraded output rather than halting the entire run.
- **CA-11-Q7** = `(a)`
  > Promoting all five sub-amendments together maintains coherence and aligns with the recommendation, as CA-11-A through CA-11-E form a cohesive capability enhancement.

Overall notes: The responses are based on the provided CA-11 draft and canonical reference, with rationales citing specific sub-amendments and sections.

---

**Slot 10** [ENGAGED] — openrouter:x-ai/grok-4.3

- **CA-11-Q1** = `(a)`
  > The draft explicitly sets the validator threshold at ≥3 entries per agent in CA-11-C.2 (extending validateRosterPartition() and validateExecutors()). This balances coverage with charter discipline while satisfying the minimum for fallback chains in CA-11-A.4.
- **CA-11-Q2** = `(a)`
  > CA-11-A.3 defines the canonical selection algorithm as pre-step ranking via OrchestratorHub.selectTool() before dispatchWithFallback(), applying Locked Rule 18 once per invocation. This keeps the process deterministic and cheap per the proposed model.
- **CA-11-Q3** = `(a)`
  > CA-11-B.10 assigns flat ToolMenus to all cross-step agents (#11, #12, #14, #17, #19, #20) without stepKey conditioning. The schema extension in CA-11-C.1 stores a single ranked array, keeping the model simple.
- **CA-11-Q4** = `(a)`
  > CA-11-B explicitly calls for quarterly automated refresh via Agent #26 (Orchestra Research) + #11 (Strategic Intelligence) + #15 (Benchmarking) per their expanded charters in CA-9-B and §8.1 auto-admission. This is reinforced by the commit hash 1a020f7 lineage.
- **CA-11-Q5** = `(a)`
  > CA-11-E.1–E.2 places constraints at the per-agent level inside ProductRegistry.agentToolConstraints metadata, preserving the §22 Product-Agnostic Rule with zero code changes. The mechanism is deliberately scoped to agentId only.
- **CA-11-Q6** = `(a)`
  > CA-11-A.4 caps fallback at min(toolMenu.length, 3) and returns a medium-severity finding with degraded output when exhausted, emitting agent.tool_selection.exhausted.v1. This keeps the run non-blocking per the drafted failure handling.
- **CA-11-Q7** = `(a)`
  > All five sub-amendments (CA-11-A through CA-11-E) form one coherent capability extending §15.5, Locked Rule 18, and §8, with no internal contradictions in the draft. Promotion as a unit aligns with the single-commit 1a020f7 scope.


---

## Raw reviewer responses

### Slot 1 [BACKUP FIRED] — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 59476 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:openai/gpt-5` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "The ≥3 entries threshold strikes the right balance between redundancy and practicality. CA-11-C.2 validator enforces this across all 26 agents, and CA-11-B demonstrates feasibility by populating every agent's ToolMenu with 3+ entries, including niche agents like Agent #16 Productivity/HR."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "Pre-step ranking aligns with the existing Locked Rule 18 formula and CA-11-D.3's per-agent score tracking mechanism. Real-time adaptation would add complexity without clear benefit, as the fallback chain in CA-11-A.4 already provides resilience through sequential tool attempts."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "Flat ToolMenu for cross-step agents maintains consistency with the schema in CA-11-C.1 where toolMenu is a simple array. CA-11-B.10 successfully assigns flat menus to all cross-step agents (#11, #12, #14, #17, #19, #20), demonstrating this approach works without stepKey conditioning."
    },
    "CA-11-Q4": {
      "pick": "(a)",
      "rationale": "Quarterly automated updates via Agent #26 (Orchestra Research Agent) align with its charter in §15.1 and CA-9-B's auto-admission mechanism. This maintains the canonical SSOT's living-document nature while avoiding excessive Panel overhead, consistent with §8.1's auto-admission philosophy."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "Per-agent constraints as specified in CA-11-E align perfectly with §22 Product-Agnostic Rule's metadata-driven architecture. The agentToolConstraints field in ProductRegistry allows CEO control without violating the zero-code-changes principle, as demonstrated in CA-11-E.2."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "Medium-finding + continue matches the graceful degradation pattern established in §6's resolution contract where issues reach terminal decisions without necessarily halting execution. CA-11-A.4's audit-log topic 'agent.tool_selection.exhausted.v1' provides visibility while allowing the pipeline to complete."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "All five sub-amendments form a coherent capability that depends on each other: CA-11-A's selection model requires CA-11-B's tool lists, CA-11-C's schema extension, CA-11-D's ranking extension, and CA-11-E's constraint mechanism. The engineering scope estimate of ~13 W-days confirms this is implementable as a unit."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "CA-11 extends the existing Orchestra framework to per-agent granularity while maintaining canonical patterns. The amendment respects all Locked Rules, particularly Rule 18's ranking formula and Rule 2's 26-agent roster lock."
}
```

---

### Slot 2 — openrouter:anthropic/claude-opus-4

- Provider: `openrouter`
- Latency: 58878 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "The ≥3 entries threshold strikes the right balance between redundancy and practicality. CA-11-C.2 validator enforces this across all 26 agents, and CA-11-B demonstrates feasibility by populating every agent's ToolMenu with 3+ entries, including niche agents like Agent #16 Productivity/HR."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "Pre-step ranking aligns with the existing Locked Rule 18 formula and CA-11-D.3's per-agent score tracking mechanism. Real-time adaptation would add complexity without clear benefit, as the fallback chain in CA-11-A.4 already provides resilience through sequential tool attempts."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "Flat ToolMenu for cross-step agents maintains consistency with the schema in CA-11-C.1 where toolMenu is a simple array. CA-11-B.10 successfully assigns flat menus to all cross-step agents (#11, #12, #14, #17, #19, #20), demonstrating this approach works without stepKey conditioning."
    },
    "CA-11-Q4": {
      "pick": "(a)",
      "rationale": "Quarterly automated updates via Agent #26 (Orchestra Research Agent) align with its charter in §15.1 and CA-9-B's auto-admission mechanism. This maintains the canonical SSOT's living-document nature while avoiding excessive Panel overhead, consistent with §8.1's auto-admission philosophy."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "Per-agent constraints as specified in CA-11-E align perfectly with §22 Product-Agnostic Rule's metadata-driven architecture. The agentToolConstraints field in ProductRegistry allows CEO control without violating the zero-code-changes principle, as demonstrated in CA-11-E.2."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "Medium-finding + continue matches the graceful degradation pattern established in §6's resolution contract where issues reach terminal decisions without necessarily halting execution. CA-11-A.4's audit-log topic 'agent.tool_selection.exhausted.v1' provides visibility while allowing the pipeline to complete."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "All five sub-amendments form a coherent capability that depends on each other: CA-11-A's selection model requires CA-11-B's tool lists, CA-11-C's schema extension, CA-11-D's ranking extension, and CA-11-E's constraint mechanism. The engineering scope estimate of ~13 W-days confirms this is implementable as a unit."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "CA-11 extends the existing Orchestra framework to per-agent granularity while maintaining canonical patterns. The amendment respects all Locked Rules, particularly Rule 18's ranking formula and Rule 2's 26-agent roster lock."
}
```

---

### Slot 3 [BACKUP FIRED] — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 24891 ms
- HTTP status: OK
- Primary that failed: `openrouter:openrouter:google/gemini-2.5-pro` (error: unparseable JSON envelope)

```
{
  "reviewer_slot": 7,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": { "pick": "(a)", "rationale": "The proposed threshold of ≥3 entries per agent strikes a good balance between coverage and charter discipline, ensuring that each agent has sufficient tools while maintaining a manageable list." },
    "CA-11-Q2": { "pick": "(a)", "rationale": "Pre-step ranking is deterministic and cost-effective, aligning with the current design and ensuring that tool selection is consistent and reliable throughout the pipeline steps." },
    "CA-11-Q3": { "pick": "(a)", "rationale": "A flat ToolMenu simplifies the schema and ensures that cross-step agents have a consistent set of tools available, reducing complexity and potential errors." },
    "CA-11-Q4": { "pick": "(b)", "rationale": "Freezing the tool list at promotion ensures stability and predictability, while allowing for explicit amendments through the CA-n process to update the list as needed." },
    "CA-11-Q5": { "pick": "(a)", "rationale": "Per-agent constraints provide a straightforward and effective mechanism for CEOs to set cost, budget, and policy constraints at the agent level, simplifying the constraint application process." },
    "CA-11-Q6": { "pick": "(a)", "rationale": "Logging a medium-severity finding and continuing the run with degraded output ensures that the pipeline can still complete, providing valuable insights even if some tools fail." },
    "CA-11-Q7": { "pick": "(a)", "rationale": "Promoting all five sub-amendments together ensures that the complete capabilities of CA-11 are integrated cohesively, providing a comprehensive solution for agent self-orchestration and per-agent tool intelligence." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The proposed amendments in CA-11 are well-aligned with the existing SSOT and provide a robust framework for agent self-orchestration and tool intelligence."
}
```

---

### Slot 4 — openrouter:mistralai/mistral-large-2411

- Provider: `openrouter`
- Latency: 24053 ms
- HTTP status: OK

```
```json
{
  "reviewer_slot": 5,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "The current threshold of ≥3 entries per agent is a balanced approach. It ensures a minimum level of redundancy while allowing for niche agents with fewer tool options. This threshold is practical and maintains charter discipline."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "Pre-step ranking is deterministic and computationally cheap. It aligns with the draft's recommendation and ensures that the tool selection process is straightforward and efficient."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "A flat ToolMenu for cross-step agents simplifies the schema and maintains consistency. It avoids the complexity of step-conditional menus, which could introduce unnecessary overhead."
    },
    "CA-11-Q4": {
      "pick": "(a)",
      "rationale": "Quarterly automated updates via Agent #26, #11, and #15 ensure that the tool lists remain current with industry standards. This approach balances flexibility with the need for regular updates."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "Per-agent constraints provide a focused and manageable scope for CEO oversight. It allows for granular control without introducing excessive complexity in the constraint application process."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "Treating fallback failure as a medium-severity finding allows the run to continue with degraded output, which is practical and non-blocking. It aligns with the draft's recommendation for handling such scenarios."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "Promoting all five sub-amendments together ensures a coherent and comprehensive introduction of the agent self-orchestration and per-agent tool intelligence capabilities."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```
```

---

### Slot 5 — openrouter:cohere/command-r-plus-08-2024

- Provider: `openrouter`
- Latency: 54628 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "The proposed threshold of ≥3 entries per agent is a reasonable balance between coverage and charter discipline. It ensures that each agent has a sufficient number of tools to choose from, while also maintaining a manageable list for validation. This threshold is in line with the W3 recommendation and is a practical choice for the current state of the system."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "Pre-step ranking is a deterministic and cost-effective approach that aligns with the W3 recommendation. It ensures that the tool selection is made before the step begins, allowing for a more efficient and predictable process. Real-time adaptive ranking, while potentially useful in certain scenarios, may introduce additional complexity and cost, especially for niche agents like #16 Productivity / HR. Therefore, adopting the pre-step ranking as proposed is a more practical and efficient choice."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "A flat ToolMenu for cross-step agents is a simpler and more straightforward approach, as it avoids the need for stepKey-conditional menus. This design choice reduces the complexity of the schema and makes it easier to manage and validate. While stepKey-conditional menus may offer more flexibility, they also introduce additional complexity and potential for errors. Therefore, adopting a flat ToolMenu for cross-step agents is a more practical and maintainable choice."
    },
    "CA-11-Q4": {
      "pick": "(b)",
      "rationale": "Updating the industry tool list quarterly via Agent #26, #11, and #15 is a practical and efficient approach that ensures the list stays current without requiring frequent Panel reviews. This approach strikes a balance between maintaining an up-to-date list and avoiding unnecessary overhead. Frozen lists at promotion time may become outdated quickly, and Panel-reviewed changes for every addition/removal could be cumbersome. Therefore, the proposed quarterly automated update is a more efficient and sustainable solution."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "Per-agent constraints provide a straightforward and manageable way to set cost, budget, and policy parameters at the agent level. This granularity is sufficient for most use cases and aligns with the W3 recommendation. Per-step constraints, while potentially useful in certain scenarios, introduce additional complexity and may not be necessary for all agents. Per-product constraints, while offering the most flexibility, could lead to a complex and hard-to-manage system. Therefore, adopting per-agent constraints as proposed is a more practical and manageable choice."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "Surfacing the failure as a medium-severity finding and continuing the run is a reasonable approach that allows the system to proceed with degraded output. This option maintains the system's functionality and provides a clear indication of the issue without halting the entire pipeline. Human-gating and critical-halting, while potentially useful in certain scenarios, may introduce unnecessary complexity and overhead. Therefore, adopting the proposed medium-finding and continue approach is a more practical and efficient choice."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "Promoting all five sub-amendments together is a logical and efficient approach that ensures the system remains consistent and coherent. Splitting the amendments could introduce potential inconsistencies and require additional coordination. Therefore, adopting the proposed approach of promoting all five sub-amendments together is a more practical and manageable choice."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The CA-11 amendment draft is well-structured and addresses important aspects of agent self-orchestration and per-agent tool intelligence. The proposed changes enhance the system's flexibility, adaptability, and performance, while maintaining a clear and manageable structure. The draft is comprehensive and provides a solid foundation for further development and refinement."
}
```

---

### Slot 6 — openrouter:minimax/minimax-m2.7

- Provider: `openrouter`
- Latency: 52839 ms
- HTTP status: OK

```
{
  "reviewer_slot": 3,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "The ≥3 entries minimum in CA-11-C.2 validator is a reasonable engineering floor that balances coverage breadth against the practical constraint that some agents (e.g., Agent #16 Productivity/HR or Agent #22 Ops Runner Beta with TBD step assignments per Rev-2.1 §27 OQ-2) cannot credibly populate 5 entries today. Tightening to ≥5 would create validator failures for placeholder agents before their step bindings are canonicalised. Option (a) matches W3's explicit recommendation."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "The pre-step ranking algorithm in CA-11-A.3 is canonical as written and aligns with the Orchestra Integration Spec §4.2 approach to rolling outcome scores. Pre-step ranking is deterministic, cheap to compute, and avoids introducing latency jitter mid-step. The canonical SSOT does not prescribe real-time adaptive re-ranking; CA-11-A.4 retryable-error patterns (429, 5xx, timeout) already provide a clean failure-to-next mechanism without adding in-run re-ranking complexity."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "CA-11-B.10 explicitly assigns flat ToolMenus to cross-step agents (#11 Strategic Intelligence, #12 Portfolio Risk, #14 Public Policy, #17 Product Evolution, #19 Technological Evolution, #20 Environmental Impacts). A stepKey-conditional schema (option b) would require a structural change to the `toolMenu` field shape — from `readonly ToolEntry[]` to `readonly { [stepKey: string]: ToolEntry[] }` — which cascades into `selectTool()` algorithm changes (CA-11-A.3), validator logic (CA-11-C.2), and Supabase schema extensions. The flat model matches the simpler schema design intent of CA-11-A and the Rev-2.1 §15.2 MessageBus interaction pattern."
    },
    "CA-11-Q4": {
      "pick": "(a)",
      "rationale": "CA-11-D extends Locked Rule 18 with per-agent score tracking via Agent #26 + #11 + #15, explicitly referencing the CA-9-A self-expansion and CA-9-B charter expansions as the canonical mechanism. The §8.1 auto-admission pipeline already requires Agent #26 to maintain a seed evaluation list with quarterly re-scoring cadence. Locked Rule 16 mandates continuous marketplace intelligence. Option (a) aligns with the draft's own §15.1 row 26 charter consuming `vendor.changelog.poll.v1` — a signal designed for automated periodic polling, not ad-hoc Panel review. The commit `1a020f7` anchor confirms the quarterly cadence is intentional."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "CA-11-E.1 defines `AgentToolConstraints` at the per-agent level as the canonical constraint unit. Per Rev-2.1 §22 Product-Agnostic Rule, all constraints live in metadata (Supabase `flowai_product_config` or Doppler vault) with zero code changes — the per-agent level is the coarsest granularity that preserves this property. Per-step constraints (b) would require step-key routing in the metadata schema; per-product only (c) would collapse to a blanket block/allow for the entire tenant. The draft's explicit rationale for option (a) is the simple model — and CA-11-A.3 algorithm already handles the blocked-all edge case cleanly at the per-agent level."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "The §12 severity routing table classifies `medium` as the highest severity eligible for fork-and-fix auto-deploy without a human gate. Exhausted fallback returning a medium finding is consistent with this model — it is a degraded-output signal, not a blocking violation. Critical-halt (c) is reserved for `xss-in-form-echo` and `auth-gate-leak` per ENTRY 006 escalation rules in §15.1 row 21, not tool-exhaustion scenarios. Human gate (b) applies to `high`/`critical` severity per §10.2 — medium is below that threshold. CA-11-A.4 explicitly returns `{ok: false, error: 'all_tools_exhausted'}` without throwing, confirming non-halt behaviour."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "CA-11-A (OrchestratorHub.selectTool() algorithm), CA-11-B (all 26 agent ToolMenus), CA-11-C (schema + validator), CA-11-D (Locked Rule 18 extension), and CA-11-E (CEO constraint metadata) are tightly coupled: the validator in CA-11-C.2 enforces ≥3 entries referenced by CA-11-B; the selection algorithm in CA-11-A.3 reads the schema produced by CA-11-C.1; the per-agent score tracking in CA-11-D.3 writes to the `flowai_agent_tool_outcome` table created by CA-11-C's Supabase migration; CEO constraints in CA-11-E feed into CA-11-A.3's constraint-filtering step. Splitting B from A, or D from A, breaks the end-to-end contract. The co-sequencing section confirms CA-11 is independent of prior CAs and introduces no new blockers."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "All seven answers align with the draft's own W3 recommendations and the canonical SSOT Rev-2.1 architecture. CA-11-Q4 option (a) draws directly from the CA-9-A/CA-9-B charter expansion lineage (Agent #26 + #11 + #15 tri-agent maintenance role); CA-11-Q6 option (a) is consistent with §12 severity routing and ENTRY 006 escalation rules for Agent #21."
}
```

---

### Slot 7 — openrouter:deepseek/deepseek-r1

- Provider: `openrouter`
- Latency: 90226 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": {
      "pick": "(a)",
      "rationale": "CA-11-C.2 validator explicitly mandates ≥3 ToolMenu entries per agent per the draft specification. This balances redundancy with practical constraints for niche agents like #16, avoiding the overcomplication of option (c)."
    },
    "CA-11-Q2": {
      "pick": "(a)",
      "rationale": "CA-11-A.3 algorithm specifies pre-step ranking via OrchestratorHub.selectTool(), with fallback handling in §A.4. Real-time adaptation would violate the deterministic design and increase complexity without documented justification."
    },
    "CA-11-Q3": {
      "pick": "(a)",
      "rationale": "CA-11-B.10 assigns cross-step agents (#11, #14, etc.) flat ToolMenus without stepKey-conditionality. Introducing per-step variations would contradict the schema simplicity prioritized in CA-11-C and require unratified validator changes."
    },
    "CA-11-Q4": {
      "pick": "(a)",
      "rationale": "CA-11-D.2 Locked Rule 18 extension mandates quarterly updates via Agent #26, #11, and #15 per the automated pipeline described in CA-9-A/B. This aligns with Orchestra self-expansion mechanics in §8.1."
    },
    "CA-11-Q5": {
      "pick": "(a)",
      "rationale": "CA-11-E.1 defines constraints solely at the agentId level in ProductRegistry metadata. Granular per-step or per-product constraints aren't proposed and would violate §22's zero-code-change principle for new tenants."
    },
    "CA-11-Q6": {
      "pick": "(a)",
      "rationale": "CA-11-A.4 fallback failure emits 'all_tools_exhausted' but doesn't prescribe agent behavior. Option (a) follows W3's recommendation cited in the draft, treating it as a medium-severity non-blocking issue per §6 resolution semantics."
    },
    "CA-11-Q7": {
      "pick": "(a)",
      "rationale": "CA-11-Q7 explicitly recommends promoting all five sub-amendments (A-E) as a coherent unit. Splitting would fracture interdependent mechanisms like ToolMenu schema (C) and CEO constraints (E) tied to the selection model (A)."
    }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```

---

### Slot 8 — openrouter:perplexity/sonar

- Provider: `openrouter`
- Latency: 11321 ms
- HTTP status: OK

```
{"reviewer_slot":1,"engagement":"ENGAGED","answers":{"CA-11-Q1":{"pick":"(a)","rationale":"CA-11-C explicitly proposes a validator minimum of ≥3 entries per agent, and the draft frames this as the workable baseline for all 26 agents. That matches Rev-2.1 §22’s product-agnostic/metadata-driven pattern: the mechanism should be uniform and avoid special-case code paths."},"CA-11-Q2":{"pick":"(a)","rationale":"CA-11-A.4 defines fallback from a precomputed ranked list, and CA-11-A.3 shows `selectTool()` happening before dispatch. This keeps the selection deterministic and consistent with Locked Rule 18’s canonical ranking model rather than making the runtime path unstable."},"CA-11-Q3":{"pick":"(a)","rationale":"CA-11-B.10 gives cross-step agents a flat ToolMenu, and CA-11-A.3/CA-11-C.3 are written around a single ranked list. A flat menu also aligns with §15.2’s message-bus simplicity and avoids adding schema branching where the draft does not require it."},"CA-11-Q4":{"pick":"(a)","rationale":"CA-11-Q4 is directly answered in CA-11-B and CA-11-E: quarterly automated refresh via Agent #26 + #11 + #15 is the drafted canonicalization cadence. That fits the CA-9-B/CA-9-A quarterly re-score model and preserves CA-n amendment discipline without forcing W6 review on every routine tool update."},"CA-11-Q5":{"pick":"(a)","rationale":"CA-11-E.1 and CA-11-E.2 define `agentToolConstraints` at the agent level, with per-product metadata storage but not per-step scoping. This is the cleanest fit for §22 Product-Agnostic Rule because it keeps constraints as runtime metadata rather than introducing extra structural dimensions."},"CA-11-Q6":{"pick":"(a)","rationale":"CA-11-A.4 says exhausted fallback returns `ok: false` and CA-11-Q6 explicitly describes that as a medium-finding while the run continues. That behavior is consistent with §6’s terminal-decision philosophy and avoids turning a tool-routing miss into a pipeline-wide hard stop."},"CA-11-Q7":{"pick":"(a)","rationale":"The five sub-amendments are mutually reinforcing: CA-11-A defines the mechanism, CA-11-B supplies the menus, CA-11-C adds schema/validation, CA-11-D extends Locked Rule 18, and CA-11-E adds the CEO constraint layer. Splitting them would leave the feature set partially canonicalized and weaken the end-to-end contract the draft is trying to establish."}},"conflicts_with_ssot":[],"overall_notes":"The draft is internally coherent and largely aligned with Rev-2.1’s metadata-driven and audit-log-heavy architecture. No direct conflict with the canonical SSOT is apparent from the provided text; the main choice is whether to promote the bundle as a unit or serialize it by dependency."}
```

---

### Slot 9 — openrouter:meta-llama/llama-4-maverick

- Provider: `openrouter`
- Latency: 9401 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": { "pick": "(a)", "rationale": "The ≥3 entries per agent threshold strikes a balance between coverage and charter discipline, as seen in CA-11-B where most agents have 3+ tools listed." },
    "CA-11-Q2": { "pick": "(a)", "rationale": "Pre-step ranking is deterministic and computationally efficient, aligning with the W3 recommendation and existing Locked Rule 18 formula application in §8." },
    "CA-11-Q3": { "pick": "(a)", "rationale": "Flat ToolMenu for cross-step agents simplifies the schema and aligns with W3's recommendation, as seen in CA-11-B.10 where cross-step agents are assigned a flat ToolMenu." },
    "CA-11-Q4": { "pick": "(b)", "rationale": "Freezing the lists at promotion time maintains canonical stability, requiring explicit CA-n amendments for updates, which aligns with the proposed Locked Rule 17 discipline." },
    "CA-11-Q5": { "pick": "(a)", "rationale": "Per-agent constraints as proposed in CA-11-E provide a simple yet effective model for CEO control, with the granularity being sufficient for most use cases as demonstrated in the draft." },
    "CA-11-Q6": { "pick": "(a)", "rationale": "Logging a medium-severity finding and continuing the run as drafted in CA-11-A.4 is non-blocking and aligns with the W3 recommendation, allowing for degraded output rather than halting the entire run." },
    "CA-11-Q7": { "pick": "(a)", "rationale": "Promoting all five sub-amendments together maintains coherence and aligns with the recommendation, as CA-11-A through CA-11-E form a cohesive capability enhancement." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": "The responses are based on the provided CA-11 draft and canonical reference, with rationales citing specific sub-amendments and sections."
}
```

---

### Slot 10 — openrouter:x-ai/grok-4.3

- Provider: `openrouter`
- Latency: 18576 ms
- HTTP status: OK

```
{
  "reviewer_slot": 1,
  "engagement": "ENGAGED",
  "answers": {
    "CA-11-Q1": { "pick": "(a)", "rationale": "The draft explicitly sets the validator threshold at ≥3 entries per agent in CA-11-C.2 (extending validateRosterPartition() and validateExecutors()). This balances coverage with charter discipline while satisfying the minimum for fallback chains in CA-11-A.4." },
    "CA-11-Q2": { "pick": "(a)", "rationale": "CA-11-A.3 defines the canonical selection algorithm as pre-step ranking via OrchestratorHub.selectTool() before dispatchWithFallback(), applying Locked Rule 18 once per invocation. This keeps the process deterministic and cheap per the proposed model." },
    "CA-11-Q3": { "pick": "(a)", "rationale": "CA-11-B.10 assigns flat ToolMenus to all cross-step agents (#11, #12, #14, #17, #19, #20) without stepKey conditioning. The schema extension in CA-11-C.1 stores a single ranked array, keeping the model simple." },
    "CA-11-Q4": { "pick": "(a)", "rationale": "CA-11-B explicitly calls for quarterly automated refresh via Agent #26 (Orchestra Research) + #11 (Strategic Intelligence) + #15 (Benchmarking) per their expanded charters in CA-9-B and §8.1 auto-admission. This is reinforced by the commit hash 1a020f7 lineage." },
    "CA-11-Q5": { "pick": "(a)", "rationale": "CA-11-E.1–E.2 places constraints at the per-agent level inside ProductRegistry.agentToolConstraints metadata, preserving the §22 Product-Agnostic Rule with zero code changes. The mechanism is deliberately scoped to agentId only." },
    "CA-11-Q6": { "pick": "(a)", "rationale": "CA-11-A.4 caps fallback at min(toolMenu.length, 3) and returns a medium-severity finding with degraded output when exhausted, emitting agent.tool_selection.exhausted.v1. This keeps the run non-blocking per the drafted failure handling." },
    "CA-11-Q7": { "pick": "(a)", "rationale": "All five sub-amendments (CA-11-A through CA-11-E) form one coherent capability extending §15.5, Locked Rule 18, and §8, with no internal contradictions in the draft. Promotion as a unit aligns with the single-commit 1a020f7 scope." }
  },
  "conflicts_with_ssot": [],
  "overall_notes": ""
}
```
