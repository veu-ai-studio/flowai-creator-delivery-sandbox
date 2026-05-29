// scripts/panel/run-ssot-w04-rev2-canonical-review.mjs
//
// W6 Panel re-consultation — SSOT W04-Rev-2 Canonical Re-Review (2026-05-14).
//
// Per W04 dispatch 2026-05-14: re-Panel review of W04-Rev-2 DRAFT
// (`docs/SSOT_W04_REV2_DRAFT.md`, commit `10890b9`). Rev-2 addresses
// 14 Panel-cited gaps from Rev-1 review. Mission: clear 8/8
// supermajority before canonical promotion.
//
// Standing rule (W6 brief): full CANONICAL_REFERENCE.md is attached
// as context via buildArtifactWithCanonical(). The W04-Rev-2 DRAFT is
// inlined verbatim in the QUESTION_BODY so reviewers can verify each
// gap-claim against the actual revision text.

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

const DRAFT_PATH = path.join(repoRoot, 'docs', 'SSOT_W04_REV2_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ssot-w04-rev2-canonical-review-2026-05-14.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ssot-w04-rev2-canonical-review-2026-05-14.sidecar.json');

// 14 Panel-cited gaps from Rev-1 review (anchored where Rev-2 claims to fix them).
const REV1_GAPS = [
  { n: 1,  short: 'Metadata-driven architecture resolves §3↔§14 tension',           anchor: '§3'   },
  { n: 2,  short: 'Capability Transfer added as Level 4 of orchestration',          anchor: '§4'   },
  { n: 3,  short: 'Resolution contract clarified (terminal decisions, no absolute)', anchor: '§6'   },
  { n: 4,  short: 'Axis rename eliminates "Manual" collision',                       anchor: '§8 + §8a' },
  { n: 5,  short: 'Self-Governance Layer surfaced (Self-Test/Audit/Protect/Heal + 4 Human Gates)', anchor: '§10' },
  { n: 6,  short: '6-step Product Clearance Protocol surfaced',                      anchor: '§11'  },
  { n: 7,  short: 'Remediation Modes wired to specific 8-step pipeline steps + severity routing', anchor: '§12' },
  { n: 8,  short: 'Authentication + role model (admin/operator/client)',             anchor: '§13'  },
  { n: 9,  short: 'GovernanceAuditLog surfaced (topics, tamper-evidence, retention)', anchor: '§14'  },
  { n: 10, short: '25-agent roles + OrchestratorHub-vs-Orchestra distinction',       anchor: '§15'  },
  { n: 11, short: 'Deployment infrastructure (readiness/scaffold/dual-env/drift/live monitor)', anchor: '§16' },
  { n: 12, short: '6-section sidebar + navigation hierarchy',                        anchor: '§17'  },
  { n: 13, short: 'CA-n Canonical Amendment cycle defined',                          anchor: '§18'  },
  { n: 14, short: 'Current phase status updated (post-PROTECT-1, not Phase 0)',      anchor: '§26'  },
];

const Q2_VERDICT_OPTIONS = ['ALL_MINOR_DEFER_TO_CAN', 'MOSTLY_MINOR_SOME_BLOCKING', 'MOSTLY_BLOCKING_SOME_MINOR', 'ALL_BLOCKING'];
const Q3_VERDICT_OPTIONS = ['CONSISTENT', 'MINOR_INCONSISTENCIES', 'MAJOR_CONFLICTS'];
const Q4_VERDICT_OPTIONS = ['PROMOTE_AS_CANONICAL', 'PROMOTE_WITH_MINOR_AMENDMENTS', 'REWORK_BEFORE_PROMOTION', 'REJECT_CURRENT_DRAFT'];
const GAP_STATUS_OPTIONS = ['ADDRESSED', 'PARTIALLY_ADDRESSED', 'NOT_ADDRESSED'];

