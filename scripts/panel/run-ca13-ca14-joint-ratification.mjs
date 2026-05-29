// scripts/panel/run-ca13-ca14-joint-ratification.mjs
//
// W6 ADVERSARIAL Panel — JOINT ratification of CA-13 (commit 81cf144) and
// CA-14 (commit fae9ff3) per §CA-14-E coupling. 16 questions total
// (CA-13: 5, CA-14: 11). Quorum ≥7/10 per Locked Rule 17.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca13-ca14-joint-ratification-2026-05-18.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca13-ca14-joint-ratification-2026-05-18.sidecar.json');

const QUESTIONS = [
  // ===== CA-13-A (3 questions) =====
  {
    id: 'CA-13-A-Q1', topic: 'CA-13-A-Q1 — Should §7.6 GTM Readiness Report adopt the CEO directive of `≥95` as the GTM-ready band (per CA-13-A), superseding the ENTRY 006 `≥75` Demo-ready band?',
    options: [
      { key: 'CA13AQ1-RATIFY',  text: 'Ratify — adopt CA-13-A §7.6 bands verbatim. GTM-ready=95–100; Near-GTM (conditional)=90–94; Internal-only=75–89; Pre-internal=60–74; Not-demo-ready=0–59.' },
      { key: 'CA13AQ1-REVISE',  text: 'Ratify with revision — adopt the bar change but adjust band labels or thresholds (specify).' },
      { key: 'CA13AQ1-REJECT',  text: 'Reject — keep ENTRY 006\'s ≥75 Demo-ready bar; surface the CEO directive as an operator-product GTM bar (per-product target) rather than the §7.6 canonical band threshold.' },
      { key: 'CA13AQ1-DEFER',   text: 'Defer — surface the CEO directive but do not amend §7.6 until at least one VEU product demonstrates ≥95 sustained end-to-end per ENTRY 010 repeat-until-GTM loop.' },
    ],
    draftedKey: 'CA13AQ1-RATIFY',
  },
  {
    id: 'CA-13-A-Q2', topic: 'CA-13-A-Q2 — CA-13-A introduces a Near-GTM band (90–94) that MAY pass §11 Step 5 as "conditional clearance" (admin signoff per §13 Approval Gate). Right balance, or should the 95-bar be hard?',
    options: [
      { key: 'CA13AQ2-RATIFY',   text: 'Ratify as drafted — Near-GTM passes Step 5 with admin signoff + LIMITATIONS published verbatim.' },
      { key: 'CA13AQ2-HARD',     text: 'Eliminate conditional path — ≥95 is hard; below 95 → blocked; admin cannot signoff a Near-GTM as cleared.' },
      { key: 'CA13AQ2-TIGHTEN',  text: 'Tighten conditional path — Near-GTM passes Step 5 only when ALL `high` findings are Resolved (not just terminally decided; documented + human-gated insufficient).' },
      { key: 'CA13AQ2-LOOSEN',   text: 'Loosen conditional path — Near-GTM passes Step 5 with operator signoff (not just admin); admin retains override authority.' },
    ],
    draftedKey: 'CA13AQ2-RATIFY',
  },
  {
    id: 'CA-13-A-Q3', topic: 'CA-13-A-Q3 — Should the canonical §19 carry an explicit "two-distinct-95 bars" reconciliation paragraph (CA-13-A §19.0) to prevent future conflation between Self-Audit 95/95 and GTM Readiness ≥95?',
    options: [
      { key: 'CA13AQ3-RATIFY',   text: 'Ratify — adopt §19.0 verbatim. Reconciliation paragraph is load-bearing per Locked Rule 3 (three independent governance mechanisms must all pass).' },
      { key: 'CA13AQ3-REVISE',   text: 'Ratify with revision — keep the reconciliation principle but adjust the §19.0 wording (specify).' },
      { key: 'CA13AQ3-REJECT',   text: 'Reject — the table at §10 already lists the three mechanisms; additional §19.0 paragraph is redundant.' },
      { key: 'CA13AQ3-MOVE',     text: 'Move the reconciliation to §10 (Self-Governance Layer) instead of §19 (Governance / Panel / SSOT Access) — better topical fit.' },
    ],
    draftedKey: 'CA13AQ3-RATIFY',
  },
  // ===== CA-13-B (2 questions) =====
  {
    id: 'CA-13-B-Q1', topic: 'CA-13-B-Q1 — ENTRY 009 records the CEO re-disposition of CA-9-Q4 to Option (a) — EXECUTOR_REGISTRY sibling pattern — but §15 intro + §15.1 rows 21/26 still carry the old (b) phrasing. Should the canonical text be amended to match ENTRY 009?',
    options: [
      { key: 'CA13BQ1-RATIFY',   text: 'Ratify — adopt CA-13-B verbatim. Strike "(b) dual-authority" from §15 intro + §15.1 rows 21/26; replace with Option (a) sibling-pattern language citing ENTRY 009.' },
      { key: 'CA13BQ1-REVISE',   text: 'Ratify with revision — adopt the strike but adjust replacement wording (specify; e.g. shorter citation, different phrasing of "primary authority retained at recommend_only").' },
      { key: 'CA13BQ1-REJECT',   text: 'Reject — leave canonical text at (b) phrasing; treat ENTRY 009\'s "Option (a) LOCKED" as a code-level decision that doesn\'t propagate to §15 wording (Panel argues §15 wording is descriptive of the agent\'s TOTAL authority surface including sibling).' },
      { key: 'CA13BQ1-DEFER',    text: 'Defer — wait for engineering dispatch to populate the §15.5 sibling-row table with executor entries; amend §15 intro + §15.1 at that same commit (joint disposition).' },
    ],
    draftedKey: 'CA13BQ1-RATIFY',
  },
  {
    id: 'CA-13-B-Q2', topic: 'CA-13-B-Q2 — CA-13-B uses `aggressive-crawl-conductor-executor` (Agent #21 sibling) and `orchestra-research-agent-executor` (Agent #26 sibling) as the sibling charter keys. Right naming?',
    options: [
      { key: 'CA13BQ2-RATIFY',     text: 'Adopt as drafted — `<agent-short-name>-executor` pattern (consistent with existing `self-renewal-executor` per CA-7 §15.5 row).' },
      { key: 'CA13BQ2-AGENTID',    text: 'Adopt agentId-keyed naming instead — e.g. `agent-21-executor`, `agent-26-executor` (consistent with `_registry.ts` agentId column).' },
      { key: 'CA13BQ2-CAPABILITY', text: 'Adopt capability-keyed naming — e.g. `crawl-write-executor`, `orchestra-admission-executor` (consistent with what the sibling DOES rather than which primary it siblings).' },
      { key: 'CA13BQ2-DEFER',      text: 'Defer naming to engineering dispatch — CA-13-B canonizes the DECISION; W5x picks the keys at population time.' },
    ],
    draftedKey: 'CA13BQ2-RATIFY',
  },
  // ===== CA-14-A (4 questions) =====
  {
    id: 'CA-14-A-Q1', topic: 'CA-14-A-Q1 — Should §11 Clearance Step 5 require Phase B Adversarial Surface Testing as a HARD prerequisite (per CEO directive 2026-05-18)?',
    options: [
      { key: 'CA14AQ1-RATIFY',     text: 'Ratify as drafted — Phase B is a hard gate; failure blocks Step 5.' },
      { key: 'CA14AQ1-REDUCED',    text: 'Ratify with reduced scope — Phase B mandatory only for products in `prd` environment; `staging` + `dev` may pass with Phase A only.' },
      { key: 'CA14AQ1-OPTIN',      text: 'Ratify with operator opt-in — Phase B defaults to mandatory but operator (admin role) may explicitly opt out per product with audit-logged justification.' },
      { key: 'CA14AQ1-REJECT',     text: 'Reject — Phase A is sufficient; the four-prerequisite gate from ENTRY 006 stays; Phase B may surface as advisory signal without blocking.' },
    ],
    draftedKey: 'CA14AQ1-RATIFY',
  },
  {
    id: 'CA-14-A-Q2', topic: 'CA-14-A-Q2 — CA-14-A specifies a verbatim disclosure for Phase-A-only deliveries: "This §7.6 score reflects surface verification only. Interactive flows (authenticated paths, error-state recovery, engine adversarial probes) were not exercised. This score is NOT a functional certification." Right wording?',
    options: [
      { key: 'CA14AQ2-RATIFY',    text: 'Ratify as drafted (verbatim canonical wording).' },
      { key: 'CA14AQ2-PARAPHRASE', text: 'Ratify with operator-paraphrase permission — same intent, operator may rewrite (subject to admin review).' },
      { key: 'CA14AQ2-SHORTER',   text: 'Adopt a shorter form — e.g. "§7.6 score reflects surface verification only; NOT a functional certification."' },
      { key: 'CA14AQ2-FREEFORM',  text: 'Adopt no verbatim wording — require disclosure but let operator phrase.' },
    ],
    draftedKey: 'CA14AQ2-RATIFY',
  },
  {
    id: 'CA-14-A-Q3', topic: 'CA-14-A-Q3 — Phase B implementation owner. CA-14-A specifies Phase B as a prerequisite but does not assign an implementation owner. Which agent should own Phase B?',
    options: [
      { key: 'CA14AQ3-AGENT21',   text: 'Agent #21 ACE Conductor expand to own Phase B (extends ENTRY 006 charter).' },
      { key: 'CA14AQ3-AGENT8',    text: 'Agent #8 Quality Audit owns Phase B (Phase B is interactive-verification, conceptually closer to QA).' },
      { key: 'CA14AQ3-OPSRUNNER', text: 'NEW Ops Runner role (one of #22/#24/#25 pending §27 OQ-2) owns Phase B as its canonical charter.' },
      { key: 'CA14AQ3-DEFER',     text: 'Defer ownership — CA-14-A canonizes the requirement; engineering dispatch picks the owner in a follow-up.' },
    ],
    draftedKey: 'CA14AQ3-AGENT21',
  },
  {
    id: 'CA-14-A-Q4', topic: 'CA-14-A-Q4 — Should CA-14-A add Locked Rule 19 ("Phase A vs Phase B — DO NOT CONFLATE") to §25?',
    options: [
      { key: 'CA14AQ4-RATIFY',  text: 'Ratify Locked Rule 19 as drafted.' },
      { key: 'CA14AQ4-DEFER',   text: 'Ratify but defer Rule 19 numbering — CA-14 has multiple Locked-Rule candidates; consolidate at end of CA cycle.' },
      { key: 'CA14AQ4-REJECT',  text: 'Reject Locked Rule 19 — the §6.10 + §7.6 + §7 LIMITATIONS amendments are sufficient; no new Locked Rule needed.' },
      { key: 'CA14AQ4-MODIFY',  text: 'Modify Rule 19 wording (specify in rationale).' },
    ],
    draftedKey: 'CA14AQ4-RATIFY',
  },
  // ===== CA-14-B (3 questions) =====
  {
    id: 'CA-14-B-Q1', topic: 'CA-14-B-Q1 — Should §7 Output Contract item #6 (the five invariants: diff-only / preserve / parse / regression-guard / attribution) be ratified as drafted?',
    options: [
      { key: 'CA14BQ1-RATIFY',  text: 'Ratify all 5 invariants as drafted.' },
      { key: 'CA14BQ1-DROP',    text: 'Ratify 4 invariants; drop one (specify which in rationale).' },
      { key: 'CA14BQ1-EXPAND',  text: 'Ratify with expansion — add a 6th invariant (e.g. test-suite gate before PR).' },
      { key: 'CA14BQ1-REJECT',  text: 'Reject — the invariants belong in SELF_RENEWAL_SPEC.md not in canonical SSOT.' },
    ],
    draftedKey: 'CA14BQ1-RATIFY',
  },
  {
    id: 'CA-14-B-Q2', topic: 'CA-14-B-Q2 — The canonical guarantee reads: "FlowAI NEVER ships a fix that regresses §7.6 score OR introduces new `critical`/`high` findings. It refuses the PR and exits NO_IMPROVEMENT." Right wording?',
    options: [
      { key: 'CA14BQ2-RATIFY',     text: 'Ratify as drafted (verbatim canonical guarantee).' },
      { key: 'CA14BQ2-SOFTEN',     text: 'Soften to "rarely ships" — acknowledges edge cases.' },
      { key: 'CA14BQ2-OVERRIDE',   text: 'Strengthen with operator-override clause — "...UNLESS operator (admin role) explicitly overrides with audit-logged justification."' },
      { key: 'CA14BQ2-MODIFY',     text: 'Modify (specify in rationale).' },
    ],
    draftedKey: 'CA14BQ2-RATIFY',
  },
  {
    id: 'CA-14-B-Q3', topic: 'CA-14-B-Q3 — CA-14-B adds §10.4 "Fix-Safety invariants". Right placement in §10 Self-Governance Layer, or should it live elsewhere?',
    options: [
      { key: 'CA14BQ3-RATIFY',    text: 'Ratify §10.4 placement.' },
      { key: 'CA14BQ3-S12',       text: 'Move to §12 Remediation Modes (more directly about the fix path).' },
      { key: 'CA14BQ3-S19',       text: 'Move to §19 Governance (alongside 95/95 + Panel + SSOT Access).' },
      { key: 'CA14BQ3-CROSSLIST', text: 'Cross-list (live in §10.4 AND cross-referenced from §12 + §19).' },
    ],
    draftedKey: 'CA14BQ3-RATIFY',
  },
  // ===== CA-14-C (2 questions) =====
  {
    id: 'CA-14-C-Q1', topic: 'CA-14-C-Q1 — Should the canonical text explicitly state that the Five-Layer Intelligence Framework is telemetry only, not a remediation prioritizer?',
    options: [
      { key: 'CA14CQ1-RATIFY',     text: 'Ratify as drafted — §6.10 + §7.6 paragraphs canonical.' },
      { key: 'CA14CQ1-STRONGER',   text: 'Ratify with stronger language — "Five-Layer tags MUST NOT influence remediation ordering" (explicit prohibition vs. "DO NOT influence").' },
      { key: 'CA14CQ1-REJECT',     text: 'Reject — the Five-Layer framework\'s role is already implicit in Locked Rule 6 ("tagging"); the clarification is redundant.' },
      { key: 'CA14CQ1-MODIFY',     text: 'Modify (specify in rationale).' },
    ],
    draftedKey: 'CA14CQ1-RATIFY',
  },
  {
    id: 'CA-14-C-Q2', topic: 'CA-14-C-Q2 — The pipeline (§9) Step 6 doesn\'t currently specify the prioritization source. Should CA-14-C add an explicit Step 6 row note referencing §7.6 findings?',
    options: [
      { key: 'CA14CQ2-ADD',          text: 'Add a Step 6 note in §9 referencing §7.6 findings as the prioritization source.' },
      { key: 'CA14CQ2-CONDITIONAL',  text: 'Add the note only if the §9 step-row table format permits.' },
      { key: 'CA14CQ2-SKIP',         text: "Don't touch §9 — the §6.10 + §7.6 amendments are sufficient." },
      { key: 'CA14CQ2-MODIFY',       text: 'Modify (specify in rationale).' },
    ],
    draftedKey: 'CA14CQ2-ADD',
  },
  // ===== CA-14-D (2 questions) =====
  {
    id: 'CA-14-D-Q1', topic: 'CA-14-D-Q1 — Should §7.5.1 (branch-of-record + ProductSSOT seeding + atomic-audit-write) be ratified as drafted?',
    options: [
      { key: 'CA14DQ1-RATIFY',  text: 'Ratify all 3 invariants as drafted.' },
      { key: 'CA14DQ1-DROP',    text: 'Ratify 2; drop one (specify in rationale).' },
      { key: 'CA14DQ1-EXPAND',  text: 'Ratify with expansion — e.g. add a 4th invariant on per-product selfRenewalCredentialMode enumeration.' },
      { key: 'CA14DQ1-REJECT',  text: 'Reject — §7.5 already covers ProductSSOT; the operational invariants belong in engineering spec not canonical.' },
    ],
    draftedKey: 'CA14DQ1-RATIFY',
  },
  {
    id: 'CA-14-D-Q2', topic: 'CA-14-D-Q2 — CA-14-D Invariant 2 lists FlowAI + MyPregLife as seeded; remaining 4 VEU products (SAIGE, ReachSMS, RelTwin, PressAI) pending. Block ratification or proceed?',
    options: [
      { key: 'CA14DQ2-BLOCK',     text: 'Block CA-14 ratification until all 5 VEU products are seeded.' },
      { key: 'CA14DQ2-NDAYS',     text: 'Ratify CA-14 with explicit acceptance criterion: remaining 4 products seeded within N days post-ratification.' },
      { key: 'CA14DQ2-IMMEDIATE', text: 'Ratify CA-14 immediately; remaining 4 products seeded per operator-driven dispatch order.' },
      { key: 'CA14DQ2-MODIFY',    text: 'Modify (specify in rationale).' },
    ],
    draftedKey: 'CA14DQ2-NDAYS',
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
    '# FlowAI SSOT COMPACT EXCERPT (CA-13+CA-14 joint ratification)',
    'Sections: §7.5/§7.6 (output contract + GTM Readiness), §10 (Self-Governance), §15.1 (26-Agent Roster), §19 (Governance), §25 (Locked Rules).',
    '', '---', '',
    slice('## 7. ', '## 8. ', 5000), '',
    slice('## 10. ', '## 11. ', 4000), '',
    slice('## 15. ', '## 16. ', 4000), '',
    slice('## 19. ', '## 20. ', 3500), '',
    slice('## 25. ', '## 26. ', 3500),
  ].join('\n');
}

