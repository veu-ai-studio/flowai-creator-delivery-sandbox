# SSOT Claim-to-Runtime Traceability Matrix

**Generated:** 2026-05-24T22:31:12Z
**HEAD commit:** `8c10792`
**Branch:** `flowai-v0.1`
**Production commit:** `UNKNOWN_AFTER_8c10792` (branch advanced through `8c10792`; production deployment remains Victor-approved and must be reverified via `/api/version` after deploy)
**Governance status:** `PROPOSED_GOVERNANCE`
**Panel artifact:** `UNAVAILABLE` (no traceability-matrix Panel ratification artifact found in `docs/panel-consultations/`)
**Companion sidecar:** [`SSOT_TRACEABILITY_MATRIX.sidecar.json`](./SSOT_TRACEABILITY_MATRIX.sidecar.json)
**Checker:** [`scripts/check-ssot-traceability.mjs`](../../scripts/check-ssot-traceability.mjs)

---

## §1 — Purpose

This matrix is the canonical ledger that prevents collective hallucination across Claude (Execution Orchestrator), GPT (Strategic Integrity), Codex (Adversarial Technical Review), and Claude Code (Implementation Engine). It records which SSOT claims are backed by code, tests, runtime output, or governance artifacts — and which are not.

**Core principle.** No claim is `VERIFIED` because an AI said so. A claim is `VERIFIED` only when backed by artifacts appropriate to its `verificationType`. Production-facing claims with deployment drift, or runtime claims without runtime artifacts, are `PARTIAL` at best.

**Scope constraint.** This document is **VERIFICATION ONLY**. It does not add product features, modify orchestrator behavior, change UI components, expand architecture, implement remediation, or create new agents. If a claim is `NOT_IMPLEMENTED`, the matrix records it. A separate dispatch fixes it.

---

## §2 — Schema

### §2.1 Core fields

| Field | Type | Definition |
|---|---|---|
| `claimId` | string | Unique identifier (e.g. `CA18-URL-ANY`) |
| `ssotSource` | string | Source file + section |
| `claimText` | string | Verbatim SSOT claim |
| `runtimeExpectation` | string | What production should demonstrate |
| `implementationFiles` | string[] | Code files implementing the claim |
| `testFiles` | string[] | Tests verifying the claim |
| `runtimeEvidence` | string[] | Run logs, screenshots, deploy verifications |
| `governanceEvidence` | string[] | CA-N entries, panel records, audit reports |
| `status` | enum | `VERIFIED` / `PARTIAL` / `STUBBED` / `SIMULATED` / `NOT_IMPLEMENTED` / `DEFERRED` / `UNKNOWN` |
| `confidence` | enum | `HIGH` / `MEDIUM` / `LOW` |
| `gaps` | string[] | Description of what is missing |
| `nextAction` | string | Action to advance status |

### §2.2 Scope + freshness fields

| Field | Type | Definition |
|---|---|---|
| `scope` | enum | `BRANCH_ONLY` / `PRODUCTION` / `GOVERNANCE` / `EXPERIMENTAL` |
| `lastVerifiedAt` | ISO-8601 | Wall-clock time of last verification |
| `verifiedAgainstCommit` | string | Commit hash at verification |
| `verifiedAgainstDeployment` | string \| null | Production URL or deployment ID |
| `evidenceFreshness` | enum | `CURRENT` (<7d) / `RECENT` (<30d) / `STALE` (>30d) / `UNKNOWN` |

### §2.3 Evidence-quality fields

| Field | Type | Definition |
|---|---|---|
| `verificationType` | enum | `UNIT_TEST` / `INTEGRATION_TEST` / `LIVE_RUNTIME` / `GOVERNANCE_RECORD` / `MANUAL_INSPECTION` / `DEPLOYMENT_EVIDENCE` |
| `runtimeArtifactRequired` | boolean | `true` for production-facing claims; `false` for governance-only claims |

