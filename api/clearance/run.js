// POST /api/clearance/run
// Body: { url?, description?, pageContent?, priorResults?, sessionId?, productId? }
// Runs the full clearance protocol — produces a CLEARED / CONDITIONAL / NOT CLEARED
// decision plus exact conditions to clear.
//
// Internally re-uses the "monitor" step prompt because that's where the clearance
// decision is produced in the existing engine.

import { setCorsHeaders, callClaude } from '../_lib/claude.js';
import { crawl, summarisePageForPrompt } from '../_lib/crawler.js';
import { recordCost } from '../_lib/cost.js';
import { append } from '../_lib/auditlog.js';
import { buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope } from '../_lib/stepPrompts.js';

const DECISION_RE = /CLEARANCE DECISION[\s\S]*?(CLEARED|CONDITIONAL|NOT\s*CLEARED)/i;

function extractDecision(text) {
  const m = text && text.match(DECISION_RE);
  if (!m) return 'UNKNOWN';
  return m[1].toUpperCase().replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { url, description, pageContent, priorResults, sessionId, productId, force, objective } = req.body || {};

  const input = description
    ? { type: 'description', value: description, name: 'Clearance Input' }
    : url
    ? { type: 'url', value: url, name: 'Clearance Input' }
    : null;

  if (!input) return res.status(400).json({ error: 'Provide either { url } or { description }.' });

  let pageBlock = pageContent;
  let pageMeta = null;
  if (!pageBlock && input.type === 'url') {
    const page = await crawl(input.value, { force });
    if (page.ok) {
      pageBlock = summarisePageForPrompt(page);
      pageMeta = { method: page.method, jsRendered: page.jsRendered };
    } else {
      pageBlock = `Page fetch failed: ${page.reason}.`;
      pageMeta = { method: 'failed', reason: page.reason };
    }
  }

  const text = buildStepPrompt('monitor', { input, pageBlock, objective: objective || 'full_governance', priorResults });
  const finalPrompt = buildJsonEnvelopePrompt('monitor', text);

  try {
    const claude = await callClaude({ prompt: finalPrompt, maxTokens: 1800, complexity: 'complex', timeoutMs: 90000 });
    const cost = recordCost({ endpoint: '/api/clearance/run', sessionId, ...claude });
    const display = stripJsonEnvelope(claude.text);
    const json = parseJsonEnvelope(claude.text);
    const decision = extractDecision(display);
    append({
      actionType: 'clearance_run',
      sessionId, productId,
      productUrl: input.type === 'url' ? input.value : null,
      severity: decision === 'NOT CLEARED' ? 'warning' : 'info',
      detail: { decision, score: json?.score ?? null },
    });
    return res.status(200).json({
      ok: true,
      decision,
      text: display,
      json,
      page: pageMeta,
      model: claude.model,
      usage: claude.usage,
      cost,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Claude call failed', details: e.message || String(e) });
  }
}
