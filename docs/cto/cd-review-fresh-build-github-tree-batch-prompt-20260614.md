# CD Review Prompt - Fresh Build GitHub Tree Batch

FROM: CTO
TO: CD
DATE: 2026-06-14
ACTION: Step 5 technical review

Branch: `fix/fresh-build-github-tree-batch`
HEAD: `bf12f6d`
Base: `c39cfc1`

## Context

After the token-selection patch was merged and deployed, live Path 3 Fresh Build reached codegen READY but failed at GitHub write with a now-visible GitHub secondary rate limit. The current writer creates one Git blob per generated file before creating the tree. A VEU site Fresh Build generates 342 files, so repeated proof runs can hit secondary limits before branch creation.

## Changed Files

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

## Patch Summary

- Removes per-file `POST /git/blobs` loop.
- Uses one `POST /git/trees` request with inline `content` entries.
- Leaves base ref lookup, commit creation, branch ref creation, branch naming, original repo block, and main/master block intact.
- Adds a regression test that fails if `/git/blobs` is called for generated files.

## Verification

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 40 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Review Ask

Confirm whether this is safe to merge after CR review.

Focus:

- Does GitHub create-tree inline content correctly replace per-file blob calls?
- Does the patch reduce secondary-rate risk without weakening write safety?
- Are branch/main/original-repo protections unchanged?
- No scoring, governance, ProductSSOT, auth, VERIFIED, or matrixArtifact movement.

Report PASS or BLOCK with exact findings.