### §2.4 Risk + contradictions

| Field | Type | Definition |
|---|---|---|
| `operationalSeverity` | enum | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `contradictions` | object[] | Flags conflicting evidence (e.g. branch has fix but production does not) |
| `isNegativeControl` | boolean | `true` only for intentional false-claim rows (e.g. claim 11); exempts from checker failure |

### §2.5 Evidence rules by `verificationType`

- `LIVE_RUNTIME`: runtime artifacts required for `VERIFIED`.
- `UNIT_TEST` / `INTEGRATION_TEST`: tests + implementation required.
- `GOVERNANCE_RECORD`: governance artifacts sufficient for `VERIFIED`.
- `DEPLOYMENT_EVIDENCE`: deployment proof required.
- `MANUAL_INSPECTION`: inspector identity + timestamp required.

`VERIFIED` MUST have evidence appropriate to its `verificationType`. Governance-only `VERIFIED` rows MAY rely on governance evidence alone.

---

## §3 — Claims (n=11; 10 real + 1 negative control)

The full machine-readable per-claim record (with `implementationFiles`, `testFiles`, `runtimeEvidence`, `governanceEvidence`, `gaps`, `contradictions`, `nextAction`) is in [`SSOT_TRACEABILITY_MATRIX.sidecar.json`](./SSOT_TRACEABILITY_MATRIX.sidecar.json). The table below summarizes status; consult the sidecar for evidence.

| # | claimId | Status | Confidence | Severity | Scope | verificationType | runtimeArtifactRequired | Negative control |
|---|---|---|---|---|---|---|---|---|
| 1 | `CA18-URL-ANY` | `PARTIAL` | `MEDIUM` | `CRITICAL` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 2 | `CA18-HONEST-URL` | `PARTIAL` | `MEDIUM` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 3 | `CA18-WEIGHTED-SCORE` | `PARTIAL` | `MEDIUM` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 4 | `CA18-DIMENSION-DISCLOSURE` | `PARTIAL` | `MEDIUM` | `MEDIUM` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 5 | `CA18-EVAL-PIPELINE` | `PARTIAL` | `LOW` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 6 | `CA18-DELTA-VERIFY` | `PARTIAL` | `MEDIUM` | `MEDIUM` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 7 | `CA18-REMEDIATION-SAFETY` | `PARTIAL` | `LOW` | `HIGH` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 8 | `CA18-UNIVERSAL-LIMIT` | `PARTIAL` | `HIGH` | `CRITICAL` | `BRANCH_ONLY` | `LIVE_RUNTIME` | true | false |
| 9 | `CA18-AUDIT-TRAIL` | `VERIFIED` | `HIGH` | `HIGH` | `GOVERNANCE` | `GOVERNANCE_RECORD` | false | false |
| 10 | `CA18-DEPLOY-TRUTH` | `PARTIAL` | `MEDIUM` | `CRITICAL` | `PRODUCTION` | `DEPLOYMENT_EVIDENCE` | true | false |
| 11 | `FALSE-CLAIM-AUTONOMOUS-DEPLOY` | `NOT_IMPLEMENTED` | `HIGH` | `CRITICAL` | `GOVERNANCE` | `MANUAL_INSPECTION` | false | **true** |

---

## §4 — Honest summary

- `VERIFIED`: **1** (claim 9 — `CA18-AUDIT-TRAIL`)
- `PARTIAL`: **9** (claims 1–8 + claim 10)
- `STUBBED`: **0**
- `SIMULATED`: **0**
- `NOT_IMPLEMENTED`: **1** (claim 11 — negative control, intentional)
- `DEFERRED`: **0**
- `UNKNOWN`: **0**
- Negative controls: **1**
- Critical-severity non-VERIFIED (excluding negative controls): **3** — claims 1, 8, 10

