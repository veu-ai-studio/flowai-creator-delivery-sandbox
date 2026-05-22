import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENT_PATH = resolve(__dirname, '../../src/components/FindingsReport.jsx');
const componentSrc = readFileSync(COMPONENT_PATH, 'utf8');

describe('FindingsReport', () => {
  it('renders honest source-access limitation language', () => {
    expect(componentSrc).toContain('Source-level patches require registered repository access');
    expect(componentSrc).toContain('Source access required for a real patch');
  });

  it('renders fix level, evidence level, risk, confidence, copy, and JSON download controls', () => {
    expect(componentSrc).toMatch(/proposal\.fixLevel/);
    expect(componentSrc).toMatch(/proposal\.evidenceLevel/);
    expect(componentSrc).toMatch(/risk\.regressionRisk/);
    expect(componentSrc).toMatch(/risk\.confidence/);
    expect(componentSrc).toContain('Copy fix');
    expect(componentSrc).toContain('flowai-findings-report.json');
  });

  it('shows a degraded deep-browser-analysis message instead of disappearing', () => {
    expect(componentSrc).toContain('Deep browser analysis unavailable');
    expect(componentSrc).toMatch(/deep\.ok\s*===\s*false/);
  });
});
