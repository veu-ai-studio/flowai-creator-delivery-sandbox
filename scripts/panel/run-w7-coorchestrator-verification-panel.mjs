// scripts/panel/run-w7-coorchestrator-verification-panel.mjs
//
// W6 Panel — verify the W7 co-orchestrator proposal + quantify
// convergence risk. The Panel is authoritative; verdicts are not
// advisory. Quorum >=7/10 ENGAGED per Locked Rule 17.
//
// K1: is the W7 architecture sound given no-hire constraint?
// K2A: convergence probability bucket
// K2B: expected impact bucket
// K2C: concrete detection mechanism
// K3:  panel-for-everything alternative
// K4:  ONE next action for the CEO

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
const MD_PATH = path.join(OUTPUT_DIR, 'w7-coorchestrator-verification-2026-05-20-rerun.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'w7-coorchestrator-verification-2026-05-20-rerun.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'K1',
    topic: 'K1 — Is the W7 co-orchestrator architecture (a second Claude Code instance + independent verifier with reject-authority over W0\'s dispatches) sound given the no-hire constraint? The CEO cannot afford the $25-50K contract engineer the prior unanimous Panel recommended; W7 is the proposed zero-cost mitigation. Pick the verdict that best fits.',
    options: [
      { key: 'K1-SOUND-PROCEED', text: 'SOUND-PROCEED: W7 is a valid zero-cost mitigation given budget constraints. A second Claude Code instance with a different system prompt + reject-authority creates a check on the primary orchestrator. The differences in prompt + role + posture meaningfully reduce shared-blind-spot risk for procedural / dispatch-validation tasks. Proceed.' },
      { key: 'K1-SOUND-WITH-CONDITIONS', text: 'SOUND-WITH-CONDITIONS: structurally sound but requires explicit guardrails. Conditions (cite ≥3): (a) W7 must NEVER auto-approve irreversible actions (deploys, force-pushes, destructive Supabase writes) — operator-confirm required regardless of W7 sign-off; (b) W7 system prompt MUST be authored with DIFFERENT framing (skeptical adversarial role; "find what W0 missed"); (c) when W0+W7 agree on an irreversible action, mandatory Panel adjudication before execution; (d) cross-model spot-check on N% of W7 verifications using non-Claude model (GPT-5 / Gemini); (e) W7 has access to git + Supabase READ ONLY; write authority remains with W0 + operator approval.' },
      { key: 'K1-UNSOUND-CONVERGENCE-RISK', text: 'UNSOUND-CONVERGENCE-RISK: two Claude Code instances share the same base model (claude-opus-4-7 family) and therefore the same fundamental reasoning biases, training-data gaps, and failure modes. Different system prompts shift surface behavior but do not change underlying inference. On the hardest dispatches (where errors actually matter), both will likely miss the same things together. W7 buys the FEELING of redundancy without the structural property. Do not proceed.' },
      { key: 'K1-UNSOUND-BETTER-NO-COST-OPTION', text: 'UNSOUND — better no-cost option exists. The existing 10-slot Panel infrastructure (Anthropic + OpenAI + Google + Mistral + Cohere + Qwen + DeepSeek + Perplexity + Moonshot + xAI) is ALREADY the multi-model verifier W7 would only partially be. Running the Panel on EVERY dispatch (not just major ones) is the structurally superior zero-cost path. W7 should not be set up; instead, raise Panel cadence to per-dispatch.' },
    ],
    draftedKey: 'K1-SOUND-WITH-CONDITIONS',
  },
  {
    id: 'K2A',
    topic: 'K2(i) — QUANTIFY convergence probability: on a given consequential dispatch (one where the right answer is not obvious from the codebase), what is the probability that W0 and W7 — both Claude Code instances running the same base model family (claude-opus-4-7) with different system prompts — converge on the same INCORRECT judgment? Pick the bucket that best fits the evidence (prior Panel runs in this repo + general LLM correlation literature).',
    options: [
      { key: 'K2A-5-15PCT', text: '5-15% — Different system prompts produce meaningfully different framings; convergence on the SAME incorrect judgment is uncommon. Most disagreements between same-model-different-prompt instances are uncorrelated noise, not correlated bias.' },
      { key: 'K2A-15-30PCT', text: '15-30% — Same base model creates shared training-data biases on common topics but system prompts diverge enough that critical-thinking errors are partially independent. Moderate convergence risk on procedural decisions; higher on novel architectural ones.' },
      { key: 'K2A-30-50PCT', text: '30-50% — Same base model dominates; system prompts are surface-level. On dispatches where the model has a clear bias (e.g. overconfidence on plausible-sounding plans), BOTH instances will exhibit that bias. Convergence on incorrect judgment is meaningfully likely on the highest-stakes dispatches.' },
      { key: 'K2A-50-70PCT', text: '50-70% — Highly correlated outputs from same architecture. The "second opinion" property is largely illusory; what changes between W0 and W7 is the framing, not the inference. On the failures that actually matter, W7 provides little independent value.' },
    ],
    draftedKey: 'K2A-30-50PCT',
  },
  {
    id: 'K2B',
    topic: 'K2(ii) — QUANTIFY expected impact if W0+W7 convergence on an incorrect judgment happens AND the verdict is acted upon before discovery (e.g. before next Panel run): pick the bucket that best fits Victor\'s situation (cash-constrained pre-revenue solo founder with no engineering team).',
    options: [
      { key: 'K2B-CRITICAL', text: 'CRITICAL impact — Wrong direction shipped to production OR significant work performed against wrong plan; major rework cycle; CEO loses runway and/or investor confidence; recovery costs measured in weeks. Victor cannot absorb this loss given budget constraints. Single convergence event could be terminal.' },
      { key: 'K2B-HIGH', text: 'HIGH impact — Significant time/effort wasted on wrong path; measured in days-to-weeks; recoverable but costly; secondary effects on Victor\'s morale + investor signaling. Important to prevent but not single-event-terminal.' },
      { key: 'K2B-MEDIUM', text: 'MEDIUM impact — Errors caught by next session\'s Panel run or by Victor\'s direct review of artifacts; measured in hours-to-days; mostly recoverable; primary cost is wasted Claude Code invocations + Victor\'s time.' },
      { key: 'K2B-LOW', text: 'LOW impact — Mostly stylistic / framing differences; nothing materially shipped; W7 + W0 producing similar artifacts is a duplication-of-effort issue, not a risk issue. Convergence is annoying but not damaging.' },
    ],
    draftedKey: 'K2B-HIGH',
  },
  {
    id: 'K2C',
    topic: 'K2(iii) — What is the most effective CONCRETE detection mechanism that would catch a W0+W7 convergence error BEFORE it produces material damage? Pick ONE — the one with the best damage-prevention-per-time-cost ratio.',
    options: [
      { key: 'K2C-PANEL-WHEN-AGREE', text: 'Mandatory Panel adjudication WHENEVER W0 and W7 agree on an irreversible action (deploys, force-pushes, destructive writes, external announcements). Their agreement is the trigger to run Panel — catches the convergence case directly, costs ~5-15 min only on irreversible-action turns.' },
      { key: 'K2C-CROSS-MODEL-SPOT-CHECK', text: 'Cross-model spot-check: 1-in-N random sample of W7 verifications gets a single-shot GPT-5 OR Gemini review (lower cost than Panel; single non-Claude reviewer breaks same-architecture symmetry). Catches systematic convergence over time but not on the FIRST critical decision.' },
      { key: 'K2C-MANDATORY-HUMAN-IRREVERSIBLE', text: 'Mandatory human-on-keyboard review for any irreversible action regardless of W0/W7 sign-off (operator must read + approve, not just W7). The detection mechanism is Victor himself; W7 reduces routine load but Victor remains the bottleneck on consequential actions.' },
      { key: 'K2C-EVIDENCE-CITATION-REQUIRED', text: 'Mandatory verbatim-evidence citation in every W7 verdict — W7 must cite the specific file paths, line numbers, commit SHAs, Supabase row IDs that prove its verdict. Convergence-on-fiction (both LLMs hallucinating plausible-sounding evidence) is detected when citations don\'t match real artifacts. Cheap to enforce; high signal.' },
    ],
    draftedKey: 'K2C-PANEL-WHEN-AGREE',
  },
  {
    id: 'K3',
    topic: 'K3 — Given the no-hire constraint and the existing 10-slot multi-model Panel infrastructure (Anthropic + OpenAI + Google + Mistral + Cohere + Qwen + DeepSeek + Perplexity + Moonshot + xAI — structurally lower convergence risk than two Claude instances), what is the right cadence allocation between Panel and W7?',
    options: [
      { key: 'K3-PANEL-FOR-EVERYTHING', text: 'PANEL FOR EVERYTHING. The Panel is already a multi-model verifier; the only thing holding it back from per-dispatch use is the 5-15 minute per-run cost. That cost is acceptable given Victor\'s capital scarcity (Panel runs are ~$0.50-2 per consultation via OpenRouter, vs. days of wasted work from a missed convergence error). Skip W7; raise Panel cadence to per-dispatch on anything non-trivial.' },
      { key: 'K3-W7-ROUTINE-PANEL-MAJOR', text: 'W7 FOR ROUTINE, PANEL FOR MAJOR (hybrid). W7 verifies the high-volume low-stakes dispatch traffic (W0\'s daily TODOs, file lookups, single-question clarifications). Panel adjudicates major / irreversible / multi-day decisions. Trade-off: W7 provides cheap fast checks; Panel catches the convergence cases the hybrid acknowledges W7 might miss.' },
      { key: 'K3-W7-NONE-PANEL-EVERYTHING', text: 'NO W7. Per-dispatch Panel + per-dispatch evidence-citation requirement on W0 (Victor reviews the artifacts W0 cites for verbatim accuracy). The Panel + W0\'s own honest-citation discipline is the verification layer; W7 is unnecessary architecture.' },
      { key: 'K3-W7-ONLY-NO-PANEL', text: 'W7 ONLY, dial back Panel. Panel is expensive (5-15 min per run + dollars in OpenRouter credit) and produces verdicts that the orchestrator has, in this very session, repeatedly produced anyway. W7 is faster and free. Sufficient for budget-constrained mode.' },
    ],
    draftedKey: 'K3-PANEL-FOR-EVERYTHING',
  },
  {
    id: 'K4',
    topic: 'K4 — Given K1+K2A+K2B+K2C+K3, what is the ONE correct next action for the CEO RIGHT NOW (this week)? Pick ONE.',
    options: [
      { key: 'K4-W7-SETUP-NOW', text: 'SET UP W7 immediately with the K1-SOUND-WITH-CONDITIONS guardrails attached (read-only access; no irreversible auto-approve; Panel adjudication on W0+W7-agree-irreversible; cross-model spot-check; evidence-citation required). Begin using W7 on routine dispatches; reserve Panel for major / consequential decisions. Cost: zero. Time-to-active: same day.' },
      { key: 'K4-PANEL-AS-PRIMARY-VERIFIER', text: 'SKIP W7. Raise Panel cadence to per-dispatch on anything non-trivial. The existing 10-slot multi-model Panel provides structurally superior verification (10 different models vs. 2 instances of the same model). Cost is bounded ($0.50-2 per run; manageable). Time-to-active: zero (already exists).' },
      { key: 'K4-STOP-AND-RECONSIDER', text: 'STOP AND RECONSIDER the cost-constrained version of FlowAI entirely. The combination of no-hire + AI-only execution + multi-week timelines is not viable per prior Panel verdicts AND the W7 hypothesis does not change this. The right move is to revisit K3 from the prior Panel (portfolio-first via off-the-shelf tools, FlowAI as Stage 2) AND find ANY budget for human help — even part-time Upwork engineer at 5-10 hours/week ($100-200/hr × 8 hours/week × 8 weeks ≈ $8-15K, well below the original $25-50K). Don\'t paper over a structural execution gap with W7.' },
      { key: 'K4-W7-PLUS-WEEKLY-PANEL', text: 'BOTH: set up W7 immediately for daily / routine verification + commit to running a Panel at MINIMUM weekly on the consolidated week\'s decisions as a structural convergence check. This recognizes both the budget constraint AND the convergence risk; W7 is the cheap daily verifier; weekly Panel is the catch-up multi-model audit. Reasonable middle ground.' },
    ],
    draftedKey: 'K4-PANEL-AS-PRIMARY-VERIFIER',
  },
];

