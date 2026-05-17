# Cluster E — Authority-Ceiling Integration (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** CA-12 v3 §A.2 (Build-authority + Operational-authority sub-dimensions); §A.2.4 (`ProductRegistry.authorityCeilings` JSONB 6-cell shape); §B.2 enforcement contract (HTTP 400 codes including `CONFIG_CEILING_VIOLATION`); CA-7 §15.5 EXECUTOR_REGISTRY; CA-9-Q4=(b) dual-authority + human-gate (Agent #26 + Self-Renewal Executor pattern).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #03 + Batch 2 objection #30 + Batch 3 objections #02, #11, #17, #19, #24, #27.

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

## §2 — Canonical Resolution

**Every Executor (and every dual-authority primary agent per CA-9-Q4=(b)) MUST invoke the canonical `getCeiling()` lookup BEFORE any side-effect action.** Ceiling violations raise `CeilingViolationError` synchronously; the error is mapped to HTTP 400 `CONFIG_CEILING_VIOLATION` at the AutoRunner submission boundary per §B.2.

### §2.1 — Canonical ceiling-lookup pattern

```pseudocode
// MANDATORY pattern in every Executor / dual-authority primary agent
// before any side-effect-bearing action.

import { getCeiling } from '@/lib/governance/ceilings';

const ceiling = await getCeiling({
  productId,                   // canonical ProductRegistry id
  mode,                        // CA-12 v3 §A.1: 1 | 2 | '3A'
  dimension,                   // CA-12 v3 §A.2: 'build' | 'operational'
});
// ceiling: 'autonomous' | 'supervised' | 'recommend_only'

const authorityRank = {
  recommend_only: 0,
  supervised: 1,
  autonomous: 2,
};

if (authorityRank[requestedAuthority] > authorityRank[ceiling]) {
  throw new CeilingViolationError({
    productId, mode, dimension,
    requested: requestedAuthority,
    ceiling,
    code: 'CONFIG_CEILING_VIOLATION',
  });
}

// Proceed with side-effect action. The actor's authority is BOUNDED by
// the ceiling; even if the agent's charter declares
// [recommend_only, auto_write_internal], the operator's ceiling for
// this productId+mode+dimension may restrict to `supervised`.
```

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

### §2.6 — Dual-authority primary agents (Agent #26 + Agent #21 ACE)

Per CA-9-Q4=(b) + ENTRY 006: certain primary agents carry dual-authority + human-gate charter. The ceiling check still applies — `getCeiling()` runs before the agent performs its `auto_write_internal` action even though the charter would otherwise permit. Human-gate (`requires_human_gate`) is a SEPARATE check that runs after ceiling passes.

