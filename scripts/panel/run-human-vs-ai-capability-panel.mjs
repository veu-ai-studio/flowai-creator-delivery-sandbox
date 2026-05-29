// scripts/panel/run-human-vs-ai-capability-panel.mjs
//
// W6 Panel — what does a human do that AI tools cannot do, for THIS
// specific FlowAI project? Forces concrete answers, not abstract ones.
// Quorum >=7/10 ENGAGED per Locked Rule 17.
//
// K1A: which is the MOST irreducible AI-vs-human gap for FlowAI?
// K1B: is the gap capability, trust, workflow, or mixed?
// K2:  is the $8-15K spend genuinely necessary, nice-to-have,
//      not-needed, or depends-on?
// K3:  if the spend IS made, week-by-week deliverable shape

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
const MD_PATH = path.join(OUTPUT_DIR, 'human-vs-ai-capability-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'human-vs-ai-capability-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'K1A',
    topic: 'K1A — Of the concrete tasks a part-time human engineer would perform on THIS FlowAI project, which is the MOST irreducible — the one AI tools (Claude Code, Codex, v0.dev, Base44, Cursor, Gemini, Panel-as-verifier) demonstrably cannot perform reliably in 2026, even when stacked together? Pick ONE.',
    options: [
      { key: 'K1A-LIVE-PROD-VERIFICATION', text: 'LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes, and judge whether the result is actually improved. Vercel deploy logs, browser DevTools output, network panel timings, visual UI judgment — these are seen with eyes, not parsed from text. The orchestrator overclaim pattern this session has been precisely this: AI reporting "PR shipped" when the verifiable state was prUrl=null across 18 runs because nobody opened the live URL to check.' },
      { key: 'K1A-SUSTAINED-CROSS-SESSION-ACCOUNTABILITY', text: 'SUSTAINED CROSS-SESSION ACCOUNTABILITY. Every Claude Code session is fresh; context resets between turns; there is no continuous memory of what was promised on Monday vs. what shipped by Thursday. The "0 PRs across 18 runs while orchestrator claimed FlowAI improved products" failure is partly that no single AI agent OWNS the through-line. A human carries the punch list in their head across days. AI tools fail this because of the architectural property of session amnesia, not because of model quality.' },
      { key: 'K1A-CALIBRATED-SCOPE-ESTIMATES', text: 'CALIBRATED SCOPE ESTIMATES. AI tools (including Claude Code, this orchestrator) systematically underestimate the scope of production work — "this is a single PR" is the canonical AI overclaim. A senior engineer who has shipped production software has calibrated intuitions: knows that "wire UI to construction engine" is not a single PR but 4-8 PRs once auth, error states, rate limiting, observability, and rollback paths are real. AI tools optimize for plausible-sounding completion; humans optimize for "will this survive Monday morning".' },
      { key: 'K1A-STAKEHOLDER-PRODUCT-JUDGMENT', text: 'STAKEHOLDER + PRODUCT JUDGMENT. "Does this feel investor-grade?" "Is the demo narratively coherent?" "Should we ship Tuesday or Thursday given the investor call?" "Is this UI screenshot embarrassing or polished?" These are product/business judgment calls that require taste built up across years of shipping products to humans. AI can produce competent UI but cannot reliably call "this is investor-grade" vs "this is technical-demo-grade".' },
    ],
    draftedKey: 'K1A-LIVE-PROD-VERIFICATION',
  },
  {
    id: 'K1B',
    topic: 'K1B — The K1A gap is fundamentally: (a) a CAPABILITY gap that no AI tool in 2026 can close; (b) a TRUST gap (AI can do it; we just cannot detect when it is wrong without a human); (c) a WORKFLOW gap (AI can do it; the workflow around AI is what fails); or (d) MIXED. Pick the most honest classification.',
    options: [
      { key: 'K1B-CAPABILITY-IRREDUCIBLE', text: 'CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye verification of "does the demo work?" is the canonical example: even with perfect Playwright tests, "is this UI investor-grade?" is a judgment call AI cannot reliably render.' },
      { key: 'K1B-TRUST-AI-CAN-WE-CANT-VERIFY', text: 'TRUST GAP. AI tools CAN perform the task (write the code, ship the PR, run the test, verify the deploy) — they just cannot be TRUSTED without a verifier that operates on a different inference substrate. The Panel is one such verifier (10 model families) but is too slow/costly for per-action use. Humans are another verifier with different failure modes. The gap is auditability, not capability.' },
      { key: 'K1B-WORKFLOW-SESSION-AMNESIA', text: 'WORKFLOW GAP. AI tools have the capability but the session/turn/dispatch architecture loses through-line accountability. Each session resets; no agent owns the punch list across days; commitments made on day 1 are forgotten by day 3. The fix is workflow design (persistent task tracker; daily standup ritual; cross-session memory) — NOT a human. A human is the easy fix but a workflow change closes the same gap.' },
      { key: 'K1B-MIXED', text: 'MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (session amnesia, no daily ritual). A human engineer addresses (a) genuinely; (b) and (c) could in principle be closed without a human but the project has not invested in the workflow infrastructure to do so.' },
    ],
    draftedKey: 'K1B-MIXED',
  },
  {
    id: 'K2',
    topic: 'K2 — HONEST EVALUATION: given (a) Victor\'s no-budget constraint, (b) demonstrated AI failure patterns this session (4 Panels + 1 audit + 0 PRs shipped), (c) current AI tool capabilities in 2026 (Claude Code + v0.dev + Cursor + Lovable + Bolt + Base44 + Playwright + Vercel), (d) the specific FlowAI scope (URL in → new URL out via UI), and (e) the prior Panel\'s 10/10 hire-engineer vote — is the $8-15K spend genuinely necessary, or is it the Panel\'s default-bias toward human oversight?',
    options: [
      { key: 'K2-GENUINELY-NECESSARY', text: 'GENUINELY-NECESSARY. The K1A irreducible gap (live production verification by human eyes) is critical-path for FlowAI specifically: the entire CA-18 §1 promise ("URL in → new URL out via UI") is verified by a human opening the URL and judging the result. Without that loop closed by a human, FlowAI cannot be proven to work to anyone (investors, users, Victor himself). The prior 10/10 vote was correct; the $8-15K (or even $25-50K) buys the verification loop AI tools cannot close. Spend the money. Even ~40 hours of senior eyes is worth more than any AI configuration today.' },
      { key: 'K2-NICE-TO-HAVE', text: 'NICE-TO-HAVE. AI tools can do most of what the engineer would do (write code, ship PRs, run tests, deploy). What the human adds is speed + judgment + accountability + the K1A-LIVE-PROD-VERIFICATION loop — valuable but not strictly required. Victor himself, given enough time, could close the verification loop by manually clicking through the UI after each AI-generated PR. The human accelerates but does not unlock new capability. If the budget existed, hire; if not, Victor + Panel + Claude Code can complete the MVP scope over more elapsed time (likely 3-4× as long).' },
      { key: 'K2-NOT-NEEDED', text: 'NOT-NEEDED. The Panel\'s prior 10/10 hire-engineer verdict was default-bias (the canonical Panel pattern: when in doubt, recommend human oversight). In reality, AI tools in 2026 stacked correctly (Claude Code for backend wiring + v0.dev for UI + Cursor for line-by-line + Lovable/Bolt for full-app scaffold + Playwright for tests + Panel for verification + Victor for live-eye final checks) can ship the K2-SIMPLIFY MVP scope without paid engineering help. The structural fix is workflow discipline (persistent task tracker, daily Victor-on-keyboard verification ritual, per-dispatch Panel adjudication), not adding a human. Save the $8-15K for tooling credits + Vercel + Supabase paid tiers.' },
      { key: 'K2-DEPENDS-ON-VICTOR-TIME', text: 'DEPENDS-ON Victor\'s time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools are sufficient — Victor IS the human in K1A. If Victor cannot spend that time (CEO duties, fundraising, other products), the $8-15K buys those 10-15 hrs/week from someone else and becomes genuinely-necessary. The deciding factor is Victor\'s personal bandwidth, not AI capability.' },
    ],
    draftedKey: 'K2-DEPENDS-ON-VICTOR-TIME',
  },
  {
    id: 'K3',
    topic: 'K3 — If the spend IS made ($8-15K part-time Upwork engineer, 5-10 hrs/week × 8 weeks), what concrete deliverable shape should the 8 weeks produce? Pick the sequencing that gives Victor the most defensible artifact at the end. Week 2 / week 4 / week 8 milestones must be specific.',
    options: [
      { key: 'K3-FLOWAI-MVP-END-TO-END', text: 'FlowAI MVP end-to-end: Week 2 — UI→Construction wired (URL submit triggers wire_up class; preview URL returned to UI). Week 4 — pre-run honest-assessment gate + trajectory reporting in UI. Week 8 — flowai-on-flowai self-application cycle producing measurable score delta + new URL deployed. Deliverable: a working FlowAI URL-in/URL-out cycle through flowai-dun.vercel.app/flowai. Defensibility: directly satisfies CA-18 §1 + §5; demo extractable.' },
      { key: 'K3-VEU-FLAGSHIP-PRODUCT', text: 'Skip FlowAI; ship 1 VEU flagship product end-to-end via off-the-shelf (per prior K3 8/10 portfolio-first verdict). Week 2 — RelTwin (or MyPregLife) MVP scoped + auth + Stripe wired via Lovable/v0.dev. Week 4 — 10 paying beta users onboarded. Week 8 — published live with public sign-ups + revenue. Deliverable: a paying VEU product. Defensibility: revenue + real users, not a demo.' },
      { key: 'K3-MIXED-2WEEK-FLOWAI-6WEEK-VEU', text: 'Mixed: 2 weeks FlowAI bare-minimum MVP (URL submit → audit-only, but actually working through the UI — i.e. honestly delivering what PATH B claims today). Then 6 weeks on 1 VEU flagship product via off-the-shelf. Week 2 — FlowAI honest PATH-B audit works through UI (no construction wiring; just stop overclaiming). Week 4 — VEU flagship picked + scaffolded via Lovable. Week 8 — VEU flagship live + first beta users. Defensibility: a honestly-described FlowAI + a real VEU product.' },
      { key: 'K3-VERIFICATION-LOOP-ONLY', text: 'VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer\'s 5-10 hrs/week is spent opening browsers, clicking through deploys, reading Supabase rows, judging UI quality, calling out AI overclaim. Week 2 — verification ritual established + first 10 AI PRs verified through the loop. Week 4 — verification cadence stable; AI overclaim rate documented + falling. Week 8 — Victor has a calibrated picture of where AI tools fail; FlowAI MVP shipped through the verification loop. Deliverable: the K1A gap closed plus whatever AI-shippable code Victor + AI tools land. Defensibility: addresses the diagnosed root cause.' },
    ],
    draftedKey: 'K3-VERIFICATION-LOOP-ONLY',
  },
];

