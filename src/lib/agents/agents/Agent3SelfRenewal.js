/**
 * Agent #3 — Self-Renewal
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/agents/Agent3SelfRenewal.js  (W5 territory)
 * Mode:     step-owner (Step 6 'govern' in the 8-step Auto Runner)
 * Authority: recommend_only
 * Embedding: Embedded (consumer-facing)
 *
 * Responsibilities (per Agent #3 spec):
 *   - Consume `8.audit.completed.v1`, `10.anomaly.v1`, `17.evolution.proposal.v1`
 *   - Emit `3.renewal.candidate.v1` on detected renewal need
 *   - Emit `3.renewal.applied.v1` after a renewal is enacted (rollback-safe)
 *   - At Step 6 (govern), inspect the completed run and recommend whether the
 *     product's configuration, agent roster, or pipeline steps need
 *     renewal/update.
 *   - recommend_only: never mutates config or roster; the orchestrator (or W0)
 *     decides whether to enact recommendations.
 *
 * Architecture
 *   The agent NEVER shells out and NEVER persists outside the storage seams.
 *   Renewal analysis is a pure function over (run_summary, step_results) →
 *   { renewal_flags[], recommendation, confidence }.
 *
 *   Confidence model (intentionally simple — easy to evolve):
 *     no input or empty input            → 0.0
 *     ≥1 flag with severity='high'       → 0.9
 *     ≥1 flag with severity='medium'     → 0.6
 *     only severity='low' flags          → 0.4
 *     no flags + clean run               → 0.2  (advisory: nothing to renew)
 *
 * Storage seams (interfaces only — same as Agent #2):
 *   - hot   — HotStore   for in-flight renewal candidate state
 *   - cold  — ColdStore  for the canonical audit trail (lineage rows with
 *                         agentId=3, authority=recommend_only)
 *   - bus   — MessageBus for cross-agent comms (publish/subscribe only)
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

const HOT_TTL_SECONDS = 24 * 60 * 60;

const HOT_KEYS = Object.freeze({
  run: (runId) => `renewal:run:${runId}`,
});

// Severity ordering for confidence scoring.
const SEVERITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });

// Heuristics that map common run-summary signals into renewal flags. Each
// entry returns null (no flag) or an object { area, severity, reason }.
const HEURISTICS = Object.freeze([
  function buildFailures(summary) {
    const c = summary?.build_failure_count ?? summary?.failedSteps?.filter?.((s) => s === 'build')?.length ?? 0;
    if (typeof c === 'number' && c >= 2) {
      return { area: 'pipeline.build', severity: 'high', reason: `repeated build failures (${c})` };
    }
    if (typeof c === 'number' && c === 1) {
      return { area: 'pipeline.build', severity: 'medium', reason: 'build failed once' };
    }
    return null;
  },
  function auditIssues(summary) {
    const issues = summary?.audit_issues_count ?? summary?.auditIssues ?? 0;
    if (typeof issues === 'number' && issues >= 5) {
      return { area: 'config.quality', severity: 'high', reason: `audit raised ${issues} issues` };
    }
    if (typeof issues === 'number' && issues >= 1) {
      return { area: 'config.quality', severity: 'medium', reason: `audit raised ${issues} issue(s)` };
    }
    return null;
  },
  function anomalySeverity(summary) {
    const sev = summary?.anomaly_severity ?? summary?.anomalySeverity ?? null;
    if (sev === 'high') {
      return { area: 'monitor.anomaly', severity: 'high', reason: 'high-severity anomaly observed' };
    }
    if (sev === 'medium') {
      return { area: 'monitor.anomaly', severity: 'medium', reason: 'medium-severity anomaly observed' };
    }
    return null;
  },
  function evolutionProposal(summary) {
    const proposed = summary?.evolution_proposal ?? summary?.evolutionProposal ?? null;
    if (proposed && (typeof proposed === 'string' || typeof proposed === 'object')) {
      return { area: 'roster.evolution', severity: 'low', reason: 'pending product-evolution proposal' };
    }
    return null;
  },
  function staleConfig(summary) {
    const ageDays = summary?.config_age_days ?? summary?.configAgeDays ?? null;
    if (typeof ageDays === 'number' && ageDays >= 90) {
      return { area: 'config.staleness', severity: 'medium', reason: `config last updated ${ageDays}d ago` };
    }
    return null;
  },
]);

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent3SelfRenewal extends BaseAgent {
  /**
   * @type {3}
   */
  static charterId = 3;

  /**
   * BaseAgent.charter() contract — id 3 (Self-Renewal), embedded, recommend_only.
   * Sourced from `_registry.ts` so single-source-of-truth holds.
   */
  static charter() {
    const r = getAgent(3);
    if (!r) {
      throw new Error('Agent3SelfRenewal: registry entry for id=3 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false, // #3 is in EMBEDDED_AGENTS per BaseAgent.js
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials], // [] per spec
      marketplaceTools: [],
      consumes: [...r.consumes],
      produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    };
  }

  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.messageBus
   * @param {object} deps.auditLog
   * @param {{ now: () => number }} deps.clock
   * @param {string} deps.productScope
   * @param {string} deps.environment
   * @param {object} deps.hot     HotStore
   * @param {object} deps.cold    ColdStore
   */
  constructor(deps) {
    super(deps);
    if (!deps.hot) throw new Error('Agent3SelfRenewal: hot store required');
    if (!deps.cold) throw new Error('Agent3SelfRenewal: cold store required');
    if (!deps.messageBus) throw new Error('Agent3SelfRenewal: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;

    this._busHandles = [];
    this._busAttached = false;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan a renewal recommendation. Input shape:
   *   { kind: 'renewal.request', runId, run_summary?, step_results? }
   *
   * Returns a recommend_only plan: sideEffects always []; proposed events
   * always include exactly one `3.renewal.candidate.v1`.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'renewal.request') {
      throw new Error("Agent3SelfRenewal.plan: input.kind must be 'renewal.request'");
    }
    if (typeof input.runId !== 'string' || !input.runId) {
      throw new Error('Agent3SelfRenewal.plan: input.runId required');
    }

    const at = this.deps.clock.now();
    const analysis = analyzeRun(input.run_summary, input.step_results);

    return Object.freeze({
      summary:
        analysis.flags.length === 0
          ? `no renewal needed for run ${input.runId}`
          : `renewal recommended for run ${input.runId} (${analysis.flags.length} flag(s))`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: analysis.flags.length === 0 ? 'no_renewal_needed' : 'renewal_candidate',
      flags: analysis.flags,
      confidence: analysis.confidence,
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({
            topic: '3.renewal.candidate.v1',
            payload: Object.freeze({
              runId: input.runId,
              flags: Object.freeze([...analysis.flags.map(Object.freeze)]),
              confidence: analysis.confidence,
              at,
            }),
          }),
        ]),
      }),
    });
  }

  /**
   * Persist run state to HotStore, append lineage to ColdStore, publish the
   * renewal candidate. recommend_only: zero side effects beyond storage seams
   * (audit-only) + pub/sub.
   */
  async act(ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error('Agent3SelfRenewal.act: invalid plan');
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent3SelfRenewal.act: recommend_only forbids sideEffects');
    }

    const runId = ctx?.input?.runId ?? plan.proposed.emit[0]?.payload?.runId ?? 'unknown';
    const at = this.deps.clock.now();

    await this.hot.set(
      HOT_KEYS.run(runId),
      {
        runId,
        outcome: plan.outcome,
        flags: plan.flags,
        confidence: plan.confidence,
        at,
      },
      HOT_TTL_SECONDS,
    );

    await this.cold.append({
      runId,
      stepKey: 'govern',
      phase: plan.outcome === 'renewal_candidate' ? 'step.success' : 'step.success',
      at,
      agentId: 3,
      authority: AUTHORITY.RECOMMEND_ONLY,
      meta: {
        outcome: plan.outcome,
        flags: plan.flags,
        confidence: plan.confidence,
      },
    });

    for (const e of plan.proposed.emit) {
      this.bus.publish(e.topic, e.payload);
    }

    return {
      outcome: plan.outcome,
      sideEffects: [],
    };
  }

  // ── Step-owner recommendation API (PA #2.7) ───────────────────────────────

  /**
   * Renewal recommendation for the OrchestratorHub. recommend_only — never
   * executes side effects. Returns the canonical step-owner envelope plus
   * the dispatch-required fields (agent_name, mode, step, authority,
   * renewal_flags).
   *
   * Accepts ctx with either camelCase or snake_case keys, since callers
   * vary (Auto Runner uses camelCase; the dispatch spec quotes snake_case).
   *
   * Graceful null-handling: missing/null inputs return a low-confidence
   * envelope rather than throwing — the orchestrator never propagates
   * step-owner failures up to the caller.
   *
   * @param {object} [ctx]
   * @param {string} [ctx.runId]   — or ctx.run_id
   * @param {string} [ctx.productId]   — or ctx.product_id
   * @param {object} [ctx.run_summary]   — or ctx.runSummary, or ctx.stepInputs.run_summary
   * @param {object} [ctx.step_results]   — or ctx.stepResults
   * @returns {Promise<{
   *   agent_id: 3,
   *   agent_name: 'Self-Renewal',
   *   mode: 'step-owner',
   *   step: 6,
   *   authority: 'recommend_only',
   *   recommendation: string,
   *   renewal_flags: string[],
   *   confidence: number,
   *   metadata: object,
   * }>}
   */
  async recommend(ctx) {
    // Peer review must-fix #1: hostile getters on ctx properties (runId,
    // productId, run_summary, stepInputs, etc.) could throw BEFORE we reach
    // the analyzeRun try/catch, violating the recommend_only non-blocking
    // invariant. Wrap the entire extraction phase in its own try/catch so
    // the agent NEVER propagates an exception back to the orchestrator.
    let runId = null;
    let productId = null;
    let runSummary = null;
    let stepResults = null;
    try {
      const safe = ctx ?? {};
      runId = safe.runId ?? safe.run_id ?? null;
      productId = safe.productId ?? safe.product_id ?? null;
      const stepInputs = safe.stepInputs ?? null;
      runSummary =
        safe.run_summary ?? safe.runSummary ?? stepInputs?.run_summary ?? stepInputs?.runSummary ?? null;
      stepResults =
        safe.step_results ?? safe.stepResults ?? stepInputs?.step_results ?? stepInputs?.stepResults ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 3,
        agent_name: 'Self-Renewal',
        mode: 'step-owner',
        step: 6,
        authority: 'recommend_only',
        recommendation: `renewal extraction failed: ${msg}`,
        renewal_flags: Object.freeze([]),
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: msg,
          runId: null,
          productId: null,
        }),
      });
    }

    let analysis;
    try {
      analysis = analyzeRun(runSummary, stepResults);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 3,
        agent_name: 'Self-Renewal',
        mode: 'step-owner',
        step: 6,
        authority: 'recommend_only',
        recommendation: `renewal analysis failed: ${msg}`,
        renewal_flags: Object.freeze([]),
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: msg,
          runId,
          productId,
        }),
      });
    }

    const recommendation =
      analysis.flags.length === 0
        ? runSummary || stepResults
          ? 'no renewal needed — run looks healthy'
          : 'no renewal needed — insufficient signal to evaluate'
        : `renewal recommended in ${analysis.flags.length} area(s): ${analysis.flags.map((f) => f.area).join(', ')}`;

    return Object.freeze({
      agent_id: 3,
      agent_name: 'Self-Renewal',
      mode: 'step-owner',
      step: 6,
      authority: 'recommend_only',
      recommendation,
      renewal_flags: Object.freeze(analysis.flags.map((f) => f.area)),
      confidence: analysis.confidence,
      metadata: Object.freeze({
        ok: true,
        runId,
        productId,
        flag_details: Object.freeze(analysis.flags.map((f) => Object.freeze({ ...f }))),
        signals_observed: analysis.signalsObserved,
      }),
    });
  }

  // ── MessageBus subscription helpers ────────────────────────────────────────

  attachBusSubscriptions() {
    if (this._busAttached) return 0;
    const charter = Agent3SelfRenewal.charter();
    let n = 0;
    for (const topic of charter.consumes) {
      const off = this.bus.subscribe(topic, async (payload, meta) => {
        const runId =
          (payload && typeof payload.runId === 'string' && payload.runId) || 'unknown';
        try {
          await this.cold.append({
            runId,
            stepKey: 'govern',
            phase: 'route.decision',
            at: this.deps.clock.now(),
            agentId: 3,
            authority: AUTHORITY.RECOMMEND_ONLY,
            meta: { observedTopic: topic, busSeq: meta?.seq ?? null },
          });
        } catch {
          /* swallow — bus delivery must not throw */
        }
      });
      this._busHandles.push(off);
      n++;
    }
    this._busAttached = true;
    return n;
  }

  detachBusSubscriptions() {
    while (this._busHandles.length > 0) {
      const off = this._busHandles.pop();
      try { off?.(); } catch { /* already-unsubscribed */ }
    }
    this._busAttached = false;
  }
}

