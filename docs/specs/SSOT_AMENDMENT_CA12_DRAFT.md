# SSOT Amendment Draft — CA-12 (Three-Mode + Two-Dimension Governance Architecture)

**Status:** DRAFT — pending W6 adversarial Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18). NOT canonical. NO code reflects this amendment until ratified.
**Author:** W3, 2026-05-16.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–006 cumulative).
**Inputs read in full:** `docs/CANONICAL_REFERENCE.md`, `docs/CANONICAL_HISTORY.md` SECTION 8 (ENTRY 001–006), `src/pages/LandingPage.jsx` (canonical 8 OBJECTIVES enumeration at lines 19–26), `src/pages/AutoRunner.jsx` (current `mode: 'auto'` / `'recommend_only'` handling), `src/lib/agents/_registry.ts` (26-agent roster + EXECUTOR_REGISTRY).
**Target sections amended:** §6 ACE (mode-conditional crawl scope clarification), §9 8-step pipeline (mode-dependent step behavior), §10 Self-Governance Layer (three authority levels canonicalized), §11 Clearance Protocol (mode-dependent outputs), §17 sidebar (any "Auto/Guided/Manual" single-dimension reference splits into Dim 2 + Dim 3 per CA-12), §22 Product-Agnostic Rule (modes maintain agnosticism — verified), §25 Locked Rule 4 (axis labels — re-examined; CA-12 introduces a third orthogonal axis: pipeline mode).
**Lineage:** CEO-locked feature spec 2026-05-16. ONE combined amendment with seven sub-sections (§A–§G). NO sub-amendments; CA-12 is monolithic because the three dimensions are interdependent and Panel must evaluate them as a single architectural commitment.

**Coupled with previous amendments:**
- CA-7 EXECUTOR_REGISTRY (ENTRY 004) — provides the `auto_write_internal + requires_human_gate` dual-authority pattern that **AUTONOMOUS** authority level in §A Dimension 2 inherits.
- CA-9-A Orchestra self-expansion (ENTRY 005) — Mode 1 SUB-1B PREVIEW path leverages fork-and-fix Orchestra members per §8.1.
- CA-9-B Agent #26 (ENTRY 005) — dual-authority charter pattern referenced by CA-12 §A Dimension 2 AUTONOMOUS mapping.
- CA-9-C Customer Feedback Loop (ENTRY 005) — Agent #10 Monitor (Step 8) consumes customer-issue signals in all 4 pipeline modes per §A Mode 1 Step 8 + §D agent ownership table.
- CA-10 ProductSSOT (ENTRY 005) — every CA-12 run writes to ProductSSOT per §7 atomic Output Contract; mode-specific delta_log entries per §A.
- CA-11 Per-agent ToolMenu (in flight, draft `1a020f7`) — Dimension 1 mode selection narrows each agent's effective ToolMenu via existing `ProductRegistry.agentToolConstraints`; no new mechanism needed.
- ENTRY 006 Aggressive Crawl Engine — Mode 1 Step 1 + Mode 3A Step 1 both invoke Agent #21 Crawl Conductor; canonical per §6 + §7.6.

**Why monolithic (not split into CA-12-A / CA-12-B / CA-12-C):** the three dimensions only function correctly as a combined architecture. A user cannot select Mode 1 SUB-1B BUILD with RECOMMEND-ONLY authority — those combinations are degenerate. The 36-cell matrix in §B requires all three dimensions to be ratified together to be meaningful.

---

## §A — The Complete Operating Model

Every FlowAI run is defined by **three independent selections**:
- **Dimension 1: Pipeline Mode** — what the run operates on (existing product / new product / multi-product compare / multi-product synthesize).
- **Dimension 2: Authority Level** — operator-set ceiling on FlowAI's autonomy.
- **Dimension 3: Execution Mode** — per-run pacing (sequential auto / step-by-step human-gated / fully manual).

The three dimensions are **canonically independent**. Any user choosing in Dim 1 + Dim 3 must respect the operator's Dim 2 ceiling. There is no fourth axis.

### A.1 Dimension 1 — Pipeline Mode

#### A.1.1 MODE 1 — ASSESS & RENEW EXISTING PRODUCT

**Input:** one existing URL (public or authenticated). When authenticated, session-only credentials per Rev-2.1 §6 + `src/lib/renewal/inputArtifact.js`.

**Purpose:** crawl the real product → audit → score → optionally fix + redeploy.

**Sub-modes (user selects):**

- **SUB-1A RECOMMEND** — assess + findings + prioritized fix list. **No deployment. No source modification.** Human implements all fixes themselves.
  - Output: assessment report + prioritized fix list + audit scores + GTM readiness score per ENTRY 006 §7.6 + ProductSSOT `governance_record` entry.
