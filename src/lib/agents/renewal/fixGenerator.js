/**
 * Fix generator — Self-Renewal §4.1 + Panel condition C (prompt-injection
 * guard on evidence fields).
 *
 * Takes one file's current content + a list of Five-Layer assessment
 * findings, calls Claude via the Anthropic Messages API, and returns the
 * fixed file content. Phase A scope: ONE file per call (MAX_FILES=1).
 *
 * Prompt-injection guard (Panel condition C):
 *   Operator-influenced text fields (issue.evidence, issue.description,
 *   issue.recommendation) are sanitised BEFORE templating into the
 *   Claude prompt. Patterns that resemble prompt-injection attempts
 *   are stripped to '[REDACTED-INJECTION-PATTERN]'. All free-text
 *   fields are also truncated to MAX_EVIDENCE_CHARS so a malicious
 *   long-evidence finding cannot consume the full prompt budget.
 *
 * Model selection: `claude-sonnet-4-6` is the fix-generation model per
 * Cluster F. The Cluster F primary cascade is consulted via opts.model
 * when wired by the orchestrator; absent that, this module uses the
 * fallback directly. (Per session rules: never hardcode "the" model
 * name — the cascade is the source of truth. The constant here is
 * named with FALLBACK to make the role explicit.)
 *
 * API key (ANTHROPIC_API_KEY) never logged. Same posture as the
 * GitHub-token modules.
 */

'use strict';

import { buildDiffPrompt, applyAndValidate as applyAndValidateDiff } from './diffEditor.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const FINAL_FALLBACK_MODEL = 'claude-sonnet-4-6';
const AUTHORIZED_FIX_MODEL_PREFERENCE = Object.freeze([
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
]);
// DISPATCH 29: bumped from 4096 → 16384 because real fix-target files
// (BillingSubscriptionManager.jsx, HomeScreen.jsx) clocked in at >4K
// tokens and Claude truncated mid-statement, producing files like
// `padding: '8px 14px',` with no closing brace. Vercel build error
// (esbuild "Expected identifier but found end of file") confirmed the
// truncation. 16K matches Sonnet 4.6's comfortable output budget and
// fits the largest renewal-target files in the MyPregLife repo.
const DEFAULT_MAX_TOKENS = 16384;
const MAX_EVIDENCE_CHARS = 500;
const DEFAULT_SCORING_CRITERIA = [
  'CEO target: 95/100 verified product quality.',
  'L1 Functionality: user journeys work end-to-end without broken UI, runtime errors, dead controls, or failed core flows.',
  'L2 Operational: app is reliable, observable, performant enough for normal use, and avoids avoidable network/runtime failures.',
  'L3 Financial: product experience supports revenue capture, conversion, onboarding clarity, and credible monetization paths.',
  'L4 Business: positioning, information architecture, trust signals, and workflows match the intended audience and business goal.',
  'L5 GTM/UI: product is demo-ready, responsive, accessible, typo-free, navigable, and polished on customer-facing surfaces.',
  'Scoring honesty: measured criteria earn full points, inferred criteria earn partial points, and human-required criteria stay unclaimed.',
].join('\n');

// Prompt-injection patterns per Panel condition C. Conservative — only
// removes text that looks like an instruction-override attempt; benign
// text that incidentally matches one of these is over-redacted, which
// is the safer failure mode per spec §6a.4 "false-positives accepted".
const INJECTION_PATTERNS = Object.freeze([
  /ignore previous instructions/gi,
  /ignore all prior instructions/gi,
  /disregard (?:all )?(?:previous|prior) instructions/gi,
  /system:\s*/gi,
  /<\|.*?\|>/g,
  /###\s*(system|instruction|assistant|user)\b[^\n]*/gi,
  /\[\s*(system|instruction)\s*\][^\n]*/gi,
]);

const REDACTION_MARKER = '[REDACTED-INJECTION-PATTERN]';

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) {
    // Strip anything that could carry the API key or raw response.
    if (k !== 'apiKey' && k !== 'api_key' && k !== 'authorization' && k !== 'x-api-key') {
      err[k] = v;
    }
  }
  return err;
}

