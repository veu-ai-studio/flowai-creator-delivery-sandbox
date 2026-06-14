# CT2 Live Proof Sweep Acceleration Result - 2026-06-14

FROM: CT2
TO: CTO
ACTION: Acceleration Track 3 + Fresh Build public candidate browser proof

## Verdict

`BLOCK`

Separate results:

- Axis wiring current production: `PASS`
- Clerk ticket redirect/session proof: `PASS`
- Fresh Build public URL candidate: `BLOCK`

No VERIFIED movement. No matrix/canonical changes.

## Targets

- Production URL: `https://flowai-dun.vercel.app`
- Fresh Build public candidate: `https://flowai-fresh-veusite.vercel.app/`
- Evidence method: Playwright Chromium fresh browser contexts. The in-app Browser runtime was unavailable in the local Windows sandbox, so Playwright was used for live browser proof.
- Raw redacted evidence: `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/ct2-live-proof-sweep-acceleration-raw-20260614.json`

## Production Health And Version

`/api/health`:

- HTTP status: `200`
- service: `flowai`
- env: `production`
- clerkReady: `true`
- deploymentUrl: `https://flowai-6vir8d0tf-veu-ai-studio.vercel.app`
- build commitFull from `checks.build`: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`

`/api/version`:

- HTTP status: `200`
- commitFull: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`
- branch: `main`
- deployUrl: `flowai-6vir8d0tf-veu-ai-studio.vercel.app`
- clerkReady: `true`

Result: `PASS`. Health/version identify the same production runtime commit expected by the dispatch.

## Axis Wiring

Target: `https://flowai-dun.vercel.app/flow-hub/production`

Observed sidebar axes:

- `STRUCTURAL LAYER`: Autonomous, Supervised, Controlled
- `OPERATIONAL MODE`: Auto, Guided, Manual
- `ANALYSIS DEPTH`: Quick, Standard, Deep
- `FLOW HUB PATH`: Production, Migration, Fresh Build

Selected non-default envelope:

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

Constrained run launched with input URL:

`https://saige-v2.vercel.app`

Captured live `/api/run-construction` request envelope:

```json
{
  "url": "https://saige-v2.vercel.app",
  "mode": "MANUAL",
  "operationalMode": "manual",
  "structuralLayer": "controlled",
  "analysisDepth": "quick",
  "flowHubPath": "production"
}
```

Run log evidence:

- Included `Flow Hub axis envelope`.
- Included `Flow Hub axes are normalized before execution`.
- No `VERIFIED` claim observed in the run log capture.
- No deployed URL, branch, or preview URL claim observed in the run log capture.

Axis result: `PASS`.

Screenshots:

- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/axis-production-initial-2026-06-14T11-53-06-223Z.png`
- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/axis-selected-controlled-manual-quick-2026-06-14T11-53-06-223Z.png`
- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/axis-before-run-filled-2026-06-14T11-53-06-223Z.png`
- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/axis-after-run-wait-2026-06-14T11-53-06-223Z.png`

## Clerk Ticket Redirect / Session

Method followed the prior safe CT2 redaction pattern:

- Read `CLERK_SECRET_KEY` from Doppler `flowai/prd` without printing the value.
- Created a disposable Clerk user and sign-in token.
- Opened only the FlowAI-owned route:

`/sign-in-token?ticket=<redacted>&redirect_url=/flow-hub/production`

- Did not open the Clerk hosted sign-in token URL.
- Checked URL/body for raw ticket before screenshotting.
- Deleted the disposable user after proof.

Anonymous `/api/me` before proof:

```json
{
  "authenticated": false,
  "authMode": "anonymous",
  "userId": null,
  "orgId": null,
  "productId": null,
  "config": {
    "authRequired": false,
    "clerkConfigured": true
  }
}
```

Ticket route result:

- HTTP status: `200`
- final URL class: `https://flowai-dun.vercel.app/flow-hub/production`
- same-origin final: `true`
- final path is Flow Hub: `true`
- final URL has ticket: `false`
- visible text contains ticket: `false`
- address bar scrubbed: `true`
- Flow Hub loaded: `true`

Clerk frontend state:

```json
{
  "clerkLoaded": true,
  "signedIn": true,
  "sessionPresent": true,
  "userPresent": true,
  "tokenPresent": true,
  "tokenError": null
}
```

App-origin `/api/me` with Clerk bearer token:

```json
{
  "ok": true,
  "status": 200,
  "tokenPresent": true,
  "redactedJson": {
    "authenticated": true,
    "authMode": "clerk",
    "userId": "[redacted-present]",
    "orgId": null,
    "productId": null,
    "config": {
      "authRequired": false,
      "clerkConfigured": true
    }
  }
}
```

Fresh no-session `/api/me` after proof remained anonymous:

```json
{
  "authenticated": false,
  "authMode": "anonymous",
  "userId": null,
  "orgId": null,
  "productId": null,
  "config": {
    "authRequired": false,
    "clerkConfigured": true
  }
}
```

Cleanup:

```json
{
  "attempted": true,
  "userDeleted": true,
  "error": null
}
```

Clerk result: `PASS`.

Screenshots:

- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/clerk-ticket-final-scrubbed-flow-hub-2026-06-14T11-53-06-223Z.png`
- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/clerk-after-app-origin-api-me-2026-06-14T11-53-06-223Z.png`

Secret handling:

- No raw ticket was printed or committed.
- No hosted token URL was printed, opened, or committed.
- No cookies, bearer token values, Authorization header values, generated password, raw Clerk user ID, or `CLERK_SECRET_KEY` value were printed or committed.

## Fresh Build Public URL Candidate

Target: `https://flowai-fresh-veusite.vercel.app/`

Method: fresh anonymous browser context, no bypass header.

Observed:

- HTTP status: `200`
- Final browser URL: `https://flowai-fresh-veusite.vercel.app/flow-hub/production`
- Page title: `FlowAI - VEU AI Studio`
- Vercel login/protection page: no
- Generated Victor Udo / VEU AI Studio site: no
- FlowAI operator app shell: yes

Observed operator-shell text included:

- `FlowAI Product-Agnostic AI Operating System`
- `FLOW CONTROLS`
- `Flow Hub - Production`
- `STRUCTURAL LAYER`
- `OPERATIONAL MODE`
- `ANALYSIS DEPTH`
- `FLOW HUB PATH`

Fresh Build public URL result: `BLOCK`.

Reason: the URL is publicly reachable with HTTP `200`, but it renders the FlowAI operator app shell, not the generated VEU AI Studio / Victor / FlowAI-positioning website required by the dispatch.

Screenshot:

- `docs/cto/ct2-live-proof-sweep-acceleration-evidence-20260614/screenshots/fresh-build-public-anonymous-2026-06-14T11-53-06-223Z.png`

## Final CT2 Finding

Production runtime is coherent at commit `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`. Axis wiring and Clerk ticket/session proof both pass on live production. The Fresh Build public URL candidate fails acceptance because anonymous browser access reaches the FlowAI operator shell instead of the generated public VEU/Victor site.

Overall verdict: `BLOCK`.
