#!/usr/bin/env node
// Regenerate docs/MARKETPLACE_TAXONOMY.md from the marketplace seed.
// Run: node scripts/generate-marketplace-taxonomy.mjs

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { TOOL_CATEGORIES, TOOLS_BY_CATEGORY } = await import('../api/_lib/marketplaceSeed.js');

const STEPS = {
  1: 'Research', 2: 'Design', 3: 'Build', 4: 'Quality Audit',
  5: 'Deploy', 6: 'Self-Renewal', 7: 'Go To Market', 8: 'Monitor',
};

const out = [];
out.push('# Marketplace Taxonomy — Categories & Tools');
out.push('');
out.push('Auto-generated from `api/_lib/marketplaceSeed.js` — the single source of truth for the marketplace\'s static data. To add or update a tool, edit the seed and re-run `node scripts/generate-marketplace-taxonomy.mjs`.');
out.push('');

out.push('## Lifecycle steps');
out.push('');
out.push('| # | Name | Categories that serve this step |');
out.push('|---|---|---|');
for (const [n, name] of Object.entries(STEPS)) {
  const cats = TOOL_CATEGORIES.filter((c) => c.step_numbers.includes(Number(n))).map((c) => c.id).join(', ');
  out.push(`| ${n} | ${name} | ${cats} |`);
}
out.push('');

out.push('## Region scoring (0-100)');
out.push('');
out.push('Each tool carries a 5-region score capturing latency, data residency, payment-rail availability, language support, and support-hours overlap. Higher = stronger fit. The `region` query param on /recommend uses this score directly in the `data_residency` dimension.');
out.push('');
out.push('Examples of region-sensitive scoring from the seed:');
out.push('- Paystack: 98/30/30/25/30 — built for African card rails');
out.push('- Cloudflare R2: 85/92/92/90/82 — global edge, near-uniform');
out.push('- Vercel: 60/88/95/80/70 — US-strong, weaker in Africa/LatAm');
out.push('');

out.push('## Categories');
out.push('');
for (const c of TOOL_CATEGORIES.slice().sort((a, b) => a.display_order - b.display_order)) {
  const tools = TOOLS_BY_CATEGORY[c.id] || [];
  const stepLabels = c.step_numbers.map((n) => `S${n} ${STEPS[n]}`).join(', ');
  out.push(`### ${c.name} (\`${c.id}\`)`);
  out.push(`Lifecycle steps: ${stepLabels}  `);
  out.push(c.description);
  out.push('');
  out.push('| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |');
  out.push('|---|---|---|---|---|---|');
  for (const t of tools) {
    const r = t.region_strengths;
    const price = t.starting_paid_tier_usd != null
      ? `$${t.starting_paid_tier_usd}${t.pricing_unit ? ' ' + t.pricing_unit : '/mo'}`
      : t.pricing_model;
    out.push(`| ${t.slug} | ${t.vendor} | ${price} | ${t.has_free_tier ? 'Yes' : 'No'} | ${r.africa}/${r.europe}/${r.us}/${r.asia}/${r.latam} | ${t.integration_complexity}/5 |`);
  }
  out.push('');
}

out.push('---');
out.push('');
out.push('## Adding a new tool');
out.push('');
out.push('1. Append an entry to `TOOLS` in `api/_lib/marketplaceSeed.js`. Required fields:');
out.push('   `slug`, `category_id`, `name`, `vendor`, `description`, `homepage_url`, `pricing_model`,');
out.push('   `has_free_tier`, `starting_paid_tier_usd`, `region_strengths`, `data_residency_options`,');
out.push('   `compliance_certs`, `integration_complexity` (1-5), `last_funding_round`,');
out.push('   `public_incident_frequency`, `open_source`, `self_hostable`, `data_export_ease`.');
out.push('2. Run `node scripts/generate-marketplace-taxonomy.mjs` to refresh this doc.');
out.push('3. When V2 lands, run `/api/admin/seed-marketplace` to push to Postgres.');
out.push('');
out.push('## Adding a new category');
out.push('');
out.push('1. Append an entry to `TOOL_CATEGORIES` with `id`, `name`, `step_numbers`, `display_order`, `description`.');
out.push('2. Update `STEP_CATEGORY_PRIORITY` in `lifecycleToolSlots.js` if any lifecycle step should consider the new category.');
out.push('3. Add tools that belong in the category.');
out.push('');

const dest = resolve(process.cwd(), 'docs/MARKETPLACE_TAXONOMY.md');
writeFileSync(dest, out.join('\n'), 'utf8');
console.log(`Wrote ${dest}`);