**What changed (post-U1 advance).** `CA18-AUDIT-TRAIL` (claim 9) advanced from `PARTIAL` to `VERIFIED` because U1's orchestrator + test additions now satisfy its upgrade gate verbatim: branch tests at `tests/agents/renewal/orchestrator.test.js:2115-2141` directly assert that the `self_renewal.orchestration_complete.v1` governance entry carries a `skippedSteps[]` array where every element has `step in {7, 8, 9, 13}` and `autoFixSkippedReason = 'UNIVERSAL_NO_REPO_ACCESS'`. Per the per-claim gate ("May use governance record evidence from branch tests if governance_record entries contain skippedSteps with reasons. Does not require production deployment."), branch test evidence is sufficient. `CA18-DEPLOY-TRUTH` (claim 10) advanced from `NOT_IMPLEMENTED` to `PARTIAL` because `api/version.js:49-58` exposes `VERCEL_GIT_COMMIT_SHA` + branch and was observed in production returning `158a427293f2` at 2026-05-21T22:26:03Z - runtime honestly exposes deployment identity and currently matches the matrix HEAD, but no automated governance write of drift/parity exists yet.

**Why most rows remain `PARTIAL`.** Eight of the 10 real claims have solid implementation evidence and branch-level test/smoke evidence, but per Section 2.5 evidence rules + the production-evidence gates (LIVE_RUNTIME claims require runtime artifacts; production-facing claims need production evidence to be `VERIFIED`, not just branch-level smoke output), they stay `PARTIAL`. Promoting any of them to `VERIFIED` requires a live production run with the corresponding artifact (e.g. governance_record export, prod live-URL log with effectiveTrustScore, deployment-commit verification). Production currently matches the matrix HEAD on `flowai-v0.1` (`158a427`), but deploy-truth remains `PARTIAL` until drift/parity is captured by an automated artifact or governance entry rather than manual `/api/version` inspection.

**Critical gaps.**

1. **`CA18-DEPLOY-TRUTH` is `PARTIAL`** (claim 10, CRITICAL). `api/version.js` exposes the production commit so drift is observable on demand, and commit `3825d14` was followed by a deploy-truth checker that emits a durable `deploy_truth.drift_check.v1` governance artifact. The claim remains `PARTIAL` until Victor deploys the checker and a post-deploy artifact is captured from production.
2. **`CA18-EVAL-PIPELINE` is `PARTIAL` LOW confidence** (claim 5, HIGH). All four evaluators are wired and findings now carry the U1 `generated_by` provenance field (per `findingNormalizer.js` `coerceSource` + `ALLOWED_SOURCES` enum), but no production run-log captures all four evaluators' contributions with provenance — the gate explicitly requires runtime evidence, not just normalizer unit tests.
3. **`CA18-REMEDIATION-SAFETY` is `PARTIAL` LOW confidence** (claim 7, HIGH). Rate-cap and remediation engine exist, but registry, explicit confidence threshold constants, and rollback invocation are not canonically documented.

**Negative control fires correctly.** Claim 11 (`FALSE-CLAIM-AUTONOMOUS-DEPLOY`) records as `NOT_IMPLEMENTED` with `isNegativeControl: true` and HIGH confidence. The grep+citation in `src/lib/agents/renewal/githubPrWriter.js:11-12` proves the `/merge` string appears only in comments documenting the prohibition. This row demonstrates the matrix correctly rejects false-capability claims.

---

## §4.1 W07 completion update

**SSOT vision completion estimate:** approximately **55%** complete, upgraded from the prior approximately **35%** estimate. This is still an honest partial state: FlowAI can now see, score, report, and recommend against a live product, but U6/U7 are required before it can complete the operator-approved act-and-verify loop.

### Complete after W07