// ── Pure analysis (testable in isolation) ──────────────────────────────────

/**
 * Pure function over (run_summary, step_results) → { flags[], confidence,
 * signalsObserved }. Never throws on null/undefined inputs — returns an empty
 * flags list and 0 confidence.
 *
 * @param {object|null|undefined} runSummary
 * @param {object|Array|null|undefined} stepResults
 * @returns {{ flags: Array<{area: string, severity: string, reason: string}>, confidence: number, signalsObserved: number }}
 */
export function analyzeRun(runSummary, stepResults) {
  let summary;
  try {
    summary = mergeSignals(runSummary, stepResults);
  } catch {
    // Hostile input (e.g. throwing getter) — treat as no signal.
    summary = null;
  }
  const signalsObserved = summary === null ? 0 : Object.keys(summary).length;

  if (signalsObserved === 0) {
    return { flags: [], confidence: 0, signalsObserved: 0 };
  }

  const flags = [];
  for (const h of HEURISTICS) {
    let f;
    try {
      f = h(summary);
    } catch {
      // A misbehaving heuristic must never poison the analysis. Skip it.
      f = null;
    }
    if (f) flags.push(f);
  }

  let confidence;
  if (flags.length === 0) {
    confidence = 0.2; // signal observed, nothing to renew
  } else {
    const maxRank = flags.reduce((m, f) => Math.max(m, SEVERITY_RANK[f.severity] ?? 0), 0);
    if (maxRank >= 3) confidence = 0.9;
    else if (maxRank === 2) confidence = 0.6;
    else confidence = 0.4;
  }

  return { flags, confidence, signalsObserved };
}

