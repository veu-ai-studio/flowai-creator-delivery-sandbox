# CB Dispatch: Platform Boundary Delivery Honesty

From: CTO
To: CB
Date: 2026-06-11
Branch to build: `fix/platform-boundary-delivery-honesty`
Base: current `origin/main` at `e8aef065533bd273fbd86b55d90c5ea35aea91c5`

## Read First

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/platform-boundary-chain-analysis.md`
- `docs/cto/saige-score-variance-analysis.md`
- `docs/cto/ct2-platform-boundary-browser-test-result-20260611.md`

Canonical authority remains the three governing documents. This dispatch is an implementation packet, not a canonical amendment.

## Problem

CT2 observed the correct platform boundary but a misleading delivery surface.

Observed run:

- Run ID: `sse_mqac2hy5_vtqnk3`
- Production health commit: `e8aef065533bd273fbd86b55d90c5ea35aea91c5`
- Exit: `PLATFORM_BOUNDARY_BLOCKED`
- Boundary: `src/api/base44Client.js`
- Reason: `base44_client_internal`
- Stage: `prioritization`
- Branch creation observed: no
- PR observed: no
- New preview deployment observed: no
- Terminal final plus `[DONE]`: yes

UI/final payload still showed:

- `Live upgraded deployment is ready.`
- `previewUrl: "https://saigeplatform.com"`
- `upgradedUrl: "https://saige-v2.vercel.app"`
- `upgradeDeployed: true`
- `upgradeDeployStatus: "deployed"`
- Button: `Open preview URL`

That is an evidence-inflation bug. The existing registry/deployed upgrade URL may be useful context, but it must not be presented as current-run preview/deployment proof after a no-branch/no-mutation boundary.

## Scope

Patch the delivery evidence contract and UI presentation for runs that do not produce a current-run deployment artifact.

Likely files:

- `src/lib/agents/renewal/orchestrator.js`
- `src/pages/FlowAIDashboard.jsx`
- `tests/agents/renewal/upgradeDeliveryEnvelope.test.js`
- `tests/agents/renewal/orchestrator.test.js`
- `tests/ui/resultCardObjectives.test.js`
- Add focused tests if a better local test file already exists.

Do not touch:

- Canonical docs.
- SSOT sidecar or traceability matrix.
- matrixArtifact / VERIFIED state.
- Vercel env or production deployment.
- `fix/ca18-url-boundary-universal` branch unless W04 later asks for integration/rebase.

## Current Code Anchors

Backend delivery envelope:

- `src/lib/agents/renewal/orchestrator.js:353-375`
- `buildUpgradeDeliveryEnvelope` currently sets `upgradedUrl = deliveredUrl ?? fallback.url`.
- It also sets `upgradeDeployed = Boolean(deliveredUrl) || fallback.status === 'deployed'`.
- That allows an existing registry deployment to become current-run delivery proof even when this run produced no deployment.

Backend preview field:

- `src/lib/agents/renewal/orchestrator.js:1921`
- `finalPreviewUrl` is initialized to `initialUrl` for non-universal runs.
- `src/lib/agents/renewal/orchestrator.js:5540` and `src/lib/agents/renewal/orchestrator.js:5663` expose that field as `previewUrl`.
- That lets the source URL surface as `previewUrl` when no new preview exists.

Frontend delivery fallback:

- `src/pages/FlowAIDashboard.jsx:492-522`
- `finalDelivery` falls back to `registryDeployedUrl` and treats it as deployed when final result lacks a current-run delivery.

Frontend misleading UI:

- `src/pages/FlowAIDashboard.jsx:189-200` returns `Live upgraded deployment is ready.` when `upgradeDeployed` is true.
- `src/pages/FlowAIDashboard.jsx:1374-1403` displays the delivered URLs card and upgraded link.
- `src/pages/FlowAIDashboard.jsx:1410-1415` shows `Open preview URL` for any `finalResult.previewUrl`, including a source URL.

Existing tests that may need updates:

- `tests/agents/renewal/upgradeDeliveryEnvelope.test.js` currently expects registry fallback to be deployed when no preview was produced.
- `tests/agents/renewal/orchestrator.test.js:2081-2083` currently expects a degraded deploy result to keep `previewUrl` anchored to the original evaluated URL.

Those expectations are now too broad for the browser-facing/final-payload evidence contract. Keep source/evaluated URL as context through a separate field if needed, but `previewUrl` must mean current-run preview/deployment artifact.

## Required Behavior

For any run with no current-run branch/deploy artifact, including `PLATFORM_BOUNDARY_BLOCKED`:

- `previewUrl` in the final result must be `null`.
- `upgradeDeployed` must be `false`.
- `upgradeDeployStatus` must be `blocked`, `not_deployed`, or another truthful non-deployed value.
- `upgradeDeployReason` must identify the blocker, preferably `PLATFORM_BOUNDARY_BLOCKED` when that is the exit reason.
- `upgradeDeployDetail` should explain that no current-run preview/deployment was produced because mutation was blocked.
- Any existing registry upgrade URL, such as `https://saige-v2.vercel.app`, may be surfaced only as contextual registry/upgraded-target state, not as current-run delivery proof.
- UI must not show `Live upgraded deployment is ready.`
- UI must not show `Open preview URL` when the only URL is the original/source URL.
- UI should show honest no-mutation messaging beside the platform-boundary section.

