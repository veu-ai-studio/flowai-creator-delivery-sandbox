import { Agent3SelfRenewal } from '../agents/agents/Agent3SelfRenewal.js';
import { buildRenewalTemplate, RENEWAL_STEP_ID } from './renewalTemplate.js';
import { scoreRenewalStep } from './renewalStepScorer.js';

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function createMemoryStore() {
  const store = new Map();
  return {
    async get(key) { return store.get(key); },
    async set(key, value) { store.set(key, value); return true; },
    async append(value) {
      const rows = store.get('rows') ?? [];
      rows.push(value);
      store.set('rows', rows);
      return true;
    },
  };
}

function createMessageBus() {
  const events = [];
  return {
    events,
    publish(topicOrEnvelope, payload) {
      if (typeof topicOrEnvelope === 'string') {
        events.push({ topic: topicOrEnvelope, payload });
      } else {
        events.push(topicOrEnvelope);
      }
      return true;
    },
    subscribe() {
      return () => {};
    },
  };
}

function createAgent(productId, config = {}) {
  if (config.agent && typeof config.agent.recommend === 'function') return config.agent;
  const messageBus = createMessageBus();
  const hot = createMemoryStore();
  const cold = createMemoryStore();
  return new Agent3SelfRenewal({
    logger: { warn() {}, info() {}, error() {} },
    messageBus,
    auditLog: { async write() { return true; } },
    clock: { now: () => Date.now() },
    productScope: productId || 'flowai',
    environment: config.environment || 'prd',
    hot,
    cold,
  });
}

