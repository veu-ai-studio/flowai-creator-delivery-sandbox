/**
 * Shared recommend-only base for P11-B advisory/governance agents.
 */

'use strict';

import { BaseAgent } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

export class AdvisoryAgentBase extends BaseAgent {
  constructor(deps, config) {
    super(deps);
    if (!config || typeof config !== 'object') {
      throw new Error(`${this.constructor.name}: config required`);
    }
    if (!Number.isInteger(config.id)) {
      throw new Error(`${this.constructor.name}: numeric config.id required`);
    }
    if (typeof config.inputKind !== 'string' || !config.inputKind) {
      throw new Error(`${this.constructor.name}: config.inputKind required`);
    }
    if (!Array.isArray(config.rules) || config.rules.length < 3) {
      throw new Error(`${this.constructor.name}: at least three advisory rules required`);
    }
    this.advisoryConfig = Object.freeze({
      inputKind: config.inputKind,
      rules: Object.freeze([...config.rules]),
      selectTopic: config.selectTopic,
      buildPayload: config.buildPayload,
    });
  }

  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== this.advisoryConfig.inputKind) {
      throw new Error(`${this.constructor.name}.plan: input.kind must be '${this.advisoryConfig.inputKind}'`);
    }
    const runId = requireRunId(input.runId ?? ctx?.runId, `${this.constructor.name}.plan`);
    const signals = this.advisoryConfig.rules.map((rule) => Object.freeze(rule(input, ctx)));
    const urgent = signals.filter((s) => s.status === 'urgent');
    const warnings = signals.filter((s) => s.status === 'watch');
    const confidence = confidenceFromSignals(signals);
    const topic = this.advisoryConfig.selectTopic(input, signals);
    const payload = this.advisoryConfig.buildPayload({
      input,
      ctx,
      runId,
      signals,
      urgent,
      warnings,
      confidence,
    });
    return Object.freeze({
      summary: `${this.charter.name}: ${urgent.length > 0 ? 'material alert' : 'advisory brief'} (${signals.length} rules)`,
      authorityNeeded: [...this.charter.authority],
      sideEffects: [],
      outcome: urgent.length > 0 ? 'material_alert' : 'advisory_ready',
      confidence,
      signals: Object.freeze(signals),
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({ topic, payload: Object.freeze(payload) }),
        ]),
      }),
    });
  }

  async act(_ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error(`${this.constructor.name}.act: invalid plan`);
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error(`${this.constructor.name}.act: recommend_only forbids sideEffects`);
    }
    const published = [];
    const publishEnvelopes = [];
    for (const event of plan.proposed.emit) {
      if (!this.charter.produces.includes(event.topic)) {
        throw new Error(`${this.constructor.name}.act: topic '${event.topic}' is not in charter.produces`);
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
    });
  }

  async recommend(ctx) {
    if (!ctx || typeof ctx.runId !== 'string' || !ctx.runId) {
      throw new Error(`${this.constructor.name}.recommend: ctx.runId required`);
    }
    try {
      const plan = await this.plan({ input: this.recommendInput(ctx), runId: ctx.runId });
      return Object.freeze({
        agent_id: this.charter.id,
        recommendation: plan.summary,
        confidence: plan.confidence,
        metadata: Object.freeze({
          ok: true,
          outcome: plan.outcome,
          runId: ctx.runId,
          signals: plan.signals,
          emit: plan.proposed.emit.map((e) => e.topic),
        }),
      });
    } catch (e) {
      return Object.freeze({
        agent_id: this.charter.id,
        recommendation: `${this.charter.name} recommendation failed: ${e?.message ?? e}`,
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: String(e?.message ?? e),
          runId: ctx.runId,
        }),
      });
    }
  }

  recommendInput(ctx) {
    return {
      kind: this.advisoryConfig.inputKind,
      runId: ctx.runId,
      reportType: ctx.reportType ?? null,
      healthSignals: ctx.healthSignals ?? [],
      benchmarkReports: ctx.benchmarkReports ?? [],
      regulations: ctx.regulations ?? [],
      platformSignals: ctx.platformSignals ?? [],
    };
  }
}

export function advisoryCharterFromRegistry(id, { marketplaceTools = [] } = {}) {
  const r = getAgent(id);
  if (!r) throw new Error(`registry entry for id=${id} missing`);
  return {
    id: r.id,
    name: r.name,
    flowAiOnly: [4, 5, 8, 11, 12, 14, 16, 18].includes(r.id),
    authority: [...r.authority],
    requiredCredentials: [...r.requiredCredentials],
    marketplaceTools: [...marketplaceTools],
    consumes: [...r.consumes],
    produces: [...r.produces],
    escalationPolicy: r.escalationPolicy,
  };
}

export function listCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireRunId(runId, label) {
  if (typeof runId !== 'string' || !runId) throw new Error(`${label}: runId required`);
  return runId;
}

function confidenceFromSignals(signals) {
  const score = signals.reduce((sum, signal) => {
    if (signal.status === 'clear') return sum + 1;
    if (signal.status === 'watch') return sum + 0.65;
    if (signal.status === 'urgent') return sum + 0.85;
    return sum;
  }, 0);
  return Math.max(0, Math.min(0.95, Number((score / signals.length).toFixed(2))));
}
