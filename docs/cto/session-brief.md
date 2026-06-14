# CTO Session Brief

Date: 2026-06-14 UTC
Owner: CTO
Scope: Comprehensive directive buy-in, evidence correction, Clerk ticket-route merge/deploy state, and next technical starting point
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Executive Summary

The W04/CEO comprehensive directive to reach 95/100 SSOT is accepted, but it has been integrated with current repo evidence rather than copied verbatim.

The active CTO operating directive is now:

- `docs/cto/current-directive.md`

Review/buy-in evidence:

- `docs/cto/comprehensive-directive-buy-in-review-20260614.md`
- `docs/cto/comprehensive-directive-implementation-revision-20260614.md`
- `docs/cto/clerk-hosted-redirect-boundary-analysis-20260614.md`
- `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`
- `docs/cto/clerk-ticket-signin-step5-result-20260614.md`

Most important corrected state:

- Active matrixArtifact remains `0 VERIFIED`, `0 WIRED`, `2 CURRENT` out of `39`.
- Path 1 Migration has a CT2-confirmed public URL, `https://saige-v2.vercel.app`, but no VERIFIED movement has been applied.
- Milestone 1 axis wiring is CT2-proven at the live-production evidence level.
- Clerk readiness/routes and bearer-token propagation code are live, but full authenticated user-session proof is still blocked at hosted redirect/session establishment.
- Clerk redirect allow-list gap was machine-corrected through Clerk Backend API; CT2 rerun still BLOCKED on hosted-token session transfer.
- CB built the ticket route, CD/CR Step 5 reviews both passed, and the branch merged to `main` at `78672e5f28e763b17a6fda6b05b812c1781f16cc`.
- Production deployment `https://flowai-opncymhub-veu-ai-studio.vercel.app` is Ready and aliased to `https://flowai-dun.vercel.app`, but build identity is degraded (`commitFull:null`) because the deployment came from the local Vercel CLI path. CT2 proof waits for a Git-backed production deployment.
- Codex TIM Build rank/callability code exists, but live Step 3 Build use is not yet proven.

## Current Runtime Evidence

FlowAI production URL:

- `https://flowai-dun.vercel.app`

Latest acceptable runtime production commit:

- `021212d2ebf52511493869e7fea9270a7865db31`

Latest production deployment:

- `https://flowai-opncymhub-veu-ai-studio.vercel.app`
- Alias: `https://flowai-dun.vercel.app`
- Status: Ready
- Identity: degraded, `commitFull:null`

Origin/main docs state:

- Pull `origin/main` at session start and use `git rev-parse HEAD` for the exact latest docs commit. This brief is a docs artifact and may itself be followed by docs-only head refresh commits.

Interpretation:

- Origin/main is ahead of the runtime deployment because docs-only CT2 evidence commits were added after the Clerk session runtime merge.
- Runtime claims must cite the exact deployment/commit under test.
- Future code-bearing runtime changes should be deployed/promoted before live proof.

## What Completed

1. Read the canonical authority docs:
   - `docs/CANONICAL_REFERENCE.md`
   - `docs/BUILD_PROTOCOL.md`
   - `docs/IMPLEMENTATION_PLAN.md`

2. Reviewed the pasted W04/CEO comprehensive directive and accepted it with evidence-preserving revisions.

3. Added buy-in review:
   - `docs/cto/comprehensive-directive-buy-in-review-20260614.md`

4. Replaced `docs/cto/current-directive.md` with the refreshed operating directive.

5. Corrected the bench roster in the directive:
   - CB, CB2, and CT2 are Codex-environment workers under CTO.
   - CD is Claude Code reviewer on PowerShell.
   - CR is Codex reviewer on PowerShell.

6. Added implementation-revision addendum:
   - `docs/cto/comprehensive-directive-implementation-revision-20260614.md`

7. Updated the active directive to include CT2's Clerk session live-proof BLOCK.

8. Mapped the hosted Clerk redirect boundary.

