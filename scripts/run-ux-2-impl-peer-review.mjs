// Peer review on the UX-2 Phase B IMPLEMENTATION diff (not the plan).
// Bundles every changed/added file into a single artifact and asks gpt-5
// to review for: correctness, RLS-proxy soundness, backfill idempotence,
// regressions in unrelated surfaces, ESLint scope correctness.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const OUT_PATH = path.join(REPO, 'docs', 'ux-2-phase-b-impl.peer-review.json');

const FILES = [
  'src/lib/products/registry.js',
  'src/pages/PortfolioDashboard.jsx',
  'tests/products-registry.test.js',
  'tests/api-products-handler.test.js',
  'tests/api-products-handler-tenant-isolation.test.js',
  'supabase/migrations/0005_products_uniqueness_and_updated_at.sql',
  'scripts/backfill-products-from-base44.mjs',
  'docs/adr/0001-no-hardcoded-products.md',
  'eslint.config.js',
];

const CRITERIA = `
You are an independent reviewer of the UX-2 Phase B implementation diff
for an AI infrastructure platform. The plan was approved GO_WITH_CHANGES;
the diff implements the plan plus 8 peer additions. Review the bundled
files below for:

1. CORRECTNESS — does the registry helper return the discriminated union
   correctly? Does PortfolioDashboard handle the three load states
   (loading / error / ok-with-empty / ok-with-items) without conflating
   error and empty?
2. RLS-PROXY TEST SOUNDNESS — does the tenant-isolation test actually
   prove org-scoped reads/writes? Does the no-orgId-on-POST hard-stop
   prevent anonymous writes? Are there bypasses the test misses?
3. BACKFILL IDEMPOTENCE — re-running the backfill script must not create
   duplicates. Does the (org_id, url) + (org_id, lower(name)) dedup
   approach actually achieve that?
4. REGRESSIONS IN UNRELATED SURFACES — MainDashboard.jsx and
   ProductRegistryPanel.jsx are intentionally untouched. Auto Runner is
   untouched. Does anything in this diff inadvertently break them?
5. ESLINT RULE SCOPE — does the no-restricted-syntax rule fire on new
   VEU_PRODUCTS consts in non-allowlisted src/pages files? Does it
   correctly NOT fire on the allowlisted legacy files? Is the allowlist
   the right shape?
6. SQL MIGRATION SAFETY — is the partial unique index on (org_id, url)
   the right scope (excludes empty url)? Does the updated_at trigger
   handle BEFORE UPDATE on every row without recursion?

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "correctness_concerns": [<strings>],
  "rls_proxy_concerns": [<strings>],
  "backfill_idempotence_concerns": [<strings>],
  "regression_risks": [<strings>],
  "eslint_scope_concerns": [<strings>],
  "migration_safety_concerns": [<strings>],
  "must_fix_before_commit": [<numbered strings>],
  "nice_to_have_tweaks": [<numbered strings>],
  "approve": "YES" | "YES_WITH_MINOR_TWEAKS" | "NO"
}
No prose. No markdown fences. Just the JSON.
`.trim();

async function main() {
  const blocks = [];
  for (const rel of FILES) {
    const full = path.join(REPO, rel);
    let body;
    try {
      body = await readFile(full, 'utf8');
    } catch (e) {
      blocks.push(`### ${rel}\n[FILE READ FAILED: ${e?.message || e}]\n`);
      continue;
    }
    blocks.push(`### ${rel}\n\n\`\`\`\n${body}\n\`\`\`\n`);
  }
  const artifact = [
    '# UX-2 Phase B implementation diff (bundled for review)',
    '',
    blocks.join('\n'),
  ].join('\n');

  const t0 = Date.now();
  const result = await peerReview({ artifact, criteria: CRITERIA, model: 'openai/gpt-5' });
  const total_ms = Date.now() - t0;
  const out = {
    model_used: result.model_used,
    degraded: result.degraded,
    latency_ms: result.latency_ms,
    total_ms,
    agreement_pct: result.agreement_pct,
    findings: result.findings,
  };
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  process.stdout.write(
    `model_used=${result.model_used} degraded=${result.degraded} ` +
    `latency_ms=${result.latency_ms} agreement_pct=${result.agreement_pct ?? 'null'} ` +
    `approve=${result.findings?.approve ?? 'unknown'} ` +
    `out=${path.relative(REPO, OUT_PATH)}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`ux-2 impl peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
