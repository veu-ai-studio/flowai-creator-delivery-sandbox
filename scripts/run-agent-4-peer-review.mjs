// Agent #4 Provider Onboarding — peer review in PANEL mode (≥5 LIVE slots).
//
// Per W03 dispatch: small-artifact mode, Slot 5 (Vercel v0) eligible, minimum
// 5 LIVE reviewers must respond. Follows the slot map locked in by W5b
// Phase 1.0 (see scripts/run-panel-smoke.mjs for canonical layout).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TS = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(REPO, 'docs', 'peer-reviews');
const OUT_PATH = path.join(OUT_DIR, `agent-4-provider-onboarding-${TS}.md`);
const OUT_JSON = OUT_PATH.replace(/\.md$/, '.json');

const FILES = [
  'src/lib/agents/agents/Agent4ProviderOnboarding.js',
  'tests/agents/agent-4-provider-onboarding.test.js',
];

const CRITERIA = `
You are an independent reviewer of a new agent + its test suite in an AI
infrastructure platform. The diff introduces Agent #4 — Provider Onboarding
— a FlowAI-only cross-step agent (NOT a step-owner) that gates provider
activation against credential availability. Authority is recommend_only:
the agent NEVER mutates provider state; it analyzes inputs (providerId,
organizationName, declared credentialKeys, productSurfaces) and returns a
structured recommendation envelope.

Architectural context:
  - The 25-agent roster is locked. Agent #4 sits in FLOWAI_ONLY_AGENTS, so
    BaseAgent rejects construction unless productScope === 'flowai'.
  - mode is 'cross-step' (registry-driven), not 'step-owner', so the
    OrchestratorHub.invokeStepOwner('govern', …) path does NOT apply; the
    public entrypoint is recommend(ctx).
  - The agent depends on an injected CredentialAdapter exposing
    probe(key) → 'present' | 'expected' | 'missing'. When the adapter is
    absent, the agent surfaces credentials as 'unknown' and downgrades to
    a low-confidence hold — it never refuses just because the host failed
    to inject an adapter.
  - The agent inherits BaseAgent, so plan()/act() honor the recommend_only
    invariants (no sideEffects, no authority upgrades).
  - Browser-bundle safety: pure JS, no node:* imports.

Required envelope shape (from the dispatch):
  {
    agent_id: 4,
    agent_name: 'Provider Onboarding',
    mode: 'cross-step',
    authority: 'recommend_only',
    recommendation: 'activate' | 'hold' | 'refuse',
    blockers: string[],
    blocker_details: Array<{ kind: string, severity: 'low'|'medium'|'high', reason: string }>,
    confidence: number (0..1),
    metadata: { ok, providerId, organizationName, credentialStatus, productSurfaceCount, signalsObserved }
  }

Review for:

A. NON-BLOCKING INVARIANT — does any code path in recommend() throw on
   null/undefined/hostile input? Are graceful low-confidence envelopes
   returned for every degenerate path (null ctx, undefined ctx, empty
   ctx, hostile getters)?
B. CONFIDENCE MODEL — refuse=0.9, hold (medium blocker)=0.6, hold (low
   blocker)=0.4, activate=0.9, no-signal=0. Are there input shapes that
   could land outside [0,1] or produce surprising classifications?
C. CREDENTIAL PROBING — does the adapter call path swallow probe()
   throws (treats as 'unknown' + blocker) without breaking the agent?
   Is the missing-adapter case properly distinguished from missing-key?
D. PROVIDER ID SLUG RULE — does the regex correctly reject underscores
   (which would create ambiguous Doppler PROVIDERS_<id>_<sub> paths per
   D-007) and special chars while accepting alphanumeric + hyphen?
E. FLOWAI-ONLY ENFORCEMENT — does BaseAgent reject construction when
   productScope !== 'flowai'? Does the test suite exercise this?
F. RECOMMEND_ONLY GUARD — does plan() ever return non-empty sideEffects?
   Does act() respect the recommend_only invariant? Does it reject
   tampered plans with sideEffects?
G. CROSS-STEP REGISTRY — does registerAgent persist with step=null?
   Does it reject step != null?
H. CHARTER / REGISTRY ALIGNMENT — does the static charter() agree with
   AGENT_REGISTRY[3] (Provider Onboarding, FlowAI-only, recommend_only,
   cross-step, consumes [], produces [4.provider.onboarded.v1,
   4.provider.suspended.v1])?
I. TEST COVERAGE — 51 tests authored; identify any uncovered branches.

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "non_blocking_concerns": [<strings>],
  "confidence_model_concerns": [<strings>],
  "credential_probing_concerns": [<strings>],
  "provider_id_concerns": [<strings>],
  "flowai_only_concerns": [<strings>],
  "recommend_only_guard_concerns": [<strings>],
  "cross_step_registry_concerns": [<strings>],
  "charter_alignment_concerns": [<strings>],
  "test_coverage_gaps": [<strings>],
  "must_fix_before_commit": [<numbered strings>],
  "nice_to_have_tweaks": [<numbered strings>],
  "approve": "YES" | "YES_WITH_MINOR_TWEAKS" | "NO"
}
No prose. No markdown fences.
`.trim();

// 10-slot panel per the W5b Phase 1.0 lockup. Adapters with missing creds
// surface as degraded; at least 5 must succeed for the dispatch acceptance
// gate.
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
  const artifact = `# Agent #4 Provider Onboarding — diff (bundled for review)\n\n${blocks.join('\n')}`;

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  process.stdout.write(`Agent #4 peer review — running ${PANEL.length}-slot panel in parallel\n`);

  let result;
  try {
    result = await peerReview({
      artifact,
      criteria: CRITERIA,
      panel: PANEL,
      perReviewerTimeoutMs: 240_000,
    });
  } catch (e) {
    process.stderr.write(`agent-4 peer-review FAILED to run: ${e?.message ?? e}\n`);
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
    `# Agent #4 Provider Onboarding — Peer Review (panel mode)`,
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
  process.stderr.write(`agent-4 peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
