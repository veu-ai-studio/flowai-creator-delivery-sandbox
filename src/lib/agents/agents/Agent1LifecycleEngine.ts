/**
 * Agent #1 — Lifecycle Engine
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/agents/Agent1LifecycleEngine.ts (W5 territory)
 * Mode:     Always-On
 * Authority: recommend_only
 * Pattern:  Runtime Governance Supervisor (Kubernetes-style control plane,
 *           NOT a chatbot). The engine watches the pipeline, validates
 *           proposed transitions against charter, flags conflicts, escalates
 *           when thresholds breach, and records lineage. It never executes
 *           side effects directly — it can only recommend (emit events) and
 *           refuse (block via veto).
 *
 * Responsibilities (per dispatch):
 *   - Pipeline health monitoring
 *   - Agent sequencing coordination across the 8-step Auto Runner
 *   - Policy enforcement (validates each step against charter before exec)
 *   - Conflict detection (2+ agents acting on same record)
 *   - Escalation management (route to human review on threshold breach)
 *   - Execution lineage tracking (every action logged with traceId)
 *   - Cost / performance / risk tracking per run
 *
 * Storage seams (provided by orchestrator wiring; never touched directly):
 *   - hot   — HotStore   for runtime state (health, active sessions, KV-TTL)
 *   - cold  — ColdStore  for audit lineage (Supabase-backed, permanent)
 *   - bus   — MessageBus for cross-agent comms (publish/subscribe only)
 *
 * Charter is sourced from registry — `_registry.ts` is the single source of
 * truth for the static charter shape; the static charter() method returns
 * a BaseAgent-shaped charter derived from it.
 *
 * The class also exports `static charterId = 1` per dispatch.
 * ---------------------------------------------------------------------------
 */

// BaseAgent is JS; using `.js` ESM extension for TS-to-JS resolution.
// @ts-ignore — BaseAgent.js has no types exposed; we treat it as a runtime
// import. The class API is documented in BaseAgent.js itself.
import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';
import type {
  HotStore,
  ColdStore,
  AuditEntry,
} from '../orchestrator/OrchestratorHub.js';
import type { MessageBus } from '../MessageBus.js';

// Subset of dependencies BaseAgent.constructor expects, extended with the
// Agent #1-specific stores and bus.
export interface Agent1Deps {
  readonly logger: {
    info?: (msg: string, ctx?: object) => void;
    warn?: (msg: string, ctx?: object) => void;
    error?: (msg: string, ctx?: object) => void;
  };
  readonly messageBus: MessageBus;
  readonly auditLog: { write: (entry: object) => Promise<void> | void };
  readonly clock: { now: () => number };
  readonly productScope: string;
  readonly environment: string;
  readonly hot: HotStore;
  readonly cold: ColdStore;
}

// Shapes the engine accepts as `run()` input. Each kind drives a different
// plan/act path. The orchestrator (or other agents) call run() with one of
// these envelopes.
export type LifecycleInput =
  | { kind: 'step.start'; stepName: string; runId: string; agentId?: number; meta?: Record<string, unknown> }
  | { kind: 'step.complete'; stepName: string; runId: string; agentId?: number; outcome: string; durationMs?: number; meta?: Record<string, unknown> }
  | { kind: 'step.failed'; stepName: string; runId: string; agentId?: number; error: string; meta?: Record<string, unknown> }
  | { kind: 'health.check'; meta?: Record<string, unknown> };

// What plan() produces — recommendation-only.
export interface LifecyclePlan {
  readonly summary: string;
  readonly authorityNeeded: readonly string[];
  readonly sideEffects: readonly never[];   // recommend_only — always empty
  readonly proposed: {
    readonly emit: readonly { topic: string; payload: Record<string, unknown> }[];
    readonly veto?: { reason: string; refuseStep: { stepName: string; runId: string } };
  };
  readonly conflicts: readonly Conflict[];
  readonly escalations: readonly EscalationDecision[];
}

// What detectConflicts returns.
export interface Conflict {
  readonly runId: string;
  readonly stepName: string;
  readonly agentIds: readonly number[];
  readonly reason: string;
}

// What escalateIfNeeded returns.
export interface EscalationDecision {
  readonly target: 'w0' | 'human-gate' | 'agent-12-portfolio-risk' | null;
  readonly reason: string;
  readonly threshold: string;
  readonly escalated: boolean;
}

