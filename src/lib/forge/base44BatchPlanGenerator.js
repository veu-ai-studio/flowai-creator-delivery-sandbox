const DEAD_STUB_COUNT = 120;
const FUNCTIONALIZATION_TARGET_COUNT = 25;

function stubId(productId, index) {
  return `${productId}-dead-stub-${String(index + 1).padStart(3, '0')}`;
}

function targetId(productId, index) {
  return `${productId}-functionalization-target-${String(index + 1).padStart(3, '0')}`;
}

function resolveProductId(auditData, opts) {
  if (typeof opts === 'string' && opts.trim()) return opts.trim();
  if (opts?.productId) return opts.productId;
  if (auditData?.productId) return auditData.productId;
  return 'unknown';
}

export function generateBase44BatchPlan(auditData = null, opts = {}) {
  const productId = resolveProductId(auditData, opts);
  if (auditData?.stubDeletions && auditData?.functionalizationPlan) {
    return Object.freeze({
      status: 'BATCH_PLAN_FROM_AUDIT',
      currentReachableSurface: auditData.currentReachableSurface,
      targetReachableSurface: auditData.targetReachableSurface,
      stubDeletions: Object.freeze(auditData.stubDeletions),
      functionalizationPlan: Object.freeze(auditData.functionalizationPlan),
    });
  }

  return Object.freeze({
    status: 'BATCH_PLAN_APPROXIMATE',
    verified: false,
    reason: `Precise ${productId} surface audit data not yet loaded into matrix`,
    currentReachableSurface: '18-22%',
    targetReachableSurface: '60%+',
    knownDeadStubs: DEAD_STUB_COUNT,
    knownFunctionalizationTargets: FUNCTIONALIZATION_TARGET_COUNT,
    stubDeletions: Object.freeze(Array.from({ length: DEAD_STUB_COUNT }, (_, index) => Object.freeze({
      surfaceId: stubId(productId, index),
      reason: 'dead stub',
      safeToDelete: false,
      estimatedImpact: 'unknown',
      evidence: `BATCH_PLAN_APPROXIMATE - precise surface data pending ${productId} matrix audit`,
    }))),
    functionalizationPlan: Object.freeze(Array.from({ length: FUNCTIONALIZATION_TARGET_COUNT }, (_, index) => Object.freeze({
      surfaceId: targetId(productId, index),
      currentState: 'stub',
      targetState: 'functional',
      requiredWork: 'Confirm surface identity, map to Base44 entity/function, wire persistence, and browser-verify reload evidence.',
      priority: index < 5 ? 1 : index < 10 ? 2 : index < 15 ? 3 : index < 20 ? 4 : 5,
      evidenceTier: index < 10 ? 'A' : 'B',
      evidence: `BATCH_PLAN_APPROXIMATE - precise surface data pending ${productId} matrix audit`,
    }))),
  });
}
