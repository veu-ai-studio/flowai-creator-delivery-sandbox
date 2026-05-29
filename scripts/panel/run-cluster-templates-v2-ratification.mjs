// scripts/panel/run-cluster-templates-v2-ratification.mjs
//
// W6 ADVERSARIAL Panel — 6 cluster-fix v2 templates (W3 Dispatch #10).
// Re-ratification asking whether v1 conditions are resolved and template is
// ready to promote.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'cluster-templates-v2-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'cluster-templates-v2-ratification-2026-05-17.sidecar.json');

const TEMPLATES = [
  { file: 'CLUSTER_A_COST_GOVERNOR_INTEGRATION.md',     cluster: 'A', label: 'Cost Governor Integration' },
  { file: 'CLUSTER_B_DATA_QUALITY_GATE.md',             cluster: 'B', label: 'Data Quality Gate' },
  { file: 'CLUSTER_C_MODE_CONDITIONAL_BEHAVIOR.md',     cluster: 'C', label: 'Mode-Conditional Behavior' },
  { file: 'CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md',        cluster: 'D', label: 'Audit-Log Topic Schema' },
  { file: 'CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md', cluster: 'E', label: 'Authority-Ceiling Integration' },
  { file: 'CLUSTER_F_MODEL_BUDGET_FALLBACK.md',         cluster: 'F', label: 'Model-Budget Fallback' },
];

const RESOLUTION_LIST = {
  A: 'TOCTOU race (R1), reaper window (R2), deadlock detection (R3), Cluster E ordering (R4)',
  B: 'streaming escape valve (R1), override guardrails (R2), cross-metric normalization (R3), halt-cascade circuit-breaker (R4)',
  C: 'optional mode-block for P1 agents (R1), conditional pipelineMode (R2), enforcement mechanism (R3)',
  D: 'staged topic addition (R1), migration test harness (R2), RLS allow-list (R3), deprecation path (R4)',
  E: 'enforcement authority hierarchy (R1), BaseAgent.guard() ceiling check (R2), EXECUTOR_REGISTRY sibling pattern (R3), mid-request ceiling change (R4)',
  F: 'cost-tier definition (R1), tier-change handling (R2), hierarchical Doppler keys (R3)',
};

function makeQuestion(cluster, label, resolutions) {
  return {
    id: `CL-${cluster}-v2`,
    topic: `Cluster ${cluster} v2 — ${label}. Does v2 resolve the v1 Panel conditions (${resolutions})? Is it ready to promote as canonical?`,
    options: [
      { key: `CL${cluster}V2-PROMOTE`,    text: `PROMOTE — v2 cleanly resolves all v1 conditions for Cluster ${cluster}; template is ready to ship as canonical resolution.` },
      { key: `CL${cluster}V2-CONDITIONS`, text: `PROMOTE-WITH-CONDITIONS — v2 resolves the main v1 conditions but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).` },
      { key: `CL${cluster}V2-REVISE`,     text: `REVISE — one or more v1 conditions is incompletely addressed, or v2 introduces a new defect that must be fixed before promotion (specify which condition and the defect).` },
      { key: `CL${cluster}V2-REJECT`,     text: `REJECT — v2 reveals the v1 problem cannot be fixed by surgical revisions; the cluster needs a different canonical resolution architecture (specify the architectural concern).` },
    ],
    draftedKey: `CL${cluster}V2-PROMOTE`,
  };
}

