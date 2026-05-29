// scripts/panel/run-executor-registry-ratification.mjs
//
// W6 Panel consultation — EXECUTOR_REGISTRY pattern ratification.
// Per W04 dispatch 2026-05-14, Panel must ratify (or amend / reject /
// defer) the EXECUTOR_REGISTRY sibling-namespace pattern introduced by
// W5a in commit 176d870 (Agent #3 graduation, Phase 1.3).
//
// Three multiple-choice questions, 4 options each (a/b/c/d). The literal
// string "INSUFFICIENT_INFORMATION" is also valid per-question.
//
// Bundle: full CANONICAL_REFERENCE.md (per Rev-2.1 §11 Panel SSOT Access
// Rules) + EXECUTOR_REGISTRY excerpt + Agent3SelfRenewalExecutor header
// + W5a commit summary. Bundle deliberately kept lean to avoid the
// 32K-context-limit blow-up that hit Slot 9 on the 93K bundle in the
// adversarial-test consultation earlier today.

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

const REGISTRY_PATH = path.join(repoRoot, 'src', 'lib', 'agents', '_registry.ts');
const EXECUTOR_PATH = path.join(repoRoot, 'src', 'lib', 'agents', 'agents', 'Agent3SelfRenewalExecutor.js');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'executor-registry-pattern-ratification-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'executor-registry-pattern-ratification-2026-05-14.sidecar.json');

const QUESTIONS = [
  {
    id: 'Q1', topic: 'Ratify EXECUTOR_REGISTRY as canonical pattern for future split-charter agents',
    a: 'Ratify as canonical (sibling namespace + own validator + getExecutor lookup is the FlowAI pattern for elevated-authority executors)',
    b: 'Ratify with amendment (specify amendment — e.g., require explicit registration ceremony, cross-link to AGENT_REGISTRY, etc.)',
    c: 'Reject — propose alternative pattern (e.g., authority-tier promotion within AGENT_REGISTRY, or a single unified registry with authority partitioning)',
    d: 'Defer until 2nd split-charter agent emerges (single-data-point ratification is premature; revisit when Agent #N second executor is needed)',
  },
  {
    id: 'Q2', topic: 'SSOT Rev-2.1 amendment to formally document EXECUTOR_REGISTRY in §15',
    a: 'Yes — propose CA-N amendment in same cycle (document the dual-registry pattern in §15 before further executors land)',
    b: 'Yes but defer to CA-N+1 cycle (commit pattern now; document in next amendment window so it lands canonically with its first user but doesn\'t block this dispatch)',
    c: 'No — pattern is implementation detail, not SSOT-worthy (registry-level mechanics belong in `_registry.ts`; SSOT documents agents, not registry structure)',
    d: 'No — keep EXECUTOR_REGISTRY out of SSOT for plausible-deniability optionality (so the pattern can be revised without an SSOT amendment cycle)',
  },
  {
    id: 'Q3', topic: 'Architectural risks with the dual-registry pattern',
    a: 'No identified risks — proceed (the namespace separation is clean; validators are independent; partition invariant preserved)',
    b: 'Yes — risks identified; specify mitigations (drift / surface confusion / audit-trail bifurcation are plausible; propose specific safeguards)',
    c: 'Yes — risks identified; halt further executor additions until mitigated (do not add a 2nd executor before the risks are addressed)',
    d: 'Insufficient information (need additional artifacts beyond what was attached to judge)',
  },
];

const VALID_OPTIONS = ['(a)', '(b)', '(c)', '(d)'];
const INSUFF = 'INSUFFICIENT_INFORMATION';

function extractRegistrySlice(registryText) {
  // Pull the EXECUTOR_REGISTRY section. It begins at the comment header
  // "Executor registry (Phase 1.3 — Agent #3 graduation" and ends at the
  // end of the validateExecutors IIFE.
  const startMarker = '// ── Executor registry (Phase 1.3';
  const endMarker = '})();';
  const start = registryText.indexOf(startMarker);
  if (start === -1) return registryText; // fall back to full file
  const tailStart = registryText.indexOf(endMarker, start);
  const end = tailStart === -1 ? registryText.length : tailStart + endMarker.length;
  return registryText.slice(start, end);
}

