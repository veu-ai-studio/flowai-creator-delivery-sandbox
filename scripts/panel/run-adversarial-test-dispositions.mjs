// scripts/panel/run-adversarial-test-dispositions.mjs
//
// W6 Panel consultation — 8 open questions blocking FlowAI self-adversarial
// test execution per `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9
// (commit `b06e901`).
//
// Re-run 2026-05-14 with:
//   - 4 options per question (a/b/c/d) per W04 refined dispatch
//   - INSUFFICIENT_INFORMATION valid as a per-question response
//   - Rebalanced Panel composition imported from slot-config.mjs (≤2 slots
//     per provider; 8 distinct providers; per-slot provider-different backup)
//   - SSOT conflict-flagging surfaced per reviewer
//
// Output paths (overwrite the prior 3-option run by design):
//   docs/panel-consultations/adversarial-test-dispositions-2026-05-14.md
//   docs/panel-consultations/adversarial-test-dispositions-2026-05-14.sidecar.json

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
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'adversarial-test-dispositions-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'adversarial-test-dispositions-2026-05-14.sidecar.json');

const QUESTIONS = [
  {
    id: 'Q1', topic: 'WAF bypass strategy for Playwright tests', spec_anchor: '§9 OQ-1',
    a: 'Add X-Test-Bypass-Token header allowlist mechanism',
    b: 'Use stealth Playwright profile (fingerprint randomization)',
    c: 'Test against dev SUT only (no production traffic)',
    d: 'Combination of (a) for prod + (c) for high-risk adversarial',
  },
  {
    id: 'Q2', topic: 'Test data isolation strategy (Agents #4/#5 create rows)', spec_anchor: '§9 OQ-2',
    a: 'Reserved productScope=\'_test\' tenant with auto-cleanup after each run',
    b: 'Restrict entire suite to dev SUT only',
    c: 'Separate test database (independent Supabase project)',
    d: 'Time-windowed test rows (auto-delete >24h old)',
  },
  {
    id: 'Q3', topic: 'Stripe Connect adversarial scope', spec_anchor: '§9 OQ-3',
    a: 'Mock Stripe everywhere (no real API calls)',
    b: 'Stripe sandbox for nominal cases only; mock for adversarial',
    c: 'Skip all Stripe tests in this run; defer to dedicated Stripe test suite',
    d: 'Sandbox for everything',
  },
  {
    id: 'Q4', topic: 'Self-Protection Agent #13 conflict (when #13 ships)', spec_anchor: '§9 OQ-4',
    a: 'Allowlist test suite by signed identifier',
    b: 'Disable #13 during test runs',
    c: 'Not blocking — #13 is dormant; defer until activation',
    d: 'Run suite in maintenance window',
  },
  {
    id: 'Q5', topic: 'Performance baselines (p50/p95 not yet canonical)', spec_anchor: '§9 OQ-5',
    a: 'Set default targets now: p50 < 1s, p95 < 3s for API; p50 < 2s, p95 < 5s for page-load',
    b: 'Record-only, no pass/fail until production traffic gives baseline',
    c: 'Defer perf testing entirely until separate perf-test dispatch',
    d: 'Use SSOT §16 Live Monitor existing thresholds if any',
  },
  {
    id: 'Q6', topic: 'Real LLM calls vs MockClaude for adversarial tests', spec_anchor: '§9 OQ-6',
    a: 'MockClaude everywhere — zero LLM cost',
    b: 'Hybrid: MockClaude for malformed/edge; real Claude for prompt-injection cases only',
    c: 'Real Claude everywhere — highest fidelity, highest cost',
    d: 'Real Claude for first run only (baseline); MockClaude for nightly cadence',
  },
  {
    id: 'Q7', topic: 'Capability Transfer install-sprint testing (vs Locked Rule 22 "neutral fixtures only")', spec_anchor: '§9 OQ-7',
    a: 'Skip Capability Transfer tests entirely',
    b: 'Test only RLS + UI rendering (no live install)',
    c: 'Use synthetic mock credentials with full install simulation',
    d: 'Defer until SSOT §22 amendment cycle',
  },
  {
    id: 'Q8', topic: 'Reporting format for ~436 test results', spec_anchor: '§9 OQ-8',
    a: 'Markdown + CSV (per current plan §6)',
    b: 'Markdown + JSON (better for tooling integration)',
    c: 'All three (Markdown + CSV + JSON)',
    d: 'JSON only with a generator for the other two on demand',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)', '(d)'];
const INSUFF = 'INSUFFICIENT_INFORMATION';

function buildQuestionBody(specText) {
  const lines = [];
  lines.push('═══════════════ FLOWAI SELF-ADVERSARIAL TEST DISPOSITIONS (2026-05-14) ═══════════════');
  lines.push('');
  lines.push('Lineage: W04 dispatch → W6 execution. Disposition request on 8 blocking');
  lines.push('open questions from `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9');
  lines.push('(commit `b06e901`). 4 options per question (a/b/c/d). The literal string');
  lines.push('"INSUFFICIENT_INFORMATION" is also a valid per-question response — use it');
  lines.push('only when the SSOT + test plan jointly do not provide enough basis to pick.');
  lines.push('');
  lines.push('Engineering will accept Panel supermajority (≥8/10 ENGAGED) verbatim;');
  lines.push('quorum plurality (≥7/10) treated as recommendation; below quorum → CEO');
  lines.push('disposition required.');
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
    lines.push(`(d) ${q.d}`);
    lines.push('');
  }
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 8 multiple-choice disposition questions
about how to operationalise the FlowAI self-adversarial test plan (verbatim
attached above, inside the CONSULTATION CONTEXT block). The full FlowAI
CANONICAL_REFERENCE.md is ALSO attached at the top of the bundle — read
it as the canonical SSOT (Rev-2.1 ratified per commit c2623c5) including
Locked Rules, §6 resolution contract, §10 Self-Governance Layer, §14
GovernanceAuditLog, §16 deployment infrastructure, §22 product-agnostic
rule, §27 open-questions cycle.

The 8 questions are dispositions on 8 specific open questions in §9 of
the test plan spec. Each has 4 mutually-exclusive options (a) / (b) /
(c) / (d). The literal string "INSUFFICIENT_INFORMATION" is also valid
as a per-question response when you cannot in good faith pick on the
evidence available — use it sparingly and justify in the rationale.

For EACH question Q1..Q8:
  - Pick exactly one of (a) / (b) / (c) / (d) — OR "INSUFFICIENT_INFORMATION".
  - Provide a 1-3 sentence rationale citing AT LEAST one specific item
    from the test plan (a section like "§3.4", a test ID like "A4-N1",
    a Locked Rule, a sprint name) OR one item from the SSOT
    (CANONICAL_REFERENCE.md §-numbers, Locked Rules, Agent#N, etc.).
  - If your pick conflicts with the canonical SSOT, FLAG IT in the
    "conflicts_with_ssot" array (see envelope schema below). Example:
    "Q5(a) conflicts with SSOT §16 because Live Monitor thresholds
    are not yet canonical".

Engagement self-classification:
  ENGAGED   — All 8 questions answered (option pick OR explicit
              INSUFFICIENT_INFORMATION) AND each rationale cites at
              least one specific item from the spec or CANONICAL_REFERENCE.
  TANGENTIAL — Some questions missing valid responses, OR rationales
              lack specific citations.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "Q1": { "pick": "(a)" | "(b)" | "(c)" | "(d)" | "INSUFFICIENT_INFORMATION", "rationale": "<1-3 sentences>" },
    "Q2": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q3": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q4": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q5": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q6": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q7": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q8": { "pick": "<one of>", "rationale": "<1-3 sentences>" }
  },
  "conflicts_with_ssot": ["<Q# + 1-line description>", ...],
  "overall_notes": "<optional 1-2 sentences; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|A[1-5]-[A-Z]?\d|INV-\d|SURF-[A-Z0-9-]+|FND-\d+|Locked Rule|Sprint\s*[A-Z0-9-]+|Agent\s*#\s*\d+|Playwright|Vitest|Stripe|Anthropic|Claude|MockClaude|Browserless|Vercel|Supabase|RLS|GovernanceAuditLog|Self-Protection|95\/95|Clearance|productScope|recommend_only|p50|p95|HAR|JSON|CSV|markdown|OQ-?\d|CA-\d+|Rev-2|Rev-2\.1|fork[- ]and[- ]fix|CANONICAL_REFERENCE/i;

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
  const t = raw.trim();
  if (/insufficient[\s_-]?information/i.test(t)) return INSUFF;
  const m = t.toLowerCase().match(/\(?([abcd])\)?/);
  if (!m) return null;
  return `(${m[1]})`;
}

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  const slot = idx + 1;
  if (degraded) return { slot, state: 'SILENT', perQuestion: {}, conflicts: [], degraded: true, parseFailure: false, modelTag };
  if (parseFailure) return { slot, state: 'SILENT', perQuestion: {}, conflicts: [], degraded: false, parseFailure: true, modelTag };
  const selfTag = typeof parsed?.engagement === 'string' ? parsed.engagement.toUpperCase() : null;
  const perQuestion = {};
  let validPicks = 0;
  let citingRationales = 0;
  let insuffCount = 0;
  for (const q of QUESTIONS) {
    const a = parsed?.answers?.[q.id] ?? {};
    const pick = normalizePick(a?.pick);
    const rationale = typeof a?.rationale === 'string' ? a.rationale.trim() : null;
    if (pick && (VALID_OPTIONS.includes(pick) || pick === INSUFF)) validPicks += 1;
    if (pick === INSUFF) insuffCount += 1;
    const hasCite = rationale && CITATION_TERMS_RE.test(rationale);
    if (pick && hasCite) citingRationales += 1;
    perQuestion[q.id] = { pick, rationale };
  }
  const conflicts = Array.isArray(parsed?.conflicts_with_ssot) ? parsed.conflicts_with_ssot.filter((s) => typeof s === 'string').map((s) => s.trim()) : [];
  let state = 'SILENT';
  if (selfTag === 'EVASIVE') state = 'EVASIVE';
  else if (validPicks === 0) state = 'SILENT';
  else if (validPicks === QUESTIONS.length && citingRationales >= QUESTIONS.length - 1) state = 'ENGAGED';
  else state = 'TANGENTIAL';

  return {
    slot, state, perQuestion, insuffCount, conflicts,
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
    const counts = { '(a)': 0, '(b)': 0, '(c)': 0, '(d)': 0, [INSUFF]: 0, other: 0 };
    for (const r of engaged) {
      const p = r.perQuestion[q.id]?.pick;
      if (p && counts[p] !== undefined) counts[p] += 1;
      else counts.other += 1;
    }
    perQuestion[q.id] = counts;
  }
  const totalInsuff = perReviewer.reduce((acc, r) => acc + (r.insuffCount || 0), 0);
  return { engagedTotal: engaged.length, tangential, silent, evasive, perQuestion, totalInsuff };
}

