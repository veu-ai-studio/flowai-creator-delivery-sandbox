# Priority 2 Axis Label Clarity Patch Evidence

Date: 2026-06-13
Owner: CTO
Branch: `fix/priority2-axis-label-clarity`
Head: `3504d7f`
Base: `origin/main` at `c10abf8`
VERIFIED movement: no

## Why This Patch Exists

CT2 ran the live Priority 2 axis proof against production commit `54422549044c5ff8e4e187a155c25bfc38462e10` and returned BLOCK. Functional wiring was proven, but sidebar labels were too ambiguous for acceptance.

CT2 observed:

- Health: PASS, production commit matched expected runtime deployment.
- Route reachability: PASS for Production, Migration, and Fresh Build.
- Independent selection mechanics: PASS.
- Request payload propagation: PASS.
- Run log axis envelope: PASS.
- Sidebar clarity: BLOCK.

The captured live `/api/run-construction` request included:

```json
{
  "mode": "MANUAL",
  "operationalMode": "manual",
  "structuralLayer": "controlled",
  "analysisDepth": "quick",
  "flowHubPath": "production"
}
```

CT2 result:

- `docs/cto/ct2-priority2-axis-live-proof-result-20260613.md`

## Runtime Patch

Changed files:

- `src/components/layout/Sidebar.jsx`
  - Sidebar axis titles now render as canonical names:
    - `Structural Layer`
    - `Operational Mode`
    - `Analysis Depth`
    - `Flow Hub Path`
  - Axis option grid changed from 3 columns to 2 columns to prevent longer labels from clipping.
- `src/lib/flowHubAxes.js`
  - Structural Layer option `autonomous` now displays `Autonomous`, not `Auto`.
- `src/pages/LandingPage.jsx`
  - Header axis summary now includes `Path: {currentPathOption.label}`.
- `tests/ui/flowAIUnifiedShell.test.js`
  - Adds canonical label assertions and a guard for the two-column axis grid.

No API, mode mapping, orchestrator, scoring, governance, deploy, ProductSSOT, matrixArtifact, or VERIFIED code changed.

## Verification

Focused tests:

- `npx vitest run tests/flowHubAxes.test.js tests/ui/flowAIUnifiedShell.test.js tests/ui/landingPageRunConstructionMode.test.js`
- Result: PASS, 3 files / 29 tests.

Build:

- `npm run build:preflight`
- Result: PASS.

Lint:

- `npm run lint`
- Result: PASS with existing ESLintEnvWarning warnings only.

Whitespace:

- `git diff --check`
- Result: PASS before runtime commits.

Local browser smoke after fresh build:

- Target: `http://127.0.0.1:4173/flow-hub/production`
- Observed labels:
  - `STRUCTURAL LAYER`
  - `Autonomous`, `Supervised`, `Controlled`
  - `OPERATIONAL MODE`
  - `Auto`, `Guided`, `Manual`
  - `ANALYSIS DEPTH`
  - `Quick`, `Standard`, `Deep`
  - `FLOW HUB PATH`
  - `Production`, `Migration`, `Fresh Build`
  - header summary includes `Path: Production`
- Overflow check for canonical axis labels and options: PASS, empty overflow list.

## Acceptance Boundary

This patch resolves the CT2-observed sidebar clarity blocker in code and local browser proof. It does not complete Milestone 1 by itself.

After merge and production promotion, CT2 must re-run the live proof and confirm:

1. public `/api/health` reports the patched production SHA;
2. sidebar labels are unambiguous;
3. route/path selection still works;
4. `/api/run-construction` still receives the four axis values;
5. run log still includes the Flow Hub axis envelope;
6. no false deployed URL, branch, preview, or VERIFIED claim is shown.
