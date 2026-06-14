# CB2 Production Regression Audit Result - 2026-06-14

FROM: CB2
TO: CTO
ACTION: Production regression audit
Production URL: `https://flowai-dun.vercel.app`
Dispatch commit: `717b677 docs/cto | dispatch acceleration tracks`
VERIFIED movement: no

## Verdict

Verdict: `PASS`

Production remained usable on the audited surfaces. Health/version identity was coherent, Flow Hub routes loaded, auth routes rendered honestly, `/api/me` correctly reported anonymous mode while `AUTH_REQUIRED=false`, and the Forge Build surface did not show a false deployed URL, preview URL, branch, upgrade success, or VERIFIED promotion claim.

Non-blocking finding: browser console/network captured repeated 405 responses from app telemetry endpoints under `/app-logs/.../log-user-in-app/...` and `/api/apps/.../analytics/track/batch`. These did not prevent route rendering or guided browser use in this audit, so they are recorded as findings rather than a BLOCK.

## Production Identity

Dispatch-time production commit from CTO: `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`
Main branch commit waiting for promotion from CTO: `7c7e978f5451aa96c1db6ffb7689a122230f2d52`

Observed at audit start via `GET /api/health`:

```json
{
  "status": 200,
  "commitFull": "34268c9d76399e10ec6c25cd485cf8fae1afd0a1",
  "commit": "34268c9d7639",
  "deploymentUrl": "https://flowai-7ufisvpk3-veu-ai-studio.vercel.app",
  "clerkReady": true,
  "githubAppReady": true,
  "inngestReady": true,
  "checks": {
    "auth": { "status": "PASS", "clerkConfigured": true, "authRequired": false }
  }
}
```

Observed at audit end via `GET /api/health`: same `commitFull`, same deployment URL. Production did not advance during the audit window.

## API Checks

| Endpoint | Result | Evidence |
|---|---:|---|
| `/api/health` | `PASS` | HTTP 200; `checks.build.status:"PASS"`; `checks.build.commitFull:"34268c9d76399e10ec6c25cd485cf8fae1afd0a1"`; `clerkReady:true`; `githubAppReady:true`; `inngestReady:true`; `checks.auth.status:"PASS"`. |
| `/api/version` | `PASS` | HTTP 200; `commitFull:"34268c9d76399e10ec6c25cd485cf8fae1afd0a1"`; branch `main`; env `production`; feature flags show `clerkReady:true`, `githubAppReady:true`, `supabaseReady:true`, `inngestReady:true`, `authRequired:false`. |
| `/api/me` | `PASS` | HTTP 200; `authenticated:false`; `authMode:"anonymous"`; `userId:null`; `config.clerkConfigured:true`; `config.authRequired:false`. |

## Browser Route Checks

| Route | Result | Browser evidence |
|---|---:|---|
| `/flow-hub/production` | `PASS` | HTTP 200; visible Flow Hub Production content rendered. |
| `/flow-hub/migration` | `PASS` | HTTP 200; visible Flow Hub Migration setup rendered; Migration Mode shown enabled during audit. |
| `/flow-hub/fresh-build` | `PASS` | HTTP 200; visible Flow Hub Fresh Build setup rendered. |
| `/sign-in` | `PASS` | HTTP 200; Clerk sign-in UI rendered with honest sign-in controls. |
| `/sign-up` | `PASS` | HTTP 200; Clerk sign-up UI rendered with honest account creation controls. |
| `/sign-in-token` | `PASS` | HTTP 200; route rendered an incomplete-link state for missing ticket rather than claiming sign-in success. |
| `/forge/build` | `PASS` | HTTP 200; route rendered Build Forge with `No product selected` and `BUILD EVIDENCE PARTIAL`. |
| `/forge/build?productId=cb2-audit&productName=CB2%20Audit` | `PASS` | HTTP 200; auto-populated Build Forge plan rendered without persistence or submit action. |

## Forge Launch Surface

Overclaim check: `PASS`.

Observed on Forge Build surfaces:

- no false deployed URL;
- no false preview URL;
- no false branch claim;
- no upgrade-success claim;
- no `VERIFIED` promotion claim;
- status shown as `BUILD EVIDENCE PARTIAL` / `BUILD_BLOCKED` where proof was absent.

TIM Build ranking check: `PASS` when the ranked-candidates panel was visible on `/forge/build?productId=cb2-audit&productName=CB2%20Audit`.

Panel excerpt:

```text
RANKED CANDIDATES (7)
1. Codex - code 9.3 - Selected
2. Claude Code - code 8.2
3. Cursor - code 7.8
4. Bolt - ai_fullstack 7.3
5. Windsurf - code 7.3
6. Replit - cloud_ide 6.0
7. Base44 - source 7.8
```

Codex appeared before Claude Code, Cursor, Bolt, Windsurf, Replit, and Base44 within the actual ranked-candidates panel.

## Console And Network Findings

Page errors: `0`.

Console errors captured: repeated browser `Failed to load resource: the server responded with a status of 405 ()` messages.

Failed request groups:

- `/app-logs/69ea46fc5fdfa434dddf11fa/log-user-in-app/flow-hub` returned 405 and some requests aborted during navigation/teardown.
- `/app-logs/69ea46fc5fdfa434dddf11fa/log-user-in-app/sign-in` returned 405 and one request aborted during teardown.
- `/app-logs/69ea46fc5fdfa434dddf11fa/log-user-in-app/sign-up` returned 405 and one request aborted during teardown.
- `/app-logs/69ea46fc5fdfa434dddf11fa/log-user-in-app/sign-in-token` returned 405 and one request aborted during teardown.
- `/app-logs/69ea46fc5fdfa434dddf11fa/log-user-in-app/forge` returned 405 and some requests aborted during teardown.
- `/api/apps/69ea46fc5fdfa434dddf11fa/analytics/track/batch` returned 405 on audited routes.
- `/api/health` appeared as `net::ERR_ABORTED` only in browser telemetry during page teardown; direct HTTP health checks passed with HTTP 200 at start and end.

Assessment: telemetry failures are non-blocking findings for this dispatch. They did not break production route usability, auth honesty, or Forge overclaim/ranking checks.

## Evidence Files

Raw evidence:

- `docs/cto/cb2-production-regression-audit-raw-20260614.json`

Screenshots:

- `docs/cto/screenshots/cb2-production-regression-flow-hub-production-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-flow-hub-migration-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-flow-hub-fresh-build-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-sign-in-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-sign-up-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-sign-in-token-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-forge-build-20260614.png`
- `docs/cto/screenshots/cb2-production-regression-forge-build-productid-20260614.png`

## Tooling Note

The preferred Codex in-app Browser setup failed before site interaction with local tooling error `windows sandbox failed: spawn setup refresh`. CB2 used fresh Playwright Chromium contexts from the repo dependency for browser evidence.

## Final Statement

No SSOT canonical edits were made. No production-changing commands were run. No VERIFIED movement was applied.

VERIFIED movement: no
