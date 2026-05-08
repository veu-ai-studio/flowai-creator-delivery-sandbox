// W3 — TDD spec for auditOfAuditor (intentionally failing until W3 builds it).
//
// Independent meta-auditor for Agent #8. Loads rubrics from
// src/lib/audits/rubrics/meta/. Implements disagreement protocol:
// T = 5 (third run), T2 = 10 (W0 escalation).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/auditOfAuditor.js';
const META_RUBRIC_DIR = 'src/lib/audits/rubrics/meta';
const PRIMARY_RUBRIC_DIR = 'src/lib/audits/rubrics/primary';
const PROTOCOL_PATH = 'src/lib/audits/disagreementProtocol.js';

describe('W3 spec — auditOfAuditor', () => {
  it('module file exists at src/lib/audits/auditOfAuditor.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('rubric directory split exists: rubrics/primary/ and rubrics/meta/', () => {
    expect(existsSync(resolve(process.cwd(), META_RUBRIC_DIR))).toBe(true);
    expect(existsSync(resolve(process.cwd(), PRIMARY_RUBRIC_DIR))).toBe(true);
  });

  it('disagreement-protocol module exists', () => {
    expect(existsSync(resolve(process.cwd(), PROTOCOL_PATH))).toBe(true);
  });

  it('exports auditAgent8(deps) — only call site that targets Agent #8', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('auditOfAuditor.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.auditAgent8).toBe('function');
  });

  it('disagreement protocol exports DISAGREEMENT_T = 5 and DISAGREEMENT_T2 = 10', async () => {
    if (!existsSync(resolve(process.cwd(), PROTOCOL_PATH))) throw new Error('disagreementProtocol.js does not exist yet');
    const mod = await import('../' + PROTOCOL_PATH);
    expect(mod.DISAGREEMENT_T).toBe(5);
    expect(mod.DISAGREEMENT_T2).toBe(10);
  });

  it('disagreement protocol exports decideEscalation({t1Score, t2Score, t3Score?}) returning one of NO_ESCALATION | THIRD_RUN | W0_ESCALATION', async () => {
    if (!existsSync(resolve(process.cwd(), PROTOCOL_PATH))) throw new Error('disagreementProtocol.js does not exist yet');
    const mod = await import('../' + PROTOCOL_PATH);
    expect(typeof mod.decideEscalation).toBe('function');
  });

  it('auditOfAuditor instantiates ScoreEvaluator with auditOfAuditorMode: true', () => {
    expect.fail('Pending W3 implementation — must construct ScoreEvaluator({ auditOfAuditorMode: true }).');
  });

  it('auditOfAuditor refuses to evaluate any agent except Agent #8', () => {
    expect.fail('Pending W3 implementation — meta auditor scope is narrow by design.');
  });
});
