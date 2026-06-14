# CR Review Prompt - Universal Delivery Workspace

FROM: CTO
TO: CR
DATE: 2026-06-14 UTC
ACTION: STEP 5 REVIEW
STATUS: DISPATCHED

## Branch Under Review

- Branch: `feature/universal-delivery-workspace`
- Review HEAD: `141c0431c7e86816091dafed481651e5b63b4d3c`
- Base: `origin/main` at `7a13592312937b669d9422af0c26adf7a9a1827b`
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

## Files Changed Against `origin/main`

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

Review in a strict evidence, safety, and regression posture:

1. Does any path persist, print, return, or commit GitHub/Vercel tokens or derived secrets?
2. Can user-controlled input influence GitHub owner/org, repo visibility, branch name, project name, or deployment target unsafely?
3. Does the patch accidentally allow writes to original/protected repos?
4. Does any code relabel fallback/context URLs as observed deployment evidence?
5. Does any code claim deployment success before public readiness is established?
6. Are blocked states honest, specific, and not collapsed into misleading generic success?
7. Does DeliveryWorkspace introduce SSOT drift against ProductSSOT?
8. Are Type 1, Type 2, and Type 3 capabilities labeled honestly?
9. Are platform-boundary, parse, auth, secret, package, deploy, governance, and SSOT gates preserved?
10. Does the patch introduce product-specific hard-coding for SAIGE, RelTwin, VEU, Victor, or proof targets?
11. Do tests cover negative cases: missing permissions, wrong owner, deploy not READY, missing fallback, unsafe original repo?
12. Does the diagnosis artifact precede and match the runtime implementation?

## Verification To Re-Run

Run at minimum:

- `npx vitest run tests/provisioning/upgradeTargetProvisioner.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js`
- `npm run preflight`
- `git diff --name-status origin/main..origin/feature/universal-delivery-workspace`

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

Lead with findings ordered by severity and include file/line references where possible. Block on any secret leak, fabricated evidence, unsafe write path, SSOT drift, or unreviewed canonical/matrixArtifact change.
