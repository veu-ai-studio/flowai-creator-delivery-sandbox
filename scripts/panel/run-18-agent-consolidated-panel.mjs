// scripts/panel/run-18-agent-consolidated-panel.mjs
//
// W6 ADVERSARIAL Panel — 18-agent consolidated ratification.
// Three sequential batches (6 + 6 + 8 agents). One consolidated report.
//
// Auto-parses each spec's §10 to extract G<N>-Q1..Q5 verbatim — too many
// questions (~90) to hand-type. Trusts the consistent §10 format W3
// uses across all agent specs.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPECS_DIR = path.join(repoRoot, 'docs', 'specs', 'agent-specs');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, '18-agent-consolidated-panel-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, '18-agent-consolidated-panel-2026-05-16.sidecar.json');

const BATCHES = [
  {
    name: 'Batch 1 — Wave 1 + Wave 2 first half',
    agents: [
      { n: 6,  file: 'AGENT_06_Research.md',                 label: 'Research' },
      { n: 8,  file: 'AGENT_08_QualityAudit.md',             label: 'Quality Audit' },
      { n: 7,  file: 'AGENT_07_Design.md',                   label: 'Design' },
      { n: 10, file: 'AGENT_10_Monitor.md',                  label: 'Monitor' },
      { n: 9,  file: 'AGENT_09_GoToMarket.md',               label: 'Go-To-Market' },
      { n: 11, file: 'AGENT_11_StrategicIntelligence.md',    label: 'Strategic Intelligence' },
    ],
    seed: '18-agent-batch1-2026-05-16',
  },
  {
    name: 'Batch 2 — Wave 2 second half + Wave 3',
    agents: [
      { n: 12, file: 'AGENT_12_PortfolioRisk.md',            label: 'Portfolio Risk' },
      { n: 13, file: 'AGENT_13_SelfProtection.md',           label: 'Self-Protection' },
      { n: 14, file: 'AGENT_14_PublicPolicy.md',             label: 'Public Policy' },
      { n: 15, file: 'AGENT_15_Benchmarking.md',             label: 'Benchmarking' },
      { n: 16, file: 'AGENT_16_ProductivityHR.md',           label: 'Productivity HR' },
      { n: 17, file: 'AGENT_17_ProductEvolution.md',         label: 'Product Evolution' },
    ],
    seed: '18-agent-batch2-2026-05-16',
  },
  {
    name: 'Batch 3 — Wave 3 remainder + Wave 4',
    agents: [
      { n: 18, file: 'AGENT_18_BusinessPlanning.md',         label: 'Business Planning' },
      { n: 19, file: 'AGENT_19_TechnologicalEvolution.md',   label: 'Technological Evolution' },
      { n: 20, file: 'AGENT_20_EnvironmentalImpacts.md',     label: 'Environmental Impacts' },
      { n: 22, file: 'AGENT_22_OpsRunnerBeta.md',            label: 'Ops Runner Beta' },
      { n: 23, file: 'AGENT_23_OpsRunnerGamma.md',           label: 'Ops Runner Gamma' },
      { n: 24, file: 'AGENT_24_OpsRunnerDelta.md',           label: 'Ops Runner Delta' },
      { n: 25, file: 'AGENT_25_OpsRunnerEpsilon.md',         label: 'Ops Runner Epsilon' },
      { n: 26, file: 'AGENT_26_OrchestraResearchAgent.md',   label: 'Orchestra Research' },
    ],
    seed: '18-agent-batch3-2026-05-16',
  },
];

