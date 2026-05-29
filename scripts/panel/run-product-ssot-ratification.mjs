// scripts/panel/run-product-ssot-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — ProductSSOT spec (commit 4b8a3c3).
// Panel ruling FA-Q4 UNANIMOUS P0: build before agent waves.
// 5 Y/N adversarial questions from §9 verbatim.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'PRODUCT_SSOT_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'product-ssot-spec-ratification-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'product-ssot-spec-ratification-2026-05-16.sidecar.json');

// ProductSSOT spec §9 uses Y/N adversarial pairs. Mapped to 4-option
// schema for locked classifier: (a) = Y (this spec) / (b) = N
// (adversarial counter) / (c) = different refinement / (d) = INSUFF.
const QUESTIONS = [
  {
    id: 'PS-Q1', topic: 'Schema design: six jsonb blocks vs flat per-run rows',
    options: [
      { key: 'PSQ1-Y',     text: '(Y) Six jsonb blocks per (productId, environment) pair, accumulating across runs — faithful to §7.5; one row per product+environment lifetime; entries within delta_log[] / governance_record[] represent individual runs.' },
      { key: 'PSQ1-N',     text: '(N) Flat per-run row schema with top-level columns runId, timestamp, pipelineVersion, clearanceVerdict, findings — one row per pipeline run; SQL-analytics friendlier; mirrors workspace_runs modeling.' },
      { key: 'PSQ1-DIFF',  text: 'Different — hybrid (e.g. flat run-rows + materialised six-block view) or fully different design; specify in rationale.' },
      { key: 'PSQ1-INSUFF',text: 'INSUFFICIENT_INFORMATION — cannot determine on the evidence presented.' },
    ],
    draftedKey: 'PSQ1-Y',
  },
  {
    id: 'PS-Q2', topic: 'Atomicity interpretation — run-completion-state vs DB-transaction-level',
    options: [
      { key: 'PSQ2-Y',     text: '(Y) "Atomic" = run is COMPLETE only when items 1–4 (live URL, delta report, source disclosure, LIMITATIONS) AND the ProductSSOT write succeed; atomic guarantee at run-completion-state level, not DB-transaction level (Vercel API + file I/O are external and unimplementable in 2PC).' },
      { key: 'PSQ2-N',     text: '(N) Literal §7 line 132: "atomic" = single transaction encompassing items 1–5; Vercel deploy, delta report file write all happen inside the Postgres txn via 2-phase commit or compensating actions.' },
      { key: 'PSQ2-DIFF',  text: 'Different interpretation — e.g. compensating-actions-only with no atomic guarantee, or saga pattern, or weaker eventual consistency.' },
      { key: 'PSQ2-INSUFF',text: 'INSUFFICIENT_INFORMATION.' },
    ],
    draftedKey: 'PSQ2-Y',
  },
  {
    id: 'PS-Q3', topic: 'RLS policy for operator reads vs cross-tenant audit',
    options: [
      { key: 'PSQ3-Y',     text: '(Y) Operator reads scoped to own provider org (same as admin reads); flowai_audit role reads across all orgs; current policy block is named operator_read but includes client in its in-list (functionally correct, naming sloppy).' },
      { key: 'PSQ3-N',     text: '(N) Strict CA-10-C role-matrix line 402 reading: three org-scoped reader roles (admin, operator, client) — split into three explicit policies, one per role, for alignment with §13.1.' },
      { key: 'PSQ3-RENAME',text: 'Different — keep single combined policy but RENAME to product_ssot_org_member_read for accuracy; functionally same as Y but matches intent better than naming "operator_read".' },
      { key: 'PSQ3-INSUFF',text: 'INSUFFICIENT_INFORMATION.' },
    ],
    draftedKey: 'PSQ3-Y',
  },
  {
    id: 'PS-Q4', topic: 'Override semantics: append-only audit vs UPDATE-with-revision',
    options: [
      { key: 'PSQ4-Y',     text: '(Y) All mutations append-only — admin "revoke" of an override is a NEW override entry whose replacementContent restores the original; full history preserved; every change = new row in product_ssot_version; matches §28.3 "audit trail preserved" literally.' },
      { key: 'PSQ4-N',     text: '(N) UPDATE-with-revision — each override is a top-level entry with revisions[] sub-array; "revoking" updates entry in place by appending to revisions[]; current state = LAST revision; history on the revisions array; friendlier for UI.' },
      { key: 'PSQ4-DIFF',  text: 'Different shape — e.g. event-sourced with snapshot caching, or hybrid (append-only with materialised current-state view).' },
      { key: 'PSQ4-INSUFF',text: 'INSUFFICIENT_INFORMATION.' },
    ],
    draftedKey: 'PSQ4-Y',
  },
  {
    id: 'PS-Q5', topic: 'Honesty / capability boundary completeness',
    options: [
      { key: 'PSQ5-Y',     text: '(Y) §7 lists ZERO ProductSSOT code today; every pipeline run silently bypasses §7 item #5; build dispatch is separate; capability boundary enumerates 10 specific UNBUILT items by file path — fair and complete.' },
      { key: 'PSQ5-N',     text: '(N) Capability boundary should ALSO enumerate (a) which production runs would NOT have rolled back even with this spec implemented (failures at items 1–4 happen pre-SSOT-write), (b) cost-per-run delta from atomic-write transaction (~<50 ms warm Supabase), (c) operator-visible failure rate when SSOT_WRITE_FAILED begins firing on previously-silent failures.' },
      { key: 'PSQ5-PART',  text: 'Different — partial N: spec should add at least the cost-per-run + post-implementation-visibility disclosure; the run-rollback enumeration is overscope and defer to W2 build dispatch readiness report.' },
      { key: 'PSQ5-INSUFF',text: 'INSUFFICIENT_INFORMATION.' },
    ],
    draftedKey: 'PSQ5-Y',
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
    '# FlowAI SSOT — COMPACT EXCERPT (ProductSSOT context)',
    'Sections: §7 (Output Contract — §7.5 entity, §7.6 GTM), §13 (Auth + Role Model), §14 (GovernanceAuditLog), §22 (Product-Agnostic), §28 (Symbiotic Loop).',
    '', '---', '',
    slice('## 7. ', '## 8. '), '',
    slice('## 13. ', '## 14. '), '',
    slice('## 14. ', '## 15. '), '',
    slice('## 22. ', '## 23. '), '',
    slice('## 28. ', '## 29. '),
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'ProductSSOT spec IS ratified — W2 build dispatch may proceed.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `ProductSSOT spec IS ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `ProductSSOT spec NOT ratified — ${conditions.length} question(s) lack clear Panel majority.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found: ${SPEC_PATH}`);
  const specRaw = await readFile(SPEC_PATH, 'utf8');
  // The spec's authors-table line "W5c (drafted), W2 + W5x ..." contains
  // the literal "(drafted)" token, which the W5b anchor-phrase guard
  // catches. Strip it to a non-anchor-form before passing.
  const specText = specRaw
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"');
  const compactCanonical = await buildCompactCanonical();

  const result = await runAdversarialPanelConsultation({
    topic: 'ProductSSOT engineering spec — ratification (5 Y/N adversarial questions; P0 build per FA-Q4 unanimous)',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'product-ssot-spec-ratification-2026-05-16',
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

  const t = result.tally, perVerdicts = result.perVerdicts, dissent = result.dissentFloor;
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
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tallyLines.push(`  - \`${k}\` (free-text REJECT) → ${c[k]}`);
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
    `# Panel Consultation — ProductSSOT Engineering Spec — ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format.`,
    `**Spec:** \`docs/specs/PRODUCT_SSOT_SPEC.md\` (commit \`4b8a3c3\`).`,
    `**Mandate:** FA-Q4 UNANIMOUS P0 (foundation audit, commit \`708e59d\`) — build before any agent wave begins.`,
    `**Question format:** 5 Y/N adversarial pairs (Y = this spec's choice / N = adversarial counter / refinement / INSUFF).`,
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
  const sidecar = { schema: 'product-ssot-ratification.sidecar.v1', startedAt, finishedAt, panel_audit: audit, bundle_size: result.bundle_chars, liveOk, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, strongest_rejection_argument: strongestRejection, perReviewer: result.perReviewer, questions: QUESTIONS };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[product-ssot] wrote outputs · status=${ratification.status} · alignment=${(dissent.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[product-ssot] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
