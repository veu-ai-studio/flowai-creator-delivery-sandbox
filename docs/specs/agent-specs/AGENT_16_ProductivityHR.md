# Agent #16 — Productivity / HR — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_16_ProductivityHR.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 16, §14 GovernanceAuditLog (LIVE), CA-11-B.6 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=16 (lines 261–271).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `16` |
| Name | `Productivity & HR` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces productivity reports; never executes side effects on people-data. |
| Operational-authority | **autonomous** for audit-log analysis within budget; `flowAiOnly: true` scope. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | GovernanceAuditLog (LIVE per §14); Agent #10 Monitor (consumes `10.metric.v1`). |

---

## §2 — What This Agent Does

Productivity / HR introspects FlowAI's own **operating-model productivity** — NOT customer-product user productivity. It consumes GovernanceAuditLog signals about W0x dispatch frequency, Wx execution latency, Panel review turnaround, CEO acknowledgement gaps, and `agent.tool_selection.exhausted.v1` fallback-chain stress signals. It identifies bottlenecks in the FlowAI development cycle itself (e.g., W5x parallel-commit-protocol contention, Panel review fan-out exceeding 24h, CEO inbox-zero drift) and surfaces refinement recommendations.

Per escalation policy: "Productivity reports never name individual humans — aggregate metrics only." Reports are workflow-shaped, not person-shaped.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 267)

```
consumes: ['10.metric.v1']
```

Plus by convention:

- GovernanceAuditLog read stream (own dispatch).
- `panel_decision_*` topics (consultation cadence + turnaround).
- `agent.tool_selection.exhausted.v1` (CA-11-A.5 fallback-chain stress).
- Sentry / PostHog telemetry (when wired Phase 2).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'on-demand',
  scheduledAt: ISO8601,
  windowDays: 7 | 30,
  auditLogDigest?: AuditLogDigest,
  toolExhaustionEvents: Array<{ adapter, capability, at }>,
  productScope: 'flowai-only',
}
```

### §3.3 Preconditions

- GovernanceAuditLog reachable.
- `flowai-only` scope enforced.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 268)

```
produces: ['16.productivity.report.v1']
```

Implementation additionally emits:

- `16.workflow_bottleneck.v1` — per-bottleneck surfacing envelope.

### §4.2 Output shape — `16.productivity.report.v1`

```ts
{
  at, periodDays: 7 | 30,
  bottlenecks: Array<{
    category: string,
    severity: 'low' | 'medium' | 'high',
    affectedWorkstream: 'W0' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6',
    metrics: { latencyP50Ms, latencyP95Ms, throughput },
    recommendedAction: string,
  }>,
  recommendations: string[],
  trendsAcrossLast30d: { dispatchVelocity, panelTurnaround, escalationRate },
  scope: 'flowai-only',
}
```

### §4.3 Postconditions

- ColdStore lineage row.
- No human names in any envelope (aggregate-only invariant).
- Weekly digest written to admin dashboard.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('productivity-hr', agent)` + weekly Mondays 06:00 UTC.

### §5.2 Upstream feeders

- GovernanceAuditLog.
- Agent #10 Monitor (`10.metric.v1`).
- CA-11-A.5 tool-exhaustion stream.

### §5.3 Downstream consumers

- **Admin UI productivity dashboard.**
- **Agent #18 Business Planning** (consumes for operating-model context).

### §5.4 Mode behavior

Mode-agnostic — `flowai-only` scope; introspects FlowAI's operating model regardless of operator mode.

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each LLM call (weekly bottleneck analysis).
Agent #23 is the sole canonical enforcement owner. Call order per Cluster A
§2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_16_productivity_hr.eventCountMin`
OR per-agent default: `eventCountMin: 7` (clamped to [1, 1000]; 7-day audit-log
slice is canonical window).
- Mode 1 + Mode 2 SUB-2A: below threshold → emit
  `agent.data_quality.insufficient.v1` and halt.
- Mode 3A: degrade per Cluster B §2.7 v2 R1 if dataQualityScore ≥ 0.3.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `wait-with-timeout-300s`
(audit-log entries may arrive in burst; brief wait avoids false halt).

**Cluster C — Mode behavior:** agent output is identical across all pipeline
modes (Pattern P1 per Cluster C §2.3); FlowAI-internal operating model is
mode-agnostic. `pipelineMode` field omitted per Cluster C §2.4 v2 R2.
Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits `16.productivity.report.v1` (per `_registry.ts`) plus
`16.workflow_bottleneck.v1`. Cross-cluster topics ship in P0 patch. G16-Q5
from original spec is resolved by Cluster D — update `_registry.ts` to
include both topics at engineering dispatch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `budget-flex` per Cluster F §2.1.2.
Selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Selection re-read per dispatch. Tier-downgrade per Cluster F §2.5 v2 R2.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent16ProductivityHR.js` — ~380 LOC.
- `src/lib/agents/agents/__tests__/Agent16ProductivityHR.test.js` — ~250 LOC.
- `src/lib/agents/agents/aggregators/auditLogAggregator.js` — digest builder.
- `src/components/admin/ProductivityDashboard.jsx` — admin UI surface.

