# Cluster F — Model-Budget Fallback (Canonical Template, v2)

**Status:** DRAFT v2 — Panel conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `9859b98`, 2026-05-16) → v2 (this commit, 2026-05-17 — Panel `PLURALITY_CLF-REVISE` 6/9 conditions R1–R3 applied per W3 Dispatch #10).
**Author:** W3.
**Anchor canonical:** Rev-2.1 Locked Rule 8 (LLM model standard: "pipeline steps use claude_sonnet_4_6 by default; cost-aware budgeting required (§7 of Orchestra spec)"); Rev-2.1 Locked Rule 18 (rank_score cost-tier weighting); CA-11-A.4 `dispatchWithFallback` (canonical fallback mechanism); Orchestra Integration Spec §4.2 rolling-outcome-score machinery + §7.1 cost-ledger.
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #10 (third-party overreliance) + Batch 2 objection #10 (LLM overreliance). **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`) — `PLURALITY_CLF-REVISE` 6/9.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — Cost-tier definitions: explicit numeric + named tier table (`free`, `low`, `medium`, `high`, `enterprise`) with USD-per-1K-token bands AND Locked Rule 18 price-weight values. §2.1.1 added.
- **R2** — Cost-tier-change handling: explicit behavior when a model's tier changes (provider re-prices) OR when the selected model's tier exceeds the per-product budget headroom mid-run. §2.5 added; interaction with Cluster A `reserve()` documented.
- **R3** — Hierarchical Doppler key structure: keys organised by tier rather than per-model — `FLOWAI_MODEL_TIER_LOW`, `FLOWAI_MODEL_TIER_MEDIUM`, etc. Allows operator to swap "which model maps to tier X" without touching every per-model key. §2.1 rewritten.

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

## §2 — Canonical Resolution (v2 — tier-keyed Doppler)

**Models are organised by cost-tier; Doppler keys map tier → model.** Agents select tier first (based on task budget / quality needs), then read the tier-mapped model from Doppler. Every agent that calls an LLM MUST use this pattern — NEVER hardcode a model name in agent code; never read per-model Doppler keys (only per-tier).

### §2.1 — Canonical tier-keyed model selection (v2 R3 — hierarchical)

**Doppler keys (per-tier, not per-model):**

```
flowai/<env>/FLOWAI_MODEL_TIER_FREE         # e.g. 'openrouter/meta-llama/llama-3.3-70b-instruct'
flowai/<env>/FLOWAI_MODEL_TIER_LOW          # e.g. 'openrouter/google/gemini-2.0-flash-001'
flowai/<env>/FLOWAI_MODEL_TIER_MEDIUM       # e.g. 'claude-sonnet-4-6'
flowai/<env>/FLOWAI_MODEL_TIER_HIGH         # e.g. 'claude-opus-4-7'
flowai/<env>/FLOWAI_MODEL_TIER_ENTERPRISE   # e.g. 'openai/gpt-5-pro-32k'

# Fallback chain (per-tier, ordered):
flowai/<env>/FLOWAI_MODEL_TIER_LOW_FALLBACK_CHAIN
  # comma-separated: 'openrouter/anthropic/claude-haiku-4-5,openrouter/google/gemini-2.0-flash-001'
flowai/<env>/FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN
  # 'openrouter/openai/gpt-4o,claude-sonnet-4-6'
# etc per tier
```

**Why tier-keyed not per-model (v2 R3):** v1's `FLOWAI_PRIMARY_MODEL` + `FLOWAI_FALLBACK_MODEL` keys conflated tier semantics with model identity — when Anthropic releases `claude-sonnet-4-7`, the operator had to manually update both the primary AND fallback if the upgrade implied tier changes. Tier-keyed structure lets operators swap "which model fulfils tier X" cleanly without disturbing per-agent code.

**Selection algorithm (per dispatch):**

```pseudocode
async function selectModel({ requestedTier, runId, productId }) {
  // 1. Per-product operator override (highest precedence)
  const override = await productRegistry.modelSelectionOverride[productId]?.[requestedTier];
  if (override) return override;

  // 2. Tier-keyed Doppler primary
  const tierKey = `FLOWAI_MODEL_TIER_${requestedTier.toUpperCase()}`;
  const primary = await readDoppler(tierKey);
  if (primary) return primary;

  // 3. Fallback chain (comma-separated Doppler value)
  const chainKey = `${tierKey}_FALLBACK_CHAIN`;
  const chain = (await readDoppler(chainKey) || '').split(',').filter(Boolean);
  for (const candidate of chain) {
    if (await modelAvailable(candidate)) return candidate;
  }

  // 4. Hardcoded final fallback (Locked Rule 8 + Cluster F §2.1.2 default-mapping table)
  return CLUSTER_F_DEFAULTS[requestedTier] || 'claude-sonnet-4-6';
}
```

**`requestedTier` selection (per-agent):**

Each agent declares its **default tier** in §6.X of its spec (typically `medium` for canonical analysis tasks). For Cluster A budget-driven downgrade (per §2.5 v2 R2), the requested tier may be lowered mid-run.

**Hardcoded canonical anchors** (Locked Rule 8 + Cluster F final fallback):

```
CLUSTER_F_DEFAULTS = {
  free:       'openrouter/meta-llama/llama-3.3-70b-instruct',
  low:        'openrouter/google/gemini-2.0-flash-001',
  medium:     'claude-sonnet-4-6',
  high:       'claude-opus-4-7',
  enterprise: 'openai/gpt-5',   // updated per Locked Rule 8 fallback ladder
};
```

These are the LAST-RESORT fallbacks when Doppler is misconfigured. The system always has a well-defined model selection even with zero Doppler keys set.

### §2.1.1 — Cost-tier definitions (v2 R1 — numeric + named)

Tiers are both NAMED (operator-facing UX) and NUMERIC (Locked Rule 18 rank_score weight). Canonical table:

| Tier name | USD per 1K input tokens (band) | USD per 1K output tokens (band) | Locked Rule 18 `price_weight` |
|---|---:|---:|---:|
| `free` | $0.0000 | $0.0000 | 1.0 |
| `low` | $0.0001 – $0.0010 | $0.0003 – $0.0030 | 0.8 |
| `medium` | $0.0011 – $0.0050 | $0.0031 – $0.0150 | 0.6 |
| `high` | $0.0051 – $0.0200 | $0.0151 – $0.0600 | 0.3 |
| `enterprise` | $0.0201+ | $0.0601+ | 0.1 |

Tier assignment per model is recorded in `src/lib/orchestra/modelTiers.js` (canonical lookup; updated when providers re-price). Re-pricing handling per §2.5 v2 R2.

`price_weight` feeds the Locked Rule 18 rank_score formula:
```
rank_score = performance × 0.6 + price_weight × 0.4
```
Lower-tier models get higher `price_weight`, biasing toward cheaper choices when performance is comparable.

### §2.1.2 — Per-agent tier defaults

Each agent declares its default tier (and tier-policy: `strict` = use exact tier always; `budget-flex` = downgrade per §2.5 if budget tight):

| Agent | Default tier | Policy |
|---|---|---|
| #6 Research | `medium` | budget-flex |
| #8 Quality Audit | `medium` | budget-flex (5 parallel; cost-sensitive) |
| #9 GTM | `medium` | budget-flex |
| #10 Monitor (sentiment) | `low` | strict (high volume) |
| #11 Strategic Intelligence | `medium` | budget-flex |
| #13 Self-Protection (threat classification) | `low` | strict |
| #14 Public Policy | `medium` | budget-flex |
| #15 Benchmarking (LLM judge) | `medium` | strict (rubric consistency) |
| #17 Product Evolution | `medium` | budget-flex |
| #19 Tech Evolution (CVE classification) | `low` | strict |
| #20 Environmental Impacts | `low` | budget-flex |
| #23 Cost Governor (anomaly classification) | `low` | strict |
| #26 Orchestra Research (candidate fit) | `medium` | budget-flex |
| (others) | per-agent spec | per-agent spec |

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

### §2.5 — Cost-tier-change handling (v2 R2)

**Two distinct change scenarios:**

**(a) Provider re-prices an already-selected model (e.g. Anthropic raises `claude-opus-4-7` from `high` to `enterprise` tier):**

- Updated tier reflected in `src/lib/orchestra/modelTiers.js` (canonical lookup) within 24h of provider announcement (Agent #19 Tech Evolution monitors vendor pricing pages per CVE-feed pattern).
- Per-product `ProductRegistry.modelSelectionOverride[productId][requestedTier]` references the model by NAME, not tier — so override is unaffected by re-pricing.
- Tier-keyed Doppler reference (`FLOWAI_MODEL_TIER_HIGH`) is unaffected — Doppler maps tier-name to model-name; if `claude-opus-4-7` re-prices to enterprise, operator should update `FLOWAI_MODEL_TIER_HIGH` to point at a new high-tier model.
- Agents currently using the re-priced model emit `agent.model.tier_changed.v1` (added to Cluster D P0 set) for observability.

**(b) Selected model's tier exceeds per-product budget headroom mid-run (Cluster A `reserve()` denied due to tier × token-estimate cost > available budget):**

The interaction with Cluster A is canonical:

```
1. Agent selects model per §2.1 → returns 'claude-opus-4-7' (high tier).
2. Agent calls costGovernor.reserve({...estimatedCostUsd based on high-tier pricing}).
3. costGovernor.reserve() returns {ok: false, reason: 'ceiling_would_be_exceeded'}.
4. If agent's tier-policy is 'strict' → agent halts; emit normal block envelope reason 'budget-cap-reached'.
5. If agent's tier-policy is 'budget-flex' → agent downgrades tier:
   a. Agent re-selects: requestedTier = 'medium' (one tier lower than 'high').
   b. Agent re-estimates cost at medium-tier pricing.
   c. Agent re-calls costGovernor.reserve() with new estimate.
   d. Cycle repeats up to 3 downgrade attempts (high → medium → low → free).
   e. If 'free' tier also denied → halt.
6. Agent emits agent.model.tier_downgraded.v1 (added to Cluster D P0 set) recording
   {requestedTier, deliveredTier, downgradeReason: 'budget'}.
```

**Tier-downgrade cap:** 3 downgrade attempts per dispatch (high → free max). Cycle is bounded to prevent infinite downgrade loops; agent halts after exhaustion.

**Per Cluster A §2.6 v2 R4 ordering:** the downgrade loop runs AFTER `getCeiling()` clears + BEFORE Orchestra dispatch — operator's ceiling check is independent of cost-tier; both must clear for dispatch to proceed.

### §2.6 — Operator override per product

Operators can override per-product per-tier via `ProductRegistry.modelSelectionOverride` JSONB:

```json
{
  "modelSelectionOverride": {
    "free":       "openrouter/meta-llama/llama-3.3-70b-instruct",
    "low":        "openrouter/google/gemini-2.0-flash-001",
    "medium":     "openrouter/anthropic/claude-sonnet-4-6",
    "high":       "claude-opus-4-7",
    "enterprise": "openai/gpt-5"
  }
}
```

When operator override is present for a tier, it takes precedence over Doppler values for that product's invocations. Override is admin-editable per §13; edits are audit-logged per §14.

### §2.7 — Forbidden patterns

The following patterns are EXPLICITLY forbidden in agent code:

- `const modelId = 'claude-sonnet-4-6'` (hardcoded model name in agent logic — violates §2.1)
- `if (anthropicAvailable) modelId = 'claude-...' else modelId = 'gpt-...'` (per-agent fallback logic — violates §2.2 single-mechanism principle)
- Reading `FLOWAI_MODEL_TIER_*` at agent construction time only (must be re-read per dispatch per §2.1)
- Reading per-model Doppler keys directly (e.g. `FLOWAI_PRIMARY_MODEL` v1 — REMOVED in v2; only tier-keyed reads allowed)

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §6 Implementation Plan / §7 Security Controls of every LLM-calling agent spec (v2)

````markdown
### §7.X — Model selection + fallback (canonical per CLUSTER_F_MODEL_BUDGET_FALLBACK.md v2)

This agent's default tier is `<medium|low|...>` per Cluster F §2.1.2 with
tier-policy `<strict|budget-flex>`.

LLM dispatches MUST use the canonical tier-keyed selection chain (v2 R3):

1. **Operator override** (highest precedence):
   `ProductRegistry.modelSelectionOverride[productId][<requestedTier>]`.
2. **Tier-keyed Doppler primary:**
   `flowai/<env>/FLOWAI_MODEL_TIER_<TIER>`.
3. **Tier-keyed Doppler fallback chain:**
   `flowai/<env>/FLOWAI_MODEL_TIER_<TIER>_FALLBACK_CHAIN`
   (comma-separated; tried in order until one is reachable).
4. **Hardcoded final-fallback** per Cluster F §2.1 `CLUSTER_F_DEFAULTS`.

Selection is re-read PER DISPATCH (not cached at agent construction).

**Cost-tier-change handling per Cluster F §2.5 v2 R2:**
- If `costGovernor.reserve()` denies due to budget, AND this agent's
  tier-policy is `budget-flex`, this agent re-selects one tier lower
  and re-attempts `reserve()`. Up to 3 downgrade attempts (high → free).
- If policy is `strict` OR all downgrades exhausted, agent halts with
  block reason `'budget-cap-reached'`.
- Each downgrade emits `agent.model.tier_downgraded.v1` for audit.

Dispatch then goes through `dispatchWithFallback` (CA-11-A.4) using this
agent's ToolMenu per CA-11-B.<n>.

Forbidden in this agent's implementation (v2):
- Hardcoded model name in agent logic
- Per-agent fallback logic (`if anthropic else openai`)
- Reading per-model Doppler keys directly (v1 `FLOWAI_PRIMARY_MODEL` is
  REMOVED in v2; tier-keyed reads only)
- Caching tier-keyed Doppler value at agent construction (must re-read
  per dispatch)

This agent emits `agent.model.fallback.v1` per Cluster F §2.4 on every
dispatch + `agent.model.tier_downgraded.v1` when downgrade occurs +
`agent.model.tier_changed.v1` when underlying tier-mapping changes (per
Cluster F §2.5 v2 R2 scenario (a)).
````

### §3.2 — Block to paste into §4 Output Contract (cross-cluster envelope)

````markdown
**Model-selection envelope (canonical per Cluster F §2.4):**
`agent.model.fallback.v1` — emitted on EVERY LLM dispatch. Payload per
Cluster F §2.4. Cost dashboards aggregate by `requestedModel` vs
`actualModel` for operator + admin observability.
````

### §3.3 — Block to paste into §9 Acceptance Criteria (v2)

````markdown
- **AC-MF-N** — Given `FLOWAI_MODEL_TIER_MEDIUM` Doppler value is set to
  `claude-sonnet-4-6`, this agent's medium-tier dispatch attempts
  `claude-sonnet-4-6` FIRST; on failure (mocked 429), falls back per
  `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` then CA-11-A.4 ToolMenu chain.
- **AC-MF-N+1** — Given tier-keyed Doppler value AND fallback chain
  Doppler value are both empty: agent uses Cluster F §2.1 hardcoded
  default for the requested tier (e.g. `claude-sonnet-4-6` for medium).
- **AC-MF-N+2** — `ProductRegistry.modelSelectionOverride[productId]
  [<requestedTier>]` takes precedence over tier-keyed Doppler. Verify
  by per-product override integration test.
- **AC-MF-N+3** — `agent.model.fallback.v1` emitted on EVERY dispatch
  (success or failure); `attemptChain` records every adapter/model
  attempt with outcome + duration.
- **AC-MF-N+4** — No hardcoded model name appears in agent code outside
  the canonical Cluster F §2.1 `CLUSTER_F_DEFAULTS` constant location.
  CI grep guard:
  `grep -E "['\"](claude|gpt|gemini|sonar|opus|llama)-?\\d" src/lib/agents/agents/`
  must return zero hits except for the CLUSTER_F_DEFAULTS source.
- **AC-MF-N+5 (v2 R2)** — Given Cluster A reserve() denies due to budget
  AND this agent's policy is budget-flex: agent downgrades tier (up to
  3 attempts); `agent.model.tier_downgraded.v1` emitted per downgrade.
  Given policy is strict: agent halts with `'budget-cap-reached'`.
- **AC-MF-N+6 (v2 R3)** — Reading non-tier-keyed Doppler keys
  (`FLOWAI_PRIMARY_MODEL`, `FLOWAI_FALLBACK_MODEL` from v1) returns null
  and triggers `MODEL_KEY_DEPRECATED[<keyName>]` CI warning. v1 keys are
  removed in v2; tier-keyed keys only.
````

---

## §4 — Acceptance Criteria (v2)

How W2 verifies the Cluster F fix is correctly implemented across agent specs.

1. **AC-CF-1 (Spec-level coverage v2):** Every LLM-calling agent spec contains the Cluster F §3.1 v2 block in §7. Specs without it are non-conformant. Spec MUST declare default tier per §2.1.2 + tier-policy.

2. **AC-CF-2 (Doppler tier-keyed ordering v2 R3):** Implementation test (deferred) — when `FLOWAI_MODEL_TIER_MEDIUM` is set to `'claude-sonnet-4-6'`, medium-tier dispatch uses `claude-sonnet-4-6` FIRST; Doppler read happens PER DISPATCH (not cached). Reading `FLOWAI_PRIMARY_MODEL` (v1 key) returns null + warning.

3. **AC-CF-3 (Hardcoded final-fallback per-tier v2):** When tier-keyed Doppler value AND fallback chain are empty, dispatch uses Cluster F §2.1 `CLUSTER_F_DEFAULTS[<requestedTier>]`. These are the only allowed hardcoded model names in the canonical code path.

4. **AC-CF-4 (Operator override precedence):** `ProductRegistry.modelSelectionOverride` takes precedence over Doppler for that product's invocations.

5. **AC-CF-5 (Envelope schema):** `agent.model.fallback.v1` payload validates against §2.4 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

6. **AC-CF-6 (No hardcoded model names):** CI grep guard rejects PRs that introduce hardcoded model names outside the canonical final-fallback constant.

7. **AC-CF-7 (Cluster A interaction v2 R2):** When `costGovernor.reserve()` denies due to budget AND agent's tier-policy is `budget-flex`: agent downgrades tier (one level at a time; up to 3 attempts: high → medium → low → free) and re-attempts `reserve()`. Each downgrade emits `agent.model.tier_downgraded.v1`. Policy `strict` halts immediately.

8. **AC-CF-8 (v2 R1 — Cost-tier table canonical):** `src/lib/orchestra/modelTiers.js` declares per-model tier assignment matching §2.1.1 USD bands. Mismatch (model classified as `medium` but priced in `high` band) fails CI guard.

9. **AC-CF-9 (v2 R2 — Provider re-pricing):** When `src/lib/orchestra/modelTiers.js` is updated (e.g. provider re-prices), `agent.model.tier_changed.v1` is emitted for any in-flight dispatch using the re-classified model. Agent #19 Tech Evolution monitors provider pricing pages; tier update lands within 24h of provider announcement.

10. **AC-CF-10 (v2 R3 — Hierarchical Doppler):** All tier-keyed Doppler keys (`FLOWAI_MODEL_TIER_FREE` through `FLOWAI_MODEL_TIER_ENTERPRISE` + corresponding `_FALLBACK_CHAIN`) are provisioned in Doppler before any agent ships. Empty keys are valid (Cluster F final-fallback kicks in); missing keys (key not declared at all) fail Doppler key inventory validator. Per-tier override JSONB `ProductRegistry.modelSelectionOverride[productId][<tier>]` reads correctly.

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

*End of CLUSTER_F_MODEL_BUDGET_FALLBACK.md canonical template v2. Panel `PLURALITY_CLF-REVISE` 6/9 conditions R1–R3 applied. Pending W6 re-ratification.*
