// scripts/panel/run-flowai-self-testing-emergency.mjs
//
// W6 Emergency Panel — FlowAI self-testing capability.
//
// One focused adversarial Panel of the 4 judgment questions J1-J4
// posed by the W6 emergency dispatch (2026-05-20). Quorum >=7/10
// ENGAGED per Locked Rule 17. Foreground; no v-iteration; this is
// a one-shot Panel disposition.

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
const MD_PATH = path.join(OUTPUT_DIR, 'flowai-self-testing-emergency-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'flowai-self-testing-emergency-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'J1',
    topic: 'J1 — Is PATH B (audit-only, no fixes, no new deployable URL) an acceptable design for FlowAI, or a fundamental flaw that must be fixed for FlowAI to deliver its promise per CA-18 §1 ("any URL in -> new deployable URL out, perfected across all 10 quality dimensions per run")?',
    options: [
      { key: 'J1-FLAW',        text: 'Fundamental flaw — PATH B as audit-only contradicts CA-18 §1 ("Output: ALWAYS a new, separate, deployable URL"). A URL-in path that produces no new URL is not FlowAI by definition; it is a separate audit tool mislabeled as FlowAI. MUST be fixed.' },
      { key: 'J1-ACCEPTABLE',  text: 'Acceptable design — audit-only is a legitimate Mode A (read-only inspection) and the "new URL out" promise applies only when the user explicitly requests construction/improvement. PATH B as audit can coexist with a separate Construct/Improve path.' },
      { key: 'J1-DEFERRABLE',  text: 'Flaw but deferrable — PATH B violates §1 in principle but the proof-phase exemption allows shipping audit-only externally while construction matures internally; document the gap and revisit at GA.' },
      { key: 'J1-REFRAME',     text: 'Reframe the question — PATH B is fine IF the UI labels it explicitly as "Audit" (a distinct surface from "Improve"); the §1 promise applies to the Improve surface only. Add a labeling fix, not an architectural fix.' },
    ],
    draftedKey: 'J1-FLAW',
  },
  {
    id: 'J2',
    topic: 'J2 — What is the minimum architectural change to enable FlowAI to improve any URL submitted through its own UI (including its own URL flowai-dun.vercel.app/flowai), without CLI workarounds — i.e., to satisfy CA-18 §1 end-to-end through the UI?',
    options: [
      { key: 'J2-UI-CONSTRUCT', text: 'Wire the UI submit-URL form to the existing Construction Engine (CA-17 S1-S8) end-to-end: URL input -> S1 baseline -> S2-S7 transform -> S8 deploy-to-new-URL, with progress streamed to the UI. No new architecture; activate what already exists per CA-17 + remove the audit-only short-circuit in PATH B.' },
      { key: 'J2-ENGINE-MERGE', text: 'Merge PATH A (CLI construction) and PATH B (UI audit) into a single canonical FlowAI Engine that any caller (UI, CLI, API, agent) invokes the same way; PATHs become call-sites, not separate engines.' },
      { key: 'J2-NEW-PRODUCT-ROUTE', text: 'Add a "submit any URL" canonical entry-point that registers the URL as a new product_registry entry and triggers the standard §11 Six-Step Clearance + §29 Build/Wire flow; UI calls this entry-point. Minimal: it is one new HTTP route + product_registry insert, but reuses every downstream engine.' },
      { key: 'J2-MANUAL-MIGRATION', text: 'Provide the operator a UI affordance to migrate any submitted URL into the existing product_registry manually (one-click "adopt as product"), then run the existing construction flow against the adopted product. Cheaper than full URL-in/URL-out automation; preserves operator control.' },
    ],
    draftedKey: 'J2-UI-CONSTRUCT',
  },
  {
    id: 'J3',
    topic: 'J3 — Should FlowAI-on-FlowAI (the platform improving its own UI/source) be the PRIMARY proof-of-concept — i.e., fix the product\'s ability to improve itself BEFORE testing any external product (RelTwin, SAIGE, etc.) — per CA-18 §5 ("FlowAI applies to its own development process")?',
    options: [
      { key: 'J3-SELF-FIRST', text: 'YES, self-first. §5 explicitly makes FlowAI-on-FlowAI canonical. A platform that cannot improve itself through its own UI has not yet demonstrated the §1 promise; testing external products before the self-test is theatre. Lock external proof until self-loop closes.' },
      { key: 'J3-PARALLEL',   text: 'No — self-loop and external-loop should proceed in parallel. Self-loop matures the engine; external-loop matures the I/O surface (jurisdictional declarations, deploy-target diversity, finding-source breadth). Each surfaces different defects.' },
      { key: 'J3-EXTERNAL-FIRST', text: 'No — external products are higher fidelity proofs. FlowAI itself is too small/familiar a target; improving its own static dashboard does not exercise the full §2 dimension space. RelTwin/SAIGE are richer test surfaces.' },
      { key: 'J3-MILESTONE-GATED', text: 'Self-first ONLY through a defined milestone (e.g. one full improvement cycle completed against flowai-dun.vercel.app/flowai with measurable score delta + new URL deployed), then external products. Avoids indefinite self-loop while honoring §5.' },
    ],
    draftedKey: 'J3-SELF-FIRST',
  },
  {
    id: 'J4',
    topic: 'J4 — Is the current testing approach (running improvement cycles via CLI scripts invoked through Claude Code agents, with the UI unable to complete a full cycle) valid evidence that FlowAI works as a product, or does it invalidate the proof because the product is not being exercised through its own product surface?',
    options: [
      { key: 'J4-INVALIDATES', text: 'INVALIDATES the proof. FlowAI\'s product surface is the UI per CA-18 §1 ("any URL in -> new deployable URL out"). Cycles run via Claude Code CLI workarounds prove only that the engine library functions, not that the product exists. A product that requires an LLM agent operator to bypass its own UI is not yet a product.' },
      { key: 'J4-VALID-ENGINE-PROOF',  text: 'VALID as engine-level proof; INVALID as product-level proof. Distinguish the two: the CLI runs prove the §29 Construction Engine + §10 Self-Audit work end-to-end; they do not prove the product surface works. Both proofs are needed; the current state has one of two.' },
      { key: 'J4-VALID-INTERIM',  text: 'VALID for the proof phase. CLI/Claude-Code invocation is the same FlowAI engine; the UI is a deployment surface, not the engine. Proof-of-concept requires the engine to function; UI wiring is a downstream Ship-engineering task. Do not conflate the two.' },
      { key: 'J4-INVALID-AND-MISLEADING', text: 'Worse than invalid — actively misleading. Reporting "FlowAI improved product X" when the only invocation path was a Claude-Code-operated CLI builds false expectations among reviewers/stakeholders that the UI works. Either (a) stop calling these runs "FlowAI improvement cycles" until the UI closes the loop, or (b) explicitly mark every artifact "produced via CLI; UI does not yet support this".' },
    ],
    draftedKey: 'J4-INVALIDATES',
  },
];