For runs that do produce a current-run preview deployment:

- Preserve existing happy path: `previewUrl` is the current-run preview URL.
- `upgradedUrl` may equal the current-run preview URL.
- `upgradeDeployed=true`.
- `upgradeDeployStatus='deployed'`.
- Compare/Open Preview affordances remain available.

For registered products with an existing upgrade URL but no current-run preview:

- It is acceptable to expose a neutral/contextual field or UI label such as "Registered upgrade target" or "Existing upgrade URL".
- It is not acceptable to call it a current-run preview, deployed artifact, or repair success.

## Suggested Implementation Direction

Use the smallest truthful change that preserves existing happy paths.

Likely backend direction:

- Treat `finalPreviewUrl` as current-run preview only. Initialize it to `null`, not `initialUrl`.
- If existing auditing needs the evaluated URL, expose it as `originalUrl`, `evaluatedUrl`, or existing context fields, not `previewUrl`.
- Teach `buildUpgradeDeliveryEnvelope` to distinguish:
  - `deliveredUrl`: current-run artifact from iteration preview.
  - `fallback.url`: registry/deployment context.
- When `deliveredUrl` is absent and the run has no successful deploy, do not set `upgradeDeployed=true` solely from `fallback.status === 'deployed'`.
- If you need exit/skipped context inside `buildUpgradeDeliveryEnvelope`, pass `exitReason`, `finalPreviewUrl`, or a `currentRunDeployed` boolean.

Likely frontend direction:

- In `finalDelivery`, prefer current-run delivery fields only when they represent a current-run artifact.
- Do not fallback to `registryDeployedUrl` for the primary "Upgraded Version" / Compare / current-run delivery card after a blocked or non-deployed final result.
- Hide `Open preview URL` when `finalResult.previewUrl` is null, source-equal, or current-run deployed artifact is false.
- If showing a registry URL, label it contextually and style it neutrally.

## Tests Required

At minimum:

1. Backend unit: `buildUpgradeDeliveryEnvelope` with no iteration preview and a deployed registry URL must not report current-run deployment when the run has a blocking/no-deploy context.
2. Backend/orchestrator: a `PLATFORM_BOUNDARY_BLOCKED` run must return `previewUrl: null`, `upgradeDeployed: false`, no branch/PR, and a non-deployed/blocked status.
3. Existing happy path remains: when `deployBranchPreview` returns a preview URL, result keeps `previewUrl`, `upgradedUrl`, `upgradeDeployed=true`, and deployed status.
4. Frontend/static or component test: blocked final result must not contain/show `Live upgraded deployment is ready.` for the blocked state and must hide/avoid `Open preview URL` when preview is missing/source-only.
5. Proof-runner/tooling tests, if impacted, must continue ensuring source URL is not counted as deployed preview evidence.

## Verification Required

Run:

- `npx vitest run tests/agents/renewal/upgradeDeliveryEnvelope.test.js tests/agents/renewal/orchestrator.test.js tests/ui/resultCardObjectives.test.js tests/tools/saigeSseProof.test.js`
- `node --check src\lib\agents\renewal\orchestrator.js`
- `node --check src\pages\FlowAIDashboard.jsx` if Node can parse the JSX in this repo; if not, state why and rely on build/Vitest.
- `node scripts/check-ssot-traceability.mjs`
- `git diff --check`
- `npm run preflight` unless clearly disproportionate.

## STOP Conditions

Stop and report instead of patching if:

- Fixing this requires changing canonical definitions.
- The only way to pass is to hide the platform boundary instead of honestly displaying it.
- You would need to bypass or weaken Base44/platform/auth safety gates.
- You cannot separate source/evaluated URL from current-run preview URL without a broader result-envelope refactor.

## DoD Report

Return:

- Branch and HEAD.
- Files changed.
- Exact behavior before/after.
- Tests/checks run and results.
- Any tests not run and why.
- Evidence tier claimed.
- Mocked/unmocked proof boundary.
- Claim impact.
- SSOT movement: yes/no.
- VERIFIED movement: yes/no.
