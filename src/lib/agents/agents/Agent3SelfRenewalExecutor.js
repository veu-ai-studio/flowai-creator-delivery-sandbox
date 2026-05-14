/**
 * Agent #3 — Self-Renewal Executor (Phase 1.3 graduation)
 * ---------------------------------------------------------------------------
 * Owner:        /src/lib/agents/agents/Agent3SelfRenewalExecutor.js
 * Mode:         cross-step (does NOT compete with step-6 step-owner)
 * Authority:    [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
 * Embedding:    Embedded (id=3 family; flowAiOnly=false per BaseAgent partition)
 * Lineage:      docs/specs/SELF_RENEWAL_AGENT_SPEC.md (commit 446ddb5)
 *               CEO dispositions Q1-Q5 locked 2026-05-14:
 *                 Q1=(a) recommend-only + fork-and-fix active; defer ii,iii
 *                 Q2=(b) split charter (this class is the split executor)
 *                 Q3=(a) 3-tier severity; medium auto, high+critical gate
 *                 Q4=(c) sync /api/agent/3/execute + Inngest async
 *                 Q5=(c) sampled verification re-crawl, monthly minimum
 *
 * Responsibilities:
 *   - Take a W2.Issue + mode and execute the appropriate remediation:
 *       'recommend_only'  → no side effects; analytic envelope only
 *       'fork_and_fix'    → severity-gated; medium auto-deploys via
 *                           remediationEngine; high+critical short-circuit
 *                           to Human Gate per Rev-2.1 §10.2
 *   - Emit GovernanceAuditLog topics per Rev-2.1 §14:
 *       'agent.execution'  — entry/exit
 *       'agent.fork'       — fork_and_fix initiation
 *       'agent.deploy'     — deploy completion or failure
 *   - Sampled verification re-crawl per Q5 (delegated to verification.js)
 *
 * Authority preservation:
 *   The original Agent3SelfRenewal at src/lib/agents/agents/Agent3SelfRenewal.js
 *   stays at [RECOMMEND_ONLY] and continues to own step 6 of the Auto Runner.
 *   This Executor is a SIBLING class sharing the id=3 charter family. The
 *   single-authority-per-charter invariant is preserved because each class
 *   declares ONE authority array; the executor's array just happens to be
 *   different from the primary's.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getExecutor } from '../_registry.js';
import {
  classifySeverity,
  requiresHumanGate,
  autoDeployable,
  partitionByRouting,
} from '../severity.js';
import {
  shouldVerify,
  runVerificationRecrawl,
} from '../verification.js';

const EXECUTOR_KEY = 'self-renewal-executor';
const HOT_TTL_SECONDS = 24 * 60 * 60;
const MAX_BUILD_FAILURES_24H = 2;

const HOT_KEYS = Object.freeze({
  backoff: (productScope) => `renewal:backoff:${productScope}`,
  delta: (runId) => `renewal:delta:${runId}`,
  verificationCount: (productScope) => `renewal:verification:count:${productScope}`,
  lastVerified: (productScope) => `renewal:verification:lastAt:${productScope}`,
});

const TOPICS = Object.freeze({
  candidate: '3.renewal.candidate.v1',
  applied: '3.renewal.applied.v1',
  delta: '3.renewal.delta.v1',
  buildFailed: '3.renewal.build_failed.v1',
  disabled: '3.renewal.disabled.v1',
  // GovernanceAuditLog catalog per Rev-2.1 §14:
  agentExecution: 'agent.execution',
  agentFork: 'agent.fork',
  agentDeploy: 'agent.deploy',
});

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent3SelfRenewalExecutor extends BaseAgent {
  /** @type {3} */
  static charterId = 3;

  /**
   * BaseAgent.charter() — sourced from EXECUTOR_REGISTRY rather than the
   * standard AGENT_REGISTRY. The id=3 + flowAiOnly=false declaration still
   * satisfies BaseAgent._validateCharter because #3 is in EMBEDDED_AGENTS.
   * The authority array is the split-executor authority pair.
   */
  static charter() {
    const e = getExecutor(EXECUTOR_KEY);
    if (!e) {
      throw new Error(
        `Agent3SelfRenewalExecutor: executor registry entry "${EXECUTOR_KEY}" missing`,
      );
    }
    return {
      id: e.agentId,                                   // 3
      name: e.name,                                    // 'Self-Renewal Executor'
      flowAiOnly: false,                                // matches EMBEDDED_AGENTS for id 3
      authority: [...e.authority],                      // [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
      requiredCredentials: [...e.requiredCredentials],  // ANTHROPIC_API_KEY, VERCEL_TOKEN
      marketplaceTools: ['claude-code', 'vercel'],
      consumes: [...e.consumes],
      produces: [...e.produces],
      escalationPolicy: e.escalationPolicy,
    };
  }

  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.messageBus
   * @param {object} deps.auditLog       — GovernanceAuditLog sink (Rev-2.1 §14)
   * @param {{ now: () => number }} deps.clock
   * @param {string} deps.productScope
   * @param {string} deps.environment
   * @param {object} deps.hot            — HotStore
   * @param {object} deps.cold           — ColdStore (lineage rows)
   * @param {object} [deps.remediationEngine]  — { remediate({...}) } adapter; required for fork_and_fix
   * @param {object} [deps.verificationAdapters] — { issueDetector, orchestraDispatch, claudeNormalize? }
   * @param {object} [deps.humanGate]    — { request({...}) } adapter for Rev-2.1 §10.2 Approve/Modify/Skip
   * @param {object} [deps.options]      — { verificationSampleRate?, monthlyMinimumDays? }
   */
  constructor(deps) {
    super(deps);
    if (!deps.hot) throw new Error('Agent3SelfRenewalExecutor: hot store required');
    if (!deps.cold) throw new Error('Agent3SelfRenewalExecutor: cold store required');
    if (!deps.messageBus) throw new Error('Agent3SelfRenewalExecutor: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;
    this.remediationEngine = deps.remediationEngine ?? null;
    this.verificationAdapters = deps.verificationAdapters ?? null;
    this.humanGate = deps.humanGate ?? null;
    this.options = Object.freeze({
      verificationSampleRate: deps.options?.verificationSampleRate,
      monthlyMinimumDays: deps.options?.monthlyMinimumDays,
    });
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan an execution. Input shape:
   *   { kind: 'renewal.execute', mode, issue, productScope, runId?, sourceHints? }
   *
   * The plan declares the side effects of executing — required by the new
   * BaseAgent.guard() AUTO_WRITE_INTERNAL contract (see spec §4.2).
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'renewal.execute') {
      throw new Error("Agent3SelfRenewalExecutor.plan: input.kind must be 'renewal.execute'");
    }
    const mode = input.mode === 'fork_and_fix' ? 'fork_and_fix' : 'recommend_only';

    if (mode === 'recommend_only') {
      // The Executor's charter is [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
      // per CEO Q2 = (b) split — RECOMMEND_ONLY is NOT declared. BaseAgent.
      // guard() rejects requested authorities not in the charter. For the
      // recommend_only analytical path no authority is actually exercised
      // (no writes, no gates), so authorityNeeded is empty. The size===1
      // RECOMMEND_ONLY hard-wall in guard() doesn't fire because declared.size
      // === 2 for the Executor.
      return Object.freeze({
        summary: `recommend_only analysis for issue ${input.issue?.id ?? 'unknown'}`,
        authorityNeeded: [],
        sideEffects: [],
        outcome: 'analysis',
        mode,
        issue: input.issue,
      });
    }

    // fork_and_fix path.
    if (!input.issue || typeof input.issue !== 'object') {
      throw new Error('Agent3SelfRenewalExecutor.plan: fork_and_fix requires issue');
    }
    const tier = classifySeverity(input.issue);
    if (requiresHumanGate(tier)) {
      // Plan declares Human-Gate-only path — no actual write side effects yet.
      return Object.freeze({
        summary: `fork_and_fix gated (severity=${tier}) for issue ${input.issue.id ?? 'unknown'}`,
        authorityNeeded: [AUTHORITY.REQUIRES_HUMAN_GATE],
        sideEffects: [
          Object.freeze({ kind: 'human_gate.request', issueId: input.issue.id ?? null }),
        ],
        outcome: 'gated',
        mode,
        issue: input.issue,
        severity: tier,
      });
    }

    // medium tier → auto-deploy plan
    return Object.freeze({
      summary: `fork_and_fix auto-deploy (severity=${tier}) for issue ${input.issue.id ?? 'unknown'}`,
      authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL],
      sideEffects: [
        Object.freeze({ kind: 'remediation.dispatch', issueId: input.issue.id ?? null }),
        Object.freeze({ kind: 'orchestra.deploy', productScope: input.productScope }),
      ],
      outcome: 'auto_deploy',
      mode,
      issue: input.issue,
      severity: tier,
    });
  }

  /**
   * Execute the plan. Dispatches to executeRemediation() and emits the
   * appropriate bus + audit-log events.
   */
  async act(ctx, plan) {
    const at = this.deps.clock.now();
    const productScope = ctx?.input?.productScope ?? this.deps.productScope;

    await this._emitAuditLog(TOPICS.agentExecution, {
      phase: 'start',
      mode: plan.mode,
      severity: plan.severity ?? null,
      issueId: plan.issue?.id ?? null,
      productScope,
      at,
    });

    try {
      const result = await this.executeRemediation(plan.issue, plan.mode, {
        productScope,
        runId: ctx?.input?.runId,
        sourceHints: ctx?.input?.sourceHints,
      });
      await this._emitAuditLog(TOPICS.agentExecution, {
        phase: 'end',
        ok: result.ok !== false,
        outcome: result.outcome,
        productScope,
        at: this.deps.clock.now(),
      });
      return Object.freeze({
        outcome: result.outcome,
        sideEffects: result.sideEffects ?? [],
        ...result,
      });
    } catch (e) {
      await this._emitAuditLog(TOPICS.agentExecution, {
        phase: 'error',
        error: String(e?.message ?? e),
        productScope,
        at: this.deps.clock.now(),
      });
      throw e;
    }
  }

  // ── Public surface ─────────────────────────────────────────────────────────

  /**
   * Execute a remediation for a single Issue. The primary public API.
   *
   * @param {object} issue        — W2.Issue shape (severity, category, autoFixable, fixSpec?)
   * @param {string} mode         — 'recommend_only' | 'fork_and_fix'
   * @param {object} [opts]
   * @param {string} [opts.productScope]
   * @param {string} [opts.runId]
   * @param {object} [opts.sourceHints]
   * @returns {Promise<{outcome, ok, ...}>}
   */
  async executeRemediation(issue, mode, opts = {}) {
    if (!issue || typeof issue !== 'object') {
      throw new TypeError('executeRemediation: issue object required');
    }
    if (mode !== 'recommend_only' && mode !== 'fork_and_fix') {
      throw new TypeError(
        `executeRemediation: mode must be 'recommend_only' or 'fork_and_fix', got "${mode}"`,
      );
    }
    const productScope = opts.productScope ?? this.deps.productScope ?? 'flowai';
    const runId = opts.runId ?? `run_${this.deps.clock.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // recommend_only path — no side effects.
    if (mode === 'recommend_only') {
      const tier = classifySeverity(issue);
      return Object.freeze({
        ok: true,
        outcome: 'recommendation',
        mode,
        severity: tier,
        requiresHumanGate: requiresHumanGate(tier),
        recommendation: this._composeRecommendation(issue, tier),
        productScope,
        runId,
      });
    }

    // fork_and_fix — severity-gated.
    const tier = classifySeverity(issue);
    if (requiresHumanGate(tier)) {
      const noticeId = await this._requestHumanGate({
        issue,
        severity: tier,
        productScope,
        runId,
      });
      await this._emitAuditLog(TOPICS.agentFork, {
        phase: 'gated',
        severity: tier,
        issueId: issue.id ?? null,
        noticeId,
        productScope,
        runId,
        at: this.deps.clock.now(),
      });
      return Object.freeze({
        ok: true,
        outcome: 'gated',
        mode,
        severity: tier,
        requiresHumanGate: true,
        humanGateNoticeId: noticeId,
        productScope,
        runId,
      });
    }

    // medium tier → check backoff, then auto-deploy.
    if (!autoDeployable(tier)) {
      // Defensive: severity tier outside the canonical 3-tier set.
      return Object.freeze({
        ok: false,
        outcome: 'unknown_severity',
        mode,
        severity: tier,
        productScope,
        runId,
      });
    }

    const disabled = await this._isDisabledForBackoff(productScope);
    if (disabled) {
      await this._publishBus(TOPICS.disabled, {
        productScope,
        runId,
        reason: 'consecutive_build_failures',
        backoffExpiresAt: disabled.backoffExpiresAt,
      });
      return Object.freeze({
        ok: false,
        outcome: 'disabled_backoff',
        mode,
        severity: tier,
        productScope,
        runId,
        disabled: true,
        backoffExpiresAt: disabled.backoffExpiresAt,
      });
    }

    await this._emitAuditLog(TOPICS.agentFork, {
      phase: 'dispatch',
      severity: tier,
      issueId: issue.id ?? null,
      productScope,
      runId,
      at: this.deps.clock.now(),
    });

    if (!this.remediationEngine || typeof this.remediationEngine.remediate !== 'function') {
      // Without a remediation engine wired we cannot execute. Fail fast,
      // emit the build_failed event, and increment backoff.
      const reason = 'remediationEngine adapter not wired';
      await this._publishBus(TOPICS.buildFailed, {
        productScope, runId, reason, issueId: issue.id ?? null,
      });
      await this._incrBackoff(productScope);
      return Object.freeze({
        ok: false, outcome: 'remediation_unavailable', mode,
        severity: tier, productScope, runId,
      });
    }

    let remediation;
    try {
      remediation = await this.remediationEngine.remediate({
        issues: [issue],
        productScope,
        sourceHints: opts.sourceHints,
      });
    } catch (e) {
      const reason = e?.message ?? String(e);
      await this._publishBus(TOPICS.buildFailed, {
        productScope, runId, reason, issueId: issue.id ?? null,
      });
      await this._incrBackoff(productScope);
      await this._emitAuditLog(TOPICS.agentDeploy, {
        phase: 'error', error: reason, productScope, runId, at: this.deps.clock.now(),
      });
      return Object.freeze({
        ok: false, outcome: 'remediation_threw', mode,
        severity: tier, productScope, runId, error: reason,
      });
    }

    if (!remediation || remediation.ok !== true) {
      const reason = remediation?.reason ?? remediation?.error ?? 'unknown';
      await this._publishBus(TOPICS.buildFailed, {
        productScope, runId, reason, issueId: issue.id ?? null,
        buildLog: remediation?.buildLog ?? null,
      });
      await this._incrBackoff(productScope);
      await this._emitAuditLog(TOPICS.agentDeploy, {
        phase: 'failed', reason, productScope, runId, at: this.deps.clock.now(),
      });
      return Object.freeze({
        ok: false, outcome: 'build_failed', mode,
        severity: tier, productScope, runId,
        buildLog: remediation?.buildLog ?? null,
      });
    }

    // Success — emit applied event, then run verification re-crawl per Q5 sample logic.
    await this._publishBus(TOPICS.applied, {
      productScope, runId,
      renewedUrl: remediation.renewedUrl,
      deploymentId: remediation.deploymentId,
      path: remediation.path,
      deployedAt: remediation.deployedAt ?? new Date(this.deps.clock.now()).toISOString(),
    });
    await this._emitAuditLog(TOPICS.agentDeploy, {
      phase: 'deployed', productScope, runId,
      renewedUrl: remediation.renewedUrl,
      at: this.deps.clock.now(),
    });

    // Sampled verification re-crawl.
    const verification = await this.verifyRecrawl(productScope, {
      renewedUrl: remediation.renewedUrl,
      before: [issue],
      runId,
    });

    if (verification.delta) {
      await this._publishBus(TOPICS.delta, {
        productScope, runId,
        resolved: verification.delta.resolved,
        unresolved: verification.delta.unresolved,
        regressions: verification.delta.regressions,
      });
    }

    return Object.freeze({
      ok: true,
      outcome: 'deployed',
      mode,
      severity: tier,
      productScope,
      runId,
      remediation: Object.freeze({
        path: remediation.path,
        renewedUrl: remediation.renewedUrl,
        deploymentId: remediation.deploymentId,
        deployedAt: remediation.deployedAt ?? new Date(this.deps.clock.now()).toISOString(),
      }),
      verification,
    });
  }

  /**
   * Sampled verification re-crawl per CEO disposition Q5.
   *
   * @param {string} productScope
   * @param {object} options
   * @param {string} options.renewedUrl
   * @param {Array<object>} options.before
   * @param {string} [options.runId]
   * @returns {Promise<{sampled, reason, delta?, freshFindings?}>}
   */
  async verifyRecrawl(productScope, options = {}) {
    if (typeof productScope !== 'string' || !productScope) {
      throw new TypeError('verifyRecrawl: productScope required');
    }
    // Read counter + last-verified timestamp from HotStore.
    const renewalCount = ((await this._hotGetNumber(HOT_KEYS.verificationCount(productScope))) ?? 0) + 1;
    const lastVerifiedAt = await this._hotGetNumber(HOT_KEYS.lastVerified(productScope));

    const decision = shouldVerify({
      renewalCount,
      lastVerifiedAt,
      productScope,
      options: {
        sampleRate: this.options.verificationSampleRate,
        monthlyMinimumDays: this.options.monthlyMinimumDays,
        now: () => this.deps.clock.now(),
      },
    });

    // Always advance the counter — even when not sampling — so the every-Nth
    // rhythm is stable across renewals.
    await this._hotSetNumber(HOT_KEYS.verificationCount(productScope), renewalCount);

    if (!decision.sampled) {
      return Object.freeze({
        sampled: false,
        reason: decision.reason,
        renewalCount,
      });
    }

    // Adapter wired? If not, surface the decision without executing.
    if (!this.verificationAdapters) {
      return Object.freeze({
        sampled: true,
        reason: decision.reason,
        skipped: true,
        skippedReason: 'verificationAdapters not wired',
        renewalCount,
      });
    }

    const delta = await runVerificationRecrawl({
      productScope,
      renewedUrl: options.renewedUrl,
      before: options.before ?? [],
      adapters: this.verificationAdapters,
    });

    await this._hotSetNumber(HOT_KEYS.lastVerified(productScope), this.deps.clock.now());

    return Object.freeze({
      sampled: true,
      reason: decision.reason,
      renewalCount,
      delta,
      freshFindings: delta.after,
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  _composeRecommendation(issue, tier) {
    const action = autoDeployable(tier)
      ? 'auto-fixable via fork-and-fix (medium severity)'
      : 'requires Human Gate review per Rev-2.1 §10.2';
    return (
      `[severity=${tier}] [category=${issue.category ?? 'unknown'}] ` +
      `[autoFixable=${issue.autoFixable === true}] ${action}.`
    );
  }

  async _requestHumanGate({ issue, severity, productScope, runId }) {
    const noticeId = `humgate_${runId}_${issue.id ?? 'noid'}_${this.deps.clock.now()}`;
    if (this.humanGate && typeof this.humanGate.request === 'function') {
      try {
        await this.humanGate.request({
          noticeId,
          issueId: issue.id ?? null,
          severity,
          productScope,
          runId,
          rev21Section: '10.2',
          options: ['Approve', 'Modify', 'Skip'],
        });
      } catch (e) {
        // Human Gate failure: log but do not throw — the agent still emits
        // an audit event and returns a gated envelope. Ops can replay later.
        this.deps.logger?.warn?.('humanGate.request failed', { noticeId, error: String(e?.message ?? e) });
      }
    }
    return noticeId;
  }

  async _isDisabledForBackoff(productScope) {
    try {
      const v = await this.hot.get?.(HOT_KEYS.backoff(productScope));
      const count = typeof v === 'number' ? v : (v?.count ?? 0);
      const ts = typeof v === 'object' && v ? v.firstAt : null;
      if (count >= MAX_BUILD_FAILURES_24H) {
        return {
          backoffExpiresAt:
            ts && Number.isFinite(ts) ? ts + HOT_TTL_SECONDS * 1000 : this.deps.clock.now() + HOT_TTL_SECONDS * 1000,
        };
      }
    } catch {
      // HotStore failures are non-fatal.
    }
    return false;
  }

  async _incrBackoff(productScope) {
    try {
      const key = HOT_KEYS.backoff(productScope);
      const v = await this.hot.get?.(key);
      const count = (typeof v === 'number' ? v : v?.count ?? 0) + 1;
      const firstAt = (v && typeof v === 'object' && v.firstAt) || this.deps.clock.now();
      await this.hot.set?.(key, { count, firstAt }, { ttlSeconds: HOT_TTL_SECONDS });
    } catch {
      // best-effort.
    }
  }

  async _hotGetNumber(key) {
    try {
      const v = await this.hot.get?.(key);
      return typeof v === 'number' ? v : null;
    } catch {
      return null;
    }
  }

  async _hotSetNumber(key, n) {
    try {
      await this.hot.set?.(key, n, { ttlSeconds: 60 * HOT_TTL_SECONDS });
    } catch {
      // best-effort.
    }
  }

  async _publishBus(topic, payload) {
    try {
      await this.bus?.publish?.({
        topic,
        payload: { ...payload },
        from: {
          agentId: 3,
          executor: EXECUTOR_KEY,
          productScope: this.deps.productScope,
          environment: this.deps.environment,
        },
        runId: payload.runId ?? null,
        at: this.deps.clock.now(),
      });
    } catch (e) {
      this.deps.logger?.warn?.('bus.publish failed', {
        topic, error: String(e?.message ?? e),
      });
    }
  }

  async _emitAuditLog(topic, payload) {
    try {
      await this.deps.auditLog?.write?.({
        topic,
        agentId: 3,
        executor: EXECUTOR_KEY,
        productScope: this.deps.productScope,
        environment: this.deps.environment,
        ...payload,
      });
    } catch {
      // Audit log is best-effort but should never crash the agent.
    }
  }
}

// Exported for tests + endpoint construction.
export const __internals = Object.freeze({
  EXECUTOR_KEY,
  HOT_KEYS,
  TOPICS,
  MAX_BUILD_FAILURES_24H,
});
