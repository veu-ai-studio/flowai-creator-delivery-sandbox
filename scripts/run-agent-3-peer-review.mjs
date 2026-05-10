// Agent #3 Self-Renewal — peer review on the new agent + tests.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TS = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_PATH = path.join(REPO, 'docs', 'peer-reviews', `agent-3-self-renewal-${TS}.md`);
const OUT_JSON = OUT_PATH.replace(/\.md$/, '.json');

const FILES = [
  'src/lib/agents/agents/Agent3SelfRenewal.js',
  'tests/agents/agent-3-self-renewal.test.js',
];

const CRITERIA = `
You are an independent reviewer of a new agent + its test suite in an AI
infrastructure platform. The diff introduces Agent #3 — Self-Renewal —
which owns Step 6 ('govern') of an 8-step Auto Runner pipeline. Authority is
recommend_only: the agent NEVER mutates configuration; it analyzes a
completed run and returns a structured renewal recommendation envelope.

Architectural context:
  - The platform has a static AGENT_REGISTRY (charter) and a runtime
    ACTIVE registry. registerAgent() enforces step-uniqueness — at most
    one active step-owner per step number (PA #2.7 must-fix #1).
  - OrchestratorHub.invokeStepOwner('govern', ctx) routes to whichever
    agent is registered as the step-owner for 'govern'. The hub's
    STEP_OWNERS map already binds 'govern' → 3 statically.
  - Auto Runner is browser-side (React); Agent #2 was kept OUT of the
    browser bundle because it imports node:crypto. Agent #3 must remain
    browser-bundle-safe — pure JS, no node:* imports.
  - All 20 agents inherit from BaseAgent. Charter is sourced from the
    registry as single source of truth.

Required envelope shape (from the dispatch):
  {
    agent_id: 3, agent_name: 'Self-Renewal', mode: 'step-owner', step: 6,
    authority: 'recommend_only', recommendation: string,
    renewal_flags: string[], confidence: number (0-1), metadata: object
  }

Review for:

A. NON-BLOCKING INVARIANT — does any code path in recommend() throw on
   null/undefined/malformed input? Recommend_only means the orchestrator
   must never propagate Agent #3 failures up. Are graceful low-confidence
   envelopes returned for every degenerate input (null ctx, undefined ctx,
   empty ctx, hostile getters in run_summary)?
B. CONFIDENCE MODEL — is the severity → confidence mapping
   (high=0.9, medium=0.6, low=0.4, no-flags-but-signal=0.2, no-signal=0.0)
   reasonable? Any confidence outputs that could land outside [0,1]? Any
   way to game it with adversarial input?
C. HEURISTIC COVERAGE — are the 5 heuristics (build_failures, audit_issues,
   anomaly_severity, evolution_proposal, stale_config) sensible coverage
   of "is renewal needed?" Any obvious gaps that should fire flags but
   currently don't?
D. STEP-OWNER UNIQUENESS — does the test suite actually exercise the
   uniqueness rule (registering a different agent at step=6 must throw)?
E. BROWSER-BUNDLE SAFETY — does the agent import any node:* modules?
   Anything that would break if Vite tried to bundle this for the browser?
F. CHARTER + REGISTRY ALIGNMENT — does the static charter() agree with
   AGENT_REGISTRY[3] (Self-Renewal, recommend_only, step-owner)?
G. RECOMMEND_ONLY GUARD — does plan() ever return non-empty sideEffects?
   Does act() respect the recommend_only invariant from BaseAgent.guard()?
H. TEST COVERAGE — do the 6 dispatch requirements have explicit coverage?
   (1) registers as step-owner step=6, (2) valid envelope shape, (3)
   renewal_flags is array, (4) low-confidence on null, (5) step
   uniqueness, (6) hub routing.

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "non_blocking_concerns": [<strings>],
  "confidence_model_concerns": [<strings>],
  "heuristic_coverage_concerns": [<strings>],
  "uniqueness_concerns": [<strings>],
  "browser_bundle_concerns": [<strings>],
  "charter_alignment_concerns": [<strings>],
  "recommend_only_guard_concerns": [<strings>],
  "test_coverage_gaps": [<strings>],
  "must_fix_before_commit": [<numbered strings>],
  "nice_to_have_tweaks": [<numbered strings>],
  "approve": "YES" | "YES_WITH_MINOR_TWEAKS" | "NO"
}
No prose. No markdown fences.
`.trim();

async function main() {
  const blocks = [];
  for (const rel of FILES) {
    const body = await readFile(path.join(REPO, rel), 'utf8');
    blocks.push(`### ${rel}\n\n\`\`\`\n${body}\n\`\`\`\n`);
  }
  const artifact = `# Agent #3 Self-Renewal — diff (bundled for review)\n\n${blocks.join('\n')}`;

  const result = await peerReview({ artifact, criteria: CRITERIA, model: 'openai/gpt-5' });
  const out = {
    model_used: result.model_used,
    degraded: result.degraded,
    latency_ms: result.latency_ms,
    agreement_pct: result.agreement_pct,
    findings: result.findings,
  };
  await writeFile(OUT_JSON, JSON.stringify(out, null, 2), 'utf8');
  const md = [
    `# Agent #3 Self-Renewal — Peer Review`,
    ``,
    `**Reviewer:** \`${result.model_used}\` via OpenRouter`,
    `**Degraded:** ${result.degraded ? 'yes (fallback used)' : 'no'}`,
    `**Latency:** ${result.latency_ms} ms`,
    `**Agreement with Claude:** ${result.agreement_pct ?? 'unknown'}%`,
    `**Approve to commit:** ${result.findings?.approve ?? 'unknown'}`,
    ``,
    `## Findings`,
    ``,
    '```json',
    JSON.stringify(result.findings, null, 2),
    '```',
    ``,
    `Raw JSON: ${path.basename(OUT_JSON)}`,
  ].join('\n');
  await writeFile(OUT_PATH, md, 'utf8');

  process.stdout.write(
    `model_used=${result.model_used} degraded=${result.degraded} ` +
    `latency_ms=${result.latency_ms} agreement_pct=${result.agreement_pct ?? 'null'} ` +
    `approve=${result.findings?.approve ?? 'unknown'} ` +
    `out=${path.relative(REPO, OUT_PATH)}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`agent-3 peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
