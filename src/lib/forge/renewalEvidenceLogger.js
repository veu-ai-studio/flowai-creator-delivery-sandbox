export function formatRenewalEvidence(output = {}) {
  const recommendation = output.recommendation ?? {};
  const application = output.application ?? {};
  const verification = output.verification ?? {};
  return [
    '# Forge Self-Renewal Evidence',
    `StepId: ${output.stepId ?? 'unknown'}`,
    `ProductId: ${output.productId ?? 'unknown'}`,
    `Authority: ${recommendation.authority ?? 'recommend_only'}`,
    `Recommendation: ${recommendation.recommendation ?? 'NONE'}`,
    `ApplicationOutcome: ${application.outcome ?? 'NONE'}`,
    `VerificationStatus: ${verification.status ?? 'NONE'}`,
    `RenewalComplete: ${String(output.renewalComplete === true)}`,
  ].join('\n');
}
