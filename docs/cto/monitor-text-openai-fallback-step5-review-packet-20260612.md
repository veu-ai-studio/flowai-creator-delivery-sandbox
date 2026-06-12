# Step 5 Review Packet — Monitor Text OpenAI Fallback

FROM: CTO
TO: CD, CR, W04
DATE: 2026-06-12
BRANCH: `fix/monitor-text-openai-fallback`
RUNTIME COMMIT: `879471a`

## Context

Path 2 SAIGE-v2 proof reached the pre-score monitor text call and stopped before branch creation because Anthropic returned a low-credit 400:

`monitorTextProducer: Anthropic returned 400 Bad Request ... Your credit balance is too low to access the Anthropic API.`

This blocks the forge before Step 3 Build even though `OPENAI_API_KEY` is configured and Codex is now the callable Build tool. SSOT direction remains provider/tool agnostic; this patch does not move VERIFIED, does not bypass scoring, and does not fabricate monitor text.

## Runtime Change

- `src/lib/agents/renewal/monitorTextProducer.js`
  - Keeps Anthropic as the first monitor-text provider when configured.
  - Adds OpenAI chat-completions fallback when Anthropic fails and `OPENAI_API_KEY` or `opts.openaiApiKey` exists.
  - Returns explicit `provider` metadata (`anthropic` or `openai`).
  - Returns sanitized `fallbackFrom` provenance when fallback occurs.
  - Fails closed if no configured provider succeeds.
  - Does not log or return provider API keys.

## Test/Preflight Repair

The prior TIM Codex merge left deterministic preflight drift on main. This branch also repairs that drift:

- `tests/marketplace_inventory.test.js`
  - Updates marketplace count from 61 to 63.
  - Updates Build count from 5 to 7 for Codex, Claude Code, Cursor, Bolt, Windsurf, Replit, Base44.

- `src/lib/forge/verticalSliceRunner.js`
  - Uses canonical Codex-first Build ranking rows in the reference vertical-slice fixture.
  - Supplies a test `OPENAI_API_KEY` only for the fixture when none is already set.
  - Makes the fixture dispatch return the selected member (`codex`) so live Build admission remains honest.

## Verification

PASS:

- `node --check src\lib\agents\renewal\monitorTextProducer.js`
- `node --check src\lib\forge\verticalSliceRunner.js`
- `npx vitest run tests/agents/renewal/monitorTextProducer.test.js`
- `npx vitest run tests/agents/renewal/orchestrator.test.js tests/agents/renewal/monitorTextProducer.test.js`
- `npx vitest run tests/marketplace_inventory.test.js tests/forge/referenceVerticalSlice.test.js tests/forge/stepOwnerGraduation.test.js tests/agents/renewal/monitorTextProducer.test.js tests/agents/renewal/orchestrator.test.js`
- `npm run build:preflight`
- `npx vitest run --exclude tests/smoke/api-health.test.js` — 231 files, 3679 passed, 1 skipped
- `node scripts/checkLaneDiscipline.js`
- `node scripts/check-ssot-traceability.mjs`
- `node scripts/generateMatrixArtifact.js` (timestamp-only generated change reverted; no artifact committed)

FULL PREFLIGHT STATUS:

- `npm run preflight` now reaches 231/232 test files passing and 3684/3688 tests passing.
- Remaining failure is the live external `POST /api/test-claude` smoke test returning 500 because Anthropic is still unavailable. This is the same provider-credit class of failure this runtime patch works around for monitor scoring.

## Review Questions

CD:

1. Does the fallback preserve the existing monitor scoring contract and fail closed when no provider works?
2. Are the deterministic TIM/preflight repairs consistent with the Codex Build amendment?
3. Any maintainability or architecture concerns before merge?

CR:

1. Does the patch avoid fabricated evidence and preserve provider provenance?
2. Are secrets kept out of returned envelopes and errors?
3. Does this avoid VERIFIED or ProductSSOT movement?
4. Is the full-preflight caveat properly classified as external live Anthropic availability rather than a branch regression?

## CTO Recommendation

Proceed to CD + CR review. If both PASS, merge and promote, then rerun Path 2 SAIGE-v2 proof. Expected next result: monitor text should fall back to OpenAI if Anthropic remains low-credit, allowing the forge to continue toward Codex Build.
