// scripts/panel/run-w6-structural-validation.mjs
//
// W6 structural validation — single MC question asking the 10-slot
// Panel whether W6 should be established as the sole dedicated Panel
// workstream. Per W5a dispatch Step 6.
//
// Bundle includes full CANONICAL_REFERENCE.md (per W6 brief standing
// rule: "every consultation must receive full CANONICAL_REFERENCE.md
// as context"). Single MC question, no Q0 free-text / Q-ADV adversarial
// per dispatch ("single MC question"). Per-reviewer engagement
// classification still applies via the same heuristics as prior
// consultations.

import { writeFile, mkdir } from 'node:fs/promises';
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
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'w6-structural-validation-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'w6-structural-validation-2026-05-14.sidecar.json');

const VALID_OPTIONS = ['(a)', '(b)', '(c)'];

const QUESTION_BODY = `
═══════════════ W6 STRUCTURAL VALIDATION (2026-05-14) ═══════════════

W6 Operating Brief (verbatim from docs/W6_OPERATING_BRIEF.md):

  PURPOSE: W6 is the dedicated workstream for all FlowAI Panel
  consultations. No Panel consultation runs outside W6. No other
  workstream runs Panel consultations.

  SCOPE:
    - Execute all Panel consultations via scripts/panel/run-panel-
      consultation.mjs
    - Maintain Panel infrastructure (adapters, slot health, retry
      logic)
    - Save all consultation outputs to docs/panel-consultations/
    - Commit all outputs to flowai-v0.1
    - Report results to W0x for CEO review

  PANEL COMPOSITION: 10 slots. Quorum: 7 of 10. Supermajority: 8 of 8.
  Slot 5 and Slot 7 backup adapters required (previously DEGRADED).

  STANDING RULES:
    - Every consultation must receive full CANONICAL_REFERENCE.md as
      context (you have it attached above)
    - Sessions without SSOT attached are invalid and must be re-run
    - Panel consensus grants write-authority to propose SSOT
      amendments (CA-n cycle)
    - W0x dispatches. W6 executes. CEO approves.

═══════════════ QUESTION ═══════════════

Should W6 be established as the sole dedicated Panel workstream, with
all Panel infrastructure consolidated under scripts/panel/ and all
outputs under docs/panel-consultations/?

  (a) YES — consolidate fully, W6 is sole Panel executor
  (b) YES with modification — consolidate but allow W5x emergency
      fallback
  (c) NO — Panel infrastructure should remain distributed
`.trim();

