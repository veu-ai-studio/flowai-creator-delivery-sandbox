// PA #2.7 — peer review on the wire-in diff for Agent #1 + #2.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TS = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_PATH = path.join(REPO, 'docs', 'peer-reviews', `pa-2.7-wire-agents-1-2-${TS}.md`);
const OUT_JSON = OUT_PATH.replace(/\.md$/, '.json');

const FILES = [
  'src/lib/agents/_registry.ts',
  'src/lib/agents/MessageBus.ts',
  'src/lib/agents/orchestrator/OrchestratorHub.ts',
  'src/lib/agents/agents/Agent1LifecycleEngine.ts',
  'src/lib/agents/agents/Agent2CodeBuilder.js',
  'tests/agents/pa-2.7-wire-agents-1-2.test.js',
];

const CRITERIA = `
You are an independent reviewer of a runtime wire-in diff for an AI
infrastructure platform. The diff:

1. Adds an active-agent runtime registration API (registerAgent) on top of
   the existing static charter registry. Idempotent for matching shapes,
   throws on conflict.
2. Adds a "step" field on the active record (null for always-on, positive
   integer for step-owner).
3. Adds MessageBus.subscribeAll(handler) — fires on every publish across
   all topics.
4. Adds Agent1LifecycleEngine.attachAsAlwaysOnSupervisor() — uses
   subscribeAll to write a ColdStore lineage row for every observed event.
5. Adds Agent2CodeBuilder.recommend(ctx) — wraps plan() and returns the
   canonical {agent_id, recommendation, confidence, metadata} envelope.
6. Adds OrchestratorHub.attachLifecycleAgent / registerStepOwnerAgent /
   invokeStepOwner — wire-in surface used by future Auto Runner integration.

Review the diff for:

A. CORRECTNESS — does the active-registry idempotency actually hold for
   step-owners with varying step? Are charter/active validations correct?
B. RECOMMEND_ONLY INVARIANT — does any code path let a step-owner block
   step execution, or does invokeStepOwner correctly absorb errors into
   low-confidence envelopes?
C. BROADCAST SAFETY — does the broadcast handler isolation prevent one bad
   handler from breaking others? Are async failures swallowed without
   leaking?
D. REGRESSION SURFACE — does the wire-in modify executeStep / routeJob
   semantics, or does it stay additive?
E. TEST COVERAGE — do the 30 tests cover the 6 spec'd cases and the
   isolation boundaries (cold-store throws, agent throws, broadcast
   handlers throwing)?
F. DISPATCH ALIGNMENT — does the implementation honor the dispatch's
   recommend_only authority, the lifecycle phases (run.start, step.transition,
   run.complete, run.error), and the recommendation envelope shape?

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "correctness_concerns": [<strings>],
  "recommend_only_concerns": [<strings>],
  "broadcast_safety_concerns": [<strings>],
  "regression_concerns": [<strings>],
  "test_coverage_gaps": [<strings>],
  "dispatch_alignment_gaps": [<strings>],
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
  const artifact = `# PA #2.7 wire-in diff (bundled for review)\n\n${blocks.join('\n')}`;

  const result = await peerReview({ artifact, criteria: CRITERIA, model: 'openai/gpt-5' });
  const out = {
    model_used: result.model_used,
    degraded: result.degraded,
    latency_ms: result.latency_ms,
    agreement_pct: result.agreement_pct,
    findings: result.findings,
  };
  await writeFile(OUT_JSON, JSON.stringify(out, null, 2), 'utf8');

  // Markdown digest for the docs/peer-reviews/ canonical archive.
  const md = [
    `# PA #2.7 — Wire Agents #1 + #2 — Peer Review`,
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
  process.stderr.write(`pa-2.7 peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
