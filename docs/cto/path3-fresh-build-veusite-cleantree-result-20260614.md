# Path 3 Fresh Build Clean-Tree Proof Result

Date: 2026-06-14
Owner: CTO
Production URL: `https://flowai-dun.vercel.app`
Production commit tested: `747ae221f0501ca51d74dc33c00735e98e44da3a`
Run ID: `cto-path3-veusite-cleantree-20260614-1109`
VERIFIED movement: no
matrixArtifact edited: no
canonical SSOT edited: no

## Verdict

Result: `READY_CLEAN_TREE_WITH_PROTECTED_PREVIEW`

Fresh Build produced a clean generated branch, created a Vercel preview deployment, accessed the preview through the automation bypass header, and captured a score. The output is not yet a public browser-accepted URL because anonymous access to the preview remains protected.

## Runtime Proof

Evidence directory:

- `docs/cto/path3-fresh-build-veusite-cleantree-proof-20260614/`

Captured files:

- request: `cto-path3-veusite-cleantree-20260614-1109.request.json`
- SSE: `cto-path3-veusite-cleantree-20260614-1109.sse`
- stderr: `cto-path3-veusite-cleantree-20260614-1109.stderr.txt`

Final run output:

- final status: `succeeded`
- Fresh Build status: `READY`
- write status: `WRITTEN_AND_DEPLOYED`
- preview access status: `PREVIEW_BROWSER_CLEAR`
- score status: `SCORE_CAPTURED`
- baseline score: `93`
- final score: `100`
- score delta: `7`

Branch/deployment evidence:

- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`
- branch URL: `https://github.com/victor2081new-cloud/flowai/tree/flowai%2Ffresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`
- branch commit: `d6d779f1b7b21083e4dbe01c63bcb84276da8bcd`
- deployment ID: `dpl_VRFEWdn8K5Egp5Y37J6Y3F4gSkzB`
- preview URL: `https://flowai-qia5zr2ag-veu-ai-studio.vercel.app`
- inspector URL: `https://vercel.com/veu-ai-studio/flowai/VRFEWdn8K5Egp5Y37J6Y3F4gSkzB`
- files written: `342`
- platform dependencies reported by generator: `0`

## Clean-Tree Verification

CTO fetched the generated branch and inspected its tree.

Result:

- branch file count: `342`
- retained platform path scan: no matches

Patterns checked:

- `api/`
- `.github/`
- `docs/`
- `scripts/`
- `tests/`
- `src/api/`
- `src/lib/agents/`
- `src/deployables/`

Vercel inspect for `https://flowai-qia5zr2ag-veu-ai-studio.vercel.app` showed only a static/root build entry:

- `Builds: . [0ms]`

It did not show FlowAI API functions.

## Public Access Boundary

The preview is still protected for anonymous browsers:

- anonymous status check: `401`
- bypass-header status check: `200`

Therefore:

- This is a real generated deployment and clean-tree proof.
- This is not yet a Victor-openable public URL proof.
- CT2 acceptance must report whether it used the automation bypass header.
- No VERIFIED movement is authorized from this proof alone.

## CT2 Dispatch

CT2 dispatch:

- `docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-dispatch-20260614.md`

Requested verdict language:

- `PASS_WITH_BYPASS_NOT_PUBLIC`
- `PASS_PUBLIC`
- `BLOCK`