const CRITERIA = `
You are a Panel reviewer answering a single MC question about whether
to consolidate all FlowAI Panel infrastructure under a new dedicated
workstream called "W6." The full FlowAI CANONICAL_REFERENCE.md is
attached as context — read it as your evidence base on the project's
prior history with Panel consultations, the existing distributed
infrastructure pattern, and any workstream conventions already in
place.

Per W6 Operating Brief standing rules:
  - Quorum is 7 of 10 reviewers responding
  - Supermajority is 8 of 10 reviewers in agreement
  - Sessions without SSOT attached are invalid (this one DOES have
    SSOT attached — see CANONICAL_REFERENCE block above)

For this question:
  - Pick exactly one option from (a) / (b) / (c)
  - Justify your pick in 2-3 sentences referencing at least one
    specific item from either CANONICAL_REFERENCE.md or the W6
    Operating Brief above (e.g., a workstream name like "W5b" or
    "W2", a script path like "scripts/run-panel-smoke.mjs", a
    specific brief rule like "Quorum: 7 of 10").
  - If you genuinely cannot pick, set answer=null and
    engagement="EVASIVE" with a brief explanation in rationale.

Engagement self-classification:
  ENGAGED   — Picked an option AND justification cites at least one
              specific item from CANONICAL_REFERENCE or the W6 brief.
  TANGENTIAL — Pick made but no specific citation, OR rationale
              without a clean pick.
  SILENT    — No engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "answer": "(a)" | "(b)" | "(c)" | null,
  "citations": ["<short reference>", ...],
  "rationale": "<2-3 sentences>"
}

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
must be '{', last must be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

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

function normalizeAnswer(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().toLowerCase().match(/\(?([abc])\)?/);
  if (!m) return null;
  return `(${m[1]})`;
}

const CITATION_TERMS_RE = /W[0-9][a-z]?|W6|CANONICAL_REFERENCE|scripts\/panel|panel-consultations|Slot\s*[0-9]+|Quorum|supermajority|7 of 10|8 of 10|Locked Rule|MG2|emergency fallback|SSOT|W0x|peer-review|backup adapter/i;

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  if (degraded) return { slot: idx + 1, state: 'SILENT', answer: null, rationale: 'reviewer degraded', degraded: true, parseFailure, modelTag };
  if (parseFailure) return { slot: idx + 1, state: 'SILENT', answer: null, rationale: 'parse failure', degraded: false, parseFailure: true, modelTag };
  const selfTag = typeof parsed?.engagement === 'string' ? parsed.engagement.toUpperCase() : null;
  const answer = normalizeAnswer(parsed?.answer);
  const rationale = typeof parsed?.rationale === 'string' ? parsed.rationale.trim() : null;
  const citations = Array.isArray(parsed?.citations) ? parsed.citations.filter((c) => typeof c === 'string').map((c) => c.trim()) : [];
  const validPick = answer && VALID_OPTIONS.includes(answer);
  let state = 'SILENT';
  if (selfTag === 'EVASIVE' || (rationale && /\b(cannot pick|decline to pick|insufficient evidence)\b/i.test(rationale) && !validPick)) {
    state = 'EVASIVE';
  } else if (!validPick && !rationale) {
    state = 'SILENT';
  } else {
    const cites = citations.length > 0 || (rationale && CITATION_TERMS_RE.test(rationale));
    state = validPick && cites ? 'ENGAGED' : 'TANGENTIAL';
  }
  return { slot: idx + 1, state, answer, citations, rationale, degraded: false, parseFailure: false, modelTag };
}

function tally(perReviewer) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const counts = { '(a)': 0, '(b)': 0, '(c)': 0, other: 0 };
  for (const r of engaged) {
    if (r.answer && counts[r.answer] !== undefined) counts[r.answer] += 1;
    else counts.other += 1;
  }
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const evasive = perReviewer.filter((r) => r.state === 'EVASIVE').length;
  return { engagedTotal: engaged.length, counts, tangential, silent, evasive };
}

function computeVerdict(t) {
  const { engagedTotal, counts } = t;
  if (engagedTotal === 0) return { verdict: 'NO_SIGNAL', detail: '0 ENGAGED' };
  for (const opt of VALID_OPTIONS) {
    if (counts[opt] >= 8) return { verdict: `SUPERMAJORITY_${opt}`, detail: `${counts[opt]} of ${engagedTotal} ENGAGED on ${opt} (supermajority bar 8/10)` };
  }
  for (const opt of VALID_OPTIONS) {
    if (counts[opt] >= 7) return { verdict: `QUORUM_PLURALITY_${opt}`, detail: `${counts[opt]} of ${engagedTotal} ENGAGED on ${opt} (>= quorum bar 7/10 but below supermajority bar 8/10)` };
  }
  const sorted = VALID_OPTIONS.map((o) => [o, counts[o]]).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === sorted[1][1]) return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]).join(' / ')}` };
  return { verdict: `PLURALITY_${sorted[0][0]}`, detail: `${sorted[0][1]} of ${engagedTotal} ENGAGED on ${sorted[0][0]} (below quorum bar 7/10)` };
}

function renderRationales(perReviewer) {
  return perReviewer.map((r) => {
    const ans = r.answer ?? '—';
    const cit = (r.citations || []).length ? `_Citations:_ ${(r.citations || []).map((c) => `\`${c}\``).join(', ')}` : '_(no explicit citations)_';
    return [
      `**Slot ${r.slot}** [${r.state}] — ${r.modelTag} — answer = \`${ans}\``,
      ``,
      `> ${(r.rationale ?? '_(no rationale)_').replace(/\n/g, '\n> ')}`,
      ``,
      cit,
      ``,
    ].join('\n');
  }).join('\n---\n\n');
}

