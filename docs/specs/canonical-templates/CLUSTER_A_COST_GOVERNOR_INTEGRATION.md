# Cluster A — Cost Governor Integration (Canonical Template, v2)

**Status:** DRAFT v2 — Panel conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `4b0bbc0`, 2026-05-16) → v2 (this commit, 2026-05-17 — Panel `PLURALITY_CLA-REVISE` 7/9 conditions R1–R4 applied per W3 Dispatch #10).
**Author:** W3.
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor charter), Orchestra Integration Spec §7.1 (`flowai_adapter_cost` ledger) + §8.4 (`flowai_run_budgets` ceiling table), `docs/specs/agent-specs/AGENT_23_OpsRunnerGamma.md` (commit `e1752f1`).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` (W6 commit `076a35b`) — Top-3 Highest-Risk Finding #3 + Batch 1 objections #04 + #07 + #12. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`) — `QUORUM_PLURALITY_CLA-REVISE` 7/9.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — atomic `UPDATE … WHERE … RETURNING` pattern (fixes TOCTOU race between Phase 1 step 2 read and step 3 increment). §2.3 rewritten.
- **R2** — reaper window shortened **10 min → 60–90 s** (orphan reservations reclaimed within one heartbeat-style window rather than blocking budget for 10 minutes). §2.3 + §3.1 + AC-CA-3 updated.
- **R3** — explicit deadlock detection + `statement_timeout` on the reservation UPDATE (PostgreSQL `lock_timeout` + `statement_timeout` per-statement). §2.3 §2.3.1 added.
- **R4** — Cluster E ↔ Cluster A interaction order: `getCeiling()` runs **before** `costGovernor.reserve()`. §2.6 added; §3.1 block updated; §6 cross-cluster note updated.

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

### §2.3 — Atomic pre-dispatch reservation contract (v2 — R1 + R2 + R3)

Per Top-3 Finding #3 ("reserved atomically before dispatch") and v2 Panel R1 (TOCTOU fix): Agent #23 implements **two-phase commit** for cost reservation. Phase 1 is a SINGLE atomic `UPDATE … WHERE … RETURNING` — the v1 read-then-increment pattern was TOCTOU-prone and is REPLACED.

**Phase 1 — Reservation (single atomic UPDATE, before dispatch):**

1. Emitting agent calls `costGovernor.reserve({runId, productId, estimatedCostUsd, ...})`.
2. Agent #23 executes a single atomic statement:
   ```sql
   -- Per-statement timeouts mandatory per v2 R3
   SET LOCAL lock_timeout = '500ms';
   SET LOCAL statement_timeout = '1000ms';

   UPDATE flowai_run_budgets
      SET reservedUsd = reservedUsd + $estimatedCostUsd,
          updatedAt   = now()
    WHERE runId   = $runId
      AND productId = $productId
      AND exceededAt IS NULL
      AND ceilingUsd - spentUsd - reservedUsd >= $estimatedCostUsd
   RETURNING id AS reservationId,
             ceilingUsd, spentUsd, reservedUsd;
   ```
3. If `UPDATE` returns **0 rows** → ceiling would be exceeded OR run already halted. Return `{ok: false, reason: 'ceiling_would_be_exceeded' | 'run_halted'}` (distinguish via post-fact `SELECT exceededAt`). Emitting agent emits `agent.cost.signal.v1` with `costEvent: 'pre-dispatch-rejected'` and aborts dispatch.
4. If `UPDATE` returns **1 row** → reservation succeeded atomically. Return `{ok: true, reservationId}`. Emitting agent emits `agent.cost.signal.v1` with `costEvent: 'pre-dispatch'`.

Rationale (v2 R1): the v1 spec's "read `ceilingUsd - spentUsd - reservedUsd`; if sufficient, then increment" is a textbook TOCTOU race — two concurrent reservations could both pass the read check then both increment, overspending the ceiling. The atomic `UPDATE … WHERE` with the budget predicate in the `WHERE` clause makes the check + increment indivisible at the row-lock level.

**Phase 2 — Settlement (post-dispatch):**

