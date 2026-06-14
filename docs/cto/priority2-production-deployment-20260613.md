# Priority 2 Production Deployment Evidence - 2026-06-13

Owner: CTO
Scope: Priority 2 Flow Hub axis wiring production deployment
Evidence tier: LIVE_PRODUCTION for deployment identity only
VERIFIED movement: no

## Summary

Priority 2 axis wiring is now deployed to public production.

Public production URL:

- `https://flowai-dun.vercel.app`

Public health endpoint:

- `https://flowai-dun.vercel.app/api/health`

Current production commit:

- short: `54422549044c`
- full: `54422549044c5ff8e4e187a155c25bfc38462e10`
- branch: `main`

Runtime axis merge included in this deployment:

- `c6a2d97c1f1b2f160887ba7dafc4551c105a1515` (`merge priority2 flow hub axis wiring`)

## Deployment

GitHub automatic main deployment was not present for the latest main SHA. CTO created a Vercel production-target deployment from the current main worktree with explicit build identity and skipped public-domain assignment until health was verified.

Deployment:

- deployment id: `dpl_Gt9kCe9xxEhEZxJyRNYJ56yzYeg8`
- deployment URL: `https://flowai-b7ogb5gbi-veu-ai-studio.vercel.app`
- inspector URL: `https://vercel.com/veu-ai-studio/flowai/Gt9kCe9xxEhEZxJyRNYJ56yzYeg8`
- readyState: `READY`
- target: `production`

Build log evidence:

- `npm run build` completed on Vercel.
- `scripts/write-build-info.mjs` wrote commit identity `54422549044c`.
- Build completed in `/vercel/output`.

## Pre-Promotion Health

Because the unaliased deployment URL is protected by Vercel authentication, CTO used authenticated `vercel curl` against the deployment.

Observed pre-promotion `/api/health`:

- `ok=true`
- `status=ready`
- `commit=54422549044c`
- `commitFull=54422549044c5ff8e4e187a155c25bfc38462e10`
- `branch=main`
- `buildIdentitySource=env:VERCEL_GIT_COMMIT_SHA`
- `deploymentUrl=https://flowai-b7ogb5gbi-veu-ai-studio.vercel.app`
- `githubAppReady=true`
- `inngestReady=true`
- `orchestra.codex.status=PASS`
- `orchestra.codex.credentialsPresent=true`

## Promotion

CTO promoted the verified deployment using Vercel CLI:

- promoted deployment: `https://flowai-b7ogb5gbi-veu-ai-studio.vercel.app`
- result: success

## Public Production Health After Promotion

Observed public `/api/health` at `https://flowai-dun.vercel.app/api/health`:

- `ok=true`
- `status=ready`
- `commit=54422549044c`
- `commitFull=54422549044c5ff8e4e187a155c25bfc38462e10`
- `branch=main`
- `buildIdentitySource=env:VERCEL_GIT_COMMIT_SHA`
- `deploymentUrl=https://flowai-b7ogb5gbi-veu-ai-studio.vercel.app`
- `githubAppReady=true`
- `inngestReady=true`
- `orchestra.codex.status=PASS`
- `orchestra.codex.credentialsPresent=true`

Observed public Flow Hub page:

- `curl -I https://flowai-dun.vercel.app/flow-hub/production` returned `HTTP/1.1 200 OK`.

## Honesty Boundary

This evidence proves production identity and public reachability for the Priority 2 deployment. It does not by itself prove live axis behavior.

Milestone 1 remains open until CT2 confirms in a real browser that:

- all four axes are visible in the sidebar;
- each axis is independently selectable;
- axis selections affect the run request or run behavior;
- a real forge run log records the normalized axis envelope.

No matrixArtifact or VERIFIED movement is authorized by this evidence alone.
