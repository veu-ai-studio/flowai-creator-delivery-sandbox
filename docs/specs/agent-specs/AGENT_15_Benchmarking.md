# Agent #15 — Benchmarking & Competition — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_15_Benchmarking.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 15, Locked Rule 16 (Orchestra ranking updates), Locked Rule 18 (rank_score formula), §8.1 head-to-head benchmark for auto-admission, CA-9-B charter expansion, CA-11-B.2 ToolMenu, CA-11-D.3 per-agent score storage.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=15 (lines 250–260).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `15` |
| Name | `Benchmarking & Competition` |
| Mode | `cross-step` |
| Pipeline step owned | n/a (cross-step — daily scheduled cadence) |
| Build-authority | **recommend_only** in all phases. Emits scoring data; ranking-table updates handled by Orchestra spec §4.2 rolling-outcome-score machinery. |
| Operational-authority | **autonomous** for benchmark dispatch within budget. |
| Current status | **DORMANT** — charter ratified; benchmark cycle not wired. |
| Depends on | Agent #11 (Strategic Intelligence) + Agent #26 (Orchestra Research) SHIPPED-GREEN; CA-11-D.3 per-agent score storage migrated; neutral fixture sets curated + Panel-reviewed for §22 product-agnostic compliance. |

---

## §2 — What This Agent Does

Benchmarking runs continuous head-to-head competitions across Orchestra members. For each (candidate × capability) it schedules invocations against neutral synthetic fixtures, scores both candidate and wired member, and computes performance-score deltas per Locked Rule 18 formula (`rank_score = performance × 0.6 + price_weight × 0.4`). After the rolling 30-invocation minimum per CA-9-B is reached, it emits a `15.benchmark.head_to_head.v1` envelope that feeds Orchestra's ranking pipeline and Agent #26's auto-admission gate per §8.1.

The operator sees: a per-capability leaderboard (which adapter is best at `code-patch`? at `analyze`?), a monthly benchmark cycle digest, and ongoing auto-admission decisions when candidates outperform wired members.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 256)

```
consumes: ['7.design.spec.v1']
```

(Charter expansion — `_registry.ts` declares minimal consumes; benchmark cycle additionally reads:)

