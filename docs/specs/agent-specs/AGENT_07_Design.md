# Agent #7 — Design — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_07_Design.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 7, §9 step 2 (design), CA-11-B.3 ToolMenu, CA-7 §15.5 EXECUTOR_REGISTRY (for Phase 2).
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=7 (lines 146–155).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `7` |
| Name | `Design` |
| Mode | `step-owner` |
| Pipeline step owned | **Step 2 — `design`** |
| Build-authority (CA-12 v3 §A.2) | **recommend_only** (Phase 1); **supervised** (Phase 2 Executor with `[auto_write_internal, requires_human_gate]`). |
| Operational-authority (CA-12 v3 §A.2) | **autonomous** for ToolMenu dispatch (Phase 1 Anthropic API; Phase 2 v0/Lovable/Bolt.new dispatch). |
| Current status | **DORMANT** — charter ratified; AutoRunner step 2 currently invokes a placeholder LLM. |
| Depends on (build order) | Agent #6 Research SHIPPED-GREEN (consumes `6.research.brief.v1`); v0 adapter at Probation lifecycle status per Orchestra §8.1 for Phase 2. |

---

## §2 — What This Agent Does

Plain English: Design takes the research brief (what the product does, who uses it, what features matter) and produces a structured **design specification** — visual choices (color palette, typography, layout), UX flows, responsive breakpoints, and core feature copy. The spec is what Agent #2 Code Builder reads to actually generate the UI; in Phase 2, a Design Executor will instead dispatch to v0/Lovable/Bolt.new to generate the UI files directly and write them back to ProductSSOT.

Specifically: Agent #7 consumes `6.research.brief.v1` (5-Layer findings, market context, detected features), runs a structured "design analyze" Claude prompt to produce a normalized design spec envelope, and emits `7.design.spec.v1`. In Phase 2, the Executor dispatches `design` to v0 (or fallback) to actually generate the UI files; generated files write to ProductSSOT `architecture_snapshot.pages[]` per CA-10-B; this is the canonical fork-and-fix design path.

The operator sees: a design preview card in the assessment UI (palette swatch, type sample, responsive breakpoint preview), plus a list of recommended UX patterns. In Phase 2, the operator additionally sees the generated UI files as a Vercel preview URL (mirrors `SELF_RENEWAL_SPEC.md` PR-and-preview pattern).

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 152)

```
consumes: ['6.research.brief.v1']
```

Plus by convention:

- `1.product.lifecycle_event.v1` — stage transitions for design re-runs on stage advance.
- `10.ssot.updated.v1` (Phase 2 symbiotic loop) — when ProductSSOT `architecture_snapshot` drifts, Design re-runs to align spec to current state.

### §3.2 Input shape

```ts
{
  runId, productId, productScope, environment,
  researchBrief: {
    layers, marketContext, competitiveSet,
    detectedFeatures, productConcept, ...
  },
  existingArchitecture?: {                    // from ProductSSOT
    pages: Array<{ url, route, components }>,
    designSystem?: { palette, typography, layout },
  },
}
```

### §3.3 Preconditions

- `6.research.brief.v1` exists for this `runId` with `outcome: 'ok'` (Research did not block).
- ToolMenu adapter `anthropic-api` configured (Phase 1).
- Phase 2: v0 adapter at Probation lifecycle status (per Orchestra §8.1) AND operator's Build-authority ceiling permits Supervised (per CA-12 v3 §A.2.4).

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 153)

```
produces: ['7.design.spec.v1']
```

Phase 2 adds:

- `7.design.generated.v1` (Executor) — `{ runId, productId, files: [...], deploymentId, previewUrl, at }`.

### §4.2 Output shape — `7.design.spec.v1`

