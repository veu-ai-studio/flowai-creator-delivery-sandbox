# FlowAI — Single Source of Truth

**Version:** 2.3 — Revised after Panel v2.2 review (7 named fixes)
**Date:** 2026-05-26
**Authority:** Victor Udo, FNSE, PhD — CEO, VEU AI Studio
**Classification:** CONFIDENTIAL — VEU AI Studio Internal
**Status:** RATIFIED - CEO Victor Udo, FNSE, PhD 2026-05-26
**Supersedes:** All prior SSOT versions and amendments after CEO ratification and canonical repo commit.
**Previous version:** v2.2 — Panel returned 0/10 READY, 4/7 MINOR-REVISIONS, 1 NOT-RATIFIABLE (Slot 1 hard critic still rejecting)
**Repo:** github.com/victor2081new-cloud/flowai
**Branch:** flowai-v0.1
**Production:** flowai-dun.vercel.app
**Branch HEAD at draft time:** 8c4cb42

## CHANGE LOG — v2.2 → v2.3 (Panel-driven revision)

The Panel v2.2 second review (Runs A + B, 9/10 + 7/10 engagement) surfaced 7 specific defects. v2.3 fixes each:

1. **Layer 2 `PARTIAL` collision with Layer 1 `PARTIAL`** — Layer 2 now uses `IN_PROGRESS` instead. Layer 1 keeps `PARTIAL`. No semantic overlap.
2. **AUTONOMOUS-OP circular dependency** — renamed to **END-TO-END-OP** with scope explicitly bounded: autonomous through every pipeline step *up to but not including production deploy*. Production deploy remains authorized-operator-only per §11.3. Capability is now reachable (CURRENT/IN_PROGRESS path) without requiring §11.3 amendment.
3. **0% VERIFIED vs 95% governance threshold gap** — §11.1 now distinguishes two separate gates: **SSOT document ratification** (a truth-document gate, ratifiable at any capability completion %) vs **product ship readiness** (the 95% gate, applied per release).
4. **Fresh Build self-contradiction** — §12.1 row clarified: `FRESHBUILD-FEATURE-EXTRACTOR` is `PARTIAL` *evidence* (branch commit exists at c718bf8) of an `EXPERIMENTAL` *capability* (flag-gated OFF). PARTIAL+EXPERIMENTAL is a coherent state and explicitly stated as such.
5. **Domain 3 commercial-model incoherence** — §13 now includes an explicit operational allocation rule.
6. **MANUAL-OP vs MANUAL still confusable in operator UI** — Axis B `MANUAL` renamed to **MANUAL-ORCHESTRA**. Axis A keeps `MANUAL-OP`. No bare "MANUAL" anywhere.
7. **Governance safeguard gaps** — §11.4 now addresses concurrent amendment collision, amendment-of-amendment semantics, and Panel rerun clock behavior.

## STATUS LABEL DEFINITIONS — TWO LAYERS (Updated)

This document uses two distinct label layers. They use **disjoint vocabularies** — no overlap.

**Layer 1 — Evidence Claims** (used in the traceability matrix for verified capabilities):

- `VERIFIED` — Live production evidence confirms this works
- `PARTIAL` — Built and tested but not verified in production
- `STUBBED` — Placeholder exists, not implemented
- `NOT_IMPLEMENTED` — Does not exist; negative control
- `DEFERRED` — Intentionally postponed

**Layer 2 — Capability Planning** (used in this document for roadmap communication):

- `CURRENT` — Working in production today
- `IN_PROGRESS` — Partially built, work ongoing  *(was `PARTIAL` in v2.2 — renamed to disambiguate)*
- `TARGET` — Approved future architecture, not yet built
- `ROADMAP` — Planned but not yet scoped
- `MISSION` — Strategic/business direction — not an engineering claim
- `REQUIRES_EVIDENCE` — Built but needs production artifact to verify
- `DEPRECATED` — Was built, now being retired
- `EXPERIMENTAL` — Built but feature-flagged OFF by default

Layer 2 labels are for human reading and planning. Layer 1 labels are the canonical evidence record in the sidecar JSON. When a Layer 2 capability reaches production evidence, it gets a Layer 1 claim row in the matrix. **Coherent compound states are allowed**: e.g. `IN_PROGRESS / EXPERIMENTAL` (Layer 2) can have a `PARTIAL` Layer 1 claim — the layers describe different aspects (planning state vs evidence state).

## PART 1 — WHAT FLOWAI IS

### 1.1 The Mission

FlowAI is an AI operating system built to democratize the ability to create, operate, and monetize digital products. It serves three domains in sequence:

1. VEU AI Studio as its internal operating system infrastructure
2. Small entities — individuals and small organizations globally
3. Underserved communities worldwide — AI democratization platform

VEU AI Studio is the first organizational user of FlowAI — not the only one. The five VEU products (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) are the first five products FlowAI serves. Everything built at VEU proves FlowAI works before it is offered to the world.

This is not a feature. This is why FlowAI exists.

### 1.2 What FlowAI Does

FlowAI accepts any input — a live URL, a description, audio, images, video, documents, or any combination — analyzes it deeply, and produces a live, platform-free, deployable digital product.

FlowAI's target architecture is fresh-build-first: analyze any input and generate a completely new, platform-free product from scratch. Current W09 implementation still includes assessment, migration, and registered upgrade-repo patch workflows while fresh-build matures. Both paths are valid and supported.

Reference-product portability rule: SAIGE and the other VEU products are proof fixtures for FlowAI, not special-case destinations. Any SAIGE vertical-slice work must exercise product-agnostic contracts, target-class adapters, ProductSSOT state, and deployment/distribution adapters that can carry forward to websites, SaaS products, mobile apps, native apps, and agentic AI systems. A capability is not SSOT-complete if it works only because the product is SAIGE.

