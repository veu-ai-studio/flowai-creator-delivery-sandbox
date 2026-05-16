# SSOT Amendment Draft — CA-12 v3 (Three-Mode + Two-Authority-Dimension Governance Architecture)

**Status:** DRAFT v3 — revision addressing all 6 remaining conditions from W6 v2 NOT_RATIFIED verdict (commit `ca12-ratification-v2-2026-05-16.md` Panel review of v2 commit `ce13629`). Three CEO decisions (D1/D2/D3) locked per W3 Dispatch #4. **Goes back to W6 for v3 re-ratification.**
**Author:** W3, 2026-05-16.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–006 cumulative).
**Lineage:** v1 (`f9a62a0`) → NOT_RATIFIED (`5c2324f`) → v2 (`ce13629`) → NOT_RATIFIED (`ca12-ratification-v2-2026-05-16.md`) → CEO D1/D2/D3 → v3 (this commit).

## Revision history

| Version | Date | Commit | Verdict | Disposition |
|---|---|---|---|---|
| v1 | 2026-05-16 | `f9a62a0` | NOT_RATIFIED | 26 objections, 4 plurality-blocked conditions, 1 supermajority instruction |
| v2 | 2026-05-16 | `ce13629` | NOT_RATIFIED | 21 objections, 6 plurality-blocked conditions (Q1 only UNANIMOUS_RESOLVED) |
| **v3** | 2026-05-16 | this commit | DRAFT — pending re-ratification | CEO D1/D2/D3 + Q3/Q4/Q6 explanatory close-outs |

## v2 Panel verdict + v3 disposition

| # | v2 Panel verdict | v3 change |
|---|---|---|
| **Q1** | `UNANIMOUS_GQ1v2-RESOLVED` (8/8) — v2 fix accepted | Preserved unchanged in v3 (no further change needed). |
| **Q2** | `SPLIT` 3/8 GQ2v2-THREE vs 3/8 GQ2v2-TWO | **v3 collapses to 2 sub-dimensions per CEO D2.** Deploy-Authority folds into Build-Authority (you build to deploy — they are not separable in practice). v3 §A.2 now has Dim 2a Build-Authority + Dim 2c Operational-Authority only. Ceiling JSONB shrinks from 4×3=12 cells (v2) to 3×2=6 cells (v3). |
| **Q3** | `PLURALITY_GQ3v2-FINE` (5/8) — v2 ceiling structure preferred but below quorum; "over-engineered" objection cited | **v3 adds 3 concrete examples of per-mode-per-dimension ceiling configurations** to §A.2.4 to defuse the over-engineered concern. Examples grounded in the 5 real GTM products (see preamble §A.0 GTM context). |
| **Q4** | `PLURALITY_GQ4v2-DEFER` (5/8) — v2 deferral preferred but below quorum | **v3 strengthens deferral cross-reference** in §A.1.2: SUB-2B and (now) Mode 3B catalogued together in `FUTURE_CAPABILITIES.md`; both items return via a single future CA amendment when their respective blockers (code-gen pipeline; cryptographic ownership-verification) are resolved. |
| **Q5** | `PLURALITY_GQ5v2-3PV` (6/8) — Panel preferred third-party verification (DNS-TXT) over operator self-attestation; v2 self-attestation below quorum | **v3 defers Mode 3B entirely per CEO D1.** Mode 3B removed from canonical SSOT. Catalogued in `docs/specs/FUTURE_CAPABILITIES.md` Entry 2 with blocker: cryptographic URL ownership verification (DNS-TXT or equivalent) must be designed, built, Panel-ratified separately before Mode 3B returns to SSOT. v3 SSOT has 3 modes (Mode 1, Mode 2 SUB-2A, Mode 3A) only. |
| **Q6** | `PLURALITY_GQ6v2-16` (5/8) — v2 matrix structure preferred but below quorum; enforcement-mechanism gap cited | **v3 strengthens §B.2 validity rules** with: concrete runtime error examples per degenerate cell type; explicit AutoRunner enforcement contract (HTTP 400 with specific error code per rule violated). With Mode 3B removed and Deploy-Authority folded, the matrix shrinks further (now ~12 canonical cells; was ~16 in v2). |
| **Q7** | `PLURALITY_GQ7v2-V3` (4/8) — Panel directed v3 revision | **v3 produced** per this dispatch. Re-Panel on v3 per CEO D3 (no need to wait for prototypes — see GTM context §A.0). |

**Inputs read in full for v3:** v2 spec `ce13629` (509 lines); v2 Panel transcript `docs/panel-consultations/ca12-ratification-v2-2026-05-16.md`; `docs/specs/FUTURE_CAPABILITIES.md` v1 (93 lines, Entry 1 = SUB-2B); `docs/CANONICAL_REFERENCE.md` §6 / §9 / §10 / §11 / §22 / §25.

---

## §A — The Complete Operating Model (v3)

### §A.0 — GTM Context (added per CEO Dispatch #4 critical context, verbatim)

> The five operator products FlowAI governs (SAIGE, RelTwin, ReachSMS, PressAI, MyBirthSafe) are real GTM-ready products — not prototypes, not MVPs. FlowAI is production governance infrastructure for live products, not a research tool against hypothetical targets. This context is relevant to all authority, ceiling, and attestation design decisions in this spec.

This GTM context is **prose preamble only**. Per §22 Product-Agnostic Rule, product names appear nowhere in spec code, schemas, identifiers, or canonical configuration shapes. The five names appear in this §A.0 paragraph (and references to it) as architectural context — to explain why design decisions are calibrated for production-grade governance rather than research-tool laxity.

### §A.1 — Dimension 1: Pipeline Mode (3 canonical modes in v3)

Every FlowAI run targets exactly one **Pipeline Mode**. v3 has **3 canonical modes** (Mode 3B removed per CEO D1, catalogued in `docs/specs/FUTURE_CAPABILITIES.md` Entry 2).

#### A.1.1 MODE 1 — ASSESS & RENEW EXISTING PRODUCT

**Input:** one existing URL (public or authenticated).

