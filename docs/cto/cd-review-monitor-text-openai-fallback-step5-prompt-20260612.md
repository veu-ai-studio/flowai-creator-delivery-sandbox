# CD Review Prompt — Monitor Text OpenAI Fallback

FROM: CTO
TO: CD
DATE: 2026-06-12
BRANCH: `fix/monitor-text-openai-fallback`
RUNTIME COMMIT: `879471a`

Review packet:

`docs/cto/monitor-text-openai-fallback-step5-review-packet-20260612.md`

Scope:

- Runtime monitor text provider fallback in `src/lib/agents/renewal/monitorTextProducer.js`
- Monitor tests in `tests/agents/renewal/monitorTextProducer.test.js`
- Deterministic TIM/preflight repair in `src/lib/forge/verticalSliceRunner.js`
- Marketplace inventory count repair in `tests/marketplace_inventory.test.js`

Please review for architecture and maintainability:

1. Anthropic-first / OpenAI-fallback logic is provider-agnostic and consistent with SSOT direction.
2. Fallback does not bypass scoring; it still requires real LLM monitor text and fails closed if no configured provider succeeds.
3. Returned metadata is sufficient for provenance (`provider`, `fallbackFrom`) without leaking secrets.
4. Vertical-slice fixture now honestly selects admitted Codex Build member rather than invented `flowai-build-adapter`.
5. The full preflight caveat is external live Anthropic availability, not a deterministic code regression.

Return PASS/BLOCK with findings.
