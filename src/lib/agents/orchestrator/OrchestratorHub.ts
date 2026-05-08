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
  | 'route.decision';

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
