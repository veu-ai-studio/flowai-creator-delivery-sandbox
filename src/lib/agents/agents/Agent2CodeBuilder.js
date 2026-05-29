/**
 * Agent #2 — Code Builder
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/agents/Agent2CodeBuilder.js  (W5 territory)
 * Mode:     step-owner (Step 3 'build' in the 8-step Auto Runner)
 * Authority: recommend_only
 * Embedding: Embedded (consumer-facing via Integration Contract)
 *
 * Responsibilities (per Agent #2 spec):
 *   - Consume `7.design.spec.v1` and `3.renewal.candidate.v1`
 *   - Emit `2.build.completed.v1` with { artifactRef, hash, sourceSpecRef, runId }
 *   - Emit `2.build.failed.v1` with { phase, exitCode, stderr, retryable, sourceSpecRef, runId }
 *     on any failure (closes D-004)
 *   - Hash-pin every artifact with SHA-256 before emission (closes D-003)
 *   - Refuse if input spec is missing or malformed
 *   - recommend_only: never write artifacts to production paths from this agent
 *
 * Architecture
 *   The agent NEVER shells out. recommend_only forbids it. The actual build
 *   step (compiling, bundling, etc.) is delegated to a consumer-injected
 *   `executeBuild` callback. The agent's role is:
 *     1. Precheck the spec (size, shape, identifier sanitization)
 *     2. Run the consumer's `beforeBuild` plugin hook (if provided)
 *     3. Invoke `executeBuild` (if provided) and capture the descriptor
 *     4. Compute SHA-256 of the artifact (twice — re-hash for integrity)
 *     5. Run the consumer's `afterBuild` plugin hook (if provided)
 *     6. Build a recommendation plan (sideEffects=[], emits=[…])
 *   `act()` then publishes the prepared events to the MessageBus and writes
 *   lineage to ColdStore. No entity writes, no file writes, no shelling.
 *
 * Storage seams (used via interfaces only — no direct KV/Supabase calls):
 *   - hot   — HotStore   for in-flight build state (`build:run:<runId>`,
 *                         24h TTL), retry tracking, dedup
 *   - cold  — ColdStore  for the canonical audit trail (lineage rows with
 *                         agentId=2, authority=recommend_only)
 *   - bus   — MessageBus for cross-agent comms (publish/subscribe only)
 *
 * Configuration surface (per Integration Contract):
 *   buildTargets:        BuildTargetSpec[]  — what to build
 *   hashAlgorithm:       'sha256'           — locked, exposed for forward compat
 *   maxSpecSizeBytes:    number             — default 10_485_760 (10 MiB)
 *
 * Plugin extension points (per Integration Contract):
 *   beforeBuild(spec):              SpecValidationResult
 *   afterBuild(artifact, hash):     void
 * ---------------------------------------------------------------------------
 */

'use strict';

import { createHash } from 'node:crypto';
import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';

const HASH_ALGORITHM = 'sha256'; // locked
const DEFAULT_MAX_SPEC_BYTES = 10 * 1024 * 1024; // 10 MiB
const HOT_TTL_SECONDS = 24 * 60 * 60; // 24h per spec

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
// Identifier fields in a spec that MUST be slug-safe. Anything in this set is
// validated against SLUG_RE during precheck — protects against shell
// metacharacter injection in fields the consumer will later interpolate
// into a build command, path, or URL.
const IDENTIFIER_FIELDS = ['name', 'version', 'target', 'targetName'];

// Required spec fields. Missing any → precheck failure.
const REQUIRED_SPEC_FIELDS = ['name', 'version'];

