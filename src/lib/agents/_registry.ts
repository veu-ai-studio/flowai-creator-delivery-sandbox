/**
 * Immutable Agent Registry — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/_registry.ts (W5 territory)
 * Status:   Pre-build foundation. None of the 20 agents are implemented yet;
 *           this registry is the single source of truth for *what they will
 *           be* once they are.
 *
 * Schema per agent:
 *   id                    — 1..20, matches AGENT_IDS in BaseAgent.js
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

// ── Roster invariants — runtime self-check at module load ────────────────────
(function validateRoster() {
  if (AGENT_REGISTRY.length !== 20) {
    throw new Error(
      `_registry: expected 20 agents, got ${AGENT_REGISTRY.length}`,
    );
  }
  const ids = new Set<number>();
  for (const a of AGENT_REGISTRY) {
    if (!Number.isInteger(a.id) || a.id < 1 || a.id > 20) {
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
  for (let i = 1; i <= 20; i++) {
    if (!ids.has(i)) {
      throw new Error(`_registry: missing agent id ${i}`);
    }
  }
})();
