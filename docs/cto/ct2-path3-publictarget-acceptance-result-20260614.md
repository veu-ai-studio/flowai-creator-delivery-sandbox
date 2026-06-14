# CT2 Path 3 Public Target Acceptance Result - 2026-06-14

FROM: CT2
TO: CTO
ACTION: Path 3 Fresh Build public target browser acceptance

## Verdict

`PASS-WITH-FINDINGS`

Core public-target acceptance passed. Minor finding: sampled navigation links rendered successfully but left the generated public target domain for `victorudo.com`, so CT2 did not count the optional route-click sample as same-origin generated-site route coverage.

No VERIFIED movement. No matrix/canonical changes.

## Target

- Public URL returned by FlowAI runtime: `https://flowai-fresh-public-veusite.vercel.app`
- Run ID: `cto-path3-veusite-publictarget-20260614-1253`
- FlowAI runtime commit from dispatch: `eb290b490093c199596ec7b0a178aac0dd73c1fe`
- Deployment ID: `dpl_7vDb7VvdKYbSthvbUnkNnyWrz7zA`
- Generated branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253`
- Generated commit: `95512be0cf898251ad2b12301ae8043690b6852e`

## Browser Proof

Method:

- Fresh anonymous Playwright Chromium context.
- No Vercel bypass header.
- No cookies, tokens, credentials, or secrets supplied.

Observed:

- HTTP status: `200`
- Final browser URL: `https://flowai-fresh-public-veusite.vercel.app/`
- Page title: `url-416b941ffbc3b7d5`
- Vercel protection/login: not observed
- FlowAI operator shell: not observed
- Blank Vite shell: not observed
- Generated content signals: present

Generated content observed:

- `Victor Udo, FNSE, PhD | AI Platform Builder - Sustainability Leader - Abasi Foundation Leader - Power Sector Executive`
- `VEU AI Studio`
- `FlowAI`
- `Abasi People Foundation`
- `Afri Decarbonization Corp`
- `Start the Demo`

Screenshots:

- Initial target screenshot: `docs/cto/ct2-path3-publictarget-acceptance-evidence-20260614/screenshots/publictarget-initial-2026-06-14T13-00-30-585Z.png`
- After sampled nav clicks: `docs/cto/ct2-path3-publictarget-acceptance-evidence-20260614/screenshots/publictarget-after-route-clicks-2026-06-14T13-00-30-585Z.png`

Raw browser evidence:

- `docs/cto/ct2-path3-publictarget-acceptance-evidence-20260614/ct2-path3-publictarget-browser-raw-20260614.json`

Runner used:

- `docs/cto/ct2-path3-publictarget-acceptance-runner-20260614.mjs`

## Optional Route-Click Sample

Sampled visible links:

- `VEU AI Studio`: navigated from the generated public target to `https://victorudo.com/veu-ai-studio`
- `About`: navigated to `https://victorudo.com/about`
- `Contact`: navigated to `https://victorudo.com/contact`

All sampled pages rendered and did not show Vercel protection or the FlowAI operator app shell.

Finding: the sampled links left `flowai-fresh-public-veusite.vercel.app`, so the optional click check proved no hard crash for those visible links but did not prove same-origin generated route handling.

## Generated Branch Check

Checked fetched generated branch tree:

`flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253`

Results:

- File count: `342`
- Forbidden retained path prefixes found: none
- Checked prefixes: `api/`, `.github/`, `docs/`, `scripts/`, `tests/`, `src/api/`, `src/lib/agents/`, `src/deployables/`

## Vercel Inspect

Command:

`npx vercel inspect https://flowai-fresh-public-veusite.vercel.app --scope veu-ai-studio`

Observed:

- Deployment fetched: `https://flowai-fresh-public-veusite-ktv1y4qls-veu-ai-studio.vercel.app`
- Deployment ID: `dpl_7vDb7VvdKYbSthvbUnkNnyWrz7zA`
- Name: `flowai`
- Target: `production`
- Status: `Ready`
- Alias: `https://flowai-fresh-public-veusite.vercel.app`
- Builds: root/static build entry only, `. [0ms]`
- No FlowAI API functions were listed in inspect output.

## Final CT2 Finding

The target public URL is anonymously reachable with HTTP `200` and renders generated Victor Udo / VEU AI Studio / FlowAI-positioning content. It is not Vercel-protected, not the FlowAI operator shell, and not blank. Public target acceptance is passed with the route-click finding noted above.
