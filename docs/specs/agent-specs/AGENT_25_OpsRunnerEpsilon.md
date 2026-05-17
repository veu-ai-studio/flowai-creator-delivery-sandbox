# Agent #25 — Ops Runner Epsilon — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification AND **BLOCKED on §27 OQ-2 step+role disposition**.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_25_OpsRunnerEpsilon.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 25, §27 OQ-2 (UNRESOLVED), §4 + §20.1 L4 Capability Transfer surface (Role A), Panel infrastructure (Role B), §22 ProductRegistry provisioning (Role C).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=25 (lines 366–375).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `25` |
| Name | `Ops Runner Epsilon` |
| Mode | `step-owner` (per `_registry.ts`) |
| Pipeline step owned | **TBD — BLOCKED on §27 OQ-2** |
| Build-authority | **recommend_only** (Phase 1). |
| Operational-authority | **autonomous** within scope (placeholder). |
| Current status | **DORMANT, step+role TBD** — reserved charter per `_registry.ts`. |
| Depends on | §27 OQ-2 disposition. Joint with #22 + #24 + #23. |

---

## §2 — What This Agent Does

**Pending step+role disposition.** W3-surfaced plausible roles for Panel consideration:

- **Plausible Role A — Capability Transfer Conductor**: owns the L4 Capability Transfer surface (§4 + §20.1) — packaging FlowAI capabilities (Self-Renewal, Self-Protection) into install sprints for target products. Today `/capability-transfer` exists but is operator-driven; #25 could automate the L4 workflow.
- **Plausible Role B — Panel Operations Conductor**: owns the 10-AI Panel scheduling, slot health, engagement monitoring, panel-composition rebalancing per `docs/panel-consultations/PANEL_COMPOSITION_REBALANCE_2026-05-14.md`. Today W6-orchestrated; #25 could automate slot-health checks.
- **Plausible Role C — Onboarding / Provisioning Conductor**: owns new-product onboarding workflow end-to-end (registers product in `ProductRegistry`, provisions ProductSSOT row, allocates Doppler vault paths per §22, runs first-time Aggressive Crawl, generates Capability Transfer install sprint).

The operator sees: nothing in Phase 1 until step+role disposed.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 373)

```
consumes: []
```

Per plausible role:

- Role A → `capability_transfer.request.v1`.
- Role B → `panel_decision_*` topics + slot-health pings.
- Role C → `provider.onboarding.request.v1`.

### §3.2 Input shape

TBD pending disposition.

### §3.3 Preconditions

- §27 OQ-2 disposition.
- Role A: Capability Transfer surface canonical.
- Role B: Panel infrastructure exposes slot-health metrics.
- Role C: ProductRegistry + Doppler write paths accessible.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 374)

```
produces: []
```

Per plausible role:

- Role A → `25.capability_package.generated.v1`, `25.capability_install.scheduled.v1`.
- Role B → `25.panel.composition_proposal.v1`, `25.panel.slot_health_alert.v1`.
- Role C → `25.product.provisioned.v1`.

### §4.2 Output shape

TBD pending disposition.

### §4.3 Postconditions

- Until disposed, agent reserved-charter; cannot ship.
- Escalation: any side-effect attempt → Agent #1.

---

## §5 — Pipeline Integration

### §5.1 Step owned

**TBD.** Role A could be step-owner at a new "capability-transfer" step OR cross-step. Role B is always-on (panel health continuous). Role C is event-triggered (onboarding requests).

### §5.2 Upstream feeders / Downstream consumers

Pending disposition.

### §5.3 Mode behavior

Per role.

---

## §6 — Implementation Plan

### §6.1 Files to create (new) — placeholder

- `src/lib/agents/agents/Agent25OpsRunnerEpsilon.js` — ~440 LOC.
- `src/lib/agents/agents/__tests__/Agent25OpsRunnerEpsilon.test.js` — ~280 LOC.

### §6.2 Files to modify (existing)

- `_registry.ts` lines 366–375 — update post-disposition.

### §6.3 Estimated effort

**~12–18 W-hours** Phase 1 (Role A — Capability Transfer — is heaviest given L4 surface coverage).

### §6.4 Key engineering risks

