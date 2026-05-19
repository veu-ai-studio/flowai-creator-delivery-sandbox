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
//
// Each pattern set is split into TWO regexes:
//   *_BODY_RE_CORE — original tight set (low false-positive risk).
//   *_BODY_RE_EXT  — expanded patterns added in DISPATCH 8.
// The detector runs both. Keeping them separate makes future audits
// easy ("which match fired?" can be answered without re-running).
//
// Chatbot vendor coverage (DISPATCH 8 expansion):
//   Core: intercom · zendesk · drift · tawk.to · crisp.chat · hubspot ·
//         olark · livechatinc · tidio · hellobonsai
//   Ext:  freshchat · helpscout/beacon · front · livechatinc (full host) ·
//         liveperson · kustomer · genesys/purecloud · comm100 ·
//         smartsupp · userlike · jivochat · jivosite · botpress · rasa ·
//         ada.cx · ada.support · acquire.io · purechat · subiz ·
//         birdeye · verloop · botsify · heyday (hootsuite) · tars ·
//         dialogflow.cloud.google · watson chat · kommunicate ·
//         yellowmessenger / yellow.ai · engati · manychat · chatfuel ·
//         landbot · loop.global · gladly · zoho salesiq · webchat ·
//         chatbot.com · pure chat · servicenow now-virtual-agent
const CHATBOT_BODY_RE_CORE = /\b(chatbot|live\s+chat|chat\s+with\s+us|message\s+us|start\s+a\s+conversation|talk\s+to\s+(?:support|us|an\s+agent))\b/i;
const CHATBOT_BODY_RE_EXT  = /\b(virtual\s+(?:agent|assistant|advisor)|automated\s+(?:assistant|chat|support)|chat\s+now|need\s+help\?|how\s+can\s+(?:we|i)\s+help|chat\s+to\s+an\s+expert|chat\s+with\s+(?:an?\s+)?(?:human|expert|specialist|agent))\b/i;
const CHATBOT_SCRIPT_RE_CORE = /\b(intercom|zendesk|drift|tawk\.to|crisp\.chat|hubspot\.com\/hub-fs|olark|livechatinc|tidio|hellobonsai)\b/i;
const CHATBOT_SCRIPT_RE_EXT  = /\b(freshchat|freshworks|helpscout|helpscout-beacon|frontapp|liveperson|liveengage|kustomerapp|genesys\.com|purecloud|comm100|smartsupp|userlike|jivochat|jivosite|botpress|rasa\.com|ada\.cx|ada\.support|acquire\.io|purechat\.com|subiz\.com\.vn|birdeye\.com|verloop\.io|botsify|heyday\.ai|hootsuite|hellotars\.com|dialogflow|watson(?:platform|assistant)|kommunicate|yellowmessenger|yellow\.ai|engati|manychat|chatfuel|landbot\.io|loop\.global|gladly\.com|salesiq|zopim|servicenow|chat-widget|chatbot-widget|chatbot\.com|botcopy|botstar|tars\.io)\b/i;
const MODAL_BODY_RE_CORE = /\b(modal|dialog|popup|overlay|lightbox)\b/i;
const MODAL_BODY_RE_EXT  = /\b(role=["']?dialog|aria-modal|data-modal|class=["'][^"']*modal[^"']*["']|open\s+in\s+modal|view\s+in\s+lightbox)/i;
const AI_AGENT_BODY_RE_CORE = /\b(ai\s+(?:agent|assistant|chat)|ask\s+(?:anything|me|ai)|powered\s+by\s+(?:openai|anthropic|claude|gpt)|chat\s+with\s+(?:ai|assistant))\b/i;
const AI_AGENT_BODY_RE_EXT  = /\b(ai[\s-]?powered\s+(?:support|chat|assistant|help|search|answers?)|talk\s+to\s+(?:an?\s+)?(?:ai|bot|chatbot)|chat\s+with\s+(?:gpt|claude|copilot|gemini|llama)|copilot|chatgpt|claude\.ai|character\.ai|perplexity(?:\.ai)?|gemini\.google|voiceflow|conversational\s+ai|generative\s+ai\s+(?:assistant|chat))\b/i;

// Aggregate convenience constants — used by the legacy __internals exports
// that other callers may rely on. New code should prefer the split CORE /
// EXT constants for clarity.
const CHATBOT_BODY_RE   = new RegExp(`${CHATBOT_BODY_RE_CORE.source}|${CHATBOT_BODY_RE_EXT.source}`, 'i');
const CHATBOT_SCRIPT_RE = new RegExp(`${CHATBOT_SCRIPT_RE_CORE.source}|${CHATBOT_SCRIPT_RE_EXT.source}`, 'i');
const MODAL_BODY_RE     = new RegExp(`${MODAL_BODY_RE_CORE.source}|${MODAL_BODY_RE_EXT.source}`, 'i');
const AI_AGENT_BODY_RE  = new RegExp(`${AI_AGENT_BODY_RE_CORE.source}|${AI_AGENT_BODY_RE_EXT.source}`, 'i');

function detectChatbot(page) {
  const body = (page?.bodyText ?? '').toString();
  if (CHATBOT_BODY_RE_CORE.test(body)) return true;
  if (CHATBOT_BODY_RE_EXT.test(body))  return true;
  // Heuristic over link / src list when available.
  const links = page?.surfaces?.links ?? [];
  for (const l of links) {
    const href = typeof l === 'string' ? l : (l?.href ?? '');
    if (CHATBOT_SCRIPT_RE_CORE.test(href)) return true;
    if (CHATBOT_SCRIPT_RE_EXT.test(href))  return true;
  }
  return false;
}

function detectModal(page) {
  const body = (page?.bodyText ?? '').toString();
  if (MODAL_BODY_RE_CORE.test(body)) return true;
  if (MODAL_BODY_RE_EXT.test(body))  return true;
  return false;
}

function detectAIAgent(page) {
  const body = (page?.bodyText ?? '').toString();
  if (AI_AGENT_BODY_RE_CORE.test(body)) return true;
  if (AI_AGENT_BODY_RE_EXT.test(body))  return true;
  return false;
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

// D43 Lever c — per-page interactive seed list. Agent #21 records
// per-page button labels and link hrefs in surfaces.{buttons,links}.
// We pass those through verbatim so Phase B can use them as locator
// seeds (text/role-based) instead of re-enumerating from a cold page
// load. Each seed carries enough information for Playwright's
// getByText/getByRole locators; no CSS selector is required.
function extractInteractivesForPage(page) {
  const out = [];
  const seen = new Set();
  const buttons = page?.surfaces?.buttons ?? [];
  for (const b of buttons) {
    const label = typeof b === 'string' ? b : (b?.label ?? b?.text ?? '');
    if (!label || typeof label !== 'string') continue;
    const t = label.trim();
    if (t.length === 0 || t.length > 200) continue;
    const key = `button:${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ tag: 'button', role: 'button', text: t, href: null });
  }
  const links = page?.surfaces?.links ?? [];
  for (const l of links) {
    const href = typeof l === 'string' ? l : (l?.href ?? '');
    const text = typeof l === 'object' ? (l?.text ?? l?.label ?? '') : '';
    const t = (typeof text === 'string' && text.length > 0 ? text : href).trim();
    if (!t || t.length > 200) continue;
    const key = `a:${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ tag: 'a', role: 'link', text: t, href: href || null });
  }
  return out.slice(0, 200);   // hard cap per page so a runaway crawl can't bloat the envelope
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
    // D43 Lever c — per-page interactive seed list (text+role descriptors).
    interactives:  extractInteractivesForPage(page),
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
 * @param {object} [args.storageState] — D43 Lever a: Playwright
 *        storageState forwarded to the crawl engine so auth-gated
 *        pages are reachable. richCapture/Browserless integration of
 *        this signal is wired via the underlying ENTRY-007 stack;
 *        conductStructuredCrawl is a transparent forwarder.
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

  // D43 Lever a — storageState forwarder. Crawler doesn't yet drive
  // Browserless with a logged-in session (richCapture is unauthenticated
  // HTTP), but we accept the option here so the engine wire is in
  // place for ENTRY-007 to plumb authenticated render later. Tests
  // can also assert the option propagates.
  const storageState = args.storageState ?? null;

  // 1. Acquire the crawl report. Tests inject conductCrawlFn; production
  //    constructs a fresh Agent21 conductor with a minimal-stub deps bag
  //    OR falls back to aggressiveCrawl() directly (no agent envelope).
  let report;
  if (typeof args.conductCrawlFn === 'function') {
    try { report = await args.conductCrawlFn({ url, maxPages, depth, opts, storageState }); }
    catch (e) {
      return emptyEnvelope({ errors: [`conductCrawlFn threw: ${e?.message ?? String(e)}`], depth });
    }
  } else {
    // Production path. aggressiveCrawl accepts opts; storageState is
    // forwarded best-effort (richCapture ignores it today; ENTRY-007
    // will wire it through Browserless when the auth-render path lands).
    try {
      report = await aggressiveCrawl(url, { depth, maxPages, storageState });
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
  // DISPATCH 8 — split CORE / EXT patterns for audit + tests.
  CHATBOT_BODY_RE_CORE,
  CHATBOT_BODY_RE_EXT,
  CHATBOT_SCRIPT_RE_CORE,
  CHATBOT_SCRIPT_RE_EXT,
  MODAL_BODY_RE_CORE,
  MODAL_BODY_RE_EXT,
  AI_AGENT_BODY_RE_CORE,
  AI_AGENT_BODY_RE_EXT,
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
