// scripts/panel/run-14-agent-v2-reratification.mjs
//
// W6 ADVERSARIAL Panel — 14 v2 Wave-1 agent specs RE-RATIFICATION.
// Quorum ≥7/10 per Locked Rule 17. RATIFY / REVISE / REJECT.
// Excludes #7, #15, #19 (already cleared as PROMOTE-WITH-CONDITIONS).
// Excludes #22, #24, #25 (Ops-Runners not in Wave 1 v2 batch).

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, '14-agent-v2-reratification-2026-05-18.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, '14-agent-v2-reratification-2026-05-18.sidecar.json');

const SUBBATCH_1 = [
  { id: 6,  file: 'AGENT_06_Research.md',                 label: 'Research (v2)',                  resolved: '9 prior Panel objections' },
  { id: 8,  file: 'AGENT_08_QualityAudit.md',             label: 'Quality Audit (v2)',             resolved: '7 prior Panel objections (rubric gate, SSOT field partition, per-dim error isolation)' },
  { id: 10, file: 'AGENT_10_Monitor.md',                  label: 'Monitor (v2)',                   resolved: '9 prior Panel objections (3-boundary PII scrub, 35-pattern coverage, hybrid sentiment, Phase 2 sibling)' },
  { id: 26, file: 'AGENT_26_OrchestraResearchAgent.md',   label: 'Orchestra Research (v2)',        resolved: 'CA-9-Q4 Option (a) LOCKED; orchestra-research-executor sibling registered' },
];
const SUBBATCH_2 = [
  { id: 9,  file: 'AGENT_09_GoToMarket.md',               label: 'Go-To-Market (v2)',              resolved: 'topic canonicalisation, hybrid rule+LLM, VEU §1.1 PERMANENT scope' },
  { id: 13, file: 'AGENT_13_SelfProtection.md',           label: 'Self-Protection (v2)',           resolved: 'Phase 2 watermark hard-gated, DMCA counsel-review mandatory, Cluster B empty-batch exception' },
  { id: 11, file: 'AGENT_11_StrategicIntelligence.md',    label: 'Strategic Intelligence (v2)',    resolved: 'topic canonicalisation, #11↔#26 cycle-breaker, hybrid rule+LLM, VEU §1.1' },
  { id: 12, file: 'AGENT_12_PortfolioRisk.md',            label: 'Portfolio Risk (v2)',            resolved: 'flowAiOnly + RLS, vendor-concentration policy, P0 SLA 3-tier fallback' },
  { id: 23, file: 'AGENT_23_OpsRunnerGamma.md',           label: 'Ops-Runner Gamma / Cost Gov (v2)', resolved: 'cross-step mode, self-reference cycle break (cost-governor-self boundary class)' },
];
const SUBBATCH_3 = [
  { id: 14, file: 'AGENT_14_PublicPolicy.md',             label: 'Public Policy (v2)',             resolved: 'counsel-review queue mandatory, hybrid rule+LLM, per-assessment audit trail' },
  { id: 17, file: 'AGENT_17_ProductEvolution.md',         label: 'Product Evolution (v2)',         resolved: 'mode canonicalised always-on, 3-tier fallback + degraded envelope, hybrid classification' },
  { id: 16, file: 'AGENT_16_ProductivityHR.md',           label: 'Productivity / HR (v2)',         resolved: 'flowAiOnly single-tenant + RLS, developer-PII scrubber, hybrid classification' },
  { id: 18, file: 'AGENT_18_BusinessPlanning.md',         label: 'Business Planning (v2)',         resolved: 'per-category drift thresholds + baselineConfidence, expectedImpact CIs, topic canonicalisation, cost-governor break' },
  { id: 20, file: 'AGENT_20_EnvironmentalImpacts.md',     label: 'Environmental Impacts (v2)',     resolved: '3-tier carbon-factor policy (static bundled + quarterly refresh + per-provider tertiary)' },
];

