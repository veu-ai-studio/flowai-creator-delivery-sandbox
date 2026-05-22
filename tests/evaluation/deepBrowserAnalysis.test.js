import { describe, expect, it } from 'vitest';
import {
  buildFindingsFromDeepAnalysis,
  detectFrameworkFromSignals,
  redactEvidence,
} from '../../src/lib/evaluation/deepBrowserAnalysis.js';
import { evaluatorsForTier, TIER } from '../../src/lib/evaluation/evaluationBudget.js';

describe('deepBrowserAnalysis', () => {
  it('redacts likely secrets from runtime evidence', () => {
    const redacted = redactEvidence('authorization: Bearer sk-test-secret token=ghp_abcdefghijklmnopqrstuvwxyz');
    expect(redacted).toContain('***REDACTED***');
    expect(redacted).not.toContain('sk-test-secret');
    expect(redacted).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz');
  });

  it('detects framework with evidence and confidence', () => {
    expect(detectFrameworkFromSignals({ nextData: true })).toMatchObject({
      framework: 'Next.js',
      confidence: 'HIGH',
    });
    const fallback = detectFrameworkFromSignals({});
    expect(fallback.framework).toBe('vanilla/unknown');
    expect(fallback.evidence.length).toBeGreaterThan(0);
  });

  it('turns console and network evidence into normalized raw findings', () => {
    const findings = buildFindingsFromDeepAnalysis({
      url: 'https://example.com',
      consoleFindings: [
        { type: 'error', message: 'boom', stackTrace: 'Error: boom', location: { url: 'https://example.com/app.js' } },
      ],
      networkFindings: [
        { url: 'https://example.com/api/missing', method: 'GET', status: 404, durationMs: 44, sizeBytes: 0, error: null },
        { url: 'https://example.com/hero.png', method: 'GET', status: 200, durationMs: 2500, sizeBytes: 100, error: null },
      ],
      accessibilityFindings: { focusableElements: [] },
    });
    expect(findings.map((f) => f.category)).toEqual(expect.arrayContaining([
      'console-error',
      'failed-network-request',
      'slow-resource',
      'keyboard-focusability',
    ]));
    for (const finding of findings) {
      expect(finding.generated_by).toBe('deep-browser-analysis');
      expect(finding.evidenceLevel).toBeTruthy();
    }
  });

  it('runs deep browser analysis only in heavier tiers', () => {
    expect(evaluatorsForTier(TIER.TIER_1)).not.toContain('deep-browser-analysis');
    expect(evaluatorsForTier(TIER.TIER_2)).toContain('deep-browser-analysis');
    expect(evaluatorsForTier(TIER.TIER_3)).toContain('deep-browser-analysis');
  });
});