function buildQuestionBody(draftText) {
  const lines = [];
  lines.push('═══════════════ SSOT W04-Rev-2 RE-PANEL CANONICAL REVIEW (2026-05-14) ═══════════════');
  lines.push('');
  lines.push('Lineage: W04 dispatch → W6 execution. DRAFT under review:');
  lines.push('`docs/SSOT_W04_REV2_DRAFT.md` (commit `10890b9`). Supersedes Rev-1.');
  lines.push('');
  lines.push('Prior Panel verdict on Rev-1 (full doc:');
  lines.push('`docs/panel-consultations/ssot-w04-rev1-canonical-review-2026-05-14.md`):');
  lines.push('  • Overall: PLURALITY_REWORK_BEFORE_PROMOTION (4 of 7 ENGAGED, no supermajority)');
  lines.push('  • 14 specific gaps cited (Rev-2 claims to fix each — see anchor table below)');
  lines.push('');
  lines.push('Mission: clear 8/8 SUPERMAJORITY on Q4 before Rev-2 promotes to canonical.');
  lines.push('Below 8/10 ENGAGED-on-PROMOTE = MUST re-rework.');
  lines.push('');
  lines.push('═══════════════ 14 REV-1 PANEL-CITED GAPS (each claimed fixed in Rev-2) ═══════════════');
  lines.push('');
  for (const g of REV1_GAPS) {
    lines.push(`  G${g.n}. [${g.anchor}] ${g.short}`);
  }
  lines.push('');
  lines.push('═══════════════ SSOT W04-Rev-2 DRAFT (verbatim, under review) ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END W04-Rev-2 DRAFT ═══════════════');
  lines.push('');
  lines.push('═══════════════ FOUR QUESTIONS (answer all) ═══════════════');
  lines.push('');
  lines.push('Q1. GAP AUDIT — Have all 14 Rev-1 Panel-cited gaps been adequately addressed in Rev-2?');
  lines.push('    For EACH gap G1..G14, give a per-gap status from:');
  lines.push(`      ${GAP_STATUS_OPTIONS.map((s) => `"${s}"`).join(' | ')}`);
  lines.push('    Plus a 1-sentence finding citing the relevant Rev-2 section. If any gap is');
  lines.push('    PARTIALLY_ADDRESSED or NOT_ADDRESSED, name it explicitly with section ref.');
  lines.push('');
  lines.push('Q2. OPEN QUESTIONS §27 — Are the 10 open questions in §27 minor (defer to CA-n) or blocking?');
  lines.push(`    Pick: ${Q2_VERDICT_OPTIONS.map((v) => `"${v}"`).join(' | ')}`);
  lines.push('    For each OQ you judge BLOCKING, name it ("OQ-<N>: <reason>").');
  lines.push('');
  lines.push('Q3. INTERNAL CONSISTENCY — Is Rev-2 internally consistent across all 27 sections?');
  lines.push(`    Pick: ${Q3_VERDICT_OPTIONS.map((v) => `"${v}"`).join(' | ')}`);
  lines.push('    List any NEW conflicts introduced by the rework (cite both conflicting sections).');
  lines.push('');
  lines.push('Q4. FINAL VERDICT — Promotion recommendation.');
  lines.push(`    Pick: ${Q4_VERDICT_OPTIONS.map((v) => `"${v}"`).join(' | ')}`);
  lines.push('    Provide 2-3 sentence rationale.');
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer answering a 4-question RE-PANEL canonical review
of FlowAI SSOT W04-Rev-2 DRAFT (verbatim text attached above, inside the
CONSULTATION CONTEXT block). The full FlowAI CANONICAL_REFERENCE.md is
ALSO attached at the top of the bundle.

This is a re-Panel review. The DRAFT explicitly claims to fix 14 gaps
cited by the prior Rev-1 Panel review. Your primary job in Q1 is to
verify each claim by checking the relevant Rev-2 section.

For Q1 — produce a per-gap status object covering G1..G14. Each gap
gets a status label and a 1-sentence finding.

For Q2 — read §27 (10 Open Questions) of the DRAFT and judge whether
the open items are minor enough to defer to the CA-n cycle (§18) or
whether any are blocking for canonical promotion.

For Q3 — read all 27 sections and flag any NEW conflict introduced by
the rework. Q3 is about CONSISTENCY across Rev-2, not re-litigating
Rev-1 gaps.

For Q4 — pick a final verdict label. The mission target is 8/8
SUPERMAJORITY on PROMOTE_AS_CANONICAL or PROMOTE_WITH_MINOR_AMENDMENTS.

Engagement self-classification:
  ENGAGED   — All 14 gap statuses given AND each finding cites a Rev-2
              section number; Q2/Q3/Q4 verdict labels picked; rationale
              cites at least one specific section from Rev-2 or one
              specific item from CANONICAL_REFERENCE.md.
  TANGENTIAL — Some Q1 gap statuses missing, OR weak citations, OR
              one of Q2/Q3/Q4 missing a valid verdict label.
  SILENT    — No real engagement.
  EVASIVE   — Explicit decline with reason.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "engagement": "ENGAGED" | "TANGENTIAL" | "SILENT" | "EVASIVE",
  "Q1": {
    "gap_statuses": {
      "G1":  { "status": "<label>", "finding": "<1 sentence with section ref>" },
      "G2":  { "status": "<label>", "finding": "<1 sentence>" },
      "G3":  { "status": "<label>", "finding": "<1 sentence>" },
      "G4":  { "status": "<label>", "finding": "<1 sentence>" },
      "G5":  { "status": "<label>", "finding": "<1 sentence>" },
      "G6":  { "status": "<label>", "finding": "<1 sentence>" },
      "G7":  { "status": "<label>", "finding": "<1 sentence>" },
      "G8":  { "status": "<label>", "finding": "<1 sentence>" },
      "G9":  { "status": "<label>", "finding": "<1 sentence>" },
      "G10": { "status": "<label>", "finding": "<1 sentence>" },
      "G11": { "status": "<label>", "finding": "<1 sentence>" },
      "G12": { "status": "<label>", "finding": "<1 sentence>" },
      "G13": { "status": "<label>", "finding": "<1 sentence>" },
      "G14": { "status": "<label>", "finding": "<1 sentence>" }
    },
    "addressed_count": <integer 0-14>,
    "still_open": ["<G# short reason with section ref>", ...]
  },
  "Q2": {
    "verdict": "<label>",
    "blocking_oqs": ["OQ-<N>: <reason>", ...],
    "findings": "<2-3 sentences>"
  },
  "Q3": {
    "verdict": "<label>",
    "new_conflicts": ["<§A vs §B: description>", ...],
    "findings": "<2-3 sentences>"
  },
  "Q4_final_verdict": "<label>",
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

function normalizeLabel(raw, validSet) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (validSet.includes(trimmed)) return trimmed;
  const norm = trimmed.replace(/[^A-Z_]/g, '');
  for (const v of validSet) {
    if (v.replace(/[^A-Z_]/g, '') === norm) return v;
  }
  return null;
}

