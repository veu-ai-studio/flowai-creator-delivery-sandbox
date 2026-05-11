/**
 * BaseAgent — VEU AI Studio FlowAI
 * ---------------------------------------------------------------------------
 * Status:      G2 RATIFIED + Packet 1.5 amendment + Phase 1.0 expansion
 * Owner:       /src/lib/agents/BaseAgent.js
 * Consumers:   All 25 FlowAI Super Agents (#1–#25)
 *
 * AMENDMENT NOTE (Packet 1.5)
 *   Added `environment` to required deps. Validated against productScope:
 *     - flowai:  accepts 'prod' | 'staging'
 *     - products: accepts 'prod' | 'staging' | 'demo' | 'live-demo' | 'sales-demo'
 *
 * AMENDMENT NOTE (Phase 1.0 — W5b infrastructure lock-in, 2026-05-11)
 *   Roster expanded 20 → 25. Added Ops Runner Alpha/Beta/Gamma/Delta/Epsilon
 *   (#21–#25), all step-owner mode, all embedded (non-FlowAI-only).
 *   Partition validator + Charter.id range updated to enforce EXACTLY 25 IDs.
 * ---------------------------------------------------------------------------
 */

'use strict';

export const AGENT_IDS = Object.freeze({
  LIFECYCLE_ENGINE:        1,
  CODE_BUILDER:            2,
  SELF_RENEWAL:            3,
  PROVIDER_ONBOARDING:     4,
  END_CUSTOMER_INTAKE:     5,
  RESEARCH:                6,
  DESIGN:                  7,
  QUALITY_AUDIT:           8,
  GO_TO_MARKET:            9,
  MONITOR:                 10,
  STRATEGIC_INTELLIGENCE:  11,
  PORTFOLIO_RISK:          12,
  SELF_PROTECTION:         13,
  PUBLIC_POLICY:           14,
  BENCHMARKING:            15,
  PRODUCTIVITY_HR:         16,
  PRODUCT_EVOLUTION:       17,
  BUSINESS_PLANNING:       18,
  TECHNOLOGICAL_EVOLUTION: 19,
  ENVIRONMENTAL_IMPACTS:   20,
  OPS_RUNNER_ALPHA:        21,
  OPS_RUNNER_BETA:         22,
  OPS_RUNNER_GAMMA:        23,
  OPS_RUNNER_DELTA:        24,
  OPS_RUNNER_EPSILON:      25,
});

export const FLOWAI_ONLY_AGENTS = Object.freeze(new Set([4, 5, 8, 11, 12, 14, 16, 18]));
export const EMBEDDED_AGENTS    = Object.freeze(new Set([1, 2, 3, 6, 7, 9, 10, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25]));

(function validateRosterPartition() {
  const all = new Set([...FLOWAI_ONLY_AGENTS, ...EMBEDDED_AGENTS]);
  if (all.size !== 25) throw new Error('Roster partition invalid: expected 25 unique IDs');
  for (let i = 1; i <= 25; i++) if (!all.has(i)) throw new Error(`Agent ID ${i} missing from roster`);
})();

export const AUTHORITY = Object.freeze({
  RECOMMEND_ONLY:        'recommend_only',
  DRAFT_ONLY:            'draft_only',
  AUTO_CONTAIN_KNOWN:    'auto_contain_known',
  AUTO_WRITE_INTERNAL:   'auto_write_internal',
  REQUIRES_HUMAN_GATE:   'requires_human_gate',
});

export const PRODUCT_SCOPES = Object.freeze({
  FLOWAI:       'flowai',
  SAIGE:        'saige',
  RELTWIN:      'reltwin',
  REACHSMS:     'reachsms',
  PRESSAI:      'pressai',
  MYBIRTHSAFE:  'mybirthsafe',
});

export const ENVIRONMENTS = Object.freeze({
  PROD:        'prod',
  STAGING:     'staging',
  DEMO:        'demo',
  LIVE_DEMO:   'live-demo',
  SALES_DEMO:  'sales-demo',
});

const FLOWAI_VALID_ENVS  = Object.freeze(new Set(['prod', 'staging']));
const PRODUCT_VALID_ENVS = Object.freeze(new Set(['prod', 'staging', 'demo', 'live-demo', 'sales-demo']));

export function isValidEnvironmentForScope(productScope, environment) {
  if (productScope === PRODUCT_SCOPES.FLOWAI) return FLOWAI_VALID_ENVS.has(environment);
  return PRODUCT_VALID_ENVS.has(environment);
}

export class BaseAgent {
  constructor(deps = {}) {
    const required = ['logger', 'messageBus', 'auditLog', 'clock', 'productScope', 'environment'];
    for (const k of required) {
      if (deps[k] === undefined) throw new Error(`BaseAgent: missing dependency "${k}"`);
    }
    this.deps = deps;

    const charter = this.constructor.charter?.();
    if (!charter) throw new Error(`${this.constructor.name}: static charter() not implemented`);
    BaseAgent._validateCharter(charter);
    this.charter = Object.freeze(charter);

    if (charter.flowAiOnly && deps.productScope !== PRODUCT_SCOPES.FLOWAI) {
      throw new Error(
        `Agent #${charter.id} is FlowAI-only but constructed with productScope="${deps.productScope}"`
      );
    }
    if (!isValidEnvironmentForScope(deps.productScope, deps.environment)) {
      const valid = deps.productScope === PRODUCT_SCOPES.FLOWAI
        ? [...FLOWAI_VALID_ENVS]
        : [...PRODUCT_VALID_ENVS];
      throw new Error(
        `Agent #${charter.id}: environment="${deps.environment}" is not valid for productScope="${deps.productScope}". ` +
        `Valid: [${valid.join(', ')}]`
      );
    }
  }

