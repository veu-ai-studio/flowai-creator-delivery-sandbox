// scripts/panel/run-flowai-scope-ruling.mjs
//
// W6 ADVERSARIAL ruling — FlowAI single-page-vs-full-product scope gap
// and path forward. Uses the W5b-locked adversarial format
// (runAdversarialPanelConsultation) per W05 dispatch 2026-05-16.
// Precondition: b1cd827 / ad2ab28 / 3f9dede confirmed on flowai-v0.1.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runAdversarialPanelConsultation,
  PANEL,
} from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'flowai-scope-ruling-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'flowai-scope-ruling-2026-05-16.sidecar.json');

// Ground-truth brief presented to the Panel as the "draft under review."
// This is W2's read-only finding — verbatim, neutral framing. The dispatch
// is the Panel's RULING on this finding, not a ratification of a spec.
const GROUND_TRUTH = `
W2 GROUND TRUTH BRIEF — FlowAI single-page-vs-full-product scope gap
(read-only, verbatim, neutral)

Established facts (all independently verifiable against the canonical
SSOT and the codebase at HEAD):

1. SSOT §6 specifies a FULL-PRODUCT multi-page authenticated crawl:
   depth=8 (cap 12), pages=200 (cap 2000), 8 interaction passes
   including authenticated session login, click sweeps, modal
   exploration, and embedded AI-agent probing. The specification is
   unambiguous.

2. The function \`aggressiveCrawl()\` (\`src/lib/crawler.js\` lines
   594–722) exists and implements a real multi-page breadth-first
   spider over a single domain. It is wired ONLY to the renewal
   pipeline — NOT to the 8-step assessment pipeline.

3. The 8-step assessment path invokes the simple single-page
   \`crawl()\` function (\`api/research-url.js\` line 23). A user
   running an assessment today receives a homepage-only crawl, not
   a full-product crawl.

4. Authenticated traversal (provider login + session-bearing
   subsequent fetches) is NOT implemented anywhere in the codebase.
   The capability is referenced in code comments and JSDoc only;
   no execution path performs an authenticated multi-page crawl.

5. Agent #21 Ops Runner Alpha is documented in canonical SSOT §15.1
   (row 21) as the agent that owns the Aggressive Crawl Conductor
   role. The agent is DORMANT — no class file shipped, no
   registerAgent() call wired. "Wire-in pending" per the §15.1 row.

6. The shipped product-assessment outputs produced this session were
   generated from the single-page crawl path, not the full-product
   path specified by SSOT §6.

W2's stated classification:
  "This is an IMPLEMENTATION gap, not a specification gap. The SSOT is
  sound; the code lags. The renewal pipeline already has the multi-page
  engine; the assessment pipeline needs to be wired through it, Agent
  #21 needs to be canonically registered, and authenticated-traversal
  needs to be built."

The Panel is asked to RULE on whether W2's classification is correct
AND to recommend the path forward. The Panel is NOT being asked to
ratify a spec amendment. Vote on the SUBSTANCE — there is no preferred
position the Panel should defer to. The dispatch explicitly forbids
anchoring; option text in the questions below contains no
author-preference labels of any kind.
`.trim();

