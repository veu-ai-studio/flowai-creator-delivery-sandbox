/**
 * auditOfAuditor — W3 independent meta-auditor for Agent #8.
 * ---------------------------------------------------------------------------
 * Owner:       /src/lib/audits/auditOfAuditor.js     (W3 territory)
 * Consumes:    /src/lib/governance/ScoreEvaluator.js (W2, read-only)
 *              /src/lib/audits/rubricRunner.js       (W3)
 *              /src/lib/audits/disagreementProtocol.js (W3)
 *
 * Per W0 ruling D-010 / X-002:
 *   - Agent #8 (Quality Audit) cannot be audited by the primary scoring
 *     engine. ScoreEvaluator refuses primary-mode evaluation of Agent #8
 *     at lines 173–182.
 *   - The auditor-of-auditor is W3 territory. It runs ScoreEvaluator with
 *     auditOfAuditorMode: true and uses the meta rubrics from
 *     src/lib/audits/rubrics/meta/.
 *
 * auditAgent8(deps)
 *   - Hardcoded target { type: 'agent', id: 8 }.
 *   - Loads governance.meta.v1 + readiness.meta.v1 rubrics via rubricRunner.
 *   - Constructs ScoreEvaluator with auditOfAuditorMode: true (bypasses the
 *     #8 self-audit guard).
 *   - Returns { governance, readiness } evaluations.
 *
 * auditAnyAgentInMetaMode(deps, agentId)
 *   - Explicit guard: throws if agentId !== 8. Exposed for tests so the
 *     "refuses non-#8" contract is verifiable from outside.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { ScoreEvaluator } from '../governance/ScoreEvaluator.js';
import { loadRubric, loadEvaluators } from './rubricRunner.js';

const AGENT_8_TARGET = Object.freeze({ type: 'agent', id: 8 });

function _defaultDeps() {
  return {
    logger: typeof console !== 'undefined' ? console : { info() {}, warn() {}, error() {} },
    clock: { now: () => Date.now() },
    messageBus: { publish: async () => {} },
  };
}

async function _runMeta(rubricVersion, deps) {
  const rubric = loadRubric(rubricVersion);
  const criterionEvaluators = await loadEvaluators(rubricVersion);
  const evaluator = new ScoreEvaluator({
    rubric,
    criterionEvaluators,
    deps,
    auditOfAuditorMode: true,
  });
  return evaluator.evaluate(AGENT_8_TARGET);
}

export async function auditAgent8(deps = {}) {
  const resolved = { ..._defaultDeps(), ...deps };
  const governance = await _runMeta('governance.meta.v1', resolved);
  const readiness  = await _runMeta('readiness.meta.v1',  resolved);
  return Object.freeze({ governance, readiness });
}

export async function auditAnyAgentInMetaMode(deps = {}, agentId) {
  if (agentId !== 8) {
    throw new Error(
      `auditOfAuditor: meta auditor only targets Agent #8; refused agentId=${agentId}`
    );
  }
  return auditAgent8(deps);
}

export { AGENT_8_TARGET };