  async run(input = {}) {
    const runId = this._mintRunId();
    const startedAt = this.deps.clock.now();
    const ctx = Object.freeze({
      runId,
      startedAt,
      input: Object.freeze({ ...input }),
      agentId: this.charter.id,
      productScope: this.deps.productScope,
      environment: this.deps.environment,
    });

    await this.deps.auditLog.write({
      runId, agentId: ctx.agentId, phase: 'run.start',
      productScope: ctx.productScope, environment: ctx.environment,
      input: ctx.input, at: startedAt,
    });

    try {
      if (typeof this.preflight === 'function') {
        await this.preflight(ctx);
        await this.deps.auditLog.write({ runId, phase: 'preflight.ok', at: this.deps.clock.now() });
      }

      const plan = await this.plan(ctx);
      if (!plan || typeof plan !== 'object') {
        throw new Error(`Agent #${ctx.agentId}: plan() must return an object`);
      }
      await this.deps.auditLog.write({
        runId, phase: 'plan.ok', planSummary: plan.summary ?? null, at: this.deps.clock.now(),
      });

      this.guard(plan);
      await this.deps.auditLog.write({ runId, phase: 'guard.ok', at: this.deps.clock.now() });

      const result = await this.act(ctx, plan);
      await this.deps.auditLog.write({
        runId, phase: 'act.ok',
        outcome: result?.outcome ?? 'unknown',
        sideEffects: result?.sideEffects ?? [],
        at: this.deps.clock.now(),
      });

      if (typeof this.postflight === 'function') {
        try { await this.postflight(ctx); }
        catch (e) {
          await this.deps.auditLog.write({
            runId, phase: 'postflight.error', error: String(e?.message ?? e), at: this.deps.clock.now(),
          });
        }
      }

      return Object.freeze({ runId, ok: true, result });
    } catch (err) {
      await this.deps.auditLog.write({
        runId, phase: 'run.error',
        error: String(err?.message ?? err),
        stack: err?.stack ?? null,
        at: this.deps.clock.now(),
      });
      return Object.freeze({ runId, ok: false, error: String(err?.message ?? err) });
    }
  }

  async emit(topic, payload, { runId } = {}) {
    if (!topic || typeof topic !== 'string') throw new Error('emit: topic required');
    return this.deps.messageBus.publish({
      topic,
      payload,
      from: { agentId: this.charter.id, productScope: this.deps.productScope, environment: this.deps.environment },
      runId: runId ?? null,
      at: this.deps.clock.now(),
    });
  }

  async subscribe(topic, handler) {
    if (!topic || typeof topic !== 'string') throw new Error('subscribe: topic required');
    if (typeof handler !== 'function') throw new Error('subscribe: handler must be a function');
    return this.deps.messageBus.subscribe(topic, handler, {
      agentId: this.charter.id, productScope: this.deps.productScope, environment: this.deps.environment,
    });
  }

  guard(plan) {
    const declared = new Set(this.charter.authority);
    const requested = Array.isArray(plan.authorityNeeded) ? plan.authorityNeeded : [];
    for (const need of requested) {
      if (!declared.has(need)) {
        throw new Error(
          `Agent #${this.charter.id} (${this.charter.name}): plan requested authority "${need}" ` +
          `but charter only grants [${[...declared].join(', ')}]`
        );
      }
    }
    if (declared.size === 1 && declared.has(AUTHORITY.RECOMMEND_ONLY)) {
      if ((plan.sideEffects ?? []).length > 0) {
        throw new Error(
          `Agent #${this.charter.id}: charter is RECOMMEND_ONLY; plan declared sideEffects=${plan.sideEffects.length}`
        );
      }
    }
  }

  async plan(/* ctx */) { throw new Error(`${this.constructor.name}: plan() not implemented`); }
  async act(/* ctx, plan */) { throw new Error(`${this.constructor.name}: act() not implemented`); }

  _mintRunId() {
    const t = this.deps.clock.now();
    const r = Math.random().toString(36).slice(2, 10);
    return `run_${t}_${this.charter.id}_${r}`;
  }

  static _validateCharter(c) {
    if (!Number.isInteger(c.id) || c.id < 1 || c.id > 25) {
      throw new Error(`Charter.id must be an integer 1–25, got ${c.id}`);
    }
    if (typeof c.name !== 'string' || c.name.length === 0) {
      throw new Error(`Charter.name required for agent #${c.id}`);
    }
    if (typeof c.flowAiOnly !== 'boolean') {
      throw new Error(`Charter.flowAiOnly must be boolean for agent #${c.id}`);
    }
    const expectedFlowAiOnly = FLOWAI_ONLY_AGENTS.has(c.id);
    if (c.flowAiOnly !== expectedFlowAiOnly) {
      throw new Error(
        `Agent #${c.id}: charter.flowAiOnly=${c.flowAiOnly} contradicts canonical roster (expected ${expectedFlowAiOnly})`
      );
    }
    if (!Array.isArray(c.authority) || c.authority.length === 0) {
      throw new Error(`Charter.authority must be a non-empty array for agent #${c.id}`);
    }
    const validAuthority = new Set(Object.values(AUTHORITY));
    for (const a of c.authority) {
      if (!validAuthority.has(a)) throw new Error(`Agent #${c.id}: unknown authority "${a}"`);
    }
    for (const k of ['requiredCredentials', 'marketplaceTools', 'consumes', 'produces']) {
      if (!Array.isArray(c[k])) throw new Error(`Charter.${k} must be array for agent #${c.id}`);
    }
    if (typeof c.escalationPolicy !== 'string') {
      throw new Error(`Charter.escalationPolicy required for agent #${c.id}`);
    }
  }
}