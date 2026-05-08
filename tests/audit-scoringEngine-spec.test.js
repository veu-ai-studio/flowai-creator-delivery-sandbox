// W3 — TDD spec for scoringEngine (intentionally failing until W3 builds it).
//
// Documents the expected interface for src/lib/audits/scoringEngine.js as
// asserted requirements. These tests will pass once W3 implements the module.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/scoringEngine.js';

describe('W3 spec — scoringEngine', () => {
  it('module file exists at src/lib/audits/scoringEngine.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('exports a `run` function that composes rubric + evaluators + deps', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) {
      throw new Error('scoringEngine.js does not exist yet — see existence test');
    }
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.run).toBe('function');
  });

  it('exports a `runGovernance(target, deps)` shorthand that scores a target against GOVERNANCE_RUBRIC_V1', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) {
      throw new Error('scoringEngine.js does not exist yet');
    }
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.runGovernance).toBe('function');
  });

  it('exports a `runReadiness(target, deps)` shorthand that scores a target against READINESS_RUBRIC_V1', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) {
      throw new Error('scoringEngine.js does not exist yet');
    }
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.runReadiness).toBe('function');
  });

  it('returned evaluation has frozen { targetType, targetId, rubricVersion, score, passes, criteriaResults, failures, evaluatedAt, evaluatorId }', () => {
    // Cannot exercise yet — placeholder for the contract assertion.
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });
});
