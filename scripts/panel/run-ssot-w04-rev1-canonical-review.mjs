// scripts/panel/run-ssot-w04-rev1-canonical-review.mjs
//
// W6 Panel consultation — SSOT W04-Rev-1 Canonical Review (2026-05-14).
//
// Per W04 dispatch 2026-05-14: review the W04-Rev-1 SSOT DRAFT
// (`docs/SSOT_W04_REV1_DRAFT.md`, committed `d68a1df`) against 6
// free-text questions, then synthesize per-question Panel signal and
// overall canonical-readiness recommendation.
//
// Standing rule (W6 brief): full CANONICAL_REFERENCE.md is attached
// as context via buildArtifactWithCanonical(). The W04-Rev-1 DRAFT is
// inlined verbatim in the QUESTION_BODY so reviewers can cite section
// numbers.

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

const DRAFT_PATH = path.join(repoRoot, 'docs', 'SSOT_W04_REV1_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ssot-w04-rev1-canonical-review-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ssot-w04-rev1-canonical-review-2026-05-14.sidecar.json');

const QUESTIONS = [
  {
    id: 'Q1',
    short: 'Completeness & internal consistency',
    text:
      'Is the SSOT complete and internally consistent? Flag any gaps or ' +
      'conflicts with explicit section references (e.g., "Section 3 vs Section 14").',
    verdict_options: ['COMPLETE_AND_CONSISTENT', 'INCOMPLETE', 'INCONSISTENT', 'BOTH_INCOMPLETE_AND_INCONSISTENT'],
  },
  {
    id: 'Q2',
    short: 'Three Levels of Orchestration (Section 4)',
    text:
      'Do the Three Levels of Orchestration in Section 4 (Building FlowAI / ' +
      'FlowAI on Itself / FlowAI on External Products) correctly AND completely ' +
      'describe how FlowAI operates? Identify anything missing or mis-scoped.',
    verdict_options: ['CORRECT_AND_COMPLETE', 'CORRECT_BUT_INCOMPLETE', 'PARTIALLY_CORRECT', 'INCORRECT'],
  },
  {
    id: 'Q3',
    short: 'Crawl Contract (Section 6) + Output Contract (Section 7) closed loop',
    text:
      'Does the Aggressive Crawling, Testing & Resolution Contract (Section 6) ' +
      'plus the Output Contract (Section 7) form a technically achievable closed ' +
      'loop (crawl -> find -> fix -> re-test -> confirm clean -> deliver new live URL)? ' +
      'Identify any breakages or undefined transitions in that loop.',
    verdict_options: ['ACHIEVABLE_CLOSED_LOOP', 'ACHIEVABLE_WITH_GAPS', 'NOT_ACHIEVABLE_AS_WRITTEN'],
  },
  {
    id: 'Q4',
    short: 'System Operation Levels vs Orchestra Execution Modes distinctness',
    text:
      'Are the System Operation Levels (Manual / Supervised / Autonomous in Section 8a) ' +
      'and the Orchestra Execution Modes (Auto / Guided / Manual in Section 8) ' +
      'sufficiently distinct to avoid implementation confusion? Flag any ' +
      'overlap, ambiguous naming, or under-specified interaction between the two axes.',
    verdict_options: ['SUFFICIENTLY_DISTINCT', 'NAMING_AMBIGUITY', 'OVERLAPPING_OR_CONFUSING'],
  },
  {
    id: 'Q5',
    short: 'Commercial Model (Section 3) vs Product-Agnostic Rule (Section 14) & 25-agent roster',
    text:
      'Does the Commercial Model (Section 3 — licensed OS, per-seat / per-product / ' +
      'per-time pricing, providers + sub-orgs + revenue splits) conflict with the ' +
      'Product-Agnostic Rule (Section 14 — zero product-specific code, neutral fixtures) ' +
      'or with the 25-agent roster design (Section 10 — 12 embedded in every product, ' +
      '8 FlowAI-internal-only, 5 reserved)? If yes, name the conflict precisely.',
    verdict_options: ['NO_CONFLICT', 'POTENTIAL_TENSION', 'EXPLICIT_CONFLICT'],
  },
  {
    id: 'Q6',
    short: 'Missing pieces before canonical promotion',
    text:
      'What is missing from this SSOT W04-Rev-1 that MUST be added before it ' +
      'becomes canonical ground truth? List concrete items (not generic platitudes); ' +
      'each item should be specific enough to convert into an SSOT amendment or ' +
      'implementation task.',
    verdict_options: ['READY_FOR_CANONICAL', 'NEEDS_MINOR_ADDITIONS', 'NEEDS_MAJOR_ADDITIONS', 'NOT_READY'],
  },
];

