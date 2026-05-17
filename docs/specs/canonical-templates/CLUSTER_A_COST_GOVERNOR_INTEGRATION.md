# Cluster A — Cost Governor Integration (Canonical Template, v3)

**Status:** DRAFT v3 — Panel conditions A1–A5 applied; pending W6 re-ratification.
**Version history:** v1 (commit `4b0bbc0`, 2026-05-16) → v2 (commit `5c5d3d1`, 2026-05-17, Panel `QUORUM_PLURALITY_CLA-REVISE` 7/9 R1–R4) → v3 (this commit, 2026-05-17, Panel v2 ratification conditions A1–A5 applied per W3 Dispatch #12).
**Author:** W3.
**Anchor canonical:** Rev-2.1 §15.1 row 23 (Cost Governor charter), Orchestra Integration Spec §7.1 (`flowai_adapter_cost` ledger) + §8.4 (`flowai_run_budgets` ceiling table), `docs/specs/agent-specs/AGENT_23_OpsRunnerGamma.md` (commit `e1752f1`).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` (W6 commit `076a35b`) + `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`, v2 conditions). **v3 conditions:** `docs/panel-consultations/cluster-templates-v2-ratification-2026-05-17.md` (W6 v2-ratification dispatch).

**v3 revisions applied (per W3 Dispatch #12 — REPLACES v2 §2.3 contract):**
- **A1** — REPLACE `UPDATE … WHERE … RETURNING` with **PostgreSQL advisory lock** per `(productId, costPool)`. `pg_try_advisory_xact_lock(hashtext(productId || ':' || costPool))` short-circuits the lock-timeout race entirely; serialised critical section follows. Failure on 3 retries → `BUDGET_LOCK_CONTENTION`. §2.3 rewritten.
- **A2** — `statement_timeout` `1000ms → 5000ms` (covers Supabase cold-start). Heartbeat-extension path canonical: `costGovernor.heartbeat(reservationId, leaseToken, sequence)` extends the reservation window by 60s per call; maximum 10 heartbeats = 10 minutes total wall-clock. §2.3.1 + §2.3.2 added.
- **A3** — Lease token (UUID v4) + monotonic `leaseSequence` counter on every reservation. `heartbeat()` MUST supply both — stale workers with wrong token are rejected with `STALE_LEASE`; replay attacks with old sequence rejected with `STALE_SEQUENCE`. §2.3.2 added.
- **A4** — Phase 2 settlement runs at PostgreSQL `SERIALIZABLE` isolation level. Settlement is idempotent on `reservationId` — second `settle()` call with same `reservationId` returns `{ok: true, already_settled: true}` without error. §2.3 Phase 2 rewritten; §2.3.3 added.
- **A5** — Explicit reconciliation paragraph for Cluster E ↔ Cluster A authoritative ordering, error semantics, and advisory-vs-authoritative divergence handling. §2.6 expanded.

**v2 revisions retained (per W3 Dispatch #10) but evolved in v3:**
- **R1 (v2)** — atomic `UPDATE … WHERE … RETURNING` — **SUPERSEDED by v3 A1 advisory-lock pattern**. Rationale: advisory locks eliminate the lock-timeout race entirely (no need to fight Postgres lock manager when we can acquire a per-cost-pool semaphore deterministically). v3 keeps the TOCTOU-free guarantee but via a different mechanism.
- **R2 (v2)** — 60–90s reaper window — RETAINED but heartbeat-extension semantics formalised per v3 A2.
- **R3 (v2)** — lock_timeout + statement_timeout — `lock_timeout` REMOVED (no longer needed with advisory locks); `statement_timeout` retained but raised to 5000ms per v3 A2.
- **R4 (v2)** — `getCeiling()` BEFORE `reserve()` ordering — RETAINED + expanded with v3 A5 reconciliation paragraph + explicit error-code mapping.

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

### §2.3 — Two-phase reservation contract (v3 — A1 advisory-lock + A4 SERIALIZABLE settlement)

Per v3 A1: Agent #23 implements **two-phase commit** for cost reservation using PostgreSQL transaction-scoped advisory locks instead of `UPDATE … WHERE` lock-fighting. The v2 `UPDATE … WHERE … RETURNING` pattern is **SUPERSEDED**.

**costPool definition (v3):** the lock key is `(productId, costPool)`. `costPool` is one of `'global' | 'agent_<N>'` declared in `flowai_run_budgets.costPool` column. Default `'global'`; agent-scoped pools allow per-agent ceiling enforcement without serialising the entire product's cost activity onto a single lock.

**Phase 1 — Reservation (advisory-lock-protected, before dispatch):**

1. Emitting agent calls `costGovernor.reserve({runId, productId, costPool, estimatedCostUsd, ...})`.
2. Agent #23 opens a transaction at default isolation; advisory-lock + critical section:
   ```sql
   BEGIN;
   SET LOCAL statement_timeout = '5000ms';   -- v3 A2 — was 1000ms; covers Supabase cold-start

   -- v3 A1: per-(productId, costPool) advisory lock; auto-released at COMMIT/ROLLBACK.
   -- hashtext(productId || ':' || costPool) gives a stable bigint key.
   SELECT pg_try_advisory_xact_lock(
     hashtext($productId || ':' || $costPool)
   ) AS got_lock;

   -- If got_lock = false → ROLLBACK; caller retries.
   -- If got_lock = true → proceed to read+increment inside the protected critical section.

   SELECT ceilingUsd, spentUsd, reservedUsd, exceededAt
     FROM flowai_run_budgets
    WHERE runId = $runId AND productId = $productId AND costPool = $costPool
    FOR UPDATE;
   -- (FOR UPDATE is redundant under the advisory lock but defensive against
   --  rows being read by sessions that bypass costGovernor — never expected.)

   -- Decision: if exceededAt IS NOT NULL → ROLLBACK; return run_halted.
   -- If ceilingUsd - spentUsd - reservedUsd < estimatedCostUsd → ROLLBACK; return ceiling_would_be_exceeded.
   -- Else:
   INSERT INTO flowai_run_reservations (
     id, runId, productId, costPool,
     reservedAmount, reservedAt, leaseToken, leaseSequence,
     agentId, executorKey, adapter, capability
   ) VALUES (
     gen_random_uuid(), $runId, $productId, $costPool,
     $estimatedCostUsd, now(), gen_random_uuid(), 0,
     $agentId, $executorKey, $adapter, $capability
   )
   RETURNING id AS reservationId, leaseToken, leaseSequence;

   UPDATE flowai_run_budgets
      SET reservedUsd = reservedUsd + $estimatedCostUsd,
          updatedAt   = now()
    WHERE runId = $runId AND productId = $productId AND costPool = $costPool;

   COMMIT;
   ```
3. Caller behaviour on `got_lock = false`: retry with exponential backoff (50ms / 100ms / 200ms — up to 3 attempts total). After 3 attempts → return `{ok: false, reason: 'BUDGET_LOCK_CONTENTION'}`. Emitting agent emits `agent.cost.signal.v1` `costEvent: 'pre-dispatch-rejected'`; aborts dispatch.
4. If reservation succeeded → return `{ok: true, reservationId, leaseToken, leaseSequence: 0}`. Emitting agent emits `agent.cost.signal.v1` `costEvent: 'pre-dispatch'`.
5. If `ceiling_would_be_exceeded` OR `run_halted` → return `{ok: false, reason: <reason>}`. Emitting agent emits `agent.cost.signal.v1` `costEvent: 'pre-dispatch-rejected'`; aborts dispatch.

Rationale (v3 A1): the v2 `UPDATE … WHERE … RETURNING` pattern was TOCTOU-free but still fought the PostgreSQL row-lock manager — high concurrency produced `lock_timeout` storms that masqueraded as legitimate contention. The advisory-lock pattern serializes per-(productId, costPool) at the application semaphore layer; concurrent reserves on DIFFERENT cost-pools don't contend at all. Net: fewer false-negative lock-contention errors; better throughput under high concurrency.

**Phase 2 — Settlement (SERIALIZABLE + idempotent, post-dispatch):**

6. Emitting agent dispatches via Orchestra.
7. On settlement, emitting agent calls `costGovernor.settle({reservationId, leaseToken, observedCostUsd})`.
8. Agent #23 opens a transaction at **`SERIALIZABLE` isolation level** (v3 A4) and runs:
   ```sql
   BEGIN ISOLATION LEVEL SERIALIZABLE;     -- v3 A4
   SET LOCAL statement_timeout = '5000ms';

   -- v3 A4 idempotency check: read first
   SELECT id, leaseToken, reservedAmount, settledAt, observedCostUsd
     FROM flowai_run_reservations
    WHERE id = $reservationId
    FOR UPDATE;

   -- v3 A3 lease-token validation
   -- If leaseToken column ≠ $leaseToken → ROLLBACK; return STALE_LEASE.

   -- v3 A4 idempotent retry path
   -- If settledAt IS NOT NULL → COMMIT; return {ok: true, already_settled: true, observedCostUsd: <stored>}.
   --   (Same reservationId + same lease → repeated settle() is a no-op.)

   -- Else apply settlement
   UPDATE flowai_run_budgets b
      SET spentUsd    = b.spentUsd + $observedCostUsd,
          reservedUsd = b.reservedUsd - $reservedAmount,    -- variable from SELECT above
          updatedAt   = now()
    WHERE b.runId = (SELECT runId FROM flowai_run_reservations WHERE id = $reservationId)
      AND b.productId = (SELECT productId FROM flowai_run_reservations WHERE id = $reservationId)
      AND b.costPool = (SELECT costPool FROM flowai_run_reservations WHERE id = $reservationId);

   UPDATE flowai_run_reservations
      SET settledAt = now(),
          observedCostUsd = $observedCostUsd
    WHERE id = $reservationId;

   COMMIT;
   ```
   Emitting agent emits `agent.cost.signal.v1` `costEvent: 'post-dispatch'`.

**On dispatch failure** (Orchestra returns 5xx / 429 / timeout): emitting agent MUST still call `costGovernor.settle({reservationId, leaseToken, observedCostUsd: 0})` to release the reservation. The reservation lifecycle is mandatory.

**Orphan reaper (retained from v2 R2):** Agent #23 runs a reaper job every **60 seconds**; it reclaims reservations where `reservedAt < now() - interval '90 seconds'` AND `settledAt IS NULL` AND `heartbeatExtensionCount < 10`. Reaper-reclaimed reservations invalidate the lease token (further `settle()` or `heartbeat()` calls with that lease return `STALE_LEASE`). Long-running operations MUST extend via `heartbeat()` per §2.3.2.

### §2.3.1 — Statement timeout + advisory lock (v3 — A1 + A2)

Every reservation / settlement / heartbeat statement runs with explicit PostgreSQL guards:

- **Advisory lock (v3 A1)** — `pg_try_advisory_xact_lock(hashtext(productId || ':' || costPool))`. Returns `true` on lock acquisition; `false` if another transaction holds it. Auto-released at `COMMIT` or `ROLLBACK`. No timeout needed because the lock is non-blocking; caller decides retry policy.
- **statement_timeout (v3 A2)** — `SET LOCAL statement_timeout = '5000ms'`. Was `'1000ms'` in v2; raised to `5000ms` because Supabase serverless instances exhibit cold-start latency in the 1–3s range. Statement timeout still fires on truly stuck queries (e.g. database migration in progress); caller treats as `{ok: false, reason: 'statement_timeout'}`.

**REMOVED in v3:** `SET LOCAL lock_timeout = '500ms'` (v2 R3) — the advisory-lock pattern eliminates the underlying lock-timeout race. Implementation MUST NOT set `lock_timeout` on reservation transactions (it would interact unpredictably with the advisory lock).

PostgreSQL deadlock detection remains automatic at the engine level. Under the advisory-lock pattern, deadlocks are structurally impossible (single lock per transaction, hash-key-ordered acquisition).

### §2.3.2 — Heartbeat extension with lease token + monotonic sequence (v3 — A2 + A3)

Long-running dispatches (Orchestra wall-clock > 60s) MUST extend their reservation window via `costGovernor.heartbeat(reservationId, leaseToken, sequence)`. The heartbeat contract:

**API:** `heartbeat({reservationId, leaseToken, sequence})` — extends `reservedAt = now()` AND increments `heartbeatExtensionCount` AND increments `leaseSequence`.

**Lease token validation (v3 A3):**
- Reservation was created with `leaseToken = gen_random_uuid()` at `reserve()` time.
- `heartbeat()` caller MUST supply the same `leaseToken` it received from `reserve()`.
- If `heartbeat()`'s `leaseToken` ≠ stored `leaseToken` → return `{ok: false, reason: 'STALE_LEASE'}`. Stale worker (e.g. process restarted between `reserve()` and `heartbeat()`) cannot extend a reservation it doesn't own.

**Monotonic sequence (v3 A3 — replay protection):**
- Caller supplies `sequence` = expected current `leaseSequence` value. First heartbeat: `sequence = 0` (matches initial state from `reserve()`).
- Agent #23 atomically increments `leaseSequence` (compare-and-swap):
  ```sql
  UPDATE flowai_run_reservations
     SET reservedAt = now(),
         leaseSequence = leaseSequence + 1,
         heartbeatExtensionCount = heartbeatExtensionCount + 1
   WHERE id = $reservationId
     AND leaseToken = $leaseToken
     AND leaseSequence = $sequence                    -- v3 A3 CAS check
     AND heartbeatExtensionCount < 10                 -- v3 A2 cap
     AND settledAt IS NULL
  RETURNING leaseSequence AS newSequence, heartbeatExtensionCount;
  ```
- If `UPDATE` returns 0 rows → either lease-token mismatch (`STALE_LEASE`), stale sequence (`STALE_SEQUENCE` — caller's sequence is out of date), heartbeat-cap exceeded (`HEARTBEAT_CAP_EXCEEDED`), or already settled (`ALREADY_SETTLED`). Distinguish via post-fact `SELECT`.
- If `UPDATE` returns 1 row → return `{ok: true, newSequence, heartbeatExtensionCount}`. Caller updates its local `sequence` to `newSequence` for the next heartbeat call.

**Heartbeat cap (v3 A2):** `heartbeatExtensionCount < 10` — maximum 10 heartbeats per reservation = 10 × 60s = 10 minutes total wall-clock. After cap reached: caller MUST either settle or let reaper reclaim. Hard cap prevents indefinite reservation hold by a stuck long-running dispatch.

**Heartbeat cadence:** caller calls `heartbeat()` every ~50s (within the 60s reservation window). If dispatch completes before cap, caller calls `settle()` normally with whatever sequence value it last received.

### §2.3.3 — SERIALIZABLE settlement + idempotency (v3 A4)

Phase 2 settlement runs at `SERIALIZABLE` isolation level (PostgreSQL's strongest). Combined with v3 A3's lease-token guard, this gives:

1. **Idempotent retry safety:** caller can safely retry `settle()` on network failure. If first `settle()` succeeded but response was lost, second `settle()` reads `settledAt IS NOT NULL` and returns `{ok: true, already_settled: true, observedCostUsd: <stored>}` without re-applying the spentUsd delta.
2. **Concurrent-settle anomaly prevention:** if two concurrent `settle()` calls fire on the same `reservationId` (unlikely but possible during retry storm), `SERIALIZABLE` ensures one wins outright; the other reads `settledAt IS NOT NULL` and returns the already-settled response.
3. **Lease-mismatch protection:** if a stale worker calls `settle()` with a wrong `leaseToken` (e.g. process restart after the legitimate owner already settled), Agent #23 returns `{ok: false, reason: 'STALE_LEASE'}`. The stored `spentUsd` is NOT modified.

**On serialization-failure (PostgreSQL `40001`):** PostgreSQL may abort a `SERIALIZABLE` transaction with `40001 serialization_failure` if concurrent activity creates a true serial-order conflict. Caller MUST retry with exponential backoff (50ms / 100ms / 200ms; up to 3 retries). On persistent failure → return `{ok: false, reason: 'serialization_failure'}`; emitting agent treats as soft failure.

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

### §2.6 — Interaction order with Cluster E (v3 — A5 reconciliation)

For every Executor / dual-authority primary agent dispatch, the call order is **MANDATORY**:

```
1. getCeiling(productId, mode, dimension)   ← Cluster E §2.1 ceiling lookup
2. BaseAgent.guard(authorityNeeded)         ← Cluster E §2.6 charter check
3. requires_human_gate request (if needed)  ← Cluster E §2.6 human-gate
4. costGovernor.reserve({...})              ← Cluster A §2.3 v3 advisory-lock reservation
5. Orchestra dispatch                       ← Cluster F §2.3 model selection
6. costGovernor.settle({...})               ← Cluster A §2.3.3 v3 SERIALIZABLE settlement
```

**Why this order:** ceiling check is FREE (no DB write, just a JSONB lookup); a ceiling violation is the cheapest possible rejection and MUST short-circuit before any budget reservation. Reserving budget for a request that would be ceiling-rejected wastes a reservation slot for the ~90s reaper window and creates needless contention.

**Forbidden orderings:**
- `reserve()` BEFORE `getCeiling()` — wastes budget on ceiling-rejected requests.
- `reserve()` BEFORE `requires_human_gate` resolution — reservation held for the full human-gate latency (potentially minutes), blocking other dispatches.
- `getCeiling()` AFTER any side-effect — defeats the purpose of pre-flight gating.

#### §2.6.1 — Authoritative ordering reconciliation (v3 A5)

When both `getCeiling()` (Cluster E) and `costGovernor.reserve()` (Cluster A) apply, the authoritative execution order is:

1. **`getCeiling()`** — orchestrator authoritative (per Cluster E v2 R1 + R2). Returns the canonical ceiling for `(productId, mode, dimension)` keyed against `ProductRegistry.authorityCeilings`.
2. **`costGovernor.reserve()`** — only invoked if step 1's ceiling permits the requested authority.

The **advisory-cache layer** (agent-side `getCeiling()` cache per Cluster E v2 R1 §2.1) is informational only — it enables fast-path rejection of obviously-violating requests without an Orchestrator round-trip. If the advisory cache and the authoritative `BaseAgent.guard()` check disagree (e.g. operator just lowered ceiling but agent cache is still warm with old value), the **authoritative guard wins**: `BaseAgent.guard()` re-validates against the Orchestrator per Cluster E v2 R2 and throws `CeilingViolationError` even if the advisory cache previously cleared the request.

**Error semantics (v3 A5 — canonical error-code mapping):**

| Failure mode | Error code | HTTP status | Retryable |
|---|---|---:|---|
| Ceiling exceeds operator's `authorityCeilings` cell | `CEILING_EXCEEDED` | 403 | **NO** — operator must raise ceiling (admin role) |
| Budget reservation would exceed `flowai_run_budgets.ceilingUsd` | `BUDGET_EXCEEDED` | 402 | **NO** — operator must raise ceiling (admin role) |
| Advisory-lock contention after 3 retries | `BUDGET_LOCK_CONTENTION` | 503 | Yes — caller may retry after backoff |
| Stale lease token on heartbeat / settle | `STALE_LEASE` | 409 | **NO** — process must re-reserve |
| Stale monotonic sequence on heartbeat | `STALE_SEQUENCE` | 409 | Yes — caller updates local sequence + retries |
| Heartbeat cap (10) exceeded | `HEARTBEAT_CAP_EXCEEDED` | 409 | **NO** — caller must settle or accept reaper-reclaim |
| PostgreSQL `40001` serialization failure on settle | `serialization_failure` | 503 | Yes — caller retries with backoff |
| `statement_timeout` (5s) fired | `statement_timeout` | 503 | Yes — implies database health issue; caller retries with backoff |

**`CEILING_EXCEEDED` and `BUDGET_EXCEEDED` are non-retryable without operator intervention** — caller MUST surface to operator/admin rather than retry-loop on the same request. Other failure modes are transient and can retry under defined backoff schedules.

Cluster E §2.6 documents the mirror requirement (ceiling lookup before any side-effect including `reserve()`).

---

## §3 — Agent Spec Integration Instructions

Every affected agent spec MUST replace its current "budget enforcement" text with this canonical block. Customise only the `<agent-specific-fields>`.

### §3.1 — Block to paste into §7 Security Controls of each affected agent spec (v3)

````markdown
### §7.X — Budget enforcement (canonical per CLUSTER_A_COST_GOVERNOR_INTEGRATION.md v3)

This agent DOES NOT enforce budget caps directly. Per Cluster A canonical
resolution, Agent #23 Ops Runner Gamma (Cost Governor) is the sole budget
enforcement owner.

**Mandatory call order per dispatch (per Cluster A §2.6 v3 A5 + Cluster E §2.6):**

```
1. getCeiling(productId, mode, dimension)   ← Cluster E §2.1 (authoritative)
2. BaseAgent.guard(authorityNeeded)         ← Cluster E §2.6 charter check
3. requires_human_gate request (if needed)
4. costGovernor.reserve({...})              ← Cluster A §2.3 v3 advisory-lock
5. Orchestra dispatch                       ← Cluster F §2.3
6. costGovernor.settle({...})               ← Cluster A §2.3.3 v3 SERIALIZABLE
```

`getCeiling()` short-circuits the cheapest rejection FIRST. `reserve()` runs
ONLY after ceiling clears. See Cluster A §2.6.1 v3 A5 for error semantics
(`CEILING_EXCEEDED` vs `BUDGET_EXCEEDED` — both non-retryable without
operator intervention).

**Pre-dispatch contract (after Cluster E ceiling clears):**
1. Call `costGovernor.reserve({
     runId, productId, costPool: <pool>,
     agentId: <agent-id>,
     adapter: <adapter-name>,
     capability: <capability-name>,
     estimatedCostUsd: <estimate>,
     costTier: <tier>,
   })` — Agent #23 uses PostgreSQL advisory-lock per Cluster A §2.3 v3 A1.
2. If `{ok: false, reason}` returned:
   - `CEILING_EXCEEDED` / `BUDGET_EXCEEDED` → surface to operator; do NOT
     retry. Emit `agent.cost.signal.v1` `costEvent: 'pre-dispatch-rejected'`;
     emit agent's own block envelope with the same reason code.
   - `BUDGET_LOCK_CONTENTION` → caller already exhausted 3 retries inside
     Agent #23; treat as transient infra issue, abort current dispatch,
     surface to admin observability.
   - `statement_timeout` → soft failure (database health issue); retry
     with exponential backoff (50ms / 100ms / 200ms; max 3 attempts).
3. If `{ok: true, reservationId, leaseToken, leaseSequence}` returned →
   record ALL THREE values (reservationId, leaseToken, current
   leaseSequence). Emit `agent.cost.signal.v1` `costEvent: 'pre-dispatch'`.
   Proceed to dispatch.

**Heartbeat (for dispatches > 60s wall-clock — per Cluster A §2.3.2 v3 A2 + A3):**
- Call `costGovernor.heartbeat({reservationId, leaseToken, sequence})`
  every ~50s while dispatch is in-flight. Caller supplies the CURRENT
  leaseSequence; Agent #23 increments + returns the new value.
- Maximum 10 heartbeats per reservation (10 × 60s = 10 minute wall-clock
  cap per v3 A2). After cap reached → caller MUST settle or accept reaper.
- Failure modes: `STALE_LEASE` (token mismatch — caller's process is not
  the legitimate owner), `STALE_SEQUENCE` (caller's local sequence is out
  of date — caller should resync from prior heartbeat response),
  `HEARTBEAT_CAP_EXCEEDED` (over 10 extensions), `ALREADY_SETTLED`.

**Post-dispatch contract (mandatory ALWAYS, success or failure):**
4. On dispatch settlement (success): call `costGovernor.settle({
     reservationId, leaseToken, observedCostUsd: <observed>,
   })` — Agent #23 runs at SERIALIZABLE isolation per v3 A4. Idempotent
   on retry (second call returns `{ok: true, already_settled: true,
   observedCostUsd: <stored>}` without re-applying delta).
   Emit `agent.cost.signal.v1` `costEvent: 'post-dispatch'`.
5. On dispatch failure: call `costGovernor.settle({
     reservationId, leaseToken, observedCostUsd: 0,
   })` to release the reservation. Emit `agent.cost.signal.v1`
   `costEvent: 'post-dispatch'` with `observedCostUsd: 0`.
6. On `STALE_LEASE` from `settle()`: the reservation has been reaper-
   reclaimed OR overwritten by another process. Treat as soft failure;
   re-reserve for the next dispatch attempt rather than retry settle.
7. On PostgreSQL `40001` (`serialization_failure`): retry with exponential
   backoff (50ms / 100ms / 200ms; max 3 attempts).

This agent's previous per-product cap field (`<agent>BudgetCap`) is
retained in `ProductRegistry` but is read ONLY by Agent #23 — this agent
does NOT read it directly.

Orphaned reservations: Agent #23 reaper job (60s cadence) releases
reservations older than 90 seconds per Cluster A §2.3 v3 (retained from
v2 R2); this agent does NOT implement its own cleanup. For dispatches
that legitimately need >90s wall-clock, use `heartbeat()` above (up to
10 extensions = 10 min total).
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

10. **AC-CA-10 (Heartbeat path, v3 A2 + A3):** Long-running dispatch (>60s) integration test — agent calls `costGovernor.heartbeat({reservationId, leaseToken, sequence})` every ~50s with monotonically-increasing sequence; reservation NOT reclaimed even when wall-clock exceeds 90s. After 10 heartbeats (10-min cap per v3 A2), 11th call returns `HEARTBEAT_CAP_EXCEEDED`. Verify by instrumented soak test.

11. **AC-CA-11 (v3 A1 — Advisory lock):** 200 concurrent reservation requests against a $5 ceiling × `costPool='global'` with $1 estimates each result in exactly 5 successful reservations + 195 rejections; lock-contention retries handled internally (≤3 attempts each). Total `reservedUsd + spentUsd` never exceeds ceiling at any observed snapshot. Concurrent reservations on DIFFERENT `costPool` values for the same `productId` do NOT serialize against each other (advisory lock is per-cost-pool). The v2 `UPDATE … WHERE … RETURNING` pattern is removed from the implementation.

12. **AC-CA-12 (v3 A2 — statement_timeout + heartbeat extension):** Every reservation / settlement / heartbeat statement issues `SET LOCAL statement_timeout = '5000ms'`. NO `SET LOCAL lock_timeout` set on reservation transactions (removed in v3). Long-dispatch heartbeat path tested: 11 heartbeats fail on the 11th with `HEARTBEAT_CAP_EXCEEDED`; 10 succeed in sequence.

13. **AC-CA-13 (v3 A3 — Lease token + monotonic sequence):** Implementation test — `reserve()` returns `{leaseToken: UUID, leaseSequence: 0}`. `heartbeat()` with correct leaseToken + correct sequence succeeds, increments sequence, returns new sequence. `heartbeat()` with wrong leaseToken returns `STALE_LEASE`. `heartbeat()` with stale sequence (e.g. sequence value 3 when current is 5) returns `STALE_SEQUENCE`. Concurrent heartbeat replay (same sequence, same token) — second attempt fails with `STALE_SEQUENCE` (CAS protection).

14. **AC-CA-14 (v3 A4 — SERIALIZABLE + idempotent settle):** Settlement runs at `BEGIN ISOLATION LEVEL SERIALIZABLE`. Idempotent retry: calling `settle({reservationId, leaseToken, observedCostUsd: 1.50})` twice in succession results in: first call returns `{ok: true, observedCostUsd: 1.50}`; second call returns `{ok: true, already_settled: true, observedCostUsd: 1.50}`. `flowai_run_budgets.spentUsd` increased by 1.50 (NOT 3.00). Verified by deliberate retry injection.

15. **AC-CA-15 (v3 A5 — Cluster E reconciliation):** Spec-level grep — every paste of §3.1 block includes the explicit mandatory call order (steps 1–6) AND references §2.6.1 error-code table. Implementation test: when operator's ceiling is at recommend_only AND requested authority is auto_write_internal: `CEILING_EXCEEDED` returned BEFORE any DB write; `costGovernor.reserve()` is never invoked. When ceiling permits but budget is exhausted: `BUDGET_EXCEEDED` returned from `reserve()`; emitting agent surfaces to operator. Both error codes are non-retryable; integration test asserts caller does NOT retry-loop on either.

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

## §6 — Cross-cluster integration notes (v3)

- **Cluster D** (Audit-Log Topic Schema): `agent.cost.signal.v1` is canonical in the §14.1 P0 set per Cluster D v3 §2.1.0 (ships in §14.1 P0 patch + ENTRY 008 pre-Agent-#23-build). New v3 envelope types implied (engineering dispatch will register at first Cost Governor ship): `agent.budget.lock_contention.v1` for `BUDGET_LOCK_CONTENTION` observability; reserved in the Cluster D Deferred set.
- **Cluster E** (Authority-Ceiling Integration, **v3 A5 reconciliation**): Cluster E v3 §2.8 + Cluster A v3 §2.6.1 jointly define the authoritative ordering rule + error semantics. `CEILING_EXCEEDED` (Cluster E authoritative reject; non-retryable) and `BUDGET_EXCEEDED` (Cluster A reserve reject; non-retryable) are surfaced to operator; `CEILING_ADVISORY_REJECT` (Cluster E E2 advisory-cache reject; retryable after cache TTL) and `BUDGET_LOCK_CONTENTION` (Cluster A A1 advisory-lock contention; retryable after backoff) are transient. The advisory cache + advisory lock are operationally distinct mechanisms but share the same overall philosophy: fast-path cheap rejection while the authoritative check (in `BaseAgent.guard()` + the SERIALIZABLE settlement transaction) remains the final source of truth.
- **Cluster F** (Model-Budget Fallback): `agent.cost.signal.v1.adapter` field records which Orchestra adapter was used. Cluster F v2 R2 tier-downgrade interacts with Cluster A v3 A1 advisory-lock: each tier-downgrade attempt is a fresh `reserve()` call (gets its own leaseToken). Previous reservation MUST be released via `settle({observedCostUsd: 0})` before the new reserve. Tier-downgrade loop cap (3 attempts) holds across the combined reserve + dispatch chain.

---

*End of CLUSTER_A_COST_GOVERNOR_INTEGRATION.md canonical template v3. Panel v2-ratification conditions A1–A5 applied per W3 Dispatch #12. Pending W6 re-ratification.*
