# Cluster C — Mode-Conditional Behavior (Canonical Template, v2)

**Status:** DRAFT v2 — Panel conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `18ece2a`, 2026-05-16) → v2 (this commit, 2026-05-17 — Panel `PLURALITY_CLC-REVISE` 5/9 conditions R1–R3 applied per W3 Dispatch #10).
**Author:** W3.
**Anchor canonical:** CA-12 v3 §A.1 (3 canonical pipeline modes: 1, 2 SUB-2A, 3A); CA-12 v3 §A.2 (Build-authority + Operational-authority sub-dimensions); §A.0 GTM context preamble; §B.2 enforcement contract.
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 2 objection #12 + Batch 3 objections #03, #22, #31. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` (W6 Dispatch #16, commit `10b13f9`) — `PLURALITY_CLC-REVISE` 5/9.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — §5.4 Mode behavior block is **OPTIONAL for Pattern P1** (mode-agnostic) agents; MANDATORY only for Pattern P2 + P3. P1 agents may omit §5.4 entirely; if absent, P1 + Mode-1-default are assumed. §2.2 + §2.5 updated.
- **R2** — `pipelineMode` envelope field is mandatory ONLY when agent behavior differs across modes (Pattern P2 + P3) — NOT every envelope. Mode-agnostic envelopes (Pattern P1) MAY omit the field; downstream tracing for P1 envelopes uses `runId` lineage instead. §2.4 updated.
- **R3** — Explicit enforcement mechanism: hybrid **schema-validator** (CI gate at spec-merge time) + **runtime guard** (BaseAgent.emit boundary check). §2.5 expanded with concrete enforcement contract.

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

## §2 — Canonical Resolution (v2)

**Agent specs declare a §5.4 Mode behavior block when behavior differs across modes (Patterns P2 + P3).** Pattern P1 (mode-agnostic) agents MAY omit §5.4 entirely — they are assumed mode-agnostic + Mode-1-default. Per-pattern requirements are §2.3 below. Defaults to Mode 1 when pipeline mode is unspecified.

### §2.1 — The 3 canonical pipeline modes (per CA-12 v3 §A.1)

| Mode | Name | Purpose | Authority surface |
|---|---|---|---|
| **Mode 1** | Assess | Read-only assessment; produce score + findings; no source modification | Build-Authority recommend_only |
| **Mode 2 SUB-2A** | Build (assess + recommendations) | Mode 1 + recommend fixes consumable by Agent #3 Self-Renewal Executor | Build-Authority recommend_only OR supervised (per ceiling) |
| **Mode 3A** | Benchmark (operator-attested source path) | Same outputs as Mode 1/2 but against operator-attested source build path (e.g. fork-and-fix preview URL) | Build-Authority supervised (per ceiling) |

Note: Mode 2 SUB-2B (full-build-from-description) and Mode 3B (cross-product synthesis) are **DEFERRED** per CA-12 v3 — see `docs/specs/FUTURE_CAPABILITIES.md`. Cluster C does NOT address those modes.

### §2.2 — Canonical mode-behavior template (v2 — optional for P1)

Agent specs whose pattern is **P2 or P3** MUST contain the following block in §5 Pipeline Integration §5.4 (or equivalent location). Agent specs whose pattern is **P1** (mode-agnostic) MAY omit §5.4 entirely — their behavior is identical across all 3 modes and Mode-1-default is assumed.

```
### §5.4 — Mode behavior (canonical per CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md v2)

**Pattern declaration:** P1 / P2 / P3 (pick one; see Cluster C §2.3)

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

Agents that omit §5.4 are interpreted by the validator as `Pattern: P1, defaultMode: 1, behavior: identical-across-modes`. To make P1 status explicit (recommended for clarity but not mandatory per v2 R1), specs may include a one-line declaration:

```
### §5.4 — Mode behavior: Pattern P1 (mode-agnostic; canonical per Cluster C §2.3)
```

### §2.3 — Three permissible mode-relation patterns

Most agents fall into one of three patterns; agent specs MUST name which pattern applies:

**Pattern P1: Mode-agnostic emitter** — agent's output envelope is identical across all 3 modes; only downstream consumers behave differently. Most read-only analyzers fall here (Research, Quality Audit, GTM, Strategic Intelligence, Public Policy, Benchmarking, Portfolio Risk, etc).

**Pattern P2: Mode-aware recommendations** — Mode 1 output is identical to Pattern P1; Mode 2/3A output additionally populates `recommendations[]` with `autoFixable: true` flags consumed by Self-Renewal Executor. Quality Audit, GTM, Monitor are canonical Pattern P2.

**Pattern P3: Mode-restricted execution** — agent ONLY runs in certain modes; in other modes, agent is dormant. Phase 2 Executors (Self-Renewal Executor, Design Executor) fall here — they only activate in Mode 2 / Mode 3A.

### §2.4 — Mode propagation in MessageBus envelopes (v2 — conditional)

`pipelineMode` field is **MANDATORY only when agent behavior differs across modes** (Pattern P2 + P3). Pattern P1 envelopes MAY omit the field — downstream tracing relies on `runId` lineage instead (the per-run AutoRunner context already records the mode for the entire run, so re-emitting it on every P1 envelope is redundant).

**Pattern P2 + P3 envelope (mandatory `pipelineMode`):**
```ts
{
  ... existing payload ...,
  pipelineMode: 1 | 2 | '3A',         // canonical per CA-12 v3 §A.1; MANDATORY for P2 + P3
  pipelineModeSubVariant: '1A' | '1B' | '2A',   // optional; per §A.1 sub-variants
  at: ISO8601,
}
```

**Pattern P1 envelope (`pipelineMode` optional; omission canonical):**
```ts
{
  ... existing payload ...,
  // pipelineMode omitted — downstream consumers read mode from runId context
  at: ISO8601,
}
```

This unblocks downstream consumers for P2/P3 routing while removing a per-envelope field for the majority of agents (P1). Cost-signal envelopes (Cluster A) + data-quality envelopes (Cluster B) inherit P1 by default unless an agent's `<agent.cost.signal.v1>` emission needs per-mode routing (typically no).

Rationale (v2 R2): mandating `pipelineMode` on every P1 envelope created field bloat on ~80% of MessageBus traffic. Conditional emission scopes the field to where it changes behavior; downstream tracing for P1 envelopes uses `runId` → AutoRunner-context lookup (already canonical).

### §2.5 — Enforcement contract (v2 R3 — hybrid validator + runtime guard)

**Schema validator (CI gate at spec-merge time):**
A `cluster-c-validator.mjs` script (engineering dispatch) checks every agent spec at PR-merge time:
1. **Pattern declared:** spec contains `Pattern P1`, `Pattern P2`, or `Pattern P3` declaration in §5.4 (P1 may use the one-line form per §2.2).
2. **§5.4 block presence:** required for P2 + P3; optional for P1.
3. **Per-mode coverage:** P2 + P3 specs cover all 3 canonical modes (Mode 1, Mode 2 SUB-2A, Mode 3A) explicitly.
4. **Pattern-output consistency:** P2 spec must declare `recommendations[]` field appears in Mode 2/3A envelope; P3 spec must declare `WRONG_MODE_FOR_EXECUTOR` error path for Mode 1.

Validator failures emit CI errors:
- `MISSING_PATTERN_DECLARATION[<agentId>]` — no P1/P2/P3 declaration found.
- `MISSING_MODE_BEHAVIOR_BLOCK[<agentId>]` — P2/P3 spec missing §5.4 entirely.
- `INCOMPLETE_MODE_COVERAGE[<agentId>]` — P2/P3 spec lacks coverage for one of 3 modes.

**Runtime guard (BaseAgent emit boundary):**
`BaseAgent.emit(topic, payload)` checks at every emission:
1. If charter declares `Pattern: P2 | P3` → payload MUST contain `pipelineMode ∈ {1, 2, '3A'}`. Missing → throw `MissingPipelineModeError[<agentId>]`.
2. If charter declares `Pattern: P1` → `pipelineMode` is optional; if present, value MUST still be canonical. Invalid → throw `InvalidPipelineModeValue[<agentId>]`.
3. If charter declares `Pattern: P3` and agent is invoked under Mode 1 → throw `WRONG_MODE_FOR_EXECUTOR[<executorKey>]` synchronously per CA-7 §15.5.

Both layers run independently: schema validator catches spec-level non-conformance at PR time; runtime guard catches code-level non-conformance at emit time. Either failure blocks the offending agent from shipping.

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §5 Pipeline Integration of each affected agent spec (v2)

**For Pattern P1 (mode-agnostic) agents — minimal form (recommended):**

````markdown
### §5.4 — Mode behavior: Pattern P1 (mode-agnostic; canonical per Cluster C §2.3)

This agent's behavior is identical across Mode 1, Mode 2 SUB-2A, and Mode 3A.
`pipelineMode` field omitted from emitted envelopes per Cluster C §2.4 v2 R2.
Defaults to Mode 1 when pipeline mode is unspecified.
````

P1 agents MAY omit §5.4 entirely; the validator interprets absence as P1 + Mode-1-default.

**For Pattern P2 (mode-aware recommendations) + P3 (mode-restricted execution) agents — full form:**

````markdown
### §5.4 — Mode behavior (canonical per CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md v2)

**Pattern:** P2 / P3 (pick one; see Cluster C §2.3)

**In Mode 1 (Assess):**
This agent produces `<agent's output topic>` with payload per §4.2;
downstream consumers: <list>.
(For P3 Executors: `WRONG_MODE_FOR_EXECUTOR[<executorKey>]` thrown synchronously
on Mode 1 invocation per CA-7 §15.5.)

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
consumers route on these fields deterministically. Runtime guard per
Cluster C §2.5 v2 R3 throws `MissingPipelineModeError` on emission missing
the field.
````

### §3.2 — Block to paste into §4.2 envelope shape definitions (v2 — conditional)

For **Pattern P2 + P3** agents (mandatory):

````markdown
**Mode-propagation fields (canonical per Cluster C §2.4 v2):**
- `pipelineMode: 1 | 2 | '3A'` (mandatory for P2 + P3)
- `pipelineModeSubVariant: '1A' | '1B' | '2A'` (optional; only when sub-variant
  is operationally meaningful for downstream routing)
````

For **Pattern P1** agents (optional; omission canonical):

````markdown
**Mode-propagation fields:** none required per Cluster C §2.4 v2 R2 (Pattern P1
mode-agnostic). `runId` lineage to AutoRunner context provides mode-of-run
for downstream tracing.
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

## §4 — Acceptance Criteria (v2)

How W2 verifies the Cluster C fix is correctly implemented across agent specs.

1. **AC-CC-1 (v2 R1 — Pattern-aware spec coverage):** Every agent spec contains EITHER a §5.4 Mode behavior block OR an implicit-P1 absence (validator interprets absence as Pattern P1 + Mode-1-default). Pattern P2 + P3 specs MUST contain §5.4; P1 specs MAY omit. Schema validator (`cluster-c-validator.mjs`) enforces.

2. **AC-CC-2 (Pattern declared explicitly OR implicitly):** Every §5.4 block (when present) names ONE of P1 / P2 / P3. Absent §5.4 = implicit P1. Schema validator emits `MISSING_PATTERN_DECLARATION[<agentId>]` when §5.4 is present but pattern is unclear.

3. **AC-CC-3 (v2 R2 — `pipelineMode` conditional):** Pattern P2 + P3 envelopes MUST carry `pipelineMode` field with one of the 3 canonical values (1, 2, '3A'). Pattern P1 envelopes MAY omit the field; if present, value MUST still be canonical. Runtime guard throws `MissingPipelineModeError` (P2/P3 missing) or `InvalidPipelineModeValue` (any pattern, invalid value) at emit boundary.

4. **AC-CC-4 (Default-to-Mode-1):** When invocation context lacks `pipelineMode`, agent treats as Mode 1. Canary integration test.

5. **AC-CC-5 (Pattern-P2 recommendations gated):** Pattern P2 agents emit `recommendations[]` ONLY in Mode 2 / Mode 3A; Mode 1 envelopes have empty or absent `recommendations[]`. Verifies by parallel Mode-1 / Mode-2 invocation comparison.

6. **AC-CC-6 (Pattern-P3 dormancy):** Pattern P3 agents (Phase 2 Executors) do NOT emit envelopes in Mode 1; if invoked in Mode 1, they fast-fail with `WRONG_MODE_FOR_EXECUTOR[<executorKey>]` per CA-7 §15.5 + Cluster C extension.

7. **AC-CC-7 (Downstream-consumer routing determinism):** A given downstream agent consuming `pipelineMode: 1` envelope produces deterministically the same output as consuming the equivalent `pipelineMode: 2 SUB-2A` envelope with same upstream input (modulo the Pattern P2 `recommendations[]` addition).

8. **AC-CC-8 (v2 R3 — Hybrid enforcement):** Both layers active in production:
   - Schema validator runs at PR-merge time; rejects merges with non-conformant specs.
   - Runtime guard runs at `BaseAgent.emit()` boundary; rejects non-conformant emissions.
   Both layers tested independently — disabling either layer is non-conformant. CI invariant.

9. **AC-CC-9 (v2 R2 — P1 envelope omission canonical):** Pattern P1 agents emit envelopes WITHOUT `pipelineMode` field by default; downstream tracing for P1 envelopes uses `runId` lineage to AutoRunner context. Verified by per-pattern emission audit + downstream-consumer integration test.

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

*End of CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md canonical template v2. Panel `PLURALITY_CLC-REVISE` 5/9 conditions R1–R3 applied. Pending W6 re-ratification.*
