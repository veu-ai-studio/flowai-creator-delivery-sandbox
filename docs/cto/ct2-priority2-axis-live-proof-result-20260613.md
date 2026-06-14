# CT2 Result - Priority 2 Axis Live Proof

Date: 2026-06-13
Role: CT2
Target: `https://flowai-dun.vercel.app/flow-hub/production`
Evidence tier: LIVE_PRODUCTION browser acceptance
VERIFIED movement: no

## Verdict

BLOCK.

Functional propagation evidence was observed, but current production does not meet the dispatch's explicit sidebar clarity target. The sidebar axis groups render as `LAYER`, `MODE`, `DEPTH`, and `PATH`, and the Structural Layer autonomous option renders as `Auto`, which is ambiguous against Operational Mode `Auto`.

This is pre-patch evidence for production commit `54422549044c5ff8e4e187a155c25bfc38462e10`. Do not claim Milestone 1 CT2 PASS from this run.

## Production Health

Observed from `https://flowai-dun.vercel.app/api/health`:

- HTTP status: `200`
- `commitFull`: `54422549044c5ff8e4e187a155c25bfc38462e10`
- `branch`: `main`
- `deploymentUrl`: `https://flowai-b7ogb5gbi-veu-ai-studio.vercel.app`
- `githubAppReady`: `true`
- `inngestReady`: `true`

Health gate: PASS.

## Browser URLs Tested

- `https://flowai-dun.vercel.app/flow-hub/production` - HTTP `200`
- `https://flowai-dun.vercel.app/flow-hub/migration` - HTTP `200`
- `https://flowai-dun.vercel.app/flow-hub/fresh-build` - HTTP `200`

Route reachability gate: PASS.

## Sidebar Axis Evidence

Observed in production sidebar:

- Group labels: `LAYER`, `MODE`, `DEPTH`, `PATH`
- Structural options: `Auto`, `Supervised`, `Controlled`
- Operational Mode options: `Auto`, `Guided`, `Manual`
- Analysis Depth options: `Quick`, `Standard`, `Deep`
- Flow Hub Path options: `Production`, `Migration`, `Fresh Build`

Independent selection was observed:

- Selected non-default combination URL:
  `https://flowai-dun.vercel.app/flow-hub/production?structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=production`
- Page summary rendered: `Layer: Controlled`, `Mode: Manual`, `Depth: Quick`
- Switching path preserved selected axis values:
  - Migration URL included `structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=migration`
  - Fresh Build URL included `structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=fresh_build`

Axis selection mechanics gate: PASS.

Sidebar clarity gate: BLOCK because the dispatch expected `Structural Layer: Autonomous / Supervised / Controlled` and unambiguous four-axis labels in the sidebar.

## Run Request Evidence

Constrained production run launched from `https://flowai-dun.vercel.app/flow-hub/production` with:

- Product URL: `https://saige-v2.vercel.app`
- Structural Layer: Controlled
- Operational Mode: Manual
- Analysis Depth: Quick
- Flow Hub Path: Production

Captured live browser network request:

```json
{
  "url": "https://flowai-dun.vercel.app/api/run-construction",
  "postData": {
    "url": "https://saige-v2.vercel.app",
    "mode": "MANUAL",
    "operationalMode": "manual",
    "structuralLayer": "controlled",
    "analysisDepth": "quick",
    "flowHubPath": "production"
  }
}
```

Request/run propagation gate: PASS.

## Run Log Evidence

Observed live run panel after launch:

- Status: `RUNNING...`
- Active step after wait: `Design`
- Run mode evidence: ranked tool panels reported `mode: MANUAL-ORCHESTRA`
- Run log included step: `Flow Hub axis envelope`
- Run log text: `Flow Hub axes are normalized before execution; structural layer sets checkpoint ceiling and analysis depth sets crawl/scoring effort`
- No false deployed URL, branch, preview URL, or VERIFIED claim was observed during the captured run window.

The run was not allowed to justify PASS because the sidebar clarity blocker remains on the same production SHA.

## Screenshot Artifacts

- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/01-production-initial.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/02-controlled-manual-quick.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/03-migration-selected.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/04-fresh-build-selected.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/05-route-migration.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/06-route-fresh-build.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/07-before-run.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/08-before-run-filled.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/09-after-run-launch.png`
- `docs/cto/ct2-priority2-axis-live-proof-screenshots-20260613/10-after-run-wait.png`

Full captured browser/network evidence:

- `docs/cto/ct2-priority2-axis-live-proof-browser-evidence-20260613.json`

## Blocker

Production sidebar wording is ambiguous:

- Current: `LAYER` with `Auto`
- Required for acceptance clarity: `Structural Layer` with `Autonomous`
- Current: `MODE`
- Required for acceptance clarity: `Operational Mode`
- Current: `DEPTH`
- Required for acceptance clarity: `Analysis Depth`
- Current: `PATH`
- Required for acceptance clarity: `Flow Hub Path`

Recommended next CT2 action after the UI clarity patch is deployed:

1. Re-run the same browser proof on the new production SHA.
2. Confirm the sidebar labels and Structural option text are unambiguous.
3. Re-confirm the same `/api/run-construction` axis payload and run-log axis envelope.
4. Only then mark CT2 PASS if no new blocker appears.
