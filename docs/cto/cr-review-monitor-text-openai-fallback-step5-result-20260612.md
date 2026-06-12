# CR Review Result — Monitor Text OpenAI Fallback

FROM: CR
TO: CTO
DATE: 2026-06-12
BRANCH: `fix/monitor-text-openai-fallback`

## Initial Review

REVIEWED HEAD: `accab9c`
VERDICT: BLOCK

Finding:

- OpenAI non-2xx response handling included raw upstream response bodies in thrown errors.
- `safeProviderFailure` copied those messages into provider failure metadata.
- Final `MONITOR_SCORE_FAILED` serialized those provider failures.
- Risk: if a provider/proxy echoed a submitted API key or key fragment, the error path could leak it.

Other points:

- No canonical/matrix/ProductSSOT movement found.
- Provider provenance was explicit on success.
- Remaining `/api/test-claude` preflight caveat was correctly classified as live Anthropic availability, not a branch deterministic regression.

## Re-Review

REVIEWED HEAD: `2e0329c`
BLOCK FIX COMMIT: `5d9f324`
VERDICT: PASS

Resolution:

- Anthropic non-2xx errors now omit upstream body text.
- OpenAI non-2xx errors now omit upstream body text.
- Regression coverage forces fake Anthropic/OpenAI keys into failed provider bodies and verifies neither error messages nor serialized `providerFailures` leak them.

Verification reported by CR:

- `node --check src\lib\agents\renewal\monitorTextProducer.js` PASS.
- `npx vitest run tests/agents/renewal/monitorTextProducer.test.js` PASS — 81/81.
- No regression introduced by `5d9f324` found in reviewed scope.
