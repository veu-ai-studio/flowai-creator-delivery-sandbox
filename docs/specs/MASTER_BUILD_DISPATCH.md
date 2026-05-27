FlowAI Master Build Dispatch v3
Authority: Victor Udo, FNSE, PhD — CEO, VEU AI Studio
SSOT: v2.3 RATIFIED — 2026-05-26
Branch: flowai-v0.1
Current HEAD: c718bf8
Production: flowai-dun.vercel.app

STANDING RULES — APPLY TO EVERY PHASE
Read before every task. Never change.

Never git add . — stage only intended files
Never commit untracked docs/scripts
Never deploy production — Victor deploys
Never expose secrets to frontend or VITE env
Never touch base44Client.js or any blocked file
Never touch original product repos — write
only to authorized target repos and branches
Never promote SSOT claim to VERIFIED without
matching runtime/governance artifact
Feature flags remain OFF by default until
Victor explicitly enables them
Build + lint + full tests before every commit
EXCEPTION: docs-only commits require SSOT
checker + git diff check; full tests may be
skipped only with Victor authorization and
waiver recorded in Phase Completion Report
Every commit must either update SSOT or
explicitly state why no SSOT change was needed
One step at a time — stop only at STOP,
HARD GATE, or approval checkpoint

GATE PROCESS — APPLIES AT END OF EVERY PHASE

Windows Codex submits Phase Completion Report
PowerShell Codex verifies — standard demarcation
box with ET timestamp, GATE VERDICT
Victor deploys to production
Claude Chat + Victor test the live product together
Claude Chat issues Phase Clearance:
PHASE N COMPLETE — PHASE N+1 AUTHORIZED
Windows Codex begins next phase only after
Phase Clearance is issued

No phase starts without explicit Phase Clearance.
PHASE COMPLETION REPORT — REQUIRED FIELDS
Every phase report must include all of these:

Current phase number and name
Commit hash(es)
Files changed list
Test count and result (pass/fail)
Build result (pass/fail)
Lint result (pass/fail)
SSOT checker result (pass/fail)
Browser verification status
Production deploy status
SSOT claims changed or unchanged
Evidence artifacts captured (IDs)
Conservative choices made (if any)
Test waivers authorized (if any)
Known risks or blockers
Phase-specific fields listed in each phase below


PHASE 1 — FOUNDATION AND SSOT COMMIT
Goal: Commit ratified SSOT v2.3 as canonical
and establish the clean foundation for all
build phases.
Important: SSOT v2.3 is ratified by CEO
Victor Udo by instruction as of 2026-05-26.
The file on disk still says PROPOSED in its
control text. Phase 1 corrects this as its
first action. Do not treat RATIFIED status
as canonical until this Phase 1 commit lands.
This is a document-only commit.
No production code changes in Phase 1.
Mandatory: run SSOT checker + git diff before
committing. Full test suite recommended but
waivable — record waiver in report if skipped.
Tasks:
TASK 1 — Pre-commit SSOT fixes
Source file: docs/specs/FLOWAI_SSOT_V2_3_DRAFT.md
Fix 1: Status line
From: PROPOSED — pending Panel v2.3 review
To:   RATIFIED — CEO Victor Udo, FNSE, PhD
2026-05-26
Fix 2: Remove the parenthetical note
"confirm sidecar reflects VERIFIED before
ratification" from CA18-DEPLOY-TRUTH in §12.1.
It is now confirmed per PowerShell verification.
Fix 3: Add under §3.2 Axis B:
"Current code uses 'auto'/'supervised' vocabulary.
Migration to SSOT vocabulary is handled via
backward-compatible adapters in Phase 2.
SSOT vocabulary is the target standard —
existing runtime values are preserved."
Fix 4: Workflow 1 SUB-1A — split the status:
Analysis/scoring: CURRENT
Source-mapped fix proposals: IN_PROGRESS
(handoff fix is Phase 2 Task 2)
Fix 5: 20-agent roster — add note:
"Roster is TARGET architecture. Formal agent
authority registry must be created and approved
before any agent is marked CURRENT.
See Phase 6 Task 1."
Add §16 Known Gaps for v2.4 cycle:

