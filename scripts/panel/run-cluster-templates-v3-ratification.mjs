// scripts/panel/run-cluster-templates-v3-ratification.mjs
//
// W6 ADVERSARIAL Panel — 6 cluster-fix v3 templates (W3/W3a Dispatch #12).
// 5 advanced to v3 (A, B, D, E, F); CLUSTER_C remains v2 (already ratified
// QUORUM_PLURALITY_PROMOTE 7/10 in W6 Dispatch #18).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const TEMPLATES_DIR = path.join(repoRoot, 'docs', 'specs', 'canonical-templates');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'cluster-templates-v3-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'cluster-templates-v3-ratification-2026-05-17.sidecar.json');

const TEMPLATES = [
  { file: 'CLUSTER_A_COST_GOVERNOR_INTEGRATION.md',     cluster: 'A', label: 'Cost Governor Integration',         ver: 'v3', conditions: 'A1–A5 (advisory lock, lease token, SERIALIZABLE, statement_timeout extension, ordering)' },
  { file: 'CLUSTER_B_DATA_QUALITY_GATE.md',             cluster: 'B', label: 'Data Quality Gate',                 ver: 'v3', conditions: 'B1–B4 (canonical weight registry, MIN-of-streams, provenance, runtime validation)' },
  { file: 'CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md',     cluster: 'C', label: 'Mode-Conditional Behavior',         ver: 'v2', conditions: '(no v3; v2 ratified QUORUM_PLURALITY_PROMOTE 7/10 in Dispatch #18)' },
  { file: 'CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md',        cluster: 'D', label: 'Audit-Log Topic Schema',            ver: 'v3', conditions: 'D1–D3 (hash mirror, 5-topic ceiling, load-test gate)' },
  { file: 'CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md', cluster: 'E', label: 'Authority-Ceiling Integration',     ver: 'v3', conditions: 'E0–E3 (CEO CA-9-Q4 Option A, §15.1 roster delta, split-brain resolution, async-cache-with-fallback)' },
  { file: 'CLUSTER_F_MODEL_BUDGET_FALLBACK.md',         cluster: 'F', label: 'Model-Budget Fallback',             ver: 'v3', conditions: 'F1 (latency SLA acceptance criterion)' },
];

function makeQuestion(t) {
  return {
    id: `CL-${t.cluster}-${t.ver}`,
    topic: `Cluster ${t.cluster} ${t.ver} — ${t.label}. Conditions addressed: ${t.conditions}. Is the template ready to promote as canonical?`,
    options: [
      { key: `CL${t.cluster}${t.ver.toUpperCase()}-PROMOTE`,    text: `PROMOTE — ${t.ver} cleanly addresses prior Panel conditions for Cluster ${t.cluster}; template is ready to ship as canonical resolution.` },
      { key: `CL${t.cluster}${t.ver.toUpperCase()}-CONDITIONS`, text: `PROMOTE-WITH-CONDITIONS — ${t.ver} addresses the main conditions but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).` },
      { key: `CL${t.cluster}${t.ver.toUpperCase()}-REVISE`,     text: `REVISE — one or more prior conditions is incompletely addressed, or ${t.ver} introduces a new defect that must be fixed before promotion (specify which condition and the defect).` },
      { key: `CL${t.cluster}${t.ver.toUpperCase()}-REJECT`,     text: `REJECT — ${t.ver} reveals the cluster problem cannot be fixed by surgical revisions; the cluster needs a different canonical resolution architecture.` },
    ],
    draftedKey: `CL${t.cluster}${t.ver.toUpperCase()}-PROMOTE`,
  };
}
const QUESTIONS = TEMPLATES.map(makeQuestion);

