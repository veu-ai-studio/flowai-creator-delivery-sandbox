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
 * @param {object} args
 * @param {string} args.filePath
 * @param {string} args.fileContent
 * @param {Array<object>} args.findings
 * @param {string} args.productId
 * @param {string} args.runId
 * @param {object} [args.opts]
 * @param {string} [args.opts.model]      — model id; defaults to FINAL_FALLBACK_MODEL
 * @param {string} [args.opts.apiKey]     — default: process.env.ANTHROPIC_API_KEY
 * @param {typeof fetch} [args.opts.fetch] — default: globalThis.fetch (overridable for tests)
 * @param {number} [args.opts.maxTokens]  — default: DEFAULT_MAX_TOKENS
 *
 * @returns {Promise<{ fixedContent: string, model: string, promptTokens: number, completionTokens: number }>}
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
  if (!Array.isArray(args.findings) || args.findings.length === 0) {
    throw makeError('FIX_GENERATION_FAILED',
      'generateFix: findings must be a non-empty array');
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

  const sanitisedFindings = sanitiseFindings(args.findings);
  const prompt = buildPrompt({
    filePath: args.filePath,
    fileContent: args.fileContent,
    sanitisedFindings,
  });

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
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    // Wrap network errors without including the API key.
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

  const fixedContent = extractText(parsed);
  if (typeof fixedContent !== 'string' || fixedContent.length === 0) {
    throw makeError('FIX_GENERATION_EMPTY',
      `generateFix: Anthropic returned empty content for ${args.filePath}`);
  }
  if (fixedContent === args.fileContent) {
    throw makeError('FIX_NO_CHANGE',
      `generateFix: Anthropic returned the input file content unchanged for ${args.filePath}`);
  }

  return {
    fixedContent,
    model: parsed.model ?? model,
    promptTokens: parsed.usage?.input_tokens ?? 0,
    completionTokens: parsed.usage?.output_tokens ?? 0,
  };
}

export const __internals = Object.freeze({
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
