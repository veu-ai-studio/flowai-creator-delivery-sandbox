// scripts/panel/run-ca13-15-16a-v3-repanel.mjs
//
// W6 v3 CONVERGENCE re-Panel — CA-13 v3 / CA-15 v3 / CA-16-A v3.
// Three focused per-amendment adversarial Panels run sequentially in
// foreground. Per-CA bundle ≤32K. Quorum ≥7/10 ENGAGED per Locked Rule 17.
// NOTE: convergence iteration — non-cleared questions go to CEO disposition,
// NOT a v4.

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
const CONS_PATH = path.join(OUTPUT_DIR, 'ca13-15-16a-v3-repanel-2026-05-19.md');
const CONS_SIDECAR = path.join(OUTPUT_DIR, 'ca13-15-16a-v3-repanel-2026-05-19.sidecar.json');
const QUORUM = 7;

const CA13_QUESTIONS = [
  {
    id: 'CA-13-A-v3-Q1', topic: 'CA-13-A v3 Q1 — Does Panel ratify the CA-13 v3 spine (per CEO Locked Rule 13 option-(i)): canonical §7.6 GTM bar = ≥95; sub-95 only via admin-only expiring override (14-day default, [1,30] bounds, no silent clamping); ClearanceRecord migration path is implementation prerequisite for cutover?',
    options: [
      { key: 'CA13AV3Q1-RATIFY',  text: 'Ratify v3 as drafted (≥95 canonical + admin-only expiring override + 14-day default, [1,30] hard bounds + migration prerequisite per §7.6.2).' },
      { key: 'CA13AV3Q1-TIGHTER', text: 'Strengthen — expiry default 7 days (not 14), hard bounds [1,14]; rationale-quality validation requires ≥120 chars (not 80).' },
      { key: 'CA13AV3Q1-RUNGATED', text: 'Strengthen — override expires at next pipeline run ONLY (no N-day default; override expires the moment next run executes).' },
      { key: 'CA13AV3Q1-REJECT',  text: 'Reject the spine — return to v2 operator-config knob with bounds raised to [80,100] (Slot 2 FLOOR80 variant).' },
    ],
    draftedKey: 'CA13AV3Q1-RATIFY',
  },
  {
    id: 'CA-13-A-v3-Q2', topic: 'CA-13-A v3 Q2 — Does Panel ratify elimination of 90–94 Near-GTM conditional band with NO fallback clause? Admin-only expiring override (Q1) is the single controlled sub-95 exception.',
    options: [
      { key: 'CA13AV3Q2-RATIFY',     text: 'Ratify v3 as drafted (Near-GTM band eliminated; no fallback clause).' },
      { key: 'CA13AV3Q2-COHERENCE',  text: 'Strengthen — append "Any future Panel proposal to re-introduce sub-95 conditional path is a candidate for CEO-Locked-Rule-13 dispositional veto by default, given the admin-only expiring override per §7.6.1."' },
      { key: 'CA13AV3Q2-AUDIT',      text: 'Strengthen toward audit — every §11 Step 5 evaluation consulting an override emits additional `step5_override_consulted.v1` envelope alongside `gtm_bar_admin_override_used.v1`.' },
      { key: 'CA13AV3Q2-REJECT',     text: 'Reject — restore v2 fallback clause as safety valve; v3 removal too rigid.' },
    ],
    draftedKey: 'CA13AV3Q2-RATIFY',
  },
  {
    id: 'CA-13-A-v3-Q3', topic: 'CA-13-A v3 Q3 — Does Panel ratify §19.0 STRONGER variant: append mandatory invariant "These are NEVER conflated in any operator-facing surface" + UI surface enforcement?',
    options: [
      { key: 'CA13AV3Q3-RATIFY',  text: 'Ratify v3 as drafted (mandatory anti-conflation invariant + per-surface labeling + dual-display audit envelope).' },
      { key: 'CA13AV3Q3-ADMINUI', text: 'Strengthen further — also require admin role for any UI surface displaying BOTH bars simultaneously (operator role cannot author dashboards mixing the two).' },
      { key: 'CA13AV3Q3-NOTABLE', text: 'Ratify but with redundancy fix — keep the invariant but DELETE §19.0 paragraph table (invariant alone suffices; §10 governance-mechanisms table already covers it).' },
      { key: 'CA13AV3Q3-REJECT',  text: 'Reject — §19.0 paragraph + invariant is redundant with §10; remove §19.0 entirely.' },
    ],
    draftedKey: 'CA13AV3Q3-RATIFY',
  },
  {
    id: 'CA-13-B-v3-Q1', topic: 'CA-13-B v3 Q1 — Does Panel ratify v3 §15-intro + §15.1 rows 21/26 wording (v2 carried) PLUS explicit EXECUTOR_REGISTRY + BaseAgent.guard() enforcement-spec cross-reference?',
    options: [
      { key: 'CA13BV3Q1-RATIFY',  text: 'Ratify v3 as drafted (wording carried + 3-bullet enforcement-spec cross-reference).' },
      { key: 'CA13BV3Q1-INLINE',  text: 'Strengthen — also inline schema snippet of BaseAgent.guard() arguments directly in §15-intro text, not just cross-reference.' },
      { key: 'CA13BV3Q1-BUNDLE',  text: 'Strengthen — bundle §15.5 sibling row-table populate INTO CA-13-B v3 ratification (lands EXECUTOR_REGISTRY entries alongside wording).' },
      { key: 'CA13BV3Q1-REJECT',  text: 'Reject — wording remains too vague without actual §15.5 sibling row-table populate; defer entire CA-13-B until that engineering dispatch ships.' },
    ],
    draftedKey: 'CA13BV3Q1-RATIFY',
  },
  {
    id: 'CA-13-B-v3-Q2', topic: 'CA-13-B v3 Q2 — Does Panel ratify v3 capability-keyed sibling naming `crawl-write-executor` + `orchestra-admission-executor`?',
    options: [
      { key: 'CA13BV3Q2-RATIFY',     text: 'Ratify v3 primary as drafted (`crawl-write-executor` + `orchestra-admission-executor`).' },
      { key: 'CA13BV3Q2-MEMBERSHIP', text: 'Ratify with `membership` rename — Agent #26 sibling becomes `orchestra-membership-executor`; Agent #21 stays `crawl-write-executor`.' },
      { key: 'CA13BV3Q2-AGENTID',    text: 'Adopt agentId-keyed — `agent-21-executor` + `agent-26-executor` (preserves traceability at cost of capability-clarity).' },
      { key: 'CA13BV3Q2-REJECT',     text: 'Reject — restore v1 agent-short-name-keyed naming.' },
    ],
    draftedKey: 'CA13BV3Q2-RATIFY',
  },
];

