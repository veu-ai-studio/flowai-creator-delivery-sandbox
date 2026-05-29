// api/_lib/inputAdapters/multiUrl.js
//
// Multi-URL input adapter — accepts 2-5 URLs, returns an InputArtifact-
// compatible result whose `normalized` field summarizes the cross-URL
// synthesis.  The actual synthesis (per-URL feature inventories,
// cross-URL ranking, generate-from-scratch deploy) is done by
// api/_lib/synthesisEngine.js when the renewalEngine routes this input.

import { adaptUrl } from './url.js';

const MIN_URLS = 2;
const MAX_URLS = 5;

/**
 * @param {string[]} urls
 * @param {{ depth?: number, maxPages?: number }} [opts]
 * @returns {Promise<{ ok: boolean, raw: object, normalized: object, evidence: object, reason?: string }>}
 */
export async function adaptMultiUrl(urls, opts = {}) {
  const clean = Array.isArray(urls) ? urls.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean) : [];
  if (clean.length < MIN_URLS || clean.length > MAX_URLS) {
    return {
      ok: false,
      reason: `Multi-URL synthesis requires between ${MIN_URLS} and ${MAX_URLS} URLs (got ${clean.length})`,
      raw: { urls: clean },
      normalized: empty(),
      evidence: { perUrl: [] },
    };
  }

  // Cheap pass: adapt each URL with a shallow crawl (depth=0, maxPages=1).
  // The synthesis engine will re-crawl when routed.  We do this once
  // here so the issue detector can run common detectors against a
  // best-effort merged normalized field.
  const adapted = await Promise.all(
    clean.map((u) => adaptUrl(u, { depth: 0, maxPages: 1 }).catch((e) => ({
      ok: false, reason: e.message || String(e), raw: { url: u },
      normalized: empty(), evidence: { pages: [] },
    }))),
  );

  // Merge normalized fields heuristically.
  const reachable = adapted.filter((a) => a.ok);
  const productConcept = reachable[0]?.normalized?.productConcept
    ? `Synthesized: ${reachable[0].normalized.productConcept}`
    : 'Synthesized product from multiple sources';
  const targetUsers = reachable[0]?.normalized?.targetUsers || '';
  const coreClaims = uniq(reachable.flatMap((a) => a.normalized?.coreClaims || [])).slice(0, 6);
  const detectedFeatures = uniq(reachable.flatMap((a) => a.normalized?.detectedFeatures || [])).slice(0, 6);

  return {
    ok: reachable.length >= 1,
    reason: reachable.length === 0 ? 'No source URL was reachable' : undefined,
    raw: { urls: clean },
    normalized: {
      productConcept,
      targetUsers,
      coreClaims,
      detectedFeatures,
      observedSurfaces: 'crawl',
    },
    evidence: {
      perUrl: adapted.map((a, i) => ({
        url: clean[i],
        ok: a.ok,
        reason: a.reason || null,
        pages: a.evidence?.pages || [],
      })),
    },
  };
}

function empty() {
  return { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'crawl' };
}

function uniq(arr) {
  return Array.from(new Set(arr.filter((v) => typeof v === 'string')));
}

export const __internals = Object.freeze({ MIN_URLS, MAX_URLS });
