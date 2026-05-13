/**
 * rdy.documentation — Documentation present and accurate.
 *
 * CEO disposition applied:
 *   Flag 6 → A: 11-field required set with partial credit. Placeholders
 *               "TODO", "TBD", "N/A", "", < 10 chars all count as missing.
 *
 * For each active agent, doc_points = present_required_fields / total_required.
 * score = round(100 · avg(doc_points across active agents)).
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'rdy.documentation';

const REQUIRED_DOC_FIELDS = Object.freeze([
  'owner', 'purpose', 'readme_url', 'runbook_url', 'inputs', 'outputs',
  'configuration', 'examples', 'known_limits', 'changelog', 'support_contact',
]);

const PLACEHOLDERS = Object.freeze(new Set(['TODO', 'TBD', 'N/A', 'n/a', 'tbd', 'todo']));

function _present(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  const s = String(value).trim();
  if (s.length < 10) return false;
  if (PLACEHOLDERS.has(s)) return false;
  return true;
}

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.registry?.getActiveAgents) return missingCtx(ID, 'registry');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agents = await ctx.registry.getActiveAgents();
  if (!Array.isArray(agents) || agents.length === 0) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_DOCUMENTATION_SUBJECTS',
      notes: 'registry.getActiveAgents() returned no active agents.',
    });
  }

  const perAgent = [];
  const findings = [];
  for (const a of agents) {
    const charter = await (ctx?.registry?.getCharter ? ctx.registry.getCharter(a.agent_id ?? a.id) : Promise.resolve(a));
    const c = charter ?? a;
    let present = 0;
    const missingFields = [];
    for (const f of REQUIRED_DOC_FIELDS) {
      if (_present(c?.[f])) present++; else missingFields.push(f);
    }
    perAgent.push({ agent: a.agent_id ?? a.id, present, total: REQUIRED_DOC_FIELDS.length });
    if (missingFields.length > 0) {
      findings.push({ code: 'DOC_FIELD_MISSING', agent: a.agent_id ?? a.id, missing: missingFields });
    }
  }

  const avg = perAgent.reduce((s, x) => s + x.present / x.total, 0) / perAgent.length;
  const score = avg * 100;

  return measuredResult({
    id: ID,
    score,
    evidence: [{ kind: 'measured', criterion: ID, window: { fromTs, toTs }, agents: agents.length, perAgent }],
    notes: `Average doc completeness across ${agents.length} agent(s) = ${(avg * 100).toFixed(2)}%.`,
    findings,
  });
}

export { ID, REQUIRED_DOC_FIELDS };
