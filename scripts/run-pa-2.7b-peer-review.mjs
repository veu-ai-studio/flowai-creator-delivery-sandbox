// PA #2.7b — peer review on the AutoRunner wire-in diff.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TS = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_PATH = path.join(REPO, 'docs', 'peer-reviews', `pa-2.7b-autorunner-wire-${TS}.md`);
const OUT_JSON = OUT_PATH.replace(/\.md$/, '.json');

const FILES = [
  'src/pages/AutoRunner.jsx',
  'tests/agents/pa-2.7b-autorunner-wire.test.js',
];

const CRITERIA = `
You are an independent reviewer of a runtime wire-in diff in an AI
infrastructure platform. The diff wires the browser-side AutoRunner.jsx
component to call OrchestratorHub.invokeStepOwner('build', ctx) when the
build step runs. The wire-in is recommend_only — it MUST NEVER block Auto
Runner.

Architecturally important context:
  - Agent #2 (CodeBuilder) imports node:crypto for SHA-256 hashing of
    build artifacts. It cannot be bundled into the browser. The dispatch's
    REQ 1 (AutoRunner calls invokeStepOwner) is satisfied by the call
    itself; the actual step-owner registration is server-side (a future
    /api/agent/* endpoint).
  - The browser-side hub returns null from invokeStepOwner('build', …)
    until the server-side endpoint is wired. runBuildStepRecommendation
    logs "no step-owner registered" and continues.
  - PA #2.7's tests (tests/agents/pa-2.7-wire-agents-1-2.test.js) cover
    Agent #2's full recommend() behavior in node env where node:crypto is
    available. PA #2.7b's tests cover the AutoRunner integration shape.

Review for:

A. NON-BLOCKING INVARIANT — does any code path in runBuildStepRecommendation
   propagate an exception or return a value that could halt Auto Runner?
B. HUB-BUNDLE CORRECTNESS — is the lazy bundle pattern safe (idempotency,
   leak-free, test reset) ? Does the bundle work without an agent registered?
C. CALL-SITE PLACEMENT — is runBuildStepRecommendation called only when
   step_key === 'build', and only AFTER the existing build-step logic
   completes?
D. TEST COVERAGE — do the 4 dispatch requirements have explicit coverage?
   Are static-source assertions (which guard against silent regressions)
   well-formed and not too brittle?
E. ARCHITECTURAL DECISION — keeping Agent #2 OUT of the browser bundle is
   defensible (node:crypto, build-time SHA-256). Any concerns with the
   "register server-side later" deferral?
F. REGRESSION SURFACE — does the diff modify any non-build step path,
   any other surface, or any existing behavior?

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "non_blocking_concerns": [<strings>],
  "hub_bundle_concerns": [<strings>],
  "call_site_concerns": [<strings>],
  "test_coverage_gaps": [<strings>],
  "architecture_concerns": [<strings>],
  "regression_concerns": [<strings>],
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
  const artifact = `# PA #2.7b AutoRunner wire-in diff (bundled for review)\n\n${blocks.join('\n')}`;

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
    `# PA #2.7b — AutoRunner Wire-In — Peer Review`,
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
  process.stderr.write(`pa-2.7b peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
