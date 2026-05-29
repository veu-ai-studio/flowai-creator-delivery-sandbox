// scripts/panel/run-state-stack-roadmap-panel.mjs
//
// W6 Panel — verify actual implementation state, quantify remaining
// work, recommend multi-AI platform stack, propose week-by-week
// roadmap to 100% production-grade FlowAI.
// Quorum >=7/10 ENGAGED per Locked Rule 17.

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
const MD_PATH = path.join(OUTPUT_DIR, 'state-stack-roadmap-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'state-stack-roadmap-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'K1A',
    topic: 'K1A — OVERALL % COMPLETE to CA-18 §1-§6 PRODUCTION-GRADE conformance. Given (a) §3 PASS, (b) §1 PARTIAL (UI accepts URL but never invokes construction; 0 PRs across 18 runs; no pre-run gate; no trajectory), (c) §2 FAIL (6/10 dimensions silently omitted, no jurisdiction column), (d) §4 PARTIAL, (e) §5 PARTIAL (construction_eligible=false on flowai; 4 empty self-runs), (f) §6 PARTIAL (40 rows of data + service built but 0 tool.selection envelopes). Pick the weighted-overall bucket that best fits the verified evidence.',
    options: [
      { key: 'K1A-15-25PCT', text: '15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer has barely moved. Substantial codebase + canonical text exists but the operator-reachable URL-in/URL-out promise is essentially un-implemented.' },
      { key: 'K1A-30-40PCT', text: '30-40% complete. §3 fully done + §4 + §6 partially done give meaningful weight; §1 has the audit half working (preview URLs produced via CLI); construction engine S1+S2+S4+S5+S6+S8 gates exist in src/lib/construction/. Architecture is correct; wiring is incomplete. About 1/3 of the way through.' },
      { key: 'K1A-45-55PCT', text: '45-55% complete. CA-18 §3 (iteration model) is 100% done; §4 (product-agnostic) is ~75%; §6 (data layer + service built, runtime emission missing) is ~50%; §1 has working preview-URL production from CLI = ~40%; §5 is invoked but unproven; §2 is the genuine FAIL but is the smallest weight per CA-18 emphasis on §1. Roughly half done; the remaining half is mostly UI-wiring + envelope-shape work.' },
      { key: 'K1A-OTHER', text: 'None of the buckets fit; supply the percentage that best matches the evidence and explain.' },
    ],
    draftedKey: 'K1A-30-40PCT',
  },
  {
    id: 'K1B',
    topic: 'K1B — Which CA-18 section requires the MOST remaining work to reach production-grade? Pick ONE.',
    options: [
      { key: 'K1B-S1-CORE-LOOP', text: '§1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never calls runConstruction). Plus pre-run honest gate + trajectory reporting + dimensions_contributing envelope. This is critical-path and largest in hours.' },
      { key: 'K1B-S2-QUALITY-DIMENSIONS', text: '§2 Quality Dimensions — 6 of 10 silently omitted; no jurisdiction column; need to add finding categories for syntax/duplication/accessibility/privacy/legal + wire CA-17 S4 9-pillar suite into Phase B post-deploy. This is multi-quarter scope per any honest estimate.' },
      { key: 'K1B-S6-TOOL-INTELLIGENCE', text: '§6 Tool Intelligence runtime — attachToolIntelligenceService() defined 0 call sites; renewal/orchestrator.js does not use OrchestratorHub; 0 tool.selection envelopes across 44 governance entries. Plus GUIDED-mode picker UI. This is a contained wiring task but invisible-today.' },
      { key: 'K1B-INTEGRATION-PRODUCTION-HARDENING', text: 'Production hardening (cross-section): auth, rate-limit, error states, rollback paths, observability (Sentry / PostHog), real Vercel deploy verification (today /api/run.js:33 fabricates fake URLs from app name + timestamp — a mock-data violation of §1). This is the largest hidden cost.' },
    ],
    draftedKey: 'K1B-S1-CORE-LOOP',
  },
  {
    id: 'K2',
    topic: 'K2 — TOTAL HOURS to reach 100% on the K2-SIMPLIFY-MVP scope (prior Panel cleared 7/10): URL submitted via UI → wire_up class construction → preview URL returned to UI; pre-run honest-assessment gate; minimum Tool Intelligence wiring; E2E Playwright proof; flowai-on-flowai self-application cycle producing measurable delta. Drop jurisdiction/accessibility/privacy/legal from MVP per K2-SIMPLIFY; mark KNOWN-GAP. Pick the realistic hour bucket assuming Victor + AI tools (Claude Code, v0.dev, Cursor) + 10-15 hrs/week verification loop.',
    options: [
      { key: 'K2-80-120-HRS', text: '80-120 hours total. The wiring is small (UI form → API route → existing runConstruction). Most of the engine + gates already exist. Aggressive estimate but plausible if AI tools are competent + Victor verifies tightly.' },
      { key: 'K2-120-180-HRS', text: '120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application debug ~15h. Reflects production-hardening friction AI tools systematically underestimate.' },
      { key: 'K2-180-250-HRS', text: '180-250 hours total. Pessimistic with realistic friction: every "single PR" expands to 3-4 PRs once auth + error states + rollback + observability + cross-browser testing are real. Plus debugging the empty-payload self-runs takes longer than budgeted (governance_record write failures are subtle).' },
      { key: 'K2-250-PLUS-HRS', text: '250+ hours total. Even MVP is a multi-month effort once production-grade is taken seriously — auth flows + Stripe + observability + Sentry + Playwright cloud + Vercel Checks integration + Supabase RLS hardening + rate-limiting all stack up. Plus debugging the existing 26 construction_attempt_aborted envelopes.' },
    ],
    draftedKey: 'K2-120-180-HRS',
  },
  {
    id: 'K3A',
    topic: 'K3(a) — PRIMARY CODE GENERATOR for FlowAI FRONTEND (Vite+React today, prior commits show heavy use of components from src/components/). Pick the named tool that gives Victor the best component-per-verification-cycle output.',
    options: [
      { key: 'K3A-V0-DEV', text: 'v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project\'s shadcn stack. Best when Victor needs net-new component output. Verification: copy code into branch + visually compare to prompt + Playwright smoke.' },
      { key: 'K3A-CURSOR', text: 'Cursor — IDE-embedded; pair-programming flow; tight loop with the codebase; multi-file refactors. Best for surgical edits to existing 81-page src/pages/ tree. Verification: in-editor diff review + Victor visual + test run.' },
      { key: 'K3A-LOVABLE', text: 'Lovable — full-app from prompt; replaces FlowAI rebuild from scratch. Too heavy for surgical wiring; better for VEU products. Verification: full preview URL + investor-eye review.' },
      { key: 'K3A-CLAUDE-CODE', text: 'Claude Code (this orchestrator) — already integrated; multi-file editing + bash + test running; can extend existing patterns. Risk: same overclaim pattern this session. Verification: Victor manually opens browser after every PR + reads commits + diffs.' },
    ],
    draftedKey: 'K3A-V0-DEV',
  },
  {
    id: 'K3B',
    topic: 'K3(b) — PRIMARY CODE GENERATOR for FlowAI BACKEND (Node + Vercel Functions + Supabase, src/lib/agents/* + src/lib/construction/* + src/api/). Pick the named tool.',
    options: [
      { key: 'K3B-CLAUDE-CODE', text: 'Claude Code — multi-file repo editing + bash + tests + commits; strongest at Node + Supabase + integration work; can use Supabase MCP for migrations. Risk: must enforce Victor verification on every PR. Verification: Claude Code opens PR → Victor reviews diff + runs build/test + checks live deploy.' },
      { key: 'K3B-CURSOR-COMPOSER', text: 'Cursor Composer — multi-file IDE edits with semantic search across repo; faster for surgical backend work; Victor stays in IDE. Verification: in-editor diff + test run + manual deploy check.' },
      { key: 'K3B-CODEX', text: 'Codex (OpenAI cloud worker) — async multi-file PRs; different model family (independence vs Claude Code). Useful as cross-model spot-check on Claude Code\'s output. Verification: PR comparison + Panel adjudication when outputs diverge.' },
      { key: 'K3B-CLAUDE-CODE-PLUS-CODEX-CROSS', text: 'Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger. Verification: same as K3B-CLAUDE-CODE plus Codex review on consequential PRs.' },
    ],
    draftedKey: 'K3B-CLAUDE-CODE-PLUS-CODEX-CROSS',
  },
  {
    id: 'K3C',
    topic: 'K3(c-d) — CODE REVIEW + DEPLOYMENT VERIFICATION before Victor eyeballs. Pick the named combination that gives the highest signal-per-cost.',
    options: [
      { key: 'K3C-CODERABBIT-PLUS-VERCEL-CHECKS', text: 'CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors post-deploy). Triple-layer: PR review, deploy gate, runtime monitor. Each fires before Victor opens browser. Cost: CodeRabbit free, Vercel Checks free with hobby tier, Sentry developer tier $26/mo.' },
      { key: 'K3C-CURSOR-REVIEW-PLUS-PLAYWRIGHT', text: 'Cursor Review (in-IDE; semantic diff analysis) + Playwright tests in GitHub Actions (e2e smoke on every PR) + Lighthouse CI. Same gate count, all in-repo. Cost: Cursor Pro ($20/mo), GitHub Actions free tier.' },
      { key: 'K3C-CLAUDE-CODE-AS-REVIEWER', text: 'Claude Code launched in --review mode after every PR (sub-agent with code-reviewer system prompt) + Playwright CI + Vercel deploy logs read aloud to Victor. Same model as author (W7 convergence risk per 3d9df57 9/11 verdict); not recommended as sole layer.' },
      { key: 'K3C-PANEL-FOR-CONSEQUENTIAL-PRS', text: 'Panel adjudication ONLY on consequential PRs (irreversible, multi-file, schema-changing) + lightweight Cursor/CodeRabbit pass on routine PRs. Aligns with W6 W7 verdict (panel-for-major). Cost: ~$0.50-2 per Panel run + ~$0 for routine. Best signal-per-cost for high-stakes.' },
    ],
    draftedKey: 'K3C-CODERABBIT-PLUS-VERCEL-CHECKS',
  },
  {
    id: 'K3E',
    topic: 'K3(e) — BASE44 DISPOSITION. Base44 was the original scaffold tool for this codebase. Pick the right disposition for ongoing FlowAI MVP work.',
    options: [
      { key: 'K3E-RETIRE-ENTIRELY', text: 'RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forward: v0.dev for new components; Claude Code for backend; treat Base44 as a deprecated dependency to be removed in cleanup PRs.' },
      { key: 'K3E-KEEP-FOR-PROTOTYPING-VEU-PRODUCTS', text: 'KEEP Base44 for prototyping new VEU products only — NOT for FlowAI itself. Base44 is fast for getting a full-stack prototype live; useful when Victor wants a same-day MyPregLife/SAIGE/ReachSMS scaffold to iterate on. Once scaffolded, Lovable/v0.dev/Cursor take over.' },
      { key: 'K3E-KEEP-LANDING-PAGES-ONLY', text: 'KEEP Base44 for static marketing/landing pages (e.g. flowai-dun.vercel.app marketing pages); v0.dev for product UI; Claude Code for backend. Reduces Base44 footprint without removing it entirely.' },
      { key: 'K3E-REPLACE-WITH-LOVABLE', text: 'REPLACE Base44 with Lovable for any scaffold work going forward. Lovable + Bolt are the 2026-current full-app generators that have largely overtaken Base44 in capability. Migrate any Base44-dependent code as encountered.' },
    ],
    draftedKey: 'K3E-RETIRE-ENTIRELY',
  },
  {
    id: 'K4',
    topic: 'K4 — WEEK-BY-WEEK ROADMAP shape. Given K2 hours bucket + K3 tool stack + Victor\'s 10-15 hrs/week verification loop + prior K3 portfolio-first verdict (8/10 ship VEU products with off-the-shelf tools while FlowAI matures). Pick the sequencing that gives the best defensibility at each milestone.',
    options: [
      { key: 'K4-FLOWAI-MVP-LINEAR-8W', text: 'FlowAI MVP LINEAR over 8 weeks: W1-2 UI→Construction wiring (v0.dev + Claude Code) + Victor verifies in browser; W3-4 pre-run honest gate + Tool Intelligence wiring; W5-6 E2E Playwright + flowai-on-flowai self-application cycle debug; W7-8 polish + investor demo extraction. Deliverable W8: working URL-in/URL-out via UI; one self-improvement cycle captured.' },
      { key: 'K4-VEU-FIRST-FLOWAI-SECOND', text: 'VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6 polish + Sentry + analytics; W7-8 public sign-ups + revenue + investor demo. Defer FlowAI MVP to weeks 9-16. Defensibility: a PAYING product, not a demo.' },
      { key: 'K4-PARALLEL-MIN-FLOWAI-PLUS-VEU', text: 'PARALLEL minimum-FlowAI + VEU flagship over 8 weeks: W1-2 FlowAI honest-PATH-B (UI submit produces an actual audit report — stop overclaiming; ~30 hours, no construction wiring) + start RelTwin scaffold via Lovable; W3-4 RelTwin MVP shipped + FlowAI honest-PATH-B live; W5-6 RelTwin beta users + FlowAI MVP construction wiring starts; W7-8 RelTwin revenue + FlowAI construction wiring partial. Two deliverables, lower velocity each.' },
      { key: 'K4-DEMO-EXTRACT-BACKWARDS', text: 'DEMO-EXTRACT-BACKWARDS over 8 weeks: W1-2 build a single hardcoded reliable demo path (one pre-registered URL with known improvement potential → reliably produces a new improved URL via the construction engine; demo is invariant); W3-4 generalize backwards (UI accepts any URL; falls back to demo path for known-reliable URLs); W5-6 honest-PATH-B for unknown URLs (audit-only with KNOWN-GAP disclosure); W7-8 investor demo + first VEU flagship scaffold. Defensibility: a demo that works reliably + honest disclosure where it doesn\'t.' },
    ],
    draftedKey: 'K4-DEMO-EXTRACT-BACKWARDS',
  },
];