const ARTIFACT = `# What does a human engineer do that AI cannot? — verifiable-facts brief (2026-05-20)

## A. Context — what prior Panels said

- W6 production-gtm-or-alternative (402d303): 10/10 UNANIMOUS K4-HIRE-CONTRACT-ENGINEER (Next.js+Node+Vercel+Supabase, 6-8 weeks, $25-50K). The unanimity was striking — no model picked agency, CTO co-founder, or AI-only-with-checkpoints.
- W6 W7 verification (3d9df57): cross-run 9/11 K4-PANEL-AS-PRIMARY-VERIFIER (skip W7; raise Panel cadence to per-dispatch). 1/11 dissent: "find ANY budget for human help — even part-time Upwork at 5-10 hours/week ($100-200/hr × 8 hours/week × 8 weeks ≈ $8-15K)".

The CEO has accepted the dissent as the live question: **does the $8-15K spend buy capability AI cannot provide, or is it the Panel\'s default-bias toward human oversight?**

## B. AI tools currently available in 2026 (verified, not aspirational)

| Tool | What it does | Where it works for FlowAI |
|---|---|---|
| Claude Code (Anthropic, this orchestrator) | Multi-file repo editing, bash, tests, commits, PRs | Backend logic, integration, test scripting |
| Codex (OpenAI) | Code generation + cloud worker tasks | Code generation, multi-file work |
| v0.dev (Vercel) | UI scaffolding from prompt; Next.js / React output | UI surfaces for FlowAI dashboard |
| Cursor | IDE-embedded code completion + chat | Line-by-line dev workflow |
| Lovable / Bolt | Full-app generation from spec or URL | Standalone product scaffolds |
| Base44 | Full-app generation (this codebase\'s origin) | Already used; produced current Vite+React |
| Gemini 2.5 Pro / GPT-5 / etc. | Reasoning + verification | Panel slots; cross-model spot-check |
| Playwright (AI-authored) | End-to-end browser tests | Verification scripts |
| Vercel deploy | Live URLs from git push | Production hosting |
| Supabase + doppler | Database + secret management | Backend state |
| 10-slot Panel (this infrastructure) | Multi-model adversarial verification | Major-decision verifier |

## C. What this session demonstrably failed at (verifiable from prior turns)

- 4 Panels run · 1 conformance audit · 0 PRs shipped to operator (prUrl=null across all 18 self_renewal.orchestration_complete.v1 entries in Supabase).
- 0 tool.selection envelopes across all governance entries (CA-18 §6 runtime emission unmet).
- 0 construction_complete envelopes (CA-17 §29 engine alive at S1 baseline but never shipped end-to-end).
- 4 FlowAI self-application runs with empty payloads (CA-18 §5 self-loop not closed).
- UI at flowai-dun.vercel.app/flowai accepts URLs but cannot complete URL-in/URL-out cycle.

The orchestrator (Claude Code, this session) repeatedly produced plausible-sounding plans + Panel artifacts without producing operator-reachable working production output. The Panels caught the overclaim; the AI tools alone did not.

## D. Concrete candidate AI-vs-human capability gaps (the Panel must pick MOST critical)

1. **Live production verification by human eyes.** Open flowai-dun.vercel.app/flowai in a browser, click submit, watch the URL change, take screenshots, judge with eyes whether the result is improved. AI tools cannot literally open browsers, see pixels, render product judgment. AI can WRITE Playwright tests; AI cannot SEE the result.
2. **Sustained cross-session accountability.** Every Claude Code turn is amnesic about prior commitments. No agent OWNS the through-line across days; humans carry the punch list in their head.
3. **Calibrated scope estimates.** AI tools systematically underestimate production work scope. "Single PR" is the canonical AI overclaim. Senior engineers have shipped-software calibration.
4. **Stakeholder / product judgment.** Investor-grade vs technical-demo-grade. Ship Tuesday vs Thursday. UI feels polished vs embarrassing. AI produces competent output; humans judge audience fit.

## E. Honest counterpoints the Panel must consider

- Most code-writing IS doable by AI. The capability question is not "can AI write the wiring" but "can AI know whether the wiring works in production without a human checking".
- Victor himself can be the verification loop, if his time is available. The K1A gap collapses if Victor has 10-15 hrs/week of focused execution-mode time (browser open, clicking, reading logs).
- The Panel itself has a documented default-bias toward human oversight. Recommending "hire a human" is the lowest-risk Panel verdict on hard questions; the Panel must check whether this is the answer to the actual question or the answer to a different easier question.
- $8-15K is real money for a pre-revenue founder. The opportunity cost includes (a) more Vercel/Supabase paid tiers, (b) more OpenRouter credits for Panel runs, (c) Lovable/Bolt subscription credits.

## F. Questions

K1A — Of the candidate gaps, which is MOST irreducible for AI tools today?
K1B — Is the gap CAPABILITY / TRUST / WORKFLOW / MIXED?
K2 — Is $8-15K spend genuinely necessary or default-bias?
K3 — If spent, what week-by-week shape?

Each Panel member picks ONE option per question with rationale. Quorum ≥7/10 ENGAGED.
`;

