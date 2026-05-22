// src/lib/fixReview/seniorReview.js
//
// Senior-Engineer Fix Review — a deterministic heuristic scanner that
// answers, for any proposed fix, the eight questions a senior engineer
// unconsciously evaluates:
//
//   1. Will this break another feature?           (regression risk)
//   2. Is this the correct architectural layer?   (maintainability)
//   3. Does this match framework conventions?     (integration correctness)
//   4. Will this compile/build?                   (runtime integrity)
//   5. Is the state model affected?               (hidden side effects)
//   6. Does this alter security assumptions?      (vulnerability risk)
//   7. Will this deploy correctly?                (infrastructure compatibility)
//   8. Is this issue symptomatic not root-cause?  (false-fix risk)
//
// Each question is implemented by a pure-function check that takes the
// diff + repo context and returns:
//   { verdict: 'pass'|'warn'|'fail'|'unknown', evidence: [...], suggestion? }
//
// No AI. No heuristic GUESSING about the fix's intent. The checks
// produce signals from observable input (file paths, line patterns,
// import graph, package.json). A human still makes the call — the
// review surfaces what is worth looking at.

'use strict';

import { checkRegressionRisk }           from './checks/regressionRisk.js';
import { checkArchitecturalLayer }       from './checks/architecturalLayer.js';
import { checkFrameworkConventions }     from './checks/frameworkConventions.js';
import { checkRuntimeIntegrity }         from './checks/runtimeIntegrity.js';
import { checkStateModel }               from './checks/stateModel.js';
import { checkSecurityAssumptions }      from './checks/securityAssumptions.js';
import { checkDeploymentCompatibility }  from './checks/deploymentCompatibility.js';
import { checkRootCause }                from './checks/rootCause.js';

export const SENIOR_REVIEW_QUESTIONS = Object.freeze([
  Object.freeze({ id: 'regression_risk',          question: 'Will this break another feature?',          why: 'regression risk',          check: checkRegressionRisk }),
  Object.freeze({ id: 'architectural_layer',      question: 'Is this the correct architectural layer?',  why: 'maintainability',          check: checkArchitecturalLayer }),
  Object.freeze({ id: 'framework_conventions',    question: 'Does this match framework conventions?',    why: 'integration correctness',  check: checkFrameworkConventions }),
  Object.freeze({ id: 'runtime_integrity',        question: 'Will this compile/build?',                  why: 'runtime integrity',        check: checkRuntimeIntegrity }),
  Object.freeze({ id: 'state_model',              question: 'Is the state model affected?',              why: 'hidden side effects',      check: checkStateModel }),
  Object.freeze({ id: 'security_assumptions',     question: 'Does this alter security assumptions?',     why: 'vulnerability risk',       check: checkSecurityAssumptions }),
  Object.freeze({ id: 'deployment_compatibility', question: 'Will this deploy correctly?',               why: 'infrastructure compatibility', check: checkDeploymentCompatibility }),
  Object.freeze({ id: 'root_cause',               question: 'Is this issue symptomatic not root-cause?', why: 'false-fix risk',           check: checkRootCause }),
]);

const VERDICT_RANK = { fail: 3, warn: 2, unknown: 1, pass: 0 };

function rollupOverall(questions) {
  let worst = 'pass';
  for (const q of questions) {
    const v = q.verdict ?? 'unknown';
    if ((VERDICT_RANK[v] ?? 0) > (VERDICT_RANK[worst] ?? 0)) worst = v;
  }
  if (worst === 'fail') return 'red';
  if (worst === 'warn' || worst === 'unknown') return 'amber';
  return 'green';
}

/**
 * Run all eight senior-review checks against a diff + repo snapshot.
 *
 * @param {object} args
 * @param {object} args.diff           — parsed diff (see parseUnifiedDiff)
 * @param {object} [args.repoContext]  — { knownPackages?, repoFiles?, importGraph? }
 * @returns {{
 *   reviewedAt: string,
 *   diffSummary: { files: number, additions: number, deletions: number },
 *   questions: Array<{ id, question, why, verdict, evidence, suggestion? }>,
 *   overall: 'green'|'amber'|'red',
 * }}
 */
export function runSeniorReview({ diff, repoContext = {} } = {}) {
  const d = diff && typeof diff === 'object' ? diff : { files: [] };
  const files = Array.isArray(d.files) ? d.files : [];
  const diffSummary = {
    files: files.length,
    additions: files.reduce((n, f) => n + (f.additions ?? 0), 0),
    deletions: files.reduce((n, f) => n + (f.deletions ?? 0), 0),
  };
  const questions = [];
  for (const q of SENIOR_REVIEW_QUESTIONS) {
    let result;
    try {
      result = q.check({ diff: d, repoContext });
    } catch (e) {
      result = {
        verdict: 'unknown',
        evidence: [`check_threw:${(e?.message ?? String(e)).slice(0, 160)}`],
      };
    }
    questions.push(Object.freeze({
      id: q.id,
      question: q.question,
      why: q.why,
      verdict: result?.verdict ?? 'unknown',
      evidence: Array.isArray(result?.evidence) ? result.evidence : [],
      suggestion: result?.suggestion ?? null,
    }));
  }
  return Object.freeze({
    reviewedAt: new Date().toISOString(),
    diffSummary,
    questions,
    overall: rollupOverall(questions),
  });
}

/**
 * Parse a `git diff` unified output into the shape the checks expect.
 * Conservative: extracts file paths + per-file added/removed lines.
 * Robust to typical `git diff -U3` output.
 *
 * @param {string} unifiedDiff
 * @returns {{
 *   files: Array<{
 *     path: string,
 *     oldPath: string,
 *     status: 'added'|'deleted'|'modified'|'renamed',
 *     additions: number,
 *     deletions: number,
 *     addedLines: string[],
 *     removedLines: string[],
 *   }>
 * }}
 */
export function parseUnifiedDiff(unifiedDiff) {
  const files = [];
  if (typeof unifiedDiff !== 'string' || unifiedDiff.length === 0) return { files };
  const lines = unifiedDiff.split(/\r?\n/);
  let current = null;
  const flush = () => { if (current) files.push(Object.freeze(current)); current = null; };
  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i];
    if (ln.startsWith('diff --git ')) {
      flush();
      const m = ln.match(/^diff --git a\/(.+?) b\/(.+)$/);
      current = {
        path: m ? m[2] : 'unknown',
        oldPath: m ? m[1] : 'unknown',
        status: 'modified',
        additions: 0, deletions: 0,
        addedLines: [], removedLines: [],
      };
    } else if (current && (ln.startsWith('new file') || ln.startsWith('new mode'))) {
      current.status = 'added';
    } else if (current && ln.startsWith('deleted file')) {
      current.status = 'deleted';
    } else if (current && ln.startsWith('rename ')) {
      current.status = 'renamed';
    } else if (current && ln.startsWith('+') && !ln.startsWith('+++')) {
      current.additions += 1;
      if (current.addedLines.length < 5000) current.addedLines.push(ln.slice(1));
    } else if (current && ln.startsWith('-') && !ln.startsWith('---')) {
      current.deletions += 1;
      if (current.removedLines.length < 5000) current.removedLines.push(ln.slice(1));
    }
  }
  flush();
  return { files };
}

export { rollupOverall as __rollupOverall };