const ARTIFACT = `# State + Stack + Roadmap — verifiable-facts Panel brief (2026-05-20)

This brief is verifiable facts read directly from primary sources at HEAD a911e9a. Panel verdict authoritative.

## A. CA-18 § coverage verified at HEAD a911e9a

| § | Status | Verified evidence |
|---|---|---|
| §1 Core Loop | PARTIAL | UI submit → /api/research-url (audit only); LandingPage.jsx:442-491 navigate("/auto-runner") never calls runConstruction. /api/run.js:33-35 fabricates fake URL ("https://<appname>-<timestamp>.vercel.app") — mock data violating §1 "ALWAYS a new deployable URL". Construction engine src/lib/construction/ exists (S1+S2+S4+S5+S6+S8 gates + WireUpConstructor + ConstructionEngine.js + index.js); reached from scripts/run-orchestration.mjs CLI only. 18 self_renewal.orchestration_complete.v1 entries · prUrl=null × 18 · 26 construction-class envelopes on reltwin · 0 construction_complete envelopes. |
| §2 Quality Dimensions | FAIL | 6 of 10 dimensions silently omitted (syntax / dup / a11y / privacy / legal / 7-of-9 OWASP pillars). No jurisdiction column on product_registry (verified). No dimensions_contributing[] on orchestration_complete envelope. |
| §3 Iteration Model | PASS | orchestrator.js:379-402 OrchestrationState class accepts auto/guided/manual; UI LandingPage / Configuration / FlowAIDashboard expose all three. Mode-dependent checkpoint wait wired. |
| §4 Platform Scope | PARTIAL | resolveLiveUrl product-agnostic; PATH B synthesis live (product_id "flowai-upgraded-flowai-dun-vercel-app-ad6c5c54" exists in product_ssot with 1 entry); LEGACY_FALLBACK residual in code. |
| §5 Symbiotic Principle | PARTIAL | 4 FlowAI self-runs across flowai + synth row (all empty payloads). product_registry.flowai.construction_eligible = FALSE (verified live 2026-05-20T16:35Z via doppler+supabase). |
| §6 Tool Intelligence | PARTIAL | step_tool_rankings 40 rows populated 2026-05-20; ToolIntelligenceService implemented (W5b 1245783); attachToolIntelligenceService() has 0 call sites in src/; 0 tool.selection envelopes across 44 governance entries. |

## B. Codebase surface (verified)

- 474 .js/.ts/.jsx/.tsx files in src/.
- 81 pages in src/pages/ (most are Base44 scaffold-leftovers; only ~5-10 used in active hot paths: LandingPage, AutoRunner, Configuration, FlowAIDashboard, Onboarding).
- 16 files in src/lib/agents/renewal/ (orchestrator.js + githubPrWriter + vercelBranchDeploy + diffEditor + fixGenerator + 11 others).
- 7 gate files + 1 constructor + 1 engine + index in src/lib/construction/ (S1, S2, S4, S5, S6, S8 implemented; S3 + S7 deferred per CA-17 v3-final).
- src/api/ has 8 routes: base44Client.js, deploy.js, fix.js, generate.js, health.js, index.js, run.js, validate.js. /api/run.js is a STUB (no orchestrator call; fabricated URL).
- 24 Supabase migrations 0001 → 0024.

## C. Live Supabase state (verified 2026-05-20T16:35Z via doppler+supabase)

\`\`\`
product_registry (6 rows):
  flowai/prd      construction_eligible=FALSE
  mypreglife/prd  construction_eligible=true
  pressai/prd     construction_eligible=true
  reachsms/prd    construction_eligible=true
  reltwin/prd     construction_eligible=true
  saige/prd       construction_eligible=true

product_ssot.governance_record (44 entries across 7 rows including
  synth PATH B row):
  orchestration_complete entries: 18  (prUrl=null × 18)
  construction-class envelopes:   26  (reltwin only; 0 construction_complete)
  tool.selection envelopes:        0
\`\`\`

## D. Multi-AI stack options for Victor + 10-15 hrs/week self-verification

| Slot | Contender tools | Note |
|---|---|---|
| Frontend codegen | v0.dev / Cursor / Lovable / Claude Code | v0.dev is Vercel-native + Next.js/Tailwind/shadcn match |
| Backend codegen | Claude Code / Cursor Composer / Codex / hybrid | Claude Code strongest at multi-file + bash; cross-model spot-check via Codex breaks W7 convergence risk |
| Code review | CodeRabbit / Cursor Review / Claude Code-as-reviewer / Panel-for-major | CodeRabbit free tier reviews every PR multi-model |
| Deploy verification | Vercel Checks + Playwright cloud / GitHub Actions + Lighthouse / Sentry + PostHog | Multi-layer: PR gate + deploy gate + runtime monitor |
| Base44 | Retire / Keep-for-prototyping / Keep-for-landing / Replace-with-Lovable | Codebase memory says "user is moving off Base44" |

## E. Prior Panel verdicts (this session)

- 402d303 W6 production-gtm-or-alternative: 10/10 hire engineer ($25-50K); 8/10 portfolio-first VEU sequencing; 7/10 K2-SIMPLIFY MVP scope.
- 3d9df57 W6 W7 verification: 9/11 K4-PANEL-AS-PRIMARY-VERIFIER; W7 same-model convergence ~50%; W7 NOT recommended.
- a911e9a W6 human-vs-AI: 6/7 K1A live-prod-verification is the irreducible gap; 4/7 K2-DEPENDS-ON-VICTOR-TIME; 5/7 K3-VERIFICATION-LOOP-ONLY (if spent, engineer is verifier not coder); only 1/7 said GENUINELY-NECESSARY.

## F. The CEO\'s binding decisions for this Panel

- Victor will self-verify (10-15 hrs/week as human-eye loop).
- Needs named multi-AI platform stack.
- Wants to start real implementation NOW.
- Needs honest % complete + % remaining.

## G. Questions

K1A — overall % complete bucket
K1B — biggest gap area
K2  — total hours to MVP bucket
K3A — frontend codegen named tool
K3B — backend codegen named tool
K3C — code-review + deploy-verification combined approach
K3E — Base44 disposition
K4  — week-by-week roadmap shape

Each member picks ONE option per question with rationale. Quorum ≥7/10 ENGAGED.
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
  const ca18S5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');
  const ca18S6 = cuts('## §6 — Tool Intelligence Principle', '\n---');
  return [
    '# COMPACT EXCERPT (state + stack + roadmap Panel)',
    '',
    '---',
    '# CA-18 §1 — Core Definition',
    '',
    ca18S1,
    '',
    '---',
    '# CA-18 §2 — Quality Dimensions',
    '',
    ca18S2,
    '',
    '---',
    '# CA-18 §5 — Symbiotic Meta-Principle',
    '',
    ca18S5,
    '',
    '---',
    '# CA-18 §6 — Tool Intelligence Principle',
    '',
    ca18S6,
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[state-stack-roadmap] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[state-stack-roadmap] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'State + stack + roadmap — Panel-authoritative quantification + named-tool stack + week-by-week plan',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'state-stack-roadmap-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[state-stack-roadmap] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — state + stack + roadmap (2026-05-20)`, ``,
    `**Dispatch:** W6 — Panel-authoritative; quantify %, hours, named-tool stack, week-by-week roadmap.`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 260)}" → **${c[o.key] || 0}**`);
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
    schema: 'state-stack-roadmap.sidecar.v1',
    dispatch: 'W6 — Panel-authoritative; state + stack + roadmap (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[state-stack-roadmap] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[state-stack-roadmap] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