export async function resolveAuthorizedFixModels({ apiKey, fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey || typeof fetchImpl !== 'function') {
    throw makeError('FIX_MODEL_CATALOG_UNAVAILABLE', 'resolveAuthorizedFixModels: API key and fetch are required');
  }
  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_API_BASE}/v1/models?limit=100`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_API_VERSION },
    });
  } catch (error) {
    throw makeError('FIX_MODEL_CATALOG_UNAVAILABLE', `resolveAuthorizedFixModels: catalog network error — ${error?.message ?? String(error)}`);
  }
  if (!response.ok) {
    throw makeError('FIX_MODEL_CATALOG_UNAVAILABLE', `resolveAuthorizedFixModels: catalog returned ${response.status}`, { status: response.status });
  }
  const payload = await response.json();
  const available = new Set((Array.isArray(payload?.data) ? payload.data : []).map((entry) => entry?.id).filter(Boolean));
  const selected = AUTHORIZED_FIX_MODEL_PREFERENCE.filter((model) => available.has(model)).slice(0, 2);
  if (selected.length < 2) {
    throw makeError('FIX_MODEL_FALLBACK_UNAVAILABLE', 'resolveAuthorizedFixModels: two authorized coding-capable Sonnet models are required');
  }
  return Object.freeze({ primary: selected[0], fallback: selected[1], candidates: Object.freeze(selected) });
}

/**
 * Sanitise a single string against the injection-pattern list and
 * truncate to MAX_EVIDENCE_CHARS.
 *
 * @param {string} input
 * @param {number} [maxChars=MAX_EVIDENCE_CHARS]
 * @returns {string}
 */
export function sanitiseAndTruncate(input, maxChars = MAX_EVIDENCE_CHARS) {
  if (typeof input !== 'string') return '';
  let out = input;
  for (const re of INJECTION_PATTERNS) {
    out = out.replace(re, REDACTION_MARKER);
  }
  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars)}…[truncated]`;
  }
  return out;
}

/**
 * Sanitise an array of findings. Each finding's free-text fields
 * (evidence, description, recommendation, message, summary) are
 * sanitised + truncated. Non-string fields pass through unchanged
 * (numbers, booleans, structured shapes that don't contain operator
 * free-text).
 *
 * @param {Array<object>} findings
 * @returns {Array<object>}
 */
export function sanitiseFindings(findings) {
  if (!Array.isArray(findings)) return [];
  const TEXT_FIELDS = ['evidence', 'description', 'recommendation', 'message', 'summary', 'detail'];
  return findings.map((f) => {
    if (!f || typeof f !== 'object') return f;
    const cleaned = { ...f };
    for (const field of TEXT_FIELDS) {
      if (typeof cleaned[field] === 'string') {
        cleaned[field] = sanitiseAndTruncate(cleaned[field]);
      }
    }
    return cleaned;
  });
}

// DISPATCH 30 — minimal-change guardrails. These rules are appended to
// every fixGenerator prompt (both fresh attempts and retries). Sourced
// from the verbatim MyPregLife 88→83 regression observed in D29: Claude
// returned syntactically-valid output that introduced 3 new high-severity
// network-failure findings by changing existing fetch calls / imports /
// routing. The fix shipped was technically a fix; functionally it broke
// things. These rules block that failure mode.
const MINIMAL_CHANGE_GUARDRAILS = [
  '',
  'MINIMAL-CHANGE GUARDRAILS (DISPATCH 30 — non-negotiable):',
  '- Make the MINIMAL targeted change required to resolve the specific finding above. Do NOT refactor.',
  '- PRESERVE every existing import, export, prop, hook call, and function signature exactly. Do not remove or rename them.',
  '- PRESERVE every existing fetch / API call / route / URL string. Do not add, remove, replace, or modify them.',
  '- PRESERVE every existing component name and JSX element structure outside the targeted change.',
  '- Do NOT introduce new network calls, third-party libraries, env-vars, or external dependencies.',
  '- Do NOT change error-handling behavior, redirects, navigation, or auth flow.',
  '- Lines outside the targeted change region must appear in the output BYTE-FOR-BYTE identical to the input.',
  '- If the requested fix would require any of the above, return the file UNCHANGED (the orchestrator will skip it cleanly).',
  '',
  'NEGATIVE EXAMPLE (do NOT do this):',
  '  A prior fixGenerator run on MyPregLife was asked to address a Stripe payment-flow finding. The model rewrote',
  '  Stripe webhook handlers, swapped existing fetch endpoints, and re-routed onClick handlers. The output was',
  '  syntactically valid but caused 3 new HIGH-severity network-failure findings on the deployed preview because',
  '  routes that previously worked now returned 4xx. Score regressed 88→83. NEVER ship that kind of change.',
  '  Correct behavior: change only the one specific line/block named in the fix instruction; touch nothing else.',
].join('\n');

/**
 * Build the precise-instruction Claude prompt (DISPATCH 23 upgrade;
 * DISPATCH 30 minimal-change guardrails).
 * Used when caller provides a specific `fix` instruction string.
 *
 * @param {object} args
 * @param {string} args.filePath
 * @param {string} args.fileContent
 * @param {string} args.issue   — sanitised problem description
 * @param {string} args.fix     — sanitised precise change instruction
 * @param {boolean} [args.retry] — true on the second attempt → uses
 *                                 a more explicit prompt that emphasises
 *                                 returning the COMPLETE file (no
 *                                 truncation / no diff / no preamble)
 * @returns {string}
 */
