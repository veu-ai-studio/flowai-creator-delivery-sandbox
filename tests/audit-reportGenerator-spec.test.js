// W3 — TDD spec for reportGenerator (intentionally failing until W3 builds it).
//
// Produces a human-readable clearance report and publishes
// `system.clearance.decision.v1` to the message bus.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/reportGenerator.js';

describe('W3 spec — reportGenerator', () => {
  it('module file exists at src/lib/audits/reportGenerator.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('exports generateClearanceReport(governanceEval, readinessEval, deps)', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('reportGenerator.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.generateClearanceReport).toBe('function');
  });

  it('publishes system.clearance.decision.v1 envelope with decision in {CLEAR, DO_NOT_ACCEPT}', () => {
    expect.fail('Pending W3 implementation — must call deps.messageBus.publish on the v1 topic.');
  });

  it('returns a markdown report containing per-criterion failure breakdown', () => {
    expect.fail('Pending W3 implementation — required by Agent #8 reporting flow.');
  });

  it('includes the literal threshold (95) in the report so downstream readers detect drift', () => {
    expect.fail('Pending W3 implementation — must echo CLEARANCE_THRESHOLD from ScoreEvaluator.');
  });
});
