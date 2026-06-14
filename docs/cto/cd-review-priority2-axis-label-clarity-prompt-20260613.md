# CD Review Prompt - Priority 2 Axis Label Clarity

FROM: CTO
TO: CD
DATE: 2026-06-13
ACTION: Step 5 review for UI label clarity patch
Branch: `fix/priority2-axis-label-clarity`
Head: `3504d7f`
Base: `origin/main` at docs commit `c10abf8`
Runtime deployment currently live before this patch: `54422549044c5ff8e4e187a155c25bfc38462e10`
VERIFIED movement: no

## Context

Priority 2 axis wiring was merged and deployed. CT2 production proof found the controls, route switching, run request payload, and run log axis envelope present, but returned BLOCK because the sidebar rendered the axes with compressed labels:

- `LAYER` with button `Auto`
- `MODE` with button `Auto`
- `DEPTH`
- `PATH`

That is wired, but ambiguous for first-time users and weak against the W04/CEO requirement that all four axes be visible, labeled, and independently selectable.

## Patch Summary

Runtime files changed:

- `src/components/layout/Sidebar.jsx`
  - Sidebar group titles now use canonical names:
    - `Structural Layer`
    - `Operational Mode`
    - `Analysis Depth`
    - `Flow Hub Path`
  - Axis controls now use a two-column grid to prevent the longer canonical labels from clipping.
- `src/lib/flowHubAxes.js`
  - Structural `autonomous` short label changed from `Auto` to `Autonomous` to avoid confusion with Operational Mode `Auto`.
- `src/pages/LandingPage.jsx`
  - Header axis summary now includes `Path: {currentPathOption.label}`.
- `tests/ui/flowAIUnifiedShell.test.js`
  - Adds source assertions for the canonical sidebar labels and two-column axis grid.

No API behavior, run mode mapping, orchestrator behavior, scoring, governance, deploy, ProductSSOT, or matrixArtifact code changed.

## Verification Already Run

- `npx vitest run tests/flowHubAxes.test.js tests/ui/flowAIUnifiedShell.test.js tests/ui/landingPageRunConstructionMode.test.js` PASS: 3 files / 29 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS with existing ESLintEnvWarning warnings only.
- `git diff --check` PASS before runtime commits.
- Local browser smoke after fresh build observed canonical axis labels and no overflow for the axis labels/options.

## Review Questions

1. Is the label change consistent with the canonical four-axis model?
2. Does this patch preserve the existing axis values and request/orchestrator behavior already proven by CT2 payload evidence?
3. Is the LandingPage `Path:` summary consistent with the Flow Hub Path axis and not a new claim?
4. Are the tests sufficient for a surgical UI clarity patch, with CT2 live browser proof still required after deployment?
5. Does the patch avoid any SSOT, matrixArtifact, VERIFIED, or governance movement?

## Expected CD Result

Return PASS or BLOCK with file/line evidence. Notes are welcome, but block only on demonstrated SSOT, implementation, data-shape, evidence, or acceptance-risk failures.
