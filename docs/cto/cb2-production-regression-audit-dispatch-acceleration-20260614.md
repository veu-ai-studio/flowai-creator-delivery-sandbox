# CB2 Dispatch - Production Regression Audit After Acceleration Directive

FROM: CTO
TO: CB2
DATE: 2026-06-14 UTC
ACTION: Audit current production for regressions

Read first:

- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`

## Target

Production URL:

- `https://flowai-dun.vercel.app`

Current expected runtime identity from CTO health check:

- `commitFull`: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`
- `clerkReady`: `true`

## Audit Scope

Audit production for regressions against the current evidence baseline:

- `/api/health` and `/api/version` identity and readiness.
- Flow Hub Production, Migration, and Fresh Build routes load.
- Four sidebar axes remain visible: Structural Layer, Operational Mode, Analysis Depth, Flow Hub Path.
- Axis controls remain independently selectable.
- TIM Build step still shows Codex ranked first when visible in the live run panel.
- Clerk routes `/sign-in`, `/sign-up`, and `/sign-in-token` do not hard-crash.
- `/api/me` anonymous/open behavior remains intact while `AUTH_REQUIRED=false`.
- No UI overclaims deployed URLs, VERIFIED movement, or branch/deploy success without evidence.
- No new 5xx, blank page, or obvious console/network regression on the audited routes.

## Evidence Rules

- Do not edit runtime code.
- Do not edit canonical docs.
- Do not edit matrixArtifact or VERIFIED state.
- Do not print or commit secrets, raw Clerk tickets, cookies, bearer tokens, passwords, or raw user IDs.
- If a regression is found, report `BLOCK` with exact URL, step, screenshot/evidence path, and why it violates the baseline.
- If no regression is found, report `PASS` with routes checked and evidence summary.

## Output

Commit or report a result under:

- `docs/cto/cb2-production-regression-audit-acceleration-result-20260614.md`

Include:

- verdict: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`;
- production commit observed;
- routes and checks covered;
- any screenshots/raw evidence paths;
- no VERIFIED movement.
