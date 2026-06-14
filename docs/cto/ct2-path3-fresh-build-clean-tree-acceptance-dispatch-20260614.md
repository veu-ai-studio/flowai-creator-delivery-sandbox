# CT2 Dispatch - Path 3 Fresh Build Clean-Tree Acceptance

FROM: CTO
TO: CT2
ACTION: LIVE BROWSER ACCEPTANCE - Path 3 Fresh Build clean-tree output

Repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`
Production commit that created run: `747ae221f0501ca51d74dc33c00735e98e44da3a`
Run ID: `cto-path3-veusite-cleantree-20260614-1109`

## Target

Fresh Build preview URL:

`https://flowai-qia5zr2ag-veu-ai-studio.vercel.app`

Branch:

`flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`

Branch commit:

`d6d779f1b7b21083e4dbe01c63bcb84276da8bcd`

## Required Browser Proof

Run two browser checks and keep the distinction explicit.

### A. Negative control - anonymous browser

Open the target URL without bypass header.

Expected:

- Vercel protection/auth page or HTTP `401`
- Do not call this publicly accepted

### B. Positive control - automation bypass browser

Open the target URL in a fresh browser context with header:

`x-vercel-protection-bypass: <value from Doppler flowai/prd VERCEL_AUTOMATION_BYPASS_SECRET>`

Rules:

- Never print, screenshot, commit, echo, or store the secret value.
- Do not place the secret in a URL.
- Header form only.

Expected:

- HTTP/browser page loads successfully.
- Screenshot captures rendered generated website.
- Page content is a generated VEU AI Studio / Victor Udo / FlowAI-positioning website.
- Page must not be the FlowAI operator app shell.

## Required Evidence Checks

Also confirm from repo/Git evidence:

- generated branch has exactly `342` files;
- no retained paths matching `api/`, `.github/`, `docs/`, `scripts/`, `tests/`, `src/api/`, `src/lib/agents/`, or `src/deployables/`;
- Vercel inspect for the deployment shows static/root build only, not FlowAI API functions.

## Report

Commit CT2 report and screenshots under `docs/cto/`.

Recommended report file:

`docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-result-20260614.md`

Required verdict language:

- `PASS_WITH_BYPASS_NOT_PUBLIC` if the bypassed browser opens the generated site but anonymous access remains protected.
- `PASS_PUBLIC` only if anonymous browser access opens the generated site without bypass.
- `BLOCK` if the bypassed browser cannot open the site, the page is FlowAI operator shell, the branch is not clean, or any secret leaks.

No VERIFIED movement is authorized by this dispatch.
