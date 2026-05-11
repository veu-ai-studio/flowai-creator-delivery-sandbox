// W3 — defectDatabase unit tests (TDD scaffold turned green).

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_PATH = 'src/lib/audits/defectDatabase.js';
const MIGRATION_PATH = 'supabase/migrations/0010_w3_audit_infra.sql';

// In-memory mock DB used by every test in this file.
function makeMockDb() {
  const tables = new Map();
  return {
    _rows(table) {
      if (!tables.has(table)) tables.set(table, []);
      return tables.get(table);
    },
    async insertInto(table, row) {
      this._rows(table).push({ ...row });
      return { ...row };
    },
    async select(table, where = {}) {
      return this._rows(table).filter(row =>
        Object.entries(where).every(([k, v]) => row[k] === v)
      );
    },
    async update(table, where, patch) {
      const rows = this._rows(table);
      const updated = [];
      for (const row of rows) {
        if (Object.entries(where).every(([k, v]) => row[k] === v)) {
          Object.assign(row, patch);
          updated.push({ ...row });
        }
      }
      return updated;
    },
  };
}

function fakeEvaluation({ targetType = 'agent', targetId = '11', failures = [] } = {}) {
  return Object.freeze({
    targetType,
    targetId,
    rubricVersion: 'governance.v1',
    score: 80,
    passes: false,
    criteriaResults: Object.freeze([]),
    failures: Object.freeze(failures),
    evaluatedAt: 1715000000000,
    evaluatorId: 'auditor',
  });
}

describe('W3 spec — defectDatabase', () => {
  it('module file exists at src/lib/audits/defectDatabase.js', () => {
    expect(existsSync(resolve(process.cwd(), MODULE_PATH))).toBe(true);
  });

  it('migration 0010_w3_audit_infra.sql exists and reserves the W3 audit-infra tables', () => {
    expect(existsSync(resolve(process.cwd(), MIGRATION_PATH))).toBe(true);
    const sql = readFileSync(resolve(process.cwd(), MIGRATION_PATH), 'utf8');
    expect(sql).toMatch(/create table if not exists defect\b/);
    expect(sql).toMatch(/create table if not exists audit_run\b/);
    expect(sql).toMatch(/create table if not exists disagreement\b/);
  });

  it('exports recordDefects(evaluation, deps) that consumes ScoreEvaluator.toDefectRegister output', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.recordDefects).toBe('function');
    const db = makeMockDb();
    const evalRes = fakeEvaluation({
      failures: [{
        id: 'gov.authority',
        score: 70,
        evidence: [{ kind: 'replay_mismatch' }],
        notes: 'authority overreach detected',
      }],
    });
    const inserted = await mod.recordDefects(evalRes, { db });
    expect(inserted).toHaveLength(1);
    expect(inserted[0].id).toBe('agent_11_gov.authority_1715000000000');
    expect(inserted[0].subject_id).toBe('agent:11');
    expect(inserted[0].severity).toBe('P1'); // gap = 95-70 = 25 -> P1 (>= 20)
    expect(inserted[0].status).toBe('open');
    expect(db._rows('defect')).toHaveLength(1);
  });

  it('exports listOpenDefects(targetType, targetId, deps) returning newest-first', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.listOpenDefects).toBe('function');
    const db = makeMockDb();
    db._rows('defect').push(
      { id: 'agent_11_x_1', subject_id: 'agent:11', severity: 'P2', status: 'open', opened_at: '2026-05-09T00:00:00.000Z' },
      { id: 'agent_11_x_2', subject_id: 'agent:11', severity: 'P1', status: 'open', opened_at: '2026-05-11T00:00:00.000Z' },
      { id: 'agent_11_x_3', subject_id: 'agent:11', severity: 'P3', status: 'resolved', opened_at: '2026-05-10T00:00:00.000Z' },
      { id: 'agent_12_x_4', subject_id: 'agent:12', severity: 'P0', status: 'open', opened_at: '2026-05-11T00:00:00.000Z' },
    );
    const result = await mod.listOpenDefects('agent', '11', { db });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('agent_11_x_2'); // newest
    expect(result[1].id).toBe('agent_11_x_1');
  });

  it('exports closeDefect(defectId, resolutionNote, deps)', async () => {
    const mod = await import('../' + MODULE_PATH);
    expect(typeof mod.closeDefect).toBe('function');
    const db = makeMockDb();
    db._rows('defect').push({
      id: 'agent_11_x_1', subject_id: 'agent:11', severity: 'P2', status: 'open',
      opened_at: '2026-05-09T00:00:00.000Z', resolved_at: null, resolution_note: null,
    });
    const updated = await mod.closeDefect('agent_11_x_1', 'fixed in build #143', { db });
    expect(updated).toHaveLength(1);
    expect(updated[0].status).toBe('resolved');
    expect(updated[0].resolution_note).toBe('fixed in build #143');
    expect(typeof updated[0].resolved_at).toBe('string');
  });

  it('table name does NOT collide with audit_runs / audit_issues from migration 0002', () => {
    const sql = readFileSync(resolve(process.cwd(), MIGRATION_PATH), 'utf8');
    // The 0010 migration must not create either of the Super Customer Agent's tables.
    expect(sql).not.toMatch(/create table if not exists audit_runs\b/);
    expect(sql).not.toMatch(/create table if not exists audit_issues\b/);
    // The migration's table names are the brief's literal names: defect / audit_run / disagreement.
    expect(sql).toMatch(/create table if not exists defect\b/);
    expect(sql).toMatch(/create table if not exists audit_run\b[^s]/m); // ensure singular, not plural
    expect(sql).toMatch(/create table if not exists disagreement\b/);
  });
});
