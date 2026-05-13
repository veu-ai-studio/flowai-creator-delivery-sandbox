/**
 * auditOfAuditor — W3 independent meta-auditor for Agent #8.
 *
 * Routes through scoringEngine.run with auditOfAuditorMode=true, which in turn
 * routes through rubricRunner.applyRubric so null/deferred handling is
 * consistent with the primary path (CEO Flag 3 / 4 / 9 dispositions on
 * 2026-05-13).
 */

'use strict';

import * as scoringEngine from './scoringEngine.js';
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
  return scoringEngine.run({
    rubric,
    criterionEvaluators,
    target: AGENT_8_TARGET,
    deps,
    auditOfAuditorMode: true,
  });
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
