// scripts/panel/run-adversarial-test-dispositions.mjs
//
// W6 Panel consultation — 8 open questions blocking FlowAI self-adversarial
// test execution per `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9
// (commit `b06e901`).
//
// 8 multiple-choice questions, 3 options each. Per W04 dispatch
// 2026-05-14. Output: docs/panel-consultations/adversarial-test-dispositions-
// 2026-05-14.md + sidecar JSON. Goal: Panel-recommended disposition per
// question so engineering can authorise the suite build.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runPanelConsultationWithBackups,
  loadCanonicalReference,
  buildArtifactWithCanonical,
  PANEL,
} from './run-panel-consultation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'adversarial-test-dispositions-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'adversarial-test-dispositions-2026-05-14.sidecar.json');

const QUESTIONS = [
  {
    id: 'Q1', topic: 'WAF bypass for Playwright tests',
    spec_anchor: '§9 OQ-1',
    a: 'Add X-Test-Bypass-Token header allowlist on the SUT (Playwright fingerprint sends a known token; production also accepts header but only for allowlisted IPs / dev environment)',
    b: 'Use stealth Playwright profile (override User-Agent + automation signatures so Sprint PROTECT-1 Phase 1 bot detection does not fire)',
    c: 'Test against dev SUT only (do not exercise bot detection on the deployed Vercel URL; run nightly against http://localhost:5173 or a non-prd preview)',
  },
  {
    id: 'Q2', topic: 'Test data isolation across runs',
    spec_anchor: '§9 OQ-2',
    a: 'Reserved productScope=\'_test\' tenant with auto-cleanup (RLS-isolated test tenant; nightly TRUNCATE; per-run sub-tenants under it)',
    b: 'Dev SUT only (no isolation needed because prd is not exercised; rows accumulate in dev which we accept)',
    c: 'Separate test database (entirely separate Supabase project for adversarial test data)',
  },
  {
    id: 'Q3', topic: 'Stripe adversarial scope',
    spec_anchor: '§9 OQ-3',
    a: 'Mock Stripe everywhere (no live Stripe calls in the adversarial suite; deterministic mock; zero abuse-flag risk)',
    b: 'Sandbox for nominal only (live Stripe sandbox for A4-N1/N2 nominal; mock everything else to avoid abuse-flagging)',
    c: 'Skip Stripe tests entirely (defer Agent #4 commercial-rail tests until production hardening track)',
  },
  {
    id: 'Q4', topic: 'Self-Protection Agent #13 conflict (when #13 ships)',
    spec_anchor: '§9 OQ-4',
    a: 'Allowlist test suite via the same mechanism that exempts internal audit (Locked Rule E1) — explicit allowlist entry by fingerprint / token',
    b: 'Disable Agent #13 during test runs (test environment flips #13 off; restores after)',
    c: 'Not blocking, defer (Agent #13 is DORMANT today; revisit when #13 graduation is dispatched)',
  },
  {
    id: 'Q5', topic: 'Performance baselines (p50/p95 SLAs)',
    spec_anchor: '§9 OQ-5',
    a: 'Set p50/p95 defaults now (per-endpoint budgets baked into the suite — e.g. p95<2s for /api/orchestrator/run, p95<500ms for /api/health — explicitly assertable)',
    b: 'Record-only, no pass/fail (suite logs latency to GovernanceAuditLog; no assertions; baselines emerge from data)',
    c: 'Defer until production traffic data (no perf assertions in adversarial suite until real prd traffic establishes empirical baselines)',
  },
  {
    id: 'Q6', topic: 'Real LLM vs Mock for adversarial tests',
    spec_anchor: '§9 OQ-6',
    a: 'MockClaude everywhere (deterministic, free, no real Anthropic API calls; sacrifices prompt-injection coverage realism)',
    b: 'Hybrid: real Claude for prompt-injection adversarial only; MockClaude for malformed/edge/nominal (per spec §9 recommendation; ~$0.30–$0.80 per run; ~$110–$290/year)',
    c: 'Real Claude everywhere (most realistic; highest cost; full prompt-injection coverage on all categories)',
  },
  {
    id: 'Q7', topic: 'Capability Transfer testing scope',
    spec_anchor: '§9 OQ-7',
    a: 'Skip Capability Transfer entirely (defer all /capability-transfer testing)',
    b: 'Test RLS + UI rendering only (per spec recommendation; do NOT generate live install sprints — neutral fixtures only per Locked Rule 22)',
    c: 'Full test with mock credentials (generate-and-validate install sprints using mock VEU product credentials)',
  },
  {
    id: 'Q8', topic: 'Reporting format',
    spec_anchor: '§9 OQ-8',
    a: 'Markdown + CSV (per spec §6 as-written)',
    b: 'Markdown + JSON (replace CSV with JSON for downstream-tooling compatibility)',
    c: 'All three (Markdown + CSV + JSON — maximal compatibility)',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)'];

function buildQuestionBody(specText) {
  const lines = [];
  lines.push('═══════════════ FLOWAI SELF-ADVERSARIAL TEST DISPOSITIONS (2026-05-14) ═══════════════');
  lines.push('');
  lines.push('Lineage: W04 dispatch → W6 execution. Disposition request on 8 blocking');
  lines.push('open questions from `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9');
  lines.push('(commit `b06e901`). Engineering needs Panel-recommended option per');
  lines.push('question before the test suite is authorised for construction.');
  lines.push('');
  lines.push('═══════════════ TEST PLAN (verbatim, under review) ═══════════════');
  lines.push('');
  lines.push(specText.trim());
  lines.push('');
  lines.push('═══════════════ END TEST PLAN ═══════════════');
  lines.push('');
  lines.push('═══════════════ EIGHT MULTIPLE-CHOICE QUESTIONS (answer all) ═══════════════');
  lines.push('');
  for (const q of QUESTIONS) {
    lines.push(`### ${q.id} — ${q.topic} (${q.spec_anchor})`);
    lines.push('');
    lines.push(`(a) ${q.a}`);
    lines.push(`(b) ${q.b}`);
    lines.push(`(c) ${q.c}`);
    lines.push('');
  }
  lines.push('Goal: pick exactly one option per question. Engineering will accept');
  lines.push('Panel supermajority (≥8/10 ENGAGED) verbatim; quorum plurality (≥7/10)');
  lines.push('treated as recommendation; below quorum → CEO disposition required.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 8 multiple-choice disposition questions
about how to operationalise the FlowAI self-adversarial test plan (verbatim
attached above, inside the CONSULTATION CONTEXT block). The full FlowAI
CANONICAL_REFERENCE.md is ALSO attached at the top of the bundle — read it
as the project's prior history / Locked Rules / sprint inventory.

The 8 questions are dispositions on 8 specific open questions in §9 of the
test plan spec. Each has 3 mutually-exclusive options (a) / (b) / (c).

For EACH question Q1..Q8:
  - Pick exactly one option from (a) / (b) / (c).
  - Provide a 1-3 sentence rationale citing AT LEAST one specific item
    from the test plan (a section like "§3.4", a test ID like "A4-N1",
    a Locked Rule, a sprint name, or a CANONICAL_REFERENCE feature).
  - If you genuinely cannot pick, leave answer=null and explain in
    rationale; engagement="EVASIVE" if you decline outright.

Engagement self-classification:
  ENGAGED   — Picked an option for all 8 questions AND each rationale
              cites at least one specific item from the spec or
              CANONICAL_REFERENCE.
  TANGENTIAL — Picked options but rationale lacks specific citations,
              OR one or more questions have no valid pick.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "Q1": { "pick": "(a)" | "(b)" | "(c)" | null, "rationale": "<1-3 sentences>" },
    "Q2": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q3": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q4": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q5": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q6": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q7": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q8": { "pick": "<one of>", "rationale": "<1-3 sentences>" }
  },
  "overall_notes": "<optional 1-2 sentences on cross-cutting concerns; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|A[1-5]-[A-Z]?\d|INV-\d|SURF-[A-Z0-9-]+|FND-\d+|Locked Rule|Sprint\s*[A-Z0-9-]+|Agent\s*#\s*\d+|Playwright|Vitest|Stripe|Anthropic|Claude|MockClaude|Browserless|Vercel|Supabase|RLS|GovernanceAuditLog|Self-Protection|95\/95|Clearance|productScope|recommend_only|p50|p95|HAR|JSON|CSV|markdown|OQ-?\d|CA-\d+|Rev-2/i;

function safeParseReviewerResponse(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') return { ok: false, reason: 'empty_output', parsed: null };
  let s = rawOutput.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return { ok: true, reason: 'direct', parsed: JSON.parse(s) }; }
  catch { /* fall through */ }
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b > a) {
    try { return { ok: true, reason: 'greedy_slice', parsed: JSON.parse(s.slice(a, b + 1)) }; }
    catch { /* fall through */ }
  }
  return { ok: false, reason: 'unparseable', parsed: null };
}

