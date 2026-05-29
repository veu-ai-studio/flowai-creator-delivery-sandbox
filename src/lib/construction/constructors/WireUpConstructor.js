// src/lib/construction/constructors/WireUpConstructor.js
//
// WIRE_UP construction class implementation per CA-17 §2.
//
// Connects existing dead UI controls (catalogued by Phase B findings as
// e.g. category:'engine-error' on a click target, or category:'mock-only'
// signal) to real backend endpoints. The construction generates:
//
//   1. A real backend endpoint file (api/_lib or api/ Vercel function)
//      that replaces the stub the dead control was pointing at.
//   2. A frontend wiring patch to the originating page that connects
//      the dead control to the new endpoint (with appropriate error +
//      loading states).
//
// AI integration: extends the existing fixGenerator.js Anthropic call
// pattern. Same model cascade (FINAL_FALLBACK = claude-sonnet-4-6 with
// orchestrator-level cascade override), same prompt-injection guard
// (Panel condition C), same diff-mode validation.
//
// Class-specific caps per CA-17 §3.2: 1-5 files, ≤100 lines/file,
// ≤200 lines total, 0 new deps (the engine reuses existing project
// packages — Express handlers, Supabase client, validation libs).
//
// The constructor is INVOKED by ConstructionEngine.js after S1+S2+S6
// clear, BEFORE S4 + S5 + S8.

'use strict';

import { sanitiseAndTruncate, generateFix } from '../../../lib/agents/renewal/fixGenerator.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const FINAL_FALLBACK_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 16384;

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Extract the wire_up candidates from a Phase B findings array. A
 * wire_up candidate is a finding that signals a dead/unwired
 * interactive surface — categories engine-error (broken click handler),
 * broken-modal, broken-form, or the mock-only network-signature
 * heuristic.
 *
 * Returns at most `limit` candidates, ranked by severity then category.
 */
export function extractWireUpCandidates({ findings, limit = 5 }) {
  if (!Array.isArray(findings)) return [];
  const wireUpCategories = new Set(['engine-error', 'broken-modal', 'broken-form', 'dead-card']);
  const candidates = findings.filter((f) => {
    if (!f || typeof f !== 'object') return false;
    if (typeof f.category !== 'string') return false;
    if (wireUpCategories.has(f.category)) return true;
    if (f.category === 'engine-error' && /mock-only/i.test(String(f.evidence ?? ''))) return true;
    return false;
  });
  candidates.sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
  });
  return candidates.slice(0, limit);
}

/**
 * Build a wire_up construction prompt. Asks Claude for a unified diff
 * that adds a real backend endpoint + replaces the dead control wiring
 * with a fetch call to that endpoint.
 *
 * Prompt-injection-guarded; all operator/finding free text is
 * sanitised via sanitiseAndTruncate before being templated.
 */
export function buildWireUpPrompt({ finding, originPageContent, originPagePath, endpointHandlerPath, knownPackages }) {
  const safeEvidence = sanitiseAndTruncate(finding.evidence ?? '', 1200);
  const safeDescription = sanitiseAndTruncate(finding.description ?? '', 600);
  const safeRecommendation = sanitiseAndTruncate(finding.recommendation ?? '', 600);
  const pkgList = Object.keys(knownPackages ?? {}).slice(0, 30).join(', ') || '(none)';

  return [
    'You are a code repair assistant generating a WIRE_UP construction.',
    '',
    'WIRE_UP construction class (per FlowAI Build/Wire spec CA-17 §2):',
    '- Replace a dead UI control with a real wired path: generate a real backend endpoint, wire the frontend to it.',
    '- ≤5 files; ≤100 lines/file; ≤200 lines total; 0 new dependencies (use only already-installed packages).',
    '- Allowed packages (from package.json): ' + pkgList,
    '',
    'INPUT — Phase B finding (operator-influenced text has been sanitised):',
    `  Severity:        ${finding.severity ?? 'unknown'}`,
    `  Category:        ${finding.category ?? 'unknown'}`,
    `  Location:        ${finding.location ?? '(unknown)'}`,
    `  Evidence:        ${safeEvidence}`,
    `  Description:     ${safeDescription}`,
    `  Recommendation:  ${safeRecommendation}`,
    '',
    `Origin page file: ${originPagePath}`,
    `Target endpoint handler path (new file): ${endpointHandlerPath}`,
    '',
    'Return a JSON object with exactly the following shape, and NO commentary or markdown fences:',
    '{',
    '  "endpointHandler": {',
    '    "path": "<repo-relative path to the new backend handler file>",',
    '    "source": "<complete source code for the new handler — Vercel serverless function shape (export default handler) — using ONLY allowed packages>"',
    '  },',
    '  "framePatch": {',
    '    "path": "<the origin page file path>",',
    '    "diff": "<unified diff that replaces the dead control wiring with a fetch() to the new endpoint, preserving every other line>"',
    '  },',
    '  "summary": "<one sentence describing the wire-up>"',
    '}',
    '',
    'STRICT REQUIREMENTS:',
    '- endpointHandler.source MUST be a complete file (≤100 lines).',
    '- framePatch.diff MUST be a unified diff — preserve every import/export/route/url string outside the targeted change.',
    '- Do NOT introduce new third-party packages.',
    '- Do NOT change auth flow, redirects, or any line outside the targeted dead-control wiring.',
    '- If the requested wire-up is not safely achievable with the above rules, return an empty endpointHandler.source AND empty framePatch.diff — the engine will skip cleanly.',
    '',
    'Origin page content (verbatim between markers):',
    '────── BEGIN ORIGIN ──────',
    originPageContent.slice(0, 8000),
    '────── END ORIGIN ──────',
  ].join('\n');
}

