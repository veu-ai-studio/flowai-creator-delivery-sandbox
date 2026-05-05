// Scheduled clearance check job body. Runs the same prompt as
// /api/clearance/run, but driven by Inngest events / cron.

import { callClaude } from '../claude.js';
import { crawl, summarisePageForPrompt } from '../crawler.js';
import { buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope } from '../stepPrompts.js';
import { appendCostEvent, appendClearanceCheck, appendAuditEntry, getProduct } from '../db.js';

const DECISION_RE = /CLEARANCE DECISION[\s\S]*?(CLEARED|CONDITIONAL|NOT\s*CLEARED)/i;

export async function runScheduledClearance({ productId, orgId, url } = {}) {
  let target = url;
  if (!target && productId) {
    const p = await getProduct(productId, { orgId });
    target = p?.url || null;
  }
  if (!target) return { ok: false, reason: 'No URL or product URL available' };

  const page = await crawl(target);
  const pageBlock = page.ok ? summarisePageForPrompt(page) : `Page fetch failed: ${page.reason}.`;

  const input = { type: 'url', value: target, name: 'Scheduled clearance' };
  const promptText = buildStepPrompt('monitor', { input, pageBlock, objective: 'full_governance' });
  const finalPrompt = buildJsonEnvelopePrompt('monitor', promptText);

  const claude = await callClaude({ prompt: finalPrompt, maxTokens: 1800, complexity: 'complex', timeoutMs: 90000 });
  const display = stripJsonEnvelope(claude.text);
  const json = parseJsonEnvelope(claude.text);
  const decisionMatch = display.match(DECISION_RE);
  const decision = decisionMatch ? decisionMatch[1].toUpperCase().replace(/\s+/g, ' ').trim() : 'UNKNOWN';

  await appendCostEvent({ endpoint: '/api/clearance/run.scheduled', orgId, productId, ...claude }).catch(() => {});
  await appendClearanceCheck({ orgId, productId, decision, score: json?.score ?? null, conditions: json?.conditions || [], output: display }).catch(() => {});
  await appendAuditEntry({
    actionType: 'clearance_run.scheduled',
    orgId, productId,
    productUrl: target,
    severity: decision === 'NOT CLEARED' ? 'warning' : 'info',
    detail: { decision, score: json?.score ?? null, source: 'inngest-cron' },
  }).catch(() => {});

  return { ok: true, decision, score: json?.score ?? null };
}
