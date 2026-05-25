import { describe, expect, it } from 'vitest';
import { generateDirectReplacements } from '../../src/lib/migration/directReplacementGenerator.js';

const baseFinding = {
  file: 'src/platform.js',
  line: 1,
  match: '',
  type: 'SDK_IMPORT',
  platform: 'base44',
  replacement_strategy: 'REST_API',
  confidence: 0.92,
  autoReplaceable: true,
};

describe('directReplacementGenerator', () => {
  it('generates full-file SDK import replacements in memory', () => {
    const originalContent = "import { base44Client } from './base44Client';\nexport const api = base44Client;\n";
    const [result] = generateDirectReplacements({
      manifest: [{ ...baseFinding, match: "import { base44Client } from './base44Client';" }],
      files: [{ file: 'src/platform.js', content: originalContent }],
    });

    expect(result).toMatchObject({
      file: 'src/platform.js',
      originalContent,
      confidence: 0.92,
      replacementStrategy: 'REST_API',
      requiresHumanReview: false,
    });
    expect(result.replacementContent).toContain('createStandalonePlatformClient');
    expect(result.replacementContent).not.toContain("import { base44Client } from './base44Client';");
  });

  it('generates API call replacements', () => {
    const [result] = generateDirectReplacements({
      manifest: [{
        ...baseFinding,
        match: 'https://app.base44.com/api/apps',
        type: 'API_CALL',
      }],
      files: [{ file: 'src/platform.js', content: "const api = 'https://app.base44.com/api/apps';\n" }],
    });

    expect(result.replacementContent).toContain('VITE_STANDALONE_API_BASE_URL');
  });

  it('generates env var replacements', () => {
    const [result] = generateDirectReplacements({
      manifest: [{
        ...baseFinding,
        match: 'VITE_BASE44_APP_ID',
        type: 'ENV_VAR',
        replacement_strategy: 'ENV_STANDARD',
      }],
      files: [{ file: 'src/platform.js', content: 'const id = import.meta.env.VITE_BASE44_APP_ID;\n' }],
    });

    expect(result.replacementContent).toContain('VITE_STANDALONE_APP_ID');
  });

  it('generates config ref replacements', () => {
    const [result] = generateDirectReplacements({
      manifest: [{
        ...baseFinding,
        match: 'base44Client',
        type: 'CONFIG_REF',
        replacement_strategy: 'ENV_STANDARD',
      }],
      files: [{ file: 'src/platform.js', content: 'const client = base44Client;\n' }],
    });

    expect(result.replacementContent).toContain('standalonePlatformClient');
  });

  it('forces AUTH_GATE findings into human review with null replacement content', () => {
    const [result] = generateDirectReplacements({
      manifest: [{
        ...baseFinding,
        match: 'requiresAuth: true',
        type: 'AUTH_GATE',
        replacement_strategy: 'AUTH_STANDARD',
        confidence: 0.99,
      }],
      files: [{ file: 'src/routes.js', content: 'export const route = { requiresAuth: true };\n' }],
    });

    expect(result.requiresHumanReview).toBe(true);
    expect(result.replacementContent).toBeNull();
    expect(result.reason).toBe('AUTH_GATE_REQUIRES_HUMAN_REVIEW');
  });

  it('honors the confidence gate', () => {
    const [result] = generateDirectReplacements({
      manifest: [{ ...baseFinding, confidence: 0.79 }],
      files: [{ file: 'src/platform.js', content: 'const x = 1;\n' }],
    });

    expect(result.requiresHumanReview).toBe(true);
    expect(result.replacementContent).toBeNull();
    expect(result.reason).toBe('CONFIDENCE_BELOW_THRESHOLD');
  });

  it('rejects forbidden paths', () => {
    const [result] = generateDirectReplacements({
      manifest: [{ ...baseFinding, file: 'src/auth/platform.js' }],
      files: [{ file: 'src/auth/platform.js', content: "import sdk from '@base44/sdk';\n" }],
    });

    expect(result.requiresHumanReview).toBe(true);
    expect(result.replacementContent).toBeNull();
    expect(result.reason).toBe('FORBIDDEN_PATH');
  });

  it('returns complete file replacements only', () => {
    const originalContent = [
      "import { base44Client } from './base44Client';",
      'export const keepMe = true;',
    ].join('\n');
    const [result] = generateDirectReplacements({
      manifest: [{ ...baseFinding, match: "import { base44Client } from './base44Client';" }],
      files: [{ file: 'src/platform.js', content: originalContent }],
    });

    expect(result.replacementContent).toContain('export const keepMe = true;');
    expect(result.replacementContent).not.toBe(originalContent);
  });

  it('does not write to disk or require write hooks', () => {
    const [result] = generateDirectReplacements({
      manifest: [{ ...baseFinding, match: 'VITE_BASE44_APP_ID', type: 'ENV_VAR' }],
      files: new Map([['src/platform.js', 'const id = "VITE_BASE44_APP_ID";\n']]),
    });

    expect(result.file).toBe('src/platform.js');
    expect(result.replacementContent).toContain('VITE_STANDALONE_APP_ID');
  });
});
