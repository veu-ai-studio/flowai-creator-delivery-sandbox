# CB Dispatch - Patch CR Re-Review Block on Path 2 Boundary Chain

Date: 2026-06-12
From: CTO
To: CB
Priority: immediate
Runtime repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Runtime branch: `fix/path2-platform-boundary-chain`
Blocked commit: `455c2d24f85cdabf723a2b6cc3bde323a97437e9`

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/cb-path2-platform-boundary-chain-dispatch-20260612.md`
5. `docs/cto/cr-review-path2-boundary-chain-step5-result-20260612.md`
6. `docs/cto/cb-path2-boundary-chain-cr-block-patch-dispatch-20260612.md`
7. `docs/cto/cr-review-path2-boundary-chain-step5-rereview-result-20260612.md`

## Current Review State

CD: PASS-WITH-FINDINGS on the first Path 2 repair commit. Findings remain non-blocking and tracked.

CR: BLOCK on re-review of `455c2d2`.

Do not merge the runtime branch until this block is patched and CR re-review passes.

## CR Re-Review Block

CR found one remaining inconsistency:

- `sourceMappedFixGenerator` no longer allows id-only proposal matching under active-host scope.
- `sourcePathForFinding` still allows id-only source-path matching under active-host scope when no observed URL location exists.

This can let remediation pathing advance from stale/id-only evidence even when recommendations are correctly marked incomplete.

## Required Fix

Patch only the remaining mismatch.

In `src/lib/sourceMapping/registeredRepoSourceMapper.js`, align `sourcePathForFinding` with the stricter active-host behavior already used by proposal generation.

Expected rule:

- If there is no active-host scope, keep existing id-based fallback behavior where appropriate.
- If there is active-host scope and observed URL evidence was filtered, return no match.
- If there is active-host scope and no compatible observed location exists, do not allow id-only source-path resolution.
- If there is active-host scope and a compatible observed location exists, preserve the exact category/location match path.

Do not weaken:

- platform boundary
- Base44 boundary
- auth boundary
- fallback/run URL context separation
- observed URL evidence requirements
- governance writes
- VERIFIED controls

## Tests Required

Add or update focused tests so CR can verify the exact fix:

1. `sourcePathForFinding` returns `null` under active-host scope when only `finding.id` matches and the finding has no observed URL/location evidence.
2. `sourcePathForFinding` returns `null` when URL evidence is non-active-host context.
3. Positive observed app-layer case still maps:
   - target host: `saige-v2.vercel.app`
   - observed URL: `https://saige-v2.vercel.app/settings`
   - expected source path: `src/pages/Settings.jsx`
4. Existing source mapping and orchestrator boundary tests still pass.

Run at minimum:

```powershell
npx vitest run tests/sourceMapping/registeredRepoSourceMapper.test.js tests/sourceMapping/sourceMappedFixGenerator.test.js tests/agents/renewal/orchestrator.test.js
```

Run `npm run build:preflight` after the focused tests.

Do not run or commit matrixArtifact-generating commands unless you restore any generated artifact before commit.

## Output Required

Push an updated commit to `fix/path2-platform-boundary-chain`.

Report:

- new commit SHA
- files changed
- exact tests run and result
- how the re-review P2 was fixed
- whether CR re-review is ready

Do not touch canonical docs, matrixArtifact, VERIFIED state, env, production, or unrelated runtime files.
