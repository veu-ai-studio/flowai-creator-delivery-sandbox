/**
 * rdy.functional — Functional correctness.
 *
 * CEO disposition applied:
 *   Flag 7 → Hybrid: 20-run threshold in prod; 3-run threshold in dev. Env
 *               flag gates the choice via ctx.env.mode (default 'prod').
 *
 * Per required smoke scenario:
 *   1. Run reaches event_type=RUN_COMPLETE.
 *   2. No severity ∈ {critical, high} for that run_id.
 *   3. ≥1 message published on each declared output topic.
 *
 * score = round(100 · passing_scenarios / required_scenarios).
 * total_runs < min_window ⇒ null + INSUFFICIENT_RUNS.
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'rdy.functional';

const MIN_WINDOW_PROD = 20;
const MIN_WINDOW_DEV  = 3;

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.auditLog?.query) return missingCtx(ID, 'auditLog');
  if (!ctx?.registry?.getCharter) return missingCtx(ID, 'registry');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agentId = target?.id;
  const mode = ctx?.env?.mode === 'dev' ? 'dev' : 'prod';
  const minWindow = mode === 'dev' ? MIN_WINDOW_DEV : MIN_WINDOW_PROD;

  const rows = await ctx.auditLog.query({ agentId, fromTs, toTs });
  const terminals = rows.filter(r => r.event_type === 'RUN_COMPLETE' || r.event_type === 'RUN_FAILED');
  if (terminals.length === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_FUNCTIONAL_SCENARIOS',
      notes: `Agent ${agentId} produced no terminal RUN_COMPLETE / RUN_FAILED events.`,
    });
  }
  if (terminals.length < minWindow) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'INSUFFICIENT_RUNS',
      notes: `Only ${terminals.length} run(s) in window; ${mode}-mode threshold is ${minWindow}.`,
    });
  }

  const charter = await ctx.registry.getCharter(agentId);
  const requiredOutputs = new Set(charter?.produces_topics ?? charter?.produces ?? []);

  let passingScenarios = 0;
  const findings = [];
  for (const t of terminals) {
    if (t.event_type !== 'RUN_COMPLETE') {
      findings.push({ code: 'RUN_FAILED', runId: t.run_id });
      continue;
    }
    const runEvents = rows.filter(r => r.run_id === t.run_id);
    const hasHighSeverity = runEvents.some(r => r.severity === 'critical' || r.severity === 'high');
    if (hasHighSeverity) {
      findings.push({ code: 'HIGH_SEVERITY_IN_COMPLETED_RUN', runId: t.run_id });
      continue;
    }
    if (requiredOutputs.size > 0 && ctx?.messageBus?.query) {
      const outs = await ctx.messageBus.query({ producerAgentId: agentId, runId: t.run_id });
      const observed = new Set(outs.map(m => m.topic));
      const missing = [...requiredOutputs].filter(top => !observed.has(top));
      if (missing.length > 0) {
        findings.push({ code: 'MISSING_EXPECTED_OUTPUT_TOPIC', runId: t.run_id, missing });
        continue;
      }
    }
    passingScenarios++;
  }

  const score = (passingScenarios / terminals.length) * 100;
  return measuredResult({
    id: ID,
    score,
    evidence: [{ kind: 'measured', criterion: ID, window: { fromTs, toTs }, mode, minWindow, terminals: terminals.length, passingScenarios }],
    notes: `${passingScenarios}/${terminals.length} runs passed all functional checks (${mode} mode, min window ${minWindow}).`,
    findings,
  });
}

export { ID, MIN_WINDOW_PROD, MIN_WINDOW_DEV };