/**
 * Parse Claude's wire_up response into the structured candidate object.
 * Throws on malformed JSON / shape mismatch so the engine can skip
 * cleanly with an audit entry.
 */
export function parseWireUpResponse(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw makeError('WIRE_UP_EMPTY_RESPONSE', 'WireUpConstructor: empty response from AI');
  }
  let cleaned = text.trim();
  // Strip optional code fences if the model didn't honor the rule.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (e) {
    throw makeError('WIRE_UP_PARSE_ERROR',
      `WireUpConstructor: response is not valid JSON — ${e?.message ?? String(e)}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw makeError('WIRE_UP_PARSE_ERROR', 'WireUpConstructor: parsed JSON is not an object');
  }
  if (!parsed.endpointHandler || typeof parsed.endpointHandler !== 'object') {
    throw makeError('WIRE_UP_PARSE_ERROR', 'WireUpConstructor: missing endpointHandler');
  }
  if (typeof parsed.endpointHandler.path !== 'string' || typeof parsed.endpointHandler.source !== 'string') {
    throw makeError('WIRE_UP_PARSE_ERROR', 'WireUpConstructor: endpointHandler.path / source must be strings');
  }
  if (!parsed.framePatch || typeof parsed.framePatch !== 'object') {
    throw makeError('WIRE_UP_PARSE_ERROR', 'WireUpConstructor: missing framePatch');
  }
  if (typeof parsed.framePatch.path !== 'string' || typeof parsed.framePatch.diff !== 'string') {
    throw makeError('WIRE_UP_PARSE_ERROR', 'WireUpConstructor: framePatch.path / diff must be strings');
  }
  return Object.freeze({
    endpointHandler: Object.freeze({
      path: parsed.endpointHandler.path,
      source: parsed.endpointHandler.source,
    }),
    framePatch: Object.freeze({
      path: parsed.framePatch.path,
      diff: parsed.framePatch.diff,
    }),
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  });
}

/**
 * Call Claude with the wire-up prompt. Extends the same Anthropic API
 * pattern as fixGenerator.js (x-api-key header, anthropic-version,
 * messages array).
 */
export async function callClaudeForWireUp({ prompt, opts }) {
  const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw makeError('WIRE_UP_NO_API_KEY',
      'WireUpConstructor: ANTHROPIC_API_KEY is required. Set the env var or pass opts.apiKey.');
  }
  const fetchImpl = typeof opts?.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('WIRE_UP_NO_FETCH', 'WireUpConstructor: fetch unavailable on globalThis');
  }
  const model = typeof opts?.model === 'string' && opts.model ? opts.model : FINAL_FALLBACK_MODEL;
  const maxTokens = Number.isFinite(opts?.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;

  const response = await fetchImpl(`${ANTHROPIC_API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch { /* ignore */ }
    throw makeError('WIRE_UP_API_ERROR',
      `WireUpConstructor: Anthropic returned ${response.status} ${response.statusText}: ${body.slice(0, 300)}`,
      { status: response.status });
  }
  let parsed;
  try { parsed = await response.json(); }
  catch (e) {
    throw makeError('WIRE_UP_API_ERROR',
      `WireUpConstructor: Anthropic response was not JSON — ${e?.message ?? String(e)}`);
  }
  const textBlocks = Array.isArray(parsed?.content) ? parsed.content.filter((b) => b?.type === 'text') : [];
  const text = textBlocks.map((b) => b.text ?? '').join('');
  return { text, parsed, stopReason: parsed?.stop_reason ?? null, model: parsed?.model ?? model };
}

/**
 * Top-level wire_up generator. Given a Phase B finding + the origin
 * page content + the project's package list, produces the candidate
 * file set (new handler + frame patch) for downstream gate validation.
 *
 * @param {object} args
 * @param {object} args.finding              — Phase B finding to remediate
 * @param {string} args.originPageContent
 * @param {string} args.originPagePath
 * @param {string} args.endpointHandlerPath
 * @param {object} args.knownPackages
 * @param {object} [args.opts]               — apiKey / model / fetch override (test seam)
 * @returns {Promise<{ candidate: object, response: object }>}
 */
export async function generateWireUp(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('WIRE_UP_BAD_ARGS', 'WireUpConstructor.generateWireUp: args required');
  }
  const required = ['finding', 'originPageContent', 'originPagePath', 'endpointHandlerPath'];
  for (const k of required) {
    if (args[k] === undefined || args[k] === null) {
      throw makeError('WIRE_UP_BAD_ARGS', `WireUpConstructor: ${k} required`);
    }
  }
  const prompt = buildWireUpPrompt({
    finding: args.finding,
    originPageContent: args.originPageContent,
    originPagePath: args.originPagePath,
    endpointHandlerPath: args.endpointHandlerPath,
    knownPackages: args.knownPackages ?? {},
  });
  const response = await callClaudeForWireUp({ prompt, opts: args.opts });
  if (!response.text || response.text.trim().length === 0) {
    throw makeError('WIRE_UP_EMPTY_RESPONSE', 'WireUpConstructor: model returned empty content');
  }
  const candidate = parseWireUpResponse(response.text);
  return Object.freeze({ candidate, response: Object.freeze({ model: response.model, stopReason: response.stopReason }) });
}

export const __internals = Object.freeze({
  ANTHROPIC_API_BASE, ANTHROPIC_API_VERSION, FINAL_FALLBACK_MODEL, DEFAULT_MAX_TOKENS,
});
