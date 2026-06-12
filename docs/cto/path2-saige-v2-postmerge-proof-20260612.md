# Path 2 Post-Merge Proof - SAIGE v2 Production Run

Date: 2026-06-12
Owner: CTO
Runtime repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Production URL: `https://flowai-dun.vercel.app`
VERIFIED movement: no

## Production Identity

Runtime branch `fix/path2-platform-boundary-chain` was merged to `main` and production was promoted before this proof.

- Main merge head: `b4e02c566378e5f00b17252f9db176e20f9e7d42`
- Vercel production deployment: `https://flowai-cddxkdlzq-veu-ai-studio.vercel.app`
- Vercel deployment id: `dpl_4HBm6eGyQ28Qk9NaFpKTDinY8dBD`
- `/api/health` commit: `b4e02c566378`
- `/api/health` branch: `main`
- GitHub App: ready
- Inngest: ready

The `/api/health` orchestra member list still did not include Codex at this point. This supports the separate TIM Codex amendment.

## Command

```powershell
node scripts/cto/saige-sse-proof.mjs --run-live --base-url https://flowai-dun.vercel.app --output-dir C:\Users\victo\Documents\Codex\flowai-verification\cto-path2-saige-v2-postmerge-20260612-0801 --product-scope saige --url https://saige-v2.vercel.app --max-iterations 1 --gtm-target 95 --mode auto --run-id cto-path2-saige-v2-postmerge-20260612-0801 --timeout-ms 900000 --fail-on-incomplete
```

The first sandboxed attempt failed with local `fetch failed`; the rerun with approved network execution completed and produced evidence.

## Evidence Files

- Request: `C:\Users\victo\Documents\Codex\flowai-verification\cto-path2-saige-v2-postmerge-20260612-0801\cto-path2-saige-v2-postmerge-20260612-0801.request.json`
- SSE transcript: `C:\Users\victo\Documents\Codex\flowai-verification\cto-path2-saige-v2-postmerge-20260612-0801\cto-path2-saige-v2-postmerge-20260612-0801.sse`
- Summary JSON: `C:\Users\victo\Documents\Codex\flowai-verification\cto-path2-saige-v2-postmerge-20260612-0801\cto-path2-saige-v2-postmerge-20260612-0801.summary.json`
- Summary Markdown: `C:\Users\victo\Documents\Codex\flowai-verification\cto-path2-saige-v2-postmerge-20260612-0801\cto-path2-saige-v2-postmerge-20260612-0801.summary.md`

## Summary Result

- Verdict: `TERMINAL_FINAL_INCOMPLETE_MILESTONES`
- Terminal frame: final + `[DONE]`
- Timeout: false
- Event count: 73
- End-to-end complete: false
- Branch creation milestone: true
- Preview deployment milestone: true
- Post-fix scoring milestone: true
- Final governance write milestone: false
- ProductSSOT persistence milestone: false
- Final score: `54.5`
- Exit reason: `STEP_FAILED`

Observed output fields:

- Branch: `flowai/renewal-cto-path2-saige-v2-postmerge-20260612-0801-iter1`
- Preview URL in final summary: `null`
- ProductSSOT persisted: false

## Parsed Terminal Failure

The final payload reported:

```json
{
  "code": "MONITOR_FETCH_FAILED",
  "error": "fetchUrlContent: https://saige-v2-p7cwizuu8-veu-ai-studio.vercel.app returned 401 Unauthorized (vercel-protection-bypass attempted)",
  "status": 401,
  "exitReason": "STEP_FAILED",
  "finalScore": 54.5,
  "previewUrl": null
}
```

Important boundary: the run did create and deploy a Vercel preview during Step 10, but the post-fix monitor could not fetch the protected preview. The preview URL is therefore evidence of a deployment attempt, not evidence of a successfully usable deployed upgrade.

Observed Step 10 event:

```json
{
  "step": 10,
  "stepName": "Vercel Preview Deploy",
  "tool": "vercelBranchDeploy.js (PATH A operator branch deploy)",
  "status": "complete",
  "result": {
    "previewUrl": "https://saige-v2-p7cwizuu8-veu-ai-studio.vercel.app"
  }
}
```

Observed Step 11 event:

```json
{
  "step": 11,
  "stepName": "Five-Layer Scoring (Post-Fix)",
  "tool": "verification.capturePostFixSnapshot (PHASE C)",
  "status": "complete",
  "result": {
    "url": "https://saige-v2-p7cwizuu8-veu-ai-studio.vercel.app"
  }
}
```

The final payload overrides any stronger interpretation of those intermediate events because the post-fix fetch ended with `MONITOR_FETCH_FAILED`.

## TIM Build Evidence

The live run still emitted a Build candidate list without Codex:

- Cursor rank 1
- Base44 rank 2
- Bolt rank 3
- Windsurf rank 4
- Replit rank 5

Codex was absent from the live Step 3 Build Tool Intelligence list. This is direct production evidence supporting:

- `docs/cto/tim-codex-build-tool-amendment-plan-20260612.md`
- `docs/cto/cb-tim-codex-build-tool-dispatch-20260612.md`

## CTO Assessment

The Path 2 platform-boundary-chain repair is directionally successful: the run now reaches branch creation and Vercel preview deployment instead of stopping at `PLATFORM_BOUNDARY_BLOCKED`.

The next blocker is protected-preview access during post-fix scoring. FlowAI must either:

- fetch the protected preview with a valid Vercel Deployment Protection bypass, or
- classify the preview as deployment-produced but inaccessible, preserve the URL as context, and stop without claiming post-fix evidence.

It must not mark the preview as a usable delivered URL until CT2 or the scoring pipeline can actually access it.

## Next Dispatch

CB should patch the protected-preview scoring blocker on a new branch after the TIM Codex work is moving or if W04/CTO reorders.

Dispatch packet:

- `docs/cto/cb-path2-preview-protection-postfix-dispatch-20260612.md`

No CT2 deployed-URL acceptance should run for this Path 2 preview until a fetchable preview URL is proven.
