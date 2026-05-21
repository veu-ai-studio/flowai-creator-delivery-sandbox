// src/lib/evaluation/findingNormalizer.js — PHASE B1 STEP 2
//
// Normalize, dedupe, cluster, and prioritize findings produced by the
// four evaluators (Phase B Playwright probe, Lighthouse, axe-core,
// runtime diagnostics). The normalizer is the SOLE place we calibrate
// severity scales + apply per-source weighting + attach provenance.
//
// Public API:
//   normalizeFindings(findingsByEvaluator) →
//     {
//       findings: NormalizedFinding[],   // sorted severity desc
//       stats: { perEvaluator: {...}, totalBeforeDedupe, totalAfterDedupe,
//                totalAfterCluster, clusters: N }
//     }
//
// Each NormalizedFinding shape:
//   {
//     id: string,                          // hash(location|category)
//     dimension: string,                   // CA-18 §2 dimension
//     category: string,
//     severity: 'critical'|'high'|'medium'|'low',
//     severityScore: number,               // 0..100 for sorting
//     location: string,                    // URL + optional CSS path
//     description: string,
//     count: number,                       // ≥1 (cluster size)
//     occurrences: Array<{url, detail?}>,  // first N raw locations
//     source: string|string[],             // single or merged sources
//     sources: Array<{source, evaluatorVersion, confidence,
//                     evidenceType, weight}>,
//     confidence: number,                  // weighted avg
//     evidenceType: string,
//   }

const SEVERITY_RANK = Object.freeze({
  critical: 100,
  high:     75,
  medium:   50,
  low:      25,
  info:     10,
});

// Per-evaluator weight applied to confidence aggregation. Lighthouse is
// noisy on some audits (e.g. SEO audits flag things that aren't bugs),
// so it gets a lower default weight than axe-core (deterministic).
const DEFAULT_WEIGHTS = Object.freeze({
  'phase-b-playwright': 1.0,
  'axe-core':           0.95,
  'runtime-diagnostics': 0.9,
  'lighthouse':          0.7,
});

/** Map any incoming severity string to a canonical bucket. */
export function calibrateSeverity(raw) {
  if (raw == null) return 'low';
  const s = String(raw).toLowerCase().trim();
  if (s === 'critical' || s === 'blocker') return 'critical';
  if (s === 'serious' || s === 'high' || s === 'error') return 'high';
  if (s === 'moderate' || s === 'medium' || s === 'warning' || s === 'warn') return 'medium';
  if (s === 'minor' || s === 'low' || s === 'notice' || s === 'info') return 'low';
  // Numeric scales — Lighthouse audits emit 0..1 score where 1 is pass.
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n < 0.5) return 'high';
    if (n < 0.7) return 'medium';
    if (n < 0.9) return 'low';
    return 'low';
  }
  return 'low';
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Build a stable id from location+category so dedupe is deterministic. */
function findingId(loc, cat) {
  return `${String(loc || '').trim()}::${String(cat || '').trim()}`.toLowerCase();
}

/**
 * Normalize a single raw finding. Returns null if it's unusable (no
 * location, no category, no description — nothing actionable).
 */
function normalizeOne(raw, sourceTag) {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw.source ?? sourceTag ?? 'unknown';
  const evaluatorVersion = raw.evaluatorVersion ?? '1.0';
  const confidence = clamp01(raw.confidence ?? 0.7);
  const evidenceType = raw.evidenceType ?? raw.category ?? 'unspecified';
  const category = raw.category ?? raw.rule ?? raw.audit ?? 'uncategorized';
  const location = raw.location ?? raw.url ?? raw.target ?? '';
  const dimension = raw.dimension ?? 'functional_completeness';
  const severity = calibrateSeverity(raw.severity);
  const description = raw.description ?? raw.detail ?? raw.title ?? category;
  if (!location && !category && !description) return null;
  return Object.freeze({
    id: findingId(location, category),
    dimension,
    category,
    severity,
    severityScore: SEVERITY_RANK[severity] ?? 0,
    location: String(location || ''),
    description: String(description || '').slice(0, 600),
    count: 1,
    occurrences: [{ url: String(location || ''), detail: raw.detail ?? null }],
    source,
    // DISPATCH U1 — provenance alias. Every emitted finding carries
    // `generated_by` so universal-mode consumers can attribute the
    // evidence to a specific evaluator (lighthouse | axe-core |
    // runtime-diagnostics | crawler | phase-b-playwright).
    generated_by: source,
    sources: [{
      source, evaluatorVersion, confidence, evidenceType,
      weight: DEFAULT_WEIGHTS[source] ?? 0.7,
    }],
    confidence,
    evidenceType,
  });
}

