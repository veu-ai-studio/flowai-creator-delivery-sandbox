# Agent #23 — Ops Runner Gamma (Cost Governor) — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification. Role **HINTED** as Cost Governor per Layer 2 Implementation Plan PG1 (Rev-2.1 §27 OQ-2); requires formal CEO/Panel disposition to canonicalise.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_23_OpsRunnerGamma.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor hint per Layer 2 PG1), Orchestra Integration Spec §7 (cost tracking) + §8.4 (run-budget ceiling), CA-11-B.10 ToolMenu, CA-7 §15.5 EXECUTOR_REGISTRY (Phase 2).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=23 (lines 346–355).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `23` |
| Name | `Ops Runner Gamma — Cost Governor` (proposed per Layer 2 PG1) |
| Mode | `step-owner` (per `_registry.ts`); W3 recommends **cross-step** (cost is cross-cutting — see G23-Q2) |
| Pipeline step owned | **TBD — pending §27 OQ-2; W3 recommends cross-step** |
| Build-authority | **recommend_only** (Phase 1); **supervised** (Phase 2 Executor — auto-halts runaway runs by writing `flowai_run_budgets.exceededAt`). |
| Operational-authority | **autonomous** for cost-ledger read + anomaly classification within budget. |
| Current status | **DORMANT, role hinted; awaiting formal disposition.** |
| Depends on | Orchestra cost-ledger LIVE per §7.1; per-run budget table per §8.4 (assumed shipped post-CA-7+CA-8+CA-9+CA-10). |

---

## §2 — What This Agent Does

Cost Governor watches FlowAI's spend in real-time. It consumes the Orchestra cost-ledger (`flowai_adapter_cost` per §7.1) + per-run budget ceilings (`flowai_run_budgets` per §8.4) + per-product cost-config from Doppler (per-product crawl budgets per ENTRY 006). It detects 3 cost-anomaly categories:

1. **Single-run runaway** — spend exceeds 80% of ceiling within ≤25% of expected duration.
2. **Pattern runaway** — rolling 7-day per-product spend > 150% of trailing 30-day baseline.
3. **Adapter cost-class drift** — adapter usage shifted to `high`/`enterprise` tier without corresponding `auto_write_internal`-justified workload (e.g. Datadog usage spike).

Phase 1 surfaces anomalies; Phase 2 Executor auto-halts single-run runaway by writing `flowai_run_budgets.exceededAt` (canonical hard stop per §8.4) and emits `runner.budget.exceeded.v1`. Phase 2 actions human-gated for `critical` magnitude to avoid runaway false-positive halts.

The operator sees: a real-time cost dashboard with anomaly alerts, monthly cost digest, and (Phase 2) automatic halt events when a runaway run is detected.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 352)

```
consumes: []
```

By convention:

- `flowai_adapter_cost` ledger writes (Inngest stream or DB poll).
- `1.crawl.request.v1`, `21.crawl.completed.v1` (cost-per-crawl correlation).
- Per-product cost-config from Doppler.

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-60s' | 'event-triggered' | 'on-demand',
  scheduledAt: ISO8601,
  productScope: { ... },
  costLedgerSlice: Array<CostEntry>,
  runBudgets: Array<{ runId, ceilingUsd, spentUsd, exceededAt }>,
  perProductConfig: Record<productId, BudgetConfig>,
}
```

### §3.3 Preconditions

- Cost-ledger reachable.
- `flowai_run_budgets` table populated.
- Per-product Doppler config reachable.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 353)

```
produces: []
```

By convention (Phase 1):

- `23.cost_anomaly.v1` — per-anomaly envelope.
- `23.cost_digest.v1` — monthly aggregate.

Phase 2 Executor:

- `23.budget_halt.v1` — halt event.
- `runner.budget.exceeded.v1` — per Orchestra §8.4 contract.

### §4.2 Output shape — `23.cost_anomaly.v1`

```ts
{
  productId, runId?,
  category: 'single-run-runaway' | 'pattern-runaway' | 'adapter-tier-drift',
  severity: 'low' | 'medium' | 'high' | 'critical',
  evidence: { observed, threshold, baseline, currentSpentUsd, ceilingUsd },
  recommendedAction: string,
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row per anomaly.
- Critical severity → admin notification + (Phase 2) auto-halt within 60s.
- `runner.budget.exceeded.v1` emitted exactly once per `runId` (idempotent).

---

## §5 — Pipeline Integration

### §5.1 Step owned

W3 recommends cross-step: `hub.registerCrossStep('cost-governor', agent)` + Inngest every 60s. If step-owner per `_registry.ts`, the binding would miss inter-step accumulation (see G23-Q2).

### §5.2 Upstream feeders

- Orchestra cost-ledger.
- Per-product Doppler budget config.

### §5.3 Downstream consumers

- **Admin UI cost dashboard.**
- **CEO alerting** for critical anomalies.
- **Self-Renewal cost-context awareness** — Agent #3 reads `23.cost_anomaly.v1` to decide extend/curtail fork-and-fix runs.
- **Runner halt path** (Phase 2 Executor → `runner.budget.exceeded.v1` consumed by AutoRunner per §8.4).

### §5.4 Mode behavior

Mode-agnostic — cost monitoring runs regardless of operator mode. Phase 2 halt action respects per-product authority ceiling.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent23CostGovernor.js` — ~520 LOC.
- `src/lib/agents/agents/__tests__/Agent23CostGovernor.test.js` — ~340 LOC.
- `src/lib/agents/agents/detectors/singleRunRunawayDetector.js`
- `src/lib/agents/agents/detectors/patternRunawayDetector.js`
- `src/lib/agents/agents/detectors/adapterTierDriftDetector.js`
- `inngest/functions/cost-governor-tick.js` — 60s scheduled job.

Phase 2 Executor:

- `src/lib/agents/agents/Agent23CostGovernorExecutor.js` — ~360 LOC.
- `EXECUTOR_REGISTRY` entry: key `cost-governor-executor`, `agentId: 23`, `authority: ['auto_write_internal', 'requires_human_gate']`.

### §6.2 Files to modify (existing)

- Scheduler — 60s cadence registration.
- `_registry.ts` — confirm mode (G23-Q2).

### §6.3 Estimated effort

**~13 W-hours Phase 1**; **+6 W-hours Phase 2 Executor**.

### §6.4 Key engineering risks

1. **Mode disposition (G23-Q2)** — step-owner vs cross-step affects detector accuracy.
2. **60s cadence cost** — 60s polling vs event-driven trade-off.
3. **False-positive halts** — Phase 2 auto-halt risk. Mitigation: human gate for critical magnitude.
4. **Cross-tenant cost-ledger isolation** — RLS per Orchestra §7.1.
5. **Topic naming reconciliation** — `_registry.ts` declares empty produces; implementation emits 4. Update at engineering dispatch.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 351:

```
requiredCredentials: []
```

Optional Anthropic for anomaly classification + OpenRouter fallback. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Cost-ledger content sent to Anthropic for analysis; scrubbed.
- Per-tenant ledger isolation enforced via RLS.
- Halt actions (Phase 2) touch only `flowai_run_budgets` table; no cross-table writes.

### §7.3 Scope limiting

- Per-tenant cost-ledger reads RLS-gated.
- Phase 2 halt actions require admin role per §13.

### §7.4 Escalation policy (from `_registry.ts` line 354)

```
escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.'
```

(Reserved charter; needs update post-disposition. Proposed concrete policy: "Critical anomalies escalate to admin within 60s; Phase 2 halt actions audit-logged + human-gated for critical magnitude.")

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Real-time cost-anomaly detection across 3 categories
- Monthly cost digest
- Critical-severity 60s SLA
- Per-product cost-config consumption

### §8.2 Phase 2 capabilities (deferred — Cost Governor Executor)

- Auto-halt runaway runs via `flowai_run_budgets.exceededAt` write
- `runner.budget.exceeded.v1` emission per §8.4 contract
- Human gate for critical magnitude halts

### §8.3 What this agent CANNOT do — ever

- **Never crosses tenant boundary.** RLS enforced.
- **Never auto-halts without 60s critical SLA check.** Halts only at hard ceiling breach.
- **Never sends cost data to external services beyond Anthropic** (canonical LLM).

---

## §9 — Acceptance Criteria

1. **AC-23.1** — Run at 80% ceiling within 25% expected duration → `23.cost_anomaly.v1` category `single-run-runaway`. A23-N1.
2. **AC-23.2** — 7-day spend 1.5× baseline → `pattern-runaway`. A23-N2.
3. **AC-23.3** — Datadog enterprise-tier spike → `adapter-tier-drift`. A23-N3.
4. **AC-23.4** — Cost-ledger empty → no false-positive anomalies. A23-M1.
5. **AC-23.5** — Doppler config missing → fallback to global default ceilings ($5/run per §8.4). A23-M2.
6. **AC-23.6** — Phase 2 halt action emits `runner.budget.exceeded.v1` exactly once (idempotent). A23-E2.
7. **AC-23.7** — Cross-tenant cost-ledger read blocked by RLS. A23-X1.
8. **AC-23.8** — Real-time runaway detection latency <60s.

---

## §10 — Panel Questions

### G23-Q1 — Confirm Cost Governor role canonical

Resolves §27 OQ-2 partially. Disposition?

- (a) Confirm Cost Governor as canonical role for Agent #23.
- (b) Reassign Cost Governor to a different Ops Runner slot.
- (c) Make Cost Governor a new agent #27 outside the dormant set.
- (d) Bundle Cost Governor responsibility into Agent #18 Business Planning.
- (e) INSUFFICIENT_INFORMATION.

### G23-Q2 — Mode disposition

W3 recommends cross-step (cost is cross-cutting). `_registry.ts` declares step-owner. Resolution?

- (a) Update to cross-step (W3 recommendation; matches cross-cutting nature).
- (b) Keep step-owner; bind to a specific step (e.g. monitor) for cost reporting.
- (c) Hybrid — step-owner at monitor + always-on for real-time detection.
- (d) Always-on (per Locked Rule 14 "continuous").
- (e) INSUFFICIENT_INFORMATION.

### G23-Q3 — 60s cadence vs event-driven

W3 recommends 60s scheduled polling. Right?

- (a) 60s scheduled polling — current plan; cost-efficient.
- (b) Event-driven via cost-ledger writes — finer latency.
- (c) Hybrid — event-driven for runaway, 60s for pattern/drift.
- (d) 10s polling for latency-sensitive deployments.
- (e) INSUFFICIENT_INFORMATION.

### G23-Q4 — Phase 2 critical-magnitude human gate

Phase 2 auto-halt for `critical` magnitude requires human gate. Right?

- (a) Always human gate for halt actions regardless of magnitude.
- (b) Human gate for critical only; low/medium/high autonomous.
- (c) Per-product configurable human-gate threshold.
- (d) Never autonomous halt — operator must always click "halt".
- (e) INSUFFICIENT_INFORMATION.

### G23-Q5 — Anomaly threshold tuning

Current thresholds: 80% ceiling within 25% duration; 150% rolling 7d baseline. Right?

- (a) Current thresholds.
- (b) Tighter: 70% / 20% duration; 130% baseline.
- (c) Looser: 90% / 30% duration; 200% baseline.
- (d) Per-product configurable thresholds.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #23 Cost Governor engineering spec. Pending Panel role-confirmation + mode disposition.*
