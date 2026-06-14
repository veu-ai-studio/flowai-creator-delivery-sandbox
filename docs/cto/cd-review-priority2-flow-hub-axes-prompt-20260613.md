# CD Review Prompt - Priority 2 Flow Hub Axis Wiring

FROM: CTO
TO: CD
ACTION: Step 5 review

Branch: `fix/priority2-flow-hub-axes`
Commit: `4f1ffa0`
Base: current main `71c37c0`

Review scope:

- `src/lib/flowHubAxes.js`
- `src/components/layout/Sidebar.jsx`
- `src/pages/LandingPage.jsx`
- `src/components/RunConstructionPanel.jsx`
- `src/api/run-construction.js`
- `src/lib/agents/renewal/orchestrator.js`
- `src/App.jsx`
- tests and docs in this branch

What changed:

- Added independent Flow Hub sidebar controls for Structural Layer, Operational Mode, Analysis Depth, and Flow Hub Path.
- Added `/flow-hub/fresh-build` as the third Flow Hub path route.
- Sent the full axis envelope from UI to `/api/run-construction`.
- Mapped Structural Layer into real run behavior:
  - Autonomous + Auto can use BACKGROUND when Inngest is ready.
  - Supervised or Guided maps to GUIDED.
  - Controlled or Manual maps to MANUAL.
- Mapped Analysis Depth into crawl/Phase B effort overrides.
- Recorded the axis envelope in orchestrator state, logs, and final result metadata.
- Verified Codex TIM Build rank is already present on main and documented it.

Verification already run by CTO:

- `npx vitest run tests/flowHubAxes.test.js tests/ui/landingPageRunConstructionMode.test.js tests/ui/flowAIUnifiedShell.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/api/runConstructionHandlerSse.test.js tests/agents/renewal/pipelineEffortProfile.test.js` PASS, 6 files / 51 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, existing flat-config warnings only.
- `npm run lint:evidence` PASS.

CD review questions:

1. Is this consistent with the FlowAI architectural direction and SSOT authority?
2. Is the Structural Layer mapping a safe interpretation of Autonomous/Supervised/Controlled?
3. Is the Analysis Depth mapping appropriate without overclaiming scoring quality?
4. Does this preserve the Priority 1 URL evidence and avoid VERIFIED movement?

Return PASS or BLOCK with file/line evidence.