import { SELF_RENEWAL_THRESHOLD } from './scoringAdapter.js';
import { isScorableEntry } from './matrixAuthority.js';
import { createOrchestratorLogger } from './logger.js';
import { checkEvidenceCoverage, scoreSurface } from '../audits/tierScoringAdapter.js';

const SCORABLE_TIERS = new Set(['A', 'B']);

function normalizeTier(tier) {
  const normalized = typeof tier === 'string' ? tier.toUpperCase() : 'B';
  return ['A', 'B', 'C'].includes(normalized) ? normalized : 'B';
}

function allMatrixEntries(matrixState = {}) {
  return [...(matrixState.layer1 ?? []), ...(matrixState.layer2 ?? [])];
}

function inProductScope(entry, productId) {
  if (!entry.productId && !entry.productIds) return true;
  if (entry.productId) return entry.productId === productId;
  return Array.isArray(entry.productIds) && entry.productIds.includes(productId);
}

function normalizeSurface(entry) {
  return Object.freeze({
    id: entry.surfaceId ?? entry.id,
    name: entry.name ?? entry.surfaceId ?? entry.id,
    tier: normalizeTier(entry.tier),
    status: entry.status,
    description: entry.description,
    ratificationState: entry.ratificationState,
  });
}

function denominatorSurfaces(matrixState, productId) {
  return allMatrixEntries(matrixState)
    .filter(entry => inProductScope(entry, productId))
    .filter(isScorableEntry)
    .map(normalizeSurface)
    .filter(surface => SCORABLE_TIERS.has(surface.tier));
}

function defaultSelfScore(flowaiSelfScore) {
  if (flowaiSelfScore && typeof flowaiSelfScore === 'object') {
    return Object.freeze({
      verified: flowaiSelfScore.verified === true,
      reason: flowaiSelfScore.reason,
      tier: normalizeTier(flowaiSelfScore.tier),
      verified_pct: flowaiSelfScore.verified_pct ?? null,
    });
  }

  return Object.freeze({
    verified: false,
    verified_pct: null,
    tier: 'B',
    reason: 'FlowAI self-score not yet instrumented',
  });
}

function maybeCredibilityWarning(flowaiSelfScore) {
  return typeof flowaiSelfScore.verified_pct === 'number' && flowaiSelfScore.verified_pct < 20
    ? 'FlowAI self-score below 20%; product scores issued with reduced credibility'
    : null;
}

export async function orchestrateScore(matrixState = {}, productId, verificationProviders = {}, opts = {}) {
  const logger = opts.logger ?? createOrchestratorLogger('ScoringOrchestrator');
  const surfaces = denominatorSurfaces(matrixState, productId);
  const scoredSurfaces = [];

  for (const surface of surfaces) {
    const provider = verificationProviders[surface.id] ?? verificationProviders[surface.tier] ?? verificationProviders.default ?? null;
    scoredSurfaces.push(await scoreSurface(surface, provider, { logger }));
  }

  const coverage = checkEvidenceCoverage(scoredSurfaces, opts.coverage ?? {});
  const flowaiSelfScore = defaultSelfScore(opts.flowaiSelfScore);
  const credibilityWarning = maybeCredibilityWarning(flowaiSelfScore);
  const base = {
    productId,
    denominator: surfaces.length,
    evidenceCoverage: coverage.evidenceCoverage,
    matrixArtifactVersion: String(matrixState.matrixArtifactVersion ?? matrixState.version ?? 'unknown'),
    flowaiSelfScore,
    scoredSurfaces: Object.freeze(scoredSurfaces),
  };

  if (coverage.flag === 'INSUFFICIENT_EVIDENCE') {
    return Object.freeze({
      ...base,
      flag: coverage.flag,
      reason: coverage.reason,
      gtmFlag: 'INSUFFICIENT_EVIDENCE',
      ...(credibilityWarning ? { credibilityWarning } : {}),
    });
  }

  const verifiedCount = scoredSurfaces.filter(surface => surface.verified === true && surface.tier !== 'C').length;
  const verifiedPct = surfaces.length === 0 ? 0 : Math.round((verifiedCount / surfaces.length) * 10000) / 100;
  const gtmFlag = verifiedPct >= SELF_RENEWAL_THRESHOLD ? 'GTM-ELIGIBLE' : 'GTM-BLOCKED';

  return Object.freeze({
    ...base,
    verified_pct: verifiedPct,
    surfacesVerified: verifiedCount,
    surfacesFailed: Math.max(0, surfaces.length - verifiedCount),
    gtmFlag,
    ...(credibilityWarning ? { credibilityWarning } : {}),
  });
}

export const __test = Object.freeze({
  denominatorSurfaces,
  normalizeTier,
});
