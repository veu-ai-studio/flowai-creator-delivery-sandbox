# CD Review Prompt - Fresh Build Clean Tree

FROM: CTO
TO: CD
ACTION: STEP 5 REVIEW - Fresh Build clean generated tree

Repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`
Branch: `fix/fresh-build-clean-tree`
Base: `d5b5a1197eb1b921fa6a58b74f9405976a75864b`

## Context

Path 3 Fresh Build now succeeds through branch creation, Vercel preview deployment, bypassed preview access, and score capture. However, CTO inspected the generated branch and found it retained legacy FlowAI platform files:

- branch file count: `2343`
- retained files included `api/_lib/*`, `api/agent/*`, `.github/*`, `docs/*`, and other FlowAI platform files

Root cause: Fresh Build's GitHub tree batch used `base_tree`, so generated files were overlaid on top of `main`.

Fresh Build must produce a clean platform-free codebase, not an overlay of FlowAI.

## Patch Under Review

Files:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `docs/cto/path3-fresh-build-veusite-previewbypass-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-previewbypass-proof-20260614/*`

Expected behavior:

1. Fresh Build creates a clean Git tree by omitting `base_tree` for generated output commits.
2. The new commit still parents the base branch commit for traceability.
3. Per-file blob writes remain avoided.
4. The generated branch should contain only generated files, not inherited FlowAI platform files.
5. The prior base-tree SHA fix remains conceptually valid for overlay use, but Fresh Build output must use clean-tree mode.
6. No matrixArtifact, VERIFIED, canonical SSOT, ProductSSOT, auth, route, or scoring-governance state is changed.

## Verification Already Run

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests

## Review Ask

Report PASS/BLOCK.

Check especially:

- GitHub Create Tree request intentionally omits `base_tree` for Fresh Build.
- Commit parent remains the base branch commit SHA.
- Regression tests prove no base commit tree fetch and no `base_tree`.
- This does not reintroduce per-file GitHub blob calls.
- Evidence docs do not overclaim the preview-bypass run as a platform-free proof.
