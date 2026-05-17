# Agent #22 — Ops Runner Beta — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification AND **BLOCKED on §27 OQ-2 step+role disposition**.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_22_OpsRunnerBeta.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 22, §27 OQ-2 (UNRESOLVED step binding), CA-11-B.10 ToolMenu (placeholder).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=22 (lines 336–345).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `22` |
| Name | `Ops Runner Beta` |
| Mode | `step-owner` (per `_registry.ts`) |
| Pipeline step owned | **TBD — BLOCKED on §27 OQ-2 CEO/Panel disposition** |
| Build-authority | **recommend_only** (Phase 1). Phase 2 Executor dependent on step disposition. |
| Operational-authority | **autonomous** within budget (placeholder pending role). |
| Current status | **DORMANT, step+role TBD** — reserved charter per `_registry.ts` lines 336–345; escalation policy reads: "Reserved Step-Owner charter — escalate to #1 on any side effect attempt." |
| Depends on | §27 OQ-2 disposition (BLOCKING). Joint disposition recommended with #24 + #25 + #23 to allocate the 4 remaining Ops Runner slots coherently. |

---

## §2 — What This Agent Does

**Pending step+role disposition.** This spec is structured as a placeholder that refines on §27 OQ-2 disposition. The spec is intentionally non-prescriptive for the role; W3 surfaces plausible role candidates for Panel consideration below.

**W3-surfaced plausible roles for Panel consideration:**

- **Plausible Role A — Workflow Orchestration Conductor**: owns cross-step orchestration logic. When Agent #6 emits `block` and Agent #3 needs to re-route, #22 mediates the routing decision. Cross-step mode would suit this role better than step-owner (cost: would need `_registry.ts` mode update).
- **Plausible Role B — External Integration Conductor**: owns 3rd-party integration management (Stripe Connect lifecycle, Zendesk webhook health, etc.) beyond Agent #4 Provider Onboarding's scope. Step-owner mode could fit.
- **Plausible Role C — Renewal Verification Conductor**: owns the "re-crawl after fix → confirm clean" verification loop per §6 (currently handled inline by Self-Renewal Executor). Could be cross-step.

The operator sees: nothing in Phase 1 until step+role disposed. The spec ratifies the placeholder; engineering dispatch follows §27 OQ-2 disposition.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 343)

```
consumes: []
```

Pending disposition. Per plausible role:

- Role A → step-completion + block topics from #6/#8/#3.
- Role B → `4.provider.onboarded.v1`.
- Role C → `3.renewal.applied.v1`.

### §3.2 Input shape

```ts
{
  invocationKind: 'TBD-pending-disposition',
  ...placeholder
}
```

### §3.3 Preconditions

- §27 OQ-2 disposition: step + role + consumes/produces canonicalised.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 344)

```
produces: []
```

Pending disposition. Per plausible role:

- Role A → `22.workflow.routing_decision.v1`.
- Role B → `22.integration.health.v1`.
- Role C → `22.renewal.verified.v1` + `22.renewal.regression_detected.v1`.

### §4.2 Output shape

TBD pending disposition.

### §4.3 Postconditions

- Until step+role canonical, agent remains reserved-charter; cannot ship.
- Escalation policy enforced: any side-effect attempt → escalate to Agent #1.

---

## §5 — Pipeline Integration

### §5.1 Step owned

**TBD.** Step binding canonical per §27 OQ-2 disposition.

### §5.2 Upstream feeders / Downstream consumers

Pending disposition.

### §5.3 Mode behavior

Mode-agnostic conceptually; concrete behavior depends on role.

---

## §6 — Implementation Plan

### §6.1 Files to create (new) — placeholder

- `src/lib/agents/agents/Agent22OpsRunnerBeta.js` — ~400 LOC (sized after role).
- `src/lib/agents/agents/__tests__/Agent22OpsRunnerBeta.test.js` — ~260 LOC.

### §6.2 Files to modify (existing)

- `src/lib/agents/_registry.ts` lines 336–345 — update mode/consumes/produces post-disposition.

### §6.3 Estimated effort

**~10–14 W-hours** Phase 1 (refines on role; Plausible Role A lighter, Role C heavier).

### §6.4 Key engineering risks

1. **§27 OQ-2 unresolved** — HARD BLOCKER. Cannot engineer until disposed.
2. **Joint disposition recommended** — W3 proposes Panel + CEO consultation on Ops Runner #22/#24/#25 step bindings collectively (similar to ENTRY 006's pinning of #21 + Layer 2 PG1 hint of #23 = Cost Governor).
3. **Charter ambiguity persists** — placeholder spec must not commit to a role without disposition.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 341:

```
requiredCredentials: []
```

(Reserved; refines on role.)

### §7.2 Data exfiltration controls

Per chosen role; same patterns as canonical agents (memory-only credentials, scrubbed envelopes).

### §7.3 Scope limiting

`embedded` per `_registry.ts`; per-product scope.

### §7.4 Escalation policy (from `_registry.ts` line 344)

```
escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.'
```

Concrete enforcement (current DORMANT state):

- Any side-effect attempt by Agent #22 before §27 OQ-2 disposition → escalate to Agent #1 Lifecycle.
- BaseAgent guard rejects emit attempts for this agent until role is canonical.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

**NONE — agent is reserved-charter DORMANT until §27 OQ-2 disposition.**

### §8.2 Post-disposition Phase 1 capabilities (placeholder)

Sized to plausible role:
- Role A: ~10 W-hours; workflow routing decisions
- Role B: ~12 W-hours; integration health monitoring
- Role C: ~14 W-hours; renewal verification loop

### §8.3 What this agent CANNOT do — ever

- **Never executes side effects in reserved-charter DORMANT state.** Escalation policy strict.
- **Never engineered before §27 OQ-2 disposition.** Blocker is hard.

---

## §9 — Acceptance Criteria

These criteria become testable only post-§27 OQ-2 disposition. Placeholder structure:

1. **AC-22.1** — Step + role canonical per `_registry.ts` post-disposition.
2. **AC-22.2** — Test suite passing (sized to chosen role).
3. **AC-22.3** — 7 consecutive clean runs (step-owner) OR scheduled-cadence invocations (cross-step).
4. **AC-22.4** — Escalation-to-#1 path tested for any side-effect attempt outside chosen role scope.
5. **AC-22.5** — `_registry.ts` charter shape matches canonical post-disposition.

---

## §10 — Panel Questions (PRIMARILY §27 OQ-2 DISPOSITION)

### G22-Q1 — Role assignment for Ops Runner Beta

W3 surfaces three plausible roles. Panel + CEO disposition:

- (a) Plausible Role A — Workflow Orchestration Conductor (cross-step; routing decisions when block-semantic fires).
- (b) Plausible Role B — External Integration Conductor (step-owner; 3rd-party integration health beyond Agent #4 scope).
- (c) Plausible Role C — Renewal Verification Conductor (cross-step; re-crawl-after-fix verification loop).
- (d) None of the above — Panel proposes alternate role.
- (e) INSUFFICIENT_INFORMATION.

### G22-Q2 — Mode reconciliation

`_registry.ts` declares `mode: 'step-owner'`. Plausible Roles A + C would be cross-step. Resolution?

- (a) Keep step-owner mode; disposition must pick a step-owner-fit role (excludes A + C).
- (b) Allow mode update to cross-step if disposition picks A or C.
- (c) Defer mode decision to disposition outcome.
- (d) Pick role A/B/C first; mode follows.
- (e) INSUFFICIENT_INFORMATION.

### G22-Q3 — Joint disposition with #24 + #25 + #23

Should #22 + #24 + #25 (Ops Runner Beta/Delta/Epsilon) be dispositioned together?

- (a) Joint disposition — allocates 4 remaining Ops Runner slots coherently.
- (b) Per-agent disposition — independent Panel consultation each.
- (c) Disposition in pairs (e.g. #22+#23, #24+#25).
- (d) Sequential disposition (#22 first, then #24 based on what #22 takes).
- (e) INSUFFICIENT_INFORMATION.

### G22-Q4 — Ship reserved-charter or wait?

Should `_registry.ts` retain reserved charter (current state) or remove until ready?

- (a) Retain reserved charter — preserves agent ID slot; canonical per §15.1.
- (b) Remove from `_registry.ts` — re-add when role canonical.
- (c) Mark as `mode: 'reserved'` with explicit invalid-state guard.
- (d) Move to a separate `RESERVED_REGISTRY` array until disposed.
- (e) INSUFFICIENT_INFORMATION.

### G22-Q5 — Escalation policy refinement

Current escalation policy is "escalate to #1 on any side effect attempt". Sufficient for reserved-charter DORMANT state?

- (a) Sufficient — `_registry.ts` declaration is load-bearing.
- (b) Add runtime guard — BaseAgent rejects emit attempts when `consumes/produces` is empty.
- (c) Add CI-level check — test asserts no production code paths reference Agent #22 until role canonical.
- (d) All three (defense in depth).
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #22 Ops Runner Beta engineering spec. **BLOCKED on §27 OQ-2 disposition.***
