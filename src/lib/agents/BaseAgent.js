/**
 * BaseAgent — VEU AI Studio FlowAI
 * ---------------------------------------------------------------------------
 * Authored by: W2 (Backend Super Agents)
 * Status:      RATIFIED by W0
 * Owner:       /src/lib/agents/BaseAgent.js
 * Consumers:   All 20 FlowAI Super Agents (#1–#20)
 *
 * PURPOSE
 *   Single contract every Super Agent implements. Eliminates per-agent
 *   scaffolding drift. Without this, building 11 net-new agents to a 95%
 *   readiness bar consistently is not achievable.
 *
 * NON-GOALS
 *   - Not an LLM client. Agents bring their own model client via deps.
 *   - Not a tool registry. The Tool Intelligence Marketplace (W3) owns that.
 *   - Not a scoring engine. /lib/governance/* owns rubric execution.
 * ---------------------------------------------------------------------------
 */

'use strict';

// ===========================================================================
// 1. CANONICAL AGENT ROSTER — locked per W0 broadcast
// ===========================================================================

const AGENT_IDS = Object.freeze({
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
});

const FLOWAI_ONLY_AGENTS = Object.freeze(new Set([4, 5, 8, 11, 12, 14, 16, 18]));
const EMBEDDED_AGENTS    = Object.freeze(new Set([1, 2, 3, 6, 7, 9, 10, 13, 15, 17, 19, 20]));

// Sanity: every ID is in exactly one of the two sets.
(function validateRosterPartition() {
  const all = new Set([...FLOWAI_ONLY_AGENTS, ...EMBEDDED_AGENTS]);
  if (all.size !== 20) throw new Error('Roster partition invalid: expected 20 unique IDs');
  for (let i = 1; i <= 20; i++) if (!all.has(i)) throw new Error(`Agent ID ${i} missing from roster`);
})();

// ===========================================================================
// 2. AUTHORITY BOUNDARIES — declarative, enforced by runner
// ===========================================================================

const AUTHORITY = Object.freeze({
  RECOMMEND_ONLY:        'recommend_only',
  DRAFT_ONLY:            'draft_only',
  AUTO_CONTAIN_KNOWN:    'auto_contain_known',
  AUTO_WRITE_INTERNAL:   'auto_write_internal',
  REQUIRES_HUMAN_GATE:   'requires_human_gate',
});

// ===========================================================================
// 3. PRODUCT SCOPES — for embedded agents
// ===========================================================================

const PRODUCT_SCOPES = Object.freeze({
  FLOWAI:       'flowai',
  SAIGE:        'saige',
  RELTWIN:      'reltwin',
  REACHSMS:     'reachsms',
  PRESSAI:      'pressai',
  MYBIRTHSAFE:  'mybirthsafe',
});

// ===========================================================================
// 4. AGENT CONTRACT
// ===========================================================================

class BaseAgent {
  constructor(deps = {}) {
    const required = ['logger', 'messageBus', 'auditLog', 'clock', 'productScope'];
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
    });

    await this.deps.auditLog.write({
      runId, agentId: ctx.agentId, phase: 'run.start',
      productScope: ctx.productScope, input: ctx.input, at: startedAt,
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
      from: { agentId: this.charter.id, productScope: this.deps.productScope },
      runId: runId ?? null,
      at: this.deps.clock.now(),
    });
  }

  async subscribe(topic, handler) {
    if (!topic || typeof topic !== 'string') throw new Error('subscribe: topic required');
    if (typeof handler !== 'function')         throw new Error('subscribe: handler must be a function');
    return this.deps.messageBus.subscribe(topic, handler, {
      agentId: this.charter.id, productScope: this.deps.productScope,
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
    if (!Number.isInteger(c.id) || c.id < 1 || c.id > 20) {
      throw new Error(`Charter.id must be an integer 1–20, got ${c.id}`);
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

export {
  BaseAgent,
  AGENT_IDS,
  FLOWAI_ONLY_AGENTS,
  EMBEDDED_AGENTS,
  AUTHORITY,
  PRODUCT_SCOPES,
};