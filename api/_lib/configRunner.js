// Shared run lifecycle for the configuration modes (clone, synthesize,
// describe). Wraps the Claude call, persistence, telemetry, and clearance
// scoring so each mode endpoint stays focused on its prompt + payload shape.

import { callClaude } from './claude.js';
import { recordCost } from './cost.js';
import {
  appendCostEvent, appendAuditEntry, appendClearanceCheck,
} from './db.js';
import {
  createRun, updateRun, getRun, recordProductAudit,
} from './configRegistry.js';
import { logger } from './logger.js';

// ─── Lifecycle ────────────────────────────────────────────────────────────
//
//   const ctx = await runStart({ mode, orgId, productId, input, metadata });
//   try { ... await runClaude(ctx, prompt, opts) ... }
//   catch (err) { await runFail(ctx, err); throw err; }
//   await runComplete(ctx, { output, qualityScore });
//
// runClaude() can be called multiple times within a single run (e.g. clone
// does a snapshot pass then an analysis pass). All token counts roll up.

export async function runStart({ mode, orgId, productId, input, metadata, existingRunId }) {
  let run;
  if (existingRunId) {
    run = getRun(existingRunId);
    if (run) {
      // Promote the queued run to running
      run = updateRun(existingRunId, {
        status: 'running',
        input: input || run.input,
        metadata: metadata || run.metadata,
        progress: { step: 'started', percent: 5, etaSec: null },
      });
    }
  }
  if (!run) {
    run = createRun({ mode, orgId, productId, status: 'running', input, metadata });
  }
  await appendAuditEntry({
    actionType: `configuration.${mode}.started`,
    severity: 'info',
    orgId, productId,
    sessionId: run.id,
    detail: { mode, inputSummary: summariseInput(input) },
  }).catch(() => {});
  logger.info(`configuration.${mode}.started`, {
    orgId, productId, runId: run.id, mode,
  });
  return {
    run,
    mode,
    orgId,
    productId,
    totalUsage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    totalCostUSD: 0,
    t0: Date.now(),
  };
}

// Update the run's progress field and partial_output for the status endpoint
// to surface during execution. Safe to call multiple times.
export function setProgress(ctx, { step, percent, partial, etaSec }) {
  if (!ctx?.run?.id) return;
  const patch = {};
  if (step != null || percent != null || etaSec != null) {
    patch.progress = {
      step: step || ctx.run.progress?.step,
      percent: typeof percent === 'number' ? percent : (ctx.run.progress?.percent ?? 0),
      etaSec: etaSec ?? ctx.run.progress?.etaSec ?? null,
    };
  }
  if (partial !== undefined) patch.partial_output = partial;
  if (Object.keys(patch).length) updateRun(ctx.run.id, patch);
}

// One Claude call inside an active run. Records cost both in-process and via
// db.appendCostEvent. Returns the Claude response payload.
export async function runClaude(ctx, { prompt, systemPrompt, maxTokens = 1500, complexity = 'routine', timeoutMs = 90000, callLabel = 'claude' }) {
  const claude = await callClaude({ prompt, systemPrompt, maxTokens, complexity, timeoutMs });

  // Roll up usage
  for (const k of Object.keys(ctx.totalUsage)) {
    ctx.totalUsage[k] += claude.usage?.[k] || 0;
  }
  const cost = recordCost({
    endpoint: `/api/configuration/${ctx.mode}#${callLabel}`,
    sessionId: ctx.run.id,
    ...claude,
  });
  ctx.totalCostUSD += Number(cost?.estUSD || 0);

  await appendCostEvent({
    endpoint: `/api/configuration/${ctx.mode}#${callLabel}`,
    sessionId: ctx.run.id,
    orgId: ctx.orgId,
    productId: ctx.productId,
    ...claude,
  }).catch(() => {});

  return { ...claude, costUSD: cost?.estUSD || 0 };
}

