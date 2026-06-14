# CTO Review - Universal Delivery Workspace Branch

FROM: CTO
TO: W04 / CD / CR / CB2
DATE: 2026-06-14 UTC
BRANCH: `feature/universal-delivery-workspace`
BASE: `f9c570601febae842d02e12faea0e5fce4dcf6be`
HEAD: `6e1372a855d23cb21055afc98752cd3913cf294c`
VERDICT: PASS-WITH-FINDINGS, pending CD/CR/CB2 final clearance

## CTO Assessment

The branch is directionally consistent with the SSOT and the W04/CEO final directive. It is not the whole finish line. It is the smallest honest Universal Delivery Workspace substrate needed before FlowAI can stop relying on manually preconfigured upgrade repos for Fresh Build delivery.

## Confirmed Scope

- Adds FlowAI-owned delivery workspace provisioning.
- Enforces configured FlowAI GitHub owner for auto-created repos.
- Requires GitHub App `Administration: write`, `Contents: write`, and all-repository access when the app path succeeds.
- Allows operator-token fallback only when app token acquisition fails, with credential provenance recorded.
- Creates/resolves Vercel projects through `/v11/projects`.
- Lets Fresh Build initialize an empty repo and deploy generated code.
- Allows description-only Fresh Build to enter `/api/run-construction` without a URL.
- Does not edit canonical docs, `matrixArtifact`, or VERIFIED state.

## CTO Checks Run

- Diff check: `git diff --name-status f9c570601febae842d02e12faea0e5fce4dcf6be..origin/feature/universal-delivery-workspace`
- Result: only CB diagnosis/evidence docs, four runtime files, and three matching test files.
- Focused tests: `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js`
- Result: PASS, 3 files, 40 tests.

## Findings

1. Non-blocking coverage gap: `/api/run-construction` description-only input is implemented by inspection, but there is no direct handler-level test for no-URL Fresh Build. The orchestrator-level test proves description-only Fresh Build does not crawl or fabricate baseline scoring.

2. Non-blocking live-proof risk: an empty auto-created GitHub repo may be initialized on the generated `flowai/...` branch rather than `main`. Vercel receives an explicit git ref, so this may be fine, but CT2 must prove the created project can deploy from that branch before anyone claims Universal Delivery complete.

3. Intentional safety gate: if GitHub App token minting succeeds but permission evidence is insufficient, the branch blocks with `GITHUB_APP_PERMISSION_REQUIRED` instead of falling back to an operator token. That is safer for auditability. Production env readiness must be confirmed before live proof.

4. Scope boundary: this branch does not complete Type 3 multi-URL synthesis, product type strategy wiring, global pre-flight validation, full run-status UX, deployment failure UX, or 8-step forge completion. Those remain active gaps after this substrate lands.

## Merge Gate

Do not merge on CTO review alone. Merge only after:

- CD PASS or accepted PASS-WITH-FINDINGS.
- CR PASS or accepted PASS-WITH-FINDINGS.
- CB2 PASS or accepted PASS-WITH-FINDINGS.
- No new blocker from the production audit.

After merge and promotion, dispatch CT2 for a Type 2 description-only Fresh Build proof that confirms repo creation, Vercel project/deployment, browser-clear public URL, no token exposure, and no VERIFIED movement.
