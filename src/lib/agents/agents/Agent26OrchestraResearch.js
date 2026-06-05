'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

const INPUT_KIND = 'orchestra.research.request';
const TOPICS = Object.freeze({
  candidate: '26.orchestra.candidate.v1',
  admitted: '26.orchestra.admitted.v1',
  rejected: '26.orchestra.candidate_rejected.v1',
  panelGate: '26.orchestra.candidate_panel_gate.v1',
  deprecated: '26.orchestra.deprecated.v1',
  lifecycle: '26.orchestra.lifecycle_state_changed.v1',
  reactivated: '26.orchestra.candidate_reactivated.v1',
});

export class Agent26OrchestraResearch extends BaseAgent {
  static charterId = 26;

  static charter() {
    const r = getAgent(26);
    if (!r) throw new Error('Agent26OrchestraResearch: registry entry for id=26 missing');
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false,
      authority: [...r.authority],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: ['anthropic-api', 'browserless', 'playwright'],
      consumes: [...r.consumes],
      produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    };
  }

  async plan(ctx = {}) {
    const input = ctx.input ?? {};
    if (input.kind !== INPUT_KIND) {
      throw new Error(`Agent26OrchestraResearch.plan: input.kind must be '${INPUT_KIND}'`);
    }

    const candidate = normalizeCandidate(input);
    const gate = evaluateGate(candidate);
    const action = selectAction(input, gate);
    const topic = topicForAction(action);
    const payload = payloadForAction({
      action,
      candidate,
      gate,
      runId: input.runId ?? ctx.runId ?? null,
      at: input.at ?? new Date(this.deps.clock.now()).toISOString(),
    });

    return Object.freeze({
      summary: `Orchestra Research ${action} for ${candidate.name} (${gate.rankScore}/100)`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: action,
      confidence: gate.confidence,
      gate: Object.freeze(gate),
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({ topic, payload: Object.freeze(payload) }),
        ]),
      }),
    });
  }

  async act(_ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error('Agent26OrchestraResearch.act: invalid plan');
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent26OrchestraResearch.act: sideEffects are forbidden in recommendation path');
    }

    const published = [];
    const publishEnvelopes = [];
    for (const event of plan.proposed.emit) {
      if (!this.charter.produces.includes(event.topic)) {
        throw new Error(`Agent26OrchestraResearch.act: topic '${event.topic}' is not in charter.produces`);
      }
      const envelope = Object.freeze({
        topic: event.topic,
        payload: event.payload,
        from: Object.freeze({
          agentId: this.charter.id,
          productScope: this.deps.productScope,
          environment: this.deps.environment,
        }),
        at: this.deps.clock.now(),
      });
      publishEnvelopes.push(envelope);
      if (typeof this.deps.messageBus?.publish === 'function') {
        this.deps.messageBus.publish(event.topic, event.payload);
        published.push(event.topic);
      }
    }

    return Object.freeze({
      outcome: plan.outcome,
      sideEffects: [],
      published: Object.freeze(published),
      publishEnvelopes: Object.freeze(publishEnvelopes),
      gate: plan.gate,
    });
  }

  async recommend(ctx = {}) {
    try {
      const plan = await this.plan({
        input: {
          kind: INPUT_KIND,
          runId: ctx.runId ?? null,
          candidate: ctx.candidate ?? ctx,
          action: ctx.action ?? 'candidate',
        },
        runId: ctx.runId ?? null,
      });
      return Object.freeze({
        agent_id: this.charter.id,
        recommendation: plan.summary,
        confidence: plan.confidence,
        metadata: Object.freeze({
          ok: true,
          outcome: plan.outcome,
          runId: ctx.runId ?? null,
          gate: plan.gate,
          emit: plan.proposed.emit.map((e) => e.topic),
          sideEffects: [],
        }),
      });
    } catch (e) {
      return Object.freeze({
        agent_id: this.charter.id,
        recommendation: `Orchestra Research recommendation failed: ${e?.message ?? e}`,
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: String(e?.message ?? e),
          runId: ctx.runId ?? null,
          sideEffects: [],
        }),
      });
    }
  }
}

