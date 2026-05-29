// scripts/panel/run-auth-spec-v2-ratification.mjs
//
// W6 ADVERSARIAL Panel RE-ratification — Phase 2 Auth-Traversal Security
// Spec v2 (commit b782e2f, 784 lines). 5 NOT_RATIFIED v1 questions
// (G-Q2, G-Q3, G-Q4, G-Q6, G-Q7) have revised v2 positions to ratify.
// G-Q1 + G-Q5 were SUPERMAJORITY-ratified in v1 (commit 556a751) and
// are unchanged in v2 — not re-voted.

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

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'AUTH_TRAVERSAL_SECURITY_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v2-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-v2-2026-05-16.sidecar.json');

// 5 re-vote questions from §12 of v2 spec verbatim. G-Q1 + G-Q5 omitted
// because they SUPERMAJORITY-ratified in v1 (commit 556a751) and v2 is
// unchanged on those positions.
const QUESTIONS = [
  {
    id: 'G-Q2-v2', topic: 'MFA handling (v2 fail-loud adopted per CEO + v1 plurality intent)',
    options: [
      { key: 'GQ2v2-LOUD',   text: 'Ratify v2 fail-loud — MFA challenge returns ok:false with authFailureReason:"mfa_required"; run STOPS; no continue-unauthenticated path.' },
      { key: 'GQ2v2-V1',     text: 'Reject v2 fail-loud; revert to v1 "continue unauthenticated" silent path (the previously rejected position).' },
      { key: 'GQ2v2-CONFIG', text: 'Configurable per run — operator picks fail-loud vs continue-unauth at launch.' },
      { key: 'GQ2v2-OTHER',  text: 'Different — describe in rationale.' },
    ],
    draftedKey: 'GQ2v2-LOUD',
  },
  {
    id: 'G-Q3-v2', topic: 'Screenshot scrub pipeline + residual-risk disclosure + default-OFF retention (new §6a)',
    options: [
      { key: 'GQ3v2-PIPE',  text: 'Ratify v2 §6a — 9-stage scrub-then-redact-then-verify pipeline, default-OFF retention, operator acknowledges residual risk; DISCARD-on-scrub-failure.' },
      { key: 'GQ3v2-NOPNG', text: 'Reject v2; revert to v1 GQ3-NO-PNG (Phase 3 ships with NO screenshot retention at all).' },
      { key: 'GQ3v2-ADMIN', text: 'Ratify scrub pipeline but harden default — default-OFF AND admin-role-only enable (operator cannot self-enable even in dev/staging).' },
      { key: 'GQ3v2-OTHER', text: 'Different — describe in rationale (e.g. additional detection patterns required; specific residual-risk language change).' },
    ],
    draftedKey: 'GQ3v2-PIPE',
  },
  {
    id: 'G-Q4-v2', topic: 'storageState memory-only (v2 mandates Playwright in-memory return; eliminates filesystem path)',
    options: [
      { key: 'GQ4v2-MEM',   text: 'Ratify v2 memory-only — eliminates the v1 fs path + cleanup-verification race entirely; Playwright `context.storageState()` returns object only.' },
      { key: 'GQ4v2-FS',    text: 'Reject v2 memory-only; reinstate v1 filesystem path with cleanup-verification fix.' },
      { key: 'GQ4v2-FB',    text: 'Accept memory-only as primary; allow opt-in encrypted-fs fallback if memory pressure becomes a Phase 3 concern (per-run flag, admin-only).' },
      { key: 'GQ4v2-OTHER', text: 'Different — describe in rationale.' },
    ],
    draftedKey: 'GQ4v2-MEM',
  },
  {
    id: 'G-Q6-v2', topic: 'Destructive-action gate: hybrid allowlist + i18n-aware denylist in 6 languages',
    options: [
      { key: 'GQ6v2-HYBRID', text: 'Ratify v2 hybrid + 6 languages (en, es, fr, pt, de, zh-CN): explicit data-crawl-safe="true" allowlist (highest priority) + form-submit denylist + i18n-aware destructive denylist.' },
      { key: 'GQ6v2-MORE',   text: 'Ratify hybrid but require additional language families in floor — specify which (e.g. ja, ko, ar must be in Phase 3 floor too).' },
      { key: 'GQ6v2-ALLOW',  text: 'Ratify hybrid but require allowlist-only path — only data-crawl-safe="true" is clickable; accept dramatic loss of click-everything coverage for zero false negatives.' },
      { key: 'GQ6v2-OTHER',  text: 'Different — describe in rationale.' },
    ],
    draftedKey: 'GQ6v2-HYBRID',
  },
  {
    id: 'G-Q7-v2', topic: 'Audit retention for credentialed runs: auth_short class (30 hot, 0 cold)',
    options: [
      { key: 'GQ7v2-SHORT',  text: 'Ratify v2 short-retention as proposed — retentionClass:"auth_short" = 30 days hot, NO cold storage.' },
      { key: 'GQ7v2-STD',    text: 'Reject v2 short-retention; revert to v1 standard (365 hot + 7yr cold).' },
      { key: 'GQ7v2-MID',    text: 'Compromise — shorter cold (e.g. 90 days hot + 1yr cold) rather than no cold at all.' },
      { key: 'GQ7v2-OTHER',  text: 'Different — describe in rationale.' },
    ],
    draftedKey: 'GQ7v2-SHORT',
  },
];

