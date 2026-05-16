/**
 * Immutable Agent Registry — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/_registry.ts (W5 territory)
 * Status:   Pre-build foundation. None of the 20 agents are implemented yet;
 *           this registry is the single source of truth for *what they will
 *           be* once they are.
 *
 * Schema per agent:
 *   id                    — 1..25, matches AGENT_IDS in BaseAgent.js
 *   name                  — short human-readable label
 *   mode                  — 'always-on' | 'step-owner' | 'cross-step'
 *   authority             — readonly tuple of authority levels (recommend_only
 *                            for now per dispatch; expand later as agents
 *                            graduate through the gate ladder)
 *   requiredCredentials   — Doppler/W1 credential keys this agent will need
 *   consumes              — message-bus topics this agent subscribes to
 *   produces              — message-bus topics this agent publishes
 *   escalationPolicy      — terse string describing when/how to escalate
 *
 * Mode classification:
 *   - always-on    runs continuously across the full lifecycle
 *   - step-owner   owns one of the 8 Auto Runner steps
 *                  (research, design, build, qa_audit, govern, gtm, monitor;
 *                   step 5 'deploy' is currently orchestrator-only)
 *   - cross-step   intervenes opportunistically across multiple steps,
 *                  not tied to a single step's lifecycle
 *
 * The registry object and every entry on it are deeply frozen at module load.
 * Mutation attempts will throw in strict mode and silently noop otherwise.
 * ---------------------------------------------------------------------------
 */

export type AgentMode = 'always-on' | 'step-owner' | 'cross-step';

export type AuthorityLevel =
  | 'recommend_only'
  | 'draft_only'
  | 'auto_contain_known'
  | 'auto_write_internal'
  | 'requires_human_gate';