Order of evaluation per CA-12 v3 §B.2 + Cluster E §2.1:
1. AutoRunner submission validation (ceiling check at API boundary).
2. Agent invocation → `BaseAgent.guard(authorityNeeded)` checks `authorityNeeded` ⊆ charter's authority array.
3. Agent's action path → `getCeiling()` ceiling lookup per §2.1.
4. If `requires_human_gate` in `authorityNeeded` → emit Human Gate request envelope; await operator approval.
5. Proceed with action.

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §7 Security Controls of each Executor spec (and dual-authority primary agent specs #21, #26)

````markdown
### §7.X — Authority-ceiling integration (canonical per CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md)

Before ANY side-effect-bearing action, this <Executor / dual-authority
primary agent> MUST invoke:

```js
const ceiling = await getCeiling({
  productId, mode, dimension,
});
if (authorityRank[requestedAuthority] > authorityRank[ceiling]) {
  throw new CeilingViolationError({
    productId, mode, dimension,
    requested: requestedAuthority, ceiling,
    code: 'CONFIG_CEILING_VIOLATION',
  });
}
```

Where:
- `productId`: from invocation context.
- `mode`: `pipelineMode` per Cluster C §2.4 (canonical 1 / 2 / '3A').
- `dimension`: 'build' OR 'operational' per CA-12 v3 §A.2.
- `requestedAuthority`: the authority level this Executor needs for the
  action (from `authorityNeeded` set membership per CA-9-B.6).

The runtime ceiling lookup BOUNDS this Executor's declared charter authority
per the operator's per-product per-mode configuration. Even if the charter
declares `[auto_write_internal, requires_human_gate]`, an operator with
`mode_2.build === 'recommend_only'` reduces this Executor's effective
authority to recommend-only.

On `CeilingViolationError`: emit `agent.ceiling.violation.v1` envelope per
Cluster E §2.5 (audit trail); the AutoRunner submission boundary returns
HTTP 400 `CONFIG_CEILING_VIOLATION` to the caller per CA-12 v3 §B.2 rule 6.

For dual-authority primary agents (Agent #26 + Agent #21 per CA-9-Q4=(b) /
ENTRY 006): ceiling check applies BEFORE the `requires_human_gate` check.
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

1. **AC-CE-1 (Spec-level coverage):** Every Executor spec (EXECUTOR_REGISTRY siblings) AND every dual-authority primary agent spec (Agent #21, Agent #26) contains the Cluster E §3.1 block in §7 Security Controls.

2. **AC-CE-2 (Ceiling lookup mandatory):** Implementation-level test (deferred) — for every Executor's `execute()` entry, stub `getCeiling()` to return `recommend_only`; assert Executor throws `CeilingViolationError` before any side-effect call.

3. **AC-CE-3 (Default-most-restrictive):** Unset ceiling cell defaults to `recommend_only`. Verify by spec assertion + canonical `getCeiling()` implementation.

4. **AC-CE-4 (Order of evaluation):** AutoRunner submission validation → `BaseAgent.guard()` charter check → `getCeiling()` runtime ceiling → human-gate → action. Verified by deliberate-failure injection at each layer.

5. **AC-CE-5 (Envelope schema):** `agent.ceiling.violation.v1` payload validates against §2.5 shape; topic registered in §14.1 canonical catalogue per Cluster D extension.

6. **AC-CE-6 (Admin-edit audit trail):** Every `ProductRegistry.authorityCeilings` edit is audit-logged in GovernanceAuditLog hash-chain per §14 + §14.2.

7. **AC-CE-7 (Authority-creep mitigation):** Per Batch 1 #03 mitigation — Executor's charter authority is BOUNDED by operator ceiling at runtime; charter is a maximum, not a guarantee.

---

## §5 — Affected Agents

Every Executor + dual-authority primary agent. Per §2 canonical resolution, ALL of the following require the §3.1 block in §7 Security Controls:

| Executor / Agent | Cluster E revision required |
|---|---|
| `self-renewal-executor` (CA-7 EXECUTOR_REGISTRY sibling for Agent #3) | YES — update SELF_RENEWAL_SPEC.md §7 (already partially covered) |
| `aggressive-crawl-conductor-executor` (CA-7 sibling for Agent #21) | YES — update AUTH_TRAVERSAL_SECURITY_SPEC ↔ Agent #21 spec |
| `design-executor` (Phase 2 sibling for Agent #7) | YES — once Phase 2 spec drafted |
| `monitor-ingestion-executor` (Phase 2 sibling for Agent #10) | YES — once Phase 2 spec drafted |
| `self-protection-executor` (Phase 2 sibling for Agent #13) | YES — once Phase 2 spec drafted |
| `cost-governor-executor` (Phase 2 sibling for Agent #23) | YES — once Phase 2 spec drafted |
| **Agent #21 ACE Conductor (primary, dual-authority per ENTRY 006)** | YES — primary agent at dual-authority layer |
| **Agent #26 Orchestra Research Agent (primary, dual-authority per CA-9-Q4=(b))** | YES — primary agent at dual-authority layer |

Non-Executor primary agents (recommend_only charter): NOT directly affected by ceiling-check pattern (they have no side-effect actions). BUT their recommendations are consumed by Executors, which DO enforce ceiling — so the consumer-side enforcement is canonical.

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

*End of CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md canonical template. Pending W6 Panel ratification.*
