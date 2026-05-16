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
import { appendAuditEntry, appendClearanceCheck, appendCostEvent } from '../_lib/db.js';
import { resolveOrgId, resolveProductId } from '../_lib/tenant.js';
import { buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope } from '../_lib/stepPrompts.js';
import { requireAuthHard } from '../_lib/auth.js';

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

  // S-3 fix (W4 adversarial bd2f923): auth gate BEFORE body validation.
  if (!(await requireAuthHard(req, res))) return;

  const { url, description, pageContent, priorResults, sessionId, force, objective } = req.body || {};
  const orgId = resolveOrgId(req);
  const productId = req.body?.productId || resolveProductId(req);

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
    // Persist via db.js (memory or Supabase, depending on backend)
    await appendCostEvent({ endpoint: '/api/clearance/run', sessionId, orgId, productId, ...claude }).catch(() => {});
    await appendClearanceCheck({
      orgId, productId, runId: sessionId,
      decision, score: json?.score ?? null,
      conditions: json?.conditions || [],
      output: display,
    }).catch(() => {});
    await appendAuditEntry({
      actionType: 'clearance_run',
      orgId, productId, sessionId,
      productUrl: input.type === 'url' ? input.value : null,
      severity: decision === 'NOT CLEARED' ? 'warning' : 'info',
      detail: { decision, score: json?.score ?? null },
    }).catch(() => {});
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