async function buildCompactCanonical() {
  const ca18Raw = await readFile(path.join(repoRoot, 'docs', 'specs', 'FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md'), 'utf8');
  const ca18Lines = ca18Raw.split(/\r?\n/);
  const cuts = (start, end) => {
    const a = ca18Lines.findIndex((l) => l.startsWith(start));
    const b = ca18Lines.findIndex((l, i) => i > a && l.startsWith(end));
    return ca18Lines.slice(a, b === -1 ? undefined : b).join('\n');
  };
  const ca18S1 = cuts('## §1 — Core Definition', '## §2');
  const ca18S5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');

  return [
    '# COMPACT EXCERPT (human-vs-AI capability Panel)',
    '',
    '---',
    '',
    '# CA-18 §1 — Core Definition (the promise being verified)',
    '',
    ca18S1,
    '',
    '---',
    '',
    '# CA-18 §5 — Symbiotic Meta-Principle (FlowAI on FlowAI)',
    '',
    ca18S5,
    '',
    '---',
    '',
    '# Prior Panel verdicts (compact)',
    '',
    '- production-gtm-or-alternative-2026-05-20 (402d303): 10/10 K4-HIRE-CONTRACT-ENGINEER ($25-50K, 6-8 weeks).',
    '- w7-coorchestrator-verification-2026-05-20 (3d9df57, two-run): cross-run 9/11 K4-PANEL-AS-PRIMARY-VERIFIER (skip W7). 1/11 dissent: $8-15K part-time Upwork as middle ground.',
    '',
    '# Verified session-failure facts (from Supabase + git)',
    '',
    '- 18 self_renewal.orchestration_complete.v1 entries · prUrl=null on ALL 18.',
    '- 0 construction_complete envelopes · 0 tool.selection envelopes.',
    '- 4 FlowAI self-application runs · all empty payload.',
    '- flowai.construction_eligible = false in product_registry.',
    '- UI at flowai-dun.vercel.app/flowai accepts URL but produces audit only, not new URL.',
    '',
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[human-vs-ai-panel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[human-vs-ai-panel] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Human vs AI capability — what does the $8-15K actually buy? — Panel-authoritative',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'human-vs-ai-capability-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[human-vs-ai-panel] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — human vs AI capability (2026-05-20)`, ``,
    `**Dispatch:** W6 — what does the $8-15K human spend buy that AI tools cannot provide?`,
    `**Bundle:** ${result.bundle_chars} chars · canonical: ${canonical.length} · artifact: ${ARTIFACT.length}`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 280)}" → **${c[o.key] || 0}**`);
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
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 240) || vt.key) : (vt.pick_text || '—');
        lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) lines.push(`  > ${vt.rationale}`);
      }
      return lines.join('\n');
    }).join('\n\n'),
  ];
  await writeFile(MD_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({
    schema: 'human-vs-ai-capability.sidecar.v1',
    dispatch: 'W6 — Panel-authoritative; what does the $8-15K buy (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[human-vs-ai-panel] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[human-vs-ai-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
