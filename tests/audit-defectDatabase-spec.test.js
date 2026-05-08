// W3 — TDD spec for defectDatabase (intentionally failing until W3 builds it).
//
// Consumer of ScoreEvaluator.toDefectRegister(evaluation). Persists per-failure
// rows keyed by defectId = `${targetType}_${targetId}_${criterionId}_${evaluatedAt}`.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/defectDatabase.js';
const MIGRATION_PATH = 'supabase/migrations/0010_w3_audit_infra.sql';

describe('W3 spec — defectDatabase', () => {
  it('module file exists at src/lib/audits/defectDatabase.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('migration 0010_w3_audit_infra.sql exists and reserves the W3 audit-infra tables', () => {
    expect(existsSync(resolve(process.cwd(), MIGRATION_PATH))).toBe(true);
  });

  it('exports recordDefects(evaluation, deps) that consumes ScoreEvaluator.toDefectRegister output', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('defectDatabase.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.recordDefects).toBe('function');
  });

  it('exports listOpenDefects(targetType, targetId, deps) returning newest-first', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('defectDatabase.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.listOpenDefects).toBe('function');
  });

  it('exports closeDefect(defectId, resolutionNote, deps)', async () => {
    if (!existsSync(resolve(process.cwd(), MODULE_PATH))) throw new Error('defectDatabase.js does not exist yet');
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.closeDefect).toBe('function');
  });

  it('table name does NOT collide with audit_runs / audit_issues from migration 0002', () => {
    // Sentinel: forces W3 to choose governance_evaluations / governance_defects
    // (or equivalent non-overloaded names) before the migration lands.
    expect.fail('Pending W0 ruling on final table names — see specs/w3-overnight/07-migrations.md');
  });
});
