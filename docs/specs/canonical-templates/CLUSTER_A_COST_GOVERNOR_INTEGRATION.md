# Cluster A — Cost Governor Integration (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor charter), Orchestra Integration Spec §7.1 (`flowai_adapter_cost` ledger) + §8.4 (`flowai_run_budgets` ceiling table), `docs/specs/agent-specs/AGENT_23_OpsRunnerGamma.md` (commit `e1752f1`).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` (W6 commit `076a35b`) — Top-3 Highest-Risk Finding #3 + Batch 1 objections #04 + #07 + #12.

---

## §1 — Problem Statement

The 18-agent consolidated Panel surfaced **budget enforcement fragmentation** as one of three highest-risk systemic findings:

### Verbatim Panel quotes

**Top-3 Highest-Risk Finding #3 (Slot 8 — openrouter:perplexity/sonar):**
> G6-Q4 leaves ambiguity between `dispatchWithFallback`, Agent #6 self-checks, and Agent #23 Cost Governor. If multiple layers enforce the same cap, they can race and produce double-failures or inconsistent error reasons; if only one layer does, the others become stale bypass surfaces. The spec does not define a single authoritative ledger read/write path or whether budget consumption is reserved atomically before dispatch.

**Batch 1 objection #04 (Slot 1):**
> Each agent spec proposes different budget enforcement mechanisms — Agent #6 suggests internal checks, Orchestra dispatch, or Agent #23 Cost Governor. This fragmentation risks double-spending or enforcement gaps when multiple agents run concurrently.

**Batch 1 objection #07 (Slot 2):**
> The proposal suggests multiple locations for enforcing budget caps (G6-Q4), but lacks a unified approach. This could lead to inconsistent enforcement and potential overspending, especially if different agents or components enforce caps independently.

**Batch 1 objection #12 (Slot 4):**
> The proposal does not clearly specify where budget caps should be enforced. For instance, §7.3 mentions a per-product `researchBudgetCap`, but it is unclear whether this should be enforced inside Agent #6, in Orchestra `dispatchWithFallback`, or elsewhere. This ambiguity can lead to budget overruns and unpredictable costs.

### Affected scope

- Every agent spec that previously declared a self-enforced budget cap (`researchBudgetCap`, `auditBudgetCap`, `monitorBudgetCap`, etc.).
- The Panel finding directly blocks Agent #6 spec ratification; transitively blocks every agent spec that follows the same self-enforcement pattern (Agents #6, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19, #20, #26).

### Why this blocks engineering dispatch

Without canonical resolution: parallel agent invocations would either (a) race the cost-ledger and produce inconsistent results, or (b) leave gaps where no layer enforces the cap. Both modes violate Orchestra spec §8.4 ("$5/run/product/env default ceiling with per-product Doppler override").

---

## §2 — Canonical Resolution

**Agent #23 Ops Runner Gamma (Cost Governor) is the SOLE canonical budget enforcement owner.** All other agents MUST NOT enforce budget caps themselves — they emit a cost signal and defer.

### §2.1 — Single source of truth

- **Authoritative ledger:** `flowai_adapter_cost` Supabase table per Orchestra Integration Spec §7.1.
- **Authoritative ceiling table:** `flowai_run_budgets` per Orchestra Integration Spec §8.4.
- **Authoritative enforcement agent:** Agent #23 Cost Governor.
- **Authoritative halt mechanism:** Agent #23 Cost Governor Executor (Phase 2 per `AGENT_23_OpsRunnerGamma.md`) writes `flowai_run_budgets.exceededAt`; AutoRunner halts when row read returns non-null `exceededAt`.

### §2.2 — Canonical cost-signal topic

Every agent that incurs cost (LLM dispatch, crawl invocation, deployment) MUST emit:

**Topic:** `agent.cost.signal.v1`

**Payload shape:**
```ts
{
  runId: string,                            // UUID v4 from AutoRunner
  productId: string,
  agentId: number,                          // emitting agent's charter id
  executorKey?: string,                     // when emitted from an EXECUTOR_REGISTRY sibling
  invocationId: string,                     // unique per dispatch (e.g. ULID)
  costEvent: 'pre-dispatch' | 'post-dispatch' | 'pre-dispatch-rejected',
  adapter: string,                          // e.g. 'anthropic-api', 'browserless', 'openrouter:perplexity/sonar'
  capability: string,                       // e.g. 'analyze', 'crawl', 'extract-structured'
  estimatedCostUsd?: number,                // present on pre-dispatch
  observedCostUsd?: number,                 // present on post-dispatch
  costTier: 'free' | 'low' | 'medium' | 'high' | 'enterprise',
  at: ISO8601,
}
```

### §2.3 — Atomic pre-dispatch reservation contract

Per Top-3 Finding #3 ("reserved atomically before dispatch"): Agent #23 implements **two-phase commit** for cost reservation.

