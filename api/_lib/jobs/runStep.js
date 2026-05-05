// Step execution body — used by both inline (today) and Inngest (tomorrow) paths.
// Importing this dynamically from inngest.js keeps the function definitions
// lazy so cold starts don't pay for code paths that aren't used.

import { callClaude } from '../claude.js';
import { crawl, summarisePageForPrompt } from '../crawler.js';
import {
  buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope,
  STEP_TOKENS, STEP_COMPLEXITY, STEP_LABELS,
} from '../stepPrompts.js';
import { appendCostEvent, recordRunStep, appendAuditEntry } from '../db.js';
import { logger } from '../logger.js';

export async function runStepInline({ step, input, objective, priorResults, pageContent, force, sessionId, orgId, productId, mode } = {}) {
  const t0 = Date.now();
  logger.info('step.started', { step, mode, orgId, productId, runId: sessionId, endpoint: '/api/run-step' });
  let pageBlock = pageContent || null;
  let pageMeta = null;

  if (!pageBlock && input?.type === 'url') {
    const page = await crawl(input.value, { force });
    if (page.ok) {
      pageBlock = summarisePageForPrompt(page);
      pageMeta = { method: page.method, jsRendered: page.jsRendered, warnings: page.warnings };
    } else {
      pageBlock = `Page fetch failed: ${page.reason}.`;
      pageMeta = { method: 'failed', reason: page.reason };
    }
  }

  const text = buildStepPrompt(step, { input, pageBlock, objective, priorResults });
  const finalPrompt = buildJsonEnvelopePrompt(step, text);

  const claude = await callClaude({
    prompt: finalPrompt,
    maxTokens: STEP_TOKENS[step] || 1500,
    complexity: STEP_COMPLEXITY[step] || 'routine',
    timeoutMs: 90000,
  });

  const display = stripJsonEnvelope(claude.text);
  const json = parseJsonEnvelope(claude.text);

  await appendCostEvent({ endpoint: '/api/run-step', sessionId, orgId, productId, ...claude }).catch(() => {});
  await recordRunStep({
    runId: sessionId, orgId, productId,
    stepKey: step, score: json?.score ?? null, verdict: json?.verdict ?? null,
    output: display, json, costUSD: undefined,
  }).catch(() => {});
  await appendAuditEntry({
    actionType: 'step_completed',
    orgId, productId, sessionId,
    productUrl: input?.type === 'url' ? input.value : null,
    severity: 'info',
    detail: { step, mode, score: json?.score ?? null },
  }).catch(() => {});

  const durationMs = Date.now() - t0;
  logger.info('step.completed', {
    step, mode, orgId, productId, runId: sessionId,
    durationMs,
    inputTokens: claude.usage?.input_tokens, outputTokens: claude.usage?.output_tokens,
    score: json?.score ?? null,
    endpoint: '/api/run-step',
  });

  return {
    ok: true,
    step,
    stepLabel: STEP_LABELS[step],
    mode,
    model: claude.model,
    text: display,
    raw: claude.text,
    json,
    score: json?.score ?? null,
    verdict: json?.verdict ?? null,
    topIssues: json?.topIssues ?? [],
    tags: json?.tags ?? [],
    page: pageMeta,
    usage: claude.usage,
    stop_reason: claude.stop_reason,
  };
}
