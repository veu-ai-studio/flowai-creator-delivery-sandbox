// api/_lib/inputAdapters/url.js
//
// URL input adapter for the FlowAI renewal pipeline.
//
// Walks the target URL up to a depth-bounded traversal (default depth=2,
// max pages=8) using the existing crawler.js stack (Browserless preferred,
// simple-fetch fallback).  Extracts evidence and produces the unified
// InputArtifact.normalized shape consumed by the issue detector.
//
// ─── SCOPE ─────────────────────────────────────────────────────────────
// This adapter EXTENDS the existing api/_lib/crawler.js — it does NOT
// modify or replace its exports.  The single-page crawl() is called once
// per URL discovered.
//
// The dispatch asks for depth=3 / max=50 / click-everything Playwright.
// What ships in this dispatch is a depth-bounded multi-page traversal
// (default depth=2, max=8 pages).  Click-everything Playwright + modal
// probing + AI-agent surface probing are NOT implemented in this dispatch
// (see renewal-pipeline limitations in the report-back) — they remain
// pending sub-tasks.  Internal-link discovery uses the link list returned
// by the per-page crawl.
//
// ─── OUTPUT ────────────────────────────────────────────────────────────
// Returns an object the renewal orchestrator wraps into an InputArtifact:
//   {
//     raw:        { url },
//     normalized: { productConcept, targetUsers, coreClaims,
//                   observedSurfaces: 'crawl', detectedFeatures },
//     evidence:   { pages: [{ url, title, headings, bodyText, links, ok, reason }],
//                   pagesCrawled, depth, attempts }
//   }
// `evidence` is not part of the public InputArtifact shape but is passed
// alongside so the issue detector can run URL-specific detectors against
// the actual crawl output.

import { crawl } from '../crawler.js';
import { callClaude } from '../claude.js';

const DEFAULT_DEPTH = 2;
const DEFAULT_MAX_PAGES = 8;