| Capability | Status | Evidence |
|---|---|---|
| U3 - Deep runtime engineering analysis | COMPLETE | Multi-engine runtime path emits console/network/runtime/accessibility findings in Engineering Findings Report. |
| U4 - Registered repo source mapping | COMPLETE | Product registry and source-mapping pipeline resolve registered product repo metadata and produce source-map envelopes. |
| U5 - Source-mapped recommendation generator | COMPLETE | `src/lib/sourceMapping/sourceMappedFixGenerator.js`; recommendations render in Engineering Findings Report with `recommend_only` authority. |
| VEU portfolio registration | COMPLETE | All 5 products registered: SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife. |
| Pipeline timeout fixes | COMPLETE | Commits `125228f`, `96382b8`, `99fe759`, `1d24be6`, `3e08a7d`, `733c9ba`. |
| Engineering Findings Report rendering | COMPLETE | Live FlowAI result card shows findings, severity counts, and U5 source-mapped recommendations. |
| First clean live run on `saigeplatform.com` | COMPLETE | Live run produced real findings: 401 resource load, broken modal, dead card, network HTTP 401. |

### In progress after W07

| Capability | Status | Next action |
|---|---|---|
| U6 - PR + test + rollback workflow | IN PROGRESS | Build operator-approved PR workflow generator; never auto-merge; include rollback reference. |
| U7 - Production verification + SSOT upgrade | IN PROGRESS | Build live post-deploy verifier that returns SSOT update content for Codex to commit. |

### Pending after W07

| Capability | Status | Next action |
|---|---|---|
| `saigeplatform.com` v2 | PENDING | Use FlowAI findings to drive SAIGE v2 remediation plan and implementation. |
| FlowAI custom domain | PENDING | Configure canonical `flowai.veuaistudio.com` references while keeping `flowai-dun.vercel.app` functional until DNS is live. |

### W08 locked sequencing

1. SSOT traceability update.
2. SAIGE v2 remediation brief.
3. U6 PR workflow generator.
4. U7 production verifier.
5. FlowAI canonical production domain.
6. Safe performance upgrade for longer score-goal runs.

---

## Section 4.2 W08 traceability update through `8c10792`

**Branch evidence covered:** commits `12a9232`, `51c8837`, `3cb5b5d`, `7e2453f`, `947f267`, `76637ad`, `6d2972f`, and `8c10792`.

**Status remains honest:** these commits improve branch implementation and test coverage, but do not by themselves promote production-facing claims to `VERIFIED`. Claims with `LIVE_RUNTIME` or `DEPLOYMENT_EVIDENCE` verification still require post-deploy runtime artifacts before status promotion.

| Commit | SSOT section(s) | Runtime claim impact | Evidence |
|---|---|---|---|
| `12a9232` | Section 9 Two Versions Always Exist; Section 12 Verification Honesty | SAIGE baseline URL now resolves to canonical `https://saigeplatform.com` instead of the legacy Vercel host. | `src/lib/products/registeredProductConfig.js`; `tests/products-registered-config.test.js` |
| `51c8837` | Section 10 Auto Mode Behavior; Section 12 Verification Honesty | Vercel credential lookup is normalized to `VERCEL_OPERATOR_TOKEN || VERCEL_TOKEN`, preventing token-name drift from silently blocking preview deployment. | `src/lib/agents/renewal/orchestrator.js`; `src/lib/agents/renewal/optionCPipeline.js` |
| `3cb5b5d` | Section 10 Auto Mode Behavior; Section 12 Verification Honesty | `api/run-construction.js` gets the longer Vercel max duration; SSE timeout messaging now reports `SSE_STREAM_ENDED_BEFORE_FINAL`; sidebar exposes New Run. | `vercel.json`; `src/components/RunConstructionPanel.jsx`; `src/components/layout/Sidebar.jsx` |
| `7e2453f` | Section 10 Auto Mode Behavior | Setup/New Run page now renders inside the same app layout as Workspace, Session History, and Governance Dashboard. | `src/App.jsx`; `src/components/layout/Sidebar.jsx` |
| `947f267` | Section 12 Verification Honesty | Lighthouse in Vercel serverless degrades with `lighthouse_unavailable_in_vercel_serverless` instead of failing the pipeline or leaking `/var/task` paths. | `src/lib/evaluation/lighthouseEvaluator.js`; `tests/evaluation/lighthouseEvaluator.test.js` |
| `76637ad` | Section 10 Auto Mode Behavior | FlowAI dashboard gained 8-step progress state and running indicator. | `src/pages/FlowAIDashboard.jsx`; `tests/ui/flowAIUnifiedShell.test.js` |
| `6d2972f` | Section 10 Auto Mode Behavior | Homepage run panel now renders the 8-step tracker and human-readable labels for internal pipeline codes. | `src/components/RunConstructionPanel.jsx`; `tests/ui/flowAIUnifiedShell.test.js` |
| `8c10792` | Section 9 Two Versions Always Exist; Section 10 Auto Mode Behavior; Section 11 Boundaries on Auto-Fix; Section 12 Verification Honesty | Adversarial enrichment scoring degrades instead of terminal `STEP_FAILED`; no-fix runs record an attempted iteration; registered SAIGE runs overlay canonical `saige-v2` upgrade/deploy metadata before branch/deploy steps. | `src/lib/agents/renewal/orchestrator.js`; `tests/agents/renewal/orchestrator.test.js` |