const CA15_QUESTIONS = [
  {
    id: 'CA-15-C-v3-Q1', topic: 'CA-15-C v3 Q1 — Does Panel ratify Purpose-Driven Optimization loop exits on numeric §7.6 floor + zero critical + Self-Renewal terminal + LIMITATIONS + Phase B pass — NO LLM-judged purpose-alignment check?',
    options: [
      { key: 'CA15CV3Q1-RATIFY',  text: 'Ratify v3 as drafted (5 numeric exit conditions; no LLM check).' },
      { key: 'CA15CV3Q1-OPTIN',   text: 'Strengthen — re-introduce LLM-judged purpose-alignment as 6th OPTIONAL exit condition gated by `product_registry.llm_purpose_check_enabled` (default false; admin-only opt-in).' },
      { key: 'CA15CV3Q1-3CONSEC', text: 'Strengthen — exit condition #1 stricter: §7.6 score floor moves from "≥`gtm_ready_bar_override`" to "≥ for THREE consecutive iterations".' },
      { key: 'CA15CV3Q1-REJECT',  text: 'Reject — LLM-judged purpose check is structurally required for a Purpose-Driven loop; without it, rename §28-bis to "Numeric-Floor Optimization Loop" and remove "Purpose-Driven" framing.' },
    ],
    draftedKey: 'CA15CV3Q1-RATIFY',
  },
  {
    id: 'CA-15-C-v3-Q3', topic: 'CA-15-C v3 Q3 — Does Panel ratify drift as tiered annotation (minor 20% / major 50% / critical >50%-or-clear) that never deadlocks the loop?',
    options: [
      { key: 'CA15CV3Q3-RATIFY',  text: 'Ratify v3 as drafted (tier thresholds 20% / 50% heuristic-bootstrap; loop never deadlocks; critical freezes Self-Renewal fix-generation only).' },
      { key: 'CA15CV3Q3-EMPIRICAL', text: 'Strengthen empirically — defer concrete thresholds to a successor CA-N once 90 days of drift telemetry are accumulated; v3 ships with single annotation kind and no tiering.' },
      { key: 'CA15CV3Q3-CRITICAL_BLOCK', text: 'Strengthen tier rules — critical drift ALSO blocks loop exit (not just fix-generation); operator must explicitly re-approve before loop can exit.' },
      { key: 'CA15CV3Q3-REJECT',  text: 'Reject — drift detection lives in operator-notes tooling outside FlowAI canonical (consistent with CA-15-B v3 removal of purpose from ProductSSOT).' },
    ],
    draftedKey: 'CA15CV3Q3-RATIFY',
  },
  {
    id: 'CA-15-D-v3-Q1', topic: 'CA-15-D v3 Q1 — Does Panel ratify §27 reverts to HARD BLOCKING GATE (v1 form) as primary, with hybrid (advisory non-critical / blocking critical) noted as alternative?',
    options: [
      { key: 'CA15DV3Q1-RATIFY', text: 'Ratify v3 primary as drafted (§27 hard blocking gate; failure blocks §11 Step 6 until conformance achieved; admin override per §19 95/95-override rule).' },
      { key: 'CA15DV3Q1-HYBRID', text: 'Ratify the noted hybrid — §27 blocks on critical/high severity findings; surfaces medium/low as advisory + admin dashboard alarm without blocking.' },
      { key: 'CA15DV3Q1-STRICTER', text: 'Strengthen further — §27 hard blocking AND no admin override path (remove §19-equivalent override; conformance failure cannot be bypassed).' },
      { key: 'CA15DV3Q1-REJECT', text: 'Reject the revert — preserve v2 advisory framing despite v2 verdict; rationale Panel may supply.' },
    ],
    draftedKey: 'CA15DV3Q1-RATIFY',
  },
  {
    id: 'CA-15-D-v3-Q2', topic: 'CA-15-D v3 Q2 — Does Panel ratify CEO re-sign triggered ONLY for CAs touching files under `src/lib/governance/**` (concrete directory; replaces v2 not-yet-written `docs/governance/CONFORMANCE_SCOPE.md`)?',
    options: [
      { key: 'CA15DV3Q2-RATIFY',   text: 'Ratify v3 as drafted (entire `src/lib/governance/` directory is scope; CI grep at promotion-commit time).' },
      { key: 'CA15DV3Q2-BROADER',  text: 'Strengthen broader — scope = `src/lib/governance/**` AND `src/lib/conformance/**` AND any `*.sql` migration files.' },
      { key: 'CA15DV3Q2-NARROWER', text: 'Strengthen narrower — scope = ONLY ScoreEvaluator.js + ClearanceProtocol.ts + CanonicalKinds.ts (3 canonical files).' },
      { key: 'CA15DV3Q2-REJECT',   text: 'Reject the v3 scope — restore v2 `docs/governance/CONFORMANCE_SCOPE.md` documentation-file scope despite v2 verdict.' },
    ],
    draftedKey: 'CA15DV3Q2-RATIFY',
  },
];

