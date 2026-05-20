// scripts/panel/run-flowai-first-roadmap-panel.mjs
//
// W6 Panel — FLOWAI-FIRST roadmap (CEO override of prior K4
// VEU-first verdict). FlowAI MVP gets built first; the 5 VEU products
// on Base44 are processed BY FlowAI, not rebuilt.
//
// K1: roadmap sequencing shape
// K2: total weeks bucket
// K3: actual Week 1 Day 1 dispatch (concrete implementation PR)

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
const MD_PATH = path.join(OUTPUT_DIR, 'flowai-first-roadmap-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'flowai-first-roadmap-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'K1',
    topic: 'K1 — FLOWAI-FIRST week-by-week roadmap sequencing. Pick the shape that gives Victor a Victor-verifiable milestone each week and reaches operator-reachable URL-in/URL-out via UI fastest with lowest deferred-risk. The roadmap must produce a Victor-verifiable result every week (open browser, click, see new URL or score delta). The 5 VEU products on Base44 are PROCESSED BY FlowAI, not rebuilt.',
    options: [
      { key: 'K1-UI-FIRST-WIRING', text: 'UI-FIRST: W1 add /api/run-construction route + wire LandingPage.jsx:442 submit to call it. W2 first end-to-end run through UI on a small test product (preview URL returned). W3 pre-run honest-assessment gate + trajectory reporting. W4 attachToolIntelligenceService + first tool.selection envelopes. W5 dimensions_contributing[] envelope + KNOWN-GAP disclosure UI. W6 flip flowai.construction_eligible + debug self-run empty payloads. W7 E2E Playwright + first FlowAI-on-FlowAI cycle. W8 auth + Sentry + rate-limit + demo extract. Risk: relies on construction engine working when invoked.' },
      { key: 'K1-ENGINE-FIRST-FIX-CONSTRUCTION', text: 'ENGINE-FIRST: W1-2 fix the 26 construction_attempt_aborted envelopes on reltwin → produce FIRST construction_complete.v1 envelope via CLI (reveals why construction never finishes). W3-4 add /api/run-construction route + UI wiring. W5-6 honest-gate + Tool Intelligence wiring. W7-8 dimensions envelope + self-application + auth + Sentry. W9-10 E2E + polish + demo. Risk: longer to first UI win but each week\'s milestone is real construction progress.' },
      { key: 'K1-CONSTRUCTION-LOOP-FIRST', text: 'CONSTRUCTION-LOOP-FIRST: W1-3 construction engine end-to-end against ANY product CLI (debug all aborts; first successful construction_complete). W4-5 UI submit triggers construction. W6-7 FlowAI-on-FlowAI cycle (canonical proof per CA-18 §5). W8-9 honest-gate + Tool Intelligence + dimensions envelope. W10-12 auth + observability + Sentry + polish + demo. Strongest CA-18 §5 alignment; slowest to UI-visible milestone.' },
      { key: 'K1-DEMO-RELIABLE-PATH-FIRST', text: 'DEMO-RELIABLE-PATH-FIRST: W1-2 hard-code one reliable demo (FlowAI processes one specific URL with known good outcome → guaranteed new URL via UI). W3-4 generalize backwards (UI accepts any URL; demo path for known-reliable URLs). W5-7 honest PATH-B for unknown URLs (audit-only + KNOWN-GAP disclosure). W8-9 honest-gate + Tool Intelligence + dimensions. W10-12 auth + Sentry + investor demo. Risk: demo path may diverge from general path.' },
    ],
    draftedKey: 'K1-UI-FIRST-WIRING',
  },
  {
    id: 'K2',
    topic: 'K2 — Total weeks to FlowAI MVP production-ready at Victor\'s 10-15 hrs/week pace using v0.dev + Claude Code + Codex spot-check + CodeRabbit + Vercel Checks + Sentry. Reference: prior Panel cleared K2-120-180-HRS realistic mid-range. 120h ÷ 12h/wk = 10w; 180h ÷ 12h/wk = 15w. Pick the bucket that fits the chosen K1 sequencing + Victor\'s expected learning curve + realistic AI-tool friction.',
    options: [
      { key: 'K2-8-10-WEEKS', text: '8-10 weeks. Aggressive but plausible if Victor hits 15 hrs/wk consistently AND AI tools (v0.dev + Claude Code) ship work cleanly first try AND no major debug rabbit-holes (e.g. empty-payload self-runs resolve quickly). Likely only achievable with K1-UI-FIRST-WIRING (skip engine-first detour).' },
      { key: 'K2-10-13-WEEKS', text: '10-13 weeks. Realistic mid-range. 120-180 hours at 10-15 hrs/wk = 8-18 weeks; 10-13 is the median with normal friction. Allows time for the 26 construction_attempt_aborted debug + 1-2 unplanned issues without slipping the timeline. Best match for prior Panel hour estimate.' },
      { key: 'K2-13-16-WEEKS', text: '13-16 weeks. Realistic with friction. Anticipates: (a) the empty-payload self-run debug takes longer than 15h budgeted; (b) auth + Sentry + rate-limit integration has hidden complexity; (c) E2E Playwright on real Vercel deploys requires retry-and-flake-handling work; (d) Victor\'s 10-15 hrs/wk has weeks where it dips below. Closer to upper-bound prior hours estimate.' },
      { key: 'K2-16-20-WEEKS', text: '16-20 weeks. Pessimistic. The 2/8 prior Panel dissent that voted K2-250+-HRS implies upper-end ~250h ÷ 12h/wk ≈ 21 weeks. Reflects the reality that "production-ready" includes things AI underestimates: cross-browser testing, error states, rollback paths, observability tuning, RLS hardening, dependency-CVE handling. Slowest but most likely.' },
    ],
    draftedKey: 'K2-10-13-WEEKS',
  },
  {
    id: 'K3',
    topic: 'K3 — WEEK 1 DAY 1 actual dispatch. NOT planning. NOT scoping. ACTUAL CODE. Pick the concrete first PR — the one that produces a tangible artifact Victor can verify by EOD Day 1. Each option states the exact files + exact action + exact verification + exact time budget.',
    options: [
      { key: 'K3-REPLACE-API-RUN-STUB', text: 'Replace /api/run.js stub with real /api/run-construction route. Time: 3-5 hrs. Files: src/api/run-construction.js (new); src/api/run.js (deprecate). Action: new POST route accepts { url, mode }, calls runOrchestration from src/lib/agents/renewal/orchestrator.js with { product: ensureProductRegistryRow(url), mode, gtmTarget: 95 }, streams progress via SSE. Verification (Victor EOD Day 1): curl localhost:5173/api/run-construction with FlowAI\'s own URL; receive progress stream; confirm orchestration_complete envelope writes to product_ssot with non-null payload. Unblocks UI wiring (next PR).' },
      { key: 'K3-DEBUG-EMPTY-PAYLOAD-SELF-RUN', text: 'Debug empty-payload self-runs first. Time: 4-6 hrs. Files: src/lib/agents/renewal/orchestrator.js + scripts/run-orchestration.mjs (add debug logging). Action: run scripts/run-orchestration.mjs --product flowai with VERBOSE=1; trace where the orchestration_complete payload becomes empty before write. Fix the write path or the envelope construction. Verification (Victor EOD Day 1): 5th flowai self-run produces a governance_record entry with non-null mode/gtmReady/exitReason/finalScore/previewUrl fields. Foundational debug; unblocks §5.' },
      { key: 'K3-FIRST-CONSTRUCTION-COMPLETE-ENVELOPE', text: 'Produce first construction_complete.v1 envelope. Time: 4-6 hrs. Files: src/lib/construction/ConstructionEngine.js + src/lib/construction/gates/S8PhaseB.js + scripts/run-orchestration.mjs. Action: run construction CLI on reltwin (already has 26 attempt_aborted); add VERBOSE logging at each gate; identify why S8 Phase B aborts; fix or downgrade requirement to MVP-acceptable. Emit construction_complete.v1 with class + filesChanged + linesChanged + scoreDelta. Verification (Victor EOD Day 1): construction_complete.v1 entry visible in product_ssot.governance_record for reltwin. CA-17 §29 first end-to-end proof.' },
      { key: 'K3-FLIP-CONSTRUCTION-ELIGIBLE-AND-RUN', text: 'Flip flowai.construction_eligible=true + run construction CLI on FlowAI. Time: 2-3 hrs. Files: scripts/run-orchestration.mjs (no code change; just data + invocation). Action: UPDATE product_registry SET construction_eligible = true WHERE product_id = \'flowai\'; doppler run -- node scripts/run-orchestration.mjs --product flowai. Observe what fails; document specifically; route to the right Day 2 dispatch. Verification (Victor EOD Day 1): Victor has a concrete failure list pinned to specific files/gates from a real construction-on-flowai attempt. Smallest possible PR; biggest learning per hour.' },
    ],
    draftedKey: 'K3-FLIP-CONSTRUCTION-ELIGIBLE-AND-RUN',
  },
];

