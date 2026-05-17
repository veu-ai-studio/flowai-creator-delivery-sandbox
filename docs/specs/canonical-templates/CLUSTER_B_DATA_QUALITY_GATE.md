# Cluster B — Minimum Data Quality Gate (Canonical Template, v3)

**Status:** DRAFT v3 — Panel conditions B1–B4 applied; pending W6 re-ratification.
**Version history:** v1 (commit `a5f295d`, 2026-05-16) → v2 (commit `87b4659`, 2026-05-17, Panel `PLURALITY_CLB-REVISE` 4/9 R1–R4) → v3 (this commit, 2026-05-17, Panel v2 ratification conditions B1–B4 applied per W3 Dispatch #12).
**Author:** W3.
**Anchor canonical:** Rev-2.1 §6 (Aggressive Crawling + Resolution Contract — partial-coverage handling), §14.1 (canonical topic catalogue + canonical weight registry per v3 B1), §15.1 row 6 (Agent #6 Research block semantic per commit `0fc8851`), CA-10-A.2 ProductSSOT `governance_record_entry` schema, ENTRY 006 §7.6 (GTM Readiness 4-prerequisite gate), CA-12 v3 §A.1 (Mode 3A operator-attested source path).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Top-3 Finding #2 + Batch 1 objection #13. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` `PLURALITY_CLB-REVISE` 4/9. **v3 conditions:** `docs/panel-consultations/cluster-templates-v2-ratification-2026-05-17.md` B1–B4.

**v3 revisions applied (per W3 Dispatch #12 — REPLACES v2 §2.4.1 aggregation):**
- **B1** — **Canonical weight registry in §14.1.** Per-agent inline weight floats (v2 §2.4.1) are REPLACED by a canonical `(agentId, streamId) → weight` registry in §14.1. Each pair has exactly one canonical entry; missing entries at registry-write time are REJECTED with `MISSING_STREAM_WEIGHT`. No implicit `weight = 1.0` defaults. §2.4.1 rewritten; new §2.4.2 added.
- **B2** — **MIN-of-streams aggregation replaces weighted-average.** `dataQualityScore = min(normalizedScore_i)` across REQUIRED streams. Optional streams excluded from the `min()` calculation but included in `provenance.coverage[]` for downstream visibility. Rationale: a chain is only as strong as its weakest link — weighted average can mask catastrophic gaps in one stream by smoothing across others. §2.4.1 rewritten.
- **B3** — **`provenance.coverage[]` per stream.** Every data-quality envelope (insufficient, degraded normal-output, cascade, override-clamped) MUST carry per-stream `coverage[]` array: `{streamId, samplesObserved, samplesExpected, samplesOmitted}`. Downstream consumers inspect per-stream coverage BEFORE trusting output. §2.2 payload shape extended; §2.4.3 added.
- **B4** — **Runtime weight schema validation.** BEFORE computing `dataQualityScore`, the agent's `BaseAgent.guard()` verifies every required stream's `(agentId, streamId)` entry is present in §14.1 canonical weight registry. Missing entries → emit `agent.data_quality.insufficient.v1` `reason: 'missing_stream_weight'` and halt. No score is ever computed with undefined weights. §2.4.4 added.

**v2 revisions retained (per W3 Dispatch #10) but evolved in v3:**
- **R1 (v2 — Mode 3A degrade escape valve)** — RETAINED; semantics unchanged. The degrade decision now keys on the v3 `min(streams)` score rather than the v2 weighted average.
- **R2 (v2 — Override min/max guardrails)** — RETAINED; clamping unchanged.
- **R3 (v2 — Cross-metric normalization)** — **SUPERSEDED by v3 B2 MIN-of-streams.** v2's weighted-average formula `dataQualityScore = (Σ perStreamRatio_i × weight_i) / Σ weight_i` is REPLACED. v3 keeps the per-stream-ratio computation but aggregates via `min()` not weighted average.
- **R4 (v2 — Halt-cascade circuit-breaker)** — RETAINED. `agent.data_quality.cascade.v1` envelope unchanged; semantics unchanged.

---

## §1 — Problem Statement

The 18-agent consolidated Panel identified **partial-data policy under-specification** as the second-highest systemic risk:

### Verbatim Panel quotes

**Top-3 Highest-Risk Finding #2 (Slot 8 — openrouter:perplexity/sonar):**
> G6-Q3 admits partial ACE output but does not define minimum coverage, normalization rules, or how missing-page bias affects the brief. Accepting 3/8 pages can systematically over-weight the pages ACE happened to find, especially on sites with auth walls or dynamic navigation. The proposal lacks a provenance model for which pages were omitted and why, so downstream consumers may misread low-confidence output as complete coverage.

**Batch 1 objection #13 (Slot 4):**
> Inadequate handling of auth-gated content.

**Batch 2 objection #11 (Slot 4):**
> The deprecation window for Agent #17 is set to 60 days, but this may be too conservative or too aggressive depending on the context. There is no adaptive mechanism proposed.

### Affected scope

Every agent that consumes upstream artifacts (research brief, crawl output, audit findings, cost-ledger entries, customer signals, etc.) faces the same question: **how much input data is "enough" before producing output?** Without a canonical answer, agents either:

- (a) Produce low-confidence output on thin input (misleading downstream consumers), OR
- (b) Block on arbitrary per-agent thresholds (operator UX fragmentation).

Both modes were surfaced by the Panel across multiple agents (#6 partial ACE, #8 missing audit prerequisites, #10 missing customer signals, #15 below-30-invocation benchmarks, #17 insufficient signal trends, #18 missing upstream signals, #20 empty cost-ledger).

### Why this blocks engineering dispatch

Without canonical minimum-coverage threshold semantics: downstream consumers cannot distinguish "high-confidence output" from "best-effort with bias" and may treat partial-coverage results as authoritative — leading to false positives in 95/95 governance scoring (§10.1), GTM-readiness assessment (ENTRY 006 §7.6), Self-Renewal triggering (CA-7 §15.5), and Orchestra auto-admission (§8.1).

---

## §2 — Canonical Resolution

**A canonical minimum-coverage threshold per agent + a single fail-loud envelope semantic.** Below threshold, agents MUST emit `agent.data_quality.insufficient.v1` and halt — never produce low-confidence output that downstream consumers might mistake for authoritative.

### §2.1 — Single canonical threshold metric (v2 — R2 guardrails added)

Every agent declares its minimum data quality threshold using ONE of three canonical metrics. Per-metric **min / max override bounds** are MANDATORY per v2 R2 — operator overrides cannot cross these bounds (silently clamped + alerted):

| Metric | Type | Example values | Override min | Override max |
|---|---|---|---:|---:|
| `pageCountMin` | integer (count of upstream pages / artifacts) | 3 (Research, ACE re-use); 1 (Quality Audit build artifact) | **1** | **50** |
| `bodyContentCharsMin` | integer (sum chars of crawl body content) | 1000 (Research); 500 (Quality Audit) | **100** | **100_000** |
| `eventCountMin` | integer (count of consumed MessageBus events) | 5 (Monitor 24h customer signals); 30 (Benchmarking head-to-head per CA-9-B) | **1** | **1000** |

Per-agent threshold defaults are declared in the agent's spec; **operator override per product via `ProductRegistry.minimumDataQuality` JSONB field** (§2.3) is bounded by the min/max above.

Rationale (v2 R2): unbounded operator override allowed an operator to set `bodyContentCharsMin: 1` (effectively disabling the gate) or `bodyContentCharsMin: 10_000_000` (effectively blocking every assessment). The min/max bounds keep operators within the legitimate tuning range that Panel + W3 reviewed; out-of-range overrides are clamped (logged + admin notification).

### §2.2 — Canonical fail-loud envelope topic (v3 — provenance.coverage added per B3)

**Topic:** `agent.data_quality.insufficient.v1`

**Payload shape (v3):**
```ts
{
  runId: string,
  productId: string,
  agentId: number,
  thresholdMetric: 'pageCountMin' | 'bodyContentCharsMin' | 'eventCountMin'
                 | 'min_of_streams',           // v3 — when multi-stream MIN aggregation triggered halt
  thresholdConfigured: number,                 // effective threshold (single-metric) OR 0.5 (multi-stream MIN floor)
  observed: number,                             // single-metric value OR min(streams) value
  reason: 'below_threshold'
        | 'missing_stream_weight'              // v3 B4 — weight registry validation failed
        | 'min_below_floor'                    // v3 B2 — MIN-of-streams below 0.5 floor
        | 'min_below_degrade_floor'            // v3 B2 — MIN-of-streams below 0.3 (halts even Mode 3A)
        | 'all_streams_zero',                  // v3 — no signal at all
  dataQualityScore?: number,                   // present for multi-stream agents per §2.4.1 v3
  provenance: {                                // per Top-3 Finding #2 "provenance model"
    consumedSources: Array<{ topic, atRange: [ISO, ISO], count }>,
    omissionReasons: Array<{                   // why pages/artifacts/events were missing
      reason: 'auth-gated' | 'crawl-cap-reached' | 'budget-cap' |
              'rate-limit' | 'stale-cache' | 'upstream-block' | 'other',
      detail: string,
    }>,
    coverage: Array<{                          // v3 B3 — per-stream coverage breakdown (REQUIRED + optional streams BOTH listed)
      streamId: string,                        // e.g. 'crawl-pages', 'customer-feedback', 'cve-feed'
      required: boolean,                       // v3 — true if stream is part of MIN-of-streams aggregation
      weight: number | null,                   // v3 B1 — looked up from §14.1 registry; null if missing (triggers B4 halt)
      samplesObserved: number,                 // actual count this run
      samplesExpected: number,                 // threshold for this stream
      samplesOmitted: number,                  // observed gap (samplesExpected - samplesObserved; never negative)
      normalizedScore: number,                 // min(1.0, samplesObserved / samplesExpected)
    }>,
  },
  recommendedAction: 'await-additional-upstream' | 'lower-threshold-via-override' |
                     'enable-auth-traversal' | 'increase-crawl-cap' | 'manual-review' |
                     'add-stream-weight-to-registry',   // v3 B4 — when reason is missing_stream_weight
  at: ISO8601,
}
```

Downstream consumers MUST inspect `provenance.coverage[]` before trusting envelope output. Per-stream `normalizedScore` reveals whether the halt was driven by one weak stream (all others healthy) vs uniform sparseness across all streams — operationally different remediation paths.

### §2.3 — Per-product configurable override (v2 R2 — bounded)

`ProductRegistry.minimumDataQuality` JSONB column shape:

```json
{
  "agent_6_research": { "bodyContentCharsMin": 500 },
  "agent_8_quality_audit": { "pageCountMin": 1 },
  "agent_10_monitor": { "eventCountMin": 3 },
  "agent_15_benchmarking": { "eventCountMin": 50 }
}
```

- Operators with shallow products (single-page apps) can lower thresholds per product.
- Operators with high-stakes products (medical, financial) can raise thresholds per product.
- **v2 R2 bounding (mandatory):** every override is clamped to `[Override min, Override max]` per the §2.1 metric table BEFORE the threshold is applied. Out-of-bounds attempts are:
  - Clamped silently to the nearest bound.
  - Logged at WARN level with `override_clamped` event.
  - Admin-notified via `agent.data_quality.override_clamped.v1` envelope (added to Cluster D P0 set).
- Per-product override read by the agent at invocation; falls back to per-agent canonical default if absent.

### §2.4 — Provenance model (per Top-3 Finding #2)

When an agent halts (or degrades per §2.7 v2 R1) on threshold, it MUST include in the envelope:
1. **`consumedSources`** — what topics / time-ranges were actually read (transparency).
2. **`omissionReasons`** — for every artifact/page/event NOT consumed, the reason it was missing.

This prevents downstream consumers from "misreading low-confidence output as complete coverage" — instead, downstream consumers see explicit absence and can route to remediation (e.g. enable Phase 3 auth-traversal if `omissionReasons` includes `auth-gated`).

### §2.4.1 — Cross-metric normalization (v3 B2 — MIN-of-streams, supersedes v2 weighted-average)

Agents that consume multiple input streams measured in different metrics (e.g. Monitor consumes `pageCountMin` from crawl + `eventCountMin` from customer-signal) compute a unified **`dataQualityScore`** ∈ [0, 1] using **MIN-of-streams aggregation** (v3 B2):

```
// Per-stream coverage ratio (unchanged from v2)
perStreamRatio_i = min(1.0, observed_i / threshold_i)

// v3 B2 MIN aggregation — REQUIRED streams only
requiredStreams = streams.filter(s => s.required === true)
dataQualityScore = min(perStreamRatio_i for i ∈ requiredStreams)

// Optional streams: excluded from min() but included in provenance.coverage[]
optionalStreams = streams.filter(s => s.required === false)
// provenance.coverage will list both required + optional with normalizedScore each
```

**Rationale (v3 B2):** the v2 weighted-average formula could silently mask catastrophic gaps. Example: an agent with 3 streams weighted 1.0 / 1.0 / 1.0, where two streams hit 100% coverage and one stream hits 0% coverage. v2 score = (1.0 + 1.0 + 0.0)/3 = 0.667 → above 0.5 threshold → no halt → agent operates on partial data with one missing dimension hidden. v3 MIN: `min(1.0, 1.0, 0.0) = 0.0` → halt. Operationally: "you cannot benchmark candidates whose head-to-head invocations are zero, regardless of how complete the cost-ledger stream is."

**Halt decision (v3 cross-metric MIN):**
- `dataQualityScore < 0.3` → halt in ALL modes (v2 §2.7 R1 Mode 3A escape valve also halts below 0.3).
- `0.3 ≤ dataQualityScore < 0.5` → halt in Mode 1 + Mode 2 SUB-2A; DEGRADE in Mode 3A per §2.7 v2 R1.
- `0.5 ≤ dataQualityScore < 1.0` → emit `outputQuality: 'partial'` in normal envelope; downstream consumers see the partial flag.
- `dataQualityScore == 1.0` → emit `outputQuality: 'complete'` (all required streams at-or-above threshold).

Single-stream agents reduce trivially: their `dataQualityScore = perStreamRatio_0`.

Multi-stream agents MUST publish (1) the canonical `(agentId, streamId, required)` triples for ALL streams the agent consumes, AND (2) all required-stream weights live in §14.1 weight registry per §2.4.2 v3 B1. Optional streams may be declared with or without weight (weights only used by §2.4.1's `min()` over required streams; optional weights are informational).

### §2.4.2 — Canonical weight registry in §14.1 (v3 B1)

Per-agent inline weight floats are REMOVED. The canonical source of truth for stream weights lives in **`§14.1` canonical weight registry** alongside the topic catalogue. Each `(agentId, streamId)` pair has exactly ONE entry:

```json
// docs/CANONICAL_REFERENCE.md §14.1 (added in v3 alongside topic registry)
"dataQualityStreamWeights": [
  { "agentId": 6,  "streamId": "crawl-pages",       "required": true,  "weight": 1.0, "thresholdMetric": "bodyContentCharsMin", "thresholdDefault": 1000 },
  { "agentId": 6,  "streamId": "ace-readiness",     "required": false, "weight": 0.5, "thresholdMetric": "pageCountMin",         "thresholdDefault": 3 },
  { "agentId": 10, "streamId": "customer-feedback", "required": true,  "weight": 1.0, "thresholdMetric": "eventCountMin",        "thresholdDefault": 5 },
  { "agentId": 10, "streamId": "anomaly",           "required": true,  "weight": 1.0, "thresholdMetric": "eventCountMin",        "thresholdDefault": 3 },
  { "agentId": 10, "streamId": "drift-detection",   "required": false, "weight": 0.5, "thresholdMetric": "eventCountMin",        "thresholdDefault": 1 },
  // ... one entry per (agentId, streamId) pair across all multi-stream agents
]
```

**Registry-write rejection (v3 B1):** at canonical-amendment time (e.g. a new agent's spec adds a stream), the registry validator checks:
1. Every `(agentId, streamId)` is unique — duplicates rejected with `DUPLICATE_STREAM_WEIGHT[<agentId>, <streamId>]`.
2. Every stream declared in any agent spec has an entry — missing entries rejected with `MISSING_STREAM_WEIGHT[<agentId>, <streamId>]`. (This catches "spec mentions a stream but registry doesn't" gaps at canonical-amendment time, not runtime.)
3. `weight` is a number in `[0.0, 1.0]`; `required` is boolean; `thresholdMetric` is one of the 3 canonical metrics per §2.1.

**No implicit defaults:** v2's `weight = 1.0` fallback for unspecified weights is REMOVED. Every stream MUST have a canonical weight entry. The registry is the single source of truth; agents read weights from §14.1, never define them locally.

### §2.4.3 — `provenance.coverage[]` per stream (v3 B3)

Every data-quality envelope (insufficient, normal-with-degraded, cascade, override-clamped) MUST include `provenance.coverage[]` per §2.2 v3. Required + optional streams BOTH listed; downstream consumers determine actionability per-stream:

- **Required stream with `normalizedScore: 0.0`** → fix this stream's source FIRST (it gates the MIN aggregation).
- **Optional stream with `normalizedScore: 0.0`** → informational; agent can operate but downstream may want to consider remediation.
- **All streams at `normalizedScore: 1.0`** → upstream healthy; halt cause is elsewhere (cost cap, ceiling, missing weight).

### §2.4.4 — Runtime weight schema validation (v3 B4)

BEFORE computing `dataQualityScore`, `BaseAgent.guard()` performs canonical weight validation:

```pseudocode
async function validateStreamWeights(agentId, declaredStreams) {
  const registry = await readCanonicalWeightRegistry();  // reads §14.1 dataQualityStreamWeights
  for (const stream of declaredStreams) {
    if (stream.required) {
      const entry = registry.find(e => e.agentId === agentId && e.streamId === stream.streamId);
      if (!entry) {
        // Halt the dispatch — never compute a score with undefined weights
        emit('agent.data_quality.insufficient.v1', {
          ..., reason: 'missing_stream_weight',
          recommendedAction: 'add-stream-weight-to-registry',
          provenance: {
            coverage: declaredStreams.map(s => ({
              streamId: s.streamId, required: s.required,
              weight: null,                                  // signal: registry-miss
              samplesObserved: 0, samplesExpected: 0, samplesOmitted: 0,
              normalizedScore: 0,
            })),
          },
        });
        throw new MissingStreamWeightError({agentId, streamId: stream.streamId});
      }
    }
  }
  return registry;
}
```

**This validation runs at `BaseAgent.guard()`** — same chokepoint Cluster E v2 R2 uses for authority-ceiling checks. Adding weight-registry validation here means a missing weight is caught at dispatch boundary, not deep in the agent's compute path. Failure is fail-loud + halt-with-explicit-envelope; never silently compute a wrong score.

**Optional streams:** missing weight entries for OPTIONAL streams do NOT halt — they're informational. The validator logs WARN-level `optional_stream_weight_missing` and substitutes `weight: 0.0` (effectively excluding from any future aggregation). Operator/admin notified via observability.

### §2.5 — Halt semantics (Mode 1 + Mode 2 SUB-2A)

When an agent emits `agent.data_quality.insufficient.v1` in Mode 1 OR Mode 2 SUB-2A:
- The agent's normal output envelope (e.g. `6.research.brief.v1`, `8.audit.completed.v1`) is NOT emitted.
- AutoRunner pipeline halts at that step (analogous to Agent #6's block semantic per commit `0fc8851`).
- Operator notification surface alerts admin with the `recommendedAction`.
- ColdStore lineage records the halt + provenance for audit.
- Self-Renewal does NOT auto-retry — the halt is "data is genuinely not there yet", not a transient failure.

### §2.6 — Distinction from cost cap (Cluster A)

Data quality halt (Cluster B) and cost-cap halt (Cluster A) are distinct:
- Cluster A: "we ran out of money" → `agent.cost.signal.v1` `costEvent: 'pre-dispatch-rejected'` + agent block envelope with reason `'budget-cap-reached'`.
- Cluster B: "we don't have enough input data" → `agent.data_quality.insufficient.v1` + halt (Mode 1/2) or degrade (Mode 3A per §2.7).

Both halts use the same AutoRunner step-block mechanism; only the envelope topic + reason differ.

### §2.7 — Streaming escape valve for Mode 3A (v2 R1)

**Mode 3A (operator-attested source build path) agents MAY produce DEGRADED output instead of halting** when `dataQualityScore` falls below threshold. Rationale: in Mode 3A the operator has already attested the source build, so a degraded result against a preview URL is more actionable than a halt that requires operator re-attestation.

**Degrade-not-halt rules:**
1. Applies ONLY to Mode 3A invocations (`pipelineMode === '3A'` per Cluster C §2.4).
2. Applies ONLY when `dataQualityScore ≥ 0.3` (still has some signal). Below 0.3 → halt even in Mode 3A — "no useful data" is not degradable.
3. Agent emits its normal output envelope with `outputQuality: 'degraded'` field + `dataQualityScore` + full provenance per §2.4.
4. Agent ALSO emits `agent.data_quality.insufficient.v1` with payload field `degradedNotHalted: true` for audit trail.
5. Downstream consumers MUST honour `outputQuality` field per Cluster B §2.8 (cascade circuit-breaker).

Mode 1 + Mode 2 SUB-2A agents MUST halt — degrade-not-halt is Mode-3A-exclusive. The rationale: Mode 1/2 produce data that affects production governance scoring (95/95); degrading those would silently bias the score. Mode 3A is for benchmark / preview-URL evaluation where degraded data is signal, not noise.

### §2.8 — Halt-cascade circuit-breaker (v2 R4)

To prevent a single upstream halt from cascading through the entire pipeline, every downstream agent declares its **`upstreamHaltTolerance`** per upstream dependency in §3.X of the agent spec. Three canonical tolerance modes:

| Mode | Semantics | Use case |
|---|---|---|
| **`hard-halt-on-any`** | Downstream agent halts if ANY upstream halts. Strict pipeline integrity. | Quality Audit consuming Code Builder — no audit possible without a build. |
| **`degrade-on-any`** | Downstream agent runs anyway, emits with `outputQuality: 'degraded'` per §2.7 semantics. | Monitor consuming customer signals — final report worth producing even on partial signal. |
| **`wait-with-timeout-<seconds>`** | Downstream agent waits up to N seconds for upstream to retry / produce; on timeout, falls through to `degrade-on-any` or `hard-halt-on-any` (declared at agent level). | Agent #15 Benchmarking waiting for additional invocations to reach 30-event threshold. |

When downstream agent acts on an upstream halt per its `upstreamHaltTolerance`, it emits `agent.data_quality.cascade.v1`:

```ts
{
  runId, productId, agentId: <downstream-agent-id>,
  upstreamAgentId: number,
  upstreamHaltReason: 'data-quality-insufficient' | 'cost-cap' | 'ceiling-violation',
  toleranceModeApplied: 'hard-halt-on-any' | 'degrade-on-any' | 'wait-with-timeout',
  outcomeForThisAgent: 'halted' | 'degraded' | 'waited-and-degraded' | 'waited-and-halted',
  waitedMs?: number,           // present when wait-with-timeout was used
  at: ISO8601,
}
```

This gives operators + admins full visibility into cascade behaviour: a single upstream halt may propagate as 0 / 1 / N downstream halts depending on declared tolerances. Without this circuit-breaker, a single Research halt would cascade to halt the entire downstream pipeline (Design / Code Builder / Quality Audit / GTM / Monitor) even when some downstream agents could meaningfully operate on partial data.

`agent.data_quality.cascade.v1` is added to Cluster D P0 topic set (must ship with Cluster B enforcement per Cluster D v2 R1 staging).

---

## §3 — Agent Spec Integration Instructions

Every affected agent spec MUST add this canonical block to §3 Input Contract (preconditions) AND §4 Output Contract (block variant).

### §3.1 — Block to paste into §3.3 Preconditions (v3)

````markdown
### §3.X — Minimum data quality (canonical per CLUSTER_B_DATA_QUALITY_GATE.md v3)

Effective threshold = `ProductRegistry.minimumDataQuality[<agent-key>][<metric>]`
(clamped to per-metric bounds per Cluster B §2.1 v2 R2)
OR per-agent canonical default per §14.1 dataQualityStreamWeights registry
per Cluster B §2.4.2 v3 B1.

**Stream declarations** (per Cluster B §2.4.1 v3 B2):

| streamId | required | metric | default-threshold | weight (§14.1 registry) |
|---|:-:|---|---:|---:|
| `<stream-id-1>` | yes | `<metric>` | `<value>` | `<weight-from-registry>` |
| `<stream-id-2>` | optional | `<metric>` | `<value>` | `<weight-from-registry>` |

Weights are READ from §14.1 canonical registry — never declared locally.
Missing weight entries for REQUIRED streams → halt at `BaseAgent.guard()`
per Cluster B §2.4.4 v3 B4 (reason `missing_stream_weight`).

**Aggregation (v3 B2):** `dataQualityScore = min(normalizedScore_i)` across
REQUIRED streams only. Optional streams included in `provenance.coverage[]`
but excluded from the `min()` calculation. Per-stream `normalizedScore =
min(1.0, samplesObserved / samplesExpected)`.

**Behaviour by `dataQualityScore`:**
- `< 0.3` → halt in ALL modes per Cluster B §2.4.1 v3.
- `0.3 ≤ score < 0.5` → halt in Mode 1 + Mode 2 SUB-2A; DEGRADE in Mode 3A
  (per Cluster B §2.7 v2 R1; emit envelope with `outputQuality: 'degraded'`).
- `0.5 ≤ score < 1.0` → emit normal envelope with `outputQuality: 'partial'`.
- `== 1.0` → emit normal envelope with `outputQuality: 'complete'`.

**Halt envelope (per §2.2 v3):** `agent.data_quality.insufficient.v1` with
`provenance.coverage[]` populated for ALL declared streams (required +
optional). Downstream consumers inspect per-stream `normalizedScore` to
target remediation.

**Upstream-halt tolerance (per Cluster B §2.8 v2 R4):**
This agent declares per-upstream tolerance:

| Upstream agent | Tolerance mode |
|---|---|
| `<upstream-agent-id>` | `<hard-halt-on-any | degrade-on-any | wait-with-timeout-<N>s>` |

On upstream halt this agent applies the tolerance mode and emits
`agent.data_quality.cascade.v1` per Cluster B §2.8.

Data-quality halt is DISTINCT from cost-cap halt (Cluster A) — different
topic, different reason; both use the AutoRunner step-block mechanism.
````

### §3.2 — Block to paste into §4 Output Contract (block variants)

````markdown
### §4.X — Data-quality block envelope (canonical per Cluster B §2.2)

`agent.data_quality.insufficient.v1` payload (per Cluster B §2.2):

```ts
{
  runId, productId, agentId: <agent-id>,
  thresholdMetric, thresholdConfigured, observed,
  provenance: { consumedSources, omissionReasons },
  recommendedAction, at,
}
```

Emitted when observed < threshold per §3.X. Normal output envelope
(`<agent's normal topic>`) is NOT emitted alongside; this is a halt.
````

### §3.3 — Block to paste into §9 Acceptance Criteria

````markdown
- **AC-DQ-N** — Given upstream input below `<metric>` threshold:
  agent emits `agent.data_quality.insufficient.v1` with full
  provenance; agent does NOT emit `<agent's normal topic>`; AutoRunner
  step halts. Verify by mocking upstream input at threshold-1.
- **AC-DQ-N+1** — `agent.data_quality.insufficient.v1.provenance.
  omissionReasons[]` is non-empty when observed < threshold; each
  entry carries one of the 7 canonical `reason` enum values per
  Cluster B §2.2.
````

---

## §4 — Acceptance Criteria

How W2 verifies the Cluster B fix is correctly implemented across agent spec revisions.

1. **AC-CB-1 (Spec-level coverage):** Every affected agent spec contains the Cluster B §3.1 block in §3 preconditions AND the §3.2 block in §4 output contract. Spec-level grep verifies.

2. **AC-CB-2 (Threshold declared):** Every affected agent spec declares ONE canonical metric + per-agent default in §3.X. Specs that omit are non-conformant.

3. **AC-CB-3 (Envelope schema):** `agent.data_quality.insufficient.v1` payload validates against §2.2 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

4. **AC-CB-4 (Provenance non-empty on halt):** Implementation test (deferred) — every halt emits at least one `omissionReasons` entry. Empty provenance is a defect.

5. **AC-CB-5 (Halt blocks downstream):** AutoRunner step-block mechanism verifies — when `agent.data_quality.insufficient.v1` is emitted, the agent's normal envelope topic does NOT appear in the same `runId`, and downstream consumers do NOT advance.

6. **AC-CB-6 (Operator override honored):** Per-product `ProductRegistry.minimumDataQuality` JSONB override applied correctly — operator can lower / raise threshold per product; effective threshold reads override first, then canonical default.

7. **AC-CB-7 (Distinction from cost halt):** Same-`runId` halts on cost vs data-quality emit distinct topics (`agent.cost.signal.v1` `pre-dispatch-rejected` vs `agent.data_quality.insufficient.v1`). No agent emits both for the same halt cause.

8. **AC-CB-8 (v2 R1 — Mode 3A degrade path):** Given Mode 3A invocation + `dataQualityScore ∈ [0.3, 1.0)`: agent emits normal envelope with `outputQuality: 'degraded'` AND emits `agent.data_quality.insufficient.v1` with `degradedNotHalted: true`. Verify by Mode-3A + Mode-1 parallel invocation comparison on identical thin upstream input — Mode 1 halts, Mode 3A degrades. `dataQualityScore < 0.3` halts in BOTH modes.

9. **AC-CB-9 (v2 R2 — Override clamping):** Operator attempts `bodyContentCharsMin: 0` → clamped to `100` (min bound); `override_clamped` log event emitted; `agent.data_quality.override_clamped.v1` envelope emitted; admin notified. Verify by per-metric out-of-bounds attempt test.

10. **AC-CB-10 (v2 R3 — Cross-metric normalization):** Multi-stream agent (e.g. Monitor) computes `dataQualityScore` per Cluster B §2.4.1 formula; envelope payload field `dataQualityScore ∈ [0, 1]` is present on every emission (normal, degraded, AND insufficient).

11. **AC-CB-11 (v2 R4 — Cascade circuit-breaker):** Upstream halt + downstream `degrade-on-any` tolerance → downstream emits with `outputQuality: 'degraded'` + emits `agent.data_quality.cascade.v1` with `outcomeForThisAgent: 'degraded'`. Same upstream halt + `hard-halt-on-any` tolerance → downstream halts + emits cascade envelope `outcomeForThisAgent: 'halted'`. Verify by per-agent tolerance integration test.

12. **AC-CB-12 (v3 B1 — Canonical weight registry):** §14.1 contains `dataQualityStreamWeights` array; every `(agentId, streamId)` pair has exactly one entry. Registry-write rejects duplicates with `DUPLICATE_STREAM_WEIGHT` AND declared-but-not-in-registry stream references in agent specs with `MISSING_STREAM_WEIGHT`. No agent spec declares a weight inline; weights only read from registry. Spec-level grep across all agent specs returns zero matches for `weight:\s*[0-9]` outside the registry source file.

13. **AC-CB-13 (v3 B2 — MIN-of-streams aggregation):** Implementation test — agent with 3 required streams scoring 1.0 / 1.0 / 0.0 yields `dataQualityScore = 0.0` (not 0.667 as v2 weighted-average would). Optional stream with score 0.0 + required streams 1.0 / 1.0 yields `dataQualityScore = 1.0` (optional excluded from min). Aggregation function is verified against v2's weighted-average formula on a battery of test cases; v2 formula must NEVER produce the v3 score and vice versa for any input.

14. **AC-CB-14 (v3 B3 — `provenance.coverage[]` per stream):** Every emitted `agent.data_quality.insufficient.v1` / `agent.data_quality.cascade.v1` / `agent.data_quality.override_clamped.v1` envelope includes `provenance.coverage[]` with one entry per declared stream (required + optional). Each entry has `streamId`, `required`, `weight`, `samplesObserved`, `samplesExpected`, `samplesOmitted`, `normalizedScore`. Schema validation rejects emissions with empty `coverage[]` array.

15. **AC-CB-15 (v3 B4 — Runtime weight schema validation):** Implementation test — register a multi-stream agent with a required stream missing its `(agentId, streamId)` entry in §14.1 registry. Invoke the agent. `BaseAgent.guard()` throws `MissingStreamWeightError`; emit `agent.data_quality.insufficient.v1` with `reason: 'missing_stream_weight'` + `recommendedAction: 'add-stream-weight-to-registry'`. Agent's normal output envelope is NOT emitted. No `dataQualityScore` ever computed with undefined weights — implementation grep: every weight access reads from registry; no inline weight literals in agent code.

---

## §5 — Affected Agents

| Agent | Canonical threshold metric + default | Cluster B revision required |
|---:|---|---|
| #6 Research | `bodyContentCharsMin: 1000` (Top-3 Finding #2 anchor); OR `pageCountMin: 3` (ACE re-use) | YES — adds halt path; G6-Q3 resolved by Cluster B |
| #7 Design | `pageCountMin: 1` (design depends on Research brief presence) | YES |
| #8 Quality Audit | `pageCountMin: 1` (build artifact + design spec presence) | YES |
| #9 Go-to-Market | `pageCountMin: 1` (audit envelope presence) | YES |
| #10 Monitor | `eventCountMin: 5` (24h customer signals window) | YES |
| #11 Strategic Intelligence | `eventCountMin: 1` (per-cycle tracker output) | YES |
| #12 Portfolio Risk | `pageCountMin: 1` (≥1 product; portfolio signal needs ≥3 declared in spec) | YES |
| #13 Self-Protection | `eventCountMin: 1` (5-min edge-log batch) | YES |
| #14 Public Policy | `bodyContentCharsMin: 500` (regulatory doc minimum) | YES |
| #15 Benchmarking | `eventCountMin: 30` (CA-9-B rolling minimum) | YES — already implicitly declared; canonicalise |
| #16 Productivity / HR | `eventCountMin: 7` (7-day audit-log slice) | YES |
| #17 Product Evolution | `eventCountMin: 1` (benchmark stream presence) | YES |
| #18 Business Planning | `eventCountMin: 3` (upstream agents producing within month) | YES |
| #19 Technological Evolution | `eventCountMin: 1` (CVE feed entry) | YES |
| #20 Environmental Impacts | `eventCountMin: 10` (cost-ledger entry minimum for meaningful CO₂e estimate) | YES |
| #22/#24/#25 Ops Runners (BLOCKED §27 OQ-2) | TBD per role | YES — once role disposed |
| #23 Ops Runner Gamma — Cost Governor | `eventCountMin: 1` (cost-ledger entry per cycle) | YES |
| #26 Orchestra Research Agent | `eventCountMin: 1` (per-cycle candidate stream) | YES |

**Total agents unblocked by this template: 20** (all dormant agents including #23).

---

## §6 — Cross-cluster integration notes (v3)

- **Cluster A** (Cost Governor): cost-cap halt and data-quality halt are distinct topics + distinct reasons; both halt AutoRunner but never alongside each other for same cause. v3 B4's `BaseAgent.guard()` weight-validation runs AT THE SAME canonical chokepoint as Cluster A v3 A5's ceiling check — both fail-loud before any side effect, with distinct error codes.
- **Cluster C** (Mode-Conditional Behavior): v2 R1 degrade-not-halt is Mode-3A-exclusive — Cluster C provides the `pipelineMode` value Cluster B reads to decide halt-vs-degrade. v3 MIN-of-streams aggregation applies uniformly across modes; only the halt-vs-degrade decision is mode-aware.
- **Cluster D** (Audit-Log Topic Schema, v2 R2 + v3 B1): Cluster B v3 introduces ZERO new envelope types beyond v2 (insufficient, cascade, override_clamped — all in P0 set). **v3 B1 ADDS a new §14.1 canonical structure: `dataQualityStreamWeights` array** (the canonical weight registry). This ships alongside the §14.1 P0 topic patch + ENTRY 008. Per Cluster D v3 D2 (5-topic-per-ship cap), the weight registry is NOT topics; it lives in §14.1 as a separate registry-section. Cluster D v3 governance also applies to weight-registry additions: any new agent ship that requires new `(agentId, streamId)` entries adds them at the agent's first-ship commit alongside its topic additions.
- **Cluster E** (Authority-Ceiling Integration): a halt does NOT consume authority quota — Operational-authority is not exhausted by a data-quality block. v3 B4 weight-validation runs in `BaseAgent.guard()`, the SAME chokepoint as Cluster E v2 R2 authority-ceiling check. Order of evaluation within `guard()`: (1) charter authority check, (2) ceiling check (Cluster E), (3) data-quality weight schema validation (Cluster B v3 B4), (4) data-quality compute + halt-or-proceed decision (Cluster B §2.4.1 v3 B2). All steps fail-loud with distinct error codes.
- **Cluster F** (Model-Budget Fallback): when data-quality is insufficient, agents halt BEFORE invoking the LLM dispatch chain — Cluster F fallbacks never fire for data-quality halts. v3 B4 weight-validation also fails before any LLM dispatch; Cluster F's latency SLA (200ms p99 per F1) is not affected by Cluster B halts because the halt happens at `guard()` not at dispatch time.

---

*End of CLUSTER_B_DATA_QUALITY_GATE.md canonical template v3. Panel v2-ratification conditions B1–B4 applied per W3 Dispatch #12. Pending W6 re-ratification.*
