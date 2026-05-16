# Agent #23 — Ops Runner Gamma — Build Blueprint

**Status:** DORMANT. Role canonically **HINTED** as Cost Governor per Layer 2 Implementation Plan PG1 (Rev-2.1 §27 OQ-2). Step binding still pending formal CEO/Panel ratification.

**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor hint per Layer 2 PG1) + Orchestra Integration Spec §7 (cost tracking) + §8.4 (run-budget ceiling) + CA-11-B.10 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `23` |
| Name | `Ops Runner Gamma — Cost Governor` (proposed per Layer 2 PG1 hint) |
| Mode | `step-owner` (proposed) |
| Step | **TBD — pending §27 OQ-2 disposition; W3 recommends cross-step (cost is cross-cutting) — see §12 below** |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | `cost-governor-executor` — needed when Cost Governor halts a runaway-cost run (sets `flowai_run_budgets.exceededAt`); Authority `[auto_write_internal, requires_human_gate]` (mirrors Self-Renewal Executor pattern per CA-7 §15.5; the budget-halt action is auto_write_internal — writes to the budget table — but always Human-Gated for `critical` magnitude to avoid runaway false-positive halts). |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes Orchestra cost-ledger (`flowai_adapter_cost` per Orchestra spec §7.1) in real-time; consumes per-run budget ceilings (`flowai_run_budgets` per Orchestra spec §8.4); consumes per-product cost-config from Doppler (`flowai/<env>/PRODUCTS_<productId>_AGGRESSIVE_CRAWL_BUDGET_USD` per ENTRY 006 §7.6 + similar per-product knobs).
- **Decide:** detects 3 cost-anomaly categories:
  1. **Single-run runaway** — spend exceeds 80% of ceiling within ≤25% of expected duration.
  2. **Pattern runaway** — rolling 7-day per-product spend > 150% of trailing 30-day baseline.
  3. **Adapter cost-class drift** — adapter usage shifted to `high` / `enterprise` tier without corresponding `auto_write_internal`-justified workload (e.g. Datadog usage spike).
- **Execute (Phase 1 recommend_only):** emits cost-anomaly envelopes; admin/CEO triages.
- **Execute (Phase 2 via Executor):** auto-halts single-run runaway by setting `flowai_run_budgets.exceededAt` (the canonical hard stop per Orchestra spec §8.4); emits `runner.budget.exceeded.v1` for the runner to consume.
- **Emit:** `23.cost_anomaly.v1`, `23.budget_halt.v1` (Phase 2), `23.cost_digest.v1` (monthly).

## 3. MessageBus topics

**Consumes:**
- `flowai_adapter_cost` ledger writes (via Inngest event stream or DB poll)
- `1.crawl.request.v1`, `21.crawl.completed.v1` (cost-per-crawl correlation)

**Produces:**
- `23.cost_anomaly.v1` — payload: `{ productId, runId, category: 'single-run-runaway'|'pattern-runaway'|'adapter-tier-drift', severity, evidence, at }`
- `23.budget_halt.v1` (Phase 2) — payload: `{ runId, productId, spentUsd, ceilingUsd, haltedAt }`
- `runner.budget.exceeded.v1` (Phase 2; produced into Orchestra spec §8.4 contract)
- `23.cost_digest.v1` (monthly) — payload aggregating top cost contributors per product per adapter

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: costLedgerSlice, criteria: 'cost-anomaly-detection' }, opts);
// Phase 2 (Executor): direct Supabase write to flowai_run_budgets — no Orchestra dispatch needed for halt action
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze` (anomaly detection on cost ledgers) |
| 2 | OpenRouter | `openrouter` (forecasting models, e.g. `openai/gpt-5`) | high | `analyze`, `summarize` (cost-forecast generation) |
| 3 | Vercel | `vercel` | free | `deploy` cost telemetry (deployment-cost signal) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent23CostGovernor.js                   # ~520 LOC
src/lib/agents/agents/__tests__/Agent23CostGovernor.test.js    # ~340 LOC
```

Phase 2 Executor:
```
src/lib/agents/agents/Agent23CostGovernorExecutor.js           # ~360 LOC
# Plus EXECUTOR_REGISTRY entry per CA-7 §15.5 pattern
```

**Class skeleton:**

```js
export class Agent23CostGovernor extends BaseAgent {
  static charterId = 23;
  static charter() {
    const r = getAgent(23);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* 3 anomaly detectors run in parallel */ }
  async act(ctx, plan) { /* emit anomaly envelopes; Phase 2 routes to executor */ }
  async recommend(ctx) { /* always-on or step-owner entry per OQ-2 disposition */ }
}
```

## 7. OrchestratorHub wire-in pattern

If cross-step (W3 recommendation): `hub.registerCrossStep('cost-governor', agent)`; continuous-loop via Inngest every 60s (real-time runaway detection).
If step-owner: less ideal (cost is cross-cutting; step-binding would miss inter-step accumulation).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A23-N1 | Nominal | Run at 80% ceiling within 25% expected duration → `23.cost_anomaly.v1` category `single-run-runaway` |
| A23-N2 | Nominal | 7-day spend 1.5× baseline → `pattern-runaway` envelope |
| A23-N3 | Nominal | Datadog usage spike (`enterprise` tier) → `adapter-tier-drift` envelope |
| A23-M1 | Malformed | Cost-ledger query returns empty → no false-positive anomalies |
| A23-M2 | Malformed | Doppler config missing → fallback to global default ceilings (per Orchestra spec §8.4 $5/run default) |
| A23-E1 | Edge | Run exactly at ceiling (100.0% spent, 100.0% duration) → no anomaly (matches expected) |
| A23-E2 | Edge | Phase 2 budget-halt action emits `runner.budget.exceeded.v1` exactly once per run (idempotent) |
| A23-X1 | Adversarial | Cross-tenant cost-ledger read attempt blocked (RLS per Orchestra spec §7.1) |
| A23-X2 | Adversarial | Operator without admin role attempts to override budget-halt → guard rejects per §13 |
| A23-X3 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A23-* tests passing
- Real-time runaway detection latency <60s (synthetic injection test)
- Monthly digest produced for ≥3 consecutive months
- At least one `23.budget_halt.v1` (Phase 2) executed against a runaway synthetic run successfully halting it
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Orchestra cost-ledger LIVE (per Orchestra spec §7.1); per-run budget table (per §8.4)
- **Recommendation:** Cost Governor is the highest-value Ops Runner to graduate next — directly enforces Orchestra spec's $5-default (and $15 ACE) cost ceiling. Recommended as priority after Agents #10 (Monitor) + #26 (Orchestra Research).
- **Provides to:** Admin UI cost dashboard; CEO alerting; Self-Renewal cost-context awareness (`23.cost_anomaly.v1` informs whether to extend or curtail fork-and-fix runs)

## 11. Estimated build effort

**~13 W-hours** Phase 1 (3 detectors + cross-step orchestration loop + monthly digest). Phase 2 Executor adds **~6 W-hours** for the budget-halt write path + Human Gate hand-off.

## 12. Open clarification flags

- **Q (RECOMMENDED):** Confirm Cost Governor as canonical role for Ops Runner Gamma (resolves §27 OQ-2 partially). **NEEDS CEO/PANEL CLARIFICATION**.
- **Q:** Cross-step vs step-owner mode disposition — W3 recommends cross-step; CEO ratifies. **CLARIFICATION RECOMMENDED**.
- **Q:** Real-time vs near-real-time (60s poll) cost-anomaly detection — 60s recommended for cost-efficient implementation; latency-sensitive deployments may want event-driven. **CLARIFICATION OPTIONAL**.
