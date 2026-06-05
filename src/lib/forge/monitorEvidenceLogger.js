export function formatMonitorEvidence(output = {}) {
  return [
    '# Forge Monitor Evidence',
    `StepId: ${output.stepId ?? 'unknown'}`,
    `ProductId: ${output.productId ?? 'unknown'}`,
    `OutputUrl: ${output.target?.outputUrl ?? 'NONE'}`,
    `LiveChecked: ${String(output.liveCheck?.checked === true)}`,
    `Status: ${output.liveCheck?.status ?? 'NONE'}`,
    `RenewalRecommendation: ${output.renewalTrigger?.recommendation ?? 'NONE'}`,
  ].join('\n');
}
