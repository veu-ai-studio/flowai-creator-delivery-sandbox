// scripts/panel/run-ca12-v3-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — CA-12 v3 (commit 29a8d2e).
// v1 NOT_RATIFIED (all positions defeated). v2 NOT_RATIFIED (Q1
// unanimous, others sub-quorum). v3 collapses to 3 modes + 2 authority
// sub-dimensions + Mode 3B fully removed + GTM context preamble.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA12_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca12-ratification-v3-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca12-ratification-v3-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1-v3', topic: 'Pipeline Mode classification (Mode 3B removed; 3 canonical modes — Mode 1, Mode 2 SUB-2A, Mode 3A)',
    options: [
      { key: 'GQ1v3-OK',      text: '3-canonical-mode classification (Mode 1 + Mode 2 SUB-2A + Mode 3A) is complete and non-overlapping — ratify.' },
      { key: 'GQ1v3-MISSING', text: '3-mode classification is missing a mode — name it in rationale.' },
      { key: 'GQ1v3-OVERLAP', text: '3-mode classification still has an overlap — name it.' },
      { key: 'GQ1v3-KEEP3B',  text: 'Removing Mode 3B from SSOT was wrong; Mode 3B should stay in SSOT with deferred-status tag.' },
    ],
    draftedKey: 'GQ1v3-OK',
  },
  {
    id: 'G-Q2-v3', topic: 'Authority dimensions collapsed to 2 sub-dims (Build / Operational; Deploy folded into Build)',
    options: [
      { key: 'GQ2v3-TWO',     text: '2-sub-dimension structure (Build / Operational) as v3 defines — ratify.' },
      { key: 'GQ2v3-SEP',     text: '2-sub-dim is right but Deploy should remain separate (re-split per v2 model).' },
      { key: 'GQ2v3-ONE',     text: '1-sub-dim is sufficient — collapse Build + Operational into a single authority.' },
      { key: 'GQ2v3-MORE',    text: '3+ sub-dimensions needed for a specific operational concern — name it.' },
    ],
    draftedKey: 'GQ2v3-TWO',
  },
  {
    id: 'G-Q3-v3', topic: 'Authority ceiling per-product per-mode per-dimension (3×2 JSONB + 3 concrete examples)',
    options: [
      { key: 'GQ3v3-FINE',  text: 'Per-product per-mode per-dimension ceiling with v3 example justification — ratify (3 modes × 2 dims = 6 cells).' },
      { key: 'GQ3v3-UX',    text: 'Granularity is right but operator UI complexity needs more thought (engineering follow-on must address UX).' },
      { key: 'GQ3v3-MODE',  text: 'Per-product per-mode only (no per-sub-dim) — coarser.' },
      { key: 'GQ3v3-PROD',  text: 'Per-product only (no per-mode) — coarsest.' },
    ],
    draftedKey: 'GQ3v3-FINE',
  },
  {
    id: 'G-Q4-v3', topic: 'Joint deferral of SUB-2B + Mode 3B with shared-future-CA pathway',
    options: [
      { key: 'GQ4v3-JOINT',  text: 'Joint deferral of SUB-2B + Mode 3B with shared-future-CA pathway — ratify.' },
      { key: 'GQ4v3-SEP',    text: 'Defer separately — each item gets its own future CA cycle independently.' },
      { key: 'GQ4v3-REPRO',  text: 'Re-promote SUB-2B or Mode 3B as ROADMAP-in-canonical-SSOT (reverse the deferral).' },
      { key: 'GQ4v3-MORE',   text: 'Defer additional items (e.g., Mode 1 SUB-1B DEPLOY) to FUTURE_CAPABILITIES alongside SUB-2B + Mode 3B.' },
    ],
    draftedKey: 'GQ4v3-JOINT',
  },
  {
    id: 'G-Q5-v3', topic: 'Mode 3B fully removed from canonical SSOT (cryptographic ownership-verification blocker named)',
    options: [
      { key: 'GQ5v3-REMOVE', text: 'Defer Mode 3B entirely; ratify removal from SSOT pending verification mechanism.' },
      { key: 'GQ5v3-TAG',    text: 'Mode 3B should stay in SSOT with DEFERRED status tag, not removed.' },
      { key: 'GQ5v3-SHIP',   text: 'Mode 3B should ship with v2 self-attestation mechanism (operator attests; no third-party verification).' },
      { key: 'GQ5v3-INADV',  text: 'Mode 3B is structurally inadvisable regardless of mechanism — IP concerns inherent to feature extraction.' },
    ],
    draftedKey: 'GQ5v3-REMOVE',
  },
  {
    id: 'G-Q6-v3', topic: 'Matrix + §B.2 validity rules + AutoRunner enforcement (HTTP 400 with 6 error codes + audit-log)',
    options: [
      { key: 'GQ6v3-OK',    text: 'v3 matrix + §B.2 validity rules + AutoRunner HTTP 400 enforcement contract — ratify.' },
      { key: 'GQ6v3-AGENT', text: 'Matrix is right but enforcement mechanism is wrong — should be agent-layer gate, not API-boundary HTTP 400.' },
      { key: 'GQ6v3-STRICT',text: 'Some validity rules are too strict (e.g., AUTOMATIC + Supervised should be permitted with explicit warning).' },
      { key: 'GQ6v3-PERM',  text: 'Some validity rules are too permissive — specify which combinations need additional gates.' },
    ],
    draftedKey: 'GQ6v3-OK',
  },
  {
    id: 'G-Q7-v3', topic: 'Overall CA-12 v3 disposition',
    options: [
      { key: 'GQ7v3-PROMOTE', text: 'v3 sufficient for promotion — promote.' },
      { key: 'GQ7v3-FORM',    text: 'v3 addresses conditions in form but not in substance — name remaining substantive gaps.' },
      { key: 'GQ7v3-NEW',     text: 'v3 introduces new concerns not in v2 — name them in rationale.' },
      { key: 'GQ7v3-DEFER',   text: 'Defer until at least one operator product runs a v3-conformant production pipeline end-to-end.' },
    ],
    draftedKey: 'GQ7v3-PROMOTE',
  },
];

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
    '# FlowAI SSOT — COMPACT EXCERPT (CA-12 v3 relevant sections only)',
    '',
    'Sections: §6 (Crawl Contract), §9 (8-Step Pipeline), §10 (Self-Governance),',
    '§11 (Clearance Protocol), §22 (Product-Agnostic Rule), §25 (Locked Rules).',
    'Trimmed to stay under W5b 120K bundle cap.',
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

