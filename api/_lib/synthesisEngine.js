// api/_lib/synthesisEngine.js
//
// Multi-URL synthesis engine for Input Mode 4.
//
// 1. Crawls 2-5 source URLs in parallel using the existing URL adapter
//    (depth-bounded multi-page traversal).
// 2. Builds a per-URL feature inventory (ctaCount, valuePropStrength,
//    trustSignalsPresent, layoutPattern, featureBreadth).
// 3. Cross-URL ranking: for each feature dimension, picks the URL whose
//    inventory exhibits the strongest example.
// 4. Composes a synthesis spec that names the contributing source per
//    feature dimension.
// 5. Passes the spec to remediationEngine via the generate-from-scratch
//    path.
//
// Returns:
//   {
//     ok: boolean,
//     renewedUrl?: string,
//     sourceContributions: [{ url, contributedFeatures: string[] }],
//     synthesisLog: string[],
//     remediation: <remediationEngine result>,
//   }

import { adaptUrl } from './inputAdapters/url.js';
import { remediate } from './remediationEngine.js';
import { buildInputArtifact } from '../../src/lib/renewal/inputArtifact.js';

const MIN_URLS = 2;
const MAX_URLS = 5;
const CTA_VERBS = /\b(sign up|signup|get started|start free|book a demo|contact sales|buy now|subscribe|try free|join now|download|request access|create account)\b/i;
const TRUST_KEYWORDS = /\b(testimonial|review|case study|trusted by|customers say|featured in|certified|iso 27001|soc 2|gdpr|hipaa|partners?)\b/i;
const LEGAL_KEYWORDS = /\b(privacy policy|terms of (service|use)|cookie policy|legal|imprint|disclaimer|gdpr)\b/i;

/**
 * @param {{
 *   urls:           string[],
 *   options?:       { depth?: number, maxPages?: number },
 *   requestOrigin?: string,
 * }} args
 */
export async function synthesize(args) {
  const { urls = [], options = {}, requestOrigin } = args;
  const synthesisLog = [];
  if (!Array.isArray(urls) || urls.length < MIN_URLS || urls.length > MAX_URLS) {
    return {
      ok: false,
      reason: `Multi-URL synthesis requires between ${MIN_URLS} and ${MAX_URLS} URLs (got ${urls.length})`,
      sourceContributions: [],
      synthesisLog,
    };
  }

  // Crawl all URLs in parallel.  Each adaptUrl call runs an internal
  // depth-bounded traversal.
  synthesisLog.push(`Crawling ${urls.length} source URLs in parallel (depth=${options.depth ?? 0}, maxPages=${options.maxPages ?? 1})`);
  const adapted = await Promise.all(
    urls.map((u) => adaptUrl(u, { depth: options.depth ?? 0, maxPages: options.maxPages ?? 1 }).catch((e) => ({ ok: false, reason: e.message || String(e), raw: { url: u } }))),
  );

  // Build a feature inventory per URL.
  const inventories = adapted.map((a, idx) => buildFeatureInventory(a, urls[idx]));
  synthesisLog.push(...inventories.map((inv) => `${inv.url} → ${inv.summary}`));

  const reachableInventories = inventories.filter((inv) => inv.ok);
  if (reachableInventories.length === 0) {
    return {
      ok: false,
      reason: 'No source URL was reachable for synthesis',
      sourceContributions: inventories.map((inv) => ({ url: inv.url, contributedFeatures: [] })),
      synthesisLog,
    };
  }

  // Cross-URL ranking: pick the strongest source per dimension.
  const winners = rankDimensions(reachableInventories);
  synthesisLog.push(`Dimension winners: ${JSON.stringify(winners)}`);

  // Aggregate per-URL contributions.
  const contribMap = new Map();
  for (const url of urls) contribMap.set(url, []);
  for (const [dim, url] of Object.entries(winners)) {
    if (url) contribMap.get(url).push(dim);
  }
  const sourceContributions = Array.from(contribMap.entries()).map(([url, contributedFeatures]) => ({ url, contributedFeatures }));

  // Compose the synthesis spec (consumed by remediationEngine).
  const spec = composeSynthesisSpec(reachableInventories, winners);
  synthesisLog.push(`Synthesis spec product concept: "${spec.productConcept}"`);

  // Build a synthetic InputArtifact that carries sourceContributions so
  // the remediation engine's generate-from-scratch prompt can attribute
  // features back to sources.
  const artifact = buildInputArtifact({
    inputType: 'multi-url-synthesis',
    raw: { urls },
    normalized: {
      productConcept: spec.productConcept,
      targetUsers: spec.targetUsers,
      coreClaims: spec.coreClaims,
      detectedFeatures: spec.detectedFeatures,
      observedSurfaces: 'crawl',
    },
  });
  // Tag the artifact for the generator.
  artifact.sourceContributions = sourceContributions;

  // Hand off to remediation engine.  Synthesis ALWAYS takes the
  // generate-from-scratch path (we have no single canonical source).
  const remediation = await remediate({ artifact, issues: [], sourceHints: null, requestOrigin });
  return {
    ok: !!remediation.ok,
    reason: remediation.ok ? undefined : remediation.reason,
    renewedUrl: remediation.renewedUrl,
    sourceContributions,
    synthesisLog,
    remediation,
  };
}

