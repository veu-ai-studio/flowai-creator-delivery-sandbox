// scripts/panel/run-ssot-consistency-next-action-panel.mjs
//
// W6 Panel — SSOT CONSISTENCY CHECK + WHAT TO DO NEXT (J5/J6/J7).
// Verifiable-facts brief built from direct reads of CA-18, CA-17,
// live Supabase product_registry + product_ssot.governance_record,
// and git log. No orchestrator framing.
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
const MD_PATH = path.join(OUTPUT_DIR, 'ssot-consistency-next-action-2026-05-20.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ssot-consistency-next-action-2026-05-20.sidecar.json');
const QUORUM = 7;

const QUESTIONS = [
  {
    id: 'J5',
    topic: 'J5 — Based ONLY on the SSOT documents (CA-18 §1-§6) and the verifiable governance_record + product_registry state below, is the actual codebase + database state consistent with what CA-18 §1 requires FlowAI to produce ("any URL in -> NEW deployable URL out, perfected across 10 quality dimensions per run, with honest assessment + trajectory + diminishing-returns reporting")? Pick the verdict that best fits the evidence.',
    options: [
      { key: 'J5-FAIL-MULTIPLE-GAPS', text: 'FAIL — material non-conformance on multiple §1 sub-requirements. Evidence: 0/18 runs shipped a PR (prUrl null everywhere); the most recent RelTwin run regressed -14.5 from 99.5 to 85; 6 of 10 §2 dimensions silently omitted (jurisdiction column absent; accessibility/privacy/legal/syntax/dup/CSRF not measured pipeline-wide); 0 tool.selection envelopes across 18 runs while CA-18 §6 mandates per-step selection emission; 4 FlowAI self-runs have empty payloads; the production UI cannot complete a full URL-in -> new-URL-out cycle. The state matches "engine library partially works" not "FlowAI as defined by CA-18 §1".' },
      { key: 'J5-PARTIAL-IN-PROGRESS', text: 'PARTIAL — the §1 promise is structurally in place (engine exists, PATH B synthesis live, preview URLs generated, regression gate fires correctly) but operationally incomplete (no PRs shipped; symbiotic loop not closed; tool intelligence wired but not invoked). State is consistent with "proof-phase, not yet GA" but not with "CA-18 §1 satisfied today".' },
      { key: 'J5-PASS-AT-ENGINE-NOT-PRODUCT', text: 'PASS at engine layer; FAIL at product layer. The CA-17 §29 Build/Wire engine + §10 Self-Audit + §11 Six-Step Clearance all exist and run; the UI surface that exposes them as a product to operators (CA-18 §1 calls for URL-in/URL-out through the published surface) does not yet close the loop. CA-18 §1 is partially honored by the engine; the product surface lags.' },
      { key: 'J5-PASS', text: 'PASS — CA-18 §1 does not specify the UI as the binding surface; the §1 contract is satisfied by ANY working invocation path that produces input -> new URL. The CLI runs against RelTwin (which produced preview URLs even when finalScore regressed) demonstrate the §1 loop end-to-end. Gaps in §2 + §6 are separate sections, not §1 failures.' },
    ],
    draftedKey: 'J5-FAIL-MULTIPLE-GAPS',
  },
  {
    id: 'J6',
    topic: 'J6 — Given the verifiable state below, what is the SINGLE correct next action (ONE action only) that moves FlowAI closest to the CA-18 §1 promise (URL in -> NEW URL out) through its own UI? The Panel must pick ONE action — the others may be valuable but the Panel must rank ONE highest.',
    options: [
      { key: 'J6-UI-TO-CONSTRUCTION', text: 'Wire the UI submit-URL form to the existing construction engine end-to-end. Concretely: the UI route that accepts any URL must (1) register the URL into product_registry with construction_eligible=true, (2) trigger §29 Build/Wire S1-S8 + §11 Six-Step Clearance via runOrchestration, (3) stream progress + final new URL back to the UI. NO new engine, NO new architecture; this is wiring CA-17 to the existing UI per CA-18 §1 + §5. Single PR scope.' },
      { key: 'J6-WIRE-TOOL-INTELLIGENCE', text: 'Wire ToolIntelligenceService into renewal/orchestrator.js by calling attachToolIntelligenceService() at runner init + dispatching step work through OrchestratorHub.invokeStepOwner(). This closes the §6 conformance gap (0 tool.selection envelopes today across 18 runs). Without this, every other §1 claim is unaudited per §6.' },
      { key: 'J6-PRE-RUN-HONEST-ASSESSMENT-GATE', text: 'Add the §1 pre-run honest-assessment gate that refuses to start a run against an already-passing product (score >= bar OR diminishing-returns predicted). Without this gate, the engine manufactures work (the 99.5 -> 85 RelTwin regression is the canonical example) — a direct §1 violation. The gate is single-function scope.' },
      { key: 'J6-EXTEND-ENVELOPE-NO-SILENT-OMISSION', text: 'Extend the self_renewal.orchestration_complete.v1 envelope with dimensions_contributing[] + dimensions_skipped_with_reason[] arrays AND add jurisdiction column to product_registry. This is the minimum change that brings the §2 no-silent-omission invariant into compliance (6 of 10 dimensions are silently omitted today). Wider §2 measurement work follows.' },
    ],
    draftedKey: 'J6-UI-TO-CONSTRUCTION',
  },
  {
    id: 'J7',
    topic: 'J7 — Based on what CA-18 describes as the product (URL-in/URL-out through its own UI, with §3 AUTOMATIC/GUIDED/MANUAL exposure + §6 tool intelligence visible), is the current production UI at flowai-dun.vercel.app/flowai consistent with that description? Pick the verdict that best fits.',
    options: [
      { key: 'J7-MAJOR-GAP', text: 'MAJOR GAP. UI accepts URLs but does NOT produce a new deployed URL (PATH B is audit-only in the UI; the orchestration runs that DO produce previewUrls are CLI-only). §3 modes are exposed in the UI per code (LandingPage / Configuration / FlowAIDashboard) but no UI affordance triggers construction. §6 top-5-per-step rankings exist in DB (40 rows) but are not surfaced in any GUIDED-mode picker. The UI is consistent with "preview of FlowAI" rather than "FlowAI as CA-18 defines it".' },
      { key: 'J7-PARTIAL-GAP', text: 'PARTIAL GAP — UI structurally aligns with CA-18 (§3 modes visible; URL input accepted; runs can be initiated) but the URL-in -> URL-out closing loop is missing. Add 1-2 wiring fixes and the UI matches the spec.' },
      { key: 'J7-MISLABELED', text: 'The UI is fine; the LABELING is the gap. The UI works as an "audit + onboarding" surface today; labeling it "FlowAI" creates the consistency gap with CA-18 §1. Either rename the surface (e.g. "FlowAI Audit") OR wire the construction loop. Cheapest fix: relabel.' },
      { key: 'J7-CONSISTENT', text: 'CONSISTENT — CA-18 §1 does not bind to a specific URL surface; flowai-dun.vercel.app/flowai is one surface among possible product surfaces. The CLI is another. As long as ONE surface honors §1, CA-18 is satisfied. The UI is a demo / onboarding affordance, not the binding product surface.' },
    ],
    draftedKey: 'J7-MAJOR-GAP',
  },
];

