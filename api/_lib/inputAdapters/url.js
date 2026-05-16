// api/_lib/inputAdapters/url.js
//
// URL input adapter for the FlowAI renewal pipeline.
//
// Walks the target URL via the canonical Aggressive Crawl Engine Phase 1
// (api/_lib/crawler.js → aggressiveCrawl). The prior in-file
// depth=2/maxPages=8 BFS spider was superseded by the ACE Phase 1
// promotion (CANONICAL_REFERENCE §6, ENTRY 006) — default depth=8 /
// hard cap 12 + default pages=200 / hard cap 2000. Hard caps are
// overridable via Doppler env (`CRAWL_DEPTH_HARD_CAP`,
// `CRAWL_MAX_PAGES_HARD_CAP`).
//
// ─── SCOPE ─────────────────────────────────────────────────────────────
// This adapter wraps the ACE crawl with the InputArtifact normalisation
// layer. Per-page rendering is delegated to ACE; this file owns only the
// Claude-normalisation of the crawl evidence into the
// InputArtifact.normalized shape consumed by the issue detector.
//
// ─── OUTPUT ────────────────────────────────────────────────────────────
// Returns an object the renewal orchestrator wraps into an InputArtifact:
//   {
//     raw:        { url },
//     normalized: { productConcept, targetUsers, coreClaims,
//                   observedSurfaces: 'crawl', detectedFeatures },
//     evidence:   { pages, pagesCrawled, depth, origin, durationMs,
//                   warnings, errors }
//   }
// `evidence` is not part of the public InputArtifact shape but is passed
// alongside so the issue detector can run URL-specific detectors against
// the actual crawl output. `pages` carries the rich ACE PageRecord shape
// (title, metaDescription, bodyText, headings, surfaces, accessibility,
// timing, consoleErrors, networkErrors).

import { aggressiveCrawl } from '../crawler.js';
import { callClaude } from '../claude.js';

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
  // ACE Phase 1 surfaces input failures via ok:false (e.g. empty/invalid
  // URL) and per-page render failures via errors[] (the crawl can still
  // be useful even with some failed pages). Treat "ok:false from
  // aggressiveCrawl OR zero pages rendered" as adapter failure.
  if (!crawled.ok || crawled.pagesCrawled === 0) {
    const firstError = (crawled.errors && crawled.errors[0]) || null;
    const reason = firstError
      ? `${firstError.phase}: ${firstError.reason}`
      : (crawled.warnings?.[0] ?? 'no pages rendered');
    return {
      ok: false,
      reason,
      raw: { url },
      normalized: emptyNormalized('crawl'),
      evidence: {
        pages: crawled.pages ?? [],
        pagesCrawled: 0,
        depth: crawled.depth ?? 0,
        origin: crawled.origin ?? '',
        errors: crawled.errors ?? [],
        warnings: crawled.warnings ?? [],
      },
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
      pageCap: crawled.pageCap,
      origin: crawled.origin,
      durationMs: crawled.durationMs,
      warnings: crawled.warnings ?? [],
      errors: crawled.errors ?? [],
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