function mergeTwo(a, b) {
  const sources = [...a.sources];
  for (const s of b.sources) {
    if (!sources.find((x) => x.source === s.source && x.evidenceType === s.evidenceType)) {
      sources.push(s);
    }
  }
  // Weighted-average confidence by source.weight.
  const totalWeight = sources.reduce((acc, s) => acc + (s.weight ?? 0.7), 0) || 1;
  const weightedSum = sources.reduce((acc, s) => acc + (s.confidence ?? 0.7) * (s.weight ?? 0.7), 0);
  const confidence = clamp01(weightedSum / totalWeight);
  // Severity is the worst of the two (so a merge can only escalate).
  const sev = a.severityScore >= b.severityScore ? a.severity : b.severity;
  const sevScore = Math.max(a.severityScore, b.severityScore);
  const count = a.count + b.count;
  // Cap occurrences at 8 to keep payload small.
  const occurrences = [...a.occurrences, ...b.occurrences].slice(0, 8);
  const sourceTags = Array.from(new Set([...(Array.isArray(a.source) ? a.source : [a.source]),
                                          ...(Array.isArray(b.source) ? b.source : [b.source])]));
  const mergedSource = sourceTags.length === 1 ? sourceTags[0] : sourceTags;
  return Object.freeze({
    id: a.id,
    dimension: a.dimension,
    category: a.category,
    severity: sev,
    severityScore: sevScore,
    location: a.location,
    description: a.description,
    count,
    occurrences,
    source: mergedSource,
    // DISPATCH U1 — see normalizeOne(); same shape on merged findings.
    generated_by: mergedSource,
    sources,
    confidence,
    evidenceType: a.evidenceType,
  });
}

/**
 * Cluster findings that share the same category but differ in location.
 * E.g. 20 separate "color-contrast" violations at different DOM nodes →
 * one finding with count=20. We do NOT cluster across category — those
 * remain distinct rows.
 */
function clusterByCategory(findings) {
  const buckets = new Map();
  for (const f of findings) {
    const key = `${f.dimension}::${f.category}`;
    if (!buckets.has(key)) {
      buckets.set(key, f);
    } else {
      buckets.set(key, mergeTwo(buckets.get(key), f));
    }
  }
  return Array.from(buckets.values());
}

/**
 * Deduplicate by id (same location+category). Runs BEFORE clustering so
 * two evaluators reporting the SAME defect at the SAME node merge first.
 */
function dedupeById(findings) {
  const seen = new Map();
  for (const f of findings) {
    if (!seen.has(f.id)) {
      seen.set(f.id, f);
    } else {
      seen.set(f.id, mergeTwo(seen.get(f.id), f));
    }
  }
  return Array.from(seen.values());
}

/**
 * Public entry point. Accepts an object keyed by evaluator name, each
 * value an array of raw findings, OR a flat array of raw findings (in
 * which case each finding's own `source` field must classify it).
 *
 * @param {object|Array} input
 * @returns {{findings: Array, stats: object}}
 */
export function normalizeFindings(input) {
  const perEvaluator = {};
  const flat = [];

  if (Array.isArray(input)) {
    for (const f of input) {
      const norm = normalizeOne(f, f?.source ?? 'unknown');
      if (norm) {
        flat.push(norm);
        const tag = norm.sources[0]?.source ?? 'unknown';
        perEvaluator[tag] = (perEvaluator[tag] || 0) + 1;
      }
    }
  } else if (input && typeof input === 'object') {
    for (const [tag, list] of Object.entries(input)) {
      if (!Array.isArray(list)) continue;
      perEvaluator[tag] = 0;
      for (const f of list) {
        const norm = normalizeOne(f, tag);
        if (norm) {
          flat.push(norm);
          perEvaluator[tag] += 1;
        }
      }
    }
  }

  const totalBeforeDedupe = flat.length;
  const deduped = dedupeById(flat);
  const totalAfterDedupe = deduped.length;
  const clustered = clusterByCategory(deduped);
  const totalAfterCluster = clustered.length;

  clustered.sort((a, b) => {
    if (b.severityScore !== a.severityScore) return b.severityScore - a.severityScore;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.count - a.count;
  });

  return {
    findings: clustered,
    stats: {
      perEvaluator,
      totalBeforeDedupe,
      totalAfterDedupe,
      totalAfterCluster,
      clusters: totalAfterCluster,
    },
  };
}

export const __internals = Object.freeze({
  calibrateSeverity, findingId, normalizeOne, mergeTwo,
  dedupeById, clusterByCategory, DEFAULT_WEIGHTS, SEVERITY_RANK,
});