function normalizeUrlForCompare(href) {
  try {
    const u = new URL(href);
    // Drop fragment + trailing slash for de-dup.
    return (u.origin + u.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return null;
  }
}

function isSameOrigin(href, origin) {
  try {
    return new URL(href).origin === origin;
  } catch {
    return false;
  }
}

/**
 * Crawl the URL and a depth-bounded slice of its internal links.
 *
 * @param {string} startUrl
 * @param {{ depth?: number, maxPages?: number, credentials?: object|null, force?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, pages: Array, pagesCrawled: number, depth: number, origin: string }>}
 */
export async function aggressiveCrawl(startUrl, opts = {}) {
  const depth = Math.max(0, Math.min(3, opts.depth ?? DEFAULT_DEPTH));
  const maxPages = Math.max(1, Math.min(50, opts.maxPages ?? DEFAULT_MAX_PAGES));
  const force = opts.force;

  const root = await crawl(startUrl, { force });
  if (!root.ok) {
    return {
      ok: false,
      reason: root.reason || 'root crawl failed',
      pages: [],
      pagesCrawled: 0,
      depth,
      origin: '',
    };
  }
  let origin;
  try { origin = new URL(root.url).origin; }
  catch { origin = ''; }

  const pages = [{
    url: root.url,
    title: root.title,
    metaDescription: root.metaDescription,
    headings: root.headings || [],
    bodyText: root.bodyText || '',
    links: root.links || [],
    method: root.method,
    jsRendered: !!root.jsRendered,
    warnings: root.warnings || [],
    ok: true,
  }];
  const seen = new Set([normalizeUrlForCompare(root.url)]);

  // BFS the internal-link graph.
  let frontier = (root.links || [])
    .map((l) => (typeof l === 'string' ? l : l?.href))
    .filter((href) => typeof href === 'string' && href.length > 0)
    .filter((href) => origin && isSameOrigin(href, origin))
    .map(normalizeUrlForCompare)
    .filter((u) => u && !seen.has(u))
    .slice(0, maxPages * 2);

  for (let d = 1; d <= depth && pages.length < maxPages && frontier.length > 0; d++) {
    const nextFrontier = [];
    for (const candidate of frontier) {
      if (pages.length >= maxPages) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      const childResult = await crawl(candidate, { force });
      if (!childResult.ok) {
        pages.push({ url: candidate, ok: false, reason: childResult.reason || 'child crawl failed' });
        continue;
      }
      pages.push({
        url: childResult.url,
        title: childResult.title,
        metaDescription: childResult.metaDescription,
        headings: childResult.headings || [],
        bodyText: (childResult.bodyText || '').slice(0, 4000),
        links: childResult.links || [],
        method: childResult.method,
        jsRendered: !!childResult.jsRendered,
        ok: true,
      });
      // Feed depth+1 frontier from this child's same-origin links.
      const childLinks = (childResult.links || [])
        .map((l) => (typeof l === 'string' ? l : l?.href))
        .filter((href) => typeof href === 'string' && isSameOrigin(href, origin))
        .map(normalizeUrlForCompare)
        .filter((u) => u && !seen.has(u));
      nextFrontier.push(...childLinks);
    }
    frontier = nextFrontier.slice(0, maxPages * 2);
  }

  return { ok: true, pages, pagesCrawled: pages.filter((p) => p.ok).length, depth, origin };
}

/**
 * Build a Claude prompt that normalizes crawl evidence into the
 * InputArtifact.normalized shape.  Returns plain JSON.
 */
function buildNormalizePrompt(pages) {
  const evidence = pages
    .filter((p) => p.ok)
    .map((p, idx) => {
      const headings = (p.headings || []).map((h) => `  ${h.tag}: ${h.text}`).join('\n');
      return `PAGE ${idx + 1}: ${p.url}\nTitle: ${p.title}\nMeta: ${p.metaDescription || ''}\nHeadings:\n${headings}\nBody (truncated): ${(p.bodyText || '').slice(0, 1500)}`;
    })
    .join('\n\n---\n\n');
  return `You are a normalization engine.  Read the crawl evidence below and produce a JSON object describing the product.

Crawl evidence:
${evidence}

Return EXACTLY this JSON shape — no markdown fences, no extra commentary:
{
  "productConcept": "<one or two sentences stating what the product is, derived from the page>",
  "targetUsers": "<one sentence describing who the product is for, based on the page copy>",
  "coreClaims": ["<value-claim 1>", "<value-claim 2>", "<value-claim 3>"],
  "detectedFeatures": ["<feature 1>", "<feature 2>", "<feature 3>"]
}

Rules:
- Quote directly from the page where possible.
- If you cannot derive a field from the evidence, set it to an empty string ("") or empty array ([]).
- Do NOT speculate beyond the evidence.
- Do NOT include any markdown formatting in your output.
- Limit each array to at most 6 items.`;
}

/**
 * Adapt a URL into an InputArtifact-compatible result.
 *
 * @param {string} url
 * @param {{ depth?: number, maxPages?: number, force?: string }} [opts]
 * @returns {Promise<{ ok: boolean, raw: object, normalized: object, evidence: object, reason?: string }>}
 */
export async function adaptUrl(url, opts = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, reason: 'URL is empty', raw: { url: '' }, normalized: emptyNormalized('crawl'), evidence: { pages: [] } };
  }
  const crawled = await aggressiveCrawl(url, opts);
  if (!crawled.ok) {
    return {
      ok: false,
      reason: crawled.reason,
      raw: { url },
      normalized: emptyNormalized('crawl'),
      evidence: { pages: crawled.pages, pagesCrawled: 0, depth: crawled.depth, origin: crawled.origin },
    };
  }

  // Normalize via Claude.  Fall back to a heuristic if Claude is unavailable.
  let normalized = emptyNormalized('crawl');
  try {
    const prompt = buildNormalizePrompt(crawled.pages);
    const claude = await callClaude({ prompt, maxTokens: 800, complexity: 'routine' });
    const parsed = safeParseClaudeJson(claude.text);
    if (parsed && typeof parsed === 'object') {
      normalized = {
        productConcept: typeof parsed.productConcept === 'string' ? parsed.productConcept : '',
        targetUsers:    typeof parsed.targetUsers === 'string'    ? parsed.targetUsers    : '',
        coreClaims:     Array.isArray(parsed.coreClaims)          ? parsed.coreClaims.filter((c) => typeof c === 'string').slice(0, 6) : [],
        detectedFeatures: Array.isArray(parsed.detectedFeatures)  ? parsed.detectedFeatures.filter((f) => typeof f === 'string').slice(0, 6) : [],
        observedSurfaces: 'crawl',
      };
    } else {
      normalized = heuristicNormalize(crawled.pages, 'crawl');
    }
  } catch {
    normalized = heuristicNormalize(crawled.pages, 'crawl');
  }

  return {
    ok: true,
    raw: { url },
    normalized,
    evidence: {
      pages: crawled.pages,
      pagesCrawled: crawled.pagesCrawled,
      depth: crawled.depth,
      origin: crawled.origin,
    },
  };
}

function emptyNormalized(surface) {
  return {
    productConcept: '',
    targetUsers: '',
    coreClaims: [],
    detectedFeatures: [],
    observedSurfaces: surface,
  };
}

/**
 * Heuristic fallback when Claude normalization fails: derive what we can
 * from page titles + headings without inventing claims.
 */
function heuristicNormalize(pages, surface) {
  const titles = pages.filter((p) => p.ok).map((p) => p.title).filter(Boolean);
  const metas = pages.filter((p) => p.ok).map((p) => p.metaDescription).filter(Boolean);
  const h1s = pages.flatMap((p) => (p.headings || []).filter((h) => h.tag === 'h1').map((h) => h.text)).slice(0, 6);
  const allHeadings = pages.flatMap((p) => (p.headings || []).map((h) => h.text)).slice(0, 6);
  return {
    productConcept: (metas[0] || titles[0] || '').slice(0, 240),
    targetUsers: '',
    coreClaims: h1s.length ? h1s : allHeadings,
    detectedFeatures: allHeadings,
    observedSurfaces: surface,
  };
}

/**
 * Parse Claude's "return JSON" output, tolerating a markdown fence or
 * leading whitespace.  Returns null on failure.
 */
export function safeParseClaudeJson(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Strip ```json ... ``` fences if present.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  try { return JSON.parse(body); } catch { /* fall through */ }
  // Last-ditch: find the first {...} block.
  const match = body.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { return null; }
  }
  return null;
}
