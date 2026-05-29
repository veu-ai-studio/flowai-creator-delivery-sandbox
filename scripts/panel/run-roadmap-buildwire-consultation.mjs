// scripts/panel/run-roadmap-buildwire-consultation.mjs
//
// W6 ADVERSARIAL Panel — Two orchestration judgments:
//   J1 — Capability roadmap & sequencing (5-stage decomposition)
//   J2 — Build/wire engine approach (lifts 25% diff cap for construction)
// Quorum ≥7/10 per Locked Rule 17.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'roadmap-buildwire-consultation-2026-05-18.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'roadmap-buildwire-consultation-2026-05-18.sidecar.json');

const J1_PROPOSAL = `
J1 PROPOSED 5-STAGE CAPABILITY ROADMAP:

Stage 1 — COMPREHENSIVE FUNCTIONAL SURFACE TESTING
  Phase A (current surface verification): HTTP 2xx + smoke-test DOM elements
  Phase B (interactive adversarial): authenticated flows, error-state recovery,
    engine adversarial probes (already canonicalized in CA-14-A pending CEO).
  Output: phase_a_pass + phase_b_pass booleans + §7.6 findings.

Stage 2 — MULTI-DIMENSIONAL QUALITY AUDIT + PURPOSE CAPTURE
  Five-rubric Quality Audit (uiUxRubric / apiRubric / dataRubric / authRubric /
    perfRubric per Agent #8 spec).
  Purpose Capture: operator-stated product intent (Mode 1 spec-driven), inferred
    intent (Mode 2 reverse-engineered from surface), attested intent (Mode 3A).
  Output: dimensional quality score + canonical purpose declaration in ProductSSOT.

Stage 3 — BUILD/WIRE ENGINE
  Generate real backend endpoints + data layer.
  Wire dead controls to them (detected shell/mock → real wired software).
  Construction-class changes (multi-file, new files, new tables) instead of
    surgical fix-class changes (single-file diff).
  Output: actually-functional product (post-construction).

Stage 4 — THREE SUBMISSION MODES + FULL-LIFECYCLE GENERIC PROOF
  Mode 1 (spec-driven): spec → 8-step pipeline → product (greenfield).
  Mode 2 (live-URL-only): URL → reverse-engineer purpose + spec → renewal cycle.
  Mode 3A (operator-attested): operator declares purpose + scope → assess +
    renew against declaration.
  Full lifecycle proof: at least one VEU product makes the entire trip from
    submission through GTM-ready (≥95) across all three modes.
  Output: existence proof of generic engine on real operator product.

Stage 5 — END-STAGE SSOT-CONFORMANCE TEST
  The complete system runs against itself: ProductSSOT writes match the canonical
    §7.5 schema; governance_record_entry conforms to CA-10-A.2; §11 Six-Step
    Clearance Protocol completes cleanly on every product; §22 Product-Agnostic
    Rule verified (zero per-product code in core engine).
  Output: canonical conformance certificate.

`;

