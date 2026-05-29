/**
 * gov.charter_contract — Charter contract honored.
 *
 * Composite formula:
 *   field_completeness = (agents w/ all required fields AND ledger hash match) / active_agents
 *   topic_alignment    = max(0, 100 - 20·(ghost_topics + undeclared_topics))   // ≥5 ⇒ 0
 *   score = round(0.6 · 100 · field_completeness + 0.4 · topic_alignment)
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'gov.charter_contract';

const REQUIRED_CHARTER_FIELDS = Object.freeze([
  'agent_id', 'owner', 'purpose', 'authority_tier', 'mode',
  'consumes_topics', 'produces_topics', 'escalation_policy',
  'contract_hash', 'charter_version',
]);

function _hasField(charter, field) {
  const v = charter?.[field];
  if (Array.isArray(v)) return true;
  return v !== undefined && v !== null && (typeof v !== 'string' || v.trim().length > 0);
}

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.registry?.getActiveAgents) return missingCtx(ID, 'registry');
  if (!ctx?.auditLog?.query)           return missingCtx(ID, 'auditLog');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agents = await ctx.registry.getActiveAgents();
  if (!Array.isArray(agents) || agents.length === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_ACTIVE_AGENT_CHARTERS',
      notes: 'registry.getActiveAgents() returned no active agents.',
    });
  }

  let validFieldAgents = 0;
  const fieldFindings = [];
  for (const a of agents) {
    const missing = REQUIRED_CHARTER_FIELDS.filter(f => !_hasField(a, f));
    const charterEvents = await ctx.auditLog.query({ agentId: a.agent_id, eventType: 'charter.registered', limit: 1, orderBy: 'desc' });
    const latestHash = charterEvents?.[0]?.payload?.contract_hash;
    const hashMatch = latestHash != null && latestHash === a.contract_hash;
    if (missing.length === 0 && hashMatch) {
      validFieldAgents++;
    } else {
      if (missing.length > 0) fieldFindings.push({ code: 'MISSING_REQUIRED_FIELD', agent: a.agent_id, missing });
      if (!hashMatch && missing.length === 0) fieldFindings.push({ code: 'CHARTER_HASH_MISMATCH', agent: a.agent_id, registry: a.contract_hash, ledger: latestHash ?? null });
    }
  }

  const liveTopics = ctx?.messageBus?.listTopics ? new Set(await ctx.messageBus.listTopics()) : null;
  let ghostTopics = 0;
  let undeclaredTopics = 0;
  const topicFindings = [];
  if (liveTopics) {
    for (const a of agents) {
      const declared = new Set([...(a.consumes_topics ?? []), ...(a.produces_topics ?? [])]);
      const observed = ctx?.messageBus?.query
        ? new Set((await ctx.messageBus.query({ producerAgentId: a.agent_id, fromTs, toTs })).map(m => m.topic))
        : new Set();
      for (const t of declared) if (!liveTopics.has(t)) { ghostTopics++; topicFindings.push({ code: 'GHOST_TOPIC', agent: a.agent_id, topic: t }); }
      for (const t of observed) if (!declared.has(t)) { undeclaredTopics++; topicFindings.push({ code: 'UNDECLARED_TOPIC', agent: a.agent_id, topic: t }); }
    }
  }

  const fieldCompleteness = validFieldAgents / agents.length;
  const totalTopicViolations = ghostTopics + undeclaredTopics;
  const topicAlignment = totalTopicViolations >= 5 ? 0 : Math.max(0, 100 - 20 * totalTopicViolations);
  const score = 0.6 * 100 * fieldCompleteness + 0.4 * topicAlignment;

  return measuredResult({
    id: ID,
    score,
    evidence: [{ kind: 'measured', criterion: ID, window: { fromTs, toTs }, agents: agents.length, validFieldAgents, ghostTopics, undeclaredTopics }],
    notes: `${validFieldAgents}/${agents.length} agents pass field+hash; ${totalTopicViolations} topic violations.`,
    findings: [...fieldFindings, ...topicFindings],
  });
}

export { ID, REQUIRED_CHARTER_FIELDS };