### Coverage gaps filled after PowerShell audit

| Gap | Filled by | Status |
|---|---|---|
| `CA18-HONEST-URL` lacked an explicit guard proving the improved-URL action is absent when `previewUrl` equals the input URL. | `tests/ui/trustScoreDisplay.test.js` static regression: `sameAsInput` branch renders "No new URL produced" / "Original URL (unchanged)" and does not include "Open improved URL". | BRANCH COVERED |
| `CA18-DIMENSION-DISCLOSURE` lacked an explicit 10-dimension completeness assertion. | `tests/agents/renewal/orchestrator.test.js` regression: `dimensions_contributing` has all 10 dimensions and the unimplemented legal/privacy/security dimensions are explicitly `KNOWN_GAP_NOT_IMPLEMENTED`. | BRANCH COVERED |

### Claim status after W08

| Claim | Prior gap | W08 result | Remaining reason not `VERIFIED` |
|---|---|---|---|
| `CA18-HONEST-URL` | Missing explicit same-URL/no-preview unit guard. | Closed on branch. | Needs production run artifact demonstrating honest no-new-URL UI behavior. |
| `CA18-DIMENSION-DISCLOSURE` | Missing explicit all-dimensions completeness test. | Closed on branch. | Needs production run artifact with `dimensions_contributing[]` captured from live run output. |
| `CA18-EVAL-PIPELINE` | Lighthouse serverless could still create hard failure behavior. | Improved by graceful degrade test coverage. | Needs production run where evaluator availability/degradation is captured in governance. |
| `CA18-DEPLOY-TRUTH` | Preview deploy skipped or miswired when registry/runtime data drifted. | Improved by SAIGE registered-product preview wiring regression. | Needs post-deploy `/api/version` and preview-deploy runtime evidence after Victor promotes. |

### CA18-EVAL-PIPELINE branch evidence

`CA18-EVAL-PIPELINE` remains **PARTIAL** after this branch update because its verification type is `LIVE_RUNTIME`; branch tests cannot promote it to `VERIFIED`. The implementation now gives every normalized finding a stable `evaluator_id` while preserving `source`, `generated_by`, and `evaluatorVersion` for backward compatibility.

| evaluator_id | Producer |
|---|---|
| `lighthouse` | `src/lib/evaluation/lighthouseEvaluator.js` |
| `axe_core` | `src/lib/evaluation/axeEvaluator.js` |
| `runtime_diagnostics` | `src/lib/evaluation/runtimeDiagnostics.js` |
| `deep_browser` | `src/lib/evaluation/deepBrowserAnalysis.js` |
| `playwright` | `src/lib/evaluation/evaluationPipeline.js` Phase B normalization |
| `crawler` | `src/lib/evaluation/findingNormalizer.js` crawler-source normalization |