export interface AgentRecord {
  readonly id: number;
  readonly name: string;
  readonly mode: AgentMode;
  readonly authority: readonly AuthorityLevel[];
  readonly requiredCredentials: readonly string[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly escalationPolicy: string;
}

/**
 * Runtime active-registration record. Distinct from the static AgentRecord
 * (which is the charter). Active records track which agents are wired into
 * the runtime AT THIS MOMENT, with a step number for step-owners. PA #2.7
 * introduces this layer so OrchestratorHub can route step calls without
 * lifting the static charter into mutable state.
 *
 * `step` is required for mode='step-owner' (the step number it owns) and
 * null for all other modes.
 */
export interface ActiveAgentRecord {
  readonly id: number;
  readonly name: string;
  readonly mode: AgentMode;
  readonly authority: AuthorityLevel; // single granted level; charter may declare more
  readonly step: number | null;
}

const AGENTS: AgentRecord[] = [
  {
    id: 1,
    name: 'Lifecycle Engine',
    mode: 'always-on',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [
      '2.build.completed.v1',
      '8.audit.completed.v1',
      'system.clearance.decision.v1',
    ],
    produces: ['1.product.lifecycle_event.v1', '1.product.gate_request.v1'],
    escalationPolicy:
      'Block stage advance on any clearance failure; emit gate_request to W0 on every transition.',
  },
  {
    id: 2,
    name: 'Code Builder',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: ['7.design.spec.v1', '3.renewal.candidate.v1'],
    produces: ['2.build.completed.v1', '2.build.failed.v1'],
    escalationPolicy: 'On build failure with retryable=false, escalate to #1 and W0.',
  },
  {
    id: 3,
    name: 'Self-Renewal',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [
      '8.audit.completed.v1',
      '10.anomaly.v1',
      '17.evolution.proposal.v1',
    ],
    produces: ['3.renewal.candidate.v1', '3.renewal.applied.v1'],
    escalationPolicy:
      'No silent rollbacks. Failed apply emits 3.renewal.applied.v1 with outcome=rolled_back; escalate to #1.',
  },
  {
    id: 4,
    name: 'Provider Onboarding',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: ['4.provider.onboarded.v1', '4.provider.suspended.v1'],
    escalationPolicy:
      'FlowAI-only. Refuse activation if provider credentials cannot be probed via CredentialAdapter.',
  },
  {
    id: 5,
    name: 'End-Customer Intake',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: ['4.provider.suspended.v1'],
    produces: ['5.endcustomer.intake.completed.v1'],
    escalationPolicy:
      'FlowAI-only. Reject intake if provider scope is suspended or unprovisioned.',
  },
  {
    id: 6,
    name: 'Research',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY', 'BROWSERLESS_TOKEN'],
    consumes: [],
    produces: ['6.research.brief.v1'],
    escalationPolicy:
      'On page-fetch failure, surface FetchFailurePrompt and pause session — do not fabricate brief.',
  },
  {
    id: 7,
    name: 'Design',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['6.research.brief.v1'],
    produces: ['7.design.spec.v1'],
    escalationPolicy: 'On missing research brief, request re-run from #6 instead of guessing.',
  },
  {
    id: 8,
    name: 'Quality Audit',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['2.build.completed.v1', '7.design.spec.v1'],
    produces: ['8.audit.requested.v1', '8.audit.completed.v1'],
    escalationPolicy:
      'FlowAI-only. Self-audit forbidden — must use auditor-of-auditor for Agent #8 itself.',
  },
  {
    id: 9,
    name: 'Go-To-Market',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['8.audit.completed.v1'],
    produces: ['9.gtm.asset.v1'],
    escalationPolicy:
      'All assets emitted as draft=true. Authority guard rejects any non-draft side effects until W0 approves.',
  },
  {
    id: 10,
    name: 'Monitor',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: ['10.metric.v1', '10.health.v1', '10.anomaly.v1'],
    escalationPolicy:
      'Every metric must include unit. Anomalies with severity=high escalate to #12 within 60s.',
  },
  {
    id: 11,
    name: 'Strategic Intelligence',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['10.health.v1', '15.benchmark.report.v1', '14.regulation.new.v1'],
    produces: [
      '11.brief.weekly.v1',
      '11.alert.material.v1',
      '11.trajectory.report.v1',
    ],
    escalationPolicy: 'FlowAI-only. Material events alert W0 within 15 minutes of detection.',
  },
  {
    id: 12,
    name: 'Portfolio Risk & Fire Detection',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: ['10.anomaly.v1', '13.threat.detected.v1'],
    produces: [
      '12.fire.p0.v1',
      '12.fire.p1.v1',
      '12.fire.p2.v1',
      '12.health.daily.v1',
      'portfolio.fire.v1',
    ],
    escalationPolicy:
      'FlowAI-only. P0 fires escalate immediately to W0; P1 within minutes; P2 weekly digest.',
  },
  {
    id: 13,
    name: 'Self-Protection',
    mode: 'always-on',
    authority: ['recommend_only'],
    requiredCredentials: ['CLOUDFLARE_API_TOKEN'],
    consumes: [],
    produces: [
      '13.threat.detected.v1',
      '13.signature.update.v1',
      '13.dmca.filed.v1',
    ],
    escalationPolicy:
      'IP-protection baseline must be present on every product surface; threats trigger #12 fire pipeline.',
  },
  {
    id: 14,
    name: 'Public Policy',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: [],
    produces: [
      '14.regulation.new.v1',
      '14.regulation.update.v1',
      '14.compliance.brief.weekly.v1',
    ],
    escalationPolicy:
      'FlowAI-only. New regulations in user-selected jurisdictions alert W0 same-day.',
  },
  {
    id: 15,
    name: 'Benchmarking & Competition',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['7.design.spec.v1'],
    produces: ['15.benchmark.report.v1'],
    escalationPolicy:
      'Benchmark against named peer sets only — do not compare against unspecified general baselines.',
  },
  {
    id: 16,
    name: 'Productivity & HR',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: ['10.metric.v1'],
    produces: ['16.productivity.report.v1'],
    escalationPolicy:
      'FlowAI-only. Productivity reports never name individual humans — aggregate metrics only.',
  },
  {
    id: 17,
    name: 'Product Evolution',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['8.audit.completed.v1', '15.benchmark.report.v1'],
    produces: ['17.evolution.proposal.v1'],
    escalationPolicy: 'Proposals are advisory; #3 owns whether to enact them.',
  },
  {
    id: 18,
    name: 'Business Planning & Performance',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: ['10.health.v1', 'portfolio.health.v1'],
    produces: ['18.plan.update.v1'],
    escalationPolicy:
      'FlowAI-only. Plan deviations exceeding ±15% from prior baseline alert W0 within 24h.',
  },
  {
    id: 19,
    name: 'Technological Evolution',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: ['ANTHROPIC_API_KEY'],
    consumes: [],
    produces: ['19.tech.signal.v1'],
    escalationPolicy: 'Signal-only — never auto-applies tech changes.',
  },
  {
    id: 20,
    name: 'Environmental Impacts',
    mode: 'cross-step',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: ['20.impact.assessment.v1'],
    escalationPolicy: 'Assessment-only — escalates to #14 if regulatory thresholds approached.',
  },
  // ── Phase 1.0 expansion (W5b, 2026-05-11) ────────────────────────────────
  // Ops Runner Alpha/Beta/Gamma/Delta/Epsilon. Step-Owner charters reserved
  // for ops-side workstreams that own discrete pipeline steps once wired in
  // by OrchestratorHub.registerStepOwner(). Until then, these are static
  // charters only — no runtime side effects, no message bus traffic.
  {
    id: 21,
    name: 'Ops Runner Alpha — Aggressive Crawl Conductor',
    mode: 'step-owner',
    // Per SSOT §15.1 row 21 (Rev-2.1 + CA-7 §15.5 + ENTRY 006): dual + gate
    // authority. Phase 1 graduation (Panel ruling 30e5edb) exercises only
    // the recommend_only path; auto_write_internal + requires_human_gate
    // sit in the charter as the canonical surface for Phase 2-3 auth-
    // traversal + ProductSSOT writes.
    authority: ['recommend_only', 'auto_write_internal', 'requires_human_gate'],
    requiredCredentials: ['BROWSERLESS_API_KEY', 'ANTHROPIC_API_KEY'],
    consumes: ['1.crawl.request.v1', '10.ssot.updated.v1'],
    produces: ['21.crawl.completed.v1', '21.issues.detected.v1', '21.gtm.readiness.v1'],
    escalationPolicy:
      'xss-in-form-echo or auth-gate-leak detected → IMMEDIATE admin gate (security-critical); ' +
      'crawl budget exceeded → emit candidate + escalate to Ops Runner Beta; ' +
      '3 consecutive crawl failures on same product → disable crawl for that product 24h.',
  },
  {
    id: 22,
    name: 'Ops Runner Beta',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: [],
    escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.',
  },
  {
    id: 23,
    name: 'Ops Runner Gamma',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: [],
    escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.',
  },
  {
    id: 24,
    name: 'Ops Runner Delta',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: [],
    escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.',
  },
  {
    id: 25,
    name: 'Ops Runner Epsilon',
    mode: 'step-owner',
    authority: ['recommend_only'],
    requiredCredentials: [],
    consumes: [],
    produces: [],
    escalationPolicy: 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.',
  },
];

// ── Deep-freeze helpers ──────────────────────────────────────────────────────
function deepFreezeAgent(a: AgentRecord): AgentRecord {
  return Object.freeze({
    ...a,
    authority: Object.freeze([...a.authority]) as readonly AuthorityLevel[],
    requiredCredentials: Object.freeze([...a.requiredCredentials]) as readonly string[],
    consumes: Object.freeze([...a.consumes]) as readonly string[],
    produces: Object.freeze([...a.produces]) as readonly string[],
  });
}

// ── Frozen registry ──────────────────────────────────────────────────────────
export const AGENT_REGISTRY: readonly AgentRecord[] = Object.freeze(
  AGENTS.map(deepFreezeAgent),
);

// ── Indexes ──────────────────────────────────────────────────────────────────
const BY_ID: Record<number, AgentRecord> = Object.freeze(
  AGENT_REGISTRY.reduce((acc, a) => {
    acc[a.id] = a;
    return acc;
  }, {} as Record<number, AgentRecord>),
);

export function getAgent(id: number): AgentRecord | undefined {
  return BY_ID[id];
}

export function listAgentsByMode(mode: AgentMode): readonly AgentRecord[] {
  return Object.freeze(AGENT_REGISTRY.filter((a) => a.mode === mode));
}

// ── Active runtime registry (PA #2.7) ────────────────────────────────────────
//
// The static AGENT_REGISTRY above declares all 20 charters at module load.
// The active registry tracks which agents are *currently wired into the
// runtime* — i.e., have been instantiated and connected to MessageBus +
// stores. registerAgent() is idempotent: re-registering the SAME shape is a
// no-op; re-registering a CONFLICTING shape throws.
//
// Step-owner records carry a step number. Always-on / cross-step records
// carry step=null.

const ACTIVE: Map<number, ActiveAgentRecord> = new Map();

function sameActive(a: ActiveAgentRecord, b: ActiveAgentRecord): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.mode === b.mode &&
    a.authority === b.authority &&
    (a.step ?? null) === (b.step ?? null)
  );
}

