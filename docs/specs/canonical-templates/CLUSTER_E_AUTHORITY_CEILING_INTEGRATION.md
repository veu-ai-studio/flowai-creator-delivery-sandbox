# Cluster E — Authority-Ceiling Integration (Canonical Template, v3)

**Status:** DRAFT v3 — Panel v2 conditions applied + CEO CA-9-Q4 re-arbitration ratified Option A; pending W6 re-ratification.
**Version history:** v1 (commit `c576a5f`, 2026-05-16) → v2 (commit applied 2026-05-17 — Panel `PLURALITY_CLE-REVISE` 4/9 conditions R1–R4) → **v3 (this commit, 2026-05-17 — Panel v2 conditions E0–E3 + CEO CA-9-Q4 re-arbitration applied per W3a Dispatch #4)**.
**Author:** W3 (v1, v2), W3a (v3).
**Anchor canonical:** CA-12 v3 §A.2 (Build-authority + Operational-authority sub-dimensions); §A.2.4 (`ProductRegistry.authorityCeilings` JSONB 6-cell shape); §B.2 enforcement contract (HTTP 400 codes including `CONFIG_CEILING_VIOLATION`); CA-7 §15.5 EXECUTOR_REGISTRY; **CA-9-Q4 = Option A (CEO re-arbitration 2026-05-17 — Agents #21 + #26 route through EXECUTOR_REGISTRY sibling pattern; this supersedes the previously-ratified CA-9-Q4 = (b) dual-authority-on-primary).**
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #03 + Batch 2 objection #30 + Batch 3 objections #02, #11, #17, #19, #24, #27. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` `PLURALITY_CLE-REVISE` 4/9. **v3 conditions:** `docs/panel-consultations/cluster-templates-v2-ratification-2026-05-17.md` E0–E3.

**v3 revisions applied (per W3a Dispatch #4):**
- **E0** — CEO re-arbitration of CA-9-Q4 documented: **Option A selected.** Agents #21 + #26 route through EXECUTOR_REGISTRY sibling pattern; primary agents revert to `[recommend_only]`. This supersedes CA-9-Q4 = (b). §2.6 now states this verbatim; the CA-9-Q4 anchor at the top of this template is updated.
- **E1** — §15.1 roster delta required by Cluster E v3 ratification explicitly stated. Agent #21 primary reverts to `[recommend_only]`; existing sibling `aggressive-crawl-conductor-executor` retains `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Agent #26 primary reverts to `[recommend_only]`; NEW sibling `orchestra-research-executor` is registered at the Agent #26 first-ship commit with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. §5 roster delta table rewritten; AC-CE-10 tightened.
- **E2** — Cluster A ↔ Cluster E split-brain resolution: canonical ordering rule added stating that when the advisory cache and the `BaseAgent.guard()` authoritative check disagree, **the authoritative check is ALWAYS the deciding verdict**. Advisory cache rejection emits `CEILING_ADVISORY_REJECT` (retryable after cache TTL expires); authoritative rejection emits `CEILING_EXCEEDED` (non-retryable). §2.8 added; AC-CE-13 added.
- **E3** — Async-cache-with-fallback for Orchestrator outages: when the Orchestrator is unreachable, fresh advisory cache (age < TTL) is used as-is; stale cache (age ≥ TTL) emits `CEILING_CHECK_DEGRADED` and applies a conservative fallback ceiling (one tier down from last-known per `Math.floor(rank(lastKnown) / 2)`); dispatch is never indefinitely blocked. §2.9 added; AC-CE-14 added.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — **Orchestrator is the authoritative ceiling source.** Agent's `getCeiling()` call is an **advisory cache** with a short TTL. The authoritative check is enforced by the Orchestrator at action-dispatch time. Removes the v1 risk of an agent caching a stale ceiling and acting on it after the operator lowered the ceiling. §2.1 + §2.2 rewritten.
- **R2** — Move the ceiling check INTO `BaseAgent.guard(authorityNeeded, dispatchCtx)` — every agent emit / dispatch already passes through `guard()`, so the check is a single canonical chokepoint rather than per-agent code. Eliminates "did this Executor remember to call getCeiling?" defect class. §2.5 rewritten.
- **R3** — Dual-authority agents Agent #26 + Agent #21 ACE — **route through EXECUTOR_REGISTRY sibling** (e.g. `orchestra-research-executor` sibling for Agent #26 primary; `aggressive-crawl-conductor-executor` already exists for #21 per CA-7). Primary agent stays `[recommend_only]`; elevated authority lives in the sibling per CA-7 §15.5 precedent. Addresses Batch 3 #02 / #11 / #17 / #27 dual-authority precedent risk. §2.6 rewritten. **v3 E0 ratifies this via CEO re-arbitration — see §2.6.**
- **R4** — Mid-request ceiling change handling: `getCeiling()` cache TTL ≤30s; long-running dispatches re-validate at action checkpoints; ceiling reduction takes effect at next checkpoint; ceiling raise takes effect at next cache miss (no in-flight retro-elevation). §2.7 added.

---

## §1 — Problem Statement

The 18-agent consolidated Panel raised **authority-ceiling integration** concerns across multiple agents. Specs reference CA-12 v3 §A.2.4 `authorityCeilings` JSONB but don't define the exact code pattern Executors use to check the ceiling before acting, OR how the per-invocation `authorityNeeded` set membership pattern integrates with ceiling lookup at runtime.

### Verbatim Panel quotes

**Batch 1 objection #03 (Slot 1):**
> Agent #7 Design and Agent #10 Monitor both plan Phase 2 Executors with auto_write_internal authority. The EXECUTOR_REGISTRY pattern from §15.5 allows authority elevation without modifying the 26-agent roster, potentially circumventing Locked Rule 2's intent.

**Batch 2 objection #30 (Slot 10):**
> §1 Build-authority is recommend_only yet G12-Q4 auto-remediation hand-off options assume direct dispatch to Self-Renewal Executor; this violates the dual-authority + requires_human_gate invariant in canonical §15.5 and CA-9-Q4=(b) for any auto_write_internal path.

**Batch 3 objection #02 (Slot 1):**
> §26 introduces the first primary-agent with dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` per G26-Q2. This breaks the established pattern where elevated authority lives in EXECUTOR_REGISTRY, potentially undermining the security model.

**Batch 3 objection #11 (Slot 4):**
> The proposal for Agent #26 introduces dual-authority (recommend_only, auto_write_internal, requires_human_gate) which is complex and may lead to confusion in implementation. This is particularly concerning given the security-critical nature of auto-admission tasks.

**Batch 3 objection #17 (Slot 6):**
> Agent #26's dual authority (`auto_write_internal` and `requires_human_gate`) at the primary agent layer is a significant departure from the established pattern. While CA-9-Q4=(b) ratified it, the potential for unintended consequences and security vulnerabilities warrants extreme caution.

**Batch 3 objection #19 (Slot 6):**
> The proposal lacks a clear rollback strategy for changes made by agents with `auto_write_internal` authority, particularly Agent #26.

**Batch 3 objection #27 (Slot 10):**
> G26-Q2 and §15.5 allow Agent #26 primary charter to carry [recommend_only, auto_write_internal, requires_human_gate] directly; this bypasses the EXECUTOR_REGISTRY sibling namespace and the 25-ID partition invariant enforced by BaseAgent.js and validateExecutors().

### Affected scope

Every agent spec where authority is declared (all 18 dormant agents + EXECUTOR_REGISTRY siblings: Self-Renewal Executor, ACE Conductor Executor, Design Executor Phase 2, Monitor Ingestion Executor Phase 2, Self-Protection Executor Phase 2, Cost Governor Executor Phase 2).

### Why this blocks engineering dispatch

Without canonical ceiling-check pattern, Executors could:
- (a) Skip the ceiling check entirely → unauthorised writes that violate operator's `authorityCeilings` configuration.
- (b) Check the ceiling inconsistently → some Executors enforce, others don't → operator-facing UX surprise.
- (c) Check the ceiling at the wrong moment → race conditions where ceiling changes mid-execution.

All three modes violate CA-12 v3 §A.2.4 + §B.2 enforcement contract.

---

## §2 — Canonical Resolution (v2 — Orchestrator authoritative)

**The Orchestrator is the sole authoritative ceiling source** (v2 R1). Agent's `getCeiling()` call is an **advisory cache** for fast-path decisions; the authoritative check is enforced by `BaseAgent.guard()` at every dispatch boundary (v2 R2). Ceiling violations raise `CeilingViolationError` synchronously; the error is mapped to HTTP 400 `CONFIG_CEILING_VIOLATION` at the AutoRunner submission boundary per §B.2.

### §2.1 — Canonical ceiling-lookup pattern (v2 — advisory cache, not authoritative)

The agent's `getCeiling()` call is a SHORT-TTL ADVISORY READ. It enables fast-path rejection BEFORE the full Orchestrator round-trip, but is NOT the enforcement point — that role belongs to `BaseAgent.guard()` per §2.5 (v2 R2).

```pseudocode
// ADVISORY pattern in Executor / dual-authority primary agent
// (cached read; authoritative enforcement happens in BaseAgent.guard() per §2.5).

import { getCeiling } from '@/lib/governance/ceilings';

const ceiling = await getCeiling({
  productId,                   // canonical ProductRegistry id
  mode,                        // CA-12 v3 §A.1: 1 | 2 | '3A'
  dimension,                   // CA-12 v3 §A.2: 'build' | 'operational'
  cacheMaxAgeMs: 30_000,        // v2 R4 — 30s cache TTL maximum
});
// ceiling: 'autonomous' | 'supervised' | 'recommend_only'
// cacheAt: ISO8601 — when this ceiling was fetched from Orchestrator

const authorityRank = {
  recommend_only: 0,
  supervised: 1,
  autonomous: 2,
};

// Fast-path advisory rejection (cheap; avoids full Orchestrator round-trip
// for obviously-violating requests).
if (authorityRank[requestedAuthority] > authorityRank[ceiling]) {
  throw new CeilingViolationError({
    productId, mode, dimension,
    requested: requestedAuthority,
    ceiling, cacheAt,
    code: 'CONFIG_CEILING_VIOLATION',
    enforcementLayer: 'advisory-cache',   // v2 — distinguish from authoritative
  });
}

// Proceed to BaseAgent.guard() which performs the AUTHORITATIVE check
// against the Orchestrator's current ceiling (re-validated per §2.5).
```

**Why advisory not authoritative:** in v1 the agent's `getCeiling()` was the enforcement point. This created two failure modes: (a) agent cached an old ceiling and acted on it after operator lowered the ceiling; (b) agents could theoretically skip the call entirely. v2 R1 + R2 centralise enforcement in `BaseAgent.guard()` — which every dispatch already traverses — so skipping it is structurally impossible.

### §2.2 — Authoritative enforcement (in BaseAgent.guard, per §2.5 v2 R2)

The advisory cache above gives fast-path rejection for obvious violations. The AUTHORITATIVE check is in `BaseAgent.guard()` per §2.5 — every dispatch boundary traverses it; it cannot be skipped without bypassing the entire agent infrastructure.

### §2.2 — Ceiling storage shape (canonical per CA-12 v3 §A.2.4)

`ProductRegistry.authorityCeilings` JSONB column (6 cells = 3 modes × 2 sub-dims):

```json
{
  "authorityCeilings": {
    "mode_1":   { "build": "recommend_only", "operational": "autonomous" },
    "mode_2":   { "build": "supervised",     "operational": "autonomous" },
    "mode_3A":  { "build": "supervised",     "operational": "supervised" }
  }
}
```

- Default ceiling for any unset cell: `recommend_only` (most-restrictive).
- Admin role (per §13) can edit ceilings; admin-edit is audit-logged in GovernanceAuditLog hash-chain per §14.

### §2.3 — Three call-sites where ceiling check is mandatory

1. **AutoRunner submission validation** (per CA-12 v3 §B.2 rule 6): the submitted `(productId, mode, build, operational)` request is rejected at API boundary if it exceeds ceiling. Returns HTTP 400 `CONFIG_CEILING_VIOLATION`.

2. **EXECUTOR_REGISTRY sibling Executor invocation** (e.g. `Agent3SelfRenewalExecutor.execute(...)`): Executor's `execute()` entry MUST invoke `getCeiling()` BEFORE any of the side-effect actions in its charter. Executor refuses to run with `CeilingViolationError` per §2.1.

3. **Dual-authority primary agent action path** (Agent #26 + Agent #21 ACE Conductor per ENTRY 006): the `authorityNeeded` set membership pattern per CA-9-B.6 is the secondary check; the primary check is the ceiling lookup. BaseAgent.guard() enforces the chain.

### §2.4 — Authority elevation requires ceiling clearance (the "authority creep" mitigation)

Per Batch 1 #03 (authority creep through EXECUTOR_REGISTRY):

- An Executor's charter MAY declare `[auto_write_internal, requires_human_gate]` even when the primary agent is `recommend_only`.
- BUT the Executor's runtime action is bounded by the operator's ceiling for `(productId, mode, dimension)`.
- So an operator with `mode_2.build === 'recommend_only'` ceiling has Self-Renewal Executor effectively gated to `recommend_only` even though the charter would otherwise permit `auto_write_internal`.
- Authority elevation is per-product, per-mode, per-dimension — never global.

### §2.5 — Canonical ceiling-violation envelope

When ceiling-check fails, agent additionally emits:

**Topic:** `agent.ceiling.violation.v1`

**Payload shape:**
```ts
{
  runId: string,
  productId: string,
  agentId: number,
  executorKey?: string,
  productMode: 1 | 2 | '3A',
  dimension: 'build' | 'operational',
  requested: 'autonomous' | 'supervised' | 'recommend_only',
  ceiling: 'autonomous' | 'supervised' | 'recommend_only',
  attemptedAction: string,                  // short description; never includes credentials
  blockReason: 'ceiling-violation',
  at: ISO8601,
}
```

Emit ALWAYS happens (audit trail) even when the error is also surfaced via HTTP 400 to the caller.

### §2.5 — Authoritative enforcement in BaseAgent.guard() (v2 R2)

The ceiling check moves INTO `BaseAgent.guard(authorityNeeded, dispatchCtx)`. Every agent dispatch boundary already calls `guard()` to validate `authorityNeeded ⊆ charter.authority`; v2 extends `guard()` to ALSO call the authoritative Orchestrator ceiling endpoint:

```pseudocode
// In BaseAgent.guard() — canonical chokepoint
async function guard(authorityNeeded, dispatchCtx) {
  // Existing (v1) — charter membership check
  if (!authorityNeeded.every(a => this.charter.authority.includes(a))) {
    throw new AuthorityNotInCharterError(...);
  }

  // v2 R2 — AUTHORITATIVE ceiling check via Orchestrator
  //         (not the agent-side advisory cache from §2.1)
  const { productId, mode, dimension } = dispatchCtx;
  const authoritativeCeiling = await orchestrator.getCurrentCeiling({
    productId, mode, dimension,
    // Authoritative path bypasses cache; reads fresh from DB.
    bypassCache: true,
  });
  const requestedAuthority = max(authorityNeeded);

  if (authorityRank[requestedAuthority] > authorityRank[authoritativeCeiling]) {
    throw new CeilingViolationError({
      productId, mode, dimension,
      requested: requestedAuthority,
      ceiling: authoritativeCeiling,
      code: 'CONFIG_CEILING_VIOLATION',
      enforcementLayer: 'authoritative-guard',   // v2 marker
    });
  }

  // Dual-authority specific: if authorityNeeded includes both
  // [auto_write_internal, requires_human_gate], the human-gate path
  // is initiated AFTER ceiling clears (no point gating on ceiling-violating action).
}
```

This makes the ceiling check **structurally inescapable** — agents cannot bypass `guard()` without breaking dispatch entirely. Skipping ceiling enforcement requires modifying `BaseAgent` itself (which has its own test gate per AC-CE-2 v2).

### §2.6 — Dual-authority primary agents — route through EXECUTOR_REGISTRY (v3 E0 — CEO re-arbitration ratified Option A)

**CEO re-arbitration 2026-05-17: Option A selected. Agents #21 + #26 route through EXECUTOR_REGISTRY sibling pattern. Primary agents revert to `[recommend_only]`. This supersedes CA-9-Q4=(b) ratified previously. New EXECUTOR_REGISTRY entries required:**

- **`aggressive-crawl-conductor-executor`** (Agent #21, already exists per commit `fcb4de8`).
- **`orchestra-research-executor`** (Agent #26, NEW — must be created at Agent #26 first-ship commit).

This re-arbitration ratifies the v2 R3 proposed disposition; the §15.1 roster delta required to land it is documented in §5 (v3 E1).

**Background:** v1 placed dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` charter directly on Agent #26 primary AND Agent #21 ACE primary. v2 R3 proposed reverting to the CA-7 EXECUTOR_REGISTRY sibling pattern. v3 E0 records the CEO's re-arbitration ratifying that proposed revert.

| Agent | v1 charter (primary) | v3 charter (primary) | v3 sibling Executor (in EXECUTOR_REGISTRY) |
|---|---|---|---|
| **Agent #21 ACE Conductor** | `[recommend_only, auto_write_internal, requires_human_gate]` (primary) | `[recommend_only]` | `aggressive-crawl-conductor-executor` already exists per CA-7 §15.5 + ENTRY 006 sibling spec; carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` |
| **Agent #26 Orchestra Research** | `[recommend_only, auto_write_internal, requires_human_gate]` (primary, per legacy CA-9-Q4=(b) — now superseded) | `[recommend_only]` | NEW sibling `orchestra-research-executor` — carries `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`; admission-write happens through this sibling, not the primary; sibling MUST be created at Agent #26 first-ship commit |

**Rationale** (addresses Batch 3 #02 / #11 / #17 / #27 cluster + ratifies CEO Option A):
- Primary-agent dual-authority broke the established EXECUTOR_REGISTRY pattern per CA-7 §15.5.
- The 25-ID partition invariant in `validateExecutors()` was non-trivially affected.
- Reverting to sibling pattern restores the canonical security model: elevated authority is ALWAYS in the sibling namespace; primary agents stay `[recommend_only]`.
- **CA-9-Q4 anchor (top of this template) now reads "Option A" rather than "(b)" — CEO re-arbitration is authoritative; legacy CA-9-Q4=(b) is recorded for historical traceability but is no longer the operative disposition.**

**Order of evaluation per CA-12 v3 §B.2 + Cluster E v2 R2:**

1. AutoRunner submission validation (ceiling check at API boundary; v1 + v2).
2. **`getCeiling()` advisory cache** in agent (fast-path; v2 R1).
3. Agent invocation → `BaseAgent.guard(authorityNeeded, dispatchCtx)` performs **authoritative** ceiling check via Orchestrator (v2 R2 — replaces v1's "agent calls getCeiling()" enforcement).
4. **For Executor siblings**: dispatch routes from primary's `recommend()` → EXECUTOR_REGISTRY lookup → Executor's `execute()` which itself calls `guard()` again (defense in depth).
5. If `requires_human_gate` in `authorityNeeded` → emit Human Gate request envelope; await operator approval.
6. Proceed with action.

### §2.7 — Mid-request ceiling change handling (v2 R4)

Operator may edit `ProductRegistry.authorityCeilings` at any time. Cluster E v2 defines the behavior:

**Cache TTL: 30 seconds maximum** (advisory `getCeiling()` per §2.1). Agent code must NOT cache ceiling beyond this window without re-fetching.

**Long-running dispatch (>30s) checkpoints:** Executors performing long-running actions (e.g. multi-file PR generation per `SELF_RENEWAL_SPEC.md` §4) MUST re-call `getCeiling()` at each meaningful checkpoint:

- Self-Renewal Executor: re-checks ceiling BEFORE opening PR + BEFORE auto-deploying preview + BEFORE writing each fix file.
- ACE Conductor Executor: re-checks ceiling BEFORE each page-crawl batch + BEFORE writing `architecture_snapshot` updates.
- Cost Governor Executor: re-checks ceiling BEFORE issuing the halt write to `flowai_run_budgets.exceededAt`.

**Ceiling reduction during dispatch:**
- Operator lowers ceiling mid-run → at next checkpoint, advisory cache misses (≤30s); `BaseAgent.guard()` re-validation against Orchestrator sees lower ceiling → `CeilingViolationError` thrown at that checkpoint.
- Already-committed side effects (e.g. PR opened) are NOT rolled back — they happened under the prior ceiling and the operator's change is forward-only.
- Remaining checkpoints fail-loud with `CeilingViolationError`; partial-completion envelope `agent.dispatch.partial.v1` emitted with summary of which steps completed.

**Ceiling raise during dispatch:**
- Operator raises ceiling mid-run → in-flight dispatch does NOT retroactively gain elevated authority. The raise takes effect at the next cache miss (≤30s later).
- Rationale: in-flight retro-elevation is a security anti-pattern; the operator who edited the ceiling should expect new dispatches to use the new value, not in-flight ones.

**Auditing mid-request changes:** Orchestrator emits `system.ceiling.changed.v1` (added to Cluster D P0 set) on every `authorityCeilings` edit; in-flight dispatches affected by the change emit `agent.ceiling.midflight_change.v1` recording the change + checkpoint outcome.

### §2.8 — Cluster A ↔ Cluster E split-brain resolution (v3 E2)

The v2 design retains two ceiling-check pathways: the **advisory cache** (per §2.1, agent-side, short-TTL) and the **authoritative `BaseAgent.guard()` check** (per §2.5, Orchestrator-backed, no cache). These two checks can disagree (e.g. advisory cache holds the prior ceiling value while the operator has just lowered the authoritative ceiling). v3 E2 makes the resolution rule canonical and distinguishes the error semantics on each side:

**Canonical ordering rule:** when the advisory cache and `BaseAgent.guard()` authoritative check disagree, **the authoritative check is ALWAYS the deciding verdict**. The advisory cache is informational only — it MAY short-circuit a dispatch BEFORE the authoritative check runs (the fast-path rejection per §2.1), but it NEVER overrides the authoritative check. In particular:

- An advisory `accept` followed by an authoritative `reject` → dispatch is rejected. The advisory `accept` is discarded.
- An advisory `reject` followed by (counterfactually) an authoritative `accept` → cannot actually occur in current ordering because advisory `reject` short-circuits before the authoritative check. The agent caller MAY retry after the cache TTL expires; on retry the cache will re-fetch from Orchestrator and produce a consistent verdict.

**Error semantics — two distinct codes:**

| Code | Emitted by | Retryable? | When emitted |
|---|---|---|---|
| `CEILING_ADVISORY_REJECT` | Advisory cache fast-path rejection (per §2.1) | **YES** — caller MAY retry once the cache TTL (≤30 s per §2.7) expires; the retry will re-fetch from Orchestrator and produce a fresh verdict. | Cached ceiling value `<` requested authority. Cache is potentially stale; the operator may have raised the ceiling in the cache window. |
| `CEILING_EXCEEDED` | Authoritative `BaseAgent.guard()` rejection (per §2.5) | **NO** — operator has affirmatively set the ceiling below the requested authority. Retrying without an operator config change produces the same rejection. | Live Orchestrator query returns ceiling `<` requested authority. |

**Caller behaviour:**
- On `CEILING_ADVISORY_REJECT`: the caller's retry strategy MAY include "wait at least `cacheMaxAgeMs` then retry once"; further retries beyond one are not warranted (if the authoritative check would still reject, the second retry will return `CEILING_EXCEEDED` instead).
- On `CEILING_EXCEEDED`: the caller surfaces the rejection to the operator via the standard `agent.ceiling.violation.v1` envelope per §2.5. No automatic retry; operator must edit `authorityCeilings` for the rejection to clear.

**Why this matters:** the v1 design implied a single `CONFIG_CEILING_VIOLATION` code that elided this distinction. Cluster A (Cost Governor)'s budget-check pathway also produces ceiling-adjacent rejections; without the explicit retryable/non-retryable split, callers could enter retry loops on truly-rejected actions (wasting cost) OR could fail-loud on transient cache staleness (frustrating operators). v3 E2 makes the rule canonical and the error codes load-bearing.

**Audit-log emission:** both rejection paths still emit `agent.ceiling.violation.v1` per §2.5; the envelope's `enforcementLayer` field (`'advisory-cache'` vs `'authoritative-guard'`) lets operators and Panel distinguish the two paths in the audit stream.

### §2.9 — Async cache with fallback for Orchestrator outages (v3 E3)

The advisory cache is short-TTL (≤30 s per §2.7); the authoritative check requires a live round-trip to the Orchestrator on every dispatch. v3 E3 specifies the canonical behaviour when the Orchestrator is unreachable (network partition, deployment in flight, scheduled maintenance):

**Three-state behaviour:**

1. **Advisory cache fresh AND Orchestrator reachable** → normal path. Advisory check runs (fast-path); authoritative check runs (`BaseAgent.guard()` round-trip); both must clear.
2. **Advisory cache fresh AND Orchestrator unreachable** → **use cached value and proceed**. The cached value is < TTL old, so it reflects the operator's recent intent within the cache window. The dispatch proceeds with the cached ceiling as both advisory AND degraded-authoritative source. Emit `agent.ceiling.degraded_check.v1` envelope marking the dispatch as decided under degraded-mode.
3. **Advisory cache stale (age ≥ TTL) AND Orchestrator unreachable** → emit `CEILING_CHECK_DEGRADED` warning AND apply the **conservative fallback ceiling** (defined below). Dispatch is NOT indefinitely blocked waiting for Orchestrator recovery; instead, the agent proceeds under the conservative fallback. On Orchestrator recovery, the cache refreshes on next dispatch and normal ordering resumes.

**Conservative fallback ceiling definition:**

The fallback ceiling is one tier down from the last-known ceiling, rounded toward `recommend_only`. Concretely, using the canonical tier-rank (`recommend_only = 0`, `supervised = 1`, `autonomous = 2`):

```
fallbackRank = Math.floor(rank(lastKnownCeiling) / 2)
```

This maps:
- `autonomous` (2) → `supervised` (1)
- `supervised` (1) → `recommend_only` (0)
- `recommend_only` (0) → `recommend_only` (0)

The fallback is intentionally conservative: an unreachable Orchestrator combined with stale cache MUST NOT result in elevated dispatch authority. The system fails toward `recommend_only` (least-privilege), not toward `autonomous` (most-permissive).

**Caller-facing contract:**
- The `CEILING_CHECK_DEGRADED` envelope (kind: `agent.ceiling.degraded_check.v1`) carries `{ runId, productId, agentId, mode, dimension, lastKnownCeiling, fallbackCeiling, cacheAgeMs, orchestratorReachable: false, at }`. Operators and Panel can observe degraded-mode dispatches via the audit stream.
- The `BaseAgent.guard()` boundary returns the fallback ceiling rather than throwing — the agent's dispatch proceeds with the reduced authority. If the requested authority exceeds even the fallback, the standard `CEILING_EXCEEDED` is thrown (non-retryable).
- **Dispatch is never indefinitely blocked.** Orchestrator outages of any duration produce either (a) cache-served decisions when cache is fresh, or (b) fallback-served decisions when cache is stale. Neither path waits-indefinitely for Orchestrator recovery.

**Outage detection:** an Orchestrator request is treated as "unreachable" after either (a) a 5 s connection timeout, or (b) two consecutive 5xx responses to ceiling queries within a 10 s window. Recovery: on the first successful ceiling query after an outage, normal ordering resumes immediately; in-flight dispatches that decided under fallback continue with the fallback decision (not retro-elevated per §2.7's same rationale).

**Audit volume:** sustained Orchestrator outages produce one `agent.ceiling.degraded_check.v1` envelope per dispatch — operators observing a high volume of these events should treat it as a SEV signal and page Orchestrator on-call. The envelope's `cacheAgeMs` field distinguishes "outage just started, cache still fresh" from "outage prolonged, cache now stale" — both states should be visible to the on-call surface.

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §7 Security Controls of each Executor spec (v2 — siblings only; primary agents stay recommend_only per v2 R3)

````markdown
### §7.X — Authority-ceiling integration (canonical per CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md v2)

This Executor sibling carries elevated authority per CA-7 §15.5
EXECUTOR_REGISTRY pattern (v2 R3 reverts dual-authority-on-primary to
sibling pattern). The primary agent stays `[recommend_only]`; this
Executor sibling holds `[auto_write_internal, requires_human_gate]`.

**Authoritative ceiling enforcement** lives in `BaseAgent.guard()` per
Cluster E §2.5 v2 R2 — this Executor does NOT re-implement ceiling
checks; they are inherited from BaseAgent's canonical chokepoint.

**Advisory cache** (fast-path rejection BEFORE Orchestrator round-trip):

```js
import { getCeiling } from '@/lib/governance/ceilings';

const ceiling = await getCeiling({
  productId, mode, dimension,
  cacheMaxAgeMs: 30_000,            // v2 R4 — 30s cache TTL
});
if (authorityRank[requestedAuthority] > authorityRank[ceiling]) {
  throw new CeilingViolationError({
    productId, mode, dimension,
    requested: requestedAuthority, ceiling,
    code: 'CONFIG_CEILING_VIOLATION',
    enforcementLayer: 'advisory-cache',   // v2 marker
  });
}
// Continue to BaseAgent.guard() which performs authoritative re-check.
```

Where:
- `productId`: from invocation context.
- `mode`: `pipelineMode` per Cluster C §2.4 (canonical 1 / 2 / '3A');
  P2 + P3 agents carry the field; P1 agents derive from runId context.
- `dimension`: 'build' OR 'operational' per CA-12 v3 §A.2.
- `requestedAuthority`: the authority level this Executor needs for the
  action (from `authorityNeeded` set membership per CA-9-B.6).

**Mid-request ceiling change handling per Cluster E §2.7 v2 R4:**

For long-running dispatches (>30s wall-clock), re-call `getCeiling()`
at every meaningful checkpoint (e.g. before opening PR; before each
file write; before final commit). Ceiling reduction mid-run → next
checkpoint throws `CeilingViolationError`; emit
`agent.dispatch.partial.v1` with completion summary.

On `CeilingViolationError`: emit `agent.ceiling.violation.v1` envelope
per Cluster E §2.5 (audit trail); AutoRunner submission boundary
returns HTTP 400 `CONFIG_CEILING_VIOLATION` per CA-12 v3 §B.2 rule 6.

This Executor sibling is registered in EXECUTOR_REGISTRY with
agentId = <primary-agent-id>; its execution is invoked by the
primary agent's `recommend()` returning a non-null candidate envelope.
````

### §3.2 — Block to paste into §4 Output Contract (cross-cluster)

````markdown
**Ceiling-violation envelope (canonical per Cluster E §2.5):**
`agent.ceiling.violation.v1` — emitted on every ceiling-check failure
(audit trail). Payload per Cluster E §2.5.
````

### §3.3 — Block to paste into §9 Acceptance Criteria

````markdown
- **AC-CE-N** — Given an operator with `mode_2.build === 'recommend_only'`
  ceiling, an Executor invocation with `requestedAuthority: 'auto_write_internal'`
  throws `CeilingViolationError`; `agent.ceiling.violation.v1` emitted;
  no side-effect action taken.
- **AC-CE-N+1** — Order of evaluation: AutoRunner ceiling validation →
  `BaseAgent.guard()` charter check → `getCeiling()` runtime ceiling check
  → human gate (if `requires_human_gate` in authority set) → side-effect
  action. Verify by deliberate-failure injection at each layer.
- **AC-CE-N+2** — Default ceiling for any unset
  `ProductRegistry.authorityCeilings[mode_X][dim_Y]` cell is
  `recommend_only` (most-restrictive); not `autonomous` and not undefined.
````

---

## §4 — Acceptance Criteria (v3)

How W2 verifies the Cluster E fix is correctly implemented across agent specs.

1. **AC-CE-1 (Spec-level coverage, v2):** Every Executor sibling spec (EXECUTOR_REGISTRY entries) contains the Cluster E §3.1 v2 block in §7 Security Controls. Primary agent specs for #21 + #26 DO NOT contain the §3.1 block (their charter is `[recommend_only]` per v2 R3 — elevation lives in siblings).

2. **AC-CE-2 (Ceiling lookup mandatory):** Implementation-level test (deferred) — for every Executor's `execute()` entry, stub `getCeiling()` to return `recommend_only`; assert Executor throws `CeilingViolationError` before any side-effect call.

3. **AC-CE-3 (Default-most-restrictive):** Unset ceiling cell defaults to `recommend_only`. Verify by spec assertion + canonical `getCeiling()` implementation.

4. **AC-CE-4 (Order of evaluation):** AutoRunner submission validation → `BaseAgent.guard()` charter check → `getCeiling()` runtime ceiling → human-gate → action. Verified by deliberate-failure injection at each layer.

5. **AC-CE-5 (Envelope schema):** `agent.ceiling.violation.v1` payload validates against §2.5 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

6. **AC-CE-6 (Admin-edit audit trail):** Every `ProductRegistry.authorityCeilings` edit is audit-logged in GovernanceAuditLog hash-chain per §14 + §14.2.

7. **AC-CE-7 (Authority-creep mitigation):** Per Batch 1 #03 mitigation — Executor's charter authority is BOUNDED by operator ceiling at runtime; charter is a maximum, not a guarantee.

8. **AC-CE-8 (v2 R1 — Orchestrator authoritative):** Agent's `getCeiling()` is advisory; `BaseAgent.guard()` re-validates against Orchestrator on every dispatch. Test: stub agent-cache to return `autonomous` while Orchestrator authoritative returns `recommend_only`; assert `BaseAgent.guard()` throws (the agent cache is overridden).

9. **AC-CE-9 (v2 R2 — guard() chokepoint):** Spec-level grep — no Executor or primary agent has standalone ceiling-check code OUTSIDE `BaseAgent.guard()`. All ceiling enforcement routes through `guard()`. Implementation test (deferred) — bypassing `guard()` is structurally impossible without modifying BaseAgent itself.

10. **AC-CE-10 (v3 E0/E1 — Dual-authority sibling pattern + roster delta):** Agent #21 + Agent #26 primary charters are `[recommend_only]` only (per CEO Option A re-arbitration recorded in §2.6); their elevated-authority sibling Executors (`aggressive-crawl-conductor-executor` already exists per commit `fcb4de8`; `orchestra-research-executor` is NEW and MUST be created at Agent #26 first-ship commit) are registered in EXECUTOR_REGISTRY with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. The §15.1 roster delta lands per §5.1; `_registry.ts` `validateExecutors()` enforces the 25-ID partition invariant — primary charter authority union sibling charter authority MUST equal `[recommend_only, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` for these two agents.

11. **AC-CE-11 (v2 R4 — Mid-request ceiling change):** Integration test — operator lowers ceiling mid-run; advisory cache misses at next checkpoint (≤30s); `BaseAgent.guard()` re-validation against Orchestrator sees lower ceiling; `CeilingViolationError` thrown at checkpoint; `agent.dispatch.partial.v1` emitted with summary of completed steps. Already-committed side effects are NOT rolled back.

12. **AC-CE-12 (v2 R4 — Ceiling raise does not retro-elevate):** Operator raises ceiling mid-run; in-flight dispatch does NOT gain elevated authority; raise takes effect only at next cache-miss (≥30s later). Verified by ceiling-raise + immediate-checkpoint integration test.

13. **AC-CE-13 (v3 E2 — Split-brain resolution + distinct error codes):** When the advisory cache and `BaseAgent.guard()` authoritative check disagree, the authoritative check is the deciding verdict (per §2.8). Advisory-cache rejection emits `CEILING_ADVISORY_REJECT` (retryable after `cacheMaxAgeMs` expires); authoritative rejection emits `CEILING_EXCEEDED` (non-retryable). Both paths emit `agent.ceiling.violation.v1` envelope with `enforcementLayer` distinguishing `'advisory-cache'` vs `'authoritative-guard'`. Integration test: stub advisory cache to `accept` while Orchestrator authoritative returns `recommend_only`; assert `BaseAgent.guard()` throws `CEILING_EXCEEDED` (the cache `accept` is discarded). Counter-test: cache stale `recommend_only` while Orchestrator currently `autonomous`; advisory fast-path emits `CEILING_ADVISORY_REJECT`; retry after TTL succeeds.

14. **AC-CE-14 (v3 E3 — Async cache fallback for Orchestrator outages):** When the Orchestrator is unreachable (5s connect timeout OR two consecutive 5xx within 10s):
    - Fresh cache (age < TTL): dispatch proceeds with cached value; emits `agent.ceiling.degraded_check.v1` marking the dispatch as decided under degraded-mode.
    - Stale cache (age ≥ TTL): emits `CEILING_CHECK_DEGRADED` warning AND applies conservative fallback ceiling `fallbackRank = Math.floor(rank(lastKnownCeiling) / 2)` (autonomous→supervised; supervised→recommend_only; recommend_only→recommend_only). Dispatch proceeds at fallback ceiling.
    - Dispatch is **never indefinitely blocked** waiting for Orchestrator recovery. Integration test: stub Orchestrator unreachable + cache fresh → dispatch succeeds + degraded envelope emitted; stub unreachable + cache stale at `autonomous` → dispatch proceeds at `supervised` + `CEILING_CHECK_DEGRADED` emitted; stub unreachable + cache stale at `recommend_only` + requested authority `autonomous` → standard `CEILING_EXCEEDED` (fallback is still `recommend_only`).

---

## §5 — Affected Agents + §15.1 Roster Delta (v3)

Per v3 E0 (CEO re-arbitration ratifying Option A), primary agents stay `[recommend_only]`; elevated authority lives in Executor siblings. ALL siblings require the §3.1 block in §7 Security Controls:

| Executor sibling | Primary agent | Cluster E v3 revision required |
|---|---|---|
| `self-renewal-executor` (CA-7 EXECUTOR_REGISTRY) | Agent #3 | YES — update SELF_RENEWAL_SPEC.md §7 (already partially covered) |
| `aggressive-crawl-conductor-executor` (CA-7 / ENTRY 006) | Agent #21 | YES — already exists per commit `fcb4de8`; ensure v3 §3.1 block present |
| **`orchestra-research-executor`** (NEW per v3 E0/E1) | Agent #26 | YES — NEW EXECUTOR_REGISTRY entry; MUST be created at Agent #26 first-ship commit; supersedes Agent #26 primary dual-authority per CEO re-arbitration |
| `design-executor` (Phase 2) | Agent #7 | YES — once Phase 2 spec drafted |
| `monitor-ingestion-executor` (Phase 2) | Agent #10 | YES — once Phase 2 spec drafted |
| `self-protection-executor` (Phase 2) | Agent #13 | YES — once Phase 2 spec drafted |
| `cost-governor-executor` (Phase 2) | Agent #23 | YES — once Phase 2 spec drafted |

### §5.1 — §15.1 Roster Delta required by Cluster E v3 ratification (v3 E1)

After Cluster E v3 is ratified, the §15.1 roster update commit MUST include the following changes (this is the canonical, exhaustive list of authority-row edits required by E0 + E1):

**Agent #21 Aggressive Crawl Conductor (ACE):**
- Primary `Agent #21` row: authority field changes from `[recommend_only, auto_write_internal, requires_human_gate]` → **`[recommend_only]`**.
- Executor sibling `aggressive-crawl-conductor-executor`: authority field **REMAINS `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`** (no change; sibling already exists per commit `fcb4de8`).

**Agent #26 Orchestra Research:**
- Primary `Agent #26` row: authority field changes from `[recommend_only, auto_write_internal, requires_human_gate]` (legacy per CA-9-Q4=(b)) → **`[recommend_only]`**.
- Executor sibling `orchestra-research-executor`: **NEW row, NEW Executor**. Authority field set to **`[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`**. The sibling MUST be created at Agent #26 first-ship commit (NOT in this template's ratification commit — this template ratifies the intent; the sibling code lands with Agent #26's runtime).

**Both #21 + #26 primary rows:** the §15.1 roster row's authority column reads `[recommend_only]` — no parenthetical, no "+ sibling" notation, no compound charter. The sibling appears as its own row under the EXECUTOR_REGISTRY section of §15.1 (or in §15.5, whichever §15.1's canonical layout dictates per CA-7).

**Validation hook:** `_registry.ts`'s `validateExecutors()` enforces the 25-ID partition invariant after the v3 roster delta lands — primary agent authority union sibling authority for #21 + #26 MUST equal `[recommend_only, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` (the union recovers the legacy compound charter, distributed across primary + sibling).

**Sequencing:** §15.1 roster delta lands BEFORE Agent #26's first ship commit. The §15.1 commit registers the planned new sibling `orchestra-research-executor` slot; Agent #26's ship commit fills the slot with executor code. If the slot is unfilled at Agent #26 ship time, `validateExecutors()` fails the ship-commit's CI gate.

### §5.2 — Non-Executor primary agents (unaffected by §3.1 block)

Non-Executor primary agents (recommend_only charter): NOT directly affected by ceiling-check pattern (they have no side-effect actions). BUT their recommendations are consumed by Executor siblings, which DO enforce ceiling — so the consumer-side enforcement is canonical.

| Non-Executor primary agents (don't require §3.1 block in §7) |
|---|
| #6 Research, #7 Design Phase 1, #8 Quality Audit, #9 Go-to-Market, #10 Monitor Phase 1, #11 SI, #12 Portfolio Risk, #13 Self-Protection Phase 1, #14 Public Policy, #15 Benchmarking, #16 Productivity/HR, #17 Product Evolution, #18 Business Planning, #19 Tech Evolution, #20 Environmental, #23 Cost Governor Phase 1, #22/#24/#25 Ops Runners (TBD) |

**Total agents/Executors that require Cluster E template: 8** (6 Executors + 2 primary-agent roster-row changes per §5.1).

---

## §6 — Cross-cluster integration notes

- **Cluster A** (Cost Governor): the `costGovernor.reserve()` call is the natural enforcement point for Operational-authority ceiling checks per §A.2.4 (cost ≈ operational quota). Both budget AND ceiling checks must clear before dispatch.
- **Cluster B** (Data Quality Gate): a data-quality halt does NOT consume authority quota — Operational-authority is not exhausted by a data-quality block.
- **Cluster C** (Mode-Conditional Behavior): `getCeiling()` lookup keys are `(productId, mode, dimension)` where `mode` is the canonical CA-12 v3 pipeline mode propagated per Cluster C §2.4.
- **Cluster D** (Audit-Log Topic Schema): `agent.ceiling.violation.v1` added to §14.1 canonical catalogue per Cluster D extension.
- **Cluster F** (Model-Budget Fallback): LLM fallback dispatch does not bypass ceiling — every fallback dispatch goes through the same `getCeiling()` check (the dispatch site is the action site).

---

*End of CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md canonical template v3. v2 Panel conditions R1–R4 + v3 Panel v2 conditions E0–E3 applied. **CA-9-Q4 = Option A** ratified by CEO re-arbitration 2026-05-17 (recorded in §2.6); the legacy CA-9-Q4=(b) is superseded. Pending W6 re-ratification. Following ratification, W3 issues the §15.1 roster delta per §5.1 (Agents #21 + #26 primary → `[recommend_only]`; sibling `orchestra-research-executor` registered as NEW slot — Agent #26 first-ship commit fills the slot).*
