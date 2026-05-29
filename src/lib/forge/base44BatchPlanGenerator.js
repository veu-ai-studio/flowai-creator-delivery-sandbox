const DEAD_STUB_COUNT = 120;
const FUNCTIONALIZATION_TARGET_COUNT = 25;

function stubId(index) {
  return `saige-dead-stub-${String(index + 1).padStart(3, '0')}`;
}

function targetId(index) {
  return `saige-functionalization-target-${String(index + 1).padStart(3, '0')}`;
}

export function generateSAIGEBatchPlan(auditData = null) {
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
    reason: 'Precise SAIGE surface audit data not yet loaded into matrix',
    currentReachableSurface: '18-22%',
    targetReachableSurface: '60%+',
    knownDeadStubs: DEAD_STUB_COUNT,
    knownFunctionalizationTargets: FUNCTIONALIZATION_TARGET_COUNT,
    stubDeletions: Object.freeze(Array.from({ length: DEAD_STUB_COUNT }, (_, index) => Object.freeze({
      surfaceId: stubId(index),
      reason: 'dead stub',
      safeToDelete: false,
      estimatedImpact: 'unknown',
      evidence: 'BATCH_PLAN_APPROXIMATE - precise surface data pending SAIGE matrix audit',
    }))),
    functionalizationPlan: Object.freeze(Array.from({ length: FUNCTIONALIZATION_TARGET_COUNT }, (_, index) => Object.freeze({
      surfaceId: targetId(index),
      currentState: 'stub',
      targetState: 'functional',
      requiredWork: 'Confirm surface identity, map to Base44 entity/function, wire persistence, and browser-verify reload evidence.',
      priority: index < 5 ? 1 : index < 10 ? 2 : index < 15 ? 3 : index < 20 ? 4 : 5,
      evidenceTier: index < 10 ? 'A' : 'B',
      evidence: 'BATCH_PLAN_APPROXIMATE - precise surface data pending SAIGE matrix audit',
    }))),
  });
}