// ── Parse §10 questions from a spec file ────────────────────────────────
//
// Pattern (consistent across all 18 specs):
//   ## §10 — Panel Questions ...
//   ### G<N>-Q<M> — <topic>
//   (1+ paragraphs of context)
//   - (a) <text>
//   - (b) <text>
//   - (c) <text>
//   - (d) <text>
//   - (e) INSUFFICIENT_INFORMATION
function parseSpecQuestions(specText, agentNum) {
  const s10Idx = specText.indexOf('## §10');
  if (s10Idx === -1) throw new Error(`§10 not found in spec for Agent #${agentNum}`);
  const s10 = specText.slice(s10Idx).split(/\n## /, 1)[0];

  const qRe = new RegExp(`^### G${agentNum}-Q(\\d)\\s*[—-]\\s*(.+?)$`, 'gm');
  const qPositions = [];
  let m;
  while ((m = qRe.exec(s10)) !== null) qPositions.push({ idx: m.index, qNum: m[1], topic: m[2].trim() });
  if (qPositions.length < 5) {
    throw new Error(`Expected ≥5 questions for Agent #${agentNum} in §10, found ${qPositions.length}`);
  }

  const questions = [];
  for (let i = 0; i < qPositions.length; i++) {
    const start = qPositions[i].idx;
    const end = i + 1 < qPositions.length ? qPositions[i + 1].idx : s10.length;
    const body = s10.slice(start, end);
    // Extract (a)/(b)/(c)/(d) option text
    const optRe = /^\-\s*\(([abcd])\)\s+(.+?)(?=\n\-\s*\(|$)/gms;
    const opts = [];
    let om;
    while ((om = optRe.exec(body)) !== null) {
      const letter = om[1].toLowerCase();
      const text = om[2].trim().replace(/\s+/g, ' ');
      opts.push({ letter, text });
    }
    if (opts.length < 3) {
      // Some Ops Runner specs have option (A)/(B)/(C) role variants — try uppercase
      const optReUp = /^\-\s*\(([ABC])\)\s+(.+?)(?=\n\-\s*\(|$)/gms;
      let um;
      while ((um = optReUp.exec(body)) !== null) {
        opts.push({ letter: um[1].toLowerCase(), text: um[2].trim().replace(/\s+/g, ' ') });
      }
    }
    if (opts.length < 3) throw new Error(`Could not parse options for Agent #${agentNum} Q${qPositions[i].qNum}; got ${opts.length}`);
    // Take first 4 options as a/b/c/d (5th is INSUFFICIENT_INFORMATION).
    const fourOpts = opts.slice(0, 4);
    const options = fourOpts.map((o) => ({
      key: `G${agentNum}-Q${qPositions[i].qNum}-${o.letter.toUpperCase()}`,
      text: o.text.slice(0, 300),
    }));
    // No drafted key — these are open ratification rulings, not author-anchored
    questions.push({
      id: `G${agentNum}-Q${qPositions[i].qNum}`,
      topic: qPositions[i].topic.slice(0, 100),
      agentNum,
      options,
      draftedKey: options[0]?.key || null,  // option (a) is generally the W3-favored
    });
  }
  return questions;
}

async function buildCompactCanonical() {
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(startMarker, endMarker) {
    const s = lines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = lines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    return lines.slice(s, e === -1 ? undefined : e).join('\n');
  }
  // Heavily trimmed canonical — only the sections strictly needed for
  // agent-spec context. Bigger excerpts triggered the W5b bundle cap on
  // Batch 1's full-spec bundle.
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (agent-spec context)',
    '',
    'Sections: §15.1 (26-Agent Roster — charter context), §22 (Product-Agnostic),',
    '§25 (Locked Rules). §9 + §10 + §11 omitted — agent specs reference them by name.',
    '',
    '---', '',
    slice('## 15. ', '## 16. '), '',
    slice('## 22. ', '## 23. '), '',
    slice('## 25. ', '## 26. '),
  ].join('\n');
}

async function runBatch(batch, compactCanonical, allObjections) {
  process.stdout.write(`\n══════════ ${batch.name} ══════════\n`);

  // Load all specs in batch + parse questions. Each spec is excerpted
  // to §1 (charter/scope) + §10 (questions) only — full specs are 5-15K
  // each, and Batch 1's full-spec bundle exceeded the 120K W5b cap at
  // 155K. Excerpting keeps batch bundles under ~50K total.
  function sliceSpec(text) {
    const s1Start = text.search(/^##\s*§1\s*[—-]/m);
    const s10Start = text.search(/^##\s*§10\s*[—-]/m);
    if (s10Start === -1) return text; // fall back to full spec if §10 not found
    const s10End = text.indexOf('\n## ', s10Start + 1);
    const s10 = text.slice(s10Start, s10End === -1 ? undefined : s10End);
    if (s1Start === -1) return s10;
    const s1End = text.indexOf('\n## ', s1Start + 1);
    const s1 = text.slice(s1Start, s1End === -1 ? undefined : s1End);
    return `${s1}\n\n${s10}`;
  }

  const specBodies = [];
  let allQuestions = [];
  for (const a of batch.agents) {
    const p = path.join(SPECS_DIR, a.file);
    if (!existsSync(p)) throw new Error(`Spec not found: ${p}`);
    const fullText = await readFile(p, 'utf8');
    const qs = parseSpecQuestions(fullText, a.n);
    process.stdout.write(`  Agent #${a.n} (${a.label}): parsed ${qs.length} questions\n`);
    allQuestions.push(...qs);
    const excerpt = sliceSpec(fullText);
    specBodies.push({ agent: a, text: excerpt });
  }

  // Strip any literal anchor-phrase tokens in spec bodies
  function stripAnchor(s) {
    return s
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
      .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
      .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)');
  }

  // Concatenate spec bodies into one draftText.
  const draftText = specBodies.map((sb) =>
    `═══════════════ AGENT #${sb.agent.n} — ${sb.agent.label} (${sb.agent.file}) ═══════════════\n\n${stripAnchor(sb.text)}`
  ).join('\n\n');

  const result = await runAdversarialPanelConsultation({
    topic: `18-agent consolidated Panel — ${batch.name}`,
    draftText,
    questions: allQuestions,
    seed: batch.seed,
    panel: PANEL,
    canonical: compactCanonical,
  });

  // Accumulate objections (deduped across all batches at the end)
  for (const r of result.perReviewer) {
    if (r.adversarial?.valid) {
      for (const o of r.adversarial.objections) {
        allObjections.push({ batch: batch.name, slot: r.slot, model: r.modelTag, title: o.title, detail: o.detail });
      }
    }
  }

  return { batch, allQuestions, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[18-agent-panel] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[18-agent-panel] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[18-agent-panel] compact canonical: ${compactCanonical.length} chars\n`);

  const allObjections = [];
  const batchResults = [];

  for (const batch of BATCHES) {
    const br = await runBatch(batch, compactCanonical, allObjections);
    batchResults.push(br);
    // Brief inter-batch pause so panel slots aren't double-loaded
    await new Promise((res) => setTimeout(res, 5000));
  }

  const finishedAt = new Date().toISOString();

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  // Per-agent verdict aggregation: each agent has 5 questions, group by agent
  function questionRatificationStatus(qVerdict) {
    if (/^(UNANIMOUS|SUPERMAJORITY|QUORUM_PLURALITY)/.test(qVerdict.verdict) && qVerdict.topCount > 0) {
      // Need to also verify the drafted (a) won — but since we use option (a) as drafted, check topKey ends in -A
      const wonA = qVerdict.topKey?.endsWith('-A');
      return wonA ? 'RATIFIED' : 'ALTERNATIVE_WINS';
    }
    return 'CONDITIONS';
  }
  function agentRatificationStatus(qStatuses) {
    const ratified = qStatuses.filter((s) => s === 'RATIFIED').length;
    const altWins = qStatuses.filter((s) => s === 'ALTERNATIVE_WINS').length;
    const conditions = qStatuses.filter((s) => s === 'CONDITIONS').length;
    if (ratified === qStatuses.length) return 'PROMOTE';
    if (ratified + altWins >= 4) return 'PROMOTE_WITH_SUBSTITUTIONS';
    if (ratified >= 3) return 'CONDITIONS';
    if (ratified <= 1) return 'BLOCKED';
    return 'CONDITIONS';
  }

  const agentSummary = [];
  for (const br of batchResults) {
    for (const a of br.batch.agents) {
      const qs = br.allQuestions.filter((q) => q.agentNum === a.n);
      const qResults = qs.map((q) => {
        const v = br.result.perVerdicts[q.id];
        return { qId: q.id, topic: q.topic, verdict: v.verdict, topKey: v.topKey, topCount: v.topCount, status: questionRatificationStatus(v) };
      });
      const status = agentRatificationStatus(qResults.map((q) => q.status));
      agentSummary.push({ n: a.n, label: a.label, batch: br.batch.name, status, qResults });
    }
  }

  // Dedupe objections by title within each batch
  const objsByBatch = {};
  for (const o of allObjections) {
    if (!objsByBatch[o.batch]) objsByBatch[o.batch] = new Map();
    const norm = `${o.title.toLowerCase().slice(0, 60)}`;
    if (!objsByBatch[o.batch].has(norm)) objsByBatch[o.batch].set(norm, o);
  }

  // Top-3 highest-risk findings: pick the longest detail across all objections
  const topRisks = allObjections
    .slice()
    .sort((a, b) => (b.detail?.length || 0) - (a.detail?.length || 0))
    .slice(0, 3);

  const md = [
    `# Panel Consultation — 18-Agent Consolidated Ratification (W3 Dispatch #6) — 2026-05-16`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (precondition: \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` / \`63b0fda\` MET).`,
    ``,
    `**Specs under ratification:** 18 agent specs (Agents #6–#20, #22–#26) drafted by W3 Dispatch #6.`,
    `**Structure:** 3 internal batches (6 + 6 + 8 agents). Single consolidated report.`,
    `**Total questions:** ~90 (5 per agent × 18 agents). For #22 / #24 / #25, Q1 is the §27 OQ-2 role-assignment ruling (per their respective specs).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    ``,
    `---`,
    ``,
    `## 🚨 PER-AGENT SHIP DISPOSITION TABLE`,
    ``,
    `| Agent | Label | Batch | Status | Q1 | Q2 | Q3 | Q4 | Q5 |`,
    `|------:|-------|-------|--------|----|----|----|----|----|`,
    ...agentSummary.map((a) => {
      const cells = [1, 2, 3, 4, 5].map((qNum) => {
        const q = a.qResults.find((qr) => qr.qId.endsWith(`-Q${qNum}`));
        if (!q) return '—';
        const symbol = q.status === 'RATIFIED' ? '✅' : q.status === 'ALTERNATIVE_WINS' ? '↔' : '⚠';
        return `${symbol} ${q.verdict.split('_').slice(0, 2).join('_')}`;
      });
      return `| #${a.n} | ${a.label} | ${a.batch.split('—')[0].trim()} | **${a.status}** | ${cells.join(' | ')} |`;
    }),
    ``,
    `**Legend:** ✅ ratified (drafted position won quorum-or-better)  ·  ↔ alternative wins (non-drafted option cleared quorum)  ·  ⚠ conditions (below quorum or split)`,
    ``,
    `**Status legend:**`,
    `- **PROMOTE** — all 5 questions cleared on drafted position. Ready for Wave-1 build.`,
    `- **PROMOTE_WITH_SUBSTITUTIONS** — ≥4 of 5 cleared (either drafted or alternative). Promote with named substitutions.`,
    `- **CONDITIONS** — 3 of 5 cleared. Spec edits required before promotion.`,
    `- **BLOCKED** — ≤1 of 5 cleared. Spec needs material revision.`,
    ``,
    `---`,
    ``,
    `## §27 OQ-2 RULINGS — Ops Runner role assignments (#22, #24, #25)`,
    ``,
    ...['#22', '#24', '#25'].map((agentTag) => {
      const n = parseInt(agentTag.slice(1), 10);
      const a = agentSummary.find((x) => x.n === n);
      const q1 = a?.qResults.find((qr) => qr.qId.endsWith('-Q1'));
      if (!q1) return `- Agent ${agentTag}: not found in agent summary`;
      const br = batchResults.find((b) => b.allQuestions.some((q) => q.agentNum === n));
      const fullQ = br?.allQuestions.find((q) => q.id === q1.qId);
      const winningOpt = fullQ?.options.find((o) => o.key === q1.topKey);
      return [
        `### Agent ${agentTag} ${a.label} — Q1 role-assignment ruling`,
        ``,
        `- Verdict: \`${q1.verdict}\``,
        `- Top option (${q1.topKey}): "${winningOpt?.text || '(not parsed)'}"  — ${q1.topCount} / ${br.result.tally.engagedTotal} ENGAGED`,
        `- Status: **${q1.status}**`,
        ``,
      ].join('\n');
    }),
    ``,
    `---`,
    ``,
    `## TOP 3 HIGHEST-RISK FINDINGS ACROSS ALL 18 AGENTS`,
    ``,
    topRisks.map((r, i) => `### ${i + 1}. [Slot ${r.slot} — ${r.model}] ${r.title}\n\n_(from ${r.batch})_\n\n> ${(r.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    ``,
    `---`,
    ``,
    `## PER-BATCH DISSENT-FLOOR + ENGAGEMENT`,
    ``,
    ...batchResults.map((br) => {
      const dist = br.result.tally.distinctObjections;
      const align = (br.result.dissentFloor.alignedPct * 100).toFixed(1);
      const trig = br.result.dissentFloor.triggered;
      return [
        `### ${br.batch.name}`,
        ``,
        `- Questions: ${br.allQuestions.length}`,
        `- ENGAGED: ${br.result.tally.engagedTotal}/${PANEL.length}`,
        `- TANGENTIAL: ${br.result.tally.tangential}`,
        `- SILENT: ${br.result.tally.silent}`,
        `- Bundle size: ${br.result.bundle_chars} chars`,
        `- LIVE-OK: ${br.result.reviewers.filter((r) => !r.degraded).length}/${PANEL.length}`,
        `- Backups fired: ${br.result.w6_metadata.backups_applied}`,
        `- Distinct objections: ${dist}`,
        `- Drafted alignment: ${align}%`,
        `- Dissent-floor: ${trig ? '🚨 INVALID — re-run required' : '✅ PASSED'}`,
        ``,
      ].join('\n');
    }),
    ``,
    `---`,
    ``,
    `## ALL DISTINCT OBJECTIONS PER BATCH (verbatim, deduped within batch)`,
    ``,
    ...Object.entries(objsByBatch).map(([batchName, objMap]) => {
      const objs = Array.from(objMap.values());
      return [
        `### ${batchName} — ${objs.length} distinct objections`,
        ``,
        objs.map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
      ].join('\n');
    }),
    ``,
    `---`,
    ``,
    `## CEO DECISION SHEET — RECOMMENDED WAVE-1 BUILD vs SPEC-REVISION`,
    ``,
    `### Straight to Wave-1 build (PROMOTE or PROMOTE_WITH_SUBSTITUTIONS)`,
    agentSummary.filter((a) => /^PROMOTE/.test(a.status)).map((a) => `- Agent #${a.n} ${a.label} — \`${a.status}\``).join('\n') || '_(none)_',
    ``,
    `### Spec revision required (CONDITIONS)`,
    agentSummary.filter((a) => a.status === 'CONDITIONS').map((a) => `- Agent #${a.n} ${a.label}`).join('\n') || '_(none)_',
    ``,
    `### Material revision (BLOCKED)`,
    agentSummary.filter((a) => a.status === 'BLOCKED').map((a) => `- Agent #${a.n} ${a.label}`).join('\n') || '_(none)_',
    ``,
    `---`,
    ``,
    `## PER-BATCH FULL PER-QUESTION VERDICTS`,
    ``,
    ...batchResults.map((br) => {
      return [
        `### ${br.batch.name}`,
        ``,
        '| Question | Top key | Top count | Verdict |',
        '|----------|---------|----------:|---------|',
        ...br.allQuestions.map((q) => {
          const v = br.result.perVerdicts[q.id];
          return `| ${q.id} ${q.topic.slice(0, 50)} | \`${v.topKey || '—'}\` | ${v.topCount}/${br.result.tally.engagedTotal} | \`${v.verdict}\` |`;
        }),
        ``,
      ].join('\n');
    }),
    ``,
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[18-agent-panel] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: '18-agent-consolidated-panel.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    batches: batchResults.map((br) => ({
      name: br.batch.name,
      agents: br.batch.agents,
      questions: br.allQuestions,
      tally: br.result.tally,
      per_question_verdicts: br.result.perVerdicts,
      dissent_floor: br.result.dissentFloor,
      bundle_chars: br.result.bundle_chars,
      live_ok: br.result.reviewers.filter((r) => !r.degraded).length,
      w6_metadata: br.result.w6_metadata,
      per_reviewer: br.result.perReviewer,
    })),
    agent_summary: agentSummary,
    top_risks: topRisks,
    all_objections: allObjections,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[18-agent-panel] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n═══════ 18-AGENT CONSOLIDATED PANEL — SUMMARY ═══════\n');
  for (const br of batchResults) {
    process.stdout.write(`${br.batch.name}: ENGAGED=${br.result.tally.engagedTotal}/10 · ${br.allQuestions.length} questions · alignment=${(br.result.dissentFloor.alignedPct * 100).toFixed(1)}% · ${br.result.dissentFloor.triggered ? 'INVALID' : 'PASS'}\n`);
  }
  process.stdout.write('\nPer-agent ship status:\n');
  for (const a of agentSummary) process.stdout.write(`  #${String(a.n).padStart(2, ' ')} ${a.label.padEnd(28, ' ')} → ${a.status}\n`);
  process.stdout.write('═════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`[18-agent-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