function renderRawResponses(reviewers) {
  const blocks = reviewers.map((r, idx) => {
    const slot = idx + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP applied]' : '';
    return [
      `### Slot ${slot}${tag} — ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || (r.model || '')}`,
      ``,
      `- Provider: \`${r.provider}\``,
      `- Latency: ${r.latency_ms} ms`,
      `- HTTP status: ${r.degraded ? 'DEGRADED' : 'OK'}`,
      r.slot_backup_applied ? `- Primary model that failed: \`${r.primary_slot_provider}:${r.primary_slot_model}\` (error: ${r.primary_slot_error ?? 'unknown'})` : null,
      r.error ? `- Error: ${r.error}` : null,
      ``,
      r.raw_output ? '```' : '',
      r.raw_output ?? '(no output)',
      r.raw_output ? '```' : '',
      ``,
    ].filter((l) => l !== null).join('\n');
  });
  return blocks.join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[w6-structural-validation] started ${startedAt}\n`);

  const canonical = await loadCanonicalReference();
  const artifact = buildArtifactWithCanonical(canonical, QUESTION_BODY);
  process.stdout.write(`[w6-structural-validation] bundle size: ${artifact.length} chars (CANONICAL_REFERENCE attached)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact,
    criteria: CRITERIA,
    panel: PANEL,
    perReviewerTimeoutMs: 60_000,
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
  const verdict = computeVerdict(t);
  const liveOk = result.reviewers.filter((r) => !r.degraded).length;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const mdBody = [
    `# Panel Consultation — W6 Structural Validation (2026-05-14)`,
    ``,
    `**Lineage:** W03 → W5a dispatch (auto mode). First consultation executed under the W6 Panel workstream after its establishment by this dispatch.`,
    ``,
    `**Mode:** read-only Panel consultation. Single MC question per dispatch Step 6.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md attached per W6 brief standing rule)`,
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
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (>=7): ${result.w6_metadata.quorum_met}. Supermajority achievable (>=8 LIVE-OK): ${result.w6_metadata.supermajority_achievable}.`,
    ``,
    `---`,
    ``,
    `## Question (verbatim)`,
    ``,
    '```',
    QUESTION_BODY,
    '```',
    ``,
    `---`,
    ``,
    `## Tally (ENGAGED-only)`,
    ``,
    `| Engaged | (a) YES sole | (b) YES w/ W5x fallback | (c) NO distributed | Non-engaged |`,
    `|---:|---:|---:|---:|---|`,
    `| ${t.engagedTotal} | ${t.counts['(a)']} | ${t.counts['(b)']} | ${t.counts['(c)']} | T=${t.tangential} S=${t.silent} X=${t.evasive} |`,
    ``,
    `**Verdict:** \`${verdict.verdict}\` — ${verdict.detail}.`,
    ``,
    `Supermajority bar (W6 brief: 8/10) ${verdict.verdict.startsWith('SUPERMAJORITY') ? 'MET' : 'NOT MET'}.`,
    `Quorum bar (W6 brief: 7/10) ${(verdict.verdict.startsWith('SUPERMAJORITY') || verdict.verdict.startsWith('QUORUM_PLURALITY')) ? 'MET' : 'NOT MET'}.`,
    ``,
    `---`,
    ``,
    `## Per-reviewer rationales`,
    ``,
    renderRationales(perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, mdBody, 'utf8');
  process.stdout.write(`[w6-structural-validation] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'w6-structural-validation.sidecar.v1',
    startedAt, finishedAt,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    verdict,
    perReviewer,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[w6-structural-validation] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ W6 STRUCTURAL VALIDATION SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:        ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups applied: ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:        ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`(a) YES sole:               ${t.counts['(a)']}\n`);
  process.stdout.write(`(b) YES w/ W5x fallback:    ${t.counts['(b)']}\n`);
  process.stdout.write(`(c) NO distributed:         ${t.counts['(c)']}\n`);
  process.stdout.write(`Verdict:        ${verdict.verdict}\n`);
  process.stdout.write(`Detail:         ${verdict.detail}\n`);
  process.stdout.write('══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[w6-structural-validation] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
