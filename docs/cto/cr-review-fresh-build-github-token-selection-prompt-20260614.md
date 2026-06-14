# CR Review Prompt - Fresh Build GitHub Token Selection

FROM: CTO
TO: CR
DATE: 2026-06-14
ACTION: Step 5 evidence and regression review

Branch: `fix/fresh-build-github-token-selection`
HEAD: `1116e62`
Base: `4e35d87`

## Context

Production proof after route-dedupe merge reached codegen READY but failed at GitHub blob write with 403. The proof evidence remains blocked and does not claim a deployed URL.

Evidence summary:

- `docs/cto/path3-fresh-build-veusite-routededupe-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/`

## Changed Files

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

## Verification

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 39 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## CR Review Focus

Please verify:

- The proof evidence still has `previewUrl:null`, score fields `null`, and no deployed URL claim.
- No `matrixArtifact` entry moved to VERIFIED or WIRED.
- Token values are never returned, logged, or committed.
- `credentialSource`, `githubStatus`, and `githubError` are non-secret diagnostics.
- The patch does not weaken main/master write blocking, original repo write blocking, Vercel preview access classification, scoring, governance, or ProductSSOT behavior.

Report PASS or BLOCK with exact file/line findings.