/**
 * Register an agent into the active runtime registry. Idempotent: passing
 * the SAME record twice is a noop. Conflicting record (same id, different
 * shape) throws.
 *
 * Validations:
 *   - id must match a charter in AGENT_REGISTRY
 *   - mode must match the charter's mode
 *   - authority must be one of the charter's declared levels
 *   - step must be null for non-step-owner modes
 *   - step must be a positive integer for step-owner mode
 */
export function registerAgent(record: ActiveAgentRecord): ActiveAgentRecord {
  if (!record || typeof record.id !== 'number') {
    throw new TypeError('registerAgent: record with numeric id required');
  }
  const charter = getAgent(record.id);
  if (!charter) {
    throw new Error(`registerAgent: unknown agent id ${record.id}`);
  }
  if (record.name !== charter.name) {
    throw new Error(
      `registerAgent: agent ${record.id} name "${record.name}" disagrees with charter "${charter.name}"`,
    );
  }
  if (record.mode !== charter.mode) {
    throw new Error(
      `registerAgent: agent ${record.id} mode "${record.mode}" disagrees with charter "${charter.mode}"`,
    );
  }
  if (!charter.authority.includes(record.authority)) {
    throw new Error(
      `registerAgent: agent ${record.id} authority "${record.authority}" not in charter [${charter.authority.join(', ')}]`,
    );
  }
  if (record.mode === 'step-owner') {
    if (typeof record.step !== 'number' || !Number.isInteger(record.step) || record.step < 1) {
      throw new Error(`registerAgent: agent ${record.id} (step-owner) requires positive integer step`);
    }
  } else {
    if (record.step !== null && record.step !== undefined) {
      throw new Error(
        `registerAgent: agent ${record.id} (mode=${record.mode}) must have step=null, got ${record.step}`,
      );
    }
  }

  const frozen: ActiveAgentRecord = Object.freeze({
    id: record.id,
    name: record.name,
    mode: record.mode,
    authority: record.authority,
    step: record.step ?? null,
  });

  const prior = ACTIVE.get(record.id);
  if (prior) {
    if (sameActive(prior, frozen)) return prior; // idempotent
    throw new Error(
      `registerAgent: agent ${record.id} already registered with conflicting shape ` +
      `(prior=${JSON.stringify(prior)}, new=${JSON.stringify(frozen)})`,
    );
  }

  // PA #2.7 peer must-fix #1: enforce step-ownership uniqueness — at most
  // one active agent per step number. Without this, getActiveStepOwner()
  // would return the first match by Map iteration order (nondeterministic
  // when two step-owners claim the same step).
  if (frozen.step !== null) {
    for (const existing of ACTIVE.values()) {
      if (existing.step === frozen.step && existing.id !== frozen.id) {
        throw new Error(
          `registerAgent: step ${frozen.step} is already owned by agent ${existing.id} (${existing.name})`,
        );
      }
    }
  }

  ACTIVE.set(record.id, frozen);
  return frozen;
}

