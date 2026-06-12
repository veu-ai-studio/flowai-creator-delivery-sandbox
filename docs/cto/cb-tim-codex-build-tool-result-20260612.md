# CB Result - TIM Codex Build Tool

Date: 2026-06-12
Owner: CTO
Runtime branch: `fix/tim-codex-build-tool`
Runtime head: `a6b82e5c893fac1491b2c25611a680bd1ca0bed8`
Runtime base: `b4e02c566378e5f00b17252f9db176e20f9e7d42`
Current `origin/main`: `2fa932d3d753ced3e1bb36b61b3a11f3cbd7da45` docs-only after the runtime base

## Verdict

CB implementation is complete and pushed for Step 5 CD/CR review.

Do not merge until CD and CR return PASS or W04 explicitly adjudicates any findings.

## What Changed

- Added Codex as the rank-1 Step 3 Build tool in the canonical Build ranking helper.
- Updated Tool Intelligence normalization so Build rankings are always ordered:
  `Codex`, `Claude Code`, `Cursor`, `Bolt`, `Windsurf`, `Replit`, `Base44`.
- Added a Supabase migration to allow seven Build rankings while keeping other steps at ranks 1..5.
- Added `src/lib/orchestra/codex.js`, an OpenAI API-backed Codex adapter for `code-patch` and `generate-from-scratch`.
- Updated Build runner live dispatch so it checks the selected Build member's credential state and passes `memberId` into Orchestra dispatch.
- Added a guard that rejects fallback results when the selected Build member differs from the dispatch result member.
- Updated health reporting to include Codex in the Orchestra member list.
- Updated TIM UI visibility so Codex is present first in Build and shown as `server check pending` in static browser-side state until server credential checks run.
- Updated tests across TIM ranking, dispatch contract, build runner, UI visibility, Orchestra dispatch, renewal member list, and health.

## Honesty Boundary

This branch makes Codex ranked and callable through a real server-side adapter when `OPENAI_API_KEY` is present.

It does not claim the in-process adapter can itself run local git operations, shell tests, branch pushes, or Vercel deploys. Those remain outside `src/lib/orchestra/codex.js` and are still enforced by the surrounding forge/build/deploy machinery.

Static UI state does not claim browser-side credential knowledge. It reports `server check pending`.

Fallbacks are not counted as Codex proof: if Codex is selected and dispatch returns another member, Build fails closed.

No VERIFIED movement. No matrixArtifact movement. No canonical SSOT file changed.

## Verification

PASS:

```powershell
npx vitest run tests/ui/toolStepCardVisibility.test.js tests/tools/ToolIntelligenceService.test.js tests/tools/toolDispatchContract.test.js tests/forge/toolSelection.test.js tests/forge/buildStep.test.js tests/orchestra/dispatch.test.js tests/renewal/orchestra.test.js tests/api-health-handler.test.js
```

Result: 8 files passed, 136 tests passed.

PASS:

```powershell
node --check src\lib\orchestra\codex.js
node --check src\lib\tools\buildToolRanking.js
git diff --check
npm run build:preflight
```

`git diff --check` emitted only the existing Windows line-ending warnings and no whitespace failures.

## Review Gate

CD and CR prompts are committed beside this result:

- `docs/cto/cd-review-tim-codex-build-tool-step5-prompt-20260612.md`
- `docs/cto/cr-review-tim-codex-build-tool-step5-prompt-20260612.md`
