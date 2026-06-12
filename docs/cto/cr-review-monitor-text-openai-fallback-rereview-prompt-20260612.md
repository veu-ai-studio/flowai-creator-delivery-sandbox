# CR Re-Review Prompt — Monitor Text OpenAI Fallback

FROM: CTO
TO: CR
DATE: 2026-06-12
BRANCH: `fix/monitor-text-openai-fallback`
HEAD: `5d9f324`

Prior CR verdict: BLOCK.

Prior finding:

- OpenAI non-2xx responses embedded raw upstream response bodies in thrown errors.
- `safeProviderFailure` copied those messages into provider failure metadata.
- The final `MONITOR_SCORE_FAILED` serialized those provider failures.
- Risk: if a provider/proxy echoed a submitted API key or key fragment, the error path could leak it.

Patch applied:

- `src/lib/agents/renewal/monitorTextProducer.js`
  - Anthropic and OpenAI non-2xx paths no longer include upstream body text.
  - Error message now includes provider/status/statusText and body length only:
    `Upstream body omitted for secret safety (...)`.

- `tests/agents/renewal/monitorTextProducer.test.js`
  - Adds regression test forcing Anthropic and OpenAI failed bodies to echo fake API keys.
  - Asserts neither error message nor serialized error/providerFailures contain either fake key.
  - Asserts providerFailures still preserve provider and status.

Verification after patch:

- `node --check src\lib\agents\renewal\monitorTextProducer.js` PASS
- `npx vitest run tests/agents/renewal/monitorTextProducer.test.js` PASS — 81/81
- `npx vitest run tests/agents/renewal/orchestrator.test.js tests/agents/renewal/monitorTextProducer.test.js` PASS — 213/213
- `npx vitest run tests/marketplace_inventory.test.js tests/forge/referenceVerticalSlice.test.js tests/forge/stepOwnerGraduation.test.js tests/agents/renewal/monitorTextProducer.test.js tests/agents/renewal/orchestrator.test.js` PASS — 226/226

Please re-review only the prior block plus any new regression introduced by commit `5d9f324`.

Return PASS/BLOCK.
