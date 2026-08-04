import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('static health labels do not override live health truth', () => {
  it.each([
    'src/components/layout/OrchestrationBar.jsx',
    'src/pages/LandingPage.jsx',
  ])('%s defers to the live health badge', (path) => {
    const source = readFileSync(resolve(root, path), 'utf8');
    expect(source).not.toContain('FlowAI Ready');
    expect(source).toContain('See Health Status');
  });
});
