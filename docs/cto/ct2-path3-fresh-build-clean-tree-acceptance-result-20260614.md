# CT2 Path 3 Fresh Build Clean-Tree Acceptance Result - 2026-06-14

FROM: CT2
TO: CTO
RUN ID: `cto-path3-veusite-cleantree-20260614-1109`

## Verdict

`PASS_WITH_BYPASS_NOT_PUBLIC`

## Target

- Target preview URL: `https://flowai-qia5zr2ag-veu-ai-studio.vercel.app`
- Main evidence commit tested from local `main`: `6c5b3fa25ecd967cc70120efb3de128b384934f5`
- Dispatch production commit: `747ae221f0501ca51d74dc33c00735e98e44da3a`
- Fresh-build branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`
- Fresh-build branch commit named by dispatch: `d6d779f1b7b21083e4dbe01c63bcb84276da8bcd`

## Browser Checks

Viewport: `1440x1000`

### A. Negative Control - Anonymous Browser

- Method: fresh Chromium context, no bypass header.
- Result: HTTP `401`.
- Observed page title: `Login - Vercel`.
- Observed UI text included: `Log in to Vercel`, `Continue with Email`, `Continue with Google`, `Continue with GitHub`, `Continue with Apple`, `Continue with SAML SSO`.
- Screenshot: `docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-screenshots-20260614/anonymous-negative.png`
- Acceptance impact: anonymous access remains protected; this is not public acceptance.

### B. Positive Control - Automation Bypass Browser

- Method: fresh Chromium context with `x-vercel-protection-bypass` header only.
- Secret handling: `VERCEL_AUTOMATION_BYPASS_SECRET` was retrieved from Doppler `flowai/prd` in process memory only; it was not printed, echoed, committed, stored, or placed in a URL.
- Result: HTTP `200`.
- Observed page title: `url-416b941ffbc3b7d5`.
- Observed generated-site text included: `Victor Udo, FNSE, PhD | AI Platform Builder - Sustainability Leader - Abasi Foundation Leader - Power Sector Executive`, `VEU AI Studio`, `Abasi People Foundation`, `Afri Decarbonization Corp`, `SAIGE Demo`, and `Start the Demo`.
- Screenshot: `docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-screenshots-20260614/bypass-positive.png`
- Acceptance impact: bypassed browser opened a generated Victor Udo / VEU AI Studio / FlowAI-positioning website. It did not show the FlowAI operator app shell.

Raw browser result JSON:

- `docs/cto/ct2-path3-fresh-build-clean-tree-acceptance-screenshots-20260614/browser-result.json`

Browser runner used for reproducibility:

- `docs/cto/ct2-path3-browser-acceptance-runner-20260614.mjs`

## Git / Clean-Tree Evidence

Local repo state before evidence edits:

- Branch: `main`
- Status: clean relative to `origin/main`
- HEAD: `6c5b3fa25ecd967cc70120efb3de128b384934f5`

Fresh-build branch audit was performed from fetched tree `FETCH_HEAD` for:

`flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`

Results:

- Generated branch file count: `342`
- Forbidden retained path prefixes found: none
- Checked prefixes: `api/`, `.github/`, `docs/`, `scripts/`, `tests/`, `src/api/`, `src/lib/agents/`, `src/deployables/`

## Vercel Inspect Evidence

Command:

`npx vercel inspect https://flowai-qia5zr2ag-veu-ai-studio.vercel.app`

Observed:

- Deployment id: `dpl_VRFEWdn8K5Egp5Y37J6Y3F4gSkzB`
- Name: `flowai`
- Target: `preview`
- Status: `Ready`
- URL: `https://flowai-qia5zr2ag-veu-ai-studio.vercel.app`
- Alias: `https://flowai-git-flowai-fresh-build-url-416b941f-b71259-veu-ai-studio.vercel.app`
- Builds section listed only root/static build entry: `. [0ms]`
- No FlowAI API functions were listed in inspect output.

## Final Notes

- Deployed URL was independently observed in browser with bypass header.
- Anonymous browser remained protected with HTTP `401`.
- No secret value appears in screenshots, JSON, report, command output, or committed files.
- No VERIFIED movement is authorized or performed.
- No matrix/canonical changes were made.
