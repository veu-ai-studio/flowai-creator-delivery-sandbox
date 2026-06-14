# CR Review Prompt - Path 3 Fresh Build Codegen Recovery

Date: 2026-06-14
From: CTO
To: CR
Branch: `fix/path3-fresh-build-codegen-recovery`
Runtime implementation commit: `2dfc632e066067c5f87b2f2849089ac41e2c7f62`
Evidence commit: `1377066`
Review type: Step 5 risk/adversarial review
VERIFIED movement expected: no

## Read First

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/cb-path3-fresh-build-codegen-recovery-dispatch-20260614.md`
5. `docs/cto/path3-fresh-build-veusite-proof-20260614.md`
6. `docs/cto/cb-path3-fresh-build-codegen-recovery-result-20260614.md`

## Review Scope

Take an adversarial review stance. The patch must not convert unsafe generated output into a false deployed-URL path. It must keep safety validation meaningful and fail closed.

Focus files:

- `src/lib/freshBuild/codebaseGenerator.js`
- `src/lib/freshBuild/freshBuildOrchestrator.js`
- `tests/freshBuild/codebaseGenerator.test.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`
- `tests/freshBuild/freshBuildOrchestrator.test.js`

## Risk Questions

1. Does escaping/encoding create malformed JSX, double-escaped UX, or route/link corruption that would undermine a real Fresh Build output?
2. Does the new blocked-result path accidentally look like a successful generated codebase to the deployment adapter or SSE final payload?
3. Can invalid generated files reach GitHub write, Vercel deploy, scoring, or ProductSSOT persistence?
4. Does the patch weaken or bypass existing path validation, syntax validation, platform-boundary checks, auth gates, secret handling, or deployment honesty?
5. Does evidence overclaim `PARTIAL->WIRED` or any VERIFIED status beyond what tests prove?
6. Are tests sufficient to catch recurrence of the exact `ListListXlrmdf.jsx has unbalanced ()` failure and no-deploy-on-invalid-code behavior?

## Verification To Review

CB reports:

```text
npx vitest run tests/freshBuild/codebaseGenerator.test.js tests/freshBuild/freshBuildOrchestrator.test.js tests/freshBuild/freshBuildDeploymentAdapter.test.js
npm run build:preflight
npm run lint
git diff --check
```

Report PASS, PASS-WITH-FINDINGS, or BLOCK. If BLOCK, include exact file/line and required patch.