Branch evidence: `src/lib/evaluation/evaluatorIds.js`, `src/lib/evaluation/findingNormalizer.js`, evaluator caller imports, `tests/evaluation/findingProvenance.test.js`, and `tests/evaluation/deepBrowserAnalysis.test.js`. Remaining evidence needed: a Victor-approved production run artifact showing live findings with `evaluator_id` values from the deployed pipeline.

### Updated completion estimate

**SSOT vision completion estimate:** approximately **62%** complete on branch. This is an implementation/readiness improvement, not a VERIFIED completion jump. The VERIFIED count remains limited by live production evidence requirements.

---

## Section 4.3 W09 deploy-truth readiness after `3825d14`

**Branch evidence covered:** commit `3825d14` wires production Migration Mode hooks into `/api/run-construction`; the follow-on deploy-truth work adds automated drift-check evidence generation for `CA18-DEPLOY-TRUTH`.

`CA18-DEPLOY-TRUTH` remains **PARTIAL** until Victor deploys the branch and the checker records a production artifact. The implementation target is a persisted governance artifact of kind `deploy_truth.drift_check.v1` with this shape:

```json
{
  "kind": "deploy_truth.drift_check.v1",
  "checkedAt": "ISO-8601 timestamp",
  "productionCommit": "commit from /api/version",
  "localHeadCommit": "commit from git rev-parse HEAD",
  "branch": "flowai-v0.1",
  "status": "MATCH | DRIFT | BLOCKED",
  "driftDetails": ["commits ahead of production when status is DRIFT"]
}
```

The artifact must be persisted to the governance store (`product_ssot.governance_record` via Supabase, or KV fallback) rather than console output alone. `MATCH` is required before the row can advance toward `VERIFIED`; `DRIFT` and `BLOCKED` are honest evidence states that keep the claim `PARTIAL`.

| Claim | W09 branch result | Remaining reason not `VERIFIED` |
|---|---|---|
| `CA18-DEPLOY-TRUTH` | Automated checker + governance artifact shape implemented after `3825d14`; artifact status is explicitly `MATCH`, `DRIFT`, or `BLOCKED`. | Needs Victor-approved deploy and a persisted production artifact showing production commit parity with the certified branch. |

---


## Section 4.4 W09 Migration UI branch evidence

**Branch evidence covered:** the migration setup UI now keeps Step 1 and Step 3 visible on `/flow-hub/migration`, makes the product URL field the visually primary input, replaces pasted URL values instead of appending them, and surfaces an operator-secret prompt when a Migration Mode run returns `Authentication required`.

**SSOT impact:** this is application-layer UI/UX and safe route behavior under Section 10 Auto Mode visibility and Section 12 Verification Honesty. It does not alter Migration Mode execution authority, platform-boundary enforcement, production deployment policy, or scoring.

| Area | Branch result | Remaining reason not `VERIFIED` |
|---|---|---|
| Flow Hub Migration setup | URL paste is replace-only for the focused migration URL input; placeholder is `Enter product URL - e.g. https://saigeplatform.com`; Step 3 remains visible before URL entry. | Needs browser verification on production after Victor deploys. |
| Operator authentication recovery | Migration run errors that report authentication required now show a labeled operator-secret input and retry path without exposing or persisting the secret. | Needs browser verification that Victor can enter the secret and retry successfully in production. |

---

## Section 4.5 W09 Migration hook registry evidence