const SUBBATCHES = [
  { name: 'sub-batch-1', agents: SUBBATCH_1 },
  { name: 'sub-batch-2', agents: SUBBATCH_2 },
  { name: 'sub-batch-3', agents: SUBBATCH_3 },
];

function makeQuestion(a) {
  return {
    id: `A-${a.id}`,
    topic: `Agent #${a.id} v2 — ${a.label}. Resolved in v2: ${a.resolved}. Given v2 addresses the prior Panel REVISE conditions, what is the disposition?`,
    options: [
      { key: `A${a.id}-RATIFY`, text: `RATIFY — v2 cleanly resolves the prior Panel REVISE conditions; spec is ready for Wave 1 engineering wire-in.` },
      { key: `A${a.id}-CONDITIONS`, text: `RATIFY-WITH-CONDITIONS — v2 resolves the main prior conditions but the Panel surfaces residual issues that the engineering dispatch should track (non-blocking; specify in rationale).` },
      { key: `A${a.id}-REVISE`, text: `REVISE — one or more prior conditions is incompletely addressed, or v2 introduces a new defect that must be fixed before Wave 1 wire-in (specify what to fix).` },
      { key: `A${a.id}-REJECT`, text: `REJECT — v2 exposes a structural problem that surgical revisions cannot fix; the agent needs a different design.` },
    ],
    draftedKey: `A${a.id}-RATIFY`,
  };
}