5. Emitting agent dispatches via Orchestra.
6. On settlement, emitting agent calls `costGovernor.settle({reservationId, observedCostUsd})`.
7. Agent #23 executes a single atomic statement (no TOCTOU risk because the delta is deterministic per `reservationId`):
   ```sql
   SET LOCAL lock_timeout = '500ms';
   SET LOCAL statement_timeout = '1000ms';

   UPDATE flowai_run_budgets b
      SET spentUsd    = b.spentUsd + $observedCostUsd,
          reservedUsd = b.reservedUsd - r.reservedAmount,
          updatedAt   = now()
     FROM flowai_run_reservations r
    WHERE b.runId   = r.runId
      AND r.id      = $reservationId
      AND r.settledAt IS NULL
   RETURNING b.spentUsd, b.reservedUsd;
   -- And in the same transaction:
   UPDATE flowai_run_reservations
      SET settledAt = now(),
          observedCostUsd = $observedCostUsd
    WHERE id = $reservationId
      AND settledAt IS NULL;
   ```
   Emitting agent emits `agent.cost.signal.v1` with `costEvent: 'post-dispatch'`.

**On dispatch failure** (Orchestra returns 5xx / 429 / timeout): emitting agent MUST still call `costGovernor.settle({reservationId, observedCostUsd: 0})` to release the reservation. The reservation lifecycle is mandatory.

**Orphan reaper (v2 R2 — shortened window 10 min → 60–90 s):** Agent #23 runs a reaper job every **60 seconds**; it reclaims reservations where `reservedAt < now() - interval '90 seconds'` AND `settledAt IS NULL`. The 90-second window is the maximum reasonable wall-clock for a single Orchestra dispatch round-trip (LLM 60s + buffer); longer-running operations MUST extend by calling `costGovernor.heartbeat(reservationId)` which sets `reservedAt = now()`.

Rationale (v2 R2): the v1 10-minute reaper blocked budget for orphan reservations far longer than necessary, allowing legitimate concurrent runs to false-fail on a stale `reservedUsd`. The 60–90s window matches realistic dispatch latency; long-running operations have an explicit heartbeat path.

### §2.3.1 — Deadlock detection + statement_timeout (v2 R3)

Every reservation / settlement statement runs with explicit PostgreSQL guards:

- `SET LOCAL lock_timeout = '500ms'` — if a row lock cannot be acquired within 500ms, the statement fails with `40P01` (deadlock_detected) / `55P03` (lock_not_available). Caller treats as `{ok: false, reason: 'lock_contention'}`; emitting agent retries up to 3 times with exponential backoff (50ms / 100ms / 200ms); on persistent failure → `{ok: false, reason: 'lock_contention_persistent'}` and aborts dispatch.
- `SET LOCAL statement_timeout = '1000ms'` — if the statement itself runs longer than 1s, it aborts. Caller treats as `{ok: false, reason: 'statement_timeout'}`; emitting agent surfaces as soft failure (not retried — implies database health issue, not contention).

PostgreSQL deadlock detection is automatic at the engine level; the `lock_timeout` ensures the deadlock detector fires within bounded time even when one party of the deadlock is using a long-held lock outside Agent #23 (e.g. concurrent migration). On deadlock detection, the victim transaction rolls back with `40P01`; caller treats identically to `lock_contention`.

These timeouts are MANDATORY per v2 R3 — implementation must `SET LOCAL` at the start of every reservation / settlement / reaper statement; missing timeouts are non-conformant.

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

### §2.6 — Interaction order with Cluster E (v2 R4)

For every Executor / dual-authority primary agent dispatch, the call order is **MANDATORY**:

```
1. getCeiling(productId, mode, dimension)   ← Cluster E §2.1 ceiling lookup
2. BaseAgent.guard(authorityNeeded)         ← Cluster E §2.6 charter check
3. requires_human_gate request (if needed)  ← Cluster E §2.6 human-gate
4. costGovernor.reserve({...})              ← Cluster A §2.3 atomic UPDATE
5. Orchestra dispatch                       ← Cluster F §2.3 model selection
6. costGovernor.settle({...})               ← Cluster A §2.3 settlement
```