const ARTIFACT = `# SSOT consistency check + next action — verifiable-facts Panel brief (2026-05-20)

This brief contains ONLY verifiable facts read directly from primary sources. No orchestrator narrative.

## A. Primary sources read

1. \`docs/CANONICAL_REFERENCE.md\` (canonical SSOT; CA-17 §29 + CA-18 entries inlined).
2. \`docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md\` (CA-18 ENTRY 018 + ENTRY 019, LIVE 2026-05-19).
3. \`docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md\` (CA-17 v3-FINAL).
4. Live Supabase \`product_registry\` (all 6 rows) + \`product_ssot.governance_record\` (44 entries across 7 product_ssot rows) via doppler-credentialed service-role read at 2026-05-20.
5. \`git log --oneline origin/flowai-v0.1 -30\`.

## B. CA-18 §1 verbatim (canonical promise)

> Input: any URL, specification, or pasting (existing site, natural-language description, document, code).
> Output: ALWAYS a new, separate, deployable URL — perfected across all quality dimensions per §2. The input is never destructively modified. The new URL supersedes or complements the input; both are preserved.
> Quality guarantee — substantial transformation per run. A run producing only marginal improvement is a QUALITY FAILURE, not a success.
> Honest assessment — refusing to manufacture work. FlowAI proactively communicates when a product already meets or exceeds the quality standard and a further run would not yield substantial improvement.
> User agency — iteration depth is the user's call. After each run, FlowAI transparently reports trajectory + diminishing-returns signal.

## C. CA-18 §5 verbatim (self-application)

> FlowAI applies to its own development process. The §29 Build/Wire Construction Engine (per CA-17 ENTRY 016) explicitly applies to construction-class operations against FlowAI's own source tree. The §10 Self-Audit Quality Audit engine is FlowAI auditing FlowAI. The §11 Six-Step Clearance Protocol applies when FlowAI itself is treated as a deployable product.

## D. CA-18 §2 + §6 (no silent omission; per-step tool selection)

§2: FlowAI MUST optimize ALL 10 dimensions every run (syntax / duplication / UI/UX / bugs / functional completeness / performance / accessibility / security / privacy [jurisdiction-aware] / legal [jurisdiction-aware]). A run that cannot score a dimension MUST surface that as a finding, not silently skip it. The composite score MUST disclose which dimensions contributed.

§6 (ENTRY 019): the engine selects top-5 platforms per step (research / design / build / deploy / qa_audit / govern / gtm / monitor), refreshed monthly, AUTOMATIC / GUIDED / MANUAL triad. Runtime emission of \`tool.selection\` envelopes is part of the audit contract.

## E. Live product_registry state (verified 2026-05-20 via doppler+supabase)

\`\`\`
product_id   | url                                 | branch        | construction_eligible
flowai       | flowai-dun.vercel.app               | flowai-v0.1   | FALSE
mypreglife   | safe-path.base44.app                | main          | true
pressai      | ourpublishingai.com                 | main          | true
reachsms     | ourcommunitiesai.com                | main          | true
reltwin      | reltwin-platform.vercel.app         | main          | true
saige        | saigeplatform.com                   | main          | true
TOTAL: 6 rows
\`\`\`

Plus one synthesized PATH B product_ssot row (no product_registry entry):
\`flowai-upgraded-flowai-dun-vercel-app-ad6c5c54/prd\` — created when FlowAI was invoked against its own URL through PATH B (1 governance entry).

## F. Live product_ssot.governance_record state (44 entries across 7 rows)

\`\`\`
flowai/prd                                                  governance=3  delta_log=0
flowai-upgraded-flowai-dun-vercel-app-ad6c5c54/prd          governance=1  delta_log=0
mypreglife/prd                                              governance=4  delta_log=0
pressai/prd                                                 governance=0  delta_log=0
reachsms/prd                                                governance=0  delta_log=0
reltwin/prd                                                 governance=34 delta_log=0
saige/prd                                                   governance=2  delta_log=0
\`\`\`

**Last 18 \`self_renewal.orchestration_complete.v1\` entries (all 7 rows, sorted by at desc):**

- 2026-05-20T05:48Z flowai
- 2026-05-20T05:22Z saige
- 2026-05-20T03:46Z flowai-upgraded-flowai-dun-vercel-app-ad6c5c54 (PATH B)
- 2026-05-20T03:40Z saige
- 2026-05-20T02:41Z reltwin   (originalScore=99.5 finalScore=85 totalDelta=-14.5 exitReason=NO_IMPROVEMENT prUrl=null previewUrl=https://reltwin-platform-expfh3nys-veu-ai-studio.vercel.app finalGtmCounts: critical=1 high=1)
- 2026-05-20T02:04Z reltwin
- 2026-05-20T01:29Z reltwin
- 2026-05-19T17:30Z reltwin
- 2026-05-19T11:40Z reltwin
- 2026-05-19T04:46Z reltwin
- 2026-05-19T03:23Z reltwin
- 2026-05-19T02:42Z reltwin
- 2026-05-19T01:37Z mypreglife
- 2026-05-19T00:43Z mypreglife
- 2026-05-19T00:07Z mypreglife
- 2026-05-18T23:24Z mypreglife
- 2026-05-18T22:57Z flowai
- 2026-05-18T22:16Z flowai

**Key observations:**

- 18 orchestration_complete entries total; **\`prUrl: null\` across ALL 18** — zero PRs ever opened.
- Most-recent RelTwin run: 99.5 → 85 (Δ = −14.5) — a documented regression. The engine correctly refused the PR (\`exitReason: NO_IMPROVEMENT\`) per CA-14-B regression-detection invariant. But the engine STARTED that run against a 99.5-score product anyway — violating CA-18 §1 "refusing to manufacture work".
- **0 governance_record entries with kind containing \`tool\` / \`tool.selection\`** across all 7 product_ssot rows — CA-18 §6 runtime-emission requirement unmet.
- 26 construction-class envelopes for reltwin (\`construction_class.v1\`, \`construction_attempt_aborted.v1\`, \`construction_pre_baseline.v1\` ×2, \`construction_scope_caps.v1\`, \`construction_pre_approval.v1\`) — CA-17 §29 engine is alive and writes audit envelopes, but **0 construction-complete envelopes**: no construction has shipped end-to-end.
- 4 FlowAI self-application runs across flowai + flowai-upgraded-…-ad6c5c54 rows; all 4 orchestration_complete entries have **no payload data** populated.

## G. Code-state observations (verified)

- \`attachToolIntelligenceService()\` defined in \`src/lib/agents/orchestrator/OrchestratorHub.ts:473\`; **0 call sites anywhere in repo** (grep).
- \`renewal/orchestrator.js\` (the production runner that produced all 18 orchestration_complete entries) does NOT import or use OrchestratorHub — its step sequencing has no Tool Intelligence wiring.
- \`step_tool_rankings\` table has 40 rows of top-5-per-step rankings populated 2026-05-20 — data layer ready; runtime layer not consuming.
- PATH B synthesis is wired (\`resolveLiveUrl\` + \`detectGithubRepoFromUrl\` accept any URL); creates synthesized \`flowai-upgraded-<host>-<id>\` product_ssot rows.
- UI surfaces (LandingPage / Configuration / FlowAIDashboard) expose all three §3 modes (\`auto\` / \`guided\` / \`manual\`) and accept URL input. The UI route that submits a URL invokes the audit path, NOT the construction path.
- \`product_registry.flowai.construction_eligible = false\` (verified via doppler+supabase) — construction-class operations against FlowAI itself are gated off.

## H. Git log (last 30 commits on origin/flowai-v0.1)

Recent work:
- 318a5d6 W6 emergency Panel (J1-J4): cleared J1 (PATH B audit-only = FLAW), cleared J2 (wire UI → CA-17 S1-S8); J3+J4 non-cleared → CEO disposition.
- ca60367 W3 SSOT conformance report (this artifact's source).
- 9e6ec37 / 66bbf0f / 9ece35c W5a: extractToken handling + S1Baseline fixes + 60-min timeout default — construction engine prep.
- 4689f53 W5a: env-gated construction bypass for proof phase.
- d394739 W5a: activate construction engine in runner + reltwin eligible.
- 1245783 W5b: Tool Intelligence Service (BUILT; never wired to runtime).
- 92c6db9 W3: CA-18 §6 LIVE (ENTRY 019).
- cd2608d W5a Stage 3 Phase 1: Build/Wire Construction Engine wire_up class.
- e017643 W3: CA-18 LIVE (ENTRY 018).

**Net of last ~30 commits:** SSOT amendments (CA-13 / CA-15 / CA-16-A v3 + CA-17 v3-FINAL + CA-18 §§1-6) ratified into canonical; W5a built construction engine end-to-end against RelTwin (2 \`construction_pre_baseline.v1\` envelopes); W5b built ToolIntelligenceService but did not wire it to the runner; W6 ran 4 Panels; W3 wrote a conformance audit. No PR shipped from any orchestration run.

## I. Summary of CA-18 conformance verdict (from §I of W3 audit report, verified by my own probes above)

| § | Status |
|---|---|
| §1 Core Loop (URL in -> new URL out + honest assessment + trajectory) | PARTIAL — preview URLs produced; 0 PRs; no pre-run honest gate; no trajectory reporting |
| §2 Quality Dimensions (all 10, no silent omission, jurisdiction-aware) | FAIL — 6 of 10 dimensions silently omitted; no jurisdiction column |
| §3 Iteration Model (AUTOMATIC/GUIDED/MANUAL) | PASS — three modes wired + UI-exposed |
| §4 Platform Scope (product-agnostic; global) | PARTIAL — LEGACY_FALLBACK residual |
| §5 Symbiotic Principle (FlowAI on FlowAI) | PARTIAL — invoked 4× but 0 shippable output; construction_eligible=false |
| §6 Tool Intelligence (per-step top-5 selection + emission) | PARTIAL — data + service exist; runtime never wired; 0 tool.selection envelopes |
| §7.6 Scoring | PARTIAL — calibrated against narrow 4-dim coverage |

**Overall: 1 of 7 fully PASSING.**

## J. What the Panel must decide

Three questions follow (J5/J6/J7). Each Panel member MUST pick ONE option per question. Quorum ≥7/10 ENGAGED. Rationale required.
`;