function extractCompactSpec(raw, maxChars) {
  if (raw.length <= maxChars) return raw;
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
  return ['# FlowAI SSOT COMPACT EXCERPT (14-agent v2 reratification)',
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
  const bodies = [];
  for (const a of subbatch.agents) {
    const p = path.join(SPECS_DIR, a.file);
    if (!existsSync(p)) throw new Error(`Spec not found: ${p}`);
    const raw = await readFile(p, 'utf8');
    bodies.push({ ...a, text: stripAnchor(extractCompactSpec(raw, perAgentMaxChars)) });
  }
  const draftText = bodies.map((b) => `═══════════════ AGENT #${b.id} v2 — ${b.label} (${b.file}) ═══════════════\n\n${b.text}`).join('\n\n');
  process.stdout.write(`[${subbatch.name}] draft text: ${draftText.length} chars, agents: ${subbatch.agents.map((a) => a.id).join(',')}\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `14 v2 Wave-1 agent specs — re-ratification (${subbatch.name})`,
    draftText,
    questions,
    seed: `14-agent-v2-${subbatch.name}-2026-05-18`,
    panel: PANEL,
    canonical,
  });
  return { subbatch: subbatch.name, agents: subbatch.agents, questions, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[14-agent-v2-rerat] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');
  const canonical = await buildCompactCanonical();
  process.stdout.write(`[14-agent-v2-rerat] compact canonical: ${canonical.length} chars\n`);

  const RESULTS = [];
  for (const sb of SUBBATCHES) {
    const cap = sb.name === 'sub-batch-1' ? 15000 : 13000;
    process.stdout.write(`[14-agent-v2-rerat] running ${sb.name} cap=${cap}\n`);
    const out = await runSubBatch(sb, cap, canonical);
    RESULTS.push(out);
    process.stdout.write(`[14-agent-v2-rerat] ${sb.name} complete · bundle=${out.result.bundle_chars} · engaged=${out.result.tally.engagedTotal} · objections=${out.result.tally.distinctObjections}\n`);
    for (const q of out.questions) {
      const v = out.result.perVerdicts[q.id];
      process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${out.result.tally.engagedTotal})\n`);
    }
  }
  const finishedAt = new Date().toISOString();
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const allVerdicts = {};
  const allObjections = [];
  const summaryRows = [];
  for (const r of RESULTS) {
    for (const q of r.questions) {
      const v = r.result.perVerdicts[q.id];
      const c = r.result.tally.perQuestion[q.id];
      allVerdicts[q.id] = { ...v, perOption: c, subbatch: r.subbatch, engagedTotal: r.result.tally.engagedTotal };
      summaryRows.push({ qId: q.id, agentLabel: q.topic.match(/Agent #(\d+) v2 — ([^.]+)\./)?.[2] || '?', verdict: v.verdict, top: v.topKey, topCount: v.topCount, engaged: r.result.tally.engagedTotal });
    }
    for (const o of r.result.tally.allObjections || []) allObjections.push({ ...o, subbatch: r.subbatch });
  }

  // Classify by suffix on top key
  const ratify = summaryRows.filter((r) => r.top?.endsWith('-RATIFY'));
  const conditions = summaryRows.filter((r) => r.top?.endsWith('-CONDITIONS'));
  const revise = summaryRows.filter((r) => r.top?.endsWith('-REVISE'));
  const reject = summaryRows.filter((r) => r.top?.endsWith('-REJECT'));
  const QUORUM = 7;
  const quorumRatify = ratify.filter((r) => r.topCount >= QUORUM);

  const md = [`# Panel — 14 v2 Wave-1 Agent Specs RE-RATIFICATION (2026-05-18)`,
    ``, `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Quorum:** ≥${QUORUM}/10 per Locked Rule 17`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``, `## SUMMARY`,
    ``, `| Verdict basket | Count | Quorum (≥${QUORUM}) |`, `|---|---:|---:|`,
    `| RATIFY (top key wins) | ${ratify.length} | ${quorumRatify.length} |`,
    `| RATIFY-WITH-CONDITIONS | ${conditions.length} | — |`,
    `| REVISE | ${revise.length} | — |`,
    `| REJECT | ${reject.length} | — |`,
    ``, `## Per-agent`,
    `| Q | Agent | Verdict | Top key | Top / Engaged |`,
    `|---|---|---|---|---|`,
    ...summaryRows.map((r) => `| **${r.qId}** | ${r.agentLabel.trim()} | \`${r.verdict}\` | \`${r.top}\` | ${r.topCount}/${r.engaged} |`),
    ``, `## Sub-batch detail`,
    ...RESULTS.map((r) => {
      return [`### ${r.subbatch}`, '',
        `Bundle: ${r.result.bundle_chars} chars · Engaged: ${r.result.tally.engagedTotal} · Objections: ${r.result.tally.distinctObjections} · Alignment: ${(r.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${r.result.dissentFloor.triggered ? '🚨 INVALID' : '✅ PASS'}`,
        '',
        `Per-question tallies:`,
        ...r.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const c = r.result.tally.perQuestion[q.id];
          const tally = q.options.map((o) => `  - \`${o.key}\` → **${c[o.key] || 0}**`);
          for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
          if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
          return `**${q.id}** verdict=\`${v.verdict}\` (top=${v.topKey} ${v.topCount}/${r.result.tally.engagedTotal})\n${tally.join('\n')}`;
        }), ''].join('\n');
    }),
    ``, `## All distinct objections (${allObjections.length} across all 3 sub-batches)`,
    allObjections.map((o, i) => `**${String(i + 1).padStart(2, '0')}. [${o.subbatch} · Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
  ];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');

  const sidecar = {
    schema: '14-agent-v2-rerat.sidecar.v1',
    startedAt, finishedAt, audit,
    summary: { ratifyCount: ratify.length, quorumRatify: quorumRatify.length, conditionsCount: conditions.length, reviseCount: revise.length, rejectCount: reject.length, totalAgents: summaryRows.length },
    per_agent_verdicts: allVerdicts,
    per_subbatch: RESULTS.map((r) => ({ subbatch: r.subbatch, bundle: r.result.bundle_chars, tally: r.result.tally, per_question_verdicts: r.result.perVerdicts, dissent_floor: r.result.dissentFloor, perReviewer: r.result.perReviewer, agents: r.agents, questions: r.questions })),
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[14-agent-v2-rerat] SUMMARY: RATIFY=${ratify.length} (quorum=${quorumRatify.length}) · CONDITIONS=${conditions.length} · REVISE=${revise.length} · REJECT=${reject.length}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[14-agent-v2-rerat] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
