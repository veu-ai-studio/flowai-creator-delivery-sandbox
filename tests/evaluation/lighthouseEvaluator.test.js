// tests/evaluation/lighthouseEvaluator.test.js
//
// DISPATCH U1 ITEM 1 — Lighthouse evaluator must survive Vercel's
// serverless bundling, where the report templates (.html assets under
// node_modules/lighthouse/report/...) are sometimes missing. The
// evaluator should:
//   1. Request JSON-only output (no HTML rendering).
//   2. If Lighthouse still throws ENOENT for a template, salvage
//      result.lhr from the error if attached, and degrade gracefully
//      otherwise (return ok:false with empty findings — never crash
//      the pipeline).

import { describe, it, expect, vi } from 'vitest';
import { runLighthouseEvaluator } from '../../src/lib/evaluation/lighthouseEvaluator.js';

function chromeLauncherStub() {
  return {
    launch: vi.fn(async () => ({
      port: 12345,
      kill: vi.fn(async () => undefined),
    })),
  };
}

const FAKE_LHR = Object.freeze({
  audits: {
    'meta-description': { id: 'meta-description', title: 'meta', description: 'd', score: 0, scoreDisplayMode: 'binary' },
  },
  categories: {
    performance: { auditRefs: [], score: 0.9 },
    accessibility: { auditRefs: [], score: 0.95 },
    'best-practices': { auditRefs: [], score: 0.92 },
    seo: { auditRefs: [{ id: 'meta-description' }], score: 0.5 },
  },
});

describe('Lighthouse evaluator — JSON-only output (DISPATCH U1 ITEM 1)', () => {
  it('passes output:["json"] (array form) to suppress HTML report generation', async () => {
    let capturedOpts = null;
    const lighthouse = vi.fn(async (_url, opts) => {
      capturedOpts = opts;
      return { lhr: FAKE_LHR };
    });
    const result = await runLighthouseEvaluator('https://example.com', {
      deps: { lighthouse, chromeLauncher: chromeLauncherStub() },
    });
    expect(result.ok).toBe(true);
    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts.output).toEqual(['json']);
    expect(capturedOpts.disableFullPageScreenshot).toBe(true);
  });

  it('salvages result.lhr from an ENOENT error attached to the throw', async () => {
    const lighthouse = vi.fn(async () => {
      const err = new Error(
        "ENOENT: no such file or directory, open '/var/task/node_modules/lighthouse/report/generator/../flow-report/assets/standalone-flow-template.html'",
      );
      err.lhr = FAKE_LHR;
      throw err;
    });
    const result = await runLighthouseEvaluator('https://example.com', {
      deps: { lighthouse, chromeLauncher: chromeLauncherStub() },
    });
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it('degrades to ok:false (no crash) when ENOENT happens without lhr attached', async () => {
    const lighthouse = vi.fn(async () => {
      throw new Error(
        "ENOENT: no such file or directory, open '/var/task/node_modules/lighthouse/report/generator/foo.html'",
      );
    });
    const result = await runLighthouseEvaluator('https://example.com', {
      deps: { lighthouse, chromeLauncher: chromeLauncherStub() },
    });
    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([]);
    expect(typeof result.error).toBe('string');
    expect(result.error).toMatch(/ENOENT/);
  });
});
