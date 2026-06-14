# CR Review Prompt - Fresh Build Preview Bypass

FROM: CTO
TO: CR
ACTION: STEP 5 REVIEW - Fresh Build preview bypass

Repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`
Branch: `fix/fresh-build-preview-bypass`
Base: `afe29e065211001f429387360f73b457b2158674`

## Why This Exists

The latest Path 3 Fresh Build proof produced a real branch and Vercel preview deployment, then stopped honestly because the preview was protected:

- `writeStatus`: `WRITTEN_PREVIEW_NOT_BROWSER_CLEAR`
- `previewAccessStatus`: `PREVIEW_AUTH_REQUIRED`
- `scoreStatus`: `SCORE_BLOCKED_PREVIEW_AUTH`
- `previewUrl`: `https://flowai-7e3av7seq-veu-ai-studio.vercel.app`
- no post-fix score, no governance completion, no ProductSSOT completion, no VERIFIED movement

The blocker is preview access for server-side probe/scoring, not GitHub write.

## Patch Under Review

Files:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `docs/cto/path3-fresh-build-veusite-treebatch-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-treebatch-proof-20260614/*`

## CR Checks

Report PASS/BLOCK.

Block if any of the following are true:

1. The Vercel bypass secret can appear in returned result objects, logs, committed docs, test snapshots, URLs, or error messages.
2. The bypass is injected for non-Vercel URLs.
3. Missing bypass secrets are treated as browser-clear.
4. Protected previews are overclaimed as deployed/accepted without `PREVIEW_BROWSER_CLEAR`.
5. This branch edits matrixArtifact, canonical SSOT docs, VERIFIED state, ProductSSOT truth, scoring governance, auth gates, route rewrites, or unrelated runtime surfaces.
6. Evidence docs claim more than the captured SSE proves.

Expected safe behavior:

- `x-vercel-protection-bypass` is used only in request headers for `*.vercel.app`.
- Product-scoped bypass secrets are preferred; automation bypass is fallback.
- Result metadata includes only `bypassAttempted` and `bypassSource`.
- The final proof remains blocked until a real rerun observes `PREVIEW_BROWSER_CLEAR`.

## Verification Already Run

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js` PASS, 20 tests
- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests
- `npm run build:preflight` PASS
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only
- `git diff --check` PASS
