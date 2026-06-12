# CR Review Prompt — Monitor Text OpenAI Fallback

FROM: CTO
TO: CR
DATE: 2026-06-12
BRANCH: `fix/monitor-text-openai-fallback`
RUNTIME COMMIT: `879471a`

Review packet:

`docs/cto/monitor-text-openai-fallback-step5-review-packet-20260612.md`

Please review from evidence, regression, and governance posture:

1. No fabricated monitor evidence: fallback text must come from OpenAI only when Anthropic fails and OpenAI is configured.
2. Provider provenance must be explicit and not relabeled as Anthropic success.
3. API keys or tokens must not appear in returned envelopes, test output, or safe failure metadata.
4. No scoring/governance/ProductSSOT/VERIFIED movement occurs.
5. TIM fixture repairs are honest: Build reference proof now uses canonical Codex-first rows and admitted `codex` member.
6. Remaining `npm run preflight` failure is limited to live `/api/test-claude` external Anthropic availability.

Return PASS/BLOCK with exact file/line findings if blocked.
