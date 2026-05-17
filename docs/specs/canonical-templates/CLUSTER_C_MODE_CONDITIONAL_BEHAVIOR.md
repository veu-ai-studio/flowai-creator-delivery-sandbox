# Cluster C — Mode-Conditional Behavior (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** CA-12 v3 §A.1 (3 canonical pipeline modes: 1, 2 SUB-2A, 3A); CA-12 v3 §A.2 (Build-authority + Operational-authority sub-dimensions); §A.0 GTM context preamble; §B.2 enforcement contract.
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 2 objection #12 + Batch 3 objections #03, #22, #31.

---

## §1 — Problem Statement

The 18-agent consolidated Panel surfaced **mode-conditional behavior under-specification** across multiple agents: spec drafts reference CA-12 v3 modes (1 / 2 SUB-2A / 3A) but rarely specify exactly how an agent's output differs per mode.

### Verbatim Panel quotes

**Batch 2 objection #12 (Slot 4):**
> The mode classification for Agent #17 is inconsistent between the registry and the blueprint. This inconsistency could lead to operational confusion and errors.

**Batch 3 objection #22 (Slot 7):**
> §G23-Q2 proposes changing Agent #23 to cross-step mode while the registry declares step-owner. This violates §15.2 OrchestratorHub's routing invariants and risks step-owner collisions. The validator lacks mode-change safeguards, potentially breaking AutoRunner's step ownership resolution.

**Batch 3 objection #31 (Slot 10):**
> Mode declaration conflict — G17-Q1 shows _registry.ts declares cross-step for Agent #17 while blueprint claims always-on; this directly contradicts Locked Rule 2 roster partition and §15.1 canonical table that fixes mode per agent ID without reconciliation mechanism.

### Disambiguation: "mode" means two different things

Panel objections conflated two orthogonal "mode" concepts. The dispatch's Cluster C focuses on the **pipeline mode** (CA-12 v3 §A.1):

| Mode concept | Source | Values | Affects |
|---|---|---|---|
| **Agent-execution mode** | `_registry.ts` `mode` field | `step-owner` / `cross-step` / `always-on` | When the agent runs (per-step, opportunistic, continuous) |
| **Pipeline mode** (Cluster C scope) | CA-12 v3 §A.1 | `Mode 1` (Assess) / `Mode 2 SUB-2A` (Build) / `Mode 3A` (Benchmark) | What the agent's output produces / what authority is needed |

Mode-classification drift (the first concept) is a per-agent reconciliation issue addressed in each agent spec. Cluster C addresses the second concept: **how does an agent's behavior differ across CA-12 v3 Mode 1 vs Mode 2 vs Mode 3A?**

### Affected scope

Every agent that produces output consumed differently by Self-Renewal Executor / Code Builder / Benchmarking. Without canonical mode-behavior specification, downstream consumers cannot predict what the agent will do in a given pipeline mode → operator-facing UX inconsistency.

### Why this blocks engineering dispatch

Per CA-12 v3 §B.2 enforcement contract, AutoRunner submission validation runs per-pipeline-mode rules. If an agent's behavior is mode-undefined, the validator can pass a submission that the agent then handles inconsistently per mode → user-visible surprise (e.g. Mode 1 "assessment" returns a build artifact reference, confusing the operator).

---

## §2 — Canonical Resolution

**Every agent spec MUST declare a §5.4 Mode behavior block** with the canonical 3-mode template below. Defaults to Mode 1 when pipeline mode is unspecified.

### §2.1 — The 3 canonical pipeline modes (per CA-12 v3 §A.1)

| Mode | Name | Purpose | Authority surface |
|---|---|---|---|
| **Mode 1** | Assess | Read-only assessment; produce score + findings; no source modification | Build-Authority recommend_only |
| **Mode 2 SUB-2A** | Build (assess + recommendations) | Mode 1 + recommend fixes consumable by Agent #3 Self-Renewal Executor | Build-Authority recommend_only OR supervised (per ceiling) |
| **Mode 3A** | Benchmark (operator-attested source path) | Same outputs as Mode 1/2 but against operator-attested source build path (e.g. fork-and-fix preview URL) | Build-Authority supervised (per ceiling) |

Note: Mode 2 SUB-2B (full-build-from-description) and Mode 3B (cross-product synthesis) are **DEFERRED** per CA-12 v3 — see `docs/specs/FUTURE_CAPABILITIES.md`. Cluster C does NOT address those modes.

### §2.2 — Canonical mode-behavior template

Every agent spec MUST contain the following block in §5 Pipeline Integration §5.4 (or equivalent location):