const CA16A_QUESTIONS = [
  {
    id: 'CA-16-A-v3-Q1', topic: 'CA-16-A v3 Q1 — Does Panel ratify DROP of the canonical §7 item #8 proactive_recommendation envelope entirely? Recs surface ONLY via tooling/dashboard.',
    options: [
      { key: 'CA16AV3Q1-RATIFY', text: 'Ratify v3 as drafted (canonical envelope DROPPED; recs in tooling + admin dashboard; engineering owns schema in `scripts/types/proactive-recs.d.ts`).' },
      { key: 'CA16AV3Q1-SUMMARY', text: 'Ratify with stricter tooling discipline — tooling MUST emit `governance_record_entry kind:proactive_rec_summary.v1` ONCE PER DAY summarizing queue state; summary IS canonical-audit-trail-accessible.' },
      { key: 'CA16AV3Q1-LINKED', text: 'Ratify the drop BUT promote the lightweight ClearanceRecord reference into canonical: any tooling surfacing recs MUST populate `last_seen_clearance_record_id`; canonical SSOT enforces linkage.' },
      { key: 'CA16AV3Q1-REJECT', text: 'Reject the v3 drop — return to v2 minimal-envelope canonical position; defer engineering schema to successor CA-N.' },
    ],
    draftedKey: 'CA16AV3Q1-RATIFY',
  },
  {
    id: 'CA-16-A-v3-Q2', topic: 'CA-16-A v3 Q2 — Does Panel ratify recs living OUTSIDE §11 Clearance with lightweight `last_seen_clearance_record_id` reference (non-gating; informational only)?',
    options: [
      { key: 'CA16AV3Q2-RATIFY',   text: 'Ratify v3 as drafted (recs OUTSIDE §11; lightweight ClearanceRecord reference; recs never block clearance).' },
      { key: 'CA16AV3Q2-STEP65',   text: 'Strengthen — adopt Step 6.5 post-Deploy surface as the canonical home for recs (Slot 1 STEP65 variant); reference becomes a Step 6.5 attribute.' },
      { key: 'CA16AV3Q2-DASHONLY', text: 'Ratify drop the reference — recs live ENTIRELY outside any canonical linkage; no `last_seen_clearance_record_id` field; pure side-channel.' },
      { key: 'CA16AV3Q2-REJECT',   text: 'Reject — restore §11.5 Step 1.5 Proactive Recommendation Review per v1.' },
    ],
    draftedKey: 'CA16AV3Q2-RATIFY',
  },
  {
    id: 'CA-16-A-v3-Q3', topic: 'CA-16-A v3 Q3 — Does Panel ratify addition of a `reopened` lifecycle state (admin-gated; rationale ≥80 chars; ONLY transitions from `rejected`)?',
    options: [
      { key: 'CA16AV3Q3-RATIFY',   text: 'Ratify v3 as drafted (6-state lifecycle including REOPEN; admin-only; ≥80-char rationale; rejected→reopened→open transition path).' },
      { key: 'CA16AV3Q3-TWOADMIN', text: 'Strengthen — REOPEN requires TWO admin sign-offs (different admins; second confirms within 24h); prevents single-admin reopen-spam failure.' },
      { key: 'CA16AV3Q3-DEFERRED', text: 'Ratify but broaden eligibility — `deferred` recommendations also reopenable (currently rejected-only); allows admin to manually resurface a deferred rec.' },
      { key: 'CA16AV3Q3-REJECT',   text: 'Reject the REOPEN state — 5-state lifecycle is sufficient; rejected recs that become relevant later should resurface as new `open` entries with fresh `id`.' },
    ],
    draftedKey: 'CA16AV3Q3-RATIFY',
  },
  {
    id: 'CA-16-A-v3-Q4', topic: 'CA-16-A v3 Q4 — Does Panel ratify defer-window bounds `[7, 90]` (primary; default 14) with out-of-bounds REJECTED not clamped?',
    options: [
      { key: 'CA16AV3Q4-RATIFY',  text: 'Ratify v3 primary as drafted ([7, 90] bounds; default 14; out-of-bounds rejected).' },
      { key: 'CA16AV3Q4-ADMIN30', text: 'Ratify the ADMIN30 hybrid alternative — operator role may set up to 30 days; admin role may extend to 90 days with rationale ≥80 chars.' },
      { key: 'CA16AV3Q4-TIGHTER', text: 'Tighter — bounds [7, 60] (instead of [7, 90]); 90 days approaches one sprint cycle and may suppress recs across §28 symbiotic-loop iterations.' },
      { key: 'CA16AV3Q4-REJECT',  text: 'Reject — restore v2 [1, 365] bounds despite Panel verdict.' },
    ],
    draftedKey: 'CA16AV3Q4-RATIFY',
  },
];

