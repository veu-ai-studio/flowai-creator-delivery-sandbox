// scripts/panel/run-auth-spec-v3-ratification.mjs
//
// W6 ADVERSARIAL Panel FINAL re-ratification — Auth-Traversal Security
// Spec v3 (commit be594e3). 4 fresh re-vote questions; 3 questions
// (G-Q1, G-Q5, G-Q2-v2) already SUPERMAJORITY-ratified in prior runs
// and carried forward verbatim — not re-voted.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'AUTH_TRAVERSAL_SECURITY_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v3-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v3-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q3-v3', topic: 'Screenshot capture in Phase 3 (Option B CEO-locked — defer screenshots to Phase 4)',
    options: [
      { key: 'GQ3v3-DEFER',  text: 'Ratify Option B — Phase 3 ships with NO screenshot capture; no scrub pipeline; no operator residual-risk-ack UI. Phase 4 re-introduces screenshots with its own design + ratification gate.' },
      { key: 'GQ3v3-V2',     text: 'Reject v3; restore v2 §6a — 9-stage scrub pipeline + default-OFF retention + operator residual-risk acknowledgment.' },
      { key: 'GQ3v3-DEV',    text: 'Different — screenshots permitted in dev/staging only, no scrub required, no retention; or other compromise.' },
    ],
    draftedKey: 'GQ3v3-DEFER',
  },
  {
    id: 'G-Q4-v3', topic: 'storageState memory-only as MUST (no encrypted-fs fallback codified in spec)',
    options: [
      { key: 'GQ4v3-MUST',   text: 'Ratify v3 MUST — memory-only is mandatory; no encrypted-fs fallback codified; shipping a filesystem-fallback path is non-conformant with this spec regardless of operational pressure.' },
      { key: 'GQ4v3-HEDGE',  text: 'Reject v3 MUST; restore v2 hedge language ("memory-only with optional encrypted-fs fallback if memory pressure becomes a concern").' },
      { key: 'GQ4v3-MONITOR',text: 'Ratify MUST but require Phase 3 to ship a memory-pressure monitor with hard failure semantics — run fails loud rather than silently spilling to disk.' },
      { key: 'GQ4v3-OTHER',  text: 'Different — specify in rationale.' },
    ],
    draftedKey: 'GQ4v3-MUST',
  },
  {
    id: 'G-Q6-v3', topic: 'Destructive-action gate i18n denylist floor (v3 expansion 6 → 9 languages: +ja, +ko, +ar)',
    options: [
      { key: 'GQ6v3-9',     text: 'Ratify v3 floor of 9 (en/es/fr/pt/de/zh-CN/ja/ko/ar) with 9-language test coverage commitment.' },
      { key: 'GQ6v3-6',     text: 'Reject v3; restore v2 6-language floor (per-product opt-in handles ja/ko/ar).' },
      { key: 'GQ6v3-MORE',  text: 'Require additional languages in v3 floor before Phase 3 ships — specify (e.g. hi, ru, vi must also be in floor).' },
      { key: 'GQ6v3-OTHER', text: 'Different — specify in rationale.' },
    ],
    draftedKey: 'GQ6v3-9',
  },
  {
    id: 'G-Q7-v3', topic: 'Audit retention for credentialed runs (v3: 90 days hot + 1 year cold)',
    options: [
      { key: 'GQ7v3-90-1', text: 'Ratify v3 retention — 90 days hot + 1 year cold (triples hot window vs v2; restores non-zero cold trail).' },
      { key: 'GQ7v3-30-0', text: 'Reject v3; restore v2 short retention (30 hot + 0 cold).' },
      { key: 'GQ7v3-STD',  text: 'Reject v3; restore CA-10-E canonical retention (365 hot + 7yr cold) for credentialed-run entries too.' },
      { key: 'GQ7v3-OTHER',text: 'Different — specify in rationale (e.g. 90 hot + shorter cold, 365 hot + 1yr cold, or other hybrid).' },
    ],
    draftedKey: 'GQ7v3-90-1',
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
    '# FlowAI SSOT — COMPACT EXCERPT (auth-spec v3 relevant sections only)',
    '',
    'Sections: §6 (Crawl Contract — line 110), §13 (Auth + Role Model),',
    '§14 (GovernanceAuditLog), §22 (Product-Agnostic Rule), §25 (Locked Rules).',
    'Trimmed to stay under W5b 120K bundle cap.',
    '',
    '---', '',
    slice('## 6. ', '## 7. '), '',
    slice('## 13. ', '## 14. '), '',
    slice('## 14. ', '## 15. '), '',
    slice('## 22. ', '## 23. '), '',
    slice('## 25. ', '## 26. '),
  ].join('\n');
}

