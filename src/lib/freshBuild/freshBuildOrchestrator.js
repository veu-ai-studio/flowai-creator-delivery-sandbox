import { extractFeatures } from './featureExtractor.js';
import { synthesizeDesign } from './designSynthesizer.js';
import { generateCodebase } from './codebaseGenerator.js';
import { FRESH_BUILD_VERSION, isFreshBuildEnabled } from './constants.js';
import {
  PREVIEW_ACCESS_STATUS,
  writeGeneratedCodebaseToUpgradeRepo,
} from './freshBuildDeploymentAdapter.js';
import { runEvaluationPipeline } from '../evaluation/evaluationPipeline.js';
import { scoreCrawlOutput } from '../agents/renewal/gtmReadinessScorer.js';

export const FRESH_BUILD_MODE = 'FRESH_BUILD';
export const SCORE_STATUS = Object.freeze({
  NOT_ATTEMPTED: 'SCORE_NOT_ATTEMPTED',
  CAPTURED: 'SCORE_CAPTURED',
  BLOCKED_PREVIEW_AUTH: 'SCORE_BLOCKED_PREVIEW_AUTH',
  BLOCKED_PREVIEW_ACCESS: 'SCORE_BLOCKED_PREVIEW_ACCESS',
  NOT_CONFIGURED: 'SCORE_NOT_CONFIGURED',
  FAILED: 'SCORE_FAILED',
});

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

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function safeSlug(value, fallback = 'fresh-build') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

function normalizeFreshBuildSource(input = {}, options = {}) {
  const candidateUrl = nonEmptyString(input.url || input.productUrl);
  if (candidateUrl) {
    return {
      inputMode: 'url',
      url: requireHttpUrl(candidateUrl),
      baselineUrl: candidateUrl,
      description: nonEmptyString(input.description || options.description),
    };
  }
  const description = nonEmptyString(input.description || options.description);
  if (!description) {
    throw new TypeError('runFreshBuild requires an http(s) URL or a non-empty description');
  }
  const runId = nonEmptyString(input.runId || options.runId || 'description');
  return {
    inputMode: 'description',
    url: `flowai-description://${safeSlug(runId)}`,
    baselineUrl: null,
    description,
  };
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
    ...rest,
    mode: FRESH_BUILD_MODE,
    stage,
    status,
    at: isoTimestamp(now),
  });
}

function buildEvidence(featureInventory, designSpec, generatedCodebase, writeResult, scoreResult = null) {
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
    deploymentId: writeResult?.deploymentId || null,
    previewAccessStatus: writeResult?.previewAccessStatus || null,
    previewAccess: writeResult?.previewAccess || null,
    scoreStatus: scoreResult?.scoreStatus || SCORE_STATUS.NOT_ATTEMPTED,
    baselineScore: typeof scoreResult?.baselineScore === 'number' ? scoreResult.baselineScore : null,
    finalScore: typeof scoreResult?.finalScore === 'number' ? scoreResult.finalScore : null,
    scoreDelta: typeof scoreResult?.scoreDelta === 'number' ? scoreResult.scoreDelta : null,
  };
}

function numericScore(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value?.total === 'number' && Number.isFinite(value.total)) return value.total;
  if (typeof value?.score === 'number' && Number.isFinite(value.score)) return value.score;
  if (typeof value?.finalScore === 'number' && Number.isFinite(value.finalScore)) return value.finalScore;
  return null;
}

async function evaluateUrlScore({ url, runId, evaluationOptions = {}, onStep } = {}) {
  const evaluation = await runEvaluationPipeline({
    url,
    options: {
      evaluationTier: evaluationOptions.evaluationTier || 'TIER_1',
      ...(evaluationOptions.options || {}),
      onStep,
    },
  });
  if (!evaluation?.ok) {
    const errors = evaluation?.errors && typeof evaluation.errors === 'object'
      ? Object.keys(evaluation.errors).join(',')
      : 'evaluation_failed';
    throw new Error(`Fresh Build score evaluation failed for ${url}: ${errors}`);
  }
  const score = scoreCrawlOutput({}, evaluation.findings || []);
  return {
    score: score.score,
    findingsCount: Array.isArray(evaluation.findings) ? evaluation.findings.length : 0,
    runId,
  };
}

