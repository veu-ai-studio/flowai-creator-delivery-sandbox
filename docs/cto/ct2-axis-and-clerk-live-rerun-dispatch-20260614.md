# CT2 Dispatch - Axis Wiring and Clerk Redirect Live Rerun

Date: 2026-06-14
From: CTO
To: CT2
Priority: parallel track
Status: DISPATCHED

## Standing Context

CTO is supervising the technical bench. Do not wait for Victor or W04 on routine browser testing, screenshot capture, curl checks, or evidence commits. Pause only for destructive actions, secret exposure risk, SSOT canonical edits, VERIFIED movement, or production-changing commands.

## Objective

Run live browser acceptance checks after the CTO promotes the latest main deployment to production.

Expected post-promotion main commit:

`7c7e978f5451aa96c1db6ffb7689a122230f2d52`

If production has not yet advanced when you start, record the old commit, wait/retry, and continue when `/api/health` reports the expected commit or a newer CTO-promoted main commit.

## Track A - Axis Wiring Regression

Target:

`https://flowai-dun.vercel.app/flow-hub/production`

Reconfirm:

1. Sidebar shows all four independent axes:
   - Structural Layer: Autonomous / Supervised / Controlled
   - Operational Mode: Auto / Guided / Manual
   - Analysis Depth: Quick / Standard / Deep
   - Flow Hub Path: Production / Migration / Fresh Build

2. Each axis can be changed independently without navigating away unnecessarily.

3. Path switching works:
   - `/flow-hub/production`
   - `/flow-hub/migration`
   - `/flow-hub/fresh-build`

4. The selected axis envelope reaches `/api/run-construction` when a constrained run is launched.

5. The run log includes the Flow Hub axis envelope and does not show a false deployed URL or VERIFIED claim.

## Track B - Clerk Ticket Redirect Completion

Rerun the prior live proof from:

`docs/cto/ct2-clerk-ticket-signin-live-proof-result-20260614.md`

Use the FlowAI-owned route only:

`/sign-in-token?ticket=<redacted>&redirect_url=/flow-hub/production`

Expected after the merged fix:

- hosted Clerk `signInToken.url` is not opened;
- ticket is scrubbed from the visible URL and committed evidence;
- Clerk app session is established;
- app-origin `/api/me` returns authenticated Clerk state;
- final browser route lands on `/flow-hub/production`;
- Flow Hub Production loads after ticket consumption;
- disposable Clerk user is cleaned up;
- no ticket or secret appears in committed evidence.

## Evidence Required

Commit result files under:

- `docs/cto/ct2-axis-wiring-live-rerun-result-20260614.md`
- `docs/cto/ct2-clerk-ticket-redirect-live-rerun-result-20260614.md`

Include raw redacted JSON evidence and screenshots as needed under `docs/cto/`.

## PASS / BLOCK

Axis Track PASS if the previous Priority 2 axis proof still holds on the promoted production commit.

Clerk Track PASS if the final redirect blocker is resolved and the session proof still passes.

BLOCK if either track regresses, if production identity is incoherent, or if evidence cannot be redacted safely.

No VERIFIED movement. No matrixArtifact edit.
