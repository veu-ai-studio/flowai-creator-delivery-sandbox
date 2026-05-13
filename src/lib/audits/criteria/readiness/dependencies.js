/**
 * rdy.dependencies — Dependencies declared and healthy.
 *
 * Composite (Slot 2):
 *   score = round(40·topic_resolution + 40·declared_dependency_quality
 *                + 20·observed_call_declaration)
 *
 * Undeclared observed call caps the agent at 50. Agent with no dependencies
 * MUST declare `dependencies: []` explicitly; absence is incomplete metadata.
 */

'use strict';

import { measuredResult, noEvidenceResult, missingCtx, ctxWindow } from '../_helpers.js';

const ID = 'rdy.dependencies';

const DEP_REQUIRED_FIELDS = Object.freeze(['name', 'type', 'owner', 'version_or_range', 'required', 'fallback']);

function _depQuality(dep) {
  let present = 0;
  for (const f of DEP_REQUIRED_FIELDS) {
    if (dep?.[f] !== undefined && dep?.[f] !== null && dep?.[f] !== '') present++;
  }
  return present / DEP_REQUIRED_FIELDS.length;
}

export default async function evaluate(target, ctx = {}) {
  if (!ctx?.registry?.getCharter) return missingCtx(ID, 'registry');

  const { fromTs, toTs } = ctxWindow(ctx);
  const agentId = target?.id;
  const charter = await ctx.registry.getCharter(agentId);
  if (!charter) {
    return noEvidenceResult({
      id: ID,
      reasonCode: 'NO_CHARTER',
      notes: `registry.getCharter(${agentId}) returned no charter.`,
    });
  }

  const consumesTopics = Array.isArray(charter.consumes_topics ?? charter.consumes)
    ? (charter.consumes_topics ?? charter.consumes)
    : null;
  const declaredDeps = Array.isArray(charter.dependencies) ? charter.dependencies : null;
  const findings = [];

  // 1. topic resolution
  let topicResolution = 1.0;
  if (consumesTopics && consumesTopics.length > 0 && ctx?.messageBus?.listTopics) {
    const liveTopics = new Set(await ctx.messageBus.listTopics());
    const externalSources = new Set((charter.external_sources ?? []).map(s => s.topic));
    let resolved = 0;
    for (const t of consumesTopics) {
      if (liveTopics.has(t) || externalSources.has(t)) resolved++;
      else findings.push({ code: 'UNRESOLVED_TOPIC_DEPENDENCY', topic: t });
    }
    topicResolution = consumesTopics.length === 0 ? 1.0 : resolved / consumesTopics.length;
  }

  // 2. declaration quality
  let declarationQuality = 1.0;
  if (declaredDeps === null) {
    declarationQuality = 0;
    findings.push({ code: 'DEPENDENCIES_NOT_DECLARED', detail: 'charter must explicitly declare dependencies: [] even if empty' });
  } else if (declaredDeps.length === 0) {
    declarationQuality = 1.0;
  } else {
    declarationQuality = declaredDeps.reduce((s, d) => s + _depQuality(d), 0) / declaredDeps.length;
    for (const d of declaredDeps) {
      const q = _depQuality(d);
      if (q < 1) findings.push({ code: 'DEPENDENCY_INCOMPLETE', dependency: d.name ?? '<unnamed>', quality: q });
    }
  }

  // 3. observed-call declaration
  let observedCallDeclaration = 1.0;
  let undeclaredCallObserved = false;
  if (ctx?.auditLog?.query && declaredDeps) {
    const observed = await ctx.auditLog.query({ agentId, fromTs, toTs, eventType: 'dependency.call' });
    if (observed.length > 0) {
      const declaredNames = new Set(declaredDeps.map(d => d.name).filter(Boolean));
      let declared = 0;
      for (const call of observed) {
        const targetName = call.payload?.target ?? call.target ?? null;
        if (targetName && declaredNames.has(targetName)) {
          declared++;
        } else {
          undeclaredCallObserved = true;
          findings.push({ code: 'UNDECLARED_DEPENDENCY_CALL', call: targetName ?? '<unknown>' });
        }
      }
      observedCallDeclaration = declared / observed.length;
    }
  }

  let score = 40 * topicResolution + 40 * declarationQuality + 20 * observedCallDeclaration;
  if (undeclaredCallObserved && score > 50) score = 50;

  return measuredResult({
    id: ID,
    score,
    evidence: [{
      kind: 'measured',
      criterion: ID,
      window: { fromTs, toTs },
      ratios: { topicResolution, declarationQuality, observedCallDeclaration },
      caps: { undeclaredCallObserved },
    }],
    notes: undeclaredCallObserved
      ? `Undeclared dependency call observed; subscore capped at 50.`
      : `topicResolution=${topicResolution.toFixed(2)}, declarationQuality=${declarationQuality.toFixed(2)}, observedCallDeclaration=${observedCallDeclaration.toFixed(2)}.`,
    findings,
  });
}

export { ID };
