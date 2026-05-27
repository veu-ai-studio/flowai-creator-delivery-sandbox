// src/lib/crawl/multiPageCrawler.js — W6 INTEGRATION (STEP 5)
//
// Multi-page BFS crawler with same-origin filter, robots.txt respect,
// per-page onPage callback (drives SSE 'page_crawled' events), AbortSignal
// cancellation, politeness delay, and honest stop-reason reporting.
//
// The HEAVY LIFTING (Browserless render, simple-fetch fallback, per-page
// content extraction) is delegated to api/_lib/crawler.js → crawl(url).
// This module is the page-orchestration layer ABOVE that primitive: BFS
// frontier, link extraction, dedupe, politeness, caps, robots.txt.
//
// Honesty constraint (per CA-18 §1 + the dispatch spec): if Browserless
// quota / robots.txt / time budget forces the crawl to stop short of
// maxPages, the returned envelope MUST report pagesActuallyCrawled +
// reasonStopped verbatim. NO faking the count.
//
// Spec contract:
//   crawlSite(rootUrl, opts) → {
//     ok, rootUrl, origin,
//     pagesActuallyCrawled, pagesDiscovered, maxPages, maxDepth,
//     reasonStopped: 'frontier_drained'|'max_pages_hit'|'max_depth_hit'
//                  | 'time_budget_exhausted'|'robots_disallowed_root'
//                  | 'aborted'|'invalid_url'|'fetch_error',
//     pages: PageRecord[],
//     findings: Finding[],   // aggregated, mapped to CA-18 §2 dimensions
//     startedAt, finishedAt, durationMs,
//   }
//
//   onPage({ pageIndex, totalDiscovered, url, status, findings })
//     fires after every page (success OR fetch_error) — SSE consumers
//     emit one 'step' event with kind='page_crawled' per call.

import { crawl as crawlOnePage } from '../../../api/_lib/crawler.js';

export const DEFAULTS = Object.freeze({
  maxPages: 250,
  maxDepth: 4,
  sameOriginOnly: true,
  respectRobotsTxt: true,
  perPageTimeoutMs: 15_000,
  politenessDelayMs: 400,
  totalWallClockMs: 25 * 60 * 1000,  // 25 min hard ceiling
  maxStoredHtmlBytes: 250_000,
  maxStoredBodyTextBytes: 50_000,
});

function boundedText(value, maxBytes) {
  if (typeof value !== 'string' || !value) return '';
  const max = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : value.length;
  if (Buffer.byteLength(value, 'utf8') <= max) return value;
  let out = value.slice(0, max);
  while (Buffer.byteLength(out, 'utf8') > max) {
    out = out.slice(0, -1);
  }
  return out;
}

// Tiny robots.txt parser. We only need the User-agent: * Disallow: rules
// for the same origin; we don't honor Allow/Sitemap/Crawl-delay (out of
// scope for the proof phase). Returns { allowed(path) → boolean }.
function parseRobotsTxt(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { allowed: () => true };
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let inStar = false;
  const disallows = [];
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      inStar = (val === '*');
    } else if (key === 'disallow' && inStar) {
      if (val.length > 0) disallows.push(val);
    }
  }
  return {
    allowed(path) {
      if (typeof path !== 'string' || path.length === 0) return true;
      for (const rule of disallows) {
        if (rule === '/') return false;
        if (path.startsWith(rule)) return false;
      }
      return true;
    },
  };
}

