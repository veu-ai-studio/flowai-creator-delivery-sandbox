# CR Review Prompt - Fresh Build Registry Repo Fallback

FROM: CTO
TO: CR
ACTION: Review runtime branch for Fresh Build registry repo fallback.

Branch:

- `fix/fresh-build-registry-github-repo-fallback`

Base:

- `main` at `850ae169b2f379af0fcb7a86cafabc546ee7ea27`

Code commit:

- `ca02961` - `fix fresh build registry repo target fallback`

Scope:

- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- Evidence under `docs/cto/path3-fresh-build-veusite-postrecovery-*`

Blocker being addressed:

- Live Path 3 run `cto-path3-veusite-postrecovery-20260614-0718` produced generated code successfully, then blocked at `UPGRADE_REPO_REQUIRED`.
- Live schema query showed `product_registry` has `github_repo_url` and `vercel_project_id`, but not `upgrade_repo`.
- Fresh Build adapter ignored `github_repo_url`, so registry-backed Fresh Build targets could not deploy from the live schema.

Patch behavior:

- Adds `productConfig.github_repo_url` as a valid Fresh Build write target after `upgrade_repo` / `upgradeRepo`.
- Keeps `productConfig.repo` excluded.
- Keeps generated-code validation, original-repo block, main/master block, GitHub write, Vercel deploy, preview probe, scoring, and governance behavior unchanged.

Review questions:

1. Could this fallback incorrectly promote context/fallback metadata into observed evidence?
2. Could this cause writes to original/source repos?
3. Does the existing `original_repo` equality block still protect cases where both fields are present?
4. Does the patch avoid scoring, governance, or VERIFIED movement changes?
5. Should the temporary FlowAI repo proof target be considered nonblocking as long as it is documented as temporary and branch-isolated?

Verification already run by CTO:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 34 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

Return PASS or BLOCK with findings.
