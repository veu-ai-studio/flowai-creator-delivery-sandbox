// src/lib/evaluation/lighthouseEvaluator.js — PHASE B1 STEP 3
//
// Run Lighthouse programmatically against a URL and map each failed
// audit to a normalized finding with provenance. We treat Lighthouse
// as ONE signal source — not score authority. The findingNormalizer
// applies a per-source weight (0.7 default for Lighthouse) so noisy
// audits don't dominate the final ranking.
//
// Public:
//   runLighthouseEvaluator(url, opts?) → { ok, findings, error? }
//
// Graceful: any failure (Chrome unavailable, Lighthouse throws,
// timeout) returns { ok: false, findings: [], error } — never throws.
//
// CA-18 §2 dimension mapping:
//   performance         → 'performance'
//   accessibility       → 'accessibility'
//   best-practices      → 'bugs_errors_detector'
//   seo                 → 'ui_ux'

const CATEGORY_DIMENSION = Object.freeze({
  performance:      'performance',
  accessibility:    'accessibility',
  'best-practices': 'bugs_errors_detector',
  seo:              'ui_ux',
});

const CATEGORY_KEYS = Object.freeze(['performance', 'accessibility', 'best-practices', 'seo']);

/**
 * Map a Lighthouse audit's numeric score (0..1, 1=pass) to a calibrated
 * severity bucket. The normalizer re-calibrates on the receiving side
 * but Lighthouse's own scale benefits from category-specific tightening.
 */
function severityFromAuditScore(score, category) {
  if (score === null || score === undefined) return 'low';
  const n = Number(score);
  if (!Number.isFinite(n)) return 'low';
  if (n >= 0.9) return 'low';        // passing
  if (category === 'accessibility' || category === 'best-practices') {
    if (n < 0.5) return 'high';
    if (n < 0.7) return 'medium';
    return 'low';
  }
  if (category === 'performance') {
    if (n < 0.4) return 'high';
    if (n < 0.7) return 'medium';
    return 'low';
  }
  // SEO is the noisiest — bias low.
  if (n < 0.4) return 'medium';
  return 'low';
}

/** Convert one Lighthouse audit into a normalized finding shape. */
export function normalizeLighthouseFinding({ url, category, auditId, audit }) {
  const dimension = CATEGORY_DIMENSION[category] ?? 'functional_completeness';
  const score = audit?.score;
  const severity = severityFromAuditScore(score, category);
  const description = (() => {
    const title = audit?.title || auditId;
    const desc = audit?.description || '';
    const display = audit?.displayValue ? ` [${audit.displayValue}]` : '';
    return `${title}${display}: ${desc.replace(/<[^>]+>/g, '').slice(0, 240)}`;
  })();
  return {
    category: `lighthouse:${auditId}`,
    severity,
    location: url,
    description,
    source: 'lighthouse',
    evaluatorVersion: 'lh-13',
    confidence: severity === 'high' ? 0.75 : severity === 'medium' ? 0.65 : 0.55,
    evidenceType: `lh-audit:${category}`,
    dimension,
    detail: { auditId, score: typeof score === 'number' ? score : null, category },
  };
}

/**
 * Run Lighthouse against `url`. Returns up to opts.maxFindings findings
 * across all categories. Failure modes (Chrome launch fails, Lighthouse
 * throws, timeout) collapse to { ok: false, findings: [] }.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=120000]
 * @param {number} [opts.maxFindings=80]
 * @param {Array<string>} [opts.categories]   — subset of CATEGORY_KEYS
 * @param {object} [opts.deps]                — { lighthouse, chromeLauncher } overrides
 */
export async function runLighthouseEvaluator(url, opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 120_000;
  const maxFindings = Number.isFinite(opts.maxFindings) ? opts.maxFindings : 80;
  const categories = Array.isArray(opts.categories) && opts.categories.length > 0
    ? opts.categories.filter((c) => CATEGORY_KEYS.includes(c))
    : [...CATEGORY_KEYS];

  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, findings: [], error: 'url_required' };
  }

  // Lazy-import so the renewal orchestrator doesn't pay the
  // chrome-launcher startup cost when Lighthouse isn't being used.
  let lighthouseModule;
  let chromeLauncher;
  try {
    lighthouseModule = opts.deps?.lighthouse || (await import('lighthouse'));
    chromeLauncher = opts.deps?.chromeLauncher || (await import('chrome-launcher'));
  } catch (e) {
    return { ok: false, findings: [], error: `import_failed:${e?.message ?? String(e)}` };
  }
  const lighthouse = lighthouseModule.default ?? lighthouseModule;

  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    return { ok: false, findings: [], error: `chrome_launch_failed:${(e?.message ?? String(e)).slice(0, 160)}` };
  }

  let result;
  try {
    const lhOptions = {
      port: chrome.port,
      output: 'json',
      onlyCategories: categories,
      logLevel: 'silent',
      maxWaitForLoad: Math.min(timeoutMs, 90_000),
    };
    const runPromise = lighthouse(url, lhOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('lighthouse_timeout')), timeoutMs)
    );
    result = await Promise.race([runPromise, timeoutPromise]);
  } catch (e) {
    try { await chrome.kill(); } catch { /* ignore */ }
    return { ok: false, findings: [], error: (e?.message ?? String(e)).slice(0, 200) };
  }
  try { await chrome.kill(); } catch { /* ignore */ }

  const lhr = result?.lhr;
  if (!lhr || typeof lhr !== 'object') {
    return { ok: false, findings: [], error: 'no_lhr_in_result' };
  }
  const audits = lhr.audits || {};
  const categoryRefs = lhr.categories || {};
  const findings = [];

  for (const catKey of categories) {
    const cat = categoryRefs[catKey];
    if (!cat || !Array.isArray(cat.auditRefs)) continue;
    for (const ref of cat.auditRefs) {
      if (findings.length >= maxFindings) break;
      const audit = audits[ref.id];
      if (!audit) continue;
      // Skip passing audits (score === 1) and informational audits (score === null && scoreDisplayMode !== 'manual').
      const score = audit.score;
      const isPass = score === 1;
      const isInfoOnly = score === null && audit.scoreDisplayMode === 'informative';
      if (isPass || isInfoOnly) continue;
      // Manual audits with null score = recommendations, surface as low severity only when high-impact.
      findings.push(normalizeLighthouseFinding({ url, category: catKey, auditId: ref.id, audit }));
    }
  }

  return { ok: true, findings };
}

export const __internals = Object.freeze({
  CATEGORY_DIMENSION, CATEGORY_KEYS, severityFromAuditScore,
});
