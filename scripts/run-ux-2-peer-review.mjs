// One-shot driver — peer-review for UX-2 Portfolio Dashboard de-hardcoding plan.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from './lib/peer-review.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const PLAN_PATH = path.join(REPO, 'docs', 'ux-2-portfolio-dashboard-deharcoding-plan.md');
const OUT_PATH = path.join(REPO, 'docs', 'ux-2-portfolio-dashboard-deharcoding-plan.peer-review.json');

const CRITERIA = `
You are an independent reviewer of an architectural remediation plan for an
AI infrastructure platform. The platform claims to be 'product-agnostic OS
infrastructure' but currently hardcodes 5 specific products in its Portfolio
Dashboard UI. Review the plan for:

1. ROOT CAUSE COMPLETENESS — does the plan address why this hardcoding
   existed in the first place, or just remove it superficially?
2. SCHEMA QUALITY — is the proposed flowai_products schema robust enough
   for multi-tenancy, or will it require a breaking change in 3 months?
3. CONSISTENCY GAPS — are sister surfaces (Dashboard, Live Monitor, etc.)
   being brought into alignment, or just the Portfolio Dashboard?
4. SEEDING/ONBOARDING DESIGN — is the migration-to-real-data strategy
   clean? Will VEU's 5 products correctly appear via proper registration,
   or will there be a gap period?
5. RISK BLINDSPOTS — what's likely to break in production that the plan
   doesn't anticipate?
6. SCOPE CALIBRATION — is the plan over-engineered (gold-plating) or
   under-engineered (will need rework)?

Return ONLY a JSON object with this exact shape:
{
  "agreement_pct": <0-100 integer>,
  "root_cause_addressed": <string — your assessment>,
  "schema_concerns": [<strings>],
  "consistency_gaps": [<strings>],
  "seeding_concerns": [<strings>],
  "risk_blindspots": [<strings>],
  "scope_calibration": <"under" | "right" | "over">,
  "top_3_concerns": [<numbered strings>],
  "approve_to_implement": "YES" | "NO" | "YES_WITH_CHANGES"
}
No prose. No markdown fences. Just the JSON.
`.trim();

async function main() {
  const artifact = await readFile(PLAN_PATH, 'utf8');
  const t0 = Date.now();
  const result = await peerReview({
    artifact,
    criteria: CRITERIA,
    model: 'openai/gpt-5',
  });
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
    `out=${path.relative(REPO, OUT_PATH)}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`ux-2 peer-review FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
