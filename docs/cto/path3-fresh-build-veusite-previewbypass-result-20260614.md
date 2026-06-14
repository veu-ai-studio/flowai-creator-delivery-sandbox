# Path 3 Fresh Build Preview-Bypass Proof Result

Date: 2026-06-14
Owner: CTO
Production URL: `https://flowai-dun.vercel.app`
Production commit tested: `d5b5a1197eb1b921fa6a58b74f9405976a75864b`
Run ID: `cto-path3-veusite-previewbypass-20260614-1046`
VERIFIED movement: no
matrixArtifact edited: no
canonical SSOT edited: no

## Verdict

Result: `READY_WITH_CLEAN_TREE_BLOCKER`

The run proved Fresh Build mechanics through branch creation, Vercel preview deployment, protected preview access using the automation bypass header, and score capture. It did not yet prove a clean platform-free Fresh Build output because the generated branch retained legacy FlowAI platform files from `main`.

## Positive Evidence

Evidence directory:

- `docs/cto/path3-fresh-build-veusite-previewbypass-proof-20260614/`

Captured files:

- request: `cto-path3-veusite-previewbypass-20260614-1046.request.json`
- SSE: `cto-path3-veusite-previewbypass-20260614-1046.sse`
- stderr: `cto-path3-veusite-previewbypass-20260614-1046.stderr.txt`

Runtime identity:

- `/api/health` commitFull: `d5b5a1197eb1b921fa6a58b74f9405976a75864b`
- deployment URL: `https://flowai-p653nqo70-veu-ai-studio.vercel.app`
- production env includes `VERCEL_AUTOMATION_BYPASS_SECRET`

Run reached:

- feature extraction
- design synthesis
- codebase generation
- GitHub branch creation
- Vercel preview deployment
- preview access probe
- score capture

Final run output:

- final status: `succeeded`
- Fresh Build status: `READY`
- write status: `WRITTEN_AND_DEPLOYED`
- preview access status: `PREVIEW_BROWSER_CLEAR`
- score status: `SCORE_CAPTURED`
- baseline score: `93`
- final score: `100`
- score delta: `7`

Branch/deployment evidence:

- branch: `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-previewbypass-20260614-1046`
- branch URL: `https://github.com/victor2081new-cloud/flowai/tree/flowai%2Ffresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-previewbypass-20260614-1046`
- commit SHA: `f08f3a6bb70feea019ba8946465e0203b9b1e582`
- deployment ID: `dpl_2ad2rvVSFgWzm8jRGb3ytk9rRXEr`
- preview URL: `https://flowai-831ykx0hw-veu-ai-studio.vercel.app`
- inspector URL: `https://vercel.com/veu-ai-studio/flowai/2ad2rvVSFgWzm8jRGb3ytk9rRXEr`
- credential source: `GITHUB_OPERATOR_TOKEN`

Preview access evidence:

- bypass probe status: `200`
- negative anonymous probe status: `401`
- bypass source reported: `VERCEL_AUTOMATION_BYPASS_SECRET`
- no secret value printed or committed

## Clean-Tree Blocker

After the run, CTO fetched the generated branch and inspected its tree.

Findings:

- generated branch file count: `2343`
- retained legacy files include `api/_lib/*`, `api/agent/*`, `.github/*`, `docs/*`, and other FlowAI platform files
- Vercel inspect also showed FlowAI API functions in the preview build

Interpretation:

Fresh Build used a tree batch with `base_tree`, so the branch overlaid generated files on top of `main` instead of replacing the tree with only generated files. The generated codebase itself reported `342` files and `0` platform dependencies, but the deployed branch was not a clean generated codebase.

This must not be promoted as a platform-free Fresh Build proof.

## Patch Triggered

Branch: `fix/fresh-build-clean-tree`

Patch scope:

- Fresh Build GitHub commits now create a clean tree for generated outputs.
- The commit still uses the base branch commit as parent for traceability.
- The create-tree request intentionally omits `base_tree`, so old FlowAI files are not retained.
- Tests assert no per-file blobs, no base commit tree fetch, no `base_tree`, and preserved commit parent.

Verification before review:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 42 tests

## Remaining Acceptance Boundary

The latest preview is not anonymously public:

- anonymous browser/status check: `401`
- bypass-header check: `200`

So the run proves FlowAI can generate, deploy, access, and score the output through its automation path. It does not yet prove Victor can open the preview URL without a bypass. CT2 acceptance must state whether it used bypass headers, and no VERIFIED movement is authorized from this proof alone.