function normalizePick(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().toLowerCase().match(/\(?([abc])\)?/);
  if (!m) return null;
  return `(${m[1]})`;
}

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  const slot = idx + 1;
  if (degraded) return { slot, state: 'SILENT', perQuestion: {}, overall: null, degraded: true, parseFailure: false, modelTag };
  if (parseFailure) return { slot, state: 'SILENT', perQuestion: {}, overall: null, degraded: false, parseFailure: true, modelTag };
  const selfTag = typeof parsed?.engagement === 'string' ? parsed.engagement.toUpperCase() : null;
  const perQuestion = {};
  let validPicks = 0;
  let citingRationales = 0;
  for (const q of QUESTIONS) {
    const a = parsed?.answers?.[q.id] ?? {};
    const pick = normalizePick(a?.pick);
    const rationale = typeof a?.rationale === 'string' ? a.rationale.trim() : null;
    if (pick && VALID_OPTIONS.includes(pick)) validPicks += 1;
    const hasCite = rationale && CITATION_TERMS_RE.test(rationale);
    if (pick && hasCite) citingRationales += 1;
    perQuestion[q.id] = { pick, rationale };
  }
  let state = 'SILENT';
  if (selfTag === 'EVASIVE') {
    state = 'EVASIVE';
  } else if (validPicks === 0) {
    state = 'SILENT';
  } else if (validPicks === QUESTIONS.length && citingRationales >= QUESTIONS.length - 1) {
    state = 'ENGAGED';
  } else {
    state = 'TANGENTIAL';
  }
  return {
    slot, state, perQuestion,
    overallNotes: typeof parsed?.overall_notes === 'string' ? parsed.overall_notes.trim() : '',
    degraded: false, parseFailure: false, modelTag,
  };
}