**Sub-modes:**
- **SUB-1A RECOMMEND** — assess + findings + fix list. No deployment. No source modification.
- **SUB-1B PREVIEW** — assess + apply fixes + redeploy to FlowAI-owned Vercel preview URL (fork-and-fix per CA-9-A §8.1 + Self-Renewal Executor per CA-7 §15.5).
- **SUB-1B DEPLOY** — assess + apply fixes + push to original product hosting. Requires source + deploy credentials + Acceptance Gate per §10.2.

**Pipeline step behavior in MODE 1:** Agent #21 Step 1 (per ENTRY 006); Agent #7 Step 2; Agent #2 Step 3; Agent #8 Step 4 (5-dim score); orchestrator Step 5; Agent #3 Step 6 (recommend in SUB-1A; apply + redeploy in SUB-1B per Self-Renewal Executor); Agent #9 Step 7; Agent #10 Step 8.

#### A.1.2 MODE 2 — BUILD NEW PRODUCT (SUB-2A only in canonical SSOT)

**Input:** description / spec / content / voice / screenshots (no existing URL).

**Sub-modes:**
- **SUB-2A SPEC** — FlowAI produces full product spec, design brief, architecture, build plan. Human implements. Output: spec deliverable.

**SUB-2B BUILD is NOT in canonical SSOT.** It is catalogued at `docs/specs/FUTURE_CAPABILITIES.md` Entry 1 as a target future capability. Re-consideration conditions documented there.

**Pipeline step behavior in MODE 2 SUB-2A:** Agent #6 Step 1 (market research; no crawl); Agent #7 Step 2 (UX/visual spec); Agent #2 Step 3 (build plan, no code emitted); Agent #8 Step 4 (audit the spec); no deploy Step 5; spec-improvement recommendations Step 6; Agent #9 Step 7; Agent #10 Step 8.

**Cross-reference to FUTURE_CAPABILITIES (per Q4-v3 strengthening):**

> SUB-2B (full build + deploy from description) and Mode 3B (synthesize from operator-owned products) are catalogued together in `docs/specs/FUTURE_CAPABILITIES.md` as deferred capabilities. When their respective blockers are resolved (SUB-2B: working code-generation prototype + 5 other conditions per Entry 1; Mode 3B: cryptographic URL ownership-verification mechanism per Entry 2), both items return to canonical SSOT consideration via a single future CA amendment — not via separate CA cycles. This pairing reflects their shared architectural dependency on autonomous-build infrastructure.

#### A.1.3 MODE 3A — BENCHMARK (comparison only, no new URL)

**Input:** 2 or more existing URLs.
**Purpose:** assess each → ranked comparative report. No new URL produced.

