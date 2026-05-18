/**
 * Monitor-text producer — the KEYSTONE for real scoring.
 *
 * Server-side equivalent of AutoRunner Step 8 (Monitor). Takes a URL,
 * fetches its content, calls Claude to produce a Five-Layer assessment
 * in the exact format that operationsEngine.computeMonitorClearance
 * expects (text containing `[L1] ... X/10` ... `[L5] ... X/10`).
 *
 * Without this module, `preScoreAdapter.computeScore` returns a zero-
 * score envelope (error: 'monitor_text_required') because it has no
 * Monitor text to parse. With this module wired in, the orchestrator's
 * pre/post scores become REAL numbers that move with real fixes.
 *
 * Phase A scope: simple fetch() of public URLs. No Browserless, no auth
 * traversal, no chatbot/modal probing. That's Phase B+ work — Phase A
 * is "make the scoring loop terminate honestly."
 *
 * Anthropic API key (`ANTHROPIC_API_KEY`) never logged. Same posture as
 * `fixGenerator.js`.
 */

'use strict';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const FINAL_FALLBACK_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_PAGE_TEXT_CHARS = 50_000;

const FIVE_LAYER_FRAMEWORK = `
━━━ FIVE-LAYER INTELLIGENCE REQUIREMENT ━━━
Every finding section MUST cover all five intelligence layers:

LAYER 1 — FUNCTIONALITY: Does it work? What breaks? What interactions fail? What is missing?
LAYER 2 — OPERATIONAL: Infrastructure risks, reliability signals, monitoring presence, uptime indicators.
LAYER 3 — FINANCIAL: Monetization model, pricing clarity, payment processing, revenue potential, unit economics signals.
LAYER 4 — BUSINESS: Competitive positioning, top 3 competitors, defensible moat, key business risks, partnerships/integrations.
LAYER 5 — GTM: Ideal customer profile, sales motion (self-serve/inside sales/enterprise), CAC signals, active/missing channels, demo readiness score for this step.

Label each insight with [L1], [L2], [L3], [L4], or [L5] so findings are clearly layered.
━━━ END FIVE-LAYER REQUIREMENT ━━━
`;

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) {
    if (k !== 'apiKey' && k !== 'api_key' && k !== 'authorization' && k !== 'x-api-key') {
      err[k] = v;
    }
  }
  return err;
}

/**
 * Strip HTML tags + collapse whitespace from raw HTML, returning the
 * visible text. Conservative; preserves structure markers (newlines
 * for headings, list items).
 *
 * @param {string} html
 * @returns {string}
 */
export function extractVisibleText(html) {
  if (typeof html !== 'string') return '';
  let text = html;
  // Drop <script>, <style>, <noscript> blocks entirely.
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  // Drop HTML comments.
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  // Preserve newlines for headings + list items + block elements.
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining tags.
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities.
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // Collapse runs of whitespace.
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n+/g, '\n\n');
  return text.trim();
}

/**
 * Extract <title> from HTML, returning '' if absent or unparseable.
 *
 * @param {string} html
 * @returns {string}
 */
export function extractPageTitle(html) {
  if (typeof html !== 'string') return '';
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().slice(0, 200) : '';
}

/**
 * Fetch a URL's content. Returns { html, status, contentType }.
 * Throws MONITOR_FETCH_FAILED on network error or non-2xx status.
 *
 * @param {string} url
 * @param {object} [opts]
 * @returns {Promise<{ html: string, status: number, contentType: string }>}
 */
export async function fetchUrlContent(url, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('MONITOR_FETCH_FAILED',
      'fetchUrlContent: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller && typeof setTimeout === 'function'
    ? setTimeout(() => controller.abort(), opts.timeoutMs ?? FETCH_TIMEOUT_MS)
    : null;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'FlowAI-MonitorTextProducer/1.0 (+https://flowai)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller?.signal,
      redirect: 'follow',
    });
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    throw makeError('MONITOR_FETCH_FAILED',
      `fetchUrlContent: network error fetching ${url} — ${e?.message ?? String(e)}`);
  }
  if (timeoutId) clearTimeout(timeoutId);
  if (!response.ok) {
    throw makeError('MONITOR_FETCH_FAILED',
      `fetchUrlContent: ${url} returned ${response.status} ${response.statusText}`,
      { status: response.status });
  }
  const contentType = response.headers.get('content-type') ?? '';
  const html = await response.text();
  return { html, status: response.status, contentType };
}

/**
 * Build the Monitor-style prompt for Claude. Same shape as the
 * AutoRunner Step 8 prompt — the per-layer score lines `[L1] ... X/10`
 * are the parsed scoring authority for computeMonitorClearance.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} args.pageTitle
 * @param {string} args.pageText
 * @returns {string}
 */
