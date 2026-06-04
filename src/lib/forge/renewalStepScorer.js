export const RENEWAL_BLOCKED = 'RENEWAL_BLOCKED';
export const RENEWAL_OPERATOR_GATE = 'RENEWAL_OPERATOR_GATE';
export const RENEWAL_ESCALATED = 'RENEWAL_ESCALATED';
export const RENEWAL_ACTION_UNAVAILABLE = 'RENEWAL_ACTION_UNAVAILABLE';

function sectionInput(output, id) {
  return output?.sections?.find(section => section.id === id)?.input ?? null;
}

export function scoreRenewalStep(renewalOutput = {}) {
  const deployGate = sectionInput(renewalOutput, 'renewal-deploy-gate') ?? {};
  const recommendation = sectionInput(renewalOutput, 'renewal-agent-recommendation') ?? {};
  const delta = sectionInput(renewalOutput, 'renewal-proposed-delta') ?? {};
  const approval = sectionInput(renewalOutput, 'renewal-operator-approval') ?? {};
  const application = sectionInput(renewalOutput, 'renewal-application') ?? {};
  const verification = sectionInput(renewalOutput, 'renewal-verification') ?? {};

  const deployReady = deployGate.readyForRenewal === true;
  const recommendationPresent = typeof recommendation.recommendation === 'string' && recommendation.recommendation.length > 0;
  const hasDeltaDecision = delta.noActionNeeded === true || typeof delta.proposedFix === 'string';
  const approved = approval.operatorApproved === true;
  const noMutationNeeded = application.outcome === 'no_action_needed';
  const applied = application.outcome === 'applied';
  const escalated = application.outcome === 'escalated';
  const unavailable = application.outcome === 'unavailable';
  const verificationPresent = verification.status === 'PASS'
    || verification.status === 'PENDING'
    || verification.status === 'GUIDANCE_ONLY';
  const safeTerminal = noMutationNeeded || applied || escalated || unavailable;

  let flag = null;
  if (!deployReady) flag = RENEWAL_BLOCKED;
  else if (escalated) flag = RENEWAL_ESCALATED;
  else if (unavailable) flag = RENEWAL_ACTION_UNAVAILABLE;
  else if (!noMutationNeeded && !approved) flag = RENEWAL_OPERATOR_GATE;

  const renewalComplete = deployReady && recommendationPresent && hasDeltaDecision && safeTerminal && verificationPresent;
  const renewalScore = Math.round(([
    deployReady,
    recommendationPresent,
    hasDeltaDecision,
    safeTerminal,
    verificationPresent,
  ].filter(Boolean).length / 5) * 10000) / 100;

  const correctivePrompts = [];
  if (!deployReady) correctivePrompts.push('Deploy evidence is required before Self-Renewal can run.');
  if (!recommendationPresent) correctivePrompts.push('Agent #3 recommendation is required.');
  if (!hasDeltaDecision) correctivePrompts.push('Self-Renewal must emit a proposed delta or no-action guidance.');
  if (!noMutationNeeded && !approved) correctivePrompts.push('Authorized operator approval is required before applying a renewal fix.');
  if (escalated) correctivePrompts.push('Repeated renewal failures escalated to human gate.');
  if (unavailable) correctivePrompts.push('No safe automatic fix is available; remediation guidance emitted.');
  if (!verificationPresent) correctivePrompts.push('Before/after or guidance verification evidence is required.');

  return Object.freeze({
    stepId: renewalOutput.stepId,
    renewalScore,
    score: renewalScore,
    renewalComplete,
    readyForGtm: renewalComplete,
    flag,
    correctivePrompts: Object.freeze(correctivePrompts),
  });
}
