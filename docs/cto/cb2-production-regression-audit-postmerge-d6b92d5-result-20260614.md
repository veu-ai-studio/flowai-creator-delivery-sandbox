# CB2 Production Regression Audit Result - Post d6b92d5

FROM: CB2
TO: CTO
DATE: 2026-06-14 UTC
VERDICT: BLOCK

## Production Identity Observed

- Production URL: `https://flowai-dun.vercel.app`
- `/api/health` commit: `d6b92d54e169`
- `/api/health` commitFull: `d6b92d54e1693fd18f37b5549df9d68285204449`
- `/api/health` branch: `main`
- `/api/health` deployment URL: `https://flowai-22fb3bmld-veu-ai-studio.vercel.app`
- `/api/version` commitFull: `d6b92d54e1693fd18f37b5549df9d68285204449`

## Verdict Summary

BLOCKER COUNT: 6
REGRESSION DELTA: no new regressions versus the last audited `7bc95bb36a57` state
RESOLVED DELTA: `/api/diagnostic` recovered from HTTP 503 to HTTP 200 with `ok:true`, `failingCount:0`, and Anthropic direct provider `ok:true`
HTML API RESPONSES: 0

## Checks Covered

- `/api/version` and `/api/health` production identity.
- 84 API endpoints through `work/prod-audit.mjs api`, including HTML response scan.
- 102 SPA routes through `work/prod-audit.mjs routes`.
- Forge interaction sweep through `work/prod-audit.mjs interactions`.
- Product run entry checks through `work/product-run-check.mjs`.
- Product registry, workspace, login/auth surface, Forge launch, and all 8 sidebar Forge step routes.

## Regression Delta

NEW REGRESSIONS:
- None detected.

RESOLVED ITEMS:
- `/api/diagnostic` now returns HTTP 200/JSON with `ok:true`; prior Anthropic direct provider failure is cleared.

STILL BROKEN (unchanged count only):
- 26

BLOCKER COUNT:
- 6

## Still Broken / Blocking Observations

- `/` still renders blank (`textLength:0`) with no headings or page text.
- `/dashboard` still surfaces `g.filter is not a function`.
- `/old-dashboard` still redirects to `/dashboard` and surfaces `g.filter is not a function`.
- `/environments` still surfaces `Request failed with status code 405`.
- `/flowai` Launch Forge click still fails because the `Launch Forge` button is disabled in the audited default context.
- `/forge/research`, `/forge/design`, `/forge/build`, `/forge/quality-audit`, `/forge/deploy`, `/forge/self-renewal`, `/forge/gtm`, and `/forge/monitor` still show no selected product / partial state in the direct-route audit context.
- `/workspace` still reports `No active run data yet` and all 8 steps waiting for upstream evidence.
- Product cards still show SAIGE ready but no latest run/demo score; PressAI, ReachSMS, RelTwin, and MyPregLife remain Missing/Missing/NO.
- Auth/Clerk public login surface renders without hard crash; protected redirects still land on `/login`.

## Evidence

- Helper artifacts in audit workspace:
  - `C:\Users\victo\Documents\Codex\2026-06-08\from-w04-to-cb2-codex-second\work\prod-audit-results-api.json`
  - `C:\Users\victo\Documents\Codex\2026-06-08\from-w04-to-cb2-codex-second\work\prod-audit-results-routes.json`
  - `C:\Users\victo\Documents\Codex\2026-06-08\from-w04-to-cb2-codex-second\work\prod-audit-results-interactions.json`

## Boundary

No runtime code, canonical docs, matrixArtifact, or VERIFIED state were edited. This result records read-only production behavior only.