const J2_PROPOSAL = `
J2 PROPOSED BUILD/WIRE ENGINE APPROACH:

CURRENT CONSTRAINT (per CA-14-B and Self-Renewal v4):
  - 25%-max surgical-diff cap on Self-Renewal PRs (per finding category)
  - Parse-gate (every change must parse)
  - Regression-guard (5 fix-safety invariants: diff-only / preserve / parse /
    regression-guard / attribution)
  - "Never ship a regression" canonical guarantee — refuse PR + exit
    NO_IMPROVEMENT if §7.6 regresses

PROPOSED MODIFICATION FOR CONSTRUCTION WORK:
  When the engine detects a shell/mock (HTTP 404 on referenced endpoint, dead
  onClick handler, controlled component with no backing state, table referenced
  in UI but no migration), it triggers BUILD/WIRE construction mode:

  1. LIFT THE 25% DIFF CAP for construction-class changes specifically.
     A new backend endpoint may be a 200-line file; a new migration may add
     a multi-column table; wiring a control may touch 4-6 files. The 25%
     surgical cap was designed for surgical FIX work, not construction.

  2. KEEP PARSE-GATE — every generated file must parse (JS/TS via ts.parse,
     SQL via parse_sql, etc).

  3. KEEP REGRESSION-GUARD — full §7.6 re-assessment after construction; the
     pre/post delta must be non-negative on every Five-Layer dimension that
     was non-zero pre-construction.

  4. KEEP "NEVER SHIP A REGRESSION" — same canonical guarantee; refuse PR
     if post-construction §7.6 drops below pre-construction.

  5. MARK construction commits with a NEW commit-message prefix
     ("build(wire-X):") so audit trail distinguishes construction from
     surgical fix.

  6. CONSTRUCTION TRIGGERS A MANDATORY PHASE B run BEFORE PR opens —
     surgical-only would-have stayed in Phase A, but construction must
     exercise the new wiring interactively.

OPEN ENGINEERING QUESTIONS (not for Panel; engineering-dispatch surface):
  - Should construction commits be a separate Executor (build-wire-executor)
    or expand the existing self-renewal-executor charter?
  - Is the build/wire engine a new Agent (#27?) or an Agent #3 capability
    extension?
  - How does construction interact with the per-product branch-of-record
    invariant (CA-14-D Invariant 1)?

`;

const QUESTIONS = [
  {
    id: 'J1', topic: 'J1 — Capability roadmap & sequencing. The proposed 5-stage decomposition is: (1) comprehensive functional surface testing → (2) Multi-Dimensional Quality Audit + purpose capture → (3) build/wire engine → (4) three submission modes + full-lifecycle generic proof → (5) end-stage SSOT-conformance test. Is this the correct order and decomposition for completing FlowAI as a generic, product-agnostic engine?',
    options: [
      { key: 'J1-RATIFY',  text: 'RATIFY — the 5-stage sequence is correct as drafted. Each stage gates the next; the ordering captures both internal substrate readiness (1→2) and external generic proof (3→4→5).' },
      { key: 'J1-REVISE',  text: 'REVISE — the decomposition is mostly correct but the order needs adjustment. Provide the corrected sequence in rationale (e.g. swap stages, merge stages, insert intermediate stage).' },
      { key: 'J1-REJECT',  text: 'REJECT — the decomposition is wrong at a structural level (e.g. wrong number of stages, wrong primitive, missing essential capability). Provide the alternative decomposition in rationale.' },
      { key: 'J1-MORE',    text: 'NEED MORE STAGES / DETAIL — the proposal is too high-level; before ratification, additional stages or sub-stages must be specified (e.g. canonical-spec convergence, agent-roster completion, RLS/security hardening). Provide what is missing.' },
    ],
    draftedKey: 'J1-RATIFY',
  },
  {
    id: 'J2', topic: 'J2 — Build/wire engine approach. To convert a detected shell/mock into real wired software, the engine generates real backend endpoints + data layer, wires dead controls to them, and lifts the 25%-max surgical-diff cap FOR construction work specifically — while keeping parse-gate + regression-guard + "never ship a regression" enforced. Is this sound?',
    options: [
      { key: 'J2-RATIFY',  text: 'RATIFY — the construction-class carve-out from the 25% diff cap is sound; parse-gate + regression-guard + never-ship-a-regression remain the load-bearing safety invariants. Build/wire is genuinely a different work-class from surgical fix.' },
      { key: 'J2-REVISE',  text: 'REVISE — the carve-out is directionally correct but the safety invariants need strengthening (e.g. add construction-specific gates, require explicit operator approval gate, cap construction by file count instead of diff %, mandate Phase B). Provide the safer construction strategy in rationale.' },
      { key: 'J2-REJECT',  text: 'REJECT — construction work should not flow through the same engine as surgical fix. Build/wire belongs to a separate workstream (greenfield generator, human-written code, separate Executor with stricter controls). Provide the alternative architecture in rationale.' },
      { key: 'J2-PARTIAL', text: 'PARTIAL — accept construction for some scopes (e.g. wiring dead controls) but reject for others (e.g. greenfield endpoints, schema migrations). Specify which scopes are safe in rationale.' },
    ],
    draftedKey: 'J2-RATIFY',
  },
];

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
  return [
    '# FlowAI SSOT COMPACT EXCERPT (roadmap + build/wire context)',
    'Sections: §6 (Aggressive Crawling), §7 (Output Contract incl. §7.5 ProductSSOT + §7.6 GTM Readiness), §10 (Self-Governance), §11 (Six-Step Clearance), §22 (Product-Agnostic Rule), §25 (Locked Rules incl. §6, §17).',
    '', '---', '',
    slice('## 6. ', '## 7. ', 4500), '',
    slice('## 7. ', '## 8. ', 5000), '',
    slice('## 10. ', '## 11. ', 3500), '',
    slice('## 11. ', '## 12. ', 3500), '',
    slice('## 22. ', '## 23. ', 3000), '',
    slice('## 25. ', '## 26. ', 3500),
  ].join('\n');
}