function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) {
    return { status: 'INVALID', headline: 'Consultation INVALID — re-run required.', conditions: [], alternativeWins: [] };
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
    return { status: 'RATIFIED', headline: 'Spec v3 IS ratified — Phase 3 may proceed. All 4 re-vote questions cleared on v3 position; G-Q1/G-Q5/G-Q2-v2 carry forward from prior supermajority verdicts.', conditions: [], alternativeWins: [] };
  }
  if (conditions.length === 0) {
    return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec v3 IS ratified — Phase 3 may proceed with ${alternativeWins.length} position substitution(s).`, conditions: [], alternativeWins };
  }
  return { status: 'NOT_RATIFIED', headline: `Spec v3 NOT ratified — ${conditions.length} question(s) still lack a clear Panel majority.`, conditions, alternativeWins };
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
  process.stdout.write(`[auth-spec-v3] started ${startedAt}\n`);
  const audit = auditDiversity();
  process.stdout.write(`[auth-spec-v3] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[auth-spec-v3] compact canonical: ${compactCanonical.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Auth-traversal security spec v3 — FINAL re-ratification (4 questions)',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'auth-spec-v3-ratification-2026-05-16',
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
    `# Panel Consultation — Auth-Traversal Security Spec v3 — FINAL ADVERSARIAL RE-RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` MET).`,
    ``,
    `**Spec under final re-ratification:** \`docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md\` (v3, commit \`be594e3\`, 655 lines).`,
    ``,
    `**Carried questions from prior runs (NOT re-voted):**`,
    `  - G-Q1 ✅ SUPERMAJORITY_REFUSE 8/9 (v1, commit \`556a751\`) — cross-origin refused entirely`,
    `  - G-Q5 ✅ SUPERMAJORITY_STRICT 8/9 (v1, commit \`556a751\`) — strict same-origin subdomain default`,
    `  - G-Q2-v2 ✅ SUPERMAJORITY_LOUD 8/9 (v2, commit \`80682558\`) — MFA fail-loud`,
    ``,
    `**Re-vote questions in this run (4):** G-Q3-v3 (screenshots Option B defer), G-Q4-v3 (memory-only MUST), G-Q6-v3 (9-language i18n floor), G-Q7-v3 (90d hot + 1yr cold retention).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (compact §6+§13+§14+§22+§25 canonical excerpt + full v3 spec).`,
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
    ratification.conditions.length > 0 ? `**Remaining conditions:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. v3 position (\`${c.draftedKey}\`) did NOT reach Panel quorum. ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition?.slice(0, 200)}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    ratification.status === 'RATIFIED' ? `**GO PHASE 3:** All 4 re-vote questions cleared quorum-or-better on the v3-drafted position. Combined with G-Q1 + G-Q5 + G-Q2-v2 carry-forward supermajorities, the complete auth-traversal security spec is now Panel-ratified. Phase 3 implementation may proceed per the spec's §13 engineering scope.` : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION`,
    ``,
    `Drafted alignment across 4 re-vote questions:`,
    `  Aligned: **${dissent.alignedCount} of ${dissent.totalPossible}** = ${(dissent.alignedPct * 100).toFixed(1)}%`,
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
    `## Strongest single argument AGAINST v3 spec`,
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
  process.stdout.write(`[auth-spec-v3] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'auth-spec-v3-ratification.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit, panel_size: PANEL.length, bundle_size: result.bundle_chars, liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid, ratification,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions, seed: result.seed,
    perReviewer: result.perReviewer, questions: QUESTIONS,
    carried_from_prior_runs: [
      { qId: 'G-Q1', verdict: 'SUPERMAJORITY_GQ1-REFUSE 8/9', source_commit: '556a751' },
      { qId: 'G-Q5', verdict: 'SUPERMAJORITY_GQ5-STRICT 8/9', source_commit: '556a751' },
      { qId: 'G-Q2-v2', verdict: 'SUPERMAJORITY_GQ2v2-LOUD 8/9', source_commit: '80682558' },
    ],
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[auth-spec-v3] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ AUTH SPEC v3 — FINAL ADVERSARIAL SUMMARY ═══════\n');
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
  process.stdout.write('═════════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[auth-spec-v3] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
