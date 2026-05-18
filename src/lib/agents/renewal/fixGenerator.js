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
 * Model selection: `claude-sonnet-4-6` is the final fallback per
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

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const FINAL_FALLBACK_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 4096;
const MAX_EVIDENCE_CHARS = 500;

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

/**
 * Build the precise-instruction Claude prompt (DISPATCH 23 upgrade).
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
  ].join('\n');
}

/**
 * Validate Claude's output before returning it. DISPATCH 23 upgrade.
 *
 * Checks performed:
 *   1. Non-empty
 *   2. Different from input (meaningful diff — not whitespace-only)
 *   3. Basic syntax sanity (balanced braces/parens) for code files
 *
 * @param {string} fixed
 * @param {string} original
 * @param {string} filePath
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateFixedContent(fixed, original, filePath) {
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
    fileContent
  );
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
  const model = typeof opts.model === 'string' && opts.model ? opts.model : FINAL_FALLBACK_MODEL;
  const maxTokens = Number.isFinite(opts.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('FIX_GENERATION_FAILED',
      'generateFix: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }

  // Build the appropriate prompt based on which input shape was provided.
  let prompt;
  if (hasPreciseInstruction) {
    prompt = buildPreciseInstructionPrompt({
      filePath: args.filePath,
      fileContent: args.fileContent,
      issue: sanitiseAndTruncate(args.issue, 1000),
      fix: sanitiseAndTruncate(args.fix, 2000),
      retry: false,
    });
  } else {
    const sanitisedFindings = sanitiseFindings(args.findings);
    prompt = buildPrompt({
      filePath: args.filePath,
      fileContent: args.fileContent,
      sanitisedFindings,
    });
  }

  // Attempt up to 2 calls: first with the standard prompt, second with
  // the explicit retry prompt if validation fails on the first.
  async function callClaude(currentPrompt) {
    let response;
    try {
      response = await fetchImpl(`${ANTHROPIC_API_BASE}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: currentPrompt }],
        }),
      });
    } catch (e) {
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: network error calling Anthropic API — ${e?.message ?? String(e)}`);
    }
    if (!response.ok) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch { /* ignore */ }
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: Anthropic returned ${response.status} ${response.statusText}. Body: ${bodyText.slice(0, 300)}`,
        { status: response.status });
    }
    let parsed;
    try {
      parsed = await response.json();
    } catch (e) {
      throw makeError('FIX_GENERATION_FAILED',
        `generateFix: Anthropic response was not JSON — ${e?.message ?? String(e)}`);
    }
    return { text: extractText(parsed), parsed };
  }

  // First attempt.
  let { text: fixedContent, parsed } = await callClaude(prompt);
  let attempts = 1;
  let validation = validateFixedContent(fixedContent, args.fileContent, args.filePath);

  // Retry once with the explicit prompt if first attempt fails validation.
  if (!validation.ok) {
    let retryPrompt;
    if (hasPreciseInstruction) {
      retryPrompt = buildPreciseInstructionPrompt({
        filePath: args.filePath,
        fileContent: args.fileContent,
        issue: sanitiseAndTruncate(args.issue, 1000),
        fix: sanitiseAndTruncate(args.fix, 2000),
        retry: true,
      });
    } else {
      // Legacy findings path — augment the original prompt with stricter rules.
      retryPrompt = `${prompt}\n\nPREVIOUS ATTEMPT FAILED (${validation.reason}). Return ONLY the COMPLETE fixed file from first line to last. The response MUST be meaningfully different from the input. Do NOT echo the input unchanged. Do NOT truncate. Do NOT use markdown code fences.`;
    }
    const retryResult = await callClaude(retryPrompt);
    fixedContent = retryResult.text;
    parsed = retryResult.parsed;
    attempts = 2;
    validation = validateFixedContent(fixedContent, args.fileContent, args.filePath);
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

  return {
    fixedContent,
    model: parsed.model ?? model,
    promptTokens: parsed.usage?.input_tokens ?? 0,
    completionTokens: parsed.usage?.output_tokens ?? 0,
    attempts,
  };
}

export const __internals = Object.freeze({
  buildPrompt,
  ANTHROPIC_API_BASE,
  ANTHROPIC_API_VERSION,
  FINAL_FALLBACK_MODEL,
  DEFAULT_MAX_TOKENS,
  MAX_EVIDENCE_CHARS,
  INJECTION_PATTERNS,
  REDACTION_MARKER,
  buildPrompt,
  extractText,
  makeError,
});