export function buildMonitorPrompt({ url, pageTitle, pageText }) {
  return [
    "You are FlowAI's final reporting engine. Compile a complete five-layer intelligence final report for this URL.",
    '',
    `URL: ${url}`,
    `TITLE: ${pageTitle || '(no title)'}`,
    '',
    '━━━ PAGE CONTENT ━━━',
    pageText.slice(0, MAX_PAGE_TEXT_CHARS),
    '━━━ END PAGE CONTENT ━━━',
    '',
    FIVE_LAYER_FRAMEWORK,
    '',
    'Compile a comprehensive final assessment for this specific product across all five intelligence layers.',
    '',
    '1. EXECUTIVE SUMMARY — 3-4 sentences about THIS product\'s state, referencing specific findings from the page content above.',
    '',
    '2. FIVE-LAYER SCORES SUMMARY (output EXACTLY this block, one score per line, integers only):',
    '   [L1] Functionality Score: X/10',
    '   [L2] Operational Score: X/10',
    '   [L3] Financial Score: X/10',
    '   [L4] Business Score: X/10',
    '   [L5] GTM Score: X/10',
    '',
    '3. CRITICAL ISSUES — All CRITICAL severity issues with exact locations and fixes specific to this product',
    '',
    '4. HIGH PRIORITY ISSUES — All HIGH severity issues',
    '',
    '5. RECOMMENDED NEXT ACTIONS — Top 5 ordered actions specific to this product, one per intelligence layer',
    '',
    'STRICT OUTPUT RULES — these are not suggestions:',
    '- Do NOT output a "TOTAL" line. Code sums the per-layer scores deterministically.',
    '- Do NOT output a "DEMO READINESS SCORE" or any aggregate /50 number. Code computes it.',
    '- Do NOT output a "CLEARANCE DECISION" or verdict (CLEARED/CONDITIONAL/NOT CLEARED). Code computes it from the sum.',
    '- Do NOT output a "scoring note" or any text that reconciles, adjusts, or grants discretionary aggregate credit on top of the per-layer scores.',
    '- Do NOT include band/threshold text (e.g. "45-50", "above 30"). You are evaluating, not adjudicating.',
    '- The per-layer scores you output are the ONLY scoring authority. Code will sum and decide. Your aggregate opinion is not part of the report.',
  ].join('\n');
}

/**
 * Call Claude to produce the Monitor text from a page-content prompt.
 *
 * @param {object} args
 * @param {string} args.prompt
 * @param {object} [args.opts]
 * @returns {Promise<{ text: string, model: string, usage: object }>}
 */
async function callClaudeForMonitor({ prompt, opts = {} }) {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: ANTHROPIC_API_KEY is required. Set process.env.ANTHROPIC_API_KEY (Doppler key in production).');
  }
  const model = typeof opts.model === 'string' && opts.model ? opts.model : FINAL_FALLBACK_MODEL;
  const maxTokens = Number.isFinite(opts.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: fetch is not available on globalThis. Node 18+ required.');
  }
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
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: network error calling Anthropic — ${e?.message ?? String(e)}`);
  }
  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: Anthropic returned ${response.status} ${response.statusText}. Body: ${bodyText.slice(0, 300)}`,
      { status: response.status });
  }
  let parsed;
  try {
    parsed = await response.json();
  } catch (e) {
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: Anthropic response was not JSON — ${e?.message ?? String(e)}`);
  }
  const textBlocks = Array.isArray(parsed.content)
    ? parsed.content.filter((b) => b && b.type === 'text').map((b) => b.text ?? '')
    : [];
  const text = textBlocks.join('');
  if (typeof text !== 'string' || text.length === 0) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: Anthropic returned empty content');
  }
  return {
    text,
    model: parsed.model ?? model,
    usage: parsed.usage ?? {},
  };
}

/**
 * Produce Monitor text for a URL — the KEYSTONE call.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} args.productId
 * @param {string} args.runId
 * @param {object} [args.opts]    — { fetch?, model?, apiKey?, maxTokens? }
 *
 * @returns {Promise<{ monitorText, rawContent, url, fetchedAt, wordCount, pageTitle, model, usage }>}
 */
export async function produceMonitorText(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('MONITOR_FETCH_FAILED', 'produceMonitorText: args object required');
  }
  const required = ['url', 'productId', 'runId'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('MONITOR_FETCH_FAILED',
        `produceMonitorText: ${k} must be a non-empty string`);
    }
  }
  const opts = args.opts ?? {};

  // 1. Fetch the URL content.
  const { html, status, contentType } = await fetchUrlContent(args.url, opts);
  const pageTitle = extractPageTitle(html);
  const pageText = extractVisibleText(html);
  const wordCount = pageText.split(/\s+/).filter(Boolean).length;

  if (wordCount < 5) {
    // Degenerate page (empty, JS-rendered SPA shell with no SSR, error page).
    // Surface honestly rather than asking Claude to score an empty string.
    throw makeError('MONITOR_FETCH_FAILED',
      `produceMonitorText: ${args.url} returned ${status} but extracted only ${wordCount} words of visible text (likely JS-rendered SPA without SSR; Phase B Browserless wiring required)`,
      { status, wordCount });
  }

  // 2. Build the Monitor prompt.
  const prompt = buildMonitorPrompt({ url: args.url, pageTitle, pageText });

  // 3. Call Claude to produce the Monitor text.
  const llm = await callClaudeForMonitor({ prompt, opts });

  return {
    monitorText: llm.text,
    rawContent: pageText.slice(0, MAX_PAGE_TEXT_CHARS),
    url: args.url,
    fetchedAt: new Date().toISOString(),
    wordCount,
    pageTitle,
    contentType,
    model: llm.model,
    usage: llm.usage,
  };
}

export const __internals = Object.freeze({
  ANTHROPIC_API_BASE,
  FINAL_FALLBACK_MODEL,
  DEFAULT_MAX_TOKENS,
  FETCH_TIMEOUT_MS,
  MAX_PAGE_TEXT_CHARS,
  FIVE_LAYER_FRAMEWORK,
  extractVisibleText,
  extractPageTitle,
  fetchUrlContent,
  buildMonitorPrompt,
  callClaudeForMonitor,
  makeError,
});
