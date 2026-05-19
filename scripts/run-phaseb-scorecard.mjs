// scripts/run-phaseb-scorecard.mjs <productId>
//
// D40 — probe-only Phase B scorecard for a single VEU product. Runs the
// crawl + interactive Phase B + canonical §7.6 (surface-only and
// Phase-B-augmented) for the given product_id. No fix loop, no deploy,
// no PR — purely diagnostic.
//
// Usage:
//   doppler run --project flowai --config prd -- npx tsx \
//     scripts/run-phaseb-scorecard.mjs <productId>

import { conductStructuredCrawl } from '../src/lib/agents/renewal/crawlOutputAdapter.js';
import { scoreCrawlOutput } from '../src/lib/agents/renewal/gtmReadinessScorer.js';
import { probeAdversarialSurface } from '../src/lib/agents/renewal/adversarialSurface.js';
import { resolveLiveUrl } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';

const PROBE_TIMEOUT_MS = Number(process.env.D40_PROBE_BUDGET_MS) || 180_000;
const CRAWL_MAX_PAGES = Number(process.env.D40_CRAWL_MAX_PAGES) || 10;
const CRAWL_DEPTH = Number(process.env.D40_CRAWL_DEPTH) || 3;

const productId = (process.argv[2] || '').trim();
if (!productId) {
  console.error('FATAL: usage: scripts/run-phaseb-scorecard.mjs <productId>');
  process.exit(2);
}
const url = resolveLiveUrl(productId);
if (!url) {
  console.error(`FATAL: no live URL registered for productId="${productId}". resolveLiveUrl returned null.`);
  process.exit(2);
}

const startedAt = Date.now();
const startedIso = new Date(startedAt).toISOString();
const runId = randomUUID();

console.log('═══════════════════════════════════════════════════════════');
console.log(`D40 PHASE-B SCORECARD — ${productId.toUpperCase()}`);
console.log('═══════════════════════════════════════════════════════════');
console.log(`product_id:   ${productId}`);
console.log(`live url:     ${url}`);
console.log(`crawl:        maxPages=${CRAWL_MAX_PAGES} depth=${CRAWL_DEPTH}`);
console.log(`probe budget: ${(PROBE_TIMEOUT_MS / 1000).toFixed(0)}s`);
console.log(`runId:        ${runId}`);
console.log(`started:      ${startedIso}`);
console.log('');

// ── 1. Crawl ─────────────────────────────────────────────────────────
console.log('STEP 1 — structured crawl');
let crawlOutput;
try {
  crawlOutput = await conductStructuredCrawl({
    url, maxPages: CRAWL_MAX_PAGES, depth: CRAWL_DEPTH, productId, runId,
  });
  console.log(`  pagesCrawled:        ${crawlOutput.pagesCrawled}`);
  console.log(`  totalTextLength:     ${crawlOutput.totalTextLength}`);
  console.log(`  brokenLinks:         ${crawlOutput.brokenLinks?.length ?? 0}`);
  console.log(`  errors:              ${crawlOutput.errors?.length ?? 0}`);
  console.log(`  forms:               ${crawlOutput.forms?.length ?? 0}`);
  console.log(`  interactiveElements: ${crawlOutput.interactiveElements?.length ?? 0}`);
} catch (e) {
  console.log(`  CRAWL FAILED: ${e?.message ?? String(e)}`);
  process.exit(1);
}
console.log('');

// ── 2. Surface-only §7.6 (Phase A signal only) ───────────────────────
console.log('STEP 2 — surface-only §7.6 (Phase A only)');
const surfaceScore = scoreCrawlOutput(crawlOutput);
console.log(`  SURFACE §7.6:        ${surfaceScore.score}/100  (band: ${surfaceScore.band})`);
console.log(`  counts:              ${JSON.stringify(surfaceScore.counts)}`);
console.log(`  penalty:             ${surfaceScore.penalty}`);
console.log(`  phase A finding count: ${surfaceScore.phaseACount ?? surfaceScore.issues.length}`);
console.log('');

// ── 3. Phase B adversarial probe ─────────────────────────────────────
console.log('STEP 3 — Phase B adversarial surface probe');
let phaseBProbe;
try {
  phaseBProbe = await probeAdversarialSurface({
    url,
    opts: {
      probeBudgetMs: PROBE_TIMEOUT_MS,
      maxInteractives: 25,
      maxModals: 10,
      maxForms: 10,
      headless: true,
    },
  });
} catch (e) {
  console.log(`  PHASE B THREW: ${e?.message ?? String(e)}`);
  phaseBProbe = { ok: false, reason: e?.message, findings: [], summary: {} };
}

