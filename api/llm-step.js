// POST /api/llm-step
// Body: { prompt: string, complexity?: 'routine'|'complex', maxTokens?: number }
// Used by Auto Runner / Guided / Manual to execute each step prompt.
// This replaces the base44.integrations.Core.InvokeLLM call so the app
// works without the Base44 backend.

import { setCorsHeaders, callClaude } from './_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { prompt, complexity = 'routine', maxTokens = 1500 } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Body must include non-empty "prompt" string.' });
  }

  // Cap token usage server-side regardless of caller request.
  const cappedTokens = Math.min(Math.max(parseInt(maxTokens, 10) || 1000, 100), 2000);

  try {
    const claude = await callClaude({
      prompt,
      maxTokens: cappedTokens,
      complexity,
      timeoutMs: 90000,
    });
    return res.status(200).json({
      text: claude.text,
      model: claude.model,
      usage: claude.usage,
      stop_reason: claude.stop_reason,
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Claude call failed',
      details: e.message || String(e),
      status: e.status,
    });
  }
}
