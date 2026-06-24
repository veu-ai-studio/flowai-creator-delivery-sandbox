import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TARGET_STACK,
  MAX_GENERATOR_API_CALLS,
  __test as CODEBASE_GENERATOR_TEST,
  generateCodebase,
  validateGeneratedCodebase,
} from '../../src/lib/freshBuild/codebaseGenerator.js';
import { isFreshBuildEnabled } from '../../src/lib/freshBuild/constants.js';
import { UNKNOWN } from '../../src/lib/freshBuild/types/featureInventory.js';

const repoFile = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function mockFeatureInventory(overrides = {}) {
  return {
    id: 'inventory-1',
    url: 'https://example.com',
    pages: [
      {
        url: 'https://example.com',
        title: 'Example Product',
        purpose: 'home',
        primaryContent: 'A clean product workflow for teams.',
        navigation: [
          { label: 'Pricing', target: 'https://example.com/pricing', confidence: 0.8 },
        ],
        hierarchy: { parent: UNKNOWN, children: [], confidence: 0 },
        access: 'PUBLIC',
        confidence: 0.8,
      },
      {
        url: 'https://example.com/pricing',
        title: 'Pricing',
        purpose: 'pricing',
        primaryContent: 'Plans and subscription details.',
        navigation: [],
        hierarchy: { parent: 'https://example.com', children: [], confidence: 0.5 },
        access: 'PUBLIC',
        confidence: 0.75,
      },
    ],
    components: [
      {
        id: 'nav-1',
        type: 'nav',
        content: 'Pricing',
        purpose: 'navigation',
        pages: ['https://example.com'],
        interactive: true,
        confidence: 0.8,
      },
      {
        id: 'hero-1',
        type: 'hero',
        content: 'A clean product workflow for teams.',
        purpose: 'primary message',
        pages: ['https://example.com'],
        interactive: false,
        confidence: 0.8,
      },
    ],
    userFlows: [
      {
        id: 'signup-1',
        name: 'sign up',
        steps: [{ label: 'Start', url: 'https://example.com', confidence: 0.7 }],
        entryPoint: 'https://example.com',
        exitPoint: UNKNOWN,
        formFields: [],
        states: { success: UNKNOWN, error: UNKNOWN, confidence: 0 },
        confidence: 0.7,
      },
    ],
    content: {
      textByPage: {},
      imageReferences: [],
      ctas: [],
      toneAndStyle: { summary: UNKNOWN, confidence: 0 },
      confidence: 0.6,
    },
    businessRules: {
      accessControl: { summary: UNKNOWN, confidence: 0 },
      pricing: { summary: UNKNOWN, confidence: 0 },
      validationRules: [],
      apiEndpoints: [],
      dataEntities: [],
      confidence: 0,
    },
    metadata: {
      url: 'https://example.com',
      totalPagesDiscovered: 2,
      totalComponentsIdentified: 2,
      totalUserFlowsMapped: 1,
      crawlTimestamp: '2026-05-26T00:00:00.000Z',
      version: '0.1.0',
      confidence: 0.7,
    },
    ...overrides,
  };
}

function mockDesignSpec(overrides = {}) {
  return {
    id: 'design-1',
    url: 'https://example.com',
    visualSystem: {
      primaryColors: [{ hex: '#1d4ed8', usageContext: 'accent', confidence: 0.8 }],
      secondaryColors: [],
      accentColors: [{ hex: '#f97316', usageContext: 'accent', confidence: 0.8 }],
      backgroundColors: [{ hex: '#f8fafc', usageContext: 'background', confidence: 0.8 }],
      textColors: [{ hex: '#111827', usageContext: 'text', confidence: 0.8 }],
      borders: [],
      shadows: [],
      confidence: 0.7,
    },
    typography: {
      fontFamilies: [{ role: UNKNOWN, family: 'Inter, Arial, sans-serif', confidence: 0.8 }],
      fontSizes: [{ value: '48px', usageContext: UNKNOWN, confidence: 0.8 }],
      fontWeights: [{ value: '800', usageContext: UNKNOWN, confidence: 0.8 }],
      lineHeights: [{ value: '1.1', usageContext: UNKNOWN, confidence: 0.8 }],
      hierarchy: [],
      confidence: 0.7,
    },
    layout: {
      pattern: 'grid',
      maxContentWidth: { value: '1120px', confidence: 0.75 },
      spacingSystem: [],
      breakpoints: [],
      responsiveBehavior: UNKNOWN,
      navigation: { position: UNKNOWN, style: UNKNOWN, confidence: 0 },
      confidence: 0.6,
    },
    components: [],
    uxPatterns: {
      loadingStates: [UNKNOWN],
      errorStates: [UNKNOWN],
      emptyStates: [UNKNOWN],
      feedbackPatterns: [UNKNOWN],
      formValidationStyle: UNKNOWN,
      confidence: 0,
    },
    technologySignals: {
      cssFramework: { name: 'Tailwind CSS signal', confidence: 0.65 },
      componentLibrary: { name: UNKNOWN, confidence: 0 },
      animationLibrary: { name: UNKNOWN, confidence: 0 },
      iconLibrary: { name: UNKNOWN, confidence: 0 },
      confidence: 0.55,
    },
    metadata: {
      url: 'https://example.com',
      extractionMethod: 'test',
      timestamp: '2026-05-26T00:00:00.000Z',
      version: '0.1.0',
      confidence: 0.65,
    },
    ...overrides,
  };
}

function mockDescriptionFeatureInventory(description, overrides = {}) {
  return mockFeatureInventory({
    id: 'feature-inventory-description-m4',
    url: 'flowai-description://community-resource-navigator',
    pages: [{
      url: 'flowai-description://community-resource-navigator',
      title: 'Community Resource Navigator',
      purpose: 'description-derived fresh build landing and workspace shell',
      primaryContent: description,
      navigation: [],
      hierarchy: { parent: 'root', children: [], confidence: 0.7 },
      access: UNKNOWN,
      confidence: 0.72,
    }],
    components: [{
      id: 'description-action-panel',
      type: 'card',
      content: 'Primary actions and next steps generated from the submitted description.',
      purpose: 'give the product a usable first workflow surface',
      pages: ['flowai-description://community-resource-navigator'],
      interactive: true,
      confidence: 0.64,
    }],
    userFlows: [{
      id: 'description-primary-flow',
      name: 'primary product journey',
      steps: [{ label: 'Open generated product', url: 'flowai-description://community-resource-navigator', confidence: 0.7 }],
      entryPoint: 'flowai-description://community-resource-navigator',
      exitPoint: 'flowai-description://community-resource-navigator',
      formFields: [],
      states: { success: 'Generated product renders', error: 'No baseline URL exists for comparison', confidence: 0.65 },
      confidence: 0.65,
    }],
    metadata: {
      ...mockFeatureInventory().metadata,
      url: 'flowai-description://community-resource-navigator',
      productName: 'Community Resource Navigator',
      source: 'description_build_brief',
    },
    ...overrides,
  });
}

