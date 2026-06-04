export function formatGtmEvidence(output = {}) {
  return [
    '# Forge GTM Evidence',
    `StepId: ${output.stepId ?? 'unknown'}`,
    `ProductId: ${output.productId ?? 'unknown'}`,
    `GtmReady: ${String(output.gtmReady === true)}`,
    `ReadinessScore: ${output.readiness?.score ?? 'NONE'}`,
    `HumanDecisionRecorded: ${String(output.decision?.recorded === true)}`,
  ].join('\n');
}
