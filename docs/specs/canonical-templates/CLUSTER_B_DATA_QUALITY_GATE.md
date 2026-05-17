# Cluster B — Minimum Data Quality Gate (Canonical Template, v2)

**Status:** DRAFT v2 — Panel conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `a5f295d`, 2026-05-16) → v2 (this commit, 2026-05-17 — Panel `PLURALITY_CLB-REVISE` 4/9 conditions R1–R4 applied per W3 Dispatch #10).
**Author:** W3.
**Anchor canonical:** Rev-2.1 §6 (Aggressive Crawling + Resolution Contract — partial-coverage handling), §15.1 row 6 (Agent #6 Research block semantic per commit `0fc8851`), CA-10-A.2 ProductSSOT `governance_record_entry` schema, ENTRY 006 §7.6 (GTM Readiness 4-prerequisite gate), CA-12 v3 §A.1 (Mode 3A operator-attested source path).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Top-3 Finding #2 + Batch 1 objection #13. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`) — `PLURALITY_CLB-REVISE` 4/9.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — streaming escape valve: Mode 3A agents (operator-attested source path) MAY produce **degraded output** instead of MUST halt, marked `outputQuality: 'degraded'` with full provenance. Mode 1 + Mode 2 SUB-2A retain halt-not-produce. §2.5 + §2.7 added; halt semantics refined.
- **R2** — operator-override guardrails: each canonical metric carries explicit **min / max bounds** that `ProductRegistry.minimumDataQuality` overrides cannot cross. §2.3 extended; AC-CB-6 tightened.
- **R3** — cross-metric normalization: when an agent declares multiple input streams using different metrics (e.g. crawl pages + customer events), the canonical normalization rule converts to a unified `dataQualityScore` ∈ [0, 1] for halt-or-degrade decision. §2.4.1 added.
- **R4** — halt-cascade circuit-breaker: every downstream agent declares its **`upstreamHaltTolerance`** (`hard-halt-on-any` / `degrade-on-any` / `wait-with-timeout-<seconds>`) preventing cascading halts that bring down the whole pipeline. §2.8 added; new envelope topic `agent.data_quality.cascade.v1`.

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

### §2.2 — Canonical fail-loud envelope topic

**Topic:** `agent.data_quality.insufficient.v1`

**Payload shape:**
```ts
{
  runId: string,
  productId: string,
  agentId: number,
  thresholdMetric: 'pageCountMin' | 'bodyContentCharsMin' | 'eventCountMin',
  thresholdConfigured: number,            // the agent's effective threshold for this product
  observed: number,                        // what was actually measured
  provenance: {                            // per Top-3 Finding #2 "provenance model"
    consumedSources: Array<{ topic, atRange: [ISO, ISO], count }>,
    omissionReasons: Array<{               // why pages/artifacts/events were missing
      reason: 'auth-gated' | 'crawl-cap-reached' | 'budget-cap' |
              'rate-limit' | 'stale-cache' | 'upstream-block' | 'other',
      detail: string,
    }>,
  },
  recommendedAction: 'await-additional-upstream' | 'lower-threshold-via-override' |
                     'enable-auth-traversal' | 'increase-crawl-cap' | 'manual-review',
  at: ISO8601,
}
```

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

### §2.4.1 — Cross-metric normalization (v2 R3)

Agents that consume multiple input streams measured in different metrics (e.g. Monitor consumes both `pageCountMin` from crawl artifacts AND `eventCountMin` from customer-signal stream) compute a unified **`dataQualityScore`** ∈ [0, 1] from the per-stream coverage ratios:

```
perStreamRatio_i = min(1.0, observed_i / threshold_i)
dataQualityScore = (Σ perStreamRatio_i × weight_i) / Σ weight_i
```

Where `weight_i` is declared per-agent in the spec (defaults to 1.0 if unspecified — equal weight).

**Halt decision (cross-metric):**
- `dataQualityScore < 0.5` → halt per §2.5 (or degrade per §2.7 in Mode 3A).
- `dataQualityScore ≥ 0.5 < 1.0` → emit `outputQuality: 'partial'` in normal envelope; envelope payload mode-dependent.
- `dataQualityScore == 1.0` → emit `outputQuality: 'complete'` (all streams at-or-above threshold).

Single-metric agents skip §2.4.1 (their `dataQualityScore` reduces to the single ratio); multi-metric agents MUST publish their per-stream weights in §3.X of the agent spec.

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

### §3.1 — Block to paste into §3.3 Preconditions (v2)

````markdown
### §3.X — Minimum data quality (canonical per CLUSTER_B_DATA_QUALITY_GATE.md v2)

Effective threshold = `ProductRegistry.minimumDataQuality[<agent-key>][<metric>]`
(clamped to per-metric bounds per Cluster B §2.1 v2 R2)
OR per-agent canonical default below if absent.

| Metric | Per-agent default | Override range (per Cluster B §2.1) |
|---|---:|---|
| `<metric>` | `<value>` | `[<min>, <max>]` |

For multi-stream agents (per Cluster B §2.4.1 v2 R3): list each input stream
+ its weight in the cross-metric `dataQualityScore` computation.

**Behaviour below threshold:**
- In Mode 1 AND Mode 2 SUB-2A: this agent MUST NOT produce its normal
  output envelope. Instead, emit `agent.data_quality.insufficient.v1`
  with full provenance per Cluster B §2.4, and halt. AutoRunner pipeline
  step blocks; operator is notified with `recommendedAction`.
- In Mode 3A (per Cluster B §2.7 v2 R1): this agent MAY produce
  DEGRADED output with `outputQuality: 'degraded'` + `dataQualityScore`
  + provenance, AND emit `agent.data_quality.insufficient.v1` with
  `degradedNotHalted: true`. Applies only when `dataQualityScore ≥ 0.3`;
  below 0.3 → halt even in Mode 3A.

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

## §6 — Cross-cluster integration notes (v2)

- **Cluster A** (Cost Governor): cost-cap halt and data-quality halt are distinct topics + distinct reasons; both halt AutoRunner but never alongside each other for same cause.
- **Cluster C** (Mode-Conditional Behavior): v2 R1 degrade-not-halt is Mode-3A-exclusive — Cluster C provides the `pipelineMode` value Cluster B reads to decide halt-vs-degrade.
- **Cluster D** (Audit-Log Topic Schema, **v2 R2**): Cluster B v2 emits 3 new envelope topics — `agent.data_quality.insufficient.v1` (P0 set), `agent.data_quality.cascade.v1` (P0 set per Cluster D v2 R1), `agent.data_quality.override_clamped.v1` (P0 set). Per Cluster D v2 R2 (B↔D ordering), all three MUST ship in Cluster D §14.1 extension BEFORE Cluster B enforcement is activated in any agent.
- **Cluster E** (Authority-Ceiling Integration): a halt does NOT consume authority quota — Operational-authority is not exhausted by a data-quality block.
- **Cluster F** (Model-Budget Fallback): when data-quality is insufficient, agents halt BEFORE invoking the LLM dispatch chain — Cluster F fallbacks never fire for data-quality halts.

---

*End of CLUSTER_B_DATA_QUALITY_GATE.md canonical template v2. Panel `PLURALITY_CLB-REVISE` 4/9 conditions R1–R4 applied. Pending W6 re-ratification.*
