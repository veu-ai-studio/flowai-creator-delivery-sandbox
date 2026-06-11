# SAIGE Runtime-Config Acceptance Proof - 2026-06-11

Owner: CTO
Production: `https://flowai-dun.vercel.app`
Run ID: `cto-saige-sse-proof-20260611185806`

## Preconditions

- `origin/main` at proof time included runtime-config merge `64b60a419bb99ba34793ffad1acbd97623cb8a04`.
- Production `/api/health` reported `0c8ee3759fd2`, full `0c8ee3759fd26320b1f095b1b4da227f4c2f2c46`, which is later than `64b60a4`.
- Production `/api/operator-readiness` reported `ok=true`, 7/7 credentials present.

## Command

```powershell
node scripts/cto/saige-sse-proof.mjs `
  --run-live `
  --base-url https://flowai-dun.vercel.app `
  --output-dir C:\Users\victo\Documents\Codex\flowai-verification\evidence `
  --product-scope saige `
  --url https://saigeplatform.com `
  --max-iterations 1 `
  --gtm-target 95 `
  --mode auto `
  --fail-on-incomplete
```

## Raw Evidence Files

- Request: `C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-sse-proof-20260611185806.request.json`
- Raw SSE transcript: `C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-sse-proof-20260611185806.sse`
- Initial summary: `C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-sse-proof-20260611185806.summary.json`
- Corrected summary after delivery URL parser fix: `C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-sse-proof-20260611185806.corrected.summary.json`

## Corrected Summary

- Verdict: `END_TO_END_COMPLETE`
- Accepted terminal: `true`
- End-to-end complete: `true`
- Event count: `89`
- Event types: `start=1`, `step=66`, `heartbeat=18`, `iteration=2`, `final=1`, `done=1`
- Last event: `[DONE]`
- Final event at: `2026-06-11T19:02:49.576Z`

Observed milestones:

- credential mode
- product discovery
- operator readiness
- upgrade target resolved
- upgrade target provisioned
- repo probe
- rate cap
- crawl complete
- branch creation
- preview/deployed delivery URL
- post-fix scoring
- final governance write
- ProductSSOT persistence

Observed delivery fields:

- Branch: `flowai/renewal-cto-saige-sse-proof-20260611185806-iter1`
- Deployed delivery URL: `https://saige-v2.vercel.app`
- Final score: `73`
- Exit reason: `MAX_ITERATIONS`
- ProductSSOT persisted: `true`

## Evidence Correction Note

The first parser summary reported `previewUrl: https://saigeplatform.com`, which is the source URL context. The raw final event also included `upgradedUrl: https://saige-v2.vercel.app`. The proof-runner parser was patched to prefer distinct delivery URLs and to prevent a source URL from satisfying the preview/deployment milestone.

Focused regression tests now cover:

- source URL alone does not count as deployed preview evidence
- a distinct `upgradedUrl` is selected over a source-like `previewUrl`

## Claim Boundary

This proof supports runtime-config acceptance: the 800s production window allowed the constrained SAIGE forge run to reach terminal `final` + `[DONE]` and observe delivery milestones.

This document does not move any SSOT claim to VERIFIED by itself. Any VERIFIED movement still requires the Claim Promotion Checklist and review against the exact canonical claim being updated.
