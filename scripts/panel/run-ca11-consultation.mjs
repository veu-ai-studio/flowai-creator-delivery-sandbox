// scripts/panel/run-ca11-consultation.mjs
//
// W6 Panel consultation — CA-11 Agent Self-Orchestration + Per-Agent
// Tool Intelligence. Per W05 dispatch 2026-05-16. Spec:
// docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md (commit 1a020f7).
// 7 multiple-choice questions, 4 options each (option (d) = INSUFF).

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

const DRAFT_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA11_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca11-consultation-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca11-consultation-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'CA-11-Q1', topic: 'ToolMenu validator threshold (per-agent minimum entries)',
    a: '≥3 entries per agent (as drafted)',
    b: '≥5 entries per agent (stricter floor)',
    c: 'Flexible — step-owner ≥3, others ≥1',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q2', topic: 'Tool selection timing',
    a: 'Pre-step ranking (as drafted) — ToolMenu ranking computed before step starts',
    b: 'Real-time adaptive per call — re-rank at each tool invocation based on live signals',
    c: 'Hybrid — pre-step default ranking, adaptive override permitted on cost/health changes mid-step',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q3', topic: 'Cross-step agent tool scope',
    a: 'Flat ToolMenu (as drafted) — single ranked list applies to all cross-step invocations',
    b: 'stepKey-conditional menus — different ranked list per pipeline step the agent enters',
    c: 'Hybrid opt-in — flat by default, agent can declare step-conditional menus when needed',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q4', topic: 'Industry tool list canonicalization cadence',
    a: 'Quarterly automated via Agent #26 + #11 + #15 (as drafted)',
    b: 'Frozen at promotion time — list ratified now, changes require explicit CA-n',
    c: 'Panel-reviewed every change — each tool addition/removal goes through W6 Panel',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q5', topic: 'CEO constraint granularity',
    a: 'Per-agent only (as drafted) — CEO sets cost/budget/policy at the agent level',
    b: 'Per-step only — constraints attach to the pipeline step, not the agent',
    c: 'Per-product only — constraints attach to the product tenant, not the agent/step',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q6', topic: 'Fallback failure handling (all tools in agent\'s ToolMenu fail)',
    a: 'Medium-finding + continue (as drafted) — log medium severity, run continues with degraded output',
    b: 'Human-gate + halt — pause run for human Approve/Modify/Skip',
    c: 'Critical-halt immediately — escalate to critical, halt the run',
    d: 'INSUFFICIENT_INFORMATION',
  },
  {
    id: 'CA-11-Q7', topic: 'Combined CA-11 disposition (sub-amendments A + B + C + D + E)',
    a: 'Promote all 5 sub-amendments together',
    b: 'Promote A + C + D only (defer B + E)',
    c: 'Promote A only (defer B + C + D + E)',
    d: 'INSUFFICIENT_INFORMATION',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)'];
const INSUFF = 'INSUFFICIENT_INFORMATION';