// Compact canonical excerpt covering §6 + §13 + §14 + §22 + §25 (auth-
// spec dependencies; same pattern as the v1 run).
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
    '# FlowAI SSOT — COMPACT EXCERPT (auth-spec v2 relevant sections only)',
    '',
    'Lineage: derived from docs/CANONICAL_REFERENCE.md Rev-2.1.',
    'Full canonical (104K) trimmed to stay under the W5b 120K bundle cap.',
    'Sections: §6 (Crawl Contract — line 110 anchor), §13 (Auth + Role Model),',
    '§14 (GovernanceAuditLog), §22 (Product-Agnostic Rule), §25 (Locked Rules).',
    'The spec under review has its own §14 cross-referencing canonical sections.',
    '',
    '---', '',
    slice('## 6. ', '## 7. '), '',
    slice('## 13. ', '## 14. '), '',
    slice('## 14. ', '## 15. '), '',
    slice('## 22. ', '## 23. '), '',
    slice('## 25. ', '## 26. '),
  ].join('\n');
}

// Ratification verdict (treat any quorum-or-better win on the v2-drafted
// position as the question being ratified).
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
    return { status: 'RATIFIED', headline: 'Spec v2 IS ratified — Phase 3 may proceed (every re-vote question cleared quorum on the v2-drafted position; G-Q1 + G-Q5 carried supermajority from v1).', conditions: [], alternativeWins: [] };
  }
  if (conditions.length === 0) {
    return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec v2 IS ratified — Phase 3 may proceed, BUT ${alternativeWins.length} question(s) returned a clear-majority alternative; substitute those positions before writing Phase 3 code.`, conditions: [], alternativeWins };
  }
  return { status: 'NOT_RATIFIED', headline: `Spec v2 NOT ratified — ${conditions.length} re-vote question(s) still lack a clear Panel majority. W5a must address each before Phase 3 may proceed.`, conditions, alternativeWins };
}

// Rendering (same pattern as v1 auth-spec wrapper)
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
    const tallyLines = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 130)}"  →  **${c[o.key] || 0}**`);
    for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tallyLines.push(`  - \`${k}\` (free-text REJECT bucket) → ${c[k]}`);
    if (c.unmatched) tallyLines.push(`  - _(unmatched)_ → ${c.unmatched}`);
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
  process.stdout.write(`[auth-spec-v2] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[auth-spec-v2] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error(`Panel audit failed (auditPass=${audit.auditPass}, slots=${audit.slots}) — halting.`);

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[auth-spec-v2] compact canonical: ${compactCanonical.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Phase 2 auth-traversal security spec v2 — HARD GATE 2 re-ratification',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'auth-spec-v2-ratification-2026-05-16',
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
    `# Panel Consultation — Phase 2 Auth-Traversal Security Spec v2 — ADVERSARIAL RE-RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` MET).`,
    ``,
    `**Spec under re-ratification:** \`docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md\` (v2, commit \`b782e2f\`, 784 lines).`,
    ``,
    `**Carried questions from v1 (NOT re-voted):** G-Q1 SUPERMAJORITY_GQ1-REFUSE (8/9), G-Q5 SUPERMAJORITY_GQ5-STRICT (8/9). v2 keeps both verbatim.`,
    ``,
    `**Re-vote questions in this run:** 5 (G-Q2-v2, G-Q3-v2, G-Q4-v2, G-Q6-v2, G-Q7-v2) — the 5 questions that did not clear quorum in v1.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (compact §6+§13+§14+§22+§25 canonical excerpt + full v2 spec).`,
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
    ratification.conditions.length > 0 ? `**Re-vote conditions still outstanding:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. v2 spec position (key \`${c.draftedKey}\`, "${(c.draftedText || '').slice(0, 140)}…") did NOT reach Panel quorum. ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute before Phase 3:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition?.slice(0, 200)}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION (Control 4)`,
    ``,
    `Drafted-direction alignment across 5 re-vote questions:`,
    `  Aligned: **${dissent.alignedCount} of ${dissent.totalPossible}** ENGAGED votes  (${(dissent.alignedPct * 100).toFixed(1)} %)`,
    `  Distinct substantive objections: **${t.distinctObjections}**`,
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
    `## Strongest single argument AGAINST v2 spec (longest rejection steelman)`,
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
  process.stdout.write(`[auth-spec-v2] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'auth-spec-v2-ratification.sidecar.v1',
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
    v1_carried: [
      { qId: 'G-Q1', verdict: 'SUPERMAJORITY_GQ1-REFUSE (8/9 in v1)', source_commit: '556a751' },
      { qId: 'G-Q5', verdict: 'SUPERMAJORITY_GQ5-STRICT (8/9 in v1)', source_commit: '556a751' },
    ],
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[auth-spec-v2] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ AUTH SPEC v2 — ADVERSARIAL SUMMARY ═══════\n');
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
  process.stdout.write('═══════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[auth-spec-v2] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