const AMENDMENTS = [
  {
    code: 'CA-13-v3', file: 'SSOT_AMENDMENT_CA13_V3_DRAFT.md', commit: 'd396bd2',
    title: '95-bar spine option-(i) admin-only + expiring + migration',
    questions: CA13_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4000], ['## 11. ', '## 12. ', 3500], ['## 15. ', '## 16. ', 3000], ['## 19. ', '## 20. ', 2500]],
    amendmentMaxChars: 15500,
  },
  {
    code: 'CA-15-v3', file: 'SSOT_AMENDMENT_CA15_V3_DRAFT.md', commit: 'c5b050f',
    title: 'CA-15 v3 convergent (deletions + §27 revert) per v2 verdicts',
    questions: CA15_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4000], ['## 10. ', '## 11. ', 3000], ['## 25. ', '## 26. ', 2500]],
    amendmentMaxChars: 16500,
  },
  {
    code: 'CA-16-A-v3', file: 'SSOT_AMENDMENT_CA16A_V3_DRAFT.md', commit: 'e8bb7d4',
    title: 'CA-16 SPLIT enacted; CA-16-A v3 (recs in tooling/dashboard)',
    questions: CA16A_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4000], ['## 11. ', '## 12. ', 3500], ['## 14. ', '## 15. ', 2500]],
    amendmentMaxChars: 16500,
  },
];

