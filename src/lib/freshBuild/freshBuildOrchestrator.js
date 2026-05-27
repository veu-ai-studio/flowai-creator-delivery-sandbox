import { extractFeatures } from './featureExtractor.js';
import { synthesizeDesign } from './designSynthesizer.js';
import { generateCodebase } from './codebaseGenerator.js';
import { FRESH_BUILD_VERSION, isFreshBuildEnabled } from './constants.js';
import { writeGeneratedCodebaseToUpgradeRepo } from './freshBuildDeploymentAdapter.js';

export const FRESH_BUILD_MODE = 'FRESH_BUILD';

function requireHttpUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new TypeError('runFreshBuild requires a non-empty url string');
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new TypeError('runFreshBuild requires an http(s) URL');
  }
  return trimmed;
}

function isoTimestamp(now) {
  return now ? new Date(now).toISOString() : new Date().toISOString();
}

function countObjectKeys(value) {
  return value && typeof value === 'object' ? Object.keys(value).length : 0;
}

function summarizeTokenList(items, mapper, max = 5) {
  return (Array.isArray(items) ? items : [])
    .map(mapper)
    .filter((item) => item && item !== 'UNKNOWN')
    .slice(0, max);
}

function buildDesignEvidence(designSpec) {
  return {
    primaryColors: summarizeTokenList(
      designSpec?.visualSystem?.primaryColors,
      (color) => color?.hex,
    ),
    fontFamilies: summarizeTokenList(
      designSpec?.typography?.fontFamilies,
      (font) => font?.family,
    ),
    fontSizes: summarizeTokenList(
      designSpec?.typography?.fontSizes,
      (fontSize) => fontSize?.value,
    ),
    extractionConfidence: typeof designSpec?.metadata?.confidence === 'number'
      ? designSpec.metadata.confidence
      : null,
    componentVisualCount: Array.isArray(designSpec?.components)
      ? designSpec.components.length
      : 0,
  };
}

async function emit(onStep, stage, status, details = {}) {
  if (typeof onStep !== 'function') return;
  const { now, ...rest } = details;
  await onStep({
    mode: FRESH_BUILD_MODE,
    stage,
    status,
    at: isoTimestamp(now),
    ...rest,
  });
}

function buildEvidence(featureInventory, designSpec, generatedCodebase, writeResult) {
  return {
    featureInventoryId: featureInventory?.id || null,
    featureInventoryFieldCount: countObjectKeys(featureInventory),
    designSpecId: designSpec?.id || null,
    designSpecFieldCount: countObjectKeys(designSpec),
    designEvidence: buildDesignEvidence(designSpec),
    generatedFileCount: Array.isArray(generatedCodebase?.files)
      ? generatedCodebase.files.length
      : 0,
    platformDependenciesCount: Array.isArray(generatedCodebase?.platformDependencies)
      ? generatedCodebase.platformDependencies.length
      : null,
    writeStatus: writeResult?.status || null,
    previewUrl: writeResult?.previewUrl || null,
  };
}

function safeFailure(error, stage = 'deployment_adapter') {
  return {
    stage,
    code: error?.code || error?.reason || 'FRESH_BUILD_STAGE_FAILED',
    message: String(error?.message || error?.reason || 'Fresh Build stage failed').slice(0, 400),
    deploymentId: error?.deploymentId || null,
    readyState: error?.readyState || null,
    attempts: Number.isFinite(error?.attempts) ? error.attempts : null,
  };
}

