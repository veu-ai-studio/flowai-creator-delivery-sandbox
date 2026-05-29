// scripts/panel/run-ca16-v2-rerun-2subbatch.mjs
//
// W6 CA-16 v2 VALIDITY RE-RUN — split into 2 sub-batches to recover quorum.
// Prior CA-16 v2 panel ran d366acf at 6/10 engaged (below Locked-Rule-17).
// This is NOT a v3 — same v2 questions, split across two ≤25K bundles.
//
// Sub-batch 1 = A-Q1, A-Q2, A-Q3, A-Q4 (proactive recs envelope + §11
//   interaction). Canonical excerpt includes FULL §11 because A-Q2
//   "remove recs from §11" was the most-contested area.
// Sub-batch 2 = B-Q1, B-Q2, C-Q1, C-Q2, C-Q3 (RB-Env + Multi-Format).
//
// Quorum ≥7/10 ENGAGED per Locked Rule 17.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const CONS_PATH = path.join(OUTPUT_DIR, 'ca-16-v2-rerun-2026-05-19.md');
const CONS_SIDECAR = path.join(OUTPUT_DIR, 'ca-16-v2-rerun-2026-05-19.sidecar.json');
const QUORUM = 7;

const SUBBATCH_1_QUESTIONS = [
  {
    id: 'CA-16-A-v2-Q1', topic: 'CA-16-A v2 Q1 — Does Panel ratify the minimal §7 item #8 envelope (purpose-link optional, new cost object, new rollback object) with full schema deferred to engineering dispatch?',
    options: [
      { key: 'CA16AV2Q1-RATIFY',     text: 'Ratify v2 as drafted (minimal envelope + 2 new fields; full schema deferred).' },
      { key: 'CA16AV2Q1-CONDITIONAL', text: 'Ratify but require purpose_record_link mandatory IF `product_purpose` non-null (conditional mandatory).' },
      { key: 'CA16AV2Q1-FULLSCHEMA', text: 'Ratify with broader scope — full schema invariants (PA-1..PA-N) should be drafted in v2 itself.' },
      { key: 'CA16AV2Q1-REJECT',     text: 'Reject — proactive recs envelope should be canonical complete OR not canonical at all.' },
    ],
    draftedKey: 'CA16AV2Q1-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q2', topic: 'CA-16-A v2 Q2 — Does Panel ratify that proactive recommendations DO NOT participate in §11 Six-Step Clearance (Step 1.5 eliminated)?',
    options: [
      { key: 'CA16AV2Q2-RATIFY',     text: 'Ratify v2 as drafted (recs OUTSIDE §11).' },
      { key: 'CA16AV2Q2-STEP65',     text: 'Ratify but with Step 6.5 — recs surface AFTER Step 6 (Deploy/Promote) as post-deploy candidates.' },
      { key: 'CA16AV2Q2-DASHONLY',   text: 'Ratify with admin-dashboard-only requirement — recs live ONLY on dashboard.' },
      { key: 'CA16AV2Q2-REJECT',     text: 'Reject — restore §11.5 Step 1.5 per v1.' },
    ],
    draftedKey: 'CA16AV2Q2-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q3', topic: 'CA-16-A v2 Q3 — Does Panel ratify the disposition lifecycle (open / accepted / rejected / deferred / implemented; carry-forward from v1)?',
    options: [
      { key: 'CA16AV2Q3-RATIFY',  text: 'Ratify v2 as drafted (same lifecycle as v1).' },
      { key: 'CA16AV2Q3-REOPEN',  text: 'Ratify with reopen state added — rejected recs may be reopened by admin with rationale.' },
      { key: 'CA16AV2Q3-SIMPLER', text: 'Reject — lifecycle should be simpler: open / decided (no sub-states).' },
      { key: 'CA16AV2Q3-DEFER',   text: 'Defer entirely — lifecycle state machine belongs in engineering dispatch.' },
    ],
    draftedKey: 'CA16AV2Q3-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q4', topic: 'CA-16-A v2 Q4 — Does Panel ratify the per-product defer-window config (default 14 days; bounds [1,365]; admin-configurable)?',
    options: [
      { key: 'CA16AV2Q4-RATIFY',   text: 'Ratify v2 as drafted.' },
      { key: 'CA16AV2Q4-TIGHTER',  text: 'Ratify with stricter bounds — [7,90] instead of [1,365].' },
      { key: 'CA16AV2Q4-ADMIN30',  text: 'Ratify with admin role required for any value > 30 days; operator may set up to 30.' },
      { key: 'CA16AV2Q4-FIXED14',  text: 'Reject — global fixed 14-day window simpler and sufficient.' },
    ],
    draftedKey: 'CA16AV2Q4-RATIFY',
  },
];

