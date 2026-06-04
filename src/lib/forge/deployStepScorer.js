export const DEPLOY_BLOCKED = 'DEPLOY_BLOCKED';
export const DEPLOY_OPERATOR_GATE = 'DEPLOY_OPERATOR_GATE';
export const DEPLOY_OUTPUT_REQUIRED = 'DEPLOY_OUTPUT_REQUIRED';

function sectionInput(output, id) {
  return output?.sections?.find(section => section.id === id)?.input ?? null;
}

function hasHostedUrl(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.outputUrl !== 'string' || !value.outputUrl.trim()) return false;
  try {
    const parsed = new URL(value.outputUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function scoreDeployStep(deployOutput = {}) {
  const auditGate = sectionInput(deployOutput, 'deploy-audit-gate') ?? {};
  const artifact = sectionInput(deployOutput, 'delivery-artifact') ?? {};
  const adapter = sectionInput(deployOutput, 'distribution-adapter') ?? {};
  const approval = sectionInput(deployOutput, 'operator-approval') ?? {};
  const browserProof = sectionInput(deployOutput, 'browser-proof') ?? {};

  const gateCleared = auditGate.readyForDeploy === true;
  const operatorApproved = approval.operatorApproved === true;
  const artifactProduced = artifact.artifactProduced === true && hasHostedUrl(artifact);
  const submissionInitiated = adapter.submissionInitiated === true;
  const browserProofPresent = browserProof.status === 'PASS' || browserProof.status === 'PENDING';

  let flag = null;
  if (!gateCleared) flag = DEPLOY_BLOCKED;
  else if (!operatorApproved) flag = DEPLOY_OPERATOR_GATE;
  else if (!artifactProduced || !submissionInitiated) flag = DEPLOY_OUTPUT_REQUIRED;

  const deployComplete = gateCleared && operatorApproved && artifactProduced && submissionInitiated;
  const deployScore = Math.round(([
    gateCleared,
    operatorApproved,
    artifactProduced,
    submissionInitiated,
    browserProofPresent,
  ].filter(Boolean).length / 5) * 10000) / 100;

  const correctivePrompts = [];
  if (!gateCleared) correctivePrompts.push('Quality Audit must clear readyForDeploy before Step 5 can run.');
  if (!operatorApproved) correctivePrompts.push('Authorized operator approval is required before deploy/submission.');
  if (!artifactProduced) correctivePrompts.push('Deploy must produce a real delivery artifact URL; fabricated URLs do not count.');
  if (!submissionInitiated) correctivePrompts.push('Distribution handoff must be initiated after operator approval.');
  if (!browserProofPresent) correctivePrompts.push('Browser proof is required before delivery evidence can become Tier A.');

  return Object.freeze({
    stepId: deployOutput.stepId,
    deployScore,
    score: deployScore,
    deployComplete,
    readyForSelfRenewal: deployComplete,
    outputUrl: artifact.outputUrl ?? null,
    deploymentId: artifact.deploymentId ?? null,
    flag,
    correctivePrompts: Object.freeze(correctivePrompts),
  });
}

export const __test = Object.freeze({
  hasHostedUrl,
});
