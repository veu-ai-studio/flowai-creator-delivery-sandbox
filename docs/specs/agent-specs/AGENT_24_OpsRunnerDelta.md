# Agent #24 — Ops Runner Delta — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification AND **BLOCKED on §27 OQ-2 step+role disposition**.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_24_OpsRunnerDelta.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 24, §27 OQ-2 (UNRESOLVED), §14 GovernanceAuditLog hash-chain (if Role A), §13 RLS (if Role B), §14.3 cold retention (if Role C).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=24 (lines 356–365).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `24` |
| Name | `Ops Runner Delta` |
| Mode | `step-owner` (per `_registry.ts`) |
| Pipeline step owned | **TBD — BLOCKED on §27 OQ-2** |
| Build-authority | **recommend_only** (Phase 1). |
| Operational-authority | **autonomous** within scope (placeholder). |
| Current status | **DORMANT, step+role TBD** — reserved charter per `_registry.ts`. |
| Depends on | §27 OQ-2 disposition. Joint with #22 + #25 + #23. |

---

## §2 — What This Agent Does

**Pending step+role disposition.** W3-surfaced plausible roles for Panel consideration:

- **Plausible Role A — Audit Trail Integrity Conductor**: owns GovernanceAuditLog hash-chain integrity verification per §14.2 (continuous re-hash verification; detects broken chain segments; surfaces tamper alerts).
- **Plausible Role B — Multi-tenant Isolation Conductor**: owns RLS policy validation across all tenant-scoped tables; cross-tenant access attempts surface as security alerts.
- **Plausible Role C — Backup + Disaster Recovery Conductor**: owns ProductSSOT cold-snapshot integrity per §14.3 (7-year cold retention), restore-rehearsal scheduling, recovery-time-objective tracking.

The operator sees: nothing in Phase 1 until step+role disposed.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 363)

```
consumes: []
```

Per plausible role:

- Role A → audit-log row events.
- Role B → RLS denial events.
- Role C → snapshot completion events.

### §3.2 Input shape

TBD pending disposition.

### §3.3 Preconditions

- §27 OQ-2 disposition.
- Role A: GovernanceAuditLog reachable + canonical per §14.
- Role B: RLS policy table accessible.
- Role C: Cold-snapshot store accessible.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 364)

```
produces: []
```

Per plausible role:

- Role A → `24.audit_chain.verified.v1`, `24.audit_chain.broken.v1`.
- Role B → `24.tenant_isolation.alert.v1`.
- Role C → `24.backup.health.v1`, `24.restore_rehearsal.completed.v1`.

### §4.2 Output shape

TBD pending disposition.

### §4.3 Postconditions

- Until disposed, agent reserved-charter; cannot ship.
- Escalation: any side-effect attempt → Agent #1.

---

## §5 — Pipeline Integration

### §5.1 Step owned

**TBD.** Plausible Role A could be cross-step (continuous verification); Role B always-on; Role C scheduled (e.g. weekly restore rehearsal).

### §5.2 Upstream feeders / Downstream consumers

Pending disposition.

### §5.3 Mode behavior

Per role; security-critical roles (A + B) should be always-on or near-continuous.

---

## §6 — Implementation Plan

### §6.1 Files to create (new) — placeholder

- `src/lib/agents/agents/Agent24OpsRunnerDelta.js` — ~400 LOC (sized after role).
- `src/lib/agents/agents/__tests__/Agent24OpsRunnerDelta.test.js` — ~260 LOC.

### §6.2 Files to modify (existing)

- `_registry.ts` lines 356–365 — update post-disposition.

### §6.3 Estimated effort

**~10–16 W-hours** Phase 1 (Role C — Backup/DR — is heaviest).

### §6.4 Key engineering risks

1. **§27 OQ-2 unresolved** — HARD BLOCKER.
2. **Security-critical roles (A + B)** need additional security review beyond W6 Panel.
3. **Role C 7-year cold retention** has data-storage cost implications.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 361:

```
requiredCredentials: []
```