const QUESTIONS = TEMPLATES.map((t) => makeQuestion(t.cluster, t.label, RESOLUTION_LIST[t.cluster]));

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
  const parts = [];
  parts.push(titleLine, '');
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
  function slice(startMarker, endMarker, maxChars) {
    const s = lines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = lines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    const text = lines.slice(s, e === -1 ? undefined : e).join('\n');
    if (!maxChars || text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n_[…section truncated for bundle-cap]_';
  }
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (cluster-templates-v2 context)',
    'Sections (truncated to fit bundle): §14 (GovernanceAuditLog), §15.1 (26-Agent Roster), §22 (Product-Agnostic).',
    '', '---', '',
    slice('## 14. ', '## 15. ', 5500), '',
    slice('## 15. ', '## 16. ', 5500), '',
    slice('## 22. ', '## 23. ', 5500),
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'All 6 v2 templates RATIFIED to promote.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `All 6 v2 templates ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `${conditions.length} of 6 v2 template(s) lack clear Panel majority on PROMOTE.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[cluster-templates-v2] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  function stripAnchor(s) {
    return s
      .replace(/\(\s*drafted\s*\)/gi, '(authored)')
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
      .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
      .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
      .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
  }

  // Extract §1+§2+§6 from each template, cap each at 14K chars
  const templateBodies = [];
  let totalTemplateChars = 0;
  for (const t of TEMPLATES) {
    const p = path.join(TEMPLATES_DIR, t.file);
    if (!existsSync(p)) throw new Error(`Template not found: ${p}`);
    const raw = await readFile(p, 'utf8');
    const compact = stripAnchor(extractCompactTemplate(raw, 14000));
    templateBodies.push({ ...t, text: compact });
    totalTemplateChars += compact.length;
  }
  const draftText = templateBodies.map((tb) =>
    `═══════════════ CLUSTER ${tb.cluster} v2 — ${tb.label} (${tb.file}) ═══════════════\n\n${tb.text}`
  ).join('\n\n');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[cluster-templates-v2] compact canonical: ${compactCanonical.length} chars · draft (compact §1+§2+§6 × 6): ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: '6 cluster-fix v2 templates re-ratification (W3 Dispatch #10)',
    draftText,
    questions: QUESTIONS,
    seed: 'cluster-templates-v2-ratification-2026-05-17',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();
  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const t = result.tally;
  const md = [`# Panel — 6 Cluster-Fix v2 Templates ADVERSARIAL RE-RATIFICATION (2026-05-17)`, ``,
    `**Templates v2 (W3 Dispatch #10, commits 5c5d3d1..16bc262):**`,
    ...TEMPLATES.map((tt) => `  - Cluster ${tt.cluster} v2 — ${tt.label} (\`${tt.file}\`)`),
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format. PROMOTE/CONDITIONS/REVISE/REJECT options.`,
    `**Started:** ${startedAt}  ·  **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §14+§15.1+§22 canonical + §1+§2+§6 of each v2 template).`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``,
    `## 🚨 RATIFICATION VERDICT — \`${ratification.status}\``,
    ratification.headline, ``,
    ratification.conditions.length > 0 ? `**Conditions per template:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — \`${c.verdict}\` ${c.detail}.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative wins:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — \`${a.verdict}\` → "${a.newPosition?.slice(0, 200)}"`).join('\n\n') : '',
    ``,
    `## DISSENT-FLOOR`,
    `Alignment ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = **${(result.dissentFloor.alignedPct*100).toFixed(1)}%** · objections **${t.distinctObjections}** · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`, ``,
    `## Per-template tally`,
    `| Q | Cluster | Top key | Top / Engaged | Verdict |`, `|---|---|---|---|---|`,
    ...QUESTIONS.map((q) => `| **${q.id}** | ${q.topic.slice(0, 30)}… | \`${result.perVerdicts[q.id].topKey || '—'}\` | ${result.perVerdicts[q.id].topCount} / ${t.engagedTotal} | \`${result.perVerdicts[q.id].verdict}\` |`),
    ``,
    `## Detail`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const c = t.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 160)}"  →  **${c[o.key] || 0}**`);
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
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 100) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n---\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  const sidecar = { schema: 'cluster-templates-v2.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, perReviewer: result.perReviewer, questions: QUESTIONS, templates: TEMPLATES };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[cluster-templates-v2] wrote outputs · status=${ratification.status} · alignment=${(result.dissentFloor.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = result.perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[cluster-templates-v2] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