const CITATION_TERMS_RE =
  /Section\s*\d+[a-z]?|§\s*\d+|CANONICAL_REFERENCE|W04-Rev-2|Rev-2|Rev-1|Orchestra|OrchestratorHub|Auto\s*\/\s*Recommended\s*\/\s*User-Choice|Hands-On|Reviewed|Hands-Off|Manual|Supervised|Autonomous|Sprint\s*[A-Z0-9-]+|Agent\s*#\s*\d+|95\/95|Clearance|Self-Renewal|Capability Transfer|GovernanceAuditLog|G\d+|OQ-?\d+|CA-\d+|MessageBus|AgentRegistry/i;

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  const slot = idx + 1;
  if (degraded) return { slot, state: 'SILENT', q1: { gaps: {}, addressedCount: null, stillOpen: [] }, q2: null, q3: null, q4: null, rationale: 'reviewer degraded', degraded: true, parseFailure: false, modelTag };
  if (parseFailure) return { slot, state: 'SILENT', q1: { gaps: {}, addressedCount: null, stillOpen: [] }, q2: null, q3: null, q4: null, rationale: 'parse failure', degraded: false, parseFailure: true, modelTag };

  const selfTag = typeof parsed?.engagement === 'string' ? parsed.engagement.toUpperCase() : null;
  const rationale = typeof parsed?.rationale === 'string' ? parsed.rationale.trim() : null;

  // Q1
  const gapStatusesRaw = parsed?.Q1?.gap_statuses ?? {};
  const q1Gaps = {};
  let validGapStatuses = 0;
  let citingGapFindings = 0;
  for (const g of REV1_GAPS) {
    const key = `G${g.n}`;
    const entry = gapStatusesRaw[key] ?? {};
    const status = normalizeLabel(entry?.status, GAP_STATUS_OPTIONS);
    const finding = typeof entry?.finding === 'string' ? entry.finding.trim() : null;
    if (status) validGapStatuses += 1;
    const hasCite = finding && CITATION_TERMS_RE.test(finding);
    if (status && hasCite) citingGapFindings += 1;
    q1Gaps[key] = { status, finding };
  }
  const stillOpen = Array.isArray(parsed?.Q1?.still_open) ? parsed.Q1.still_open.filter((s) => typeof s === 'string').map((s) => s.trim()) : [];
  const addressedCount = Number.isFinite(parsed?.Q1?.addressed_count) ? parsed.Q1.addressed_count : null;

  // Q2
  const q2Verdict = normalizeLabel(parsed?.Q2?.verdict, Q2_VERDICT_OPTIONS);
  const q2Blocking = Array.isArray(parsed?.Q2?.blocking_oqs) ? parsed.Q2.blocking_oqs.filter((s) => typeof s === 'string').map((s) => s.trim()) : [];
  const q2Findings = typeof parsed?.Q2?.findings === 'string' ? parsed.Q2.findings.trim() : null;

  // Q3
  const q3Verdict = normalizeLabel(parsed?.Q3?.verdict, Q3_VERDICT_OPTIONS);
  const q3Conflicts = Array.isArray(parsed?.Q3?.new_conflicts) ? parsed.Q3.new_conflicts.filter((s) => typeof s === 'string').map((s) => s.trim()) : [];
  const q3Findings = typeof parsed?.Q3?.findings === 'string' ? parsed.Q3.findings.trim() : null;

  // Q4
  const q4Verdict = normalizeLabel(parsed?.Q4_final_verdict, Q4_VERDICT_OPTIONS);

  // Engagement
  let state = 'SILENT';
  const allQ234Present = q2Verdict && q3Verdict && q4Verdict;
  if (selfTag === 'EVASIVE') {
    state = 'EVASIVE';
  } else if (validGapStatuses === 0 && !allQ234Present && !rationale) {
    state = 'SILENT';
  } else if (validGapStatuses === REV1_GAPS.length && citingGapFindings >= REV1_GAPS.length - 2 && allQ234Present && rationale) {
    state = 'ENGAGED';
  } else {
    state = 'TANGENTIAL';
  }

  return {
    slot, state,
    q1: { gaps: q1Gaps, addressedCount, stillOpen },
    q2: { verdict: q2Verdict, blockingOqs: q2Blocking, findings: q2Findings },
    q3: { verdict: q3Verdict, newConflicts: q3Conflicts, findings: q3Findings },
    q4: q4Verdict,
    rationale,
    degraded: false, parseFailure: false, modelTag,
  };
}

