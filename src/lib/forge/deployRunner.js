import { buildDeployTemplate, DEPLOY_STEP_ID } from './deployTemplate.js';
import { scoreDeployStep } from './deployStepScorer.js';

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function normalizeApproval(manualInputs = {}) {
  const raw = manualInputs['operator-approval'] ?? manualInputs.operatorApproval ?? manualInputs.operatorApproved;
  if (raw === true) return { operatorApproved: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator' };
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return { operatorApproved: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator', rationale: raw.trim() };
  }
  return { operatorApproved: false, reason: 'operator approval required before deploy' };
}

function normalizeBrowserProof(manualInputs = {}, artifact = {}) {
  const proof = manualInputs['browser-proof'] ?? manualInputs.browserProof ?? null;
  if (proof && typeof proof === 'object') return proof;
  if (typeof proof === 'string' && proof.trim()) return { status: 'PASS', evidence: proof.trim() };
  if (artifact.outputUrl) return { status: 'PENDING', reason: 'browser proof required after deploy', outputUrl: artifact.outputUrl };
  return { status: 'MISSING', reason: 'no delivery artifact URL available' };
}

function deliveryClass(config = {}) {
  const targetClass = config.targetClass ?? config.productContext?.targetClass ?? 'web';
  if (['web', 'saas', 'generic_url'].includes(String(targetClass).toLowerCase())) return 'hosted_url';
  if (['mobile_app', 'native_app'].includes(String(targetClass).toLowerCase())) return 'signed_package';
  if (String(targetClass).toLowerCase() === 'agentic_ai') return 'runtime_manifest';
  return 'hosted_url';
}

async function produceArtifact({ auditOutput, approval, config }) {
  if (approval.operatorApproved !== true) {
    return {
      artifactProduced: false,
      reason: 'operator approval required before deploy adapter invocation',
    };
  }
  if (config.existingDeployment?.outputUrl) {
    return {
      artifactProduced: true,
      outputUrl: config.existingDeployment.outputUrl,
      deploymentId: config.existingDeployment.deploymentId ?? null,
      commitSha: config.existingDeployment.commitSha ?? null,
      environment: config.existingDeployment.environment ?? 'preview',
      source: 'existingDeployment',
    };
  }
  if (typeof config.deployAdapter === 'function') {
    const deployed = await config.deployAdapter({ auditOutput, approval, config });
    if (!deployed?.outputUrl) {
      throw new Error('P4 deploy STOP: deployAdapter did not return outputUrl');
    }
    return {
      artifactProduced: true,
      outputUrl: deployed.outputUrl,
      deploymentId: deployed.deploymentId ?? null,
      commitSha: deployed.commitSha ?? null,
      environment: deployed.environment ?? 'preview',
      source: deployed.source ?? 'deployAdapter',
    };
  }
  return {
    artifactProduced: false,
    reason: 'no deploy adapter or existing deployment evidence configured',
  };
}

function distributionState({ approval, artifact, config }) {
  const adapterRegistry = config.distributionAdapters ?? ['vercel', 'apple_app_store', 'google_play', 'microsoft_store', 'samsung_galaxy_store', 'web_app_store'];
  if (approval.operatorApproved !== true) {
    return {
      adapterRegistry,
      artifactProduced: artifact.artifactProduced === true,
      operatorApproved: false,
      submissionInitiated: false,
      reason: 'operator approval gate precedes submission API calls',
    };
  }
  return {
    adapterRegistry,
    artifactProduced: artifact.artifactProduced === true,
    operatorApproved: true,
    submissionInitiated: artifact.artifactProduced === true,
    storeAccepted: null,
    storeRejected: null,
    postReviewStatus: 'tracked_by_monitor',
    reason: artifact.artifactProduced === true
      ? 'distribution handoff complete; store outcome deferred to Monitor'
      : artifact.reason,
  };
}

export async function runDeploy(productId, auditOutput = {}, manualInputs = {}, config = {}) {
  const template = buildDeployTemplate(productId, auditOutput);
  const auditGate = {
    readyForDeploy: auditOutput.readyForDeploy === true,
    auditScore: auditOutput.auditScore ?? null,
    auditComplete: auditOutput.auditComplete === true,
    reason: auditOutput.readyForDeploy === true
      ? 'Quality Audit cleared Step 5 entry.'
      : 'Deploy queued until Quality Audit readyForDeploy is true.',
  };
  const approval = normalizeApproval(manualInputs);
  const artifact = auditGate.readyForDeploy
    ? await produceArtifact({ auditOutput, approval, config })
    : { artifactProduced: false, reason: 'audit gate blocked' };
  const distribution = {
    deliveryClass: deliveryClass(config),
    ...distributionState({ approval, artifact, config }),
  };
  const browserProof = normalizeBrowserProof(manualInputs, artifact);

  const sections = template.sections.map(section => {
    if (section.id === 'deploy-audit-gate') return cloneSection(section, auditGate);
    if (section.id === 'delivery-artifact') return cloneSection(section, artifact);
    if (section.id === 'distribution-adapter') return cloneSection(section, distribution);
    if (section.id === 'operator-approval') return cloneSection(section, approval);
    if (section.id === 'browser-proof') return cloneSection(section, browserProof);
    return cloneSection(section, section.input ?? null);
  });
  const baseOutput = {
    productId,
    stepId: DEPLOY_STEP_ID,
    completedAt: new Date().toISOString(),
    sections,
    auditOutput,
    outputUrl: artifact.outputUrl ?? null,
    deploymentId: artifact.deploymentId ?? null,
    commitSha: artifact.commitSha ?? null,
    environment: artifact.environment ?? null,
    distribution,
  };
  const score = scoreDeployStep(baseOutput);

  return Object.freeze({
    ...baseOutput,
    sections: Object.freeze(sections),
    deployScore: score.deployScore,
    deployComplete: score.deployComplete,
    readyForSelfRenewal: score.readyForSelfRenewal,
    flag: score.flag,
    correctivePrompts: score.correctivePrompts,
  });
}

export const __test = Object.freeze({
  deliveryClass,
  normalizeApproval,
  normalizeBrowserProof,
});
