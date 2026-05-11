// Agent #5 End-Customer Intake — peer review in PANEL mode (≥5 LIVE slots).
//
// Mirror of scripts/run-agent-4-peer-review.mjs. Small-artifact mode.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TS = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(REPO, 'docs', 'peer-reviews');
const OUT_PATH = path.join(OUT_DIR, `agent-5-end-customer-intake-${TS}.md`);
const OUT_JSON = OUT_PATH.replace(/\.md$/, '.json');

const FILES = [
  'src/lib/agents/agents/Agent5EndCustomerIntake.js',
  'tests/agents/agent-5-end-customer-intake.test.js',
];

const CRITERIA = `
You are an independent reviewer of a new agent + its test suite in an AI
infrastructure platform. The diff introduces Agent #5 — End-Customer Intake
— a FlowAI-only cross-step agent that gates customer (sub-org) provisioning
against the parent provider's scope status. Authority is recommend_only:
the agent NEVER provisions; it analyzes inputs (providerId, customerId,
organizationName, customerSurfaces, optional providerStatus) and returns a
structured recommendation envelope.

Architectural context:
  - 25-agent roster locked. Agent #5 sits in FLOWAI_ONLY_AGENTS, so
    BaseAgent rejects construction unless productScope === 'flowai'.
  - mode is 'cross-step' (registry-driven). The public entrypoint is
    recommend(ctx); the OrchestratorHub.invokeStepOwner path does NOT
    apply.
  - charter.consumes = ['4.provider.suspended.v1']. attachBusSubscriptions()
    wires a handler that caches the suspended providerId in HotStore so
    subsequent recommend() calls can refuse intakes for that provider.
  - charter.produces = ['5.endcustomer.intake.completed.v1'].
  - The agent inherits BaseAgent, so plan()/act() honor the recommend_only
    invariants (no sideEffects, no authority upgrades).
  - Browser-bundle safety: pure JS, no node:* imports.

Required envelope shape (from the dispatch):
  {
    agent_id: 5,
    agent_name: 'End-Customer Intake',
    mode: 'cross-step',
    authority: 'recommend_only',
    recommendation: 'provision' | 'hold' | 'refuse',
    blockers: string[],
    blocker_details: Array<{ kind: string, severity: 'low'|'medium'|'high', reason: string }>,
    confidence: number (0..1),
    metadata: { ok, providerId, customerId, organizationName, providerStatus,
                customerSurfaceCount, suspendedObserved, signalsObserved }
  }

Review for:

A. NON-BLOCKING INVARIANT — does any code path in recommend() throw on
   null/undefined/hostile input? Are graceful low-confidence envelopes
   returned for every degenerate path (null ctx, hostile getters, hot
   store unreachable)?
B. SUSPENSION LOGIC — does the bus-cache-vs-explicit-override interplay
   produce the right behavior? When both signals say suspended, is the
   blocker emitted exactly once? When only the bus says suspended, does
   the agent still refuse?
C. SLUG RULES — does the regex correctly reject underscores in BOTH
   providerId and customerId (D-007 / D-008)? Are special chars rejected?
D. FLOWAI-ONLY ENFORCEMENT — does BaseAgent reject construction when
   productScope !== 'flowai'? Test coverage for this?
E. RECOMMEND_ONLY GUARD — does plan() ever return non-empty sideEffects?
   Does act() reject tampered plans?
F. CROSS-STEP REGISTRY — does registerAgent persist with step=null and
   reject step != null?
G. BUS SUBSCRIPTION DISCIPLINE — does attachBusSubscriptions() throw?
   Is it idempotent? Does detachBusSubscriptions() actually stop
   handlers from firing?
H. CHARTER / REGISTRY ALIGNMENT — does the static charter() agree with
   AGENT_REGISTRY[4] (id=5, FlowAI-only, recommend_only, cross-step,
   consumes ['4.provider.suspended.v1'], produces
   ['5.endcustomer.intake.completed.v1'])?
I. TEST COVERAGE — 57 tests authored; flag any uncovered branches.

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "non_blocking_concerns": [<strings>],
  "suspension_logic_concerns": [<strings>],
  "slug_rule_concerns": [<strings>],
  "flowai_only_concerns": [<strings>],
  "recommend_only_guard_concerns": [<strings>],
  "cross_step_registry_concerns": [<strings>],
  "bus_subscription_concerns": [<strings>],
  "charter_alignment_concerns": [<strings>],
  "test_coverage_gaps": [<strings>],
  "must_fix_before_commit": [<numbered strings>],
  "nice_to_have_tweaks": [<numbered strings>],
  "approve": "YES" | "YES_WITH_MINOR_TWEAKS" | "NO"
}
No prose. No markdown fences.
`.trim();

