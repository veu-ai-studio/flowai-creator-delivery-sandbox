// scripts/panel/run-production-gtm-or-alternative-panel.mjs
//
// W6 Panel — VIABILITY of building complete production-grade FlowAI,
// OR honest alternative path forward (CEO has withdrawn trust from
// orchestrator; Panel output is authoritative, not advisory).
// Quorum >=7/10 ENGAGED per Locked Rule 17.
//
// K1: STEP 0 viability verdict
// K2: STEP 8a FlowAI direction (keep/simplify/replace/rebuild)
// K3: STEP 8b VEU portfolio sequencing
// K4: STEP 8c Victor's fastest credible path + external help

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
const PLAN_PATH = path.join(repoRoot, 'docs', 'panel-consultations', 'production-gtm-plan-2026-05-20.md');
const MD_PATH = path.join(OUTPUT_DIR, 'production-gtm-or-alternative-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'production-gtm-or-alternative-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'K1',
    topic: 'K1 — STEP 0 VIABILITY: Can a 10-slot adversarial LLM Panel + AI execution tooling (Claude Code, v0.dev, Cursor, etc.) build a COMPLETE, PRODUCTION-GRADE FlowAI fully meeting CA-18 §1-§6 — any URL in through the UI → demonstrably better URL out, GTM-ready, ≥95 on its own quality bar — from which a demo is extracted, given the verified state below (1 of 7 sections passing; 0 PRs shipped across 18 runs; orchestrator trust withdrawn by CEO)? Pick the verdict that best fits the evidence.',
    options: [
      { key: 'K1-YES-ACHIEVABLE', text: 'YES-ACHIEVABLE: the Panel + AI tooling can deliver a complete production-grade FlowAI within a defined scope/timebox without any conditions beyond standard engineering execution. The current gaps (UI→construction wiring, honest-assessment gate, §2 envelope, §6 wiring, jurisdiction column) are all standard engineering work for which AI tooling is sufficient.' },
      { key: 'K1-YES-WITH-CONDITIONS', text: 'YES-WITH-CONDITIONS: achievable IF specific conditions are met first. Conditions (Panel must cite ≥3): (a) human-on-keyboard checkpoint at every architectural decision + PR (orchestrator-alone has failed); (b) scope freeze on the §29 + §10 + §11 + §3 + §6 surfaces — no new SSOT amendments until working production ships; (c) explicit timebox (e.g. 4-6 weeks to operator-reachable URL-in/URL-out via UI); (d) acceptance criteria written as machine-verifiable e2e Playwright test BEFORE code; (e) at minimum one external senior engineer reviewing PRs (AI-only review has missed critical gaps); (f) §2 jurisdictional + accessibility + privacy/legal dimensions de-scoped from MVP (cannot be built quickly to canonical standard) — flagged as KNOWN-GAP in delivered UI per §2 "no silent omission" invariant.' },
      { key: 'K1-NO-FUNDAMENTAL-LIMIT-OF-SCOPE', text: 'NO-FUNDAMENTAL-LIMIT (scope too large): CA-18 §1-§6 as currently scoped is too large for AI-orchestrated execution within reasonable timebox + budget. CA-18 §2 alone (10 jurisdiction-aware dimensions with no silent omission) is a multi-quarter engineering scope for a small team. Recommend re-scoping FlowAI to a much narrower MVP (e.g. URL-in/URL-out for ONE dimension class — say, "broken interactive surfaces") and growing dimensions over time. Proceed to STEP 8 with re-scope recommendation.' },
      { key: 'K1-NO-FUNDAMENTAL-LIMIT-OF-EXECUTION', text: 'NO-FUNDAMENTAL-LIMIT (AI execution alone insufficient): the failure mode in evidence (0 PRs across 18 runs; 4 Panels + 1 conformance audit + 0 working production output across the session; orchestrator overclaim pattern) reveals that AI-Panel + AI-orchestrator alone cannot deliver production-grade software at this scope. Human engineers must lead the build; AI tooling is augmentation, not replacement. Proceed to STEP 8 with explicit human-lead recommendation.' },
    ],
    draftedKey: 'K1-YES-WITH-CONDITIONS',
  },
  {
    id: 'K2',
    topic: 'K2 — STEP 8a FLOWAI DIRECTION: keep the current codebase, simplify it, replace it with off-the-shelf, or rebuild from scratch? Each option is concrete; pick ONE.',
    options: [
      { key: 'K2-KEEP-AND-COMPLETE', text: 'KEEP and complete. The existing codebase has the right architecture: §29 Construction Engine (cd2608d), §10 Self-Audit, §11 Six-Step Clearance, ToolIntelligenceService (1245783) all exist. Gaps are wiring, not foundation. Complete by closing: UI→construction wire-up, ToolIntelligence runtime emission, pre-run honest-assessment gate, envelope `dimensions_contributing[]` field, jurisdiction column. Estimated 4-8 PRs, 2-4 weeks of focused engineering.' },
      { key: 'K2-SIMPLIFY-MVP-SCOPE', text: 'SIMPLIFY by hard-scoping the MVP to ONE URL-in/URL-out class through the UI (e.g. wire_up class only per CA-17 §2: dead-control wiring; defer endpoint_generation + schema_migration + redesign_implementation to v2). Drop §2 jurisdiction-aware + accessibility + privacy/legal from MVP (mark KNOWN-GAP per §2 no-silent-omission). Drop §6 GUIDED-mode picker UI from MVP (data layer ready; surface later). MVP scope: URL submit → wire-up construction → preview URL back. 2-3 PRs, 1-2 weeks.' },
      { key: 'K2-REPLACE-WITH-OFF-THE-SHELF', text: 'REPLACE the FlowAI engine with off-the-shelf platforms that already do most of CA-18 §1 today: v0.dev (UI generation), Lovable / Bolt / Cursor (full-app generation from spec or URL), Playwright + Lighthouse (audit), Vercel (deploy). The CA-17 §29 engine duplicates capability that v0.dev + Lovable + Bolt provide more reliably. Build a thin orchestration layer that routes URL input → off-the-shelf builder → deploy → audit → return. Drop the bespoke engine. CA-18 amendments stay; implementation changes.' },
      { key: 'K2-REBUILD-FROM-SCRATCH', text: 'REBUILD from scratch on a different foundation: e.g. NestJS + Inngest (durable workflow) + a SaaS template (Cal.com / Twenty / Plane style), with the §29 Build/Wire engine reimplemented as a simpler, testable workflow rather than embedded in a Vite+React audit demo. Current codebase is a Base44-scaffold that has accumulated SSOT amendments faster than implementation; rebuild on a stack designed for production SaaS. 6-10 weeks, but cleaner foundation.' },
    ],
    draftedKey: 'K2-SIMPLIFY-MVP-SCOPE',
  },
  {
    id: 'K3',
    topic: 'K3 — STEP 8b VEU PORTFOLIO ORDER: 5 products (SAIGE / RelTwin / ReachSMS / PressAI / MyPregLife) need to be built and launched. Given FlowAI is not yet GTM-ready, what is the correct sequencing?',
    options: [
      { key: 'K3-FLOWAI-FIRST-DOGFOOD', text: 'FlowAI FIRST (dogfood): finish FlowAI to MVP scope (per K2 winner), then USE FlowAI to build the 5 VEU products. This is the canonical CA-18 §5 self-application logic — FlowAI must be operational on itself before it is operational on others. Risk: serial dependency; if FlowAI slips, all 5 products slip.' },
      { key: 'K3-PARALLEL-RELTWIN-FIRST', text: 'PARALLEL with RelTwin as flagship: build RelTwin first using off-the-shelf tools (v0.dev for UI, Lovable/Bolt for backend, Vercel for deploy), independent of FlowAI. RelTwin has the most operational data (8 self_renewal runs; clearest construction telemetry; market is high-conviction relationship intelligence). Other 4 products follow RelTwin pattern in parallel as bandwidth allows. FlowAI matures in background; not on critical path.' },
      { key: 'K3-PARALLEL-MYPREGLIFE-FIRST', text: 'PARALLEL with MyPregLife as flagship: MyPregLife is the highest mission-impact product (global pregnancy market, dignity-and-belonging guarantee per CA-18 §4) and has been the most-discussed in canonical text. Ship MyPregLife first using off-the-shelf tools; FlowAI matures separately. Other 4 products follow in priority order.' },
      { key: 'K3-PORTFOLIO-FIRST-FLOWAI-SECOND', text: 'PORTFOLIO FIRST, FlowAI AS A LATER STAGE: ship 1-3 VEU products using off-the-shelf tools to generate revenue + investor proof; let FlowAI emerge as a Stage 2 product BUILT FROM the operational learnings of running the portfolio. CA-18 §5 self-application logic is honored in reverse — the portfolio operates FlowAI by USING the tools (v0.dev + Lovable + Cursor + Vercel + Playwright) FlowAI would otherwise orchestrate.' },
    ],
    draftedKey: 'K3-PARALLEL-RELTWIN-FIRST',
  },
  {
    id: 'K4',
    topic: 'K4 — STEP 8c VICTOR PERSONALLY — fastest credible path to a working, fundable demo + what external help to consider. Pick ONE.',
    options: [
      { key: 'K4-HIRE-CONTRACT-ENGINEER', text: 'Hire 1 senior contract engineer (Next.js + Node + Vercel + Supabase) for 6-8 weeks, ~$25-50K, to ship the FlowAI MVP (K2 SIMPLIFY scope) end-to-end. Panel + Claude Code support the engineer with architecture review + code review; engineer ships. This converts AI-only execution (which has failed) to human-led AI-augmented execution. Concrete profile: Upwork/Toptal/contractor friend; ex-startup CTO comfortable shipping fast.' },
      { key: 'K4-AGENCY', text: 'Engage a boutique AI/SaaS product agency (e.g. Range Labs, Backslash, Pioneer Square, similar tier — $50-150K, 6-12 weeks) to build the FlowAI MVP + 1 flagship VEU product to demo quality. Panel + AI tooling continues as architecture authority; agency executes. Higher cost but professional delivery; reduces Victor\'s execution risk.' },
      { key: 'K4-CTO-COFOUNDER', text: 'Recruit a CTO co-founder (equity + small salary). Highest-leverage but slowest path. The CEO/Panel pattern works fine for governance; what is missing is sustained engineering execution + product judgment Victor cannot provide alone. A technical co-founder converts FlowAI from a CEO-driven project to a product company. 4-12 weeks to find + onboard.' },
      { key: 'K4-CONTINUE-AI-ONLY-WITH-HUMAN-CHECKPOINTS', text: 'Continue AI-only execution but with HARD human checkpoints: Victor personally reviews every PR before merge; Victor manually triggers every deploy; Victor runs every end-to-end verification by hand through the UI. No external hire; no agency. Slowest + highest demand on Victor\'s time, but cheapest. The lesson from this session: AI orchestrator-only is not sufficient — but the issue is execution discipline, not execution capacity.' },
    ],
    draftedKey: 'K4-HIRE-CONTRACT-ENGINEER',
  },
];