Distribution target rule: Step 5 always produces the canonical per-target-class delivery artifact, and target classes carry different distribution obligations. Web and SaaS outputs deploy to hosted URLs; mobile and native outputs require build/package metadata plus app-store or installer distribution adapters; agentic AI outputs require runtime, tool-permission, and monitoring adapters. These adapters live at the edge; FlowAI's core orchestration, scoring, evidence, governance, and ProductSSOT remain product-agnostic.

### 1.3 What FlowAI Is Not

- Not a SaaS tool sold to large enterprises
- Not a chatbot or AI assistant
- Not a governance dashboard only
- Not a migration tool only
- Not a code editor or copilot
- Not platform-dependent in any of its outputs

FlowAI is an operating system. Organizations and individuals run their products on it.

### 1.4 Core Principles

**Fresh build, not fork** — `TARGET` for Workflows 1/2/3. Every Workflow 1/2/3 output is a freshly generated codebase. The original product is used as analysis source only. Current W09 implementation still uses registered upgrade repo workflows while fresh-build capability matures.

**Platform free by birth** — Every output is platform-free from the first line of code. No platform SDK, proxy, or runtime dependency ever introduced into FlowAI output code.

**Two versions always exist** — `CURRENT`. Original: preserved, never modified, rollback target. Output: new version with all improvements. CEO approves final replacement.

**Honest scoring always** — FlowAI never inflates scores or fabricates improvement. Blocked runs report BLOCKED. No fabricated URLs, PRs, branches, metrics, or evidence.

**Product-agnostic** — FlowAI works on any product, any platform, any domain. No product-specific code in the FlowAI agent layer.

## PART 2 — INPUTS AND OUTPUTS

### 2.1 Input Types

1. Single URL — CURRENT
2. Multiple URLs (2+) — ROADMAP
3. Text Description — IN_PROGRESS
4. Voice / Audio — ROADMAP
5. Image / Screenshot — ROADMAP
6. Video — ROADMAP
7. Document / PDF — ROADMAP
8. Dataset — ROADMAP
9. Code Repository — ROADMAP
10. Combination (any mix) — ROADMAP

All input types normalize into a unified InputArtifact. `inputTypes` is an array to support Combination inputs; `subTypes` lists all types present when Combination is selected.

### 2.2 Output Types

1. Upgraded Product (fresh build from URL analysis) — TARGET
2. Brand New Product (built from non-URL input) — ROADMAP
3. Product Specification (for human developer) — IN_PROGRESS
4. Synthesized Product (best of multiple inputs) — ROADMAP
5. Benchmark Report — ROADMAP
6. Migrated Product (platform dependencies removed) — CURRENT/IN_PROGRESS
7. Combination Output — ROADMAP

## PART 3 — HOW FLOWAI OPERATES

### 3.1 Four Product Workflows

These are product workflows — what FlowAI does to a product. They are **completely independent** of the control axes in §3.2 which describe how FlowAI executes. Any workflow can run under any combination of control axis values.

**WORKFLOW 1 — ANALYZE AND UPGRADE** — `IN_PROGRESS`. Analyze an existing live product and build an improved version. Input: Single URL. Output: Upgraded Product (fresh build) or Product Specification.
- SUB-1A ANALYZE ONLY - Analysis/scoring: CURRENT. Source-mapped fix proposals: IN_PROGRESS (handoff fix is Phase 2 Task 2). No build.
- SUB-1B ANALYZE AND BUILD — IN_PROGRESS. Build step blocker under repair. Target: fresh codebase generation. Current: registered upgrade repo workflow while fresh-build matures.

Pipeline steps for Workflow 1:
1. Research: crawl + analyze existing product
2. Design: critique + propose improvements
3. Build: generate new codebase — TARGET
4. Quality Audit: scoring + 10-dimension disclosure
5. Deploy: deploy improved product to new URL
6. Self-Renewal: iterate based on QA findings
7. GTM: GTM readiness assessment
8. Monitor: final clearance decision

**WORKFLOW 2 — BUILD NEW PRODUCT** — `ROADMAP`. Create a completely new product from non-URL input.
- SUB-2A SPECIFICATION ONLY — IN_PROGRESS
- SUB-2B BUILD AND DEPLOY — ROADMAP

Pipeline steps (Workflow 2): Research → Design → Build → Quality Audit → Deploy → Self-Renewal → GTM → Monitor.

Dispatch 0 reconciliation note: Step 6 in the product workflow is canonically Self-Renewal. Governance remains a cross-cutting capability, clearance surface, audit concern, and registry capability vocabulary, but it is not the Step 6 product-workflow label.

**WORKFLOW 3 — COMPARE AND SYNTHESIZE** — `ROADMAP`. Assess multiple products; benchmark or synthesize.
- TYPE-3A BENCHMARK — ROADMAP
- TYPE-3B SYNTHESIZE — ROADMAP

**WORKFLOW 4 — MIGRATION MODE** — `CURRENT/IN_PROGRESS`. For users who prefer incremental platform decoupling over a full fresh build. Valid first-class user choice.

Key principles:
- Original repo: read-only, never modified, always frozen as rollback
- Fork naming: {product}-v2
- Platform detection automatic — Base44, Wix, Webflow, Bubble, WordPress, Squarespace, any platform
- Write target: v2 fork only; migration write allowlist strictly enforced
- Auth, config, package manifests, lockfiles: human-review-only
- Migration completion requires verification that platform dependencies are removed or explicitly deferred. Verification was degraded in W09 — GitHub Actions checks not yet wired.
- Migration output is not automatically GTM-ready