User intent layer (Faithful/Improved/Migration)
deferred to Phase 4
Fresh Build module interface contracts
deferred to Phase 3
Security/tenant boundary design
deferred to Phase 8 pre-task
Phase scope: 1=foundation, 2=Workflow 1,
3=Fresh Build, 4=Workflow 2+intents,
5=Workflow 3, 6=agents, 7=Orchestra,
8=Domain 2/3

TASK 2 — Run SSOT checker before commit:
node scripts/check-ssot-traceability.mjs
Must pass. If it fails, fix before proceeding.
Full test suite if practical:
npx vitest run
TASK 3 — Commit all four canonical files
together in one commit.
For SSOT_TRACEABILITY_MATRIX.md:
Replace the full document content with the
fixed v2.3 content from FLOWAI_SSOT_V2_3_DRAFT.md.
For SSOT_TRACEABILITY_MATRIX.sidecar.json:
Update metadata only: version=2.3,
status=RATIFIED, date=2026-05-26.
Do not overwrite existing evidence rows
unless the evidence itself changed.
For CANONICAL_REFERENCE.md:
Update SSOT version reference to v2.3 RATIFIED.
Update HEAD to c718bf8.
For CANONICAL_HISTORY.md:
Add entry: 2026-05-26 — SSOT v2.3 RATIFIED
by CEO Victor Udo, FNSE, PhD. Supersedes all
prior versions and amendments CA-18 through
CA-20D. Eight-phase build program authorized.
Commit message:
docs: commit ratified SSOT v2.3 as canonical —
CEO approved 2026-05-26
Phase 1 exit criteria:

All four canonical files committed together
SSOT status = RATIFIED in all four files
SSOT checker: PASS
No code files changed
Evidence rows not overwritten

Phase 1 Completion Report additional fields:

SSOT checker result before commit
Confirmation all four files in one commit
Full tests run or waiver recorded

═══════════════════════════════════════════════
POWERSHELL GATE 1
Verify all four canonical files updated,
SSOT status = RATIFIED, checker clean,
no code files modified, evidence rows intact.
GATE VERDICT: PHASE 1 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 1:
Confirm SSOT v2.3 is live in repo.
Confirm canonical reference reflects v2.3.
Issue Phase 2 Authorization.

PHASE 2 — WORKFLOW 1 COMPLETE
Goal: Fix the source-mapped fix proposal
handoff so FlowAI produces actionable fix
proposals for safe app-layer files. Add
backward-compatible SSOT vocabulary adapters.
SSOT reference: §3.1 Workflow 1 SUB-1B,
§12.1 CA18-REMEDIATION-SAFETY
Tasks:
TASK 1 — Diagnose handoff gap (read-only):

Locate sourceMappedFixGenerator.js
Identify exact fields being dropped
Confirm base44Client.js is blocked
List safe target files
Confirm status precedence not implemented
Report proposed minimum fix before any code

STOP. Report before Task 2.
TASK 2 — Fix the handoff:
File classification rules:

Platform: base44, platform-sdk, sdk-client
Auth: Auth, Session, Provider, src/auth/
Config: .config.js, .env, vite.config*
Package: package.json, lockfiles
Platform-generated: base44/ dir, @base44 imports

Allowlist: import and reuse existing
src/lib/migration/migrationWriteAllowlist.js
Do not create a duplicate.
Confidence threshold: MIN_SOURCE_MAP_CONFIDENCE
= 0.65 exported from
src/lib/sourceMapping/sourceMappingConstants.js
Resolution definition — selectedFilePath resolves
when ALL THREE are true:
(a) passes migration write allowlist
(b) not classified as boundary file
(c) non-empty string
Status precedence (explicit — highest first):
PLATFORM_BOUNDARY_BLOCKED

HUMAN_REVIEW_REQUIRED
source_map_incomplete (genuine failure only)
actionable

Multiple candidates: top-1 rule only.
If top-1 is blocked, finding is blocked.
Do not fall through to candidate-2.
Create if not exists:

src/lib/sourceMapping/classifyFileBoundary.js
src/lib/sourceMapping/sourceMappingConstants.js

Tests must prove:

Safe file + confidence ≥0.65 → actionable
base44Client.js → PLATFORM_BOUNDARY_BLOCKED
not source_map_incomplete
Auth file → HUMAN_REVIEW_REQUIRED
not source_map_incomplete
source_map_incomplete only on genuine failure
PLATFORM_BOUNDARY_BLOCKED beats
source_map_incomplete if both conditions apply
All 3019 existing tests still pass

Commit: fix: source-map handoff — separate
blocked from incomplete
TASK 3 — SSOT vocabulary adapters (not rename):
Do NOT rename existing runtime enum values.
Do NOT change any API contract or payload schema.
Do NOT break existing UI routes or saved state.
Add a vocabulary translation layer only:

SSOT AUTOMATIC ↔ internal 'auto'
SSOT GUIDED ↔ internal 'guided'
SSOT MANUAL-ORCHESTRA ↔ internal 'manual'
SSOT SUPERVISED-OP ↔ internal 'supervised'
SSOT MANUAL-OP ↔ internal 'manual' (Axis A)

Governance artifacts and SSOT updates use
SSOT vocabulary. Runtime code preserves
existing values. No existing test breaks.
Commit: refactor: add SSOT vocabulary adapters
for run modes — backward compatible
TASK 4 — Production verification run:
After Victor deploys Phase 2:
Run Workflow 1 against https://saige-v2.vercel.app
Report: actionable proposals count, blocked
findings breakdown, raw score, effective trust
score, readiness score, governance artifact ID.
Update CA18-REMEDIATION-SAFETY in SSOT.
Phase 2 exit criteria:

source_map_incomplete no longer fires for
blocked files
Actionable proposals: at least one when a
safe eligible finding exists. Zero is acceptable
ONLY if all findings are correctly classified —
report as VERIFIED NEGATIVE RESULT with evidence
SSOT vocabulary adapters in place,
no runtime breakage
All 3019 tests passing
Production run governance artifact captured

Phase 2 Completion Report additional fields:

Actionable proposal count
Blocked findings breakdown by category
Raw / effective trust / readiness scores
Governance artifact ID
Confirmation base44Client.js not modified

═══════════════════════════════════════════════
POWERSHELL GATE 2
Verify commits, base44Client.js untouched,
no API contracts broken, adapters backward-
compatible, tests passing, artifact captured.
GATE VERDICT: PHASE 2 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 2:
Run Workflow 1 together against saige-v2.
Review fix proposals. Confirm actionable.
Issue Phase 3 Authorization.

PHASE 3A — FRESH BUILD ENGINE MODULES
Goal: Build the three Fresh Build modules
with complete interface contracts and local
validation. No live production run yet.
Feature flag stays OFF.
SSOT reference: §3.1 Fresh Build Engine
Tasks:
TASK 1 — Feature Extractor: live crawl wired
Extend src/lib/freshBuild/featureExtractor.js:

Import existing multiPageCrawler (do not copy)
Import existing Browserless client (do not copy)
Produce FeatureInventory with all required fields
UNKNOWN for undetectable fields
AUTH_REQUIRED for auth-gated pages
No product-specific logic anywhere

Tests:

Unit tests with mocked crawler/Browserless
are mandatory for the deterministic suite
Live crawl integration smoke test against a
public URL is required before the Phase Gate
where environment supports it; not part of
the deterministic unit suite

Commit: feat: wire live crawl into Feature Extractor
TASK 2 — Design Synthesizer
New: src/lib/freshBuild/designSynthesizer.js
Extracts from any live URL:

Color palette (hex + usage context)
Typography (families, sizes, weights)
Layout patterns (structure, spacing, breakpoints)
Component visual specs per FeatureInventory item
UX patterns (loading, error, empty states)
Technology signals (CSS framework, icons)
Output: DesignSpec JSON — UNKNOWN for undetectable
No product-specific logic

Commit: feat: add Design Synthesizer
TASK 3 — Codebase Generator
New: src/lib/freshBuild/codebaseGenerator.js
Takes FeatureInventory + DesignSpec, generates:

Project structure
Design system (Tailwind config from DesignSpec)
One component file per FeatureInventory component
One page file per FeatureInventory page
Navigation wired between pages
package.json with standard npm deps only
Vercel deployment config

Safety gates (all required before any file write):

Zero platform SDK imports check
Dependency allowlist check
Secret scan (no API keys, tokens, passwords)
Syntactic validation
platformDependencies: [] enforced
Per-run cap: ≤200 API calls, hard stop with
BLOCKED if exceeded
Cap visible in GeneratedCodebase metadata

Commit: feat: add Codebase Generator
TASK 4 — Interface contracts documented
Save to: docs/specs/FRESH_BUILD_ENGINE_CONTRACTS.md
Must include:

FeatureInventory schema (fields, types, required)
DesignSpec schema (fields, types, required)
GeneratedCodebase schema (fields, types, required)
Module interface: what each consumes and produces

Commit: docs: Fresh Build engine interface contracts
Phase 3A exit criteria:

All three modules built and tested
Unit tests pass deterministically with mocks
All safety gates pass on generated output
platformDependencies always empty
Interface contracts documented
FLOWAI_ENABLE_FRESH_BUILD still false
All existing tests still passing

Phase 3A Completion Report additional fields:

Unit test results with mocks
Integration smoke test result if run
Safety gate results per gate
platformDependencies count (must be 0)
Interface contracts file path

═══════════════════════════════════════════════
POWERSHELL GATE 3A
Verify three modules, safety gates, interface
contracts, feature flag OFF, tests passing.
GATE VERDICT: PHASE 3A COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 3A:
Review interface contracts.
Review generated output from test run.
Confirm safety gates work.
Issue Phase 3B Authorization.

PHASE 3B — FRESH BUILD FIRST LIVE RUN
Goal: Wire Fresh Build orchestrator into
the pipeline and run the first controlled
live Fresh Build against saige-v2.
Tasks:
TASK 1 — Fresh Build Orchestrator
New: src/lib/freshBuild/freshBuildOrchestrator.js
Runs sequence:
Feature Extractor → Design Synthesizer →
Codebase Generator → write to upgrade repo
Add FRESH_BUILD as new parallel mode in UI.
FLOWAI_ENABLE_FRESH_BUILD=false until Victor enables.
All existing modes (ASSESS/PATCH/MIGRATE): untouched.
Commit: feat: wire Fresh Build orchestrator
as parallel run mode
TASK 2 — GitHub/Vercel deployment adapter
Wire generated codebase files to upgrade repo
via GitHub API.
Write target: authorized upgrade repo branch only.
Never write to original repo.
Never write to main branch unless Victor approves.
Deploy upgrade repo to preview URL via Vercel.
Capture preview URL in run output.
Commit: feat: Fresh Build deployment adapter
TASK 3 — First controlled live run:
Victor enables FLOWAI_ENABLE_FRESH_BUILD=true
Run Fresh Build against https://saige-v2.vercel.app
Expected:

FeatureInventory produced
DesignSpec produced
GeneratedCodebase produced
platformDependencies: []
Preview URL live and browsable
Before/after score comparison captured
Governance artifact ID captured

Victor reviews live URL. Victor approves or
rejects before any further Fresh Build runs.
Phase 3B exit criteria:

