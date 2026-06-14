# CT2 Rerun Result - Priority 2 Axis Live Proof After Patch

Date: 2026-06-13
Role: CT2
Target: `https://flowai-dun.vercel.app/flow-hub/production`
Expected production commit: `65f46a0c96930a207e7cd0c0160cf51317c89822`
Evidence tier: LIVE_PRODUCTION browser acceptance
VERIFIED movement: no

## Verdict

PASS.

Patched production meets the Priority 2 axis live proof acceptance criteria. The pre-patch sidebar ambiguity is resolved, route switching works, and a constrained production run request plus live run log prove the selected axis values reached the backend/orchestrator.

## Production Health

Observed from `https://flowai-dun.vercel.app/api/health`:

- HTTP status: `200`
- `commitFull`: `65f46a0c96930a207e7cd0c0160cf51317c89822`
- `branch`: `main`
- `deploymentUrl`: `https://flowai-7d6rqcts8-veu-ai-studio.vercel.app`
- `githubAppReady`: `true`
- `inngestReady`: `true`

Health gate: PASS.

## Sidebar Axis Evidence

Observed in the production sidebar:

- `STRUCTURAL LAYER`: `Autonomous`, `Supervised`, `Controlled`
- `OPERATIONAL MODE`: `Auto`, `Guided`, `Manual`
- `ANALYSIS DEPTH`: `Quick`, `Standard`, `Deep`
- `FLOW HUB PATH`: `Production`, `Migration`, `Fresh Build`

Desktop overflow/clipping check:

- Viewport: `1440 x 1100`
- Initial sidebar overflow issues: `0`
- Selected-state sidebar overflow issues: `0`

Sidebar clarity and desktop layout gate: PASS.

## Independent Selection Evidence

Selected non-default combination:

- Structural Layer: `Controlled`
- Operational Mode: `Manual`
- Analysis Depth: `Quick`
- Flow Hub Path: `Production`

Observed selected URL:

`https://flowai-dun.vercel.app/flow-hub/production?structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=production`

Observed page summary:

- `Layer: Controlled`
- `Mode: Manual`
- `Depth: Quick`
- `Path: Production`

Independent selection gate: PASS.

## Route Switching Evidence

Routes tested in browser:

- `https://flowai-dun.vercel.app/flow-hub/production` - HTTP `200`
- `https://flowai-dun.vercel.app/flow-hub/migration` - HTTP `200`
- `https://flowai-dun.vercel.app/flow-hub/fresh-build` - HTTP `200`

Path switching preserved the selected axis envelope:

- Migration selected URL:
  `https://flowai-dun.vercel.app/flow-hub/migration?structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=migration`
- Fresh Build selected URL:
  `https://flowai-dun.vercel.app/flow-hub/fresh-build?structuralLayer=controlled&operationalMode=manual&analysisDepth=quick&flowHubPath=fresh_build`

Route switching gate: PASS.

## Run Request Evidence

Constrained production run launched from `https://flowai-dun.vercel.app/flow-hub/production` with:

- Product URL: `https://saige-v2.vercel.app`
- Structural Layer: `Controlled`
- Operational Mode: `Manual`
- Analysis Depth: `Quick`
- Flow Hub Path: `Production`

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

Run request propagation gate: PASS.

## Run Log Evidence

Observed live run panel after launch:

- Run panel status during capture: `RUNNING...`
- Active step after wait: `Design`
- Run mode evidence: ranked tool panels reported `mode: MANUAL-ORCHESTRA`
- Run log included step: `Flow Hub axis envelope`
- Run log text: `Flow Hub axes are normalized before execution; structural layer sets checkpoint ceiling and analysis depth sets crawl/scoring effort`

The captured run did not show any false deployed URL, branch, preview URL, or VERIFIED claim during the observation window.

Run-log axis envelope gate: PASS.

## Screenshot Artifacts

- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/01-production-initial.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/02-controlled-manual-quick.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/03-migration-selected.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/04-fresh-build-selected.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/05-route-migration.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/06-route-fresh-build.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/07-before-run.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/08-before-run-filled.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/09-after-run-launch.png`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/10-after-run-wait.png`

Full captured browser/network evidence:

- `docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`

## Honesty Boundary

This CT2 PASS proves live production axis visibility, independent selection, route switching, run request propagation, and run-log axis envelope evidence for patched production commit `65f46a0c96930a207e7cd0c0160cf51317c89822`.

This result does not move any matrixArtifact entry to VERIFIED. Any VERIFIED promotion still requires W04/CEO clearance.
