# Priority 2 Flow Hub Axis Wiring Evidence

Date: 2026-06-13
Owner: CTO
Branch: fix/priority2-flow-hub-axes
Base main: 71c37c0

## Purpose

This branch wires the three remaining Flow Hub axes that were previously partial or disconnected:

- Structural Layer: Autonomous / Supervised / Controlled
- Analysis Depth: Quick / Standard / Deep
- Flow Hub Path: Production / Migration / Fresh Build

Codex TIM Build status was rechecked on current main and is already present: Codex is rank 1 in `src/lib/tools/buildToolRanking.js`, surfaced through `src/lib/tools/stepToolVisibility.js`, and included first in each VEU stack Build list in `src/lib/toolRegistry.js`.

## Implementation Summary

- Added `src/lib/flowHubAxes.js` as the shared normalization contract for Flow Hub axes.
- Added independent sidebar controls under `Flow Controls` for Layer, Mode, Depth, and Path.
- Added `/flow-hub/fresh-build` as the third Flow Hub path route.
- Separated Flow Hub Path from Operational Mode in `LandingPage.jsx`.
- Added the full axis envelope to `RunConstructionPanel` POST body.
- Updated `src/api/run-construction.js` so axes affect real behavior:
  - Migration path dispatches `MIGRATION`.
  - Fresh Build path dispatches `FRESH_BUILD`.
  - Controlled layer or Manual mode dispatches `MANUAL`.
  - Supervised layer or Guided mode dispatches `GUIDED`.
  - Only Autonomous + Auto can use `BACKGROUND` when Inngest is ready.
  - Quick/Deep analysis depth maps into crawl and Phase B effort overrides.
- Updated `orchestrator.js` to record the normalized Flow Hub axis envelope on state, step logs, and final result metadata.

## Verification

Passed:

- `npx vitest run tests/flowHubAxes.test.js tests/ui/landingPageRunConstructionMode.test.js tests/ui/flowAIUnifiedShell.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/api/runConstructionHandlerSse.test.js tests/agents/renewal/pipelineEffortProfile.test.js`
- Result: 6 test files passed, 51 tests passed.
- `npm run build:preflight`
- `npm run lint`

Lint note: lint emitted existing ESLint flat-config warnings about legacy `/* eslint-env */` comments in unrelated files; exit code was 0.

## Honesty Boundary

This branch wires controls and runtime parameters. It does not claim that all three paths have produced deployed URLs. No matrixArtifact VERIFIED movement was made.

## Next Review

Recommended review focus for CD/CR:

- Confirm Flow Hub axes are independent in the sidebar.
- Confirm the backend mapping does not let fallback/default values overclaim path execution.
- Confirm MANUAL support is safe with existing orchestrator checkpoint behavior.
- Confirm Quick/Deep effort overrides are reasonable for the 800s serverless window.