Fresh Build produces a browsable live URL
platformDependencies always empty
Generated code only in upgrade repo branch
Original repo untouched
Score comparison captured
Victor reviewed and approved output
All existing tests still passing

Phase 3B Completion Report additional fields:

FeatureInventory field count
DesignSpec color/font extraction confirmed
GeneratedCodebase file count
platformDependencies count (must be 0)
Target repo and branch confirmed
Preview URL
Before/after score delta
Governance artifact ID

═══════════════════════════════════════════════
POWERSHELL GATE 3B
Verify orchestrator, deployment adapter,
live URL, platformDependencies=0,
original repo untouched, artifact captured.
GATE VERDICT: PHASE 3B COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 3B:
Browse the Fresh Build live URL together.
Compare to original saige-v2.
Review score comparison.
Issue Phase 4 Authorization.

PHASE 4 — USER INTENT LAYER + WORKFLOW 2
Goal: Add Faithful/Improved/Migration intent
selection at run setup. Build Workflow 2 so
FlowAI creates a brand new product from a
text description.
SSOT reference: §3.1 Workflow 2, §16
Tasks:
TASK 1 — User intent selection at run setup:
FAITHFUL_REBUILD
Purpose: same product, platform-free, parity.
Success metric: parity + platform independence.
Step 2 Design: maps existing design for faithful
reproduction. Does NOT critique or propose
improvements.
Parity gates: page count parity or documented
exceptions, nav parity, core content parity,
component inventory coverage, no platform imports.
IMPROVED_REBUILD (current default — now named)
Purpose: same concept, FlowAI improves it.
Success metric: parity + quality delta.
Step 2 Design: current behavior.
INCREMENTAL_MIGRATION
Purpose: strip platform dependencies.
Maps to existing Workflow 4.
Store intent in run context.
Pass to each pipeline step.
Step 2 Design behavior gates on intent.
Update SSOT: user intent layer added to §3.1.
Commit: feat: user intent selection —
Faithful / Improved / Migration
TASK 2 — Workflow 2 SUB-2A: spec from description
Accept text description as input.
Run Research and Design steps only.
Output: product spec + architecture plan.
No build step.
Commit: feat: Workflow 2 SUB-2A spec output
TASK 3 — Workflow 2 SUB-2B: build from description
Accept text description as input.
Run full 8-step pipeline.
Uses Fresh Build engine for Build step.
Produces live URL of new product.
No prior URL required.
Commit: feat: Workflow 2 SUB-2B build and deploy
Phase 4 exit criteria:

All three intents selectable in UI
Faithful Rebuild parity confirmed or documented
Faithful Rebuild: no platform imports in output
Workflow 2 SUB-2A produces spec document
Workflow 2 SUB-2B produces live URL
All tests passing

Phase 4 Completion Report additional fields:

Intent routing test results for all three
Faithful Rebuild parity check results
Workflow 2 spec document link
Workflow 2 live URL
Governance artifact IDs

═══════════════════════════════════════════════
POWERSHELL GATE 4
Verify intent routing, parity gates, spec output,
live URL, tests passing.
GATE VERDICT: PHASE 4 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 4:
Test each intent with saige-v2.
Build a new product from a text description.
Browse the live output.
Issue Phase 5 Authorization.

PHASE 5 — WORKFLOW 3 + SELF-RENEWAL
Goal: Build Workflow 3 (benchmark + synthesize)
and add Self-Renewal runaway protection.
SSOT reference: §3.1 Workflow 3, §4 Step 6
Tasks:
TASK 1 — Workflow 3 TYPE-3A: Benchmark
Accept 2+ URLs as input.
Run Workflow 1 SUB-1A on each independently.
Produce side-by-side scoring report with
rankings and relative strengths/weaknesses.
Commit: feat: Workflow 3 benchmark report
TASK 2 — Workflow 3 TYPE-3B: Synthesize
Extract best elements from each URL via
Feature Extractor.
Combine into new product via Fresh Build engine.
Produce synthesis report.
Commit: feat: Workflow 3 synthesize
TASK 3 — Self-Renewal governance:
Max iterations per run: 3 (configurable).
Minimum 60 seconds between iterations.
Hard stop if score does not improve after
2 consecutive iterations.
No Self-Renewal run without prior QA pass.
All Self-Renewal proposals: recommend_only
until Victor explicitly delegates authority.
All actions logged in governance artifact.
Commit: feat: Self-Renewal runaway protection
and governance
Phase 5 exit criteria:

Benchmark report produced for 2+ URLs
Synthesized product produced and deployed
Self-Renewal hard stops verified in tests
All tests passing

Phase 5 Completion Report additional fields:

Benchmark report sample output
Synthesis report and live URL
Self-Renewal stop condition test results
Governance artifact IDs

═══════════════════════════════════════════════
POWERSHELL GATE 5
Verify benchmark, synthesis, stop conditions,
tests passing.
GATE VERDICT: PHASE 5 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 5:
Run benchmark on two VEU products.
Review synthesis output.
Verify Self-Renewal stops when expected.
Issue Phase 6 Authorization.

PHASE 6 — AGENT WIRE-IN
Goal: Create the formal agent authority
registry, then wire all 20 agents into
OrchestratorHub at recommend_only.
No agent auto-executes under any condition.
SSOT reference: §6 Twenty-Agent Roster
CRITICAL GATE: Task 1 registry must be
approved by Victor + Claude Chat before
Tasks 2-4 begin. Do not wire any agent
until the registry is approved.
Tasks:
TASK 1 — Agent authority registry (HARD GATE):
Create: docs/governance/AGENT_AUTHORITY_REGISTRY.md
One row per agent containing:

Agent ID and name
Purpose (one sentence)
Events consumed
Outputs produced
Authority level: recommend_only
Non-execution guarantee statement

All 20 agents must have all fields populated.
Submit for Victor + Claude Chat review.
Do not proceed to Task 2 until approved.
Commit: docs: create agent authority registry
STOP. Await registry approval before Task 2.
TASK 2 — Wire FlowAI-only agents (8):
Agents: #4, #5, #8, #11, #12, #14, #16, #18
Each: receives events, produces recommendations,
never auto-executes. Tests prove no auto-execution.
Commit: feat: wire FlowAI-only agents
TASK 3 — Wire embedded agents (12):
Agents: #1,#2,#3,#6,#7,#9,#10,
#13,#15,#17,#19,#20
Same rules. Tests prove no auto-execution.
Commit: feat: wire embedded agents
TASK 4 — Agent dashboard in UI:
Operator sees pending recommendations.
Approve or reject per recommendation.
No recommendation acted on without approval.
Commit: feat: agent recommendation dashboard
Phase 6 exit criteria:

Registry approved before any wiring
All 20 agents wired at recommend_only
Zero auto-executions in any test
Dashboard shows recommendations
All tests passing

Phase 6 Completion Report additional fields:

Registry approval confirmation
Auto-execution test results (must be zero)
Dashboard browser evidence
Per-agent event/output confirmation

═══════════════════════════════════════════════
POWERSHELL GATE 6
Verify registry approval, zero auto-executions,
dashboard, tests passing.
GATE VERDICT: PHASE 6 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 6:
Run a workflow. Review recommendations.
Approve one. Reject one. Verify behavior.
Issue Phase 7 Authorization.

PHASE 7 — ORCHESTRA INTELLIGENCE
Goal: AUTOMATIC Orchestra member selection
based on performance history and cost.
SSOT reference: §5 The Orchestra
Tasks:
TASK 1 — Performance registry:
Schema: member_id, step, task_type, score,
cost_usd, latency_ms, timestamp.
Initialize with current known-good defaults.
Commit: feat: Orchestra performance registry
TASK 2 — AUTOMATIC selection algorithm:
Query registry for best score/cost per step.
Fall back to GUIDED if no history exists.
Log selection in governance artifact.
Commit: feat: AUTOMATIC Orchestra selection
TASK 3 — Performance tracking:
Record outcome after each task.
Rankings update automatically.
Commit: feat: Orchestra performance tracking
Phase 7 exit criteria:

