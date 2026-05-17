# Cluster F — Model-Budget Fallback (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** Rev-2.1 Locked Rule 8 (LLM model standard: "pipeline steps use claude_sonnet_4_6 by default; cost-aware budgeting required (§7 of Orchestra spec)"); CA-11-A.4 `dispatchWithFallback` (canonical fallback mechanism); Orchestra Integration Spec §4.2 rolling-outcome-score machinery + §7.1 cost-ledger.
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #10 (third-party overreliance) + Batch 2 objection #10 (LLM overreliance).

---

## §1 — Problem Statement

The 18-agent consolidated Panel surfaced **model-budget-fallback under-specification**. Agent specs reference Claude / GPT budgets without naming fallback adapters when the primary model is unavailable / over-budget / rate-limited.

### Verbatim Panel quotes

**Batch 1 objection #10 (Slot 3):**
> The proposal relies heavily on third-party tools and services, which could lead to vendor lock-in and make it difficult to switch to alternative solutions if needed.

**Batch 2 objection #10 (Slot 3):**
> The proposal relies heavily on Large Language Models (LLMs) for various tasks, which could lead to biases or errors in the system. For instance, §15.3 mentions the use of LLMs for benchmarking, but does not provide any information about how to mitigate potential biases.

**Adjacent concerns (Batch 1 #04, #07 — Cluster A budget enforcement):**
Cost cap + fallback are tightly coupled. When primary model exceeds per-product budget, agent SHOULD fall back to cheaper alternative rather than hard-fail.

### Affected scope

Every agent that invokes an LLM (which is essentially all 18 dormant agents — Research, Quality Audit, Design, GTM, Monitor, Strategic Intelligence, Public Policy, Benchmarking, Productivity, Product Evolution, Business Planning, Tech Evolution, Environmental, Portfolio Risk, Self-Protection, Cost Governor, Orchestra Research). Without canonical fallback chain, agents either:

- (a) Hardcode primary model name → vendor lock-in + brittle to model deprecation.
- (b) Hardcode fallback chain inconsistently per agent → operator-facing UX surprise.
- (c) Hard-fail on primary unavailable → no fallback → run aborts unnecessarily.

### Why this blocks engineering dispatch

Without canonical fallback chain: deprecation of any LLM model (Anthropic sunsets `claude_sonnet_4_6`, OpenAI deprecates `gpt-5`, etc.) breaks N agents simultaneously. With Locked Rule 8 specifying `claude_sonnet_4_6 as default` but no fallback path, the system fails open to vendor decisions outside operator control.

---

## §2 — Canonical Resolution

**A canonical 3-tier model selection chain (primary → fallback → final fallback) read from Doppler at every LLM dispatch.** Every agent that calls an LLM MUST use this pattern — NEVER hardcode a model name in agent code.

### §2.1 — Canonical 3-tier selection order

Per every LLM dispatch:

1. **Primary:** `FLOWAI_PRIMARY_MODEL` from Doppler at path `flowai/<env>/FLOWAI_PRIMARY_MODEL`.
2. **Fallback:** `FLOWAI_FALLBACK_MODEL` from Doppler at path `flowai/<env>/FLOWAI_FALLBACK_MODEL`.
3. **Final fallback (hardcoded canonical):** `claude-sonnet-4-6` (per Locked Rule 8).

Selection logic:
- Read `FLOWAI_PRIMARY_MODEL` at dispatch time (NOT at agent construction; the value may change between runs).
- If empty / missing → fall back to `FLOWAI_FALLBACK_MODEL`.
- If `FLOWAI_FALLBACK_MODEL` also empty / missing → fall back to hardcoded `claude-sonnet-4-6`.
- The hardcoded canonical anchors the system to Locked Rule 8's default; even if operator misconfigures Doppler, behavior is well-defined.

### §2.2 — Per-dispatch failure fallback (orthogonal to §2.1)

When the selected model is unavailable mid-dispatch (provider 5xx / 429 / timeout / context-window exhausted), the existing `dispatchWithFallback` mechanism (CA-11-A.4) is invoked. The mechanism:

1. Tries the agent's primary adapter (e.g. `anthropic-api`).
2. On failure → tries the next ToolMenu entry per `CA-11-B.<n>` per-agent ToolMenu.
3. Records each attempt in the per-agent dispatch trace.

This is the EXISTING mechanism; Cluster F does NOT change it. Cluster F adds the upstream model-selection step (§2.1) that feeds INTO `dispatchWithFallback`.

### §2.3 — Combined dispatch sequence

```pseudocode
// Canonical pattern in every LLM-calling agent

// Step 1: model selection per §2.1
const primaryModel =
  await readDoppler('FLOWAI_PRIMARY_MODEL') ||
  await readDoppler('FLOWAI_FALLBACK_MODEL') ||
  'claude-sonnet-4-6';

// Step 2: prepare dispatch with selected model
const dispatchOpts = {
  ...opts,
  modelId: primaryModel,
};

// Step 3: dispatch with CA-11-A.4 fallback chain
const result = await dispatchWithFallback(
  agentToolMenu,         // per CA-11-B.<n> per-agent ToolMenu
  capability,            // 'analyze' | 'summarize' | ...
  payload,
  dispatchOpts,
);

// Step 4: record which model + adapter actually answered
emit('agent.model.fallback.v1', {
  runId, productId, agentId,
  requestedModel: primaryModel,
  actualModel: result.modelUsed,
  actualAdapter: result.adapterUsed,
  fallbackOccurred: result.modelUsed !== primaryModel,
  attemptChain: result.attemptChain,        // ordered list of [adapter, modelId, outcome]
  at: ISO8601,
});
```

### §2.4 — Canonical fallback envelope

**Topic:** `agent.model.fallback.v1`

**Payload shape:**
```ts
{
  runId: string,
  productId: string,
  agentId: number,
  requestedModel: string,                   // e.g. 'gpt-5'
  actualModel: string,                       // e.g. 'claude-sonnet-4-6' (final fallback)
  actualAdapter: string,                     // e.g. 'anthropic-api', 'openrouter:perplexity/sonar'
  fallbackOccurred: boolean,                 // true when actualModel !== requestedModel
  attemptChain: Array<{
    adapter: string,
    modelId: string,
    outcome: 'success' | '5xx' | '429' | 'timeout' | 'context-exhausted' | 'unavailable',
    durationMs: number,
  }>,
  pipelineMode: 1 | 2 | '3A',                // per Cluster C §2.4
  at: ISO8601,
}
```

Emitted on EVERY dispatch (not just when fallback occurred) — provides full observability of model selection. Cost dashboards aggregate by `requestedModel` vs `actualModel` to detect operator-misconfigured Doppler or systemic outage patterns.

### §2.5 — Operator override per product

Operators can override per-product via `ProductRegistry.modelSelectionOverride` JSONB:

```json
{
  "modelSelectionOverride": {
    "primary": "anthropic/claude-opus-4-7",
    "fallback": "openrouter/google/gemini-2.5-pro",
    "final": "claude-sonnet-4-6"
  }
}
```

When operator override is present, it takes precedence over Doppler values for that product's invocations. Override is admin-editable per §13; edits are audit-logged per §14.

### §2.6 — Interaction with cost ceiling (Cluster A)

Each model in the selection chain has a cost-tier per Locked Rule 18:
- `free` (e.g. some local models) / `low` / `medium` / `high` / `enterprise`

Before dispatch, Agent #23 Cost Governor's `reserve()` call (Cluster A §2.3) checks budget for the SELECTED model. If primary is `enterprise`-tier and over budget → `reserve()` returns `{ok: false}` → agent re-selects with fallback model (which should be lower cost-tier) → re-attempts `reserve()`. This loop is bounded (3 attempts max; final fallback always succeeds if any budget remains).

### §2.7 — Forbidden patterns

The following patterns are EXPLICITLY forbidden in agent code:

- `const modelId = 'claude-sonnet-4-6'` (hardcoded model name in agent logic — violates §2.1)
- `if (anthropicAvailable) modelId = 'claude-...' else modelId = 'gpt-...'` (per-agent fallback logic — violates §2.2 single-mechanism principle)
- Reading `FLOWAI_PRIMARY_MODEL` at agent construction time only (must be re-read per dispatch per §2.1)

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §6 Implementation Plan / §7 Security Controls of every LLM-calling agent spec

````markdown
### §7.X — Model selection + fallback (canonical per CLUSTER_F_MODEL_BUDGET_FALLBACK.md)

This agent's LLM dispatches MUST use the canonical 3-tier selection chain:

1. `FLOWAI_PRIMARY_MODEL` from Doppler `flowai/<env>/FLOWAI_PRIMARY_MODEL`.
2. `FLOWAI_FALLBACK_MODEL` from Doppler `flowai/<env>/FLOWAI_FALLBACK_MODEL`.
3. Hardcoded final fallback: `claude-sonnet-4-6` (per Locked Rule 8).

Selection is re-read PER DISPATCH (not cached at agent construction).

Operator per-product override per `ProductRegistry.modelSelectionOverride`
takes precedence when present.

Dispatch then goes through `dispatchWithFallback` (CA-11-A.4) using this
agent's ToolMenu per CA-11-B.<n>. The combined sequence is the Cluster F §2.3
pattern.

Forbidden in this agent's implementation:
- Hardcoded model name in agent logic (e.g. `'claude-sonnet-4-6'` literal
  in agent code outside the final-fallback constant)
- Per-agent fallback logic (`if anthropic else openai`) — use Cluster F
  selection chain + CA-11-A.4 only.
- Caching `FLOWAI_PRIMARY_MODEL` at agent construction (must re-read per
  dispatch).

This agent emits `agent.model.fallback.v1` per Cluster F §2.4 on every
dispatch (not just fallback events) for full observability.
````

### §3.2 — Block to paste into §4 Output Contract (cross-cluster envelope)

````markdown
**Model-selection envelope (canonical per Cluster F §2.4):**
`agent.model.fallback.v1` — emitted on EVERY LLM dispatch. Payload per
Cluster F §2.4. Cost dashboards aggregate by `requestedModel` vs
`actualModel` for operator + admin observability.
````

### §3.3 — Block to paste into §9 Acceptance Criteria

````markdown
- **AC-MF-N** — Given `FLOWAI_PRIMARY_MODEL` Doppler value is set to
  `gpt-5`, this agent's dispatch attempts `gpt-5` FIRST; on `gpt-5`
  failure (mocked 429), falls back per CA-11-A.4 ToolMenu chain.
- **AC-MF-N+1** — Given `FLOWAI_PRIMARY_MODEL` AND `FLOWAI_FALLBACK_MODEL`
  Doppler values are both empty: agent uses hardcoded `claude-sonnet-4-6`
  as the final fallback per Locked Rule 8.
- **AC-MF-N+2** — `ProductRegistry.modelSelectionOverride.primary` takes
  precedence over Doppler `FLOWAI_PRIMARY_MODEL` per Cluster F §2.5.
  Verify by per-product override integration test.
- **AC-MF-N+3** — `agent.model.fallback.v1` emitted on EVERY dispatch
  (success or failure); `attemptChain` records every adapter/model
  attempt with outcome + duration.
- **AC-MF-N+4** — No hardcoded model name appears in agent code outside
  the final-fallback constant. CI grep guard:
  `grep -E "['\"](claude|gpt|gemini|sonar|opus)-?\\d" src/lib/agents/agents/`
  must return zero hits except for the canonical final-fallback constant
  location.
````

---

## §4 — Acceptance Criteria

How W2 verifies the Cluster F fix is correctly implemented across agent specs.

1. **AC-CF-1 (Spec-level coverage):** Every LLM-calling agent spec contains the Cluster F §3.1 block in §7. Specs without it are non-conformant.

2. **AC-CF-2 (Doppler-first ordering):** Implementation test (deferred) — when `FLOWAI_PRIMARY_MODEL` is set, dispatch uses that model FIRST; the Doppler read happens PER DISPATCH (not cached).

3. **AC-CF-3 (Final-fallback canonical):** When both Doppler values empty AND no operator override, dispatch uses `claude-sonnet-4-6` (per Locked Rule 8); this is the only allowed hardcoded model name in the canonical code path.

4. **AC-CF-4 (Operator override precedence):** `ProductRegistry.modelSelectionOverride` takes precedence over Doppler for that product's invocations.

5. **AC-CF-5 (Envelope schema):** `agent.model.fallback.v1` payload validates against §2.4 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

6. **AC-CF-6 (No hardcoded model names):** CI grep guard rejects PRs that introduce hardcoded model names outside the canonical final-fallback constant.

7. **AC-CF-7 (Cluster A interaction):** When primary model fails Cluster A `reserve()` due to enterprise-tier cost > budget, agent re-selects with fallback model (lower cost-tier) and re-attempts; max 3 reservation attempts before giving up.

---

## §5 — Affected Agents

Every LLM-calling agent. Across the 18 dormant agents, every one calls an LLM at some point:

| Agent | LLM dispatch use | Cluster F revision required |
|---:|---|---|
| #6 Research | Five-Layer classification prompt | YES |
| #7 Design Phase 1 | Design spec generation prompt | YES |
| #7 Design Phase 2 (Executor) | v0/Lovable/Bolt.new dispatch (NOT through Cluster F — these are not LLMs) | NO (non-LLM adapters) |
| #8 Quality Audit | 5-dim scoring prompts (5 parallel calls) | YES |
| #9 Go-to-Market | GTM readiness analysis prompt | YES |
| #10 Monitor | Sentiment classification per feedback | YES |
| #11 Strategic Intelligence | Candidate classification prompt | YES |
| #12 Portfolio Risk | Cross-product risk analysis prompt | YES |
| #13 Self-Protection | Threat classification + DMCA letter generation prompts | YES |
| #14 Public Policy | Regulatory compliance check prompt | YES |
| #15 Benchmarking | Rubric scoring (LLM judge) | YES |
| #16 Productivity / HR | Workflow bottleneck analysis prompt | YES |
| #17 Product Evolution | Evolution proposal generation prompt | YES |
| #18 Business Planning | Strategic recommendation prompt | YES |
| #19 Technological Evolution | CVE classification prompt | YES |
| #20 Environmental Impacts | Carbon impact estimation prompt | YES |
| #22/#24/#25 Ops Runners (BLOCKED §27 OQ-2) | TBD per role | YES once role disposed (most plausible roles involve LLM analysis) |
| #23 Cost Governor | Anomaly classification prompt | YES |
| #26 Orchestra Research | Candidate fit assessment prompt | YES |

**Total agents unblocked by this template: 19** (all dormant agents that call an LLM).

EXECUTOR_REGISTRY siblings (Self-Renewal Executor, ACE Conductor Executor, etc.) also use the Cluster F pattern for their LLM dispatches (e.g. Self-Renewal fix-generation Claude prompt per `SELF_RENEWAL_SPEC.md` §4.1).

---

## §6 — Cross-cluster integration notes

- **Cluster A** (Cost Governor): cost-tier of the SELECTED model feeds into `reserve()` budget check. Failed reservation re-selects with fallback (lower cost-tier).
- **Cluster B** (Data Quality Gate): data-quality halt happens BEFORE LLM dispatch — Cluster F selection never fires when data-quality blocks.
- **Cluster C** (Mode-Conditional Behavior): `pipelineMode` propagated to `agent.model.fallback.v1` envelope per Cluster C §2.4 for cost-attribution analytics by pipeline mode.
- **Cluster D** (Audit-Log Topic Schema): `agent.model.fallback.v1` added to §14.1 canonical catalogue per Cluster D extension.
- **Cluster E** (Authority-Ceiling): LLM dispatch goes through ceiling check FIRST (Cluster E §2.1); model selection happens after ceiling clears.

---

*End of CLUSTER_F_MODEL_BUDGET_FALLBACK.md canonical template. Pending W6 Panel ratification.*