function buildFeatureInventory(adapted, url) {
  if (!adapted || !adapted.ok) {
    return { url, ok: false, summary: `unreachable: ${adapted?.reason || 'unknown'}`, scores: {} };
  }
  const pages = (adapted.evidence?.pages || []).filter((p) => p.ok);
  const bodyBlob = pages.map((p) => `${p.title || ''} ${p.metaDescription || ''} ${(p.bodyText || '')}`).join(' ').toLowerCase();
  const headingsBlob = pages.flatMap((p) => p.headings || []).map((h) => h.text || '').join(' ').toLowerCase();
  const claims = adapted.normalized?.coreClaims || [];
  const features = adapted.normalized?.detectedFeatures || [];
  const scores = {
    ctaCount: (bodyBlob.match(CTA_VERBS) || []).length,
    valuePropStrength: claims.length + (adapted.normalized?.productConcept?.length || 0) / 100,
    trustSignalsPresent: TRUST_KEYWORDS.test(bodyBlob),
    legalPresent: LEGAL_KEYWORDS.test(bodyBlob),
    featureBreadth: features.length,
    headingHierarchy: pages.reduce((a, p) => a + (p.headings?.length || 0), 0),
  };
  return {
    url, ok: true,
    summary: `cta=${scores.ctaCount}/value=${scores.valuePropStrength.toFixed(1)}/trust=${scores.trustSignalsPresent ? 'Y' : 'N'}/legal=${scores.legalPresent ? 'Y' : 'N'}/features=${scores.featureBreadth}`,
    scores,
    normalized: adapted.normalized,
  };
}

function rankDimensions(inventories) {
  const pickMax = (key) => {
    let best = null;
    let bestScore = -Infinity;
    for (const inv of inventories) {
      const v = typeof inv.scores[key] === 'number' ? inv.scores[key] : (inv.scores[key] ? 1 : 0);
      if (v > bestScore) { bestScore = v; best = inv.url; }
    }
    return bestScore > 0 ? best : null;
  };
  return {
    cta: pickMax('ctaCount'),
    valueProp: pickMax('valuePropStrength'),
    trustSignals: pickMax('trustSignalsPresent'),
    legal: pickMax('legalPresent'),
    features: pickMax('featureBreadth'),
    headingHierarchy: pickMax('headingHierarchy'),
  };
}

function composeSynthesisSpec(reachable, winners) {
  // Pull the strongest concept + targetUsers + claims from the
  // dimension winners' normalized data.
  const byUrl = new Map(reachable.map((inv) => [inv.url, inv]));
  const valueWinner = winners.valueProp ? byUrl.get(winners.valueProp) : reachable[0];
  const ctaWinner = winners.cta ? byUrl.get(winners.cta) : null;
  const featuresWinner = winners.features ? byUrl.get(winners.features) : null;

  const productConcept = valueWinner?.normalized?.productConcept || 'A synthesized product combining the strongest elements of the source URLs';
  const targetUsers = valueWinner?.normalized?.targetUsers || '';
  const coreClaims = Array.from(new Set((reachable.flatMap((inv) => inv.normalized?.coreClaims || [])).slice(0, 6)));
  const detectedFeatures = featuresWinner?.normalized?.detectedFeatures
    ? featuresWinner.normalized.detectedFeatures
    : Array.from(new Set(reachable.flatMap((inv) => inv.normalized?.detectedFeatures || []).slice(0, 6)));
  return { productConcept, targetUsers, coreClaims, detectedFeatures };
}

export const __internals = Object.freeze({
  buildFeatureInventory,
  rankDimensions,
  composeSynthesisSpec,
  MIN_URLS, MAX_URLS,
});