**Why this order:** ceiling check is FREE (no DB write, just a JSONB lookup); a ceiling violation is the cheapest possible rejection and MUST short-circuit before any budget reservation. Reserving budget for a request that would be ceiling-rejected wastes a reservation slot for the ~90s reaper window and creates needless contention.

**Forbidden orderings:**
- `reserve()` BEFORE `getCeiling()` — wastes budget on ceiling-rejected requests.
- `reserve()` BEFORE `requires_human_gate` resolution — reservation held for the full human-gate latency (potentially minutes), blocking other dispatches.
- `getCeiling()` AFTER any side-effect — defeats the purpose of pre-flight gating.

Cluster E §2.6 documents the mirror requirement (ceiling lookup before any side-effect including `reserve()`).

---

## §3 — Agent Spec Integration Instructions

Every affected agent spec MUST replace its current "budget enforcement" text with this canonical block. Customise only the `<agent-specific-fields>`.

### §3.1 — Block to paste into §7 Security Controls of each affected agent spec (v2)

````markdown
### §7.X — Budget enforcement (canonical per CLUSTER_A_COST_GOVERNOR_INTEGRATION.md v2)

This agent DOES NOT enforce budget caps directly. Per Cluster A canonical
resolution, Agent #23 Ops Runner Gamma (Cost Governor) is the sole budget
enforcement owner.

**Mandatory call order per dispatch (per Cluster A §2.6 v2 R4 + Cluster E §2.6):**

```
1. getCeiling(productId, mode, dimension)   ← Cluster E §2.1
2. BaseAgent.guard(authorityNeeded)         ← Cluster E §2.6
3. requires_human_gate request (if needed)
4. costGovernor.reserve({...})              ← THIS BLOCK
5. Orchestra dispatch                       ← Cluster F §2.3
6. costGovernor.settle({...})               ← THIS BLOCK
```

`getCeiling()` short-circuits the cheapest rejection FIRST. `reserve()` runs
ONLY after ceiling clears.

**Pre-dispatch contract (after Cluster E ceiling clears):**
1. Call `costGovernor.reserve({
     runId, productId, agentId: <agent-id>,
     adapter: <adapter-name>,
     capability: <capability-name>,
     estimatedCostUsd: <estimate>,
     costTier: <tier>,
   })` — Agent #23 executes a SINGLE atomic UPDATE … WHERE … RETURNING
   per Cluster A §2.3 v2 R1 (no read-then-increment TOCTOU).
2. If `{ok: false, reason}` returned → emit `agent.cost.signal.v1` with
   `costEvent: 'pre-dispatch-rejected'`; abort dispatch; emit
   agent's own block envelope with reason `'budget-cap-reached'`
   (or `'lock_contention'` / `'lock_contention_persistent'` /
   `'statement_timeout'` per Cluster A §2.3.1 v2 R3).
3. On `lock_contention`: retry up to 3 times with exponential backoff
   (50ms / 100ms / 200ms). Persistent failure → treat as
   `'lock_contention_persistent'` and abort dispatch.
4. If `{ok: true, reservationId}` returned → emit
   `agent.cost.signal.v1` with `costEvent: 'pre-dispatch'`; proceed.

**Heartbeat (for dispatches > 60s):**
- For known long-running dispatches (e.g. ACE crawl), call
  `costGovernor.heartbeat(reservationId)` every 30s; updates
  `reservedAt = now()` so the 60–90s reaper does not reclaim it.

**Post-dispatch contract (mandatory ALWAYS, success or failure):**
5. On dispatch settlement (success): call `costGovernor.settle({
     reservationId, observedCostUsd: <observed>,
   })`; emit `agent.cost.signal.v1` with `costEvent: 'post-dispatch'`.
6. On dispatch failure: call `costGovernor.settle({
     reservationId, observedCostUsd: 0,
   })` to release the reservation; emit
   `agent.cost.signal.v1` with `costEvent: 'post-dispatch'` and
   `observedCostUsd: 0`.

This agent's previous per-product cap field (`<agent>BudgetCap`) is
retained in `ProductRegistry` but is read ONLY by Agent #23 — this agent
does NOT read it directly.

