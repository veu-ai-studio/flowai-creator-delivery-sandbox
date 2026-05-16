// scripts/panel/run-ca12-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — CA-12 Three-Mode + Two-Dimension
// Governance Architecture (draft commit f9a62a0, 578 lines).
// Uses the W5b-locked adversarial format (b1cd827 / ad2ab28 / 3f9dede).
// 7 questions from §G of the spec verbatim.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runAdversarialPanelConsultation,
  PANEL,
} from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA12_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca12-ratification-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca12-ratification-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1', topic: 'Pipeline Mode classification completeness + non-overlap',
    options: [
      { key: 'GQ1-OK',       text: 'Complete and non-overlapping as stated (4 modes: Mode 1 Assess, Mode 2 Build, Mode 3A Benchmark, Mode 3B Synthesize).' },
      { key: 'GQ1-MISSING',  text: 'A Mode is missing — name it in rationale (e.g., a "Maintain existing" mode distinct from "Assess existing").' },
      { key: 'GQ1-OVERLAP',  text: 'Two or more modes overlap — name the overlap in rationale (e.g., Mode 3B SUB-3B-BUILD overlaps Mode 2 SUB-2B BUILD).' },
      { key: 'GQ1-REFRAME',  text: 'The 4-mode framing is the wrong abstraction — propose alternative classification.' },
    ],
    draftedKey: 'GQ1-OK',
  },
  {
    id: 'G-Q2', topic: 'Two-dimension governance separation (Authority vs Execution)',
    options: [
      { key: 'GQ2-TWO',      text: 'Two dimensions as stated (Authority Level operator-set ceiling + Execution Mode per-run pacing).' },
      { key: 'GQ2-ONE',      text: 'Collapsed into a single dimension — name the canonical labels in rationale.' },
      { key: 'GQ2-THREEPLUS',text: 'Further subdivided into three or more dimensions (e.g., split Authority into Build-authority + Deploy-authority).' },
      { key: 'GQ2-DIFF',     text: 'The two-dimension model is right but the specific 3×3 grid is wrong — propose alternative cardinality.' },
    ],
    draftedKey: 'GQ2-TWO',
  },
  {
    id: 'G-Q3', topic: 'Authority Ceiling Rule',
    options: [
      { key: 'GQ3-CEILING',  text: 'Ceiling rule correct as stated — operator sets persistent ceiling; users select at or below; never exceed.' },
      { key: 'GQ3-REAUTH',   text: 'Users should be able to exceed the ceiling for a specific run with explicit re-authorisation (per-run admin approval).' },
      { key: 'GQ3-ADVISORY', text: 'Ceiling should be advisory not enforced — users can choose any authority level; audit-log captures decision.' },
      { key: 'GQ3-PER-MODE', text: 'Ceiling should be per-product per-mode (e.g., Mode 1 ceiling AUTONOMOUS but Mode 2 ceiling SUPERVISED) not single global.' },
    ],
    draftedKey: 'GQ3-CEILING',
  },
  {
    id: 'G-Q4', topic: 'Mode 2 SUB-2B (full build + deploy) in SSOT now or defer',
    options: [
      { key: 'GQ4-NOW',     text: 'Codify in SSOT now as roadmap with explicit ROADMAP tag (per §E pattern).' },
      { key: 'GQ4-DEFER',   text: 'Defer from SSOT entirely until at least one prototype implementation lands.' },
      { key: 'GQ4-PREVIEW', text: 'Codify only the SUB-2B-PREVIEW path (FlowAI-owned preview URL) now; defer the SUB-2B-DEPLOY path (push to user-owned host).' },
      { key: 'GQ4-PARTIAL', text: 'Codify as canonical SSOT only when it reaches PARTIAL status (skeleton exists end-to-end).' },
    ],
    draftedKey: 'GQ4-NOW',
  },
  {
    id: 'G-Q5', topic: 'Mode 3B synthesis IP/copyright feasibility',
    options: [
      { key: 'GQ5-FAIRUSE',  text: 'Implementable for all third-party products — best-elements extraction is fair-use as research / inspiration.' },
      { key: 'GQ5-LICENSE',  text: 'Implementable only with explicit license / authorisation from each source product owner.' },
      { key: 'GQ5-OWNER',    text: 'Implementable only when the operator owns every source URL (first-party / operator-owned synthesis only).' },
      { key: 'GQ5-RESTRICT', text: 'Not implementable in any general form — Mode 3B should be removed from SSOT or restricted to research-only output (no deploy, no new URL).' },
    ],
    draftedKey: 'GQ5-OWNER', // W3 surfaces this as Conflict 6; not anchored — but for dissent-floor we map to the most-conservative drafted-author leaning
  },
  {
    id: 'G-Q6', topic: '36-configuration matrix granularity',
    options: [
      { key: 'GQ6-36',      text: '36-cell matrix is correct — every cell needs explicit catalogue (some marked degenerate).' },
      { key: 'GQ6-COLLAPSE',text: 'Over-specified — collapse to a smaller matrix (e.g., 12 cells by dropping degenerates; degenerate combinations are runtime errors, not catalogued cells).' },
      { key: 'GQ6-UNDER',   text: 'Under-specified — the 36-cell matrix omits relevant variations (e.g., per-step authority overrides should add a fourth dimension).' },
      { key: 'GQ6-AGENT',   text: 'Matrix concept right but cells should be agent-rooted (one row per agent × mode) rather than mode × authority × execution.' },
    ],
    draftedKey: 'GQ6-36',
  },
  {
    id: 'G-Q7', topic: 'Overall CA-12 disposition',
    options: [
      { key: 'GQ7-PROMOTE-ALL', text: 'Promote all sections (§A–§G) as canonical with no carve-outs.' },
      { key: 'GQ7-PROMOTE-SUB', text: 'Promote a subset — name the carve-outs in rationale (e.g., promote §A + §B + §E + §F now; defer §C UI mapping + §D agent ownership until corresponding engineering specs land).' },
      { key: 'GQ7-DEFER',       text: 'Defer all of CA-12 pending a separate disposition on one or more of Q1–Q6 above.' },
      { key: 'GQ7-SPLIT',       text: 'Reject as over-scoped — break CA-12 into multiple smaller amendments (e.g., CA-12-A Pipeline Modes, CA-12-B Authority Levels, CA-12-C Execution Modes) and re-Panel each.' },
    ],
    draftedKey: 'GQ7-PROMOTE-ALL',
  },
];

