/**
 * gov.audit_completeness — Audit log completeness + tamper-evidence chain.
 *
 * CEO dispositions applied:
 *   Flag 1 → A: this evaluator is the substrate; sequenced first.
 *   Flag 5 → A: ctx.auditChain.verifyRange() is MANDATORY. Hash-chain failure
 *               floors chain_valid_ratio to 0, which by itself caps the score
 *               at 80 (i.e. 100 - 20 weight contribution).
 *
 * Composite per Slot 2 (harder of two reviewer formulas):
 *   score = round(30·started_ratio + 25·terminal_ratio
 *               + 25·message_link_ratio + 20·chain_valid_ratio)
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'gov.audit_completeness';

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.baseAgentRuns?.query) return missingCtx(ID, 'baseAgentRuns');
  if (!ctx?.auditLog?.query)      return missingCtx(ID, 'auditLog');
  if (!ctx?.auditChain?.verifyRange) return missingCtx(ID, 'auditChain'); // Flag 5: non-negotiable

  const { fromTs, toTs } = ctxWindow(ctx);
  const agentId = target?.id;
  const where = { agentId, fromTs, toTs };

  const runs = await ctx.baseAgentRuns.query(where);
  const totalRuns = runs.length;
  if (totalRuns === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_RUN_EVIDENCE',
      notes: `No runs in window [${fromTs}, ${toTs}] for agent ${agentId}.`,
    });
  }

  const expectedRunIds = new Set(runs.map(r => r.run_id));
  const auditRows = await ctx.auditLog.query({ ...where });
  const auditRunIds = new Set(auditRows.map(r => r.run_id).filter(Boolean));
  const messageRunIds = ctx?.messageBus?.query
    ? new Set((await ctx.messageBus.query(where)).map(m => m.run_id).filter(Boolean))
    : new Set();

  const startedRunIds  = new Set(auditRows.filter(r => r.event_type === 'RUN_START' || r.event_type === 'run.start').map(r => r.run_id));
  const terminalRunIds = new Set(auditRows.filter(r =>
    r.event_type === 'RUN_COMPLETE' || r.event_type === 'RUN_FAILED'
    || r.event_type === 'run.end' || r.event_type === 'run.error'
  ).map(r => r.run_id));

  const startedRatio  = expectedRunIds.size === 0 ? 0
    : [...expectedRunIds].filter(id => startedRunIds.has(id)).length / expectedRunIds.size;
  const terminalRatio = expectedRunIds.size === 0 ? 0
    : [...expectedRunIds].filter(id => terminalRunIds.has(id)).length / expectedRunIds.size;
  const messageLinkRatio = expectedRunIds.size === 0 ? 0
    : [...expectedRunIds].filter(id => messageRunIds.has(id)).length / expectedRunIds.size;

  const chainResult = await ctx.auditChain.verifyRange({ fromTs, toTs });
  const chainValid = chainResult?.ok === true ? 1 : 0;
  const chainBreaks = Array.isArray(chainResult?.breaks) ? chainResult.breaks.length : 0;

  const score = 30 * startedRatio + 25 * terminalRatio + 25 * messageLinkRatio + 20 * chainValid;

  const findings = [];
  const missingTerminal = [...expectedRunIds].filter(id => !terminalRunIds.has(id));
  const missingFromAudit = [...expectedRunIds].filter(id => !auditRunIds.has(id));
  if (missingTerminal.length > 0) findings.push({ code: 'MISSING_TERMINAL_EVENT', detail: `${missingTerminal.length} run(s) without terminal event`, runIds: missingTerminal });
  if (missingFromAudit.length > 0) findings.push({ code: 'UNLINKED_MESSAGE', detail: `${missingFromAudit.length} run(s) missing from audit log` });
  if (chainBreaks > 0) findings.push({ code: 'AUDIT_CHAIN_INVALID', detail: `auditChain.verifyRange reported ${chainBreaks} break(s)`, breaks: chainResult.breaks });

  const evidence = [{
    kind: 'measured',
    criterion: ID,
    window: { fromTs, toTs },
    totals: { expected: expectedRunIds.size, audited: auditRunIds.size, messageLinked: messageRunIds.size },
    chain: { ok: chainResult?.ok === true, breaks: chainBreaks },
    ratios: { started: startedRatio, terminal: terminalRatio, messageLink: messageLinkRatio, chainValid },
  }];
  const notes = chainBreaks > 0
    ? `Hash-chain integrity FAILED (${chainBreaks} break(s)). Composite score: ${Math.round(score * 100) / 100}.`
    : `Composite score over ${expectedRunIds.size} expected run(s).`;

  return measuredResult({ id: ID, score, evidence, notes, findings });
}

export { ID };
