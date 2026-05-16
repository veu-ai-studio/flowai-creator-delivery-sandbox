# SSOT Amendment Draft — CA-12 v2 (Three-Mode + Three-Authority-Dimension Governance Architecture)

**Status:** DRAFT v2 — revision addressing all 5 Panel conditions from W6 NOT_RATIFIED verdict on v1 (commit `f9a62a0`, Panel transcript `docs/panel-consultations/ca12-ratification-2026-05-16.md` commit `5c2324f`). Three CEO decisions (D1/D2/D3) locked into v2 per W3 Dispatch #3 (2026-05-16).
**Author:** W3, 2026-05-16.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–006 cumulative).
**Lineage:** v1 commit `f9a62a0` → W6 adversarial Panel ratification → NOT_RATIFIED with 4 plurality-blocked questions + 1 supermajority instruction + 26 distinct substantive objections → CEO decisions D1/D2/D3 → v2 (this document).

## Revision history

| Version | Date | Commit | Verdict | Disposition |
|---|---|---|---|---|
| v1 | 2026-05-16 | `f9a62a0` | NOT_RATIFIED (W6 Panel) | 4 plurality conditions + 1 supermajority instruction + 26 objections |
| **v2** | 2026-05-16 | this commit | DRAFT — pending re-ratification | 5 Panel conditions + 3 CEO decisions applied |

## Panel conditions addressed in v2