function extractExecutorHeader(executorText) {
  // First ~120 lines is enough — comment header + imports + constants +
  // class opener + `static charter()` opening. Avoids the 660-line bulk.
  const lines = executorText.split(/\r?\n/);
  const headerEnd = lines.findIndex((l) => l.startsWith('  static charter()'));
  const cut = headerEnd === -1 ? Math.min(120, lines.length) : headerEnd + 6;
  return lines.slice(0, cut).join('\n');
}

const W5A_COMMIT_SUMMARY = `
W5a: Agent #3 graduation — SelfRenewalExecutor split, fork-and-fix +
recommend-only active, 3-tier severity, sync+async surfaces, sampled
verification [Phase 1.3]

Commit: 176d870
Files changed (8): api/_lib/inngest.js (new), api/agent/3/execute.js
(new), src/lib/agents/_registry.ts (+127 lines, EXECUTOR_REGISTRY block
added), src/lib/agents/agents/Agent3SelfRenewalExecutor.js (new, 660
lines), src/lib/agents/severity.js (new), src/lib/agents/verification.js
(new), src/pages/AutoRunner.jsx (modified), tests/agents/agent-3-self-
renewal-executor.test.js (new, 598 lines).

Design rationale: BaseAgent.js enforces a 25-agent partition with
single-authority-per-charter. Agent #3 needs to operate in two modes:
the canonical recommend-only step-owner at step 6 (unchanged) AND an
elevated [AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE] executor invoked
out-of-band by /api/agent/3/execute + an Inngest async job. The
executor cannot live in AGENT_REGISTRY (would either duplicate id=3
or expand to 26 entries — both break the partition invariant).
Solution: EXECUTOR_REGISTRY sibling namespace with its own validator
+ getExecutor(key) lookup. BaseAgent.charter() of Agent3SelfRenewalExecutor
sources from getExecutor('self-renewal-executor') rather than getAgent(3).

CEO dispositions locked 2026-05-14 (from
docs/specs/SELF_RENEWAL_AGENT_SPEC.md):
  Q1 = (a) recommend-only + fork-and-fix active; defer modes ii/iii
  Q2 = (b) SPLIT charter (this Executor class is the split mechanism)
  Q3 = (a) 3-tier severity; medium auto, high+critical → Human Gate
  Q4 = (c) sync POST /api/agent/3/execute + Inngest async job
  Q5 = (c) sampled verification re-crawl, monthly minimum

Tests: 598 lines, all green. Static charter validation passes
(EXECUTOR_REGISTRY validator runs independently at module load).
`.trim();