**Phase 1 — Reservation (synchronous, before dispatch):**
1. Emitting agent calls `costGovernor.reserve({runId, productId, estimatedCostUsd, ...})`.
2. Agent #23 reads `flowai_run_budgets.ceilingUsd - spentUsd - reservedUsd` for the `runId`; if `< estimatedCostUsd` → returns `{ok: false, reason: 'ceiling_would_be_exceeded'}`; emitting agent emits `agent.cost.signal.v1` with `costEvent: 'pre-dispatch-rejected'` and aborts dispatch.
3. If sufficient → Agent #23 atomically increments `reservedUsd` (Supabase RLS-locked UPDATE); returns `{ok: true, reservationId}`. Emitting agent emits `agent.cost.signal.v1` with `costEvent: 'pre-dispatch'`.

**Phase 2 — Settlement (post-dispatch):**
4. Emitting agent dispatches via Orchestra.
5. On settlement, emitting agent calls `costGovernor.settle({reservationId, observedCostUsd})`.
6. Agent #23 atomically decrements `reservedUsd` by the reserved amount AND increments `spentUsd` by `observedCostUsd`; emitting agent emits `agent.cost.signal.v1` with `costEvent: 'post-dispatch'`.

**On dispatch failure** (Orchestra returns 5xx / 429 / timeout): emitting agent MUST still call `costGovernor.settle({reservationId, observedCostUsd: 0})` to release the reservation. The reservation lifecycle is mandatory; orphaned reservations are reclaimed by Agent #23's periodic reaper job (5-min cadence; reclaims reservations older than 10 min).

### §2.4 — Removed responsibilities (every other agent)

Every agent spec that previously declared self-enforcement (e.g. "Agent #6 checks `researchBudgetCap` before dispatch") MUST remove that logic. The agent's only budget interaction is:
1. Call `costGovernor.reserve()` before dispatch.
2. Emit `agent.cost.signal.v1` with `costEvent: 'pre-dispatch'`.
3. Dispatch via Orchestra.
4. Call `costGovernor.settle()` post-dispatch.
5. Emit `agent.cost.signal.v1` with `costEvent: 'post-dispatch'`.

The per-product `<agent>BudgetCap` fields previously declared in agent specs (e.g. `ProductRegistry.researchBudgetCap`, `auditBudgetCap`, `monitorBudgetCap`) become **inputs to Agent #23's ceiling computation** — they remain in `ProductRegistry` but are read ONLY by Agent #23 (it computes the effective ceiling from per-agent caps).

### §2.5 — Audit-log integration

`agent.cost.signal.v1` is canonical per §14.1 — added to the 65-topic catalogue in the Cluster D extension (`CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`).

---

## §3 — Agent Spec Integration Instructions

Every affected agent spec MUST replace its current "budget enforcement" text with this canonical block. Customise only the `<agent-specific-fields>`.

### §3.1 — Block to paste into §7 Security Controls of each affected agent spec

````markdown
### §7.X — Budget enforcement (canonical per CLUSTER_A_COST_GOVERNOR_INTEGRATION.md)

This agent DOES NOT enforce budget caps directly. Per Cluster A canonical
resolution, Agent #23 Ops Runner Gamma (Cost Governor) is the sole budget
enforcement owner.

Pre-dispatch contract (mandatory for every external-cost invocation):
1. Call `costGovernor.reserve({
     runId, productId, agentId: <agent-id>,
     adapter: <adapter-name>,
     capability: <capability-name>,
     estimatedCostUsd: <estimate>,
     costTier: <tier>,
   })` BEFORE dispatching to Orchestra.
2. If `{ok: false}` returned → emit `agent.cost.signal.v1` with
   `costEvent: 'pre-dispatch-rejected'`; abort dispatch; emit
   agent's own block envelope with reason `'budget-cap-reached'`.
3. If `{ok: true, reservationId}` returned → emit
   `agent.cost.signal.v1` with `costEvent: 'pre-dispatch'`; proceed.

Post-dispatch contract (mandatory ALWAYS, success or failure):
4. On dispatch settlement (success): call `costGovernor.settle({
     reservationId, observedCostUsd: <observed>,
   })`; emit `agent.cost.signal.v1` with `costEvent: 'post-dispatch'`.
5. On dispatch failure: call `costGovernor.settle({
     reservationId, observedCostUsd: 0,
   })` to release the reservation; emit
   `agent.cost.signal.v1` with `costEvent: 'post-dispatch'` and
   `observedCostUsd: 0`.

This agent's previous per-product cap field (`<agent>BudgetCap`) is
retained in `ProductRegistry` but is read ONLY by Agent #23 — this agent
does NOT read it directly.

Orphaned reservations: Agent #23 reaper job releases reservations older
than 10 minutes; this agent does not implement its own cleanup.
````

### §3.2 — Block to paste into §3 Input Contract / §4 Output Contract

Replace any existing `produces` array entries related to cost signals with:

````markdown
**Produces (cost-signal):** `agent.cost.signal.v1` per Cluster A canonical
resolution. See §7.X for the pre-dispatch + post-dispatch contract.
````

### §3.3 — Block to delete from §6.4 Key engineering risks

Delete any risk entry that begins with "Budget cap enforcement" or "Per-product cost cap". Replace with:

````markdown
N. **Cost enforcement** — delegated to Agent #23 per Cluster A canonical
   resolution; no risk surface in this agent.