```
### §5.4 — Mode behavior (canonical per CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md)

In Mode 1 (Assess):
  [exactly what this agent produces — output topic + payload-shape summary]

In Mode 2 SUB-2A (Build — assess + recommendations):
  [exactly what this agent produces — typically same envelope as Mode 1
   with `recommendations[]` array populated for Self-Renewal Executor]

In Mode 3A (Benchmark — operator-attested source path):
  [exactly what this agent produces — typically same envelope as Mode 1
   but against the preview URL produced by Self-Renewal Executor]

If pipeline mode is not specified, default to Mode 1.
```

### §2.3 — Three permissible mode-relation patterns

Most agents fall into one of three patterns; agent specs MUST name which pattern applies:

**Pattern P1: Mode-agnostic emitter** — agent's output envelope is identical across all 3 modes; only downstream consumers behave differently. Most read-only analyzers fall here (Research, Quality Audit, GTM, Strategic Intelligence, Public Policy, Benchmarking, Portfolio Risk, etc).

**Pattern P2: Mode-aware recommendations** — Mode 1 output is identical to Pattern P1; Mode 2/3A output additionally populates `recommendations[]` with `autoFixable: true` flags consumed by Self-Renewal Executor. Quality Audit, GTM, Monitor are canonical Pattern P2.

**Pattern P3: Mode-restricted execution** — agent ONLY runs in certain modes; in other modes, agent is dormant. Phase 2 Executors (Self-Renewal Executor, Design Executor) fall here — they only activate in Mode 2 / Mode 3A.

### §2.4 — Mode propagation in MessageBus envelopes

Every envelope a mode-aware agent emits MUST carry a `pipelineMode` field:

```ts
{
  ... existing payload ...,
  pipelineMode: 1 | 2 | '3A',         // canonical per CA-12 v3 §A.1
  pipelineModeSubVariant: '1A' | '1B' | '2A',   // optional; per §A.1 sub-variants
  at: ISO8601,
}
```

This unblocks downstream consumers — they can route on `pipelineMode` deterministically. Mode-agnostic agents (Pattern P1) still emit `pipelineMode` for downstream tracing; they just produce identical payload otherwise.

### §2.5 — Validator integration

CA-12 v3 §B.2 enforcement contract is extended: AutoRunner submission validation checks every emitting agent's spec for §5.4 Mode behavior block presence. Specs without §5.4 → CI fails with `MISSING_MODE_BEHAVIOR_BLOCK[<agentId>]`.

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §5 Pipeline Integration of each affected agent spec

````markdown
### §5.4 — Mode behavior (canonical per CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md)

**Pattern:** P1 / P2 / P3 (pick one; see Cluster C §2.3)

**In Mode 1 (Assess):**
This agent produces `<agent's output topic>` with payload per §4.2;
downstream consumers: <list>.

**In Mode 2 SUB-2A (Build — assess + recommendations):**
Same envelope as Mode 1 + `recommendations[]` array with `autoFixable: true`
flags consumed by Agent #3 Self-Renewal Executor.