Pending role. Roles A + B likely need elevated audit-log read access; Role C needs cold-store read/write.

### §7.2 Data exfiltration controls

Per chosen role:
- Role A: audit-log content stays internal.
- Role B: RLS denial events PII-scrubbed before persist.
- Role C: cold-snapshot integrity hashes only; never copies snapshot content.

### §7.3 Scope limiting

Per `_registry.ts` — `embedded` per-product scope.

### §7.4 Escalation policy (from `_registry.ts` line 364)

```
escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.'
```

Reserved-charter DORMANT enforcement (current state).

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

**NONE — agent is reserved-charter DORMANT until §27 OQ-2 disposition.**

### §8.2 Post-disposition Phase 1 capabilities (placeholder)

Sized to role:
- Role A: ~10 W-hours; audit-chain verification.
- Role B: ~12 W-hours; RLS validation.
- Role C: ~16 W-hours; backup + DR (heaviest).

### §8.3 What this agent CANNOT do — ever

- **Never executes side effects in reserved-charter state.**
- **Never engineered before §27 OQ-2 disposition.**
- **(Role A/B/C respectively) — Never tampers with audit-log; never crosses tenant boundary; never deletes backups.**

---

## §9 — Acceptance Criteria

Testable only post-disposition. Placeholder:

1. **AC-24.1** — Step + role canonical per `_registry.ts`.
2. **AC-24.2** — Test suite passing (sized to role).
3. **AC-24.3** — Cadence invocations producing non-empty signals.
4. **AC-24.4** — Escalation-to-#1 for any side-effect attempt outside role scope.
5. **AC-24.5** — Role-specific security invariants tested (audit-chain integrity / RLS isolation / cold-store integrity).

---

## §10 — Panel Questions

### G24-Q1 — Role assignment for Ops Runner Delta

W3 surfaces three plausible roles. Disposition?

- (a) Plausible Role A — Audit Trail Integrity Conductor (§14.2 hash-chain verification).
- (b) Plausible Role B — Multi-tenant Isolation Conductor (RLS validation).
- (c) Plausible Role C — Backup + DR Conductor (§14.3 cold-snapshot).
- (d) None of the above — Panel proposes alternate role.
- (e) INSUFFICIENT_INFORMATION.

### G24-Q2 — Mode reconciliation

`_registry.ts` declares step-owner. Plausible Roles A + B likely always-on; Role C scheduled. Resolution?

- (a) Keep step-owner; pick a step-owner-fit role only.
- (b) Allow mode update post-disposition.
- (c) Hybrid — step-owner at monitor + always-on probe.
- (d) Defer mode decision to disposition outcome.
- (e) INSUFFICIENT_INFORMATION.

### G24-Q3 — Joint disposition with #22 + #25 + #23

Per §27 OQ-2.

- (a) Joint disposition — allocates 4 remaining Ops Runner slots coherently.
- (b) Per-agent disposition.
- (c) Pair disposition (e.g. #24+#25 for security-adjacent roles).
- (d) Sequential after #23 Cost Governor confirms.
- (e) INSUFFICIENT_INFORMATION.

### G24-Q4 — Security-critical role review requirement

If Role A or B disposed (security-critical), is additional W6 security review needed beyond standard Panel?

- (a) Standard Panel sufficient.
- (b) Security-experts-only sub-Panel for security-critical roles.
- (c) Both Panel + external security audit (e.g. penetration test).
- (d) Defer security-critical roles to a future canonical agent outside #24.
- (e) INSUFFICIENT_INFORMATION.

### G24-Q5 — Role C 7-year cold retention cost

If Role C disposed, 7-year retention has cost implications. Tiered storage?

- (a) Hot 365d + cold 7y as canonical per §14.3; accept cost.
- (b) Tiered cold (1y warm cold, 6y cold-cold) with retrieval-time tradeoff.
- (c) Compress + deduplicate aggressively for cost reduction.
- (d) Operator-configurable retention (some operators don't need 7y).
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #24 Ops Runner Delta engineering spec. **BLOCKED on §27 OQ-2 disposition.***