const SUBBATCH_2_QUESTIONS = [
  {
    id: 'CA-16-B-v2-Q1', topic: 'CA-16-B v2 Q1 — Does Panel ratify deferring the Redesign/Build Environment section number to engineering dispatch?',
    options: [
      { key: 'CA16BV2Q1-RATIFY',     text: 'Ratify v2 as drafted (section number = engineering decision).' },
      { key: 'CA16BV2Q1-PLACEHOLDER', text: 'Ratify with placeholder §29-DRAFT in v2; engineering finalizes at promotion.' },
      { key: 'CA16BV2Q1-COMMIT29',   text: 'Reject — commit to §29 in v2; renumbering is cosmetic non-issue.' },
      { key: 'CA16BV2Q1-DEFERALL',   text: 'Reject — RB-Env should not be canonical yet; defer whole surface to later CA-N.' },
    ],
    draftedKey: 'CA16BV2Q1-RATIFY',
  },
  {
    id: 'CA-16-B-v2-Q2', topic: 'CA-16-B v2 Q2 — Does Panel ratify the v2 "operator-steerable rebuild" wording (same as v1)?',
    options: [
      { key: 'CA16BV2Q2-RATIFY',   text: 'Ratify v2 as drafted (carry-forward).' },
      { key: 'CA16BV2Q2-STRONGER', text: 'Ratify with stronger admin-gating wording — "operator initiates; admin approves".' },
      { key: 'CA16BV2Q2-REJECT',   text: 'Reject — wording is too vague; needs concrete operator workflow spec in canonical.' },
      { key: 'CA16BV2Q2-DEFER',    text: 'Defer to engineering dispatch entirely.' },
    ],
    draftedKey: 'CA16BV2Q2-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q1', topic: 'CA-16-C v2 Q1 — Does Panel ratify the 6-class Multi-Format taxonomy (web / mobile_app / native_app / saas / agentic_ai / generic_url)?',
    options: [
      { key: 'CA16CV2Q1-RATIFY', text: 'Ratify v2 as drafted (6 classes).' },
      { key: 'CA16CV2Q1-MERGE5', text: 'Ratify with one merge — web + mobile_app merge into web_or_pwa (5-class).' },
      { key: 'CA16CV2Q1-SPLIT7', text: 'Ratify with one split — agentic_ai splits into agentic_ai_chat + agentic_ai_api (7-class).' },
      { key: 'CA16CV2Q1-DEFER',  text: 'Reject — defer canonical taxonomy until ≥1 product per class is in ProductSSOT.' },
    ],
    draftedKey: 'CA16CV2Q1-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q2', topic: 'CA-16-C v2 Q2 — Does Panel ratify the stricter classifier (confidence floor 0.85; sub-floor ambiguity emits `target_class_ambiguous.v1` at `high`)?',
    options: [
      { key: 'CA16CV2Q2-RATIFY',   text: 'Ratify v2 as drafted (0.85 floor; ambiguity emits `high`).' },
      { key: 'CA16CV2Q2-FLOOR090', text: 'Ratify with stricter floor — 0.90 (not 0.85).' },
      { key: 'CA16CV2Q2-LOOSER',   text: 'Ratify with looser floor — 0.75; ambiguity emits at `medium`.' },
      { key: 'CA16CV2Q2-REJECT',   text: 'Reject — restore v1 silent fallback to `generic_url`.' },
    ],
    draftedKey: 'CA16CV2Q2-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q3', topic: 'CA-16-C v2 Q3 — Does Panel ratify Agent #21 ACE Conductor as owner of Multi-Format target classification?',
    options: [
      { key: 'CA16CV2Q3-RATIFY',  text: 'Ratify v2 as drafted (Agent #21 owns).' },
      { key: 'CA16CV2Q3-CO_OWN',  text: 'Ratify with co-ownership — Agent #21 + Agent #26 jointly own.' },
      { key: 'CA16CV2Q3-NEW27',   text: 'Reject — a separate new Agent #27 should own classification.' },
      { key: 'CA16CV2Q3-DEFER',   text: 'Defer — ownership belongs in agent registry, not canonical SSOT spec.' },
    ],
    draftedKey: 'CA16CV2Q3-RATIFY',
  },
];