| # | Panel signal | v1 position | v2 position |
|---|---|---|---|
| **C1** | G-Q1 `QUORUM_PLURALITY_GQ1-OVERLAP` (7/9) — Mode 3B SUB-3B-BUILD overlaps Mode 2 SUB-2B BUILD | v1 §A.1.4 introduced SUB-3B-BUILD as parallel deploy pipeline | **v2 §A.1.4 removes SUB-3B-BUILD**. Mode 3B produces a comparative report (3A) or a synthesized product **specification** which the operator then executes via Mode 2 SUB-2A. No parallel build pipeline in 3B. Overlap eliminated. |
| **C2** | G-Q2 `PLURALITY_GQ2-THREEPLUS` (5/9) — single Authority dimension under-specified | v1 §A.2 had ONE Authority Level dimension (Autonomous/Supervised/Recommend-only) | **v2 §A.2 splits into THREE Authority sub-dimensions per CEO D2:** Build-Authority (Dim 2a) + Deploy-Authority (Dim 2b) + Operational-Authority (Dim 2c). Each on its own 3-level scale. |
| **C3** | G-Q3 `PLURALITY_GQ3-PER-MODE` (5/9) — global ceiling rule rejected; per-mode ceiling preferred | v1 §A.2.4 had global per-product ceiling | **v2 §A.2.4 sets ceiling per-product PER-MODE per-dimension** — not global. A product may have Dim 2c AUTONOMOUS for Mode 1 (crawl is low-risk) but Dim 2b SUPERVISED for Mode 2 (deploy is high-risk). |
| **C4** | G-Q4 `QUORUM_PLURALITY_GQ4-DEFER` (7/9) — Mode 2 SUB-2B deferred from SSOT until prototype | v1 §A.1.2 + §E catalogued SUB-2B as ROADMAP in canonical SSOT | **v2 removes SUB-2B from SSOT entirely** per CEO D3. New `docs/specs/FUTURE_CAPABILITIES.md` (separate non-canonical document) catalogues SUB-2B with honest "unbuilt, not canonical SSOT" status. Mode 2 in v2 SSOT covers SUB-2A SPEC only. |
| **C5** | G-Q5 `PLURALITY_GQ5-RESTRICT` (5/9) — Mode 3B universal feature extraction rejected | v1 §A.1.4 implicitly permitted feature extraction across arbitrary third-party URLs | **v2 §A.1.4 restricts Mode 3B to operator-owned products only** per CEO D1. Operator attests ownership/license per submitted URL; FlowAI rejects synthesis at runtime if any URL fails attestation. |
| **C6** | G-Q6 `SUPERMAJORITY_GQ6-COLLAPSE` (8/9) — 36-cell matrix over-specified | v1 §B catalogued all 36 cells with degenerate cells inline | **v2 §B collapses** — only the ~16 non-degenerate configurations catalogued (now multidimensional given C2's 3-authority split). Degenerate combinations marked as runtime errors, not SSOT entries. |

**Inputs read in full for v2:** v1 spec `f9a62a0` (578 lines); Panel transcript `ca12-ratification-2026-05-16.md` (1196 lines, all 26 objections); `docs/CANONICAL_REFERENCE.md` §6 / §9 / §10 / §11 / §22 / §25.

---

## §A — The Complete Operating Model (v2)

Every FlowAI run is defined by **three classes of orthogonal selections**:
- **Dimension 1: Pipeline Mode** — what the run operates on.
- **Dimension 2: Authority Level** — **three sub-dimensions** (Build / Deploy / Operational), each operator-set per-product per-mode.
- **Dimension 3: Execution Mode** — per-run pacing.

### A.1 Dimension 1 — Pipeline Mode

#### A.1.1 MODE 1 — ASSESS & RENEW EXISTING PRODUCT

**Input:** one existing URL (public or authenticated).

**Sub-modes:**
- **SUB-1A RECOMMEND** — assess + findings + fix list. No deployment. No source modification.
- **SUB-1B PREVIEW** — assess + apply fixes + redeploy to FlowAI-owned Vercel preview URL (fork-and-fix per CA-9-A §8.1 + Self-Renewal Executor per CA-7 §15.5).
- **SUB-1B DEPLOY** — assess + apply fixes + push to original product hosting. Requires source + deploy credentials + Acceptance Gate per §10.2.

**Pipeline step behavior in MODE 1:** identical to v1 §A.1.1 table (Agent #21 Step 1; Agent #7 Step 2; Agent #2 Step 3; Agent #8 Step 4; orchestrator Step 5; Agent #3 Step 6; Agent #9 Step 7; Agent #10 Step 8).

#### A.1.2 MODE 2 — BUILD NEW PRODUCT

**Input:** description / spec / content / voice / screenshots (no existing URL).

**Sub-modes:**
- **SUB-2A SPEC** — FlowAI produces full product spec, design brief, architecture, build plan. Human implements. Output: spec deliverable.

**SUB-2B BUILD removed from this SSOT per CEO Decision D3.** The full-build-and-deploy variant is catalogued at `docs/specs/FUTURE_CAPABILITIES.md` as a target future capability — not canonical SSOT.

**Pipeline step behavior in MODE 2 (SUB-2A only):**

| Step | Behaviour |
|---|---|
| 1 Research | Agent #6 — market research + competitive intel + audience analysis (no URL to crawl) |
| 2 Design | Agent #7 — generate UX/visual spec |
| 3 Build | Agent #2 — produce build plan (spec; no code emitted) |
| 4 QA | Agent #8 — audit the spec (not code) |
| 5 Deploy | no deploy in SUB-2A |
| 6 Self-Renewal | spec-improvement recommendations |
| 7 GTM | Agent #9 — GTM readiness assessment for the spec |
| 8 Monitor | Agent #10 — final clearance decision |

#### A.1.3 MODE 3A — BENCHMARK (comparison only, no new URL)

**Input:** 2 or more existing URLs.
**Purpose:** assess each → ranked comparative report. No new URL produced.

**Pipeline step behavior in MODE 3A:** identical to v1 §A.1.3 table.

**Output:** comparative governance report only.

#### A.1.4 MODE 3B — SYNTHESIZE (operator-owned products only)

**Input:** 2 or more existing URLs that the operator owns or has explicit license to use.

**Purpose:** assess all → extract best elements → produce **a synthesized product specification**. The spec is the deliverable; if the operator wants to execute it, they route the spec through Mode 2 SUB-2A (or, when it exists, the Mode 2 SUB-2B from `FUTURE_CAPABILITIES.md`).

**Ownership Attestation Mechanism (per CEO Decision D1):**

Mode 3B requires that the operator owns or has explicit license to all submitted URLs. FlowAI enforces this at the InputArtifact validation layer:

1. **Operator attestation per URL.** Each URL submitted to Mode 3B is accompanied by an explicit attestation field `ownershipAttestation: 'owned' | 'licensed' | NOT_PERMITTED`. Mode 3B rejects the run at the AutoRunner submission boundary if ANY URL has `ownershipAttestation` missing or set to `NOT_PERMITTED`.
2. **Operator identity binding.** The attestation is bound to the operator's authenticated identity per Rev-2.1 §13 admin/operator role. Attestation by a non-admin role for a URL the org does not appear in `ProductRegistry` for is rejected.
3. **Audit-log record per attestation.** Every Mode 3B run writes a `governance_record_entry` to the synthesized product's ProductSSOT with `kind: 'mode3b_ownership_attestation'` listing each input URL + attestation value + attesting userId.
4. **No "research-only output" path.** Per CEO Decision D1, research-only output is NOT acceptable as a Mode 3B escape hatch. The capability is operator-owned synthesis with deployment-pathway output (spec → Mode 2). Third-party feature extraction without ownership/license is NOT permitted and will be rejected at runtime.

**No sub-modes** in Mode 3B — Mode 3B produces a comparative report (Mode 3A behavior) OR a synthesized-product specification. There is no SUB-3B-BUILD parallel deploy pipeline (eliminated per Panel Condition C1).

**Pipeline step behavior in MODE 3B:**

| Step | Behaviour |
|---|---|
| 1–5 | Run per-URL (Mode 1 SUB-1A behavior — Agent #21 × N parallel crawls; operator attestation enforced at submission). |
| 6 Self-Renewal | **SYNTHESIS SPEC OUTPUT** — extract best elements from all attested-owned inputs → produce a synthesized product specification (the Mode 2 SUB-2A output shape). |
| 7 GTM | Agent #9 — GTM readiness assessment for the synthesized spec. |
| 8 Monitor | Agent #10 — final clearance decision; ProductSSOT write per CA-10. |

**Output:** synthesis report (what was taken from which source URL + why; full ownership-attestation provenance) + a synthesized product specification consumable by Mode 2 SUB-2A.

### A.2 Dimension 2 — Authority Level (3 sub-dimensions, per CEO Decision D2)

CEO Decision D2 splits the single Authority Level dimension from v1 into **THREE distinct sub-dimensions**. Each operates on its own 3-level scale (Autonomous / Supervised / Recommend-only) and is set per-product per-mode per-dimension by the operator (per CEO Decision D3 on ceiling rule, Panel Condition C3).

#### A.2.1 Dim 2a — BUILD-AUTHORITY (can FlowAI write/modify code?)

| Level | Definition | Maps to |
|---|---|---|
| **Autonomous** | FlowAI writes / modifies code freely within scope; no per-edit approval | `auto_write_internal` for code-write actions; paired with `requires_human_gate` per CA-9-Q4=(b) for `xss-in-form-echo`, `auth-gate-leak`, or destructive-action triggers |
| **Supervised** | FlowAI proposes code changes; human reviews diff + approves/modifies/rejects before any commit | `requires_human_gate` (every commit gated) |
| **Recommend-only** | FlowAI suggests changes textually; never writes code itself | `recommend_only` (dormant-safe default for all 26 agents per Rev-2.1 §15.1) |

#### A.2.2 Dim 2b — DEPLOY-AUTHORITY (can FlowAI push to production?)

| Level | Definition | Maps to |
|---|---|---|
| **Autonomous** | FlowAI pushes to production deployment target freely within scope; no per-deploy approval | `auto_write_internal` for deploy actions; same gate-pairing as Dim 2a |
| **Supervised** | FlowAI proposes deploy; human approves/rejects each push | `requires_human_gate` (every deploy gated) |
| **Recommend-only** | FlowAI recommends deploy decisions; never pushes | `recommend_only` |

#### A.2.3 Dim 2c — OPERATIONAL-AUTHORITY (can FlowAI take runtime actions: crawl, call APIs, etc.?)

| Level | Definition | Maps to |
|---|---|---|
| **Autonomous** | FlowAI crawls, calls third-party APIs (Stripe Connect link creation, DMCA filing, capability transfer install, webhook posts) freely within scope | `auto_write_internal` for runtime actions; gate-pairing for security-critical actions |
| **Supervised** | FlowAI proposes runtime actions; human approves each external call | `requires_human_gate` (every external call gated) |
| **Recommend-only** | FlowAI recommends actions; never invokes external APIs / never crawls without explicit human trigger | `recommend_only` |

#### A.2.4 The Authority Ceiling Rule (per-product per-mode per-dimension)

> The operator sets the ceiling for each `(productId, pipelineMode, authorityDimension)` triple. End users can only select at or below the operator's ceiling for that triple per run. Ceilings are independent across the three sub-dimensions and across the four modes.

**Storage** (per CA-12 v2): `ProductRegistry.authorityCeilings` is a structured field, not a single value:

```json
{
  "authorityCeilings": {
    "mode_1": { "build": "autonomous",   "deploy": "supervised",      "operational": "autonomous" },
    "mode_2": { "build": "supervised",   "deploy": "recommend_only",  "operational": "supervised" },
    "mode_3a":{ "build": "recommend_only","deploy": "recommend_only", "operational": "autonomous" },
    "mode_3b":{ "build": "recommend_only","deploy": "recommend_only", "operational": "supervised" }
  }
}
```

**Defaults for new products** (most conservative): every triple defaults to `recommend_only`. Operator raises ceilings explicitly via admin UI; raising a ceiling is itself audit-logged.

**Per-run enforcement:** when AutoRunner accepts a run request with `{pipelineMode, buildAuth, deployAuth, operationalAuth}`, it validates each of the three requested authority levels ≤ the operator's ceiling for that `(productId, pipelineMode, dimension)`. Mismatch returns 403 with explicit error.

**Why per-mode + per-dimension matters:** the per-mode ceiling resolves Panel Condition C3 — Mode 1 (crawl) has different risk profile from Mode 2 (build) which has different risk from Mode 3B (synthesize from owned products). The 3-dimension split (D2) lets an operator say "FlowAI may crawl freely (Op-Authority Autonomous in Mode 1) but every code write requires my approval (Build-Authority Supervised everywhere)".

### A.3 Dimension 3 — Execution Mode (per-run pacing; unchanged from v1)

- **AUTOMATIC** — all 8 steps run sequentially, one launch → full report.
- **GUIDED** — pipeline pauses at each step; human approves/modifies/skips before next runs.
- **MANUAL** — human triggers each step explicitly.

**Bounded by authority ceilings:** GUIDED + MANUAL accommodate any authority level (the user-in-the-loop pacing naturally satisfies Supervised gates). AUTOMATIC with any Authority sub-dimension at Supervised level is degenerate (every gate auto-blocks); see §B matrix for explicit handling.

### A.4 Axis reconciliation with prior canonical (Rev-2.1)

CA-12 v2 promotes **four canonical orthogonal axes** (Locked Rule 4 amendment):
1. **Orchestra Selection axis** (Auto / Recommended / User-Choice; unchanged from Rev-2.1 §25 Locked Rule 4).
2. **Pipeline Mode axis** (Mode 1 / Mode 2 / Mode 3A / Mode 3B; NEW per v2 Dim 1).
3. **Authority axis with 3 sub-dimensions** (Build / Deploy / Operational, each 3-level; NEW per v2 Dim 2). **Deprecates** §8a single-axis System Operation labels with the following backwards-compat mapping (the §8a label maps to Operational-Authority by default):
   - Hands-Off (§8a) → Operational-Authority Autonomous
   - Reviewed (§8a) → Operational-Authority Supervised
   - Hands-On (§8a) → Operational-Authority Recommend-only
   - Build-Authority + Deploy-Authority are NEW; no §8a precursor.
4. **Execution Pacing axis** (Automatic / Guided / Manual; per-run; supersedes any "single-dim Auto/Guided/Manual" reference).

---

## §B — The Collapsed Configuration Matrix (per Panel SUPERMAJORITY C6)

The full Cartesian product is now `4 modes × 3 execution × 3^3 authority combos = 324 raw cells`. Most are degenerate. v2 catalogues **only the non-degenerate canonical configurations**; degenerate combinations are **runtime configuration errors**, NOT SSOT entries.

### B.1 Non-degenerate canonical configurations (~16 cells)

The configuration grammar: `{mode}-{sub-mode}-{build-auth}-{deploy-auth}-{operational-auth}-{execution}`. Build-Auth and Deploy-Auth are linked by validity rules (B.2 below); Operational-Auth is independent.

| # | Configuration | Output | Today status | Notes |
|---|---|---|---|---|
| 1 | Mode 1 / SUB-1A / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Automatic | Audit report + fix list | **BUILT** | Most common; current production path |
| 2 | Mode 1 / SUB-1A / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Guided | Audit report + fix list, step-approval | **BUILT** | UX-C Guided sidebar surface |
| 3 | Mode 1 / SUB-1A / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Manual | Audit report + fix list, human-cadence | **BUILT** | UX-C Manual sidebar surface |
| 4 | Mode 1 / SUB-1A / Build=RecOnly / Deploy=RecOnly / Op=Supervised / Automatic | Audit report; per-crawl approval; rest auto | **PARTIAL** | Gate UX wired for some steps; consistent rollout pending |
| 5 | Mode 1 / SUB-1A / Build=RecOnly / Deploy=RecOnly / Op=Autonomous / Automatic | Audit report; full autonomous operational (crawl + analyse) | **BUILT** | Per W2 PHASE-1-PROOF 2026-05-16 (Mode 1 SUB-1A crawl proven against `saigedemo.com` with `pagesCrawled: 6, depth: 8, fallbackUsed: false`) |
| 6 | Mode 1 / SUB-1B PREVIEW / Build=Supervised / Deploy=Autonomous / Op=Autonomous / Guided | Renewed preview URL + delta; code-edits human-gated; deploy + operational auto | **PARTIAL** | Self-Renewal Executor draft (CA-7); per-step build-approval UI pending |
| 7 | Mode 1 / SUB-1B PREVIEW / Build=Autonomous / Deploy=Autonomous / Op=Autonomous / Automatic | Hands-off renewed preview URL + delta | **PARTIAL** | "Set and forget" preview; Self-Renewal Executor graduation pending |
| 8 | Mode 1 / SUB-1B DEPLOY / Build=Supervised / Deploy=Supervised / Op=Supervised / Guided | Original-host push with every action human-approved | **ROADMAP** | Source acquisition + deploy credentials + Acceptance Gate unbuilt |
| 9 | Mode 1 / SUB-1B DEPLOY / Build=Autonomous / Deploy=Autonomous / Op=Autonomous / Automatic | Hands-off audit + fix + push to original host | **ROADMAP** | Most-autonomous Mode 1 path; full infra unbuilt |
| 10 | Mode 2 / SUB-2A SPEC / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Automatic | Spec deliverable | **BUILT** | LLM-dispatch spec producible today |
| 11 | Mode 2 / SUB-2A SPEC / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Guided | Spec, step-approval | **BUILT** | Same content, Guided pacing |
| 12 | Mode 2 / SUB-2A SPEC / Build=RecOnly / Deploy=RecOnly / Op=RecOnly / Manual | Spec, human-cadence | **BUILT** | Same content, Manual pacing |
| 13 | Mode 3A BENCHMARK / Build=RecOnly / Deploy=RecOnly / Op=Autonomous / Automatic | Comparative report (2+ URLs) | **PARTIAL** | Sequential single-URL today; parallel + cross-URL synthesis unbuilt |
| 14 | Mode 3A BENCHMARK / Build=RecOnly / Deploy=RecOnly / Op=Supervised / Guided | Comparative report, per-crawl human-approved | **PARTIAL** | Same; gates partial |
| 15 | Mode 3B SYNTHESIZE (owner-attested) / Build=RecOnly / Deploy=RecOnly / Op=Autonomous / Automatic | Synthesis report + synthesized spec (consumable by Mode 2 SUB-2A) | **ROADMAP** | Synthesis engine unbuilt; operator attestation layer unbuilt |
| 16 | Mode 3B SYNTHESIZE (owner-attested) / Build=RecOnly / Deploy=RecOnly / Op=Supervised / Guided | Synthesis spec, per-crawl human-approved | **ROADMAP** | Same |

**~16 canonical configurations.** The catalogue intentionally excludes intermediate combinations (e.g., Mode 1 / SUB-1A / Build=Autonomous / Deploy=RecOnly is degenerate because SUB-1A has no build path; the Build-Auth selection is irrelevant for that sub-mode). See B.2 validity rules.

### B.2 Configuration validity rules (the ~16 are derived from these)

The following rules determine whether a `{mode, sub-mode, build-auth, deploy-auth, op-auth, execution}` tuple is valid (canonical) or a runtime configuration error:

1. **SUB-1A path** (Mode 1 SUB-1A): Build-Auth and Deploy-Auth MUST be `Recommend-only`. SUB-1A by definition does not modify code or deploy. Any other value is a configuration error.
2. **SUB-1B PREVIEW / SUB-1B DEPLOY path** (Mode 1 SUB-1B): Build-Auth ≥ Supervised AND Deploy-Auth ≥ Supervised (both must be at least Supervised; Autonomous is fine; Recommend-only is a contradiction). SUB-1B PREVIEW deploys to FlowAI-owned URL — Deploy-Auth still applies. SUB-1B DEPLOY pushes to original host — Deploy-Auth applies more strictly (admin role required per §13).
3. **Mode 2 SUB-2A** (spec deliverable, no code, no deploy): Build-Auth and Deploy-Auth MUST be `Recommend-only`. SUB-2A produces a spec, not code or a deploy.
4. **Mode 3A BENCHMARK** (no new URL): Build-Auth and Deploy-Auth MUST be `Recommend-only`. Mode 3A produces a report, not a deployable artifact.
5. **Mode 3B SYNTHESIZE** (owner-attested spec output): Build-Auth and Deploy-Auth MUST be `Recommend-only`. Mode 3B produces a spec consumable by Mode 2 SUB-2A; the deploy decision is downstream and Mode 3B itself does not deploy.
6. **Operational-Auth applies in all modes** as the crawl/API-call governance dimension, independent of Build/Deploy ceilings.
7. **AUTOMATIC + any Authority=Supervised** is degenerate (every gate auto-blocks the run). The user instead picks GUIDED or MANUAL for Supervised authority. The system rejects with explicit error at run-acceptance time.
8. **Execution=AUTOMATIC requires** Build-Auth, Deploy-Auth, Op-Auth all at Autonomous OR all at Recommend-only (no Supervised in any sub-dimension when Execution is Automatic).

**Runtime configuration errors** (the 300+ degenerate cells from the raw 324) are rejected at AutoRunner's run-acceptance boundary with an error envelope citing the violated rule above. They are NOT catalogued in this SSOT.

### B.3 Operator ceiling interaction with the matrix

The ceiling per `ProductRegistry.authorityCeilings[mode][dimension]` further constrains which of the ~16 canonical cells are reachable by users on that product. If the operator sets Mode 1 ceiling for Build-Auth to `Supervised`, configurations #6 and #7 above are reachable only at SUB-1B PREVIEW with Build=Supervised (config #6 only). Configuration #7 (Build=Autonomous) is rejected at run-acceptance with explicit ceiling-violation error.

---

## §C — UI Mapping (updated for 3-authority-dimension model)

### C.1 LandingPage.jsx 8 OBJECTIVES → Pipeline Modes (unchanged from v1 §C.1)

Same mapping as v1: audit_demo / investor_review / launch_readiness → Mode 1 SUB-1A; compare / benchmark → Mode 3A; combine → Mode 3B (now operator-attested per CEO D1); full_governance → Mode 1; custom → any mode.

### C.2 "Mode: Supervised" UI header → 3-dimension grid

The single "Mode: Supervised" label v1 mapped to single Dim 2 must now expand to a 3-sub-dimension grid in the UI header:

```
Authority:
  Build:        [Auto / Supervised / Rec-only]   ← current operator ceiling
  Deploy:       [Auto / Supervised / Rec-only]
  Operational:  [Auto / Supervised / Rec-only]
```

Read-only for non-admin. Admin sees an "Edit ceilings" affordance.

### C.3 "Auto / Guided / Manual" Step 3 selector → Dim 3 unchanged

Same as v1 §C.4 — Step 3 selector maps to Execution Mode.

### C.4 New per-run authority selector (added in v2)

When a user submits a run, the LandingPage flow adds an "Authority for this run" sub-step with three pickers (Build / Deploy / Operational), each bounded by the operator's per-mode ceiling per §A.2.4. Defaults to operator's ceiling. User can lower (more restrictive); cannot raise above ceiling.

### C.5 Net UI changes implied by CA-12 v2 (engineering follow-up — NOT this amendment)

- LandingPage adds per-mode + per-dimension authority pickers (3 dropdowns × 4 modes = 12 affordances at the operator admin UI; bounded per-run at end-user UI).
- Sidebar "Mode: Supervised" indicator becomes 3-row indicator (Build / Deploy / Operational status badges).
- ProductRegistry schema gains `authorityCeilings` JSONB column per §A.2.4 storage shape.

### C.6 Mode 3B ownership-attestation UI (per CEO D1)

When user selects Mode 3B in the LandingPage flow, an explicit attestation checkbox appears for each submitted URL:
- ☐ I own this URL OR I have explicit license to use it for synthesis
- ☐ (NOT_PERMITTED option exists implicitly — checking nothing rejects submission)

Submission validates attestation per §A.1.4 mechanism; rejects at validation layer if any URL lacks attestation.

---

## §D — Pipeline Step Agent Ownership per Mode (updated for v2)

Identical to v1 §D table for Modes 1 / 2 SUB-2A / 3A — agent ownership did not change. Mode 3B change:

| Step | Mode 3B v2 (owner-attested synthesis) |
|---|---|
| 1 Research | Agent #21 × N parallel crawls (per attested URL only; rejection at attestation layer if URL fails) |
| 2 Design | per-URL Mode 1 step 2 (Agent #7 critique each) |
| 3 Build | per-URL Mode 1 step 3 (Agent #2 audit each) |
| 4 QA | per-URL Mode 1 step 4 (Agent #8 score each) |
| 5 Deploy | n/a (Mode 3B does NOT deploy; output is spec) |
| 6 Self-Renewal | Agent #3 produces synthesis spec (extract best elements from attested-owned inputs); spec is the deliverable |
| 7 GTM | Agent #9 GTM readiness for synthesized spec |
| 8 Monitor | Agent #10 final clearance + ProductSSOT write |

**No Mode 3B SUB-3B-BUILD pipeline.** The synthesized spec is consumed downstream by Mode 2 SUB-2A.

---

## §E — Honest Capability Boundary Table (v2 — Mode 2 SUB-2B removed)

| Configuration | Built today | Partial | Roadmap | Blocked by |
|---|---|---|---|---|
| Mode 1 SUB-1A + Op-Auth Autonomous + Automatic | **BUILT** — multi-page public crawl per W2 PHASE-1-PROOF 2026-05-16 (`pagesCrawled: 6, depth: 8, fallbackUsed: false`) | — | — | — |
| Mode 1 SUB-1A + Op-Auth Supervised + Guided/Manual | **BUILT** — UX-C Guided/Manual sidebar surfaces | — | — | — |
| Mode 1 SUB-1A + auth-gated crawl | — | Credential plumbing scaffolded in `inputArtifact.js` | Phase 3 spec for auth-gated crawl + Panel ratification |
| Mode 1 SUB-1B PREVIEW + Build/Deploy Supervised/Autonomous | — | **PARTIAL** — `api/renew.js` (commit `9b4e511`); Self-Renewal Executor drafted (CA-7) | Real source-level patch + redeploy end-to-end | Source acquisition + Self-Renewal Executor graduation |
| Mode 1 SUB-1B DEPLOY (push to original host) | — | — | **ROADMAP** | Source + deploy credentials + Acceptance Gate + admin-role gates per §13 |
| Mode 2 SUB-2A SPEC + RecOnly authority across all dims | **BUILT** — spec deliverables via LLM dispatch | — | — | — |
| ~~Mode 2 SUB-2B BUILD~~ | **DEFERRED FROM SSOT** per CEO D3; see `docs/specs/FUTURE_CAPABILITIES.md` | — | — | — |
| Mode 3A BENCHMARK + RecOnly Build/Deploy + Op variable | — | **PARTIAL** — single-URL sequential today; manual user comparison | Parallel multi-URL + cross-URL synthesis | Synthesis step + Agent #21 × N parallel + Agent #3 cross-URL logic |
| Mode 3B SYNTHESIZE (owner-attested spec output) | — | — | **ROADMAP** — synthesis engine + attestation validation layer both unbuilt | Synthesis spec step 6 implementation + InputArtifact attestation validator + admin-role gate on attestation submission per §A.1.4 + per CEO D1 |
| Dim 2a Build-Authority Autonomous | — | **PARTIAL** — `recommend_only` wired across all 26 agents; `auto_write_internal` charter pattern proven by Self-Renewal Executor (CA-7) + Agent #26 dual-authority (CA-9-B); full code-write autonomy unbuilt | Full Build-Authority Autonomous across all 8 steps | Per-agent `BaseAgent.guard()` amendment per CA-11 + `ProductRegistry.authorityCeilings` per §A.2.4 + per-run AutoRunner validation |
| Dim 2b Deploy-Authority Autonomous | — | **PARTIAL** — Vercel adapter deploys today via orchestrator path; per-run Deploy-Auth gating unbuilt | Full Deploy-Authority gating per-run | Same `ProductRegistry.authorityCeilings` + AutoRunner validation |
| Dim 2c Operational-Authority Autonomous | **BUILT (Mode 1)** — Agent #21 crawl runs autonomously today per W2 PHASE-1-PROOF | **PARTIAL (Mode 2, 3A, 3B)** | Full Op-Auth across all modes | Per-mode gate UX work |
| Dim 2 — any sub-dimension Supervised | — | **PARTIAL** — Human Gates wired in operationsEngine.js for some steps per Rev-2.1 §10.2 | Consistent gate UX across all 8 steps × all 3 sub-dimensions | UX work + per-step gate-policy declarations |
| Dim 2 — any sub-dimension Recommend-only | **BUILT** | — | — | — |
| Dim 3 — AUTOMATIC execution | **BUILT** | — | — | — |
| Dim 3 — GUIDED execution | — | **PARTIAL** — UX-C wireframe; approval-gate UI for select steps | Consistent 8-step gate UX | UX work |
| Dim 3 — MANUAL execution | — | **PARTIAL** — UX-C manual trigger UI | All 8 steps independently triggerable; pause-resume | UX work + per-step trigger API endpoints |
| `ProductRegistry.authorityCeilings` per-mode-per-dim field | — | — | **NEW per CA-12 v2** — does not exist today | Schema migration adding `authorityCeilings` JSONB column + admin UI + per-run AutoRunner validation |
| Mode 3B ownership-attestation validator | — | — | **NEW per CA-12 v2 + CEO D1** — does not exist today | InputArtifact attestation field + per-URL validator + admin-role binding + audit-log topic `mode3b_ownership_attestation` |

**Be precise.** No fabricated capability. The 2026-05-16 W2 Phase 1 production proof is the anchor for Mode 1 SUB-1A + Op-Authority Autonomous BUILT claim.

---

## §F — SSOT Sections Requiring Update (v2)

Once CA-12 v2 is ratified by Panel + CEO, the following sections in `docs/CANONICAL_REFERENCE.md` require corresponding edits (engineering dispatches following ENTRY 003–006 promotion-commit pattern):

### F.1 §9 8-Step Pipeline — mode-dependent step behavior (unchanged from v1)

Each row gains a mode-conditional behavior footnote referencing §D. Mode 3B Step 6 now produces a spec (not a deploy).

### F.2 §10 Self-Governance Layer — three-sub-dimension authority canonicalized

New sub-section **§10.3 Authority Sub-Dimensions (CA-12 v2 Dim 2)** with the Build / Deploy / Operational definitions + per-product per-mode per-dimension ceiling storage in `ProductRegistry.authorityCeilings` per §A.2.4 JSONB shape.

### F.3 §11 Clearance Protocol — mode-dependent outputs (unchanged from v1)

§11 six clearance steps remain; outputs gated by Step 5 (Demo Readiness) vary by Pipeline Mode per v1 §F.3.

### F.4 §6 ACE (verified compatible; no edit)

Agent #21 invocation in Mode 1 + Mode 3A + Mode 3B (per-URL) is mode-agnostic at the §6 contract layer.

### F.5 §22 Product-Agnostic Rule (verified compatible; no edit)

All four Pipeline Modes treat `productScope` as runtime parameter. Mode 3B's ownership-attestation field is a per-input metadata extension, not product-specific code.

### F.6 §17 / §8a "Auto/Guided/Manual" labels deprecated (revised from v1)

Per v1: §8a labels deprecate in favor of CA-12 Dim 2. v2 modifies: §8a labels deprecate in favor of CA-12 Dim 2c (Operational-Authority) specifically, with 1:1 mapping (Hands-Off → Op-Autonomous; Reviewed → Op-Supervised; Hands-On → Op-RecommendOnly). Dim 2a (Build) and Dim 2b (Deploy) are NEW — no §8a precursor. The shipped sidebar labels at §17 remain at the UX surface per existing §17 footnote (a).

### F.7 §25 Locked Rule 4 — four orthogonal axes (revised from v1)

Locked Rule 4 amended to canonicalize **four orthogonal axes**:
1. Orchestra Selection axis (unchanged from Rev-2.1).
2. Pipeline Mode axis (NEW per CA-12 v2 Dim 1).
3. Authority axis with 3 sub-dimensions (Build / Deploy / Operational, each 3-level; NEW per v2 Dim 2).
4. Execution Pacing axis (Automatic / Guided / Manual; per-run).

### F.8 §15.1 Roster — no agent charter changes (unchanged from v1)

CA-12 v2 references existing charters; no new agent.

### F.9 NEW — pointer to `docs/specs/FUTURE_CAPABILITIES.md`

§9 + §F.1 footnote: Mode 2 SUB-2B (full build + deploy) catalogued at `docs/specs/FUTURE_CAPABILITIES.md` as a target future capability — NOT canonical SSOT per CEO D3.

---

## §G — Seven Panel Questions (v2 — per Panel transcript verdict + CEO decisions)

Each v2 question states the v1 Panel verdict, the v2 position change applied, and asks Panel to ratify the v2 position. Neutral options + INSUFFICIENT_INFORMATION. No anchoring.

### G-Q1 — Pipeline Mode classification (v2 mode-overlap fix)

**v1 Panel verdict:** `QUORUM_PLURALITY_GQ1-OVERLAP` (7/9) — Panel identified Mode 3B SUB-3B-BUILD overlapping Mode 2 SUB-2B BUILD.

**v2 change applied (per Panel C1):** Mode 3B SUB-3B-BUILD removed; Mode 3B now produces only comparative reports OR synthesized specs (consumed by Mode 2 SUB-2A). No parallel build pipeline in Mode 3B.

**v2 ratification options:**
- (a) v2 fix resolves the overlap; ratify v2 Mode 3B definition as canonical.
- (b) v2 still overlaps — name the remaining overlap.
- (c) v2 over-corrected — Mode 3B should retain a build pipeline distinct from Mode 2.
- (d) The 4-mode framing is still wrong — propose alternative.
- (e) INSUFFICIENT_INFORMATION.

### G-Q2 — Authority dimensions (v2 three-sub-dimension model)

**v1 Panel verdict:** `PLURALITY_GQ2-THREEPLUS` (5/9 — below quorum) — Panel preferred 3+ authority dimensions over v1's single dimension.

**v2 change applied (per Panel C2 + CEO D2):** single Authority dimension replaced by three sub-dimensions — Build-Authority, Deploy-Authority, Operational-Authority. Each on its own 3-level scale.

**v2 ratification options:**
- (a) Three sub-dimensions (Build / Deploy / Operational) as v2 defines — ratify.
- (b) Three sub-dimensions is right but the specific naming/scope is wrong — propose adjustment.
- (c) Two sub-dimensions is enough (e.g., collapse Deploy into Build or Operational).
- (d) Four or more sub-dimensions needed — name the missing dimension(s).
- (e) INSUFFICIENT_INFORMATION.

### G-Q3 — Authority ceiling per-product per-mode per-dimension (v2)

**v1 Panel verdict:** `PLURALITY_GQ3-PER-MODE` (5/9 — below quorum) — Panel preferred per-mode ceiling over v1's global per-product ceiling.

**v2 change applied (per Panel C3 + CEO D3):** ceiling is set per-product per-mode per-dimension per `ProductRegistry.authorityCeilings` JSONB shape in §A.2.4. Independent ceilings across the 4 modes × 3 sub-dimensions.

**v2 ratification options:**
- (a) Per-product per-mode per-dimension ceiling as v2 defines — ratify.
- (b) Per-product per-mode (single ceiling per mode, not split by sub-dimension) — coarser.
- (c) Per-product per-dimension (split by sub-dim but not by mode) — coarser the other way.
- (d) Different ceiling granularity — specify.
- (e) INSUFFICIENT_INFORMATION.

### G-Q4 — Mode 2 SUB-2B deferral (v2)

**v1 Panel verdict:** `QUORUM_PLURALITY_GQ4-DEFER` (7/9) — Panel preferred defer until prototype lands.

**v2 change applied (per Panel C4 + CEO D3):** Mode 2 SUB-2B removed from SSOT entirely. Catalogued at `docs/specs/FUTURE_CAPABILITIES.md` as a target future capability — NOT canonical.

**v2 ratification options:**
- (a) v2 defer is correct — ratify.
- (b) v2 should also defer Mode 1 SUB-1B DEPLOY (currently in SSOT as ROADMAP).
- (c) v2 should also defer Mode 3B (currently in SSOT as ROADMAP).
- (d) v2 over-defers — promote SUB-2B back into SSOT as ROADMAP.
- (e) INSUFFICIENT_INFORMATION.

### G-Q5 — Mode 3B ownership attestation (v2)

**v1 Panel verdict:** `PLURALITY_GQ5-RESTRICT` (5/9 — below quorum) — Panel preferred restricting Mode 3B to operator-owned products.

**v2 change applied (per Panel C5 + CEO D1):** Mode 3B restricted to operator-owned (or explicitly licensed) products only. Operator attestation per URL enforced at InputArtifact validation layer per §A.1.4. Third-party feature extraction without ownership is rejected at runtime.

**v2 ratification options:**
- (a) v2 attestation mechanism is correct — ratify.
- (b) Attestation is right but the mechanism should require third-party verification (e.g., DNS-TXT proof of ownership), not operator self-attestation.
- (c) Attestation is too restrictive — research-only output should be allowed for non-owned URLs.
- (d) Attestation alone insufficient — Agent #14 Public Policy must independently classify before synthesis.
- (e) INSUFFICIENT_INFORMATION.

### G-Q6 — Collapsed matrix (v2)

**v1 Panel verdict:** `SUPERMAJORITY_GQ6-COLLAPSE` (8/9) — Panel directed collapse to non-degenerate cells only.

**v2 change applied (per Panel C6):** matrix collapsed to ~16 non-degenerate canonical configurations. Degenerate combinations are runtime configuration errors per §B.2 validity rules.

**v2 ratification options:**
- (a) v2 collapse is correct — ~16 canonical cells with §B.2 validity rules — ratify.
- (b) Too many cells still — collapse further (e.g., ≤8 cells).
- (c) Too few cells — some valid configurations omitted; identify in rationale.
- (d) §B.2 validity rules are wrong — propose alternative.
- (e) INSUFFICIENT_INFORMATION.

### G-Q7 — Overall CA-12 v2 disposition

**v1 Panel verdict:** `PLURALITY_REJECT` (5/9 — below quorum) — v1 rejected; v2 created to address conditions.

**v2 change applied:** all 5 Panel conditions (C1–C5) addressed; CEO D1/D2/D3 applied; matrix collapsed per C6.

**v2 ratification options:**
- (a) v2 addresses all conditions sufficiently — promote.
- (b) v2 addresses conditions in form but not in substance — re-Panel with deeper analysis.
- (c) v2 introduces new concerns not in v1 — name them.
- (d) Defer to a v3 with explicit prototype implementation of the 3-sub-dimension ceiling + Mode 3B attestation before promotion.
- (e) INSUFFICIENT_INFORMATION.

---

## SSOT Conflicts Newly Surfaced in v2 Revision

The v1 revision-pass surfaced 6 conflicts (recorded in v1 §SSOT Conflicts). v2 introduces / clarifies the following additional or refined conflicts:

### Conflict 7 (NEW v2) — `ProductRegistry.authorityCeilings` JSONB structure is novel

CA-12 v1's `authorityCeiling: string` field becomes a structured JSONB in v2 (per §A.2.4 shape). Today's ProductRegistry schema has no JSONB columns for per-mode-per-dimension configuration. Schema migration must be additive + backwards-compatible.

**Proposed resolution:** Engineering follow-on dispatch adds `authority_ceilings JSONB NOT NULL DEFAULT '{...all-recommend_only...}'` column. Default value is the most conservative shape (Recommend-only across all 12 cells: 4 modes × 3 sub-dimensions).

### Conflict 8 (NEW v2) — Mode 3B attestation requires `InputArtifact` schema extension

Per §A.1.4, Mode 3B requires `ownershipAttestation` field on each URL in the `InputArtifact.raw` shape. Today's `src/lib/renewal/inputArtifact.js` has no such field.

**Proposed resolution:** Engineering follow-on extends InputArtifact shape with `raw.urls[].ownershipAttestation: 'owned' | 'licensed' | NOT_PERMITTED` + a validator at the AutoRunner submission boundary + new audit-log topic `mode3b_ownership_attestation`. Spec-only mention here; engineering dispatch follows promotion.

### Conflict 9 (REVISED from v1 Conflict 1) — Rev-2.1 §8a deprecation now applies to Op-Authority sub-dimension only

v1 deprecated §8a labels in favor of the single Authority Level dimension. v2's three-sub-dimension model means §8a labels map specifically to **Operational-Authority** only (Hands-Off/Reviewed/Hands-On → Op-Autonomous/Supervised/Recommend-only). Build-Authority and Deploy-Authority have NO §8a precursor. v2 amends F.6 accordingly.

### Conflict 10 (NEW v2) — Configuration validity rules (§B.2) are not yet enforced anywhere

The 8 validity rules in §B.2 (SUB-1A path, SUB-1B path, etc.) are spec-only. AutoRunner today does not enforce them. Engineering follow-on adds run-acceptance validator that rejects degenerate configurations at AutoRunner's `POST /api/orchestrator/run` boundary with explicit error envelope citing the violated rule.

### Conflict 11 (NEW v2) — Future-capabilities document precedent

`docs/specs/FUTURE_CAPABILITIES.md` is the first non-canonical capability catalogue. It establishes a precedent: items marked NOT canonical SSOT but tracked for future consideration. This is distinct from CA-n parking-lot (which feeds SSOT amendments) and from spec docs (which are intended-to-be-canonical drafts). v2 introduces this category by necessity per CEO D3; future CA-n may need to canonicalize the category itself.

**Conflicts from v1 retained:** Conflicts 1 (revised per Conflict 9 above), 2, 3, 4, 5, 6 from v1 remain applicable. Conflict 4 (`authorityCeiling` field) is superseded by Conflict 7 above.

---

## Provenance (v2)

| Source | Used for |
|---|---|
| v1 CA-12 spec commit `f9a62a0` | Baseline for v2 revisions |
| Panel transcript `docs/panel-consultations/ca12-ratification-2026-05-16.md` commit `5c2324f` | All 5 Panel conditions + 26 distinct objections informing v2 changes |
| CEO Decision D1 (Mode 3B operator-owned restriction) | §A.1.4 attestation mechanism |
| CEO Decision D2 (3-sub-dimension authority split) | §A.2 entire dimension restructure |
| CEO Decision D3 (Mode 2 SUB-2B deferral + per-mode ceiling) | §A.1.2 SUB-2B removal + §A.2.4 per-mode-per-dim ceiling shape; `FUTURE_CAPABILITIES.md` creation |
| (all v1 provenance retained) | unchanged |
| 2026-05-16 W2 Phase 1 production proof | §E "BUILT" anchor for Mode 1 SUB-1A + Op-Autonomous Automatic configuration |

*End of CA-12 v2 draft. Pending W6 re-ratification per Locked Rule 17 + CEO ratification per §18.*