const QUORUM = 7;

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[roadmap-buildwire] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const draftText = [J1_PROPOSAL, '', '═══════════════════════════════════════', '', J2_PROPOSAL].join('\n');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[roadmap-buildwire] compact canonical: ${compactCanonical.length} · draft: ${draftText.length}\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'FLOWAI CAPABILITY ROADMAP + BUILD/WIRE ENGINE — two orchestration judgments',
    draftText,
    questions: QUESTIONS,
    seed: 'roadmap-buildwire-consultation-2026-05-18',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();

  const summary = QUESTIONS.map((q) => {
    const v = result.perVerdicts[q.id];
    return { qId: q.id, verdict: v.verdict, top: v.topKey, topCount: v.topCount, engaged: result.tally.engagedTotal, cleared: v.topCount >= QUORUM && v.topKey === q.draftedKey, tallyByOption: result.tally.perQuestion[q.id] };
  });

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const t = result.tally;
  const md = [`# Panel — FlowAI Capability Roadmap + Build/Wire Engine Consultation (2026-05-18)`,
    ``, `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars`,
    `**Quorum:** ≥${QUORUM}/10 per Locked Rule 17`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``, `## SUMMARY`,
    `- Engaged: ${t.engagedTotal}/10 · Tangential: ${t.tangential} · Silent: ${t.silent}`,
    `- Distinct objections: ${t.distinctObjections}`,
    `- Dissent floor: ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = ${(result.dissentFloor.alignedPct*100).toFixed(1)}% · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
    ``, `## Per-question verdicts`,
    `| Q | Verdict | Top key | Top / Engaged | Cleared (≥${QUORUM}) |`,
    `|---|---|---|---|---|`,
    ...summary.map((s) => `| **${s.qId}** | \`${s.verdict}\` | \`${s.top || '—'}\` | ${s.topCount}/${s.engaged} | ${s.cleared ? '✅' : '—'} |`),
    ``, `## Detail per question`,
    ...QUESTIONS.map((q) => {
      const s = summary.find((x) => x.qId === q.id);
      const c = result.tally.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 160)}" → **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id}\n\n${q.topic}\n\nTally (n=${s.engaged}):\n${tally.join('\n')}\n\n**Verdict:** ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged})\n`;
    }),
    ``, `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    ``, `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('**Adversarial pass:**', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
        out.push('');
      }
      if (r.rejection_steelman) out.push('**Steelman:**', '', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
      out.push('**Votes:**', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({ schema: 'roadmap-buildwire.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, summary, perReviewer: result.perReviewer, questions: QUESTIONS, quorum_floor: QUORUM }, null, 2), 'utf8');
  for (const s of summary) process.stdout.write(`  ${s.qId}: ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged}) cleared=${s.cleared}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[roadmap-buildwire] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
