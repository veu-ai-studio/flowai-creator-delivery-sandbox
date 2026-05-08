/**
 * rubricRunner — Loads rubric definitions and applies them to a subject.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/rubricRunner.js   (W3 territory)
 *
 * loadRubric(version)     -> rubric object
 *   Tries src/lib/audits/rubrics/<version>.json first, then meta/<version>.json,
 *   then falls back to the canonical W2 rubrics from ScoreEvaluator.js.
 *
 * loadEvaluators(version) -> { [criterionId]: async (target, ctx) => result }
 *   Returns stub evaluators that produce score=100 with placeholder evidence.
 *   W3 follow-up replaces each stub with a real per-criterion evaluator.
 *
 * applyRubric(rubric, evaluators, target, ctx) -> { criteriaResults, score, passes }
 *   Pure function for test harnesses. The wire-up to ScoreEvaluator lives in
 *   scoringEngine.js — this helper is for tests and ad-hoc inspection.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
} from '../governance/ScoreEvaluator.js';

const CLEARANCE_THRESHOLD = 95;

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUBRICS_DIR = resolve(__dirname, 'rubrics');

const _rubricFileMap = Object.freeze({
  'governance.v1': 'governance.json',
  'readiness.v1':  'readiness.json',
  'governance.meta.v1': 'meta/governance-meta.json',
  'readiness.meta.v1':  'meta/readiness-meta.json',
});

function _readJsonIfExists(absPath) {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, 'utf8'));
  } catch (err) {
    throw new Error(`rubricRunner: malformed JSON at ${absPath}: ${err?.message ?? err}`);
  }
}

export function loadRubric(version) {
  if (typeof version !== 'string' || !version) {
    throw new Error('rubricRunner.loadRubric: version (string) required');
  }
  const fileRel = _rubricFileMap[version];
  if (fileRel) {
    const fromDisk = _readJsonIfExists(resolve(RUBRICS_DIR, fileRel));
    if (fromDisk) {
      _validateRubricShape(fromDisk, version);
      return Object.freeze(fromDisk);
    }
  }
  if (version === 'governance.v1' || version === 'governance.meta.v1') return GOVERNANCE_RUBRIC_V1;
  if (version === 'readiness.v1'  || version === 'readiness.meta.v1')  return READINESS_RUBRIC_V1;
  throw new Error(`rubricRunner.loadRubric: unknown rubric version "${version}"`);
}

function _validateRubricShape(rubric, version) {
  if (!rubric || typeof rubric !== 'object') {
    throw new Error(`rubricRunner: rubric "${version}" must be an object`);
  }
  if (typeof rubric.version !== 'string') {
    throw new Error(`rubricRunner: rubric "${version}" missing string field "version"`);
  }
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    throw new Error(`rubricRunner: rubric "${version}" missing non-empty criteria[]`);
  }
  let total = 0;
  for (const c of rubric.criteria) {
    if (typeof c.id !== 'string' || !c.id) {
      throw new Error(`rubricRunner: rubric "${version}" has criterion missing id`);
    }
    if (typeof c.weight !== 'number' || !Number.isFinite(c.weight) || c.weight <= 0) {
      throw new Error(`rubricRunner: rubric "${version}" criterion "${c.id}" missing positive weight`);
    }
    total += c.weight;
  }
  if (total !== 100) {
    throw new Error(`rubricRunner: rubric "${version}" weights sum to ${total}, expected 100`);
  }
}

export function loadEvaluators(version) {
  const rubric = loadRubric(version);
  const map = {};
  for (const c of rubric.criteria) {
    map[c.id] = _stubEvaluator(c.id, version);
  }
  return map;
}

function _stubEvaluator(criterionId, version) {
  return async (target /* , ctx */) => ({
    id: criterionId,
    score: 100,
    evidence: [{
      kind: 'stub_evaluator',
      criterion: criterionId,
      rubricVersion: version,
      target: { type: target?.type ?? 'unknown', id: String(target?.id ?? '') },
    }],
    notes: `Stub evaluator for "${criterionId}" (rubric ${version}).`,
  });
}

export async function applyRubric(rubric, evaluators, target, ctx = {}) {
  _validateRubricShape(rubric, rubric?.version ?? '<unknown>');
  if (!evaluators || typeof evaluators !== 'object') {
    throw new Error('rubricRunner.applyRubric: evaluators map required');
  }
  const criteriaResults = [];
  for (const c of rubric.criteria) {
    const fn = evaluators[c.id];
    if (typeof fn !== 'function') {
      throw new Error(`rubricRunner.applyRubric: missing evaluator for "${c.id}"`);
    }
    criteriaResults.push(await fn(target, ctx));
  }
  const score = criteriaResults.reduce((sum, r) => {
    const weight = rubric.criteria.find(c => c.id === r.id).weight;
    return sum + (r.score * weight) / 100;
  }, 0);
  const rounded = Math.round(score * 100) / 100;
  return Object.freeze({
    rubricVersion: rubric.version,
    criteriaResults: Object.freeze(criteriaResults),
    score: rounded,
    passes: rounded >= CLEARANCE_THRESHOLD,
    threshold: CLEARANCE_THRESHOLD,
  });
}

export { CLEARANCE_THRESHOLD };
