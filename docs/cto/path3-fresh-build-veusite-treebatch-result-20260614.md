# Path 3 Fresh Build Tree-Batch Proof Result

Date: 2026-06-14
Owner: CTO
Production URL: `https://flowai-dun.vercel.app`
Production commit tested: `afe29e065211001f429387360f73b457b2158674`
Run ID: `cto-path3-veusite-treebatch-20260614-1014`
VERIFIED movement: no
matrixArtifact edited: no
canonical SSOT edited: no

## Verdict

Result: `PARTIAL`

Fresh Build crossed the prior blocker. It generated a valid codebase, wrote a GitHub branch, and created a Vercel preview deployment. It did not complete scoring or governance because the preview URL required Vercel authentication and the Fresh Build preview probe did not yet inject a valid automation bypass.

## Evidence

Evidence directory:

- `docs/cto/path3-fresh-build-veusite-treebatch-proof-20260614/`

Captured files:

- request: `cto-path3-veusite-treebatch-20260614-1014.request.json`
- SSE: `cto-path3-veusite-treebatch-20260614-1014.sse`
- stderr: `cto-path3-veusite-treebatch-20260614-1014.stderr.txt`

Runtime identity before proof:

- `/api/health` commitFull: `afe29e065211001f429387360f73b457b2158674`
- deployment URL: `https://flowai-183vmle0c-veu-ai-studio.vercel.app`
- operator readiness: all 7 required credentials present

## Observed Progress

The run reached:

- feature extraction
- design synthesis
- codebase generation
- GitHub branch creation
- Vercel preview deployment

Generated codebase evidence:

- files generated: `342`
- platform dependencies: `0`

GitHub write evidence:

- status: `WRITTEN_PREVIEW_NOT_BROWSER_CLEAR`
- files written: `342`
- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-treebatch-20260614-1014`
- branch URL: `https://github.com/victor2081new-cloud/flowai/tree/flowai%2Ffresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-treebatch-20260614-1014`
- commit SHA: `f34e4f52faadac1230b6a453ba406b38ad84f4f0`
- credential source: `GITHUB_OPERATOR_TOKEN`

Deployment evidence:

- deployment ID: `dpl_9QmBX6DdNHThwAYP6vRYgkFkRMjU`
- preview URL: `https://flowai-7e3av7seq-veu-ai-studio.vercel.app`
- inspector URL: `https://vercel.com/veu-ai-studio/flowai/9QmBX6DdNHThwAYP6vRYgkFkRMjU`
- preview access status: `PREVIEW_AUTH_REQUIRED`
- preview HTTP status: `401`

## Blocker

Final status:

- `status`: `partial`
- `exitReason`: `PREVIEW_AUTH_REQUIRED`
- `scoreStatus`: `SCORE_BLOCKED_PREVIEW_AUTH`
- `baselineScore`: `null`
- `finalScore`: `null`
- `scoreDelta`: `null`
- `prUrl`: `null`

This URL must not be promoted as a browser-confirmed deployed URL yet. It is deployment evidence, not acceptance evidence, until CT2 or an equivalent browser proof confirms the URL can be opened.

## Bypass Diagnosis

The existing W1 bypass scripts were hardcoded to historical Vercel project `truthful-flow-logic-lab`. Current FlowAI production uses Vercel project:

- project name: `flowai`
- project ID: `prj_qtqajKmblq1cZILD66jVbTVC4Uo5`

Secret-safe diagnostics found:

- historical project bypass SHA prefix: `9cc181d3`
- current `flowai` project bypass SHA prefix: `2a16d113`
- stale Doppler bypass initially did not clear the Fresh Build preview
- current `flowai` project bypass clears the Fresh Build preview with header form
- negative control without bypass remains `401`

No secret values were printed or committed.

## Patch Triggered

Branch: `fix/fresh-build-preview-bypass`

Patch scope:

- Fresh Build preview probe injects `x-vercel-protection-bypass` for `*.vercel.app` previews when a product-scoped or automation bypass secret is present.
- Product-scoped secrets take precedence over `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Probe evidence records `bypassAttempted` and `bypassSource` only.
- Secrets are not returned, logged, committed, or embedded in URLs.

Verification before review:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js` PASS, 20 tests
- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests
- `npm run build:preflight` PASS
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only
- `git diff --check` PASS

## Next Required Step

CD and CR must review `fix/fresh-build-preview-bypass`. After PASS, merge to main, redeploy production, and rerun Path 3. The acceptance target is:

- preview probe returns `PREVIEW_BROWSER_CLEAR`
- post-fix scoring runs against the generated URL
- governance/ProductSSOT behavior is reported honestly
- CT2 browser confirms any URL before VERIFIED movement