export async function runFreshBuild(input = {}, options = {}) {
  const url = requireHttpUrl(input.url || input.productUrl);
  const env = options.env || globalThis.process?.env || {};
  const now = options.now;
  const runId = input.runId || options.runId || null;
  const onStep = options.onStep;

  if (!isFreshBuildEnabled(env)) {
    const result = {
      ok: false,
      status: 'BLOCKED',
      reason: 'FRESH_BUILD_DISABLED',
      mode: FRESH_BUILD_MODE,
      runId,
      url,
      featureFlag: 'FLOWAI_ENABLE_FRESH_BUILD',
      previewUrl: null,
      generatedCodebase: null,
      platformDependencies: [],
      metadata: {
        version: FRESH_BUILD_VERSION,
        featureFlagEnabled: false,
        completedAt: isoTimestamp(now),
      },
    };
    await emit(onStep, 'feature_flag', 'blocked', { reason: result.reason, now });
    return result;
  }

  const extract = options.extractFeatures || extractFeatures;
  const synthesize = options.synthesizeDesign || synthesizeDesign;
  const generate = options.generateCodebase || generateCodebase;
  const writeGeneratedCodebase = options.writeGeneratedCodebase || writeGeneratedCodebaseToUpgradeRepo;

  await emit(onStep, 'feature_extractor', 'started', { now });
  const featureInventory = await extract(url, {
    ...(options.extractorOptions || {}),
    runId,
  });
  await emit(onStep, 'feature_extractor', 'completed', {
    inventoryId: featureInventory?.id || null,
    pages: Array.isArray(featureInventory?.pages) ? featureInventory.pages.length : 0,
    components: Array.isArray(featureInventory?.components) ? featureInventory.components.length : 0,
    now,
  });

  await emit(onStep, 'design_synthesizer', 'started', { now });
  const designSpec = await synthesize(url, {
    ...(options.designOptions || {}),
    featureInventory,
    runId,
  });
  await emit(onStep, 'design_synthesizer', 'completed', {
    designSpecId: designSpec?.id || null,
    components: Array.isArray(designSpec?.components) ? designSpec.components.length : 0,
    now,
  });

  await emit(onStep, 'codebase_generator', 'started', { now });
  const generatedCodebase = await generate(featureInventory, designSpec, {
    ...(options.generatorOptions || {}),
    productName: input.productName || options.productName,
    targetStack: input.targetStack || options.targetStack,
    now,
  });
  await emit(onStep, 'codebase_generator', 'completed', {
    status: generatedCodebase?.status || 'UNKNOWN',
    files: Array.isArray(generatedCodebase?.files) ? generatedCodebase.files.length : 0,
    platformDependencies: Array.isArray(generatedCodebase?.platformDependencies)
      ? generatedCodebase.platformDependencies.length
      : null,
    now,
  });

  if (generatedCodebase?.status === 'BLOCKED') {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: generatedCodebase.reason || 'CODEBASE_GENERATION_BLOCKED',
      mode: FRESH_BUILD_MODE,
      runId,
      url,
      featureInventory,
      designSpec,
      generatedCodebase,
      platformDependencies: generatedCodebase.platformDependencies || [],
      previewUrl: null,
      evidence: buildEvidence(featureInventory, designSpec, generatedCodebase, null),
      metadata: {
        version: FRESH_BUILD_VERSION,
        featureFlagEnabled: true,
        completedAt: isoTimestamp(now),
      },
    };
  }

  await emit(onStep, 'upgrade_repo_write', 'started', { now });
  let writeResult;
  try {
    writeResult = await writeGeneratedCodebase({
      url,
      runId,
      productName: input.productName || options.productName,
      productConfig: input.productConfig || options.productConfig || null,
      generatedCodebase,
      env,
      now,
    });
  } catch (error) {
    writeResult = error?.writeResult || {
      ok: false,
      status: 'WRITE_FAILED',
      reason: error?.code || 'DEPLOYMENT_ADAPTER_THREW',
      message: error?.message || 'Fresh Build deployment adapter failed',
      previewUrl: null,
      failureStage: error?.failureStage || 'deployment_adapter',
      failure: safeFailure(error, error?.failureStage || 'deployment_adapter'),
    };
  }
  await emit(onStep, 'upgrade_repo_write', writeResult?.ok ? 'completed' : 'skipped', {
    status: writeResult?.status || null,
    reason: writeResult?.reason || null,
    filesWritten: writeResult?.filesWritten || 0,
    failureStage: writeResult?.failureStage || writeResult?.failure?.stage || null,
    previewUrl: writeResult?.previewUrl || null,
    now,
  });

  const failure = writeResult?.failure || (writeResult?.ok ? null : {
    stage: writeResult?.failureStage || 'deployment_adapter',
    code: writeResult?.reason || 'DEPLOYMENT_ADAPTER_NOT_CONFIGURED',
    message: writeResult?.message || 'Fresh Build deployment adapter did not complete',
    deploymentId: writeResult?.deploymentId || null,
    readyState: writeResult?.readyState || null,
    attempts: Number.isFinite(writeResult?.attempts) ? writeResult.attempts : null,
  });
  const status = writeResult?.ok
    ? 'READY'
    : writeResult?.status === 'WRITE_FAILED' ? 'failed' : 'partial';
  return {
    ok: writeResult?.ok === true,
    status,
    reason: writeResult?.ok ? null : (writeResult?.reason || 'DEPLOYMENT_ADAPTER_NOT_CONFIGURED'),
    failureStage: failure?.stage || null,
    failure,
    mode: FRESH_BUILD_MODE,
    runId,
    url,
    featureInventory,
    designSpec,
    generatedCodebase,
    writeResult,
    previewUrl: writeResult?.previewUrl || null,
    platformDependencies: generatedCodebase.platformDependencies || [],
    evidence: buildEvidence(featureInventory, designSpec, generatedCodebase, writeResult),
    metadata: {
      version: FRESH_BUILD_VERSION,
      featureFlagEnabled: true,
      completedAt: isoTimestamp(now),
    },
  };
}

export const __test = Object.freeze({
  buildEvidence,
  buildDesignEvidence,
  safeFailure,
});