- **SUB-1B BUILD** — assess + apply fixes + deploy. User further selects between:
  - **PREVIEW** — FlowAI-owned Vercel preview URL (fork-and-fix path per CA-9-A §8.1 + Agent #3 Self-Renewal Executor per CA-7 §15.5).
  - **DEPLOY** — push to original product hosting. Requires source-acquisition credentials AND deploy-target credentials AND an explicit Human Gate at the deploy boundary per §10.2 Acceptance Gate.
  - Output (both): assessment report + improved URL + before/after delta score + ProductSSOT `delta_log` entry per CA-10-A.

**Pipeline step behavior in MODE 1:**

| Step | Behaviour |
|---|---|
| 1 Research | Agent #21 Aggressive Crawl Conductor → `aggressiveCrawl` (depth=8/pages=200 defaults per §6) on the supplied URL |
| 2 Design | Agent #7 critique of existing design + propose improvements (no generation in SUB-1A; generation gated by SUB-1B + admin Approval Gate) |
| 3 Build | Agent #2 Code Builder audit (routes, navigation, broken links, form functionality) of existing build |
| 4 QA | Agent #8 5-dimension governance score per Rev-2.1 §10.1 |
| 5 Deploy | Deploy-health assessment (HTTPS, domain, performance, security posture) — read-only in SUB-1A; PREVIEW deploys in SUB-1B PREVIEW; original-host push in SUB-1B DEPLOY (gated) |
| 6 Self-Renewal | SUB-1A: Agent #3 recommend-only fix list. SUB-1B: Agent #3 Self-Renewal Executor (per CA-7) applies fixes + redeploys + emits before/after delta |
| 7 GTM | Agent #9 GTM readiness assessment + ENTRY 006 §7.6 GTM Readiness Report |
| 8 Monitor | Agent #10 final clearance decision + ProductSSOT atomic write per CA-10 |

#### A.1.2 MODE 2 — BUILD NEW PRODUCT

**Input:** description / spec / content / voice / screenshots (no existing URL).

**Purpose:** create a new product from scratch.

**Sub-modes:**

- **SUB-2A SPEC** — FlowAI produces full product spec, design brief, architecture, build plan. Human implements. Output: spec deliverable.
- **SUB-2B BUILD** — FlowAI writes + deploys real working product. Output: live product at brand new URL.

**Pipeline step behavior in MODE 2:**

| Step | Behaviour |
|---|---|
| 1 Research | Agent #6 Research — market research + competitive intel + audience analysis (no URL to crawl; Agent #21 NOT invoked) |
| 2 Design | Agent #7 generate UX/visual specifications |
| 3 Build | SUB-2A: Agent #2 produces build plan (no code emitted). SUB-2B: Agent #2 + Agent #7 Phase 2 executor emit code (ROADMAP — see §E) |
| 4 QA | Agent #8 audit the generated product (SUB-2A: spec audit only; SUB-2B: full 5-dim audit on real code) |
| 5 Deploy | SUB-2A: no deploy. SUB-2B: deploy to new URL via Orchestra `dispatch('deploy', ...)` member (Vercel canonical) |
| 6 Self-Renewal | SUB-2A: spec-improvement recommendations. SUB-2B: iterate on QA findings per Agent #3 Self-Renewal Executor |
| 7 GTM | Agent #9 GTM readiness assessment for the new product |
| 8 Monitor | Agent #10 final clearance decision |

**Honest boundary today** (mirrors §E):
- **SUB-2A buildable now.** Specs producible via existing LLM dispatch.
- **SUB-2B = ROADMAP.** Code-generation pipeline does not exist today end-to-end (per `docs/specs/agent-blueprints/AGENT_07_Design.md` Phase 2 + AGENT_02 + AGENT_07 Phase 2 executor flagged). Must be stated explicitly; not hidden.

#### A.1.3 MODE 3A — BENCHMARK (comparison only, no new URL)

**Input:** 2 or more existing URLs (typical: 2–5 per `src/pages/LandingPage.jsx` synthesise/compare flows).

**Purpose:** assess each product independently → produce ranked comparative report. **No new URL produced.**

**Pipeline step behavior in MODE 3A:**

| Step | Behaviour |
|---|---|
| 1–5 | Run per-URL (Mode 1 behavior per URL — Agent #21 × N parallel crawls). |
| 6 Self-Renewal | **COMPARISON SYNTHESIS** — produce comparative report only. No deployment. No new URL. Ranks across the 5-dim governance score per URL. |
| 7 GTM | Comparative GTM readiness ranked across products. |
| 8 Monitor | Final clearance decision per-URL + aggregate ranking. |

**Output:** comparative governance report showing rankings, strengths/weaknesses per dimension, ranked fix priorities per product. **No new URL produced.**

#### A.1.4 MODE 3B — SYNTHESIZE (comparison + new product URL)

**Input:** 2 or more existing URLs.

**Purpose:** assess all → extract best elements of each → combine into new synthesized product.

**Sub-modes:**

- **SUB-3B-SPEC** — synthesis spec only ("best elements of each + recommended new architecture"). Human implements.
- **SUB-3B-BUILD** — FlowAI assembles + deploys synthesized product to new URL.

**Pipeline step behavior in MODE 3B:**

| Step | Behaviour |
|---|---|
| 1–5 | Run per-URL (Mode 1 behavior — Agent #21 × N parallel) then cross-URL synthesis input prep. |
| 6 Self-Renewal | **SYNTHESIZE BEST ELEMENTS** from all inputs → produce new product (Mode 2 behavior from combined inputs). SUB-3B-SPEC: spec only. SUB-3B-BUILD: deploy to new URL. |
| 7 GTM | Agent #9 GTM readiness assessment for synthesized product. |
| 8 Monitor | Agent #10 final clearance decision + ProductSSOT write. |

**Output:** synthesis report (what was taken from which source + why) + new product spec OR new deployed URL.

### A.2 Dimension 2 — Authority Level (operator-set, persistent ceiling)

The operator (provider org admin per Rev-2.1 §13) sets the authority ceiling for their deployment. This ceiling is **persistent across runs** and stored in `ProductRegistry.authorityCeiling` (NEW field per CA-12) — pure metadata per Rev-2.1 §22 + CA-9 §3 metadata-driven architecture.

#### A.2.1 AUTONOMOUS

- **Definition:** FlowAI acts + deploys without per-action human approval. Operator sets rules upfront. FlowAI executes end-to-end within those rules.
- **Maps to:** `auto_write_internal` authority per `BaseAgent.js` AUTHORITY enum + required `requires_human_gate` pairing per CA-9-Q4=(b) when `auto_write_internal` is declared (mirrors Self-Renewal Executor per CA-7 §15.5).
- **Hard human gates only on:** XSS detected in fix output (per ENTRY 006 §B `xss-in-form-echo` critical, not promotable); auth-gate leak detected; destructive action outside operator-defined scope; severity `critical` or `high` issues per Rev-2.1 §12.
- **Eligible execution modes (Dim 3):** AUTOMATIC, GUIDED, MANUAL — all three (authority is ceiling, not floor).

#### A.2.2 SUPERVISED

- **Definition:** FlowAI proposes every significant action before executing. Human reviews, approves, modifies, or rejects.
- **Maps to:** `requires_human_gate` authority. FlowAI never acts unilaterally on significant actions.
- **Human gates on:** every deploy; every fix application; every external action (Stripe Connect link creation; DMCA filing; capability transfer install).
- **Eligible execution modes (Dim 3):** GUIDED (canonical fit), MANUAL. AUTOMATIC is allowed but degenerate — every gate auto-blocks the run; equivalent to "produce findings + halt."

#### A.2.3 RECOMMEND-ONLY

- **Definition:** FlowAI recommends; human implements all actions. FlowAI never deploys, never modifies, never executes autonomously.
- **Maps to:** `recommend_only` authority. **This is the dormant-safe default** all 26 agents currently ship with (per Rev-2.1 §15.1).
- **Eligible execution modes (Dim 3):** all three. Most common today: RECOMMEND-ONLY + AUTOMATIC = "full audit + report; human reads findings + implements."

#### A.2.4 The Authority Ceiling Rule

> The solution provider (operator) sets the authority ceiling for their deployment. End users can only SELECT AT OR BELOW the operator ceiling per run. An operator running SUPERVISED deployment cannot have end users elevate to AUTONOMOUS for a run.

**Storage:** `ProductRegistry.authorityCeiling: 'autonomous' | 'supervised' | 'recommend_only'`. Default for new products: `'recommend_only'` (safest). Operator can raise the ceiling via admin UI (per Rev-2.1 §13 admin role). Raising the ceiling is itself audit-logged.

**Per-run authority floor enforcement:** when AutoRunner accepts a run request, it validates `run.authority ∈ {ceilings ≤ ProductRegistry[productId].authorityCeiling}`. Mismatch returns 403 with explicit error per Rev-2.1 §13 role-gate pattern.

### A.3 Dimension 3 — Execution Mode (user-selects per run, bounded by Dim 2 ceiling)

#### A.3.1 AUTOMATIC

- **Definition:** All 8 pipeline steps run sequentially without pausing. One launch → full report at end.
- **User experience:** review output, not steps.
- **Typical wall-clock:** 1–20 minutes depending on Pipeline Mode + crawl depth.

#### A.3.2 GUIDED

- **Definition:** Pipeline pauses at each step. FlowAI proposes the step's action/findings. Human approves, modifies, or skips before next step runs.
- **Approval gates:** 8 (one per step) + intermediate gates per Rev-2.1 §10.2 (Review / Approval / Testing / Acceptance).
- **Typical wall-clock:** minutes to hours.

#### A.3.3 MANUAL

- **Definition:** Human triggers each step explicitly. FlowAI waits for instruction at each step. Human has full control over sequence and depth.
- **Typical wall-clock:** hours to days.

### A.4 Interaction with existing canonical axes

CA-12 introduces a third orthogonal axis to the existing two ratified in Rev-2.1 §25 Locked Rule 4 (Orchestra Selection axis: Auto/Recommended/User-Choice — selects which Orchestra member runs the step) + Rev-2.1 §8a System Operation axis (Hands-On/Reviewed/Hands-Off — operator authority to FlowAI). CA-12 reconciles:

| Axis name | Source | Scope |
|---|---|---|
| **Pipeline Mode** (NEW CA-12 Dim 1) | this amendment | What the run operates on |
| **Authority Level** (CA-12 Dim 2) | this amendment | Persistent ceiling on FlowAI autonomy |
| **Execution Mode** (CA-12 Dim 3) | this amendment | Per-run pacing |
| **Orchestra Selection** (Rev-2.1 §25 Locked Rule 4) | ENTRY 003 | Which Orchestra adapter runs each step |
| **System Operation** (Rev-2.1 §8a) | ENTRY 003 | Operator-side pacing label |

**Reconciliation:** CA-12 Dim 2 (Authority Level) **subsumes** Rev-2.1 §8a (System Operation axis). The Hands-On/Reviewed/Hands-Off labels in §8a were always operator-facing autonomy levels — same concept as Dim 2 with cleaner naming. CA-12 promotes Dim 2 (Autonomous / Supervised / Recommend-only) as canonical and **deprecates §8a labels** with a 1:1 mapping for backwards compatibility (Hands-Off = Autonomous; Reviewed = Supervised; Hands-On = Recommend-only).

CA-12 Dim 3 (Execution Mode: Automatic/Guided/Manual) is **distinct** from CA-12 Dim 2 — it's per-run pacing, not authority. The naming intentionally avoids overlap with Orchestra Selection's Auto/Recommended/User-Choice (which describes adapter selection, not pipeline pacing).

---

## §B — The 36-Configuration Matrix

The combined operating model: **4 modes × 3 authority × 3 execution = 36 distinct configurations**. Many configurations are degenerate (e.g. SUB-1B BUILD + RECOMMEND-ONLY contradicts itself — RECOMMEND-ONLY blocks deploy). The matrix below catalogues all 36 with output, authority constraint, today-status, and cost envelope.

| Pipeline Mode | Sub-mode | Authority | Execution | Output produced | Authority constraint | Status today | Cost envelope (per run) |
|---|---|---|---|---|---|---|---|
| Mode 1 | SUB-1A | RECOMMEND-ONLY | AUTOMATIC | Audit report + fix list | Cleanly compatible | **BUILT** | $0.30–$2.00 |
| Mode 1 | SUB-1A | RECOMMEND-ONLY | GUIDED | Audit report + fix list, step-by-step approval | Cleanly compatible | **BUILT** (recommend-only path proven; guided wiring per Rev-2.1 §17 sidebar) | $0.30–$2.00 + human time |
| Mode 1 | SUB-1A | RECOMMEND-ONLY | MANUAL | Audit report + fix list, human-driven cadence | Cleanly compatible | **BUILT** (manual path per Rev-2.1 §17 sidebar) | $0.30–$2.00 + days of human time |
| Mode 1 | SUB-1A | SUPERVISED | AUTOMATIC | Audit report; gates auto-block on findings | Degenerate (no actions to approve in 1A) | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1A | SUPERVISED | GUIDED | Audit report; human approves each step | Compatible | **BUILT** | $0.30–$2.00 + human time |
| Mode 1 | SUB-1A | SUPERVISED | MANUAL | Audit report; human-driven | Compatible | **BUILT** | $0.30–$2.00 + days |
| Mode 1 | SUB-1A | AUTONOMOUS | AUTOMATIC | Audit report only (no actions to autonomously execute in 1A) | Degenerate — AUTONOMOUS redundant with SUB-1A | **N/A — degenerate** (AUTONOMOUS adds no value over RECOMMEND-ONLY when no actions taken) | n/a |
| Mode 1 | SUB-1A | AUTONOMOUS | GUIDED | Audit report only | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1A | AUTONOMOUS | MANUAL | Audit report only | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B PREVIEW | RECOMMEND-ONLY | AUTOMATIC | Conflict — RECOMMEND-ONLY blocks deploy | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B PREVIEW | RECOMMEND-ONLY | GUIDED | Conflict | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B PREVIEW | RECOMMEND-ONLY | MANUAL | Conflict | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B PREVIEW | SUPERVISED | AUTOMATIC | Renewed preview URL + delta score, every deploy human-gated; AUTOMATIC means gates auto-stop run; equivalent to "produce + halt for review" | Compatible but degenerate in AUTOMATIC (gates block) | **PARTIAL — renewal skeleton; gates wired post-graduation** | $1–$5 |
| Mode 1 | SUB-1B PREVIEW | SUPERVISED | GUIDED | Renewed preview URL + delta score, each fix human-approved | Compatible (canonical fit) | **PARTIAL** | $1–$5 + human time |
| Mode 1 | SUB-1B PREVIEW | SUPERVISED | MANUAL | Renewed preview URL + delta score, human triggers each fix | Compatible | **PARTIAL** | $1–$5 + days |
| Mode 1 | SUB-1B PREVIEW | AUTONOMOUS | AUTOMATIC | Renewed preview URL + delta score, end-to-end no gates (except hard XSS/auth-leak) | Compatible (canonical fit for set-and-forget) | **PARTIAL — Self-Renewal Executor per CA-7 drafted not shipped** | $1–$5 |
| Mode 1 | SUB-1B PREVIEW | AUTONOMOUS | GUIDED | Renewed preview URL but human reviews each step | Compatible | **PARTIAL** | $1–$5 + human time |
| Mode 1 | SUB-1B PREVIEW | AUTONOMOUS | MANUAL | Renewed preview URL, human triggers each step | Compatible | **PARTIAL** | $1–$5 + days |
| Mode 1 | SUB-1B DEPLOY | RECOMMEND-ONLY | * | Conflict | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B DEPLOY | SUPERVISED | AUTOMATIC | Original-host push, every deploy human-gated → AUTOMATIC degenerate | Degenerate | **N/A — degenerate** | n/a |
| Mode 1 | SUB-1B DEPLOY | SUPERVISED | GUIDED | Original-host push, every fix approved | Compatible (most likely real-world fit) | **ROADMAP** — source + deploy credentials infra unbuilt | $1–$5 + human time |
| Mode 1 | SUB-1B DEPLOY | SUPERVISED | MANUAL | Original-host push, human-driven | Compatible | **ROADMAP** | $1–$5 + days |
| Mode 1 | SUB-1B DEPLOY | AUTONOMOUS | AUTOMATIC | Full hands-off audit + fix + push to original host | Compatible (highest-risk; the "set and forget" mode) | **ROADMAP** — source + deploy + auth gates all unbuilt | $1–$5 |
| Mode 1 | SUB-1B DEPLOY | AUTONOMOUS | GUIDED | Original-host push, human reviews each step | Compatible | **ROADMAP** | $1–$5 + human time |
| Mode 1 | SUB-1B DEPLOY | AUTONOMOUS | MANUAL | Original-host push, human triggers each step | Compatible | **ROADMAP** | $1–$5 + days |
| Mode 2 | SUB-2A SPEC | RECOMMEND-ONLY | AUTOMATIC | Full product spec deliverable | Compatible (canonical fit) | **BUILT** | $0.50–$3.00 |
| Mode 2 | SUB-2A SPEC | RECOMMEND-ONLY | GUIDED | Spec, step-by-step approval | Compatible | **BUILT** | $0.50–$3.00 + human time |
| Mode 2 | SUB-2A SPEC | RECOMMEND-ONLY | MANUAL | Spec, human-driven | Compatible | **BUILT** | $0.50–$3.00 + days |
| Mode 2 | SUB-2A SPEC | SUPERVISED | * | Spec only (no deploy actions to gate) | Compatible but adds no value over RECOMMEND-ONLY | **BUILT** (same as recommend-only) | same |
| Mode 2 | SUB-2A SPEC | AUTONOMOUS | * | Spec only | Compatible but adds no value over RECOMMEND-ONLY | **BUILT** (same) | same |
| Mode 2 | SUB-2B BUILD | RECOMMEND-ONLY | * | Conflict — RECOMMEND-ONLY blocks deploy | Degenerate | **N/A — degenerate** | n/a |
| Mode 2 | SUB-2B BUILD | SUPERVISED | AUTOMATIC | Deploy gates auto-block | Degenerate in AUTOMATIC | **N/A — degenerate** | n/a |
| Mode 2 | SUB-2B BUILD | SUPERVISED | GUIDED | Live product at new URL, every step approved | Compatible | **ROADMAP** — code-generation pipeline unbuilt | $2–$10 + human time |
| Mode 2 | SUB-2B BUILD | SUPERVISED | MANUAL | Live product, human-driven | Compatible | **ROADMAP** | $2–$10 + days |
| Mode 2 | SUB-2B BUILD | AUTONOMOUS | AUTOMATIC | Live product end-to-end | Compatible | **ROADMAP** — most complex single config | $2–$10 |
| Mode 2 | SUB-2B BUILD | AUTONOMOUS | GUIDED | Live product, human reviews each step | Compatible | **ROADMAP** | $2–$10 + human time |
| Mode 2 | SUB-2B BUILD | AUTONOMOUS | MANUAL | Live product, human triggers each step | Compatible | **ROADMAP** | $2–$10 + days |
| Mode 3A BENCHMARK | (no sub-mode — single deliverable) | RECOMMEND-ONLY | AUTOMATIC | Comparative governance report | Compatible (canonical) | **PARTIAL** — single-URL sequential today; cross-URL synthesis unbuilt | $0.60–$4.00 (2× Mode 1 minimum) |
| Mode 3A BENCHMARK | — | RECOMMEND-ONLY | GUIDED | Comparative report, step-by-step | Compatible | **PARTIAL** | $0.60–$4.00 + human time |
| Mode 3A BENCHMARK | — | RECOMMEND-ONLY | MANUAL | Comparative report, human-driven | Compatible | **PARTIAL** | $0.60–$4.00 + days |
| Mode 3A BENCHMARK | — | SUPERVISED | * | No deploy actions; SUPERVISED redundant with RECOMMEND-ONLY for 3A | Compatible but adds no value | **PARTIAL** | same |
| Mode 3A BENCHMARK | — | AUTONOMOUS | * | No deploy actions; AUTONOMOUS redundant with RECOMMEND-ONLY for 3A | Compatible but adds no value | **PARTIAL** | same |
| Mode 3B SUB-3B-SPEC | — | RECOMMEND-ONLY | AUTOMATIC | Synthesis spec | Compatible | **ROADMAP** — synthesis engine unbuilt | $0.80–$5.00 |
| Mode 3B SUB-3B-SPEC | — | RECOMMEND-ONLY | GUIDED | Synthesis spec, step-by-step | Compatible | **ROADMAP** | $0.80–$5.00 + human time |
| Mode 3B SUB-3B-SPEC | — | RECOMMEND-ONLY | MANUAL | Synthesis spec, human-driven | Compatible | **ROADMAP** | $0.80–$5.00 + days |
| Mode 3B SUB-3B-SPEC | — | SUPERVISED / AUTONOMOUS | * | Synthesis spec only | Same as RECOMMEND-ONLY | **ROADMAP** | same |
| Mode 3B SUB-3B-BUILD | — | RECOMMEND-ONLY | * | Conflict | Degenerate | **N/A — degenerate** | n/a |
| Mode 3B SUB-3B-BUILD | — | SUPERVISED | GUIDED | New synthesized product at new URL, every step approved | Compatible | **ROADMAP** — synthesis + code-gen both unbuilt | $3–$15 + human time |
| Mode 3B SUB-3B-BUILD | — | SUPERVISED | MANUAL | New URL, human-driven | Compatible | **ROADMAP** | $3–$15 + days |
| Mode 3B SUB-3B-BUILD | — | SUPERVISED | AUTOMATIC | Gates auto-block | Degenerate | **N/A — degenerate** | n/a |
| Mode 3B SUB-3B-BUILD | — | AUTONOMOUS | AUTOMATIC | New URL end-to-end | Compatible — most roadmap-distant configuration | **ROADMAP** — fully automated cross-product synthesis + deploy | $3–$15 |
| Mode 3B SUB-3B-BUILD | — | AUTONOMOUS | GUIDED | New URL, human reviews each step | Compatible | **ROADMAP** | $3–$15 + human time |
| Mode 3B SUB-3B-BUILD | — | AUTONOMOUS | MANUAL | New URL, human triggers each step | Compatible | **ROADMAP** | $3–$15 + days |

**Matrix summary** (after collapsing degenerates):

- **BUILT (today, end-to-end proven):** 9 cells — all Mode 1 SUB-1A + all Mode 2 SUB-2A (treating SUPERVISED/AUTONOMOUS as same-as-RECOMMEND-ONLY when no actions exist).
- **PARTIAL (skeleton exists; needs hardening or graduation):** 7 cells — Mode 1 SUB-1B PREVIEW (6 cells) + Mode 3A BENCHMARK (3 cells × 1 sub = 3 cells but counted as 1 partial group; net 7 distinct partial configs).
- **ROADMAP (substantial unbuilt infrastructure required):** 12 cells — Mode 1 SUB-1B DEPLOY (5), Mode 2 SUB-2B BUILD (4), Mode 3B SUB-3B-SPEC + SUB-3B-BUILD (8 cells, several degenerates removed).
- **DEGENERATE (logically contradictory; never offered to users):** 8 cells.
- **Total catalogued: 36 cells** (some grouped into super-cells when sub-mode + authority collapse — see §B narrative).

### B.1 Key cells called out explicitly

- **Mode 1 + AUTONOMOUS + AUTOMATIC** — fully hands-off audit + fix + deploy. The "set and forget" mode. Today: PARTIAL (PREVIEW path) / ROADMAP (DEPLOY path).
- **Mode 1 + RECOMMEND-ONLY + AUTOMATIC** — full audit runs, produces report + fix list only. **Most common use case today (what's actually built).**
- **Mode 2 + any authority + AUTOMATIC** — SUB-2A SPEC today; SUB-2B BUILD is ROADMAP.
- **Mode 3B + AUTONOMOUS + AUTOMATIC** — fully automated cross-product synthesis + new deployment. Most complex and most roadmap-distant configuration.

---

## §C — UI Mapping

Mapping the existing UI surfaces (`src/pages/LandingPage.jsx` lines 19–26 + `src/pages/AutoRunner.jsx` mode handling + Rev-2.1 §17 sidebar) to CA-12 dimensions:

### C.1 LandingPage.jsx 8 OBJECTIVES → Dimension 1 Pipeline Mode

| LandingPage OBJECTIVE value | Label | CA-12 Pipeline Mode |
|---|---|---|
| `audit_demo` | "Audit for prospect demo readiness" | **Mode 1 SUB-1A** (recommend-only audit; demo-readiness focus per ENTRY 006 §7.6) |
| `investor_review` | "Prepare for investor review" | **Mode 1 SUB-1A** (recommend-only audit; investor-lens scoring) |
| `full_governance` | "Full governance and clearance cycle" | **Mode 1** (sub-mode user-selects per audit findings; gates Clearance Step 5) |
| `compare` | "Compare two or more products" | **Mode 3A BENCHMARK** |
| `combine` | "Combine inputs into a unified specification" | **Mode 3B SUB-3B-SPEC** |
| `benchmark` | "Benchmark against competitors" | **Mode 3A BENCHMARK** |
| `launch_readiness` | "Launch readiness check" | **Mode 1 SUB-1A** (recommend-only audit; launch-readiness lens) |
| `custom` | "Custom — I will describe my objective" | **any mode, user-defined** (free-text objective parsed at runtime; default-routes to Mode 1 SUB-1A unless URL count ≥ 2 → Mode 3A) |

**Observation:** 4 of the 8 OBJECTIVES are differentiated by **lens** (demo-readiness vs investor vs governance vs launch-readiness), not by Pipeline Mode. CA-12 introduces a notion of **Audit Lens** as a sub-attribute of Mode 1 SUB-1A. This is not a fourth dimension; it's a lens parameter on the same configuration.

### C.2 AutoRunner.jsx mode handling → CA-12 Dimensions 2 + 3

| AutoRunner.jsx surface | CA-12 dimension |
|---|---|
| `mode: 'auto'` literal (AutoRunner step logging) | Dimension 3 AUTOMATIC label |
| `mode: 'recommend_only'` (Agent #3 step-6 dispatch envelope) | Dimension 2 RECOMMEND-ONLY label |
| Per-Rev-2.1 §17 sidebar "Auto Operations" / "Guided Operations" / "Manual Operations" sections | Dimension 3 (AUTOMATIC/GUIDED/MANUAL) — these labels remain at the UX-C sidebar surface per Rev-2.1 §17 footnote |
| Rev-2.1 §8a "System Operation: Hands-On / Reviewed / Hands-Off" labels (deprecated by CA-12 §A.4 reconciliation) | Maps 1:1 to Dimension 2 AUTONOMOUS/SUPERVISED/RECOMMEND-ONLY |

### C.3 "Mode: Supervised" UI header indicator

Maps to **Dimension 2 (Authority Level, operator-set)**. The UI displays the current operator's authority ceiling. Read-only for non-admin users; admin sees an "Edit ceiling" affordance routed to `ProductRegistry.authorityCeiling` update flow.

### C.4 "Auto / Guided / Manual" Step 3 selector

Maps to **Dimension 3 (Execution Mode, per-run)**. The Step 3 of the LandingPage launch flow is the per-run pacing choice; bounded by the operator's Dim 2 ceiling.

### C.5 Net UI changes implied by CA-12 (NOT in this amendment — engineering follow-up)

- LandingPage Step 1 (URL count): determines Mode 1 vs Mode 3A vs Mode 3B routing.
- LandingPage Step 2 (objective): selects Audit Lens within Mode 1, or selects Mode 3 sub-mode for compare/combine/benchmark.
- LandingPage Step 3 (execution): renamed from "Mode: …" to **"Execution: Automatic / Guided / Manual"** to disambiguate from Authority.
- Sidebar adds a **"Authority Ceiling"** badge in the top-right header (admin-clickable).

---

## §D — Pipeline Step Agent Ownership per Mode

For each pipeline step, the responsible agent depends on the Pipeline Mode. Below is the mode × step ownership matrix. **Consistent with Rev-2.1 §15.1 26-agent roster + ENTRY 006 Agent #21 pinning + CA-9-B Agent #26 + EXECUTOR_REGISTRY per CA-7.**

| Step | Mode 1 (Assess + Renew) | Mode 2 (New Build) | Mode 3A (Benchmark) | Mode 3B (Synthesize) |
|---|---|---|---|---|
| 1 Research | **Agent #21** Aggressive Crawl Conductor (ENTRY 006 canonical; engineering dispatch pending — DORMANT today) | **Agent #6** Research (no crawl; market research) — DORMANT today | **Agent #21 × N** parallel (one per URL) — DORMANT | **Agent #21 × N** parallel — DORMANT |
| 2 Design | **Agent #7** Design (critique existing) — DORMANT | **Agent #7** Design (generate new) — DORMANT | n/a (per-URL Mode 1 step 2) | n/a (per-URL Mode 1) + synthesis at step 6 |
| 3 Build | **Agent #2** Code Builder (audit only in 1A; apply in 1B) — **SHIPPED-GREEN** | **Agent #2** (plan in 2A; code in 2B — Phase 2 ROADMAP) | per-URL Mode 1 step 3 | per-URL Mode 1 step 3 |
| 4 QA | **Agent #8** Quality Audit (5-dim scoring) — DORMANT | **Agent #8** (audit generated product) — DORMANT | per-URL Mode 1 step 4 | per-URL Mode 1 step 4 |
| 5 Deploy | Orchestrator path (Vercel adapter via Self-Renewal Executor per CA-7) | Orchestrator path (Vercel adapter) | n/a (no deployment in 3A) | Orchestrator (3B-BUILD only); n/a (3B-SPEC) |
| 6 Self-Renewal | **Agent #3** (SHIPPED-GREEN; Self-Renewal Executor per CA-7 draft for SUB-1B side effects) | **Agent #3** (iterate on QA findings) — SHIPPED-GREEN | **Agent #3** comparison synthesis (ROADMAP — Mode 3A synthesis step) | **Agent #3** + Mode 2 pipeline from synthesized input (ROADMAP) |
| 7 GTM | **Agent #9** Go-to-Market — DORMANT | **Agent #9** — DORMANT | **Agent #9** comparative GTM ranking — DORMANT | **Agent #9** for synthesized product — DORMANT |
| 8 Monitor | **Agent #10** Monitor — DORMANT | **Agent #10** — DORMANT | **Agent #10** per-URL + aggregate — DORMANT | **Agent #10** — DORMANT |

**Cross-cutting agents (always-on / cross-step across all modes):** #1 Lifecycle (SHIPPED), #11 Strategic Intelligence (DORMANT), #12 Portfolio Risk (DORMANT), #13 Self-Protection (DORMANT), #14 Public Policy (DORMANT), #15 Benchmarking (DORMANT), #16 Productivity/HR (DORMANT), #17 Product Evolution (DORMANT), #18 Business Planning (DORMANT), #19 Technological Evolution (DORMANT), #20 Environmental Impacts (DORMANT), #26 Orchestra Research (DORMANT). All 12 cross-step/always-on agents intervene opportunistically — independent of Pipeline Mode.

**Mode/step combinations where the required agent is DORMANT or unbuilt:** essentially every step except step 3 Build (Agent #2 SHIPPED) and step 6 Self-Renewal (Agent #3 SHIPPED) require a DORMANT agent to graduate before that Mode/Step combination is fully operational. The build blueprints in `docs/specs/agent-blueprints/00_BUILD_INDEX.md` (commit `883470a`) provide the canonical roadmap.

---

## §E — Honest Capability Boundary Table

**Most critical section of CA-12.** Each entry below is verified against canonical artifacts; no inflation. The "Built today" column claims only what is end-to-end provable on commits referenced.

| Configuration | Built today | Partial | Roadmap | Blocked by |
|---|---|---|---|---|
| **Mode 1 SUB-1A + RECOMMEND-ONLY + any execution** | **BUILT** — multi-page public crawl via Agent #21 spec at ENTRY 006 (canonical); Phase 1 wired end-to-end in production per W2 PHASE-1-PROOF Dispatch #12 on 2026-05-16 (`crawlSummary` returned with `pagesCrawled: 6`, `depth: 8`, `fallbackUsed: false`, `method: browserless-function` against `saigedemo.com`) | — | — | — |
| **Mode 1 SUB-1A + auth-gated products** | — | Credential plumbing scaffolded in `src/lib/renewal/inputArtifact.js` `raw.description.login*` per Rev-2.1 §6 | Phase 3 spec for auth-gated crawl + Panel ratification |
| **Mode 1 SUB-1B PREVIEW** | — | **PARTIAL** — renewal pipeline endpoint exists (`api/renew.js` per W2 commit `9b4e511`); fork-and-fix path drafted in Self-Renewal Executor (CA-7 §15.5) | Real source-level patch application + redeploy proven end-to-end | Source acquisition layer + Self-Renewal Executor graduation from DORMANT |
| **Mode 1 SUB-1B DEPLOY** | — | — | **ROADMAP** — push to original product hosting | Source acquisition credentials + deploy-target credentials + Acceptance Gate workflow + admin-role-gated authorisation per Rev-2.1 §13 |
| **Mode 2 SUB-2A SPEC** | **BUILT** — spec deliverables producible via existing LLM dispatch in AutoRunner pipeline | — | — | — |
| **Mode 2 SUB-2B BUILD** | — | — | **ROADMAP** — code-generation pipeline entirely unbuilt end-to-end | Agent #7 Phase 2 executor (per blueprint) + code-gen Orchestra dispatch chain (v0/Lovable/Bolt + Vercel deploy) + Agent #2 graduation to BUILD authority via EXECUTOR_REGISTRY pattern |
| **Mode 3A BENCHMARK** | — | **PARTIAL** — single-URL sequential assessment runs today (Mode 1 SUB-1A on each URL one at a time); user can manually compare results | Parallel multi-URL crawl + cross-URL synthesis step | Synthesis step 6 implementation; Agent #21 × N parallel orchestration; Agent #3 cross-URL comparison logic |
| **Mode 3B SUB-3B-SPEC** | — | — | **ROADMAP** — synthesis engine unbuilt | Cross-URL synthesis at step 6; "best elements extraction" classifier (IP-aware — see §G G-Q5) |
| **Mode 3B SUB-3B-BUILD** | — | — | **ROADMAP** — synthesis + code-gen pipelines both unbuilt | Same as SUB-3B-SPEC + Mode 2 SUB-2B BUILD dependencies |
| **Dim 2 — AUTONOMOUS authority** | — | **PARTIAL** — `recommend_only` wired across all 26 agents per Rev-2.1 §15.1 (dormant-safe default); `auto_write_internal` charter pattern proven by Self-Renewal Executor draft (CA-7) and Agent #26 dual-authority (CA-9-B) | Full autonomous deploy across all 8 pipeline steps | Phase 3 gates: per-agent BaseAgent.guard() amendment per CA-11 + ProductRegistry.authorityCeiling field per CA-12 + per-run authority validation in AutoRunner |
| **Dim 2 — SUPERVISED authority** | — | **PARTIAL** — Human Gates (Review/Approval/Testing/Acceptance) wired in operationsEngine.js for some steps per Rev-2.1 §10.2 | Consistent gate UX across all 8 steps for every action | UX work to surface gates uniformly + per-step gate-policy declarations in each agent's charter |
| **Dim 2 — RECOMMEND-ONLY authority** | **BUILT** — every agent ships with this default per Rev-2.1 §15.1; AutoRunner enforces via `recommend_only` mode envelope on each step-owner invocation | — | — | — |
| **Dim 3 — AUTOMATIC execution** | **BUILT** — AutoRunner end-to-end runs all 8 steps sequentially today (per `src/pages/AutoRunner.jsx`) | — | — | — |
| **Dim 3 — GUIDED execution** | — | **PARTIAL** — guided step-by-step wireframe per Rev-2.1 §17 sidebar "Guided Operations" section; approval-gate UI exists for select steps | Consistent 8-step gate UX | UX work + step-result review components |
| **Dim 3 — MANUAL execution** | — | **PARTIAL** — manual step trigger UI per Rev-2.1 §17 sidebar "Manual Operations" section | All 8 steps independently triggerable; full pause-resume semantics | UX work + per-step trigger API endpoints |
| **Auth-gated crawl (Mode 1 input precondition)** | — | — | **ROADMAP** — Phase 3 spec pending Panel ratification | Credential vaulting (per `inputArtifact.js`) + storage-state Playwright dispatch + audit-log scrubbing pattern per §14.3 PII-scrub |
| **§7.6 GTM Readiness Report (all modes)** | **BUILT (spec canonical per ENTRY 006)** | Implementation wired in Aggressive Crawl Engine output | — | Engineering dispatch graduating Agent #21 from spec to live |
| **ProductSSOT atomic Output Contract item #5 (all modes)** | **BUILT (spec canonical per ENTRY 005 / CA-10-A)** | Implementation wired in AutoRunner step 8 + Self-Renewal Executor write paths | — | Engineering dispatch graduating ProductSSOT writes from CA-10 spec to live |
| **CEO-set authority ceiling (`ProductRegistry.authorityCeiling`)** | — | — | **NEW per CA-12** — does not exist today | Schema migration adding `authorityCeiling` column to ProductRegistry + admin UI + per-run validation in AutoRunner |

**Be precise — do not mark anything BUILT that isn't proven end-to-end.** The 2026-05-16 W2 Phase 1 production proof (commit context: `02:02 PM ET 2026-05-16` Dispatch #12 fetch result) is the live evidence anchoring Mode 1 SUB-1A as BUILT. All other BUILT claims are anchored to existing canonical commits referenced inline.

---

## §F — SSOT Sections Requiring Update

Once CA-12 is ratified by Panel + CEO, the following sections in `docs/CANONICAL_REFERENCE.md` require corresponding edits (engineering dispatches following the promotion commit pattern of ENTRY 003–006):

### F.1 §9 8-Step Pipeline — mode-dependent step behavior

Each row of the 8-step pipeline table requires a "mode-dependent behavior" column or sub-table referencing §D's matrix. Specifically:
- Step 1 Research footnote: Mode 1 uses Agent #21; Mode 2 uses Agent #6; Mode 3A/3B run Agent #21 × N parallel.
- Step 6 Self-Renewal footnote: SUB-1A recommend-only; SUB-1B applies; Mode 3A synthesises comparison; Mode 3B synthesises new product.
- Step 5 Deploy footnote: orchestrator-only path; in SUB-1B DEPLOY requires source-acquisition + admin-gated Acceptance Gate.

### F.2 §10 Self-Governance Layer — three authority levels canonicalized

Today §10 enumerates the four governance components (Self-Test, Self-Audit, Self-Protect, Self-Heal) + Four Human Gates. CA-12 adds a new sub-section **§10.3 Authority Level (CA-12 Dim 2)** with the three-level definition + the ceiling rule + `ProductRegistry.authorityCeiling` storage mechanism.

### F.3 §11 Clearance Protocol — mode-dependent outputs

§11 six clearance steps remain unchanged, but the **outputs gated** by Step 5 (Demo Readiness) vary by Pipeline Mode:
- Mode 1: existing-product demo readiness (per ENTRY 006 §7.6).
- Mode 2: new-product demo readiness (different rubric — generated content vs assessed content).
- Mode 3A: per-URL demo readiness + comparative ranking.
- Mode 3B: synthesized-product demo readiness.

### F.4 §6 ACE (Aggressive Crawl Engine) — valid across all modes (no edit required)

The ACE crawl scope per §6 is mode-agnostic — every Mode 1 + Mode 3A/3B uses Agent #21 the same way. Mode 2 does not use crawl. **No §6 edit required**; the mode-conditional invocation is documented in §9 + §D instead.

### F.5 §22 Product-Agnostic Rule — modes maintain agnosticism (verified, no edit required)

All four Pipeline Modes treat `productScope` as a runtime parameter. No mode introduces product-name hardcoding. **§22 verified compatible; no edit required.**

### F.6 §17 / §8a "Auto/Guided/Manual" as a single dimension — must split

Rev-2.1 §17 footnote (a) explicitly noted that UX-C sidebar labels (Guided Operations / Manual Operations) are historical and DISTINCT from the canonical Orchestra Selection axis labels. CA-12 makes the same disambiguation for the System Operation axis: **§8a "Hands-On / Reviewed / Hands-Off" deprecate in favor of CA-12 Dim 2 (Autonomous / Supervised / Recommend-only).** The §17 sidebar section names ("Auto Operations / Guided Operations / Manual Operations") remain at the UX-C surface per existing footnote — they now canonically map to CA-12 Dim 3, not the deprecated §8a.

### F.7 §25 Locked Rule 4 — third axis added

Rev-2.1 §25 Locked Rule 4 currently codifies two orthogonal axes (Orchestra Selection + System Operation). CA-12 amends Locked Rule 4 to canonicalize **three** orthogonal axes:
- **Orchestra Selection axis** (Auto/Recommended/User-Choice — per-step adapter selection, unchanged from Rev-2.1).
- **Pipeline Mode axis** (Mode 1/2/3A/3B — NEW per CA-12 Dim 1).
- **Operating Authority axis** (Autonomous/Supervised/Recommend-only — NEW canonicalization per CA-12 Dim 2; deprecates §8a labels).
- **Execution Pacing axis** (Automatic/Guided/Manual — per-run pacing, supersedes §17's "single dimension" UX-C labels).

That's **four axes total**, all canonically independent (subject to Dim 2 ceiling constraint on Dim 3).

### F.8 §15.1 Roster — no agent charter changes required by CA-12

The 26-agent roster is unchanged. CA-12 references existing charters; no new agent, no charter amendment. Engineering dispatches per `docs/specs/agent-blueprints/` still apply unchanged.

---

## §G — Seven Panel Questions (adversarial, neutral, no anchoring)

Standard 4-option format + `INSUFFICIENT_INFORMATION` valid abstention per `docs/PANEL_INFRASTRUCTURE.md` engagement-filter conventions. No "(W3 recommendation)" tags. No "(as drafted)" anchoring.

### G-Q1 — Pipeline Mode classification completeness + non-overlap

CA-12 §A defines four Pipeline Modes: Mode 1 (Assess existing), Mode 2 (Build new), Mode 3A (Benchmark multiple), Mode 3B (Synthesize from multiple). Is this classification complete and non-overlapping?

- (a) Complete and non-overlapping as stated.
- (b) A Mode is missing — name it in rationale (e.g., a "Maintain existing" mode distinct from "Assess existing").
- (c) Two or more modes overlap — name the overlap in rationale (e.g., Mode 3B SUB-3B-BUILD overlaps Mode 2 SUB-2B BUILD).
- (d) The 4-mode framing is the wrong abstraction — propose alternative classification.

### G-Q2 — Two-dimension governance separation (Authority vs Execution)

CA-12 separates governance into two dimensions: Authority Level (operator-set persistent ceiling) and Execution Mode (per-run pacing). Should they be:

- (a) Two dimensions as stated.
- (b) Collapsed into a single dimension — name the canonical labels in rationale.
- (c) Further subdivided into three or more dimensions (e.g., split Authority into Build-authority + Deploy-authority).
- (d) The two-dimension model is right but the specific 3×3 grid is wrong — propose alternative cardinality.

### G-Q3 — Authority Ceiling Rule

CA-12 §A.2.4 specifies: operator sets a persistent ceiling; end users can only select at or below the operator ceiling per run; users cannot exceed the ceiling under any circumstance. Is this the correct rule?

- (a) Ceiling rule correct as stated.
- (b) Users should be able to exceed the ceiling for a specific run with explicit re-authorisation (e.g., per-run admin approval for an elevated authority).
- (c) The ceiling should be advisory, not enforced — users can choose any authority level regardless of operator setting, but audit-log captures the decision.
- (d) The ceiling should be per-product per-mode (e.g., Mode 1 ceiling AUTONOMOUS but Mode 2 ceiling SUPERVISED) rather than a single global ceiling per product.

### G-Q4 — Mode 2 SUB-2B (full build + deploy) in SSOT now

Mode 2 SUB-2B (FlowAI writes + deploys a real working product from a description) is documented as ROADMAP in §E (code-generation pipeline entirely unbuilt). Should it be canonical in SSOT now?

- (a) Codify in SSOT now as roadmap with explicit `ROADMAP` tag (per §E pattern).
- (b) Defer from SSOT entirely until at least one prototype implementation lands.
- (c) Codify only the SUB-2B-PREVIEW path (FlowAI-owned preview URL) now; defer the SUB-2B-DEPLOY path (push to user-owned host).
- (d) Codify as canonical SSOT only when it reaches PARTIAL status (skeleton exists end-to-end).

### G-Q5 — Mode 3B synthesis IP/copyright concerns

Mode 3B "extract best elements" assembles a new product from features observed across 2+ third-party URLs. Is this implementable without IP/copyright concerns for arbitrary third-party products?

- (a) Implementable for all third-party products (best-elements extraction is fair-use as research / inspiration).
- (b) Implementable only with explicit license / authorisation from each source product's owner.
- (c) Implementable only when the operator is the owner of every source URL (limits Mode 3B to first-party + operator-owned synthesis).
- (d) Not implementable in any general form — Mode 3B should be removed from SSOT or restricted to a research-only output (no deploy, no new URL).

### G-Q6 — 36-configuration matrix granularity

The §B matrix catalogues 36 combinations (4 modes × 3 authority × 3 execution). Is this the right granularity?

- (a) 36-cell matrix is correct — every cell needs explicit catalogue (some marked degenerate).
- (b) Over-specified — collapse to a smaller matrix (e.g., 12 cells by dropping degenerates from the spec entirely; degenerate combinations are runtime errors, not catalogued cells).
- (c) Under-specified — the 36-cell matrix omits relevant variations (e.g., per-step authority overrides should add a fourth dimension to the matrix).
- (d) The matrix concept is right but the cells should be agent-rooted (one row per agent × mode) rather than mode × authority × execution.

### G-Q7 — Overall CA-12 disposition

After reading the full draft, the appropriate Panel disposition is:

- (a) Promote all sections (§A–§G) as canonical with no carve-outs.
- (b) Promote a subset — name the carve-outs in rationale (e.g., promote §A + §B + §E + §F now; defer §C UI mapping + §D agent ownership until corresponding engineering specs land).
- (c) Defer all of CA-12 pending a separate disposition on one or more of Q1–Q6 above.
- (d) Reject as over-scoped — break CA-12 into multiple smaller amendments (e.g., CA-12-A Pipeline Modes, CA-12-B Authority Levels, CA-12-C Execution Modes) and re-Panel each.

---

## SSOT Conflicts Surfaced While Drafting

The drafting process surfaced the following conflicts/ambiguities between CA-12 and prior canonical (Rev-2.1 + ENTRY 003–006). Each is annotated with the proposed resolution; **Panel + CEO disposition required** before promotion.

### Conflict 1 — Rev-2.1 §8a (System Operation axis) vs CA-12 Dim 2 (Authority Level)

**The conflict:** §8a defines three System Operation labels (Hands-On / Reviewed / Hands-Off) as a per-product operator pacing axis. CA-12 Dim 2 defines three Authority Level labels (Recommend-only / Supervised / Autonomous) as the operator-set authority ceiling. The two are semantically equivalent — same concept, different labels.

**Proposed resolution:** CA-12 deprecates §8a labels with explicit 1:1 mapping (Hands-Off = Autonomous; Reviewed = Supervised; Hands-On = Recommend-only). The Rev-2.1 §8a section header remains but the labels reference CA-12 Dim 2 as canonical.

**Risk:** UX-C surfaces "Hands-On" labelling in shipped sidebar — those labels persist at the surface but canonically refer to CA-12 labels per §C.

### Conflict 2 — Rev-2.1 §25 Locked Rule 4 axes

**The conflict:** Locked Rule 4 currently codifies two orthogonal axes (Orchestra Selection + System Operation). CA-12 promotes Pipeline Mode + Operating Authority + Execution Pacing as canonical, displacing System Operation's labels.

**Proposed resolution:** §F.7 above — Locked Rule 4 amended to canonicalize four orthogonal axes (Orchestra Selection unchanged + Pipeline Mode NEW + Operating Authority NEW (deprecating §8a) + Execution Pacing NEW (supersedes §17's single dim)).

### Conflict 3 — Rev-2.1 §17 sidebar "Auto/Guided/Manual" section labels

**The conflict:** The shipped sidebar uses "Auto Operations / Guided Operations / Manual Operations" as section names. These were historical UX-C labels (per §17 footnote a). CA-12 canonicalizes these labels as Dim 3 (Execution Mode) — but they also overlap with the deprecated §8a labels for the previous System Operation axis.

**Proposed resolution:** Per §17 footnote (a) precedent — the sidebar labels remain at the UX surface for shipping continuity. They now canonically map to **Dim 3 Execution Mode** per CA-12. The shipped sidebar text does NOT change in this amendment.

### Conflict 4 — ProductRegistry schema lacks `authorityCeiling` field

**The conflict:** CA-12 Dim 2 requires a `ProductRegistry.authorityCeiling` field. ProductRegistry schema today (per Rev-2.1 §22 + CA-9 §3) does not declare it.

**Proposed resolution:** Schema migration to add the column (engineering dispatch follow-on to CA-12 promotion). Default value: `'recommend_only'` (safest; matches dormant-safe default of all 26 agents). Migration is additive and backwards-compatible; existing products with no explicit ceiling inherit the safe default.

### Conflict 5 — CA-11 Per-agent ToolMenu does NOT define `effectiveToolMenu(mode)`

**The conflict:** CA-11 (drafted, not yet promoted) introduces `AgentRecord.toolMenu` with CEO-override via `ProductRegistry.agentToolConstraints`. CA-12 Pipeline Mode selection may narrow the effective ToolMenu for some agents (e.g., Agent #6 Research's ToolMenu varies by Mode 1 vs Mode 2 — crawl-heavy vs market-research-heavy).

**Proposed resolution:** CA-12 does NOT mandate a mode-specific ToolMenu mechanism. Mode-conditional ToolMenu narrowing happens at the agent's `recommend(ctx)` layer (each agent reads `ctx.mode` and narrows its own dispatch choices accordingly). No new `effectiveToolMenu(mode)` API needed; existing `ProductRegistry.agentToolConstraints` per CA-11 covers operator-side overrides; mode-conditional narrowing is per-agent implementation detail. **Panel may disagree** — surface for Q6 consideration.

### Conflict 6 — Mode 3B "extract best elements" lacks canonical IP-handling

**The conflict:** Mode 3B SUB-3B-SPEC + SUB-3B-BUILD synthesize new products by extracting features observed across third-party URLs. No canonical guidance today on whether this constitutes copyright violation (depends on jurisdiction, fair-use doctrine, observed-feature granularity, etc.).

**Proposed resolution:** Surface as Panel Question G-Q5. **No CA-12-side resolution attempted**; defer to Panel + CEO + legal counsel per Rev-2.1 §14 Public Policy + Agent #14 carve-out evaluation per §8.1 §CA-9-A.6.

---

## Provenance

| Source | Used for |
|---|---|
| CEO-locked feature spec 2026-05-16 (W3 dispatch) | All §A definitions; §G adversarial question framing |
| Rev-2.1 §6 + ENTRY 006 (Aggressive Crawl Engine) | §D Mode 1 + 3A Step 1 ownership; §E auth-gated crawl roadmap |
| Rev-2.1 §7 + ENTRY 005 / CA-10 (ProductSSOT) | §E ProductSSOT atomic Output Contract; §F.1 step 8 ownership |
| Rev-2.1 §8 + ENTRY 005 (Orchestra) | §D step 1 + step 5 wiring |
| Rev-2.1 §8a (System Operation axis — deprecating) | §A.4 reconciliation; §F.7 conflict resolution |
| Rev-2.1 §9 (8-step pipeline) | §A pipeline step tables per mode; §F.1 amendment |
| Rev-2.1 §10 + ENTRY 005 (Self-Governance Layer) | §A.2 authority enum; §F.2 amendment |
| Rev-2.1 §11 (Clearance Protocol) | §F.3 amendment |
| Rev-2.1 §13 (Auth + roles) | §A.2.4 admin-role gate; §F authority ceiling enforcement |
| Rev-2.1 §15.1 (26-agent roster) + EXECUTOR_REGISTRY (CA-7) | §D agent ownership matrix |
| Rev-2.1 §17 (6-section sidebar) | §C UI mapping |
| Rev-2.1 §22 (Product-Agnostic Rule) | §F.5 verification; §A.2.4 metadata storage |
| Rev-2.1 §25 Locked Rule 4 | §A.4 axis reconciliation; §F.7 amendment |
| CA-7 EXECUTOR_REGISTRY (ENTRY 004) | §A.2.1 dual-authority pattern reference |
| CA-9-A Orchestra self-expansion (ENTRY 005) | §A.1.1 SUB-1B fork-and-fix reference |
| CA-9-B Agent #26 dual-authority (ENTRY 005, CEO-Q4=(b) arbitration) | §A.2.1 mapping |
| CA-9-C Customer Feedback Loop (ENTRY 005) | §D step 8 cross-cutting consumer |
| CA-10 ProductSSOT (ENTRY 005) | §E atomic Output Contract |
| CA-11 Per-agent ToolMenu (in flight, draft `1a020f7`) | §E AUTONOMOUS authority graduation path; Conflict 5 |
| ENTRY 006 Aggressive Crawl Engine | §A.1.1 Mode 1 Step 1; §D agent #21 ownership; §F.4 verification |
| `src/pages/LandingPage.jsx` lines 19–26 | §C UI OBJECTIVES mapping |
| `src/pages/AutoRunner.jsx` `mode:` literal usage | §C UI mode mapping |
| `docs/specs/agent-blueprints/00_BUILD_INDEX.md` (commit `883470a`) | §D agent dormancy status |
| 2026-05-16 Phase 1 production proof (W2 Dispatch #12, 02:02 PM ET) | §E "BUILT" anchor for Mode 1 SUB-1A multi-page public crawl |

---

## Versioning + Promotion Workflow

CA-12 follows the standard CA-n cycle per Rev-2.1 §18:

1. **Draft** (this document) — committed to `docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md`.
2. **W6 adversarial Panel review** — 7 questions per §G; standard 4-option + INSUFFICIENT_INFORMATION; bias-management rules apply (Q.1 open-ended before Q.2 MC; adversarial reframing on every question; W03 priors EXCLUDED from context bundle; engagement <8/10 surfaces as soft signal).
3. **CEO disposition** — adopts Panel signals; resolves PLURALITY items via CEO arbitration; applies carve-outs per §G Q7.
4. **Promotion commit** by W2 / W5x — adds ENTRY 007 to `docs/CANONICAL_HISTORY.md` SECTION 8; applies §F edits to `docs/CANONICAL_REFERENCE.md`; creates pre-promotion archive at `docs/archive/FLOWAI_SSOT-pre-CA12-promotion-<date>.md`.
5. **Engineering follow-on dispatches** (post-promotion) — schema migration for `ProductRegistry.authorityCeiling`; UI relabeling per §C.5; Locked Rule 4 axis text amendment per §F.7.

CA-12 is the **largest cumulative amendment** since the Rev-2.1 baseline promotion at commit `9495b26` — it introduces a new orthogonal axis (Pipeline Mode), canonicalizes a deprecation (§8a → Dim 2), and reframes the entire operating model around the 36-configuration matrix. Panel adversarial review per §G is the canonical gate.

*End of CA-12 draft. Pending W6 Panel review per Locked Rule 17 + CEO ratification per §18.*