function normalizeApproval(manualInputs = {}) {
  const raw = manualInputs['renewal-operator-approval'] ?? manualInputs.operatorApproval ?? manualInputs.operatorApproved;
  if (raw === true) return { operatorApproved: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator' };
  if (typeof raw === 'string' && raw.trim()) {
    return { operatorApproved: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator', rationale: raw.trim() };
  }
  return { operatorApproved: false, reason: 'operator approval required before renewal mutation' };
}

function normalizeVerification(manualInputs = {}, application = {}) {
  const proof = manualInputs['renewal-verification'] ?? manualInputs.verificationEvidence ?? null;
  if (proof && typeof proof === 'object') return proof;
  if (typeof proof === 'string' && proof.trim()) return { status: 'PASS', evidence: proof.trim() };
  if (application.outcome === 'no_action_needed' || application.outcome === 'unavailable') {
    return { status: 'GUIDANCE_ONLY', reason: application.reason ?? 'no applied mutation to verify' };
  }
  if (application.outcome === 'applied') {
    return { status: 'PENDING', reason: 'before/after proof required after applied renewal' };
  }
  return { status: 'MISSING', reason: 'verification evidence required' };
}

function deployReady(deployOutput = {}) {
  return deployOutput.readyForSelfRenewal === true || Boolean(deployOutput.outputUrl);
}

function buildRunSummary(deployOutput = {}, manualInputs = {}, config = {}) {
  return {
    audit_issues_count: Number(manualInputs.auditIssuesCount ?? config.auditIssuesCount ?? 0),
    build_failure_count: Number(manualInputs.buildFailureCount ?? config.buildFailureCount ?? 0),
    anomaly_severity: manualInputs.anomalySeverity ?? config.anomalySeverity ?? null,
    evolution_proposal: manualInputs.evolutionProposal ?? config.evolutionProposal ?? null,
    deployed_url_present: Boolean(deployOutput.outputUrl),
  };
}

function proposedDeltaFromRecommendation(recommendation = {}) {
  const flags = Array.isArray(recommendation.renewal_flags) ? recommendation.renewal_flags : [];
  if (flags.length === 0) {
    return {
      noActionNeeded: true,
      issue: 'none',
      proposedFix: null,
      before: 'deployed product evidence reviewed',
      after: 'no safe renewal action required',
    };
  }
  return {
    noActionNeeded: false,
    issue: flags[0],
    proposedFix: `Review and remediate ${flags.join(', ')} through an approved renewal branch.`,
    before: 'renewal issue present',
    after: 'issue remediated after operator-approved fix and verification',
  };
}

async function applyRenewal({ approval, delta, deployOutput, config }) {
  if (delta.noActionNeeded) {
    return { outcome: 'no_action_needed', reason: 'Agent #3 found no renewal flags' };
  }
  if (Number(config.priorRenewalFailures ?? 0) >= 3) {
    return {
      outcome: 'escalated',
      requiresHumanGate: true,
      reason: 'repeated renewal failures reached human-gate threshold',
    };
  }
  if (approval.operatorApproved !== true) {
    return {
      outcome: 'awaiting_operator',
      reason: 'operator approval required before applying renewal fix',
    };
  }
  if (typeof config.renewalAdapter !== 'function') {
    return {
      outcome: 'unavailable',
      reason: 'no safe renewal adapter configured; remediation guidance emitted',
      guidance: delta.proposedFix,
    };
  }
  const result = await config.renewalAdapter({ delta, deployOutput, approval, config });
  if (!result || result.ok !== true) {
    return {
      outcome: 'unavailable',
      reason: result?.reason ?? result?.error ?? 'renewal adapter did not return ok:true',
      guidance: delta.proposedFix,
    };
  }
  return {
    outcome: 'applied',
    appliedFix: result.appliedFix ?? delta.proposedFix,
    before: result.before ?? delta.before,
    after: result.after ?? delta.after,
    testResult: result.testResult ?? null,
  };
}

export async function runRenewal(productId, deployOutput = {}, manualInputs = {}, config = {}) {
  const template = buildRenewalTemplate(productId, deployOutput);
  const gate = {
    readyForRenewal: deployReady(deployOutput),
    outputUrl: deployOutput.outputUrl ?? null,
    deploymentId: deployOutput.deploymentId ?? null,
    reason: deployReady(deployOutput)
      ? 'Deploy output available for Self-Renewal.'
      : 'Self-Renewal queued until Step 5 delivery artifact exists.',
  };

  let recommendation = {
    agent_id: 3,
    agent_name: 'Self-Renewal',
    authority: 'recommend_only',
    recommendation: 'Self-Renewal blocked until deploy evidence exists.',
    renewal_flags: [],
    confidence: 0,
    metadata: { ok: false, blocked: true },
  };
  if (gate.readyForRenewal) {
    const agent = createAgent(productId, config);
    recommendation = await agent.recommend({
      runId: config.runId ?? `renewal-${Date.now()}`,
      productId,
      run_summary: buildRunSummary(deployOutput, manualInputs, config),
      step_results: config.stepResults ?? null,
    });
  }

  const delta = gate.readyForRenewal
    ? proposedDeltaFromRecommendation(recommendation)
    : { noActionNeeded: false, issue: 'deploy_gate_blocked', proposedFix: null };
  const approval = normalizeApproval(manualInputs);
  const application = gate.readyForRenewal
    ? await applyRenewal({ approval, delta, deployOutput, config })
    : { outcome: 'blocked', reason: 'deploy gate blocked' };
  const verification = normalizeVerification(manualInputs, application);

  const sections = template.sections.map(section => {
    if (section.id === 'renewal-deploy-gate') return cloneSection(section, gate);
    if (section.id === 'renewal-agent-recommendation') return cloneSection(section, recommendation);
    if (section.id === 'renewal-proposed-delta') return cloneSection(section, delta);
    if (section.id === 'renewal-operator-approval') return cloneSection(section, approval);
    if (section.id === 'renewal-application') return cloneSection(section, application);
    if (section.id === 'renewal-verification') return cloneSection(section, verification);
    return cloneSection(section, /** @type {any} */ (section).input ?? null);
  });

  const baseOutput = {
    productId,
    stepId: RENEWAL_STEP_ID,
    completedAt: new Date().toISOString(),
    sections,
    deployOutput,
    recommendation,
    proposedDelta: delta,
    application,
    verification,
  };
  const score = scoreRenewalStep(baseOutput);
  return Object.freeze({
    ...baseOutput,
    sections: Object.freeze(sections),
    renewalScore: score.renewalScore,
    renewalComplete: score.renewalComplete,
    readyForGtm: score.readyForGtm,
    flag: score.flag,
    correctivePrompts: score.correctivePrompts,
  });
}

export const __test = Object.freeze({
  buildRunSummary,
  normalizeApproval,
  normalizeVerification,
  proposedDeltaFromRecommendation,
});