/**
 * Look up the active record for an agent id. Returns undefined if not yet
 * registered.
 */
export function getActiveAgent(id: number): ActiveAgentRecord | undefined {
  return ACTIVE.get(id);
}

/**
 * Look up the active step-owner for a given step number. Returns undefined
 * if no agent owns that step at runtime.
 */
export function getActiveStepOwner(step: number): ActiveAgentRecord | undefined {
  for (const r of ACTIVE.values()) {
    if (r.step === step) return r;
  }
  return undefined;
}

/**
 * List all currently-active agent records. Returned array is frozen.
 */
export function listActiveAgents(): readonly ActiveAgentRecord[] {
  return Object.freeze([...ACTIVE.values()]);
}

/**
 * Clear the active registry. Test-only — production code never calls this.
 */
export function _resetActiveRegistry(): void {
  ACTIVE.clear();
}

// ── Roster invariants — runtime self-check at module load ────────────────────
(function validateRoster() {
  if (AGENT_REGISTRY.length !== 25) {
    throw new Error(
      `_registry: expected 25 agents, got ${AGENT_REGISTRY.length}`,
    );
  }
  const ids = new Set<number>();
  for (const a of AGENT_REGISTRY) {
    if (!Number.isInteger(a.id) || a.id < 1 || a.id > 25) {
      throw new Error(`_registry: agent id out of range: ${a.id}`);
    }
    if (ids.has(a.id)) {
      throw new Error(`_registry: duplicate agent id ${a.id}`);
    }
    ids.add(a.id);
    if (!a.name || typeof a.name !== 'string') {
      throw new Error(`_registry: agent ${a.id} missing name`);
    }
    if (!['always-on', 'step-owner', 'cross-step'].includes(a.mode)) {
      throw new Error(`_registry: agent ${a.id} invalid mode "${a.mode}"`);
    }
    if (!a.authority || a.authority.length === 0) {
      throw new Error(`_registry: agent ${a.id} authority must be non-empty`);
    }
  }
  for (let i = 1; i <= 25; i++) {
    if (!ids.has(i)) {
      throw new Error(`_registry: missing agent id ${i}`);
    }
  }
})();

