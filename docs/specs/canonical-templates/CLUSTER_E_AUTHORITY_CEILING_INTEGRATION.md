# Cluster E — Authority-Ceiling Integration (Canonical Template, v2)

**Status:** DRAFT v2 — Panel conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `c576a5f`, 2026-05-16) → v2 (this commit, 2026-05-17 — Panel `PLURALITY_CLE-REVISE` 4/9 conditions R1–R4 applied per W3 Dispatch #10).
**Author:** W3.
**Anchor canonical:** CA-12 v3 §A.2 (Build-authority + Operational-authority sub-dimensions); §A.2.4 (`ProductRegistry.authorityCeilings` JSONB 6-cell shape); §B.2 enforcement contract (HTTP 400 codes including `CONFIG_CEILING_VIOLATION`); CA-7 §15.5 EXECUTOR_REGISTRY; CA-9-Q4=(b) dual-authority + human-gate (Agent #26 + Self-Renewal Executor pattern).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #03 + Batch 2 objection #30 + Batch 3 objections #02, #11, #17, #19, #24, #27. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`) — `PLURALITY_CLE-REVISE` 4/9.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — **Orchestrator is the authoritative ceiling source.** Agent's `getCeiling()` call is an **advisory cache** with a short TTL. The authoritative check is enforced by the Orchestrator at action-dispatch time. Removes the v1 risk of an agent caching a stale ceiling and acting on it after the operator lowered the ceiling. §2.1 + §2.2 rewritten.
- **R2** — Move the ceiling check INTO `BaseAgent.guard(authorityNeeded, dispatchCtx)` — every agent emit / dispatch already passes through `guard()`, so the check is a single canonical chokepoint rather than per-agent code. Eliminates "did this Executor remember to call getCeiling?" defect class. §2.5 rewritten.
- **R3** — Dual-authority agents Agent #26 + Agent #21 ACE — **route through EXECUTOR_REGISTRY sibling** (e.g. `orchestra-research-executor` sibling for Agent #26 primary; `aggressive-crawl-conductor-executor` already exists for #21 per CA-7). Primary agent stays `[recommend_only]`; elevated authority lives in the sibling per CA-7 §15.5 precedent. Addresses Batch 3 #02 / #11 / #17 / #27 dual-authority precedent risk. §2.6 rewritten.
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

### §2.6 — Dual-authority primary agents — route through EXECUTOR_REGISTRY (v2 R3)

**v2 R3 change:** v1 placed dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` charter directly on Agent #26 primary AND Agent #21 ACE primary. v2 REVERTS to the CA-7 EXECUTOR_REGISTRY sibling pattern:

| Agent | v1 charter (primary) | v2 charter (primary) | v2 sibling Executor (in EXECUTOR_REGISTRY) |
|---|---|---|---|
| **Agent #21 ACE Conductor** | `[recommend_only, auto_write_internal, requires_human_gate]` (primary) | `[recommend_only]` | `aggressive-crawl-conductor-executor` already exists per CA-7 §15.5 + ENTRY 006 sibling spec; carries `[auto_write_internal, requires_human_gate]` |
| **Agent #26 Orchestra Research** | `[recommend_only, auto_write_internal, requires_human_gate]` (primary, per CA-9-Q4=(b)) | `[recommend_only]` | NEW sibling `orchestra-research-executor` — carries `[auto_write_internal, requires_human_gate]`; admission-write happens through this sibling, not the primary |

**Rationale** (addresses Batch 3 #02 / #11 / #17 / #27 cluster):
- Primary-agent dual-authority broke the established EXECUTOR_REGISTRY pattern per CA-7 §15.5.
- The 25-ID partition invariant in `validateExecutors()` was non-trivially affected.
- Reverting to sibling pattern restores the canonical security model: elevated authority is ALWAYS in the sibling namespace; primary agents stay `[recommend_only]`.
- CA-9-Q4=(b) is **superseded** by this v2 R3 change. CEO re-disposition required to ratify; this template is the proposed disposition. If CEO disagrees, this v2 R3 reverts and Cluster E v3 will document the alternative.

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

## §4 — Acceptance Criteria

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

10. **AC-CE-10 (v2 R3 — Dual-authority sibling pattern):** Agent #21 + Agent #26 primary charters are `[recommend_only]` only; their elevated-authority sibling Executors (`aggressive-crawl-conductor-executor`, `orchestra-research-executor`) are registered in EXECUTOR_REGISTRY with `[auto_write_internal, requires_human_gate]`. `_registry.ts` `validateExecutors()` enforces the 25-ID partition invariant — primary charter authority union sibling charter authority MUST equal `[recommend_only, auto_write_internal, requires_human_gate]` for these two agents.

11. **AC-CE-11 (v2 R4 — Mid-request ceiling change):** Integration test — operator lowers ceiling mid-run; advisory cache misses at next checkpoint (≤30s); `BaseAgent.guard()` re-validation against Orchestrator sees lower ceiling; `CeilingViolationError` thrown at checkpoint; `agent.dispatch.partial.v1` emitted with summary of completed steps. Already-committed side effects are NOT rolled back.

12. **AC-CE-12 (v2 R4 — Ceiling raise does not retro-elevate):** Operator raises ceiling mid-run; in-flight dispatch does NOT gain elevated authority; raise takes effect only at next cache-miss (≥30s later). Verified by ceiling-raise + immediate-checkpoint integration test.

---

## §5 — Affected Agents (v2)

Every Executor sibling. Per v2 R3, primary agents stay `[recommend_only]`; elevated authority lives in siblings. ALL siblings require the §3.1 block in §7 Security Controls:

| Executor sibling | Primary agent | Cluster E v2 revision required |
|---|---|---|
| `self-renewal-executor` (CA-7 EXECUTOR_REGISTRY) | Agent #3 | YES — update SELF_RENEWAL_SPEC.md §7 (already partially covered) |
| `aggressive-crawl-conductor-executor` (CA-7 / ENTRY 006) | Agent #21 | YES — already exists per CA-7; ensure v2 §3.1 block present |
| `orchestra-research-executor` (NEW per v2 R3) | Agent #26 | YES — NEW EXECUTOR_REGISTRY entry; supersedes Agent #26 primary dual-authority per v2 R3 |
| `design-executor` (Phase 2) | Agent #7 | YES — once Phase 2 spec drafted |
| `monitor-ingestion-executor` (Phase 2) | Agent #10 | YES — once Phase 2 spec drafted |
| `self-protection-executor` (Phase 2) | Agent #13 | YES — once Phase 2 spec drafted |
| `cost-governor-executor` (Phase 2) | Agent #23 | YES — once Phase 2 spec drafted |

**v2 R3 primary agent changes (require coordinated CEO + Panel re-disposition):**

| Primary agent | v1 charter | v2 charter (proposed per v2 R3) | Status |
|---|---|---|---|
| Agent #21 ACE Conductor | `[recommend_only, auto_write_internal, requires_human_gate]` | `[recommend_only]` | revert per v2 R3 — elevated authority moves to existing sibling `aggressive-crawl-conductor-executor` |
| Agent #26 Orchestra Research | `[recommend_only, auto_write_internal, requires_human_gate]` (per CA-9-Q4=(b)) | `[recommend_only]` | revert per v2 R3 — CEO arbitration CA-9-Q4=(b) requires re-disposition; CEO chooses (a) accept v2 R3 (revert to sibling pattern) OR (b) reject and document why dual-authority-on-primary is justified for #26 |

Non-Executor primary agents (recommend_only charter): NOT directly affected by ceiling-check pattern (they have no side-effect actions). BUT their recommendations are consumed by Executor siblings, which DO enforce ceiling — so the consumer-side enforcement is canonical.

| Non-Executor primary agents (don't require §3.1 block in §7) |
|---|
| #6 Research, #7 Design Phase 1, #8 Quality Audit, #9 Go-to-Market, #10 Monitor Phase 1, #11 SI, #12 Portfolio Risk, #13 Self-Protection Phase 1, #14 Public Policy, #15 Benchmarking, #16 Productivity/HR, #17 Product Evolution, #18 Business Planning, #19 Tech Evolution, #20 Environmental, #23 Cost Governor Phase 1, #22/#24/#25 Ops Runners (TBD) |

**Total agents/Executors that require Cluster E template: 8** (6 Executors + 2 dual-authority primary agents).

---

## §6 — Cross-cluster integration notes

- **Cluster A** (Cost Governor): the `costGovernor.reserve()` call is the natural enforcement point for Operational-authority ceiling checks per §A.2.4 (cost ≈ operational quota). Both budget AND ceiling checks must clear before dispatch.
- **Cluster B** (Data Quality Gate): a data-quality halt does NOT consume authority quota — Operational-authority is not exhausted by a data-quality block.
- **Cluster C** (Mode-Conditional Behavior): `getCeiling()` lookup keys are `(productId, mode, dimension)` where `mode` is the canonical CA-12 v3 pipeline mode propagated per Cluster C §2.4.
- **Cluster D** (Audit-Log Topic Schema): `agent.ceiling.violation.v1` added to §14.1 canonical catalogue per Cluster D extension.
- **Cluster F** (Model-Budget Fallback): LLM fallback dispatch does not bypass ceiling — every fallback dispatch goes through the same `getCeiling()` check (the dispatch site is the action site).

---

*End of CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md canonical template v2. Panel `PLURALITY_CLE-REVISE` 4/9 conditions R1–R4 applied. Pending W6 re-ratification + CEO re-disposition of CA-9-Q4=(b) (Agent #26 dual-authority pattern) per v2 R3.*
