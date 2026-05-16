// scripts/panel/run-aggressive-crawl-engine-consultation.mjs
//
// W6 Panel consultation — Aggressive Crawl Engine spec review.
// Per W05 dispatch 2026-05-16 (12:52 AM ET).
// Spec: docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md (commit 5b30dce).
// 8 multiple-choice questions, 4 options each (option (d) = INSUFF).

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

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'AGGRESSIVE_CRAWL_ENGINE_SPEC.md');
const PARKING_LOT_PATH = path.join(repoRoot, 'docs', 'SSOT_PARKING_LOT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'aggressive-crawl-engine-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'aggressive-crawl-engine-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'ACE-Q1', topic: 'Depth + page caps',
    a: 'depth=8 default / cap 12, pages=200 / cap 2000 (as drafted)',
    b: 'Lower — depth=5 / pages=100 (safer, lower-cost; risk of missing deeper SPAs)',
    c: 'Higher — depth=12 / pages=500 (more thorough; higher cost per run)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q2', topic: 'Agent ownership',
    a: 'Agent #21 Ops Runner Alpha as Aggressive Crawl Conductor (W3 recommended)',
    b: 'Expand Agent #6 Research instead (keep Ops Runner reserved; widen research charter)',
    c: 'New dedicated executor (mirror CA-7 EXECUTOR_REGISTRY pattern; e.g. CrawlConductorExecutor)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q3', topic: 'AI-agent probe safety',
    a: 'Benign "Reply ACK" probe as drafted (catalog + light interaction)',
    b: 'No AI-agent probing — catalog only (do not send any prompt to discovered agents)',
    c: 'Probe but require human gate per product (every probe needs explicit per-product approval)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q4', topic: 'Parallelization scope',
    a: '5 concurrent pages, 1 product at a time (as drafted)',
    b: 'Higher — 10 concurrent pages (faster; higher provider load + Browserless cost)',
    c: 'Lower — 3 concurrent (safest; lowest provider load; slower runs)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q5', topic: 'Fix-loop autonomy on medium severity',
    a: 'Auto fork-and-fix medium (as drafted; aligns with CA-7 §12 severity routing)',
    b: 'Human-gate everything above low (medium also needs human Approve/Modify/Skip)',
    c: 'Auto-fix low only (medium becomes recommend-only; mirrors current Agent #3 caution)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q6', topic: 'Error-state trigger default',
    a: 'Trigger all (404 / 500 / offline / slow / XSS) as drafted',
    b: 'Read-only — no deliberate error triggers (purely observational crawl)',
    c: 'Trigger non-destructive only (404 / offline / slow / XSS attempt explicitly OFF)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q7', topic: 'GTM readiness score formula',
    a: '10/5/2/0.5 deductions per critical/high/medium/low (as drafted)',
    b: 'Stricter — any critical = auto 0 (zero-tolerance gate)',
    c: 'Simpler — pass/fail per surface type (no numeric scoring; binary per page)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'ACE-Q8', topic: 'Cost ceiling per run',
    a: '$15 / run / product / env (3× nominal, as drafted)',
    b: 'Lower — $8 / run (conservative; may cap thoroughness on large products)',
    c: 'Higher — $25 / run for thoroughness (more headroom; higher per-run cost)',
    d: 'INSUFFICIENT_INFORMATION',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)'];
const INSUFF = 'INSUFFICIENT_INFORMATION';

function extractEntry002(parkingLotText) {
  const start = parkingLotText.indexOf('### ENTRY 002');
  if (start === -1) return '(ENTRY 002 not found)';
  const next = parkingLotText.indexOf('### ENTRY 003', start);
  return parkingLotText.slice(start, next === -1 ? undefined : next).trim();
}