### §6.2 Files to modify (existing)

- Scheduler — weekly cadence registration.

### §6.3 Estimated effort

**~8 W-hours** Phase 1 (smallest dormant agent — narrow scope).

### §6.4 Key engineering risks

1. **Person-data exclusion invariant** — reports must NEVER name individual humans. Mitigation: explicit BaseAgent guard rejects envelope emission if `bottlenecks[].affectedWorkstream` contains a person-name pattern.
2. **`flowai-only` scope ambiguity** — same as Agent #12 G12-Q1.
3. **Sentry / PostHog dependency** — Phase 1 ships without; degraded signal but workable.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 266:

```
requiredCredentials: []
```

Optional Anthropic for analysis; memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Audit-log digest sent only to Anthropic (analysis) + ColdStore (persist).
- Person-name pattern blocked at envelope-emit boundary.

### §7.3 Scope limiting

- `flowAiOnly: true` enforced.
- No customer-product end-user productivity in scope.

### §7.4 Escalation policy (from `_registry.ts` lines 269–270)

```
escalationPolicy:
  'FlowAI-only. Productivity reports never name individual humans — aggregate metrics only.'
```

Concrete enforcement:

- Envelope-schema validation rejects person-name fields.
- Cross-tenant queries throw `SCOPE_VIOLATION`.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Weekly productivity digest from GovernanceAuditLog
- Workflow bottleneck classification (4 severity tiers across 6 workstreams)
- Trend-line aggregation across last 30 days
- Aggregate-only metrics; no individual human attribution

### §8.2 Deferred to Phase 2+

- Sentry / PostHog telemetry integration
- Real-time bottleneck alerts (Phase 1 is weekly batch)
- Cross-deployment productivity benchmarking

### §8.3 What this agent CANNOT do — ever

- **Never names individual humans.** Aggregate-only invariant.
- **Never crosses tenant boundary.**
- **Never reports on customer-product user productivity.** `flowai-only` scope distinction is canonical.

---

## §9 — Acceptance Criteria

1. **AC-16.1** — 7 days of audit-log → productivity report with bottlenecks identified. A16-N1.
2. **AC-16.2** — `agent.tool_selection.exhausted.v1` events >5/24h → `16.workflow_bottleneck.v1` category `tool-fallback-saturation`. A16-N2.
3. **AC-16.3** — Audit-log unreachable → fallback to in-memory recent-events buffer. A16-M1.
4. **AC-16.4** — Cross-tenant productivity-data leak attempt blocked. A16-X1.
5. **AC-16.5** — Envelope containing person-name pattern rejected at emit boundary. Unit test.
6. **AC-16.6** — Zero bottlenecks in week → empty digest with positive-trend annotation. A16-E1.

---

## §10 — Panel Questions

### G16-Q1 — `flowai-only` scope distinction

Charter says introspects FlowAI's operating model, not customer-product user productivity. Canonicalise?

- (a) Codify the distinction explicitly in §15.1 row 16 — "Productivity / HR concerns FlowAI's operating model exclusively".
- (b) Operator-configurable scope (`productivityScope: 'flowai-internal' | 'customer-product' | 'both'`).
- (c) Keep current ambiguity; let Phase 2 scope expand based on operator demand.
- (d) Rename agent to `FlowAI Operating-Model Productivity` to eliminate scope ambiguity.
- (e) INSUFFICIENT_INFORMATION.

### G16-Q2 — Person-name exclusion enforcement

How is "never name individuals" enforced?

- (a) Envelope-schema validation at emit boundary (current plan).
- (b) Post-emit ColdStore audit — periodic scan for person-name patterns; alert on hits.
- (c) Both (defense in depth).
- (d) LLM-judge each envelope before emit ("does this envelope name an individual?"); fail-loud.
- (e) INSUFFICIENT_INFORMATION.

### G16-Q3 — Weekly cadence vs continuous

Weekly Mondays 06:00 UTC. Right?

- (a) Weekly — current plan; balances signal vs noise.
- (b) Daily — finer granularity; more storage.
- (c) Continuous — real-time bottleneck detection.
- (d) Bi-weekly — lower volume; longer trend windows.
- (e) INSUFFICIENT_INFORMATION.

### G16-Q4 — Sentry / PostHog Phase 2 dependency

Phase 1 ships without. Phase 2 adds. Right deferral?

- (a) Defer — Phase 1 with audit-log only is shippable.
- (b) Ship Phase 1 with PostHog only (OSS, lowest cost-tier).
- (c) Ship Phase 1 with Sentry only.
- (d) Block Phase 1 until Sentry + PostHog both wired (richer signal day-one).
- (e) INSUFFICIENT_INFORMATION.

### G16-Q5 — Topic name reconciliation

`_registry.ts` produces `16.productivity.report.v1`. Blueprint adds `16.workflow_bottleneck.v1`. Resolution?

- (a) Update `_registry.ts` to include both.
- (b) Collapse bottleneck into report payload field.
- (c) Keep separate topics.
- (d) Rename bottleneck → `16.productivity.bottleneck.v1` for namespace consistency.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #16 Productivity / HR engineering spec.*