// Question schema — locked-format conformant. Every option text is
// stripped of anchor language; \`draftedKey\` for each question encodes
// "the SSOT/W2-aligned position" for dissent-floor evaluation only — it
// is NOT shown to the Panel and reviewers cannot tell which option it is.
const QUESTIONS = [
  {
    id: 'Q1',
    topic: 'Is W2 right that this is an IMPLEMENTATION gap or a SPECIFICATION gap?',
    options: [
      { key: 'Q1-IMPL',   text: 'Implementation gap — SSOT is sound; wire the engine that already exists.' },
      { key: 'Q1-SPEC',   text: 'Specification gap — SSOT over-specifies vs what is buildable today.' },
      { key: 'Q1-BOTH',   text: 'Both — SSOT is sound in principle but parts of §6 are unbuildable as written.' },
      { key: 'Q1-UNDET',  text: 'Cannot determine from the evidence presented.' },
    ],
    draftedKey: 'Q1-IMPL',
  },
  {
    id: 'Q2',
    topic: 'Is single-page assessment as shipped this session a defect or an acceptable interim?',
    options: [
      { key: 'Q2-DEFECT',  text: 'Defect — single-page output must not be presented as a product assessment until the full-product crawl is wired.' },
      { key: 'Q2-LABELED', text: 'Acceptable interim only if the UI + report header explicitly label the output as single-page, not full-product.' },
      { key: 'Q2-SUFFICE', text: 'Acceptable — single-page is sufficient for the use cases actually shipped.' },
      { key: 'Q2-REFRAME', text: 'Reject the framing — none of these capture the right answer; explain in rationale.' },
    ],
    draftedKey: 'Q2-DEFECT',
  },
  {
    id: 'Q3',
    topic: 'Path-forward priority — auth-traversal is unbuilt and Agent #21 is dormant. What is the correct next build?',
    options: [
      { key: 'Q3-WIRE-AC',     text: 'Wire aggressiveCrawl() into the assessment pipeline first — multi-page coverage now, authenticated traversal can follow.' },
      { key: 'Q3-AUTH-FIRST',  text: 'Build authenticated traversal first — depth without auth has limited value on real apps that gate content behind login.' },
      { key: 'Q3-AGENT-21',    text: 'Wire Agent #21 Ops Runner Alpha canonically first — per the SSOT §15.1 ownership row, not as a code shortcut around the agent layer.' },
      { key: 'Q3-DEFER-ALL',   text: 'Defer all three — prove the value of single-page assessment first before investing in full-product crawl machinery.' },
    ],
    draftedKey: 'Q3-AGENT-21',
  },
  {
    id: 'Q4',
    topic: 'Should the 20 dormant agents be built before or after the full-product crawl + auth gap is closed?',
    options: [
      { key: 'Q4-AFTER',   text: 'After — most dormant agents assume full-product input that does not yet exist; building on missing substrate is rework risk.' },
      { key: 'Q4-BEFORE',  text: 'Before — agent graduation is independent of crawl scope; they can be built against single-page input and adapted later.' },
      { key: 'Q4-PARTIAL', text: 'Partial — only crawl-independent dormant agents before; crawl-dependent ones after the substrate exists.' },
      { key: 'Q4-REFRAME', text: 'Reject the framing — wrong question; explain in rationale.' },
    ],
    draftedKey: 'Q4-AFTER',
  },
  {
    id: 'Q5',
    topic: 'Biggest unmitigated risk in proceeding to wire full-product + auth crawl now.',
    options: [
      { key: 'Q5-AUTH-SEC',  text: 'Authenticated-traversal security: credential storage, session bleed, accidental data exfiltration via crawl.' },
      { key: 'Q5-COST',      text: 'Crawl cost and time blowup at depth=8 / pages=200 — every assessment becomes a multi-minute, multi-dollar operation.' },
      { key: 'Q5-SCORING',   text: 'The scoring engine has not been validated on multi-page input — quality metrics may not generalise from homepage to whole product.' },
      { key: 'Q5-FOUNDATION',text: 'Building on three already-found "sounds-done-but-isn\'t" gaps without a foundation audit; more such gaps likely lurk and will compound.' },
    ],
    draftedKey: null, // open-ended risk identification — no Panel-pressure direction
  },
  {
    id: 'Q6',
    topic: 'Disposition — what should happen next.',
    options: [
      { key: 'Q6-PROCEED', text: 'Proceed — wire full-product crawl and build authenticated traversal per SSOT §6 as the priority build.' },
      { key: 'Q6-STAGED',  text: 'Proceed in defined phases with explicit gates — staged build, each phase Panel-or-CEO-reviewed before the next.' },
      { key: 'Q6-AUDIT',   text: 'Pause — conduct a full foundation audit of all "sounds-done-but-isn\'t" gaps before initiating any new build.' },
      { key: 'Q6-RESCOPE', text: 'Reject — the project needs strategic re-scoping at CEO level first; SSOT §6 may not be the right target for FlowAI right now.' },
    ],
    draftedKey: 'Q6-PROCEED',
  },
];