```ts
{
  runId: string,
  productId: string,
  spec: {
    productName: string,                       // ≤80 chars
    productConcept: string,                    // 1-sentence
    targetUsers: string[],                     // 1–5 persona labels
    coreClaims: string[],                      // 0–7 value-proposition claims
    detectedFeatures: string[],                // from research, refined
    designSystem: {
      palette: { primary, secondary, accent, neutral, semantic: { success, warning, error } },
      typography: { fontStack, sizeScale: { xs, sm, base, lg, xl, '2xl', '3xl' }, lineHeight },
      layout: { containerMaxWidth, gridColumns, spacingScale },
    },
    responsiveBreakpoints: { mobile, tablet, desktop, wide },
    accessibility: { wcagTarget: 'AA' | 'AAA', highContrastSupport, reducedMotion },
  },
  confidence: 0-1,
  lowConfidence: boolean,                       // true when research was partial-content
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row written.
- HotStore key `design:run:${runId}` TTL 24h.
- `7.design.spec.v1` emitted exactly once per `runId`.
- Downstream consumers (Agent #2 Code Builder, Agent #8 Quality Audit UI/UX dim) can read from MessageBus OR HotStore.
- Phase 2: `7.design.generated.v1` envelope additionally references the v0/Lovable deployment with `previewUrl`; ProductSSOT `architecture_snapshot.pages[]` updated per CA-10-B.

---

## §5 — Pipeline Integration

### §5.1 Step owned

Step 2 — `design`. Wired via `OrchestratorHub.registerStepOwner('design', ctx => agent7.recommend(ctx))`.

### §5.2 Upstream feeders

- **Agent #6 Research** — produces `6.research.brief.v1` (hard precondition).
- **Agent #1 Lifecycle** — `1.product.lifecycle_event.v1` for stage transitions.

### §5.3 Downstream consumers

- **Agent #2 Code Builder** (`consumes: ['7.design.spec.v1', '3.renewal.candidate.v1']`) — primary consumer.
- **Agent #8 Quality Audit** (`consumes: ['2.build.completed.v1', '7.design.spec.v1']`) — UI/UX dim scorer reads design spec.
- **Agent #15 Benchmarking** (`consumes: ['7.design.spec.v1']`) — compares operator design choices against named peer sets.

### §5.4 Mode behavior (per CA-12 v3 §A.2)

| Mode | Agent #7 behavior |
|---|---|
| **Mode 1** | Phase 1 recommend_only: emit design spec; no actual UI generated. |
| **Mode 2 SUB-2A** | Phase 1: same as Mode 1. Phase 2: Design Executor dispatches v0 to generate UI files; preview deploy; written to operator-owned source via Self-Renewal Executor PR-and-preview pattern. |
| **Mode 3A** | Phase 1: same as Mode 1 (spec only). Phase 2: when source is operator-attested, Design Executor may regenerate UI sections per operator confirmation. |

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
This agent emits `agent.cost.signal.v1` before each LLM call (Phase 1 design
spec generation; Phase 2 v0/Lovable/Bolt.new generation dispatches). It does
NOT self-enforce budget caps. Agent #23 is the sole canonical enforcement
owner. Call order per Cluster A §2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_7_design.pageCountMin`
OR per-agent default: `pageCountMin: 1` (clamped to [1, 50]).
- Mode 1 + Mode 2 SUB-2A: missing research brief → emit
  `agent.data_quality.insufficient.v1` and halt; populate provenance with
  `upstream-block` reason referencing Agent #6 Research.
