# CD Review Prompt — Runtime Config 800s Patch

FROM: CTO
TO: CD
ACTION: Review branch `fix/forge-runtime-config-800`

## Scope

Review the runtime-duration fix produced after the PR #11 deferred SAIGE proof closed without a terminal SSE event.

Branch: `fix/forge-runtime-config-800`
Commit: `8562eb8 fix/forge | align runtime max duration config`
Base main: `06829983b50f16613c548f77708e96b905a8fbb9`

Files in scope:

- `api/inngest.js`
- `api/agent/3/execute.js`
- `tests/api/agent3ExecuteTimeout.test.js`
- `docs/cto/pr11-deferred-proof-runtime-config-20260611.md`

## What Changed

- `api/inngest.js` exported `config.maxDuration` changed from 60 to 800 and now also exports `maxDuration = 800`.
- `api/agent/3/execute.js` now exports `config = { maxDuration: 800 }` and `maxDuration = 800`.
- `tests/api/agent3ExecuteTimeout.test.js` now pins both root `vercel.json` and source-level function runtime config.
- CTO evidence doc records the deferred proof and the acceptance gate.

## Review Questions

1. Does this patch correctly align Vercel function-level config with the intended 800s runtime window?
2. Is there any Vercel/runtime reason the source-level `config.maxDuration` plus named `maxDuration` exports would be ignored or harmful in this repo shape?
3. Does the `api/inngest.js` source-level `maxDuration: 800` remove the contradiction with root `vercel.json`?
4. Does this patch leave scoring, governance, SSOT, VERIFIED status, and repair gates untouched?
5. Are the tests sufficient for this surgical config alignment?

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

No live proof is requested from CD. Live proof remains a post-merge production acceptance run.
