/**
 * defectDatabase — W3 defect register persistence interface.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/defectDatabase.js   (W3 territory)
 * Migration:   /supabase/migrations/0010_w3_audit_infra.sql (defect table)
 *
 * Consumes:    ScoreEvaluator.toDefectRegister(evaluation) output.
 *              Per-defect rows are keyed by
 *                defectId = ${targetType}_${targetId}_${criterionId}_${evaluatedAt}
 *
 * deps.db
 *   A small abstraction so tests can inject an in-memory mock:
 *     deps.db.insertInto(table: string, row: object) -> Promise<row>
 *     deps.db.select(table: string, where?: object)  -> Promise<row[]>
 *     deps.db.update(table: string, where: object, patch: object) -> Promise<row[]>
 *
 * deps.clock.now() -> number (Unix ms)
 *
 * Severity mapping (from criterion gap):
 *   gap = CLEARANCE_THRESHOLD (95) - criterion.score
 *   gap >= 30 -> 'P0'
 *   gap >= 20 -> 'P1'
 *   gap >= 10 -> 'P2'
 *   else      -> 'P3'
 * ---------------------------------------------------------------------------
 */

'use strict';

import { CLEARANCE_THRESHOLD, ScoreEvaluator } from '../governance/ScoreEvaluator.js';

const TABLE = 'defect';

function _severityForGap(gap) {
  if (gap >= 30) return 'P0';
  if (gap >= 20) return 'P1';
  if (gap >= 10) return 'P2';
  return 'P3';
}

function _subjectId(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

function _assertDeps(deps, fnName) {
  if (!deps || typeof deps !== 'object') {
    throw new Error(`defectDatabase.${fnName}: deps required`);
  }
  if (!deps.db || typeof deps.db !== 'object') {
    throw new Error(`defectDatabase.${fnName}: deps.db required`);
  }
}

export async function recordDefects(evaluation, deps) {
  _assertDeps(deps, 'recordDefects');
  if (!evaluation || typeof evaluation !== 'object') {
    throw new Error('defectDatabase.recordDefects: evaluation required');
  }
  if (typeof deps.db.insertInto !== 'function') {
    throw new Error('defectDatabase.recordDefects: deps.db.insertInto must be a function');
  }
  const clock = deps.clock ?? { now: () => Date.now() };
  const defects = ScoreEvaluator.toDefectRegister(evaluation);
  const inserted = [];
  for (const d of defects) {
    const gap = (d.gap !== undefined ? d.gap : (CLEARANCE_THRESHOLD - d.score));
    const row = {
      id: d.defectId,
      subject_id: _subjectId(d.targetType, d.targetId),
      severity: _severityForGap(gap),
      status: 'open',
      opened_at: new Date(clock.now()).toISOString(),
      resolved_at: null,
      resolution_note: null,
    };
    const result = await deps.db.insertInto(TABLE, row);
    inserted.push(result ?? row);
  }
  return inserted;
}

export async function listOpenDefects(targetType, targetId, deps) {
  _assertDeps(deps, 'listOpenDefects');
  if (typeof deps.db.select !== 'function') {
    throw new Error('defectDatabase.listOpenDefects: deps.db.select must be a function');
  }
  const rows = await deps.db.select(TABLE, {
    subject_id: _subjectId(targetType, targetId),
    status: 'open',
  });
  const list = Array.isArray(rows) ? rows.slice() : [];
  list.sort((a, b) => {
    const aTs = a?.opened_at ? Date.parse(a.opened_at) : 0;
    const bTs = b?.opened_at ? Date.parse(b.opened_at) : 0;
    return bTs - aTs; // newest first
  });
  return list;
}

export async function closeDefect(defectId, resolutionNote, deps) {
  _assertDeps(deps, 'closeDefect');
  if (typeof defectId !== 'string' || !defectId) {
    throw new Error('defectDatabase.closeDefect: defectId required');
  }
  if (typeof deps.db.update !== 'function') {
    throw new Error('defectDatabase.closeDefect: deps.db.update must be a function');
  }
  const clock = deps.clock ?? { now: () => Date.now() };
  return deps.db.update(TABLE, { id: defectId }, {
    status: 'resolved',
    resolved_at: new Date(clock.now()).toISOString(),
    resolution_note: typeof resolutionNote === 'string' ? resolutionNote : null,
  });
}

export { TABLE };