- Mode 3A (per Cluster B §2.7 v2 R1): if `dataQualityScore ≥ 0.3`, may emit
  `7.design.spec.v1` with `outputQuality: 'degraded'`; below 0.3 → halt.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `hard-halt-on-any` (Agent
#6 Research brief is hard precondition).

**Cluster C — Mode behavior:** Phase 1 agent output is identical across all
pipeline modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted
from emitted envelopes per Cluster C §2.4 v2 R2. Phase 2 Executor (separate
EXECUTOR_REGISTRY sibling, not this primary spec) is Pattern P3 (active only
in Mode 2 SUB-2A / Mode 3A). Default behavior on missing `pipelineMode` is
Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits `7.design.spec.v1` (Phase 1) + `7.design.generated.v1`
(Phase 2 via Executor sibling). Cross-cluster topics ship in P0 patch.
Agent #7's emit topics ship in Deferred set with first runtime commit per
phase. Topic names comply with Cluster D §2.2 regex.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `budget-flex` per Cluster F §2.1.2.
Phase 1 LLM dispatches (design spec generation) use canonical tier-keyed
selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Phase 2 non-LLM adapters (v0 / Lovable / Bolt.new) are routed via
`dispatchWithFallback` (CA-11-A.4) per agent ToolMenu CA-11-B.3 — not
through Cluster F tier-keyed selection (these are not LLMs).

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent7Design.js` — ~480 LOC Phase 1.
- `src/lib/agents/agents/__tests__/Agent7Design.test.js` — ~340 LOC.
- `src/lib/agents/agents/prompts/designSpecPrompt.js` — deterministic Claude prompt template.

Phase 2 (deferred until v0 Probation):

- `src/lib/agents/agents/Agent7DesignExecutor.js` — ~440 LOC mirroring `Agent3SelfRenewalExecutor`.
- New `EXECUTOR_REGISTRY` entry in `_registry.ts` keyed `design-executor`, `agentId: 7`, `authority: ['auto_write_internal', 'requires_human_gate']`.

### §6.2 Files to modify (existing)

- `src/pages/AutoRunner.jsx` — wire step-2 to Agent #7.
- `src/lib/agents/_registry.ts` — Phase 2 only: add `design-executor` `EXECUTOR_REGISTRY` entry.

### §6.3 Estimated effort

**~10 W-hours Phase 1**; **+12 W-hours Phase 2 Executor** (after v0 Probation).

### §6.4 Key engineering risks

1. **Design subjectivity** — there is no "right" palette. LLM output for the same brief drifts run-to-run. Mitigation: pin Claude model; record `modelId + promptVersion` in envelope for reproducibility.
2. **Prompt injection via research brief** — research's `marketContext` may contain adversary content. Same mitigation as Agent #6 (deterministic prefix, system-quoted blocks).
3. **Phase 2 v0 lock-in** — if Phase 2 ships with hard v0 dependency, the v0 adapter must be at Probation. Mitigation: ToolMenu fallback chain (v0 → Lovable → Bolt.new → Firebase Studio); reactivate Lovable if v0 drifts.
4. **Phase 2 Executor authority elevation risk** — Executor writes to operator source. Mitigation: identical PR-and-preview pattern as `SELF_RENEWAL_SPEC.md` (preview-before-PR; human merge gate; never auto-merge).
5. **Symbiotic-loop input handling** — Phase 2 `10.ssot.updated.v1` may trigger re-runs; must guard against re-run storms (cap re-runs per product per hour).

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 151:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Phase 2 adds (per Executor):

- `V0_API_KEY` or equivalent v0/Lovable/Bolt.new credentials per ToolMenu adapter, sourced from Doppler.
- For Executor PR-and-preview path: `GITHUB_PAT` (per-product Doppler path) + `VERCEL_TOKEN` — identical pattern to Self-Renewal Executor per `SELF_RENEWAL_SPEC.md` §3.2.

All credentials memory-only, never logged, never persisted, scrubbed per AUTH_TRAVERSAL_SECURITY_SPEC v3 patterns.

### §7.2 Data exfiltration controls

- Phase 1: research brief content sent ONLY to Anthropic API.
- Phase 2: generated UI files sent to v0/Lovable/Bolt.new (operator-acknowledged third-party design services); operator MUST opt-in per-product to Phase 2 Executor (parallels CEO Dispatch #5 source-acquisition operator-attestation pattern).

### §7.3 Scope limiting

- Design spec scope is per-`productId`; Agent #7 never reads or writes across products.
- Phase 2: generated files limited to `architecture_snapshot.pages[]` entries already declared in ProductSSOT — Executor cannot create arbitrary new pages without operator scope expansion (parallels Self-Renewal Executor `single-file scope` per `SELF_RENEWAL_SPEC.md` §4.3, here "declared-pages-only scope").

### §7.4 Escalation policy (from `_registry.ts` line 154)

```
escalationPolicy: 'On missing research brief, request re-run from #6 instead of guessing.'
```

Concrete enforcement:

- `researchBrief` absent or `outcome: 'block'` → Agent #7 emits `7.design.spec.v1` with `confidence: 0`, `lowConfidence: true`, and a recommendation envelope `request-research-rerun`; does NOT fabricate a spec.
- Phase 2 v0 dispatch failure (5xx / 429) → fall back through ToolMenu (Lovable → Bolt.new → Firebase Studio) per CA-11-A.4; if all exhaust → emit `7.design.generated.v1` `outcome: 'failed', reason: 'all-adapters-unavailable'`; do NOT silently degrade to Phase 1 spec-only.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Produce a structured design spec envelope from research brief.
- Persist lineage; emit `7.design.spec.v1` exactly once per `runId`.
- Fall back across ToolMenu adapters on LLM failure.
- Low-confidence spec when research was partial.

### §8.2 Phase 2 capabilities (deferred)

- Dispatch v0/Lovable/Bolt.new to generate actual UI files.
- Open GitHub PR + Vercel preview on operator-owned repos (PR-and-preview pattern identical to Self-Renewal Executor).
- Write generated files to ProductSSOT `architecture_snapshot.pages[]` per CA-10-B.
- Symbiotic-loop re-run on `10.ssot.updated.v1` (capped per-product-per-hour).

### §8.3 What this agent CANNOT do — ever

- **Never auto-merges generated UI to operator main branch.** Always Supervised authority per CA-12 v3 §A.2; human reviewer required.
- **Never invents new pages outside ProductSSOT scope.** Generated UI confined to declared-pages-only.
- **Never produces a design spec from zero context.** If research blocks, Agent #7 blocks too — no fabrication.
- **Never dispatches to v0/Lovable/Bolt.new without operator opt-in per-product.** Phase 2 is opt-in at the `ProductRegistry.designExecutorEnabled` boolean.

---

## §9 — Acceptance Criteria

1. **AC-7.1** — Given `6.research.brief.v1 outcome: 'ok'`, Agent #7 emits `7.design.spec.v1` with `palette`, `typography`, `layout`, `responsiveBreakpoints` all populated. A7-N1.
2. **AC-7.2** — Given research's `responsiveBreakpoints` flagged mobile-required, the design spec includes mobile breakpoint ≤768px. A7-N2.
3. **AC-7.3** — Given `6.research.brief.v1 outcome: 'block'`, Agent #7 emits `7.design.spec.v1` with `confidence: 0, lowConfidence: true`; does NOT call Claude. A7-M1.
4. **AC-7.4** — Operator-supplied `productConcept` containing prompt-injection does NOT appear verbatim in the design spec. A7-X1.
5. **AC-7.5** — Phase 2 only: Executor opens PR + preview; preview MUST be live (HTTP 2xx) before PR is opened; PR is DRAFT state; never auto-merges. AC-Self-Renewal-style verification.
6. **AC-7.6** — `ANTHROPIC_API_KEY` never present in any persisted artifact (canary test).

---

## §10 — Panel Questions

### G7-Q1 — Phase 2 v0 dependency hardness

Phase 2 Executor's primary adapter is v0. v0's Probation status is a gating prerequisite. Should Phase 2 ship before v0 reaches Probation?

- (a) Hard-gate Phase 2 on v0 Probation — current plan; safest.
- (b) Ship Phase 2 with Lovable as primary instead of v0 (Lovable was archived per §8.1; reactivation required).
- (c) Ship Phase 2 with Bolt.new as primary (Bolt.new is an Orchestra Tier 2 candidate).
- (d) Ship Phase 2 with no primary; ToolMenu chain decides per-dispatch based on adapter lifecycle status.
- (e) INSUFFICIENT_INFORMATION.

### G7-Q2 — Design spec ↔ generated UI separation

Today Agent #7 produces a spec; Agent #2 Code Builder reads the spec and generates UI. Phase 2 Executor would dispatch v0 directly. Should the spec layer remain?

- (a) Keep spec layer — Phase 2 Executor still produces the spec, then dispatches v0 with the spec as input. Separation of concerns preserved.
- (b) Eliminate spec layer in Phase 2 — Executor dispatches v0 with the research brief directly; no intermediate spec.
- (c) Operator-configurable per-product (`ProductRegistry.designSpecLayer: 'keep' | 'skip'`).
- (d) Defer Phase 2 entirely until spec-vs-direct-dispatch is validated against operator products.
- (e) INSUFFICIENT_INFORMATION.

### G7-Q3 — Generated UI scope (declared pages vs arbitrary)

§7.3 limits Phase 2 Executor to pages already in ProductSSOT `architecture_snapshot.pages[]`. Is this the right scope limit?

- (a) Declared-pages-only — current plan; safest; never invents pages.
- (b) Allow new-page creation when operator opts in per-run.
- (c) Allow new-page creation when research brief explicitly flagged a missing page.
- (d) No scope limit — Executor generates whatever v0 returns; operator reviews PR.
- (e) INSUFFICIENT_INFORMATION.

### G7-Q4 — Symbiotic-loop re-run trigger rate cap

Phase 2 `10.ssot.updated.v1` may re-trigger Design. What's the right rate cap?

- (a) 1 re-run per product per hour.
- (b) 1 re-run per product per 24 hours.
- (c) 1 re-run per product per 7 days (matches Self-Renewal cadence).
- (d) No cap — operator decides; rate-limit at the cost-ledger boundary instead.
- (e) INSUFFICIENT_INFORMATION.

### G7-Q5 — Design spec versioning vs immutability

Once a design spec is emitted, can operator-side edits trigger re-emission? Or is the spec immutable per-`runId`?

- (a) Spec is immutable per-`runId` — operator edits land in the next run's spec.
- (b) Spec is mutable within a run window (e.g. 24h); operator edits patch the in-flight envelope.
- (c) Spec is immutable; operator edits create a `7.design.spec.v2` envelope (new version, not patch).
- (d) Operator-configurable per-product mutability policy.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #7 Design engineering spec. Pending W6 Panel ratification.*
