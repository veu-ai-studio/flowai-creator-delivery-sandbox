// scripts/panel/run-self-renewal-v2-ratification.mjs
//
// W6 ADVERSARIAL Panel re-ratification — Self-Renewal Spec v2
// (commit 10ab940). v1 NOT_RATIFIED at 26.8% alignment; v2 addresses
// 5 conditions. G-Q5 carried RATIFIED from v1 (7/8); 6 re-votes.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'self-renewal-v2-ratification-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'self-renewal-v2-ratification-2026-05-16.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1-v2', topic: '3-file-max fix scope with diff-parse-time enforcement',
    options: [
      { key: 'GQ1v2-3FILE',  text: '3-file cap with diff-parse-time enforcement is correct — covers common multi-file patterns (component + test + parent route) while preventing LLM scope sprawl; parse-time discard is a structural guarantee.' },
      { key: 'GQ1v2-1FILE',  text: '3-file cap is too permissive — Phase A should keep single-file scope until ≥30 days in production; raise to 3 only in Phase B.' },
      { key: 'GQ1v2-5FILE',  text: '3-file cap is too restrictive — Phase A should allow up to 5 files for "small refactor" findings tagged by Agent #6 Research; parse-time gate is the safety net.' },
      { key: 'GQ1v2-LOC',    text: 'File-count framing misses the real risk — Phase A should cap by total diff hunk count or LOC changed (e.g. ≤ 50 LOC across all files), not file count.' },
    ],
    draftedKey: 'GQ1v2-3FILE',
  },
  {
    id: 'G-Q2-v2', topic: 'Three MUST gates: tests + typecheck + preview-smoke',
    options: [
      { key: 'GQ2v2-THREE',  text: 'Three MUST gates (test + typecheck + preview-smoke) is correct — each catches a distinct failure class (logic / type / runtime-SSR regression); none redundant.' },
      { key: 'GQ2v2-MORE',   text: 'Too lax — Phase A should also MUST-gate accessibility (axe-core) and visual regression (screenshot diff against pre-renewal baseline) before any PR opens.' },
      { key: 'GQ2v2-LESS',   text: 'Too strict — typecheck-skip-when-no-tsconfig and DOM-default ["html","body"] are loopholes; either MUST-universal or drop the gates entirely.' },
      { key: 'GQ2v2-ADVIS',  text: 'MUST framing is wrong — Phase A should treat all gates as advisory with a single "operator confidence threshold" parameter; let operators tune strictness.' },
    ],
    draftedKey: 'GQ2v2-THREE',
  },
  {
    id: 'G-Q3-v2', topic: 'GitHub App primary, fine-grained PAT (branch-scoped) as INTERIM fallback',
    options: [
      { key: 'GQ3v2-APPINT', text: 'App-primary + INTERIM PAT-fallback is correct — App is long-term right answer; fallback is pragmatic migration affordance Phase B retires (App provisioned + ≥3 of 5 products installed).' },
      { key: 'GQ3v2-APPONLY',text: 'Drop the PAT fallback entirely from Phase A — App-only from day one; products without App installation cannot use Self-Renewal until they install. PAT fallback adds attack surface Phase B has to remove anyway.' },
      { key: 'GQ3v2-PATPRIM',text: 'Keep PAT as primary in Phase A — App adds installation friction (operator click-through) that blocks adoption; defer App to Phase B once Self-Renewal has proven value via PAT path.' },
      { key: 'GQ3v2-OAUTH',  text: 'Two credential paths is wrong shape — Phase A should use a single OAuth-on-behalf-of-operator flow with the operator\'s own user token, scoped per-session.' },
    ],
    draftedKey: 'GQ3v2-APPINT',
  },
  {
    id: 'G-Q4-v2', topic: 'Per-product configurable negative-delta policy (ALWAYS_OPEN default | DISCARD_ON_NEGATIVE)',
    options: [
      { key: 'GQ4v2-ENUM',   text: 'Per-product enum (ALWAYS_OPEN | DISCARD_ON_NEGATIVE) is correct — different products have different reviewer-bandwidth profiles; operator choice with ALWAYS_OPEN default is the right balance.' },
      { key: 'GQ4v2-THIRD',  text: 'Insufficient — Phase A also needs a third option OPEN_AS_CLOSED_PR (open the PR but immediately close it; operator gets record without inbox notification or merge-button temptation).' },
      { key: 'GQ4v2-HARD',   text: 'Over-engineered — Phase A should hard-code ALWAYS_OPEN (transparency-first) until usage data justifies a per-product knob; one configurable flag per minor design choice is config-creep.' },
      { key: 'GQ4v2-AUTH',   text: 'Wrong axis — policy should not be operator-configurable at all; tie to Authority posture (Supervised → ALWAYS_OPEN, Autonomous → DISCARD_ON_NEGATIVE) per CA-12 v3 §A.2.' },
    ],
    draftedKey: 'GQ4v2-ENUM',
  },
  {
    id: 'G-Q6-v2', topic: 'Per-product configurable minimum-delta threshold (selfRenewalMinimumDelta default 0)',
    options: [
      { key: 'GQ6v2-PROD',   text: 'Per-product integer with default 0 is correct — operator decides "what counts as worth my review time"; default of 0 preserves surface-everything posture for operators who don\'t tune.' },
      { key: 'GQ6v2-PLUS1',  text: 'Default should be +1, not 0 — "open PR only if measurable improvement" is safer default than "open PR for break-even runs that just preserved baseline".' },
      { key: 'GQ6v2-LAYER',  text: 'Threshold should be per-layer not just delta_total — operators may care about L1 Functionality regressions even when delta_total is positive; expose as per-Five-Layer map.' },
      { key: 'GQ6v2-COLL',   text: 'Threshold mechanism is redundant with G-Q4 DISCARD_ON_NEGATIVE — drop per-product integer; collapse into single 3-state enum (ALL | IMPROVEMENTS_ONLY | SUBSTANTIAL_ONLY).' },
    ],
    draftedKey: 'GQ6v2-PROD',
  },
  {
    id: 'G-Q7-v2', topic: 'v2 disposition — is v2 ready for promotion now that the 5 conditions are addressed?',
    options: [
      { key: 'GQ7v2-PROM',   text: 'Promote — 5 conditions addressed cleanly; Option C v2 is ready for Phase A engineering dispatch.' },
      { key: 'GQ7v2-RESV',   text: 'Promote-with-Reservations — 5 conditions addressed but Panel surfaces residual issues that the engineering dispatch should track (non-blocking; specify in rationale).' },
      { key: 'GQ7v2-REV',    text: 'Revise — one or more of the 5 edits is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect).' },
      { key: 'GQ7v2-REJ',    text: 'Reject — 5 edits expose a deeper architectural problem with Option C that surgical revisions cannot fix; spec needs ground-up rework or replacement (specify architectural concern).' },
    ],
    draftedKey: 'GQ7v2-PROM',
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
    '# FlowAI SSOT — COMPACT EXCERPT (Self-Renewal v2 context)',
    'Sections: §10 (Self-Governance), §11 (Clearance), §14 (GovernanceAuditLog), §22 (Product-Agnostic), §25 (Locked Rules).',
    '', '---', '',
    slice('## 10. ', '## 11. '), '',
    slice('## 11. ', '## 12. '), '',
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'Spec v2 IS ratified — Phase A may proceed.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `Spec v2 IS ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `Spec v2 NOT ratified — ${conditions.length} question(s) lack clear Panel majority.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found: ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');
  const compactCanonical = await buildCompactCanonical();

  const result = await runAdversarialPanelConsultation({
    topic: 'Self-Renewal Spec v2 — 5-condition re-ratification (6 questions; G-Q5 carried from v1)',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'self-renewal-v2-ratification-2026-05-16',
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

  const t = result.tally;
  const perVerdicts = result.perVerdicts;
  const dissent = result.dissentFloor;
  const liveOk = result.reviewers.filter((r) => !r.degraded).length;

  function renderQuestionTable() {
    const rows = [`| Q | Topic | Top key | Top count | Verdict |`, `|---|---|---|---:|---|`];
    for (const q of QUESTIONS) {
      const v = perVerdicts[q.id];
      rows.push(`| **${q.id}** | ${q.topic.slice(0, 60)} | \`${v.topKey || '—'}\` | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
    }
    return rows.join('\n');
  }
  function renderQuestionDetail() {
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
  function renderPerReviewer() {
    return result.perReviewer.map((r) => {
      const lines = [`## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``, ''];
      if (r.state === 'SILENT') { lines.push('_(degraded / parse-failure)_', ''); return lines.join('\n'); }
      if (r.invalid_reason) { lines.push(`**Invalid reason:** ${r.invalid_reason}`, ''); }
      if (r.adversarial?.valid) {
        lines.push('### Adversarial pass', '');
        for (const [i, o] of r.adversarial.objections.entries()) lines.push(`**Objection ${i + 1} — ${o.title}**`, '', `> ${(o.detail || '').replace(/\n/g, '\n> ')}`, '');
        lines.push(`**Worse-than-status-quo:** ${r.adversarial.worse_than_status_quo}`, '');
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
      return lines.join('\n');
    }).join('\n---\n\n');
  }

  const md = [
    `# Panel Consultation — Self-Renewal Spec v2 — ADVERSARIAL RE-RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format.`,
    `**Spec:** \`docs/specs/SELF_RENEWAL_SPEC.md\` (v2, commit \`10ab940\`, 641+ lines).`,
    `**v1 verdict:** NOT_RATIFIED at 26.8% alignment (\`ab398b9\`).`,
    `**Carried RATIFIED from v1 (NOT re-voted):** G-Q5 \`QUORUM_PLURALITY_GQ5-PREFIRST\` 7/8.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars.`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    ``,
    `---`,
    `## 🚨 PLAIN RATIFICATION VERDICT`,
    `**Status:** \`${ratification.status}\``,
    ``,
    `${ratification.headline}`,
    ``,
    ratification.conditions.length > 0 ? `**Conditions:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - \`${c.verdict}\` ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative wins:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — \`${a.verdict}\` → "${a.newPosition?.slice(0, 180)}"`).join('\n\n') : '',
    ``,
    `---`,
    `## DISSENT-FLOOR`,
    `Alignment: ${dissent.alignedCount}/${dissent.totalPossible} = **${(dissent.alignedPct * 100).toFixed(1)}%** · objections: **${t.distinctObjections}** · ${dissent.triggered ? '🚨 INVALID' : '✅ PASS'}`,
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length} · Backups: ${result.w6_metadata.backups_applied} · ENGAGED: ${t.engagedTotal} · TANGENTIAL: ${t.tangential} · SILENT: ${t.silent}`,
    ``,
    `---`,
    `## Per-question tally`,
    renderQuestionTable(),
    ``,
    `### Detail`,
    renderQuestionDetail(),
    ``,
    `---`,
    `## All distinct objections`,
    `Total: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    `## Strongest argument against`,
    strongestRejection ? `**Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}` : '_(none)_',
    ``,
    `---`,
    `## Per-reviewer`,
    renderPerReviewer(),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  const sidecar = { schema: 'self-renewal-v2.sidecar.v1', startedAt, finishedAt, panel_audit: audit, bundle_size: result.bundle_chars, liveOk, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, strongest_rejection_argument: strongestRejection, perReviewer: result.perReviewer, questions: QUESTIONS, carried_from_v1: [{ qId: 'G-Q5', verdict: 'QUORUM_PLURALITY_GQ5-PREFIRST 7/8 (v1 ab398b9)' }] };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[self-renewal-v2] wrote outputs · status=${ratification.status} · alignment=${(dissent.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[self-renewal-v2] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
