# Path 3 Fresh Build - Route Dedupe Production Proof Result

Date: 2026-06-14
Owner: CTO
Production URL: `https://flowai-dun.vercel.app`
Production commit: `4e35d87bd58eb710b3d1e032a16e045a8cf1ec8c`
Production deployment after env redeploy: `https://flowai-bgca68k0g-veu-ai-studio.vercel.app`

## Verdict

PARTIAL PROGRESS - no deployed Fresh Build URL yet.

The route-dedupe codegen fix is live and working: both proof runs reached `codebase_generator READY` with zero platform dependencies. The remaining blocker is GitHub write auth at the deployment adapter boundary.

No VERIFIED movement.

## Proof Runs

### Run 1 - route dedupe live proof

Run ID: `cto-path3-veusite-routededupe-20260614-0906`

Evidence:

- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-routededupe-20260614-0906.request.json`
- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-routededupe-20260614-0906.sse`
- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-routededupe-20260614-0906.stderr.txt`

Observed:

- Feature extractor completed.
- Design synthesizer completed.
- Codebase generator returned `READY`.
- Generated files: 342.
- Platform dependencies: 0.
- GitHub write failed before branch creation.
- Failure: `GITHUB_AUTH_FAILED`.
- GitHub endpoint: `/repos/victor2081new-cloud/flowai/git/blobs`.
- HTTP status: 403.
- `previewUrl`: `null`.
- Score fields: `null`.

### Run 2 - operator env fix proof

Before this run, CTO set `GITHUB_OPERATOR_TOKEN` in Vercel Production from the known-good Doppler `GITHUB_PAT`, redeployed production, and verified:

- `/api/health` reported commit `4e35d87bd58e`.
- `/api/version` reported commit `4e35d87bd58e`.
- `/api/operator-readiness` reported `GITHUB_OPERATOR_TOKEN: PRESENT` and all 7 checked credentials present.

Run ID: `cto-path3-veusite-operatorfix-20260614-0915`

Evidence:

- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-operatorfix-20260614-0915.request.json`
- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-operatorfix-20260614-0915.sse`
- `docs/cto/path3-fresh-build-veusite-routededupe-proof-20260614/cto-path3-veusite-operatorfix-20260614-0915.stderr.txt`

Observed:

- Feature extractor completed.
- Design synthesizer completed.
- Codebase generator returned `READY`.
- Generated files: 342.
- Platform dependencies: 0.
- GitHub write still failed before branch creation.
- Failure: `GITHUB_AUTH_FAILED`.
- GitHub endpoint: `/repos/victor2081new-cloud/flowai/git/blobs`.
- HTTP status: 403.
- `previewUrl`: `null`.
- Score fields: `null`.

## Interpretation

The route-dedupe defect is fixed. The next blocker is the Fresh Build deployment adapter's GitHub write credential path. A local Doppler PAT probe successfully created a GitHub blob on `victor2081new-cloud/flowai`, so the 403 is not explained by the PAT itself lacking blob-write permission.

Corrective branch: `fix/fresh-build-github-token-selection`.

Patch summary:

- Resolve GitHub write token candidates in explicit order: `GITHUB_OPERATOR_TOKEN`, `GITHUB_PAT`, then ambient `GITHUB_TOKEN`.
- Deduplicate identical token values.
- Retry with the next candidate only on `GITHUB_AUTH_FAILED`.
- Return safe non-secret GitHub diagnostic fields: `githubStatus`, `githubError`, and `credentialSource`.
- Add regression tests for token ordering, fallback retry, and non-secret diagnostics.

Verification on patch branch:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 39 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Claim Impact

- Live production proof: yes.
- New deployed Fresh Build URL: no.
- Branch creation in these two runs: no.
- VERIFIED movement justified: no.
- matrixArtifact edit: no.
- SSOT canonical edit: no.
