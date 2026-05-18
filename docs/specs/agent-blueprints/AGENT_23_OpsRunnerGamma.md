# Agent #23 — Ops Runner Gamma — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A23-REVISE` plurality 6/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs; addresses A23 Panel objections + applies cluster-fix paste blocks)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern + Cluster A v3 owner pattern (Agent #23 OWNS the canonical Cluster A integration template).
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor hint per Layer 2 PG1) + Orchestra Integration Spec §7 (cost tracking) + §8.4 (run-budget ceiling) + CA-11-B.10 ToolMenu + Cluster A v3 §3.2 (canonical-owner privilege).

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #67 (circular dependency — Cost Governor governs its own LLM dispatches):** RESOLVED via §13.1 "self-reference cycle break" sub-section. Agent #23's own LLM dispatches use the canonical Cluster A `costGovernor.reserve()` / `settle()` / `agent.cost.signal.v1` path, but Cost Governor consumes its OWN cost signals through a separate read path that is gated against re-triggering anomaly detectors on Agent #23's own emissions (boundary class `'cost-governor-self'` per Cluster A v3 §3.1; excluded from `single-run-runaway` + `pattern-runaway` detectors per §13.1).
- **Obj #83 / #86 (cross-step vs step-owner mode conflict):** RESOLVED — §1 + §12 update Agent #23's canonical mode to **`cross-step`** per Layer 2 PG1 hint + W3 recommendation + the cost-cross-cuts-pipeline-steps argument. `_registry.ts` mode field migrates from `step-owner` to `cross-step` at Agent #23 first-ship commit. Step binding column drops (cost is cross-cutting; no single pipeline step owns it).
- **Obj #96 (escalation policy):** §1 + §7 update Agent #23's escalation policy to the canonical cross-step shape (escalate to Cost Governor Executor sibling on side-effect attempts in Phase 1; Phase 2 Executor self-handles; Panel + CEO route for `critical` magnitude budget-halts). The legacy "Reserved Step-Owner charter — escalate to #1 on any side effect attempt" placeholder is REMOVED.
- **Cluster A Path P1 paste block (Agent #23 OWNS the template — canonical-owner privilege):** §13 added. Agent #23 v2 declares the canonical Cluster A enforcement contract that every other agent's §13 reference depends on. The 4 P1 conditions A-a..A-d are inherent to Agent #23's charter (boundary class membership documented; advisory-lock + lease-token discipline implemented; SERIALIZABLE isolation enforced; halt-envelope semantics own).
- **Cluster C paste block (PROMOTED per ENTRY 009):** §14 added — canonical MessageBus topic + schema-validator integration for `23.cost_anomaly.v1`, `23.budget_halt.v1`, `23.cost_digest.v1`, `runner.budget.exceeded.v1`.
- **Cluster D paste block (PROMOTE-WITH-CONDITIONS D-a/D-b/D-c per ENTRY 009):** §15 added. Agent #23 emits 4 net-new topics, fitting within the 5-topic-per-ship ceiling (single first-ship commit). Hash-chain mirroring + load-test gate apply.
- **Cluster E paste block (v3 + CA-9-Q4 Option (a) LOCKED context per ENTRY 009):** §16 added. Agent #23 primary remains `[RECOMMEND_ONLY]`; the Phase 2 `cost-governor-executor` sibling carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` per the canonical CA-7 §15.5 pattern (no roster-mutation surprise — Agent #23 was always sibling-pattern; only the legacy primary-dual-authority risk for Agents #21/#26 needed correction).
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity (v2 — mode resolved to cross-step per Obj #83 / #86)

| Field | Value |
|---|---|
| ID | `23` |
| Name | `Ops Runner Gamma — Cost Governor` (canonical role per Layer 2 PG1 hint + v2 ratification) |
| **Mode (v2)** | **`cross-step`** — cost is cross-cutting across all pipeline steps; no single step owns it. v2 supersedes v1's `step-owner` proposal. `_registry.ts` row 23 migrates `mode: 'cross-step'` at Agent #23 first-ship commit. |
| Step | **N/A (cross-step)** — Agent #23 is not bound to a single pipeline step; it observes cost-ledger writes from ALL step-owner and cross-step agents in real time. |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Phase 2 sibling Executor | `cost-governor-executor` — sibling registered in `EXECUTOR_REGISTRY` per CA-7 §15.5 at Phase 2 dispatch. Sibling charter authority: `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. The budget-halt action (`flowai_run_budgets.exceededAt` write) is the sibling's responsibility; `requires_human_gate` resolves automatically for `single-run-runaway` halts at ≥150% of ceiling, routes to Panel for `pattern-runaway` and `adapter-tier-drift` halts. |
| **Escalation policy (v2 — replaces legacy placeholder)** | **Phase 1 (`[RECOMMEND_ONLY]`):** Agent #23 emits `23.cost_anomaly.v1` envelopes only; any side-effect attempt within the primary is rejected by `BaseAgent.guard()` (no `auto_write_internal` in primary charter). **Phase 2 sibling:** the sibling Executor performs budget-halt writes under `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`; `critical`-magnitude budget-halts route to Panel + CEO per Locked Rule 13. **Self-reference path** (Agent #23's own LLM dispatch budget): see §13.1 — boundary class `cost-governor-self`, excluded from anomaly detectors to prevent self-trigger loops. |

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

## 12. Open clarification flags (v2 — most flags resolved; remaining are operational tuning only)

- **Q (RESOLVED v2):** Cost Governor as canonical role for Ops Runner Gamma — RESOLVED per Layer 2 PG1 hint + v2 ratification.
- **Q (RESOLVED v2):** Cross-step vs step-owner mode — RESOLVED to `cross-step` per Obj #83 / #86 (see §1 v2).
- **Q (OPTIONAL):** Real-time vs near-real-time (60s poll) cost-anomaly detection — 60s recommended for cost-efficient implementation; latency-sensitive deployments may want event-driven. **CLARIFICATION OPTIONAL.**

---

## 13. Cluster A integration — Agent #23 is the CANONICAL OWNER (v2 paste block, A-a..A-d)

Per `docs/specs/canonical-templates/CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 ACCEPT-WITH-CONDITIONS. Agent #23 is the canonical-owner of the Cluster A template — every other agent's Cluster A reference points at the contract Agent #23 implements.

- **A-a (boundary-class membership documented):** Agent #23 declares the canonical cost-class taxonomy used by every agent:
  - `step-owner` (e.g. Agents #6, #7, #8, #9, #10) — cost aggregated at run grain.
  - `cross-step` (e.g. Agents #11, #12, #18, #23 itself) — cost aggregated at agent×day grain.
  - `always-on` (e.g. Agents #13, #17, #26) — cost aggregated at agent×day grain with separate cadence ledgers.
  - `**cost-governor-self**` (Agent #23 only) — cost aggregated at agent×day grain, EXCLUDED from anomaly detection per §13.1.
- **A-b (advisory-lock + lease-token pattern):** `costGovernor.reserve(estimatedUsd)` uses PostgreSQL advisory lock + 60s lease TTL per Cluster A v3 §2.5. `pg_try_advisory_xact_lock(<budget_row_id>)` acquires the lock; lease token returned to caller; settle() releases via lease token (idempotent). Lease expiry > 60s without settle triggers automatic budget refund + `LEASE_EXPIRED` envelope.
- **A-c (SERIALIZABLE isolation for budget mutations):** all `flowai_run_budgets` mutations issued by the Cluster A library (which Agent #23 owns) run under `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`. Read-only cost-ledger queries from Agent #23's anomaly detectors use REPEATABLE READ (sufficient — they don't mutate).
- **A-d (cost-signal halt envelope):** Agent #23 is the canonical EMITTER of `runner.budget.exceeded.v1` per Orchestra spec §8.4. When `costGovernor.reserve()` denies at the ceiling boundary, the Phase 2 sibling Executor writes `flowai_run_budgets.exceededAt` AND emits `runner.budget.exceeded.v1` for the calling runner to consume + halt. Halt-envelope semantics + payload shape are defined by Agent #23's contract.

### §13.1 — Self-reference cycle break (Obj #67 resolution)

Agent #23's own LLM dispatches (Anthropic / OpenRouter analyze calls per §5 ToolMenu) consume cost. The naive interpretation — "Agent #23 governs its own dispatches" — creates a circular dependency where a single Cost Governor anomaly detector firing on Agent #23's own cost spike triggers more Agent #23 LLM analysis to characterise the anomaly, which spikes cost further, etc.

**v2 resolution — boundary class `cost-governor-self`:**

1. Agent #23's primary LLM dispatches register cost under boundary class `'cost-governor-self'` (per A-a above). The reserve/settle/signal path is identical to other classes — Agent #23 does NOT bypass `costGovernor.reserve()`.
2. The three anomaly detectors (`single-run-runaway`, `pattern-runaway`, `adapter-tier-drift`) **EXCLUDE rows tagged `cost-governor-self`** from their input corpus. This is a hard predicate at the detector query layer (`WHERE boundary_class != 'cost-governor-self'`), not a heuristic.
3. A SEPARATE detector class `cost-governor-self-drift` monitors Agent #23's own cost: if `cost-governor-self` daily spend exceeds 2× rolling 30-day baseline for ≥3 consecutive days, emits `23.cost_anomaly.v1 { category: 'cost-governor-self-drift', severity: 'P2', evidence: ... }` for human review (NOT auto-halt — Agent #23 halting itself would defeat the governance purpose).
4. The Panel-routable escalation per Locked Rule 13 covers the rare case where Agent #23's own cost grows unbounded — admin/CEO disposition explicitly required to halt the governor.

This breaks the circular dependency at the detector input boundary (predicate exclusion) AND provides a separate audit-only detector for self-drift, so Agent #23's own runaway is not invisible.

## 14. Cluster C integration — PROMOTED canonical MessageBus topic + schema-validator block (v2 paste block)

Per `docs/specs/canonical-templates/CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md` + ENTRY 009 Cluster C PROMOTED.

**Topic + schema-validator declarations:**
- **Consumed:** `flowai_adapter_cost` ledger writes (via Inngest event stream or DB poll); `1.crawl.request.v1`, `21.crawl.completed.v1` (cost-per-crawl correlation); all `agent.cost.signal.v1` emissions across the fleet.
- **Produced:** `23.cost_anomaly.v1`, `23.budget_halt.v1` (Phase 2), `23.cost_digest.v1` (monthly), `runner.budget.exceeded.v1` (Phase 2 — Agent #23 is the canonical emitter per Orchestra §8.4).
- **Mode-stamping (Cluster C §2.4):** Agent #23 is `cross-step` (per §1 v2); its envelopes carry `pipelineMode` derived from the cost-ledger row's source run mode. For `cross-step` aggregation envelopes (e.g. `23.cost_digest.v1`), `pipelineMode: 'mixed'` is used when the aggregation spans multiple modes.

**Schema validator hook:** all 4 produced topics validate against `MessageSchema.js` per Cluster D §2.3 invariants. Agent #23's topic declarations land in the same commit as `_registry.ts` row 23 mode migration (see §17).

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (v2 paste block, D-a/D-b/D-c)

Per `docs/specs/canonical-templates/CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009 Cluster D PROMOTE-WITH-CONDITIONS.

- **D-a (envelope drift guards):** all 4 Agent #23 topics conform to Cluster D v3 §2.2 naming; migration test harness covers them.
- **D-b (retention-class binding):** `23.cost_anomaly.v1`, `23.budget_halt.v1`, `runner.budget.exceeded.v1` are `retention-class: governance` (7-year cold-store + hash-chain mirror). `23.cost_digest.v1` (monthly aggregation, no per-event audit value) is `retention-class: ops` (90-day hot only).
- **D-c (replay-buffer semantics):** Agent #23 idempotency key (`runId + anomalyCategory + detectedAt-truncated-to-minute`) prevents double-emission per A23-E2 test.

**Topic-per-ship ceiling (R-D2):** Agent #23 emits 4 net-new topics, within the 5-topic-per-commit ceiling. Single first-ship commit lands all 4 in one §14.1 micro-amendment.

**Load-test artifact gate:** Agent #23's first-ship is gated on the shared §14.1 P0-patch load-test artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context (v2 paste block)

Per `docs/specs/canonical-templates/CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md` v3 + ENTRY 009 CA-9-Q4 Option (a) LOCKED.

**Charter-distribution (canonical sibling pattern — Agent #23 was always sibling-shaped):**
- Primary Agent #23: `[RECOMMEND_ONLY]` — unchanged from v1.
- Phase 2 sibling Executor `cost-governor-executor`: `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` — registered in `EXECUTOR_REGISTRY` per CA-7 §15.5 at Phase 2 dispatch.

Agent #23 v1 already followed the canonical sibling pattern (unlike Agent #21/#26 which had the legacy dual-authority-on-primary issue); v2 confirms the pattern is unchanged. The Cluster E v3 §5.1 §15.1 roster delta for Agent #23 is: primary row authority `[RECOMMEND_ONLY]` (no change); sibling row added at Phase 2 only (NOT at Phase 1 first-ship — Phase 2 is sequenced after Phase 1 proves stable).

**Authoritative ceiling enforcement (Cluster E v3 §2.5):** sibling's `execute()` entry traverses `BaseAgent.guard()`; advisory-cache + Orchestrator authoritative re-validation per Cluster E v3 §2.5 + §2.8 split-brain resolution. Critical-magnitude budget-halts emit `agent.ceiling.violation.v1` if the operator's `authorityCeilings[mode_X][operational]` is below `supervised`.

**Cluster E v4 readiness (ENTRY 009 SPLIT — v4 still required):** Agent #23 v2 anchors to Option (a). Cluster E v4 final-form deltas land in a follow-up micro-revision once v4 ratifies.

## 17. Registry mutation — mode migration step-owner → cross-step (Obj #83 / #86 resolution)

**Mutation — `src/lib/agents/_registry.ts` row 23 (Agent #23):**
- `mode: 'step-owner'` → `mode: 'cross-step'`
- `step: <whatever_was_there>` → `step: null` (cross-step agents have no step binding)
- Migration test: all 25 SHIPPED-GREEN tests + Agent #23's own A23-* tests re-run green against the new mode classification. Tests that hard-code `agent.mode === 'step-owner'` for Agent #23 are migrated.

This mutation is independent of the primary roster cardinality (`validateRoster()` 25-cap is unaffected — row count unchanged); only the row-23 mode field migrates.

---

## 18. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution |
|---|---|---|
| **67** | Cost Governor circular dependency (governs its own dispatches) | §13.1 self-reference cycle break — `cost-governor-self` boundary class excluded from anomaly detectors; separate `cost-governor-self-drift` audit-only detector for visibility. |
| **83** | Cost Governor mode ambiguity (`_registry.ts` step-owner vs W3 cross-step) | §1 v2 + §17 — mode migrated to `cross-step` per Layer 2 PG1 hint. `_registry.ts` row 23 mutation at first-ship. |
| **86** | Agent #23 mode conflict | Same resolution as #83. |
| **96** | Escalation policy placeholder | §1 v2 — canonical escalation policy replaces the legacy "Reserved Step-Owner charter" placeholder. Phase 1 reject side-effects via `BaseAgent.guard()`; Phase 2 sibling self-handles; critical magnitude routes to Panel + CEO. |

---

*End of Agent #23 Ops Runner Gamma (Cost Governor) build blueprint v2. Panel `PLURALITY_A23-REVISE` 6/10 objections resolved per §18 above. Cluster paste blocks A-P1 (canonical owner), C, D, E applied per §13-16. Pending W6 re-ratification.*