export function buildPreciseInstructionPrompt({ filePath, fileContent, issue, fix, retry = false }) {
  if (retry) {
    return [
      'You are a code repair assistant. Your previous response was rejected because it was empty, identical to the input, or appeared truncated.',
      '',
      'Make EXACTLY this change to this file:',
      fix,
      '',
      'The issue being fixed:',
      issue,
      '',
      `File path: ${filePath}`,
      'Current file content (verbatim, between the BEGIN/END markers):',
      '',
      '────────── BEGIN FILE ──────────',
      fileContent,
      '────────── END FILE ──────────',
      '',
      'STRICT REQUIREMENTS:',
      '- Return ONLY the complete fixed file content.',
      '- Do NOT include explanation, preamble, markdown code fences, or commentary.',
      '- The response MUST be the entire file from first line to last (do not truncate).',
      '- The response MUST be meaningfully different from the input (do not echo unchanged).',
      '- Preserve the file format (JavaScript/JSX/TypeScript/Markdown/etc.) and existing code style.',
      MINIMAL_CHANGE_GUARDRAILS,
    ].join('\n');
  }
  return [
    'You are a code repair assistant.',
    '',
    'Make exactly this change to this file:',
    fix,
    '',
    'The issue being fixed:',
    issue,
    '',
    `File path: ${filePath}`,
    'Current file content:',
    fileContent,
    '',
    'Return ONLY the complete fixed file. No explanation. No markdown code fences. No preamble.',
    MINIMAL_CHANGE_GUARDRAILS,
  ].join('\n');
}

/**
 * Run a build-safe parse check against generated source content using
 * esbuild's transform — the SAME parser Vite uses on Vercel. If
 * esbuild can't parse it, neither can Vite, and the deploy will fail
 * at build-time with `[vite:esbuild] Transform failed`. Catching it
 * here (before commit + deploy) is the load-bearing safety gate.
 *
 * For non-code files (markdown, json, txt), returns { ok: true }
 * without running esbuild. JSON is parsed with native JSON.parse for
 * a comparable structural check.
 *
 * DISPATCH 29 (P0): added because Sonnet 4.6 truncated fix output at
 * the previous 4K token cap, producing files that ended mid-string
 * literal. The brace/paren tolerance check missed them because brace
 * counts can be off in valid JSX (strings containing braces, etc.).
 *
 * @param {string} content
 * @param {string} filePath
 * @returns {Promise<{ ok: boolean, reason?: string, detail?: string }>}
 */
export async function parseCheckContent(content, filePath) {
  if (typeof content !== 'string' || content.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const isJs = /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath);
  const isJson = /\.json$/.test(filePath);
  if (isJson) {
    try { JSON.parse(content); return { ok: true }; }
    catch (e) { return { ok: false, reason: 'json_parse_error', detail: e?.message ?? String(e) }; }
  }
  if (!isJs) {
    // Markdown, txt, html, etc. — no parser available; trust the
    // structural-balance check upstream.
    return { ok: true };
  }
  // Use esbuild's transform — same as Vite. Lazy-loaded so tests
  // without the package still work; production has it as a transitive
  // dep through Vite.
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    // esbuild unavailable — fall through to "ok"; the upstream
    // brace/paren balance check is the only remaining gate.
    return { ok: true, reason: 'esbuild_unavailable' };
  }
  const loader = /\.(jsx|tsx)$/.test(filePath) ? 'tsx'
    : /\.tsx?$/.test(filePath) ? 'ts'
    : 'jsx';                                         // .js / .mjs / .cjs treated as JSX-permissive
  try {
    esbuild.transformSync(content, {
      loader,
      sourcefile: filePath,
      logLevel: 'silent',
      // We only care about parse-time correctness; no minification or
      // tree-shaking concerns at this gate.
    });
    return { ok: true };
  } catch (e) {
    const msg = e?.errors?.[0]?.text ?? e?.message ?? String(e);
    return { ok: false, reason: 'parse_error', detail: msg };
  }
}

/**
 * Validate Claude's output before returning it. DISPATCH 23 upgrade.
 * DISPATCH 29: added parse-check via esbuild (same parser as Vite).
 *
 * Checks performed:
 *   1. Non-empty
 *   2. Different from input (meaningful diff — not whitespace-only)
 *   3. Basic syntax sanity (balanced braces/parens) for code files
 *   4. Build-safe parse check (esbuild for JS/JSX/TS, JSON.parse for .json)
 *
 * @param {string} fixed
 * @param {string} original
 * @param {string} filePath
 * @param {object} [opts]
 * @param {boolean} [opts.skipParseCheck=false] — bypass step 4 (tests/legacy)
 * @returns {Promise<{ ok: boolean, reason?: string, detail?: string }>}
 */
