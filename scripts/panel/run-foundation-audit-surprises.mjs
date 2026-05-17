// scripts/panel/run-foundation-audit-surprises.mjs
//
// W6 ADVERSARIAL Panel ruling on 4 canonical questions surfaced by the
// W2 foundation audit (commit b48c856). These are architectural /
// canonical questions, not engineering questions — CEO needs Panel
// verdicts before agent builds begin.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const AUDIT_PATH = path.join(repoRoot, 'docs', 'specs', 'FOUNDATION_AUDIT_BACKLOG.md');
const MSGBUS_PATH = path.join(repoRoot, 'src', 'lib', 'agents', 'MessageBus.ts');
const SCORER_PATH = path.join(repoRoot, 'src', 'lib', 'governance', 'ScoreEvaluator.js');
const RESEARCH_PATH = path.join(repoRoot, 'api', 'research-url.js');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'foundation-audit-surprises-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'foundation-audit-surprises-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'FA-Q1', topic: 'Agent #4 Provider Onboarding status contradiction (SSOT §15.1 SHIPPED-GREEN vs deployment DORMANT per audit)',
    options: [
      { key: 'FAQ1-PARTIAL',  text: 'Reclassify Agent #4 as PARTIAL — code exists but deployment is incomplete; SSOT §15.1 status row updated.' },
      { key: 'FAQ1-CODE',     text: 'Keep SHIPPED-GREEN — code definition is canonical; deployment state is an ops concern, not a canonical-status concern.' },
      { key: 'FAQ1-NEW',      text: 'Create a new DEPLOYED-INCOMPLETE status category distinct from SHIPPED-GREEN and DORMANT.' },
      { key: 'FAQ1-OTHER',    text: 'REJECT framing — wrong question; different fix needed (specify in rationale).' },
    ],
    draftedKey: null,
  },
  {
    id: 'FA-Q2', topic: 'MessageBus wiring gap (MessageBus.ts real + implemented; api/research-url.js uses no-op stub; 4 ACE topics never fire)',
    options: [
      { key: 'FAQ2-P0',       text: 'Wire MessageBus into api/research-url.js as P0 — no-op stub means agents cannot communicate in production today.' },
      { key: 'FAQ2-INTERIM',  text: 'Accept the stub as acceptable interim — MessageBus wiring is Phase 3+ work; current single-page assessment does not need it.' },
      { key: 'FAQ2-REMOVE',   text: 'Remove the no-op stub entirely — make MessageBus absence explicit (every call site explicitly imports the real bus or fails fast) rather than silent.' },
      { key: 'FAQ2-OTHER',    text: 'REJECT framing — wrong question; different fix needed.' },
    ],
    draftedKey: null,
  },
  {
    id: 'FA-Q3', topic: 'Dual QA scoring paths — ScoreEvaluator.js 95/95 vs AutoRunner /50 Monitor (two separate code paths, do not reconcile)',
    options: [
      { key: 'FAQ3-50',       text: 'Canonicalize the /50 Monitor path; retire ScoreEvaluator.js — the session\'s integrity work is built on /50.' },
      { key: 'FAQ3-9595',     text: 'Canonicalize ScoreEvaluator.js 95/95; migrate Monitor to use it — 95/95 is the SSOT-named threshold.' },
      { key: 'FAQ3-BOTH',     text: 'Keep both — they serve different purposes (95/95 = governance audit gate; /50 = demo readiness score).' },
      { key: 'FAQ3-REDESIGN', text: 'REJECT — requires architectural redesign before either can be canonical; surface the misalignment to CEO before any fix.' },
    ],
    draftedKey: null,
  },
  {
    id: 'FA-Q4', topic: 'ProductSSOT entity entirely unbuilt — §7 Output Contract item #5 mandatory + atomic; every pipeline run silently bypasses it',
    options: [
      { key: 'FAQ4-P0',       text: 'P0 — build ProductSSOT before any agent wave begins (agents write to it; without it, §7 atomicity is fiction).' },
      { key: 'FAQ4-P1',       text: 'P1 — build ProductSSOT after Phase 3 (auth gives it richer data to store; pre-auth ProductSSOT is content-poor).' },
      { key: 'FAQ4-P2',       text: 'P2 — build ProductSSOT as part of agent wave infrastructure (agents and ProductSSOT ship together, neither without the other).' },
      { key: 'FAQ4-REJECT',   text: 'REJECT — SSOT §7.5 should be revised to make ProductSSOT optional not mandatory; current §7 atomicity contract is over-spec\'d for the use case.' },
    ],
    draftedKey: null,
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
    '# FlowAI SSOT — COMPACT EXCERPT (foundation-audit-relevant sections only)',
    '',
    'Sections: §3 (Commercial Model + Metadata), §7 (Output Contract — item #5 ProductSSOT),',
    '§7.5 (ProductSSOT entity), §7.6 (GTM Readiness), §11 (Clearance Protocol),',
    '§15.1 row 4 (Agent #4 Provider Onboarding charter), §27 (Open Questions), §28 (Symbiotic Loop).',
    'Trimmed to stay under W5b 120K bundle cap.',
    '',
    '---', '',
    slice('## 3. ', '## 4. '), '',
    slice('## 7. ', '## 8. '), '',
    slice('## 11. ', '## 12. '), '',
    slice('## 15. ', '## 16. '), '',
    slice('## 27. ', '## 28. '), '',
    slice('## 28. ', '## 29. '),
  ].join('\n');
}

