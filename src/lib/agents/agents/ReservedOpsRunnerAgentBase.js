'use strict';

import { BaseAgent } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

export class ReservedOpsRunnerAgentBase extends BaseAgent {
  constructor(deps, config) {
    super(deps);
    if (!config || typeof config !== 'object') {
      throw new Error(`${this.constructor.name}: config required`);
    }
    if (!Number.isInteger(config.id) || config.id < 22 || config.id > 25) {
      throw new Error(`${this.constructor.name}: reserved ops runner id 22..25 required`);
    }
    this.reservedConfig = Object.freeze({
      id: config.id,
      label: config.label ?? `ops-runner-${config.id}`,
    });
  }

  static charterFor(id) {
    const r = getAgent(id);
    if (!r) throw new Error(`registry entry for id=${id} missing`);
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false,
      authority: [...r.authority],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [],
      consumes: [...r.consumes],
      produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    };
  }

  async plan(ctx = {}) {
    const input = ctx.input ?? {};
    const attemptedSideEffects = Array.isArray(input.sideEffects)
      ? input.sideEffects
      : [];
    if (attemptedSideEffects.length > 0 || input.applyNow === true || input.mutate === true) {
      return Object.freeze({
        summary: `${this.charter.name}: reserved charter blocked side-effect attempt`,
        authorityNeeded: ['recommend_only'],
        sideEffects: [],
        outcome: 'reserved_blocked',
        confidence: 0.95,
        blocked: true,
        escalationTarget: 1,
        reason: 'reserved_ops_runner_side_effect_attempt',
        proposed: Object.freeze({ emit: Object.freeze([]) }),
      });
    }
    return Object.freeze({
      summary: `${this.charter.name}: reserved dormant charter, no runtime action`,
      authorityNeeded: ['recommend_only'],
      sideEffects: [],
      outcome: 'reserved_dormant',
      confidence: 0.8,
      blocked: false,
      escalationTarget: null,
      reason: 'reserved_ops_runner_not_assigned',
      proposed: Object.freeze({ emit: Object.freeze([]) }),
    });
  }

  async act(_ctx, plan) {
    if ((plan?.sideEffects ?? []).length !== 0) {
      throw new Error(`${this.constructor.name}.act: reserved ops runner forbids sideEffects`);
    }
    if ((plan?.proposed?.emit ?? []).length !== 0) {
      throw new Error(`${this.constructor.name}.act: reserved ops runner has no produced topics`);
    }
    return Object.freeze({
      outcome: plan?.outcome ?? 'reserved_dormant',
      sideEffects: [],
      published: Object.freeze([]),
      publishEnvelopes: Object.freeze([]),
      blocked: plan?.blocked === true,
      escalationTarget: plan?.escalationTarget ?? null,
    });
  }

  async recommend(ctx = {}) {
    const plan = await this.plan({
      input: {
        kind: 'reserved.ops.runner.request',
        runId: ctx.runId ?? null,
        sideEffects: ctx.sideEffects ?? [],
        applyNow: ctx.applyNow === true,
        mutate: ctx.mutate === true,
      },
      runId: ctx.runId ?? null,
    });
    return Object.freeze({
      agent_id: this.charter.id,
      recommendation: plan.summary,
      confidence: plan.confidence,
      metadata: Object.freeze({
        ok: plan.blocked !== true,
        outcome: plan.outcome,
        reserved: true,
        runId: ctx.runId ?? null,
        sideEffects: [],
        emit: [],
        escalationTarget: plan.escalationTarget,
      }),
    });
  }
}