Recommended sequence: Workflow 4 → Workflow 1 or 2.

**FRESH BUILD ENGINE — EXPERIMENTAL, OFF BY DEFAULT**

Fresh Build is an engine — not a fifth workflow. It powers Workflow 1 SUB-1B and Workflow 2 SUB-2B once mature. Feature flag: `FLOWAI_ENABLE_FRESH_BUILD=false`.

Three modules:
- Feature Extractor: URL → feature inventory — EXPERIMENTAL/LIVE-CRAWL WIRED — feature flag OFF; deterministic tests use mocked crawler/Browserless
- Design Synthesizer: URL → design spec — EXPERIMENTAL/LOCAL VALIDATION — feature flag OFF; deterministic tests use mocked crawler/Browserless
- Codebase Generator: inventory + spec → platform-free codebase — EXPERIMENTAL/LOCAL VALIDATION — safety gates tested; feature flag OFF
- Fresh Build Orchestrator: Feature Extractor → Design Synthesizer → Codebase Generator → upgrade-repo write seam — EXPERIMENTAL/PARALLEL MODE WIRED — feature flag OFF; existing ASSESS/PATCH/MIGRATE paths unchanged
- Fresh Build Deployment Adapter: generated codebase → authorized upgrade repo branch → Vercel preview URL — EXPERIMENTAL/LOCAL VALIDATION — rejects original repo and main/master writes without Victor approval
- Fresh Build Vercel Config Resolution: deployment adapter resolves product config, Fresh Build env, per-product Vercel project env, and standard Vercel operator envs — EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build Crawler Handoff: multiPageCrawler preserves bounded rendered `html`/`bodyText` for Fresh Build consumers — EXPERIMENTAL/LOCAL VALIDATION — prevents empty component/design extraction on JS-rendered apps
- Fresh Build SSE Evidence: run-construction exposes bounded DesignSpec summaries and partial final payloads on deploy failure — EXPERIMENTAL/LOCAL VALIDATION — no full HTML or full DesignSpec streamed

Fresh Build is Phase 6 work. It does not affect any current workflow. When complete it replaces the upgrade-repo patch approach in Workflow 1 SUB-1B and powers Workflow 2 SUB-2B.

### 3.2 Two Independent Control Axes

The two axes use **disjoint vocabularies** — no bare "MANUAL" appears in either.

**AXIS A — SYSTEM OPERATION LEVEL** — How FlowAI behaves as a whole platform across a full run.
Vocabulary: `MANUAL-OP` / `SUPERVISED-OP` / `END-TO-END-OP`

- **MANUAL-OP** — Provider drives every decision; FlowAI executes only on explicit instruction — CURRENT
- **SUPERVISED-OP** — FlowAI acts autonomously; surfaces decisions for provider review before proceeding — CURRENT
- **END-TO-END-OP** — FlowAI operates autonomously through every pipeline step *up to but not including production deploy*. Production deploy remains Victor-only per §11.3. — `IN_PROGRESS` (path to CURRENT does not require any §11.3 amendment; END-TO-END-OP is fully reachable as scoped here)

*(v2.3 rename: this level was called AUTONOMOUS-OP in v2.2. Renamed to remove the circular dependency where the capability was defined to require production deploy authority but production deploy was non-negotiable per §11.3. END-TO-END-OP is the scoped, achievable version. The FALSE-CLAIM-AUTONOMOUS-DEPLOY negative control remains NOT_IMPLEMENTED — autonomous production deploy is explicitly PROHIBITED.)*

**AXIS B — ORCHESTRA EXECUTION MODE** — How the user interacts with Orchestra member selection at each pipeline step.
Vocabulary: `AUTOMATIC` / `GUIDED` / `MANUAL-ORCHESTRA`

- **AUTOMATIC** — FlowAI selects best Orchestra member per step based on performance + cost history — IN_PROGRESS
- **GUIDED** - FlowAI recommends; user approves or overrides - current default - CURRENT

Current code uses 'auto'/'supervised' vocabulary. Migration to SSOT vocabulary is handled via backward-compatible adapters in Phase 2. SSOT vocabulary is the target standard - existing runtime values are preserved.
- **MANUAL-ORCHESTRA** — User selects Orchestra member at each step explicitly — CURRENT