function buildQuestionBody(specText, entry002Text) {
  const lines = [];
  lines.push('═══════════════ AGGRESSIVE CRAWL ENGINE — PANEL REVIEW (2026-05-16) ═══════════════');
  lines.push('');
  lines.push('Lineage: W05 dispatch → W6 execution. Spec under review:');
  lines.push('  `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` (commit `5b30dce`).');
  lines.push('Source motivation: FlowAI dogfooded its current crawler and scored 11/50');
  lines.push('(static fetch returns null body on a React SPA). Aggressive Crawl Engine');
  lines.push('is the GTM-readiness bar per Parking Lot ENTRY 002.');
  lines.push('');
  lines.push('═══════════════ PARKING LOT ENTRY 002 (verbatim) ═══════════════');
  lines.push('');
  lines.push(entry002Text);
  lines.push('');
  lines.push('═══════════════ AGGRESSIVE CRAWL ENGINE SPEC (verbatim) ═══════════════');
  lines.push('');
  lines.push(specText.trim());
  lines.push('');
  lines.push('═══════════════ END SPEC ═══════════════');
  lines.push('');
  lines.push('═══════════════ EIGHT MULTIPLE-CHOICE QUESTIONS ═══════════════');
  lines.push('');
  for (const q of QUESTIONS) {
    lines.push(`### ${q.id} — ${q.topic}`);
    lines.push('');
    lines.push(`(a) ${q.a}`);
    lines.push(`(b) ${q.b}`);
    lines.push(`(c) ${q.c}`);
    lines.push(`(d) ${q.d}`);
    lines.push('');
  }
  lines.push('Standard 4-option + INSUFFICIENT_INFORMATION frame. Option (d) is the');
  lines.push('literal abstention.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 8 multiple-choice questions on the
Aggressive Crawl Engine spec (verbatim attached above, inside the
CONSULTATION CONTEXT block). The full FlowAI CANONICAL_REFERENCE.md
(Rev-2.1 canonical, commit \`9495b26\`) is ALSO attached at the top of
the bundle, plus SSOT Parking Lot ENTRY 002 verbatim.

For EACH question ACE-Q1 through ACE-Q8:
  - Pick exactly one of (a) / (b) / (c) — OR option (d)
    \`INSUFFICIENT_INFORMATION\`. The string literal
    "INSUFFICIENT_INFORMATION" is also accepted for option (d).
  - Provide 2-3 sentence rationale citing AT LEAST one specific item
    from the spec (a §-letter like §B, a depth/page cap value, an
    agent number, an error state class, a cost figure), the SSOT
    (a §-number, a Locked Rule, a CA-N), or Parking Lot ENTRY 002.
  - Flag any conflict with canonical SSOT in "conflicts_with_ssot".

Engagement self-classification:
  ENGAGED   — All 8 picks present AND each rationale cites at least
              one specific item from the spec or SSOT.
  TANGENTIAL — Some picks missing OR rationales lack specific citations.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "ACE-Q1": { "pick": "(a)" | "(b)" | "(c)" | "(d)" | "INSUFFICIENT_INFORMATION", "rationale": "<2-3 sentences>" },
    "ACE-Q2": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q3": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q4": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q5": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q6": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q7": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "ACE-Q8": { "pick": "<one of>", "rationale": "<2-3 sentences>" }
  },
  "conflicts_with_ssot": ["<Q-id + 1-line description>", ...],
  "overall_notes": "<optional 1-2 sentences; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /§\s*[A-Z]|§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|ENTRY\s*\d+|depth=?\d+|pages?=?\d+|Agent\s*#?\s*\d+|Ops Runner|Alpha|Conductor|Browserless|Playwright|fork-and-fix|recommend_only|auto_write_internal|requires_human_gate|GovernanceAuditLog|MessageBus|MessageSchema|SPA|XSS|404|500|offline|slow|critical|high|medium|low|Locked Rule|Rev-?2(\.1)?|CA-?\d+|5b30dce|9495b26|176d870|ce96055|CANONICAL_REFERENCE|GTM|readiness|score|cost|ceiling|concurrent|EXECUTOR_REGISTRY|ProductSSOT/i;

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
  if (m[1] === 'd') return INSUFF; // option (d) = INSUFF
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
    if (pick && ([...VALID_OPTIONS, INSUFF].includes(pick))) validPicks += 1;
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
    const counts = { '(a)': 0, '(b)': 0, '(c)': 0, [INSUFF]: 0, other: 0 };
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
  const sorted = VALID_OPTIONS.map((o) => [o, counts[o] || 0]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top[1] === engagedTotal && (counts[INSUFF] || 0) === 0) {
    return { verdict: `UNANIMOUS_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (unanimous)`, topOption: top[0], topCount: top[1] };
  }
  if (top[1] >= 8) return { verdict: `SUPERMAJORITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ 8/10)`, topOption: top[0], topCount: top[1] };
  if (top[1] >= 7) return { verdict: `QUORUM_PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (≥ 7/10 quorum, < 8/10 supermajority)`, topOption: top[0], topCount: top[1] };
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}`, topOption: tied[0], topCount: sorted[0][1] };
  }
  if (top[1] === 0) return { verdict: 'NO_QUORUM', detail: `0 ENGAGED votes on (a)/(b)/(c); INSUFF=${counts[INSUFF] || 0}`, topOption: null, topCount: 0 };
  return { verdict: `PLURALITY_${top[0]}`, detail: `${top[1]} of ${engagedTotal} ENGAGED on ${top[0]} (below 7/10 quorum)`, topOption: top[0], topCount: top[1] };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | (a) | (b) | (c) | (d) INSUFF | other | Top | Verdict |`);
  rows.push(`|---|---|---:|---:|---:|---:|---:|---|---|`);
  for (const q of QUESTIONS) {
    const c = t.perQuestion[q.id];
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic} | ${c['(a)']} | ${c['(b)']} | ${c['(c)']} | ${c[INSUFF]} | ${c.other} | \`${v.topOption || '—'}\` | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderQuestionDetail(perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    return [
      `### ${q.id} — ${q.topic}`,
      ``,
      `- (a) ${q.a}`,
      `- (b) ${q.b}`,
      `- (c) ${q.c}`,
      `- (d) ${q.d}`,
      ``,
      `**Verdict:** \`${v.verdict}\` — ${v.detail}.`,
      ``,
    ].join('\n');
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
  process.stdout.write(`[aggressive-crawl-engine] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[aggressive-crawl-engine] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(`Panel composition not the rebalanced 10-unique-provider roster — maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting.`);
  }

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  if (!existsSync(PARKING_LOT_PATH)) throw new Error(`Parking lot not found at ${PARKING_LOT_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const parkingLotText = await readFile(PARKING_LOT_PATH, 'utf8');
  const entry002 = extractEntry002(parkingLotText);
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(specText, entry002);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[aggressive-crawl-engine] bundle: ${artifact.length} chars (full CANONICAL_REFERENCE + ENTRY 002 + spec)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact, criteria: CRITERIA, panel: PANEL,
    perReviewerTimeoutMs: 150_000,
    backupRetryTimeoutMs: 180_000,
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

  const high = QUESTIONS.filter((q) => /^(UNANIMOUS|SUPERMAJORITY)/.test(perVerdicts[q.id].verdict));
  const low = QUESTIONS.filter((q) => !/^(UNANIMOUS|SUPERMAJORITY)/.test(perVerdicts[q.id].verdict));

  const allConflicts = perReviewer.flatMap((r) => (r.conflicts || []).map((c) => ({ slot: r.slot, conflict: c })));

  const backupFires = result.reviewers
    .map((r, idx) => ({
      slot: idx + 1, fired: !!r.slot_backup_applied,
      primary_provider: r.primary_slot_provider, primary: r.primary_slot_model,
      replacement_provider: r.provider, replacement: r.model,
      primary_error: r.primary_slot_error,
    }))
    .filter((b) => b.fired);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# Panel Consultation — Aggressive Crawl Engine Spec Review (2026-05-16)`,
    ``,
    `**Lineage:** W05 dispatch → W6 execution. Review of \`docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md\` (commit \`5b30dce\`). Motivation: FlowAI self-assessment scored 11/50 on its own dogfooding because the static-fetch crawler returns null body on React SPA targets (Parking Lot ENTRY 002).`,
    ``,
    `**Mode:** read-only Panel consultation. 8 multi-choice questions (4 options each + INSUFF=(d)).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + Parking Lot ENTRY 002 + full spec attached).`,
    `**Panel composition audit:** ${JSON.stringify(audit)} — strict 10-unique-provider roster per slot-config.mjs rev-2.`,
    ``,
    `**W6 thresholds:** Quorum = 7/10 · Supermajority = 8/10 · Unanimous = all-ENGAGED on one option.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
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
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (≥7 LIVE-OK): ${result.w6_metadata.quorum_met}. Supermajority achievable (≥8 LIVE-OK): ${result.w6_metadata.supermajority_achievable}.`,
    ``,
    `Engagement: **ENGAGED=${t.engagedTotal}** · TANGENTIAL=${t.tangential} · SILENT=${t.silent} · EVASIVE=${t.evasive} (of ${PANEL.length} slots). \`INSUFFICIENT_INFORMATION\` responses: **${t.totalInsuff}**.`,
    ``,
    `---`,
    ``,
    `## Tally + verdicts (ENGAGED-only)`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## Highest-conviction (UNANIMOUS / SUPERMAJORITY)`,
    ``,
    high.length === 0 ? '_(none cleared supermajority)_' : high.map((q) => {
      const v = perVerdicts[q.id];
      const winText = v.topOption ? (v.topOption === '(a)' ? q.a : v.topOption === '(b)' ? q.b : q.c) : '';
      return `- **${q.id}** — \`${v.verdict}\` · winning option \`${v.topOption}\`: ${winText}`;
    }).join('\n'),
    ``,
    `## Lower-conviction (SPLIT / PLURALITY / NO_QUORUM)`,
    ``,
    low.length === 0 ? '_(none — every question cleared supermajority)_' : low.map((q) => {
      const v = perVerdicts[q.id];
      return `- **${q.id}** — \`${v.verdict}\` — ${v.detail}`;
    }).join('\n'),
    ``,
    `---`,
    ``,
    `## Per-question detail`,
    ``,
    renderQuestionDetail(perVerdicts),
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
  process.stdout.write(`[aggressive-crawl-engine] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'aggressive-crawl-engine.sidecar.v1',
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
  process.stdout.write(`[aggressive-crawl-engine] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ AGGRESSIVE CRAWL ENGINE CONSULTATION SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups fired:   ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length} (TANGENTIAL=${t.tangential}, SILENT=${t.silent}, EVASIVE=${t.evasive})\n`);
  process.stdout.write(`INSUFF total:    ${t.totalInsuff}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write(`SSOT conflicts flagged: ${allConflicts.length}\n`);
  process.stdout.write('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[aggressive-crawl-engine] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