````

---

## §4 — Acceptance Criteria

How W2 verifies the Cluster A fix is correctly implemented in each agent spec revision.

1. **AC-CA-1 (Spec-level grep):** No agent spec other than `AGENT_23_OpsRunnerGamma.md` contains the substring `enforce.*budget` or `budgetCap` in an "I do" context. The only allowed contexts are `<agent>BudgetCap` field references read BY Agent #23 (passive references) and the Cluster A integration block from §3.1.

2. **AC-CA-2 (Reservation atomicity):** Implementation-level test (deferred to engineering dispatch) — 100 concurrent reservation requests against a $5 ceiling with $1 estimates each result in exactly 5 successful reservations + 95 rejections; total `reservedUsd + spentUsd` never exceeds ceiling.

3. **AC-CA-3 (Settlement guarantee):** For every successful `reserve()` call there is exactly one `settle()` call within 10 minutes; orphaned reservations reaped by Agent #23 reaper.

4. **AC-CA-4 (Topic schema validation):** `agent.cost.signal.v1` payload validates against the §2.2 shape; topic name registered in §14.1 canonical catalogue per Cluster D extension.

5. **AC-CA-5 (No-direct-ledger-read invariant):** No agent other than Agent #23 imports `flowai_adapter_cost` or `flowai_run_budgets` for read. Spec-level grep + import-level integration test (deferred).

6. **AC-CA-6 (Failure-mode settlement):** For every Orchestra dispatch failure (5xx / 429 / timeout), `settle({observedCostUsd: 0})` is called within the same execution context; reservation released; verified by deliberate-failure injection test.

---

## §5 — Affected Agents

Every agent spec MUST be revised to reference this template before re-spec for Panel re-ratification. Specs are organised by current budget-self-enforcement footprint:

| Agent | Current self-enforced cap | Cluster A revision required |
|---:|---|---|
| #6 Research | `researchBudgetCap` ($0.50/run) — explicit in §7.3 + G6-Q4 | YES — paste §3.1 block; delete G6-Q4 question (resolved by Cluster A) |
| #7 Design | implicit via Phase 2 Executor | YES — paste §3.1 block |
| #8 Quality Audit | `auditBudgetCap` ($2.00/run) — explicit in §6.4 + §7.3 + G8-Q5 | YES — paste §3.1 block; delete G8-Q5 (resolved); update §7 |
| #9 Go-to-Market | implicit via Phase 2 demo-asset gen | YES — paste §3.1 block |
| #10 Monitor | `monitorBudgetCap` ($1.50/run) — explicit in §6.4 risk #6 | YES — paste §3.1 block |
| #11 Strategic Intelligence | implicit via daily crawl | YES — paste §3.1 block |
| #12 Portfolio Risk | implicit via weekly classification | YES — paste §3.1 block |
| #13 Self-Protection | implicit via 5-min always-on loop + Phase 2 Cloudflare cost-tier | YES — paste §3.1 block |
| #14 Public Policy | implicit via monthly crawl | YES — paste §3.1 block |
| #15 Benchmarking | implicit ~$1,125/month baseline + G15-Q2 | YES — paste §3.1 block; G15-Q2 partially resolved |
| #16 Productivity / HR | implicit via audit-log analysis | YES — paste §3.1 block |
| #17 Product Evolution | implicit via daily + monthly LLM dispatch | YES — paste §3.1 block |
| #18 Business Planning | implicit via monthly + quarterly LLM dispatch | YES — paste §3.1 block |
| #19 Technological Evolution | implicit via daily CVE feed | YES — paste §3.1 block |
| #20 Environmental Impacts | implicit via monthly cost-ledger analysis | YES — paste §3.1 block |
| #22/#24/#25 Ops Runners (BLOCKED §27 OQ-2) | TBD per role disposition | YES — paste §3.1 block once role disposed |
| #23 Ops Runner Gamma — **Cost Governor** | THIS AGENT OWNS THE TEMPLATE | NO — Agent #23 IS the canonical enforcement owner; its spec defines the `reserve()` / `settle()` API and reaper job |
| #26 Orchestra Research Agent | implicit via daily 03:00 UTC research loop | YES — paste §3.1 block |

**Total agents unblocked by this template: 19** (all dormant agents except #23 itself).

---

## §6 — Cross-cluster integration notes

- **Cluster D** (Audit-Log Topic Schema): `agent.cost.signal.v1` is added to the §14.1 canonical catalogue extension per Cluster D.
- **Cluster E** (Authority-Ceiling Integration): the `reserve()` call is the natural enforcement point for Operational-authority ceiling checks per CA-12 v3 §A.2.4. Agent #23 reads the ceiling AND the budget; both must clear.
- **Cluster F** (Model-Budget Fallback): `agent.cost.signal.v1.adapter` field records which Orchestra adapter was used; Cluster F's fallback chain interacts with Cluster A by emitting per-fallback `agent.cost.signal.v1` events.

---

*End of CLUSTER_A_COST_GOVERNOR_INTEGRATION.md canonical template. Pending W6 Panel ratification before agent spec revisions begin.*
