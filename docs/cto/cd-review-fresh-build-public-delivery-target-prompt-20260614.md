# CD Review Prompt - Fresh Build Public Delivery Target

FROM: CTO
TO: CD
ACTION: STEP 5 REVIEW - architecture and implementation review
DATE: 2026-06-14 UTC

Read first:

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/fresh-build-public-delivery-target-evidence-20260614.md`
- `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`

## Branch Under Review

- Branch: `fix/fresh-build-public-delivery-target`
- Runtime code commit: `c2991ed1235dc84d9b891fda1adc089bf9e6f524`
- Review HEAD: latest pushed tip of `origin/fix/fresh-build-public-delivery-target`
- Base: `origin/main` at or after `d9fc93e72edd`

Files changed by runtime patch:

- `src/lib/agents/renewal/vercelBranchDeploy.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/agents/renewal/vercelBranchDeploy.test.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

Supporting evidence/docs may also be present under `docs/cto/`.

## Review Focus

Please check:

1. Preview deploy behavior remains unchanged when `target` is omitted.
2. Production target is only sent when explicitly requested.
3. Stable alias selection is reasonable and does not relabel protected/raw deployment URLs as public evidence.
4. Fresh Build public delivery requires explicit public env configuration and does not silently deploy production target to the normal FlowAI project.
5. Public delivery probing disables the bypass header so public-browser-clear means public access.
6. Returned metadata is honest and keeps `deploymentUrl`, `previewUrl`, `aliases`, and `publicDelivery` distinct.
7. Tests cover the expected behavior.
8. No canonical docs, matrixArtifact, ProductSSOT, or VERIFIED movement is changed.

## CTO Verification

- Focused deploy/adapter tests: PASS, 2 files / 51 tests.
- Fresh Build suite + Vercel deploy helper: PASS, 6 files / 90 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config warnings only.
- `git diff --check`: PASS.

## Required Output

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

Block only on concrete architecture, implementation, test, evidence, or protocol failure.