1. **§27 OQ-2 unresolved** — HARD BLOCKER.
2. **Role A scope expansion** — automating L4 Capability Transfer is significant; could become multi-phase effort.
3. **Role B requires Panel infra hooks** — `docs/panel-consultations/` is currently markdown-only; would need API surface.
4. **Role C provisioning authority** — needs `auto_write_internal` to write `ProductRegistry` + Doppler; would require Executor pattern per CA-7.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 371:

```
requiredCredentials: []
```

Pending role. Role C needs Doppler write access (significantly elevated).

### §7.2 Data exfiltration controls

Per chosen role:
- Role A: install-sprint content stays within FlowAI + target operator's infra.
- Role B: panel-decision metadata only; no model API exfil.
- Role C: provisioning data internal; Doppler writes scoped per-product.

### §7.3 Scope limiting

Per `_registry.ts` — `embedded` per-product.

### §7.4 Escalation policy (from `_registry.ts` line 374)

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
- Role A: ~18 W-hours; Capability Transfer automation (heaviest).
- Role B: ~12 W-hours; Panel operations.
- Role C: ~14 W-hours; Onboarding/provisioning.

### §8.3 What this agent CANNOT do — ever

- **Never executes side effects in reserved-charter state.**
- **Never engineered before §27 OQ-2 disposition.**
- **(Role C if disposed) — Never elevates beyond Supervised authority for ProductRegistry/Doppler writes.**

---

## §9 — Acceptance Criteria

Testable only post-disposition. Placeholder:

1. **AC-25.1** — Step + role canonical per `_registry.ts`.
2. **AC-25.2** — Test suite passing (sized to role).
3. **AC-25.3** — End-to-end workflow per chosen role demonstrated.
4. **AC-25.4** — Escalation-to-#1 for any side-effect attempt outside role scope.
5. **AC-25.5** — Role-specific invariants tested (capability-package integrity / panel-slot-health accuracy / provisioning idempotency).

---

## §10 — Panel Questions

### G25-Q1 — Role assignment for Ops Runner Epsilon

W3 surfaces three plausible roles. Disposition?

- (a) Plausible Role A — Capability Transfer Conductor (L4 surface; heaviest).
- (b) Plausible Role B — Panel Operations Conductor (panel infra automation).
- (c) Plausible Role C — Onboarding / Provisioning Conductor (new-product workflow).
- (d) None of the above.
- (e) INSUFFICIENT_INFORMATION.

### G25-Q2 — Joint disposition

Per §27 OQ-2 with #22 + #24 + #23.

- (a) Joint disposition — allocates 4 remaining slots coherently.
- (b) Per-agent disposition.
- (c) Pair disposition.
- (d) Sequential.
- (e) INSUFFICIENT_INFORMATION.

### G25-Q3 — Role A authority elevation

If Role A disposed, Capability Transfer automation likely needs `auto_write_internal` for install-sprint generation. Authority shape?

- (a) Recommend-only Phase 1; Executor Phase 2 with `[auto_write_internal, requires_human_gate]`.
- (b) Dual-authority charter day-one (per Agent #26 CA-9-Q4=(b) pattern).
- (c) Recommend-only forever; install sprints generated by operator workflow, not Agent #25.
- (d) Defer Role A to a future agent outside #25.
- (e) INSUFFICIENT_INFORMATION.

### G25-Q4 — Role B Panel API requirement

Role B requires API hooks into Panel infrastructure (currently markdown-only). Effort?

- (a) Build Panel API as Phase 1 prereq (~10 W-hours additional).
- (b) Role B ships in Phase 2 after Panel API canonical.
- (c) Role B reads panel-consultation markdown files only; no API hooks.
- (d) Reject Role B — Panel ops stays human-orchestrated.
- (e) INSUFFICIENT_INFORMATION.

### G25-Q5 — Role C Doppler write authority

If Role C disposed, Doppler writes for per-product vault paths require elevated credentials. Right authority?

- (a) Executor pattern per CA-7 with human-gate for first-time provisioning.
- (b) Always human-gated (no autonomous Doppler writes).
- (c) Per-product opt-in autonomous (operator pre-authorises).
- (d) Defer Role C provisioning to a manual operator workflow.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #25 Ops Runner Epsilon engineering spec. **BLOCKED on §27 OQ-2 disposition.***