function tally(perReviewer) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const evasive = perReviewer.filter((r) => r.state === 'EVASIVE').length;

  // Per-gap status tally (ENGAGED only)
  const perGap = {};
  for (const g of REV1_GAPS) {
    const key = `G${g.n}`;
    const counts = {};
    for (const s of GAP_STATUS_OPTIONS) counts[s] = 0;
    counts.other = 0;
    for (const r of engaged) {
      const s = r.q1.gaps[key]?.status;
      if (s && counts[s] !== undefined) counts[s] += 1;
      else counts.other += 1;
    }
    perGap[key] = counts;
  }

  // Q2/Q3/Q4 verdict tallies (ENGAGED only)
  const q2 = {}; for (const v of Q2_VERDICT_OPTIONS) q2[v] = 0; q2.other = 0;
  const q3 = {}; for (const v of Q3_VERDICT_OPTIONS) q3[v] = 0; q3.other = 0;
  const q4 = {}; for (const v of Q4_VERDICT_OPTIONS) q4[v] = 0; q4.other = 0;
  for (const r of engaged) {
    if (r.q2?.verdict && q2[r.q2.verdict] !== undefined) q2[r.q2.verdict] += 1; else q2.other += 1;
    if (r.q3?.verdict && q3[r.q3.verdict] !== undefined) q3[r.q3.verdict] += 1; else q3.other += 1;
    if (r.q4 && q4[r.q4] !== undefined) q4[r.q4] += 1; else q4.other += 1;
  }

  return { engagedTotal: engaged.length, tangential, silent, evasive, perGap, q2, q3, q4 };
}