const OVERALL_OPTIONS = [
  'PROMOTE_AS_CANONICAL',
  'PROMOTE_WITH_MINOR_AMENDMENTS',
  'REWORK_BEFORE_PROMOTION',
  'REJECT_CURRENT_DRAFT',
];

function buildQuestionBody(draftText) {
  const lines = [];
  lines.push('═══════════════ SSOT W04-Rev-1 CANONICAL REVIEW (2026-05-14) ═══════════════');
  lines.push('');
  lines.push('Lineage: W04 dispatch (CEO-acting-as-W04). DRAFT staged by W2 at');
  lines.push('`docs/SSOT_W04_REV1_DRAFT.md` (commit `d68a1df`). This consultation');
  lines.push('is W6\'s canonical Panel review BEFORE promotion. Panel write-authority');
  lines.push('per W6 brief: consensus grants authority to propose SSOT amendments.');
  lines.push('');
  lines.push('═══════════════ SSOT W04-Rev-1 DRAFT (verbatim, under review) ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END W04-Rev-1 DRAFT ═══════════════');
  lines.push('');
  lines.push('═══════════════ QUESTIONS (answer all six) ═══════════════');
  lines.push('');
  for (const q of QUESTIONS) {
    lines.push(`### ${q.id} — ${q.short}`);
    lines.push('');
    lines.push(q.text);
    lines.push('');
    lines.push(`Valid verdict labels for ${q.id}: ${q.verdict_options.map((v) => `"${v}"`).join(' | ')}`);
    lines.push('');
  }
  lines.push('═══════════════ OVERALL RECOMMENDATION ═══════════════');
  lines.push('');
  lines.push(`Pick one: ${OVERALL_OPTIONS.map((v) => `"${v}"`).join(' | ')}`);
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering a 6-question canonical review of the
FlowAI SSOT W04-Rev-1 DRAFT (verbatim text attached above, inside the
CONSULTATION CONTEXT block). The full FlowAI CANONICAL_REFERENCE.md is
ALSO attached at the top of the bundle — use it as project history /
evidence base to judge consistency between the new W04-Rev-1 DRAFT and
the project's prior canonical state.

For EACH of the six questions Q1..Q6:
  - Pick exactly one verdict label from the valid set listed under that
    question.
  - Provide 2-4 sentences of findings citing AT LEAST one specific
    section number from the W04-Rev-1 DRAFT (e.g., "Section 6",
    "Section 8a") or one specific item from CANONICAL_REFERENCE.md.
  - For Q6, also provide a list of concrete missing items (1-line each).

Then provide one OVERALL recommendation label from:
  PROMOTE_AS_CANONICAL | PROMOTE_WITH_MINOR_AMENDMENTS |
  REWORK_BEFORE_PROMOTION | REJECT_CURRENT_DRAFT
with a 2-3 sentence rationale.

Engagement self-classification:
  ENGAGED   — Picked a verdict label for every question AND every
              finding cites at least one specific section number or
              CANONICAL_REFERENCE item.
  TANGENTIAL — Some verdicts picked but missing citations, OR vague
              findings.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "Q1": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"] },
    "Q2": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"] },
    "Q3": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"] },
    "Q4": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"] },
    "Q5": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"] },
    "Q6": { "verdict": "<label>", "findings": "<2-4 sentences>", "section_refs": ["<refs>"], "missing_items": ["<item 1>", "<item 2>"] }
  },
  "overall_recommendation": "<label>",
  "rationale": "<2-3 sentences>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /Section\s*\d+[a-z]?|CANONICAL_REFERENCE|W04-Rev-1|W04 Rev 1|Orchestra|Auto\s*\/\s*Guided\s*\/\s*Manual|Manual\s*\/\s*Supervised\s*\/\s*Autonomous|Sprint\s*[A-Z0-9-]+|Agent\s*#\s*\d+|95\/95|Quorum|supermajority|Clearance|Self-Renewal|95\s*\/\s*95|8-step|recommend_only|OrchestratorHub|Vercel|Supabase|Playwright|Doppler|G3|MG2|CA-\d+/i;

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

