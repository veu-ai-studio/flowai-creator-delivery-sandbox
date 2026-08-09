import { createHash } from 'node:crypto';
import { runAudit } from './auditRunner.js';
import { runBuild } from './buildRunner.js';
import { runDeploy } from './deployRunner.js';
import { runDesign } from './designRunner.js';
import { runGtm } from './gtmRunner.js';
import { runMonitor } from './monitorRunner.js';
import { runRenewal } from './renewalRunner.js';
import { runResearch } from './researchRunner.js';

export const INDEPENDENT_STAGE_ORDER = Object.freeze([
  'research', 'design', 'build', 'qa_audit', 'deploy', 'self_renewal', 'gtm', 'monitor',
]);

export const INDEPENDENT_STAGE_PREREQUISITES = Object.freeze({
  research: Object.freeze([]),
  design: Object.freeze(['research']),
  build: Object.freeze(['design']),
  qa_audit: Object.freeze(['build']),
  deploy: Object.freeze(['qa_audit']),
  self_renewal: Object.freeze(['deploy']),
  gtm: Object.freeze(['self_renewal']),
  monitor: Object.freeze(['gtm']),
});

const READY_FIELD = Object.freeze({
  research: 'readyForDesign', design: 'readyForBuild', build: 'readyForQualityAudit',
  qa_audit: 'readyForDeploy', deploy: 'readyForSelfRenewal', self_renewal: 'readyForGtm',
  gtm: 'readyForMonitor', monitor: 'loopClosed',
});

export class IndependentStageError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'IndependentStageError';
    this.code = code;
    this.details = details;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function requiredText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new IndependentStageError(`${name.toUpperCase()}_REQUIRED`, `${name} is required.`);
  return value.trim();
}

export function validateIndependentStageRequest({ stage, prerequisiteArtifacts = [] } = {}) {
  if (!INDEPENDENT_STAGE_ORDER.includes(stage)) {
    throw new IndependentStageError('STAGE_INVALID', 'Requested stage is not one of the eight canonical stages.');
  }
  if (!Array.isArray(prerequisiteArtifacts)) {
    throw new IndependentStageError('PREREQUISITES_INVALID', 'prerequisiteArtifacts must be an array.');
  }
  const required = INDEPENDENT_STAGE_PREREQUISITES[stage];
  const selected = new Map();
  for (const artifact of prerequisiteArtifacts) {
    if (!artifact || typeof artifact !== 'object' || !INDEPENDENT_STAGE_ORDER.includes(artifact.stage)) continue;
    if (typeof artifact.id !== 'string' || !artifact.id.trim() || !/^[a-f0-9]{8,64}$/i.test(String(artifact.fingerprint || ''))) continue;
    if (!artifact.output || typeof artifact.output !== 'object') continue;
    selected.set(artifact.stage, artifact);
  }
  const missing = required.filter(name => !selected.has(name));
  if (missing.length) throw new IndependentStageError('PREREQUISITE_MISSING', `Missing valid prerequisite artifact: ${missing.join(', ')}.`, { missing });
  for (const name of required) {
    const artifact = selected.get(name);
    if (artifact.output?.[READY_FIELD[name]] !== true) {
      throw new IndependentStageError('PREREQUISITE_NOT_READY', `${name} artifact is not cleared for ${stage}.`, { stage: name, readyField: READY_FIELD[name] });
    }
  }
  return Object.freeze({ stage, selected });
}

function stageConfig(stage, request, prerequisite, deps) {
  const common = {
    ...(request.config || {}),
    runId: request.runId,
    productContext: request.productContext,
    toolService: deps.toolService,
    dispatch: deps.dispatch,
  };
  if (stage === 'research') return { ...common, url: request.url };
  if (stage === 'build') return { ...common, sourceContent: request.sourceContent, targetFilePath: request.targetFilePath || 'src/App.jsx' };
  if (stage === 'qa_audit') return { ...common, researchOutput: request.context?.researchOutput, designOutput: request.context?.designOutput, productGoals: request.context?.productGoals || [] };
  if (stage === 'deploy') {
    const existing = request.existingDeployment;
    if (!existing || existing.environment !== 'preview' || !/^https:\/\//.test(existing.outputUrl || '')) {
      throw new IndependentStageError('PREVIEW_DEPLOYMENT_REQUIRED', 'Deploy standalone mode requires an existing HTTPS preview deployment.');
    }
    return { ...common, existingDeployment: existing, deployAdapter: undefined, productionPromotionAuthorized: false };
  }
  if (stage === 'self_renewal') return { ...common, agent: deps.renewalAgent };
  if (stage === 'monitor') return { ...common, monitorAdapter: deps.monitorAdapter };
  return common;
}

export async function runIndependentStage(request = {}, deps = {}) {
  const productId = requiredText(request.productId, 'productId');
  const tenantId = requiredText(request.tenantId, 'tenantId');
  const actorId = requiredText(request.actorId, 'actorId');
  if (request.environment !== 'staging' || request.productionPromotionAuthorized === true) {
    throw new IndependentStageError('NONPRODUCTION_BOUNDARY_REQUIRED', 'Independent stage execution is staging-only and cannot authorize production promotion.');
  }
  const { stage, selected } = validateIndependentStageRequest(request);
  const prerequisite = INDEPENDENT_STAGE_PREREQUISITES[stage][0]
    ? selected.get(INDEPENDENT_STAGE_PREREQUISITES[stage][0]).output
    : null;
  const manual = request.manualInputs || {};
  const config = stageConfig(stage, request, prerequisite, deps);
  let output;
  if (stage === 'research') output = await runResearch(productId, manual, config);
  else if (stage === 'design') output = await runDesign(productId, prerequisite, manual, config);
  else if (stage === 'build') output = await runBuild(productId, prerequisite, manual, config);
  else if (stage === 'qa_audit') output = await runAudit(productId, prerequisite, manual, config);
  else if (stage === 'deploy') output = await runDeploy(productId, prerequisite, manual, config);
  else if (stage === 'self_renewal') output = await runRenewal(productId, prerequisite, manual, config);
  else if (stage === 'gtm') output = await runGtm(productId, { ...(request.context || {}), deployOutput: request.context?.deployOutput, renewalOutput: prerequisite }, manual, config);
  else output = await runMonitor(productId, { ...(request.context || {}), gtmOutput: prerequisite }, manual, config);

  const fingerprint = digest({ stage, productId, tenantId, actorId, output });
  const artifact = Object.freeze({
    id: `flowai-independent-${stage}-${fingerprint.slice(0, 16)}`,
    fingerprint,
    kind: `flowai.${stage}.independent_stage_artifact.v1`,
    stage,
    output,
    provenance: Object.freeze({
      invocationMode: 'independent_stage', requestedStage: stage, productId, tenantId, actorId,
      prerequisiteArtifactIds: INDEPENDENT_STAGE_PREREQUISITES[stage].map(name => selected.get(name)?.id).filter(Boolean),
      runId: request.runId || null, environment: 'staging', productionPromotionAuthorized: false,
    }),
  });
  return Object.freeze({ stage, artifact, output, clearanceAllowed: false, productionPromotionAuthorized: false });
}
