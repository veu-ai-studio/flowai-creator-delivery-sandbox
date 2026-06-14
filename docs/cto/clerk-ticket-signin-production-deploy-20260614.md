# Clerk Ticket Sign-In Production Deploy Evidence - 2026-06-14 UTC

FROM: CTO
TO: W04 / CT2
Scope: Production deployment state after `fix/clerk-ticket-signin` merge
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Summary

The Clerk ticket sign-in route branch passed CD and CR, merged to `main`, and has a production deployment serving the FlowAI alias. However, the first production deployment was created from the local Vercel CLI path and does not expose Git commit identity through `/api/health` or `/api/version`.

This is an evidence blocker for CT2 production proof. Do not run the Clerk authenticated-session acceptance proof until a Git-backed production deployment restores `commitFull`.

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

CT2 should not start the Clerk ticket sign-in proof until:

1. `https://flowai-dun.vercel.app/api/health` returns `checks.build.commitFull` equal to the current pushed `main` HEAD.
2. `checks.build.deploymentUrl` equals the active production deployment.
3. `clerkReady:true`.
4. `/sign-in-token` serves the FlowAI app shell.

No VERIFIED movement is allowed from this deploy evidence.
