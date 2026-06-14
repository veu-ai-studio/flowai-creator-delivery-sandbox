# CR Review Prompt - Fresh Build Route Dedupe

FROM: CTO
TO: CR
DATE: 2026-06-14
ACTION: Step 5 evidence and regression review

Branch: `fix/fresh-build-route-dedupe`
HEAD: `2fe40c9`
Base: `d25d25a`

## Context

Path 3 Fresh Build reached GitHub branch write on run `cto-path3-veusite-patonly-20260614-0825`, then failed at Vercel deploy.

Observed Vercel failure:

`src/App.jsx:19:7: ERROR: The symbol "ContactDrVictorUdoSpeakingAdvisoryVEUAIStudioAbasiPeopleFoundation" has already been declared`

The generated App file had duplicate imports/routes for the same crawled page. This patch only addresses that deterministic codegen failure.

## Changed Files

- `src/lib/freshBuild/codebaseGenerator.js`
- `tests/freshBuild/codebaseGenerator.test.js`

## Verification

- `npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js` PASS, 3 files / 35 tests.
- `npm run build:preflight` PASS.
- `npm run lint` PASS, with existing flat-config `eslint-env` warnings only.
- `git diff --check` PASS.

## CR Review Focus

Please verify:

- The test covers the CR-relevant failure: duplicate observed page route/title cannot become duplicate `App.jsx` imports, duplicate route entries, or duplicate generated file paths.
- The code keeps evidence honest: duplicate crawled pages are normalized for generated output only; no fallback URL, deployment URL, score, or observed finding URL is relabeled.
- The patch does not move any `matrixArtifact` entry to VERIFIED or WIRED.
- The patch does not change scoring, governance writes, ProductSSOT persistence, auth behavior, Vercel promotion, or GitHub token handling.
- The duplicate file path validation creates a hard pre-deploy block if a future generator collision occurs.

Report PASS or BLOCK with exact file/line findings.