// ── Executor registry (Phase 1.3 — Agent #3 graduation, CEO disposition Q2 = (b)) ─
//
// SPLIT-CHARTER EXCEPTION: a small sibling registry that holds executor
// charters whose authority is incompatible with the canonical
// 25-agent partition (which is RECOMMEND_ONLY-dominant for shipped
// agents). Executors share a charter id with a primary agent (e.g. #3)
// but carry distinct authority + mode. The 25-ID partition + the
// single-authority-per-charter invariant in BaseAgent.js are preserved
// because executors are a *separate namespace* — they never enter
// AGENT_REGISTRY, never collide with BY_ID, and never affect
// validateRoster().
//
// See docs/specs/SELF_RENEWAL_AGENT_SPEC.md §4.3 Option B for the design
// rationale. CEO dispositions locked 2026-05-14:
//   - Q2 = (b) SPLIT charter (this registry is the split mechanism).
//   - Each executor's charter is validated independently against
//     BaseAgent._validateCharter() at class load time.

export interface ExecutorRecord {
  readonly key: string;                     // unique identifier within EXECUTOR_REGISTRY
  readonly agentId: number;                 // the primary agent this executor extends (1..25)
  readonly name: string;                    // human label, e.g. "Self-Renewal Executor"
  readonly mode: AgentMode;                 // typically 'cross-step' for executors
  readonly authority: readonly AuthorityLevel[];
  readonly requiredCredentials: readonly string[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly escalationPolicy: string;
}

const EXECUTORS: ExecutorRecord[] = [
  {
    key: 'self-renewal-executor',
    agentId: 3,
    name: 'Self-Renewal Executor',
    // 'cross-step' so it does NOT compete with the step-owner registration of
    // Agent #3 at step 6. The executor is invoked out-of-band by /api/agent/3/
    // execute.js + the Inngest job, not by the Auto Runner step machinery.
    mode: 'cross-step',
    authority: ['auto_write_internal', 'requires_human_gate'],
    requiredCredentials: ['ANTHROPIC_API_KEY', 'VERCEL_TOKEN'],
    consumes: ['3.renewal.candidate.v1'],
    produces: [
      '3.renewal.applied.v1',
      '3.renewal.delta.v1',
      '3.renewal.build_failed.v1',
      '3.renewal.disabled.v1',
    ],
    escalationPolicy:
      'severity-high-or-critical → emit candidate + remediation_plan, hold for human gate. ' +
      'two consecutive build_failed within 24h → disable fork-and-fix, alert oncall. ' +
      'remediation throws → escalate to Ops Runner Alpha #21.',
  },
];

function deepFreezeExecutor(e: ExecutorRecord): ExecutorRecord {
  return Object.freeze({
    ...e,
    authority: Object.freeze([...e.authority]) as readonly AuthorityLevel[],
    requiredCredentials: Object.freeze([...e.requiredCredentials]) as readonly string[],
    consumes: Object.freeze([...e.consumes]) as readonly string[],
    produces: Object.freeze([...e.produces]) as readonly string[],
  });
}

export const EXECUTOR_REGISTRY: readonly ExecutorRecord[] = Object.freeze(
  EXECUTORS.map(deepFreezeExecutor),
);

const EXECUTORS_BY_KEY: Record<string, ExecutorRecord> = Object.freeze(
  EXECUTOR_REGISTRY.reduce((acc, e) => {
    acc[e.key] = e;
    return acc;
  }, {} as Record<string, ExecutorRecord>),
);

/**
 * Look up an executor charter by its unique key. Returns undefined if no
 * executor is registered under that key.
 *
 * Distinct from getAgent() — executors never appear in AGENT_REGISTRY.
 */
export function getExecutor(key: string): ExecutorRecord | undefined {
  return EXECUTORS_BY_KEY[key];
}

/**
 * List all registered executors.
 */
export function listExecutors(): readonly ExecutorRecord[] {
  return EXECUTOR_REGISTRY;
}

// ── Executor invariants — independent self-check ─────────────────────────────
(function validateExecutors() {
  const keys = new Set<string>();
  for (const e of EXECUTOR_REGISTRY) {
    if (!e.key || typeof e.key !== 'string') {
      throw new Error('_registry: executor key required');
    }
    if (keys.has(e.key)) {
      throw new Error(`_registry: duplicate executor key "${e.key}"`);
    }
    keys.add(e.key);
    if (!Number.isInteger(e.agentId) || e.agentId < 1 || e.agentId > 25) {
      throw new Error(
        `_registry: executor "${e.key}" agentId out of range: ${e.agentId}`,
      );
    }
    if (!e.name || typeof e.name !== 'string') {
      throw new Error(`_registry: executor "${e.key}" missing name`);
    }
    if (!['always-on', 'step-owner', 'cross-step'].includes(e.mode)) {
      throw new Error(`_registry: executor "${e.key}" invalid mode "${e.mode}"`);
    }
    if (!e.authority || e.authority.length === 0) {
      throw new Error(`_registry: executor "${e.key}" authority must be non-empty`);
    }
    // The primary agent must exist in AGENT_REGISTRY.
    if (!BY_ID[e.agentId]) {
      throw new Error(
        `_registry: executor "${e.key}" references unknown agentId ${e.agentId}`,
      );
    }
  }
})();
