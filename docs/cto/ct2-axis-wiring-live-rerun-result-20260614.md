# CT2 Axis Wiring Live Rerun Result - 2026-06-14 UTC

FROM: CT2
TO: CTO
Scope: LIVE_PRODUCTION axis wiring regression rerun
Dispatch: `docs/cto/ct2-axis-and-clerk-live-rerun-dispatch-20260614.md`
Production URL: `https://flowai-dun.vercel.app`
Expected commit: `7c7e978f5451aa96c1db6ffb7689a122230f2d52` or newer CTO-promoted main
VERIFIED movement: no

## Verdict

Verdict: `PASS`

Production identity during Track A:

```json
{
  "commitFull": "7c7e978f5451aa96c1db6ffb7689a122230f2d52",
  "deploymentUrl": "https://flowai-f69vbl126-veu-ai-studio.vercel.app",
  "branch": "main",
  "clerkReady": true,
  "authStatus": "PASS"
}
```

Note: production was initially observed on the prior `34268c9d...` deployment during the wait loop. CT2 waited/retried as instructed, then ran Track A only after `/api/health` reported `7c7e978f5451aa96c1db6ffb7689a122230f2d52`.

Redacted raw evidence:

- `docs/cto/ct2-axis-wiring-live-rerun-raw-20260614.json`

## Axis Visibility

All four independent axis groups were visible in the sidebar. The UI renders some headings uppercase; the raw case-sensitive label check marked title-case labels false, but the browser-visible text excerpt confirms:

```text
STRUCTURAL LAYER Autonomous Supervised Controlled
OPERATIONAL MODE Auto Guided Manual
ANALYSIS DEPTH Quick Standard Deep
FLOW HUB PATH Production Migration Fresh Build
```

Result: `PASS`.

## Independent Selection

CT2 changed each axis independently without unexpected route loss:

```json
[
  { "axis": "Structural Layer", "selected": "Supervised" },
  { "axis": "Structural Layer", "selected": "Controlled" },
  { "axis": "Operational Mode", "selected": "Guided" },
  { "axis": "Operational Mode", "selected": "Manual" },
  { "axis": "Operational Mode", "selected": "Auto" },
  { "axis": "Analysis Depth", "selected": "Quick" },
  { "axis": "Analysis Depth", "selected": "Deep" },
  { "axis": "Analysis Depth", "selected": "Quick" }
]
```

Result: `PASS`.

## Path Switching

Path switching worked:

```json
[
  {
    "clicked": "Migration",
    "url": "/flow-hub/migration?structuralLayer=controlled&operationalMode=auto&analysisDepth=quick&flowHubPath=migration",
    "matched": true
  },
  {
    "clicked": "Fresh Build",
    "url": "/flow-hub/fresh-build?structuralLayer=controlled&operationalMode=auto&analysisDepth=quick&flowHubPath=fresh_build",
    "matched": true
  },
  {
    "clicked": "Production",
    "url": "/flow-hub/production?structuralLayer=controlled&operationalMode=auto&analysisDepth=quick&flowHubPath=production",
    "matched": true
  }
]
```

Result: `PASS`.

## Run Construction Payload

CT2 launched a constrained production run from the UI with `https://example.com`.

Observed live `/api/run-construction` request:

```json
{
  "url": "https://example.com",
  "mode": "MANUAL",
  "operationalMode": "auto",
  "structuralLayer": "controlled",
  "analysisDepth": "quick",
  "flowHubPath": "production"
}
```

Response:

```json
{
  "status": 200,
  "contentType": "text/event-stream"
}
```

Result: `PASS`. The selected axis envelope reached `/api/run-construction`.

## Run Log

The live run log included the Flow Hub axis envelope:

```text
Flow Hub axis envelope
Flow Hub axes are normalized before execution; structural layer sets checkpoint ceiling and analysis depth sets crawl/scoring effort
```

The visible state also showed:

```text
FlowAI Ready · Layer: Controlled · Mode: Auto · Depth: Quick · Path: Production
```

False claim scan:

```json
{
  "falseVerifiedClaimSeen": false,
  "falseDeployedUrlClaimSeen": false
}
```

Result: `PASS`.

## Screenshot Evidence

- `docs/cto/screenshots/ct2-axis-rerun-initial-production-2026-06-14T06-15-10-864Z.png`
- `docs/cto/screenshots/ct2-axis-rerun-after-axis-selection-2026-06-14T06-15-10-864Z.png`
- `docs/cto/screenshots/ct2-axis-rerun-after-run-launch-2026-06-14T06-15-10-864Z.png`

## Final CT2 Finding

Axis wiring remains live on production commit `7c7e978f5451aa96c1db6ffb7689a122230f2d52`: four axes are visible, independently selectable, route switching works, the selected envelope reaches `/api/run-construction`, and the run log includes the Flow Hub axis envelope without false deployment or VERIFIED claims.

VERIFIED movement: no
