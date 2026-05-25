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

import { EVALUATOR_IDS } from './evaluatorIds.js';

const CATEGORY_DIMENSION = Object.freeze({
  performance:      'performance',
  accessibility:    'accessibility',
  'best-practices': 'bugs_errors_detector',
  seo:              'ui_ux',
});

const CATEGORY_KEYS = Object.freeze(['performance', 'accessibility', 'best-practices', 'seo']);
const VERCEL_LIGHTHOUSE_UNAVAILABLE_REASON = 'lighthouse_unavailable_in_vercel_serverless';
const LIGHTHOUSE_ASSET_CANDIDATES = Object.freeze([
  ['report', 'flow-report', 'assets', 'standalone-flow-template.html'],
  ['report', 'generator', 'flow-report', 'assets', 'standalone-flow-template.html'],
]);

function nullScores(categories = CATEGORY_KEYS) {
  return Object.fromEntries(categories.map((category) => [category, null]));
}

function isVercelServerless() {
  return typeof process !== 'undefined' && process.env?.VERCEL === '1';
}

function isLighthouseAssetError(message) {
  const s = typeof message === 'string' ? message : String(message ?? '');
  return /ENOENT/i.test(s) && /lighthouse[\\/].*(flow-report[\\/]assets|report[\\/]generator)/i.test(s);
}

function sanitizeLighthouseError(message) {
  if (isLighthouseAssetError(message)) return VERCEL_LIGHTHOUSE_UNAVAILABLE_REASON;
  return (typeof message === 'string' ? message : String(message ?? 'unknown')).slice(0, 200);
}

async function lighthouseAssetsAvailable({ deps } = {}) {
  if (typeof deps?.lighthouseAssetsAvailable === 'boolean') return deps.lighthouseAssetsAvailable;
  if (typeof deps?.assetExists === 'function') return !!(await deps.assetExists());

  try {
    const [{ createRequire }, { access }, path] = await Promise.all([
      import('node:module'),
      import('node:fs/promises'),
      import('node:path'),
    ]);
    const require = createRequire(import.meta.url);
    const packageJson = require.resolve('lighthouse/package.json');
    const packageRoot = path.dirname(packageJson);
    for (const candidate of LIGHTHOUSE_ASSET_CANDIDATES) {
      try {
        await access(path.join(packageRoot, ...candidate));
        return true;
      } catch {
        // Try the next known Lighthouse asset location.
      }
    }
    return false;
  } catch {
    return false;
  }
}

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
    evaluator_id: EVALUATOR_IDS.LIGHTHOUSE,
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
    return { ok: false, findings: [], scores: nullScores(categories), error: 'url_required' };
  }

  if (isVercelServerless() && !(await lighthouseAssetsAvailable({ deps: opts.deps }))) {
    return {
      ok: false,
      findings: [],
      scores: nullScores(categories),
      error: VERCEL_LIGHTHOUSE_UNAVAILABLE_REASON,
      reason: VERCEL_LIGHTHOUSE_UNAVAILABLE_REASON,
    };
  }

  // Lazy-import so the renewal orchestrator doesn't pay the
  // chrome-launcher startup cost when Lighthouse isn't being used.
  let lighthouseModule;
  let chromeLauncher;
  try {
    lighthouseModule = opts.deps?.lighthouse || (await import('lighthouse'));
    chromeLauncher = opts.deps?.chromeLauncher || (await import('chrome-launcher'));
  } catch (e) {
    return { ok: false, findings: [], scores: nullScores(categories), error: `import_failed:${sanitizeLighthouseError(e?.message ?? String(e))}` };
  }
  const lighthouse = lighthouseModule.default ?? lighthouseModule;

  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    return { ok: false, findings: [], scores: nullScores(categories), error: `chrome_launch_failed:${sanitizeLighthouseError(e?.message ?? String(e))}` };
  }

  // DISPATCH U1 ITEM 1 — suppress HTML report generation so Vercel
  // serverless (where Lighthouse's flow-report/assets/* HTML templates
  // aren't bundled) cannot ENOENT on report rendering. We request the
  // JSON renderer explicitly via the array form, and we extract the
  // numeric scores directly from result.lhr without touching the
  // report string. If the underlying lighthouse() call still throws
  // ENOENT for a template path (eager module init), we degrade
  // gracefully: log the ENOENT, scrub the template path from the
  // error message, and return ok:false with the scores list empty.
  let result;
  let lighthouseErr = null;
  try {
    const lhOptions = {
      port: chrome.port,
      output: ['json'],          // array form ⇒ skip HTML renderer entirely
      onlyCategories: categories,
      logLevel: 'silent',
      maxWaitForLoad: Math.min(timeoutMs, 90_000),
      disableFullPageScreenshot: true,
    };
    const runPromise = lighthouse(url, lhOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('lighthouse_timeout')), timeoutMs)
    );
    result = await Promise.race([runPromise, timeoutPromise]);
  } catch (e) {
    lighthouseErr = e;
    // If the error is ENOENT for one of Lighthouse's HTML-report
    // assets, the underlying lhr may still be reachable on the
    // thrown error (some Lighthouse versions attach result.lhr to
    // partial-failure errors). Try to salvage it.
    const msg = e?.message ?? String(e);
    const isTemplateEnoent = /ENOENT/.test(msg) && /flow-report\/assets|report\/generator/.test(msg);
    if (isTemplateEnoent && e?.lhr && typeof e.lhr === 'object') {
      result = { lhr: e.lhr };
      lighthouseErr = null;
    }
  }
  try { await chrome.kill(); } catch { /* ignore */ }

  if (lighthouseErr) {
    return {
      ok: false,
      findings: [],
      scores: nullScores(categories),
      error: sanitizeLighthouseError(lighthouseErr?.message ?? String(lighthouseErr)),
    };
  }

  const lhr = result?.lhr;
  if (!lhr || typeof lhr !== 'object') {
    return { ok: false, findings: [], scores: nullScores(categories), error: 'no_lhr_in_result' };
  }
  const audits = lhr.audits || {};
  const categoryRefs = lhr.categories || {};
  const findings = [];
  const scores = {};
  for (const catKey of categories) {
    const score = categoryRefs[catKey]?.score;
    scores[catKey] = typeof score === 'number' ? Math.round(score * 100) : null;
  }

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

  return { ok: true, findings, scores };
}

export const __internals = Object.freeze({
  CATEGORY_DIMENSION, CATEGORY_KEYS, severityFromAuditScore,
  VERCEL_LIGHTHOUSE_UNAVAILABLE_REASON,
  isLighthouseAssetError,
  sanitizeLighthouseError,
  lighthouseAssetsAvailable,
  nullScores,
});
