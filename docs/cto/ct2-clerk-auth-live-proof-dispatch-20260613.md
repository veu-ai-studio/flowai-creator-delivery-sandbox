# CT2 Dispatch - Clerk Auth Live Proof

FROM: CTO
TO: CT2
ACTION: LIVE_PRODUCTION browser acceptance - Clerk auth completion
Production URL: `https://flowai-dun.vercel.app`
Expected runtime commit: `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`
Deployment URL: `https://flowai-mmprr7n0l-veu-ai-studio.vercel.app`
Branch merged: `fix/clerk-auth-completion`
VERIFIED movement: no

Read first:

- `docs/cto/current-directive.md`
- `docs/cto/clerk-auth-diagnostic-20260613.md`
- `docs/cto/cb-clerk-auth-completion-evidence-20260613.md`
- `docs/cto/clerk-auth-completion-step5-result-20260613.md`

## Purpose

Confirm the Clerk auth completion branch works on live production and does not overclaim readiness.

This proof can close the Clerk auth milestone only at the evidence level. Do not move any matrixArtifact entry to VERIFIED.

## Required Checks

1. Production identity

- Open `https://flowai-dun.vercel.app/api/health`.
- Confirm `checks.build.commitFull` equals `dabdce72e13e8ceee9cdd6965b9c0fe9b6a79a9c`.
- Confirm `checks.build.deploymentUrl` equals `https://flowai-mmprr7n0l-veu-ai-studio.vercel.app`.

2. Health auth readiness

Confirm:

- top-level `clerkReady:true`;
- `checks.auth.status:"PASS"`;
- `checks.auth.clerkConfigured:true`;
- `checks.auth.frontendPublishableKeyPresent:true`;
- `checks.auth.authRequired:false`;
- no secret values, publishable key values, or token strings appear in the response.

3. Anonymous mode remains open

- Open `https://flowai-dun.vercel.app/api/me` in a fresh/no-session context.
- Confirm `authenticated:false`, `authMode:"anonymous"`, `config.clerkConfigured:true`, `config.authRequired:false`.
- Confirm `https://flowai-dun.vercel.app/flow-hub/production` still loads.

4. Sign-up route

- Open `https://flowai-dun.vercel.app/sign-up` in a real browser.
- Confirm a real Clerk sign-up UI renders.
- Confirm it is not the marketing page, not SPA fallback, not the internal `/api/auth/sign-up` backend, and not a blank page.
- Capture visible text and screenshot evidence.

5. Sign-in route

- Open `https://flowai-dun.vercel.app/sign-in` in a real browser.
- Confirm a real Clerk sign-in UI renders.
- Confirm it is not the marketing page, not SPA fallback, not the internal `/api/auth/sign-in` backend, and not a blank page.
- Capture visible text and screenshot evidence.

6. Clerk session attempt

Use a clearly marked test identity only if Clerk permits safe browser testing without external email access. Suggested pattern:

- `flowai.ct2.<timestamp>@example.com`

Do not use Victor's personal account and do not create an account with a real third-party person's email.

If Clerk allows sign-up and session creation:

- complete sign-up/sign-in;
- open `/api/me` in the same browser context;
- confirm `authenticated:true`, `authMode:"clerk"`, and a user id.

If Clerk blocks with email verification, domain policy, CAPTCHA, invitation requirement, or another dashboard-level condition:

- record the exact visible blocker;
- classify as `BLOCK` for full user sign-up proof but `PASS` for route/readiness rendering if checks 1-5 pass.

## PASS Criteria

Return PASS only if:

- production identity matches expected commit;
- `/api/health` auth readiness passes without secret leakage;
- anonymous mode remains open while `AUTH_REQUIRED=false`;
- `/sign-up` and `/sign-in` render real Clerk UI;
- Clerk session creation either succeeds and `/api/me` returns Clerk auth context, or no session test was required by W04/CTO for this pass.

If session creation is blocked by Clerk dashboard/domain policy, return PASS-WITH-FINDINGS or BLOCK according to severity, and include exact blocker text.

## FAIL Criteria

Return BLOCK if:

- production commit is stale or wrong;
- `/api/health` lacks auth readiness fields or leaks key/token values;
- `clerkReady:true` appears while `checks.auth.status` is not `PASS`;
- `/sign-up` or `/sign-in` does not render Clerk UI;
- anonymous mode is blocked while `AUTH_REQUIRED=false`;
- a successful Clerk sign-up/sign-in does not produce authenticated `/api/me` context.

## Evidence Output

Write a result document to:

- `docs/cto/ct2-clerk-auth-live-proof-result-20260613.md`

Include:

- verdict: PASS / PASS-WITH-FINDINGS / BLOCK;
- production commit and deployment URL observed;
- screenshots path(s);
- browser-visible sign-up/sign-in evidence;
- `/api/health` auth readiness excerpt with no secret values;
- `/api/me` anonymous and, if available, authenticated session evidence;
- whether any Clerk dashboard/domain action is required;
- `VERIFIED movement: no`.

Commit and push the evidence doc and screenshots to `origin/main` if docs-only. Do not edit runtime code.
