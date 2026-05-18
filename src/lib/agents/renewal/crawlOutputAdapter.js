/**
 * Structured-crawl adapter — Module 11 (DISPATCH 7).
 *
 * Calls Agent #21 AggressiveCrawlConductor.conductCrawl() and transforms
 * the multi-page CrawlReport into the canonical `crawlOutput` shape the
 * orchestrator + monitorTextProducer (DISPATCH 6) consume.
 *
 * Why an adapter and not direct usage:
 *   - Agent #21 ships a CrawlReport with internal field names
 *     (`surfaces`, `bodyText`, `normalisedUrl`, etc.) that match the
 *     §6 Aggressive Crawl Contract terminology — not the
 *     orchestrator-facing `crawlOutput` shape the scoring pipeline
 *     expects (`text`, `forms` as array, `interactiveElements`, etc.).
 *   - This adapter is the single seam where the contract mapping
 *     lives. Future Agent #21 internal renames can be absorbed here
 *     without rippling through orchestrator + monitor producer.
 *
 * Public contract:
 *   await conductStructuredCrawl({ url, maxPages, depth, productId, runId, opts? })
 *   → {
 *       pagesCrawled, depth,
 *       pages: [{
 *         url, title, headings[], text, links, forms,
 *         hasModal, hasChatbot, hasAIAgent,
 *         statusCode, loadTimeMs,
 *       }],
 *       brokenLinks: string[],
 *       forms: [{ pageUrl, fields[], buttons[] }],
 *       interactiveElements: string[],
 *       errors: string[],
 *       totalTextLength: number,
 *     }
 *
 * Heuristic detection (hasModal / hasChatbot / hasAIAgent):
 *   Best-effort regex matches over page.bodyText + page.surfaces. The
 *   crawl pass-1 (BFS) doesn't actively probe interactive elements
 *   — those are Phase 2-3 of the Aggressive Crawl spec. This adapter
 *   gives the scoring layer a Phase-1-honest signal: "this page has
 *   chatbot-like content / scripts" without claiming to have clicked
 *   anything.
 *
 * Never throws. On any failure surfaces an empty-but-shaped envelope
 * with the error in `errors[]` so the orchestrator can continue and
 * the operator can see what went wrong.
 */

'use strict';

import { Agent21AggressiveCrawlConductor } from '../agents/Agent21AggressiveCrawlConductor.js';
import { aggressiveCrawl } from '../../../../api/_lib/crawler.js';

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_DEPTH = 5;

// Heuristic regexes. Run against bodyText (lowercase-normalised) +
// against script src attributes scraped from the page. Bounded set so
// the heuristics are reviewable + audit-friendly.
const CHATBOT_BODY_RE = /\b(chatbot|live\s+chat|chat\s+with\s+us|message\s+us|start\s+a\s+conversation|talk\s+to\s+(?:support|us|an\s+agent))\b/i;
const CHATBOT_SCRIPT_RE = /\b(intercom|zendesk|drift|tawk\.to|crisp\.chat|hubspot\.com\/hub-fs|olark|livechatinc|tidio|hellobonsai)\b/i;
const MODAL_BODY_RE = /\b(modal|dialog|popup|overlay|lightbox)\b/i;
const AI_AGENT_BODY_RE = /\b(ai\s+(?:agent|assistant|chat)|ask\s+(?:anything|me|ai)|powered\s+by\s+(?:openai|anthropic|claude|gpt)|chat\s+with\s+(?:ai|assistant))\b/i;

function detectChatbot(page) {
  const body = (page?.bodyText ?? '').toString();
  if (CHATBOT_BODY_RE.test(body)) return true;
  // Heuristic over link / src list when available.
  const links = page?.surfaces?.links ?? [];
  for (const l of links) {
    const href = typeof l === 'string' ? l : (l?.href ?? '');
    if (CHATBOT_SCRIPT_RE.test(href)) return true;
  }
  return false;
}

function detectModal(page) {
  const body = (page?.bodyText ?? '').toString();
  return MODAL_BODY_RE.test(body);
}

function detectAIAgent(page) {
  const body = (page?.bodyText ?? '').toString();
  return AI_AGENT_BODY_RE.test(body);
}

