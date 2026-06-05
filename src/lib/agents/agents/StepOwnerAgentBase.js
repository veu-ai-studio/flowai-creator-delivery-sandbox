/**
 * Shared recommend-only base for P11-A step-owner agents (#6-#10).
 * Keeps the concrete agents small while preserving per-agent rules.
 */

'use strict';

import { BaseAgent } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

export class StepOwnerAgentBase extends BaseAgent {
  constructor(deps, config) {
    super(deps);
    if (!config || typeof config !== 'object') {
      throw new Error(`${this.constructor.name}: config required`);
    }
    if (!Number.isInteger(config.id)) {
      throw new Error(`${this.constructor.name}: numeric config.id required`);
    }
    if (typeof config.stepKey !== 'string' || !config.stepKey) {
      throw new Error(`${this.constructor.name}: config.stepKey required`);
    }
    if (typeof config.inputKind !== 'string' || !config.inputKind) {
      throw new Error(`${this.constructor.name}: config.inputKind required`);
    }
    if (!Array.isArray(config.rules) || config.rules.length < 3) {
      throw new Error(`${this.constructor.name}: at least three decision rules required`);
    }
    this.stepConfig = Object.freeze({
      id: config.id,
      stepKey: config.stepKey,
      inputKind: config.inputKind,
      summaryVerb: config.summaryVerb,
      rules: Object.freeze([...config.rules]),
      buildPayload: config.buildPayload,
      selectTopic: config.selectTopic,
    });
  }

  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== this.stepConfig.inputKind) {
      throw new Error(`${this.constructor.name}.plan: input.kind must be '${this.stepConfig.inputKind}'`);
    }
    const runId = requireRunId(input.runId ?? ctx?.runId, `${this.constructor.name}.plan`);
    const productId = typeof input.productId === 'string' && input.productId
      ? input.productId
      : null;
    const signals = this.stepConfig.rules.map((rule) => Object.freeze(rule(input, ctx)));
    const blockers = signals.filter((s) => s.status === 'blocker');
    const warnings = signals.filter((s) => s.status === 'warning');
    const confidence = confidenceFromSignals(signals);
    const ok = blockers.length === 0;
    const topic = this.stepConfig.selectTopic(input, signals);
    const payload = this.stepConfig.buildPayload({
      input,
      ctx,
      runId,
      productId,
      ok,
      confidence,
      signals,
      blockers,
      warnings,
    });

    return Object.freeze({
      summary: `${this.charter.name} ${this.stepConfig.summaryVerb}: ${ok ? 'ready' : 'blocked'} (${signals.length} rules)`,
      authorityNeeded: [...this.charter.authority],
      sideEffects: [],
      outcome: ok ? 'ready' : 'blocked',
      confidence,
      productId,
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
    const input = this.recommendInput(ctx);
    try {
      const plan = await this.plan({ input, runId: ctx.runId });
      return Object.freeze({
        agent_id: this.charter.id,
        recommendation: plan.summary,
        confidence: plan.confidence,
        metadata: Object.freeze({
          ok: plan.outcome === 'ready',
          outcome: plan.outcome,
          stepKey: this.stepConfig.stepKey,
          runId: ctx.runId,
          productId: ctx.productId ?? null,
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
          stepKey: this.stepConfig.stepKey,
          runId: ctx.runId,
          productId: ctx.productId ?? null,
        }),
      });
    }
  }

  recommendInput(ctx) {
    return {
      kind: this.stepConfig.inputKind,
      runId: ctx.runId,
      productId: ctx.productId ?? null,
      stepInputs: ctx.stepInputs ?? null,
      spec: ctx.spec ?? null,
      sourceSpecRef: ctx.sourceSpecRef ?? null,
    };
  }
}

export function charterFromRegistry(id, { marketplaceTools = [] } = {}) {
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

export function hasValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

export function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function requireRunId(runId, label) {
  if (typeof runId !== 'string' || !runId) {
    throw new Error(`${label}: runId required`);
  }
  return runId;
}

function confidenceFromSignals(signals) {
  const score = signals.reduce((sum, signal) => {
    if (signal.status === 'pass') return sum + 1;
    if (signal.status === 'warning') return sum + 0.55;
    return sum;
  }, 0);
  return Math.max(0, Math.min(0.95, Number((score / signals.length).toFixed(2))));
}
