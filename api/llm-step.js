// POST /api/llm-step
// Body: { prompt: string, complexity?: 'routine'|'complex', maxTokens?: number, sessionId?, endpoint? }
// Used by Auto Runner / Guided / Manual to execute step prompts.
// Replaces the base44.integrations.Core.InvokeLLM call so the app works
// without the Base44 backend.

import { setCorsHeaders, callClaude } from './_lib/claude.js';
import { recordCost } from './_lib/cost.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { prompt, complexity = 'routine', maxTokens = 1500, sessionId, endpoint = '/api/llm-step' } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Body must include non-empty "prompt" string.' });
  }

  const cappedTokens = Math.min(Math.max(parseInt(maxTokens, 10) || 1000, 100), 2000);

  try {
    const claude = await callClaude({ prompt, maxTokens: cappedTokens, complexity, timeoutMs: 90000 });
    const cost = recordCost({ endpoint, sessionId, ...claude });
    return res.status(200).json({
      text: claude.text,
      model: claude.model,
      usage: claude.usage,
      stop_reason: claude.stop_reason,
      cost,
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Claude call failed',
      details: e.message || String(e),
      status: e.status,
    });
  }
}
