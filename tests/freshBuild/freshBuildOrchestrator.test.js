import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { __test as RUN_CONSTRUCTION_TEST } from '../../src/api/run-construction.js';
import {
  FRESH_BUILD_MODE,
  __test as FRESH_BUILD_ORCHESTRATOR_TEST,
  runFreshBuild,
} from '../../src/lib/freshBuild/freshBuildOrchestrator.js';
import { isFreshBuildEnabled } from '../../src/lib/freshBuild/constants.js';

const landingSource = readFileSync(new URL('../../src/pages/LandingPage.jsx', import.meta.url), 'utf8');

function mockFeatureInventory() {
  return {
    id: 'inventory-1',
    url: 'https://example.com',
    pages: [{ url: 'https://example.com', title: 'Home' }],
    components: [{ id: 'hero-1', type: 'hero' }],
    userFlows: [],
    metadata: { totalPagesDiscovered: 1, totalComponentsIdentified: 1 },
  };
}

function mockDesignSpec() {
  return {
    id: 'design-1',
    url: 'https://example.com',
    visualSystem: {
      primaryColors: [
        { hex: '#111827' },
        { hex: '#2563eb' },
        { hex: '#f97316' },
        { hex: '#10b981' },
        { hex: '#f8fafc' },
        { hex: '#ef4444' },
      ],
    },
    typography: {
      fontFamilies: [
        { family: 'Inter' },
        { family: 'Arial' },
        { family: 'Roboto' },
        { family: 'System UI' },
        { family: 'Georgia' },
        { family: 'Courier New' },
      ],
      fontSizes: [
        { value: '12px' },
        { value: '14px' },
        { value: '16px' },
        { value: '20px' },
        { value: '32px' },
        { value: '48px' },
      ],
    },
    components: [
      { id: 'hero-1', visualStyle: 'filled' },
      { id: 'card-1', visualStyle: 'outlined' },
    ],
    metadata: { extractionMethod: 'test', confidence: 0.82 },
  };
}

function mockGeneratedCodebase(overrides = {}) {
  return {
    status: 'READY',
    files: [
      { path: 'package.json', content: '{}' },
      { path: 'src/App.jsx', content: 'export default function App() { return null; }' },
    ],
    platformDependencies: [],
    pageCount: 1,
    componentCount: 1,
    flowCount: 0,
    metadata: { apiCallsUsed: 0, apiCallCap: 200 },
    ...overrides,
  };
}