**In Mode 3A (Benchmark — operator-attested source path):**
Same envelope as Mode 1 but evaluated against the preview URL produced
by Self-Renewal Executor (not the operator's prd surface).

**Default:** if `pipelineMode` is not specified in the invocation context,
this agent defaults to Mode 1.

**Mode propagation:** every emitted envelope carries `pipelineMode: <value>`
+ optional `pipelineModeSubVariant: <value>` per Cluster C §2.4. Downstream
consumers route on these fields deterministically.
````

### §3.2 — Block to paste into §4.2 envelope shape definitions

````markdown
**Mode-propagation fields (canonical per Cluster C §2.4):**
- `pipelineMode: 1 | 2 | '3A'` (mandatory)
- `pipelineModeSubVariant: '1A' | '1B' | '2A'` (optional; only when sub-variant
  is operationally meaningful for downstream routing)
````

### §3.3 — Block to paste into §9 Acceptance Criteria

````markdown
- **AC-MC-N** — Given same upstream input under Mode 1 vs Mode 2 SUB-2A:
  this agent's envelopes differ exactly per §5.4 pattern declaration
  (Pattern P1 / P2 / P3). Verify by parallel-invocation integration test.
- **AC-MC-N+1** — Every emitted envelope carries `pipelineMode` field with
  one of the 3 canonical values. Agent emit boundary rejects envelopes
  missing `pipelineMode`.
- **AC-MC-N+2** — When invocation context omits `pipelineMode`, agent
  defaults to Mode 1 (verified by canary integration test).
````

---

## §4 — Acceptance Criteria

How W2 verifies the Cluster C fix is correctly implemented across agent specs.

1. **AC-CC-1 (Spec-level coverage):** Every affected agent spec contains §5.4 Mode behavior block. Specs without it fail CI per `MISSING_MODE_BEHAVIOR_BLOCK[<agentId>]`.

2. **AC-CC-2 (Pattern declared):** Every §5.4 block names ONE of P1 / P2 / P3 (mode-agnostic / mode-aware recommendations / mode-restricted execution). Specs that omit pattern declaration are non-conformant.

3. **AC-CC-3 (`pipelineMode` mandatory):** Every emitted envelope carries `pipelineMode` field with one of the 3 canonical values (1, 2, '3A'). Schema validation rejects emissions missing this field.

4. **AC-CC-4 (Default-to-Mode-1):** When invocation context lacks `pipelineMode`, agent treats as Mode 1. Canary integration test.

5. **AC-CC-5 (Pattern-P2 recommendations gated):** Pattern P2 agents emit `recommendations[]` ONLY in Mode 2 / Mode 3A; Mode 1 envelopes have empty or absent `recommendations[]`. Verifies by parallel Mode-1 / Mode-2 invocation comparison.

6. **AC-CC-6 (Pattern-P3 dormancy):** Pattern P3 agents (Phase 2 Executors) do NOT emit envelopes in Mode 1; if invoked in Mode 1, they fast-fail with `WRONG_MODE_FOR_EXECUTOR[<executorKey>]` per CA-7 §15.5 + Cluster C extension.

7. **AC-CC-7 (Downstream-consumer routing determinism):** A given downstream agent consuming `pipelineMode: 1` envelope produces deterministically the same output as consuming the equivalent `pipelineMode: 2 SUB-2A` envelope with same upstream input (modulo the Pattern P2 `recommendations[]` addition).

---

## §5 — Affected Agents

| Agent | Pattern | Cluster C revision required |
|---:|---|---|
| #6 Research | P1 (mode-agnostic) | YES — add §5.4 block |
| #7 Design Phase 1 | P1; Phase 2 Executor → P3 (Mode 2/3A only) | YES — add §5.4 block for both phases |
| #8 Quality Audit | P2 (mode-aware recommendations) | YES — explicit `recommendations[]` Mode-2 only |
| #9 Go-to-Market | P2 | YES |
| #10 Monitor Phase 1 | P1; Phase 2 Executor → P3 | YES |
| #11 Strategic Intelligence | P1 | YES |
| #12 Portfolio Risk | P1 | YES |
| #13 Self-Protection Phase 1 | P1; Phase 2 Executor → P3 | YES |
| #14 Public Policy | P1 | YES |
| #15 Benchmarking | P1 | YES |
| #16 Productivity / HR | P1 | YES |
| #17 Product Evolution | P1 | YES |
| #18 Business Planning | P1 | YES |
| #19 Technological Evolution | P1 | YES |
| #20 Environmental Impacts | P1 | YES |
| #22/#24/#25 Ops Runners (BLOCKED §27 OQ-2) | TBD per role | YES once role disposed |
| #23 Ops Runner Gamma (Cost Governor) | P1 (cost monitoring is mode-agnostic) | YES |
| #26 Orchestra Research Agent | P1 (Orchestra composition mode-agnostic) | YES |
| Self-Renewal Executor (CA-7 sibling) | P3 (Mode 2/3A only) | YES — update SELF_RENEWAL_SPEC.md §5 |
| Design Executor (Phase 2; CA-7 sibling) | P3 | YES once Phase 2 spec drafted |

**Total agents unblocked by this template: 20** (all dormant agents + Self-Renewal Executor + Design Executor Phase 2).

---

## §6 — Cross-cluster integration notes

- **Cluster A** (Cost Governor): cost-signal envelopes also carry `pipelineMode` for cost-attribution analytics by pipeline mode.
- **Cluster B** (Data Quality Gate): data-quality envelopes carry `pipelineMode` so operators can tune thresholds per mode.
- **Cluster D** (Audit-Log Topic Schema): `pipelineMode` is a canonical cross-cutting field added to §14.1 schema per Cluster D extension.
- **Cluster E** (Authority-Ceiling Integration): pipeline mode is THE primary axis of authority-ceiling lookup per CA-12 v3 §A.2.4 (`authorityCeilings[mode_<n>]`). Cluster C provides the `pipelineMode` value Cluster E reads.

---

## §7 — Mode-classification drift note (orthogonal issue)

Panel objections #12/#22/#31 surfaced a SEPARATE issue: agent-execution mode (`step-owner` / `cross-step` / `always-on`) drift between `_registry.ts` and agent blueprints (Agent #17 cross-step vs always-on; Agent #23 step-owner vs cross-step).

This is NOT Cluster C scope. It is per-agent reconciliation handled at engineering dispatch when each agent's `_registry.ts` row is finalised. See G17-Q1 + G23-Q2 in the respective agent specs; resolution is a single-row `_registry.ts` edit per agent.

Cluster C only addresses pipeline-mode (Mode 1 / 2 / 3A) behavior specification.

---

*End of CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md canonical template. Pending W6 Panel ratification.*