async function buildCompactCanonical() {
  const ca18Raw = await readFile(path.join(repoRoot, 'docs', 'specs', 'FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md'), 'utf8');
  const ca18Lines = ca18Raw.split(/\r?\n/);
  const cuts = (start, end) => {
    const a = ca18Lines.findIndex((l) => l.startsWith(start));
    const b = ca18Lines.findIndex((l, i) => i > a && l.startsWith(end));
    return ca18Lines.slice(a, b === -1 ? undefined : b).join('\n');
  };
  const ca18Section1 = cuts('## §1 — Core Definition', '## §2');
  const ca18Section2 = cuts('## §2 — Quality Dimensions', '## §3');
  const ca18Section5 = cuts('## §5 — Symbiotic Meta-Principle', '## §6');
  const ca18Section6 = cuts('## §6 — Tool Intelligence Principle', '\n---');

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
  const sections = [
    ['## 1. ', '## 2. ', 2000],
    ['## 7. ', '## 8. ', 2500],
    ['## 11. ', '## 12. ', 2500],
    ['## 29.', '\n\n## 30.', 2500],
  ];
  return [
    '# FlowAI SSOT COMPACT EXCERPT (SSOT-consistency-next-action Panel)',
    '',
    '---',
    '',
    '# CA-18 §1 — Core Definition (canonical per ENTRY 018, LIVE 2026-05-19)',
    '',
    ca18Section1,
    '',
    '---',
    '',
    '# CA-18 §2 — Quality Dimensions (canonical per ENTRY 018)',
    '',
    ca18Section2,
    '',
    '---',
    '',
    '# CA-18 §5 — Symbiotic Meta-Principle (canonical per ENTRY 018)',
    '',
    ca18Section5,
    '',
    '---',
    '',
    '# CA-18 §6 — Tool Intelligence Principle (canonical per ENTRY 019, LIVE 2026-05-19)',
    '',
    ca18Section6,
    '',
    '---',
    '',
    ...sections.map(([s, e, max]) => slice(s, e, max)).filter(Boolean).map((t) => t + '\n'),
  ].join('\n');
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ssot-consistency-panel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const canonical = await buildCompactCanonical();
  process.stdout.write(`[ssot-consistency-panel] canonical: ${canonical.length} chars · artifact: ${ARTIFACT.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'SSOT consistency check + next action — verifiable-facts Panel (CA-18 §1/§5/§6 vs live state)',
    draftText: ARTIFACT,
    questions: QUESTIONS,
    seed: 'ssot-consistency-next-action-2026-05-20',
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();

  const t = result.tally;
  process.stdout.write(`[ssot-consistency-panel] complete · bundle=${result.bundle_chars} · engaged=${t.engagedTotal}/10 · objs=${t.distinctObjections}\n`);
  for (const q of QUESTIONS) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal}) cleared=${cleared}\n`);
  }

  const md = [
    `# Panel — SSOT consistency + next action (2026-05-20)`, ``,
    `**Dispatch:** W6 — verifiable-facts Panel; CA-18 conformance + ONE next action.`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 200)}" → **${c[o.key] || 0}**`);
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
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 160) || vt.key) : (vt.pick_text || '—');
        lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) lines.push(`  > ${vt.rationale}`);
      }
      return lines.join('\n');
    }).join('\n\n'),
  ];
  await writeFile(MD_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({
    schema: 'ssot-consistency-next-action.sidecar.v1',
    dispatch: 'W6 — verifiable-facts Panel; CA-18 conformance + ONE next action (2026-05-20)',
    startedAt, finishedAt, audit, bundle_size: result.bundle_chars,
    tally: result.tally, per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor, perReviewer: result.perReviewer, questions: QUESTIONS,
  }, null, 2), 'utf8');
  process.stdout.write(`[ssot-consistency-panel] DONE -> ${MD_PATH}\n`);
}

main().catch((e) => { process.stderr.write(`[ssot-consistency-panel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
