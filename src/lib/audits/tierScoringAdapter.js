import { MINIMUM_COVERAGE_THRESHOLD } from '../config.js';
import { createOrchestratorLogger } from '../orchestratorFramework/logger.js';

const VALID_TIERS = new Set(['A', 'B', 'C']);

function normalizeTier(tier) {
  const normalized = typeof tier === 'string' ? tier.toUpperCase() : '';
  return VALID_TIERS.has(normalized) ? normalized : 'B';
}

function honestStub(tier, reason) {
  return Object.freeze({
    verified: false,
    reason,
    tier,
    evidenceProvided: false,
  });
}

export async function scoreSurface(surface, verificationProvider = null, opts = {}) {
  const logger = opts.logger ?? createOrchestratorLogger('tierScoringAdapter');
  const tier = normalizeTier(surface?.tier);

  try {
    if (tier === 'C') {
      logger.warn('score_surface.tier_c_ephemeral', { surfaceId: surface?.id ?? null });
      return honestStub('C', 'Tier-C ephemeral — never counts as evidence');
    }

    if (tier === 'A') {
      if (typeof verificationProvider?.testPersistence !== 'function') {
        logger.warn('score_surface.stub', { surfaceId: surface?.id ?? null, tier, reason: 'missing_persistence_provider' });
        return honestStub('A', 'Tier-A persistence test requires product-specific runtime hook');
      }
      const result = await verificationProvider.testPersistence(surface);
      return Object.freeze({
        verified: result?.verified === true,
        reason: result?.reason,
        tier: 'A',
        evidenceProvided: true,
        rawResult: result ?? null,
      });
    }

    if (typeof verificationProvider?.testBehavioral !== 'function') {
      logger.warn('score_surface.stub', { surfaceId: surface?.id ?? null, tier, reason: 'missing_behavioral_provider' });
      return honestStub('B', 'Tier-B behavioral test requires product-specific runtime hook');
    }
    const result = await verificationProvider.testBehavioral(surface);
    return Object.freeze({
      verified: result?.verified === true,
      reason: result?.reason,
      tier: 'B',
      evidenceProvided: true,
      rawResult: result ?? null,
    });
  } catch (error) {
    logger.warn('score_surface.stub', {
      surfaceId: surface?.id ?? null,
      tier,
      reason: `provider_error:${error?.message ?? String(error)}`,
    });
    return honestStub(tier, `verification provider failed: ${error?.message ?? String(error)}`);
  }
}

export function checkEvidenceCoverage(scoredSurfaces, opts = {}) {
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : MINIMUM_COVERAGE_THRESHOLD;
  const eligible = (Array.isArray(scoredSurfaces) ? scoredSurfaces : [])
    .filter(surface => normalizeTier(surface?.tier) !== 'C');
  const evidenceBacked = eligible.filter(surface => surface?.evidenceProvided === true);
  const evidenceCoverage = eligible.length === 0 ? 0 : evidenceBacked.length / eligible.length;

  if (evidenceCoverage < threshold) {
    return Object.freeze({
      flag: 'INSUFFICIENT_EVIDENCE',
      evidenceCoverage,
      reason: 'Coverage below threshold; percentage suppressed',
    });
  }

  return Object.freeze({
    flag: 'SUFFICIENT_EVIDENCE',
    evidenceCoverage,
  });
}

export const __test = Object.freeze({
  normalizeTier,
});