9. Added FlowAI production redirect URLs to Clerk through Backend API:
   - `https://flowai-dun.vercel.app/`
   - `https://flowai-dun.vercel.app/flow-hub/production`

10. Dispatched CT2 rerun:
   - `docs/cto/ct2-clerk-session-live-proof-rerun-dispatch-20260614.md`

11. Recorded CT2 rerun BLOCK:
   - `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`

12. Prepared CB dispatch for FlowAI-owned ticket route:
   - `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`

13. CB completed branch `fix/clerk-ticket-signin` at `c65fa329a5ac3fd7f42253e0f862dba97b90775c`.

14. CD and CR Step 5 review both returned PASS with no findings.

15. Recorded combined Step 5 result:
   - `docs/cto/clerk-ticket-signin-step5-result-20260614.md`

16. Merged `fix/clerk-ticket-signin` to `main` at `78672e5f28e763b17a6fda6b05b812c1781f16cc`.

17. Deployed/promoted production deployment `https://flowai-opncymhub-veu-ai-studio.vercel.app`, now aliased to `https://flowai-dun.vercel.app`.

18. Recorded deployment evidence and identity blocker:
   - `docs/cto/clerk-ticket-signin-production-deploy-20260614.md`

## Clerk Auth State

Completed:

- Clerk production envs are active.
- `/api/health` reports `clerkReady:true` and auth readiness `PASS`.
- `/api/version` reports Clerk readiness true.
- `/api/me` remains anonymous/open while `AUTH_REQUIRED=false`.
- CT2 confirmed `/sign-up` renders real Clerk UI.
- CT2 confirmed `/sign-in` renders real Clerk UI.

Blocked:

- Public sign-up hit Cloudflare human verification.
- Backend-created disposable user plus sign-in token did not establish a signed-in Clerk session in the FlowAI app.
- CT2 observed hosted Clerk token landing text: `Development mode. You are signed in, but Clerk cannot redirect to your application`.
- CT2 observed FlowAI app Clerk state: `clerkLoaded:true`, `signedIn:false`, `sessionPresent:false`, `userPresent:false`, `tokenPresent:false`.

Evidence:

- `docs/cto/ct2-clerk-auth-live-proof-result-20260613.md`
- `docs/cto/ct2-clerk-auth-token-session-proof-result-20260613.md`

Boundary analysis and dispatch now filed:

- `docs/cto/clerk-session-boundary-analysis-20260614.md`
- `docs/cto/cb-clerk-session-propagation-dispatch-20260614.md`

Finding:

Prior boundary finding:

- The server already accepts `Authorization: Bearer <token>` and `__session` cookie fallback.
- The frontend `AuthContext` previously called `/api/me` with cookies only and did not call Clerk React `getToken()`.

Patch result:

- The Clerk bearer-token propagation patch merged and promoted.
- CT2 still blocked because no active Clerk app session existed after the sign-in-token flow.
- The remaining issue is earlier than `/api/me` bearer propagation: hosted redirect/session establishment.

Hosted redirect boundary result:

- Installed Clerk backend SDK `createSignInToken` accepts only `userId` and `expiresInSeconds`; no redirect parameter is available in the installed server API.
- Clerk `redirectUrls` API was available.
- Before fix, Clerk redirect URL list did not contain FlowAI production.
- After fix, Clerk redirect URL list contains `https://flowai-dun.vercel.app/` and `https://flowai-dun.vercel.app/flow-hub/production`.
- No Victor dashboard action was required for this boundary.
- CT2 rerun still blocked because Clerk's hosted sign-in-token landing did not redirect or establish a FlowAI app session.
- Installed Clerk React types support `signIn.create({ strategy:"ticket", ticket })`, so the next code-controlled fix is an app-owned `/sign-in-token` route.

CB build status:

- Branch: `fix/clerk-session-propagation`
- HEAD: `9264ce3ed08d6adbde6b0ce37c4a84e075c7560b`
- Commit: `wire clerk bearer session propagation`
- Files changed: `src/App.jsx`, `src/lib/AuthContext.jsx`, `tests/clerk-session-propagation.test.js`, `docs/cto/cb-clerk-session-propagation-evidence-20260614.md`
- CB reported focused tests PASS, `npm run build:preflight` PASS, `npm run lint` PASS, and `git diff --check` PASS.
- Step 5 prompts are filed:
  - `docs/cto/cd-review-clerk-session-propagation-prompt-20260614.md`
  - `docs/cto/cr-review-clerk-session-propagation-prompt-20260614.md`
- Step 5 result is filed:
  - `docs/cto/clerk-session-propagation-step5-result-20260614.md`
  - CD PASS.
  - CR PASS.
- Merge/deploy status:
  - Merged to `main` at `021212d2ebf52511493869e7fea9270a7865db31`.
  - Production deployment promoted: `https://flowai-799ng2frz-veu-ai-studio.vercel.app`.
  - Public `/api/health` now reports commit `021212d2ebf5`, `clerkReady:true`, auth `PASS`, and `authRequired:false`.
  - Public `/api/me` remains anonymous/open in a no-session context.
- CT2 live proof dispatch:
  - `docs/cto/ct2-clerk-session-live-proof-dispatch-20260614.md`
- CT2 live proof result:
  - `docs/cto/ct2-clerk-session-live-proof-result-20260614.md`
  - Verdict: BLOCK.
  - Production identity PASS.
  - Health/version/anonymous `/api/me` PASS.
  - Disposable Clerk user and sign-in token creation PASS.
  - Flow Hub app load PASS.
  - App-origin authenticated `/api/me` BLOCK because Clerk session/token were unavailable.
- CT2 rerun dispatch after redirect allow-list fix:
  - `docs/cto/ct2-clerk-session-live-proof-rerun-dispatch-20260614.md`
- CT2 rerun result:
  - `docs/cto/ct2-clerk-session-live-proof-rerun-result-20260614.md`
  - Verdict: BLOCK.
  - Hosted token redirect into FlowAI: BLOCK.
  - App-origin authenticated `/api/me`: BLOCK because no Clerk app session/token exists.
- CB next dispatch:
  - `docs/cto/cb-clerk-ticket-signin-dispatch-20260614.md`
- CB branch:
  - `fix/clerk-ticket-signin`
  - HEAD `c65fa329a5ac3fd7f42253e0f862dba97b90775c`
  - CD PASS.
  - CR PASS.
- Merge: complete at `78672e5f28e763b17a6fda6b05b812c1781f16cc`.
- Production deploy: Ready at `https://flowai-opncymhub-veu-ai-studio.vercel.app`, aliased to `https://flowai-dun.vercel.app`.
- Identity gate: BLOCKED for CT2 proof because `/api/health` and `/api/version` currently report `commitFull:null`.
- Next action: push a Git-backed `main` docs/evidence refresh and wait for production to redeploy with commit identity.

## VERIFIED Promotion State

No VERIFIED movement has been applied.

Prepared packet:

- `docs/cto/verified-promotion-packet-milestone1-20260613.md`

Requires W04/CEO clearance before any matrixArtifact edit.

## Next Session Starts Here

1. Pull current main.
2. Read `docs/cto/current-directive.md` and this file.
3. Verify the next Git-backed production deployment after this docs/evidence refresh.
4. PASS condition: `https://flowai-dun.vercel.app/api/health` reports `commitFull` equal to current `main` HEAD, `clerkReady:true`, and deployment URL equal to the active production deployment.
5. Dispatch CT2 proof using FlowAI-owned `/sign-in-token?ticket=<redacted>` route, not Clerk hosted token URL.
6. If CT2 PASS, prepare evidence packet only; do not move VERIFIED without W04/CEO clearance.
7. Do not move VERIFIED without W04/CEO clearance.
