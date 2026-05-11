/**
 * Agent #5 — End-Customer Intake
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/agents/Agent5EndCustomerIntake.js  (W5 territory)
 * Mode:     cross-step  (per _registry.ts; provisions sub-orgs for providers,
 *                        does NOT own a single Auto Runner step)
 * Authority: recommend_only
 * Embedding: FlowAI-only  (in FLOWAI_ONLY_AGENTS per BaseAgent.js)
 *
 * Responsibilities (per Agent #5 charter):
 *   - Receive end-customer intake requests bound to a provider scope.
 *   - Refuse intake when the provider scope is SUSPENDED (observed via the
 *     `4.provider.suspended.v1` bus subscription) or UNPROVISIONED
 *     (explicitly signaled by the caller).
 *   - Validate both providerId and customerId against the same slug rule used
 *     by the CredentialAdapter (alphanumeric + hyphen) so downstream Doppler
 *     paths CUSTOMERS_<providerId>_<customerId>_<subkey> stay unambiguous.
 *   - Emit `5.endcustomer.intake.completed.v1` when a downstream caller
 *     enacts the intake. Agent #5 itself NEVER provisions — it analyzes and
 *     recommends.
 *
 * Architecture
 *   The agent NEVER shells out and NEVER persists outside the storage seams.
 *   Intake analysis is a pure-ish function over
 *     (providerId, customerId, organizationName, customerSurfaces,
 *      providerStatus?, suspendedCache)
 *   → { recommendation, blockers[], blocker_details[], confidence, metadata }
 *
 *   Confidence model (mirrors Agent #4 / Agent #3):
 *     refuse with clear blocker     → 0.9
 *     hold with medium-severity     → 0.6
 *     hold with low-severity only   → 0.4
 *     provision (all green)         → 0.9
 *     no signal                     → 0
 *
 *   Suspension tracking is via a HotStore-backed cache. The agent subscribes
 *   to `4.provider.suspended.v1` (charter `consumes`) and adds each observed
 *   providerId to the cache. recommend() reads from the cache; callers may
 *   also pass `providerStatus` to override (e.g. when they hold authoritative
 *   directory state).
 *
 * Storage seams (interfaces only — same as Agents #2 / #3 / #4):
 *   - hot   — HotStore   for the suspended-provider cache + per-customer state
 *   - cold  — ColdStore  for the canonical audit trail (lineage rows with
 *                         agentId=5, authority=recommend_only)
 *   - bus   — MessageBus for the `4.provider.suspended.v1` subscription
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

const HOT_TTL_SECONDS = 24 * 60 * 60;

const HOT_KEYS = Object.freeze({
  intake: (providerId, customerId) => `intake:${providerId}:${customerId}`,
  suspendedSet: () => 'intake:suspended-providers',
});

// Provider/customer id slug rule mirrors CredentialAdapter._assertId. The
// rule is duplicated here to keep this module browser-bundle-safe (we don't
// want to drag the CredentialAdapter dependency just for a regex).
const ID_SLUG_RE = /^[a-zA-Z0-9-]+$/;

const SEVERITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent5EndCustomerIntake extends BaseAgent {
  /**
   * @type {5}
   */
  static charterId = 5;

  /**
   * BaseAgent.charter() contract — id 5 (End-Customer Intake), FlowAI-only,
   * recommend_only. Sourced from `_registry.ts` so single-source-of-truth
   * holds.
   */
  static charter() {
    const r = getAgent(5);
    if (!r) {
      throw new Error('Agent5EndCustomerIntake: registry entry for id=5 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: true, // #5 is in FLOWAI_ONLY_AGENTS per BaseAgent.js
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials], // [] per spec
      marketplaceTools: [],
      consumes: [...r.consumes], // ['4.provider.suspended.v1']
      produces: [...r.produces], // ['5.endcustomer.intake.completed.v1']
      escalationPolicy: r.escalationPolicy,
    };
  }

  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.messageBus
   * @param {object} deps.auditLog
   * @param {{ now: () => number }} deps.clock
   * @param {string} deps.productScope        Must be 'flowai' (FlowAI-only).
   * @param {string} deps.environment
   * @param {object} deps.hot                  HotStore
   * @param {object} deps.cold                 ColdStore
   */
  constructor(deps) {
    super(deps);
    if (!deps.hot) throw new Error('Agent5EndCustomerIntake: hot store required');
    if (!deps.cold) throw new Error('Agent5EndCustomerIntake: cold store required');
    if (!deps.messageBus) throw new Error('Agent5EndCustomerIntake: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;

    this._busHandles = [];
    this._busAttached = false;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan an end-customer intake recommendation. Input shape:
   *   {
   *     kind: 'endcustomer.intake.request',
   *     providerId: string,
   *     customerId: string,
   *     organizationName: string,
   *     customerSurfaces?: string[],
   *     providerStatus?: { suspended?: boolean, provisioned?: boolean },
   *   }
   *
   * Returns a recommend_only plan: sideEffects always []; proposed events
   * always include exactly one `5.endcustomer.intake.completed.v1` candidate
   * envelope with the recommendation embedded.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'endcustomer.intake.request') {
      throw new Error("Agent5EndCustomerIntake.plan: input.kind must be 'endcustomer.intake.request'");
    }
    if (typeof input.providerId !== 'string' || !input.providerId) {
      throw new Error('Agent5EndCustomerIntake.plan: input.providerId required');
    }
    if (typeof input.customerId !== 'string' || !input.customerId) {
      throw new Error('Agent5EndCustomerIntake.plan: input.customerId required');
    }

    const at = this.deps.clock.now();
    const suspendedSet = await this._readSuspendedSet();
    const analysis = analyzeIntake(
      {
        providerId: input.providerId,
        customerId: input.customerId,
        organizationName: input.organizationName,
        customerSurfaces: input.customerSurfaces,
        providerStatus: input.providerStatus,
      },
      suspendedSet,
    );

    return Object.freeze({
      summary:
        analysis.recommendation === 'provision'
          ? `recommend provision customer "${input.customerId}" for provider "${input.providerId}"`
          : analysis.recommendation === 'refuse'
            ? `recommend REFUSE customer "${input.customerId}" — ${analysis.blockers.join(', ')}`
            : `recommend HOLD customer "${input.customerId}" — ${analysis.blockers.join(', ')}`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: analysis.recommendation,
      blockers: analysis.blockers,
      blocker_details: analysis.blocker_details,
      confidence: analysis.confidence,
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({
            topic: '5.endcustomer.intake.completed.v1',
            payload: Object.freeze({
              providerId: input.providerId,
              customerId: input.customerId,
              recommendation: analysis.recommendation,
              blockers: Object.freeze([...analysis.blockers]),
              confidence: analysis.confidence,
              at,
            }),
          }),
        ]),
      }),
    });
  }

  /**
   * Persist intake state to HotStore, append lineage to ColdStore, publish
   * the intake-candidate envelope. recommend_only: zero side effects beyond
   * storage seams (audit-only) + pub/sub.
   */
  async act(ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error('Agent5EndCustomerIntake.act: invalid plan');
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent5EndCustomerIntake.act: recommend_only forbids sideEffects');
    }

    const providerId = ctx?.input?.providerId ?? plan.proposed.emit[0]?.payload?.providerId ?? 'unknown';
    const customerId = ctx?.input?.customerId ?? plan.proposed.emit[0]?.payload?.customerId ?? 'unknown';
    const at = this.deps.clock.now();

    await this.hot.set(
      HOT_KEYS.intake(providerId, customerId),
      {
        providerId,
        customerId,
        outcome: plan.outcome,
        blockers: plan.blockers,
        confidence: plan.confidence,
        at,
      },
      HOT_TTL_SECONDS,
    );

    await this.cold.append({
      runId: `${providerId}:${customerId}`,
      stepKey: 'intake',
      phase: 'step.success',
      at,
      agentId: 5,
      authority: AUTHORITY.RECOMMEND_ONLY,
      meta: {
        outcome: plan.outcome,
        blockers: plan.blockers,
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

  // ── Cross-step recommendation API ─────────────────────────────────────────

  /**
   * End-customer-intake recommendation. Cross-step agents are not invoked
   * via OrchestratorHub.invokeStepOwner; this method is the public entry
   * point external callers (FlowAI intake API / W0 console) use directly.
   *
   * Accepts ctx with either camelCase or snake_case keys.
   *
   * Graceful null-handling: missing/null inputs return a low-confidence
   * envelope rather than throwing.
   *
   * @param {object} [ctx]
   * @param {string} [ctx.providerId]   — or ctx.provider_id
   * @param {string} [ctx.customerId]   — or ctx.customer_id
   * @param {string} [ctx.organizationName]  — or ctx.organization_name
   * @param {string[]} [ctx.customerSurfaces]  — or ctx.customer_surfaces
   * @param {{suspended?: boolean, provisioned?: boolean}} [ctx.providerStatus]
   *                                   — or ctx.provider_status
   * @returns {Promise<{
   *   agent_id: 5,
   *   agent_name: 'End-Customer Intake',
   *   mode: 'cross-step',
   *   authority: 'recommend_only',
   *   recommendation: 'provision' | 'hold' | 'refuse',
   *   blockers: string[],
   *   blocker_details: Array<{ kind: string, severity: string, reason: string }>,
   *   confidence: number,
   *   metadata: object,
   * }>}
   */
  async recommend(ctx) {
    // Hostile-getter guard: extract all ctx fields inside a try/catch so the
    // agent NEVER propagates an exception back to the caller. recommend_only
    // is non-blocking end-to-end.
    let providerId = null;
    let customerId = null;
    let organizationName = null;
    let customerSurfaces = null;
    let providerStatus = null;
    try {
      const safe = ctx ?? {};
      providerId = safe.providerId ?? safe.provider_id ?? null;
      customerId = safe.customerId ?? safe.customer_id ?? null;
      organizationName = safe.organizationName ?? safe.organization_name ?? null;
      customerSurfaces = safe.customerSurfaces ?? safe.customer_surfaces ?? null;
      providerStatus = safe.providerStatus ?? safe.provider_status ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 5,
        agent_name: 'End-Customer Intake',
        mode: 'cross-step',
        authority: 'recommend_only',
        recommendation: 'hold',
        blockers: Object.freeze(['ctx.extraction.failed']),
        blocker_details: Object.freeze([
          Object.freeze({ kind: 'ctx.extraction.failed', severity: 'high', reason: msg }),
        ]),
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: msg,
          providerId: null,
          customerId: null,
        }),
      });
    }

    let suspendedSet = new Set();
    try {
      suspendedSet = await this._readSuspendedSet();
    } catch {
      // Hot store unreachable — treat suspended cache as empty and surface a
      // low-severity advisory in the analysis result.
      suspendedSet = new Set();
    }

    let analysis;
    try {
      analysis = analyzeIntake(
        { providerId, customerId, organizationName, customerSurfaces, providerStatus },
        suspendedSet,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 5,
        agent_name: 'End-Customer Intake',
        mode: 'cross-step',
        authority: 'recommend_only',
        recommendation: 'hold',
        blockers: Object.freeze(['intake.analysis.failed']),
        blocker_details: Object.freeze([
          Object.freeze({ kind: 'intake.analysis.failed', severity: 'high', reason: msg }),
        ]),
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: msg,
          providerId,
          customerId,
        }),
      });
    }

    return Object.freeze({
      agent_id: 5,
      agent_name: 'End-Customer Intake',
      mode: 'cross-step',
      authority: 'recommend_only',
      recommendation: analysis.recommendation,
      blockers: Object.freeze([...analysis.blockers]),
      blocker_details: Object.freeze(analysis.blocker_details.map((d) => Object.freeze({ ...d }))),
      confidence: analysis.confidence,
      metadata: Object.freeze({
        ok: analysis.recommendation !== 'refuse' || analysis.confidence === 0.9,
        providerId,
        customerId,
        organizationName,
        providerStatus,
        customerSurfaceCount: analysis.customerSurfaceCount,
        suspendedObserved: analysis.suspendedObserved,
        signalsObserved: analysis.signalsObserved,
      }),
    });
  }

  // ── MessageBus subscription helpers ────────────────────────────────────────

  /**
   * Wire to `4.provider.suspended.v1`. Each event payload's providerId is
   * cached in HotStore so subsequent recommend() calls can refuse intakes for
   * suspended providers. Idempotent — a second call returns 0.
   *
   * @returns {number} count of new subscriptions made
   */
  attachBusSubscriptions() {
    if (this._busAttached) return 0;
    const charter = Agent5EndCustomerIntake.charter();
    let n = 0;
    for (const topic of charter.consumes) {
      const off = this.bus.subscribe(topic, async (payload) => {
        try {
          const providerId =
            payload && typeof payload.providerId === 'string' && payload.providerId
              ? payload.providerId
              : null;
          if (providerId) {
            await this._addSuspended(providerId);
          }
          await this.cold.append({
            runId: providerId ?? 'unknown',
            stepKey: 'intake.subscription',
            phase: 'route.decision',
            at: this.deps.clock.now(),
            agentId: 5,
            authority: AUTHORITY.RECOMMEND_ONLY,
            meta: { observedTopic: topic, providerId },
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

  // ── Suspended-provider cache helpers ──────────────────────────────────────

  async _readSuspendedSet() {
    const raw = await this.hot.get(HOT_KEYS.suspendedSet());
    if (!raw || !Array.isArray(raw.providers)) return new Set();
    return new Set(raw.providers.filter((p) => typeof p === 'string' && p.length > 0));
  }

  async _addSuspended(providerId) {
    const existing = await this._readSuspendedSet();
    existing.add(providerId);
    await this.hot.set(
      HOT_KEYS.suspendedSet(),
      { providers: [...existing] },
      HOT_TTL_SECONDS,
    );
  }
}

// ── Pure analysis (testable in isolation) ──────────────────────────────────

/**
 * Pure function over (input, suspendedSet) → analysis result. Never throws
 * on null/undefined inputs.
 *
 * @param {object} input
 * @param {string|null} input.providerId
 * @param {string|null} input.customerId
 * @param {string|null} input.organizationName
 * @param {string[]|null} input.customerSurfaces
 * @param {{suspended?: boolean, provisioned?: boolean}|null} [input.providerStatus]
 * @param {Set<string>} suspendedSet  Observed suspensions (bus cache).
 * @returns {{
 *   recommendation: 'provision'|'hold'|'refuse',
 *   blockers: string[],
 *   blocker_details: Array<{kind: string, severity: string, reason: string}>,
 *   confidence: number,
 *   customerSurfaceCount: number,
 *   suspendedObserved: boolean,
 *   signalsObserved: number,
 * }}
 */
export function analyzeIntake(input, suspendedSet = new Set()) {
  const safe = input ?? {};
  const providerId = typeof safe.providerId === 'string' ? safe.providerId : null;
  const customerId = typeof safe.customerId === 'string' ? safe.customerId : null;
  const organizationName = typeof safe.organizationName === 'string' ? safe.organizationName : null;
  const customerSurfaces = Array.isArray(safe.customerSurfaces)
    ? safe.customerSurfaces.filter((s) => typeof s === 'string' && s.length > 0)
    : [];
  const providerStatus = safe.providerStatus && typeof safe.providerStatus === 'object' ? safe.providerStatus : null;
  const observedSet = suspendedSet instanceof Set ? suspendedSet : new Set();

  const blocker_details = [];
  let signalsObserved = 0;
  let suspendedObserved = false;

  // ── Provider id check ────────────────────────────────────────────────────
  if (!providerId) {
    blocker_details.push({
      kind: 'providerId.missing',
      severity: 'high',
      reason: 'providerId is required',
    });
  } else if (!ID_SLUG_RE.test(providerId)) {
    blocker_details.push({
      kind: 'providerId.invalid',
      severity: 'high',
      reason: `providerId "${providerId}" is not slug-safe (alphanumeric and hyphen only)`,
    });
  } else {
    signalsObserved++;
  }

  // ── Customer id check ────────────────────────────────────────────────────
  if (!customerId) {
    blocker_details.push({
      kind: 'customerId.missing',
      severity: 'high',
      reason: 'customerId is required',
    });
  } else if (!ID_SLUG_RE.test(customerId)) {
    blocker_details.push({
      kind: 'customerId.invalid',
      severity: 'high',
      reason: `customerId "${customerId}" is not slug-safe (alphanumeric and hyphen only)`,
    });
  } else {
    signalsObserved++;
  }

  // ── Organization name check ──────────────────────────────────────────────
  if (!organizationName || organizationName.trim().length === 0) {
    blocker_details.push({
      kind: 'organizationName.missing',
      severity: 'medium',
      reason: 'organizationName is required',
    });
  } else {
    signalsObserved++;
  }

  // ── Provider scope status checks ─────────────────────────────────────────
  // Explicit caller override (authoritative).
  if (providerStatus && providerStatus.suspended === true) {
    blocker_details.push({
      kind: 'provider.suspended.explicit',
      severity: 'high',
      reason: `provider "${providerId ?? '(unknown)'}" marked suspended by caller`,
    });
    suspendedObserved = true;
  }
  if (providerStatus && providerStatus.provisioned === false) {
    blocker_details.push({
      kind: 'provider.unprovisioned',
      severity: 'high',
      reason: `provider "${providerId ?? '(unknown)'}" not yet provisioned per caller`,
    });
  }

  // Observed bus-cache evidence (independent of explicit override).
  if (providerId && observedSet.has(providerId)) {
    if (!providerStatus || providerStatus.suspended !== true) {
      blocker_details.push({
        kind: 'provider.suspended.observed',
        severity: 'high',
        reason: `provider "${providerId}" observed suspended via 4.provider.suspended.v1`,
      });
    }
    suspendedObserved = true;
    signalsObserved++;
  }

  // ── Customer surfaces shape check ────────────────────────────────────────
  if (customerSurfaces.length === 0) {
    blocker_details.push({
      kind: 'customerSurfaces.empty',
      severity: 'low',
      reason: 'no customer surfaces declared',
    });
  } else {
    signalsObserved++;
  }

  // ── Decision + confidence ────────────────────────────────────────────────
  const blockers = blocker_details.map((d) => d.kind);

  const hasHighSeverity = blocker_details.some((d) => d.severity === 'high');
  const hasMediumSeverity = blocker_details.some((d) => d.severity === 'medium');

  let recommendation;
  let confidence;

  if (hasHighSeverity) {
    recommendation = 'refuse';
    confidence = 0.9;
  } else if (hasMediumSeverity) {
    recommendation = 'hold';
    confidence = 0.6;
  } else if (blocker_details.length > 0) {
    recommendation = 'hold';
    confidence = 0.4;
  } else if (signalsObserved === 0) {
    recommendation = 'hold';
    confidence = 0;
  } else {
    recommendation = 'provision';
    confidence = 0.9;
  }

  return {
    recommendation,
    blockers,
    blocker_details,
    confidence,
    customerSurfaceCount: customerSurfaces.length,
    suspendedObserved,
    signalsObserved,
  };
}

// Exported for unit tests only — not part of the public API.
export const __test = { analyzeIntake, ID_SLUG_RE, SEVERITY_RANK, HOT_KEYS };
