# CB2 Dispatch - Production Regression Audit

Date: 2026-06-14
From: CTO
To: CB2
Priority: parallel track
Status: DISPATCHED

## Standing Context

CTO is supervising the technical bench. Do not wait for Victor or W04 on routine audit commands, browser-safe checks, curl checks, repo reads, or evidence capture. Pause only for destructive actions, secret exposure risk, SSOT canonical edits, VERIFIED movement, or a production-changing command.

## Objective

Audit FlowAI production for regressions while the CTO completes deployment promotion and Fresh Build proof work in parallel.

Current production at dispatch time:

- URL: `https://flowai-dun.vercel.app`
- `/api/health` commit observed before next promotion: `34268c9d76399e10ec6c25cd485cf8fae1afd0a1`
- Main branch commit waiting for promotion: `7c7e978f5451aa96c1db6ffb7689a122230f2d52`

If production changes while you are auditing, record both observations and continue on the newest production alias.

## Audit Scope

Check the production app for regressions on:

1. Health/version identity:
   - `GET /api/health`
   - `GET /api/version`
   - confirm `clerkReady`, `githubAppReady`, and `inngestReady` state.

2. Flow Hub UI routes:
   - `/flow-hub/production`
   - `/flow-hub/migration`
   - `/flow-hub/fresh-build`

3. Auth routes:
   - `/sign-in`
   - `/sign-up`
   - `/sign-in-token`
   - `/api/me` anonymous behavior with `AUTH_REQUIRED=false`

4. Forge launch surface:
   - confirm no false deployed URL, branch, preview URL, VERIFIED claim, or upgrade success is shown before actual proof.
   - confirm TIM Build candidates still show Codex ranked above Claude Code/Cursor/Bolt/Windsurf/Replit/Base44 when the forge panel is visible.

5. Console/network sanity:
   - capture material browser console errors.
   - capture material failing network calls.

## Evidence Required

Commit a result file under:

`docs/cto/cb2-production-regression-audit-result-20260614.md`

Include:

- production deployment URL and commitFull observed;
- routes checked and HTTP/browser result;
- screenshots or raw evidence file paths if captured;
- PASS/BLOCK verdict;
- exact blocker text and reproduction steps for any regression;
- explicit statement that no VERIFIED movement was applied.

## PASS Criteria

PASS if production remains usable, health/version are coherent, Flow Hub routes load, auth routes render honestly, `/api/me` behavior is truthful, and no delivery/VERIFIED overclaim appears.

BLOCK if any route is broken, health is incoherent, auth route claims success without session proof, the UI fabricates a deployed URL, or a regression prevents Victor's guided browser test.
