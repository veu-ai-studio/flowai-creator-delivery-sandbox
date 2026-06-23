import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

describe('BuildExecutionWorker deployed entrypoint', () => {
  it('routes public /api/forge/build to the top-level Vercel function shim', () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(repoRoot, 'vercel.json'), 'utf8'));
    expect(vercelConfig.rewrites[0]).toEqual({
      source: '/api/forge/build',
      destination: '/api/forge-build',
    });
    expect(vercelConfig.functions['api/forge-build.js']).toEqual({ maxDuration: 800 });
  });

  it('keeps the public entrypoint delegated to the real Build path handler', () => {
    const shim = readFileSync(resolve(repoRoot, 'api/forge-build.js'), 'utf8');
    expect(shim).toContain("export { default } from './forge/build.js';");
  });
});