describe('freshBuild Codebase Generator', () => {
  it('keeps Fresh Build disabled by default', () => {
    expect(isFreshBuildEnabled({})).toBe(false);
  });

  it('generates a valid GeneratedCodebase from mock FeatureInventory and DesignSpec', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), {
      productName: 'Example Product',
      now: '2026-05-26T00:00:00.000Z',
    });

    expect(codebase.status).toBe('READY');
    expect(codebase.stack).toBe(DEFAULT_TARGET_STACK);
    expect(codebase.pageCount).toBe(2);
    expect(codebase.componentCount).toBe(2);
    expect(codebase.flowCount).toBe(1);
    expect(codebase.platformDependencies).toEqual([]);
    expect(codebase.generatedAt).toBe('2026-05-26T00:00:00.000Z');
    expect(codebase.sourceInventoryId).toBe('inventory-1');
    expect(codebase.sourceDesignId).toBe('design-1');
    expect(validateGeneratedCodebase(codebase)).toEqual({ ok: true, errors: [] });
    expect(codebase.files.map((file) => file.path)).toEqual(expect.arrayContaining([
      'package.json',
      'vite.config.js',
      'vercel.json',
      'postcss.config.js',
      'tailwind.config.js',
      'index.html',
      '.gitignore',
      'src/main.jsx',
      'src/App.jsx',
      'src/index.css',
      'README.md',
      'src/pages/HomePage.jsx',
      'src/pages/Pricing.jsx',
    ]));
  });

  it('emits clean build-critical root config files that pass safety validation', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    const filesByPath = new Map(codebase.files.map((file) => [file.path, file]));
    const requiredConfigPaths = [
      'package.json',
      'vite.config.js',
      'vercel.json',
      'postcss.config.js',
      'tailwind.config.js',
      'index.html',
      '.gitignore',
    ];

    expect([...filesByPath.keys()]).toEqual(expect.arrayContaining(requiredConfigPaths));
    for (const configPath of requiredConfigPaths) {
      const file = filesByPath.get(configPath);
      expect(file.content.trim().length).toBeGreaterThan(0);
      expect(validateGeneratedCodebase({ ...codebase, files: [file] })).toEqual({ ok: true, errors: [] });
      expect(file.content).not.toMatch(/@base44|base44Client|platform-sdk|sdk-client/i);
    }

    const viteConfig = filesByPath.get('vite.config.js').content;
    expect(viteConfig).toContain("import { defineConfig } from 'vite';");
    expect(viteConfig).toContain("import react from '@vitejs/plugin-react';");
    expect(viteConfig).not.toMatch(/@base44\/vite-plugin|base44\(/i);
    expect(codebase.platformDependencies).toEqual([]);
  });

  it('covers the ListListXlrmdf unbalanced parenthesis regression with delimiter-safe generated JSX', () => {
    const codebase = generateCodebase(mockFeatureInventory({
      components: [
        {
          id: 'list-xlrmdf',
          type: 'list',
          content: 'Credibility signals (public profile, mission proof, operator notes',
          purpose: 'VEU AI Studio positioning (proof-led website',
          pages: ['https://example.com'],
          interactive: false,
          confidence: 0.8,
        },
      ],
      metadata: {
        ...mockFeatureInventory().metadata,
        totalComponentsIdentified: 1,
      },
    }), mockDesignSpec(), {
      productName: 'VEU AI Studio (Fresh Build proof',
      now: '2026-06-14T00:00:00.000Z',
    });
    const file = codebase.files.find((item) => item.path === 'src/components/ListListXlrmdf.jsx');

    expect(file).toBeTruthy();
    expect(file.content).toContain('&#40;');
    expect(file.content).not.toContain('signals (public');
    expect(validateGeneratedCodebase(codebase)).toEqual({ ok: true, errors: [] });
  });

  it('deduplicates duplicate crawled routes before generating page imports', () => {
    const codebase = generateCodebase(mockFeatureInventory({
      pages: [
        ...mockFeatureInventory().pages,
        {
          url: 'https://example.com/pricing',
          title: 'Pricing',
          purpose: 'pricing duplicate',
          primaryContent: 'Duplicate crawler record for pricing.',
          navigation: [],
          hierarchy: { parent: 'https://example.com', children: [], confidence: 0.5 },
          access: 'PUBLIC',
          confidence: 0.75,
        },
        {
          url: 'https://example.com/pricing-plus',
          title: 'Pricing',
          purpose: 'pricing variant',
          primaryContent: 'A distinct pricing page with the same title.',
          navigation: [],
          hierarchy: { parent: 'https://example.com', children: [], confidence: 0.5 },
          access: 'PUBLIC',
          confidence: 0.75,
        },
      ],
    }), mockDesignSpec(), { productName: 'Example Product' });

    const pagePaths = codebase.files
      .filter((file) => file.path.startsWith('src/pages/'))
      .map((file) => file.path);
    const appFile = codebase.files.find((file) => file.path === 'src/App.jsx').content;

    expect(pagePaths).toEqual([
      'src/pages/HomePage.jsx',
      'src/pages/Pricing.jsx',
      'src/pages/Pricing2.jsx',
    ]);
    expect(codebase.pageCount).toBe(3);
    expect(appFile.match(/import Pricing from/g)).toHaveLength(1);
    expect(appFile.match(/import Pricing2 from/g)).toHaveLength(1);
    expect(appFile.match(/"route": "\/pricing"/g)).toHaveLength(1);
    expect(appFile).toContain('"route": "/pricing-plus"');
    expect(validateGeneratedCodebase(codebase)).toEqual({ ok: true, errors: [] });
  });

  it('builds Tailwind config from DesignSpec colors', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    const tailwindConfig = codebase.files.find((file) => file.path === 'tailwind.config.js').content;

    expect(tailwindConfig).toContain("primary: '#1d4ed8'");
    expect(tailwindConfig).toContain("accent: '#f97316'");
    expect(tailwindConfig).toContain("background: '#f8fafc'");
    expect(tailwindConfig).toContain("foreground: '#111827'");
  });

  it('enforces the dependency allowlist', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    const packageJson = codebase.files.find((file) => file.path === 'package.json');
    const parsed = JSON.parse(packageJson.content);
    const dependencies = Object.keys({ ...parsed.dependencies, ...parsed.devDependencies });

    expect(dependencies).toEqual(expect.arrayContaining(['react', 'react-dom', 'vite', 'tailwindcss']));
    packageJson.content = packageJson.content.replace('"react-dom": "^18.2.0"', '"@base44/sdk": "^0.8.27"');

    const validation = validateGeneratedCodebase(codebase);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Dependency is not allowlisted'),
    ]));
  });

  it('blocks platform SDK references and keeps platformDependencies empty', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    codebase.files.push({ path: 'src/platform.js', content: "import { base44 } from '@base44/sdk';\n" });

    const validation = validateGeneratedCodebase(codebase);
    expect(codebase.platformDependencies).toEqual([]);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Platform dependency reference found'),
    ]));
  });

  it('blocks secret-like generated content', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    codebase.files.push({ path: 'src/secrets.js', content: "export const apiKey = 'sk-1234567890abcdef1234567890abcdef';\n" });

    const validation = validateGeneratedCodebase(codebase);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Secret-like value found'),
    ]));
  });

  it('blocks invalid paths, empty content, and syntax imbalance', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    codebase.files.push({ path: '../escape.jsx', content: 'export default function Bad() { return <div />; }\n' });
    codebase.files.push({ path: 'src/empty.jsx', content: '   ' });
    codebase.files.push({ path: 'src/broken.jsx', content: 'export default function Broken() { return (<div>Broken</div>; }\n' });
    codebase.files.push({ path: 'src/pages/HomePage.jsx', content: 'export default function Duplicate() { return <div />; }\n' });

    const validation = validateGeneratedCodebase(codebase);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Invalid generated file path'),
      expect.stringContaining('Generated file content is empty'),
      expect.stringContaining('unbalanced'),
      expect.stringContaining('Duplicate generated file path'),
    ]));
  });

  it('keeps validation strict for invalid generated files and summarizes blocked diagnostics', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), { productName: 'Example Product' });
    const invalidFile = {
      path: 'src/components/ListListXlrmdf.jsx',
      content: 'export default function ListListXlrmdf() { return (<div>Broken</div>; }\n',
    };

    const validation = validateGeneratedCodebase({ ...codebase, files: [invalidFile] });
    const summary = CODEBASE_GENERATOR_TEST.summarizeValidationErrors(validation.errors);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      'src/components/ListListXlrmdf.jsx has unbalanced ()',
    ]));
    expect(summary).toMatchObject({
      stage: 'codebase_generator',
      code: 'GENERATED_CODEBASE_INVALID',
      invalidFilePath: 'src/components/ListListXlrmdf.jsx',
      validationReason: 'unbalanced ()',
    });
  });

  it('hard-stops with BLOCKED when the API call cap is exceeded', () => {
    const codebase = generateCodebase(mockFeatureInventory(), mockDesignSpec(), {
      productName: 'Example Product',
      apiCallsUsed: MAX_GENERATOR_API_CALLS + 1,
      now: '2026-05-26T00:00:00.000Z',
    });

    expect(codebase.status).toBe('BLOCKED');
    expect(codebase.reason).toBe('API_CALL_CAP_EXCEEDED');
    expect(codebase.files).toEqual([]);
    expect(codebase.platformDependencies).toEqual([]);
    expect(codebase.metadata).toMatchObject({
      apiCallsUsed: MAX_GENERATOR_API_CALLS + 1,
      apiCallCap: MAX_GENERATOR_API_CALLS,
      blocked: true,
    });
  });

  it('generates an input-responsive description-only Creator app for resource navigation', () => {
    const description = 'Community Resource Navigator for underserved users. Users describe a need, choose a resource category, and receive a recommended next step.';
    const codebase = generateCodebase(
      mockDescriptionFeatureInventory(description),
      mockDesignSpec(),
      {
        productName: 'Community Resource Navigator',
        now: '2026-06-24T00:00:00.000Z',
      },
    );
    const appFile = codebase.files.find((file) => file.path === 'src/App.jsx');

    expect(codebase.status).toBe('READY');
    expect(codebase.metadata).toMatchObject({
      creatorType: 'description-only',
      persistence: {
        requested: false,
        supported: false,
      },
    });
    expect(appFile?.content).toContain('Describe your need');
    expect(appFile?.content).toContain('Recommend next step');
    expect(appFile?.content).toContain('emergency rental assistance');
    expect(appFile?.content).toContain('nearest food pantry intake desk');
    expect(appFile?.content).toContain('FlowAI M4 Creator Type 2 verified description-only static path');
    expect(appFile?.content).not.toMatch(/localStorage|indexedDB|sessionStorage/i);
    expect(validateGeneratedCodebase(codebase)).toEqual({ ok: true, errors: [] });
  });

  it('stops description-only Creator persistence instead of faking backend storage', () => {
    const description = 'Community Resource Navigator with persistence. Users must save requests, cold reload in a fresh session, and retrieve saved requests from server-side storage.';
    const codebase = generateCodebase(
      mockDescriptionFeatureInventory(description),
      mockDesignSpec(),
      {
        productName: 'Community Resource Navigator',
        now: '2026-06-24T00:00:00.000Z',
      },
    );

    expect(codebase.status).toBe('BLOCKED');
    expect(codebase.reason).toBe('PERSISTENCE_PROVISIONING_UNSUPPORTED');
    expect(codebase.files).toEqual([]);
    expect(codebase.platformDependencies).toEqual([]);
    expect(codebase.metadata).toMatchObject({
      creatorType: 'description-only',
      persistence: {
        requested: true,
        supported: false,
        reason: 'codebaseGenerator has no backend persistence substrate',
      },
    });
  });

  it('does not import platform SDKs or product-specific logic', () => {
    const file = repoFile('src/lib/freshBuild/codebaseGenerator.js');
    const importLines = file.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line)).join('\n');

    expect(importLines).not.toMatch(/@base44\/sdk|base44Client/i);
    expect(file).not.toMatch(/saige|reltwin|reachsms|pressai|mypreglife/i);
    expect(file).not.toMatch(/new WebSocket|chromium\.launch/i);
  });
});
