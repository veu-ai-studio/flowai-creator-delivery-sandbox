export const AUDIT_QUEUED = 'AUDIT_QUEUED';

function entries(value) {
  if (Array.isArray(value)) return value.filter(item => String(item ?? '').trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

function allChecks(auditOutput = {}) {
  return [
    ...(auditOutput.codeCompletenessChecks ?? []),
    ...(auditOutput.evidenceCompletenessChecks ?? []),
    ...(auditOutput.gateValidityChecks ?? []),
    ...(auditOutput.batchPlanAdvisoryItems ?? []),
    ...(auditOutput.renewalOutputCompatibility ? [auditOutput.renewalOutputCompatibility] : []),
  ];
}

function nonAdvisoryChecks(checks) {
  return checks.filter(check => check.status !== 'ADVISORY_ONLY' && check.status !== 'NOT_APPLICABLE');
}

export function isBuildBlockedForDeploy(buildOutput = {}) {
  return buildOutput.flag === 'BUILD_BLOCKED' ||
    buildOutput.buildBlocked === true ||
    buildOutput.entryPath?.path === 'BUILD_BLOCKED';
}

export function calculateAuditScore(checks = []) {
  const scored = nonAdvisoryChecks(checks);
  if (scored.length === 0) return 0;
  const passed = scored.filter(check => check.status === 'PASS');
  return Math.round((passed.length / scored.length) * 10000) / 100;
}

export function scoreAuditStep(auditOutput = {}) {
  const checks = allChecks(auditOutput);
  const scoredChecks = nonAdvisoryChecks(checks);
  const failedChecks = scoredChecks.filter(check => check.status !== 'PASS');
  const auditScore = calculateAuditScore(checks);
  const decisionLog = auditOutput.sections?.find(section => section.id === 'audit-decision-log')?.input ?? auditOutput.auditDecisionLog ?? [];
  const hasDecision = entries(decisionLog).length > 0;
  const findingsDerived = Boolean(auditOutput.sections?.find(section => section.id === 'audit-findings')?.input ?? auditOutput.auditFindings);
  const allNonAdvisoryChecked = scoredChecks.length > 0 && failedChecks.length === 0;
  const auditComplete = allNonAdvisoryChecked && findingsDerived && hasDecision;
  const sourceBuildOutput = auditOutput.buildOutput ?? auditOutput;
  const buildBlocked = isBuildBlockedForDeploy(sourceBuildOutput);
  const readyForDeploy = auditScore >= 95 &&
    auditComplete === true &&
    sourceBuildOutput.buildComplete === true &&
    !buildBlocked;
  const correctivePrompts = failedChecks.map(check => `Fix failed audit check ${check.id}: ${check.reason}`);

  if (!hasDecision) correctivePrompts.push('Section audit-decision-log requires at least one Victor audit decision entry.');
  if (buildBlocked) correctivePrompts.push('Build remains blocked; deploy readiness cannot be granted until PATH_A or PATH_B clears.');
  if (sourceBuildOutput.buildComplete !== true) correctivePrompts.push('Build is not complete; deploy readiness requires buildComplete === true.');

  return Object.freeze({
    stepId: auditOutput.stepId,
    auditScore,
    score: auditScore,
    auditComplete,
    readyForDeploy,
    failedChecks: Object.freeze(failedChecks),
    correctivePrompts: Object.freeze([...new Set(correctivePrompts)]),
    flag: auditOutput.flag,
    auditQueued: auditOutput.flag === AUDIT_QUEUED,
    buildBlocked,
  });
}

export const __test = Object.freeze({
  allChecks,
  entries,
  isBuildBlockedForDeploy,
  nonAdvisoryChecks,
});
