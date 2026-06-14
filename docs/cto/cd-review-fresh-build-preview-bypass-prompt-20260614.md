# CD Review Prompt - Fresh Build Preview Bypass

FROM: CTO
TO: CD
ACTION: STEP 5 REVIEW - Fresh Build preview bypass

Repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`
Branch: `fix/fresh-build-preview-bypass`
Base: `afe29e065211001f429387360f73b457b2158674`

## Context

Path 3 Fresh Build now crosses code generation, GitHub branch creation, and Vercel preview deployment. The latest proof produced:

- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-treebatch-20260614-1014`
- deployment ID: `dpl_9QmBX6DdNHThwAYP6vRYgkFkRMjU`
- preview URL: `https://flowai-7e3av7seq-veu-ai-studio.vercel.app`
- blocker: `PREVIEW_AUTH_REQUIRED`

Secret-safe diagnostics confirmed the current `flowai` Vercel project has a different automation bypass entry than the historical W1 `truthful-flow-logic-lab` project. Doppler and Vercel production env were synced to the current `flowai` project bypass value without printing the secret. Header-form bypass returns `200`; negative control remains `401`.

## Patch Under Review

Files:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `docs/cto/path3-fresh-build-veusite-treebatch-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-treebatch-proof-20260614/*`

Expected behavior:

1. Fresh Build preview probe injects `x-vercel-protection-bypass` only for `*.vercel.app` preview URLs when a product-scoped or automation bypass secret is present.
2. Product-scoped `VERCEL_BYPASS_SECRET_<PRODUCT>` takes precedence over `VERCEL_AUTOMATION_BYPASS_SECRET`.
3. The secret is never returned, logged, committed, or embedded in URLs.
4. Probe evidence may report only `bypassAttempted` and `bypassSource`.
5. Non-Vercel URLs and missing-secret cases continue without bypass.
6. No matrixArtifact, VERIFIED, canonical SSOT, scoring-governance, auth, or route behavior is changed.

## Verification Already Run

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js` PASS, 20 tests
- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests
- `npm run build:preflight` PASS
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only
- `git diff --check` PASS

## Review Ask

Report PASS/BLOCK.

Check especially:

- bypass injection is scoped and does not weaken deployment protection for normal users;
- secret values cannot leak through returned proof objects or docs;
- status remains honest if bypass is absent or preview still returns auth;
- tests cover precedence, injection, and no-secret return behavior.