/**
 * Merge run_summary and step_results into a single flat-ish bag of signals
 * the heuristics can probe. Step results are folded into derived counters
 * (failedSteps[], audit_issues_count) so the heuristics can stay simple.
 *
 * Returns null if both inputs are null/undefined/empty.
 */
function mergeSignals(runSummary, stepResults) {
  const out = {};
  let hasAny = false;

  if (runSummary && typeof runSummary === 'object' && !Array.isArray(runSummary)) {
    for (const [k, v] of Object.entries(runSummary)) {
      out[k] = v;
      hasAny = true;
    }
  }

  if (Array.isArray(stepResults) && stepResults.length > 0) {
    const failed = stepResults.filter((s) => s && (s.status === 'failed' || s.outcome === 'failed'));
    const issues = stepResults.reduce(
      (acc, s) => acc + (typeof s?.issues === 'number' ? s.issues : 0),
      0,
    );
    if (failed.length > 0) {
      out.failedSteps = failed.map((s) => s.step ?? s.key ?? null).filter(Boolean);
      out.build_failure_count =
        (out.build_failure_count ?? 0) + failed.filter((s) => (s.step ?? s.key) === 'build').length;
    }
    if (issues > 0 && (out.audit_issues_count ?? null) === null) {
      out.audit_issues_count = issues;
    }
    hasAny = true;
  } else if (stepResults && typeof stepResults === 'object' && !Array.isArray(stepResults)) {
    for (const [k, v] of Object.entries(stepResults)) {
      if (!(k in out)) out[k] = v;
      hasAny = true;
    }
  }

  return hasAny ? out : null;
}

// Exported for unit tests only — not part of the public API.
export const __test = { analyzeRun, mergeSignals, HEURISTICS, SEVERITY_RANK };
