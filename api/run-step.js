// POST /api/run-step
// Body: {
//   step: 'research'|'design'|'build'|'qa_audit'|'deploy'|'govern'|'gtm'|'monitor',
//   input: { type: 'url'|'description', value: string, name?: string },
//   objective?: string,
//   priorResults?: { research: '...', design: '...', ... }   // for monitor
//   pageContent?: string,    // optional pre-fetched page block; if absent we crawl
//   force?: 'browserless'|'playwright-endpoint'|'simple-fetch',
//   sessionId?: string,
//   mode?: 'auto'|'guided'|'manual'
// }
//
// Returns { ok, step, model, text, json, score, verdict, topIssues, tags, page, usage, cost }

import { setCorsHeaders, callClaude } from './_lib/claude.js';
import { crawl, summarisePageForPrompt } from './_lib/crawler.js';
import { recordCost } from './_lib/cost.js';
import {
  STEP_KEYS, STEP_LABELS, STEP_TOKENS, STEP_COMPLEXITY,
  buildStepPrompt, buildJsonEnvelopePrompt, parseJsonEnvelope, stripJsonEnvelope,
} from './_lib/stepPrompts.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const {
    step, input = {}, objective, priorResults, pageContent,
    force, sessionId, mode = 'auto',
  } = req.body || {};

  if (!STEP_KEYS.includes(step)) {
    return res.status(400).json({ error: `Unknown step "${step}". Use one of: ${STEP_KEYS.join(', ')}.` });
  }
  if (!input || typeof input.value !== 'string' || !input.value.trim()) {
    return res.status(400).json({ error: 'Body must include input { type, value }.' });
  }

  // Crawl if URL input and no page content was passed in.
  let pageBlock = pageContent || null;
  let pageMeta = null;
  if (!pageBlock && input.type === 'url') {
    const page = await crawl(input.value, { force });
    if (page.ok) {
      pageBlock = summarisePageForPrompt(page);
      pageMeta = {
        method: page.method,
        jsRendered: page.jsRendered,
        title: page.title,
        metaDescription: page.metaDescription,
        warnings: page.warnings,
      };
    } else {
      pageBlock = `Page fetch failed: ${page.reason}. Provide a Browserless API key for full crawling.`;
      pageMeta = { method: 'failed', reason: page.reason, attempts: page.attempts };
    }
  }

  const textPrompt = buildStepPrompt(step, { input, pageBlock, objective, priorResults });
  const finalPrompt = buildJsonEnvelopePrompt(step, textPrompt);

  try {
    const claude = await callClaude({
      prompt: finalPrompt,
      maxTokens: STEP_TOKENS[step] || 1500,
      complexity: STEP_COMPLEXITY[step] || 'routine',
      timeoutMs: 90000,
    });
    const cost = recordCost({ endpoint: '/api/run-step', sessionId, ...claude });

    const json = parseJsonEnvelope(claude.text);
    const display = stripJsonEnvelope(claude.text);

    return res.status(200).json({
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
      cost,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      step,
      error: 'Claude call failed',
      details: e.message || String(e),
      status: e.status,
    });
  }
}