AUTOMATIC selects rationally based on history
Fallback to GUIDED works correctly
Performance tracked after each run
All tests passing

Phase 7 Completion Report additional fields:

Sample AUTOMATIC selection decisions
Fallback trigger test result
Registry entry samples

═══════════════════════════════════════════════
POWERSHELL GATE 7
Verify selection, tracking, fallback, tests.
GATE VERDICT: PHASE 7 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 7:
Run multiple workflows in AUTOMATIC mode.
Verify Orchestra selections are rational.
Issue Phase 8 Authorization.

PHASE 8 — DOMAIN 2 AND DOMAIN 3
Goal: Build the access tier model so
FlowAI can serve Domain 2 (small entities)
and Domain 3 (underserved communities).
SSOT reference: §13 Three Service Domains
PRE-TASK — required before any Phase 8 code:
Produce: docs/specs/DOMAIN_2_3_SECURITY_DESIGN.md
Must cover:

Tenant boundary isolation between providers
Rate limit enforcement per tier
Abuse detection technical approach
Access control model for end-customers
Authentication model for providers

Submit for Victor + Claude Chat approval.
Do not write Phase 8 code until approved.
STOP. Await security design approval.
Tasks:
TASK 1 — Provider and end-customer model:
Provider workspace. End-customer sub-orgs.
Revenue split tracking. Tenant isolation.
Commit: feat: provider and end-customer model
TASK 2 — Access tier model:
FREEMIUM / SUBSIDIZED / GRANT / PARTNERSHIP.
Tier governs rate limits and feature access.
Commit: feat: Domain 2 and 3 access tiers
TASK 3 — Domain 3 access model:
FREEMIUM default. GRANT/PARTNERSHIP if active.
VEU SUBSIDIZED fallback.
Abuse detection flags high-volume commercial use.
Commit: feat: Domain 3 access model
Phase 8 exit criteria:

Security design approved before code
Provider can onboard and create end-customers
Tenant isolation verified
All four tiers working
Domain 3 accessible without payment
Abuse detection operational
All tests passing

Phase 8 Completion Report additional fields:

Security design approval reference
Tenant isolation test results
Tier access test results per tier
Domain 3 free access confirmation
Abuse detection trigger test

═══════════════════════════════════════════════
POWERSHELL GATE 8
Verify security design approved, provider model,
tenant isolation, tiers, Domain 3 access,
abuse detection, tests passing.
GATE VERDICT: PHASE 8 COMPLETE or NEEDS_REVISION
═══════════════════════════════════════════════
VICTOR + CLAUDE CHAT TEST 8:
Onboard as a provider.
Create an end-customer.
Run a workflow as end-customer.
Test Domain 3 free access.
Issue FLOWAI V1 COMPLETE if all phases pass.

FLOWAI V1 COMPLETE CRITERIA
All eight phases cleared by Victor + Claude Chat.
All four canonical files reflect Phase 8 completion.
≥95% of release-critical SSOT claims VERIFIED
with runtime/governance artifacts.
All 20 agents wired and operational.
All four workflows working end-to-end.
All three user intents working.
Domain 1, 2, and 3 access models live.
Governance score: 95%+
Readiness score: 95%+
Zero auto-executions by any agent in production.
Zero platform imports in any Fresh Build output.

PHASE SCOPE SUMMARY
PhaseNameSSOT1Foundation + SSOT Commit§11, §122Workflow 1 Complete§3.1 W13AFresh Build Modules§3.1 FB3BFresh Build First Live Run§3.1 FB4User Intent + Workflow 2§3.1 W25Workflow 3 + Self-Renewal§3.1 W36Agent Wire-in§67Orchestra Intelligence§58Domain 2 and Domain 3§13
