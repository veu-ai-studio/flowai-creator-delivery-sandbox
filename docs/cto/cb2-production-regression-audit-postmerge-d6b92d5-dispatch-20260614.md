# CB2 Dispatch - Production Regression Audit After d6b92d5

FROM: CTO
TO: CB2
DATE: 2026-06-14 UTC
STATUS: DISPATCHED
VERIFIED movement: no
matrixArtifact edits: no
canonical docs: do not edit

## Target

Production URL:

- `https://flowai-dun.vercel.app`

Expected `/api/health` identity:

- `commitFull`: `d6b92d54e1693fd18f37b5549df9d68285204449`
- branch: `main`
- deployment URL: `https://flowai-22fb3bmld-veu-ai-studio.vercel.app`

## Scope

Audit production after the Path 2 merge, final directive integration, and VERIFIED promotion.

Check:

1. `/api/health` readiness and identity.
2. Flow Hub Production, Migration, and Fresh Build routes load.
3. Four axes remain visible and independently selectable.
4. No UI overclaims deployed URL, branch creation, or VERIFIED movement.
5. TIM Build lane still shows Codex ranked first when visible.
6. Clerk `/sign-in`, `/sign-up`, and `/sign-in-token` routes do not hard-crash.
7. `/api/me` anonymous behavior remains intact while `AUTH_REQUIRED=false`.
8. No obvious 5xx, blank page, console-fatal, or network regression on audited routes.
9. MatrixArtifact endpoint/file state, if inspected, shows exactly `10 VERIFIED` and no missing `evidenceUrl`, `verifiedAt`, or `verifiedBy`.

## Evidence Rules

- Do not edit runtime code.
- Do not edit canonical docs.
- Do not edit matrixArtifact or VERIFIED state.
- Do not print or commit secrets, raw Clerk tickets, cookies, bearer tokens, passwords, or raw user IDs.

## Output

Commit or report result under:

- `docs/cto/cb2-production-regression-audit-postmerge-d6b92d5-result-20260614.md`

Include:

- verdict: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`;
- production commit observed;
- routes/checks covered;
- evidence paths;
- regression count before/after if available.

BLOCK if production identity is incoherent, routes hard-crash, evidence leaks secrets, or the UI overclaims unverified deployment/VERIFIED status.