function tally(perReviewer) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const evasive = perReviewer.filter((r) => r.state === 'EVASIVE').length;
  const perQuestion = {};
  for (const q of QUESTIONS) {
    const counts = { '(a)': 0, '(b)': 0, '(c)': 0, other: 0 };
    for (const r of engaged) {
      const p = r.perQuestion[q.id]?.pick;
      if (p && counts[p] !== undefined) counts[p] += 1;
      else counts.other += 1;
    }
    perQuestion[q.id] = counts;
  }
  return { engagedTotal: engaged.length, tangential, silent, evasive, perQuestion };
}

function computeVerdict(counts, engagedTotal) {
  if (engagedTotal === 0) return { verdict: 'NO_SIGNAL', detail: '0 ENGAGED', topOption: null, topCount: 0 };
  const sorted = VALID_OPTIONS.map((o) => [o, counts[o] || 0]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top[1] >= 8) return { verdict: `SUPERMAJORITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ 8/10)`, topOption: top[0], topCount: top[1] };
  if (top[1] >= 7) return { verdict: `QUORUM_PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ quorum 7/10, < supermajority 8/10)`, topOption: top[0], topCount: top[1] };
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}`, topOption: tied[0], topCount: sorted[0][1] };
  }
  return { verdict: `PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (below quorum 7/10)`, topOption: top[0], topCount: top[1] };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | (a) | (b) | (c) | other | Top | Verdict |`);
  rows.push(`|---|---|---:|---:|---:|---:|---|---|`);
  for (const q of QUESTIONS) {
    const c = t.perQuestion[q.id];
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic} | ${c['(a)']} | ${c['(b)']} | ${c['(c)']} | ${c.other} | \`${v.topOption || '—'}\` | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const lines = [];
    lines.push(`### ${q.id} — ${q.topic} (${q.spec_anchor})`);
    lines.push('');
    lines.push(`- (a) ${q.a}`);
    lines.push(`- (b) ${q.b}`);
    lines.push(`- (c) ${q.c}`);
    lines.push('');
    lines.push(`**Verdict:** \`${v.verdict}\` — ${v.detail}.`);
    lines.push('');
    return lines.join('\n');
  }).join('\n');
}

function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `**Slot ${r.slot}** [${r.state}] — ${r.modelTag}`;
    const lines = [head, ''];
    if (r.state === 'SILENT' || r.state === 'EVASIVE') {
      lines.push(`> _(degraded / parse-failure / no engagement)_`);
      lines.push('');
      return lines.join('\n');
    }
    for (const q of QUESTIONS) {
      const a = r.perQuestion[q.id] || {};
      lines.push(`- **${q.id}** = \`${a.pick ?? '—'}\``);
      if (a.rationale) lines.push(`  > ${a.rationale.replace(/\n/g, '\n  > ')}`);
    }
    if (r.overallNotes) {
      lines.push('');
      lines.push(`Overall notes: ${r.overallNotes}`);
    }
    lines.push('');
    return lines.join('\n');
  }).join('\n---\n\n');
}

