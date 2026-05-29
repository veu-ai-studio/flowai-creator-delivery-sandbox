// scripts/panel/run-17-agent-v2-ratification.mjs
//
// W6 ADVERSARIAL Panel — 17 agent specs (cluster-integration revision).
// Three sub-batches (6/6/5) per W6 Dispatch #20. One disposition question per
// agent. Single consolidated transcript.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPECS_DIR = path.join(repoRoot, 'docs', 'specs', 'agent-specs');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, '17-agent-v2-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, '17-agent-v2-ratification-2026-05-17.sidecar.json');

// Sub-batches per dispatch
const SUBBATCH_1 = [
  { id: 6,  file: 'AGENT_06_Research.md',                 label: 'Research' },
  { id: 8,  file: 'AGENT_08_QualityAudit.md',             label: 'Quality Audit' },
  { id: 7,  file: 'AGENT_07_Design.md',                   label: 'Design' },
  { id: 10, file: 'AGENT_10_Monitor.md',                  label: 'Monitor' },
  { id: 9,  file: 'AGENT_09_GoToMarket.md',               label: 'Go-To-Market' },
  { id: 11, file: 'AGENT_11_StrategicIntelligence.md',    label: 'Strategic Intelligence' },
];
const SUBBATCH_2 = [
  { id: 12, file: 'AGENT_12_PortfolioRisk.md',            label: 'Portfolio Risk' },
  { id: 13, file: 'AGENT_13_SelfProtection.md',           label: 'Self-Protection' },
  { id: 14, file: 'AGENT_14_PublicPolicy.md',             label: 'Public Policy' },
  { id: 15, file: 'AGENT_15_Benchmarking.md',             label: 'Benchmarking' },
  { id: 16, file: 'AGENT_16_ProductivityHR.md',           label: 'Productivity & HR' },
  { id: 17, file: 'AGENT_17_ProductEvolution.md',         label: 'Product Evolution' },
];
const SUBBATCH_3 = [
  { id: 18, file: 'AGENT_18_BusinessPlanning.md',         label: 'Business Planning' },
  { id: 19, file: 'AGENT_19_TechnologicalEvolution.md',   label: 'Technological Evolution' },
  { id: 20, file: 'AGENT_20_EnvironmentalImpacts.md',     label: 'Environmental Impacts' },
  { id: 23, file: 'AGENT_23_OpsRunnerGamma.md',           label: 'Ops-Runner Gamma (Cost Governor)' },
  { id: 26, file: 'AGENT_26_OrchestraResearchAgent.md',   label: 'Orchestra Research Agent' },
];

const SUBBATCHES = [
  { name: 'sub-batch-1', agents: SUBBATCH_1 },
  { name: 'sub-batch-2', agents: SUBBATCH_2 },
  { name: 'sub-batch-3', agents: SUBBATCH_3 },
];

function makeQuestion(a) {
  return {
    id: `A-${a.id}`,
    topic: `Agent #${a.id} (${a.label}) — cluster-integration revision. Spec adds canonical-template integration blocks (Cluster A cost-governor, Cluster B data-quality gate, Cluster C mode-conditional, Cluster D audit-log topics, Cluster E authority-ceiling, Cluster F model-budget where applicable). Is this spec ready to promote for Wave 1 build?`,
    options: [
      { key: `A${a.id}-PROMOTE`,    text: `PROMOTE — spec cleanly integrates the canonical cluster templates and is ready for Wave 1 engineering dispatch.` },
      { key: `A${a.id}-CONDITIONS`, text: `PROMOTE-WITH-CONDITIONS — spec is acceptable but the Panel surfaces residual issues that the engineering dispatch should track (non-blocking; specify in rationale).` },
      { key: `A${a.id}-REVISE`,     text: `REVISE — spec has incomplete cluster integration, internal inconsistency, or unresolved cross-cluster concern that must be fixed before Wave 1 build (specify what to fix).` },
      { key: `A${a.id}-REJECT`,     text: `REJECT — spec exposes a deeper structural problem that surgical revisions cannot fix; the agent design needs ground-up rework (specify the structural concern).` },
    ],
    draftedKey: `A${a.id}-PROMOTE`,
  };
}