function computeVerdict(counts, validOptions, engagedTotal) {
  if (engagedTotal === 0) return { verdict: 'NO_SIGNAL', detail: '0 ENGAGED' };
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

function renderPerGapTable(t) {
  const rows = [];
  rows.push(`| Gap | Anchor | ADDRESSED | PARTIAL | NOT | Top status | Verdict |`);
  rows.push(`|---|---|---:|---:|---:|---|---|`);
  for (const g of REV1_GAPS) {
    const key = `G${g.n}`;
    const c = t.perGap[key];
    const v = computeVerdict(c, GAP_STATUS_OPTIONS, t.engagedTotal);
    const top = GAP_STATUS_OPTIONS.map((o) => [o, c[o]]).sort((a, b) => b[1] - a[1])[0];
    rows.push(`| **G${g.n}** ${g.short} | ${g.anchor} | ${c.ADDRESSED} | ${c.PARTIALLY_ADDRESSED} | ${c.NOT_ADDRESSED} | \`${top[0]}\` | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderQVerdictTable(label, options, counts) {
  const rows = [];
  rows.push(`| ${label} verdict | Count (ENGAGED) |`);
  rows.push(`|---|---:|`);
  for (const v of options) rows.push(`| \`${v}\` | ${counts[v]} |`);
  if (counts.other > 0) rows.push(`| \`(other / unrecognized)\` | ${counts.other} |`);
  return rows.join('\n');
}

function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `**Slot ${r.slot}** [${r.state}] — ${r.modelTag} — Q4 = \`${r.q4 ?? '—'}\``;
    const lines = [head, ''];
    if (r.rationale) { lines.push(`> ${r.rationale.replace(/\n/g, '\n> ')}`); lines.push(''); }
    if (r.state === 'SILENT' || r.state === 'EVASIVE') return lines.join('\n');

    // Q1
    lines.push(`- **Q1 gap audit** — addressed_count = ${r.q1.addressedCount ?? '—'}`);
    for (const g of REV1_GAPS) {
      const key = `G${g.n}`;
      const e = r.q1.gaps[key] || {};
      lines.push(`  - **G${g.n}** ${g.anchor} → \`${e.status ?? '—'}\`${e.finding ? ` — ${e.finding}` : ''}`);
    }
    if (Array.isArray(r.q1.stillOpen) && r.q1.stillOpen.length > 0) {
      lines.push(`  - Still open per reviewer: ${r.q1.stillOpen.map((s) => `_${s}_`).join('; ')}`);
    }
    // Q2
    lines.push(`- **Q2** = \`${r.q2?.verdict ?? '—'}\``);
    if (r.q2?.findings) lines.push(`  > ${r.q2.findings.replace(/\n/g, '\n  > ')}`);
    if (Array.isArray(r.q2?.blockingOqs) && r.q2.blockingOqs.length > 0) {
      lines.push(`  - Blocking OQs:`);
      for (const o of r.q2.blockingOqs) lines.push(`    - ${o}`);
    }
    // Q3
    lines.push(`- **Q3** = \`${r.q3?.verdict ?? '—'}\``);
    if (r.q3?.findings) lines.push(`  > ${r.q3.findings.replace(/\n/g, '\n  > ')}`);
    if (Array.isArray(r.q3?.newConflicts) && r.q3.newConflicts.length > 0) {
      lines.push(`  - New conflicts cited:`);
      for (const o of r.q3.newConflicts) lines.push(`    - ${o}`);
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
  process.stdout.write(`[ssot-w04-rev2-review] started ${startedAt}\n`);

  if (!existsSync(DRAFT_PATH)) throw new Error(`SSOT W04-Rev-2 DRAFT not found at ${DRAFT_PATH}`);
  const draftText = await readFile(DRAFT_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(draftText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[ssot-w04-rev2-review] bundle: ${artifact.length} chars (CANONICAL_REFERENCE + Rev-2 DRAFT attached)\n`);

  const result = await runPanelConsultationWithBackups({
    artifact,
    criteria: CRITERIA,
    panel: PANEL,
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
  const q4Verdict = computeVerdict(t.q4, Q4_VERDICT_OPTIONS, t.engagedTotal);
  const q2Verdict = computeVerdict(t.q2, Q2_VERDICT_OPTIONS, t.engagedTotal);
  const q3Verdict = computeVerdict(t.q3, Q3_VERDICT_OPTIONS, t.engagedTotal);

  const promoteCount = (t.q4.PROMOTE_AS_CANONICAL || 0) + (t.q4.PROMOTE_WITH_MINOR_AMENDMENTS || 0);
  const supermajorityPromoteMet = promoteCount >= 8;
  const supermajorityPromoteAsCanonicalMet = (t.q4.PROMOTE_AS_CANONICAL || 0) >= 8;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# Panel Re-Consultation — SSOT W04-Rev-2 Canonical Re-Review (2026-05-14)`,
    ``,
    `**Lineage:** W04 dispatch → W6 execution. Re-Panel of \`docs/SSOT_W04_REV2_DRAFT.md\` (commit \`10890b9\`). Supersedes Rev-1 review: \`docs/panel-consultations/ssot-w04-rev1-canonical-review-2026-05-14.md\`.`,
    ``,
    `**Mode:** read-only canonical re-review. Four questions: 14-gap audit + open-question classification + consistency check + final verdict. Mission target: 8/8 supermajority on PROMOTE.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${artifact.length} chars (full CANONICAL_REFERENCE.md + Rev-2 DRAFT attached).`,
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
    `## Q1 — Per-gap audit (ENGAGED-only tally of ${t.engagedTotal})`,
    ``,
    renderPerGapTable(t),
    ``,
    `## Q2 — Open Questions §27 classification`,
    ``,
    renderQVerdictTable('Q2', Q2_VERDICT_OPTIONS, t.q2),
    ``,
    `**Q2 verdict:** \`${q2Verdict.verdict}\` — ${q2Verdict.detail}.`,
    ``,
    `## Q3 — Internal consistency across 27 sections`,
    ``,
    renderQVerdictTable('Q3', Q3_VERDICT_OPTIONS, t.q3),
    ``,
    `**Q3 verdict:** \`${q3Verdict.verdict}\` — ${q3Verdict.detail}.`,
    ``,
    `## Q4 — Final promotion recommendation`,
    ``,
    renderQVerdictTable('Q4', Q4_VERDICT_OPTIONS, t.q4),
    ``,
    `**Q4 verdict:** \`${q4Verdict.verdict}\` — ${q4Verdict.detail}.`,
    ``,
    `**Supermajority gate (mission target 8/8):**`,
    `- PROMOTE_AS_CANONICAL alone: ${t.q4.PROMOTE_AS_CANONICAL || 0}/10 → ${supermajorityPromoteAsCanonicalMet ? '**MET (8/8 cleared)**' : 'NOT MET'}`,
    `- PROMOTE_AS_CANONICAL **or** PROMOTE_WITH_MINOR_AMENDMENTS combined: ${promoteCount}/10 → ${supermajorityPromoteMet ? '**MET (8/8 cleared, minor amendments path)**' : 'NOT MET'}`,
    ``,
    `---`,
    ``,
    `## Questions (verbatim)`,
    ``,
    '```',
    questionBody.slice(0, 4000) + (questionBody.length > 4000 ? `\n\n[... ${questionBody.length - 4000} chars truncated for output — full body in sidecar ...]` : ''),
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
  process.stdout.write(`[ssot-w04-rev2-review] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ssot-w04-rev2-canonical-review.sidecar.v1',
    startedAt, finishedAt,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    q2_verdict: q2Verdict, q3_verdict: q3Verdict, q4_verdict: q4Verdict,
    supermajority_gate: {
      promote_as_canonical_count: t.q4.PROMOTE_AS_CANONICAL || 0,
      promote_combined_count: promoteCount,
      promote_as_canonical_supermajority_met: supermajorityPromoteAsCanonicalMet,
      promote_combined_supermajority_met: supermajorityPromoteMet,
    },
    perReviewer,
    rev1_gaps: REV1_GAPS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[ssot-w04-rev2-review] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ SSOT W04-Rev-2 RE-PANEL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:         ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`Backups applied: ${result.w6_metadata.backups_applied}\n`);
  process.stdout.write(`ENGAGED:         ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Q4 verdict:      ${q4Verdict.verdict}\n`);
  process.stdout.write(`Q4 detail:       ${q4Verdict.detail}\n`);
  process.stdout.write(`Q2 verdict:      ${q2Verdict.verdict} — ${q2Verdict.detail}\n`);
  process.stdout.write(`Q3 verdict:      ${q3Verdict.verdict} — ${q3Verdict.detail}\n`);
  process.stdout.write(`PROMOTE strict (PROMOTE_AS_CANONICAL ≥ 8/10): ${supermajorityPromoteAsCanonicalMet}\n`);
  process.stdout.write(`PROMOTE combined (PROMOTE_AS_CANONICAL + MINOR_AMENDMENTS ≥ 8/10): ${supermajorityPromoteMet}\n`);
  process.stdout.write('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[ssot-w04-rev2-review] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