export async function validateFixedContent(fixed, original, filePath, opts = {}) {
  if (typeof fixed !== 'string' || fixed.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (fixed === original) {
    return { ok: false, reason: 'identical' };
  }
  // Whitespace-only difference is effectively no change.
  if (fixed.replace(/\s+/g, ' ').trim() === original.replace(/\s+/g, ' ').trim()) {
    return { ok: false, reason: 'whitespace_only' };
  }
  // For code files, sanity-check brace + paren balance. Markdown / JSON
  // pass through this check trivially. JSX / template literals can have
  // legitimate unbalanced punctuation inside strings, so we use a
  // permissive threshold rather than strict equality.
  const isCodeFile = /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath);
  if (isCodeFile) {
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openParens = (fixed.match(/\(/g) || []).length;
    const closeParens = (fixed.match(/\)/g) || []).length;
    // Tolerate small skew (literal { in strings, etc.) but reject
    // wildly unbalanced output that suggests Claude truncated mid-block.
    if (Math.abs(openBraces - closeBraces) > 3) {
      return { ok: false, reason: `unbalanced_braces:${openBraces}vs${closeBraces}` };
    }
    if (Math.abs(openParens - closeParens) > 3) {
      return { ok: false, reason: `unbalanced_parens:${openParens}vs${closeParens}` };
    }
  }
  // DISPATCH 29: load-bearing build-safe gate.
  if (!opts.skipParseCheck) {
    const parseResult = await parseCheckContent(fixed, filePath);
    if (!parseResult.ok && parseResult.reason !== 'esbuild_unavailable') {
      return { ok: false, reason: parseResult.reason, detail: parseResult.detail };
    }
  }
  return { ok: true };
}

/**
 * Build the Claude prompt body.
 *
 * @param {object} args
 * @param {string} args.filePath
 * @param {string} args.fileContent
 * @param {Array<object>} args.sanitisedFindings
 * @returns {string}
 */
function buildPrompt({ filePath, fileContent, sanitisedFindings }) {
  const findingsText = sanitisedFindings
    .map((f, i) => {
      const parts = [`Finding ${i + 1}:`];
      if (f.severity) parts.push(`  Severity: ${f.severity}`);
      if (f.category) parts.push(`  Category: ${f.category}`);
      if (f.message)  parts.push(`  Message: ${f.message}`);
      if (f.description) parts.push(`  Description: ${f.description}`);
      if (f.evidence) parts.push(`  Evidence: ${f.evidence}`);
      if (f.fix) parts.push(`  Prior recommendation: ${f.fix}`);
      if (f.proposedFix) parts.push(`  Prior recommendation: ${f.proposedFix}`);
      if (f.recommendation) parts.push(`  Recommendation: ${f.recommendation}`);
      return parts.join('\n');
    })
    .join('\n\n');
  return (
    'You are a code repair assistant. ' +
    'The following file has issues that need to be fixed. ' +
    'Return ONLY the complete fixed file content with no explanation, ' +
    'no markdown code blocks, no preamble.\n\n' +
    `File: ${filePath}\n\n` +
    'Issues found:\n' +
    `${findingsText}\n\n` +
    'Current file content:\n' +
    fileContent +
    `\n${MINIMAL_CHANGE_GUARDRAILS}`
  );
}