// ───── Rendering ─────────────────────────────────────────────────────────

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | Top option | Top count | Verdict |`);
  rows.push(`|---|---|---|---:|---|`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const topText = v.topKey ? (q.options.find((o) => o.key === v.topKey)?.text || v.topKey) : '—';
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 60)} | ${topText.slice(0, 80)} | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderPerQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const c = t.perQuestion[q.id];
    const tallyLines = q.options.map((o) => `  - "${o.text}"  →  **${c[o.key] || 0}**`);
    if (c.unmatched) tallyLines.push(`  - _(unmatched)_ →  ${c.unmatched}`);
    return [
      `### ${q.id} — ${q.topic}`,
      ``,
      `Tally (ENGAGED-only, ${t.engagedTotal} reviewers):`,
      ...tallyLines,
      ``,
      `**Verdict:** \`${v.verdict}\` — ${v.detail}.`,
      ``,
    ].join('\n');
  }).join('\n');
}

function renderObjections(allObjections) {
  if (!allObjections || allObjections.length === 0) return '_(no objections submitted)_';
  return allObjections.map((o, i) =>
    `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`
  ).join('\n');
}

function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``;
    const lines = [head, ''];
    if (r.state === 'SILENT') {
      lines.push(`_(degraded / parse-failure)_`);
      lines.push('');
      return lines.join('\n');
    }
    if (r.invalid_reason) {
      lines.push(`**Invalid reason:** ${r.invalid_reason}`);
      lines.push('');
    }
    if (r.adversarial?.valid) {
      lines.push(`### Adversarial pass`);
      lines.push('');
      for (const [i, o] of r.adversarial.objections.entries()) {
        lines.push(`**Objection ${i + 1} — ${o.title}**`);
        lines.push('');
        lines.push(`> ${(o.detail || '').replace(/\n/g, '\n> ')}`);
        lines.push('');
      }
      lines.push(`**Worse-than-status-quo scenario:** ${r.adversarial.worse_than_status_quo}`);
      lines.push('');
      lines.push(`**Precedent:** ${r.adversarial.precedent}`);
      lines.push('');
    }
    if (r.rejection_steelman) {
      lines.push(`### Rejection steelman`);
      lines.push('');
      lines.push(`> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    if (r.state === 'ENGAGED' || r.state === 'TANGENTIAL') {
      lines.push(`### Votes`);
      lines.push('');
      for (const q of QUESTIONS) {
        const v = r.votes[q.id] || {};
        const optText = v.key ? (q.options.find((o) => o.key === v.key)?.text || v.key) : (v.pick_text || '—');
        lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` ("${optText}")`);
        if (v.rationale) lines.push(`  > ${v.rationale}`);
      }
      lines.push('');
    }
    if (r.overallNotes) {
      lines.push(`Overall: ${r.overallNotes}`);
      lines.push('');
    }
    return lines.join('\n');
  }).join('\n---\n\n');
}

