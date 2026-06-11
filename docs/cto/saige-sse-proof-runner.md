# SAIGE SSE Proof Runner

Date: 2026-06-11
Owner: CTO
Branch: `docs/cto-saige-proof-runner`

## Purpose

This is a small evidence tool for the post-merge production acceptance run after `fix/forge-runtime-config-800` is merged and deployed.

It prevents manual transcript interpretation by producing:

- request JSON
- raw SSE transcript
- structured summary JSON
- readable summary Markdown

The tool does not move VERIFIED status. It only reports evidence.

## Safe Parse Mode

Parse an existing transcript without touching production:

```powershell
node scripts/cto/saige-sse-proof.mjs `
  --input C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-primary-retry-proof-20260611-0909.sse `
  --summary-out C:\Users\victo\Documents\Codex\flowai-verification\evidence\cto-saige-primary-retry-proof-20260611-0909.summary.json
```

Expected for the pre-fix proof: `INCOMPLETE_STREAM`.

## Live Acceptance Mode

Run only after W04 clears the runtime-config branch, it is merged, Victor deploys production, and CTO verifies:

- `/api/health` reports the merged commit
- `/api/operator-readiness` remains `ok=true` with 7/7 credentials present

Command:

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

## Verdicts

- `END_TO_END_COMPLETE`: final + `[DONE]` plus branch, preview, post-fix scoring, final governance, and ProductSSOT persistence observed.
- `TERMINAL_FINAL_INCOMPLETE_MILESTONES`: final + `[DONE]`, but one or more end-to-end milestones missing.
- `HONEST_TIMEOUT_TERMINAL`: timeout + `[DONE]`; this proves terminal SSE behavior but not a complete forge run.
- `TERMINAL_ERROR`: error + `[DONE]`.
- `INCOMPLETE_STREAM`: no honest terminal event.
- `DONE_WITHOUT_TERMINAL_EVENT`: `[DONE]` without final/timeout/error.

## Acceptance Rule

For the runtime-config patch itself, the minimum proof is terminal `final` + `[DONE]` or honest terminal `timeout` + `[DONE]`.

For FlowAI's first fully functional end-to-end forge run, evidence must show:

- branch creation
- preview deployment
- post-fix scoring
- final governance write
- ProductSSOT persistence

No VERIFIED movement until production evidence supports the exact SSOT claim being updated.
