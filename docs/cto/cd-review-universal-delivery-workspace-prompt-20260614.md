# CD Review Prompt - Universal Delivery Workspace

FROM: CTO
TO: CD
DATE: 2026-06-14 UTC
ACTION: STEP 5 REVIEW
STATUS: DISPATCHED

## Branch Under Review

- Branch: `feature/universal-delivery-workspace`
- Review HEAD: `141c0431c7e86816091dafed481651e5b63b4d3c`
- Review base commit: `7a13592312937b669d9422af0c26adf7a9a1827b`
- Runtime patch commit: `0dd2177f7a397dc7782c10a9e9c148b3314b8fb5`
- Pre-runtime diagnosis commit: `1290110`

CB merged current `origin/main` into the branch before review. CTO confirmed the diff against `origin/main` no longer deletes newer CT2/SAIGE evidence files.

## Required Reading

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/cto/cb-universal-delivery-workspace-diagnosis-20260614.md`
- `docs/cto/cb-universal-delivery-workspace-implementation-evidence-20260614.md`
- `docs/cto/cb-universal-delivery-workspace-sync-request-20260614.md`

## Files Changed Against Review Base `7a13592312937b669d9422af0c26adf7a9a1827b`

- `docs/cto/cb-universal-delivery-workspace-diagnosis-20260614.md`
- `docs/cto/cb-universal-delivery-workspace-implementation-evidence-20260614.md`
- `src/api/run-construction.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `src/lib/provisioning/upgradeTargetProvisioner.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`
- `tests/provisioning/upgradeTargetProvisioner.test.js`

No canonical docs, matrixArtifact, or VERIFIED state should be in the branch diff.

## Review Focus

Review for architecture and implementation integrity:

1. Does the patch establish a real DeliveryWorkspace substrate rather than log-only metadata?
2. Does repo creation happen only under the configured FlowAI-owned GitHub owner/org?
3. Is repo naming collision-safe and product-agnostic?
4. Does the GitHub write path support initial codebase commit into an empty repo?
5. Are GitHub App permission failures surfaced honestly?
6. Is operator-token fallback explicit, auditable, and secret-safe?
7. Are tokens excluded from state, logs, status bus, errors, and ProductSSOT?
8. Does Vercel project create/resolve use the expected API shape and team/scope?
9. Is a deployment URL returned only after Vercel READY/public proof?
10. Are protected original repo write guards preserved?
11. Do existing preconfigured product paths keep working?
12. Is Type 2 description-only support honestly represented without fake crawl or baseline scoring evidence?
13. Are failure states plain and specific enough for user-facing diagnosis?

## Verification To Re-Run

Run at minimum:

- `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js`
- `npm run preflight`
- `git diff --name-status 7a13592312937b669d9422af0c26adf7a9a1827b..origin/feature/universal-delivery-workspace`

Confirm the branch diff excludes:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `src/lib/orchestratorFramework/matrixArtifact.json`

## Required Output

Return:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Lead with findings, ordered by severity, with file/line references where possible.
