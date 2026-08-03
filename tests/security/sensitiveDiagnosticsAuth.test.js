import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('sensitive diagnostics are authenticated', () => {
  for (const path of [
    'api/diagnostic.js',
    'api/version.js',
    'api/orchestrator/health.js',
  ]) {
    it(`${path} hard-gates before collecting or returning details`, () => {
      const source = read(path);
      const gate = source.indexOf('await requireAuthHard(req, res)');
      expect(gate).toBeGreaterThan(-1);
      expect(source.indexOf('if (!ctx) return', gate)).toBeGreaterThan(gate);
    });
  }
});