describe('freshBuild Orchestrator', () => {
  it('honours durable cancellation before external Fresh Build work begins', async () => {
    const controller = new AbortController();
    controller.abort();
    const extractFeatures = vi.fn();

    await expect(runFreshBuild({ url: 'https://example.com', runId: 'run-cancelled' }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      signal: controller.signal,
      extractFeatures,
    })).rejects.toMatchObject({ name: 'AbortError', code: 'RUN_CANCELLED', stage: 'feature_flag' });
    expect(extractFeatures).not.toHaveBeenCalled();
  });

  it('does not convert cancellation after generation into a blocked result or continue to repository writes', async () => {
    const controller = new AbortController();
    const writeGeneratedCodebase = vi.fn();

    await expect(runFreshBuild({ url: 'https://example.com', runId: 'run-cancel-mid' }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      signal: controller.signal,
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => {
        controller.abort();
        return mockGeneratedCodebase();
      }),
      writeGeneratedCodebase,
    })).rejects.toMatchObject({ name: 'AbortError', code: 'RUN_CANCELLED', stage: 'codebase_generator' });
    expect(writeGeneratedCodebase).not.toHaveBeenCalled();
  });

  it('keeps Fresh Build disabled by default and blocks without running modules', async () => {
    const extractFeatures = vi.fn();
    const synthesizeDesign = vi.fn();
    const generateCodebase = vi.fn();
    const writeGeneratedCodebase = vi.fn();
    const onStep = vi.fn();

    const result = await runFreshBuild({ url: 'https://example.com', runId: 'run-1' }, {
      env: {},
      now: '2026-05-26T00:00:00.000Z',
      extractFeatures,
      synthesizeDesign,
      generateCodebase,
      writeGeneratedCodebase,
      onStep,
    });

    expect(isFreshBuildEnabled({})).toBe(false);
    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      reason: 'FRESH_BUILD_DISABLED',
      mode: FRESH_BUILD_MODE,
      featureFlag: 'FLOWAI_ENABLE_FRESH_BUILD',
      previewUrl: null,
    });
    expect(extractFeatures).not.toHaveBeenCalled();
    expect(synthesizeDesign).not.toHaveBeenCalled();
    expect(generateCodebase).not.toHaveBeenCalled();
    expect(writeGeneratedCodebase).not.toHaveBeenCalled();
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'feature_flag',
      status: 'blocked',
    }));
  });

  it('runs extractor, design synthesizer, code generator, and upgrade writer in order when enabled', async () => {
    const calls = [];
    const featureInventory = mockFeatureInventory();
    const designSpec = mockDesignSpec();
    const generatedCodebase = mockGeneratedCodebase();
    const extractFeatures = vi.fn(async () => {
      calls.push('extract');
      return featureInventory;
    });
    const synthesizeDesign = vi.fn(async () => {
      calls.push('design');
      return designSpec;
    });
    const generateCodebase = vi.fn(async () => {
      calls.push('generate');
      return generatedCodebase;
    });
    const writeGeneratedCodebase = vi.fn(async () => {
      calls.push('write');
      return {
        ok: true,
        status: 'WRITTEN',
        filesWritten: 2,
        deploymentId: 'dep_2',
        previewUrl: 'https://fresh-build-preview.vercel.app',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        previewAccess: {
          previewUrl: 'https://fresh-build-preview.vercel.app',
          deploymentId: 'dep_2',
          previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
          httpStatus: 200,
        },
      };
    });
    const scoreFreshBuildPreview = vi.fn(async () => ({
      baselineScore: 72,
      finalScore: 86,
    }));
    const onStep = vi.fn();

    const result = await runFreshBuild({
      url: 'https://example.com',
      runId: 'run-2',
      productName: 'Example Product',
      productConfig: { name: 'Example Product', upgrade_repo: 'https://github.com/acme/example-v2' },
    }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      now: '2026-05-26T00:00:00.000Z',
      extractFeatures,
      synthesizeDesign,
      generateCodebase,
      writeGeneratedCodebase,
      scoreFreshBuildPreview,
      onStep,
    });

    expect(calls).toEqual(['extract', 'design', 'generate', 'write']);
    expect(synthesizeDesign).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      featureInventory,
      runId: 'run-2',
    }));
    expect(generateCodebase).toHaveBeenCalledWith(featureInventory, designSpec, expect.objectContaining({
      productName: 'Example Product',
    }));
    expect(writeGeneratedCodebase).toHaveBeenCalledWith(expect.objectContaining({
      generatedCodebase,
      productConfig: expect.objectContaining({ upgrade_repo: 'https://github.com/acme/example-v2' }),
    }));
    expect(result).toMatchObject({
      ok: true,
      status: 'READY',
      previewUrl: 'https://fresh-build-preview.vercel.app',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
      scoreStatus: 'SCORE_CAPTURED',
      baselineScore: 72,
      finalScore: 86,
      scoreDelta: 14,
      platformDependencies: [],
      evidence: {
        generatedFileCount: 2,
        platformDependenciesCount: 0,
        writeStatus: 'WRITTEN',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        scoreStatus: 'SCORE_CAPTURED',
        baselineScore: 72,
        finalScore: 86,
        scoreDelta: 14,
        designEvidence: {
          primaryColors: ['#111827', '#2563eb', '#f97316', '#10b981', '#f8fafc'],
          fontFamilies: ['Inter', 'Arial', 'Roboto', 'System UI', 'Georgia'],
          fontSizes: ['12px', '14px', '16px', '20px', '32px'],
          extractionConfidence: 0.82,
          componentVisualCount: 2,
        },
      },
    });
    expect(scoreFreshBuildPreview).toHaveBeenCalledWith(expect.objectContaining({
      baselineUrl: 'https://example.com',
      previewUrl: 'https://fresh-build-preview.vercel.app',
      runId: 'run-2',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
    }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'codebase_generator',
      status: 'completed',
      files: 2,
    }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'upgrade_repo_write',
      status: 'completed',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
    }));
  });

  it('runs description-only Fresh Build without crawling a URL or fabricating baseline scoring', async () => {
    const extractFeatures = vi.fn();
    const synthesizeDesign = vi.fn();
    const generateCodebase = vi.fn(async () => mockGeneratedCodebase());
    const writeGeneratedCodebase = vi.fn(async () => ({
      ok: true,
      status: 'WRITTEN_AND_DEPLOYED',
      filesWritten: 2,
      deploymentId: 'dep_description',
      previewUrl: 'https://description-build.vercel.app',
      previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
      previewAccess: {
        previewUrl: 'https://description-build.vercel.app',
        deploymentId: 'dep_description',
        previewAccessStatus: 'PREVIEW_BROWSER_CLEAR',
        httpStatus: 200,
      },
      deliveryWorkspace: {
        workspaceId: 'dw_description',
        github: { owner: 'flowai-owned', repo: 'flowai-description-run' },
        vercel: { projectId: 'prj_description' },
      },
    }));
    const onStep = vi.fn();
    const scoreFreshBuildPreview = vi.fn(async () => ({
      baselineScore: null,
      finalScore: 97,
    }));

    const result = await runFreshBuild({
      description: 'Build a scheduling workspace for local service providers',
      runId: 'description-run',
      productName: 'Provider Scheduler',
      productConfig: { inputMode: 'describe-build' },
    }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      now: '2026-06-14T00:00:00.000Z',
      extractFeatures,
      synthesizeDesign,
      generateCodebase,
      writeGeneratedCodebase,
      scoreFreshBuildPreview,
      onStep,
    });

    expect(extractFeatures).not.toHaveBeenCalled();
    expect(synthesizeDesign).not.toHaveBeenCalled();
    expect(generateCodebase).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'flowai-description://description-run',
        metadata: expect.objectContaining({ source: 'description_build_brief' }),
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({ extractionMethod: 'description_build_brief' }),
      }),
      expect.objectContaining({ productName: 'Provider Scheduler' }),
    );
    expect(writeGeneratedCodebase).toHaveBeenCalledWith(expect.objectContaining({
      url: 'flowai-description://description-run',
      productConfig: expect.objectContaining({ inputMode: 'describe-build' }),
    }));
    expect(result).toMatchObject({
      ok: true,
      status: 'READY',
      url: 'flowai-description://description-run',
      previewUrl: 'https://description-build.vercel.app',
      scoreStatus: 'SCORE_CAPTURED',
      baselineScore: null,
      finalScore: 97,
      scoreDelta: null,
      evidence: {
        generatedFileCount: 2,
        previewUrl: 'https://description-build.vercel.app',
        scoreStatus: 'SCORE_CAPTURED',
      },
    });
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'description_build_brief',
      status: 'completed',
    }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'design_synthesizer',
      status: 'completed',
      designSpecId: 'flowai-description://description-run',
    }));
  });

  it('builds bounded Fresh Build design evidence for SSE without full design payloads', () => {
    const designEvidence = FRESH_BUILD_ORCHESTRATOR_TEST.buildDesignEvidence(mockDesignSpec());

    expect(designEvidence).toEqual({
      primaryColors: ['#111827', '#2563eb', '#f97316', '#10b981', '#f8fafc'],
      fontFamilies: ['Inter', 'Arial', 'Roboto', 'System UI', 'Georgia'],
      fontSizes: ['12px', '14px', '16px', '20px', '32px'],
      extractionConfidence: 0.82,
      componentVisualCount: 2,
    });
    expect(designEvidence.primaryColors).toHaveLength(5);
    expect(designEvidence.fontFamilies).toHaveLength(5);
    expect(designEvidence.fontSizes).toHaveLength(5);
    expect(JSON.stringify(designEvidence)).not.toContain('visualSystem');
    expect(JSON.stringify(designEvidence)).not.toContain('typography');
  });

  it('does not write generated files when code generation is blocked', async () => {
    const writeGeneratedCodebase = vi.fn();
    const blockedCodebase = mockGeneratedCodebase({
      status: 'BLOCKED',
      reason: 'GENERATED_CODEBASE_INVALID',
      failureStage: 'codebase_generator',
      failure: {
        stage: 'codebase_generator',
        code: 'GENERATED_CODEBASE_INVALID',
        message: 'GeneratedCodebase failed safety validation: src/components/ListListXlrmdf.jsx has unbalanced ()',
        invalidFilePath: 'src/components/ListListXlrmdf.jsx',
        validationReason: 'unbalanced ()',
        deploymentId: null,
        readyState: null,
        attempts: null,
      },
      files: [],
      platformDependencies: [],
    });
    const result = await runFreshBuild({ url: 'https://example.com' }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => blockedCodebase),
      writeGeneratedCodebase,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      reason: 'GENERATED_CODEBASE_INVALID',
      failureStage: 'codebase_generator',
      failure: {
        stage: 'codebase_generator',
        code: 'GENERATED_CODEBASE_INVALID',
        invalidFilePath: 'src/components/ListListXlrmdf.jsx',
        validationReason: 'unbalanced ()',
      },
      previewUrl: null,
      scoreStatus: 'SCORE_NOT_ATTEMPTED',
      platformDependencies: [],
    });
    expect(writeGeneratedCodebase).not.toHaveBeenCalled();
  });

  it('returns an honest blocked result when the generator throws safety validation', async () => {
    const writeGeneratedCodebase = vi.fn();
    const scoreFreshBuildPreview = vi.fn();
    const onStep = vi.fn();

    const result = await runFreshBuild({ url: 'https://example.com', runId: 'run-validation-block' }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => {
        throw new Error('GeneratedCodebase failed safety validation: src/components/ListListXlrmdf.jsx has unbalanced ()');
      }),
      writeGeneratedCodebase,
      scoreFreshBuildPreview,
      onStep,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      previewUrl: null,
      previewAccessStatus: null,
      scoreStatus: 'SCORE_NOT_ATTEMPTED',
    });
    expect(result.failureStage).toBe('codebase_generator');
    expect(result.failure.message).toContain('ListListXlrmdf.jsx has unbalanced ()');
    expect(result.writeResult).toBeUndefined();
    expect(writeGeneratedCodebase).not.toHaveBeenCalled();
    expect(scoreFreshBuildPreview).not.toHaveBeenCalled();
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'codebase_generator',
      status: 'blocked',
      failureStage: 'codebase_generator',
    }));
  });

  it('returns partial evidence when deployment fails after branch write', async () => {
    const deployError = new Error('vercelBranchDeploy: deployment dpl_123 entered readyState=ERROR');
    deployError.code = 'DEPLOY_ERROR';
    deployError.writeResult = {
      ok: false,
      status: 'WRITTEN_DEPLOY_FAILED',
      reason: 'DEPLOY_ERROR',
      message: deployError.message,
      filesWritten: 2,
      branchUrl: 'https://github.com/acme/example-v2/tree/flowai/fresh-build-run-3',
      commitSha: 'abc123',
      previewUrl: null,
      deploymentId: 'dpl_123',
      failureStage: 'vercel_deploy',
      failure: {
        stage: 'vercel_deploy',
        code: 'DEPLOY_ERROR',
        message: deployError.message,
        deploymentId: 'dpl_123',
        readyState: 'ERROR',
        attempts: 3,
      },
    };

    const result = await runFreshBuild({
      url: 'https://example.com',
      runId: 'run-3',
      productName: 'Example Product',
      productConfig: { name: 'Example Product', upgrade_repo: 'https://github.com/acme/example-v2' },
    }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => mockGeneratedCodebase()),
      writeGeneratedCodebase: vi.fn(async () => { throw deployError; }),
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'partial',
      reason: 'DEPLOY_ERROR',
      failureStage: 'vercel_deploy',
      previewUrl: null,
      writeResult: {
        branchUrl: 'https://github.com/acme/example-v2/tree/flowai/fresh-build-run-3',
        deploymentId: 'dpl_123',
      },
      failure: {
        stage: 'vercel_deploy',
        code: 'DEPLOY_ERROR',
        deploymentId: 'dpl_123',
      },
      evidence: {
        generatedFileCount: 2,
        platformDependenciesCount: 0,
        writeStatus: 'WRITTEN_DEPLOY_FAILED',
        designEvidence: {
          primaryColors: ['#111827', '#2563eb', '#f97316', '#10b981', '#f8fafc'],
          fontFamilies: ['Inter', 'Arial', 'Roboto', 'System UI', 'Georgia'],
        },
      },
    });
    expect(JSON.stringify(result.evidence)).not.toContain('visualSystem');
    expect(JSON.stringify(result.evidence)).not.toContain('typography');
    expect(JSON.stringify(result.evidence)).not.toContain('<html');
  });

  it('blocks scoring honestly when the preview requires Vercel auth', async () => {
    const scoreFreshBuildPreview = vi.fn();

    const result = await runFreshBuild({
      url: 'https://example.com',
      runId: 'run-auth',
      productName: 'Example Product',
      productConfig: { name: 'Example Product', upgrade_repo: 'https://github.com/acme/example-v2' },
    }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => mockGeneratedCodebase()),
      writeGeneratedCodebase: vi.fn(async () => ({
        ok: false,
        status: 'WRITTEN_PREVIEW_NOT_BROWSER_CLEAR',
        reason: 'PREVIEW_AUTH_REQUIRED',
        filesWritten: 2,
        branchUrl: 'https://github.com/acme/example-v2/tree/flowai/fresh-build-run-auth',
        commitSha: 'auth123',
        deploymentId: 'dep_auth',
        previewUrl: 'https://fresh-build-auth.vercel.app',
        previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
        previewAccess: {
          previewUrl: 'https://fresh-build-auth.vercel.app',
          deploymentId: 'dep_auth',
          previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
          httpStatus: 401,
          reason: 'VERCEL_AUTH_REQUIRED',
        },
      })),
      scoreFreshBuildPreview,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'partial',
      reason: 'PREVIEW_AUTH_REQUIRED',
      previewUrl: 'https://fresh-build-auth.vercel.app',
      previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
      scoreStatus: 'SCORE_BLOCKED_PREVIEW_AUTH',
      baselineScore: null,
      finalScore: null,
      scoreDelta: null,
      evidence: {
        previewAccessStatus: 'PREVIEW_AUTH_REQUIRED',
        scoreStatus: 'SCORE_BLOCKED_PREVIEW_AUTH',
        baselineScore: null,
        finalScore: null,
        scoreDelta: null,
      },
    });
    expect(scoreFreshBuildPreview).not.toHaveBeenCalled();
  });

  it('adds FRESH_BUILD as a parallel API/UI mode without removing existing modes', () => {
    expect(RUN_CONSTRUCTION_TEST.ALLOWED_MODES).toEqual(new Set([
      'FOREGROUND',
      'BACKGROUND',
      'GUIDED',
      'MANUAL',
      'MIGRATION',
      'FRESH_BUILD',
    ]));
    expect(landingSource).toContain('Fresh Build');
    expect(landingSource).toContain('VITE_FLOWAI_ENABLE_FRESH_BUILD');
    expect(landingSource).toContain("flowHubPath === 'fresh_build'");
    expect(landingSource).toContain('resolveRunConstructionMode({');
    expect(landingSource).toContain("if (isFreshBuildMode) return 'FRESH_BUILD'");
    expect(landingSource).toContain("setFlowHubPath('migration')");
  });

  it('exposes Fresh Build design evidence in the final SSE result shape', () => {
    const runConstructionSource = readFileSync(new URL('../../src/api/run-construction.js', import.meta.url), 'utf8');

    expect(runConstructionSource).toContain('designEvidence: freshBuildResult?.evidence?.designEvidence || null');
    expect(runConstructionSource).toContain('previewAccessStatus: freshBuildResult?.previewAccessStatus ?? null');
    expect(runConstructionSource).toContain('scoreStatus: freshBuildResult?.scoreStatus ?? null');
    expect(runConstructionSource).toContain('baselineScore: typeof freshBuildResult?.baselineScore');
    expect(runConstructionSource).toContain('scoreDelta: typeof freshBuildResult?.scoreDelta');
    expect(runConstructionSource).toContain('status: freshBuildFinalStatus(freshBuildResult)');
    expect(runConstructionSource).toContain('failureStage: freshBuildResult?.failureStage');
    expect(runConstructionSource).toContain('deploymentId: freshBuildResult?.writeResult?.deploymentId');
    expect(runConstructionSource).toContain("status: 'failed'");
    expect(runConstructionSource).not.toContain('html: freshBuildResult');
    expect(runConstructionSource).not.toContain('designSpec: freshBuildResult?.designSpec');
  });
});