function normalizeCandidate(input) {
  const raw = input.candidate && typeof input.candidate === 'object'
    ? input.candidate
    : input;
  const id = text(raw.candidate_id ?? raw.candidateId ?? raw.id) || 'unknown-candidate';
  const name = text(raw.candidate_name ?? raw.candidateName ?? raw.name) || id;
  const capabilities = Array.isArray(raw.capabilities) ? raw.capabilities.map(String) : [];
  const performanceScore = score(raw.performance_score ?? raw.performanceScore ?? raw.performance_score_estimate);
  const priceTier = score(raw.price_tier ?? raw.priceTier ?? raw.price_tier_estimate);
  const invocationCount = Number.isFinite(Number(raw.invocationCount ?? raw.invocations))
    ? Number(raw.invocationCount ?? raw.invocations)
    : 0;
  const source = text(raw.source) || 'operator_supplied';
  const evidenceUrl = text(raw.evidence_url ?? raw.evidenceUrl) || null;
  const risk = text(raw.risk ?? raw.riskClass ?? raw.exposure) || 'normal';
  return Object.freeze({
    id,
    name,
    source,
    evidenceUrl,
    performanceScore,
    priceTier,
    invocationCount,
    capabilities,
    risk,
    priorState: text(raw.prior_state ?? raw.priorState) || null,
    memberId: text(raw.member_id ?? raw.memberId) || id,
  });
}

function evaluateGate(candidate) {
  const performance = candidate.performanceScore ?? 0;
  const affordability = candidate.priceTier === null ? 50 : 100 - candidate.priceTier;
  const invocationScore = Math.min(100, candidate.invocationCount * 10);
  const capabilityScore = Math.min(100, candidate.capabilities.length * 20);
  const rankScore = Math.max(0, Math.min(100, Math.round(
    performance * 0.45 + affordability * 0.25 + invocationScore * 0.15 + capabilityScore * 0.15,
  )));
  const hasEvidence = !!candidate.evidenceUrl;
  const sufficientInvocations = candidate.invocationCount >= 4;
  const securityCarveout = /security|legal|regulatory|privacy/i.test(candidate.risk);
  const thresholdMet = rankScore >= 75 && hasEvidence && sufficientInvocations && !securityCarveout;
  const confidence = Math.max(0.2, Math.min(0.95, Number((rankScore / 100).toFixed(2))));
  return Object.freeze({
    rankScore,
    thresholdMet,
    hasEvidence,
    sufficientInvocations,
    securityCarveout,
    confidence,
    reasons: Object.freeze([
      hasEvidence ? 'evidence_present' : 'evidence_missing',
      sufficientInvocations ? 'invocation_floor_met' : 'invocation_floor_missing',
      securityCarveout ? 'panel_carveout_required' : 'no_panel_carveout',
      thresholdMet ? 'auto_threshold_met' : 'auto_threshold_not_met',
    ]),
  });
}

function selectAction(input, gate) {
  const requested = text(input.action);
  if (requested === 'deprecated') return 'deprecated';
  if (requested === 'reactivated') return 'reactivated';
  if (requested === 'lifecycle') return 'lifecycle';
  if (requested === 'admitted' && gate.thresholdMet) return 'admitted';
  if (gate.securityCarveout) return 'panel_gate';
  if (requested === 'rejected' || (requested === 'admitted' && !gate.thresholdMet)) return 'rejected';
  return requested || 'candidate';
}

function topicForAction(action) {
  if (action === 'admitted') return TOPICS.admitted;
  if (action === 'rejected') return TOPICS.rejected;
  if (action === 'panel_gate') return TOPICS.panelGate;
  if (action === 'deprecated') return TOPICS.deprecated;
  if (action === 'lifecycle') return TOPICS.lifecycle;
  if (action === 'reactivated') return TOPICS.reactivated;
  return TOPICS.candidate;
}

function payloadForAction({ action, candidate, gate, runId, at }) {
  const base = {
    runId,
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    rank_score: gate.rankScore,
    capabilities: candidate.capabilities,
    at,
    basis: gate.reasons,
    advisoryOnly: true,
  };
  if (action === 'admitted') {
    return { ...base, performance_score: candidate.performanceScore, price_tier: candidate.priceTier, admitted_at: at };
  }
  if (action === 'rejected') {
    return { ...base, threshold: 75, reason: gate.reasons.find((r) => r.endsWith('_missing')) ?? 'below_threshold' };
  }
  if (action === 'panel_gate') {
    return { ...base, reason: 'security_legal_or_regulatory_carveout', panel_consultation_id: null };
  }
  if (action === 'deprecated') {
    return { member_id: candidate.memberId, basis: gate.reasons, deprecated_at: at, grace_period_days: 30, advisoryOnly: true };
  }
  if (action === 'lifecycle') {
    return { member_id: candidate.memberId, from_state: 'trial', to_state: 'archived', basis: gate.reasons, at, advisoryOnly: true };
  }
  if (action === 'reactivated') {
    return { ...base, prior_state: candidate.priorState ?? 'archived', reactivated_at: at };
  }
  return {
    ...base,
    source: candidate.source,
    evidence_url: candidate.evidenceUrl,
    performance_score_estimate: candidate.performanceScore,
    price_tier_estimate: candidate.priceTier,
  };
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function score(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export const __internals = Object.freeze({
  INPUT_KIND,
  TOPICS,
  normalizeCandidate,
  evaluateGate,
});