const PANEL = [
  { provider: 'openrouter',    model: 'openai/gpt-5' },               // Slot 1
  { provider: 'openrouter',    model: 'openai/gpt-4o' },              // Slot 2
  { provider: 'openrouter',    model: 'google/gemini-2.5-pro' },      // Slot 3
  { provider: 'openrouter',    model: 'anthropic/claude-opus-4' },    // Slot 4
  { provider: 'vercel_v0',     model: 'v0-1.5-md' },                  // Slot 5
  { provider: 'github_models', model: 'openai/gpt-4.1' },             // Slot 6
  { provider: 'github_models', model: 'openai/gpt-4o-mini' },         // Slot 7
  { provider: 'headless',      model: 'base44_chat' },                // Slot 8 (deferred)
  { provider: 'headless',      model: 'replit_agent' },               // Slot 9 (deferred)
  { provider: 'openrouter',    model: 'openai/gpt-4o' },              // Slot 10
];

const REQUIRED_LIVE = 5;

async function main() {
  const blocks = [];
  for (const rel of FILES) {
    const body = await readFile(path.join(REPO, rel), 'utf8');
    blocks.push(`### ${rel}\n\n\`\`\`\n${body}\n\`\`\`\n`);
  }
  const artifact = `# Agent #5 End-Customer Intake — diff (bundled for review)\n\n${blocks.join('\n')}`;

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  process.stdout.write(`Agent #5 peer review — running ${PANEL.length}-slot panel in parallel\n`);

  let result;
  try {
    result = await peerReview({
      artifact,
      criteria: CRITERIA,
      panel: PANEL,
      perReviewerTimeoutMs: 240_000,
    });
  } catch (e) {
    process.stderr.write(`agent-5 peer-review FAILED to run: ${e?.message ?? e}\n`);
    process.exit(1);
  }

  let liveCount = 0;
  process.stdout.write('\nResults:\n');
  result.reviewers.forEach((r, idx) => {
    const slot = idx + 1;
    const ok = !r.degraded;
    if (ok) liveCount += 1;
    const err = r.error ? r.error : 'none';
    process.stdout.write(
      `  slot=${String(slot).padStart(2, ' ')}  provider=${r.provider.padEnd(13, ' ')}  ` +
      `model=${r.model.split(':').slice(1).join(':')}  ` +
      `ok=${ok}  latency=${r.latency_ms}ms  verdict=${r.verdict ?? '-'}  error=${err}\n`,
    );
  });

  const out = {
    timestamp: TS,
    panel_size: PANEL.length,
    live_count: liveCount,
    required_live: REQUIRED_LIVE,
    aggregate_verdict: result.synthesis.aggregate_verdict,
    models_used: result.synthesis.models_used,
    consensus_findings: result.synthesis.consensus_findings,
    contradictions: result.synthesis.contradictions,
    most_severe_gaps: result.synthesis.most_severe_gaps,
    reviewers: result.reviewers.map((r) => ({
      provider: r.provider,
      model: r.model,
      latency_ms: r.latency_ms,
      degraded: r.degraded,
      verdict: r.verdict,
      agreement_pct: r.agreement_pct,
      error: r.error ?? null,
    })),
  };
  await writeFile(OUT_JSON, JSON.stringify(out, null, 2), 'utf8');

  const md = [
    `# Agent #5 End-Customer Intake — Peer Review (panel mode)`,
    ``,
    `**Timestamp:** ${TS}`,
    `**Panel size:** ${PANEL.length}`,
    `**LIVE slots:** ${liveCount} / ${PANEL.length} (need ≥ ${REQUIRED_LIVE})`,
    `**Aggregate verdict:** ${out.aggregate_verdict}`,
    `**Models used:** ${out.models_used}`,
    ``,
    `## Slot results`,
    ``,
    '| Slot | Provider | Model | LIVE | Latency | Verdict |',
    '|---:|---|---|:---:|---:|---|',
    ...result.reviewers.map((r, i) =>
      `| ${i + 1} | ${r.provider} | ${r.model.split(':').slice(1).join(':')} | ${!r.degraded ? '✓' : '—'} | ${r.latency_ms}ms | ${r.verdict ?? '—'} |`,
    ),
    ``,
    `## Synthesis`,
    ``,
    '```json',
    JSON.stringify({
      aggregate_verdict: out.aggregate_verdict,
      models_used: out.models_used,
      consensus_findings: out.consensus_findings,
      contradictions: out.contradictions,
      most_severe_gaps: out.most_severe_gaps,
    }, null, 2),
    '```',
    ``,
    `Raw JSON: ${path.basename(OUT_JSON)}`,
  ].join('\n');
  await writeFile(OUT_PATH, md, 'utf8');

  process.stdout.write(
    `\nSynthesis: aggregate_verdict=${out.aggregate_verdict} ` +
    `models_used=${out.models_used}/${PANEL.length}\n`,
  );
  process.stdout.write(
    `LIVE slots: ${liveCount}/${PANEL.length} (need >= ${REQUIRED_LIVE})\n`,
  );

  process.exit(liveCount >= REQUIRED_LIVE ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`agent-5 peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