function extractCompactTemplate(raw, maxChars) {
  const lines = raw.split(/\r?\n/);
  function findSection(re) {
    const s = lines.findIndex((l) => re.test(l));
    if (s === -1) return null;
    let e = lines.findIndex((l, i) => i > s && /^##\s+§?\d/.test(l));
    if (e === -1) e = lines.length;
    return { s, e };
  }
  const titleLine = lines[0];
  const s1 = findSection(/^##\s+§?1\b/);
  const s2 = findSection(/^##\s+§?2\b/);
  const s6 = findSection(/^##\s+§?6\b/);
  const parts = [titleLine, ''];
  if (s1) parts.push(...lines.slice(s1.s, s1.e));
  if (s2) parts.push(...lines.slice(s2.s, s2.e));
  if (s6) parts.push(...lines.slice(s6.s, s6.e));
  let text = parts.join('\n');
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n\n_[…template truncated; full §3–§5 in docs/specs/canonical-templates/]_';
  return text;
}

async function buildCompactCanonical() {
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
  return ['# FlowAI SSOT COMPACT EXCERPT (cluster-templates-v3)',
          'Sections: §14, §15.1, §22 (truncated).', '', '---', '',
          slice('## 14. ', '## 15. ', 4500), '',
          slice('## 15. ', '## 16. ', 4500), '',
          slice('## 22. ', '## 23. ', 4500)].join('\n');
}

function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) return { status: 'INVALID', headline: 'INVALID — re-run required.', conditions: [], alternativeWins: [] };
  const conditions = [];
  const alternativeWins = [];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const wonDrafted = v.topKey === q.draftedKey;
    const isStrong = /^(UNANIMOUS|SUPERMAJORITY|QUORUM_PLURALITY)/.test(v.verdict);
    if (wonDrafted && isStrong) continue;
    if (!wonDrafted && isStrong) {
      const opt = q.options.find((o) => o.key === v.topKey);
      alternativeWins.push({ qId: q.id, newPosition: opt?.text, verdict: v.verdict });
      continue;
    }
    conditions.push({ qId: q.id, verdict: v.verdict, draftedKey: q.draftedKey, detail: v.detail });
  }
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'All 6 templates RATIFIED.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `All 6 templates ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `${conditions.length} of 6 template(s) lack clear majority on PROMOTE.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[cluster-templates-v3] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

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
    const raw = await readFile(p, 'utf8');
    const compact = stripAnchor(extractCompactTemplate(raw, 14000));
    templateBodies.push({ ...t, text: compact });
  }
  const draftText = templateBodies.map((tb) => `═══════════════ CLUSTER ${tb.cluster} ${tb.ver} — ${tb.label} (${tb.file}) ═══════════════\n\n${tb.text}`).join('\n\n');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[cluster-templates-v3] compact canonical: ${compactCanonical.length} · draft: ${draftText.length}\n`);

  const result = await runAdversarialPanelConsultation({
    topic: '6 cluster-fix templates v3 ratification (Wave 1 promotion gate)',
    draftText,
    questions: QUESTIONS,
    seed: 'cluster-templates-v3-ratification-2026-05-17',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();
  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const t = result.tally;
  const md = [`# Panel — 6 Cluster Templates v3 ADVERSARIAL RATIFICATION (2026-05-17)`,
    ``, `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars · **Audit:** ${JSON.stringify(audit)}`,
    ``, `## VERDICT — \`${ratification.status}\``,
    ratification.headline, ``,
    `## Dissent-floor: ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = ${(result.dissentFloor.alignedPct*100).toFixed(1)}% · ${t.distinctObjections} objections · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
    ``, `## Per-template tally`,
    `| Q | Top key | Top / Engaged | Verdict |`, `|---|---|---|---|`,
    ...QUESTIONS.map((q) => `| **${q.id}** | \`${result.perVerdicts[q.id].topKey || '—'}\` | ${result.perVerdicts[q.id].topCount}/${t.engagedTotal} | \`${result.perVerdicts[q.id].verdict}\` |`),
    ``, `## Detail`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const c = t.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id}\nTopic: ${q.topic}\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
    }),
    ``, `## All objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`## Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('### Adversarial pass', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`**Obj ${i+1} — ${o.title}**`, '', `> ${(o.detail||'').replace(/\n/g,'\n> ')}`, '');
      }
      if (r.rejection_steelman) out.push('### Steelman', '', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
      out.push('### Votes', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 80) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n---\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({ schema: 'cluster-templates-v3.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, perReviewer: result.perReviewer, questions: QUESTIONS, templates: TEMPLATES }, null, 2), 'utf8');
  process.stdout.write(`[cluster-templates-v3] status=${ratification.status} alignment=${(result.dissentFloor.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = result.perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[cluster-templates-v3] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
