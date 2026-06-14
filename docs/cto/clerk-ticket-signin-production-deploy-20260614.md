# Clerk Ticket Sign-In Production Deploy Evidence - 2026-06-14 UTC

FROM: CTO
TO: W04 / CT2
Scope: Production deployment state after `fix/clerk-ticket-signin` merge
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Summary

The Clerk ticket sign-in route branch passed CD and CR, merged to `main`, and has a production deployment serving the FlowAI alias. However, the first production deployment was created from the local Vercel CLI path and does not expose Git commit identity through `/api/health` or `/api/version`.

This was initially an evidence blocker for CT2 production proof. A Git-backed production redeploy has now restored production commit identity.

## Repo State

- Branch: `main`
- HEAD: `78672e5f28e763b17a6fda6b05b812c1781f16cc`
- Commit subject: `merge clerk ticket signin`
- Runtime branch merged: `fix/clerk-ticket-signin`
- Runtime branch commit: `c65fa329a5ac3fd7f42253e0f862dba97b90775c`

## Production Deployment State

- Deployment: `https://flowai-opncymhub-veu-ai-studio.vercel.app`
- Target: Production
- Status: Ready
- Alias includes: `https://flowai-dun.vercel.app`

Public production checks:

- `https://flowai-dun.vercel.app/api/health`
  - `clerkReady:true`
  - `deploymentUrl:"https://flowai-opncymhub-veu-ai-studio.vercel.app"`
  - `checks.build.status:"DEGRADED"`
  - `checks.build.commitFull:null`
  - `checks.build.reason:"No commit metadata surfaced by Vercel env or generated build info"`
- `https://flowai-dun.vercel.app/api/version`
  - `deployUrl:"flowai-opncymhub-veu-ai-studio.vercel.app"`
  - `commitFull:null`
  - `buildIdentitySource:"unavailable"`
- `https://flowai-dun.vercel.app/sign-in-token`
  - Returns the FlowAI app shell, confirming the route is present in the deployed app.

## Preview Deployment Checks

Git preview for the ticket branch:

- Deployment: `https://flowai-lljtj0mdj-veu-ai-studio.vercel.app`
- Branch: `fix/clerk-ticket-signin`
- `commitFull:"c65fa329a5ac3fd7f42253e0f862dba97b90775c"`
- `clerkReady:false` because Preview env does not contain production Clerk keys.

Git preview for `main`:

- Deployment: `https://flowai-qt7oh63ni-veu-ai-studio.vercel.app`
- Branch: `main`
- `commitFull:"fbb50f5cbe3ed63814e6593a0e050287e455145c"`
- This is not the merge commit and cannot prove `78672e5`.
- `clerkReady:false` because Preview env does not contain production Clerk keys.

## Interpretation

The app is live with the ticket route, but the production proof is not yet acceptable under `docs/BUILD_PROTOCOL.md` because the production endpoint cannot identify the deployed commit.

The next corrective action is a Git-backed production deployment from current `main`. A docs refresh commit is acceptable if it triggers the Vercel Git integration, because the runtime bundle still includes the merged ticket route and the deployment identity will honestly cite the exact deployed HEAD.

## CT2 Gate

Initial gate before restored deploy:

1. `https://flowai-dun.vercel.app/api/health` returns `checks.build.commitFull` equal to the current pushed `main` HEAD.
2. `checks.build.deploymentUrl` equals the active production deployment.
3. `clerkReady:true`.
4. `/sign-in-token` serves the FlowAI app shell.

## Restored Production Identity

Git-backed production redeploy:

- Source preview: `https://flowai-rjbsanwgl-veu-ai-studio.vercel.app`
- Source preview commitFull: `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`
- Production redeploy: `https://flowai-7ufisvpk3-veu-ai-studio.vercel.app`
- Alias: `https://flowai-dun.vercel.app`
- Status: Ready

Public production checks after redeploy:

- `https://flowai-dun.vercel.app/api/health`
  - `checks.build.status:"PASS"`
  - `checks.build.commitFull:"34268c9d76399e10ec6c25cd485cf8fae1afd0a1"`
  - `checks.build.branch:"main"`
  - `checks.build.buildIdentitySource:"env:VERCEL_GIT_COMMIT_SHA"`
  - `checks.build.deploymentUrl:"https://flowai-7ufisvpk3-veu-ai-studio.vercel.app"`
  - `clerkReady:true`
- `https://flowai-dun.vercel.app/api/version`
  - `commitFull:"34268c9d76399e10ec6c25cd485cf8fae1afd0a1"`
  - `branch:"main"`
  - `deployUrl:"flowai-7ufisvpk3-veu-ai-studio.vercel.app"`
  - `clerkReady:true`
- `https://flowai-dun.vercel.app/sign-in-token`
  - Returns the FlowAI app shell.

CT2 is now clear to run the live ticket-route proof using `docs/cto/ct2-clerk-ticket-signin-live-proof-dispatch-20260614.md`.

No VERIFIED movement is allowed from this deploy evidence.