function buildQuestionBody(registrySlice, executorHeader) {
  const lines = [];
  lines.push('═══════════════ EXECUTOR_REGISTRY PATTERN RATIFICATION (2026-05-14) ═══════════════');
  lines.push('');
  lines.push('Lineage: W04 dispatch → W6 execution. Read-only consultation. Goal:');
  lines.push('Panel ratifies / amends / rejects / defers the EXECUTOR_REGISTRY');
  lines.push('sibling-namespace pattern introduced by W5a commit `176d870`.');
  lines.push('');
  lines.push('═══════════════ W5A COMMIT SUMMARY (verbatim) ═══════════════');
  lines.push('');
  lines.push(W5A_COMMIT_SUMMARY);
  lines.push('');
  lines.push('═══════════════ src/lib/agents/_registry.ts — EXECUTOR_REGISTRY SLICE (verbatim) ═══════════════');
  lines.push('');
  lines.push('```typescript');
  lines.push(registrySlice);
  lines.push('```');
  lines.push('');
  lines.push('═══════════════ src/lib/agents/agents/Agent3SelfRenewalExecutor.js — CHARTER HEADER (verbatim) ═══════════════');
  lines.push('');
  lines.push('```javascript');
  lines.push(executorHeader);
  lines.push('```');
  lines.push('');
  lines.push('═══════════════ THREE MULTIPLE-CHOICE QUESTIONS ═══════════════');
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
  lines.push('Engineering will accept Panel supermajority (≥8/10 ENGAGED) verbatim;');
  lines.push('quorum plurality (≥7/10) treated as recommendation; below quorum → CEO');
  lines.push('disposition required. The literal string "INSUFFICIENT_INFORMATION" is');
  lines.push('a valid per-question response when the attached artifacts are insufficient.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering 3 multiple-choice ratification
questions about the EXECUTOR_REGISTRY sibling-namespace architectural
pattern introduced by W5a in commit 176d870. The W5a commit summary,
the EXECUTOR_REGISTRY slice of src/lib/agents/_registry.ts, and the
charter header of Agent3SelfRenewalExecutor.js are attached verbatim
in the CONSULTATION CONTEXT block above. The full FlowAI
CANONICAL_REFERENCE.md (Rev-2.1 canonical, commit c2623c5 / 9495b26)
is ALSO attached at the top of the bundle as the evidence base.

For EACH question Q1..Q3:
  - Pick exactly one of (a) / (b) / (c) / (d) — OR "INSUFFICIENT_INFORMATION".
  - 1-3 sentence rationale citing at least one specific item from the
    attached registry slice (e.g., "EXECUTOR_REGISTRY validator
    invariants", "getExecutor()"), the W5a commit summary, the
    executor charter header (e.g., "static charterId = 3", "sourced
    from EXECUTOR_REGISTRY rather than AGENT_REGISTRY"), or canonical
    SSOT (e.g., Rev-2.1 §15 "25-Agent Roster + OrchestratorHub-vs-
    Orchestra", §14 GovernanceAuditLog, Locked Rule 2 "BaseAgent.js
    compile-time validates EXACTLY 25 unique agent IDs", §22 Product-
    Agnostic Rule, §18 CA-n cycle).
  - If your answer conflicts with canonical SSOT, FLAG IT in
    "conflicts_with_ssot".

Engagement self-classification:
  ENGAGED   — All 3 questions answered AND each rationale cites at
              least one specific attached artifact OR specific SSOT
              section.
  TANGENTIAL — Some questions missing valid responses OR rationales
              lack specific citations.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answers": {
    "Q1": { "pick": "(a)" | "(b)" | "(c)" | "(d)" | "INSUFFICIENT_INFORMATION", "rationale": "<1-3 sentences>", "amendment_or_alternative": "<if Q1=(b) or (c), 1-2 sentences; otherwise empty string>" },
    "Q2": { "pick": "<one of>", "rationale": "<1-3 sentences>" },
    "Q3": { "pick": "<one of>", "rationale": "<1-3 sentences>", "risks_and_mitigations": ["<if Q3=(b) or (c), list 1-line entries>"] }
  },
  "conflicts_with_ssot": ["<Q# + 1-line description>", ...],
  "overall_notes": "<optional 1-2 sentences; may be empty string>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

const CITATION_TERMS_RE =
  /§\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|EXECUTOR_REGISTRY|AGENT_REGISTRY|getExecutor|getAgent|charterId|validateExecutors|validateRoster|BaseAgent|Locked Rule|Sprint\s*[A-Z0-9-]+|Agent\s*#?\s*\d+|AUTO_WRITE_INTERNAL|REQUIRES_HUMAN_GATE|RECOMMEND_ONLY|recommend_only|auto_write_internal|requires_human_gate|cross-step|step-owner|always-on|GovernanceAuditLog|OrchestratorHub|Orchestra|CA-?\d+|Rev-?2(\.1)?|176d870|9495b26|c2623c5|CANONICAL_REFERENCE|inngest|verification|severity/i;

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
    const amendment = typeof a?.amendment_or_alternative === 'string' ? a.amendment_or_alternative.trim() : null;
    const risks = Array.isArray(a?.risks_and_mitigations) ? a.risks_and_mitigations.filter((s) => typeof s === 'string').map((s) => s.trim()) : null;
    if (pick && (VALID_OPTIONS.includes(pick) || pick === INSUFF)) validPicks += 1;
    if (pick === INSUFF) insuffCount += 1;
    const hasCite = rationale && CITATION_TERMS_RE.test(rationale);
    if (pick && hasCite) citingRationales += 1;
    perQuestion[q.id] = { pick, rationale, amendment, risks };
  }
  const conflicts = Array.isArray(parsed?.conflicts_with_ssot) ? parsed.conflicts_with_ssot.filter((s) => typeof s === 'string').map((s) => s.trim()) : [];
  let state = 'SILENT';
  if (selfTag === 'EVASIVE') state = 'EVASIVE';
  else if (validPicks === 0) state = 'SILENT';
  else if (validPicks === QUESTIONS.length && citingRationales >= QUESTIONS.length) state = 'ENGAGED';
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
  if (top[1] === 0) return { verdict: 'NO_QUORUM', detail: `0 ENGAGED votes; INSUFF=${counts[INSUFF] || 0}`, topOption: null, topCount: 0 };
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
      if (q.id === 'Q1' && a.amendment) lines.push(`  - amendment_or_alternative: ${a.amendment}`);
      if (q.id === 'Q3' && Array.isArray(a.risks) && a.risks.length > 0) {
        lines.push(`  - risks_and_mitigations:`);
        for (const x of a.risks) lines.push(`    - ${x}`);
      }
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
  process.stdout.write(`[executor-registry-ratification] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[executor-registry-ratification] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(
      `Panel composition not the rebalanced 10-unique-provider roster — ` +
      `maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. ` +
      `Halting per W04 dispatch.`,
    );
  }

  if (!existsSync(REGISTRY_PATH)) throw new Error(`_registry.ts not found at ${REGISTRY_PATH}`);
  if (!existsSync(EXECUTOR_PATH)) throw new Error(`Agent3SelfRenewalExecutor.js not found at ${EXECUTOR_PATH}`);
  const registryText = await readFile(REGISTRY_PATH, 'utf8');
  const executorText = await readFile(EXECUTOR_PATH, 'utf8');
  const registrySlice = extractRegistrySlice(registryText);
  const executorHeader = extractExecutorHeader(executorText);

  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(registrySlice, executorHeader);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[executor-registry-ratification] bundle: ${artifact.length} chars (full CANONICAL_REFERENCE + registry slice + executor header + commit summary attached)\n`);

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
    `# Panel Consultation — EXECUTOR_REGISTRY Pattern Ratification (2026-05-14)`,
    ``,
    `**Lineage:** W04 dispatch → W6 execution. Ratification consultation on the EXECUTOR_REGISTRY sibling-namespace pattern introduced by W5a in commit \`176d870\` (Agent #3 graduation, Phase 1.3). Canonical SSOT: Rev-2.1 (\`c2623c5\` / \`9495b26\`).`,
    ``,
    `**Mode:** read-only Panel consultation. 3 multiple-choice questions, 4 options each + \`INSUFFICIENT_INFORMATION\` valid abstention. Engineering accepts supermajority (≥8/10 ENGAGED) verbatim.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + EXECUTOR_REGISTRY registry slice + Agent3SelfRenewalExecutor.js charter header + W5a commit summary).`,
    `**Panel composition audit:** ${JSON.stringify(audit)} — strict 10-unique-provider roster (≤1 per provider) per slot-config.mjs rev-2 (commit \`9bafecf\`).`,
    ``,
    `**W6 thresholds:** Quorum = 7 of 10 · Supermajority = 8 of 10 · Unanimous = all-ENGAGED on one option.`,
    ``,
    `---`,
    ``,
    `## Slot status (10-unique-provider roster)`,
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
    `## Highest-conviction (UNANIMOUS / SUPERMAJORITY)`,
    ``,
    high.length === 0 ? '_(none cleared supermajority)_' : high.map((q) => {
      const v = perVerdicts[q.id];
      const winText = v.topOption ? (v.topOption === '(a)' ? q.a : v.topOption === '(b)' ? q.b : v.topOption === '(c)' ? q.c : q.d) : '';
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
  process.stdout.write(`[executor-registry-ratification] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'executor-registry-pattern-ratification.sidecar.v1',
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
  process.stdout.write(`[executor-registry-ratification] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ EXECUTOR_REGISTRY RATIFICATION SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups fired:   ${result.w6_metadata.backups_applied} -> ${JSON.stringify(backupFires)}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length} (TANGENTIAL=${t.tangential}, SILENT=${t.silent}, EVASIVE=${t.evasive})\n`);
  process.stdout.write(`INSUFF total:    ${t.totalInsuff}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topOption} ${v.topCount}/${t.engagedTotal}) — ${q.topic}\n`);
  }
  process.stdout.write(`SSOT conflicts flagged: ${allConflicts.length}\n`);
  process.stdout.write('══════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[executor-registry-ratification] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