- `11.platform.discovery.v1` (candidates to benchmark)
- `26.orchestra.candidate.v1` (Agent #26 discoveries)
- `flowai_adapter_cost` ledger reads (Orchestra spec §7.1)
- `flowai_agent_tool_outcome` table reads (CA-11-D.3)

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'event-triggered',
  scheduledAt: ISO8601,
  triggerEvent?: { topic, payload },
  benchmarkSet: Array<{
    candidateId, memberId, capability,
    fixturesPath, sampleSize, p50LatencyTargetMs,
  }>,
  historicalScores?: Array<{ candidate_id, capability, samples }>,
}
```

### §3.3 Preconditions

- Neutral fixture sets present at `benchmarks/` per capability.
- ToolMenu adapters reachable for candidate + member dispatch.
- CA-11-D.3 per-agent score storage migrated (`flowai_agent_tool_outcome` table exists).
- Cost-ledger reachable.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 257)

```
produces: ['15.benchmark.report.v1']
```

Implementation additionally emits (charter expansion per CA-9-B):

- `15.benchmark.head_to_head.v1` — per (candidate × member × capability) triple.
- `15.benchmark.cycle_completed.v1` — monthly digest.

### §4.2 Output shape — `15.benchmark.head_to_head.v1`

```ts
{
  candidate_id: string,
  member_id: string,
  capability: string,
  candidate_score: 0-100,
  member_score: 0-100,
  candidate_rank_score: number,      // per Locked Rule 18
  member_rank_score: number,
  sample_size: number,                // ≥30 per CA-9-B
  p50_latency_candidate_ms: number,
  p50_latency_member_ms: number,
  candidate_cost_tier: 'free' | 'low' | 'medium' | 'high' | 'enterprise',
  member_cost_tier: string,
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row per benchmark cycle.
- `flowai_agent_tool_outcome` rows written per CA-11-D.3.
- Rolling tally maintained per (candidate × capability) per CA-9-B.
- Monthly digest written to admin dashboard.
- Candidate score > wired member score → triggers Agent #26 auto-admission consideration per §8.1.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('benchmarking', agent)` + daily 05:00 UTC scheduled job (Orchestra ranking refresh cadence aligned with Sprint PROTECT-1 Phase 2).

### §5.2 Upstream feeders

- Agent #11 Strategic Intelligence — discovery candidates.
- Agent #26 Orchestra Research Agent — additional candidate stream.
- Orchestra telemetry — invocation history.

### §5.3 Downstream consumers

- **Agent #26 Orchestra Research Agent** — auto-admission scores.
- **Agent #17 Product Evolution** — composition decisions.
- **Global Orchestra ranking refresh** — feeds rank-table updates.

### §5.4 Mode behavior

Mode-agnostic — Benchmarking runs on schedule regardless of operator mode.

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each benchmark invocation (per candidate ×
member × capability). Daily benchmark cycle = ~30 invocations × 5 capabilities
× 5 candidates = ~$37.50/cycle = ~$1,125/month baseline; Cluster A reserve()
enforced per dispatch. Agent #23 is the sole canonical enforcement owner.
G15-Q2 from the original spec is resolved by Cluster A.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_15_benchmarking.eventCountMin`
OR per-agent default: `eventCountMin: 30` (clamped to [1, 1000]; CA-9-B
canonical rolling minimum).
- Mode 1 + Mode 2 SUB-2A: below threshold (e.g. candidate at 29 invocations)
  → emit `agent.data_quality.insufficient.v1` and halt; do NOT emit
  `15.benchmark.head_to_head.v1` with low-sample-size data. This preserves
  CA-9-B statistical-significance contract.
- Mode 3A: same as Mode 1 (benchmarking with degraded confidence misleads
  Orchestra auto-admission; halt is correct in Mode 3A too — strict policy).
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `hard-halt-on-any`
(insufficient invocations means no valid benchmark).

**Cluster C — Mode behavior:** agent output is identical across all pipeline
modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted per
Cluster C §2.4 v2 R2. Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits per §4 — `15.benchmark.report.v1` (per `_registry.ts`)
plus charter-expansion topics `15.benchmark.head_to_head.v1`,
`15.benchmark.cycle_completed.v1`. Cross-cluster topics ship in P0 patch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `strict` per Cluster F §2.1.2
(rubric scoring consistency; downgrading mid-cycle would invalidate
cross-candidate comparison).
Selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Selection re-read per dispatch. Strict policy → no tier-downgrade on budget
denial; cycle halts instead.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent15Benchmarking.js` — ~520 LOC.
- `src/lib/agents/agents/__tests__/Agent15Benchmarking.test.js` — ~340 LOC.
- `src/lib/agents/agents/benchmarks/` — NEW directory of neutral fixture sets per capability:
  - `code-patch-fixtures.json`
  - `generate-from-scratch-fixtures.json`
  - `analyze-fixtures.json`
  - `crawl-fixtures.json`
  - `score-fixtures.json`
- `src/lib/agents/agents/scorers/rankScoreFormula.js` — Locked Rule 18 formula implementation.
- `inngest/functions/benchmark-daily-tick.js` — daily 05:00 UTC scheduled job.

### §6.2 Files to modify (existing)

- Scheduler entry + Inngest registration.
- `flowai_agent_tool_outcome` migration (if not yet applied per CA-11-D.3).

### §6.3 Estimated effort

**~12 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **Fixture-set curation** — neutral fixtures must be Panel-reviewed for §22 (no VEU product names). See §10 G15-Q1.
2. **Benchmark cost** — 30 invocations × 5 capabilities × 5 candidates × ~$0.05/invocation = ~$37.50/cycle; daily = ~$1,125/month baseline. Cost cap required.
3. **Score-drift across days** — same fixture should score same across days for a given adapter; LLM-judge noise introduces variance. Mitigation: model-pinned LLM judge; aggregate over 30-invocation rolling window.
4. **Cost-tier price-weight asymmetry** — Locked Rule 18 weights `price_tier` heavily (0.4 multiplier with free=1.0, enterprise=0.1). Adapters at enterprise tier need substantial perf advantage to compete. Mitigation: per-capability tier-tolerance configurable.
5. **Fixture staleness** — fixtures designed for 2026 capabilities may be trivial in 2027. Mitigation: Panel-reviewed fixture refresh annually.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 255:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: candidate-adapter credentials, `OPENROUTER_API_KEY` for fallback, `BROWSERLESS_TOKEN`. All memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Benchmark fixtures are synthetic neutral content; no real operator-product data.
- Candidate + member outputs sent to LLM judge for scoring; scrubbed.
- Per Locked Rule 18 cost-tier data persisted to `flowai_agent_tool_outcome` (internal); no external sharing.

### §7.3 Scope limiting

- Benchmark runs against published / Orchestra-roster candidates only; no scraping competitor benchmarks for direct injection.
- Cost-cap enforcement via Agent #23 Cost Governor.

### §7.4 Escalation policy (from `_registry.ts` lines 258–259)

```
escalationPolicy:
  'Benchmark against named peer sets only — do not compare against unspecified general baselines.'
```

Concrete enforcement:

- Benchmark sets enumerate candidate + member explicitly; no "compare against industry average" general baselines.
- Anonymous peer comparisons rejected at agent boundary.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Daily benchmark cycle across (candidate × capability) sets
- Rolling 30-invocation tally per CA-9-B
- `15.benchmark.head_to_head.v1` per triple
- Monthly cycle digest
- Locked Rule 18 rank_score computation
- Feed Orchestra auto-admission gate

### §8.2 Deferred to Phase 2+

- Multi-judge consensus scoring (Phase 1 uses single Anthropic judge; Phase 2 may add OpenAI / Gemini ensemble)
- Real-product fixture sets (Phase 1 synthetic only)
- Continuous (non-batch) benchmarking (Phase 1 is daily batch)

### §8.3 What this agent CANNOT do — ever

- **Never compares against unspecified general baselines.** Named peer sets only.
- **Never auto-admits candidates.** Agent #26 owns admission decision.
- **Never uses operator-product data as fixtures.** §22 product-agnostic invariant.

---

## §9 — Acceptance Criteria

1. **AC-15.1** — Candidate at 30 invocations across `code-patch` → `15.benchmark.head_to_head.v1` emitted with stable scores. A15-N1.
2. **AC-15.2** — Candidate score > wired member → triggers §8.1 consideration. A15-N2.
3. **AC-15.3** — Adapter unreachable → skip with log; cycle continues with remaining. A15-M1.
4. **AC-15.4** — At exactly 29 invocations → not yet emit; minimum 30 per CA-9-B. A15-E1.
5. **AC-15.5** — Prompt-injection in fixture content does NOT alter scoring rubric. A15-X1.
6. **AC-15.6** — Locked Rule 18 formula applied correctly — `rank_score = perf × 0.6 + price_weight × 0.4`; weights per cost-tier (free=1.0 / low=0.8 / medium=0.6 / high=0.3 / enterprise=0.1). Unit test.
7. **AC-15.7** — `ANTHROPIC_API_KEY` never persisted (canary).

---

## §10 — Panel Questions

### G15-Q1 — Fixture-set ownership

Who curates per-capability fixture sets?

- (a) W3 drafts; Panel ratifies as a package (one consultation, all capabilities).
- (b) Per-capability domain experts curate (code-patch by senior engineers; analyze by analysts).
- (c) Operator-supplied fixtures per-product; aggregated.
- (d) Industry-standard fixtures (SWE-Bench, HumanEval, MMLU) where applicable; custom only for novel capabilities.
- (e) INSUFFICIENT_INFORMATION.

### G15-Q2 — Cost cap on benchmark cycles

Estimated $1,125/month baseline. Acceptable?

- (a) Accept — necessary cost for marketplace intelligence.
- (b) Reduce cycle to weekly (~$280/month) — sacrifice responsiveness.
- (c) Reduce candidate count (top 3 wired members only) — bound cost.
- (d) Per-product opt-in — operators choose to fund benchmarking.
- (e) INSUFFICIENT_INFORMATION.

### G15-Q3 — LLM-judge ensemble vs single

Phase 1 plans single-judge (Anthropic). Risk of judge bias?

- (a) Single judge Phase 1; ensemble Phase 2.
- (b) Day-one ensemble (Anthropic + OpenAI + Gemini); 3× cost.
- (c) Single judge but rotate weekly across providers.
- (d) Operator-configurable judge (`ProductRegistry.benchmarkJudge`).
- (e) INSUFFICIENT_INFORMATION.

### G15-Q4 — Cost-tier price-weight tolerance

Locked Rule 18 heavily weights cost-tier. Enterprise adapters at disadvantage. Right balance?

- (a) Keep current 0.6/0.4 split as canonical per Locked Rule 18.
- (b) Per-capability override — high-stakes capabilities (security scoring) weight perf more (0.8/0.2).
- (c) Operator-configurable per-product weights.
- (d) Add a third dimension (reliability/SLA); 3-way split.
- (e) INSUFFICIENT_INFORMATION.

### G15-Q5 — Rolling 30-invocation minimum tuning

CA-9-B specifies 30. Right minimum?

- (a) 30 — current per CA-9-B.
- (b) 50 — higher confidence; slower auto-admission.
- (c) 100 — strongest statistical power.
- (d) Per-capability tuned minimum (some capabilities need more samples than others).
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #15 Benchmarking engineering spec.*
