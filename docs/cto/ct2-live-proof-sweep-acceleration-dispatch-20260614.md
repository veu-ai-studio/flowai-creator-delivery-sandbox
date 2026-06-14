# CT2 Dispatch - Live Proof Sweep After Acceleration Directive

FROM: CTO
TO: CT2
DATE: 2026-06-14 UTC
ACTION: Browser acceptance sweep on current production and Fresh Build public candidate

Read first:

- `docs/cto/current-directive.md`
- `docs/cto/session-brief.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`

## Production Target

- `https://flowai-dun.vercel.app`

Expected runtime identity from CTO health check:

- `commitFull`: `7aaea6d1f13a68b78fbd629b357cdbd9c5d2d1a4`
- `clerkReady`: `true`

## Fresh Build Public Candidate

CTO manually deployed the FlowAI-generated clean Fresh Build branch to a separate public Vercel project so Victor can open it without replacing FlowAI production.

Candidate public URL:

- `https://flowai-fresh-veusite.vercel.app/`

Important boundary:

- This is public delivery of the FlowAI-generated clean branch, not yet proof that the FlowAI runtime itself returned this public alias.
- Do not mark Fresh Build path VERIFIED unless W04/CEO later authorizes exact matrix movement.

Generated branch/commit to cross-check if needed:

- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-cleantree-20260614-1109`
- commit: `d6d779f1b7b21083e4dbe01c63bcb84276da8bcd`
- clean branch file count previously observed: `342`

## Required Browser Checks

1. Production health/version:
   - Confirm `/api/health` and `/api/version` identify current production coherently.

2. Axis wiring current-production rerun:
   - Open `/flow-hub/production`.
   - Confirm all four axes are visible in the sidebar:
     - Structural Layer
     - Operational Mode
     - Analysis Depth
     - Flow Hub Path
   - Confirm each axis is independently selectable.
   - Launch a constrained run if safe and confirm the request/run log includes the selected axis envelope.
   - Confirm there is no false deployed URL, branch, preview URL, or VERIFIED claim.

3. Clerk ticket redirect/session proof if safe:
   - Use the existing safe CT2 method from `docs/cto/ct2-clerk-ticket-redirect-live-rerun-result-20260614.md`.
   - Do not print or commit raw tickets, hosted token URLs, cookies, bearer tokens, passwords, or raw Clerk user IDs.
   - PASS only if the browser lands on `/flow-hub/production`, the ticket is scrubbed, Clerk frontend state is signed in, app-origin `/api/me` authenticates with Clerk, and fresh no-session `/api/me` remains anonymous.

4. Fresh Build public URL proof:
   - Open `https://flowai-fresh-veusite.vercel.app/` in a fresh anonymous browser context with no bypass header.
   - PASS only if it returns public HTTP 200 and renders the generated VEU AI Studio/Victor/FlowAI-positioning website, not a Vercel login/protection page and not the FlowAI operator app.
   - Capture screenshot and URL evidence.

## Output

Commit or report results under:

- `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`

Include:

- verdict: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`;
- separate result for axis, Clerk, and Fresh Build public URL;
- screenshots/raw evidence paths;
- exact public URL status;
- no VERIFIED movement.