**Pipeline step behavior in MODE 3A:** Steps 1–5, 7–8 run per-URL (Mode 1 SUB-1A behavior — Agent #21 × N parallel crawls); Step 6 produces cross-URL comparison synthesis (Agent #3 comparative-report logic — ROADMAP per §E).

**Output:** comparative governance report only.

#### A.1.4 ~~MODE 3B SYNTHESIZE~~ — REMOVED from canonical SSOT per CEO D1

Mode 3B is removed from canonical SSOT v3 entirely. See `docs/specs/FUTURE_CAPABILITIES.md` Entry 2 for definition + status + blocker (cryptographic URL ownership-verification mechanism must be designed, built, Panel-ratified separately before Mode 3B returns).

### §A.2 — Dimension 2: Authority Level (2 sub-dimensions in v3 per CEO D2)

CEO Decision D2 collapses v2's three Authority sub-dimensions to TWO. **Deploy-Authority folds into Build-Authority** ("you build to deploy — they are not separable in practice"). The two remaining sub-dimensions operate on independent 3-level scales.

#### A.2.1 Dim 2a — BUILD-AUTHORITY (write/modify code AND push to production)

| Level | Definition | Maps to |
|---|---|---|
| **Autonomous** | FlowAI writes/modifies code AND pushes to production freely within scope; no per-action approval | `auto_write_internal` for code-write + deploy actions; paired with `requires_human_gate` per CA-9-Q4=(b) for `xss-in-form-echo`, `auth-gate-leak`, or destructive-action triggers |
| **Supervised** | FlowAI proposes code changes + deploys; human reviews diff/deploy plan + approves/modifies/rejects before any write or push | `requires_human_gate` (every commit + every deploy gated) |
| **Recommend-only** | FlowAI suggests changes + deploy plans textually; never writes code; never deploys | `recommend_only` (dormant-safe default per Rev-2.1 §15.1) |

**Why fold Deploy into Build:** v2 separated Build and Deploy. v2 Panel verdict on Q2 was 3-3 SPLIT — equally divided between 3-sub-dim and 2-sub-dim. CEO D2 resolves toward 2-sub-dim. The architectural rationale: a Build-Autonomous + Deploy-Recommend-only configuration is degenerate (you can't ship code if you can't deploy it) — separating them creates configurations that are operationally meaningless. The 2-sub-dim model with Build covering write+deploy is cleaner.

#### A.2.2 Dim 2c — OPERATIONAL-AUTHORITY (runtime actions: crawl, call APIs, etc.)

| Level | Definition | Maps to |
|---|---|---|
| **Autonomous** | FlowAI crawls, calls third-party APIs (Stripe Connect link creation, DMCA filing, capability transfer install, webhook posts), executes runtime actions freely within scope | `auto_write_internal` for runtime actions; gate-pairing for security-critical actions |
| **Supervised** | FlowAI proposes runtime actions; human approves each external call | `requires_human_gate` (every external call gated) |
| **Recommend-only** | FlowAI recommends actions; never invokes external APIs; never crawls without explicit human trigger | `recommend_only` |

#### A.2.3 No Dim 2b (Deploy-Authority) in v3

v2's Deploy-Authority sub-dimension is removed. Its semantics merge into Build-Authority per A.2.1 mapping. v3's sub-dimension count is **two**; v2's was three.

#### A.2.4 The Authority Ceiling Rule (per-product per-mode per-dimension)

> The operator sets the ceiling for each `(productId, pipelineMode, authorityDimension)` triple. End users can only select at or below the operator's ceiling for that triple per run. Ceilings are independent across the two sub-dimensions and across the three modes.

**Storage** (per CA-12 v3): `ProductRegistry.authorityCeilings` is a structured JSONB field. With 3 modes × 2 sub-dimensions, the JSONB has **6 cells** (down from v2's 12).

```json
{
  "authorityCeilings": {
    "mode_1":  { "build": "autonomous",   "operational": "autonomous" },
    "mode_2":  { "build": "recommend_only","operational": "supervised" },
    "mode_3a": { "build": "recommend_only","operational": "autonomous" }
  }
}
```

**Defaults for new products** (most conservative): every triple defaults to `recommend_only`. Operator raises ceilings explicitly via admin UI; raising a ceiling is itself audit-logged.

**Per-run enforcement:** when AutoRunner accepts a run request with `{pipelineMode, buildAuth, operationalAuth}`, it validates each requested authority level ≤ the operator's ceiling for that `(productId, pipelineMode, dimension)`. Mismatch returns HTTP 400 with explicit error code (see §B.2 enforcement contract).

#### A.2.4 — Three Concrete Examples (per Q3-v3 explanatory close-out)

To defuse the v2 "over-engineered" objection on Q3, the following three concrete ceiling configurations illustrate the per-mode-per-dimension model in production GTM scenarios (grounded in the §A.0 GTM context — these are illustrative configurations for live operator products, not for prototypes).

**Example 1 — Conservative assessment posture (new product onboarding):**

```json
{
  "mode_1":  { "build": "recommend_only", "operational": "autonomous" },
  "mode_2":  { "build": "recommend_only", "operational": "supervised" },
  "mode_3a": { "build": "recommend_only", "operational": "autonomous" }
}
```

Read: "FlowAI may crawl my product (Op-Autonomous in Mode 1 and 3A) and may run market research calls (Op-Autonomous in Mode 1) but may NEVER write code or deploy without my explicit instruction (Build=Recommend-only everywhere). For new spec generation (Mode 2), even API calls go through human approval (Op-Supervised) because spec scoping touches sensitive business context."

This is appropriate when an operator is **first onboarding** their product into FlowAI governance and wants maximum visibility into FlowAI's actions before raising any ceiling.

**Example 2 — Production-trusted assessment + supervised renewal:**

```json
{
  "mode_1":  { "build": "supervised",     "operational": "autonomous" },
  "mode_2":  { "build": "recommend_only", "operational": "autonomous" },
  "mode_3a": { "build": "recommend_only", "operational": "autonomous" }
}
```

Read: "FlowAI may freely crawl + analyze my product across all modes (Op-Autonomous everywhere). For Mode 1 renewal (SUB-1B fork-and-fix or DEPLOY), FlowAI may propose code changes + deploy actions — but I approve each one (Build=Supervised in Mode 1). For new specs (Mode 2) and benchmarks (Mode 3A) FlowAI doesn't write code at all (Build=Recommend-only), only delivers specs/reports."

This is appropriate for a **production-trusted assessment posture** — the operator trusts FlowAI's crawl + analysis pipeline fully but retains gate authority over every code change and deploy in Mode 1's renewal pipeline.

**Example 3 — Hands-off Mode 1 with conservative Mode 2/3A:**

```json
{
  "mode_1":  { "build": "autonomous",     "operational": "autonomous" },
  "mode_2":  { "build": "recommend_only", "operational": "supervised" },
  "mode_3a": { "build": "recommend_only", "operational": "supervised" }
}
```

Read: "Mode 1 SUB-1B PREVIEW runs fully hands-off — FlowAI crawls, finds issues, fixes, redeploys to preview, all without my intervention. (Only critical gates fire: XSS, auth-gate-leak, destructive-action triggers.) But for new product specs (Mode 2) and benchmarks (Mode 3A), I want both gate approval per API call (Op-Supervised) and no code writes (Build=Recommend-only)."

This is appropriate when the operator has **proven Mode 1 SUB-1B PREVIEW reliability over time** and trusts the fork-and-fix preview cycle, while keeping conservative posture on the higher-cost / higher-risk Mode 2 and Mode 3A activities.

**Common pattern across all three examples:** the per-mode + per-dimension granularity allows the operator to express asymmetric trust — high trust where risk is low (crawling, recommend-only modes) and low trust where risk is high (autonomous deploy, new spec generation). A single global ceiling cannot express this asymmetric trust; per-mode-per-dim ceiling can.

### §A.3 — Dimension 3: Execution Mode (per-run pacing; unchanged from v2)

- **AUTOMATIC** — all 8 steps run sequentially, one launch → full report.
- **GUIDED** — pipeline pauses at each step; human approves/modifies/skips before next runs.
- **MANUAL** — human triggers each step explicitly.

**Bounded by authority ceilings:** AUTOMATIC requires both Build-Auth + Op-Auth at Autonomous (or both at Recommend-only). Any Supervised authority level forces GUIDED or MANUAL execution (per §B.2 rule).

### §A.4 Axis reconciliation with prior canonical (Rev-2.1 — updated for v3)

v3 promotes **four canonical orthogonal axes** (Locked Rule 4 amendment):
1. **Orchestra Selection axis** (Auto / Recommended / User-Choice; unchanged from Rev-2.1 §25 Locked Rule 4).
2. **Pipeline Mode axis** (Mode 1 / Mode 2 / Mode 3A; NEW per v3 Dim 1 — 3 modes, not 4 as in v2 because Mode 3B deferred).
3. **Authority axis with 2 sub-dimensions** (Build / Operational, each 3-level; NEW per v3 Dim 2 — 2 sub-dims, not 3 as in v2 because Deploy folded into Build). **Deprecates** §8a single-axis System Operation labels with the following backwards-compat mapping (§8a labels map to Operational-Authority specifically):
   - Hands-Off (§8a) → Operational-Authority Autonomous
   - Reviewed (§8a) → Operational-Authority Supervised
   - Hands-On (§8a) → Operational-Authority Recommend-only
   - Build-Authority is NEW; no §8a precursor.
4. **Execution Pacing axis** (Automatic / Guided / Manual; per-run; supersedes any "single-dim Auto/Guided/Manual" reference).

---

## §B — The Collapsed Configuration Matrix (v3)

With Mode 3B removed and Deploy-Authority folded into Build, the canonical configuration space shrinks. The full Cartesian is now `3 modes × 3 execution × 3^2 authority combos = 81 raw cells`. Most are degenerate per §B.2 validity rules. v3 catalogues **~12 non-degenerate canonical configurations**.

### B.1 Non-degenerate canonical configurations (v3 — ~12 cells)

| # | Configuration | Output | Today status |
|---|---|---|---|
| 1 | Mode 1 SUB-1A / Build=Rec / Op=Rec / Automatic | Audit report + fix list | **BUILT** (most common production path) |
| 2 | Mode 1 SUB-1A / Build=Rec / Op=Rec / Guided | Audit report + fix list, step-approval | **BUILT** (UX-C Guided sidebar) |
| 3 | Mode 1 SUB-1A / Build=Rec / Op=Rec / Manual | Audit report + fix list, human-cadence | **BUILT** (UX-C Manual sidebar) |
| 4 | Mode 1 SUB-1A / Build=Rec / Op=Supervised / Guided | Audit report with per-crawl approval gate | **PARTIAL** (gate UX wired for some steps) |
| 5 | Mode 1 SUB-1A / Build=Rec / Op=Autonomous / Automatic | Audit report; full autonomous crawl + analyse | **BUILT** (per W2 PHASE-1-PROOF 2026-05-16 — `saigedemo.com`, `pagesCrawled: 6`, `depth: 8`, `fallbackUsed: false`) |
| 6 | Mode 1 SUB-1B PREVIEW / Build=Supervised / Op=Autonomous / Guided | Renewed preview URL + delta; each code change human-approved; crawl autonomous | **PARTIAL** (Self-Renewal Executor draft per CA-7; per-step build-approval UI pending) |
| 7 | Mode 1 SUB-1B PREVIEW / Build=Autonomous / Op=Autonomous / Automatic | Hands-off renewed preview URL + delta | **PARTIAL** ("set and forget" preview; Self-Renewal Executor graduation pending) |
| 8 | Mode 1 SUB-1B DEPLOY / Build=Supervised / Op=Supervised / Guided | Original-host push with every action human-approved | **ROADMAP** (source acquisition + deploy credentials + Acceptance Gate unbuilt) |
| 9 | Mode 1 SUB-1B DEPLOY / Build=Autonomous / Op=Autonomous / Automatic | Hands-off audit + fix + push to original host | **ROADMAP** (most-autonomous Mode 1 path) |
| 10 | Mode 2 SUB-2A SPEC / Build=Rec / Op=Rec / Automatic | Spec deliverable | **BUILT** (LLM-dispatch spec producible today) |
| 11 | Mode 2 SUB-2A SPEC / Build=Rec / Op=Rec / Guided | Spec deliverable, step-approval | **BUILT** |
| 12 | Mode 2 SUB-2A SPEC / Build=Rec / Op=Rec / Manual | Spec deliverable, human-cadence | **BUILT** |
| 13 | Mode 2 SUB-2A SPEC / Build=Rec / Op=Supervised / Guided | Spec deliverable with per-research-call human approval (high-context business spec generation) | **PARTIAL** (research-call gating selective) |
| 14 | Mode 3A BENCHMARK / Build=Rec / Op=Autonomous / Automatic | Comparative report (2+ URLs) | **PARTIAL** (sequential single-URL today; parallel + cross-URL synthesis unbuilt) |
| 15 | Mode 3A BENCHMARK / Build=Rec / Op=Supervised / Guided | Comparative report, per-crawl human-approved | **PARTIAL** |

**~12 canonical configurations** (the table lists 15 but several Mode 1 SUB-1A entries are pacing-variants of the same authority combo — the distinct-authority-combo count is ~12). Catalogue intentionally excludes intermediate combinations rejected by §B.2 validity rules.

### B.2 Configuration validity rules + AutoRunner enforcement contract (per Q6-v3 strengthening)

The following 6 rules determine whether a `{mode, sub-mode, build-auth, op-auth, execution}` tuple is **valid** (canonical) or a **runtime configuration error**. **AutoRunner enforces all 6 rules at the `POST /api/orchestrator/run` submission boundary** — invalid configurations return HTTP 400 with a specific error code per rule violated.

| Rule # | Constraint | HTTP 400 error code | Concrete runtime error example |
|---|---|---|---|
| 1 | **SUB-1A path** (Mode 1 SUB-1A): Build-Auth MUST be `Recommend-only`. SUB-1A by definition does not modify code. | `CONFIG_SUB1A_BUILD_ELEVATED` | Request: `{mode: 1, sub: '1A', build: 'autonomous', op: 'autonomous'}` → HTTP 400 `{code: 'CONFIG_SUB1A_BUILD_ELEVATED', message: 'Mode 1 SUB-1A produces audit + fix list only; cannot have Build-Authority above recommend_only'}` |
| 2 | **SUB-1B PREVIEW / SUB-1B DEPLOY path** (Mode 1 SUB-1B): Build-Auth MUST be `Supervised` or `Autonomous` (not `Recommend-only` — SUB-1B by definition modifies + deploys). | `CONFIG_SUB1B_BUILD_TOO_LOW` | Request: `{mode: 1, sub: '1B-PREVIEW', build: 'recommend_only', op: 'autonomous'}` → HTTP 400 `{code: 'CONFIG_SUB1B_BUILD_TOO_LOW', message: 'Mode 1 SUB-1B deploys; Build-Authority must be at least supervised'}` |
| 3 | **Mode 2 SUB-2A** (spec deliverable, no code, no deploy): Build-Auth MUST be `Recommend-only`. SUB-2A produces a spec only. | `CONFIG_SUB2A_BUILD_ELEVATED` | Request: `{mode: 2, sub: '2A', build: 'autonomous', op: 'recommend_only'}` → HTTP 400 `{code: 'CONFIG_SUB2A_BUILD_ELEVATED', message: 'Mode 2 SUB-2A produces spec deliverable only; cannot have Build-Authority above recommend_only'}` |
| 4 | **Mode 3A BENCHMARK** (no new URL): Build-Auth MUST be `Recommend-only`. Mode 3A produces a report only. | `CONFIG_MODE3A_BUILD_ELEVATED` | Request: `{mode: '3A', build: 'supervised', op: 'autonomous'}` → HTTP 400 `{code: 'CONFIG_MODE3A_BUILD_ELEVATED', message: 'Mode 3A produces comparative report only; cannot have Build-Authority above recommend_only'}` |
| 5 | **AUTOMATIC + any Supervised** is degenerate (every gate auto-blocks the run). Execution=AUTOMATIC requires Build-Auth AND Op-Auth both at Autonomous OR both at Recommend-only. | `CONFIG_AUTOMATIC_SUPERVISED_GATE` | Request: `{mode: 1, sub: '1B-PREVIEW', build: 'supervised', op: 'autonomous', exec: 'automatic'}` → HTTP 400 `{code: 'CONFIG_AUTOMATIC_SUPERVISED_GATE', message: 'AUTOMATIC execution cannot proceed with Supervised authority gates; choose GUIDED or MANUAL'}` |
| 6 | **Ceiling violation:** any requested authority level above operator's ceiling for that `(productId, pipelineMode, dimension)` per `ProductRegistry.authorityCeilings`. | `CONFIG_CEILING_VIOLATION` | Request: `{productId: 'tenantA', mode: 1, sub: '1B-PREVIEW', build: 'autonomous', op: 'autonomous'}` when `authorityCeilings.mode_1.build === 'supervised'` → HTTP 400 `{code: 'CONFIG_CEILING_VIOLATION', message: 'Build-Authority autonomous exceeds operator ceiling supervised for mode_1'}` |

Each error envelope additionally includes a `violated_rule_number: 1..6` field for programmatic consumers. The error envelope is logged to GovernanceAuditLog per Rev-2.1 §14 under topic `config.validation.reject.v1` for tamper-evident retention.

### B.3 Operator ceiling interaction with the matrix (unchanged from v2)

`ProductRegistry.authorityCeilings[mode][dimension]` further constrains which canonical cells are reachable per product. v3's 6-cell ceiling shape (3 modes × 2 sub-dims) supersedes v2's 12-cell shape.

---

## §C — UI Mapping (updated for v3)

### C.1 LandingPage.jsx 8 OBJECTIVES → 3 Pipeline Modes (Mode 3B objectives now route to FUTURE_CAPABILITIES)

| OBJECTIVE value | Label | v3 routing |
|---|---|---|
| `audit_demo` | "Audit for prospect demo readiness" | **Mode 1 SUB-1A** |
| `investor_review` | "Prepare for investor review" | **Mode 1 SUB-1A** |
| `full_governance` | "Full governance and clearance cycle" | **Mode 1** (sub-mode user-selects) |
| `compare` | "Compare two or more products" | **Mode 3A BENCHMARK** |
| `combine` | "Combine inputs into a unified specification" | **NOT AVAILABLE — see `FUTURE_CAPABILITIES.md` Entry 2** (Mode 3B deferred per CEO D1; objective surface needs UI affordance showing "this capability is not yet available; see deferral document") |
| `benchmark` | "Benchmark against competitors" | **Mode 3A BENCHMARK** |
| `launch_readiness` | "Launch readiness check" | **Mode 1 SUB-1A** |
| `custom` | "Custom — I will describe my objective" | **any of the 3 canonical modes**, user-defined |

### C.2 "Mode: Supervised" UI header → 2-sub-dim grid (v3 shrinks from v2's 3-row grid)

```
Authority (operator ceiling for current product/mode):
  Build:        [Auto / Supervised / Rec-only]
  Operational:  [Auto / Supervised / Rec-only]
```

Read-only for non-admin. Admin sees "Edit ceilings" affordance.

### C.3 "Auto / Guided / Manual" Step 3 selector → Dim 3 (unchanged)

Maps to Execution Mode per §A.3.

### C.4 Per-run authority selector (v3 — 2 pickers, not 3)

When a user submits a run, the LandingPage flow adds an "Authority for this run" sub-step with two pickers (Build / Operational), each bounded by the operator's per-mode ceiling per §A.2.4. Defaults to operator's ceiling. User can lower (more restrictive); cannot raise above ceiling.

### C.5 Net UI changes implied by CA-12 v3 (engineering follow-up)

- LandingPage adds 2 authority pickers per run (down from 3 in v2).
- Sidebar "Mode: Supervised" indicator becomes 2-row indicator.
- `ProductRegistry.authorityCeilings` JSONB column with 6-cell shape (3 modes × 2 sub-dims).
- "Combine inputs" objective requires UI affordance pointing to `FUTURE_CAPABILITIES.md` Entry 2.

---

## §D — Pipeline Step Agent Ownership per Mode (v3 — Mode 3B references removed)

| Step | Mode 1 | Mode 2 SUB-2A | Mode 3A |
|---|---|---|---|
| 1 Research | Agent #21 ACE Conductor (DORMANT) | Agent #6 Research (DORMANT) | Agent #21 × N parallel (DORMANT) |
| 2 Design | Agent #7 critique existing (DORMANT) | Agent #7 generate new (DORMANT) | per-URL Mode 1 step 2 |
| 3 Build | Agent #2 Code Builder (SHIPPED-GREEN); audit in SUB-1A; apply in SUB-1B via Self-Renewal Executor (CA-7 §15.5) | Agent #2 produces build plan (SHIPPED-GREEN; spec only) | per-URL Mode 1 step 3 |
| 4 QA | Agent #8 5-dim score (DORMANT) | Agent #8 audit spec (DORMANT) | per-URL Mode 1 step 4 |
| 5 Deploy | Orchestrator path (Vercel adapter via Self-Renewal Executor for SUB-1B) | n/a (no deploy in SUB-2A) | n/a (no deploy in 3A) |
| 6 Self-Renewal | Agent #3 SHIPPED-GREEN; SUB-1B routes to Self-Renewal Executor | Agent #3 spec-improvement recs | Agent #3 cross-URL comparative-report logic (ROADMAP) |
| 7 GTM | Agent #9 (DORMANT) | Agent #9 GTM readiness for spec | Agent #9 comparative GTM ranking |
| 8 Monitor | Agent #10 (DORMANT) | Agent #10 final clearance | Agent #10 per-URL + aggregate |

Mode 3B-related agent references from v2 §D are **removed in v3**. Cross-cutting agents (#1, #11–#20, #26) intervene opportunistically across all 3 canonical modes — unchanged from v2.

---

## §E — Honest Capability Boundary Table (v3 — Mode 3B removed, Deploy-Auth folded)

| Configuration | Built today | Partial | Roadmap | Blocked by |
|---|---|---|---|---|
| Mode 1 SUB-1A / Op-Auth Autonomous / Automatic | **BUILT** — multi-page public crawl per W2 PHASE-1-PROOF 2026-05-16 | — | — | — |
| Mode 1 SUB-1A / Op-Auth Supervised / Guided | — | **PARTIAL** — UX-C wired | Consistent gate UX across all 8 steps | UX work |
| Mode 1 SUB-1A / Op-Auth any / Manual | — | **PARTIAL** | All 8 steps independently triggerable | UX work |
| Mode 1 SUB-1A / authenticated crawl | — | Credential plumbing scaffolded | Phase 3 spec for auth-gated crawl | Panel ratification of auth crawl spec |
| Mode 1 SUB-1B PREVIEW / Build=Supervised+ / Op=Autonomous | — | **PARTIAL** — `api/renew.js` (`9b4e511`); Self-Renewal Executor drafted (CA-7) | End-to-end source-level patch + redeploy | Self-Renewal Executor graduation + per-step build-approval UI |
| Mode 1 SUB-1B PREVIEW / Build=Autonomous / Op=Autonomous / Automatic | — | **PARTIAL** | Hands-off preview path proven | Same as above + auto-approve safety gates (XSS / auth-leak) |
| Mode 1 SUB-1B DEPLOY (push to original host) | — | — | **ROADMAP** | Source + deploy credentials + Acceptance Gate + admin-role gates per §13 |
| Mode 2 SUB-2A SPEC / all Rec / any execution | **BUILT** — spec deliverables via LLM dispatch | — | — | — |
| ~~Mode 2 SUB-2B BUILD~~ | **DEFERRED FROM SSOT** per CEO D3 v2; see `docs/specs/FUTURE_CAPABILITIES.md` Entry 1 | — | — | — |
| Mode 3A BENCHMARK / Build=Rec / Op=Autonomous / Automatic | — | **PARTIAL** — sequential single-URL today | Parallel multi-URL + cross-URL synthesis | Synthesis step + Agent #21 × N parallel + Agent #3 cross-URL logic |
| Mode 3A BENCHMARK / Op-Auth Supervised / Guided | — | **PARTIAL** | Consistent gate UX | UX work |
| ~~Mode 3B SYNTHESIZE~~ | **DEFERRED FROM SSOT v3** per CEO D1; see `docs/specs/FUTURE_CAPABILITIES.md` Entry 2 | — | — | — |
| Dim 2a Build-Authority Autonomous | — | **PARTIAL** — `recommend_only` wired across all 26 agents; `auto_write_internal` charter pattern proven by Self-Renewal Executor (CA-7) + Agent #26 (CA-9-B); full code-write + deploy autonomy unbuilt | Full Build-Authority Autonomous across all 8 steps for Mode 1 SUB-1B | Per-agent `BaseAgent.guard()` amendment + per-run AutoRunner validation per §B.2 |
| Dim 2c Operational-Authority Autonomous | **BUILT (Mode 1)** per W2 PHASE-1-PROOF | **PARTIAL (Mode 2, 3A)** — gates partial | Full Op-Auth Autonomous across all 3 modes | Per-mode gate UX work |
| Dim 2 — any sub-dim Supervised | — | **PARTIAL** — Human Gates wired in operationsEngine.js for some steps per Rev-2.1 §10.2 | Consistent gate UX across all 8 steps × 2 sub-dimensions | UX work + per-step gate-policy declarations |
| Dim 2 — any sub-dim Recommend-only | **BUILT** | — | — | — |
| Dim 3 — AUTOMATIC execution | **BUILT** | — | — | — |
| Dim 3 — GUIDED execution | — | **PARTIAL** | Consistent 8-step gate UX | UX work |
| Dim 3 — MANUAL execution | — | **PARTIAL** | All 8 steps independently triggerable | UX work |
| `ProductRegistry.authorityCeilings` 6-cell JSONB | — | — | **NEW per CA-12 v3** | Schema migration + admin UI + AutoRunner validation per §B.2 |
| §B.2 validity rule enforcement (HTTP 400 with error codes) | — | — | **NEW per CA-12 v3** | AutoRunner submission-boundary validator + 6 error codes + GovernanceAuditLog topic `config.validation.reject.v1` |

**Note:** the v2 capability boundary entries for Build-Authority and Deploy-Authority as separate sub-dimensions are merged into a single Dim 2a Build-Authority row in v3 per the D2 collapse.

---

## §F — SSOT Sections Requiring Update (v3)

Once CA-12 v3 is ratified by Panel + CEO, the following sections in `docs/CANONICAL_REFERENCE.md` require corresponding edits.

### F.1 §9 8-Step Pipeline — mode-dependent step behavior

Each row gains a mode-conditional behavior footnote. **3 modes** in canonical SSOT v3 (Mode 1, Mode 2 SUB-2A, Mode 3A). Mode 3B references in canonical SSOT removed; pointer to `FUTURE_CAPABILITIES.md` Entry 2.

### F.2 §10 Self-Governance Layer — two-sub-dimension authority canonicalized

New sub-section **§10.3 Authority Sub-Dimensions (CA-12 v3 Dim 2)** with Build / Operational definitions + per-product per-mode per-dimension ceiling storage in `ProductRegistry.authorityCeilings` 6-cell JSONB shape per §A.2.4.

### F.3 §11 Clearance Protocol — mode-dependent outputs

§11 six clearance steps remain; outputs gated by Step 5 (Demo Readiness) vary by Pipeline Mode (Mode 1 / Mode 2 SUB-2A / Mode 3A — Mode 3B removed).

### F.4 §6 ACE — verified compatible; no edit

Agent #21 invocation in Mode 1 + Mode 3A is mode-agnostic at §6 contract layer.

### F.5 §22 Product-Agnostic Rule — verified compatible; no edit

The GTM context in §A.0 names products in prose preamble only; spec code/schemas/identifiers product-name-free. `authorityCeilings` field is product-id-keyed via metadata per §3 / §22 pattern.

### F.6 §17 / §8a labels deprecated → Operational-Authority sub-dimension only

§8a labels (Hands-Off / Reviewed / Hands-On) deprecate in favor of CA-12 v3 Dim 2c (Operational-Authority) with 1:1 mapping. Build-Authority is NEW; no §8a precursor. Sidebar labels at §17 remain at UX surface per existing §17 footnote (a).

### F.7 §25 Locked Rule 4 — four orthogonal axes (revised count from v2: Build/Operational sub-dims instead of Build/Deploy/Operational)

Locked Rule 4 amended to canonicalize **four orthogonal axes** with the 2-sub-dim authority structure per v3:
1. Orchestra Selection axis (unchanged).
2. Pipeline Mode axis (NEW per v3 Dim 1; 3 modes — Mode 3B deferred).
3. Authority axis with 2 sub-dimensions (Build / Operational, each 3-level; NEW per v3 Dim 2).
4. Execution Pacing axis (Automatic / Guided / Manual).

### F.8 §15.1 Roster — no agent charter changes

CA-12 v3 references existing charters; no new agent.

### F.9 NEW — pointer to `docs/specs/FUTURE_CAPABILITIES.md` Entries 1 + 2

§9 + §F.1 footnote: Mode 2 SUB-2B catalogued at FUTURE_CAPABILITIES Entry 1; Mode 3B catalogued at Entry 2. Both items return via single future CA amendment when blockers resolved per §A.1.2 cross-reference.

---

## §G — Seven Panel Questions (v3 — per v2 verdicts + CEO D1/D2/D3)

Each v3 question states v1 verdict + v2 verdict + v3 change applied. Neutral options + INSUFFICIENT_INFORMATION. No anchoring, no "(as drafted)".

### G-Q1-v3 — Pipeline Mode classification (Mode 3B removed in v3)

**v1 verdict:** `QUORUM_PLURALITY_GQ1-OVERLAP` (7/9).
**v2 verdict:** `UNANIMOUS_GQ1v2-RESOLVED` (8/8) — mode-overlap fix accepted.
**v3 change:** Mode 3B removed entirely from SSOT canonical per CEO D1. v3 has 3 canonical modes (Mode 1, Mode 2 SUB-2A, Mode 3A). Mode 3B catalogued at `FUTURE_CAPABILITIES.md` Entry 2.

**v3 ratification options:**
- (a) 3-canonical-mode classification (Mode 1 + Mode 2 SUB-2A + Mode 3A) is complete and non-overlapping — ratify.
- (b) 3-mode classification is missing a mode — name it.
- (c) 3-mode classification still has an overlap — name it.
- (d) Removing Mode 3B from SSOT was the wrong call; Mode 3B should stay in SSOT with deferred-status tag.
- (e) INSUFFICIENT_INFORMATION.

### G-Q2-v3 — Authority dimensions (collapsed to 2 sub-dims in v3 per CEO D2)

**v1 verdict:** `PLURALITY_GQ2-THREEPLUS` (5/9).
**v2 verdict:** `SPLIT` 3/8 THREE vs 3/8 TWO.
**v3 change:** Authority collapsed to 2 sub-dimensions per CEO D2. Deploy-Authority folds into Build-Authority (you build to deploy — not separable in practice). v3 has Build-Authority (Dim 2a) + Operational-Authority (Dim 2c) only. Ceiling JSONB shrinks from 12 cells (v2: 4×3) to 6 cells (v3: 3×2).

**v3 ratification options:**
- (a) 2-sub-dimension structure (Build / Operational) as v3 defines — ratify.
- (b) 2-sub-dim is right; Deploy should remain separate (re-split per v2 model).
- (c) 1-sub-dim is sufficient (collapse Build + Operational into a single authority).
- (d) 3+ sub-dimensions needed for a specific operational concern — name it.
- (e) INSUFFICIENT_INFORMATION.

### G-Q3-v3 — Authority ceiling per-product per-mode per-dimension (v3 + 3 concrete examples)

**v1 verdict:** `PLURALITY_GQ3-PER-MODE` (5/9).
**v2 verdict:** `PLURALITY_GQ3v2-FINE` (5/8) — over-engineered objection cited.
**v3 change:** ceiling structure preserved (per-product per-mode per-dimension JSONB) per Q3-v3 explanatory close-out. v3 §A.2.4 adds 3 concrete configuration examples grounded in the §A.0 GTM context (5 real production-grade operator products) to defuse the over-engineering objection. The granularity is justified by the asymmetric-trust pattern visible in the 3 examples (operator may trust crawl autonomy in Mode 1 but require gates on Mode 2 spec generation).

**v3 ratification options:**
- (a) Per-product per-mode per-dimension ceiling with v3 example justification — ratify.
- (b) Granularity is right but operator UI complexity needs more thought (engineering follow-on must address UX).
- (c) Per-product per-mode only (no per-sub-dim) — coarser.
- (d) Per-product only (no per-mode) — coarsest.
- (e) INSUFFICIENT_INFORMATION.

### G-Q4-v3 — Mode 2 SUB-2B deferral + Mode 3B joint deferral (v3 strengthens cross-reference)

**v1 verdict:** `QUORUM_PLURALITY_GQ4-DEFER` (7/9).
**v2 verdict:** `PLURALITY_GQ4v2-DEFER` (5/8) — still preferred but quorum slipped.
**v3 change:** §A.1.2 cross-reference strengthened — Mode 3B added to deferred set alongside SUB-2B; both items will return via a single future CA amendment when their respective blockers resolved. This pairing reflects shared architectural dependency on autonomous-build infrastructure.

**v3 ratification options:**
- (a) Joint deferral of SUB-2B + Mode 3B with shared-future-CA pathway — ratify.
- (b) Defer separately (each item gets its own future CA cycle independently).
- (c) Re-promote SUB-2B or Mode 3B as ROADMAP-in-canonical-SSOT (reverse the deferral).
- (d) Defer additional items (e.g., Mode 1 SUB-1B DEPLOY) to FUTURE_CAPABILITIES alongside SUB-2B + Mode 3B.
- (e) INSUFFICIENT_INFORMATION.

### G-Q5-v3 — Mode 3B deferral closure (Mode 3B fully removed in v3)

**v1 verdict:** `PLURALITY_GQ5-RESTRICT` (5/9).
**v2 verdict:** `PLURALITY_GQ5v2-3PV` (6/8) — Panel preferred third-party verification (DNS-TXT) over self-attestation.
**v3 change:** Mode 3B removed from canonical SSOT entirely per CEO D1. Catalogued at `FUTURE_CAPABILITIES.md` Entry 2 with explicit blocker: cryptographic URL ownership-verification mechanism (DNS-TXT or equivalent) must be designed, built, Panel-ratified separately before Mode 3B returns to SSOT.

**v3 ratification options:**
- (a) Defer Mode 3B entirely; ratify removal from SSOT pending verification mechanism — ratify.
- (b) Mode 3B should stay in SSOT with DEFERRED status tag, not removed.
- (c) Mode 3B should ship with the v2 self-attestation mechanism (operator attests; no third-party verification).
- (d) Mode 3B is structurally inadvisable regardless of mechanism (IP concerns inherent to feature extraction).
- (e) INSUFFICIENT_INFORMATION.

### G-Q6-v3 — Matrix + validity rules with AutoRunner enforcement contract

**v1 verdict:** `SUPERMAJORITY_GQ6-COLLAPSE` (8/9).
**v2 verdict:** `PLURALITY_GQ6v2-16` (5/8) — collapse preferred but enforcement gap cited.
**v3 change:** matrix further shrunk to ~12 cells (was ~16 in v2) due to Mode 3B removal + Deploy-Authority fold. §B.2 strengthened with: (1) concrete runtime error examples per rule violated; (2) explicit AutoRunner enforcement contract (HTTP 400 with 6 specific error codes); (3) every rejection logged to GovernanceAuditLog under `config.validation.reject.v1`.

**v3 ratification options:**
- (a) v3 matrix + §B.2 validity rules + AutoRunner HTTP 400 enforcement contract — ratify.
- (b) Matrix is right but enforcement mechanism is wrong (e.g., should be agent-layer gate, not API-boundary 400).
- (c) Some validity rules are too strict (e.g., AUTOMATIC + Supervised should be permitted with explicit warning).
- (d) Some validity rules are too permissive (specify which combinations need additional gates).
- (e) INSUFFICIENT_INFORMATION.

### G-Q7-v3 — Overall CA-12 v3 disposition

**v1 verdict:** `PLURALITY_REJECT` (5/9).
**v2 verdict:** `PLURALITY_GQ7v2-V3` (4/8) — Panel directed v3 revision.
**v3 change:** all conditions addressed; CEO D1/D2/D3 applied. Per CEO D3, the 5 target operator products are real production-grade GTM products (per §A.0 context), so re-Panel on v3 spec is sufficient for promotion — no need to wait for prototype implementations because the implementation targets are themselves production deployments, not prototypes.

**v3 ratification options:**
- (a) v3 sufficient for promotion — promote.
- (b) v3 addresses conditions in form but not in substance — name remaining substantive gaps.
- (c) v3 introduces new concerns not in v2 — name them.
- (d) Defer until at least one operator product runs a v3-conformant production pipeline end-to-end (requires `authorityCeilings` migration + AutoRunner enforcement + per-mode UI rollout per §F to land first).
- (e) INSUFFICIENT_INFORMATION.

---

## SSOT Conflicts Newly Surfaced in v3 Revision

The v2 revision surfaced Conflicts 7–11 (v2 §SSOT Conflicts). v3 introduces / refines:

### Conflict 12 (NEW v3) — `ProductRegistry.authorityCeilings` 6-cell JSONB is a smaller migration than v2's 12-cell

v2's 12-cell JSONB (4 modes × 3 sub-dims) becomes v3's 6-cell JSONB (3 modes × 2 sub-dims). Schema migration is still additive but with a different default-value shape. Existing draft scripts targeting v2's shape need to be rewritten before engineering follow-on lands.

### Conflict 13 (NEW v3) — `FUTURE_CAPABILITIES.md` now contains TWO entries

Entry 1 (SUB-2B per v2) + Entry 2 (Mode 3B per v3) co-exist. The cross-reference in §A.1.2 commits to a SINGLE future CA amendment to re-introduce both when their blockers resolve — implying the two return together, not separately. This is a design commitment per CEO D1 + Q4-v3 strengthening, but it's the first time `FUTURE_CAPABILITIES.md` has multiple entries with explicit shared-future-CA pathway.

### Conflict 14 (NEW v3) — GTM context preamble naming products in canonical-document prose is a new pattern

Rev-2.1 §22 Product-Agnostic Rule has been interpreted strictly to mean "no product names anywhere in canonical documents." v3 §A.0 introduces a controlled exception: product names appear in **prose preamble for architectural context only**, never in spec code/schemas/identifiers. Panel may push back on this pattern. If Panel rejects, the GTM context can be moved to a separate non-canonical document (e.g., `docs/CONTEXT_NOTES.md`) and §A.0 reduced to a cross-reference. **Surface for Panel Q7 consideration.**

**v2 Conflicts 7, 8, 10, 11 retained** (Conflict 9 superseded by v3 Dim 2 axis revision; Conflict 8 attestation mechanism withdrawn because Mode 3B removed from SSOT entirely).

---

## Provenance (v3)

| Source | Used for |
|---|---|
| v2 CA-12 spec commit `ce13629` | Baseline for v3 revisions |
| v2 Panel transcript `docs/panel-consultations/ca12-ratification-v2-2026-05-16.md` | All 6 v2 conditions + 21 distinct objections informing v3 changes |
| CEO Decision D1 (defer Mode 3B entirely) | §A.1.4 removal + `FUTURE_CAPABILITIES.md` Entry 2 + Q5-v3 closure |
| CEO Decision D2 (collapse to 2 authority sub-dims) | §A.2 restructure + 6-cell ceiling JSONB + §B.2 reduced rule set |
| CEO Decision D3 (re-Panel on v3; no need for prototypes) | §A.0 GTM context preamble + §G Q7-v3 ratification framing |
| CEO Dispatch #4 critical context (5 real GTM products) | §A.0 preamble verbatim |
| (all v2 provenance retained) | unchanged |
| 2026-05-16 W2 Phase 1 production proof | §E BUILT anchor (unchanged from v2) |

*End of CA-12 v3 draft. Pending W6 re-ratification + CEO ratification per §18.*
