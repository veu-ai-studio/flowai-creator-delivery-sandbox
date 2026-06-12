# CB Dispatch - Path 3 Fresh Build Codegen Recovery

Date: 2026-06-12
From: CTO
To: CB
Priority: queued after Path 2 boundary-chain repair
Branch to build: `fix/path3-fresh-build-codegen-recovery`
Base: current `origin/main`

## Read First

Read these before editing:

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/four-path-proof-strategy-ui-audit-20260612.md`
5. `docs/cto/path3-fresh-build-veusite-proof-20260612.md`
6. `docs/cto/session-brief.md`

Canonical authority remains the three governing documents. This dispatch is an implementation packet, not a canonical amendment.

## Problem

Path 3 Fresh Build for an upgraded VEU AI Studio website failed safely during generated-code validation:

- Run ID: `cto-path3-veusite-20260612-0435`
- Mode: `FRESH_BUILD`
- Target/source URL: `https://victorudo.com`
- Failure: `GeneratedCodebase failed safety validation: src/components/ListListXlrmdf.jsx has unbalanced ()`
- Preview URL: none
- Deployment id: none
- Score: not attempted

This was an honest fail-closed result. No fabricated URL was claimed. The next repair should improve Fresh Build generation/recovery so one invalid generated file does not make the whole path unrecoverable when a safe deterministic fallback can be produced.

## Engineering Goal

Make Fresh Build code generation either:

1. Produce a validation-clean codebase for the VEU AI Studio proof input, or
2. Fail with structured recoverable diagnostics that identify the invalid file and preserve enough state for a bounded retry.

Do not bypass safety validation. Improve generation and recovery.

## Likely Code Areas

Start here, but follow the code:

- `src/lib/freshBuild/codebaseGenerator.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/codebaseGenerator.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`

Known anchors:

- `src/lib/freshBuild/codebaseGenerator.js` throws `GeneratedCodebase failed safety validation: ...`
- `validateGeneratedCodebase` detects unbalanced syntax.
- Existing tests already verify invalid paths, empty content, and syntax imbalance.

## Build Requirements

Patch the smallest code path that satisfies all of the following:

1. Keep `validateGeneratedCodebase` as a blocking safety gate.
2. Prevent generated component content from producing unbalanced JSX/paren output in normal deterministic generation.
3. Add a bounded repair/retry path only if it is deterministic and does not ask the model to patch unsafe code blindly.
4. If retry/recovery cannot produce valid files, return a structured blocked result that includes:
   - invalid file path
   - validation reason
   - stage
   - no preview URL
   - no deployment claim
5. Do not add Base44/platform dependencies.
6. Do not introduce secrets, new package dependencies, route rewrites, or auth bypasses.
7. Do not move VERIFIED or matrix artifacts.

## Tests Required

Add or update focused tests proving:

1. The exact unbalanced `()` failure class is caught and surfaced with file path.
2. Normal Fresh Build generation produces validation-clean files.
3. Any deterministic recovery path produces validation-clean files before deployment adapter is called.
4. Deployment adapter is not called when generated code remains invalid.
5. Final SSE/API result stays honest: no preview/deploy URL when validation blocks.

Run at minimum:

```powershell
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
```

Run broader preflight if code changes touch shared orchestration paths.

## Verification Required

Report:

- Files changed
- Tests run and results
- Whether the original Path 3 failure is now covered by a regression test
- Whether a live Fresh Build proof should be rerun after review

## Pause Conditions

Pause only if:

- A canonical amendment appears required.
- The repair requires approving a new product/repo/business direction beyond the already authorized VEU AI Studio proof.
- The only available fix is to weaken validation or deploy invalid generated code.
- The implementation requires broad ForgeRunState phase-split work.

Do not pause for routine commands. Do not wait for Victor or W04 on routine work. CTO owns this dispatch.
