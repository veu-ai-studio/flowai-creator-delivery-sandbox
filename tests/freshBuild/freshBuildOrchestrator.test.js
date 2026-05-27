import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { __test as RUN_CONSTRUCTION_TEST } from '../../src/api/run-construction.js';
import { FRESH_BUILD_MODE, runFreshBuild } from '../../src/lib/freshBuild/freshBuildOrchestrator.js';
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
    components: [{ id: 'hero-1', visualStyle: 'filled' }],
    metadata: { extractionMethod: 'test' },
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
        previewUrl: 'https://fresh-build-preview.vercel.app',
      };
    });

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
      platformDependencies: [],
      evidence: {
        generatedFileCount: 2,
        platformDependenciesCount: 0,
        writeStatus: 'WRITTEN',
      },
    });
  });

  it('does not write generated files when code generation is blocked', async () => {
    const writeGeneratedCodebase = vi.fn();
    const result = await runFreshBuild({ url: 'https://example.com' }, {
      env: { FLOWAI_ENABLE_FRESH_BUILD: 'true' },
      extractFeatures: vi.fn(async () => mockFeatureInventory()),
      synthesizeDesign: vi.fn(async () => mockDesignSpec()),
      generateCodebase: vi.fn(async () => mockGeneratedCodebase({
        status: 'BLOCKED',
        reason: 'API_CALL_CAP_EXCEEDED',
        files: [],
      })),
      writeGeneratedCodebase,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'BLOCKED',
      reason: 'API_CALL_CAP_EXCEEDED',
      previewUrl: null,
      platformDependencies: [],
    });
    expect(writeGeneratedCodebase).not.toHaveBeenCalled();
  });

  it('adds FRESH_BUILD as a parallel API/UI mode without removing existing modes', () => {
    expect(RUN_CONSTRUCTION_TEST.ALLOWED_MODES).toEqual(new Set([
      'FOREGROUND',
      'BACKGROUND',
      'GUIDED',
      'MIGRATION',
      'FRESH_BUILD',
    ]));
    expect(landingSource).toContain('Fresh Build');
    expect(landingSource).toContain('VITE_FLOWAI_ENABLE_FRESH_BUILD');
    expect(landingSource).toContain("mode === 'auto' || mode === 'migration' || mode === 'fresh_build'");
    expect(landingSource).toContain("mode={isMigrationMode ? 'MIGRATION' : isFreshBuildMode ? 'FRESH_BUILD' : 'FOREGROUND'}");
    expect(landingSource).toContain("setMode('migration')");
  });
});