async function defaultScoreFreshBuildPreview({
  baselineUrl,
  previewUrl,
  runId,
  evaluationOptions,
  onStep,
} = {}) {
  const hasBaseline = Boolean(baselineUrl && /^https?:\/\//i.test(String(baselineUrl)));
  const [baseline, final] = await Promise.all([
    hasBaseline
      ? evaluateUrlScore({ url: baselineUrl, runId, evaluationOptions, onStep })
      : Promise.resolve(null),
    evaluateUrlScore({ url: previewUrl, runId, evaluationOptions, onStep }),
  ]);
  return {
    baselineScore: baseline?.score ?? null,
    finalScore: final.score,
    baselineFindingsCount: baseline?.findingsCount ?? null,
    finalFindingsCount: final.findingsCount,
  };
}

async function captureFreshBuildScore({
  url,
  previewUrl,
  runId,
  writeResult,
  scoreFreshBuildPreview,
  evaluationOptions = {},
  onStep,
  now,
}) {
  const previewAccessStatus = writeResult?.previewAccessStatus || null;
  if (previewAccessStatus === PREVIEW_ACCESS_STATUS.AUTH_REQUIRED) {
    return {
      scoreStatus: SCORE_STATUS.BLOCKED_PREVIEW_AUTH,
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
    };
  }
  if (previewAccessStatus !== PREVIEW_ACCESS_STATUS.BROWSER_CLEAR) {
    return {
      scoreStatus: SCORE_STATUS.BLOCKED_PREVIEW_ACCESS,
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
    };
  }
  const scoreImpl = typeof scoreFreshBuildPreview === 'function'
    ? scoreFreshBuildPreview
    : defaultScoreFreshBuildPreview;
  if (typeof scoreImpl !== 'function') {
    return {
      scoreStatus: SCORE_STATUS.NOT_CONFIGURED,
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
    };
  }

  await emit(onStep, 'score_capture', 'started', {
    previewAccessStatus,
    previewUrl,
    now,
  });
  try {
    const score = await scoreImpl({
      baselineUrl: url,
      previewUrl,
      runId,
      previewAccessStatus,
      evaluationOptions,
      onStep,
    });
    if (score?.scoreStatus === SCORE_STATUS.NOT_CONFIGURED) {
      return {
        scoreStatus: SCORE_STATUS.NOT_CONFIGURED,
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
      };
    }
    const baselineScore = numericScore(score?.baselineScore ?? score?.baseline);
    const finalScore = numericScore(score?.finalScore ?? score?.final);
    if (finalScore === null) {
      return {
        scoreStatus: SCORE_STATUS.FAILED,
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
        error: 'SCORE_RESULT_INCOMPLETE',
      };
    }
    return {
      scoreStatus: SCORE_STATUS.CAPTURED,
      baselineScore,
      finalScore,
      scoreDelta: baselineScore === null ? null : finalScore - baselineScore,
    };
  } catch (error) {
    if (error?.name === 'AbortError' || error?.code === 'RUN_CANCELLED') throw error;
    return {
      scoreStatus: SCORE_STATUS.FAILED,
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
      error: String(error?.message ?? error).slice(0, 200),
    };
  }
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

function buildGenerationBlockedResult({
  url,
  runId,
  featureInventory,
  designSpec,
  generatedCodebase = null,
  error = null,
  now,
}) {
  const failure = generatedCodebase?.failure || safeFailure(
    error || new Error(generatedCodebase?.reason || 'Fresh Build codebase generation blocked'),
    generatedCodebase?.failureStage || 'codebase_generator',
  );
  return {
    ok: false,
    status: 'BLOCKED',
    reason: generatedCodebase?.reason || failure.code || 'CODEBASE_GENERATION_BLOCKED',
    failureStage: failure.stage || generatedCodebase?.failureStage || 'codebase_generator',
    failure,
    mode: FRESH_BUILD_MODE,
    runId,
    url,
    featureInventory,
    designSpec,
    generatedCodebase,
    platformDependencies: generatedCodebase?.platformDependencies || [],
    previewUrl: null,
    previewAccessStatus: null,
    scoreStatus: SCORE_STATUS.NOT_ATTEMPTED,
    baselineScore: null,
    finalScore: null,
    scoreDelta: null,
    evidence: buildEvidence(featureInventory, designSpec, generatedCodebase, null),
    metadata: {
      version: FRESH_BUILD_VERSION,
      featureFlagEnabled: true,
      completedAt: isoTimestamp(now),
    },
  };
}

function buildDescriptionFeatureInventory({ description, sourceUrl, runId, now, productName }) {
  const timestamp = isoTimestamp(now);
  const title = nonEmptyString(productName) || description.split(/\s+/).slice(0, 6).join(' ') || 'Fresh Build Product';
  return {
    id: `feature-inventory-description-${safeSlug(runId || title)}`,
    url: sourceUrl,
    pages: [{
      url: sourceUrl,
      title,
      purpose: 'description-derived fresh build landing and workspace shell',
      primaryContent: description,
      navigation: [],
      hierarchy: { parent: 'root', children: [], confidence: 0.7 },
      access: 'UNKNOWN',
      confidence: 0.72,
    }],
    components: [
      {
        id: 'description-hero',
        type: 'hero',
        content: description,
        purpose: 'communicate the requested product concept',
        pages: [sourceUrl],
        interactive: false,
        confidence: 0.72,
      },
      {
        id: 'description-action-panel',
        type: 'card',
        content: 'Primary actions and next steps generated from the submitted description.',
        purpose: 'give the product a usable first workflow surface',
        pages: [sourceUrl],
        interactive: true,
        confidence: 0.64,
      },
    ],
    userFlows: [{
      id: 'description-primary-flow',
      name: 'primary product journey',
      steps: [{ label: 'Open generated product', url: sourceUrl, confidence: 0.7 }],
      entryPoint: sourceUrl,
      exitPoint: sourceUrl,
      formFields: [],
      states: { success: 'Generated product renders', error: 'No baseline URL exists for comparison', confidence: 0.65 },
      confidence: 0.65,
    }],
    content: {
      textByPage: { [sourceUrl]: description },
      imageReferences: [],
      ctas: [],
      toneAndStyle: { descriptionDerived: true, confidence: 0.62 },
      confidence: 0.68,
    },
    businessRules: {
      accessControl: { observed: 'description_only', confidence: 0.5 },
      pricing: { observed: 'unknown', confidence: 0.5 },
      validationRules: [],
      apiEndpoints: [],
      dataEntities: [],
      confidence: 0.5,
    },
    metadata: {
      url: sourceUrl,
      productName: title,
      totalPagesDiscovered: 1,
      totalComponentsIdentified: 2,
      totalUserFlowsMapped: 1,
      crawlTimestamp: timestamp,
      version: FRESH_BUILD_VERSION,
      confidence: 0.68,
      source: 'description_build_brief',
    },
  };
}

function buildDescriptionDesignSpec({ sourceUrl, now }) {
  const timestamp = isoTimestamp(now);
  return {
    url: sourceUrl,
    visualSystem: {
      primaryColors: [{ hex: '#1f2937' }, { hex: '#0ea5e9' }, { hex: '#f59e0b' }],
      accentColors: [{ hex: '#10b981' }],
      backgroundColors: [{ hex: '#f8fafc' }],
      textColors: [{ hex: '#111827' }],
    },
    typography: {
      fontFamilies: [{ family: 'Inter' }, { family: 'system-ui' }],
      fontSizes: [{ value: '14px' }, { value: '16px' }, { value: '20px' }, { value: '32px' }],
    },
    layout: {
      maxWidth: '1200px',
      spacingScale: 'comfortable',
      density: 'balanced',
      confidence: 0.62,
    },
    components: [
      { id: 'description-hero', visualStyle: 'filled', confidence: 0.68 },
      { id: 'description-action-panel', visualStyle: 'outlined', confidence: 0.62 },
    ],
    uxPatterns: [{ name: 'guided overview', confidence: 0.64 }],
    technologySignals: {
      framework: { name: 'React/Vite generated target', confidence: 0.8 },
      cssFramework: { name: 'Tailwind CSS generated target', confidence: 0.8 },
    },
    metadata: {
      url: sourceUrl,
      extractionMethod: 'description_build_brief',
      timestamp,
      version: FRESH_BUILD_VERSION,
      confidence: 0.64,
    },
  };
}

export async function runFreshBuild(input = {}, options = {}) {
  const env = options.env || globalThis.process?.env || {};
  const now = options.now;
  const runId = input.runId || options.runId || null;
  const onStep = options.onStep;
  const signal = options.signal;
  const throwIfCancelled = (stage) => {
    if (!signal?.aborted) return;
    const error = new Error(`Fresh Build cancelled during ${stage}`);
    error.name = 'AbortError';
    error.code = 'RUN_CANCELLED';
    error.stage = stage;
    throw error;
  };
  const source = normalizeFreshBuildSource(input, options);
  const url = source.url;

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
      previewAccessStatus: null,
      scoreStatus: SCORE_STATUS.NOT_ATTEMPTED,
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
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

  throwIfCancelled('feature_flag');

  const extract = options.extractFeatures || extractFeatures;
  const synthesize = options.synthesizeDesign || synthesizeDesign;
  const generate = options.generateCodebase || generateCodebase;
  const writeGeneratedCodebase = options.writeGeneratedCodebase || writeGeneratedCodebaseToUpgradeRepo;

  let featureInventory;
  let designSpec;
  if (source.inputMode === 'description') {
    throwIfCancelled('description_build_brief');
    await emit(onStep, 'description_build_brief', 'started', { now });
    featureInventory = buildDescriptionFeatureInventory({
      description: source.description,
      sourceUrl: source.url,
      runId,
      now,
      productName: input.productName || options.productName,
    });
    await emit(onStep, 'design_synthesizer', 'started', { now });
    designSpec = buildDescriptionDesignSpec({ sourceUrl: source.url, now });
    await emit(onStep, 'description_build_brief', 'completed', {
      inventoryId: featureInventory.id,
      designSpecId: designSpec.metadata?.url || source.url,
      pages: featureInventory.pages.length,
      components: featureInventory.components.length,
      now,
    });
    await emit(onStep, 'design_synthesizer', 'completed', {
      designSpecId: designSpec?.metadata?.url || source.url,
      components: Array.isArray(designSpec?.components) ? designSpec.components.length : 0,
      now,
    });
  } else {
    throwIfCancelled('feature_extractor');
    await emit(onStep, 'feature_extractor', 'started', { now });
    featureInventory = await extract(url, {
      ...(options.extractorOptions || {}),
      runId,
      signal,
    });
    throwIfCancelled('feature_extractor');
    await emit(onStep, 'feature_extractor', 'completed', {
      inventoryId: featureInventory?.id || null,
      pages: Array.isArray(featureInventory?.pages) ? featureInventory.pages.length : 0,
      components: Array.isArray(featureInventory?.components) ? featureInventory.components.length : 0,
      now,
    });

    await emit(onStep, 'design_synthesizer', 'started', { now });
    designSpec = await synthesize(url, {
      ...(options.designOptions || {}),
      featureInventory,
      runId,
      signal,
    });
    throwIfCancelled('design_synthesizer');
    await emit(onStep, 'design_synthesizer', 'completed', {
      designSpecId: designSpec?.id || null,
      components: Array.isArray(designSpec?.components) ? designSpec.components.length : 0,
      now,
    });
  }

  await emit(onStep, 'codebase_generator', 'started', { now });
  throwIfCancelled('codebase_generator');
  let generatedCodebase;
  try {
    generatedCodebase = await generate(featureInventory, designSpec, {
      ...(options.generatorOptions || {}),
      productName: input.productName || options.productName,
      targetStack: input.targetStack || options.targetStack,
      now,
      signal,
    });
    throwIfCancelled('codebase_generator');
  } catch (error) {
    if (error?.name === 'AbortError' || error?.code === 'RUN_CANCELLED') throw error;
    const result = buildGenerationBlockedResult({
      url,
      runId,
      featureInventory,
      designSpec,
      error,
      now,
    });
    await emit(onStep, 'codebase_generator', 'blocked', {
      reason: result.reason,
      failureStage: result.failureStage,
      invalidFilePath: result.failure?.invalidFilePath || null,
      validationReason: result.failure?.validationReason || null,
      now,
    });
    return result;
  }
  await emit(onStep, 'codebase_generator', 'completed', {
    status: generatedCodebase?.status || 'UNKNOWN',
    files: Array.isArray(generatedCodebase?.files) ? generatedCodebase.files.length : 0,
    platformDependencies: Array.isArray(generatedCodebase?.platformDependencies)
      ? generatedCodebase.platformDependencies.length
      : null,
    now,
  });

  if (generatedCodebase?.status === 'BLOCKED') {
    return buildGenerationBlockedResult({
      url,
      runId,
      featureInventory,
      designSpec,
      generatedCodebase,
      now,
    });
  }

  await emit(onStep, 'upgrade_repo_write', 'started', { now });
  throwIfCancelled('upgrade_repo_write');
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
      signal,
    });
    throwIfCancelled('upgrade_repo_write');
  } catch (error) {
    if (error?.name === 'AbortError' || error?.code === 'RUN_CANCELLED') throw error;
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
    deploymentId: writeResult?.deploymentId || null,
    previewAccessStatus: writeResult?.previewAccessStatus || null,
    now,
  });

  const scoreResult = await captureFreshBuildScore({
    url,
    previewUrl: writeResult?.previewUrl || null,
    runId,
    writeResult,
    scoreFreshBuildPreview: options.scoreFreshBuildPreview,
    evaluationOptions: options.evaluationOptions,
    onStep,
    now,
  });
  throwIfCancelled('score_capture');
  await emit(onStep, 'score_capture', scoreResult.scoreStatus === SCORE_STATUS.CAPTURED ? 'completed' : 'blocked', {
    scoreStatus: scoreResult.scoreStatus,
    previewAccessStatus: writeResult?.previewAccessStatus || null,
    baselineScore: scoreResult.baselineScore,
    finalScore: scoreResult.finalScore,
    scoreDelta: scoreResult.scoreDelta,
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
    previewAccessStatus: writeResult?.previewAccessStatus || null,
    previewAccess: writeResult?.previewAccess || null,
    scoreStatus: scoreResult.scoreStatus,
    baselineScore: scoreResult.baselineScore,
    finalScore: scoreResult.finalScore,
    scoreDelta: scoreResult.scoreDelta,
    platformDependencies: generatedCodebase.platformDependencies || [],
    evidence: buildEvidence(featureInventory, designSpec, generatedCodebase, writeResult, scoreResult),
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
  buildDescriptionFeatureInventory,
  buildDescriptionDesignSpec,
  buildGenerationBlockedResult,
  normalizeFreshBuildSource,
  safeFailure,
});
