# Path 3 Fresh Build - VEU Site PAT-Only Proof Result

Date: 2026-06-14
Owner: CTO
Run ID: `cto-path3-veusite-patonly-20260614-0825`
Production commit under test: `d25d25ad3e51fcf5624ad87035f1baab610a5f6a`

## Verdict

PARTIAL PROGRESS - no deployed URL yet.

This run proves the Fresh Build pipeline has crossed the prior GitHub auth/write blocker. It generated a platform-free codebase and wrote a real branch. It then failed at Vercel compile due to duplicate generated page imports in `src/App.jsx`.

No VERIFIED movement.

## Evidence Files

- `docs/cto/path3-fresh-build-veusite-patonly-proof-20260614/cto-path3-veusite-patonly-20260614-0825.request.json`
- `docs/cto/path3-fresh-build-veusite-patonly-proof-20260614/cto-path3-veusite-patonly-20260614-0825.sse`
- `docs/cto/path3-fresh-build-veusite-patonly-proof-20260614/cto-path3-veusite-patonly-20260614-0825.stderr.txt`
- `docs/cto/path3-fresh-build-veusite-patonly-proof-20260614/cto-path3-veusite-patonly-20260614-0825.pid.txt`

## What Passed

- Fresh Build request accepted for `https://victorudo.com`.
- Product registry reused product `url-416b941ffbc3b7d5`.
- Feature extractor completed with 20 pages and 312 components.
- Design synthesizer completed with 312 components.
- Codebase generator returned `READY`.
- Generated output contained 343 files.
- Generated output had 0 platform dependencies.
- GitHub branch write succeeded with 343 files written.
- Generated branch:
  `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-patonly-20260614-0825`
- Commit SHA:
  `8aaae3f5e050cc88dfc759c5a8521de3e85707f9`
- Branch URL:
  `https://github.com/victor2081new-cloud/flowai/tree/flowai%2Ffresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-patonly-20260614-0825`

## What Failed

Vercel deployment failed before producing a usable preview URL.

- Deployment ID: `dpl_9yKqBPW8JMAfRm9oVDxAQ5Y9XZG6`
- Vercel deployment URL inspected: `https://flowai-hw360od8a-veu-ai-studio.vercel.app`
- Ready state: `ERROR`
- Failure stage: `vercel_deploy`
- Forge score status: `SCORE_BLOCKED_PREVIEW_ACCESS`
- Preview URL in FlowAI result: `null`
- Score fields: `null`

Vercel build logs showed the compile blocker:

`src/App.jsx:19:7: ERROR: The symbol "ContactDrVictorUdoSpeakingAdvisoryVEUAIStudioAbasiPeopleFoundation" has already been declared`

This is a Fresh Build codegen route/page dedupe defect, not a GitHub auth defect and not a registry target defect.

## Corrective Branch

Patch branch: `fix/fresh-build-route-dedupe`

Patch summary:

- Deduplicate generated page routes before page files and `src/App.jsx` are emitted.
- Deterministically suffix distinct pages that share the same generated page/component name.
- Preserve duplicate source URLs for component attachment without producing duplicate route/import entries.
- Add duplicate generated file path validation.
- Add regression test for duplicate routes and duplicate page names.

Verification on patch branch:

- `npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js` PASS, 3 files / 35 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## Next Required Step

After CD and CR pass `fix/fresh-build-route-dedupe`, merge it to main, promote/redeploy production, rerun Path 3 Fresh Build, and require CT2 to independently confirm the resulting deployed URL before any VERIFIED promotion.