Orphaned reservations: Agent #23 reaper job (60s cadence) releases
reservations older than 90 seconds per Cluster A §2.3 v2 R2; this agent
does NOT implement its own cleanup. For dispatches that legitimately need
>90s wall-clock, use `heartbeat()` above.
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

3. **AC-CA-3 (Settlement guarantee, v2 R2):** For every successful `reserve()` call there is exactly one `settle()` call within **90 seconds** (was 10 min in v1); orphaned reservations reaped by Agent #23 reaper running every 60s. Long-running dispatches (>60s) MUST call `costGovernor.heartbeat(reservationId)` every 30s to extend.

4. **AC-CA-4 (Topic schema validation):** `agent.cost.signal.v1` payload validates against the §2.2 shape; topic name registered in §14.1 canonical catalogue per Cluster D extension.

5. **AC-CA-5 (No-direct-ledger-read invariant):** No agent other than Agent #23 imports `flowai_adapter_cost` or `flowai_run_budgets` for read. Spec-level grep + import-level integration test (deferred).

6. **AC-CA-6 (Failure-mode settlement):** For every Orchestra dispatch failure (5xx / 429 / timeout), `settle({observedCostUsd: 0})` is called within the same execution context; reservation released; verified by deliberate-failure injection test.

7. **AC-CA-7 (TOCTOU-free atomicity, v2 R1):** 100 concurrent reservation requests against a $5 ceiling with $1 estimates each, executed through the v2 `UPDATE … WHERE … RETURNING` path, result in exactly 5 successful reservations + 95 `{ok: false, reason: 'ceiling_would_be_exceeded'}` rejections; `reservedUsd + spentUsd` invariant never exceeds `ceilingUsd` at ANY observed snapshot. The v1 read-then-increment pattern is forbidden.

8. **AC-CA-8 (Deadlock + statement_timeout, v2 R3):** Every reservation / settlement / reaper statement issues `SET LOCAL lock_timeout = '500ms'` AND `SET LOCAL statement_timeout = '1000ms'`. Implementation grep: every `UPDATE flowai_run_budgets` or `UPDATE flowai_run_reservations` is preceded within the same transaction by both `SET LOCAL` statements. CI guard.

9. **AC-CA-9 (Cluster E ordering, v2 R4):** Spec-level grep across all agent / Executor specs that paste the §3.1 block — the block contains the mandatory call order (Cluster E `getCeiling()` BEFORE `costGovernor.reserve()`). Implementation integration test (deferred) — a Cluster-E-rejected request never reaches the Cost Governor reserve call site.

10. **AC-CA-10 (Heartbeat path, v2 R2):** Long-running dispatch (>60s) integration test — agent calls `costGovernor.heartbeat()` at 30s intervals; reservation is NOT reclaimed even when wall-clock exceeds 90s (because heartbeats keep `reservedAt` fresh).

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

## §6 — Cross-cluster integration notes (v2)

- **Cluster D** (Audit-Log Topic Schema): `agent.cost.signal.v1` is added to the §14.1 canonical catalogue extension per Cluster D. **v2:** part of the P0 topic set per Cluster D v2 R1 staged-rollout (ships with Agent #23 — required by AC-CA-4).
- **Cluster E** (Authority-Ceiling Integration, **v2 R4 ordering**): `getCeiling()` runs BEFORE `costGovernor.reserve()` — mandatory call order per Cluster A §2.6 + Cluster E §2.6. Ceiling rejection is the cheapest rejection and short-circuits before any DB write. Cluster E §2.6 is the mirror canonical statement.
- **Cluster F** (Model-Budget Fallback): `agent.cost.signal.v1.adapter` field records which Orchestra adapter was used; Cluster F's fallback chain interacts with Cluster A by emitting per-fallback `agent.cost.signal.v1` events. Cluster F's tier-change handling (v2 R2) re-invokes `reserve()` with the new tier's estimated cost — the previous reservation is released via `settle(0)` first.

---

*End of CLUSTER_A_COST_GOVERNOR_INTEGRATION.md canonical template v2. Panel `QUORUM_PLURALITY_CLA-REVISE` 7/9 conditions R1–R4 applied. Pending W6 re-ratification.*