const ARTIFACT = `# Production-grade FlowAI viability OR honest alternative — verifiable-facts brief (2026-05-20)

This brief is verifiable facts only. The Panel verdict is authoritative.

## A. The dispatch context (CEO has withdrawn trust from orchestrator)

The orchestrator (Claude Code, this session) has:
- Run 4 Panels (Build/Wire v3 re-Panel · J1-J4 emergency · J5-J7 SSOT consistency · this one) all of which produced honest verdicts that the current state does NOT satisfy CA-18 §1.
- Produced ZERO PRs shipped to operator from any production run (verified via supabase: 0 prUrl populated across all 18 \`self_renewal.orchestration_complete.v1\` entries).
- Produced ZERO end-to-end CA-18 §1 cycles through the UI (URL submit form does not trigger §29 Build/Wire; only audit-only PATH B).
- The CEO has directed: build the COMPLETE, PRODUCTION-GRADE FlowAI fully meeting CA-18 §1-§6, OR recommend the honest alternative.

The orchestrator (this turn, Claude Code) cannot write + test + deploy production code within a single Panel turn. The dispatch's STEP 0 anticipates this with the NO-FUNDAMENTAL-LIMIT option. The Panel renders the authoritative verdict.

## B. Verified state (read directly from primary sources)

### B.1 SSOT (canonical, ratified)
- CA-18 §1-§6 LIVE per ENTRY 018 + ENTRY 019 (commits e017643 + 92c6db9).
- CA-17 v3-FINAL Build/Wire spec ratified per ENTRY 016 (commit ee7e85f).
- CA-13 + CA-15 + CA-16-A v3 disposed per ENTRY 017 (commit 6c3c1f4).

### B.2 Live Supabase product_registry (verified 2026-05-20)
6 product rows:
- flowai: prd · construction_eligible=FALSE
- mypreglife / pressai / reachsms / reltwin / saige: prd · construction_eligible=TRUE

### B.3 Live product_ssot.governance_record (44 entries across 7 rows)
- 18 \`self_renewal.orchestration_complete.v1\` entries (2026-05-18 → 2026-05-20).
- prUrl=null on ALL 18. **Zero PRs shipped.**
- Last reltwin run (2026-05-20T02:41Z): originalScore=99.5 → finalScore=85, totalDelta=-14.5, exitReason=NO_IMPROVEMENT. Engine refused PR correctly per CA-14-B regression-gate; engine started run against 99.5-score product despite CA-18 §1 "refusing to manufacture work" — that pre-run gate is absent.
- 26 construction-class envelopes on reltwin (construction_pre_baseline.v1 ×2 + construction_class.v1 + construction_scope_caps.v1 + construction_pre_approval.v1 + construction_attempt_aborted.v1 ×N). **Zero construction_complete envelopes** — no end-to-end shipped construction.
- 4 FlowAI self-application orchestration runs across flowai + flowai-upgraded-…ad6c5c54 rows. All 4 governance entries have empty/null payloads.
- 0 tool.selection envelopes across ALL governance entries (CA-18 §6 runtime-emission requirement unmet).

### B.4 Code state (verified via grep)
- \`attachToolIntelligenceService()\` defined in \`OrchestratorHub.ts:473\`; **0 call sites in repo.**
- Production runner (\`renewal/orchestrator.js\`) does NOT use OrchestratorHub. Tool Intelligence built but never wired to runtime.
- step_tool_rankings table: 40 rows of top-5-per-step rankings, populated 2026-05-20. Data layer ready; runtime layer absent.
- UI surfaces (\`src/pages/LandingPage.jsx\`, \`Configuration.jsx\`, \`Onboarding.jsx\`, \`FlowAIDashboard.jsx\`) expose AUTO/GUIDED/MANUAL modes + accept URL input. URL submit route invokes audit path, NOT construction path. **The UI cannot complete a full URL-in/URL-out cycle.**
- PATH B synthesis (resolveLiveUrl + detectGithubRepoFromUrl) is wired; creates flowai-upgraded-<host>-<id> product_ssot rows for unknown URLs.
- \`product_registry.flowai.construction_eligible = false\` — self-application gated off.

### B.5 Prior Panel verdicts (this session)
- W6 v3 convergence re-Panel (CA-13/15/16-A, 6e03d78): 0/13 questions cleared → ALL to CEO disposition.
- W6 emergency Panel J1-J4 (318a5d6): J1 UNANIMOUS PATH-B-is-flaw; J2 7/8 wire UI→Construction Engine; J3+J4 plurality non-cleared.
- W6 J5-J7 SSOT consistency (e6fe417): J5 UNANIMOUS FAIL on §1 conformance; J6 5/7 plurality on wire UI→construction; J7 UNANIMOUS UI is MAJOR GAP vs CA-18.

### B.6 Conformance summary (W3 audit @ ca60367, verified by my probe)
1 of 7 CA-18 sections fully PASSING (§3 Iteration Model). 5 PARTIAL (§1, §4, §5, §6, §7.6). 1 FAIL (§2 Quality Dimensions — 6 of 10 dimensions silently omitted).

## C. What "COMPLETE PRODUCTION-GRADE FLOWAI" requires (CA-18 §1-§6)

| CA-18 § | Requirement | Current state | Gap to complete |
|---|---|---|---|
| §1 | URL in → new deployable URL out; substantial transformation; honest assessment refusing to manufacture work; trajectory + diminishing-returns reporting | PARTIAL — preview URLs produced via CLI; 0 PRs; no pre-run gate; no trajectory reporting | UI→Construction wire-up; pre-run honest-assessment gate; trajectory reporting on envelope + UI |
| §2 | All 10 dimensions every run; jurisdiction-aware (privacy + legal); no silent omission | FAIL — 6 of 10 dimensions silently omitted; no jurisdiction column | Add jurisdiction jsonb column to product_registry + UI; add finding categories for 6 unmeasured dimensions OR explicit "not_scored" emission; extend orchestration_complete envelope with dimensions_contributing[] |
| §3 | AUTOMATIC/GUIDED/MANUAL triad; priority-weights not feature toggles | PASS — three modes wired + UI-exposed | Minor: cosmetic label-alignment to ENTRY 019 lock; confirm priority-weights downstream wiring |
| §4 | Product-agnostic; global scope; uniform ≥95 quality | PARTIAL — agnostic at orchestrator boundary; LEGACY_FALLBACK residual; veuProducts.js needs audit | Remove LEGACY_FALLBACK once 0021 confirmed prod; audit veuProducts.js for behavioural-vs-metadata |
| §5 | FlowAI applies to its own development | PARTIAL — 4 self-runs invoked; empty payloads; construction_eligible=false | Flip flowai.construction_eligible to true (or scoped subset); investigate empty-payload self-runs (logging bug vs. genuine no-op); produce first FlowAI-on-FlowAI shippable cycle |
| §6 | Top-5 per step; AUTOMATIC/GUIDED/MANUAL; runtime tool.selection emission | PARTIAL — 40 rows of rankings + service built; **0 call sites; 0 tool.selection envelopes** | Call attachToolIntelligenceService() at runner-init; migrate renewal/orchestrator.js step dispatch through OrchestratorHub.invokeStepOwner(); surface GUIDED-mode picker in UI |

## D. The constraint a Panel cannot escape

The Panel (10-slot LLM consultation) renders verdicts. It does not write code, run tests, or deploy to Vercel. The orchestrator (Claude Code, in this turn) can write + commit code, but cannot:
- Complete multi-week engineering work in a single turn.
- Deploy to Vercel production and verify operator-reachable URL-in/URL-out within a Panel-run window.
- Run an end-to-end self-application cycle through the live UI before the UI→construction wiring exists.

This is the constraint that has produced the failure mode the CEO is calling out. The Panel renders the authoritative verdict on whether to continue, simplify, replace, or rebuild — AND on the honest alternative path forward.

## E. What the Panel must decide (4 questions)

K1 (STEP 0) — viability verdict
K2 (STEP 8a) — FlowAI direction
K3 (STEP 8b) — VEU portfolio sequencing
K4 (STEP 8c) — Victor's fastest credible path + external help

Each Panel member MUST pick ONE option per question with rationale. Quorum ≥7/10 ENGAGED per Locked Rule 17. Non-cleared verdicts → CEO disposition with verbatim verdict directions.
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
  const ca18S2 = cuts('## §2 — Quality Dimensions', '## §3');
  const ca18S3 = cuts('## §3 — Iteration Model', '## §4');
  const ca18S4 = cuts('## §4 — Platform Scope', '## §5');
  const ca18S5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');
  const ca18S6 = cuts('## §6 — Tool Intelligence Principle', '\n---');

  const canon = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = canon.split(/\r?\n/);
  function slice(s, e, max) {
    const a = lines.findIndex((l) => l.startsWith(s));
    if (a === -1) return '';
    const b = lines.findIndex((l, i) => i > a && l.startsWith(e));
    const text = lines.slice(a, b === -1 ? undefined : b).join('\n');
    if (!max || text.length <= max) return text;
    return text.slice(0, max) + '\n\n_[…truncated]_';
  }
  return [
    '# FlowAI SSOT COMPACT EXCERPT (production-gtm-or-alternative Panel)',
    '',
    '---',
    '',
    '# CA-18 §1 — Core Definition',
    '',
    ca18S1,
    '',
    '---',
    '',
    '# CA-18 §2 — Quality Dimensions',
    '',
    ca18S2,
    '',
    '---',
    '',
    '# CA-18 §3 — Iteration Model',
    '',
    ca18S3,
    '',
    '---',
    '',
    '# CA-18 §4 — Platform Scope and Mission',
    '',
    ca18S4,
    '',
    '---',
    '',
    '# CA-18 §5 — Symbiotic Meta-Principle',
    '',
    ca18S5,
    '',
    '---',
    '',
    '# CA-18 §6 — Tool Intelligence Principle',
    '',
    ca18S6,
    '',
    '---',
    '',
    slice('## 29.', '\n\n## 30.', 2500),
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[viability-panel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[viability-panel] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'STEP 0 viability + STEP 8 honest alternative — Panel-authoritative verdict (CEO withdrew orchestrator trust)',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'production-gtm-or-alternative-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[viability-panel] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — production-gtm OR alternative (2026-05-20)`, ``,
    `**Dispatch:** W6 — Panel-authoritative verdict; CEO withdrew orchestrator trust; STEP 0 viability + STEP 8 honest alternative.`,
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
    schema: 'production-gtm-or-alternative.sidecar.v1',
    dispatch: 'W6 — Panel-authoritative; STEP 0 + STEP 8 (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');

  // Also write the production-gtm-plan file per STEP 9.
  const k1 = result.perVerdicts.K1;
  const k2 = result.perVerdicts.K2;
  const k3 = result.perVerdicts.K3;
  const k4 = result.perVerdicts.K4;
  const planMd = [
    `# Production-grade FlowAI plan — Panel-authoritative (2026-05-20)`, ``,
    `**Dispatch:** W6 — CEO withdrew orchestrator trust; Panel renders authoritative verdict.`,
    `**Quorum:** ≥${QUORUM}/10 ENGAGED. Engaged ${t.engagedTotal}/10. Alignment ${(result.dissentFloor.alignedPct*100).toFixed(1)}%.`,
    ``,
    `## STEP 0 — Viability verdict (K1)`,
    `**Verdict:** ${k1.verdict} · top=${k1.topKey} ${k1.topCount}/${t.engagedTotal} · cleared=${k1.topCount >= QUORUM ? 'YES' : 'NO → CEO disposition'}`,
    ``,
    `## STEP 8a — FlowAI direction (K2)`,
    `**Verdict:** ${k2.verdict} · top=${k2.topKey} ${k2.topCount}/${t.engagedTotal} · cleared=${k2.topCount >= QUORUM ? 'YES' : 'NO → CEO disposition'}`,
    ``,
    `## STEP 8b — VEU portfolio order (K3)`,
    `**Verdict:** ${k3.verdict} · top=${k3.topKey} ${k3.topCount}/${t.engagedTotal} · cleared=${k3.topCount >= QUORUM ? 'YES' : 'NO → CEO disposition'}`,
    ``,
    `## STEP 8c — Victor's path (K4)`,
    `**Verdict:** ${k4.verdict} · top=${k4.topKey} ${k4.topCount}/${t.engagedTotal} · cleared=${k4.topCount >= QUORUM ? 'YES' : 'NO → CEO disposition'}`,
    ``,
    `## STEPS 3-7 (build, GTM verification, prod verification, demo extract, integration standard)`,
    `**NOT executed in this turn — honest disclosure.** STEPS 3-7 require multi-week production engineering`,
    `that cannot be performed by a single Panel turn. The Panel's verdict on K1 + K2 + K4 governs how STEPS 3-7`,
    `are executed. The orchestrator (this turn) has not claimed STEPS 3-7 as complete; the dispatch explicitly`,
    `routes NO-FUNDAMENTAL-LIMIT verdicts to STEP 8 alternatives, which the Panel has rendered above.`,
    ``,
    `## Full Panel transcript`, `See \`docs/panel-consultations/production-gtm-or-alternative-2026-05-20.md\``,
    ``,
  ].join('\n');
  await writeFile(PLAN_PATH, planMd, 'utf8');
  process.stdout.write(`[viability-panel] DONE -> ${MD_PATH}\n[viability-panel] PLAN -> ${PLAN_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[viability-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