function stripAnchor(s) {
  return s
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
    .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
    .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
    .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
}

async function buildCanonicalSubbatch1() {
  // Sub-batch 1 MUST have full §11 (most-contested A-Q2 "remove recs from §11"
  // requires Panel to fully understand §11). §7 also relevant.
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function sliceFull(s, e) {
    const a = lines.findIndex((l) => l.startsWith(s));
    if (a === -1) return '';
    const b = lines.findIndex((l, i) => i > a && l.startsWith(e));
    return lines.slice(a, b === -1 ? undefined : b).join('\n');
  }
  function slice(s, e, max) {
    const text = sliceFull(s, e);
    if (!max || text.length <= max) return text;
    return text.slice(0, max) + '\n\n_[…truncated]_';
  }
  return ['# FlowAI SSOT COMPACT EXCERPT (CA-16-v2 re-run sub-batch 1; full §11)',
          '', '---', '',
          slice('## 7. ', '## 8. ', 4000), '',
          sliceFull('## 11. ', '## 12. '), ''].join('\n');
}

async function buildCanonicalSubbatch2() {
  // Sub-batch 2 (B/C) doesn't need full §11; reference is light.
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(s, e, max) {
    const a = lines.findIndex((l) => l.startsWith(s));
    if (a === -1) return '';
    const b = lines.findIndex((l, i) => i > a && l.startsWith(e));
    const text = lines.slice(a, b === -1 ? undefined : b).join('\n');
    if (!max || text.length <= max) return text;
    return text.slice(0, max) + '\n\n_[…truncated]_';
  }
  return ['# FlowAI SSOT COMPACT EXCERPT (CA-16-v2 re-run sub-batch 2)',
          '', '---', '',
          slice('## 6. ', '## 7. ', 3000), '',
          slice('## 7. ', '## 8. ', 3000), '',
          slice('## 15. ', '## 16. ', 2500), ''].join('\n');
}