if (phaseBProbe.ok === false) {
  console.log(`  PHASE B FAILED: ${phaseBProbe.reason ?? 'unknown'}`);
} else {
  const s = phaseBProbe.summary ?? {};
  console.log(`  ok:                  ${phaseBProbe.ok}`);
  console.log(`  durationMs:          ${phaseBProbe.durationMs}`);
  console.log(`  interactivesTested:  ${s.interactivesTested ?? 0}`);
  console.log(`  deadOrErroring:      ${s.deadOrErroring ?? 0}`);
  console.log(`  modalsFailing:       ${s.modalsFailing ?? 0}`);
  console.log(`  formsFailing:        ${s.formsFailing ?? 0}`);
  console.log(`  agentsNonFunctional: ${s.agentsNonFunctional ?? 0}`);
  console.log(`  mockOnlyFlagged:     ${s.mockOnlyFlagged ?? 0}`);
  if (s.networkSummary) {
    console.log(`  network:             totalRequests=${s.networkSummary.totalRequests} meaningfulSameOrigin=${s.networkSummary.meaningfulSameOrigin} distinctUrls=${s.networkSummary.distinctUrls}`);
  }
  console.log(`  findings count:      ${phaseBProbe.findings.length}`);
}
console.log('');

// ── 4. Phase B-augmented §7.6 ────────────────────────────────────────
console.log('STEP 4 — canonical §7.6 with Phase B findings unioned');
const fullScore = scoreCrawlOutput(crawlOutput, phaseBProbe.findings ?? []);
console.log(`  PHASE-B §7.6:        ${fullScore.score}/100  (band: ${fullScore.band})`);
console.log(`  counts:              ${JSON.stringify(fullScore.counts)}`);
console.log(`  penalty:             ${fullScore.penalty}`);
console.log(`  phase A finding count: ${fullScore.phaseACount}`);
console.log(`  phase B finding count: ${fullScore.phaseBCount}`);
console.log(`  total findings:        ${fullScore.issues.length}`);
console.log('');

// ── 5. Top 5 concrete functional defects ─────────────────────────────
console.log('STEP 5 — top 5 concrete functional defects (by severity, Phase A + Phase B union)');
const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
const sorted = [...fullScore.issues].sort(
  (a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0),
).slice(0, 5);
for (const f of sorted) {
  const loc = (f.location ?? '').slice(0, 80);
  const ev = (f.evidence ?? '').slice(0, 140);
  console.log(`  [${f.severity}] ${f.category} @ ${loc}`);
  console.log(`     ${ev}`);
}
console.log('');

// ── 6. Verdict ───────────────────────────────────────────────────────
const s = phaseBProbe.summary ?? {};
let verdict;
let verdictReason;
if (fullScore.score >= 75 && (s.mockOnlyFlagged ?? 0) === 0 && (s.deadOrErroring ?? 0) <= 2) {
  verdict = 'FUNCTIONAL';
  verdictReason = `score=${fullScore.score} ≥ 75 demo-ready band, no mock-only signal, ≤2 dead interactives`;
} else if ((s.mockOnlyFlagged ?? 0) > 0 || (s.deadOrErroring ?? 0) >= 5 || fullScore.score < 60) {
  verdict = 'FACADE';
  verdictReason = `mock-only=${s.mockOnlyFlagged ?? 0} dead-interactives=${s.deadOrErroring ?? 0} score=${fullScore.score}`;
} else {
  verdict = 'PARTIAL';
  verdictReason = `score=${fullScore.score} between 60-74 internal-only band with some interactive defects`;
}

const completedAt = Date.now();
const completedIso = new Date(completedAt).toISOString();
const durationS = Math.round((completedAt - startedAt) / 1000);

console.log('═══════════════════════════════════════════════════════════');
console.log(`VERDICT — ${productId.toUpperCase()}: ${verdict}`);
console.log('═══════════════════════════════════════════════════════════');
console.log(`reason:              ${verdictReason}`);
console.log(`surface-only §7.6:   ${surfaceScore.score}/100  (band: ${surfaceScore.band})`);
console.log(`phase-B §7.6:        ${fullScore.score}/100  (band: ${fullScore.band})`);
console.log(`delta (surface→PhB): ${(fullScore.score - surfaceScore.score).toFixed(1)} points`);
console.log(`started:             ${startedIso}`);
console.log(`completed:           ${completedIso}`);
console.log(`duration:            ${Math.floor(durationS / 60)}m ${durationS % 60}s`);
console.log('═══════════════════════════════════════════════════════════');

// Machine-readable footer for the consolidated aggregator.
console.log('');
console.log('MACHINE-READABLE-FOOTER:');
console.log(JSON.stringify({
  productId,
  url,
  surfaceScore: surfaceScore.score,
  surfaceBand: surfaceScore.band,
  phaseBScore: fullScore.score,
  phaseBBand: fullScore.band,
  delta: fullScore.score - surfaceScore.score,
  counts: fullScore.counts,
  summary: phaseBProbe.summary ?? null,
  topFindings: sorted.map((f) => ({ severity: f.severity, category: f.category, location: f.location, evidence: f.evidence })),
  verdict, verdictReason,
  durationS,
}));