function buildLLMFileReplacementPrompt({
  filePath,
  fileContent,
  sanitisedFindings,
  userDescription,
  scoringCriteria,
  sourceContext,
}) {
  const findingsText = sanitisedFindings
    .map((f, i) => {
      const parts = [`Finding ${i + 1}:`];
      if (f.id || f.findingId) parts.push(`  ID: ${f.id ?? f.findingId}`);
      if (f.severity) parts.push(`  Severity: ${f.severity}`);
      if (f.category) parts.push(`  Category: ${f.category}`);
      if (f.location || f.url || f.pageUrl) parts.push(`  Location: ${f.location ?? f.url ?? f.pageUrl}`);
      if (f.scoringDimension) parts.push(`  Scoring dimension: ${f.scoringDimension}`);
      if (f.message) parts.push(`  Message: ${f.message}`);
      if (f.title) parts.push(`  Title: ${f.title}`);
      if (f.issue) parts.push(`  Issue: ${f.issue}`);
      if (f.description) parts.push(`  Description: ${f.description}`);
      if (f.evidence) parts.push(`  Evidence: ${f.evidence}`);
      if (f.recommendation) parts.push(`  Recommendation: ${f.recommendation}`);
      return parts.join('\n');
    })
    .join('\n\n');
  return [
    'You are FlowAI\'s senior product-upgrade engineer. Generate a real app-layer product improvement, not a cosmetic patch.',
    '',
    'INPUTS YOU MUST USE:',
    `- Source file path: ${filePath}`,
    `- User request: ${sanitiseAndTruncate(userDescription ?? '', 2000) || '(none supplied)'}`,
    '- Findings:',
    findingsText || '(none supplied)',
    '- Scoring criteria:',
    scoringCriteria || DEFAULT_SCORING_CRITERIA,
    '- Additional source context:',
    typeof sourceContext === 'string' && sourceContext.trim()
      ? sanitiseAndTruncate(sourceContext, 4000)
      : '(none supplied)',
    '',
    'WHAT TO GENERATE:',
    '- A complete replacement for the entire file below.',
    '- Fixes that can genuinely improve L1-L5 scoring: components, layout, navigation, content, copy, CSS, responsive design, accessibility, and business/GTM clarity.',
    '- Prefer coherent product experience improvements over tiny defensive error-handler edits.',
    '- Preserve imports/exports/public interfaces unless a safe app-layer improvement requires changing them.',
    '- Do not add dependencies unless already present in the source.',
    '',
    'SSOT §11 PLATFORM BOUNDARY:',
    '- Do NOT modify Base44 SDK clients, auth/authorization gates, requiresAuth, platform config, database schema, credentials, or third-party secrets.',
    '- If the only possible fix is platform/auth/internal, return the original file unchanged and set rationale to PLATFORM_BOUNDARY_BLOCKED.',
    '',
    'RESPONSE FORMAT:',
    'Return ONLY strict JSON. No markdown. No code fences. No prose outside JSON.',
    '{',
    '  "scoringDimension": "L1|L2|L3|L4|L5",',
    '  "confidence": 0-100,',
    '  "rationale": "1-2 sentences explaining why this complete replacement should improve the score",',
    '  "fixedContent": "COMPLETE replacement file content, escaped as a JSON string"',
    '}',
    '',
    `BEGIN CURRENT FILE: ${filePath}`,
    fileContent,
    'END CURRENT FILE',
  ].join('\n');
}

function parseStructuredFixResponse(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { fixedContent: '', scoringDimension: null, rationale: null, confidence: null, structured: false };
  }
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && typeof parsed.fixedContent === 'string') {
      return {
        fixedContent: parsed.fixedContent,
        scoringDimension: typeof parsed.scoringDimension === 'string' ? parsed.scoringDimension : null,
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : null,
        confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : null,
        structured: true,
      };
    }
  } catch { /* raw complete-file fallback for legacy tests and older prompts */ }
  return { fixedContent: text, scoringDimension: null, rationale: null, confidence: null, structured: false };
}

/**
 * Extract the response text from an Anthropic Messages API response.
 *
 * @param {object} parsed
 * @returns {string}
 */
function extractText(parsed) {
  if (!parsed || !Array.isArray(parsed.content)) return '';
  const textBlocks = parsed.content.filter((b) => b && b.type === 'text');
  return textBlocks.map((b) => b.text ?? '').join('');
}

/**
 * Generate a fix for a single file using Claude.
 *
 * DISPATCH 23 upgrade: accepts EITHER the legacy `findings` array OR a
 * precise `{ issue, fix }` instruction pair. When both are absent, throws.
 * When `fix` is provided, uses the precise-instruction prompt; otherwise
 * falls back to the findings-based prompt for backward compatibility.
 *
 * Adds validation (non-empty / different from input / balanced braces
 * for code files) and a one-time retry with a more explicit prompt
 * when validation fails on the first attempt.
 *
 * @param {object} args
 * @param {string} args.filePath
 * @param {string} args.fileContent
 * @param {Array<object>} [args.findings]   — legacy multi-finding shape
 * @param {string} [args.issue]             — DISPATCH 23: problem description
 * @param {string} [args.fix]               — DISPATCH 23: precise change instruction
 * @param {string} args.productId
 * @param {string} args.runId
 * @param {object} [args.opts]
 * @param {string} [args.opts.model]      — model id; defaults to FINAL_FALLBACK_MODEL
 * @param {string} [args.opts.apiKey]     — default: process.env.ANTHROPIC_API_KEY
 * @param {typeof fetch} [args.opts.fetch] — default: globalThis.fetch (overridable for tests)
 * @param {number} [args.opts.maxTokens]  — default: DEFAULT_MAX_TOKENS
 *
 * @returns {Promise<{ fixedContent: string, model: string, promptTokens: number, completionTokens: number, attempts: number, validationReason?: string }>}
 */
