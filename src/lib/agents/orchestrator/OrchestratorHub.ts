/**
 * OrchestratorHub — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/orchestrator/OrchestratorHub.ts (W5 territory)
 * Status:   Non-LLM deterministic runtime controller. None of the 20 agents
 *           are built yet; this hub is what they will route through once they
 *           are.
 *
 * Responsibilities (per dispatch):
 *   - route jobs (decide which agent / step handles what)
 *   - enforce policies (authority levels from registry)
 *   - assign authority (currently always recommend_only)
 *   - handle retries (exponential backoff, capped attempts)
 *   - maintain state (hot store: pipeline-scoped, 1hr TTL)
 *   - resolve conflicts (idempotency: same step+runId never re-executes)
 *   - track lineage (cold store: permanent audit trail)
 *
 * Storage seams (interfaces, not concrete clients):
 *   - HotStore  — Vercel KV in production, in-memory in tests
 *   - ColdStore — Supabase in production, in-memory in tests
 *   The dispatch names KV and Supabase explicitly. Adapters that bind those
 *   live elsewhere (production wiring is out of scope for this dispatch).
 *
 * No LLM calls. No external HTTP. Deterministic and synchronous-feeling.
 * ---------------------------------------------------------------------------
 */

import { getAgent, AGENT_REGISTRY } from '../_registry.js';
import type { AgentRecord, AuthorityLevel } from '../_registry.js';

// ── Storage seams ────────────────────────────────────────────────────────────

export interface HotStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlSec: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ColdStore {
  append(entry: AuditEntry): Promise<void>;
}

// ── Audit lineage ────────────────────────────────────────────────────────────

export type AuditPhase =
  | 'step.start'
  | 'step.attempt.start'
  | 'step.attempt.failure'
  | 'step.success'
  | 'step.failure'
  | 'step.idempotent_hit'
  | 'route.decision'
  // W5b — Tool Intelligence Service (CA-18 §3 modes + §8 Orchestra Selection).
  // 'tool.selection' is written before step.start when a Tool Intelligence
  // Service is attached. 'tool.usage_recorded' is written by
  // ToolIntelligenceService.recordUsage() when score updates land.
  | 'tool.selection'
  | 'tool.usage_recorded';

export interface AuditEntry {
  readonly runId: string;
  readonly stepKey: string;
  readonly phase: AuditPhase;
  readonly at: number;
  readonly attempt?: number;
  readonly error?: string;
  readonly agentId?: number;
  readonly authority?: AuthorityLevel;
  readonly idempotencyKey?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

// ── Routing ──────────────────────────────────────────────────────────────────

export interface RouteDecision {
  readonly agentId: number | null;
  readonly authority: AuthorityLevel;
  readonly reason: string;
}

// Step-key → owning agent id (by registry mode='step-owner').
// Step 5 'deploy' is currently orchestrator-only — no agent owns it.
const STEP_OWNERS: Readonly<Record<string, number>> = Object.freeze({
  research: 6,
  design: 7,
  build: 2,
  qa_audit: 8,
  deploy: 0, // orchestrator-only
  govern: 3,
  gtm: 9,
  monitor: 10,
});

// Cross-step capability owners — agents whose responsibilities span the
// 8-step pipeline rather than mapping 1:1 to a single step key. Surfaced
// here so callers can look up agent ids by capability (e.g. 'crawl' →
// 21 = Agent #21 Aggressive Crawl Conductor) without overloading
// STEP_OWNERS, which is keyed by linear pipeline step.
//
// Per SSOT §15.1 row 21 (Aggressive Crawl Conductor, Panel ruling
// 30e5edb Phase 1): Agent #21 conducts crawls within step 1 (research)
// AND step 8 (monitor) phases. The same agent id owns both crawl-source
// surfaces. Step-1 Research (agent #6) and Step-8 Monitor (agent #10)
// remain the step-owners; Agent #21 is the crawl-capability conductor
// they dispatch to.
//
// Phase 1 (this dispatch) registers the mapping; Phase 2-3 will add
// auth-traversal + ProductSSOT-write capabilities (gated).
export const CROSS_STEP_OWNERS: Readonly<Record<string, number>> = Object.freeze({
  crawl: 21,                   // Aggressive Crawl Conductor
});

// ── Hub ──────────────────────────────────────────────────────────────────────

export interface OrchestratorOpts {
  readonly hot: HotStore;
  readonly cold: ColdStore;
  readonly clock?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly maxAttempts?: number;
  readonly baseBackoffMs?: number;
  readonly hotTtlSec?: number;
}

export class OrchestratorHub {
  private readonly hot: HotStore;
  private readonly cold: ColdStore;
  private readonly clock: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly hotTtlSec: number;

  constructor(opts: OrchestratorOpts) {
    if (!opts || !opts.hot || !opts.cold) {
      throw new TypeError('OrchestratorHub: hot and cold stores required');
    }
    this.hot = opts.hot;
    this.cold = opts.cold;
    this.clock = opts.clock ?? (() => Date.now());
    this.sleep =
      opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.baseBackoffMs = opts.baseBackoffMs ?? 1000;
    this.hotTtlSec = opts.hotTtlSec ?? 3600;

    if (this.maxAttempts < 1) {
      throw new RangeError('OrchestratorHub: maxAttempts must be >= 1');
    }
    if (this.baseBackoffMs < 0) {
      throw new RangeError('OrchestratorHub: baseBackoffMs must be >= 0');
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Route a job to its owning agent and resolve the authority granted for
   * this run. Records a route.decision audit entry.
   */
  async routeJob(job: { runId: string; stepKey: string }): Promise<RouteDecision> {
    if (!job || typeof job.runId !== 'string' || !job.runId) {
      throw new TypeError('routeJob: runId required');
    }
    if (typeof job.stepKey !== 'string' || !job.stepKey) {
      throw new TypeError('routeJob: stepKey required');
    }

    const agentId = STEP_OWNERS[job.stepKey] ?? null;
    let authority: AuthorityLevel = 'recommend_only';
    let reason: string;

    if (agentId === null) {
      reason = `unknown step "${job.stepKey}"`;
    } else if (agentId === 0) {
      reason = `step "${job.stepKey}" is orchestrator-only`;
    } else {
      const agent: AgentRecord | undefined = getAgent(agentId);
      if (!agent) {
        reason = `step owner agent #${agentId} not in registry`;
      } else {
        // Pick the most-permissive declared authority that is still
        // recommend_only. (Future: gate-ladder lookup.)
        authority = agent.authority[0];
        reason = `routed to agent #${agentId} (${agent.name})`;
      }
    }

    const decision: RouteDecision = Object.freeze({
      agentId: agentId === 0 ? null : agentId,
      authority,
      reason,
    });

    await this.cold.append({
      runId: job.runId,
      stepKey: job.stepKey,
      phase: 'route.decision',
      at: this.clock(),
      agentId: decision.agentId ?? undefined,
      authority: decision.authority,
      meta: { reason },
    });

    return decision;
  }

  /**
   * Idempotency-keyed step execution with checkpoint + retry.
   *
   * Behavior:
   *   1. Compute idempotency key.
   *   2. Read hot checkpoint. If present → return prior result, audit
   *      step.idempotent_hit, do not execute work.
   *   3. Otherwise loop up to maxAttempts:
   *      a. Audit step.attempt.start.
   *      b. await work().
   *      c. On success: write checkpoint, audit step.success, return.
   *      d. On error: audit step.attempt.failure, sleep backoff, retry.
   *   4. After exhaustion: audit step.failure, rethrow last error.
   */
  async executeStep<T>(args: {
    runId: string;
    stepKey: string;
    work: () => Promise<T>;
  }): Promise<T> {
    if (!args || typeof args.runId !== 'string' || !args.runId) {
      throw new TypeError('executeStep: runId required');
    }
    if (typeof args.stepKey !== 'string' || !args.stepKey) {
      throw new TypeError('executeStep: stepKey required');
    }
    if (typeof args.work !== 'function') {
      throw new TypeError('executeStep: work must be a function');
    }
    const idemKey = this.idempotencyKey(args.runId, args.stepKey);

    // Idempotency check.
    const prior = await this.hot.get(idemKey);
    if (prior !== null && prior !== undefined) {
      await this.cold.append({
        runId: args.runId,
        stepKey: args.stepKey,
        phase: 'step.idempotent_hit',
        at: this.clock(),
        idempotencyKey: idemKey,
      });
      return (prior as { result: T }).result;
    }

    // W5b — Tool Intelligence pre-selection. Runs before step.start and
    // produces a `tool.selection` audit entry. Best-effort: any failure
    // is captured as a selection-skipped lineage row and execution
    // proceeds. The orchestrator NEVER blocks on tool-selection failure
    // (recommend_only invariant).
    if (this.toolIntelligenceService) {
      await this.recordToolSelection(args.runId, args.stepKey);
    }

    await this.cold.append({
      runId: args.runId,
      stepKey: args.stepKey,
      phase: 'step.start',
      at: this.clock(),
      idempotencyKey: idemKey,
    });

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      await this.cold.append({
        runId: args.runId,
        stepKey: args.stepKey,
        phase: 'step.attempt.start',
        at: this.clock(),
        attempt,
        idempotencyKey: idemKey,
      });

      try {
        const result = await args.work();
        await this.hot.set(idemKey, { result, at: this.clock() }, this.hotTtlSec);
        await this.cold.append({
          runId: args.runId,
          stepKey: args.stepKey,
          phase: 'step.success',
          at: this.clock(),
          attempt,
          idempotencyKey: idemKey,
        });
        return result;
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        await this.cold.append({
          runId: args.runId,
          stepKey: args.stepKey,
          phase: 'step.attempt.failure',
          at: this.clock(),
          attempt,
          error: errMsg,
          idempotencyKey: idemKey,
        });

        if (attempt < this.maxAttempts) {
          await this.sleep(this.computeBackoff(attempt));
        }
      }
    }

    const finalErrMsg = lastError instanceof Error ? lastError.message : String(lastError);
    await this.cold.append({
      runId: args.runId,
      stepKey: args.stepKey,
      phase: 'step.failure',
      at: this.clock(),
      attempt: this.maxAttempts,
      error: finalErrMsg,
      idempotencyKey: idemKey,
    });
    throw lastError;
  }

  /**
   * Read a step checkpoint without executing. Returns the cached result if
   * the step has previously succeeded for this runId, else null.
   */
  async getCheckpoint(runId: string, stepKey: string): Promise<unknown | null> {
    const idemKey = this.idempotencyKey(runId, stepKey);
    const prior = await this.hot.get(idemKey);
    if (prior === null || prior === undefined) return null;
    return (prior as { result: unknown }).result;
  }

  /**
   * Manually clear a step checkpoint. Used by orchestrator-controlled retries
   * that want to force re-execution.
   */
  async clearCheckpoint(runId: string, stepKey: string): Promise<void> {
    const idemKey = this.idempotencyKey(runId, stepKey);
    await this.hot.delete(idemKey);
  }

  /**
   * Compute exponential backoff for a given attempt (1-indexed).
   * attempt=1 → baseBackoffMs, attempt=2 → 2×, attempt=3 → 4×, etc.
   */
  computeBackoff(attempt: number): number {
    if (attempt < 1) return 0;
    return this.baseBackoffMs * Math.pow(2, attempt - 1);
  }

  /**
   * Idempotency key for a (runId, stepKey) pair. Same inputs always produce
   * the same key — the orchestrator dedups concurrent or retried attempts.
   */
  idempotencyKey(runId: string, stepKey: string): string {
    return `flowai:run:${runId}:step:${stepKey}`;
  }

  /**
   * Inventory introspection — returns the registry size and step-owner
   * coverage so external callers (dashboards, health checks) can verify the
   * hub agrees with the registry.
   */
  inventory(): { agents: number; stepOwners: number; orchestratorOnly: number } {
    const stepOwnerIds = Object.values(STEP_OWNERS).filter((id) => id > 0);
    const orchestratorOnly = Object.values(STEP_OWNERS).filter((id) => id === 0).length;
    return {
      agents: AGENT_REGISTRY.length,
      stepOwners: stepOwnerIds.length,
      orchestratorOnly,
    };
  }

  // ── Agent wire-in (PA #2.7) ──────────────────────────────────────────────
  //
  // The hub holds opaque references to a registered always-on supervisor
  // (Agent #1) and a step-key → step-owner map (Agent #2 today, more later).
  // Wiring is observe-only: invoking a step-owner calls its `recommend()`
  // method and returns the recommendation envelope to the caller WITHOUT
  // blocking step execution. recommend_only authority is enforced upstream
  // by each agent's plan/act guard.

  private alwaysOnSupervisor: { detach: () => void } | null = null;
  private readonly stepOwners: Map<string, StepOwnerAgent> = new Map();

  // W5b Tool Intelligence Service — attached at hub-init time when the
  // service is available. Null in test/browser bundles that do not load
  // the service. The hub consults it before each executeStep() call to
  // pre-select and log a recommended platform; selection is informational
  // and NEVER blocks step execution (recommend_only invariant).
  private toolIntelligenceService: ToolIntelligenceServiceLike | null = null;
  private toolIntelligenceContext: ToolIntelligenceContext | null = null;

  /**
   * Wire an always-on supervisor (Agent #1). The agent must already be
   * configured with the same MessageBus + ColdStore the hub uses. The hub
   * just calls the agent's broadcast-attach method and remembers the detach
   * handle for graceful shutdown.
   *
   * Idempotent — re-attaching the SAME agent is a noop. Attaching a
   * different agent throws (only one always-on supervisor at a time).
   */
  attachLifecycleAgent(agent: AlwaysOnAgent): void {
    if (!agent || typeof agent.attachAsAlwaysOnSupervisor !== 'function') {
      throw new TypeError(
        'attachLifecycleAgent: agent must expose attachAsAlwaysOnSupervisor()',
      );
    }
    if (this.alwaysOnSupervisor !== null) {
      // Idempotent: if the SAME agent is being re-attached, return.
      if ((this.alwaysOnSupervisor as { _agent?: unknown })._agent === agent) return;
      throw new Error('attachLifecycleAgent: another always-on supervisor is already attached');
    }
    const detach = agent.attachAsAlwaysOnSupervisor();
    this.alwaysOnSupervisor = Object.assign({ detach }, { _agent: agent });
  }

  /**
   * Detach the always-on supervisor. Idempotent.
   */
  detachLifecycleAgent(): void {
    if (this.alwaysOnSupervisor) {
      try { this.alwaysOnSupervisor.detach(); } catch { /* already-unsubscribed */ }
      this.alwaysOnSupervisor = null;
    }
  }

  /**
   * Wire a step-owner agent (Agent #2 today). The agent must expose a
   * `recommend(ctx)` method returning the canonical recommendation envelope.
   *
   * Idempotent for same-agent registration; conflict throws.
   */
  registerStepOwnerAgent(stepKey: string, agent: StepOwnerAgent): void {
    if (typeof stepKey !== 'string' || !stepKey) {
      throw new TypeError('registerStepOwnerAgent: stepKey required');
    }
    if (!agent || typeof agent.recommend !== 'function') {
      throw new TypeError('registerStepOwnerAgent: agent must expose recommend(ctx)');
    }
    const prior = this.stepOwners.get(stepKey);
    if (prior && prior !== agent) {
      throw new Error(
        `registerStepOwnerAgent: step "${stepKey}" already has a different owner attached`,
      );
    }
    this.stepOwners.set(stepKey, agent);
  }

  /**
   * Look up the step-owner for a step key. Returns undefined when no agent
   * is registered.
   */
  getStepOwnerAgent(stepKey: string): StepOwnerAgent | undefined {
    return this.stepOwners.get(stepKey);
  }

  // ── Tool Intelligence wire-in (W5b) ──────────────────────────────────────
  //
  // Step agents resolve a recommended platform by calling
  // hub.getToolIntelligenceService(). Default context (targetClass, mode,
  // productId) is set via setToolIntelligenceContext() and used as the
  // fallback when executeStep() pre-selects. Per-step overrides are
  // possible by passing context directly to the service.

  /**
   * Attach a Tool Intelligence Service. Idempotent for the SAME service
   * instance; reattaching a different instance throws (one service per
   * hub). Pass `null` to detach. Optional `context` sets the default
   * targetClass/mode/productId used by executeStep() pre-selection.
   */
  attachToolIntelligenceService(
    service: ToolIntelligenceServiceLike | null,
    context?: ToolIntelligenceContext,
  ): void {
    if (service === null) {
      this.toolIntelligenceService = null;
      this.toolIntelligenceContext = null;
      return;
    }
    if (!service || typeof service.getTopTool !== 'function') {
      throw new TypeError(
        'attachToolIntelligenceService: service must expose getTopTool(step, targetClass, mode)',
      );
    }
    if (this.toolIntelligenceService && this.toolIntelligenceService !== service) {
      throw new Error('attachToolIntelligenceService: another service is already attached');
    }
    this.toolIntelligenceService = service;
    if (context) this.toolIntelligenceContext = context;
  }

  /**
   * Return the attached Tool Intelligence Service, or null. Step agents
   * call this to ask the service for a recommended platform.
   */
  getToolIntelligenceService(): ToolIntelligenceServiceLike | null {
    return this.toolIntelligenceService;
  }

  /**
   * Internal helper used by executeStep() to pre-select a platform for
   * the step and emit a `tool.selection` audit row. Best-effort: any
   * failure surfaces a lineage row with `error` set and DOES NOT throw.
   */
  private async recordToolSelection(runId: string, stepKey: string): Promise<void> {
    const svc = this.toolIntelligenceService;
    if (!svc) return;
    const ctx = this.toolIntelligenceContext ?? {};
    const mode = ctx.mode ?? 'AUTOMATIC';
    const targetClass = ctx.targetClass ?? null;
    try {
      const selection = await svc.getTopTool(stepKey, targetClass ?? undefined, mode);
      const selected = mode === 'GUIDED'
        ? (Array.isArray(selection) ? selection.map((p) => p.platform_name) : null)
        : (selection && typeof (selection as { platform_name?: unknown }).platform_name === 'string'
            ? (selection as { platform_name: string }).platform_name
            : null);
      await this.cold.append({
        runId,
        stepKey,
        phase: 'tool.selection',
        at: this.clock(),
        meta: {
          mode,
          target_class: targetClass,
          product_id: ctx.productId ?? null,
          selected,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      try {
        await this.cold.append({
          runId,
          stepKey,
          phase: 'tool.selection',
          at: this.clock(),
          error: msg,
          meta: {
            mode,
            target_class: targetClass,
            product_id: ctx.productId ?? null,
            selected: null,
          },
        });
      } catch { /* cold-store failure is non-fatal — recommend_only */ }
    }
  }

  /**
   * Invoke the step-owner for a step key and return its recommendation
   * envelope. Non-blocking: the recommendation is informational. If no
   * step-owner is registered for this step, returns null. If the agent
   * throws, surfaces the error as a low-confidence recommendation envelope
   * — the orchestrator never propagates step-owner failures up to the
   * caller (recommend_only invariant).
   */
  async invokeStepOwner(
    stepKey: string,
    ctx: { runId: string; productId?: string; spec?: unknown; sourceSpecRef?: string | null; stepInputs?: unknown },
  ): Promise<StepOwnerRecommendation | null> {
    const agent = this.stepOwners.get(stepKey);
    if (!agent) return null;
    // PA #2.7 peer nice-to-have #2: keep recommend_only non-blocking end-to-
    // end — return a low-confidence envelope on missing runId instead of
    // throwing. Callers (Auto Runner) never have to wrap this in try/catch.
    if (!ctx || typeof ctx.runId !== 'string' || !ctx.runId) {
      return Object.freeze({
        agent_id: 0,
        recommendation: 'invokeStepOwner: ctx.runId required',
        confidence: 0,
        metadata: { ok: false, error: 'missing runId', stepKey },
      });
    }
    try {
      const rec = await agent.recommend(ctx);
      // Defensive shape validation — surface the recommendation as-is when
      // it matches the contract; wrap when it doesn't.
      if (
        rec &&
        typeof rec.agent_id === 'number' &&
        typeof rec.recommendation === 'string' &&
        typeof rec.confidence === 'number' &&
        rec.metadata && typeof rec.metadata === 'object'
      ) {
        return rec as StepOwnerRecommendation;
      }
      return Object.freeze({
        agent_id: 0,
        recommendation: 'invalid recommendation envelope from step-owner',
        confidence: 0,
        metadata: { ok: false, error: 'malformed recommendation', stepKey, runId: ctx.runId, raw: rec },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Object.freeze({
        agent_id: 0,
        recommendation: `step-owner threw: ${msg}`,
        confidence: 0,
        metadata: { ok: false, error: msg, stepKey, runId: ctx.runId },
      });
    }
  }
}

// ── Wire-in agent shapes (PA #2.7) ─────────────────────────────────────────

/**
 * Minimum surface the OrchestratorHub consumes from an always-on agent.
 * Agent #1 (LifecycleEngine) satisfies this via attachAsAlwaysOnSupervisor.
 */
export interface AlwaysOnAgent {
  attachAsAlwaysOnSupervisor(): () => void;
}

/**
 * Canonical step-owner recommendation envelope. Every step-owner returns
 * this shape from its recommend() method.
 */
export interface StepOwnerRecommendation {
  readonly agent_id: number;
  readonly recommendation: string;
  readonly confidence: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Minimum surface the OrchestratorHub consumes from a step-owner agent.
 * Agent #2 (CodeBuilder) satisfies this via recommend(ctx).
 */
export interface StepOwnerAgent {
  recommend(ctx: {
    runId: string;
    productId?: string;
    spec?: unknown;
    sourceSpecRef?: string | null;
    stepInputs?: unknown;
  }): Promise<StepOwnerRecommendation>;
}

// ── W5b Tool Intelligence wire-in shapes ─────────────────────────────────

/**
 * Minimum surface the OrchestratorHub consumes from
 * ToolIntelligenceService. Real implementation lives at
 * src/lib/tools/ToolIntelligenceService.js — typed here as an interface
 * so the hub can be exercised in TS tests with a stub.
 */
export interface ToolIntelligenceServiceLike {
  getTopTool(
    step: string,
    targetClass?: string,
    mode?: string,
  ): Promise<unknown>;
}

export interface ToolIntelligenceContext {
  readonly mode?: string;
  readonly targetClass?: string | null;
  readonly productId?: string | null;
}

// ── In-memory store implementations (for tests + local dev) ──────────────────

export function createMemoryHotStore(opts?: { clock?: () => number }): HotStore {
  const clock = opts?.clock ?? (() => Date.now());
  const map = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get(key: string) {
      const e = map.get(key);
      if (!e) return null;
      if (e.expiresAt <= clock()) {
        map.delete(key);
        return null;
      }
      return e.value;
    },
    async set(key: string, value: unknown, ttlSec: number) {
      map.set(key, { value, expiresAt: clock() + ttlSec * 1000 });
    },
    async delete(key: string) {
      map.delete(key);
    },
  };
}

export function createMemoryColdStore(): ColdStore & { entries: AuditEntry[] } {
  const entries: AuditEntry[] = [];
  return {
    entries,
    async append(entry: AuditEntry) {
      entries.push(Object.freeze({ ...entry, meta: entry.meta ? Object.freeze({ ...entry.meta }) : undefined }));
    },
  };
}
