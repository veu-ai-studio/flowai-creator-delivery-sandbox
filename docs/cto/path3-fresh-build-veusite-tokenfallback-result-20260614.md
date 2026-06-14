# Path 3 Fresh Build - Token Fallback Production Proof Result

Date: 2026-06-14
Owner: CTO
Production URL: `https://flowai-dun.vercel.app`
Production commit: `c39cfc199b852704c012860c7074e1846ccab6a7`
Production deployment: `https://flowai-1i02nwm59-veu-ai-studio.vercel.app`
Run ID: `cto-path3-veusite-tokenfallback-20260614-0941`

## Verdict

PARTIAL PROGRESS - no deployed Fresh Build URL yet.

The token-selection patch worked diagnostically and revealed the real blocker: GitHub secondary rate limiting from hundreds of per-file blob writes.

No VERIFIED movement.

## Evidence

- `docs/cto/path3-fresh-build-veusite-tokenfallback-proof-20260614/cto-path3-veusite-tokenfallback-20260614-0941.request.json`
- `docs/cto/path3-fresh-build-veusite-tokenfallback-proof-20260614/cto-path3-veusite-tokenfallback-20260614-0941.sse`
- `docs/cto/path3-fresh-build-veusite-tokenfallback-proof-20260614/cto-path3-veusite-tokenfallback-20260614-0941.stderr.txt`

## Observed

- `/api/health` reported commit `c39cfc199b85`.
- `/api/version` reported commit `c39cfc199b85`.
- `/api/operator-readiness` reported all 7 credentials present.
- Feature extractor completed.
- Design synthesizer completed.
- Codebase generator returned `READY`.
- Generated files: 342.
- Platform dependencies: 0.
- GitHub write failed before branch creation.
- Failure: `GITHUB_AUTH_FAILED`.
- `githubStatus`: 403.
- `credentialSource`: `GITHUB_OPERATOR_TOKEN`.
- `githubError`: GitHub secondary rate limit.
- `previewUrl`: `null`.
- Score fields: `null`.

## Interpretation

The previous opaque 403 was not a missing-token condition. The adapter now surfaced GitHub's response: the current writer creates one blob per generated file before creating the tree. For a 342-file generated Fresh Build, repeated proof runs can trip GitHub secondary rate limiting before branch creation.

Corrective branch: `fix/fresh-build-github-tree-batch`.

Patch summary:

- Remove per-file `POST /git/blobs` calls.
- Use one `POST /git/trees` call with inline `content` entries for generated files.
- Preserve the existing base-ref, commit, and branch-ref sequence.
- Keep original repo and main/master write blocks unchanged.
- Add regression test proving `/git/blobs` is not called and generated file contents are sent through the create-tree request.

Verification on patch branch:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 40 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Claim Impact

- Live production proof: yes.
- New deployed Fresh Build URL: no.
- Branch creation in this run: no.
- VERIFIED movement justified: no.
- matrixArtifact edit: no.
- SSOT canonical edit: no.