async function loadAmendmentText(maxChars) {
  const raw = await readFile(path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA16_V2_DRAFT.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^## (v2 Panel Questions|Acceptance criteria|Cleared-8 carryover)/.test(l));
  const trimmedLines = cut === -1 ? lines : lines.slice(0, cut);
  let text = stripAnchor(trimmedLines.join('\n'));
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n\n_[…amendment truncated for bundle-cap]_';
  return text;
}

async function runSubbatch(name, questions, canonical, amendmentMax) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[${name}] starting · ${startedAt}\n`);
  const draftText = await loadAmendmentText(amendmentMax);
  process.stdout.write(`[${name}] amendment: ${draftText.length} chars · canonical: ${canonical.length} chars\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `CA-16 v2 re-run (${name}) — validity re-run of same v2 questions; prior run was 6/10 engaged below Locked-Rule-17 quorum.`,
    draftText,
    questions,
    seed: `ca16v2-rerun-${name}-2026-05-19`,
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();
  process.stdout.write(`[${name}] complete · bundle=${result.bundle_chars} · engaged=${result.tally.engagedTotal}/10 · objs=${result.tally.distinctObjections}\n`);
  for (const q of questions) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${result.tally.engagedTotal}) cleared=${cleared}\n`);
  }
  return { name, startedAt, finishedAt, questions, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ca16-v2-rerun] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canon1 = await buildCanonicalSubbatch1();
  const canon2 = await buildCanonicalSubbatch2();
  // Aim ≤25K bundle each: amendment ≤13K + canonical 7-9K + question overhead 3K
  const out1 = await runSubbatch('sub-batch-1', SUBBATCH_1_QUESTIONS, canon1, 13000);
  const out2 = await runSubbatch('sub-batch-2', SUBBATCH_2_QUESTIONS, canon2, 13000);
  const finishedAt = new Date().toISOString();

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  function writePerSubbatch(out, label) {
    const t = out.result.tally;
    const md = [`# Panel — CA-16 v2 re-run ${label} (2026-05-19)`, ``,
      `**Bundle:** ${out.result.bundle_chars} chars (target ≤25K)`,
      `**Started:** ${out.startedAt} · **Finished:** ${out.finishedAt}`,
      `**Engaged:** ${t.engagedTotal}/10 · **Tangential:** ${t.tangential} · **Silent:** ${t.silent}`,
      `**Distinct objections:** ${t.distinctObjections}`,
      `**Alignment:** ${(out.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${out.result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
      ``, `## Per-question`,
      `| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥${QUORUM}) |`,
      `|---|---|---|---|---|`,
      ...out.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
        return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
      }),
      ``, `## Detail`,
      ...out.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const c = out.result.tally.perQuestion[q.id];
        const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
        for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
        if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
        return `### ${q.id}\n${q.topic}\n\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
      }),
      ``, `## All distinct objections (${t.distinctObjections})`,
      (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
      ``, `## Per-reviewer`,
      out.result.perReviewer.map((r) => {
        const lines = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
        if (r.state === 'SILENT') return lines.concat(['_(degraded)_', '']).join('\n');
        if (r.adversarial?.valid) {
          lines.push('**Adversarial pass:**', '');
          for (const [i, o] of r.adversarial.objections.entries()) lines.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
          lines.push('');
        }
        if (r.rejection_steelman) lines.push('**Steelman:**', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
        lines.push('**Votes:**', '');
        for (const q of out.questions) {
          const vt = r.votes?.[q.id] || {};
          const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
          lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
          if (vt.rationale) lines.push(`  > ${vt.rationale}`);
        }
        return lines.join('\n');
      }).join('\n\n')];
    return md.join('\n');
  }
  await writeFile(path.join(OUTPUT_DIR, 'ca-16-v2-rerun-sub-batch-1-2026-05-19.md'), writePerSubbatch(out1, 'sub-batch-1 (A-Q1..Q4)'), 'utf8');
  await writeFile(path.join(OUTPUT_DIR, 'ca-16-v2-rerun-sub-batch-1-2026-05-19.sidecar.json'), JSON.stringify({ schema: 'ca16-v2-rerun.sidecar.v1', subbatch: 'sub-batch-1', bundle_size: out1.result.bundle_chars, startedAt: out1.startedAt, finishedAt: out1.finishedAt, w6_metadata: out1.result.w6_metadata, tally: out1.result.tally, per_question_verdicts: out1.result.perVerdicts, dissent_floor: out1.result.dissentFloor, perReviewer: out1.result.perReviewer, questions: out1.questions }, null, 2), 'utf8');
  await writeFile(path.join(OUTPUT_DIR, 'ca-16-v2-rerun-sub-batch-2-2026-05-19.md'), writePerSubbatch(out2, 'sub-batch-2 (B + C)'), 'utf8');
  await writeFile(path.join(OUTPUT_DIR, 'ca-16-v2-rerun-sub-batch-2-2026-05-19.sidecar.json'), JSON.stringify({ schema: 'ca16-v2-rerun.sidecar.v1', subbatch: 'sub-batch-2', bundle_size: out2.result.bundle_chars, startedAt: out2.startedAt, finishedAt: out2.finishedAt, w6_metadata: out2.result.w6_metadata, tally: out2.result.tally, per_question_verdicts: out2.result.perVerdicts, dissent_floor: out2.result.dissentFloor, perReviewer: out2.result.perReviewer, questions: out2.questions }, null, 2), 'utf8');

  const consolidated = [`# W6 CA-16 v2 Validity Re-Run — 2 Sub-Batches (2026-05-19)`, ``,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Quorum:** ≥${QUORUM}/10 engaged per Locked Rule 17`, ``,
    `## Cross-sub-batch summary`,
    `| Sub-batch | Bundle | Engaged | Objs | Cleared / Total |`,
    `|---|--:|--:|--:|--:|`,
    `| **sub-batch-1 (A-Q1..Q4)** | ${out1.result.bundle_chars} | ${out1.result.tally.engagedTotal}/10 | ${out1.result.tally.distinctObjections} | ${out1.questions.filter((q) => { const v=out1.result.perVerdicts[q.id]; return v.topCount>=QUORUM && v.topKey===q.draftedKey; }).length}/${out1.questions.length} |`,
    `| **sub-batch-2 (B + C)** | ${out2.result.bundle_chars} | ${out2.result.tally.engagedTotal}/10 | ${out2.result.tally.distinctObjections} | ${out2.questions.filter((q) => { const v=out2.result.perVerdicts[q.id]; return v.topCount>=QUORUM && v.topKey===q.draftedKey; }).length}/${out2.questions.length} |`,
    ``, `## Sub-batch 1 — A-Q1..Q4`,
    `| Q | Verdict | Top key | Top/Engaged | Cleared |`, `|---|---|---|---|---|`,
    ...out1.questions.map((q) => { const v=out1.result.perVerdicts[q.id]; const cleared=v.topCount>=QUORUM && v.topKey===q.draftedKey; return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey||'—'}\` | ${v.topCount}/${out1.result.tally.engagedTotal} | ${cleared?'✅':'—'} |`; }),
    ``, `## Sub-batch 2 — B + C`,
    `| Q | Verdict | Top key | Top/Engaged | Cleared |`, `|---|---|---|---|---|`,
    ...out2.questions.map((q) => { const v=out2.result.perVerdicts[q.id]; const cleared=v.topCount>=QUORUM && v.topKey===q.draftedKey; return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey||'—'}\` | ${v.topCount}/${out2.result.tally.engagedTotal} | ${cleared?'✅':'—'} |`; })];
  await writeFile(CONS_PATH, consolidated.join('\n'), 'utf8');
  await writeFile(CONS_SIDECAR, JSON.stringify({ schema: 'ca16-v2-rerun-consolidated.sidecar.v1', startedAt, finishedAt, audit, subbatches: [{ name: 'sub-batch-1', bundle: out1.result.bundle_chars, tally: out1.result.tally, per_question_verdicts: out1.result.perVerdicts, dissent_floor: out1.result.dissentFloor, questions: out1.questions }, { name: 'sub-batch-2', bundle: out2.result.bundle_chars, tally: out2.result.tally, per_question_verdicts: out2.result.perVerdicts, dissent_floor: out2.result.dissentFloor, questions: out2.questions }] }, null, 2), 'utf8');

  process.stdout.write(`[ca16-v2-rerun] DONE · consolidated → ${CONS_PATH}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[ca16-v2-rerun] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