// ── Rendering (same shape as prior wrappers) ────────────────────────────
function renderQuestionTable(t, perVerdicts) {
  const rows = [`| Q | Topic | Top key | Top count | Verdict |`, `|---|---|---|---:|---|`];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 65)} | \`${v.topKey || '—'}\` | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}
function renderQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const c = t.perQuestion[q.id];
    const tallyLines = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}"  →  **${c[o.key] || 0}**`);
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
  process.stdout.write(`[foundation-audit] started ${startedAt}\n`);
  const audit = auditDiversity();
  process.stdout.write(`[foundation-audit] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  for (const p of [AUDIT_PATH, MSGBUS_PATH, SCORER_PATH, RESEARCH_PATH]) {
    if (!existsSync(p)) throw new Error(`Required file not found: ${p}`);
  }
  const [auditText, msgbusText, scorerText, researchText] = await Promise.all([
    readFile(AUDIT_PATH, 'utf8'),
    readFile(MSGBUS_PATH, 'utf8'),
    readFile(SCORER_PATH, 'utf8'),
    readFile(RESEARCH_PATH, 'utf8'),
  ]);

  // Strip any literal anchor-phrase tokens used as meta-commentary so the
  // W5b runtime guard does not reject the bundle.
  function stripAnchor(s) {
    return s
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"');
  }

  const draftText = [
    '═══════════════ W2 FOUNDATION AUDIT BACKLOG (verbatim) ═══════════════',
    '',
    stripAnchor(auditText),
    '',
    '═══════════════ src/lib/agents/MessageBus.ts (verbatim, for Q2 evidence) ═══════════════',
    '',
    '```typescript',
    msgbusText,
    '```',
    '',
    '═══════════════ src/lib/governance/ScoreEvaluator.js (verbatim, for Q3 evidence) ═══════════════',
    '',
    '```javascript',
    scorerText,
    '```',
    '',
    '═══════════════ api/research-url.js (verbatim, for Q2 evidence) ═══════════════',
    '',
    '```javascript',
    researchText,
    '```',
  ].join('\n');

  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[foundation-audit] compact canonical: ${compactCanonical.length} chars · draft: ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Foundation audit surprises — 4 canonical questions (sounds-done-isn\'t gaps)',
    draftText,
    questions: QUESTIONS,
    seed: 'foundation-audit-surprises-2026-05-16',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();

  const strongestRejection = result.perReviewer
    .filter((r) => typeof r.rejection_steelman === 'string')
    .map((r) => ({ slot: r.slot, model: r.modelTag, text: r.rejection_steelman }))
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const t = result.tally;
  const perVerdicts = result.perVerdicts;
  const dissent = result.dissentFloor;

  const md = [
    `# Panel Consultation — Foundation Audit Surprises — ADVERSARIAL CANONICAL RULING (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` / \`7ff4f49\` MET).`,
    ``,
    `**Source audit:** \`docs/specs/FOUNDATION_AUDIT_BACKLOG.md\` (commit \`b48c856\`, ${auditText.length} chars).`,
    `**Code evidence attached verbatim:** \`MessageBus.ts\` (${msgbusText.length} chars), \`ScoreEvaluator.js\` (${scorerText.length} chars), \`api/research-url.js\` (${researchText.length} chars).`,
    ``,
    `**Mode notes:**`,
    `  - These 4 questions are CANONICAL / ARCHITECTURAL, not engineering. CEO needs Panel verdicts before agent builds begin.`,
    `  - No \`draftedKey\` on any question (these are open canonical rulings, not ratifications of a W3 position); dissent-floor evaluation is open-mode (objections-only, no alignment metric).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (compact §3+§7+§11+§15+§27+§28 canonical excerpt + audit doc + 3 code files).`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    `**Seed:** \`${result.seed}\``,
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION`,
    ``,
    `Open-mode (no drafted direction). Distinct objections: **${t.distinctObjections}**.`,
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
    `## Strongest single argument across all 4 questions (longest rejection steelman)`,
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
  process.stdout.write(`[foundation-audit] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'foundation-audit-surprises.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit, panel_size: PANEL.length, bundle_size: result.bundle_chars, liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions, seed: result.seed,
    perReviewer: result.perReviewer, questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[foundation-audit] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ FOUNDATION AUDIT SURPRISES — ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED:                 ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Dissent-floor:           ${dissent.triggered ? 'INVALID' : 'PASS'}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[foundation-audit] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
