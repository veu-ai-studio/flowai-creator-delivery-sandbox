# Runtime Config 800s PR and Merge Packet

Date: 2026-06-11
Owner: CTO
Branch: `fix/forge-runtime-config-800`
Current branch HEAD: `61d3f2cc3d55c38c1faacb39542be225c2e1c32a`
Base main: `06829983b50f16613c548f77708e96b905a8fbb9`

## Status

PR creation is prepared, but not created from this environment because:

- GitHub CLI is not installed.
- No local `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_OPERATOR_TOKEN` is available.
- Unauthenticated GitHub API access cannot inspect or create PRs for this repo.

The branch is pushed to origin and ready for authenticated PR creation.

## Compare URL

Open:

`https://github.com/victor2081new-cloud/flowai/compare/main...fix/forge-runtime-config-800?quick_pull=1`

## PR Title

`fix/forge | align runtime max duration config`

## PR Body

```md
## Summary

This PR aligns FlowAI runtime-duration configuration after the PR #11 deferred production proof closed without a terminal SSE result at roughly 60 seconds.

The deferred proof against production main `06829983b50f16613c548f77708e96b905a8fbb9` reached credential readiness, Product Discovery, repo probe, and 11-page crawl completion, but did not produce `[DONE]`, `final`, `timeout`, or `error`.

No branch creation, preview deploy, post-fix scoring, final governance write, or ProductSSOT persistence was observed.

No VERIFIED movement.

## Changes

- `api/inngest.js`
  - exported `config.maxDuration` changed from `60` to `800`
  - added named `export const maxDuration = 800`
- `api/agent/3/execute.js`
  - added source-level `export const config = { maxDuration: 800 }`
  - added named `export const maxDuration = 800`
- `tests/api/agent3ExecuteTimeout.test.js`
  - pins both root `vercel.json` and source-level function runtime config
- `docs/cto/pr11-deferred-proof-runtime-config-20260611.md`
  - records deferred proof evidence and post-merge acceptance criteria
- `docs/cto/cd-review-runtime-config-800-prompt.md`
  - CD review packet
- `docs/cto/cr-review-runtime-config-800-prompt.md`
  - CR review packet

## Verification

- `node --check api/agent/3/execute.js`: PASS
- `node --check api/inngest.js`: PASS
- `npx vitest run tests/api/agent3ExecuteTimeout.test.js`: PASS, 1 file / 6 tests
- `npm run preflight`: PASS
  - lint PASS
  - build:preflight PASS
  - 230 test files passed
  - 3655 tests passed
  - 3 skipped
  - lane discipline PASS
  - SSOT traceability PASS

## Review Gate

Do not merge until CD and CR return PASS on:

- `docs/cto/cd-review-runtime-config-800-prompt.md`
- `docs/cto/cr-review-runtime-config-800-prompt.md`

## Post-Merge Acceptance

After merge and production deployment:

1. Verify `/api/health` reports the merged commit.
2. Verify `/api/operator-readiness` remains `ok=true` with 7/7 credentials present.
3. Rerun constrained SAIGE proof:
   - `POST /api/agent/3/execute`
   - `Accept: text/event-stream`
   - `x-product-scope: saige`
   - body includes `url=https://saigeplatform.com`, `maxIterations=1`, `mode=auto`, `gtmTarget=95`
4. Acceptance requires either:
   - normal terminal `final` + `[DONE]`, or
   - honest terminal `timeout` + `[DONE]`
5. Branch creation, preview deploy, post-fix scoring, governance write, and ProductSSOT persistence count only if independently observed in the live proof.

No VERIFIED movement until live production evidence supports it.
```

## Merge Commit Note

Use this note if merged:

`Runtime config alignment: source-level Vercel function config and named maxDuration exports now match the intended 800s window for Agent 3 SSE and Inngest. Live proof remains required after production deploy; no VERIFIED movement in this merge.`

## Victor Action Required

None until W04/CD/CR clear the review gate.

When W04 clears merge, Victor only needs to approve/open the PR from the compare URL above if the automation bench has not created it from an authenticated GitHub surface.