**Branch evidence covered:** Migration Mode hook construction now resolves the submitted URL through `REGISTERED_PRODUCT_CONFIG` before creating runtime hooks. For SAIGE, the registered original repo (`https://github.com/veu-ai-studio/saige`) is treated as the read-only source baseline and the registered upgrade repo (`https://github.com/veu-ai-studio/saige-v2`) is treated as the only write target. Production hooks use the GitHub API instead of serverless `git clone`: FlowAI creates a target-only migration branch, scans target files through the Trees API, reads/writes full replacement files through the Contents API, and returns explicit degraded verification reasons when build/lint/test checks are not observably wired. The hook builder fails closed with explicit `MIGRATION_CONFIGURATION_REQUIRED` messages when a product is not registered or has no upgrade repo configured.

**SSOT impact:** this strengthens Section 9 Two Versions Always Exist, Section 10 Auto Mode Behavior, Section 11 Auto-Fix Boundaries, and Section 12 Verification Honesty. The change does not bypass platform-boundary enforcement or authorize writes to original repos; it supplies the migration orchestrator with registry-backed GitHub source/target context and branch-scoped target write hooks.

| Area | Branch result | Remaining reason not `VERIFIED` |
|---|---|---|
| Registered Migration Mode repo resolution | `/api/run-construction` Migration Mode resolves `https://saigeplatform.com` to original repo `veu-ai-studio/saige` and upgrade repo `veu-ai-studio/saige-v2`, then creates a target-only `flowai/migration-*` branch and calls GitHub API-backed migration hooks. The returned deps include `migrationBranch`, `targetRepoFullName`, and `branchUrl` for governance/result citation. | Needs production Migration Mode run evidence after Victor deploys and enables the runtime flag. |
| Fail-closed registry guard | Unregistered URLs return `Product not found in registry - register product before migrating`; registered products without `upgrade_repo` return `No upgrade repo configured for this product`. | Needs browser/API verification against production after deploy. |
| Verification honesty | GitHub-backed `verifyBuild`, `verifyLint`, and `runFocusedTests` return `ok:false`, `degraded:true`, and `reason:GITHUB_ACTIONS_CHECK_NOT_WIRED` until observable GitHub Actions or preview checks are wired. | Needs production evidence showing either wired checks or honest degraded status. |
| Virtual repo scan forwarding | The renewal orchestrator now forwards `scanFiles` from migration config/deps into `runMigration`, preventing `github://` target refs from falling back to local filesystem `scandir`; mapper normalization accepts GitHub Tree entries shaped as `{ path }`. | Needs production Migration Mode run evidence showing the GitHub Tree scan reaches the mapper without ENOENT. |

---

## §5 — Companion files

| File | Purpose |
|---|---|
| `docs/specs/SSOT_TRACEABILITY_MATRIX.sidecar.json` | Machine-readable claim records |
| `scripts/check-ssot-traceability.mjs` | Schema + evidence-rule checker; exits 1 on failure, prints summary |

---

## §6 — Operating discipline going forward

1. When any claim's underlying evidence changes (new test, new prod run, new audit), update the sidecar row's `lastVerifiedAt`, `verifiedAgainstCommit`, and `evidenceFreshness`.
2. When a production deploy occurs, update `productionCommit` at the top of the sidecar and re-run the checker.
3. When a claim is found to be false, immediately mark its row appropriately (`SIMULATED` for fabricated outputs; `NOT_IMPLEMENTED` if no implementation; `PARTIAL` if partial) — do NOT delete the row.
4. `VERIFIED` is a future-state target, not a default. Status changes flow forward through evidence, not backward through edits.
5. The matrix is `PROPOSED_GOVERNANCE` until a Panel ratification artifact promotes it to `RATIFIED_GOVERNANCE`. Until then, it has the force of a working agreement, not canonical authority.

---

## §7 — Platform Decoupling Rule (CEO-Directed)

Status: ACTIVE — applies to all FlowAI v2 upgrade runs.

When FlowAI processes any URL built on any development platform
(Base44, Wix, Webflow, Bubble, Squarespace, or ANY platform),
the v2 upgrade must progressively decouple from that platform.

