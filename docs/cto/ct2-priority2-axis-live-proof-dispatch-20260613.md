# CT2 Dispatch - Priority 2 Axis Live Proof

FROM: CTO
TO: CT2
DATE: 2026-06-13
ACTION: Browser acceptance test for live Priority 2 Flow Hub axis wiring
Target: `https://flowai-dun.vercel.app/flow-hub/production`
Production health expected commit: `54422549044c5ff8e4e187a155c25bfc38462e10`
VERIFIED movement: no

## Read First

1. `docs/cto/current-directive.md`
2. `docs/cto/session-brief.md`
3. `docs/cto/priority2-flow-hub-axis-wiring-20260613.md`
4. `docs/cto/priority2-flow-hub-axis-wiring-step5-result-20260613.md`
5. `docs/cto/priority2-production-deployment-20260613.md`

## Mission

Confirm, in a real browser against public production, whether Priority 2 Flow Hub axis wiring is live and honest.

Do not move VERIFIED. Do not infer success from code. Only report what the browser and run evidence show.

## Required Checks

1. Confirm public health:
   - Open or fetch `https://flowai-dun.vercel.app/api/health`.
   - PASS only if `commitFull` is `54422549044c5ff8e4e187a155c25bfc38462e10` and branch is `main`.

2. Confirm sidebar axis visibility:
   - Open `https://flowai-dun.vercel.app/flow-hub/production`.
   - Confirm four independent controls are visible in the sidebar:
     - Structural Layer: Autonomous / Supervised / Controlled
     - Operational Mode: Auto / Guided / Manual
     - Analysis Depth: Quick / Standard / Deep
     - Flow Hub Path: Production / Migration / Fresh Build

3. Confirm independent selection:
   - Change each axis independently.
   - Confirm changing one axis does not reset the others unexpectedly.
   - Confirm Flow Hub Path switches among Production, Migration, and Fresh Build routes or state without breaking the shell.
   - Capture screenshots showing the controls and at least one non-default combination.

4. Confirm request/run propagation:
   - Start one constrained run from production using safe settings:
     - Structural Layer: Controlled
     - Operational Mode: Manual
     - Analysis Depth: Quick
     - Flow Hub Path: Production
     - Product URL: `https://saige-v2.vercel.app`
   - Capture the browser network POST body if possible and confirm it includes:
     - `structuralLayer=controlled`
     - `operationalMode=manual`
     - `analysisDepth=quick`
     - `flowHubPath=production`
   - Confirm the live run log includes the Flow Hub axis envelope or equivalent normalized axis evidence.
   - If the run refuses mutation honestly, that is acceptable. Record the exact refusal/status.
   - If the run attempts branch/deploy work unexpectedly under Controlled/Manual, stop and report BLOCK.

5. Confirm route reachability:
   - `https://flowai-dun.vercel.app/flow-hub/production`
   - `https://flowai-dun.vercel.app/flow-hub/migration`
   - `https://flowai-dun.vercel.app/flow-hub/fresh-build`

## PASS Criteria

PASS only if all are true:

- public production health reports current main `54422549044c5ff8e4e187a155c25bfc38462e10`;
- all four axes are visible and independently selectable in the sidebar;
- route/path selection works for Production, Migration, and Fresh Build;
- at least one real run request or run log proves the selected axis values reached the backend/orchestrator;
- no false deployed URL, branch, preview, or VERIFIED claim is shown.

## BLOCK Criteria

BLOCK if any of these occur:

- production health is stale;
- an axis is missing from the sidebar;
- changing one axis breaks or resets another axis unexpectedly;
- selected axis values do not reach the run request or live run log;
- UI claims deployed output or VERIFIED evidence without independent proof;
- run hangs without clean terminal/degraded state.

## Required Output

Commit CT2 result to `docs/cto/ct2-priority2-axis-live-proof-result-20260613.md` with:

- PASS/BLOCK verdict;
- production health commit observed;
- browser URL(s) tested;
- screenshot path(s), if captured;
- network payload evidence or run-log excerpt for the axis envelope;
- any blockers, exact UI text, and exact terminal state;
- explicit statement: `VERIFIED movement: no`.