function renderRawResponses(reviewers) {
  return reviewers.map((r, idx) => {
    const slot = idx + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP FIRED]' : '';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    const out = [];
    out.push(`### Slot ${slot}${tag} — ${r.provider}:${modelStr}`);
    out.push('');
    out.push(`- Provider: \`${r.provider}\``);
    out.push(`- Latency: ${r.latency_ms} ms`);
    out.push(`- HTTP status: ${r.degraded ? 'DEGRADED' : 'OK'}`);
    if (r.slot_backup_applied) out.push(`- Primary that failed: \`${r.primary_slot_provider}:${r.primary_slot_model}\` (error: ${r.primary_slot_error ?? 'unknown'})`);
    if (r.error) out.push(`- Error: ${r.error}`);
    out.push('');
    out.push('```');
    out.push((r.raw_output ?? '(no output)').slice(0, 8000));
    out.push('```');
    out.push('');
    return out.join('\n');
  }).join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[flowai-scope-ruling] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[flowai-scope-ruling] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(`Panel composition not the 10-unique-provider roster — halting.`);
  }

  const result = await runAdversarialPanelConsultation({
    topic: 'FlowAI single-page-vs-full-product scope gap and path forward',
    draftText: GROUND_TRUTH,
    questions: QUESTIONS,
    seed: 'flowai-scope-ruling-2026-05-16',
    panel: PANEL,
  });

  const finishedAt = new Date().toISOString();

  // Strongest single argument against = longest rejection_steelman.
  const strongestRejection = result.perReviewer
    .filter((r) => typeof r.rejection_steelman === 'string')
    .map((r) => ({ slot: r.slot, model: r.modelTag, text: r.rejection_steelman }))
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const t = result.tally;
  const perVerdicts = result.perVerdicts;
  const dissent = result.dissentFloor;

  const md = [
    `# Panel Consultation — FlowAI Scope Gap + Path Forward (ADVERSARIAL RULING) — 2026-05-16`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (commits \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` precondition MET). Anti-rubber-stamp controls active: anchor-phrase guard, mandatory adversarial pass (≥3 concrete objections + 1 worse-than-status-quo scenario + 1 precedent or honest "no precedent known"), mandatory rejection steelman, dissent floor (\`> 80 %\` drafted-direction alignment combined with \`< 5\` distinct objections triggers \`INSUFFICIENT_ADVERSARIAL_SIGNAL\`).`,
    ``,
    `**Lineage:** W05 dispatch → W6 execution. This consultation is a RULING on a W2-established implementation gap, not a ratification of a spec amendment.`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (full CANONICAL_REFERENCE.md + W2 ground-truth brief).`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    `**Seed:** \`${result.seed}\``,
    ``,
    `**W6 thresholds:** Quorum = 7/10 · Supermajority = 8/10 · Unanimous = all-ENGAGED on one option.`,
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION (Control 4)`,
    ``,
    `Drafted-direction alignment across questions with a draftedKey (Q1, Q2, Q3, Q4, Q6; Q5 excluded — open-ended risk question):`,
    ``,
    `  Aligned: **${dissent.alignedCount} of ${dissent.totalPossible}** ENGAGED votes  (${(dissent.alignedPct * 100).toFixed(1)} %)`,
    `  Distinct substantive objections: **${t.distinctObjections}**`,
    `  Trigger condition: alignment > 80 % AND objections < 5.`,
    ``,
    dissent.triggered
      ? `**🚨 RESULT: \`INSUFFICIENT_ADVERSARIAL_SIGNAL\` — re-run required.** ${dissent.reason}.`
      : `**✅ RESULT: Adversarial signal passes dissent floor — verdict is VALID.** ${dissent.reason}.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
    ``,
    `| Slot | Provider | Model | Region/Role | Backup? | Status | State | Invalid reason |`,
    `|------|----------|-------|-------------|---------|--------|-------|----------------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const cfg = SLOT_CONFIG[idx];
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? `YES → ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || r.model}` : '—';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      const region = cfg ? `${cfg.region} · ${cfg.role}` : '';
      const pr = result.perReviewer[idx];
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${region} | ${backup} | ${status} | \`${pr.state}\` | ${pr.invalid_reason ?? '—'} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (≥7 LIVE-OK): ${result.w6_metadata.quorum_met}.`,
    ``,
    `Adversarial-protocol classification: **ENGAGED**=${t.engagedTotal}, TANGENTIAL=${t.tangential}, INVALID (votes discarded)=${t.invalid}, SILENT=${t.silent}`,
    ``,
    `---`,
    ``,
    `## Per-question tally`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `### Per-question detail`,
    ``,
    renderPerQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## All distinct substantive objections (verbatim, deduplicated)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST proceeding (longest rejection steelman)`,
    ``,
    strongestRejection
      ? `**From Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}`
      : '_(no rejection steelman submitted)_',
    ``,
    `---`,
    ``,
    `## Per-reviewer adversarial pass + steelman + votes`,
    ``,
    renderPerReviewer(result.perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses (first 8K chars each)`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[flowai-scope-ruling] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'flowai-scope-ruling.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_size: result.bundle_chars,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally,
    per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions,
    seed: result.seed,
    perReviewer: result.perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[flowai-scope-ruling] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ FLOWAI SCOPE RULING — ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED (controls met):  ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`INVALID (votes discarded): ${t.invalid}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Drafted alignment:       ${(dissent.alignedPct * 100).toFixed(1)} %\n`);
  process.stdout.write(`Dissent-floor result:    ${dissent.triggered ? 'INSUFFICIENT_ADVERSARIAL_SIGNAL — re-run required' : 'PASS — verdict valid'}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const topText = v.topKey ? q.options.find((o) => o.key === v.topKey)?.text.slice(0, 60) : '—';
    process.stdout.write(`  ${q.id}: ${v.verdict} — "${topText}…" ${v.topCount}/${t.engagedTotal}\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[flowai-scope-ruling] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