const ARTIFACT = `# FlowAI Self-Testing Capability — Emergency Panel Brief (2026-05-20)

## Situation

FlowAI's deployed UI at \`flowai-dun.vercel.app/flowai\` cannot currently complete a full improvement cycle on a URL the user pastes into it. Two paths exist today:

- **PATH A (CLI construction).** A construction run can be initiated against a registered product (e.g. RelTwin) via Claude-Code-operated CLI scripts in \`scripts/\` (e.g. construction-engine bypass per W5a Stage 3 Phase 1, env-gated for the proof phase). This path can execute §29 Build/Wire S1-S8, emit S1Baseline preScore, and produce intermediate construction artifacts. It does NOT run from the UI; an LLM agent (Claude Code) operates the CLI by hand. There is no operator-facing surface for PATH A.

- **PATH B (UI arbitrary-URL submission).** The UI accepts an arbitrary URL submitted via the "improve any URL" form. The form runs a §10 Self-Audit (or partial audit) and surfaces findings. It does NOT generate fixes, does NOT iterate, does NOT deploy a new URL. The user submits a URL, sees an audit, and the cycle ends. There is no new URL out.

## CA-18 §1 (canonical, ENTRY 018 LIVE)

> **Input:** any URL, specification, or pasting (existing site, natural-language description, document, code).
>
> **Output:** ALWAYS a **new, separate, deployable URL** — perfected across all quality dimensions per §2. The input is **never destructively modified**. The new URL supersedes or complements the input; **both are preserved**.

This is the canonical promise. PATH A satisfies §1 only via a non-UI surface operated by an LLM agent. PATH B does not satisfy §1 at all — it produces findings, not a new URL.

## CA-18 §5 (canonical, ENTRY 018 LIVE)

> **FlowAI applies to its own development process.** VEU AI Studio's own development workflow — including the development of FlowAI itself — is a valid target for FlowAI's construction and improvement capabilities. FlowAI is not exempt from its own quality standards. The §29 Build/Wire Construction Engine (per CA-17 ENTRY 016) explicitly applies to construction-class operations against FlowAI's own source tree, subject to the same S1-S8 invariants. The §10 Self-Audit Quality Audit engine is FlowAI auditing FlowAI. The §11 Six-Step Clearance Protocol applies when FlowAI itself is treated as a deployable product. This self-application is not a special case; it is the canonical operating mode of a tool that improves things and is itself a thing.

If §5 is binding, then FlowAI-on-FlowAI (the platform improving its own UI, dashboard, source tree) must be reachable through its own UI — otherwise §5 collapses to "FlowAI applies to its own development only when an LLM agent operates a CLI", which is not the published promise.

## The gap

The current state — PATH A operator-less, PATH B not URL-in/URL-out — means there is no operator-reachable path through the published product surface to satisfy CA-18 §1. The product surface does not yet do what canonical SSOT says the product does.

Sub-questions this Panel must resolve:

1. Is PATH B (audit-only, no new URL) an acceptable design under CA-18 §1, or a fundamental flaw?
2. What is the minimum architectural change to make PATH B produce a new URL (or to unify PATH A and PATH B into a single URL-in/URL-out path operable from the UI)?
3. Should FlowAI-on-FlowAI be the primary proof-of-concept gate (must close the self-loop before testing external products), per §5?
4. Is the current PATH A testing (CLI scripts driven by Claude Code agents) valid evidence the product works, or does it invalidate the proof because the product surface is not exercising itself?

## Anchor facts

- The UI at \`flowai-dun.vercel.app/flowai\` exists and accepts URL input.
- The §29 Construction Engine exists (per CA-17 ENTRY 016) and PATH A has produced partial construction runs end-to-end against RelTwin.
- The §10 Self-Audit engine exists and PATH B runs it against arbitrary URLs.
- The bridge between "PATH B accepts a URL" and "the Construction Engine generates a new deployable URL from that input" is the architectural piece missing today.
- Recent commits (W5a stage 3 phase 1, env-gated bypass) advanced PATH A; no commits have wired PATH B to construction.
- CA-18 §1 + §5 were ratified 2026-05-19 (CEO-ratification track, Locked Rule 13, no Panel — promoted as ENTRY 018).

## What Panel must decide

For each of J1-J4 below, render a verdict from the listed options. Plurality is acceptable; quorum is >=7/10 ENGAGED. Non-cleared verdicts route to CEO disposition for resolution; the Panel does NOT need to converge to a single option, but each member MUST pick one option per question and supply rationale.
`;

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
  // §1 mission, §2 markets/scope, §9-§11 engine sections, §29 build/wire
  const sections = [
    ['## 1. ', '## 2. ', 3000],
    ['## 2. ', '## 3. ', 2500],
    ['## 9. ', '## 10. ', 2500],
    ['## 10. ', '## 11. ', 2500],
    ['## 11. ', '## 12. ', 2500],
  ];
  // Also append CA-18 §1 + §5 verbatim from the amendment file
  const ca18Raw = await readFile(path.join(repoRoot, 'docs', 'specs', 'FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md'), 'utf8');
  const ca18Lines = ca18Raw.split(/\r?\n/);
  const cuts = (start, end) => {
    const a = ca18Lines.findIndex((l) => l.startsWith(start));
    const b = ca18Lines.findIndex((l, i) => i > a && l.startsWith(end));
    return ca18Lines.slice(a, b === -1 ? undefined : b).join('\n');
  };
  const ca18Section1 = cuts('## §1 — Core Definition', '## §2');
  const ca18Section5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');
  return [
    '# FlowAI SSOT COMPACT EXCERPT (emergency Panel — self-testing capability)',
    '',
    '---',
    '',
    '# CA-18 §1 (canonical per ENTRY 018, LIVE 2026-05-19)',
    '',
    ca18Section1,
    '',
    '---',
    '',
    '# CA-18 §5 (canonical per ENTRY 018, LIVE 2026-05-19)',
    '',
    ca18Section5,
    '',
    '---',
    '',
    ...sections.map(([s, e, max]) => slice(s, e, max)).filter(Boolean).map((t) => t + '\n'),
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[emergency-panel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[emergency-panel] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'FlowAI self-testing capability — emergency Panel (CA-18 §1 + §5 conformance gap)',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'flowai-self-testing-emergency-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[emergency-panel] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — FlowAI self-testing capability emergency (2026-05-20)`, ``,
    `**Dispatch:** W6 Emergency Panel — FlowAI cannot complete a full improvement cycle through its own UI; CA-18 §1 ("URL in -> new URL out") + §5 ("FlowAI applies to its own development") are at stake.`,
    `**Bundle:** ${result.bundle_chars} chars`,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Engaged:** ${t.engagedTotal}/10 · Tangential: ${t.tangential} · Silent: ${t.silent}`,
    `**Distinct objections:** ${t.distinctObjections}`,
    `**Alignment:** ${(result.dissentFloor.alignedPct*100).toFixed(1)}% · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
    `**Quorum:** ≥${QUORUM}/10 ENGAGED per Locked Rule 17`,
    ``, `## Per-question`,
    `| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥${QUORUM}) |`,
    `|---|---|---|---|---|`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
      return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
    }),
    ``, `## Detail`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const c = result.tally.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 160)}" → **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id}\n${q.topic}\n\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
    }),
    ``, `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    ``, `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const lines = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') return lines.concat(['_(degraded)_', '']).join('\n');
      if (r.adversarial?.valid) {
        lines.push('**Adversarial pass:**', '');
        for (const [i, o] of r.adversarial.objections.entries()) lines.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
        lines.push('');
      }
      if (r.rejection_steelman) lines.push('**Steelman:**', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
      lines.push('**Votes:**', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 140) || vt.key) : (vt.pick_text || '—');
        lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) lines.push(`  > ${vt.rationale}`);
      }
      return lines.join('\n');
    }).join('\n\n'),
  ];
  await writeFile(MD_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({
    schema: 'emergency-panel.sidecar.v1',
    dispatch: 'W6 Emergency Panel — FlowAI self-testing capability (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[emergency-panel] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[emergency-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
