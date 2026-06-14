# CB Dispatch - Path 3 Fresh Build Codegen Recovery

Date: 2026-06-14
From: CTO
To: CB
Priority: active after Clerk redirect merge
Branch to build: `fix/path3-fresh-build-codegen-recovery`
Base: current `origin/main`

## Read First

Read these before editing:

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/path3-fresh-build-veusite-proof-20260614.md`
5. `docs/cto/path3-fresh-build-veusite-proof-20260614/cto-path3-veusite-20260614-0615.sse`
6. `docs/cto/cb-path3-fresh-build-codegen-recovery-dispatch-20260612.md`

Canonical authority remains the three governing documents. This dispatch is an implementation packet, not a canonical amendment.

## Problem

The 2026-06-14 live production Fresh Build proof reproduced the same safety stop as 2026-06-12:

- Run ID: `cto-path3-veusite-20260614-0615`
- Endpoint: `POST https://flowai-dun.vercel.app/api/run-construction`
- Mode: `FRESH_BUILD`
- Input URL: `https://victorudo.com`
- Description: upgraded VEU AI Studio website synthesized from `https://victorudo.com` and `https://flowai-dun.vercel.app`
- Feature extractor: completed, `pages: 20`, `components: 312`
- Design synthesizer: completed, `components: 312`
- Codebase generator: started, then failed validation
- Failure: `GeneratedCodebase failed safety validation: src/components/ListListXlrmdf.jsx has unbalanced ()`
- Preview URL: none
- Deployment id: none
- PR URL: none
- Score: not attempted

The fail-closed behavior is correct. The product need is to repair deterministic code generation/recovery so Fresh Build can proceed to branch/deploy without weakening validation.

## Engineering Goal

Make Fresh Build code generation either:

1. produce a validation-clean codebase for this VEU AI Studio proof input, or
2. fail with structured recoverable diagnostics that identify the invalid file and preserve enough bounded state for a safe retry.

Do not bypass safety validation. Do not deploy invalid generated code. Do not fabricate a URL.

## Likely Code Areas

Start here, but follow the code:

- `src/lib/freshBuild/codebaseGenerator.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/codebaseGenerator.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

Known anchor:

`validateGeneratedCodebase` throws the final message `GeneratedCodebase failed safety validation: <path> has unbalanced ()`.

## Build Requirements

Patch the smallest code path that satisfies all of the following:

1. Keep `validateGeneratedCodebase` as a blocking safety gate.
2. Prevent deterministic component generation from emitting unbalanced JSX/parentheses in normal output.
3. Add a bounded deterministic repair/retry path only if it can prove the repaired files pass validation before deployment.
4. If recovery cannot produce valid files, return a structured blocked result that includes invalid file path, validation reason, stage, and no preview/deployment claim.
5. Ensure the deployment adapter is never called when generated files remain invalid.
6. Do not add package dependencies, secrets, auth bypasses, route rewrites, or Base44/platform dependencies.
7. Do not move VERIFIED or matrixArtifact entries.

## Tests Required

Add or update focused tests proving:

1. The exact `ListListXlrmdf.jsx` / unbalanced `()` failure class is covered by a regression fixture or equivalent deterministic fixture.
2. Normal Fresh Build generation produces validation-clean files.
3. Any deterministic recovery path produces validation-clean files before deployment adapter is called.
4. Deployment adapter is not called when generated code remains invalid.
5. Final SSE/API result stays honest: no preview/deploy URL when validation blocks.

Run at minimum:

```powershell
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
```

Run broader preflight if changes touch shared orchestration paths.

## Evidence Required

Commit a result file:

`docs/cto/cb-path3-fresh-build-codegen-recovery-result-20260614.md`

Include:

- branch and HEAD;
- files changed;
- exact tests run;
- whether the 2026-06-14 live failure is now covered by regression test;
- whether live proof should be rerun after CD/CR review;
- explicit statement that no VERIFIED movement occurred.

## Pause Conditions

Pause only if:

- a canonical amendment appears required;
- the only available fix weakens validation;
- deploying invalid generated code would be required;
- the repair requires a new product/repo/business direction beyond the already authorized VEU AI Studio proof;
- broad ForgeRunState phase-split work becomes necessary.

Do not pause for routine commands. Do not wait for Victor or W04 on routine work. CTO owns this dispatch.