function extractStatusCode(page) {
  // Agent #21 normalises HTTP status into page.ok (boolean) + warnings.
  // Probe `page.statusCode` if present; otherwise infer 200 on ok, 0 on
  // explicit !ok with no other signal.
  if (typeof page?.statusCode === 'number') return page.statusCode;
  if (page?.ok === true) return 200;
  // Look for "status X" in warnings (Agent #21 sometimes surfaces this).
  for (const w of (page?.warnings ?? [])) {
    const m = String(w ?? '').match(/\b(?:status|http)\s*(\d{3})\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function extractLoadTimeMs(page) {
  // Agent #21 carries optional `timing` field. Phase 1 BFS doesn't
  // measure per-page latency; default to 0 when absent so the
  // downstream consumer can use !== 0 as a "measured" sentinel.
  const t = page?.timing;
  if (typeof t === 'number') return Math.max(0, Math.floor(t));
  if (t && typeof t.totalMs === 'number') return Math.max(0, Math.floor(t.totalMs));
  if (t && typeof t.loadMs === 'number') return Math.max(0, Math.floor(t.loadMs));
  return 0;
}

function extractFormsForPage(page) {
  const out = [];
  const formsArr = page?.surfaces?.forms ?? [];
  for (const f of formsArr) {
    if (!f || typeof f !== 'object') continue;
    const fields = (f.fields ?? f.inputs ?? []).map((i) => {
      if (typeof i === 'string') return i;
      return i?.name ?? i?.id ?? '';
    }).filter(Boolean);
    const buttons = (f.buttons ?? []).map((b) => {
      if (typeof b === 'string') return b;
      return b?.label ?? b?.text ?? '';
    }).filter(Boolean);
    out.push({ pageUrl: page.url, fields, buttons });
  }
  return out;
}

function extractInteractiveElements(report) {
  const set = new Set();
  for (const p of (report?.pages ?? [])) {
    const btns = p?.surfaces?.buttons ?? [];
    for (const b of btns) {
      const label = typeof b === 'string' ? b : (b?.label ?? b?.text ?? '');
      if (label && label.length > 0 && label.length < 200) set.add(label.trim());
    }
    // Also include detected interactive surfaces as labelled markers,
    // so the scoring layer sees "ChatBot" / "Modal" / "AIAgent" as
    // first-class interactive elements without having to re-derive.
    if (detectChatbot(p))  set.add('ChatBot');
    if (detectModal(p))    set.add('Modal');
    if (detectAIAgent(p))  set.add('AIAgent');
  }
  return [...set].slice(0, 200);
}

function extractBrokenLinks(report) {
  const broken = new Set();
  for (const p of (report?.pages ?? [])) {
    if (p?.ok === false && typeof p.url === 'string') broken.add(p.url);
    for (const n of (p?.networkErrors ?? [])) {
      const u = typeof n === 'string' ? n : (n?.url ?? '');
      if (u) broken.add(u);
    }
  }
  return [...broken];
}

function extractErrors(report) {
  const out = [];
  // Crawl-level errors first.
  for (const e of (report?.errors ?? [])) {
    if (typeof e === 'string') out.push(e);
    else if (e && typeof e === 'object') out.push(`${e.phase ?? 'crawl'}: ${e.reason ?? 'unknown'}${e.url ? ` (${e.url})` : ''}`);
  }
  // Per-page console + network errors.
  for (const p of (report?.pages ?? [])) {
    for (const c of (p?.consoleErrors ?? [])) {
      const msg = typeof c === 'string' ? c : (c?.text ?? c?.message ?? '');
      if (msg) out.push(`console (${p.url}): ${msg}`);
    }
    for (const n of (p?.networkErrors ?? [])) {
      const u = typeof n === 'string' ? n : (n?.url ?? '');
      const status = typeof n === 'object' ? n?.status : null;
      if (u) out.push(`network (${p.url}): ${u}${status ? ` [${status}]` : ''}`);
    }
  }
  return out.slice(0, 500);
}

function mapPage(page) {
  const text = (page?.bodyText ?? '').toString();
  const links = page?.surfaces?.links ?? [];
  const forms = page?.surfaces?.forms ?? [];
  return {
    url:           page?.url ?? '',
    title:         page?.title ?? '',
    headings:      Array.isArray(page?.headings) ? page.headings.slice(0, 50) : [],
    text,
    links:         Array.isArray(links) ? links.length : 0,
    forms:         Array.isArray(forms) ? forms.length : 0,
    hasModal:      detectModal(page),
    hasChatbot:    detectChatbot(page),
    hasAIAgent:    detectAIAgent(page),
    statusCode:    extractStatusCode(page),
    loadTimeMs:    extractLoadTimeMs(page),
  };
}

function emptyEnvelope({ errors = [], depth = 0 } = {}) {
  return {
    pagesCrawled:        0,
    depth,
    pages:               [],
    brokenLinks:         [],
    forms:               [],
    interactiveElements: [],
    errors,
    totalTextLength:     0,
  };
}

/**
 * Conduct a crawl and return the structured output shape the
 * orchestrator + monitorTextProducer consume.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {number} [args.maxPages=50]
 * @param {number} [args.depth=5]
 * @param {string} [args.productId]
 * @param {string} [args.runId]
 * @param {object} [args.opts]
 * @param {function} [args.conductCrawlFn]  — DI for tests: defaults to
 *                                            a fresh Agent21 conductor.
 * @returns {Promise<object>} structured crawl output (always shaped;
 *                            errors surfaced in `errors[]`).
 */
export async function conductStructuredCrawl(args) {
  if (!args || typeof args !== 'object') {
    return emptyEnvelope({ errors: ['conductStructuredCrawl: args object required'] });
  }
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  if (!url) {
    return emptyEnvelope({ errors: ['conductStructuredCrawl: url required'] });
  }
  const maxPages = Number.isFinite(args.maxPages) && args.maxPages > 0 ? args.maxPages : DEFAULT_MAX_PAGES;
  const depth = Number.isFinite(args.depth) && args.depth > 0 ? args.depth : DEFAULT_DEPTH;
  const opts = args.opts ?? {};

  // 1. Acquire the crawl report. Tests inject conductCrawlFn; production
  //    constructs a fresh Agent21 conductor with a minimal-stub deps bag
  //    OR falls back to aggressiveCrawl() directly (no agent envelope).
  let report;
  if (typeof args.conductCrawlFn === 'function') {
    try { report = await args.conductCrawlFn({ url, maxPages, depth, opts }); }
    catch (e) {
      return emptyEnvelope({ errors: [`conductCrawlFn threw: ${e?.message ?? String(e)}`], depth });
    }
  } else {
    // Production path. Call aggressiveCrawl() directly to avoid having
    // to construct an Agent21 deps bag (BaseAgent requires clock /
    // logger / messageBus / etc. — overkill for a read-only crawl).
    // Agent21's conductCrawl() wraps aggressiveCrawl() with auth-gated
    // detection + single-page fallback; we replicate that here through
    // the static helper isAuthGated isn't necessary because the scoring
    // layer only cares about the structured page shape, not auth state.
    try {
      report = await aggressiveCrawl(url, { depth, maxPages });
    } catch (e) {
      return emptyEnvelope({ errors: [`aggressiveCrawl threw: ${e?.message ?? String(e)}`], depth });
    }
  }

  if (!report || typeof report !== 'object') {
    return emptyEnvelope({ errors: ['crawl returned non-object'], depth });
  }
  if (report.ok === false) {
    const out = emptyEnvelope({
      errors: extractErrors(report),
      depth: typeof report.depth === 'number' ? report.depth : depth,
    });
    out.pagesCrawled = typeof report.pagesCrawled === 'number' ? report.pagesCrawled : 0;
    return out;
  }

  // 2. Transform pages.
  const pages = Array.isArray(report.pages) ? report.pages.map(mapPage) : [];

  // 3. Aggregate per-page collections.
  const formsFlat = [];
  let totalTextLength = 0;
  for (let i = 0; i < (report.pages ?? []).length; i++) {
    const src = report.pages[i];
    formsFlat.push(...extractFormsForPage(src));
    totalTextLength += (src?.bodyText ?? '').length;
  }

  return {
    pagesCrawled:        typeof report.pagesCrawled === 'number' ? report.pagesCrawled : pages.length,
    depth:               typeof report.depth === 'number' ? report.depth : depth,
    pages,
    brokenLinks:         extractBrokenLinks(report),
    forms:               formsFlat,
    interactiveElements: extractInteractiveElements(report),
    errors:              extractErrors(report),
    totalTextLength,
  };
}

export const __internals = Object.freeze({
  DEFAULT_MAX_PAGES,
  DEFAULT_DEPTH,
  CHATBOT_BODY_RE,
  CHATBOT_SCRIPT_RE,
  MODAL_BODY_RE,
  AI_AGENT_BODY_RE,
  detectChatbot,
  detectModal,
  detectAIAgent,
  extractStatusCode,
  extractLoadTimeMs,
  extractFormsForPage,
  extractInteractiveElements,
  extractBrokenLinks,
  extractErrors,
  mapPage,
  emptyEnvelope,
});
