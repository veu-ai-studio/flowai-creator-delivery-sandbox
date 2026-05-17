// scripts/panel/run-cluster-templates-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — 6 canonical cluster-fix templates
// (W3 Dispatch #9, commits 4b0bbc0 through 9859b98). One disposition
// question per template; compact canonical excerpt.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const TEMPLATES_DIR = path.join(repoRoot, 'docs', 'specs', 'canonical-templates');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'cluster-templates-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'cluster-templates-ratification-2026-05-17.sidecar.json');

const TEMPLATES = [
  { file: 'CLUSTER_A_COST_GOVERNOR_INTEGRATION.md', cluster: 'A', label: 'Cost Governor Integration' },
  { file: 'CLUSTER_B_DATA_QUALITY_GATE.md',         cluster: 'B', label: 'Data Quality Gate' },
  { file: 'CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md', cluster: 'C', label: 'Mode-Conditional Behavior' },
  { file: 'CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md',    cluster: 'D', label: 'Audit-Log Topic Schema' },
  { file: 'CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md', cluster: 'E', label: 'Authority-Ceiling Integration' },
  { file: 'CLUSTER_F_MODEL_BUDGET_FALLBACK.md',     cluster: 'F', label: 'Model-Budget Fallback' },
];

const QUESTIONS = [
  {
    id: 'CL-A', topic: 'Cluster A — Cost Governor Integration template (Agent #23 sole budget owner, cost-signal topic, 2-phase reserve/settle)',
    options: [
      { key: 'CLA-RATIFY',   text: 'Ratify the template as canonical resolution for Cluster A — Agent #23 as sole budget owner, cost-signal topic publication, 2-phase reserve/settle is the right pattern.' },
      { key: 'CLA-REVISE',   text: 'Ratify with revision — the core pattern is correct but specific mechanism (e.g. 2-phase reserve/settle vs single-phase debit, topic naming, fallback on overrun) needs adjustment; specify in rationale.' },
      { key: 'CLA-REJECT',   text: 'Reject — Cost Governor should not be a separate agent; budget enforcement belongs in the orchestrator or per-agent self-check, not in a centralized authority surface.' },
      { key: 'CLA-DIFF',     text: 'Different canonical resolution — propose alternative architecture (e.g. cost-as-cross-cutting via wrapper rather than agent, or async budget reconciliation).' },
    ],
    draftedKey: 'CLA-RATIFY',
  },
  {
    id: 'CL-B', topic: 'Cluster B — Data Quality Gate template (configurable per-product threshold, data_quality.insufficient.v1 topic, halt-not-produce)',
    options: [
      { key: 'CLB-RATIFY',   text: 'Ratify — configurable per-product threshold + data_quality.insufficient.v1 audit-log topic + halt-not-produce semantics is the right pattern.' },
      { key: 'CLB-REVISE',   text: 'Ratify with revision — core pattern correct but mechanism (threshold range, default, halt-vs-degraded-output) needs tuning; specify.' },
      { key: 'CLB-REJECT',   text: 'Reject — data-quality gate should be enforced earlier (e.g. at ACE crawl boundary) rather than per-agent; the canonical answer is "fix the input gate", not add a per-agent gate.' },
      { key: 'CLB-DIFF',     text: 'Different canonical resolution — propose alternative (e.g. confidence-tagged-output without halt; per-agent self-reported confidence with downstream filter).' },
    ],
    draftedKey: 'CLB-RATIFY',
  },
  {
    id: 'CL-C', topic: 'Cluster C — Mode-Conditional Behavior template (per-mode output declaration block; Mode 1/2/3A coverage; default Mode 1)',
    options: [
      { key: 'CLC-RATIFY',   text: 'Ratify — per-mode output-declaration block in each agent spec, Mode 1/2/3A coverage, default Mode 1 is the right pattern.' },
      { key: 'CLC-REVISE',   text: 'Ratify with revision — pattern correct but coverage (e.g. should require all 3 modes documented even if behavior unchanged, or only delta blocks) needs adjustment.' },
      { key: 'CLC-REJECT',   text: 'Reject — mode-conditional behavior should be expressed at the AutoRunner / pipeline layer, not per-agent; agents should be mode-agnostic and the pipeline routes them.' },
      { key: 'CLC-DIFF',     text: 'Different canonical resolution — propose alternative (e.g. mode-conditional via runtime-feature-flag pattern instead of spec-level declaration).' },
    ],
    draftedKey: 'CLC-RATIFY',
  },
  {
    id: 'CL-D', topic: 'Cluster D — Audit-Log Topic Schema template (~30 new topics, §14.1 extension, namespace convention)',
    options: [
      { key: 'CLD-RATIFY',   text: 'Ratify — ~30 new topics + §14.1 canonical extension + namespace convention (per-agent + cross-cutting) is the right pattern.' },
      { key: 'CLD-REVISE',   text: 'Ratify with revision — namespace convention correct but specific topic list (which are P0, which deferred, naming) needs adjustment; specify.' },
      { key: 'CLD-REJECT',   text: 'Reject — adding 30 topics at once is over-specification; canonical schema should grow with agent ship, not pre-define before agents are built.' },
      { key: 'CLD-DIFF',     text: 'Different canonical resolution — propose alternative (e.g. agent-namespaced topics with no canonical pre-declaration; just-in-time topic registration at agent ship).' },
    ],
    draftedKey: 'CLD-RATIFY',
  },
  {
    id: 'CL-E', topic: 'Cluster E — Authority-Ceiling Integration template (getCeiling() helper, ceiling-check-before-act pattern, CA-12 v3 §A.2.4)',
    options: [
      { key: 'CLE-RATIFY',   text: 'Ratify — getCeiling() helper + ceiling-check-before-act pattern is the right integration with CA-12 v3 §A.2.4 authorityCeilings JSONB.' },
      { key: 'CLE-REVISE',   text: 'Ratify with revision — helper + pattern correct but specifics (where to check, what to log on violation, who handles ceiling-rejected agents) need adjustment.' },
      { key: 'CLE-REJECT',   text: 'Reject — authority ceiling should be enforced at the orchestrator layer (single source of truth), not by each agent calling getCeiling(); per-agent check duplicates enforcement.' },
      { key: 'CLE-DIFF',     text: 'Different canonical resolution — propose alternative (e.g. ceiling-as-middleware wrapper around BaseAgent, or ceiling-by-claim at orchestrator dispatch boundary).' },
    ],
    draftedKey: 'CLE-RATIFY',
  },
  {
    id: 'CL-F', topic: 'Cluster F — Model-Budget Fallback template (3-tier cascade, Doppler keys, claude-sonnet-4-6 final fallback)',
    options: [
      { key: 'CLF-RATIFY',   text: 'Ratify — 3-tier cascade (primary → cheaper-but-equivalent → claude-sonnet-4-6 final fallback) with Doppler keys is the right pattern.' },
      { key: 'CLF-REVISE',   text: 'Ratify with revision — 3-tier cascade correct but specifics (tier names, model choices, fallback trigger conditions, Doppler-key naming) need adjustment.' },
      { key: 'CLF-REJECT',   text: 'Reject — model-budget fallback should not be a spec-level concern; the Orchestra adapter layer already handles model routing and budget cascade should live there entirely.' },
      { key: 'CLF-DIFF',     text: 'Different canonical resolution — propose alternative (e.g. cost-based router with no tier hierarchy; budget enforcement triggers degradation not fallback model).' },
    ],
    draftedKey: 'CLF-RATIFY',
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
    return text.slice(0, maxChars) + '\n\n_[…section truncated for bundle-cap; full text in docs/CANONICAL_REFERENCE.md]_';
  }
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (cluster-templates context)',
    'Sections (truncated to fit bundle): §14 (GovernanceAuditLog), §15.1 (26-Agent Roster), §22 (Product-Agnostic).',
    '', '---', '',
    slice('## 14. ', '## 15. ', 6500), '',
    slice('## 15. ', '## 16. ', 7000), '',
    slice('## 22. ', '## 23. ', 6500),
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'All 6 templates IS ratified.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `All 6 templates IS ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `${conditions.length} of 6 template(s) lack clear Panel majority.`, conditions, alternativeWins };
}

