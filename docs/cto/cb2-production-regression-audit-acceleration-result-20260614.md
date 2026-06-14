# CB2 Production Regression Audit - Acceleration Track

FROM: CB2
TO: CTO
DATE: 2026-06-14 UTC
TARGET: https://flowai-dun.vercel.app
PROOF LABEL: LIVE_PRODUCTION

## Verdict

PASS

## Production Identity Observed

- `/api/health`: HTTP 200
- `/api/version`: HTTP 200
- observed `commitFull`: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`
- dispatch expected `commitFull`: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`
- branch: `main`
- environment: `production`
- health `clerkReady`: `true`
- build deployment URL reported by `/api/health.checks.build.deploymentUrl`: `https://flowai-6vir8d0tf-veu-ai-studio.vercel.app`

Note: repo `origin/main` was pulled before the audit and was up to date at the start. During result filing, the local worktree had moved to `fix/fresh-build-public-delivery-target` with unrelated runtime files already modified. CB2 did not edit runtime code and did not commit or push from that mixed worktree.

## Checks Covered

API readiness:

- `/api/health` returned ready production health with matching commit identity.
- `/api/version` returned matching commit identity and `clerkReady:true`.
- `/api/me` returned anonymous/open mode: `authenticated:false`, `authMode:"anonymous"`, `authRequired:false`, `clerkConfigured:true`.

Flow Hub routes:

- `/flow-hub/production`: HTTP 200, nonblank.
- `/flow-hub/migration`: HTTP 200, nonblank.
- `/flow-hub/fresh-build`: HTTP 200, nonblank.

Axis regression:

- Four sidebar axes visible: Structural Layer, Operational Mode, Analysis Depth, Flow Hub Path.
- Axis controls were independently selectable.
- Selection evidence reached URL state: `/flow-hub/migration?structuralLayer=autonomous&operationalMode=guided&analysisDepth=deep&flowHubPath=migration`.

TIM / Build regression:

- A live production run was launched from `/flow-hub/production` using `https://example.com`.
- The 8-step progress panel became visible.
- Build step showed Codex ranked first: `Build` -> `1. Codex`.

Clerk route regression:

- `/sign-in`: HTTP 200, Clerk sign-in UI rendered, nonblank.
- `/sign-up`: HTTP 200, Clerk sign-up UI rendered, nonblank.
- `/sign-in-token`: HTTP 200, incomplete-link state rendered, nonblank.

Regression scan:

- No audited route returned 5xx.
- No audited route was blank.
- No page runtime exceptions were captured.
- No deployed URL, VERIFIED, branch, or deploy-success overclaim was observed in the audited UI surfaces.

Observed non-blocking browser noise:

- Repeated 405 console resource messages and aborted telemetry/health requests were captured, but no 5xx responses or page crashes were observed. These were not classified as regressions under the dispatch.

## Evidence Paths

Raw redacted JSON:

- `docs/cto/cb2-production-regression-audit-acceleration-raw-2026-06-14T11-51-26-164Z.json`

Screenshots:

- `docs/cto/screenshots/cb2-production-regression-acceleration-flow-hub-production-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-flow-hub-migration-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-flow-hub-fresh-build-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-sign-in-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-sign-up-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-sign-in-token-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-axis-selection-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-tim-build-before-run-2026-06-14T11-51-26-164Z.png`
- `docs/cto/screenshots/cb2-production-regression-acceleration-tim-build-after-run-2026-06-14T11-51-26-164Z.png`

## Governance

- Runtime code edited by CB2: no
- Canonical docs edited: no
- matrixArtifact edited: no
- VERIFIED movement: no
- Secrets/tickets/tokens/cookies/passwords/raw Clerk user IDs printed or committed by CB2: no

## Commit / Push Status

Not committed or pushed by CB2. Reason: while filing this result, the local repo was no longer on clean `main`; it was on `fix/fresh-build-public-delivery-target` with unrelated runtime files modified and additional CT2 untracked artifacts present. Committing from this state would risk mixing CB2 docs evidence with unrelated runtime work.