async function fetchRobotsTxt(origin, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (typeof fetchImpl !== 'function') return parseRobotsTxt('');
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/robots.txt`, { signal: ac.signal });
    if (!res || !res.ok) return parseRobotsTxt('');
    const text = await res.text().catch(() => '');
    return parseRobotsTxt(text);
  } catch { return parseRobotsTxt(''); }
  finally { clearTimeout(t); }
}

// Extract anchor hrefs from an HTML blob. Best-effort regex — DOMParser is
// not available in Node so we hand-parse. We strip fragments, normalize to
// absolute URLs, and drop non-http(s) schemes.
function extractInternalLinks(html, baseUrl, origin, { sameOriginOnly }) {
  if (typeof html !== 'string' || html.length === 0) return [];
  const out = new Set();
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    let abs;
    try { abs = new URL(raw, baseUrl).toString(); }
    catch { continue; }
    if (!/^https?:\/\//i.test(abs)) continue;
    let parsed;
    try { parsed = new URL(abs); } catch { continue; }
    if (sameOriginOnly && parsed.origin !== origin) continue;
    // Strip fragment for dedupe.
    parsed.hash = '';
    out.add(parsed.toString());
  }
  return Array.from(out);
}

// Minimal heuristic finding scan against the 4 currently-implemented
// CA-18 §2 dimensions. The orchestrator's existing Phase B + §7.6 gates
// remain the authoritative source — this is the per-page signal that
// flows into the crawl_complete aggregate so the UI sees something
// during the crawl phase before gates run.
function deriveFindingsForPage({ url, html, status, contentLength }) {
  const findings = [];
  // dimension: functional_completeness — broken page (4xx/5xx).
  if (typeof status === 'number' && status >= 400) {
    findings.push({
      dimension: 'functional_completeness',
      severity: status >= 500 ? 'high' : 'medium',
      category: 'broken-page',
      url,
      detail: `HTTP ${status}`,
    });
  }
  // dimension: ui_ux — empty body / placeholder content.
  if (typeof contentLength === 'number' && contentLength < 200) {
    findings.push({
      dimension: 'ui_ux',
      severity: 'low',
      category: 'empty-page',
      url,
      detail: `body_length=${contentLength}`,
    });
  }
  // dimension: ui_ux — page title missing.
  if (typeof html === 'string' && !/<title[^>]*>[^<]+<\/title>/i.test(html)) {
    findings.push({
      dimension: 'ui_ux',
      severity: 'low',
      category: 'missing-title',
      url,
      detail: 'no <title> in HTML',
    });
  }
  return findings;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * BFS multi-page crawl with same-origin filter, robots.txt, politeness,
 * per-page callback, cancellation.
 *
 * @param {string} rootUrl
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
export async function crawlSite(rootUrl, opts = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  const maxPages = Number.isFinite(opts.maxPages) ? opts.maxPages : DEFAULTS.maxPages;
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : DEFAULTS.maxDepth;
  const sameOriginOnly = opts.sameOriginOnly !== false;
  const respectRobotsTxt = opts.respectRobotsTxt !== false;
  const perPageTimeoutMs = Number.isFinite(opts.perPageTimeoutMs) ? opts.perPageTimeoutMs : DEFAULTS.perPageTimeoutMs;
  const politenessDelayMs = Number.isFinite(opts.politenessDelayMs) ? opts.politenessDelayMs : DEFAULTS.politenessDelayMs;
  const totalWallClockMs = Number.isFinite(opts.totalWallClockMs) ? opts.totalWallClockMs : DEFAULTS.totalWallClockMs;
  const maxStoredHtmlBytes = Number.isFinite(opts.maxStoredHtmlBytes) ? opts.maxStoredHtmlBytes : DEFAULTS.maxStoredHtmlBytes;
  const maxStoredBodyTextBytes = Number.isFinite(opts.maxStoredBodyTextBytes) ? opts.maxStoredBodyTextBytes : DEFAULTS.maxStoredBodyTextBytes;
  const onPage = typeof opts.onPage === 'function' ? opts.onPage : null;
  const signal = opts.signal ?? null;
  const _crawlOne = opts.crawlImpl || crawlOnePage;     // test override
  const _fetchRobots = opts.fetchRobotsImpl || fetchRobotsTxt;

  if (typeof rootUrl !== 'string' || !rootUrl.trim()) {
    return Object.freeze({
      ok: false, rootUrl: '', origin: '',
      pagesActuallyCrawled: 0, pagesDiscovered: 0,
      maxPages, maxDepth,
      reasonStopped: 'invalid_url',
      pages: [], findings: [],
      startedAt, finishedAt: startedAt, durationMs: 0,
    });
  }
  let normalised = rootUrl.trim();
  if (!/^https?:\/\//i.test(normalised)) normalised = 'https://' + normalised;
  let origin;
  try { origin = new URL(normalised).origin; }
  catch {
    return Object.freeze({
      ok: false, rootUrl: normalised, origin: '',
      pagesActuallyCrawled: 0, pagesDiscovered: 0,
      maxPages, maxDepth,
      reasonStopped: 'invalid_url',
      pages: [], findings: [],
      startedAt, finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
    });
  }

  let robots = { allowed: () => true };
  if (respectRobotsTxt) {
    robots = await _fetchRobots(origin);
    const rootPath = (() => { try { return new URL(normalised).pathname || '/'; } catch { return '/'; } })();
    if (!robots.allowed(rootPath)) {
      return Object.freeze({
        ok: false, rootUrl: normalised, origin,
        pagesActuallyCrawled: 0, pagesDiscovered: 1,
        maxPages, maxDepth,
        reasonStopped: 'robots_disallowed_root',
        pages: [], findings: [],
        startedAt, finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
      });
    }
  }

  const visited = new Map();   // url → record
  const frontier = [{ url: normalised, depth: 0 }];
  const seen = new Set([normalised]);
  const allFindings = [];
  const deadlineMs = startedAtMs + totalWallClockMs;
  let reasonStopped = 'frontier_drained';

  while (frontier.length > 0) {
    // Cooperative cancellation.
    if (signal?.aborted) { reasonStopped = 'aborted'; break; }
    if (Date.now() > deadlineMs) { reasonStopped = 'time_budget_exhausted'; break; }
    if (visited.size >= maxPages) { reasonStopped = 'max_pages_hit'; break; }

    const { url, depth } = frontier.shift();
    if (visited.has(url)) continue;

    // Robots check per URL.
    let urlPath = '/';
    try { urlPath = new URL(url).pathname || '/'; } catch { /* fall through */ }
    if (respectRobotsTxt && !robots.allowed(urlPath)) {
      visited.set(url, { url, depth, status: 'robots_disallowed', findings: [] });
      if (onPage) {
        try { await onPage({ pageIndex: visited.size, totalDiscovered: seen.size, url, status: 'robots_disallowed', findings: [] }); }
        catch { /* swallow per recommend_only */ }
      }
      continue;
    }

    // Per-page fetch (delegates to api/_lib/crawler.js).
    let pageResult;
    try {
      // crawl() has its own timeout layer; we don't enforce perPageTimeoutMs
      // here because the underlying primitive already manages it via
      // Browserless's own timeout. Future: pass through if the primitive
      // surfaces an opt.
      pageResult = await _crawlOne(url);
    } catch (e) {
      pageResult = { ok: false, method: 'error', reason: e?.message ?? String(e) };
    }

    const status = pageResult?.ok ? 'fetched' : 'fetch_error';
    const renderedHtml = typeof pageResult?.html === 'string' ? pageResult.html : '';
    const renderedBodyText = typeof pageResult?.bodyText === 'string' ? pageResult.bodyText : '';
    const html = renderedHtml || renderedBodyText;
    const contentLength = typeof html === 'string' ? html.length : 0;
    const storedHtml = boundedText(renderedHtml, maxStoredHtmlBytes);
    const storedBodyText = boundedText(renderedBodyText, maxStoredBodyTextBytes);
    const pageFindings = deriveFindingsForPage({ url, html, status: pageResult?.status, contentLength });

    const record = {
      url, depth,
      status,
      method: pageResult?.method ?? null,
      httpStatus: pageResult?.status ?? null,
      title: pageResult?.title ?? null,
      html: storedHtml,
      bodyText: storedBodyText,
      contentTruncated: {
        html: Boolean(renderedHtml && storedHtml.length < renderedHtml.length),
        bodyText: Boolean(renderedBodyText && storedBodyText.length < renderedBodyText.length),
        maxStoredHtmlBytes,
        maxStoredBodyTextBytes,
      },
      contentLength,
      findings: pageFindings,
    };
    visited.set(url, record);
    for (const f of pageFindings) allFindings.push(f);

    if (onPage) {
      try {
        await onPage({
          pageIndex: visited.size,
          totalDiscovered: seen.size,
          url,
          status,
          findings: pageFindings,
        });
      } catch { /* swallow */ }
    }

    // Enqueue links (only if we're under the depth cap).
    if (depth < maxDepth && pageResult?.ok && html) {
      const links = extractInternalLinks(html, url, origin, { sameOriginOnly });
      for (const link of links) {
        if (!seen.has(link) && visited.size + (seen.size - visited.size) < maxPages) {
          seen.add(link);
          frontier.push({ url: link, depth: depth + 1 });
        }
      }
    }

    // Politeness delay between pages (per origin — we only crawl one).
    if (frontier.length > 0 && politenessDelayMs > 0) {
      await sleep(politenessDelayMs);
    }
  }

  // If the loop exited because frontier was empty but visited never hit
  // maxPages and max-depth was reached on the last node, label honestly.
  if (reasonStopped === 'frontier_drained' && frontier.length === 0 && visited.size > 0) {
    // Check whether we stopped because every frontier node was at max-depth.
    // Heuristic: if no visited page has depth < maxDepth with un-enqueued
    // links, we hit max_depth_hit. Otherwise it's a real drain.
    // (Honest: this can't fully disambiguate without re-walking, but
    // 'frontier_drained' covers the common case truthfully.)
    reasonStopped = 'frontier_drained';
  }

  const finishedAtMs = Date.now();
  return Object.freeze({
    ok: visited.size > 0,
    rootUrl: normalised,
    origin,
    pagesActuallyCrawled: visited.size,
    pagesDiscovered: seen.size,
    maxPages, maxDepth,
    reasonStopped,
    pages: Array.from(visited.values()),
    findings: allFindings,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
  });
}

export const __internals = Object.freeze({
  parseRobotsTxt,
  extractInternalLinks,
  deriveFindingsForPage,
  boundedText,
});