export async function generateFix(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('FIX_GENERATION_FAILED', 'generateFix: args object required');
  }
  const required = ['filePath', 'fileContent', 'productId', 'runId'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: ${k} must be a non-empty string`);
    }
  }
  const hasPreciseInstruction = typeof args.fix === 'string' && args.fix.length > 0
    && typeof args.issue === 'string' && args.issue.length > 0;
  const hasFindings = Array.isArray(args.findings) && args.findings.length > 0;
  if (!hasPreciseInstruction && !hasFindings) {
    throw makeError('FIX_GENERATION_FAILED',
      'generateFix: either (issue + fix) precise-instruction pair OR a non-empty findings array required');
  }

  const opts = args.opts ?? {};
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw makeError('FIX_GENERATION_FAILED',
      'generateFix: ANTHROPIC_API_KEY is required. ' +
      'Set process.env.ANTHROPIC_API_KEY (Doppler key in production) or pass opts.apiKey.');
  }
  const maxTokens = Number.isFinite(opts.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('FIX_GENERATION_FAILED',
      'generateFix: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }
  const resolvedModels = opts.resolveAuthorizedModels === true
    ? await resolveAuthorizedFixModels({ apiKey, fetch: fetchImpl })
    : null;
  const modelCandidates = resolvedModels?.candidates
    ?? Object.freeze([typeof opts.model === 'string' && opts.model ? opts.model : FINAL_FALLBACK_MODEL]);

  // Full-file replacement is the default. Earlier dispatches defaulted
  // precise instructions to diff-mode, which kept changes too narrow and
  // repeatedly produced cosmetic patches. FlowAI's core path now asks
  // Claude for a scoring-aware complete file replacement. Diff-mode
  // remains available only when a caller explicitly requests it.
  const mode = opts.mode === 'diff' ? 'diff' : 'full';

  // Build the appropriate prompt based on mode + which input shape.
  let prompt;
  if (mode === 'diff') {
    prompt = buildDiffPrompt({
      filePath: args.filePath,
      fileContent: args.fileContent,
      issue: sanitiseAndTruncate(args.issue, 1000),
      fix: sanitiseAndTruncate(args.fix, 2000),
    });
  } else {
    const sanitisedFindings = sanitiseFindings(args.findings);
    const findingsForPrompt = hasFindings
      ? sanitisedFindings
      : [{
          severity: args.severity ?? 'medium',
          category: args.category ?? null,
          issue: sanitiseAndTruncate(args.issue, 1000),
          recommendation: sanitiseAndTruncate(args.fix, 2000),
        }];
    prompt = buildLLMFileReplacementPrompt({
      filePath: args.filePath,
      fileContent: args.fileContent,
      sanitisedFindings: findingsForPrompt,
      userDescription: opts.userDescription ?? args.userDescription ?? '',
      scoringCriteria: opts.scoringCriteria ?? args.scoringCriteria ?? DEFAULT_SCORING_CRITERIA,
      sourceContext: opts.sourceContext ?? args.sourceContext ?? '',
    });
  }

  // Attempt up to 2 calls: first with the standard prompt, second with
  // the explicit retry prompt if validation fails on the first.
  async function callClaude(currentPrompt, startIndex = 0) {
    let response;
    let usedModel = modelCandidates[Math.min(startIndex, modelCandidates.length - 1)];
    for (let index = Math.min(startIndex, modelCandidates.length - 1); index < modelCandidates.length; index += 1) {
      usedModel = modelCandidates[index];
      try {
        response = await fetchImpl(`${ANTHROPIC_API_BASE}/v1/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_API_VERSION,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: usedModel,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: currentPrompt }],
          }),
        });
      } catch (e) {
        if (index + 1 < modelCandidates.length) continue;
        throw makeError('FIX_GENERATION_FAILED', `generateFix: network error calling Anthropic API — ${e?.message ?? String(e)}`);
      }
      if (response.ok) break;
      if (index + 1 < modelCandidates.length && [404, 429, 529].includes(response.status)) continue;
      let bodyText = '';
      try { bodyText = await response.text(); } catch { /* ignore */ }
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: Anthropic returned ${response.status} ${response.statusText}. Body: ${bodyText.slice(0, 300)}`,
        { status: response.status, model: usedModel });
    }
    let parsed;
    try {
      parsed = await response.json();
    } catch (e) {
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: Anthropic response was not JSON — ${e?.message ?? String(e)}`);
    }
    return { text: extractText(parsed), parsed, stopReason: parsed?.stop_reason ?? null, model: usedModel };
  }

  // DISPATCH 32 T2: diff-mode applies the model's response (a unified
  // diff) to the original content before running validation. The diff
  // editor enforces the structural preserve rules (no touching
  // import/export/fetch/route/URL outside the change region, bounded
  // change-ratio). If the diff is empty (no @@ hunks), the prompt
  // contract says the orchestrator should skip the file cleanly →
  // surfaced as FIX_NO_CHANGE.
  async function diffModeAttempt(currentPrompt, startIndex = 0) {
    const c = await callClaude(currentPrompt, startIndex);
    if (c.stopReason === 'max_tokens') {
      return { ok: false, reason: 'truncated_max_tokens', call: c };
    }
    const diffText = (c.text ?? '').trim();
    if (diffText.length === 0) {
      return { ok: false, reason: 'empty', call: c };
    }
    const applied = applyAndValidateDiff({
      original: args.fileContent,
      diffText,
      opts: {
        maxChangeRatio: opts.maxChangeRatio,
        // D33 T2: scoped per-finding relaxation. Caller (orchestrator)
        // passes { url_literal: [...substrings], fetch_call: [...], ... }
        // when the finding's category directly implies modifying a
        // normally-preserved construct on the offending line.
        preserveExceptions: opts.preserveExceptions,
        // D37: symmetric added-import resolution. Orchestrator passes
        // fileInventory (from Trees API) + knownPackages (from package.json
        // dependencies) + importerFilePath (the file being patched) so
        // the diff editor can reject diffs that invent imports pointing
        // at non-existent files / packages.
        importerFilePath: args.filePath,
        fileInventory: opts.fileInventory,
        knownPackages: opts.knownPackages,
      },
    });
    if (!applied.ok) {
      return {
        ok: false,
        reason: applied.reason === 'preserve_violation'
          ? `diff_preserve_violation:${applied.category}`
          : `diff_${applied.reason}`,
        detail: applied.violatingLine ?? applied.ratio ?? null,
        call: c,
      };
    }
    return { ok: true, fixedContent: applied.content, stats: applied.stats, call: c };
  }

  // First attempt.
  let fixedContent;
  let parsed;
  let stopReason;
  let diffStats = null;
  let attempts = 1;
  let validation;

  if (mode === 'diff') {
    const a1 = await diffModeAttempt(prompt);
    if (a1.ok) {
      fixedContent = a1.fixedContent;
      parsed = a1.call.parsed;
      stopReason = a1.call.stopReason;
      diffStats = a1.stats;
      validation = await validateFixedContent(fixedContent, args.fileContent, args.filePath);
    } else {
      // diff-mode failed; treat as validation failure and retry below.
      fixedContent = a1.call?.text ?? '';
      parsed = a1.call?.parsed;
      stopReason = a1.call?.stopReason;
      validation = { ok: false, reason: a1.reason, detail: a1.detail };
    }
  } else {
    const c = await callClaude(prompt);
    const structured = parseStructuredFixResponse(c.text);
    fixedContent = structured.fixedContent;
    var scoringDimension = structured.scoringDimension;
    var rationale = structured.rationale;
    var confidence = structured.confidence;
    var structuredResponse = structured.structured;
    if (opts.requireStructured && !structuredResponse) {
      validation = { ok: false, reason: 'invalid_json' };
    } else if (opts.requireStructured && (!rationale || !rationale.trim())) {
      validation = { ok: false, reason: 'missing_rationale' };
    } else if (opts.requireStructured && Number.isFinite(confidence) && confidence < 70) {
      validation = { ok: false, reason: 'LOW_CONFIDENCE_REQUIRES_HUMAN_REVIEW' };
    }
    parsed = c.parsed;
    stopReason = c.stopReason;
    validation = validation ?? (stopReason === 'max_tokens'
      ? { ok: false, reason: 'truncated_max_tokens' }
      : await validateFixedContent(fixedContent, args.fileContent, args.filePath));
  }

  // Retry once with the explicit prompt if first attempt fails validation.
  if (!validation.ok) {
    if (mode === 'diff') {
      // Diff-mode retry: re-ask with the same prompt + an explicit
      // failure-reason addendum so the model knows what to avoid.
      const retryPrompt = `${prompt}\n\nPREVIOUS DIFF REJECTED: ${validation.reason}${validation.detail ? ` (${typeof validation.detail === 'string' ? validation.detail.slice(0, 80) : validation.detail})` : ''}. Return a SMALLER, MORE TARGETED unified diff that does NOT remove or modify any import/export/fetch/route/URL line. If a compliant diff is not possible, return an EMPTY response (no @@ hunks) and the orchestrator will skip cleanly.`;
      const a2 = await diffModeAttempt(retryPrompt, modelCandidates.length > 1 ? 1 : 0);
      attempts = 2;
      if (a2.ok) {
        fixedContent = a2.fixedContent;
        parsed = a2.call.parsed;
        stopReason = a2.call.stopReason;
        diffStats = a2.stats;
        validation = await validateFixedContent(fixedContent, args.fileContent, args.filePath);
      } else {
        fixedContent = a2.call?.text ?? '';
        parsed = a2.call?.parsed;
        stopReason = a2.call?.stopReason;
        validation = { ok: false, reason: a2.reason, detail: a2.detail };
      }
    } else {
      let retryPrompt;
      if (hasPreciseInstruction) {
        retryPrompt = `${buildLLMFileReplacementPrompt({
          filePath: args.filePath,
          fileContent: args.fileContent,
          sanitisedFindings: [{
            severity: args.severity ?? 'medium',
            category: args.category ?? null,
            issue: sanitiseAndTruncate(args.issue, 1000),
            recommendation: sanitiseAndTruncate(args.fix, 2000),
          }],
          userDescription: opts.userDescription ?? args.userDescription ?? '',
          scoringCriteria: opts.scoringCriteria ?? args.scoringCriteria ?? DEFAULT_SCORING_CRITERIA,
          sourceContext: opts.sourceContext ?? args.sourceContext ?? '',
        })}\n\nPREVIOUS RESPONSE REJECTED: ${validation.reason}. Return valid strict JSON with a complete, non-truncated fixedContent string.`;
      } else {
        retryPrompt = `${prompt}\n\nPREVIOUS ATTEMPT FAILED (${validation.reason}). Return ONLY strict JSON with scoringDimension, rationale, and COMPLETE fixedContent from first line to last. The fixedContent MUST be meaningfully different from the input. Do NOT echo the input unchanged. Do NOT truncate.`;
      }
      const retryResult = await callClaude(retryPrompt, modelCandidates.length > 1 ? 1 : 0);
      const retryStructured = parseStructuredFixResponse(retryResult.text);
      fixedContent = retryStructured.fixedContent;
      scoringDimension = retryStructured.scoringDimension;
      rationale = retryStructured.rationale;
      confidence = retryStructured.confidence;
      structuredResponse = retryStructured.structured;
      parsed = retryResult.parsed;
      stopReason = retryResult.stopReason;
      attempts = 2;
      if (opts.requireStructured && !structuredResponse) {
        validation = { ok: false, reason: 'invalid_json' };
      } else if (opts.requireStructured && (!rationale || !rationale.trim())) {
        validation = { ok: false, reason: 'missing_rationale' };
      } else if (opts.requireStructured && Number.isFinite(confidence) && confidence < 70) {
        validation = { ok: false, reason: 'LOW_CONFIDENCE_REQUIRES_HUMAN_REVIEW' };
      } else {
        validation = stopReason === 'max_tokens'
          ? { ok: false, reason: 'truncated_max_tokens' }
          : await validateFixedContent(fixedContent, args.fileContent, args.filePath);
      }
    }
  }

  if (!validation.ok) {
    if (validation.reason === 'empty') {
      throw makeError('FIX_GENERATION_EMPTY',
        `generateFix: Anthropic returned empty content for ${args.filePath} after ${attempts} attempt(s)`);
    }
    if (validation.reason === 'identical' || validation.reason === 'whitespace_only') {
      throw makeError('FIX_NO_CHANGE',
        `generateFix: Anthropic returned the input file content unchanged for ${args.filePath} after ${attempts} attempt(s)`);
    }
    // Syntax-balance failure → treat as FIX_GENERATION_FAILED with reason
    // so the orchestrator can skip this file rather than commit broken code.
    throw makeError('FIX_GENERATION_FAILED',
      `generateFix: validation failed for ${args.filePath} after ${attempts} attempt(s) — ${validation.reason}`,
      { validationReason: validation.reason });
  }

  if (mode === 'diff' && diffStats) {
    rationale = `Applied ${diffStats.hunks} exact-context validated unified diff hunk(s) to ${args.filePath} for the supplied finding.`;
    confidence = Math.max(70, Math.min(100, 100 - Math.round((diffStats.changeRatio ?? 0) * 30)));
  }

  return {
    fixedContent,
    model: parsed?.model ?? modelCandidates[0],
    promptTokens: parsed?.usage?.input_tokens ?? 0,
    completionTokens: parsed?.usage?.output_tokens ?? 0,
    attempts,
    mode,
    scoringDimension: scoringDimension ?? null,
    rationale: rationale ?? null,
    confidence: confidence ?? null,
    structuredResponse: structuredResponse ?? false,
    diffStats,  // null for full-mode; { hunks, linesAdded, linesRemoved, changeRatio, totalLines } for diff-mode
  };
}

export const __internals = Object.freeze({
  buildPrompt,
  buildLLMFileReplacementPrompt,
  parseStructuredFixResponse,
  ANTHROPIC_API_BASE,
  ANTHROPIC_API_VERSION,
  FINAL_FALLBACK_MODEL,
  AUTHORIZED_FIX_MODEL_PREFERENCE,
  DEFAULT_SCORING_CRITERIA,
  DEFAULT_MAX_TOKENS,
  MAX_EVIDENCE_CHARS,
  INJECTION_PATTERNS,
  REDACTION_MARKER,
  buildPrompt,
  extractText,
  makeError,
  parseCheckContent,
  MINIMAL_CHANGE_GUARDRAILS,
});
