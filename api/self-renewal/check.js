// POST /api/self-renewal/check
// Body: { url?, description?, pageContent?, sessionId?, productId? }
// Runs a Self-Renewal cycle (self-test → issues → optimise → upgrade candidates)
// using the same govern step prompt the Auto Runner uses.

import { setCorsHeaders, callClaude } from '../_lib/claude.js';
import { crawl, summarisePageForPrompt } from '../_lib/crawler.js';
import { recordCost } from '../_lib/cost.js';
import { append } from '../_lib/auditlog.js';
import { buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope } from '../_lib/stepPrompts.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { url, description, pageContent, sessionId, productId, force, objective } = req.body || {};

  let pageBlock = pageContent;
  let pageMeta = null;
  let input = description
    ? { type: 'description', value: description, name: 'Self-Renewal Input' }
    : url
    ? { type: 'url', value: url, name: 'Self-Renewal Input' }
    : null;

  if (!input) return res.status(400).json({ error: 'Provide either { url } or { description }.' });

  if (!pageBlock && input.type === 'url') {
    const page = await crawl(input.value, { force });
    if (page.ok) {
      pageBlock = summarisePageForPrompt(page);
      pageMeta = { method: page.method, jsRendered: page.jsRendered, warnings: page.warnings };
    } else {
      pageBlock = `Page fetch failed: ${page.reason}.`;
      pageMeta = { method: 'failed', reason: page.reason };
    }
  }

  const text = buildStepPrompt('govern', { input, pageBlock, objective });
  const finalPrompt = buildJsonEnvelopePrompt('govern', text);

  try {
    const claude = await callClaude({ prompt: finalPrompt, maxTokens: 1500, complexity: 'routine', timeoutMs: 90000 });
    const cost = recordCost({ endpoint: '/api/self-renewal/check', sessionId, ...claude });
    append({
      actionType: 'self_renewal_check',
      sessionId, productId,
      productUrl: input.type === 'url' ? input.value : null,
      severity: 'info',
      detail: { score: parseJsonEnvelope(claude.text)?.score ?? null },
    });
    return res.status(200).json({
      ok: true,
      text: stripJsonEnvelope(claude.text),
      json: parseJsonEnvelope(claude.text),
      page: pageMeta,
      model: claude.model,
      usage: claude.usage,
      cost,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Claude call failed', details: e.message || String(e) });
  }
}