const ARTIFACT = `# FlowAI-first roadmap — verifiable-facts Panel brief (2026-05-20)

CEO override: build FlowAI MVP first. The 5 VEU products are on Base44 already and are PROCESSED BY FlowAI, not rebuilt. The 15-25% existing implementation is the foundation; the remaining 75-85% is wiring, not redesign.

## A. Verified facts (HEAD 92392a9)

| Section | State | Evidence |
|---|---|---|
| §3 Iteration | PASS (~95%) | orchestrator.js:379-402 OrchestrationState; UI exposes all 3 modes |
| §4 Platform | PARTIAL (~70%) | resolveLiveUrl product-agnostic; PATH B synth live; LEGACY_FALLBACK residual |
| §6 Tool Intelligence | PARTIAL (~35%) | step_tool_rankings 40 rows + ToolIntelligenceService built; 0 call sites; 0 tool.selection envelopes |
| §1 Core Loop | PARTIAL (~20-30%) | UI submit → audit-only; /api/run.js fabricates fake URLs (line 33-35); CLI produces previewUrls but 0 PRs across 18 runs |
| §5 Symbiotic | PARTIAL (~15%) | flowai.construction_eligible=FALSE (verified); 4 self-runs all empty payload |
| §2 Quality Dims | FAIL (~15%) | 6/10 silently omitted; no jurisdiction column |
| Construction engine | EXISTS | S1+S2+S4+S5+S6+S8 gates present (src/lib/construction/gates/); WireUpConstructor + ConstructionEngine + index. 128 conformance tests per CA-17 v3-FINAL. |
| 26 construction-class envelopes on reltwin | 0 construction_complete | Engine starts but never completes end-to-end |
| Supabase schema | COMPLETE | 24 migrations 0001-0024 |
| UI surface | PARTIAL | 81 src/pages/ files (most Base44 scaffold-leftover); LandingPage / Configuration / FlowAIDashboard / AutoRunner are active |

## B. Salvageable foundation (Panel may reuse, NOT rebuild)

- \`src/lib/agents/renewal/orchestrator.js\` — runOrchestration() works (produces previewUrls).
- \`src/lib/construction/\` — gates S1, S2, S4, S5, S6, S8 + WireUpConstructor + ConstructionEngine + index. Per CA-17 v3-FINAL.
- \`src/lib/tools/ToolIntelligenceService.js\` — built (W5b 1245783); needs 1 call site.
- \`src/lib/agents/orchestrator/OrchestratorHub.ts\` — defines \`attachToolIntelligenceService\` at line 473.
- \`scripts/run-orchestration.mjs\` — generic CLI runner that calls runOrchestration / runConstruction.
- \`supabase/migrations/0024_product_registry_construction_eligible.sql\` — construction_eligible column ready.
- \`src/pages/LandingPage.jsx\` — URL submit form at line 442-491 (\`launch()\` navigates to /auto-runner; does NOT call construction).
- \`src/api/research-url.js\` — Browserless-backed real audit endpoint (used by Card A).

## C. Pre-decided stack (from prior K3 a911e9a + 92392a9)

- Frontend codegen: **v0.dev** (7/8 cleared)
- Backend codegen: **Claude Code primary + Codex spot-check 1-in-N PRs** (5/8 plurality)
- Code review + deploy gate: **CodeRabbit + Vercel Checks + Sentry** (8/8 UNANIMOUS cleared)
- Base44: **RETIRE entirely** (8/8 UNANIMOUS cleared)

## D. Pre-decided scope (from prior K2 402d303 7/10 + 92392a9 K2)

K2-SIMPLIFY MVP scope (drop §2 jurisdiction/access/privacy/legal; drop §6 GUIDED-mode UI picker):

- UI work (~40h) — wire LandingPage submit to new /api/run-construction route; render previewUrl + score delta back.
- Backend (~30h) — /api/run-construction route; upsert product_registry; invoke runOrchestration.
- Integration + wiring (~20h) — attachToolIntelligenceService() at runner init.
- Pre-run honest-gate (~15h) — refuse runs on already-passing products.
- E2E Playwright (~20h) — single proof against live UI.
- Auth + observability minimum (~20h) — Sentry + Supabase RLS audit + rate-limit.
- Self-application debug (~15h) — flip flowai.construction_eligible + fix empty-payload self-runs.
- TOTAL: ~120-180 hours.

## E. The CEO directive (this dispatch)

- Build FlowAI MVP FIRST. Override prior K4 VEU-first plurality.
- The 5 VEU products on Base44 are PROCESSED BY FlowAI per CA-18 §1, not rebuilt.
- Each week must produce a Victor-verifiable milestone (open browser, click, see result).
- Week 1 Day 1 must be ACTUAL CODE, not planning.

## F. Questions

K1 — week-by-week roadmap sequencing shape
K2 — total weeks bucket
K3 — Week 1 Day 1 actual concrete first PR

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
    '# COMPACT EXCERPT (FlowAI-first roadmap Panel)',
    '',
    '---',
    '# CA-18 §1 — Core Definition',
    '',
    ca18S1,
    '',
    '---',
    '# CA-18 §5 — Symbiotic Meta-Principle',
    '',
    ca18S5,
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[flowai-first-roadmap] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[flowai-first-roadmap] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'FlowAI-first roadmap (CEO override) — week-by-week + total weeks + Day-1 dispatch',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'flowai-first-roadmap-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[flowai-first-roadmap] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — FlowAI-first roadmap (2026-05-20)`, ``,
    `**Dispatch:** W6 — CEO override of K4; FlowAI MVP first. Week-by-week + total weeks + Day 1 PR.`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 320)}" → **${c[o.key] || 0}**`);
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
    schema: 'flowai-first-roadmap.sidecar.v1',
    dispatch: 'W6 — Panel-authoritative; FlowAI-first roadmap (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[flowai-first-roadmap] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[flowai-first-roadmap] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
