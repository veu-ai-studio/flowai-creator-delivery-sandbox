# CD Review Prompt - Fresh Build Registry Repo Fallback

FROM: CTO
TO: CD
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

Context:

- Path 3 Fresh Build proof advanced past codegen after the prior recovery patch.
- New blocker: `UPGRADE_REPO_REQUIRED`.
- Live `product_registry` has `github_repo_url` and `vercel_project_id`, but does not expose `upgrade_repo`.
- Runtime Fresh Build deployment adapter only accepted `upgrade_repo` / `upgradeRepo`.
- Patch adds `productConfig.github_repo_url` as a registry-backed upgrade target fallback.
- Patch intentionally does not accept `productConfig.repo`, to avoid treating source/canonical repo metadata as a write target.

Review questions:

1. Is this patch consistent with the current live schema and Fresh Build architecture?
2. Does it preserve the safety gate that blocks writes without an authorized repo?
3. Does excluding `repo` avoid accidental source repo writes?
4. Is the new test sufficient for the exact regression?
5. Any risk that this creates fabricated deployment, scoring, governance, or VERIFIED movement?

Verification already run by CTO:

- `npx vitest run tests/freshBuild/freshBuildDeploymentAdapter.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/codebaseGenerator.test.js` PASS, 3 files / 34 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

Return PASS or BLOCK with findings.
