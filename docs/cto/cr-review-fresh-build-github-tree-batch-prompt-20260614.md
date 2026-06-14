# CR Review Prompt - Fresh Build GitHub Tree Batch

FROM: CTO
TO: CR
DATE: 2026-06-14
ACTION: Step 5 evidence and regression review

Branch: `fix/fresh-build-github-tree-batch`
HEAD: `bf12f6d`
Base: `c39cfc1`

## Context

The latest production proof did not produce a deployed URL. It did, however, expose the real GitHub blocker: secondary rate limiting caused by hundreds of blob writes. This patch changes the GitHub write mechanism to one create-tree request with inline content.

Evidence summary:

- `docs/cto/path3-fresh-build-veusite-tokenfallback-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-tokenfallback-proof-20260614/`

## Changed Files

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

## Verification

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 40 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## CR Review Focus

Please verify:

- The proof evidence still has `previewUrl:null`, score fields `null`, and no deployed URL claim.
- No `matrixArtifact` entry moved to VERIFIED or WIRED.
- No token values are returned, logged, or committed.
- The patch does not weaken main/master write blocking, original repo write blocking, Vercel preview access classification, scoring, governance, or ProductSSOT behavior.
- The new test proves generated file writes avoid `/git/blobs`.

Report PASS or BLOCK with exact file/line findings.