function stripAnchor(s) {
  return s
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
    .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
    .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
    .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
}

const QUORUM = 7;

function classify(verdict, topKey) {
  if (/^UNANIMOUS|^SUPERMAJORITY|^QUORUM_PLURALITY/.test(verdict) && topKey?.endsWith('-RATIFY')) return 'QUORUM_RATIFY';
  if (topKey?.endsWith('-RATIFY')) return 'PLURALITY_RATIFY';
  if (topKey?.endsWith('-REVISE')) return 'REVISE';
  if (topKey?.endsWith('-REJECT')) return 'REJECT';
  if (topKey?.endsWith('-DEFER')) return 'DEFER';
  return 'OTHER';
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ca13-ca14-joint] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const ca13 = stripAnchor(await readFile(path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA13_DRAFT.md'), 'utf8'));
  const ca14 = stripAnchor(await readFile(path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA14_DRAFT.md'), 'utf8'));
  const draftText = [
    '═══════════════ SSOT AMENDMENT CA-13 (commit 81cf144) ═══════════════',
    '',
    ca13,
    '',
    '═══════════════ SSOT AMENDMENT CA-14 (commit fae9ff3) ═══════════════',
    '',
    ca14,
  ].join('\n');
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[ca13-ca14-joint] compact canonical: ${compactCanonical.length} · draft: ${draftText.length}\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'JOINT ratification — CA-13 (5 questions) + CA-14 (11 questions) per §CA-14-E coupling',
    draftText,
    questions: QUESTIONS,
    seed: 'ca13-ca14-joint-ratification-2026-05-18',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();

  const summary = QUESTIONS.map((q) => {
    const v = result.perVerdicts[q.id];
    const c = result.tally.perQuestion[q.id];
    return {
      qId: q.id,
      verdict: v.verdict,
      top: v.topKey,
      topCount: v.topCount,
      engaged: result.tally.engagedTotal,
      cleared: v.topCount >= QUORUM && v.topKey === q.draftedKey,
      classification: classify(v.verdict, v.topKey),
      tallyByOption: c,
    };
  });

  const ca13Quorum = summary.filter((s) => /^CA-13/.test(s.qId) && s.cleared).length;
  const ca14Quorum = summary.filter((s) => /^CA-14/.test(s.qId) && s.cleared).length;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const t = result.tally;
  const md = [`# Panel — CA-13 + CA-14 JOINT ADVERSARIAL RATIFICATION (2026-05-18)`,
    ``, `**Commits:** CA-13 \`81cf144\` · CA-14 \`fae9ff3\``,
    `**Coupling:** §CA-14-E (joint W6 session)`,
    `**Quorum:** ≥${QUORUM}/10 on drafted (a) for ratification per Locked Rule 17`,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``, `## SUMMARY`,
    `- CA-13 questions: 5 · CA-14 questions: 11 · Total: 16`,
    `- CA-13 quorum-RATIFY (drafted (a) at ≥${QUORUM}/${t.engagedTotal}): ${ca13Quorum}/5`,
    `- CA-14 quorum-RATIFY (drafted (a) at ≥${QUORUM}/${t.engagedTotal}): ${ca14Quorum}/11`,
    `- Engaged: ${t.engagedTotal}/10 · Distinct objections: ${t.distinctObjections}`,
    `- Dissent floor: ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = ${(result.dissentFloor.alignedPct*100).toFixed(1)}% · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
    ``, `## Per-question verdicts`,
    `| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥${QUORUM}) |`,
    `|---|---|---|---|---|`,
    ...summary.map((s) => `| **${s.qId}** | \`${s.verdict}\` | \`${s.top || '—'}\` | ${s.topCount}/${s.engaged} | ${s.cleared ? '✅' : '—'} |`),
    ``, `## Detail per question`,
    ...QUESTIONS.map((q) => {
      const s = summary.find((x) => x.qId === q.id);
      const c = result.tally.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id}\nTopic: ${q.topic}\nTally (n=${s.engaged}):\n${tally.join('\n')}\n**Verdict:** ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged}) — cleared: ${s.cleared ? '✅' : '—'}\n`;
    }),
    ``, `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`## Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('### Adversarial pass', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`**Obj ${i+1} — ${o.title}**`, '', `> ${(o.detail||'').replace(/\n/g,'\n> ')}`, '');
      }
      if (r.rejection_steelman) out.push('### Steelman', '', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
      out.push('### Votes', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 90) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n---\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({ schema: 'ca13-ca14-joint.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, summary, perReviewer: result.perReviewer, questions: QUESTIONS, ca13_quorum_count: ca13Quorum, ca14_quorum_count: ca14Quorum, quorum_floor: QUORUM }, null, 2), 'utf8');
  process.stdout.write(`[ca13-ca14-joint] SUMMARY: CA-13 quorum-RATIFY ${ca13Quorum}/5 · CA-14 quorum-RATIFY ${ca14Quorum}/11\n`);
  for (const s of summary) process.stdout.write(`  ${s.qId}: ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged}) cleared=${s.cleared}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[ca13-ca14-joint] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