// Lineage row written to ColdStore for every governance decision.
export interface LifecycleLineageAction {
  readonly runId: string;
  readonly stepKey: string;
  readonly phase: AuditEntry['phase'];
  readonly at?: number;          // optional — defaults to clock.now()
  readonly attempt?: number;
  readonly error?: string;
  readonly meta?: Record<string, unknown>;
}

// Constants for thresholds — exposed so dashboards/tests can see them.
export const ESCALATION_THRESHOLDS = Object.freeze({
  /** failures within a single run before escalation */
  failuresPerRun: 2,
  /** active concurrent sessions on the same product before flagging */
  concurrentSessions: 3,
  /** any conflict triggers escalation */
  anyConflict: true,
});

// Hot-store key conventions (single point of truth for KV layout).
export const HOT_KEYS = Object.freeze({
  health: () => 'agent1:health',
  session: (runId: string) => `agent1:session:${runId}`,
  activeSessions: () => 'agent1:active-sessions',
  failureCount: (runId: string) => `agent1:failures:${runId}`,
});

const HOT_TTL_SECONDS = 3600; // 1h — matches OrchestratorHub default

export class Agent1LifecycleEngine extends BaseAgent {
  static readonly charterId = 1;

  /**
   * BaseAgent's static charter() is the canonical contract validated by
   * BaseAgent._validateCharter. We derive it from the registry where
   * possible, then layer on the BaseAgent-specific fields.
   */
  static charter() {
    const r = getAgent(1);
    if (!r) {
      throw new Error('Agent1LifecycleEngine: registry entry for id=1 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false,                                // #1 is in EMBEDDED_AGENTS
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [],
      consumes: [...r.consumes],
      produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    };
  }

  protected readonly hot: HotStore;
  protected readonly cold: ColdStore;
  protected readonly bus: MessageBus;
  private busSubscriptionsAttached = false;
  private readonly busHandles: Array<() => void> = [];

  constructor(deps: Agent1Deps) {
    super(deps as unknown as object);
    if (!deps.hot) throw new Error('Agent1LifecycleEngine: hot store required');
    if (!deps.cold) throw new Error('Agent1LifecycleEngine: cold store required');
    if (!deps.messageBus) throw new Error('Agent1LifecycleEngine: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  // BaseAgent.run() drives plan() then guard() then act(). We honor that
  // contract: plan() reads input, returns a recommendation; act() emits
  // events. No side effects beyond MessageBus publishes.
  async plan(ctx: { input: LifecycleInput; runId: string }): Promise<LifecyclePlan> {
    const input = ctx.input;
    const at = (this as unknown as { deps: { clock: { now: () => number } } })
      .deps.clock.now();

    if (!input || typeof (input as any).kind !== 'string') {
      throw new Error('Agent1: input.kind required');
    }

    const conflicts: Conflict[] = [];
    const emit: { topic: string; payload: Record<string, unknown> }[] = [];
    const escalations: EscalationDecision[] = [];
    let veto: LifecyclePlan['proposed']['veto'] | undefined;
    let summary = '';

    switch (input.kind) {
      case 'step.start': {
        // Charter / policy gate.
        const policy = await this.validateStepStart(input.stepName, input.runId);
        if (!policy.ok) {
          veto = {
            reason: policy.reason,
            refuseStep: { stepName: input.stepName, runId: input.runId },
          };
          summary = `veto step "${input.stepName}" — ${policy.reason}`;
          emit.push({
            topic: '1.product.gate_request.v1',
            payload: {
              decision: 'veto',
              stepName: input.stepName,
              runId: input.runId,
              reason: policy.reason,
              at,
            },
          });
        } else {
          // Conflict scan — if 2+ agents are active on the same record, flag.
          const detected = await this.detectConflicts(input.runId);
          conflicts.push(...detected);
          if (detected.length > 0 && ESCALATION_THRESHOLDS.anyConflict) {
            escalations.push(
              await this.escalateIfNeeded({
                kind: 'conflict',
                runId: input.runId,
                stepName: input.stepName,
                conflicts: detected,
              }),
            );
          }
          summary = `recommend start step "${input.stepName}" for run ${input.runId}`;
          emit.push({
            topic: '1.product.lifecycle_event.v1',
            payload: {
              event: 'step.recommended_start',
              stepName: input.stepName,
              runId: input.runId,
              at,
              conflicts: detected.length,
            },
          });
        }
        break;
      }

      case 'step.complete': {
        summary = `record completion of "${input.stepName}" for run ${input.runId}`;
        emit.push({
          topic: '1.product.lifecycle_event.v1',
          payload: {
            event: 'step.completed',
            stepName: input.stepName,
            runId: input.runId,
            outcome: input.outcome,
            durationMs: input.durationMs ?? null,
            at,
          },
        });
        break;
      }

      case 'step.failed': {
        // Track failure count for escalation threshold.
        const count = await this.incrementFailureCount(input.runId);
        summary = `record failure of "${input.stepName}" (run ${input.runId}, fail #${count})`;
        if (count >= ESCALATION_THRESHOLDS.failuresPerRun) {
          escalations.push(
            await this.escalateIfNeeded({
              kind: 'failure-threshold',
              runId: input.runId,
              stepName: input.stepName,
              failuresInRun: count,
            }),
          );
        }
        emit.push({
          topic: '1.product.gate_request.v1',
          payload: {
            decision: 'review_required',
            stepName: input.stepName,
            runId: input.runId,
            error: input.error,
            failuresInRun: count,
            at,
          },
        });
        break;
      }

      case 'health.check': {
        summary = 'health snapshot recommendation';
        emit.push({
          topic: '1.product.lifecycle_event.v1',
          payload: { event: 'health.snapshot', at },
        });
        break;
      }

      default: {
        // TS exhaustiveness — runtime fallback if a new kind is added later
        // and forgets to update this switch.
        throw new Error(`Agent1: unhandled input.kind "${(input as { kind?: string }).kind}"`);
      }
    }

    return Object.freeze({
      summary,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [] as never[],         // recommend_only invariant
      proposed: Object.freeze({
        emit: Object.freeze(emit.map((e) => Object.freeze(e))) as ReadonlyArray<{ topic: string; payload: Record<string, unknown> }>,
        veto,
      }),
      conflicts: Object.freeze(conflicts) as readonly Conflict[],
      escalations: Object.freeze(escalations) as readonly EscalationDecision[],
    }) as LifecyclePlan;
  }

  async act(ctx: { input: LifecycleInput; runId: string }, plan: LifecyclePlan): Promise<{ outcome: string; sideEffects: never[] }> {
    if (!plan || !Array.isArray(plan.proposed.emit)) {
      throw new Error('Agent1.act: invalid plan');
    }

    // Charter constraint check — recommend_only must produce no sideEffects.
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent1.act: recommend_only forbids sideEffects');
    }

    // Persist run-state to hot store (always-on supervision).
    if (ctx.input.kind === 'step.start' || ctx.input.kind === 'step.complete' || ctx.input.kind === 'step.failed') {
      await this.recordSessionState(ctx.input);
    }

    // Always record lineage to cold store.
    await this.recordLineage({
      runId: ctx.runId,
      stepKey: ('stepName' in ctx.input ? ctx.input.stepName : 'health'),
      phase: 'route.decision',
      meta: {
        kind: ctx.input.kind,
        summary: plan.summary,
        emitCount: plan.proposed.emit.length,
        vetoed: !!plan.proposed.veto,
        conflicts: plan.conflicts.length,
        escalations: plan.escalations.filter((e) => e.escalated).length,
      },
    });

    // Publish all proposed events. recommend_only means we ONLY publish —
    // we never write to entities, deploy, or execute downstream side effects.
    for (const e of plan.proposed.emit) {
      this.bus.publish(e.topic, e.payload);
    }

    return {
      outcome: plan.proposed.veto ? 'vetoed' : 'recommended',
      sideEffects: [] as never[],
    };
  }

  // ── Public governance hooks ────────────────────────────────────────────────

  /**
   * validateStepStart — enforces step-naming policy and confirms the step is
   * one of the eight known Auto Runner steps. Returns ok=false with a reason
   * when the step is not recognized; ok=true otherwise.
   */
  async validateStepStart(stepName: string, runId: string): Promise<{ ok: boolean; policy: string; reason: string }> {
    if (typeof stepName !== 'string' || !stepName) {
      return { ok: false, policy: 'step-naming', reason: 'stepName required' };
    }
    if (typeof runId !== 'string' || !runId) {
      return { ok: false, policy: 'run-id', reason: 'runId required' };
    }
    if (!KNOWN_STEPS.has(stepName)) {
      return {
        ok: false,
        policy: 'step-allowlist',
        reason: `step "${stepName}" is not in the canonical 8-step Auto Runner allowlist`,
      };
    }
    return { ok: true, policy: 'step-allowlist', reason: 'allowed' };
  }

  /**
   * detectConflicts — scans the active-sessions index in HotStore and
   * returns conflicts where 2+ agents are active on the same run+step.
   */
  async detectConflicts(runId: string): Promise<Conflict[]> {
    if (typeof runId !== 'string' || !runId) return [];
    const raw = (await this.hot.get(HOT_KEYS.activeSessions())) as
      | ActiveSessionsIndex
      | null
      | undefined;
    if (!raw || !raw.entries || !Array.isArray(raw.entries)) return [];
    // Group entries by (runId, stepName) and detect 2+ agents on the same key.
    const buckets = new Map<string, { runId: string; stepName: string; agentIds: Set<number> }>();
    for (const e of raw.entries) {
      if (e.runId !== runId) continue;
      const k = `${e.runId}|${e.stepName}`;
      let b = buckets.get(k);
      if (!b) {
        b = { runId: e.runId, stepName: e.stepName, agentIds: new Set() };
        buckets.set(k, b);
      }
      b.agentIds.add(e.agentId);
    }
    const conflicts: Conflict[] = [];
    for (const b of buckets.values()) {
      if (b.agentIds.size >= 2) {
        conflicts.push({
          runId: b.runId,
          stepName: b.stepName,
          agentIds: [...b.agentIds].sort((a, x) => a - x),
          reason: `${b.agentIds.size} agents active on same step "${b.stepName}"`,
        });
      }
    }
    return conflicts;
  }

  /**
   * escalateIfNeeded — given a decision context, decides whether to route
   * to a human gate / W0 / Agent #12 Portfolio Risk. Returns the decision
   * record (which is also recorded in lineage). The agent itself does NOT
   * page anyone — it emits an event; downstream tooling owns delivery.
   */
  async escalateIfNeeded(decision: {
    kind: 'conflict' | 'failure-threshold' | 'manual';
    runId: string;
    stepName?: string;
    conflicts?: readonly Conflict[];
    failuresInRun?: number;
  }): Promise<EscalationDecision> {
    if (!decision || typeof decision.kind !== 'string') {
      return Object.freeze({
        target: null,
        reason: 'invalid decision payload',
        threshold: 'n/a',
        escalated: false,
      });
    }

    if (decision.kind === 'conflict' && decision.conflicts && decision.conflicts.length > 0) {
      return Object.freeze({
        target: 'agent-12-portfolio-risk',
        reason: `${decision.conflicts.length} active conflict(s) on run ${decision.runId}`,
        threshold: 'anyConflict',
        escalated: true,
      });
    }

    if (
      decision.kind === 'failure-threshold' &&
      (decision.failuresInRun ?? 0) >= ESCALATION_THRESHOLDS.failuresPerRun
    ) {
      return Object.freeze({
        target: 'human-gate',
        reason: `run ${decision.runId} has ${decision.failuresInRun} failures (threshold ${ESCALATION_THRESHOLDS.failuresPerRun})`,
        threshold: 'failuresPerRun',
        escalated: true,
      });
    }

    if (decision.kind === 'manual') {
      return Object.freeze({
        target: 'w0',
        reason: 'manual escalation requested',
        threshold: 'manual',
        escalated: true,
      });
    }

    return Object.freeze({
      target: null,
      reason: 'no threshold breached',
      threshold: 'none',
      escalated: false,
    });
  }

  /**
   * recordLineage — appends a row to the ColdStore audit trail. This is the
   * canonical permanent record of every governance decision Agent #1 makes.
   */
  async recordLineage(action: LifecycleLineageAction): Promise<void> {
    if (!action || typeof action.runId !== 'string' || !action.runId) {
      throw new Error('recordLineage: runId required');
    }
    if (typeof action.stepKey !== 'string' || !action.stepKey) {
      throw new Error('recordLineage: stepKey required');
    }
    if (typeof action.phase !== 'string' || !action.phase) {
      throw new Error('recordLineage: phase required');
    }
    const at = action.at ?? this.clockNow();
    await this.cold.append({
      runId: action.runId,
      stepKey: action.stepKey,
      phase: action.phase,
      at,
      attempt: action.attempt,
      error: action.error,
      agentId: 1,
      authority: AUTHORITY.RECOMMEND_ONLY,
      meta: action.meta,
    } as AuditEntry);
  }

  // ── MessageBus subscription helpers ────────────────────────────────────────

  /**
   * Wire the engine to the MessageBus topics it consumes. Idempotent — calling
   * a second time is a noop. Returns the count of new subscriptions made.
   */
  attachBusSubscriptions(): number {
    if (this.busSubscriptionsAttached) return 0;
    const charter = (this.constructor as typeof Agent1LifecycleEngine).charter();
    let n = 0;
    for (const topic of charter.consumes) {
      const off = this.bus.subscribe(topic, async (payload) => {
        await this.recordLineage({
          runId: typeof (payload as { runId?: string })?.runId === 'string'
            ? (payload as { runId: string }).runId
            : 'unknown',
          stepKey: 'subscription',
          phase: 'route.decision',
          meta: { observedTopic: topic, payload },
        });
      });
      this.busHandles.push(off);
      n++;
    }
    this.busSubscriptionsAttached = true;
    return n;
  }

  /**
   * Detach all bus subscriptions. Used by tests and graceful shutdowns.
   */
  detachBusSubscriptions(): void {
    while (this.busHandles.length > 0) {
      const off = this.busHandles.pop();
      try { off?.(); } catch { /* swallow — already-unsubscribed */ }
    }
    this.busSubscriptionsAttached = false;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private clockNow(): number {
    return (this as unknown as { deps: { clock: { now: () => number } } })
      .deps.clock.now();
  }

  private async recordSessionState(input: Exclude<LifecycleInput, { kind: 'health.check' }>): Promise<void> {
    const at = this.clockNow();
    const sessionKey = HOT_KEYS.session(input.runId);
    const prior = (await this.hot.get(sessionKey)) as SessionState | null | undefined;
    const next: SessionState = {
      runId: input.runId,
      lastStepName: input.stepName,
      lastEventKind: input.kind,
      lastEventAt: at,
      events: [...(prior?.events ?? []), { kind: input.kind, stepName: input.stepName, at }].slice(-50),
    };
    await this.hot.set(sessionKey, next, HOT_TTL_SECONDS);

    // Maintain the active-sessions index so detectConflicts has fresh data.
    const indexRaw = (await this.hot.get(HOT_KEYS.activeSessions())) as
      | ActiveSessionsIndex
      | null
      | undefined;
    const index: ActiveSessionsIndex = indexRaw && indexRaw.entries
      ? { entries: [...indexRaw.entries] }
      : { entries: [] };
    // Drop any entry from this (runId, stepName) that's older than this update.
    const filtered = index.entries.filter(
      (e) => !(e.runId === input.runId && e.stepName === input.stepName && e.agentId === (input.agentId ?? 1)),
    );
    if (input.kind !== 'step.complete' && input.kind !== 'step.failed') {
      // Only step.start adds to the active set; complete/failed remove.
      filtered.push({ runId: input.runId, stepName: input.stepName, agentId: input.agentId ?? 1, at });
    }
    await this.hot.set(HOT_KEYS.activeSessions(), { entries: filtered }, HOT_TTL_SECONDS);

    // Health snapshot.
    await this.hot.set(
      HOT_KEYS.health(),
      { lastEventAt: at, activeSessionCount: filtered.length },
      HOT_TTL_SECONDS,
    );
  }

  private async incrementFailureCount(runId: string): Promise<number> {
    const k = HOT_KEYS.failureCount(runId);
    const prior = (await this.hot.get(k)) as { count: number } | null | undefined;
    const next = (prior?.count ?? 0) + 1;
    await this.hot.set(k, { count: next }, HOT_TTL_SECONDS);
    return next;
  }
}

// ── Internal types ───────────────────────────────────────────────────────────

interface SessionState {
  runId: string;
  lastStepName: string;
  lastEventKind: LifecycleInput['kind'];
  lastEventAt: number;
  events: { kind: LifecycleInput['kind']; stepName: string; at: number }[];
}

interface ActiveSessionsIndex {
  entries: { runId: string; stepName: string; agentId: number; at: number }[];
}

// Canonical 8-step Auto Runner allowlist — must match operationsEngine.STEPS.
const KNOWN_STEPS = new Set<string>([
  'research',
  'design',
  'build',
  'qa_audit',
  'deploy',
  'govern',
  'gtm',
  'monitor',
]);
