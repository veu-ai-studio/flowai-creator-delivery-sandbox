/**
 * rubricRunner — Loads rubric definitions and per-criterion evaluators.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/rubricRunner.js   (W3 territory)
 *
 * Versions supported:
 *   - governance.v1, readiness.v1            — primary rubrics
 *   - governance.meta.v1, readiness.meta.v1  — meta rubrics (auditor-of-auditor)
 *
 * loadRubric(version)     -> rubric object
 *   Reads JSON from disk; falls back to the canonical W2 rubrics for primary
 *   versions. Validates that every criterion has id + positive weight summing
 *   to 100.
 *
 * loadEvaluators(version) -> { [criterionId]: async (target, ctx) => result }
 *   Dynamically imports every file under src/lib/audits/criteria/<axis>/.
 *
 * applyRubric(rubric, evaluators, target, ctx) -> aggregate envelope
 *   Handles three evaluator outcomes per the 2026-05-13 CEO dispositions on
 *   the W3 stub replacement plan:
 *     - measured:   numeric score in [0, 100] (status='measured' implicit)
 *     - deferred:   score=null, status='deferred', reason='deferred-pending-*'
 *     - no_evidence: score=null, status='no_evidence' (data sources reachable
 *                    but window contained nothing to score; per Flag 4
 *                    disposition this is NOT a 100, NOT a 0)
 *   measured_score is the weighted average over `measured` only, normalised
 *   to the measured-weight denominator (Slot 2 formula). measurement_coverage
 *   reports the fraction of total rubric weight that was actually measured.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  GOVERNANCE_RUBRIC_V1,
  READINESS_RUBRIC_V1,
} from '../governance/ScoreEvaluator.js';

const CLEARANCE_THRESHOLD = 95;

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUBRICS_DIR  = resolve(__dirname, 'rubrics');
const CRITERIA_DIR = resolve(__dirname, 'criteria');

const _rubricFileMap = Object.freeze({
  'governance.v1':       ['governance.json',          'primary/governance-primary.json'],
  'readiness.v1':        ['readiness.json',           'primary/readiness-primary.json'],
  'governance.meta.v1':  ['meta/governance-meta.json'],
  'readiness.meta.v1':   ['meta/readiness-meta.json'],
});

function _axisFromVersion(version) {
  if (version === 'governance.v1' || version === 'governance.meta.v1') return 'governance';
  if (version === 'readiness.v1'  || version === 'readiness.meta.v1')  return 'readiness';
  throw new Error(`rubricRunner: cannot derive axis from version "${version}"`);
}

function _readJsonIfExists(absPath) {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, 'utf8'));
  } catch (err) {
    throw new Error(`rubricRunner: malformed JSON at ${absPath}: ${err?.message ?? err}`);
  }
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

export function loadRubric(version) {
  if (typeof version !== 'string' || !version) {
    throw new Error('rubricRunner.loadRubric: version (string) required');
  }
  const candidates = _rubricFileMap[version];
  if (candidates) {
    for (const rel of candidates) {
      const fromDisk = _readJsonIfExists(resolve(RUBRICS_DIR, rel));
      if (fromDisk) {
        _validateRubricShape(fromDisk, version);
        return Object.freeze(fromDisk);
      }
    }
  }
  if (version === 'governance.v1' || version === 'governance.meta.v1') return GOVERNANCE_RUBRIC_V1;
  if (version === 'readiness.v1'  || version === 'readiness.meta.v1')  return READINESS_RUBRIC_V1;
  throw new Error(`rubricRunner.loadRubric: unknown rubric version "${version}"`);
}

export async function loadEvaluators(version) {
  const axis = _axisFromVersion(version);
  const dir  = resolve(CRITERIA_DIR, axis);
  if (!existsSync(dir)) {
    throw new Error(`rubricRunner.loadEvaluators: criterion dir missing for axis "${axis}" (expected ${dir})`);
  }
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  const map = {};
  for (const file of files) {
    const abs = resolve(dir, file);
    const mod = await import(pathToFileURL(abs).href);
    const id = mod.ID;
    const fn = mod.default;
    if (typeof id !== 'string' || !id) {
      throw new Error(`rubricRunner.loadEvaluators: ${file} must export named "ID"`);
    }
    if (typeof fn !== 'function') {
      throw new Error(`rubricRunner.loadEvaluators: ${file} must export a default async function`);
    }
    map[id] = fn;
  }
  return map;
}

function _classify(result) {
  if (!result || typeof result !== 'object') return 'invalid';
  if (typeof result.score === 'number' && Number.isFinite(result.score)) {
    if (result.score < 0 || result.score > 100) return 'invalid';
    return 'measured';
  }
  if (result.score === null && result.status === 'deferred') return 'deferred';
  if (result.score === null) return 'no_evidence';
  return 'invalid';
}

export async function applyRubric(rubric, evaluators, target, ctx = {}) {
  _validateRubricShape(rubric, rubric?.version ?? '<unknown>');
  if (!evaluators || typeof evaluators !== 'object') {
    throw new Error('rubricRunner.applyRubric: evaluators map required');
  }

  const measured   = [];
  const deferred   = [];
  const noEvidence = [];
  const invalid    = [];

  let measuredWeight = 0;
  const totalWeight  = 100; // validated above

  for (const c of rubric.criteria) {
    const fn = evaluators[c.id];
    if (typeof fn !== 'function') {
      throw new Error(`rubricRunner.applyRubric: missing evaluator for "${c.id}"`);
    }
    const result = await fn(target, ctx);
    const kind = _classify(result);
    if (kind === 'measured') {
      measured.push(result);
      measuredWeight += c.weight;
    } else if (kind === 'deferred') {
      deferred.push(result);
    } else if (kind === 'no_evidence') {
      noEvidence.push(result);
    } else {
      invalid.push({ id: c.id, result });
    }
  }

  if (invalid.length > 0) {
    const ids = invalid.map(i => i.id).join(', ');
    throw new Error(`rubricRunner.applyRubric: invalid evaluator results for: ${ids}`);
  }

  let measuredScore = 0;
  if (measuredWeight > 0) {
    const weighted = measured.reduce((sum, r) => {
      const w = rubric.criteria.find(c => c.id === r.id).weight;
      return sum + r.score * w;
    }, 0);
    measuredScore = weighted / measuredWeight;
  }
  const rounded = Math.round(measuredScore * 100) / 100;
  const coverage = measuredWeight / totalWeight;
  const coverageRounded = Math.round(coverage * 1000) / 1000;

  // criteriaResults retains backwards-compat shape — measured first, then
  // deferred, then no_evidence, in original criterion order grouping.
  const criteriaResults = Object.freeze([...measured, ...deferred, ...noEvidence]);

  return Object.freeze({
    rubricVersion: rubric.version,
    criteriaResults,
    measured: Object.freeze(measured),
    deferred: Object.freeze(deferred),
    noEvidence: Object.freeze(noEvidence),
    score: rounded,
    measuredWeight,
    totalWeight,
    measurementCoverage: coverageRounded,
    passes: measuredWeight > 0 && rounded >= CLEARANCE_THRESHOLD,
    threshold: CLEARANCE_THRESHOLD,
    failures: Object.freeze(measured.filter(r => r.score < CLEARANCE_THRESHOLD)),
  });
}

export { CLEARANCE_THRESHOLD };