*(v2.3 rename: this mode was called bare MANUAL in v2.2. Renamed to MANUAL-ORCHESTRA to eliminate confusion with Axis A's MANUAL-OP in operator UI, logs, and tooling.)*

Key disambiguation:
- END-TO-END-OP (Axis A) ≠ AUTOMATIC (Axis B)
- END-TO-END-OP means the whole platform runs autonomously (up to production deploy)
- AUTOMATIC means FlowAI picks the best tool at each step automatically
- A run can be SUPERVISED-OP + AUTOMATIC (current default behavior)
- A run can be MANUAL-OP + GUIDED (provider controls everything, gets recommendations)
- Any Axis A value can combine with any Axis B value

### 3.3 Three Levels of Orchestration

- Level 1: Building FlowAI — Claude Chat, Codex, Victor; SSOT governs — CURRENT
- Level 2: FlowAI on itself — uses own pipeline to evolve its codebase — ROADMAP (RFC required before build begins)
- Level 3: FlowAI on products — any product from any individual or organization — CURRENT/IN_PROGRESS

## PART 4 — THE 8-STEP PIPELINE

All four product workflows run through this pipeline with workflow-appropriate behavior at each step.
1. Research — CURRENT
2. Design — CURRENT
3. Build — IN_PROGRESS
4. Quality Audit — CURRENT
5. Deploy — IN_PROGRESS
6. Self-Renewal — IN_PROGRESS
7. GTM — IN_PROGRESS — not applicable in Workflow 4 (Migration Mode)
8. Monitor — IN_PROGRESS

## PART 5 — THE ORCHESTRA

### 5.1 Selection Principles

- Cost and performance evaluated per task type at each step — ROADMAP
- Best tool selected automatically in AUTOMATIC mode — ROADMAP
- Rankings update based on performance history — ROADMAP
- No single tool hardcoded for any step — TARGET — current implementation has some hardwired paths (Browserless, Playwright, Anthropic, GitHub/Vercel helpers)
- New tools added as ecosystem evolves

### 5.2 Orchestra Members

1. Claude Code — CURRENT
2. Base44 — DEPRECATED — migration source reference only; never selected in AUTOMATIC mode
3. Lovable — ROADMAP
4. v0 — ROADMAP
5. Cursor — ROADMAP
6. OpenRouter — ROADMAP
7. Browserless — CURRENT
8. Anthropic API (direct) — CURRENT
9. Replit — ROADMAP
10. Playwright — CURRENT

Orchestra is not limited to these members.

## PART 6 — THE 26-AGENT ROSTER

All 26 agents are proprietary VEU IP. Never sold individually. Rostered does not mean implemented, wired, runtime-active, or production-verified. Formal agent authority registry status must distinguish rostered, implemented, wired, runtime-active, and production-verified before any agent capability is promoted to CURRENT/VERIFIED.

FlowAI-only agents (8): #4 Provider Onboarding, #5 End-Customer Intake, #8 Quality Audit, #11 Strategic Intelligence, #12 Portfolio Risk & Fire Detection, #14 Public Policy, #16 Productivity & HR, #18 Business Planning & Performance.

Embedded in every product (12): #1 Lifecycle Engine, #2 Code Builder, #3 Self-Renewal, #6 Research, #7 Design, #9 GTM, #10 Monitor, #13 Self-Protection, #15 Benchmarking & Competition, #17 Product Evolution, #19 Technological Evolution, #20 Environmental Impacts.

Ops Runners embedded (1): #21 Aggressive Crawl Conductor.

Business-advisory agents (5): #22 Finance & Procurement, #23 HR & Compensation, #24 Information Security, #25 Customer Care, #26 Legal & Communications. These rows are ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED. Registry mode `step-owner` does not make them §9 Forge-pipeline step owners.

Orchestra membership lifecycle and auto-admission ownership is assigned to `orchestra-membership-executor` as a §15.5 canonical executor entry. The stable `26.orchestra.*` topic identifiers are retained for engineering compatibility; the numeric prefix no longer means Agent #26 owns the capability.

No agent auto-executes without operator approval. No product-specific code in the agent layer.

## PART 7 — PLATFORM DECOUPLING RULE

Status: ACTIVE — applies to all FlowAI v2 upgrade runs.

Rules:
1. Flag platform dependencies as migration items
2. Replace platform functions with direct implementations in v2
3. NEVER patch platform internals (e.g. base44Client.js, SDK configs)
4. v2 repos become standalone products
5. Original stays frozen as rollback

Excluded files (never modify in v2 upgrades): base44Client.js or equivalent platform SDK client; platform auth configuration; platform routing internals; any file auto-generated or managed by the platform.

What FlowAI CAN fix in v2: application-layer UI/UX components; new standalone components replacing platform widgets; CSS/styling; navigation and content structure; SEO, accessibility, grammar, typos; business logic independent of platform SDK.

## PART 8 — AUTO-FIX BOUNDARIES

FlowAI must NOT auto-fix: platform SDK clients or internal config files; auth or authorization escalation; database schema changes; third-party API credential modifications; any change that broadens or narrows access control.

When a root issue falls in these categories, classify as `PLATFORM_BOUNDARY_BLOCKED` and report to operator. Do not generate a patch. Do not create a branch.

FlowAI CAN auto-fix: application-layer UI/UX components; CSS, styling, layout improvements; navigation and content structure; SEO, accessibility, grammar, typos; new standalone components; business logic independent of platform SDK.

## PART 9 — OUTPUT CONTRACT

1. Fresh build (Workflows 1/2/3) or clean fork (Workflow 4) — TARGET/CURRENT
2. Platform free by birth or by migration — TARGET/CURRENT
3. Every successful build output produces a live URL — TARGET
4. Before/after delta measured and recorded — REQUIRES_EVIDENCE
5. Zero unresolved critical blockers at ship — TARGET
6. Two versions always exist (original + output) — CURRENT

Blocked or degraded runs must report honestly rather than producing a partial URL.

## PART 10 — VERIFICATION HONESTY

- `VERIFIED`: only when live production evidence confirms fix works
- `PARTIAL`: built and tested but not verified in production
- `NOT_MEASURED`: requires human judgment or credentials FlowAI does not have
- Scores must reflect real measured state, never aspirational
- If score does not improve after fixes, report honestly
- No fabricated URLs, PRs, branches, metrics, or evidence

## PART 11 — GOVERNANCE RULES

### 11.1 Two Distinct Ratification Gates

v2.3 fix (Panel v2.2 defect 3): the document now explicitly distinguishes two separate gates that were previously conflated.

**Gate A — SSOT Document Ratification.** This document (and any future SSOT version) is ratified when:
- Windows Codex technical review reports no architectural-incompatibility blockers
- PowerShell Codex verification review reports no factual conflicts with current codebase
- Panel of 10 strategic review reaches ≥7/10 READY or MINOR-REVISIONS quorum
- CEO ratifies

**Gate A does NOT require any specific capability completion percentage.** A truth document can be ratifiable while the underlying system is at 0%, 50%, or 95% capability VERIFIED — what matters for Gate A is whether the document accurately describes the current state and the target architecture, not whether the target architecture is built yet.

**Gate B — Product Ship Readiness.** A specific product (saige-v2, reltwin-v2, any future product) is ready to ship to production when:
- Governance score ≥95%
- Readiness score ≥95%
- All §11.3 non-negotiable delivery rules satisfied
- Browser test confirmation
- authorized operator deploy approval

**Gate B is per-product, per-release.** It does not gate SSOT ratification. The 0% current Layer-1-VERIFIED state in §12.1 is the *current capability state of the FlowAI platform*, not a gate against ratifying this document as a truthful record.

### 11.2 Operating Model

- **W0/W04 (Claude Chat)** — Orchestrator; drafts dispatches, holds SSOT context, consolidates panel findings, never edits code.
- **CB (Codex Builder)** — Sole builder; writes, tests, and commits implementation changes. Reads SSOT before and after every task.
- **CR (Codex Reviewer)** — Read-only verification; checks evidence and wired-vs-verified discipline.
- **CD (Claude Code)** — Read-only review; codebase-grounded data-shape checks.
- **CG (ChatGPT)** — Spec critic; no codebase access.
- **WT (Windows Terminal)** — Execution surface/operator terminal only; not a reviewer and not a code author.

### 11.3 Non-Negotiable Delivery Rules

1. Never `git add .` — stage only intended files
2. Never commit untracked docs/scripts
3. Never deploy production without authorized operator approval
4. Never expose secrets to frontend or VITE env
5. Build + lint + full tests before every commit
6. PowerShell verifies before any deploy
7. No dispatch ships without Claude Chat review
8. No feature ships without browser test confirmation
9. No commit ships without SSOT update
10. One step at a time — no parallel unverified work

### 11.4 SSOT as Living Document (Updated for v2.3)

Amendment process:
- Any team member may PROPOSE an amendment
- A PROPOSED amendment must go through three reviews:
  1. Windows Codex technical review
  2. PowerShell Codex verification review
  3. Panel of 10 strategic review (quorum: ≥7/10 per Locked Rule 17)
- All three reviews must complete within 72 hours of PROPOSED submission. If any review does not complete within 72 hours, the amendment auto-reverts to draft status with timeout reason logged.
- If Windows Codex and PowerShell Codex disagree, Claude Chat arbitrates using the three-class taxonomy: `CURRENT` / `TARGET` / `PROHIBITED`. Victor has final authority on arbitration outcome.
- CEO ratifies after all three reviews
- No amendment may reduce a previously VERIFIED Layer-1 claim without evidence of regression and explicit CEO authorization
- PROPOSED amendments do not take effect until CEO ratification
- Tactical workarounds must be labeled as workarounds — not vision statements
- Amendments committed to a draft file first; after Victor confirms, all four canonical files updated in one commit.

**Concurrent amendment handling (v2.3 fix).** If two PROPOSED amendments touch the same section, the second one queues until the first ratifies, expires, or is withdrawn. Two PROPOSED amendments touching disjoint sections may proceed in parallel. The merge happens at commit time and is Windows Codex's responsibility; if a merge conflict arises, Claude Chat arbitrates and Victor has final authority.

**Amendment-of-amendment semantics (v2.3 fix).** If a PROPOSED amendment is itself revised before ratification (e.g. v2.2 → v2.3), the revision restarts the 72-hour clock as a new submission. The prior draft is archived with the reason for revision. Multiple revisions in flight do NOT compound clocks — the clock applies to the most recent PROPOSED version only.

**Panel rerun clock semantics (v2.3 fix).** If Panel quorum is not reached and a rerun is invoked (per §11.5), the rerun resets the 72-hour clock for the Panel step only — Windows Codex and PowerShell Codex reviews completed within the original window remain valid and do not need to be re-run unless the amendment text changed.

**Rollback policy.** If a ratified amendment is found to introduce errors, Victor may authorize an immediate rollback to the previous version. Windows Codex restores the prior canonical files. The erroneous amendment is archived, not deleted, with an error note.

### 11.5 Panel Governance

- Panel quorum: ≥7/10 reviewers per Locked Rule 17
- If quorum not reached, Panel may be re-run with reduced question count (≤3 questions per consultation)
- Panel consultations saved to: `docs/panel-consultations/`
- Panel ratification required for major SSOT changes

## PART 12 — CAPABILITY LEDGER

Current state as of W09 (2026-05-26). This is the *current capability state*, not a gate against this document's ratification (see §11.1 Gate A vs Gate B).

### 12.1 Evidence Claims (Layer 1 — Matrix Status)

- `CA18-AUDIT-TRAIL` — Governance audit trail — PARTIAL — downgraded — no evidence artifact at time of audit; evidenceUrl + verifiedAt + verifiedBy required to promote.
- `CA18-DEPLOY-TRUTH` - Deploy truth MATCH + Supabase persisted (row 4a0e7a81) - PARTIAL — downgraded — no evidence artifact at time of audit; evidenceUrl + verifiedAt + verifiedBy required to promote.
- `CA18-URL-ANY` — Arbitrary URL diagnosis-only behavior — PARTIAL
- `CA18-HONEST-URL` — No fabricated improved URL — PARTIAL
- `CA18-WEIGHTED-SCORE` — rawScore + effectiveTrustScore in governance artifact — PARTIAL
- `CA18-DIMENSION-DISCLOSURE` — All 10 dimensions in production artifact — PARTIAL
- `CA18-EVAL-PIPELINE` — evaluator_id + provenance in live run — PARTIAL
- `CA18-DELTA-VERIFY` — Before/after snapshot + computed delta — PARTIAL
- `CA18-REMEDIATION-SAFETY` — Canonical thresholds + rollback policy artifact; source-mapped blocked-vs-incomplete category collapse fixed on branch pending production governance artifact — PARTIAL
- `CA18-UNIVERSAL-LIMIT` — Unregistered URL — no branch/PR/deploy — PARTIAL
- `CA-19` — PROPOSED-DEFERRED. Re-submission trigger: concrete moat instruments in place (IP filings, network-effect architecture, data lock-in mechanism).
- `CA-25` — PROPOSED-DEFERRED. Re-submission trigger: SAIGE step 1 forge executes and produces auditable graduation criteria.
- `FALSE-CLAIM-AUTONOMOUS-DEPLOY` — Negative control: autonomous production deploy is PROHIBITED — NOT_IMPLEMENTED
- `FRESHBUILD-FEATURE-EXTRACTOR` — Feature Extractor schema, contract, and live-crawl wiring: **PARTIAL evidence of an EXPERIMENTAL capability (feature flag OFF by default)**. Deterministic coverage uses mocked crawler/Browserless; production Fresh Build remains disabled until Victor enables the feature flag. PARTIAL+EXPERIMENTAL is a coherent compound state — see "Coherent compound states" note in Status Label Definitions. Excluded from the §11.1 Gate B 95% completion denominator until sidecar/checker updated by ratified amendment — PARTIAL

SSOT completion against Gate B 95% target: **0 / 11 release-critical Layer-1 claims VERIFIED = 0%**. FRESHBUILD-FEATURE-EXTRACTOR excluded from denominator. This 0% is the current capability state, not a blocker against Gate A SSOT ratification.

### 12.2 Capability Planning (Layer 2)

- Workflow 1 SUB-1A analysis/scoring: CURRENT
- Workflow 1 SUB-1A source-mapped fix proposals: IN_PROGRESS
- SSOT Axis A/B vocabulary adapters: IN_PROGRESS — branch implementation maps internal runtime values to SSOT governance vocabulary without changing API/runtime enums; production verification pending
- Workflow 1 SUB-1B: IN_PROGRESS
- Workflow 2 SUB-2A: IN_PROGRESS
- Workflow 2 SUB-2B: ROADMAP
- Workflow 3 TYPE-3A: ROADMAP
- Workflow 3 TYPE-3B: ROADMAP
- Workflow 4 Migration: CURRENT/IN_PROGRESS
- Fresh Build Feature Extractor: EXPERIMENTAL/LIVE-CRAWL WIRED
- Fresh Build Design Synthesizer: EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build Codebase Generator: EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build Orchestrator: EXPERIMENTAL/PARALLEL MODE WIRED
- Fresh Build Deployment Adapter: EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build Vercel Config Resolution: EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build Crawler Handoff: EXPERIMENTAL/LOCAL VALIDATION
- Fresh Build SSE Evidence: EXPERIMENTAL/LOCAL VALIDATION
- Multi-modal inputs: ROADMAP
- Multiple URL input and synthesis: ROADMAP
- Orchestra AUTOMATIC selection: ROADMAP
- END-TO-END-OP system operation level: IN_PROGRESS
- Level 2 FlowAI on itself: ROADMAP
- Fresh codebase generation: TARGET
- Mobile/native desktop app output: ROADMAP
- Domain/tier/access model: ROADMAP

### 12.3 Production Evidence (W09)

- Production URL: `flowai-dun.vercel.app`
- HEAD commit: `c718bf8`
- Tests passing: 3019 (at commit c718bf8)
- Deploy truth: MATCH — Supabase persisted, row `4a0e7a81`
- SAIGE migration: 267 files — `MIGRATION_COMPLETED_VERIFICATION_DEGRADED`
- saigeplatform.com score: 25.8/100
- saige-v2 score: 35.5/100 (+9.7 from migration)
- GTM early score saige-v2: 70.5/100

### 12.3.1 Production Evidence Reconciliation (P2-P9)

Scope: P2-P9 implementation evidence reflection only. This section records shipped code and proof labels; it does not promote any Layer 1 CA18 claim to VERIFIED.

Current production evidence after P9:
- Production URL: `flowai-dun.vercel.app`
- HEAD commit: `71b3500`
- HEAD proof: `/api/version` returned `commitFull: 71b3500c27743e58861807291e0a2b108c49e363`
- Production deployment: `truthful-flow-logic-o20j9qu5s-veu-ai-studio.vercel.app`
- Automated production browser proof: `npm run test:e2e:ci` with `PLAYWRIGHT_BASE_URL=https://flowai-dun.vercel.app` passed 10/10.
- Implemented phases: P2 live execution, P3 ProductSSOT minimal persistence, P4 Deploy, P5 Self-Renewal, P6 GTM, P7 Monitor, P8 Symbiotic Loop, P9 reference vertical slice.
- Proof labels: UNIT, MOCKED_E2E, LIVE_PRODUCTION.
- Evidence tier: Tier B behavioral evidence for implemented wiring and production smoke behavior; no Layer 1 VERIFIED promotion.

Claim impact: no Layer 1 claim advances to VERIFIED. The release-critical Layer-1 aggregate remains **0 / 11 VERIFIED = 0%** until the claim-promotion checklist is satisfied with `evidenceUrl`, `verifiedAt`, and `verifiedBy`.

### 12.4 Orchestrator Framework v0.1 Matrix Reflection

Scope: Layer 2 capability reflection only. This entry does not promote any Layer 1 CA18 claim to VERIFIED.

Governing SSOT reframe: commit `2d1af7b` (`docs: reframe FlowAI SSOT as orchestrator`), which records FlowAI as a human-run orchestrator OS rather than a standalone build engine.

Implementation evidence:
- Code commit: `228dcdf` (`feat: add orchestrator framework registry`)
- Manifest commit: `0d51cf0` (`docs: add verifier manifest for orchestrator framework v0.1`)
- Branch: `flowai/orchestrator-framework-v0-1-audit-clean`
- Push status at reflection time: NOT PUSHED

PowerShell re-audit result against SSOT `2d1af7b` and dispatch v4: PASS.

Verified audit points:
- `src/api/base44Client.js` untouched by code commit `228dcdf`.
- No `docs/` files changed by code commit `228dcdf`; manifest is isolated in `0d51cf0`.
- Lane separation honored: Codex Window implemented `src/`; PowerShell audited and wrote only docs manifest/matrix entries.
- Registry access modes align with SSOT enum: `api`, `github`, `browser`, `human-relayed`.
- Base44 registry entry remains `human-relayed`; no autonomous Base44 API control is claimed.
- Auto mode exposes `modeMaturity: ENVISIONED`; selection skeleton is built, but live multi-platform execution remains ENVISIONED.
- Scoring adapter does not fabricate readiness: no scorer returns `SCORE_BLOCKED_STUB`, and real scores require an injected callable scorer result.
- Go-to-Market and all market exposure remain gated by score >=95 and evidence status `VERIFIED`.
- Live-call envelopes are disabled by default (`liveEnabled=false`) and expose only credential reference names, not secret values.

Maturity reflection:
- Orchestrator registry/routing/modes: BUILT/TESTED. Evidence: automated tests in `tests/orchestratorFramework.test.js`; verifier task `orchestrator-framework-v0.1` passed against `228dcdf`.
- Honest-stub scorer: PARTIAL. Evidence: scoring adapter and tests prove non-fabrication and hard market gate, but real scorer integration is not yet implemented.
- Live multi-platform execution: ENVISIONED. Evidence: registry and live-call envelopes are present, but `liveEnabled=false` for all initial platforms.
- 95% iteration loop end-to-end: ENVISIONED. Evidence: gate adapter exists, but durable browser/production/real-data loop evidence has not been captured.

Verification commands:
- `npx vitest run` - PASS, 3081 passed, 3 skipped.
- `npm run build` - PASS.
- `npm run lint` - PASS with existing flat-config warnings only.
- `node scripts/check-ssot-traceability.mjs` - PASS.
- `node scripts/verify-task.mjs --task orchestrator-framework-v0.1 --commit 228dcdf` - PASS.

Next gate: v0.2 scoring loop remains blocked until Victor decides push/merge for v0.1 after Claude consistency review and this matrix reflection.

## PART 13 — THREE SERVICE DOMAINS

These are mission and business-model commitments. The traceability matrix tracks the engineering capabilities required to deliver each domain as separate rows — not these statements themselves. FlowAI is one product with one codebase serving all three domains through differentiated pricing tiers.

**Domain 1 — VEU AI Studio Operating System** — MISSION | Deployment: ACTIVE.
FlowAI as internal operating system infrastructure for VEU AI Studio. First organizational user, not the only one. All five VEU products run on FlowAI. Domain 1 proves FlowAI works at scale before external domains open. Commercial model: Internal — no external revenue.

**Domain 2 — Small Entity Operating System** — MISSION | Deployment: Post-Domain-1.
Operating system infrastructure for small entities — individuals and small organizations globally. Commercial model: Subscription or usage-based, priced for small entity budgets.

**Domain 3 — AI Democratization Platform** — MISSION | Deployment: Post-Domain-1.

This domain is a founding mission of VEU AI Studio — not an afterthought. It is why FlowAI exists.

FlowAI enables underserved communities to DEVELOP, BUILD, OPERATE, MAINTAIN, MONETIZE digital products of any type (websites, mobile apps, desktop apps, SaaS, agentic AI products).

Target beneficiaries: individuals with ideas but no technical team; small businesses in Africa, Asia, Latin America, and other underserved regions; community organizations and social enterprises; first-generation digital entrepreneurs; anyone excluded from the AI economy by cost, geography, language, or expertise.

Why this matters: the AI revolution is concentrating wealth and capability in the hands of those who already have technical and financial resources. FlowAI is explicitly designed to break that concentration.

**Domain 3 Commercial Allocation Rule (v2.3 fix):**

Costs in Domain 3 are absorbed in the following allocation order. Each user/product is matched to the highest-applicable tier; no user is denied access for inability to pay.

1. **Default tier: FREEMIUM.** Base capability — analyze, recommend, specify — free at point of use for any individual or community organization meeting Domain 3 criteria. No payment required, no payment infrastructure consumed.
2. **Beyond freemium: GRANT or PARTNERSHIP funded if available.** When a NGO, development bank, government, or impact investor has funded a community or region, Domain 3 users in that scope draw against that grant. Allocation decisions follow the grant terms; VEU AI Studio audits but does not unilaterally allocate.
3. **Fallback: VEU SUBSIDIZED.** When neither freemium nor grant funding applies, VEU AI Studio absorbs the cost via cross-subsidy from Domain 1 (internal) and Domain 2 (subscription) revenue. This is the load-bearing tier — when grants are unavailable, VEU bears the cost rather than denying access.

**Operational invariant: no Domain 3 user is denied access for inability to pay.** If all four sources (freemium / grant / partnership / VEU subsidy) cannot cover a specific request, VEU AI Studio still serves the request and absorbs the cost as a mission expense, not a financial decision.

Allocation authority: VEU AI Studio CEO holds final allocation decision. Day-to-day allocation operates per the cascade above; exceptions require CEO sign-off.

**One Product Principle.** One codebase. No separate branding per domain. No separate codebases. Same pipeline, agents, and Orchestra serve all three domains. Differentiation is by pricing tier and access level only. FlowAI is not an enterprise SaaS tool.

**Domain Deployment Sequence.** Domain 1 → Domain 2 → Domain 3. Domain 1 must prove FlowAI works at scale before external domains open.

## PART 14 — COMPANION FILES

- `docs/specs/SSOT_TRACEABILITY_MATRIX.md` — canonical SSOT matrix
- `docs/specs/SSOT_TRACEABILITY_MATRIX.sidecar.json` — machine-readable claim records (Layer 1)
- `scripts/check-ssot-traceability.mjs` — schema + evidence-rule checker
- `docs/CANONICAL_REFERENCE.md` — single authoritative SSOT
- `docs/FLOWAI_SSOT.md` — archived tombstone pointing to `docs/CANONICAL_REFERENCE.md`
- `docs/CANONICAL_HISTORY.md` — build history and major decisions
- `docs/governance/CODEX_WINDOWS_STANDING_DIRECTIVE.md` — Windows Codex standing directive (and agent authority registry per §6)
- `docs/panel-consultations/` — Panel review records
- `docs/specs/FLOWAI_SSOT_V2_2_DRAFT.md` — prior version, superseded by this draft

## PART 15 — REVIEW AND RATIFICATION PROCESS

Step 1 — Windows Codex (Technical Feasibility) — read-only classification.
Step 2 — PowerShell Codex (Verification) — read-only fact-check.
Step 3 — Panel of 10 (Strategic and Governance) — ≥7/10 quorum.
Step 4 — Claude Chat Synthesis — consolidates all three for Victor.
Step 5 — CEO Ratification — ratify / request revisions / approve revised version.
Step 6 — Codex Builder Commit — updates the authoritative SSOT file and any affected traceability artifacts in one commit. `docs/FLOWAI_SSOT.md` is archived as a tombstone; the single authoritative SSOT is `docs/CANONICAL_REFERENCE.md`.

## PART 16 - KNOWN GAPS FOR v2.4 CYCLE

- User intent layer (Faithful/Improved/Migration) - deferred to Phase 4
- Fresh Build module interface contracts - documented in `docs/specs/FRESH_BUILD_ENGINE_CONTRACTS.md` during Phase 3A local validation
- Security/tenant boundary design - deferred to Phase 8 pre-task
- Fresh Build overlay-write strategy leaves platform residue when generated files do not replace every stale platform config. Quick fix in the Phase 3B Task C commit is comprehensive config generation. Longer-term: consider orphan-branch or clean-write strategy.
- Phase scope: 1=foundation, 2=Workflow 1, 3=Fresh Build, 4=Workflow 2+intents, 5=Workflow 3, 6=agents, 7=Orchestra, 8=Domain 2/3

## PART 16A — CA-DELIVERY-DISTRIBUTION-GOVERNANCE TRACEABILITY

**CA-DELIVERY-DISTRIBUTION-GOVERNANCE — RATIFIED by CEO 2026-06-01, base `36e9897`.** This entry amends the SSOT delivery and distribution contract only; it does not promote any claim to VERIFIED.

Traceability effects:

- §7 Output Contract generalizes from "always a deployed URL" to a canonical per-target-class DELIVERY ARTIFACT.
- §4/§6 operationalize all six target classes through detector sets and delivery adapters; implementation is DEFER-TO-BUILD by class.
- §9 Step 3 adds Build `targetMode ∈ {native, cross_platform, pwa_wrap}` selected by Tool Intelligence.
- §9 Step 5 adds the distribution-adapter registry, async submission-job statuses, and the submission-vs-publish boundary.
- §15.1 Agent #10 Monitor adds store-review-status as a fourth signal channel into ProductSSOT.
- §22 reaffirms SAIGE portability: SAIGE is a reference fixture, not a special-case destination.
- §23/§24 define six operating roles and key-vs-cleanup dispatch governance.
- §27 dispositions close the open-question audit without upgrading verification claims.
- §28.7 records the Layer 4 Building Guidance stub.

Disposition records:

- `CA-4` — WITHDRAWN, market/user-driven design question, 2026-06-01.
- `CA-5` — WITHDRAWN, market/user-driven design question, 2026-06-01.
- `CA-6` — WITHDRAWN, market/user-driven design question, 2026-06-01.
- `CA-16-B` — WITHDRAWN, market/user-driven design question, 2026-06-01. §11.7 admin-only approval from ENTRY 015 remains unchanged.
- `CA-16-C` — RESOLVED as canonical target-class delivery contract; implementation deferred to each class's build dispatch.

§27 disposition closures:

- Flow-builder code — RESOLVED-LEGACY-WIRED; future archival requires cleanup dispatch and tombstone.
- Self-Renewal Agent #3 questions — RESOLVED-BY-CODE; no production verification claim upgraded.
- Orchestra Integration questions — Q1/Q4/Q5 CODE-SUPPORTED, Q6 RESOLVED by ENTRY 019, Q2/Q3/Q7/Q8/Q9 DEFER-TO-BUILD.

Single-SSOT note: `docs/CANONICAL_REFERENCE.md` is the single authoritative SSOT. `docs/FLOWAI_SSOT.md` is archived and retained only as a tombstone pointer.

## DOCUMENT CONTROL

- Document: FlowAI Single Source of Truth
- Version: 2.3 — Revised after Panel v2.2 review
- Status: RATIFIED - CEO Victor Udo, FNSE, PhD 2026-05-26
- Date: 2026-05-26
- CEO: Victor Udo, FNSE, PhD — VEU AI Studio
- Classification: CONFIDENTIAL — VEU AI Studio Internal
- Replaces: All prior SSOT versions including v2.0 / v2.1 / v2.2
- Repo: github.com/victor2081new-cloud/flowai
- Branch: flowai-v0.1
- HEAD: 36e9897
