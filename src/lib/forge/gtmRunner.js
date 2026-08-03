import { computeGtmReadiness } from '../agents/renewal/gtmReadinessScorer.js';
import { buildGtmTemplate, GTM_STEP_ID } from './gtmTemplate.js';
import { scoreGtmStep } from './gtmStepScorer.js';
import { invokeForgeStepOwner } from './stepOwnerRecommendations.js';

function cloneSection(section, input) {
  return Object.freeze({ ...section, input });
}

function normalizeDecision(manualInputs = {}) {
  const raw = manualInputs['gtm-human-decision-log'] ?? manualInputs.humanDecision ?? manualInputs.operatorDecision;
  if (raw === true) return { recorded: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator' };
  if (typeof raw === 'string' && raw.trim()) {
    return { recorded: true, approvedBy: manualInputs.approvedBy ?? 'authorized-operator', decision: raw.trim() };
  }
  return { recorded: false, reason: 'human decision log required before GTM readiness' };
}

function normalizeIssues(input = {}) {
  if (Array.isArray(input.issues)) return input.issues;
  if (Array.isArray(input.findings)) return input.findings;
  return [];
}

function evidenceGate(context = {}) {
  const productContext = context.productContext ?? {};
  const deployOutput = context.deployOutput ?? {};
  const renewalOutput = context.renewalOutput ?? {};
  const productEvidenceComplete = Boolean(
    context.productId &&
    (deployOutput.outputUrl || context.outputUrl) &&
    (renewalOutput.renewalComplete === true || context.renewalComplete === true),
  );
  return {
    productEvidenceComplete,
    productId: context.productId ?? null,
    outputUrl: deployOutput.outputUrl ?? context.outputUrl ?? null,
    renewalComplete: renewalOutput.renewalComplete === true || context.renewalComplete === true,
    productContextPresent: Object.keys(productContext).length > 0,
    reason: productEvidenceComplete
      ? 'GTM grounded in product, deployment, and Self-Renewal evidence.'
      : 'GTM evidence incomplete; readiness cannot be claimed.',
  };
}

function buildPositioning(context = {}, gate = {}) {
  if (!gate.productEvidenceComplete) {
    return {
      sourced: false,
      statement: null,
      reason: 'missing product/deploy/renewal evidence',
    };
  }
  const productName = context.productName ?? context.productContext?.name ?? context.productId;
  const targetClass = context.targetClass ?? context.productContext?.targetClass ?? 'digital product';
  return {
    sourced: true,
    statement: `${productName} is positioned as a ${targetClass} with GTM claims limited to observed product evidence and operator-provided goals.`,
    sources: ['productContext', 'deployOutput', 'renewalOutput'],
  };
}

function buildChannels(context = {}, gate = {}) {
  if (!gate.productEvidenceComplete) return { sourced: false, channels: [], reason: 'evidence incomplete' };
  const goals = Array.isArray(context.userObjectives) ? context.userObjectives : [];
  return {
    sourced: true,
    channels: [
      { name: 'operator-owned launch channel', basis: goals.length ? 'operator objectives' : 'default owned-channel readiness check' },
      { name: 'product demo route', basis: 'deployed delivery artifact URL' },
    ],
  };
}

function buildChecklist({ gate, readiness, decision }) {
  return {
    items: [
      { item: 'Delivery artifact exists', complete: Boolean(gate.outputUrl) },
      { item: 'Self-Renewal terminal state recorded', complete: gate.renewalComplete === true },
      { item: 'No critical GTM findings', complete: readiness.counts.critical === 0 },
      { item: 'Human GTM decision logged', complete: decision.recorded === true },
    ],
  };
}

export async function runGtm(productId, context = {}, manualInputs = {}, config = {}) {
  const fullContext = { ...context, ...config, productId: productId ?? context.productId };
  const template = buildGtmTemplate(productId, fullContext);
  const gate = evidenceGate(fullContext);
  const readiness = computeGtmReadiness({ issues: normalizeIssues(fullContext) });
  const decision = normalizeDecision(manualInputs);
  const positioning = buildPositioning(fullContext, gate);
  const channels = buildChannels(fullContext, gate);
  const checklist = buildChecklist({ gate, readiness, decision });

  const sections = template.sections.map(section => {
    if (section.id === 'gtm-evidence-gate') return cloneSection(section, gate);
    if (section.id === 'gtm-readiness-score') return cloneSection(section, readiness);
    if (section.id === 'gtm-positioning') return cloneSection(section, positioning);
    if (section.id === 'gtm-channel-plan') return cloneSection(section, channels);
    if (section.id === 'gtm-launch-checklist') return cloneSection(section, checklist);
    if (section.id === 'gtm-human-decision-log') return cloneSection(section, decision);
    return cloneSection(section, /** @type {any} */ (section).input ?? null);
  });
  const baseOutput = {
    productId,
    stepId: GTM_STEP_ID,
    completedAt: new Date().toISOString(),
    context: fullContext,
    sections,
    readiness,
    positioning,
    channels,
    checklist,
    decision,
  };
  const score = scoreGtmStep(baseOutput);
  const stepOwnerRecommendation = await invokeForgeStepOwner(config, 'gtm', {
    productId,
    stepInputs: baseOutput,
  });
  return Object.freeze({
    ...baseOutput,
    sections: Object.freeze(sections),
    gtmScore: score.gtmScore,
    gtmReady: score.gtmReady,
    readyForMonitor: score.readyForMonitor,
    flag: score.flag,
    correctivePrompts: score.correctivePrompts,
    stepOwnerRecommendation,
  });
}

export const __test = Object.freeze({
  evidenceGate,
  normalizeDecision,
  normalizeIssues,
  buildPositioning,
  buildChannels,
});