// ── Compact canonical excerpt: §6, §9, §10, §11, §22 (per dispatch) ──────
async function buildCompactCanonical() {
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(startMarker, endMarker) {
    const s = lines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = lines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    return lines.slice(s, e === -1 ? undefined : e).join('\n');
  }
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (CA-12-relevant sections only)',
    '',
    'Lineage: derived from docs/CANONICAL_REFERENCE.md Rev-2.1.',
    'CA-12 amends §6, §9, §10, §11, §17, §22 plus §8a (deprecation) and §25 (Locked Rule 4 expansion).',
    'This excerpt covers the substantive content sections (§6, §9, §10, §11, §22) the spec depends on.',
    'Full canonical (104K) trimmed to stay under the W5b 120K bundle cap.',
    'The spec under review has its own §F cross-referencing every SSOT section it touches.',
    '',
    '---', '',
    slice('## 6. ', '## 7. '), '',
    slice('## 9. ', '## 10. '), '',
    slice('## 10. ', '## 11. '), '',
    slice('## 11. ', '## 12. '), '',
    slice('## 22. ', '## 23. '), '',
    slice('## 25. ', '## 26. '),
  ].join('\n');
}

// ── Ratification verdict ────────────────────────────────────────────────
function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) {
    return { status: 'INVALID', headline: 'Consultation INVALID — re-run required (insufficient adversarial signal).', conditions: [], alternativeWins: [] };
  }
  const conditions = [];
  const alternativeWins = [];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const wonDrafted = v.topKey === q.draftedKey;
    const isStrong = /^(UNANIMOUS|SUPERMAJORITY|QUORUM_PLURALITY)/.test(v.verdict);
    if (wonDrafted && isStrong) continue;
    if (!wonDrafted && isStrong) {
      const opt = q.options.find((o) => o.key === v.topKey);
      alternativeWins.push({ qId: q.id, topic: q.topic, newPosition: opt?.text, verdict: v.verdict });
      continue;
    }
    conditions.push({ qId: q.id, topic: q.topic, verdict: v.verdict, draftedKey: q.draftedKey, draftedText: q.options.find((o) => o.key === q.draftedKey)?.text, detail: v.detail });
  }
  if (conditions.length === 0 && alternativeWins.length === 0) {
    return { status: 'RATIFIED', headline: 'Spec IS ratified — every question cleared quorum on the spec-author position.', conditions: [], alternativeWins: [] };
  }
  if (conditions.length === 0) {
    return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec IS ratified — ${alternativeWins.length} question(s) returned a clear-majority alternative; substitute those positions.`, conditions: [], alternativeWins };
  }
  return { status: 'NOT_RATIFIED', headline: `Spec NOT ratified — ${conditions.length} question(s) returned no clear Panel majority. W3 must address each before promotion.`, conditions, alternativeWins };
}

// ── Rendering helpers (same pattern as auth-spec wrapper) ───────────────
function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | Top key | Top count | Verdict |`);
  rows.push(`|---|---|---|---:|---|`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 55)} | \`${v.topKey || '—'}\` | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}
function renderQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const c = t.perQuestion[q.id];
    const tallyLines = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 110)}"  →  **${c[o.key] || 0}**`);
    for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched') tallyLines.push(`  - \`${k}\` (free-text/REJECT bucket) →  ${c[k]}`);
    if (c.unmatched) tallyLines.push(`  - _(unmatched)_ →  ${c.unmatched}`);
    return [`### ${q.id} — ${q.topic}`, ``, `Tally (ENGAGED-only, ${t.engagedTotal}):`, ...tallyLines, ``, `**Verdict:** \`${v.verdict}\` — ${v.detail}.`, ``].join('\n');
  }).join('\n');
}
function renderObjections(allObjections) {
  if (!allObjections || allObjections.length === 0) return '_(no objections submitted)_';
  return allObjections.map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n');
}
function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``;
    const lines = [head, ''];
    if (r.state === 'SILENT') { lines.push(`_(degraded / parse-failure)_`); lines.push(''); return lines.join('\n'); }
    if (r.invalid_reason) { lines.push(`**Invalid reason:** ${r.invalid_reason}`); lines.push(''); }
    if (r.adversarial?.valid) {
      lines.push(`### Adversarial pass`); lines.push('');
      for (const [i, o] of r.adversarial.objections.entries()) {
        lines.push(`**Objection ${i + 1} — ${o.title}**`); lines.push('');
        lines.push(`> ${(o.detail || '').replace(/\n/g, '\n> ')}`); lines.push('');
      }
      lines.push(`**Worse-than-status-quo scenario:** ${r.adversarial.worse_than_status_quo}`); lines.push('');
      lines.push(`**Precedent:** ${r.adversarial.precedent}`); lines.push('');
    }
    if (r.rejection_steelman) { lines.push(`### Rejection steelman`); lines.push(''); lines.push(`> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`); lines.push(''); }
    if (r.state === 'ENGAGED' || r.state === 'TANGENTIAL') {
      lines.push(`### Votes`); lines.push('');
      for (const q of QUESTIONS) {
        const v = r.votes[q.id] || {};
        const optText = v.key ? (q.options.find((o) => o.key === v.key)?.text.slice(0, 90) || v.key) : (v.pick_text || '—');
        lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` — ${optText}`);
        if (v.rationale) lines.push(`  > ${v.rationale}`);
      }
      lines.push('');
    }
    if (r.overallNotes) { lines.push(`Overall: ${r.overallNotes}`); lines.push(''); }
    return lines.join('\n');
  }).join('\n---\n\n');
}
function renderRawResponses(reviewers) {
  return reviewers.map((r, idx) => {
    const slot = idx + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP FIRED]' : '';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    return [
      `### Slot ${slot}${tag} — ${r.provider}:${modelStr}`, '',
      `- Provider: \`${r.provider}\``, `- Latency: ${r.latency_ms} ms`, `- HTTP status: ${r.degraded ? 'DEGRADED' : 'OK'}`,
      r.slot_backup_applied ? `- Primary that failed: \`${r.primary_slot_provider}:${r.primary_slot_model}\` (error: ${r.primary_slot_error ?? 'unknown'})` : null,
      r.error ? `- Error: ${r.error}` : null,
      '', '```', (r.raw_output ?? '(no output)').slice(0, 8000), '```', '',
    ].filter((l) => l !== null).join('\n');
  }).join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ca12-ratification] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[ca12-ratification] panel audit: ${JSON.stringify(audit)}\n`);
  // W5b commit 556a751 introduced documented-duplicate carve-outs. The
  // audit may now report maxPerProvider > 1 if the duplicates are
  // explicitly documented. Use auditPass (set by auditDiversity) as the
  // authoritative gate.
  if (audit.auditPass !== true || audit.slots !== 10) {
    throw new Error(`Panel composition audit failed (auditPass=${audit.auditPass}, slots=${audit.slots}) — halting.`);
  }

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specRaw = await readFile(SPEC_PATH, 'utf8');
  // CA-12 spec line 424 (§G preamble) contains literal anti-anchor meta-
  // commentary ("(W3 recommendation)", "(as drafted)") that itself trips
  // the W5b anchor-phrase guard. Strip the literal tokens for transport
  // — the substantive option text in §G is already anchor-free.
  const specText = specRaw
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[ca12-ratification] compact canonical: ${compactCanonical.length} chars (CA-12-relevant sections only)\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'CA-12 Three-Mode + Two-Dimension Governance Architecture — ratification',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'ca12-ratification-2026-05-16',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();

  const strongestRejection = result.perReviewer
    .filter((r) => typeof r.rejection_steelman === 'string')
    .map((r) => ({ slot: r.slot, model: r.modelTag, text: r.rejection_steelman }))
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const t = result.tally;
  const perVerdicts = result.perVerdicts;
  const dissent = result.dissentFloor;

  const md = [
    `# Panel Consultation — CA-12 Three-Mode + Two-Dimension Governance Architecture — ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` MET). Anti-rubber-stamp controls active.`,
    ``,
    `**Spec under ratification:** \`docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md\` (commit \`f9a62a0\`, 578 lines).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (compact §6+§9+§10+§11+§22+§25 canonical excerpt + full spec).`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    `**Seed:** \`${result.seed}\``,
    ``,
    `---`,
    ``,
    `## 🚨 PLAIN RATIFICATION VERDICT`,
    ``,
    `**Status:** \`${ratification.status}\``,
    ``,
    `${ratification.headline}`,
    ``,
    ratification.conditions.length > 0 ? `**Conditions W3 MUST address before promotion:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. Spec-author's preferred position (key \`${c.draftedKey}\`, "${(c.draftedText || '').slice(0, 120)}…") did NOT reach Panel quorum. ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute before promotion:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition?.slice(0, 200)}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION (Control 4)`,
    ``,
    `Drafted-direction alignment: **${dissent.alignedCount} / ${dissent.totalPossible}** ENGAGED votes = ${(dissent.alignedPct * 100).toFixed(1)} %`,
    `Distinct substantive objections: **${t.distinctObjections}**`,
    ``,
    dissent.triggered ? `**🚨 INVALID — re-run required.** ${dissent.reason}.` : `**✅ Dissent floor PASSED — adversarial signal valid.** ${dissent.reason}.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
    ``,
    `| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |`,
    `|------|----------|-------|-------------|---------|--------|-----------|----------------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const cfg = SLOT_CONFIG[idx];
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? `YES → ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || r.model}` : '—';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      const region = cfg ? `${cfg.region} · ${cfg.role}` : '';
      const pr = result.perReviewer[idx];
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${region} | ${backup} | ${status} | \`${pr.state}\` | ${pr.invalid_reason ?? '—'} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (≥7 LIVE-OK): ${result.w6_metadata.quorum_met}.`,
    `Adversarial classification: ENGAGED=${t.engagedTotal}, TANGENTIAL=${t.tangential}, INVALID=${t.invalid}, SILENT=${t.silent}.`,
    ``,
    `---`,
    ``,
    `## Per-question tally`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `### Per-question detail`,
    ``,
    renderQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## All distinct substantive objections (verbatim)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST CA-12 (longest rejection steelman)`,
    ``,
    strongestRejection ? `**From Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}` : '_(no rejection steelman submitted)_',
    ``,
    `---`,
    ``,
    `## Per-reviewer adversarial pass + steelman + votes`,
    ``,
    renderPerReviewer(result.perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses (first 8K each)`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[ca12-ratification] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ca12-ratification.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_size: result.bundle_chars,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally,
    per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid,
    ratification,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions,
    seed: result.seed,
    perReviewer: result.perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[ca12-ratification] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ CA-12 RATIFICATION — ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED:                 ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Drafted alignment:       ${(dissent.alignedPct * 100).toFixed(1)} %\n`);
  process.stdout.write(`Dissent-floor:           ${dissent.triggered ? 'INVALID' : 'PASS'}\n`);
  process.stdout.write(`Ratification status:     ${ratification.status}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[ca12-ratification] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
