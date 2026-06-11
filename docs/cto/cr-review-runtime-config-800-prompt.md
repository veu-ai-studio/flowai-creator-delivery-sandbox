# CR Review Prompt — Runtime Config 800s Patch

FROM: CTO
TO: CR
ACTION: Regression and SSOT review for branch `fix/forge-runtime-config-800`

## Scope

Review the runtime-duration fix produced after the PR #11 deferred SAIGE proof closed without a terminal SSE event.

Branch: `fix/forge-runtime-config-800`
Review target: latest `origin/fix/forge-runtime-config-800`
Technical code delta: `61d3f2cc3d55c38c1faacb39542be225c2e1c32a fix/forge | add named max duration exports`
Deferred proof production base: `06829983b50f16613c548f77708e96b905a8fbb9`
Note: commits after the technical code delta are docs-only coordination corrections unless `git diff` shows otherwise.

Files in scope:

- `api/inngest.js`
- `api/agent/3/execute.js`
- `tests/api/agent3ExecuteTimeout.test.js`
- `docs/cto/pr11-deferred-proof-runtime-config-20260611.md`

## Evidence Context

Production deferred SAIGE proof on main `06829983b50f` was incomplete:

- Production was on the correct commit.
- Operator readiness was 7/7.
- Proof reached Product Discovery, repo probe, and 11-page crawl completion.
- Stream closed with no `[DONE]`, no `final`, no `timeout`, and no `error`.
- Vercel log for the proof POST showed `responseStatusCode: 0`.
- Branch creation, preview deployment, post-fix scoring, final governance write, and ProductSSOT persistence were not observed.

No VERIFIED movement was made.

## What Changed

- `api/inngest.js` exported `config.maxDuration` changed from 60 to 800 and now also exports `maxDuration = 800`.
- `api/agent/3/execute.js` now exports `config = { maxDuration: 800 }` and `maxDuration = 800`.
- `tests/api/agent3ExecuteTimeout.test.js` pins both root `vercel.json` and source-level function runtime config.
- CTO evidence doc records the proof as `INCOMPLETE / BLOCK`, not success.

## CR Review Questions

1. Does the evidence doc avoid overstating the proof result?
2. Does the patch avoid relabeling partial setup/crawl evidence as end-to-end forge success?
3. Are scoring, governance writes, ProductSSOT persistence, VERIFIED entries, and repair gates untouched?
4. Does the test addition prevent the exact config drift observed here?
5. Any hidden regression risk from exporting `config` and named `maxDuration` in `api/agent/3/execute.js`?

## Verification Already Run

- `node --check api/agent/3/execute.js`: PASS
- `node --check api/inngest.js`: PASS
- `npx vitest run tests/api/agent3ExecuteTimeout.test.js`: PASS, 1 file / 6 tests
- `npm run preflight`: PASS
  - 230 files passed
  - 3655 tests passed
  - 3 skipped
  - lane discipline PASS
  - SSOT traceability PASS

## Expected Output

Report `PASS` or `BLOCK`.

If `BLOCK`, include exact file/line evidence and the minimal required fix.

No live proof is requested from CR. Live proof remains a post-merge production acceptance run.
