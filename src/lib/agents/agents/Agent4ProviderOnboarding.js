/**
 * Agent #4 — Provider Onboarding
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/agents/Agent4ProviderOnboarding.js  (W5 territory)
 * Mode:     cross-step  (per _registry.ts; intervenes across pipeline steps,
 *                        does NOT own a single Auto Runner step)
 * Authority: recommend_only
 * Embedding: FlowAI-only  (in FLOWAI_ONLY_AGENTS per BaseAgent.js)
 *
 * Responsibilities (per Agent #4 charter):
 *   - Receive provider-activation requests from FlowAI onboarding UI / API.
 *   - Probe each declared credential via the injected CredentialAdapter so
 *     activation never completes before keys exist (per D-007 in the W2
 *     defect register).
 *   - Refuse activation when the providerId is not slug-safe (would create
 *     ambiguous Doppler secret paths).
 *   - Emit `4.provider.onboarded.v1` when a downstream caller enacts the
 *     activation; emit `4.provider.suspended.v1` when a downstream caller
 *     enacts a suspension. Agent #4 itself NEVER mutates provider state — it
 *     analyzes inputs and returns a structured recommendation envelope.
 *
 * Architecture
 *   The agent NEVER shells out and NEVER persists outside the storage seams.
 *   Onboarding analysis is a pure function over
 *     (providerId, organizationName, credentialKeys[], productSurfaces[],
 *      credentialAdapter)
 *   → { recommendation, blockers[], confidence, metadata }
 *
 *   Confidence model (mirrors Agent #3 simplicity — easy to evolve):
 *     no input or empty input            → 0.0
 *     refuse with clear blocker          → 0.9  (high confidence in refusal)
 *     hold with credentials missing      → 0.6
 *     hold with credentials only expected→ 0.4  (W1 wiring pending)
 *     hold with surfaces empty only      → 0.4
 *     activate (all green)               → 0.9
 *
 * Storage seams (interfaces only — same as Agents #2 / #3):
 *   - hot   — HotStore   for in-flight onboarding state
 *   - cold  — ColdStore  for canonical audit trail (lineage rows with
 *                         agentId=4, authority=recommend_only)
 *   - bus   — MessageBus for cross-agent comms (publish/subscribe only)
 *   - credentialAdapter — opaque adapter exposing probe(key) → 'present' |
 *                         'expected' | 'missing'. Injected at construction.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

const HOT_TTL_SECONDS = 24 * 60 * 60;

const HOT_KEYS = Object.freeze({
  request: (providerId) => `onboarding:provider:${providerId}`,
});

// Provider-id slug rule mirrors CredentialAdapter._assertId — alphanumeric +
// hyphen only. Underscores are forbidden because they would create ambiguous
// Doppler secret paths like PROVIDERS_<id>_<subkey>.
const PROVIDER_ID_SLUG_RE = /^[a-zA-Z0-9-]+$/;

const SEVERITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3 });

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent4ProviderOnboarding extends BaseAgent {
  /**
   * @type {4}
   */
  static charterId = 4;

  /**
   * BaseAgent.charter() contract — id 4 (Provider Onboarding), FlowAI-only,
   * recommend_only. Sourced from `_registry.ts` so single-source-of-truth
   * holds.
   */
  static charter() {
    const r = getAgent(4);
    if (!r) {
      throw new Error('Agent4ProviderOnboarding: registry entry for id=4 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: true, // #4 is in FLOWAI_ONLY_AGENTS per BaseAgent.js
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials], // [] per spec
      marketplaceTools: [],
      consumes: [...r.consumes], // [] per spec
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
   * @param {string} deps.productScope        Must be 'flowai' (FlowAI-only).
   * @param {string} deps.environment
   * @param {object} deps.hot                  HotStore
   * @param {object} deps.cold                 ColdStore
   * @param {object} [deps.credentialAdapter]  Adapter exposing probe(key).
   *                                           Optional — when absent, the
   *                                           agent surfaces credential
   *                                           status as 'unknown' and emits a
   *                                           low-confidence hold envelope
   *                                           rather than throwing.
   */
  constructor(deps) {
    super(deps);
    if (!deps.hot) throw new Error('Agent4ProviderOnboarding: hot store required');
    if (!deps.cold) throw new Error('Agent4ProviderOnboarding: cold store required');
    if (!deps.messageBus) throw new Error('Agent4ProviderOnboarding: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;
    this.credentialAdapter = deps.credentialAdapter ?? null;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan a provider-onboarding recommendation. Input shape:
   *   {
   *     kind: 'provider.onboard.request',
   *     providerId: string,            // slug-safe
   *     organizationName: string,
   *     credentialKeys?: string[],      // keys to probe via CredentialAdapter
   *     productSurfaces?: string[],     // light shape check only
   *     metadata?: object,
   *   }
   *
   * Returns a recommend_only plan: sideEffects always []; proposed events
   * always include exactly one `4.provider.onboarded.v1` candidate envelope
   * with the recommendation embedded. The plan itself never enacts; an
   * external orchestrator decides whether to publish the activation.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'provider.onboard.request') {
      throw new Error("Agent4ProviderOnboarding.plan: input.kind must be 'provider.onboard.request'");
    }
    if (typeof input.providerId !== 'string' || !input.providerId) {
      throw new Error('Agent4ProviderOnboarding.plan: input.providerId required');
    }

    const at = this.deps.clock.now();
    const analysis = await analyzeOnboarding(
      {
        providerId: input.providerId,
        organizationName: input.organizationName,
        credentialKeys: input.credentialKeys,
        productSurfaces: input.productSurfaces,
      },
      this.credentialAdapter,
    );

    return Object.freeze({
      summary:
        analysis.recommendation === 'activate'
          ? `recommend activate provider "${input.providerId}"`
          : analysis.recommendation === 'refuse'
            ? `recommend REFUSE provider "${input.providerId}" — ${analysis.blockers.join(', ')}`
            : `recommend HOLD provider "${input.providerId}" — ${analysis.blockers.join(', ')}`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: analysis.recommendation,
      blockers: analysis.blockers,
      blocker_details: analysis.blocker_details,
      confidence: analysis.confidence,
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({
            topic: '4.provider.onboarded.v1',
            payload: Object.freeze({
              providerId: input.providerId,
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
   * Persist onboarding state to HotStore, append lineage to ColdStore,
   * publish the onboarding-candidate envelope. recommend_only: zero side
   * effects beyond storage seams (audit-only) + pub/sub.
   */
  async act(ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error('Agent4ProviderOnboarding.act: invalid plan');
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent4ProviderOnboarding.act: recommend_only forbids sideEffects');
    }

    const providerId = ctx?.input?.providerId ?? plan.proposed.emit[0]?.payload?.providerId ?? 'unknown';
    const at = this.deps.clock.now();

    await this.hot.set(
      HOT_KEYS.request(providerId),
      {
        providerId,
        outcome: plan.outcome,
        blockers: plan.blockers,
        confidence: plan.confidence,
        at,
      },
      HOT_TTL_SECONDS,
    );

    await this.cold.append({
      runId: providerId, // cross-step: provider id stands in for runId in the lineage trail
      stepKey: 'onboarding',
      phase: 'step.success',
      at,
      agentId: 4,
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
   * Provider-onboarding recommendation. Cross-step agents are not invoked via
   * OrchestratorHub.invokeStepOwner; this method is the public entrypoint
   * external callers (FlowAI onboarding API / W0 console) use directly.
   *
   * Accepts ctx with either camelCase or snake_case keys, since callers vary.
   *
   * Graceful null-handling: missing/null inputs return a low-confidence
   * envelope rather than throwing.
   *
   * @param {object} [ctx]
   * @param {string} [ctx.providerId]   — or ctx.provider_id
   * @param {string} [ctx.organizationName]  — or ctx.organization_name
   * @param {string[]} [ctx.credentialKeys]  — or ctx.credential_keys
   * @param {string[]} [ctx.productSurfaces] — or ctx.product_surfaces
   * @returns {Promise<{
   *   agent_id: 4,
   *   agent_name: 'Provider Onboarding',
   *   mode: 'cross-step',
   *   authority: 'recommend_only',
   *   recommendation: 'activate' | 'hold' | 'refuse',
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
    let organizationName = null;
    let credentialKeys = null;
    let productSurfaces = null;
    try {
      const safe = ctx ?? {};
      providerId = safe.providerId ?? safe.provider_id ?? null;
      organizationName = safe.organizationName ?? safe.organization_name ?? null;
      credentialKeys = safe.credentialKeys ?? safe.credential_keys ?? null;
      productSurfaces = safe.productSurfaces ?? safe.product_surfaces ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 4,
        agent_name: 'Provider Onboarding',
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
          organizationName: null,
        }),
      });
    }

    let analysis;
    try {
      analysis = await analyzeOnboarding(
        { providerId, organizationName, credentialKeys, productSurfaces },
        this.credentialAdapter,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 4,
        agent_name: 'Provider Onboarding',
        mode: 'cross-step',
        authority: 'recommend_only',
        recommendation: 'hold',
        blockers: Object.freeze(['onboarding.analysis.failed']),
        blocker_details: Object.freeze([
          Object.freeze({ kind: 'onboarding.analysis.failed', severity: 'high', reason: msg }),
        ]),
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: msg,
          providerId,
          organizationName,
        }),
      });
    }

    return Object.freeze({
      agent_id: 4,
      agent_name: 'Provider Onboarding',
      mode: 'cross-step',
      authority: 'recommend_only',
      recommendation: analysis.recommendation,
      blockers: Object.freeze([...analysis.blockers]),
      blocker_details: Object.freeze(analysis.blocker_details.map((d) => Object.freeze({ ...d }))),
      confidence: analysis.confidence,
      metadata: Object.freeze({
        ok: analysis.recommendation !== 'refuse' || analysis.confidence === 0.9,
        providerId,
        organizationName,
        credentialStatus: Object.freeze({ ...analysis.credentialStatus }),
        productSurfaceCount: analysis.productSurfaceCount,
        signalsObserved: analysis.signalsObserved,
      }),
    });
  }

  // ── MessageBus subscription helpers ────────────────────────────────────────
  //
  // Agent #4 has empty `consumes` in the registry, so this is a no-op today.
  // Kept for parity with other agents and for future expansion (e.g. if #4
  // grows to consume `4.provider.suspended.v1` echoes from W0).

  attachBusSubscriptions() {
    const charter = Agent4ProviderOnboarding.charter();
    let n = 0;
    for (const topic of charter.consumes) {
      // unreachable today; defensive parity with Agent #3.
      this.bus.subscribe(topic, async () => {});
      n++;
    }
    return n;
  }
}

// ── Pure analysis (testable in isolation) ──────────────────────────────────

/**
 * Pure function over (input, credentialAdapter) → analysis result. Never
 * throws on null/undefined/hostile inputs — returns a low-confidence hold
 * envelope.
 *
 * @param {object} input
 * @param {string|null} input.providerId
 * @param {string|null} input.organizationName
 * @param {string[]|null} input.credentialKeys
 * @param {string[]|null} input.productSurfaces
 * @param {object|null} adapter   Optional CredentialAdapter-like with probe(key).
 * @returns {Promise<{
 *   recommendation: 'activate'|'hold'|'refuse',
 *   blockers: string[],
 *   blocker_details: Array<{kind: string, severity: string, reason: string}>,
 *   confidence: number,
 *   credentialStatus: Record<string, string>,
 *   productSurfaceCount: number,
 *   signalsObserved: number,
 * }>}
 */
export async function analyzeOnboarding(input, adapter) {
  const safe = input ?? {};
  const providerId = typeof safe.providerId === 'string' ? safe.providerId : null;
  const organizationName = typeof safe.organizationName === 'string' ? safe.organizationName : null;
  const credentialKeys = Array.isArray(safe.credentialKeys) ? safe.credentialKeys.filter((k) => typeof k === 'string' && k.length > 0) : [];
  const productSurfaces = Array.isArray(safe.productSurfaces) ? safe.productSurfaces.filter((s) => typeof s === 'string' && s.length > 0) : [];

  const blocker_details = [];
  const credentialStatus = {};
  let signalsObserved = 0;

  // ── Provider id check ────────────────────────────────────────────────────
  if (!providerId) {
    blocker_details.push({
      kind: 'providerId.missing',
      severity: 'high',
      reason: 'providerId is required',
    });
  } else if (!PROVIDER_ID_SLUG_RE.test(providerId)) {
    blocker_details.push({
      kind: 'providerId.invalid',
      severity: 'high',
      reason: `providerId "${providerId}" is not slug-safe (alphanumeric and hyphen only)`,
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

  // ── Credential probes ────────────────────────────────────────────────────
  let credentialAdapterAvailable = adapter && typeof adapter.probe === 'function';
  if (credentialKeys.length > 0 && !credentialAdapterAvailable) {
    // Cannot probe; surface as a low-severity uncertainty (the agent shouldn't
    // refuse just because the host didn't wire an adapter — that's a hold).
    blocker_details.push({
      kind: 'credentialAdapter.unavailable',
      severity: 'medium',
      reason: 'credentialAdapter not injected; cannot probe declared credentials',
    });
    for (const key of credentialKeys) credentialStatus[key] = 'unknown';
  } else if (credentialAdapterAvailable && credentialKeys.length > 0) {
    for (const key of credentialKeys) {
      let status = 'unknown';
      try {
        const r = await adapter.probe(key);
        status = typeof r === 'string' ? r : 'unknown';
      } catch (e) {
        // Adapter threw — degrade to 'unknown' and add a blocker.
        const msg = e instanceof Error ? e.message : String(e);
        blocker_details.push({
          kind: 'credentialAdapter.probeError',
          severity: 'medium',
          reason: `probe("${key}") threw: ${msg}`,
        });
        status = 'unknown';
      }
      credentialStatus[key] = status;
      signalsObserved++;
    }

    const statuses = Object.values(credentialStatus);
    if (statuses.includes('missing')) {
      blocker_details.push({
        kind: 'credentials.missing',
        severity: 'medium',
        reason: `${statuses.filter((s) => s === 'missing').length} declared credential(s) missing in vault`,
      });
    } else if (statuses.every((s) => s === 'expected')) {
      blocker_details.push({
        kind: 'credentials.expected_only',
        severity: 'low',
        reason: 'all credentials declared but none present yet (W1 wiring pending)',
      });
    } else if (statuses.includes('expected') && !statuses.includes('missing')) {
      blocker_details.push({
        kind: 'credentials.partially_expected',
        severity: 'low',
        reason: 'some credentials declared but not yet provisioned',
      });
    }
  }

  // ── Product surfaces shape check ────────────────────────────────────────
  if (productSurfaces.length === 0) {
    blocker_details.push({
      kind: 'productSurfaces.empty',
      severity: 'low',
      reason: 'no product surfaces declared',
    });
  } else {
    signalsObserved++;
  }

  // ── Decision + confidence ────────────────────────────────────────────────
  const blockers = blocker_details.map((d) => d.kind);

  let recommendation;
  let confidence;

  const hasHighSeverity = blocker_details.some((d) => d.severity === 'high');
  const hasMediumSeverity = blocker_details.some((d) => d.severity === 'medium');
  const hasOnlyLowOrNone = !hasHighSeverity && !hasMediumSeverity;

  if (hasHighSeverity) {
    recommendation = 'refuse';
    confidence = 0.9;
  } else if (hasMediumSeverity) {
    recommendation = 'hold';
    confidence = 0.6;
  } else if (!hasOnlyLowOrNone || blocker_details.length > 0) {
    // Only low-severity issues — hold but lower confidence.
    recommendation = 'hold';
    confidence = 0.4;
  } else if (signalsObserved === 0) {
    recommendation = 'hold';
    confidence = 0;
  } else {
    recommendation = 'activate';
    confidence = 0.9;
  }

  return {
    recommendation,
    blockers,
    blocker_details,
    confidence,
    credentialStatus,
    productSurfaceCount: productSurfaces.length,
    signalsObserved,
  };
}

// Exported for unit tests only — not part of the public API.
export const __test = { analyzeOnboarding, PROVIDER_ID_SLUG_RE, SEVERITY_RANK };