function stripAnchor(s) {
  return s
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
    .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
    .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
    .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
}

async function buildCompactCanonical(canonicalSections) {
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
  return ['# FlowAI SSOT COMPACT EXCERPT (v3 convergence re-Panel)', '', '---', '',
    ...canonicalSections.map(([s, e, max]) => slice(s, e, max)).filter(Boolean).map((t) => t + '\n')].join('\n');
}

async function loadAmendmentText(file, maxChars) {
  const raw = await readFile(path.join(repoRoot, 'docs', 'specs', file), 'utf8');
  const lines = raw.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^## (v3 Panel Questions|§\d+\s*—\s*v3 Panel Questions|§\d+\s*—\s*Acceptance criteria|Acceptance criteria)/.test(l));
  const trimmedLines = cut === -1 ? lines : lines.slice(0, cut);
  let text = stripAnchor(trimmedLines.join('\n'));
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n\n_[…amendment truncated for bundle-cap]_';
  return text;
}

async function runOneAmendment(amend) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[${amend.code}] starting · ${startedAt}\n`);
  const draftText = await loadAmendmentText(amend.file, amend.amendmentMaxChars);
  const canonical = await buildCompactCanonical(amend.canonicalSections);
  process.stdout.write(`[${amend.code}] amendment: ${draftText.length} · canonical: ${canonical.length}\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `${amend.code} (${amend.title}) — v3 convergence re-Panel; non-cleared → CEO disposition (NOT v4)`,
    draftText,
    questions: amend.questions,
    seed: `${amend.code.toLowerCase().replace(/-/g, '')}-repanel-2026-05-19b`,
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();
  process.stdout.write(`[${amend.code}] complete · bundle=${result.bundle_chars} · engaged=${result.tally.engagedTotal}/10 · objs=${result.tally.distinctObjections}\n`);
  for (const q of amend.questions) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${result.tally.engagedTotal}) cleared=${cleared}\n`);
  }
  return { amend, startedAt, finishedAt, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[v3-repanel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const RESULTS = [];
  for (const amend of AMENDMENTS) {
    const out = await runOneAmendment(amend);
    RESULTS.push(out);
    const t = out.result.tally;
    const md = [`# Panel — ${amend.code} (${amend.title}) — v3 re-Panel (2026-05-19)`, ``,
      `**Spec:** docs/specs/${amend.file} (commit ${amend.commit})`,
      `**Bundle:** ${out.result.bundle_chars} chars (target ≤32K)`,
      `**Started:** ${out.startedAt} · **Finished:** ${out.finishedAt}`,
      `**Engaged:** ${t.engagedTotal}/10 · Tangential: ${t.tangential} · Silent: ${t.silent}`,
      `**Distinct objections:** ${t.distinctObjections}`,
      `**Alignment:** ${(out.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${out.result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
      ``, `## Per-question`,
      `| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥${QUORUM}) |`,
      `|---|---|---|---|---|`,
      ...amend.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
        return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
      }),
      ``, `## Detail`,
      ...amend.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const c = out.result.tally.perQuestion[q.id];
        const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
        for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
        if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
        return `### ${q.id}\n${q.topic}\n\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
      }),
      ``, `## All distinct objections (${t.distinctObjections})`,
      (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
      ``, `## Per-reviewer`,
      out.result.perReviewer.map((r) => {
        const lines = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
        if (r.state === 'SILENT') return lines.concat(['_(degraded)_', '']).join('\n');
        if (r.adversarial?.valid) {
          lines.push('**Adversarial pass:**', '');
          for (const [i, o] of r.adversarial.objections.entries()) lines.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
          lines.push('');
        }
        if (r.rejection_steelman) lines.push('**Steelman:**', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
        lines.push('**Votes:**', '');
        for (const q of amend.questions) {
          const vt = r.votes?.[q.id] || {};
          const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
          lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
          if (vt.rationale) lines.push(`  > ${vt.rationale}`);
        }
        return lines.join('\n');
      }).join('\n\n')];
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-repanel-2026-05-19.md`), md.join('\n'), 'utf8');
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-repanel-2026-05-19.sidecar.json`), JSON.stringify({ schema: 'v3-repanel.sidecar.v1', code: amend.code, commit: amend.commit, bundle_size: out.result.bundle_chars, startedAt: out.startedAt, finishedAt: out.finishedAt, w6_metadata: out.result.w6_metadata, tally: out.result.tally, per_question_verdicts: out.result.perVerdicts, dissent_floor: out.result.dissentFloor, perReviewer: out.result.perReviewer, questions: amend.questions }, null, 2), 'utf8');
  }
  const finishedAt = new Date().toISOString();

  const consolidated = [`# W6 v3 Convergence re-Panel · CA-13 / CA-15 / CA-16-A (2026-05-19)`, ``,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Quorum:** ≥${QUORUM}/10 ENGAGED per Locked Rule 17`,
    `**Disposition:** convergence iteration — non-cleared → CEO disposition (NOT a v4).`, ``,
    `## CROSS-AMENDMENT SUMMARY`,
    `| Amendment | Bundle | Engaged | Objs | Cleared / Total |`, `|---|--:|--:|--:|--:|`,
    ...RESULTS.map((r) => {
      const t = r.result.tally;
      const cleared = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topCount >= QUORUM && v.topKey === q.draftedKey; }).length;
      return `| **${r.amend.code}** | ${r.result.bundle_chars} | ${t.engagedTotal}/10 | ${t.distinctObjections} | ${cleared}/${r.amend.questions.length} |`;
    }),
    ``, ...RESULTS.map((r) => {
      const t = r.result.tally;
      return [`## ${r.amend.code} — ${r.amend.title}`, '',
        `Bundle: ${r.result.bundle_chars} · Engaged: ${t.engagedTotal}/10 · Objections: ${t.distinctObjections}`, '',
        `| Q | Verdict | Top key | Top/Engaged | Cleared |`, `|---|---|---|---|---|`,
        ...r.amend.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
          return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
        }),
        ''].join('\n');
    })];
  await writeFile(CONS_PATH, consolidated.join('\n'), 'utf8');
  await writeFile(CONS_SIDECAR, JSON.stringify({ schema: 'v3-repanel-consolidated.sidecar.v1', startedAt, finishedAt, audit, results: RESULTS.map((r) => ({ code: r.amend.code, commit: r.amend.commit, bundle_size: r.result.bundle_chars, tally: r.result.tally, per_question_verdicts: r.result.perVerdicts, dissent_floor: r.result.dissentFloor, questions: r.amend.questions })) }, null, 2), 'utf8');
  process.stdout.write(`[v3-repanel] DONE · consolidated → ${CONS_PATH}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[v3-repanel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
