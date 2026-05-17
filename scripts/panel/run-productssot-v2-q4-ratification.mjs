// scripts/panel/run-productssot-v2-q4-ratification.mjs
//
// W6 ADVERSARIAL Panel — ProductSSOT Spec v2 (commit c59326a)
// Sole remaining open question: §9 Q4 — override semantics
// (append-only vs UPDATE-with-revision). Q1/Q2/Q3/Q5 ratified 2026-05-16.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'PRODUCT_SSOT_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'product-ssot-v2-q4-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'product-ssot-v2-q4-ratification-2026-05-17.sidecar.json');

const QUESTIONS = [
  {
    id: 'PS-Q4', topic: 'ProductSSOT §9 Q4 — override semantics. Option Y (append-only, current §3 + §13.1): every mutation appends a NEW override entry; "revoke" = new entry with replacementContent. Option N (UPDATE-with-revision): each override is a top-level entry with a `revisions[]` sub-array; "revoke" = append to that array, current state = LAST revision. Which semantics is canonical for ProductSSOT override mutation?',
    options: [
      { key: 'PSQ4-Y',       text: 'Y / Append-only — every mutation is a new row; revoke = new override entry with replacementContent. Simpler audit (every change → new product_ssot_version row), matches §28.3\'s "audit trail preserved" verbatim; cleanest RLS WITH CHECK semantics.' },
      { key: 'PSQ4-N',       text: 'N / UPDATE-with-revision — each override is one top-level entry with revisions[] sub-array; revoke = append to revisions[]. Friendlier UI (single revision-history pane per override), avoids duplicate-key sprawl in the overrides[] jsonb.' },
      { key: 'PSQ4-HYBRID',  text: 'Hybrid — db layer stays append-only (product_ssot_version preserves every mutation as a new row), but the `/product-ssot/:productId` UI synthesises an UPDATE-with-revision VIEW from the append-only log. DB is the audit truth, UI is the operator ergonomics.' },
      { key: 'PSQ4-DIFF',    text: 'Different shape entirely — revoke is its own first-class operation (e.g. an `overrideRevocations[]` jsonb that points at active overrides by id), not a synthetic "new override that restores the original". Avoids overloading the override entry with two semantics.' },
    ],
    draftedKey: 'PSQ4-Y',
  },
];

async function buildCompactCanonical() {
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(startMarker, endMarker, maxChars) {
    const s = lines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = lines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    const text = lines.slice(s, e === -1 ? undefined : e).join('\n');
    if (!maxChars || text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n_[…section truncated for bundle-cap]_';
  }
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (ProductSSOT v2 Q4 context)',
    'Sections: §10 (AgentState), §11 (catalogue), §15.1 (26-Agent Roster).',
    '', '---', '',
    slice('## 10. ', '## 11. ', 7000), '',
    slice('## 11. ', '## 12. ', 7000), '',
    slice('## 15. ', '## 16. ', 7000),
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
    conditions.push({ qId: q.id, topic: q.topic, verdict: v.verdict, draftedKey: q.draftedKey, detail: v.detail });
  }
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: '§9 Q4 ratified — append-only (Y) holds.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `§9 Q4 ratified with substitution: ${alternativeWins[0].verdict}.`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: '§9 Q4 lacks clear Panel majority — append-only-vs-UPDATE-with-revision unresolved.', conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[productssot-v2-q4] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  const specRaw = await readFile(SPEC_PATH, 'utf8');
  function stripAnchor(s) {
    return s
      .replace(/\(\s*drafted\s*\)/gi, '(authored)')
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
      .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
      .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
      .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
  }
  const draftText = stripAnchor(specRaw);
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[productssot-v2-q4] compact canonical: ${compactCanonical.length} chars · draft: ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'ProductSSOT Spec v2 — sole open §9 Q4 (override semantics: append-only vs UPDATE-with-revision)',
    draftText,
    questions: QUESTIONS,
    seed: 'productssot-v2-q4-ratification-2026-05-17',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();
  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const t = result.tally;
  const md = [`# Panel — ProductSSOT v2 §9 Q4 ADVERSARIAL RATIFICATION (2026-05-17)`, ``,
    `**Spec:** docs/specs/PRODUCT_SSOT_SPEC.md (commit c59326a)`,
    `**Scope:** §9 Q4 sole open question. Q1/Q2/Q3/Q5 RATIFIED 2026-05-16.`,
    `**Mode:** ADVERSARIAL — locked W5b format.`,
    `**Started:** ${startedAt}  ·  **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``,
    `## 🚨 RATIFICATION VERDICT — \`${ratification.status}\``,
    ratification.headline, ``,
    `## DISSENT-FLOOR`,
    `Alignment ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = **${(result.dissentFloor.alignedPct*100).toFixed(1)}%** · objections **${t.distinctObjections}** · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`, ``,
    `## PS-Q4 tally`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const c = t.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 200)}"  →  **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` (free-text) → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id} — ${q.topic}\n\nTally (ENGAGED-only, ${t.engagedTotal}):\n${tally.join('\n')}\n\n**Verdict:** \`${v.verdict}\` — ${v.detail}.\n`;
    }),
    ``,
    `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded / parse-failure)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('### Adversarial pass', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`**Objection ${i + 1} — ${o.title}**`, '', `> ${(o.detail || '').replace(/\n/g, '\n> ')}`, '');
        out.push(`**Worse-than-status-quo:** ${r.adversarial.worse_than_status_quo}`, '', `**Precedent:** ${r.adversarial.precedent}`, '');
      }
      if (r.rejection_steelman) out.push('### Rejection steelman', '', `> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`, '');
      out.push('### Votes', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 120) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n---\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  const sidecar = { schema: 'productssot-v2-q4.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, perReviewer: result.perReviewer, questions: QUESTIONS };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[productssot-v2-q4] wrote outputs · status=${ratification.status} · alignment=${(result.dissentFloor.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = result.perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[productssot-v2-q4] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