function normalizeVerdict(raw, validSet) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (validSet.includes(trimmed)) return trimmed;
  // Tolerant match — strip non-alphanum and compare
  const norm = trimmed.replace(/[^A-Z_]/g, '');
  for (const v of validSet) {
    if (v.replace(/[^A-Z_]/g, '') === norm) return v;
  }
  return null;
}

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  const slot = idx + 1;
  if (degraded) return { slot, state: 'SILENT', perQuestion: {}, overall: null, rationale: 'reviewer degraded', degraded: true, parseFailure: false, modelTag };
  if (parseFailure) return { slot, state: 'SILENT', perQuestion: {}, overall: null, rationale: 'parse failure', degraded: false, parseFailure: true, modelTag };

  const selfTag = typeof parsed?.engagement === 'string' ? parsed.engagement.toUpperCase() : null;
  const rationale = typeof parsed?.rationale === 'string' ? parsed.rationale.trim() : null;
  const overall = normalizeVerdict(parsed?.overall_recommendation, OVERALL_OPTIONS);

  const perQuestion = {};
  let validVerdicts = 0;
  let citingFindings = 0;
  for (const q of QUESTIONS) {
    const a = parsed?.answers?.[q.id];
    const verdict = normalizeVerdict(a?.verdict, q.verdict_options);
    const findings = typeof a?.findings === 'string' ? a.findings.trim() : null;
    const refs = Array.isArray(a?.section_refs) ? a.section_refs.filter((c) => typeof c === 'string').map((c) => c.trim()) : [];
    const missingItems = q.id === 'Q6' && Array.isArray(a?.missing_items)
      ? a.missing_items.filter((c) => typeof c === 'string').map((c) => c.trim())
      : null;
    if (verdict) validVerdicts += 1;
    const hasCite = refs.length > 0 || (findings && CITATION_TERMS_RE.test(findings));
    if (verdict && hasCite) citingFindings += 1;
    perQuestion[q.id] = { verdict, findings, section_refs: refs, missing_items: missingItems };
  }

  let state = 'SILENT';
  if (selfTag === 'EVASIVE') {
    state = 'EVASIVE';
  } else if (validVerdicts === 0 && !overall && !rationale) {
    state = 'SILENT';
  } else if (validVerdicts === QUESTIONS.length && citingFindings === QUESTIONS.length && overall) {
    state = 'ENGAGED';
  } else {
    state = 'TANGENTIAL';
  }

  return { slot, state, perQuestion, overall, rationale, degraded: false, parseFailure: false, modelTag };
}

function tally(perReviewer) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const evasive = perReviewer.filter((r) => r.state === 'EVASIVE').length;

  const perQuestion = {};
  for (const q of QUESTIONS) {
    const counts = {};
    for (const v of q.verdict_options) counts[v] = 0;
    counts.other = 0;
    for (const r of engaged) {
      const v = r.perQuestion[q.id]?.verdict;
      if (v && counts[v] !== undefined) counts[v] += 1;
      else counts.other += 1;
    }
    perQuestion[q.id] = counts;
  }
  const overall = {};
  for (const v of OVERALL_OPTIONS) overall[v] = 0;
  overall.other = 0;
  for (const r of engaged) {
    if (r.overall && overall[r.overall] !== undefined) overall[r.overall] += 1;
    else overall.other += 1;
  }

  return {
    engagedTotal: engaged.length,
    tangential, silent, evasive,
    perQuestion, overall,
  };
}

function computePerQuestionVerdict(counts, validOptions, engagedTotal) {
  if (engagedTotal === 0) return { verdict: 'NO_SIGNAL', detail: '0 ENGAGED' };
  // Sort options by count
  const sorted = validOptions.map((o) => [o, counts[o] || 0]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top[1] >= 8) return { verdict: `SUPERMAJORITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (supermajority bar 8/10)` };
  if (top[1] >= 7) return { verdict: `QUORUM_PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (>= quorum 7/10, < supermajority 8/10)` };
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}` };
  }
  return { verdict: `PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (below quorum 7/10)` };
}

function renderPerQuestionTable(t) {
  const rows = [];
  rows.push('| Question | Verdict | Top label | Count / ENGAGED |');
  rows.push('|---|---|---|---|');
  for (const q of QUESTIONS) {
    const c = t.perQuestion[q.id];
    const v = computePerQuestionVerdict(c, q.verdict_options, t.engagedTotal);
    const top = q.verdict_options.map((o) => [o, c[o] || 0]).sort((a, b) => b[1] - a[1])[0];
    rows.push(`| ${q.id} ${q.short} | \`${v.verdict}\` | \`${top[0]}\` | ${top[1]} / ${t.engagedTotal} |`);
  }
  return rows.join('\n');
}

function renderOverallTable(t) {
  const rows = [];
  rows.push('| Overall recommendation | Count (ENGAGED) |');
  rows.push('|---|---:|');
  for (const v of OVERALL_OPTIONS) rows.push(`| \`${v}\` | ${t.overall[v]} |`);
  if (t.overall.other > 0) rows.push(`| \`(other / unrecognized)\` | ${t.overall.other} |`);
  return rows.join('\n');
}