const HOT_KEYS = Object.freeze({
  run: (runId) => `build:run:${runId}`,
});

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent2CodeBuilder extends BaseAgent {
  /**
   * @type {2}
   */
  static charterId = 2;

  /**
   * BaseAgent.charter() contract — id 2 (Code Builder), embedded, recommend_only.
   * Sourced from `_registry.ts` so single-source-of-truth holds.
   */
  static charter() {
    const r = getAgent(2);
    if (!r) {
      throw new Error('Agent2CodeBuilder: registry entry for id=2 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false, // #2 is in EMBEDDED_AGENTS per BaseAgent.js
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
   * @param {Array<object>} [deps.buildTargets]
   * @param {number} [deps.maxSpecSizeBytes]
   * @param {(spec: object) => any} [deps.beforeBuild]
   * @param {(artifact: any, hash: string) => any} [deps.afterBuild]
   * @param {(spec: object, target: object) => Promise<object>} [deps.executeBuild]
   */
  constructor(deps) {
    super(deps);
    if (!deps.hot) throw new Error('Agent2CodeBuilder: hot store required');
    if (!deps.cold) throw new Error('Agent2CodeBuilder: cold store required');
    if (!deps.messageBus) throw new Error('Agent2CodeBuilder: messageBus required');
    this.hot = deps.hot;
    this.cold = deps.cold;
    this.bus = deps.messageBus;

    // Configuration surface (Integration Contract).
    const maxBytes = deps.maxSpecSizeBytes ?? DEFAULT_MAX_SPEC_BYTES;
    if (typeof maxBytes !== 'number' || !Number.isFinite(maxBytes) || maxBytes <= 0) {
      throw new RangeError('Agent2CodeBuilder: maxSpecSizeBytes must be a positive finite number');
    }
    this.config = Object.freeze({
      buildTargets: Array.isArray(deps.buildTargets) ? [...deps.buildTargets] : [],
      hashAlgorithm: HASH_ALGORITHM,
      maxSpecSizeBytes: maxBytes,
    });

    // Plugin extension points.
    this.plugins = Object.freeze({
      beforeBuild: typeof deps.beforeBuild === 'function' ? deps.beforeBuild : null,
      afterBuild: typeof deps.afterBuild === 'function' ? deps.afterBuild : null,
    });

    // Optional consumer-injected build runner. The agent NEVER shells out
    // itself; this callback is where the actual artifact is produced.
    this.executeBuild = typeof deps.executeBuild === 'function' ? deps.executeBuild : null;

    this._busHandles = [];
    this._busAttached = false;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan a build. Input shape:
   *   { kind: 'build.request', runId, spec, sourceSpecRef? }
   *
   * Returns a recommend_only plan: sideEffects always [], proposed events
   * always include exactly one of `2.build.completed.v1` or
   * `2.build.failed.v1`.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'build.request') {
      throw new Error("Agent2CodeBuilder.plan: input.kind must be 'build.request'");
    }
    if (typeof input.runId !== 'string' || !input.runId) {
      throw new Error('Agent2CodeBuilder.plan: input.runId required');
    }

    const at = this.deps.clock.now();
    const sourceSpecRef = input.sourceSpecRef ?? null;
    const spec = input.spec;

    // ── Precheck phase ─────────────────────────────────────────────────────
    const precheck = await this._precheck(spec);
    if (!precheck.ok) {
      return this._failedPlan({
        runId: input.runId,
        sourceSpecRef,
        phase: 'precheck',
        exitCode: 0,
        stderr: precheck.reason,
        retryable: false, // malformed/oversize input never gets better on retry
        at,
      });
    }

    // ── beforeBuild plugin ────────────────────────────────────────────────
    if (this.plugins.beforeBuild) {
      let pluginResult;
      try {
        pluginResult = await this.plugins.beforeBuild(spec);
      } catch (e) {
        return this._failedPlan({
          runId: input.runId,
          sourceSpecRef,
          phase: 'precheck',
          exitCode: 0,
          stderr: `beforeBuild threw: ${e?.message ?? e}`,
          retryable: false,
          at,
        });
      }
      if (pluginResult && pluginResult.ok === false) {
        return this._failedPlan({
          runId: input.runId,
          sourceSpecRef,
          phase: pluginResult.phase ?? 'precheck',
          exitCode: 0,
          stderr: pluginResult.reason ?? 'beforeBuild rejected spec',
          retryable: false,
          at,
        });
      }
    }

    // ── Execute phase ─────────────────────────────────────────────────────
    let buildResult;
    if (this.executeBuild) {
      try {
        buildResult = await this.executeBuild(spec, this.config.buildTargets);
      } catch (e) {
        return this._failedPlan({
          runId: input.runId,
          sourceSpecRef,
          phase: 'execute',
          exitCode: 1,
          stderr: `executeBuild threw: ${e?.message ?? e}`,
          retryable: true,
          at,
        });
      }
      if (!buildResult || buildResult.ok !== true) {
        return this._failedPlan({
          runId: input.runId,
          sourceSpecRef,
          phase: 'execute',
          exitCode: typeof buildResult?.exitCode === 'number' ? buildResult.exitCode : 1,
          stderr: typeof buildResult?.stderr === 'string' ? buildResult.stderr : 'build failed',
          retryable: buildResult?.retryable !== false, // default true on missing
          at,
        });
      }
    } else {
      // No executeBuild injected — the agent treats the spec itself as the
      // artifact (recommend-only passthrough). This is the no-op path used
      // when the consumer wants the validation+hash dance only.
      buildResult = { ok: true, artifact: spec, artifactRef: sourceSpecRef ?? null };
    }

    // ── Integrity phase ───────────────────────────────────────────────────
    const artifact = buildResult.artifact;
    let hash1, hash2;
    try {
      hash1 = sha256OfArtifact(artifact);
      hash2 = sha256OfArtifact(artifact);
    } catch (e) {
      return this._failedPlan({
        runId: input.runId,
        sourceSpecRef,
        phase: 'integrity',
        exitCode: 0,
        stderr: `hash failed: ${e?.message ?? e}`,
        retryable: false,
        at,
      });
    }
    if (hash1 !== hash2) {
      return this._failedPlan({
        runId: input.runId,
        sourceSpecRef,
        phase: 'integrity',
        exitCode: 0,
        stderr: `re-hash mismatch — artifact mutated between hash passes (${hash1} → ${hash2})`,
        retryable: true,
        at,
      });
    }

    // ── afterBuild plugin (best-effort; failures don't fail the build) ────
    if (this.plugins.afterBuild) {
      try {
        await this.plugins.afterBuild(artifact, hash1);
      } catch (e) {
        // afterBuild errors don't reverse a successful build; surface only
        // via the lineage.meta.afterBuildError field.
        return this._completedPlan({
          runId: input.runId,
          sourceSpecRef,
          artifactRef: buildResult.artifactRef ?? null,
          hash: hash1,
          at,
          afterBuildError: String(e?.message ?? e),
        });
      }
    }

    return this._completedPlan({
      runId: input.runId,
      sourceSpecRef,
      artifactRef: buildResult.artifactRef ?? null,
      hash: hash1,
      at,
    });
  }

  /**
   * Publish prepared events to the MessageBus, persist run state to HotStore,
   * record lineage to ColdStore. recommend_only: zero side effects beyond
   * pub/sub + storage seam writes (which are themselves audit-only).
   */
  async act(ctx, plan) {
    if (!plan || !Array.isArray(plan.proposed?.emit)) {
      throw new Error('Agent2CodeBuilder.act: invalid plan');
    }
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent2CodeBuilder.act: recommend_only forbids sideEffects');
    }

    const runId = ctx?.input?.runId ?? plan.proposed.emit[0]?.payload?.runId ?? 'unknown';
    const at = this.deps.clock.now();

    // Persist run state (in-flight build state, retry tracking).
    await this.hot.set(
      HOT_KEYS.run(runId),
      {
        runId,
        outcome: plan.outcome,
        hash: plan.hash ?? null,
        sourceSpecRef: plan.sourceSpecRef ?? null,
        at,
      },
      HOT_TTL_SECONDS,
    );

    // Append lineage row.
    await this.cold.append({
      runId,
      stepKey: 'build',
      phase: plan.outcome === 'completed' ? 'step.success' : 'step.failure',
      at,
      agentId: 2,
      authority: AUTHORITY.RECOMMEND_ONLY,
      meta: {
        outcome: plan.outcome,
        hash: plan.hash ?? null,
        sourceSpecRef: plan.sourceSpecRef ?? null,
        failurePhase: plan.failurePhase ?? null,
        retryable: plan.retryable ?? null,
        afterBuildError: plan.afterBuildError ?? null,
      },
    });

    // Publish proposed events.
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
   * Build-step recommendation for the OrchestratorHub. recommend_only —
   * never executes side effects. Wraps plan() and shapes the output to
   * the canonical `{ agent_id, recommendation, confidence, metadata }`
   * envelope every step-owner returns.
   *
   * @param {{ runId: string, productId?: string, spec?: object, sourceSpecRef?: string|null, stepInputs?: object }} ctx
   * @returns {Promise<{ agent_id: 2, recommendation: string, confidence: number, metadata: object }>}
   */
  async recommend(ctx) {
    if (!ctx || typeof ctx.runId !== 'string' || !ctx.runId) {
      throw new Error('Agent2CodeBuilder.recommend: ctx.runId required');
    }
    // The plan-level input shape mirrors what AutoRunner sends through the
    // MessageBus: { kind: 'build.request', runId, spec, sourceSpecRef? }.
    const planInput = {
      kind: 'build.request',
      runId: ctx.runId,
      spec: ctx.spec ?? ctx.stepInputs ?? {},
      sourceSpecRef: ctx.sourceSpecRef ?? null,
    };
    let plan;
    try {
      plan = await this.plan({ input: planInput, runId: ctx.runId });
    } catch (e) {
      // recommend_only — surface failure as a low-confidence recommendation
      // rather than throwing back at the orchestrator. The orchestrator
      // never blocks on Agent #2.
      return Object.freeze({
        agent_id: 2,
        recommendation: `build precheck threw: ${e?.message ?? e}`,
        confidence: 0,
        metadata: Object.freeze({
          ok: false,
          error: String(e?.message ?? e),
          runId: ctx.runId,
          productId: ctx.productId ?? null,
        }),
      });
    }
    const completed = plan.outcome === 'completed';
    // Confidence model (intentionally simple, easy to evolve):
    //   completed             → 0.9
    //   failed / retryable    → 0.3
    //   failed / non-retry    → 0.1
    let confidence;
    if (completed) confidence = 0.9;
    else if (plan.retryable) confidence = 0.3;
    else confidence = 0.1;
    return Object.freeze({
      agent_id: 2,
      recommendation: plan.summary,
      confidence,
      metadata: Object.freeze({
        ok: completed,
        outcome: plan.outcome,
        hash: plan.hash ?? null,
        sourceSpecRef: plan.sourceSpecRef ?? null,
        failurePhase: plan.failurePhase ?? null,
        retryable: plan.retryable ?? null,
        afterBuildError: plan.afterBuildError ?? null,
        runId: ctx.runId,
        productId: ctx.productId ?? null,
        emit: plan.proposed.emit.map((e) => e.topic),
      }),
    });
  }

  // ── MessageBus subscription helpers ────────────────────────────────────────

  /**
   * Subscribe to all charter.consumes topics. Idempotent — second call
   * returns 0. Returns the count of new subscriptions made.
   */
  attachBusSubscriptions() {
    if (this._busAttached) return 0;
    const charter = Agent2CodeBuilder.charter();
    let n = 0;
    for (const topic of charter.consumes) {
      // Subscribed handler is intentionally minimal: it logs the observed
      // event into ColdStore so the lineage shows what triggered builds.
      // The actual build is driven through agent.run({ kind: 'build.request' }).
      const off = this.bus.subscribe(topic, async (payload, meta) => {
        const runId =
          (payload && typeof payload.runId === 'string' && payload.runId) ||
          'unknown';
        try {
          await this.cold.append({
            runId,
            stepKey: 'build',
            phase: 'route.decision',
            at: this.deps.clock.now(),
            agentId: 2,
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

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Validate the spec shape before any build runs.
   * Returns SpecValidationResult.
   * @returns {Promise<{ ok: boolean, reason?: string, field?: string }>}
   */
  async _precheck(spec) {
    if (spec === null || spec === undefined || typeof spec !== 'object' || Array.isArray(spec)) {
      return { ok: false, reason: 'spec must be a non-array object' };
    }

    const keys = Object.keys(spec);
    if (keys.length === 0) {
      return { ok: false, reason: 'spec is empty' };
    }

    // Size guard. JSON.stringify byte length approximates payload size.
    let serialized;
    try {
      serialized = JSON.stringify(spec);
    } catch {
      return { ok: false, reason: 'spec is not JSON-serializable (cyclic?)' };
    }
    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > this.config.maxSpecSizeBytes) {
      return {
        ok: false,
        reason: `spec exceeds maxSpecSizeBytes (${bytes} > ${this.config.maxSpecSizeBytes})`,
      };
    }

    // Required fields.
    for (const f of REQUIRED_SPEC_FIELDS) {
      if (!(f in spec) || spec[f] === undefined || spec[f] === null) {
        return { ok: false, reason: `missing required field "${f}"`, field: f };
      }
    }

    // Identifier-field sanitization. Any IDENTIFIER_FIELDS present in the
    // spec must be slug-safe. Hostile input (`name: "foo;rm -rf /"`) is
    // rejected here — the agent never executes shell strings.
    for (const f of IDENTIFIER_FIELDS) {
      if (!(f in spec)) continue;
      const v = spec[f];
      if (typeof v !== 'string') {
        return { ok: false, reason: `identifier field "${f}" must be a string`, field: f };
      }
      if (!SLUG_RE.test(v)) {
        return {
          ok: false,
          reason: `identifier field "${f}" contains disallowed characters; must match ${SLUG_RE}`,
          field: f,
        };
      }
    }

    return { ok: true };
  }

  /**
   * @returns {object} a frozen plan declaring success.
   */
  _completedPlan({ runId, sourceSpecRef, artifactRef, hash, at, afterBuildError }) {
    const payload = {
      runId,
      artifactRef,
      hash,
      sourceSpecRef,
      at,
    };
    return Object.freeze({
      summary: `build completed for run ${runId} — sha256:${hash.slice(0, 8)}`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: 'completed',
      hash,
      sourceSpecRef,
      afterBuildError: afterBuildError ?? null,
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({ topic: '2.build.completed.v1', payload: Object.freeze(payload) }),
        ]),
      }),
    });
  }

  /**
   * @returns {object} a frozen plan declaring failure.
   */
  _failedPlan({ runId, sourceSpecRef, phase, exitCode, stderr, retryable, at }) {
    const payload = {
      runId,
      phase,
      exitCode,
      stderr,
      retryable,
      sourceSpecRef,
      at,
    };
    return Object.freeze({
      summary: `build failed for run ${runId} (phase=${phase}, retryable=${retryable})`,
      authorityNeeded: [AUTHORITY.RECOMMEND_ONLY],
      sideEffects: [],
      outcome: 'failed',
      hash: null,
      sourceSpecRef,
      failurePhase: phase,
      retryable,
      proposed: Object.freeze({
        emit: Object.freeze([
          Object.freeze({ topic: '2.build.failed.v1', payload: Object.freeze(payload) }),
        ]),
      }),
    });
  }
}

// ── Local helpers ────────────────────────────────────────────────────────────

/**
 * SHA-256 hex digest of a build artifact. Strings/Buffers/Uint8Arrays hash
 * directly; plain objects hash via canonical JSON (sorted keys at every
 * depth) so insertion order doesn't leak into the digest.
 */
function sha256OfArtifact(artifact) {
  if (artifact === null || artifact === undefined) {
    throw new TypeError('sha256OfArtifact: artifact required');
  }
  let bytes;
  if (typeof artifact === 'string') {
    bytes = Buffer.from(artifact, 'utf8');
  } else if (artifact instanceof Uint8Array) {
    bytes = Buffer.from(artifact);
  } else if (Buffer.isBuffer(artifact)) {
    bytes = artifact;
  } else if (typeof artifact === 'object') {
    bytes = Buffer.from(canonicalJson(artifact), 'utf8');
  } else {
    throw new TypeError(`sha256OfArtifact: unsupported artifact type "${typeof artifact}"`);
  }
  return createHash(HASH_ALGORITHM).update(bytes).digest('hex');
}

/**
 * Canonical JSON: deterministic serialization with object keys sorted at
 * every depth. Rejects cyclic refs, BigInt, undefined inside arrays, NaN,
 * and Infinity for the same hash-determinism reason `src/lib/shared/hashing.ts`
 * (Part 1 spec) covers.
 */
function canonicalJson(value, seen = new WeakSet()) {
  if (value === null) return 'null';
  if (value === undefined) {
    throw new TypeError('canonicalJson: undefined not allowed');
  }
  const t = typeof value;
  if (t === 'boolean' || t === 'string') return JSON.stringify(value);
  if (t === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`canonicalJson: ${value} not allowed`);
    }
    return JSON.stringify(value);
  }
  if (t === 'bigint') throw new TypeError('canonicalJson: BigInt not allowed');
  if (t !== 'object') throw new TypeError(`canonicalJson: unsupported type "${t}"`);

  if (seen.has(value)) throw new TypeError('canonicalJson: cyclic reference');
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return '[' + value.map((v) => canonicalJson(v, seen)).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const k of keys) {
      const v = value[k];
      if (v === undefined) continue; // mirror JSON.stringify
      parts.push(JSON.stringify(k) + ':' + canonicalJson(v, seen));
    }
    return '{' + parts.join(',') + '}';
  } finally {
    seen.delete(value);
  }
}

// Exported for unit tests only — not part of the public API.
export const __test = { sha256OfArtifact, canonicalJson };
