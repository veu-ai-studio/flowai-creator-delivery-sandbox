// scripts/panel/run-ca7-ca8-consultation.mjs
//
// W6 Panel consultation — CA-7 + CA-8 combined SSOT amendment review.
// Per W05 dispatch 2026-05-15. W3 draft committed at ce96055
// (docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md).
//
// 5 multiple-choice questions, 4 options each (a/b/c/d).
// "INSUFFICIENT_INFORMATION" valid abstention per option (d).
//
// Bundle: full CANONICAL_REFERENCE.md (per W6 brief standing rule +
// Rev-2.1 §11/§19 Panel SSOT Access Rules) + full CA-7+CA-8 draft.

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

const DRAFT_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA7_CA8_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca7-ca8-consultation-2026-05-15.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca7-ca8-consultation-2026-05-15.sidecar.json');

const QUESTIONS = [
  {
    id: 'CA-7-Q1',
    topic: 'EXECUTOR_REGISTRY Q1 plurality (a) 6/7 — promote as-is or re-run?',
    a: 'Promote as-is — 6/7 plurality sufficient (single (b) dissent already absorbed as Mitigation M1; Q1 PROMOTE-family is effectively 7/7 once (a)+(b) collapse onto canonical+amendment)',
    b: 'Re-run Q1 only before promoting (target supermajority strictly on Q1; CA-7-Q2/Q3 + CA-8 unaffected)',
    c: 'Require full re-Panel on CA-7 (re-run ALL three Run-2 questions for tightened consensus)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-7-Q2',
    topic: 'M3 (executor mode + authority constraints, validator-enforced) — canonicalize as drafted, or narrow?',
    a: 'Canonicalize as drafted (mode=\'cross-step\' enforced + auto_write_internal⇒requires_human_gate paired + OrchestratorHub.invokeStepOwner() reject-executor guard, all compile-time validator-enforced)',
    b: 'Narrow — mode constraint only, defer authority pairing (validator rejects step-owner mode; defer the auto_write_internal⇒requires_human_gate pairing to a future CA)',
    c: 'Narrow — authority constraint only, defer mode (validator enforces the authority pairing; mode rules stay convention-only, no validator gate)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-7-Q3',
    topic: 'Five Panel-ratified mitigations (M1–M5) — promote together, sequenced, or split?',
    a: 'Promote all 5 together in one CA cycle (M1 cross-link + M2 audit-log executorKey + M3 validator constraints + M4 §15.5 docs/admin + M5 drift detection all ratified in this CA)',
    b: 'M1+M2+M4 now; M3+M5 next cycle (high-support mitigations + documentation now; validator-hardening (M3) + nightly drift cron (M5) deferred to the next CA)',
    c: 'Each mitigation as separate CA-n (5 individual CA-n entries, each independently disposed)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-8-Q1',
    topic: 'Locked Rule 1 (code wins) for path-style vs suffix-style Doppler key naming — correct reconciliation?',
    a: 'Yes — suffix-style (shipped W5c form: TEST_BYPASS_PRIVATE_KEY_DEV / _PROD) is canonical (per Locked Rule 1: code > canonical > memory)',
    b: 'No — revert to path-style (TEST_BYPASS_TOKEN_PRIVATE_KEY single-name + Doppler config path distinguishes env); modify shipped code to match the original spec',
    c: 'Introduce both as aliases (shipped suffix-style names + path-style aliases both readable by the verifier; either can be the issuer-side write target)',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-8-Q2',
    topic: 'Retroactive amendment of test plan §9.1 to match shipped suffix-style naming',
    a: 'Yes — retroactive amendment is correct (strike §9.1 path-style text, replace with pointer to new SSOT §20.2 + canonical env-suffix names)',
    b: 'No — leave §9.1 as historical record (preserve original spec wording; §20.2 alone becomes canonical and §9.1 reads as the pre-canonical proposal)',
    c: 'Add a footnote only, no amendment (§9.1 text unchanged; insert a footnote pointing to §20.2 for the shipped-canonical form)',
    d: 'INSUFFICIENT_INFORMATION',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)'];
const INSUFF = 'INSUFFICIENT_INFORMATION';
const ALL_PICKS = [...VALID_OPTIONS, INSUFF];

function buildQuestionBody(draftText) {
  const lines = [];
  lines.push('═══════════════ CA-7 + CA-8 SSOT AMENDMENT PANEL REVIEW (2026-05-15) ═══════════════');
  lines.push('');
  lines.push('Lineage: W05 dispatch → W6 execution. W3 amendment draft committed at');
  lines.push('`ce96055` (`docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md`). Combined CA-n:');
  lines.push('  CA-7 amends Rev-2.1 §15 (EXECUTOR_REGISTRY sibling namespace) + ripple §14.');
  lines.push('  CA-8 amends Rev-2.1 §20 (X-Test-Bypass-Token contract) + ripple test plan §9.1.');
  lines.push('');
  lines.push('Threshold per §18.2: ≥7/10 ENGAGED supermajority required per question for clean');
  lines.push('promotion; PLURALITY surfaces as CEO disposition; sub-quorum = re-Panel.');
  lines.push('');
  lines.push('═══════════════ W3 DRAFT (verbatim, under review) ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END W3 DRAFT ═══════════════');
  lines.push('');
  lines.push('═══════════════ FIVE MULTIPLE-CHOICE QUESTIONS ═══════════════');
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
  lines.push('The literal string "INSUFFICIENT_INFORMATION" is also a valid per-question');
  lines.push('response equivalent to option (d). Use only when the W3 draft + canonical SSOT');
  lines.push('jointly do not give enough basis to pick.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 5 multiple-choice questions on the
combined CA-7 + CA-8 SSOT amendment draft (verbatim attached above,
inside the CONSULTATION CONTEXT block). The full FlowAI
CANONICAL_REFERENCE.md (Rev-2.1 canonical, commit \`9495b26\`) is ALSO
attached at the top of the bundle.

For EACH question CA-7-Q1, CA-7-Q2, CA-7-Q3, CA-8-Q1, CA-8-Q2:
  - Pick exactly one of (a) / (b) / (c) — OR option (d)
    \`INSUFFICIENT_INFORMATION\`. The string literal
    "INSUFFICIENT_INFORMATION" is also accepted for option (d).
  - Provide a 2-3 sentence rationale citing AT LEAST one specific
    item: a §-number from the W3 draft, a §-number from
    CANONICAL_REFERENCE.md, a Locked Rule, an identifier from the
    EXECUTOR_REGISTRY contract (\`getExecutor\`, \`validateExecutors\`,
    \`AgentRecord.executors[]\`), a mitigation key (M1..M5), or a
    specific commit hash from the draft's Provenance table.
  - If your pick conflicts with the canonical SSOT, flag it in
    "conflicts_with_ssot".

Engagement self-classification:
  ENGAGED   — All 5 picks present AND each rationale cites at least
              one specific item from the draft or SSOT.
  TANGENTIAL — Some picks missing OR rationales lack specific citations.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "CA-7-Q1": { "pick": "(a)" | "(b)" | "(c)" | "(d)" | "INSUFFICIENT_INFORMATION", "rationale": "<2-3 sentences>" },
    "CA-7-Q2": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-7-Q3": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-8-Q1": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-8-Q2": { "pick": "<one of>", "rationale": "<2-3 sentences>" }
  },
  "conflicts_with_ssot": ["<Q-id + 1-line description>", ...],
  "overall_notes": "<optional 1-2 sentences; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|EXECUTOR_REGISTRY|AGENT_REGISTRY|getExecutor|getAgent|validateExecutors|validateRoster|BaseAgent|Locked Rule|Sprint\s*[A-Z0-9-]+|Agent\s*#?\s*\d+|AUTO_WRITE_INTERNAL|REQUIRES_HUMAN_GATE|RECOMMEND_ONLY|auto_write_internal|requires_human_gate|recommend_only|cross-step|step-owner|always-on|GovernanceAuditLog|OrchestratorHub|Orchestra|CA-?\d+|Rev-?2(\.1)?|M\s?[1-5]|176d870|9495b26|ce96055|0bd26b9|8eaf44c|446ddb5|CANONICAL_REFERENCE|TEST_BYPASS|Doppler|RS256|HS256|X-Test-Bypass-Token|executorKey|drift detection|nightly|invokeStepOwner|self-renewal-executor/i;

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
  if (m[1] === 'd') return INSUFF; // option (d) is INSUFF in this consultation
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
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 60)}… | ${c['(a)']} | ${c['(b)']} | ${c['(c)']} | ${c[INSUFF]} | ${c.other} | \`${v.topOption || '—'}\` | \`${v.verdict}\` |`);
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
  process.stdout.write(`[ca7-ca8-consultation] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[ca7-ca8-consultation] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(
      `Panel composition not the rebalanced 10-unique-provider roster — ` +
      `maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting.`,
    );
  }

  if (!existsSync(DRAFT_PATH)) throw new Error(`W3 draft not found at ${DRAFT_PATH}`);
  const draftText = await readFile(DRAFT_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(draftText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[ca7-ca8-consultation] bundle: ${artifact.length} chars (full CANONICAL_REFERENCE + W3 CA-7+CA-8 draft attached)\n`);

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
    `# Panel Consultation — CA-7 + CA-8 Combined SSOT Amendment Review (2026-05-15)`,
    ``,
    `**Lineage:** W05 dispatch → W6 execution. Combined CA-n review of W3 draft \`docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md\` (commit \`ce96055\`). Canonical anchor: Rev-2.1 \`docs/CANONICAL_REFERENCE.md\` (\`9495b26\`).`,
    ``,
    `**Mode:** read-only Panel consultation. 5 multiple-choice questions, 4 options each (option (d) = \`INSUFFICIENT_INFORMATION\`).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + W3 CA-7+CA-8 draft attached per Rev-2.1 §11 / §19 Panel SSOT Access Rules).`,
    `**Panel composition audit:** ${JSON.stringify(audit)} — strict 10-unique-provider roster per slot-config.mjs rev-2 (\`9bafecf\`).`,
    ``,
    `**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10 · Unanimous = all-ENGAGED on one option.`,
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
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (>=7 LIVE-OK): ${result.w6_metadata.quorum_met}. Supermajority achievable (>=8 LIVE-OK): ${result.w6_metadata.supermajority_achievable}.`,
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
  process.stdout.write(`[ca7-ca8-consultation] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ca7-ca8-consultation.sidecar.v1',
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
  process.stdout.write(`[ca7-ca8-consultation] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ CA-7 + CA-8 CONSULTATION SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups fired:   ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length} (TANGENTIAL=${t.tangential}, SILENT=${t.silent}, EVASIVE=${t.evasive})\n`);
  process.stdout.write(`INSUFF total:    ${t.totalInsuff}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write(`SSOT conflicts flagged: ${allConflicts.length}\n`);
  process.stdout.write('══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[ca7-ca8-consultation] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
