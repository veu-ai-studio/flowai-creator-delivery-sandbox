// scripts/panel/run-self-renewal-spec-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — Self-Renewal Spec (commit e6d650b,
// 641 lines). Option C: PR + Vercel preview + before/after delta score.
// 7 questions verbatim from §10.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'SELF_RENEWAL_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'self-renewal-spec-ratification-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'self-renewal-spec-ratification-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1', topic: 'Single-file-only fix scope for Phase A (multi-file deferred to Phase B)',
    options: [
      { key: 'GQ1-SINGLE',   text: 'Single-file scope is correct — multi-file fixes are too risky for the first production deployment of automated fix application.' },
      { key: 'GQ1-2-3',      text: 'Single-file scope is too restrictive — Phase A should support 2- or 3-file fixes (a common pattern: a component change + its test, or a route change + the layout that links to it).' },
      { key: 'GQ1-FN',       text: 'Single-file scope is too permissive — Phase A should restrict further (e.g., single-function-only within a file).' },
      { key: 'GQ1-FILETYPE', text: 'The single-file vs multi-file framing is the wrong question — Phase A should restrict by file type (e.g., *.jsx only, no *.json / no *.config.js regardless of file count).' },
    ],
    draftedKey: 'GQ1-SINGLE',
  },
  {
    id: 'G-Q2', topic: '"Fix must pass npm test" gate sufficiency for fix application',
    options: [
      { key: 'GQ2-NPMTEST',  text: 'npm test is sufficient — existing test suite is the canonical pre-merge gate; if a fix breaks a test, the discard gate catches it.' },
      { key: 'GQ2-TYPECHECK',text: 'npm test is insufficient — Phase A should also require npm run typecheck (or tsc --noEmit) where applicable.' },
      { key: 'GQ2-SMOKE',    text: 'npm test is insufficient — Phase A should also require a smoke test of the Vercel preview (e.g., basic fetch(previewUrl) + assert 2xx + key DOM elements present).' },
      { key: 'GQ2-OPTOPT',   text: 'npm test is the wrong gate entirely — projects without tests cannot use Self-Renewal at all, which is unacceptable; the gate should be optional with operator opt-in.' },
    ],
    draftedKey: 'GQ2-NPMTEST',
  },
  {
    id: 'G-Q3', topic: 'GitHub PAT minimum permissions (contents:write + pull-requests:write)',
    options: [
      { key: 'GQ3-OK',     text: 'contents:write + pull-requests:write is the correct minimum — narrow enough to prevent abuse, broad enough to do the job.' },
      { key: 'GQ3-MORE',   text: 'Insufficient — Phase A also needs metadata:read (likely implicit) and commit-statuses:read (to surface CI status in PR body).' },
      { key: 'GQ3-NARROW', text: 'Over-broad — contents:write allows force-pushing to default branch (which Self-Renewal never does); permission should be narrower (e.g., contents:write scoped to branches matching flowai/*).' },
      { key: 'GQ3-APP',    text: 'Different permission model entirely — Phase A should use a GitHub App rather than fine-grained PAT, with installation-time consent + webhook subscription.' },
    ],
    draftedKey: 'GQ3-OK',
  },
  {
    id: 'G-Q4', topic: 'Negative-delta PR opening (open PR even if fix makes the score worse, with "no improvement" banner)',
    options: [
      { key: 'GQ4-ALWAYS',  text: 'Always open the PR — surface the data; let the human decide. Negative deltas are information the operator needs.' },
      { key: 'GQ4-NEVER',   text: 'Never open the PR if delta is negative — close the renewal run as failed; don\'t waste operator review time on regressions.' },
      { key: 'GQ4-DISCARD', text: 'Open the PR but mark it explicitly "discarded by FlowAI" — branch deleted, PR closed in same commit, operator gets a record but no review burden.' },
      { key: 'GQ4-THRESH',  text: 'Threshold-based — open the PR if delta ≥ a configurable minimum (e.g., delta_total ≥ +5); below that, close as failed.' },
    ],
    draftedKey: 'GQ4-ALWAYS',
  },
  {
    id: 'G-Q5', topic: 'Preview-before-PR ordering (Vercel preview must be live HTTP 2xx before PR opens)',
    options: [
      { key: 'GQ5-PREFIRST',text: 'Preview-before-PR is correct — operator MUST see the renewed result in-browser before being asked to review code.' },
      { key: 'GQ5-CONCUR',  text: 'Too strict — Phase A should open the PR concurrently with preview build (PR opens immediately on branch creation; preview URL added as PR comment when ready).' },
      { key: 'GQ5-SMOKE',   text: 'Too lax — Phase A should additionally require the preview URL to pass a smoke-test assessment (Agent #21 quick crawl) before the PR is opened.' },
      { key: 'GQ5-NOPRE',   text: 'Wrong gate entirely — for non-Vercel-hosted operators there is no preview; Phase A should support a "no preview" path with explicit operator opt-in.' },
    ],
    draftedKey: 'GQ5-PREFIRST',
  },
  {
    id: 'G-Q6', topic: 'Minimum-delta threshold for PR opening (related to but distinct from Q4)',
    options: [
      { key: 'GQ6-NONE',    text: 'Always open the PR (no minimum delta required) — operator sees everything.' },
      { key: 'GQ6-PERPROD', text: 'Configurable per-product minimum delta (e.g. ProductRegistry.selfRenewalMinimumDelta = 0 by default) — operator decides.' },
      { key: 'GQ6-PLUS1',   text: 'Hard-coded minimum delta of +1 — FlowAI never opens PRs that don\'t show measurable improvement.' },
      { key: 'GQ6-PLUS5',   text: 'Hard-coded minimum delta of +5 — FlowAI only opens PRs with substantial improvement (per a Panel-ratified threshold for what "substantial" means).' },
    ],
    draftedKey: 'GQ6-NONE',
  },
  {
    id: 'G-Q7', topic: 'Overall Self-Renewal spec disposition',
    options: [
      { key: 'GQ7-PROMOTE',text: 'Promote — spec is ready for Phase A engineering dispatch.' },
      { key: 'GQ7-REVISE', text: 'Revise — identify specific sections that need revision before promotion.' },
      { key: 'GQ7-DEFER',  text: 'Defer — Phase A is not the right next investment; some other engineering work should land first (specify in rationale).' },
      { key: 'GQ7-REJECT', text: 'Reject — Option C is the wrong architectural approach; a different approach should be pursued (specify in rationale).' },
    ],
    draftedKey: 'GQ7-PROMOTE',
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
    '# FlowAI SSOT — COMPACT EXCERPT (Self-Renewal Spec relevant sections only)',
    '',
    'Sections: §10 (Self-Governance Layer — Self-Renewal anchored here),',
    '§15.1 row 3 (Agent #3 charter), §11 (Clearance Protocol), §14 (GovernanceAuditLog),',
    '§22 (Product-Agnostic Rule), §25 (Locked Rules).',
    'Trimmed to stay under W5b 120K bundle cap.',
    '',
    '---', '',
    slice('## 10. ', '## 11. '), '',
    slice('## 11. ', '## 12. '), '',
    slice('## 14. ', '## 15. '), '',
    slice('## 15. ', '## 16. '), '',
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'Spec IS ratified — Phase A engineering may proceed.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec IS ratified — Phase A may proceed with ${alternativeWins.length} position substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `Spec NOT ratified — ${conditions.length} question(s) lack clear Panel majority.`, conditions, alternativeWins };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [`| Q | Topic | Top key | Top count | Verdict |`, `|---|---|---|---:|---|`];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 60)} | \`${v.topKey || '—'}\` | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
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
  process.stdout.write(`[self-renewal-spec] started ${startedAt}\n`);
  const audit = auditDiversity();
  process.stdout.write(`[self-renewal-spec] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[self-renewal-spec] compact canonical: ${compactCanonical.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Self-Renewal Spec — Option C (PR + Vercel preview + before/after delta) — ratification',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'self-renewal-spec-ratification-2026-05-16',
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
    `# Panel Consultation — Self-Renewal Spec (Option C PR+Preview+Delta) — ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` / \`7ff4f49\` MET).`,
    ``,
    `**Spec under ratification:** \`docs/specs/SELF_RENEWAL_SPEC.md\` (commit \`e6d650b\`, 641 lines).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §10+§11+§14+§15+§22+§25 canonical excerpt + full spec).`,
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
    ratification.conditions.length > 0 ? `**Remaining conditions:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. Drafted (\`${c.draftedKey}\`) did NOT reach quorum. ${c.detail}.`).join('\n\n') : '',
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
    `## All distinct substantive objections (verbatim)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST the spec`,
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
  process.stdout.write(`[self-renewal-spec] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'self-renewal-spec-ratification.sidecar.v1',
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
  process.stdout.write(`[self-renewal-spec] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ SELF-RENEWAL SPEC RATIFICATION — ADVERSARIAL SUMMARY ═══════\n');
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
  process.stdout.write('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[self-renewal-spec] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