function renderQuestionTable(t, perVerdicts) {
  const rows = [`| Q | Cluster | Top key | Top count | Verdict |`, `|---|---|---|---:|---|`];
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
function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
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

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[cluster-templates] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  // Strip anchor-phrase tokens from each template (W3 byline tables often have "(drafted)" / "(W3 recommendation)")
  function stripAnchor(s) {
    return s
      .replace(/\(\s*drafted\s*\)/gi, '(authored)')
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
      .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
      .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
      .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
  }

  const templateBodies = [];
  for (const t of TEMPLATES) {
    const p = path.join(TEMPLATES_DIR, t.file);
    if (!existsSync(p)) throw new Error(`Template not found: ${p}`);
    const text = await readFile(p, 'utf8');
    templateBodies.push({ ...t, text: stripAnchor(text) });
  }
  const draftText = templateBodies.map((tb) =>
    `═══════════════ CLUSTER ${tb.cluster} — ${tb.label} (${tb.file}) ═══════════════\n\n${tb.text}`
  ).join('\n\n');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[cluster-templates] compact canonical: ${compactCanonical.length} chars · draft: ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: '6 canonical cluster-fix templates — ratification (W3 Dispatch #9)',
    draftText,
    questions: QUESTIONS,
    seed: 'cluster-templates-ratification-2026-05-17',
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

  const md = [
    `# Panel Consultation — 6 Cluster-Fix Canonical Templates — ADVERSARIAL RATIFICATION (2026-05-17)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format.`,
    `**Templates under ratification (W3 Dispatch #9, commits \`4b0bbc0\` through \`9859b98\`):**`,
    ...TEMPLATES.map((tt) => `  - Cluster ${tt.cluster} — ${tt.label} (\`${tt.file}\`)`),
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §14+§15.1+§22 canonical + 6 templates).`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    ``,
    `---`,
    `## 🚨 PLAIN RATIFICATION VERDICT`,
    `**Status:** \`${ratification.status}\``,
    ``,
    `${ratification.headline}`,
    ``,
    ratification.conditions.length > 0 ? `**Conditions per template:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - \`${c.verdict}\` ${c.detail}.`).join('\n\n') : '',
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
    `## Per-template tally`,
    renderQuestionTable(t, perVerdicts),
    ``,
    `### Detail`,
    renderQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    `## All distinct objections (verbatim)`,
    `Total: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    `## Strongest argument across the 6 templates`,
    strongestRejection ? `**Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}` : '_(none)_',
    ``,
    `---`,
    `## Per-reviewer`,
    renderPerReviewer(result.perReviewer),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  const sidecar = { schema: 'cluster-templates.sidecar.v1', startedAt, finishedAt, panel_audit: audit, bundle_size: result.bundle_chars, liveOk, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, strongest_rejection_argument: strongestRejection, perReviewer: result.perReviewer, questions: QUESTIONS, templates: TEMPLATES };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[cluster-templates] wrote outputs · status=${ratification.status} · alignment=${(dissent.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[cluster-templates] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
