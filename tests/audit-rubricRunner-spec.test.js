// W3 — TDD spec for rubricRunner (intentionally failing until W3 builds it).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/rubricRunner.js';

const REQUIRED_GOVERNANCE_IDS = [
  'gov.authority',
  'gov.audit_completeness',
  'gov.charter_contract',
  'gov.message_schema',
  'gov.ip_protection',
  'gov.escalation',
  'gov.secrets_hygiene',
];

const REQUIRED_READINESS_IDS = [
  'rdy.functional',
  'rdy.failure_handling',
  'rdy.performance',
  'rdy.observability',
  'rdy.documentation',
  'rdy.dependencies',
];

describe('W3 spec — rubricRunner', () => {
  it('module file exists at src/lib/audits/rubricRunner.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('exports loadRubric(version) returning the rubric object', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('rubricRunner.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.loadRubric).toBe('function');
  });

  it('exports loadEvaluators(version) returning a map keyed by criterion id', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('rubricRunner.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.loadEvaluators).toBe('function');
  });

  it.each(REQUIRED_GOVERNANCE_IDS)('governance.v1 evaluator exists for criterion %s', (id) => {
    expect.fail(`Governance criterion "${id}" evaluator not yet authored under src/lib/audits/criteria/governance/`);
  });

  it.each(REQUIRED_READINESS_IDS)('readiness.v1 evaluator exists for criterion %s', (id) => {
    expect.fail(`Readiness criterion "${id}" evaluator not yet authored under src/lib/audits/criteria/readiness/`);
  });

  it('every evaluator returns { id, score:0..100, evidence:non-empty[], notes:string }', () => {
    expect.fail('Evaluator result shape contract — pending W3 implementation.');
  });
});
