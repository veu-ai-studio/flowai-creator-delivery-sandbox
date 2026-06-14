# Path 3 Fresh Build Public Target Result - 2026-06-14

FROM: CTO
TO: W04
RUN ID: `cto-path3-veusite-publictarget-20260614-1253`
PRODUCTION RUNTIME COMMIT: `eb290b490093c199596ec7b0a178aac0dd73c1fe`
VERIFIED movement: no
matrixArtifact edited: no

## Verdict

`CTO PASS - CT2 ACCEPTANCE PENDING`

FlowAI production successfully ran Path 3 Fresh Build after the public-delivery target patch and returned a public production alias with no Vercel bypass.

## Inputs

- URL: `https://victorudo.com`
- Mode: `FRESH_BUILD`
- Description: upgraded VEU AI Studio website synthesized from `https://victorudo.com` and `https://flowai-dun.vercel.app`

Request / raw proof:

- `docs/cto/path3-fresh-build-veusite-publictarget-proof-20260614/cto-path3-veusite-publictarget-20260614-1253.request.json`
- `docs/cto/path3-fresh-build-veusite-publictarget-proof-20260614/cto-path3-veusite-publictarget-20260614-1253.sse`
- `docs/cto/path3-fresh-build-veusite-publictarget-proof-20260614/cto-path3-veusite-publictarget-20260614-1253.stderr.txt`

## Output

- status: `succeeded`
- exitReason: `READY`
- previewUrl / delivery URL: `https://flowai-fresh-public-veusite.vercel.app`
- deploymentId: `dpl_7vDb7VvdKYbSthvbUnkNnyWrz7zA`
- raw deploymentUrl: `https://flowai-fresh-public-veusite-ktv1y4qls-veu-ai-studio.vercel.app`
- publicDelivery: `true`
- deliveryMode: `public_project_production_alias`
- vercelTarget: `production`
- publicProjectName: `flowai-fresh-public-veusite`

Preview access:

- previewAccessStatus: `PREVIEW_BROWSER_CLEAR`
- httpStatus: `200`
- bypassAttempted: `false`
- bypassSource: `null`

Score:

- baselineScore: `93`
- finalScore: `100`
- scoreDelta: `7`
- scoreStatus: `SCORE_CAPTURED`

Generated branch:

- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253`
- commit: `95512be0cf898251ad2b12301ae8043690b6852e`
- branchUrl: `https://github.com/victor2081new-cloud/flowai/tree/flowai%2Ffresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253`
- filesWritten: `342`

CTO branch inspection:

- `git ls-tree -r --name-only FETCH_HEAD | Measure-Object -Line`: `342`
- forbidden retained prefixes scan for `api/`, `docs/`, `scripts/`, `tests/`, `src/lib/agents`, `src/api/`, `src/deployables/`, `.github/`: no matches
- `npx vercel inspect https://flowai-fresh-public-veusite.vercel.app --scope veu-ai-studio`: deployment `Ready`, target `production`, root/static build only, no FlowAI API functions shown

## Boundary

This is not yet a VERIFIED promotion. CT2 must independently open the public URL in a browser with no bypass header and confirm it renders generated VEU/Victor/FlowAI-positioning content rather than the FlowAI operator app or a Vercel protection page.
