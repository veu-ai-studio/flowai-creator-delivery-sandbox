# CD Review Prompt - Fresh Build GitHub Token Selection

FROM: CTO
TO: CD
DATE: 2026-06-14
ACTION: Step 5 technical review

Branch: `fix/fresh-build-github-token-selection`
HEAD: `1116e62`
Base: `4e35d87`

## Context

After the route-dedupe fix was merged and deployed to production, Path 3 Fresh Build advanced through codegen:

- `codebase_generator READY`
- 342 generated files
- 0 platform dependencies

It then failed at the GitHub blob-write boundary:

`GitHub POST /repos/victor2081new-cloud/flowai/git/blobs failed with 403`

CTO verified the Doppler `GITHUB_PAT` can create a GitHub blob on `victor2081new-cloud/flowai` locally without exposing the token. Production operator readiness also showed `GITHUB_OPERATOR_TOKEN` present after env redeploy. The remaining issue is the adapter credential path/diagnostic opacity.

## Changed Files

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

## Patch Summary

- Adds ordered GitHub write token candidate resolution:
  `GITHUB_OPERATOR_TOKEN`, `GITHUB_PAT`, then ambient `GITHUB_TOKEN`.
- Deduplicates identical token values.
- Retries the next token candidate only on `GITHUB_AUTH_FAILED`.
- Adds non-secret write diagnostics:
  `credentialSource`, `githubStatus`, and `githubError`.
- Keeps tokens out of returned envelopes and tests.

## Verification

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 39 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Review Ask

Confirm whether this is safe to merge after CR review.

Focus:

- Does retrying only on `GITHUB_AUTH_FAILED` avoid masking non-auth write failures?
- Are diagnostic fields non-secret and appropriate for proof evidence?
- Does this preserve branch/main write safety and deployment policy?
- No scoring, governance, ProductSSOT, auth, VERIFIED, or matrixArtifact movement.

Report PASS or BLOCK with exact findings.