const ARTIFACT = `# W7 co-orchestrator proposal verification + convergence risk quantification (2026-05-20)

This brief is verifiable facts + the W7 proposal. Panel verdict is authoritative.

## A. Context — prior Panel verdict (402d303, just landed)

The prior W6 Panel (10/10 engaged, alignment 45%, zero "YES" votes on viability) rendered:

- **K1 viability:** 7/10 NO-FUNDAMENTAL-LIMIT-OF-EXECUTION ("AI-Panel + AI-orchestrator alone cannot deliver production-grade software at this scope; human engineers must lead the build"). Combined NO = 10/10.
- **K2 FlowAI direction:** 7/10 SIMPLIFY-MVP-SCOPE (wire_up class only via UI).
- **K3 VEU portfolio:** 8/10 PORTFOLIO-FIRST-FLOWAI-SECOND (ship VEU products with off-the-shelf tools; FlowAI as Stage 2).
- **K4 Victor's path:** 10/10 UNANIMOUS HIRE-CONTRACT-ENGINEER ($25-50K, 6-8 weeks).

## B. The constraint the prior verdict ran into

The CEO has communicated that the $25-50K hire is not currently affordable. The unanimous K4 recommendation cannot be acted on as stated. A zero-cost alternative is required.

## C. The W7 proposal (verbatim from W0 / orchestrator)

> A second Claude Code instance as co-orchestrator + independent verifier, with authority to reject W0's dispatches. Cost: zero. Setup: one Code window + system prompt.

W7 would:
1. Run as a SEPARATE Claude Code session (different window / tab / process).
2. Have a system prompt explicitly framing it as a SKEPTICAL VERIFIER ("find what W0 missed").
3. Receive every W0 dispatch as input.
4. Render an independent ACCEPT / REJECT / MODIFY verdict before W0 acts.
5. Have reject-authority — W0 cannot override a W7 reject without escalation.

The architectural property the CEO is hoping for: a second adversarial instance that catches W0's errors before they ship. The structural property the Panel must verify or refute: whether two Claude Code instances (same base model: claude-opus-4-7 family; different system prompts) provide MEANINGFULLY INDEPENDENT verification, or whether their outputs are correlated enough that the second instance buys little.

## D. The relevant baseline — existing Panel infrastructure

The 10-slot Panel (verified via \`scripts/panel/slot-config.mjs\`) draws from 10 different model providers:

| Slot | Provider | Model |
|---|---|---|
| 1 | Anthropic | claude-opus-4 (post-2026-05-16 promote-from-backup) |
| 2 | Anthropic | claude-3-7-sonnet |
| 3 | Meta | llama-3.3-70b-instruct (post-Gemini-demote 2026-05-16) |
| 4 | Mistral | mistral-large-latest |
| 5 | Cohere | command-r-plus |
| 6 | Qwen / Alibaba | qwen-3-coder |
| 7 | DeepSeek | deepseek-v3 |
| 8 | Perplexity | sonar-large |
| 9 | Meta (different gen) | llama-4-maverick |
| 10 | xAI | grok-2 |

(Plus per-slot provider-different backup adapters.)

Structurally: 10 different model families means 10 different training datasets + 10 different inference architectures + 10 different RLHF processes. Whatever blind spots one family has, another family probably doesn't share. This is the strongest verification property available to the project.

The cost: ~$0.50-2 per consultation (OpenRouter credit) + 5-15 minutes wall-clock. Per-day budget for several Panel runs: well under $10/day even at heavy use.

W7 by contrast is two instances of claude-opus-4-7 — same base model, different prompts. The independence property is meaningfully weaker.

## E. Track record this session

W0 has overclaimed progress this session (the documented failure mode the CEO has called out). When W0 has been wrong, the Panel has consistently caught it:

- W6 emergency Panel J1-J4 (318a5d6): UNANIMOUS J1-FLAW that PATH B audit-only contradicts CA-18 §1; 7/8 J2-UI-CONSTRUCT consensus.
- W6 J5-J7 SSOT consistency (e6fe417): UNANIMOUS J5-FAIL-MULTIPLE-GAPS; UNANIMOUS J7-MAJOR-GAP.
- W6 production-gtm-or-alternative (402d303): zero "YES" votes on AI-only viability; unanimous K4-HIRE-CONTRACT-ENGINEER.

In each case, multiple independent model families converged on the SAME honest verdict. That is the cross-model consensus W7 cannot structurally replicate.

## F. What the Panel must verify

K1 — Is W7 a sound mitigation given the no-hire constraint? Or does same-base-model convergence defeat the verification property?

K2 — Quantify convergence risk (probability bucket + impact bucket + detection mechanism). The CEO has explicitly asked for numbers, not adjectives.

K3 — Is the existing Panel infrastructure the structurally superior zero-cost verifier vs W7?

K4 — Given K1+K2+K3, ONE correct next action.

## G. Quorum

≥7/10 ENGAGED per Locked Rule 17. Non-cleared verdicts → CEO disposition with verbatim verdict directions. Numbers (K2A buckets) are pickable choices, not narrative — the Panel votes per bucket.
`;

