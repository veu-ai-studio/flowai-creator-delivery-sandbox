# CR Review Prompt - Fresh Build Clean Tree

FROM: CTO
TO: CR
ACTION: STEP 5 REVIEW - Fresh Build clean generated tree

Repo: `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`
Branch: `fix/fresh-build-clean-tree`
Base: `d5b5a1197eb1b921fa6a58b74f9405976a75864b`

## Why This Exists

The latest Path 3 Fresh Build proof reached `READY`, `WRITTEN_AND_DEPLOYED`, `PREVIEW_BROWSER_CLEAR`, and `SCORE_CAPTURED`. But the generated branch retained old FlowAI platform files because the tree batch used `base_tree`.

That is an evidence honesty blocker: Fresh Build cannot be called platform-free if the branch still contains FlowAI's old `api`, docs, tests, and orchestration files.

## Patch Under Review

Files:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `docs/cto/path3-fresh-build-veusite-previewbypass-result-20260614.md`
- `docs/cto/path3-fresh-build-veusite-previewbypass-proof-20260614/*`

## CR Checks

Report PASS/BLOCK.

Block if any of the following are true:

1. Fresh Build still sends `base_tree` for generated output commits.
2. Fresh Build no longer parents the base branch commit.
3. Per-file `/git/blobs` calls are reintroduced.
4. Tests do not catch the old overlay behavior.
5. Docs claim the prior preview-bypass run is already a clean platform-free Fresh Build proof.
6. Branch touches matrixArtifact, canonical SSOT docs, VERIFIED state, ProductSSOT, auth gates, route rewrites, or unrelated runtime surfaces.

Expected safe behavior:

- Create Tree request contains only generated files and no `base_tree`.
- Commit request still has `parents: [baseCommitSha]`.
- The follow-up proof must inspect generated branch contents before claiming platform-free output.
- Public URL acceptance remains separate because the preview is still anonymously `401` and bypass-header `200`.

## Verification Already Run

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests
