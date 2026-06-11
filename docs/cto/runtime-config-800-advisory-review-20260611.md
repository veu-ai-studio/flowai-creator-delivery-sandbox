# Runtime Config 800s Advisory Review

Date: 2026-06-11
Owner: CTO
Branch: `fix/forge-runtime-config-800`
Review target: latest `origin/fix/forge-runtime-config-800`
Technical code delta: `61d3f2cc3d55c38c1faacb39542be225c2e1c32a`

## Status

Advisory PASS.

This is an internal Codex sidecar review only. It does not replace CD or CR review, and it does not clear the runtime branch for merge.

## Advisory Scope

Reviewed branch `origin/fix/forge-runtime-config-800` against `origin/main`.

Focus areas:

- Runtime duration config in `api/agent/3/execute.js` and `api/inngest.js`
- Timeout coverage in `tests/api/agent3ExecuteTimeout.test.js`
- Evidence discipline in `docs/cto/*runtime-config*`
- Whether commits after technical code delta `61d3f2c` are docs-only coordination corrections
- Merge compatibility with current `origin/main`

## Findings

No obvious technical or SSOT/evidence blocker found.

Observed alignment:

- `api/agent/3/execute.js` exports `config = { maxDuration: 800 }`.
- `api/agent/3/execute.js` exports named `maxDuration = 800`.
- `api/inngest.js` exports `config.maxDuration = 800`.
- `api/inngest.js` exports named `maxDuration = 800`.
- `vercel.json` keeps both `api/agent/3/execute.js` and `api/inngest.js` at `maxDuration: 800`.
- `tests/api/agent3ExecuteTimeout.test.js` pins both source-level and root Vercel function config.
- The deferred proof document records the run as `INCOMPLETE / BLOCK`, not success.
- No VERIFIED movement is claimed.

## Verification

Local CTO checks on latest runtime branch:

- `node --check api/agent/3/execute.js`: PASS
- `node --check api/inngest.js`: PASS
- `npx vitest run tests/api/agent3ExecuteTimeout.test.js`: PASS, 1 file / 6 tests
- `node scripts/check-ssot-traceability.mjs`: PASS
- `git merge-tree 06829983b50f16613c548f77708e96b905a8fbb9 origin/main origin/fix/forge-runtime-config-800`: clean merge result, no conflicts surfaced

Sidecar Codex advisory checks:

- `node --check api/agent/3/execute.js`: PASS
- `node --check api/inngest.js`: PASS
- `npx vitest run tests/api/agent3ExecuteTimeout.test.js`: PASS, 1 file / 6 tests
- `git merge-tree origin/main origin/fix/forge-runtime-config-800`: clean, no conflicts surfaced

## Residual Risks

- Official CD and CR PASS remain required.
- W04 CLEAR TO MERGE remains required after CD/CR PASS.
- The 800s production behavior still requires post-merge production proof.
- No branch creation, preview deployment, post-fix scoring, governance write, ProductSSOT persistence, or VERIFIED movement may be claimed until the live proof independently observes those milestones.