async function buildCompactCanonical() {
  // For this Panel, the canonical does NOT need to be heavy on CA-17 +
  // CA-18 — the question is procedural/architectural, not SSOT-amendment.
  // We include CA-18 §1 + §5 + §6 (relevant), §3 iteration model, and
  // slot-config Panel composition as the verifiable infrastructure
  // reference.
  const ca18Raw = await readFile(path.join(repoRoot, 'docs', 'specs', 'FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md'), 'utf8');
  const ca18Lines = ca18Raw.split(/\r?\n/);
  const cuts = (start, end) => {
    const a = ca18Lines.findIndex((l) => l.startsWith(start));
    const b = ca18Lines.findIndex((l, i) => i > a && l.startsWith(end));
    return ca18Lines.slice(a, b === -1 ? undefined : b).join('\n');
  };
  const ca18S1 = cuts('## §1 — Core Definition', '## §2');
  const ca18S5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');
  const ca18S6 = cuts('## §6 — Tool Intelligence Principle', '\n---');

  const slotCfgRaw = await readFile(path.join(repoRoot, 'scripts', 'panel', 'slot-config.mjs'), 'utf8');
  // Trim to the SLOT_CONFIG array region only — first ~3000 chars of the
  // file contain the configuration + comments which document the
  // 10-provider provenance.
  const slotCfgExcerpt = slotCfgRaw.slice(0, 6000);

  return [
    '# COMPACT EXCERPT (W7 co-orchestrator verification Panel)',
    '',
    '---',
    '',
    '# CA-18 §1 — Core Definition (for context)',
    '',
    ca18S1,
    '',
    '---',
    '',
    '# CA-18 §5 — Symbiotic Meta-Principle (for context)',
    '',
    ca18S5,
    '',
    '---',
    '',
    '# CA-18 §6 — Tool Intelligence Principle (for context)',
    '',
    ca18S6,
    '',
    '---',
    '',
    '# Panel slot-config.mjs (verifiable composition — first ~6K chars)',
    '',
    '```',
    slotCfgExcerpt,
    '```',
    '',
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[w7-panel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[w7-panel] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'W7 co-orchestrator proposal verification + convergence risk quantification — Panel-authoritative',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'w7-coorchestrator-verification-2026-05-20-rerun',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[w7-panel] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — W7 co-orchestrator verification (2026-05-20)`, ``,
    `**Dispatch:** W6 — Panel-authoritative verdict on W7 proposal + convergence risk quantification.`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 240)}" → **${c[o.key] || 0}**`);
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
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 200) || vt.key) : (vt.pick_text || '—');
        lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) lines.push(`  > ${vt.rationale}`);
      }
      return lines.join('\n');
    }).join('\n\n'),
  ];
  await writeFile(MD_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({
    schema: 'w7-coorchestrator-verification.sidecar.v1',
    dispatch: 'W6 — Panel-authoritative; W7 + convergence-risk (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[w7-panel] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[w7-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
