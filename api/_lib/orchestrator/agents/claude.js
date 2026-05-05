// Claude / Anthropic agent.

import { callClaude } from '../../claude.js';
import { recordCost } from '../../cost.js';
import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';
import { validateClaudeInput } from '../contracts.js';

export const claudeAgent = {
  description: 'Anthropic Claude (Sonnet 4.6 / Opus 4.7) — text generation',
  isEnabled() { return Boolean(process.env.ANTHROPIC_API_KEY); },
  validate: validateClaudeInput,
  retry: { attempts: 2, backoffMs: 500 },
  async run({ ctx, prompt, systemPrompt, maxTokens = 1500, complexity = 'routine', timeoutMs = 90000, endpoint = '/api/orchestrator' }) {
    try {
      const claude = await callClaude({ prompt, systemPrompt, maxTokens, complexity, timeoutMs });
      recordCost({ endpoint, sessionId: ctx?.runId || ctx?.sessionId, ...claude });
      return successEnvelope({
        agent: 'claude',
        output: { text: claude.text, model: claude.model, usage: claude.usage, stop_reason: claude.stop_reason },
      });
    } catch (e) {
      const status = e.status;
      const code = status === 429 ? ErrorCodes.RATE_LIMITED
        : status >= 500 ? ErrorCodes.UPSTREAM_ERROR
        : e.name === 'AbortError' ? ErrorCodes.TIMEOUT
        : ErrorCodes.UPSTREAM_ERROR;
      return envelope({ agent: 'claude', code, message: e.message, retriable: code !== ErrorCodes.INVALID_INPUT, details: { status } });
    }
  },
  async health() {
    return { ok: this.isEnabled(), keyPresent: this.isEnabled() };
  },
};
