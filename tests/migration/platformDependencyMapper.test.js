import { describe, expect, it, vi } from 'vitest';
import {
  classifyDependency,
  detectPlatform,
  mapReplacementStrategy,
  scanPlatformDependencies,
} from '../../src/lib/migration/platformDependencyMapper.js';

describe('platformDependencyMapper', () => {
  it('detects Base44 SDK imports with the expected manifest shape', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'src/api/client.js',
        content: "import { base44Client } from './base44Client';\nexport const client = base44Client;\n",
      }],
    });

    expect(manifest).toHaveLength(2);
    expect(manifest[0]).toMatchObject({
      file: 'src/api/client.js',
      line: 1,
      match: "import { base44Client } from './base44Client';",
      type: 'SDK_IMPORT',
      platform: 'base44',
      replacement_strategy: 'REST_API',
      confidence: 0.92,
      autoReplaceable: true,
    });
  });

  it('detects Base44 environment variables', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{ file: '.env.example', content: 'VITE_BASE44_APP_ID=abc\n' }],
    });

    expect(manifest[0]).toMatchObject({
      type: 'ENV_VAR',
      platform: 'base44',
      replacement_strategy: 'ENV_STANDARD',
    });
  });

  it('detects Wix API calls', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{ file: 'src/wix.js', content: "const url = 'https://www.wix.com/corvid/api';\n" }],
    });

    expect(manifest[0]).toMatchObject({
      type: 'API_CALL',
      platform: 'wix',
    });
  });

  it('detects conservative unknown platform heuristics only with multiple signals', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'src/platform.js',
        content: [
          'const client = createClient({ appId: import.meta.env.VITE_ACME_APP_ID });',
          'const id = import.meta.env.VITE_ACME_APP_ID;',
          "const baseUrl = 'https://platform.acme.test/api';",
        ].join('\n'),
      }],
    });

    expect(manifest).toHaveLength(3);
    expect(manifest.every((finding) => finding.platform === 'unknown')).toBe(true);
    expect(manifest.every((finding) => finding.autoReplaceable === false)).toBe(true);
  });

  it('keeps AUTH_GATE findings out of auto replacement regardless of confidence', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'src/routes.js',
        content: "import { base44Client } from './base44Client';\nexport const route = { requiresAuth: true };\n",
      }],
    });

    const authGate = manifest.find((finding) => finding.type === 'AUTH_GATE');
    expect(authGate).toMatchObject({
      confidence: 0.95,
      autoReplaceable: false,
      replacement_strategy: 'AUTH_STANDARD',
    });
  });

  it('returns an empty manifest for files without platform dependencies', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{ file: 'src/plain.js', content: 'export const value = 1;\n' }],
    });

    expect(manifest).toEqual([]);
  });

  it('does not flag single generic platform-shaped env vars', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{ file: 'src/env.js', content: 'const key = import.meta.env.NEXT_PUBLIC_ACME_KEY;\n' }],
    });

    expect(manifest).toEqual([]);
  });

  it('skips generated lockfiles even when they contain platform SDK references', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'package-lock.json',
        content: JSON.stringify({
          packages: {
            'node_modules/@base44/sdk': {
              version: '1.0.0',
              resolved: 'https://registry.npmjs.org/@base44/sdk/-/sdk-1.0.0.tgz',
            },
          },
        }),
      }],
    });

    expect(manifest).toEqual([]);
  });

  it('still detects package manifest platform dependencies as evidence', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'package.json',
        content: JSON.stringify({ dependencies: { '@base44/sdk': '^1.0.0' } }),
      }],
    });

    expect(manifest).toHaveLength(1);
    expect(manifest[0]).toMatchObject({
      file: 'package.json',
      platform: 'base44',
      type: 'SDK_IMPORT',
    });
  });

  it('does not flag analytics, Sentry, Stripe, Supabase, or Clerk alone', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'src/vendors.js',
        content: [
          'const analytics = import.meta.env.NEXT_PUBLIC_ANALYTICS_KEY;',
          'const sentry = import.meta.env.SENTRY_DSN;',
          'const stripe = import.meta.env.STRIPE_PUBLIC_KEY;',
          'const supabase = import.meta.env.SUPABASE_URL;',
          'const clerk = import.meta.env.CLERK_PUBLISHABLE_KEY;',
        ].join('\n'),
      }],
    });

    expect(manifest).toEqual([]);
  });

  it('applies the confidence gate below 0.8', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        file: 'src/platform.js',
        content: 'const client = createClient({});\nconst id = import.meta.env.VITE_ACME_APP_ID;\nconst api = "https://platform.acme.test/api";\n',
      }],
    });

    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest.every((finding) => finding.confidence < 0.8)).toBe(true);
    expect(manifest.every((finding) => finding.autoReplaceable === false)).toBe(true);
  });

  it('combines manifest entries across multiple files', async () => {
    const manifest = await scanPlatformDependencies({
      files: [
        { file: 'src/base44.js', content: "import base44 from '@base44/sdk';\n" },
        { file: 'src/webflow.js', content: 'Webflow.push(() => {});\n' },
      ],
    });

    expect(manifest.map((finding) => finding.platform)).toEqual(['base44', 'webflow']);
  });

  it('uses injectable readFile for path-based file arrays', async () => {
    const readFile = vi.fn(async () => "import base44 from '@base44/sdk';\n");
    const manifest = await scanPlatformDependencies({
      files: ['src/base44.js'],
      readFile,
    });

    expect(readFile).toHaveBeenCalledWith('src/base44.js', 'utf8');
    expect(manifest[0].platform).toBe('base44');
  });

  it('normalizes virtual file entries that use path instead of file', async () => {
    const manifest = await scanPlatformDependencies({
      files: [{
        path: 'src/App.jsx',
        content: "import sdk from '@base44/sdk';\n",
      }],
    });

    expect(manifest).toHaveLength(1);
    expect(manifest[0]).toMatchObject({
      file: 'src/App.jsx',
      platform: 'base44',
      type: 'SDK_IMPORT',
    });
  });

  it('returns correct platform strings for every known platform', () => {
    expect(detectPlatform('@base44/sdk')).toBe('base44');
    expect(detectPlatform('wix-data')).toBe('wix');
    expect(detectPlatform('@webflow/api')).toBe('webflow');
    expect(detectPlatform('bubble.io/api')).toBe('bubble');
    expect(detectPlatform('wp-json')).toBe('wordpress');
    expect(detectPlatform('nothing here')).toBe('unknown');
  });

  it('maps dependency types to replacement strategies', () => {
    expect(classifyDependency("import sdk from '@base44/sdk';")).toBe('SDK_IMPORT');
    expect(classifyDependency('VITE_BASE44_APP_ID')).toBe('ENV_VAR');
    expect(classifyDependency('https://app.base44.com/api')).toBe('API_CALL');
    expect(classifyDependency('requiresAuth: true')).toBe('AUTH_GATE');
    expect(mapReplacementStrategy('SDK_IMPORT', 'base44')).toBe('REST_API');
    expect(mapReplacementStrategy('API_CALL', 'wix')).toBe('REST_API');
    expect(mapReplacementStrategy('ENV_VAR', 'base44')).toBe('ENV_STANDARD');
    expect(mapReplacementStrategy('CONFIG_REF', 'base44')).toBe('ENV_STANDARD');
    expect(mapReplacementStrategy('AUTH_GATE', 'base44')).toBe('AUTH_STANDARD');
  });
});