function extractCompactSpec(raw, maxChars) {
  if (raw.length <= maxChars) return raw;
  // Take first maxChars; spec docs already lead with the most important content
  return raw.slice(0, maxChars) + '\n\n_[…spec truncated for bundle-cap; full text in docs/specs/agent-specs/]_';
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
  return ['# FlowAI SSOT COMPACT EXCERPT (17-agent-v2)',
          'Sections: §14, §15.1, §22.', '', '---', '',
          slice('## 14. ', '## 15. ', 4500), '',
          slice('## 15. ', '## 16. ', 4500), '',
          slice('## 22. ', '## 23. ', 4500)].join('\n');
}

function stripAnchor(s) {
  return s
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
    .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
    .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
    .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
}

async function runSubBatch(subbatch, perAgentMaxChars, canonical) {
  const questions = subbatch.agents.map(makeQuestion);
  const agentBodies = [];
  for (const a of subbatch.agents) {
    const p = path.join(SPECS_DIR, a.file);
    if (!existsSync(p)) throw new Error(`Spec not found: ${p}`);
    const raw = await readFile(p, 'utf8');
    const compact = stripAnchor(extractCompactSpec(raw, perAgentMaxChars));
    agentBodies.push({ ...a, text: compact });
  }
  const draftText = agentBodies.map((ab) => `═══════════════ AGENT #${ab.id} — ${ab.label} (${ab.file}) ═══════════════\n\n${ab.text}`).join('\n\n');
  process.stdout.write(`[${subbatch.name}] draft text: ${draftText.length} chars, agents: ${subbatch.agents.map((a) => a.id).join(',')}\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `17 agent specs — cluster-integration ratification (${subbatch.name})`,
    draftText,
    questions,
    seed: `17-agent-v2-${subbatch.name}-2026-05-17`,
    panel: PANEL,
    canonical,
  });
  return { subbatch: subbatch.name, agents: subbatch.agents, questions, result };
}

function classify(verdict) {
  if (/PROMOTE\b/.test(verdict)) return 'PROMOTE';
  if (/CONDITIONS\b/.test(verdict)) return 'CONDITIONS';
  if (/REVISE\b/.test(verdict)) return 'REVISE';
  if (/REJECT\b/.test(verdict)) return 'REJECT';
  return 'OTHER';
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[17-agent-v2] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[17-agent-v2] compact canonical: ${canonical.length} chars\n`);

  // Per-agent cap: aim to fit each sub-batch in ~95K spec budget (with ~12K canonical + overhead = 107K under 120K cap)
  // Sub-batch 1 has the biggest specs (#6, #7, #8 all >18K); cap at 14K per agent
  // Sub-batches 2 + 3 are smaller; cap at 13K just to be safe
  const RESULTS = [];
  for (const sb of SUBBATCHES) {
    const cap = sb.name === 'sub-batch-1' ? 14000 : 13000;
    process.stdout.write(`[17-agent-v2] running ${sb.name} with per-agent cap ${cap}\n`);
    const out = await runSubBatch(sb, cap, canonical);
    RESULTS.push(out);
    process.stdout.write(`[17-agent-v2] ${sb.name} complete · bundle=${out.result.bundle_chars} · engaged=${out.result.tally.engagedTotal} · objections=${out.result.tally.distinctObjections}\n`);
    for (const q of out.questions) {
      const v = out.result.perVerdicts[q.id];
      process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${out.result.tally.engagedTotal})\n`);
    }
  }
  const finishedAt = new Date().toISOString();

  // Compose consolidated report
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const allAgents = SUBBATCHES.flatMap((s) => s.agents);
  const allQuestions = SUBBATCHES.flatMap((s, i) => s.agents.map(makeQuestion));
  const allVerdicts = {};
  const allObjections = [];
  const summaryRows = [];
  for (const r of RESULTS) {
    for (const q of r.questions) {
      const v = r.result.perVerdicts[q.id];
      const c = r.result.tally.perQuestion[q.id];
      allVerdicts[q.id] = { ...v, perOption: c, subbatch: r.subbatch, engagedTotal: r.result.tally.engagedTotal };
      summaryRows.push({ qId: q.id, agentLabel: q.topic.match(/Agent #(\d+) \(([^)]+)\)/)?.[2] || '?', verdict: v.verdict, top: v.topKey, topCount: v.topCount, engaged: r.result.tally.engagedTotal, category: classify(v.verdict + '_' + (v.topKey || '')) });
    }
    for (const o of r.result.tally.allObjections || []) allObjections.push({ ...o, subbatch: r.subbatch });
  }

  const promoteCount = summaryRows.filter((r) => r.top?.endsWith('-PROMOTE')).length;
  const conditionsCount = summaryRows.filter((r) => r.top?.endsWith('-CONDITIONS')).length;
  const reviseCount = summaryRows.filter((r) => r.top?.endsWith('-REVISE')).length;
  const rejectCount = summaryRows.filter((r) => r.top?.endsWith('-REJECT')).length;
  const otherCount = summaryRows.length - promoteCount - conditionsCount - reviseCount - rejectCount;

  const md = [`# Panel — 17 Agent Specs v2 ADVERSARIAL CLUSTER-INTEGRATION RATIFICATION (2026-05-17)`,
    ``, `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``, `**Sub-batch sizes:** ${RESULTS.map((r) => `${r.subbatch}=${r.agents.length}`).join(', ')}`,
    `**Bundles:** ${RESULTS.map((r) => `${r.subbatch}=${r.result.bundle_chars}`).join(', ')}`,
    ``, `## SUMMARY`,
    ``, `| Top-line | Count |`, `|---|---:|`,
    `| Plain PROMOTE (top key wins) | ${promoteCount} |`,
    `| PROMOTE-WITH-CONDITIONS | ${conditionsCount} |`,
    `| REVISE | ${reviseCount} |`,
    `| REJECT | ${rejectCount} |`,
    `| Other / unresolved | ${otherCount} |`,
    ``, `## Per-agent verdicts`,
    `| Q | Agent | Top key | Top / Engaged | Verdict |`,
    `|---|---|---|---|---|`,
    ...summaryRows.map((r) => `| **${r.qId}** | ${r.agentLabel} | \`${r.top || '—'}\` | ${r.topCount}/${r.engaged} | \`${r.verdict}\` |`),
    ``, `## Per-sub-batch detail`,
    ...RESULTS.map((r) => {
      return [`### ${r.subbatch}`, ``,
        `**Bundle:** ${r.result.bundle_chars} chars`,
        `**Engaged:** ${r.result.tally.engagedTotal} · **Tangential:** ${r.result.tally.tangential} · **Silent:** ${r.result.tally.silent}`,
        `**Distinct objections:** ${r.result.tally.distinctObjections}`,
        `**Alignment:** ${(r.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${r.result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
        ``,
        `Per-question tallies:`,
        ...r.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const c = r.result.tally.perQuestion[q.id];
          const tally = q.options.map((o) => `  - \`${o.key}\` → **${c[o.key] || 0}**`);
          for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
          if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
          return `**${q.id}** verdict=\`${v.verdict}\` (top=${v.topKey} ${v.topCount}/${r.result.tally.engagedTotal})\n${tally.join('\n')}`;
        }),
        ``].join('\n');
    }),
    ``, `## All distinct objections (${allObjections.length} across all 3 sub-batches)`,
    allObjections.map((o, i) => `**${String(i + 1).padStart(2, '0')}. [${o.subbatch} · Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
  ];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');

  const sidecar = {
    schema: '17-agent-v2.sidecar.v1',
    startedAt, finishedAt, audit,
    summary: { promoteCount, conditionsCount, reviseCount, rejectCount, otherCount, totalAgents: summaryRows.length },
    per_agent_verdicts: allVerdicts,
    per_subbatch: RESULTS.map((r) => ({
      subbatch: r.subbatch,
      bundle: r.result.bundle_chars,
      tally: r.result.tally,
      per_question_verdicts: r.result.perVerdicts,
      dissent_floor: r.result.dissentFloor,
      perReviewer: r.result.perReviewer,
      agents: r.agents,
      questions: r.questions,
    })),
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[17-agent-v2] SUMMARY: PROMOTE=${promoteCount} · CONDITIONS=${conditionsCount} · REVISE=${reviseCount} · REJECT=${rejectCount} · OTHER=${otherCount}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[17-agent-v2] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