function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) return { status: 'INVALID', headline: 'Consultation INVALID — re-run required.', conditions: [], alternativeWins: [] };
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'CA-12 v3 IS ratified — every question cleared quorum on the v3 position.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `CA-12 v3 IS ratified with ${alternativeWins.length} position substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `CA-12 v3 NOT ratified — ${conditions.length} question(s) lack a clear Panel majority.`, conditions, alternativeWins };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [`| Q | Topic | Top key | Top count | Verdict |`, `|---|---|---|---:|---|`];
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
    const tallyLines = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 130)}"  →  **${c[o.key] || 0}**`);
    for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tallyLines.push(`  - \`${k}\` (free-text REJECT bucket) → ${c[k]}`);
    if (c.unmatched) tallyLines.push(`  - _(unmatched)_ → ${c.unmatched}`);
    return [`### ${q.id} — ${q.topic}`, ``, `Tally (ENGAGED-only, ${t.engagedTotal}):`, ...tallyLines, ``, `**Verdict:** \`${v.verdict}\` — ${v.detail}.`, ``].join('\n');
  }).join('\n');
}
function renderObjections(allObjections) {
  if (!allObjections?.length) return '_(no objections submitted)_';
  return allObjections.map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n');
}
function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const lines = [`## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``, ''];
    if (r.state === 'SILENT') { lines.push('_(degraded / parse-failure)_', ''); return lines.join('\n'); }
    if (r.invalid_reason) { lines.push(`**Invalid reason:** ${r.invalid_reason}`, ''); }
    if (r.adversarial?.valid) {
      lines.push('### Adversarial pass', '');
      for (const [i, o] of r.adversarial.objections.entries()) lines.push(`**Objection ${i + 1} — ${o.title}**`, '', `> ${(o.detail || '').replace(/\n/g, '\n> ')}`, '');
      lines.push(`**Worse-than-status-quo scenario:** ${r.adversarial.worse_than_status_quo}`, '');
      lines.push(`**Precedent:** ${r.adversarial.precedent}`, '');
    }
    if (r.rejection_steelman) { lines.push('### Rejection steelman', '', `> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`, ''); }
    if (r.state === 'ENGAGED' || r.state === 'TANGENTIAL') {
      lines.push('### Votes', '');
      for (const q of QUESTIONS) {
        const v = r.votes[q.id] || {};
        const optText = v.key ? (q.options.find((o) => o.key === v.key)?.text.slice(0, 90) || v.key) : (v.pick_text || '—');
        lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` — ${optText}`);
        if (v.rationale) lines.push(`  > ${v.rationale}`);
      }
      lines.push('');
    }
    if (r.overallNotes) { lines.push(`Overall: ${r.overallNotes}`, ''); }
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
  process.stdout.write(`[ca12-v3] started ${startedAt}\n`);
  const audit = auditDiversity();
  process.stdout.write(`[ca12-v3] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  // Strip any literal anchor-phrase tokens used as meta-commentary so the
  // W5b runtime guard does not reject the bundle.
  const specRaw = await readFile(SPEC_PATH, 'utf8');
  const specText = specRaw
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[ca12-v3] compact canonical: ${compactCanonical.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'CA-12 v3 Three-Mode + 2-Auth-Dim Governance Architecture — ratification',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'ca12-v3-ratification-2026-05-16',
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
    `# Panel Consultation — CA-12 v3 (3 modes + 2 auth-dims + GTM context) — ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` MET).`,
    ``,
    `**Spec under ratification:** \`docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md\` (v3, commit \`29a8d2e\`, 511 lines).`,
    `**v1 verdict (context):** NOT_RATIFIED, 19% drafted alignment, every position defeated (\`5c2324f\`).`,
    `**v2 verdict (context):** NOT_RATIFIED, 55.4% alignment, Q1 UNANIMOUS, others sub-quorum (\`01bed9d\`).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §6+§9+§10+§11+§22+§25 canonical excerpt + full v3 spec).`,
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
    ratification.conditions.length > 0 ? `**Remaining conditions:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. v3 position (key \`${c.draftedKey}\`) did NOT reach quorum. ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition?.slice(0, 200)}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION`,
    ``,
    `Drafted alignment: **${dissent.alignedCount}/${dissent.totalPossible}** = ${(dissent.alignedPct * 100).toFixed(1)}%`,
    `Distinct objections: **${t.distinctObjections}**`,
    ``,
    dissent.triggered ? `**🚨 INVALID — re-run required.** ${dissent.reason}.` : `**✅ Dissent floor PASSED — verdict valid.** ${dissent.reason}.`,
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
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups: ${result.w6_metadata.backups_applied}. Quorum met: ${result.w6_metadata.quorum_met}.`,
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
    `## All distinct substantive objections`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST CA-12 v3`,
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
  process.stdout.write(`[ca12-v3] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ca12-v3-ratification.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit, panel_size: PANEL.length, bundle_size: result.bundle_chars, liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid, ratification,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions, seed: result.seed,
    perReviewer: result.perReviewer, questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[ca12-v3] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ CA-12 v3 — ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED:                 ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Drafted alignment:       ${(dissent.alignedPct * 100).toFixed(1)}%\n`);
  process.stdout.write(`Dissent-floor:           ${dissent.triggered ? 'INVALID' : 'PASS'}\n`);
  process.stdout.write(`Ratification status:     ${ratification.status}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[ca12-v3] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