function computeVerdict(counts, engagedTotal) {
  if (engagedTotal === 0) return { verdict: 'NO_QUORUM', detail: '0 ENGAGED', topOption: null, topCount: 0 };
  // Tally over the four option keys only — INSUFFICIENT_INFORMATION is not
  // a votable option for engineering disposition; surfaced separately.
  const sorted = VALID_OPTIONS.map((o) => [o, counts[o] || 0]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  // UNANIMOUS = all ENGAGED votes on one option AND no INSUFF abstentions for it
  if (top[1] === engagedTotal && (counts[INSUFF] || 0) === 0) {
    return { verdict: `UNANIMOUS_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (unanimous)`, topOption: top[0], topCount: top[1] };
  }
  if (top[1] >= 8) return { verdict: `SUPERMAJORITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ 8/10)`, topOption: top[0], topCount: top[1] };
  if (top[1] >= 7) return { verdict: `QUORUM_PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ 7/10 quorum, < 8/10 supermajority)`, topOption: top[0], topCount: top[1] };
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}`, topOption: tied[0], topCount: sorted[0][1] };
  }
  if (top[1] === 0) {
    return { verdict: 'NO_QUORUM', detail: `0 ENGAGED votes on any of (a)/(b)/(c)/(d); INSUFF=${counts[INSUFF] || 0}`, topOption: null, topCount: 0 };
  }
  return { verdict: `PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (below 7/10 quorum)`, topOption: top[0], topCount: top[1] };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | (a) | (b) | (c) | (d) | INSUFF | other | Top | Verdict |`);
  rows.push(`|---|---|---:|---:|---:|---:|---:|---:|---|---|`);
  for (const q of QUESTIONS) {
    const c = t.perQuestion[q.id];
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic} | ${c['(a)']} | ${c['(b)']} | ${c['(c)']} | ${c['(d)']} | ${c[INSUFF]} | ${c.other} | \`${v.topOption || '—'}\` | \`${v.verdict}\` |`);
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
    lines.push(`- (d) ${q.d}`);
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
    if (Array.isArray(r.conflicts) && r.conflicts.length > 0) {
      lines.push('');
      lines.push(`Conflicts flagged with canonical SSOT:`);
      for (const c of r.conflicts) lines.push(`  - ${c}`);
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
    const tag = r.slot_backup_applied ? ' [BACKUP FIRED]' : '';
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

  // Diversity guard — refuse to run on a biased Panel.
  const audit = auditDiversity();
  process.stdout.write(`[adversarial-test-dispositions] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 2 || audit.slots !== 10) {
    throw new Error(`Panel composition biased — maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting per W04 dispatch.`);
  }

  if (!existsSync(SPEC_PATH)) throw new Error(`Test plan spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(specText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[adversarial-test-dispositions] bundle: ${artifact.length} chars (full CANONICAL_REFERENCE + test plan attached)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact, criteria: CRITERIA, panel: PANEL,
    perReviewerTimeoutMs: 120_000,
    backupRetryTimeoutMs: 150_000,
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

  // Highest-conviction vs lower-conviction split for CEO routing.
  const high = QUESTIONS.filter((q) => /^(UNANIMOUS|SUPERMAJORITY)/.test(perVerdicts[q.id].verdict));
  const low = QUESTIONS.filter((q) => !/^(UNANIMOUS|SUPERMAJORITY)/.test(perVerdicts[q.id].verdict));

  // SSOT conflicts aggregated across all reviewers
  const allConflicts = perReviewer.flatMap((r) => (r.conflicts || []).map((c) => ({ slot: r.slot, conflict: c })));

  // Backup-fire roster
  const backupFires = result.reviewers
    .map((r, idx) => ({ slot: idx + 1, fired: !!r.slot_backup_applied, primary: r.primary_slot_model, primary_provider: r.primary_slot_provider, replacement: r.model, replacement_provider: r.provider, primary_error: r.primary_slot_error }))
    .filter((b) => b.fired);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# Panel Consultation — FlowAI Self-Adversarial Test Plan Dispositions (2026-05-14, 4-option re-run)`,
    ``,
    `**Lineage:** W04 dispatch → W6 execution. 4-option re-run with rebalanced Panel composition (≤2/provider, 8 distinct providers). Spec: \`docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md\` §9 (commit \`b06e901\`).`,
    ``,
    `**Mode:** read-only Panel consultation. 8 multiple-choice questions, 4 options each + \`INSUFFICIENT_INFORMATION\` valid abstention. Engineering accepts supermajority (≥8/10 ENGAGED) verbatim.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + test plan attached, per Rev-2 §11 / §19 Panel SSOT Access Rules).`,
    `**Panel composition audit:** ${JSON.stringify(audit)} — providers ≤2 each, 10 slots, 8 distinct providers.`,
    ``,
    `**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10 · Unanimous = 10 of 10.`,
    ``,
    `---`,
    ``,
    `## Slot status (rebalanced composition)`,
    ``,
    `| Slot | Provider | Model | Region/Role | Backup adapter | Status | Backup fired? | Latency (ms) | Error |`,
    `|------|----------|-------|-------------|----------------|--------|---------------|--------------|-------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const cfg = SLOT_CONFIG[idx];
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? `YES (${r.primary_slot_provider}:${r.primary_slot_model} → ${r.provider}:${r.model})` : '—';
      const err = r.error ? r.error.replace(/\n/g, ' ').slice(0, 100) : '';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      const region = cfg ? `${cfg.region} · ${cfg.role}` : '';
      const backupAdapter = cfg?.backup ? `${cfg.backup.provider}:${(cfg.backup.model || '').split(':').slice(1).join(':') || cfg.backup.model}` : '—';
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${region} | \`${backupAdapter}\` | ${status} | ${backup} | ${r.latency_ms} | ${err} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (>=7 LIVE-OK): ${result.w6_metadata.quorum_met}. Supermajority achievable (>=8 LIVE-OK): ${result.w6_metadata.supermajority_achievable}.`,
    ``,
    `Engagement: **ENGAGED=${t.engagedTotal}** · TANGENTIAL=${t.tangential} · SILENT=${t.silent} · EVASIVE=${t.evasive} (of ${PANEL.length} slots). \`INSUFFICIENT_INFORMATION\` responses across all reviewers: **${t.totalInsuff}**.`,
    ``,
    `---`,
    ``,
    `## Tally + verdicts (ENGAGED-only)`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## Highest-conviction questions (UNANIMOUS / SUPERMAJORITY — CEO confirmation only)`,
    ``,
    high.length === 0 ? '_(none cleared supermajority)_' : high.map((q) => {
      const v = perVerdicts[q.id];
      const winText = v.topOption ? (v.topOption === '(a)' ? q.a : v.topOption === '(b)' ? q.b : v.topOption === '(c)' ? q.c : q.d) : '';
      return `- **${q.id}** (${q.spec_anchor}) — \`${v.verdict}\` · winning option \`${v.topOption}\`: ${winText}`;
    }).join('\n'),
    ``,
    `## Lower-conviction questions (SPLIT / PLURALITY / NO_QUORUM — CEO arbitration required)`,
    ``,
    low.length === 0 ? '_(none — every question cleared supermajority)_' : low.map((q) => {
      const v = perVerdicts[q.id];
      return `- **${q.id}** (${q.spec_anchor}) — \`${v.verdict}\` — ${v.detail}`;
    }).join('\n'),
    ``,
    `---`,
    ``,
    `## Per-question detail`,
    ``,
    renderQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## Conflicts with canonical SSOT (flagged by reviewers)`,
    ``,
    allConflicts.length === 0 ? '_(no reviewer flagged any conflict with canonical SSOT)_' : allConflicts.map((c) => `- Slot ${c.slot}: ${c.conflict}`).join('\n'),
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
    schema: 'adversarial-test-dispositions.sidecar.v2',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    per_question_verdicts: perVerdicts,
    high_conviction: high.map((q) => q.id),
    low_conviction: low.map((q) => q.id),
    backup_fires: backupFires,
    ssot_conflicts: allConflicts,
    perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[adversarial-test-dispositions] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ ADVERSARIAL TEST DISPOSITIONS SUMMARY (4-option re-run) ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups fired:   ${result.w6_metadata.backups_applied} -> ${JSON.stringify(backupFires)}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length} (TANGENTIAL=${t.tangential}, SILENT=${t.silent}, EVASIVE=${t.evasive})\n`);
  process.stdout.write(`INSUFF total:    ${t.totalInsuff} across all reviewers x 8 questions\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal}) — ${q.topic}\n`);
  }
  process.stdout.write(`SSOT conflicts flagged: ${allConflicts.length}\n`);
  process.stdout.write('═══════════════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[adversarial-test-dispositions] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
