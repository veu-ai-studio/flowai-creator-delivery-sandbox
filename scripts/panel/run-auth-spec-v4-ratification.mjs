// scripts/panel/run-auth-spec-v4-ratification.mjs
//
// W6 ADVERSARIAL Panel FINAL re-ratification — Auth-Traversal Security
// Spec v4 (commit 27fb46b). 3 fresh re-vote questions; 4 questions
// (G-Q1, G-Q5, G-Q2-v2, G-Q3-v3) already supermajority/quorum-ratified
// in prior runs and carried forward verbatim — not re-voted.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v4-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v4-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q4-v4', topic: 'storageState memory-only MUST + memory-pressure monitor with hard-fail (no filesystem fallback)',
    options: [
      { key: 'GQ4v4-OK',       text: 'Ratify v4 — memory-only MUST + memory-pressure monitor with hard-fail (process.memoryUsage() threshold at 80% of heapTotal; breach → ok:false reason:"memory_pressure_abort"; NEVER triggers filesystem fallback).' },
      { key: 'GQ4v4-NOMON',    text: 'Reject v4; restore v3 memory-only MUST WITHOUT the explicit monitor (trust runtime defaults rather than codify a monitor as Phase-3 must-ship).' },
      { key: 'GQ4v4-THRESH',   text: 'Ratify MUST + monitor but raise or lower the default threshold from 80% — specify the alternative in rationale.' },
      { key: 'GQ4v4-OTHER',    text: 'Different — specify in rationale.' },
    ],
    draftedKey: 'GQ4v4-OK',
  },
  {
    id: 'G-Q6-v4', topic: 'i18n denylist 9-language floor + denylist-registry PR expansion path (no Panel re-ratification for additions beyond 9)',
    options: [
      { key: 'GQ6v4-OK',     text: 'Ratify v4 — 9-language floor + denylist-registry PR path + W5a merge gate + native-speaker attestation + no Panel re-ratification for additions beyond 9.' },
      { key: 'GQ6v4-PANEL',  text: 'Ratify floor but require Panel re-ratification for each language addition beyond 9 (heavier review, slower expansion).' },
      { key: 'GQ6v4-BROAD',  text: 'Ratify floor but require broader-than-W5a review for each addition (e.g. Panel sub-quorum sign-off OR product-owner sign-off in addition to W5a).' },
      { key: 'GQ6v4-OTHER',  text: 'Different — specify in rationale.' },
    ],
    draftedKey: 'GQ6v4-OK',
  },
  {
    id: 'G-Q7-v4', topic: 'Audit retention 90 days hot + 1 year cold + §5.4 rationale (quarterly-review + annual-audit + minimised-liability)',
    options: [
      { key: 'GQ7v4-OK',    text: 'Ratify v4 — 90 hot + 1yr cold + §5.4 rationale anchoring quarterly-review + annual-audit + minimised-liability triangulation.' },
      { key: 'GQ7v4-V2',    text: 'Reject v4; restore v2 short retention (30 hot + 0 cold) — the rationale does not justify the cold-store liability window.' },
      { key: 'GQ7v4-STD',   text: 'Reject v4; restore CA-10-E canonical retention (365 hot + 7yr cold) — the "shorter than standard" intent is not compelling enough to diverge.' },
      { key: 'GQ7v4-OTHER', text: 'Different — specify (e.g. 90 hot + 6-month cold; or 180 hot + 1yr cold; or other hybrid).' },
    ],
    draftedKey: 'GQ7v4-OK',
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
    '# FlowAI SSOT — COMPACT EXCERPT (auth-spec v4 relevant sections only)',
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
  if (conditions.length === 0 && alternativeWins.length === 0) {
    return { status: 'RATIFIED', headline: 'Spec v4 IS ratified — Phase 3 may proceed. All 3 re-vote questions cleared on v4-drafted position; 4 prior questions carry forward.', conditions: [], alternativeWins: [] };
  }
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec v4 IS ratified — Phase 3 may proceed with ${alternativeWins.length} position substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `Spec v4 NOT ratified — ${conditions.length} re-vote question(s) still lack clear Panel majority.`, conditions, alternativeWins };
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
  process.stdout.write(`[auth-spec-v4] started ${startedAt}\n`);
  const audit = auditDiversity();
  process.stdout.write(`[auth-spec-v4] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[auth-spec-v4] compact canonical: ${compactCanonical.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Auth-traversal security spec v4 — FINAL re-ratification (3 questions)',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'auth-spec-v4-ratification-2026-05-16',
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
    `# Panel Consultation — Auth-Traversal Security Spec v4 — FINAL ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` MET).`,
    ``,
    `**Spec under final ratification:** \`docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md\` (v4, commit \`27fb46b\`, 668 lines).`,
    ``,
    `**Carried questions from prior runs (NOT re-voted):**`,
    `  - G-Q1 ✅ SUPERMAJORITY_REFUSE 8/9 (v1, commit \`556a751\`) — cross-origin refused entirely`,
    `  - G-Q5 ✅ SUPERMAJORITY_STRICT 8/9 (v1, commit \`556a751\`) — strict same-origin subdomains`,
    `  - G-Q2-v2 ✅ SUPERMAJORITY_LOUD 8/9 (v2, commit \`80682558\`) — MFA fail-loud`,
    `  - G-Q3-v3 ✅ QUORUM_PLURALITY_DEFER 7/9 (v3, commit \`e0c1e1d\`) — screenshots deferred to Phase 4`,
    ``,
    `**Re-vote questions this run (3 condition-closers):**`,
    `  - G-Q4-v4 — memory-only MUST + memory-pressure monitor with hard-fail`,
    `  - G-Q6-v4 — 9-language denylist floor + registry-PR expansion path`,
    `  - G-Q7-v4 — 90 hot + 1yr cold retention + §5.4 rationale`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (compact §6+§13+§14+§22+§25 canonical excerpt + full v4 spec).`,
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
    ratification.conditions.length > 0 ? `**Remaining conditions:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. v4 position (\`${c.draftedKey}\`) did NOT reach quorum. ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition?.slice(0, 200)}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    ratification.status === 'RATIFIED' ? `**GO PHASE 3:** All 3 re-vote questions cleared on the v4 position. Combined with G-Q1 + G-Q5 + G-Q2-v2 + G-Q3-v3 carry-forwards, the complete auth-traversal security spec is now Panel-ratified end-to-end. Phase 3 implementation may proceed per the spec's §13 engineering scope.` : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION`,
    ``,
    `Drafted alignment across 3 re-vote questions: **${dissent.alignedCount} / ${dissent.totalPossible}** = ${(dissent.alignedPct * 100).toFixed(1)}%`,
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
    `## All distinct substantive objections (verbatim)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST v4 spec`,
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
  process.stdout.write(`[auth-spec-v4] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'auth-spec-v4-ratification.sidecar.v1',
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
      { qId: 'G-Q3-v3', verdict: 'QUORUM_PLURALITY_GQ3v3-DEFER 7/9', source_commit: 'e0c1e1d' },
    ],
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[auth-spec-v4] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ AUTH SPEC v4 — FINAL ADVERSARIAL SUMMARY ═══════\n');
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

main().catch((e) => { process.stderr.write(`[auth-spec-v4] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