function buildQuestionBody(draftText) {
  const lines = [];
  lines.push('═══════════════ CA-11 — AGENT SELF-ORCHESTRATION + PER-AGENT TOOL INTELLIGENCE — PANEL REVIEW (2026-05-16) ═══════════════');
  lines.push('');
  lines.push('Lineage: W05 dispatch → W6 execution. Spec under review:');
  lines.push('  `docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md` (commit `1a020f7`).');
  lines.push('CA-11 introduces per-agent ToolMenu, ≥3 industry tools per agent, pre-step');
  lines.push('ranking, cross-step tool scope, quarterly canonicalization via Agent #26+#11+#15,');
  lines.push('CEO constraints, and fallback failure handling.');
  lines.push('');
  lines.push('Threshold per §18.2: ≥7/10 ENGAGED supermajority required per question for clean');
  lines.push('promotion; PLURALITY surfaces as CEO disposition; sub-quorum = re-Panel.');
  lines.push('');
  lines.push('═══════════════ W3 CA-11 DRAFT (verbatim, under review) ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END W3 DRAFT ═══════════════');
  lines.push('');
  lines.push('═══════════════ SEVEN MULTIPLE-CHOICE QUESTIONS ═══════════════');
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
  lines.push('Standard 4-option + INSUFFICIENT_INFORMATION frame. Option (d) is the literal');
  lines.push('abstention; the literal string "INSUFFICIENT_INFORMATION" is also accepted.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 7 multiple-choice questions on the
CA-11 SSOT amendment draft (verbatim attached above, inside the
CONSULTATION CONTEXT block). The full FlowAI CANONICAL_REFERENCE.md
(Rev-2.1 canonical, commit \`9495b26\`) is ALSO attached at the top of
the bundle.

For EACH question CA-11-Q1 through CA-11-Q7:
  - Pick exactly one of (a) / (b) / (c) — OR option (d)
    \`INSUFFICIENT_INFORMATION\`. The string literal
    "INSUFFICIENT_INFORMATION" is also accepted for option (d).
  - Provide 2-3 sentence rationale citing AT LEAST one specific item:
    a CA-11 sub-amendment id (CA-11-A through CA-11-E), an SSOT
    §-number, a Locked Rule, an agent id (Agent #N, especially #26
    + #11 + #15 referenced in CA-11-Q4), a topic name, or the commit
    hash \`1a020f7\`.
  - Flag any conflict with canonical SSOT in "conflicts_with_ssot".

Engagement self-classification:
  ENGAGED   — All 7 picks present AND each rationale cites at least
              one specific item.
  TANGENTIAL — Some picks missing OR rationales lack specific citations.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "CA-11-Q1": { "pick": "(a)" | "(b)" | "(c)" | "(d)" | "INSUFFICIENT_INFORMATION", "rationale": "<2-3 sentences>" },
    "CA-11-Q2": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-11-Q3": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-11-Q4": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-11-Q5": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-11-Q6": { "pick": "<one of>", "rationale": "<2-3 sentences>" },
    "CA-11-Q7": { "pick": "<one of>", "rationale": "<2-3 sentences>" }
  },
  "conflicts_with_ssot": ["<Q-id + 1-line description>", ...],
  "overall_notes": "<optional 1-2 sentences; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
MUST be '{', last MUST be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /CA-11-?[A-Z]|CA-?\d+-?Q\d+|§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|ToolMenu|step-owner|cross-step|always-on|Agent\s*#?\s*\d+|Ops Runner|Conductor|industry tool|fallback|pre-step|adaptive|stepKey|conditional|quarterly|automated|frozen|panel.reviewed|constraint|granularity|medium|critical|human.gate|halt|recommend_only|auto_write_internal|requires_human_gate|GovernanceAuditLog|MessageBus|MessageSchema|Locked Rule|Rev-?2(\.1)?|1a020f7|9495b26|176d870|ce96055|5b30dce|f7f96b1|5c06893|CANONICAL_REFERENCE|EXECUTOR_REGISTRY|ProductSSOT|Orchestra|Tool Intelligence|self-orchestrat/i;

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
  if (m[1] === 'd') return INSUFF;
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
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 70)} | ${c['(a)']} | ${c['(b)']} | ${c['(c)']} | ${c[INSUFF]} | ${c.other} | \`${v.topOption || '—'}\` | \`${v.verdict}\` |`);
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
  process.stdout.write(`[ca11-consultation] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[ca11-consultation] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(`Panel composition not the rebalanced 10-unique-provider roster — maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting.`);
  }

  if (!existsSync(DRAFT_PATH)) throw new Error(`CA-11 draft not found at ${DRAFT_PATH}`);
  const draftText = await readFile(DRAFT_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(draftText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[ca11-consultation] bundle: ${artifact.length} chars (full CANONICAL_REFERENCE + CA-11 draft)\n`);

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
    `# Panel Consultation — CA-11 Agent Self-Orchestration + Per-Agent Tool Intelligence (2026-05-16)`,
    ``,
    `**Lineage:** W05 dispatch → W6 execution. Review of W3 draft \`docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md\` (commit \`1a020f7\`). Canonical anchor: Rev-2.1 \`docs/CANONICAL_REFERENCE.md\` (\`9495b26\`).`,
    ``,
    `**Mode:** read-only Panel consultation. 7 multi-choice questions, 4 options each (option (d) = INSUFFICIENT_INFORMATION).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + CA-11 draft attached).`,
    `**Panel composition audit:** ${JSON.stringify(audit)} — strict 10-unique-provider roster.`,
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
  process.stdout.write(`[ca11-consultation] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ca11-consultation.sidecar.v1',
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
  process.stdout.write(`[ca11-consultation] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ CA-11 CONSULTATION SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups fired:   ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length} (TANGENTIAL=${t.tangential}, SILENT=${t.silent}, EVASIVE=${t.evasive})\n`);
  process.stdout.write(`INSUFF total:    ${t.totalInsuff}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write(`SSOT conflicts flagged: ${allConflicts.length}\n`);
  process.stdout.write('══════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[ca11-consultation] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