### Rules

1. Flag platform dependencies as migration items.
2. Replace platform functions with direct implementations in v2.
3. NEVER patch platform internals (e.g. base44Client.js, SDK configs).
4. v2 repos become standalone products, not platform wrappers.
5. Original platform-based product stays frozen as rollback.

### Excluded Files (never modify in v2 upgrades)

- base44Client.js or equivalent platform SDK client
- Platform authentication/auth configuration
- Platform routing internals
- Any file that is auto-generated or managed by the platform

### What FlowAI CAN Fix in v2

- Application-layer UI/UX components
- New standalone components replacing platform widgets
- CSS/styling improvements
- Navigation and content structure
- SEO, accessibility, grammar, typos
- Business logic independent of platform SDK

## §8 — SSOT as Single Canonical Reference

This document (SSOT_TRACEABILITY_MATRIX.md) is the single
canonical source for all FlowAI product, engineering, and
governance rules. No rules should be duplicated across
multiple governance documents. All other documents
(standing directive, governance docs) must reference this
SSOT rather than maintaining independent rule copies.

---

## `§9` — Two Versions Always Exist

For every product FlowAI upgrades:
- ORIGINAL: frozen, never modified by FlowAI, rollback target.
- UPGRADE: {product}-v2 repo, receives all FlowAI improvements.
- CEO approves final replacement of original with upgrade.
- Both versions must remain accessible at all times.
- FlowAI reads original for baseline comparison only.

## `§10` — Auto Mode Behavior

- Auto: provision upgrade repos, deploy previews, iterate.
  No user prompts. User should never leave FlowAI to manage
  infrastructure during an Auto run.
- Guided: pause at checkpoints for user confirmation.
- Manual: user controls every step.
- Active runs must be visible from any FlowAI page.
- Run history must persist across sessions.

## `§11` — Boundaries on Auto-Fix

FlowAI must NOT auto-fix:
- Platform SDK clients or internal configuration files.
- Authentication or authorization escalation.
- Database schema changes.
- Third-party API credential modifications.
- Any change that broadens or narrows access control.

When a root issue falls in these categories, classify as
PLATFORM_BOUNDARY_BLOCKED and report to operator.
Do not generate a patch. Do not create a branch.

FlowAI CAN auto-fix:
- Application-layer UI/UX components.
- CSS, styling, layout improvements.
- Navigation and content structure.
- SEO, accessibility, grammar, typos.
- New standalone components replacing platform widgets.
- Business logic independent of platform SDK.

## `§12` — Verification Honesty

FlowAI must never inflate scores or fabricate improvement.
- VERIFIED: only when live production evidence confirms fix works.
- PARTIAL: built and tested but not verified in production.
- NOT_MEASURED: requires human judgment or credentials
  FlowAI does not have.
- Scores must reflect real measured state, never aspirational.
- If score does not improve after fixes, report honestly.
- No fabricated URLs, PRs, branches, metrics, or evidence.

## `§13` — SSOT Completion Target

The final shipped version of FlowAI must achieve 95% or higher
compliance with this SSOT document. Codex builds toward SSOT
in chunks. Each chunk must be traceable to a specific SSOT
section. No chunk may cause retrogression or drift from
previously verified SSOT claims.

Measurement:
- Total SSOT claims tracked in this matrix.
- Claims at VERIFIED status / total claims = completion %.
- Target: >= 95% VERIFIED before FlowAI is considered complete.
- Claims at PARTIAL do not count toward completion.

*End of SSOT Traceability Matrix v1. Last advance: 2026-05-24 from HEAD `8c10792` - W08 branch readiness updated through SAIGE baseline canonicalization, Vercel credential normalization, setup/sidebar reachability, Lighthouse/adversarial graceful degradation, 8-step progress rendering, no-fix iteration accounting, and SAIGE registered-product preview wiring. Production verification remains pending Victor-approved deployment.*
