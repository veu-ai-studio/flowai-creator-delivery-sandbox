export const GTM_BLOCKED = 'GTM_BLOCKED';
export const GTM_HUMAN_DECISION_REQUIRED = 'GTM_HUMAN_DECISION_REQUIRED';
export const GTM_EVIDENCE_INCOMPLETE = 'GTM_EVIDENCE_INCOMPLETE';

function sectionInput(output, id) {
  return output?.sections?.find(section => section.id === id)?.input ?? null;
}

export function scoreGtmStep(gtmOutput = {}) {
  const gate = sectionInput(gtmOutput, 'gtm-evidence-gate') ?? {};
  const readiness = sectionInput(gtmOutput, 'gtm-readiness-score') ?? {};
  const positioning = sectionInput(gtmOutput, 'gtm-positioning') ?? {};
  const channels = sectionInput(gtmOutput, 'gtm-channel-plan') ?? {};
  const checklist = sectionInput(gtmOutput, 'gtm-launch-checklist') ?? {};
  const decision = sectionInput(gtmOutput, 'gtm-human-decision-log') ?? {};

  const evidenceComplete = gate.productEvidenceComplete === true;
  const scorePresent = typeof readiness.score === 'number' && Number.isFinite(readiness.score);
  const sourcedPositioning = positioning.sourced === true && typeof positioning.statement === 'string' && positioning.statement.length > 0;
  const sourcedChannels = channels.sourced === true && Array.isArray(channels.channels);
  const checklistPresent = Array.isArray(checklist.items) && checklist.items.length > 0;
  const humanDecision = decision.recorded === true;
  const gtmReady = evidenceComplete && scorePresent && sourcedPositioning && sourcedChannels && checklistPresent && humanDecision && readiness.score >= 75 && readiness.counts?.critical === 0;

  let flag = null;
  if (!evidenceComplete) flag = GTM_EVIDENCE_INCOMPLETE;
  else if (!scorePresent) flag = GTM_BLOCKED;
  else if (!humanDecision) flag = GTM_HUMAN_DECISION_REQUIRED;
  else if (!gtmReady) flag = GTM_BLOCKED;

  const gtmScore = Math.round(([
    evidenceComplete,
    scorePresent,
    sourcedPositioning,
    sourcedChannels,
    checklistPresent,
    humanDecision,
  ].filter(Boolean).length / 6) * 10000) / 100;

  const correctivePrompts = [];
  if (!evidenceComplete) correctivePrompts.push('GTM cannot claim readiness until product/deploy/renewal evidence is complete.');
  if (!scorePresent) correctivePrompts.push('Canonical GTM readiness score is required.');
  if (!sourcedPositioning) correctivePrompts.push('Positioning must be linked to actual product state.');
  if (!sourcedChannels) correctivePrompts.push('GTM channels must be sourced, not fabricated.');
  if (!checklistPresent) correctivePrompts.push('Launch checklist is required.');
  if (!humanDecision) correctivePrompts.push('Human decision log required before GTM readiness.');
  if (readiness.counts?.critical > 0) correctivePrompts.push('Critical findings block GTM readiness.');

  return Object.freeze({
    stepId: gtmOutput.stepId,
    gtmScore,
    score: gtmScore,
    gtmReady,
    readyForMonitor: gtmReady,
    flag,
    correctivePrompts: Object.freeze(correctivePrompts),
  });
}