export async function runComplete(ctx, { output, qualityScore } = {}) {
  const updated = updateRun(ctx.run.id, {
    status: 'completed',
    output: output || null,
    cost_usd: Number(ctx.totalCostUSD.toFixed(6)),
    quality_score: typeof qualityScore === 'number' ? qualityScore : null,
  });

  // Bump product cost + last-audit on the registry side
  if (ctx.productId) {
    recordProductAudit(ctx.productId, {
      score: typeof qualityScore === 'number' ? qualityScore : null,
      costUSD: ctx.totalCostUSD,
      lastRunId: ctx.run.id,
    }, { orgId: ctx.orgId });
  }

  await appendAuditEntry({
    actionType: `configuration.${ctx.mode}.completed`,
    severity: 'info',
    orgId: ctx.orgId, productId: ctx.productId,
    sessionId: ctx.run.id,
    detail: {
      mode: ctx.mode,
      durationMs: Date.now() - ctx.t0,
      costUSD: ctx.totalCostUSD,
      qualityScore: qualityScore ?? null,
      inputTokens: ctx.totalUsage.input_tokens,
      outputTokens: ctx.totalUsage.output_tokens,
    },
  }).catch(() => {});

  await appendClearanceCheck({
    orgId: ctx.orgId,
    productId: ctx.productId,
    runId: ctx.run.id,
    decision: clearanceDecisionFromScore(qualityScore),
    score: qualityScore ?? null,
    conditions: [],
    output: typeof output === 'string' ? output.slice(0, 4000) : JSON.stringify(output || {}).slice(0, 4000),
  }).catch(() => {});

  logger.info(`configuration.${ctx.mode}.completed`, {
    orgId: ctx.orgId, productId: ctx.productId, runId: ctx.run.id,
    durationMs: Date.now() - ctx.t0,
    costUSD: ctx.totalCostUSD,
    inputTokens: ctx.totalUsage.input_tokens,
    outputTokens: ctx.totalUsage.output_tokens,
    qualityScore: qualityScore ?? null,
  });

  return updated;
}

export async function runFail(ctx, err) {
  updateRun(ctx.run.id, {
    status: 'failed',
    error: err?.message || String(err),
    cost_usd: Number(ctx.totalCostUSD.toFixed(6)),
  });
  await appendAuditEntry({
    actionType: `configuration.${ctx.mode}.failed`,
    severity: 'warning',
    orgId: ctx.orgId, productId: ctx.productId,
    sessionId: ctx.run.id,
    detail: {
      mode: ctx.mode,
      error: err?.message || String(err),
      durationMs: Date.now() - ctx.t0,
      costUSD: ctx.totalCostUSD,
    },
  }).catch(() => {});
  logger.error(`configuration.${ctx.mode}.failed`, {
    orgId: ctx.orgId, productId: ctx.productId, runId: ctx.run.id,
    error: err?.message || String(err),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function summariseInput(input) {
  if (!input) return null;
  if (typeof input === 'string') return input.slice(0, 200);
  if (input.url) return { type: 'url', url: input.url };
  if (input.description) return { type: 'description', length: input.description.length };
  if (Array.isArray(input.inputs)) return { type: 'multi', count: input.inputs.length };
  return Object.keys(input);
}

// Map a 0-100 quality score to a clearance decision. Below 30 = NOT CLEARED,
// 30-69 = CONDITIONAL, 70+ = CLEARED. Null = UNKNOWN.
export function clearanceDecisionFromScore(score) {
  if (score == null || isNaN(score)) return 'UNKNOWN';
  const s = Number(score);
  if (s >= 70) return 'CLEARED';
  if (s >= 30) return 'CONDITIONAL';
  return 'NOT CLEARED';
}

// Extract a 0-100 score from Claude output. Looks for "QUALITY: X/100" or
// "SCORE: X" patterns; falls back to null.
export function extractQualityScore(text) {
  if (!text) return null;
  const patterns = [
    /QUALITY[^:]*:\s*(\d+(?:\.\d+)?)\s*\/\s*100/i,
    /OVERALL[^:]*:\s*(\d+(?:\.\d+)?)\s*\/\s*100/i,
    /SCORE[^:]*:\s*(\d+(?:\.\d+)?)\s*\/\s*100/i,
    /TOTAL[^:]*:\s*(\d+(?:\.\d+)?)\s*\/\s*100/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (!isNaN(n)) return Math.max(0, Math.min(100, n));
    }
  }
  return null;
}

export function parseFencedJson(text) {
  if (!text) return null;
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); }
  catch { return null; }
}

export function stripFencedJson(text) {
  if (!text) return '';
  return text.replace(/```json\s*[\s\S]*?```\s*$/i, '').trim();
}