function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `**Slot ${r.slot}** [${r.state}] — ${r.modelTag} — overall = \`${r.overall ?? '—'}\``;
    const lines = [head, ''];
    if (r.rationale) {
      lines.push(`> ${r.rationale.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    for (const q of QUESTIONS) {
      const a = r.perQuestion[q.id] || {};
      const refs = (a.section_refs || []).length ? ` _(refs: ${(a.section_refs || []).map((c) => `\`${c}\``).join(', ')})_` : '';
      lines.push(`- **${q.id}** = \`${a.verdict ?? '—'}\`${refs}`);
      if (a.findings) lines.push(`  > ${a.findings.replace(/\n/g, '\n  > ')}`);
      if (q.id === 'Q6' && Array.isArray(a.missing_items) && a.missing_items.length > 0) {
        lines.push(`  - Missing items:`);
        for (const mi of a.missing_items) lines.push(`    - ${mi}`);
      }
    }
    lines.push('');
    return lines.join('\n');
  }).join('\n---\n\n');
}

function renderRawResponses(reviewers) {
  const blocks = reviewers.map((r, idx) => {
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
  });
  return blocks.join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ssot-w04-rev1-review] started ${startedAt}\n`);

  if (!existsSync(DRAFT_PATH)) {
    throw new Error(`SSOT W04-Rev-1 DRAFT not found at ${DRAFT_PATH}`);
  }
  const draftText = await readFile(DRAFT_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(draftText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[ssot-w04-rev1-review] bundle: ${artifact.length} chars (CANONICAL_REFERENCE + DRAFT attached)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact,
    criteria: CRITERIA,
    panel: PANEL,
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
  const overallVerdict = computePerQuestionVerdict(t.overall, OVERALL_OPTIONS, t.engagedTotal);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# Panel Consultation — SSOT W04-Rev-1 Canonical Review (2026-05-14)`,
    ``,
    `**Lineage:** W04 dispatch (CEO-acting-as-W04) → W6 execution. DRAFT under review: \`docs/SSOT_W04_REV1_DRAFT.md\` (commit \`d68a1df\`).`,
    ``,
    `**Mode:** read-only canonical review. Six free-text questions + overall promotion recommendation. Panel write-authority per W6 brief.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + W04-Rev-1 DRAFT attached).`,
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
    `---`,
    ``,
    `## Per-question verdicts (ENGAGED-only tally)`,
    ``,
    renderPerQuestionTable(t),
    ``,
    `Per-question vote breakdown:`,
    ``,
    ...QUESTIONS.flatMap((q) => {
      const c = t.perQuestion[q.id];
      const lines = [`- **${q.id}** ${q.short}:`];
      for (const v of q.verdict_options) lines.push(`  - \`${v}\`: ${c[v]}`);
      if (c.other > 0) lines.push(`  - \`(other / unrecognized)\`: ${c.other}`);
      lines.push('');
      return lines;
    }),
    ``,
    `## Overall recommendation tally`,
    ``,
    renderOverallTable(t),
    ``,
    `**Overall Panel verdict:** \`${overallVerdict.verdict}\` — ${overallVerdict.detail}.`,
    ``,
    `Supermajority bar (W6 brief: 8/10) ${overallVerdict.verdict.startsWith('SUPERMAJORITY') ? 'MET' : 'NOT MET'}.`,
    `Quorum bar (W6 brief: 7/10) ${(overallVerdict.verdict.startsWith('SUPERMAJORITY') || overallVerdict.verdict.startsWith('QUORUM_PLURALITY')) ? 'MET' : 'NOT MET'}.`,
    ``,
    `Engagement: ENGAGED=${t.engagedTotal} · TANGENTIAL=${t.tangential} · SILENT=${t.silent} · EVASIVE=${t.evasive} (of ${PANEL.length} slots).`,
    ``,
    `---`,
    ``,
    `## Questions (verbatim)`,
    ``,
    '```',
    questionBody,
    '```',
    ``,
    `---`,
    ``,
    `## Per-reviewer answers`,
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
  process.stdout.write(`[ssot-w04-rev1-review] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ssot-w04-rev1-canonical-review.sidecar.v1',
    startedAt, finishedAt,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    overall_verdict: overallVerdict,
    perReviewer,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[ssot-w04-rev1-review] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ SSOT W04-Rev-1 CANONICAL REVIEW SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups applied: ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Overall verdict: ${overallVerdict.verdict}\n`);
  process.stdout.write(`Detail:          ${overallVerdict.detail}\n`);
  for (const q of QUESTIONS) {
    const v = computePerQuestionVerdict(t.perQuestion[q.id], q.verdict_options, t.engagedTotal);
    process.stdout.write(`  ${q.id}: ${v.verdict} — ${v.detail}\n`);
  }
  process.stdout.write('════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[ssot-w04-rev1-review] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