function renderRawResponses(reviewers) {
  return reviewers.map((r, idx) => {
    const slot = idx + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP applied]' : '';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    const out = [];
    out.push(`### Slot ${slot}${tag} — ${r.provider}:${modelStr}`);
    out.push('');
    out.push(`- Provider: \`${r.provider}\``);
    out.push(`- Latency: ${r.latency_ms} ms`);
    out.push(`- HTTP status: ${r.degraded ? 'DEGRADED' : 'OK'}`);
    if (r.slot_backup_applied) out.push(`- Primary that failed: \`${r.primary_slot_provider}:${r.primary_slot_model}\` (error: ${r.primary_slot_error ?? 'unknown'})`);
    if (r.error) out.push(`- Error: ${r.error}`);
    out.push('');
    out.push('```');
    out.push(r.raw_output ?? '(no output)');
    out.push('```');
    out.push('');
    return out.join('\n');
  }).join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[adversarial-test-dispositions] started ${startedAt}\n`);

  if (!existsSync(SPEC_PATH)) throw new Error(`Test plan spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(specText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[adversarial-test-dispositions] bundle: ${artifact.length} chars (CANONICAL_REFERENCE + test plan attached)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact, criteria: CRITERIA, panel: PANEL,
    perReviewerTimeoutMs: 90_000,
    backupRetryTimeoutMs: 120_000,
  });
  const finishedAt = new Date().toISOString();

  const perReviewer = result.reviewers.map((r, idx) => {
    const modelTag = `${r.provider}:${(r.model || '').split(':').slice(1).join(':') || (r.model || '')}`;
    if (r.degraded) return classifyReviewer(null, idx, true, false, modelTag);
    const parsed = safeParseReviewerResponse(r.raw_output);
    if (!parsed.ok) return classifyReviewer(null, idx, false, true, modelTag);
    return classifyReviewer(parsed.parsed, idx, false, false, modelTag);
  });

  const t = tally(perReviewer);
  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const perVerdicts = {};
  for (const q of QUESTIONS) perVerdicts[q.id] = computeVerdict(t.perQuestion[q.id], t.engagedTotal);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const recommendedDispositions = QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const winningOptionText = v.topOption
      ? (v.topOption === '(a)' ? q.a : v.topOption === '(b)' ? q.b : q.c)
      : '(no signal)';
    return { id: q.id, topic: q.topic, spec_anchor: q.spec_anchor, verdict: v.verdict, top_option: v.topOption, top_count: v.topCount, engaged_total: t.engagedTotal, winning_option_text: winningOptionText };
  });

  const md = [
    `# Panel Consultation — FlowAI Self-Adversarial Test Plan Dispositions (2026-05-14)`,
    ``,
    `**Lineage:** W04 dispatch → W6 execution. Disposition request on 8 open questions blocking adversarial-test suite construction. Spec: \`docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md\` §9 (commit \`b06e901\`).`,
    ``,
    `**Mode:** read-only Panel consultation. 8 multiple-choice questions, 3 options each. Engineering accepts supermajority (≥8/10 ENGAGED) verbatim.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + test plan attached).`,
    `**Panel:** 10-slot LIVE composition; Slot 5 + Slot 7 backup adapters wired per W6 brief.`,
    ``,
    `**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
    ``,
    `| Slot | Provider | Model | Status | Backup? | Latency (ms) | Error |`,
    `|------|----------|-------|--------|---------|--------------|-------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? 'YES' : '—';
      const err = r.error ? r.error.replace(/\n/g, ' ').slice(0, 120) : '';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${status} | ${backup} | ${r.latency_ms} | ${err} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (>=7 LIVE-OK): ${result.w6_metadata.quorum_met}. Supermajority achievable (>=8 LIVE-OK): ${result.w6_metadata.supermajority_achievable}.`,
    ``,
    `Engagement: ENGAGED=${t.engagedTotal} · TANGENTIAL=${t.tangential} · SILENT=${t.silent} · EVASIVE=${t.evasive} (of ${PANEL.length} slots).`,
    ``,
    `---`,
    ``,
    `## Tally + verdicts (ENGAGED-only)`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## Recommended dispositions (Panel-winning option per question)`,
    ``,
    ...recommendedDispositions.flatMap((d) => [
      `- **${d.id}** (${d.spec_anchor}) — ${d.topic}`,
      `  - Verdict: \`${d.verdict}\` · Top option: \`${d.top_option ?? '—'}\` (${d.top_count}/${d.engaged_total} ENGAGED)`,
      `  - Winning option text: ${d.winning_option_text}`,
      ``,
    ]),
    `---`,
    ``,
    `## Per-question detail`,
    ``,
    renderQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## Per-reviewer picks + rationales`,
    ``,
    renderPerReviewer(perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[adversarial-test-dispositions] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'adversarial-test-dispositions.sidecar.v1',
    startedAt, finishedAt,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    per_question_verdicts: perVerdicts,
    recommended_dispositions: recommendedDispositions,
    perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[adversarial-test-dispositions] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ ADVERSARIAL TEST DISPOSITIONS SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups applied: ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal}) — ${q.topic}\n`);
  }
  process.stdout.write('══════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[adversarial-test-dispositions] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
