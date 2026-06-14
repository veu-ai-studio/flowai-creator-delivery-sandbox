# CR Review Prompt - Priority 2 Flow Hub Axis Wiring

FROM: CTO
TO: CR
ACTION: Step 5 review

Branch: `fix/priority2-flow-hub-axes`
Commit: `4f1ffa0`
Base: current main `71c37c0`

Review scope:

- Confirm no fabricated result, no deployed URL overclaim, and no VERIFIED movement.
- Confirm Flow Hub Path is no longer silently conflated with Operational Mode.
- Confirm fallback/default axis values cannot be mislabeled as observed execution evidence.
- Confirm `/api/run-construction` passes normalized axes into the orchestrator without bypassing migration/fresh-build gates.
- Confirm MANUAL mode admission is consistent with existing orchestrator checkpoint behavior.
- Confirm docs evidence is accurate.

Verification already run by CTO:

- `npx vitest run tests/flowHubAxes.test.js tests/ui/landingPageRunConstructionMode.test.js tests/ui/flowAIUnifiedShell.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/api/runConstructionHandlerSse.test.js tests/agents/renewal/pipelineEffortProfile.test.js` PASS, 6 files / 51 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, existing flat-config warnings only.
- `npm run lint:evidence` PASS.

CR review questions:

1. Any evidence-labeling issue similar to the prior fallback URL finding?
2. Any branch/deploy/governance overclaim?
3. Any path where a sidebar selection is displayed but not carried into the run payload?
4. Any path where defaults could mask an operator-selected stricter axis?

Return PASS or BLOCK with file/line evidence.