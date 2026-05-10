// scripts/run-ip-t1-peer-review.mjs
//
// PA #IP-T1 — peer-reviews the IP hygiene Tier 1 scrub diff via OpenRouter.
// Reads the staged scrub diff (`git diff --cached`) and asks an independent
// model whether the diff correctly executes the audit's Tier 1 5-scrub
// reconciliation. Writes a Markdown report to docs/peer-reviews/.
//
// ESM only. Node ≥ 18.

import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

function timestamp() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`;
}

function captureStagedDiff() {
  // `--cached` = staged changes only. Larger contexts (-U10) so the model
  // sees enough surrounding code to reason about it.
  return execFileSync('git', ['diff', '--cached', '-U10'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function captureStagedNamesOnly() {
  return execFileSync('git', ['diff', '--cached', '--name-status'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 1 * 1024 * 1024,
  });
}

const CRITERIA = `
You are an independent reviewer of a code change. The attached artifact is
the staged \`git diff --cached\` output for a Tier 1 IP-hygiene scrub on a
React + Node monorepo. The audit document at
\`docs/ip-hygiene-audit-2026-05-09.md\` defined exactly 5 scrubs to apply
in this commit:

  1. MOVE strategy / portfolio docs OUT of the public repo. Specifically
     delete: docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md, _baseline.md sibling,
     src/docs/FLOWAI_GTM_DEMO.md, docs/SUPER_CUSTOMER_PRICING.md. Surgically
     redact strategic / GTM / pricing sections from
     src/docs/FLOWAI_ARCHITECTURE.md while keeping technical sections.

  2. EXTRACT synthetic_prompt payloads from src/lib/veuProducts.js into a
     runtime loader. The literal prompt text must NOT appear in the public
     repo any more. Code keeps the *fact* that prompts exist via the
     loader.

  3. REPLACE README.md with a neutral VEU-branded intro that does not
     mention "Base44" anywhere and does not embed example app IDs.

  4. RENAME package.json "name" from "base44-app" to a neutral VEU name
     (and reflect in package-lock.json).

  5. REMOVE .base44.app URLs from src/lib/veuProducts.js and /docs/*.

Out-of-scope (must NOT be in the diff): SAIGE-side UI changes, the audit
document itself, Tier 2 (env lockdown) work, Tier 3 (repo move / branch
renames), api/_lib/productDomains.js (deliberately deferred to a Tier 1.b),
or any unrelated drift.

Review for:

A. CORRECTNESS — does each of the 5 scrubs land cleanly in the diff? Any
   missing pieces?
B. NO PLACEHOLDER TEXT — the dispatcher required "no placeholder text;
   resolve completely." Flag any scrub that left dangling
   "[REDACTED]" / "TBD" / "PLACEHOLDER" content (as opposed to legitimate
   "internal team docs" pointers).
C. CONSUMER BREAKAGE — does the synthetic-prompt extraction (Scrub 2)
   wire the consumer (src/pages/DemoGenerator.jsx) to the new loader
   correctly?
D. SCOPE LEAKAGE — any out-of-scope file modified? Any in-scope file
   missed?
E. ESM ONLY — every new file ESM (no \`require(\`, no
   \`module.exports\`).

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer — your overall agreement that the diff
                  correctly executes the 5-scrub Tier 1 plan>,
  "scrub_findings": [
    { "scrub": 1|2|3|4|5,
      "status": "complete" | "incomplete" | "incorrect",
      "notes": "<string>" }
  ],
  "placeholder_text_found": [<strings, file:line where found>],
  "consumer_breakage_risks": [<strings>],
  "scope_leakage": {
    "out_of_scope_modified": [<paths>],
    "in_scope_missed": [<paths or scrub numbers>]
  },
  "esm_violations": [<paths if any \`require(\` / \`module.exports\` found>],
  "additional_observations": [<strings>],
  "recommended_action": "approve" | "amend" | "block"
}

No prose. No markdown fences. Just the JSON.
`.trim();

function asMarkdown({ summary, names, agreement_pct, raw, model_used, degraded, latency_ms, total_ms }) {
  return `# PA #IP-T1 — IP Hygiene Tier 1 Peer Review

**Generated:** ${new Date().toISOString()}
**Branch:** \`flowai-v0.1\`
**Reviewer model:** \`${model_used}\` ${degraded ? '(degraded — fallback used)' : '(primary)'}
**Latency:** ${latency_ms} ms inference / ${total_ms} ms total
**Agreement (auto-extracted):** ${agreement_pct === null ? '_unparseable_' : `**${agreement_pct}%**`}
**Acceptance gate:** ≥ 85%

---

## Files in the staged scrub diff

\`\`\`
${names.trim()}
\`\`\`

---

## Reviewer raw response

\`\`\`json
${raw.trim()}
\`\`\`

---

## Reviewer parsed findings

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`

---

_Generated by \`scripts/run-ip-t1-peer-review.mjs\` (ESM, OpenRouter via \`scripts/lib/peer-review.mjs\`)._
`;
}

async function main() {
  const outDir = path.join(REPO, 'docs', 'peer-reviews');
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  const ts = timestamp();
  const outPath = path.join(outDir, `pa-ip-t1-${ts}.md`);

  const diff = captureStagedDiff();
  const names = captureStagedNamesOnly();
  if (diff.trim().length === 0) {
    process.stderr.write('peer-review: nothing staged. Stage your scrub diff with `git add` first.\n');
    process.exit(2);
  }

  const t0 = Date.now();
  const result = await peerReview({
    artifact: diff,
    criteria: CRITERIA,
    model: 'openai/gpt-5',
  });
  const total_ms = Date.now() - t0;

  const md = asMarkdown({
    summary: result.findings,
    names,
    agreement_pct: result.agreement_pct,
    raw: result.raw,
    model_used: result.model_used,
    degraded: result.degraded,
    latency_ms: result.latency_ms,
    total_ms,
  });
  await writeFile(outPath, md, 'utf8');

  // Compact stdout summary (no key, no full artifact).
  process.stdout.write(
    `model_used=${result.model_used} degraded=${result.degraded} ` +
    `latency_ms=${result.latency_ms} agreement_pct=${result.agreement_pct ?? 'null'} ` +
    `out=${path.relative(REPO, outPath)}\n`
  );
}

main().catch((e) => {
  process.stderr.write(`peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
