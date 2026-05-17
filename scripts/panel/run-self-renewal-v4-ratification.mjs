// scripts/panel/run-self-renewal-v4-ratification.mjs
//
// W6 ADVERSARIAL Panel — Self-Renewal Spec v4 (commit ab01583)
// Re-rates G-Q1, G-Q3, G-Q4, G-Q6, G-Q7. G-Q2 + G-Q5 carry RATIFIED.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'SELF_RENEWAL_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'self-renewal-v4-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'self-renewal-v4-ratification-2026-05-17.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1', topic: 'Self-Renewal §4.3 v4 R4 — Phase B graduation requires three-condition AND-gate (≥30 days production + zero material incidents + NEW Panel ratification of Phase B spec); per-product `selfRenewalScopeRollback` boolean (default false) allows operators to revert any product back to MAX_FILES=1 even after Phase B ships. Is this the right scope-graduation model?',
    options: [
      { key: 'GQ1v4-A', text: 'Three-condition AND-gate + per-product rollback is correct — Panel re-ratification preserves adversarial review at each authority expansion; per-product rollback bounds blast radius when a specific product turns out to be a poor multi-file candidate.' },
      { key: 'GQ1v4-B', text: 'Insufficient — Phase A should also require per-finding-category opt-in for multi-file in Phase B (e.g. "this product\'s accessibility findings can use multi-file, but performance findings cannot"), preventing one bad category from poisoning multi-file authority for an entire product.' },
      { key: 'GQ1v4-C', text: 'Over-engineered — the per-product selfRenewalScopeRollback boolean is config-creep. Phase B should ship as fleet-wide MAX_FILES=3 with no per-product override; a misbehaving product gets fixed at the engineering level, not patched-around via config.' },
      { key: 'GQ1v4-D', text: 'Graduation conditions correct but the "material incident" definition (regression revert, credential exfiltration, 5× cost overrun) is too narrow — should also include "operator merge-rate drops below 50% of pre-Self-Renewal baseline" as a material incident, since that signals systemic loss of operator trust.' },
    ],
    draftedKey: 'GQ1v4-A',
  },
  {
    id: 'G-Q3', topic: 'Self-Renewal §3.2 v4 R3 — GitHub App as default + branch-scoped PAT fallback behind per-product feature flag `selfRenewalCredentialMode ∈ { app (default), pat_fallback }`. PAT must be branch-scoped to flowai/* via dedicated machine user + branch protection. App permission manifest pinned in-repo at .github/flowai-app-manifest.yml. Is this the right credential model for Phase A?',
    options: [
      { key: 'GQ3v4-A', text: 'App-default + opt-in PAT fallback + in-repo manifest is correct — keeps the safe path as default, gives stuck-mid-install operators an escape hatch, and manifest pinning means operators always see permission changes before accepting them.' },
      { key: 'GQ3v4-B', text: 'Insufficient — Phase A should additionally require PAT fallback usage to expire automatically (selfRenewalCredentialMode auto-reverts to "app" after 30 days of pat_fallback usage), so the fallback can\'t silently become the long-term default for a product whose operator forgot to flip it back.' },
      { key: 'GQ3v4-C', text: 'Too permissive — opt-in PAT fallback re-introduces the long-lived-token attack surface that v3 eliminated; Phase A should keep App-only and accept the mid-install friction. The manifest pinning is good and should be kept.' },
      { key: 'GQ3v4-D', text: 'Wrong shape on the manifest — pinning at .github/flowai-app-manifest.yml inside the FlowAI repo doesn\'t help operators (they don\'t read FlowAI\'s repo); the manifest should be cross-posted to a public FlowAI status page and referenced from the install flow\'s consent screen instead.' },
    ],
    draftedKey: 'GQ3v4-A',
  },
  {
    id: 'G-Q4', topic: 'Self-Renewal §6.4 v4 R2 + R8 — reverts v3\'s `selfRenewalOpenPolicy` enum; restores v2 two-field model: `selfRenewalNegativeDeltaPolicy` (ALWAYS_OPEN default | DISCARD_ON_NEGATIVE) + `selfRenewalMinimumDelta` (integer, default 0). Cross-field validation (R2) rejects DISCARD_ON_NEGATIVE + selfRenewalMinimumDelta < 0 at registry-write time. Silent-close audit invariant (R8) makes full pre/post/delta governance_record_entry emission a HARD MUST for both discarded_negative_delta and below_threshold paths. Is this the right shape?',
    options: [
      { key: 'GQ4v4-A', text: 'Two-field + cross-field validation + hard audit-log invariant is correct — the two fields give operators independent negative-delta and minimum-improvement controls; the cross-field check eliminates the only incoherent combination; the audit invariant means silent-close is never silent on the audit trail.' },
      { key: 'GQ4v4-B', text: 'Insufficient — Phase A should expose `selfRenewalMinimumPerLayerDelta` map (per-Five-Layer minima) so an operator can require improvement on a specific layer (e.g. {L1:0,L2:0,L3:0,L4:0,L5:5} means "GTM must improve by 5; other layers may break even") — the single selfRenewalMinimumDelta aggregates over all five and hides layer-specific regressions inside a positive total.' },
      { key: 'GQ4v4-C', text: 'Over-engineered — Phase A should ship DISCARD_ON_NEGATIVE policy AS THE DEFAULT (not ALWAYS_OPEN); the audit-log invariant is enough to surface negative-delta runs to operators who care, and defaulting to DISCARD_ON_NEGATIVE cuts the regression-PR review burden to zero for the long-tail operator who doesn\'t tune.' },
      { key: 'GQ4v4-D', text: 'Wrong invariant on R8 — silent-close audit emissions should NOT include the full preScore/postScore payload; that bloats ProductSSOT.governance_record over time and operators rarely re-read them. Emit only delta + policy; defer pre/post to a separate cold-storage event-log.' },
    ],
    draftedKey: 'GQ4v4-A',
  },
  {
    id: 'G-Q6', topic: 'Self-Renewal §6.4 v4 R1 — restores configurability via `ProductRegistry.selfRenewalSubstantialThreshold` (integer, default +5, operator-configurable per product). v3\'s hardcoded +5 removed. Threshold controls when delta is labelled "substantial improvement" in PR body + audit-log entries. Cross-field validation requires selfRenewalSubstantialThreshold > selfRenewalMinimumDelta. Is configurable +5-default the right shape?',
    options: [
      { key: 'GQ6v4-A', text: 'Configurable integer with +5 default is correct — operators tune "substantial" to their product\'s value model (e.g. raise to +10 for products where each Five-Layer point is a major win, lower to +3 for high-finding-density products); +5 default preserves a sensible out-of-box meaning.' },
      { key: 'GQ6v4-B', text: 'Insufficient — Phase A should expose `selfRenewalModestThreshold` (integer, default +1) so PR-body labels can distinguish "no improvement / modest / substantial" with three bands instead of just "substantial vs not"; operators need finer-grained delta labelling for review-queue triage.' },
      { key: 'GQ6v4-C', text: 'Over-engineered — the substantial-vs-modest label is cosmetic; collapse selfRenewalSubstantialThreshold into selfRenewalMinimumDelta (one field, one knob) and let operators who want a "substantial" label render it client-side in their own dashboards.' },
      { key: 'GQ6v4-D', text: 'Wrong validation — requiring selfRenewalSubstantialThreshold > selfRenewalMinimumDelta is too strict; operators may legitimately want selfRenewalMinimumDelta=5 (open only substantial-or-better PRs) AND selfRenewalSubstantialThreshold=5 (every PR that opens is by definition substantial). Validation should be >=, not >.' },
    ],
    draftedKey: 'GQ6v4-A',
  },
  {
    id: 'G-Q7', topic: 'Self-Renewal v4 disposition: v4 applies 8 surgical fixes (R1 configurable substantial threshold, R2 two-field model restored, R3 PAT fallback behind per-product flag + manifest, R4 three-condition graduation + scope-rollback, R5 rate cap + runaway detector, R6 nightly branch cleanup, R7 smoke-selector validation at registry-write time, R8 silent-close audit invariant) to address the conditions from v3 NOT_RATIFIED. G-Q2 + G-Q5 carried unchanged. Given all 8 conditions addressed, the appropriate Panel disposition for v4 is:',
    options: [
      { key: 'GQ7v4-A', text: 'Promote — the 8 conditions are addressed cleanly and Option C v4 is ready for Phase A engineering dispatch.' },
      { key: 'GQ7v4-B', text: 'Promote-with-Reservations — the 8 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).' },
      { key: 'GQ7v4-C', text: 'Revise — one or more of the 8 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect).' },
      { key: 'GQ7v4-D', text: 'Reject — the 8 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement (specify the architectural concern).' },
    ],
    draftedKey: 'GQ7v4-A',
  },
];

async function buildCompactCanonical() {
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(startMarker, endMarker, maxChars) {
    const s = lines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = lines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    const text = lines.slice(s, e === -1 ? undefined : e).join('\n');
    if (!maxChars || text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n_[…section truncated for bundle-cap]_';
  }
  return [
    '# FlowAI SSOT — COMPACT EXCERPT (Self-Renewal v4 context)',
    'Sections: §10 (AgentState), §11 (catalogue), §15.1 (26-Agent Roster).',
    '', '---', '',
    slice('## 10. ', '## 11. ', 6500), '',
    slice('## 11. ', '## 12. ', 6500), '',
    slice('## 15. ', '## 16. ', 6500),
  ].join('\n');
}

function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) return { status: 'INVALID', headline: 'Consultation INVALID — re-run required.', conditions: [], alternativeWins: [] };
  const conditions = [];
  const alternativeWins = [];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const wonDrafted = v.topKey === q.draftedKey;
    const isStrong = /^(UNANIMOUS|SUPERMAJORITY|QUORUM_PLURALITY)/.test(v.verdict);
    if (wonDrafted && isStrong) continue;
    if (!wonDrafted && isStrong) {
      const opt = q.options.find((o) => o.key === v.topKey);
      alternativeWins.push({ qId: q.id, topic: q.topic, newPosition: opt?.text, verdict: v.verdict });
      continue;
    }
    conditions.push({ qId: q.id, topic: q.topic, verdict: v.verdict, draftedKey: q.draftedKey, draftedText: q.options.find((o) => o.key === q.draftedKey)?.text, detail: v.detail });
  }
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'v4 ratified — all 5 re-rated questions land on draft position with quorum or stronger.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `v4 ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `${conditions.length} of 5 re-rated question(s) lack clear Panel majority on draft.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[self-renewal-v4] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed — halting.');

  const specRaw = await readFile(SPEC_PATH, 'utf8');
  function stripAnchor(s) {
    return s
      .replace(/\(\s*drafted\s*\)/gi, '(authored)')
      .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
      .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
      .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
      .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
      .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
  }
  const draftText = stripAnchor(specRaw);
  const compactCanonical = await buildCompactCanonical();
  process.stdout.write(`[self-renewal-v4] compact canonical: ${compactCanonical.length} chars · draft: ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Self-Renewal Spec v4 ratification — G-Q1/G-Q3/G-Q4/G-Q6/G-Q7 (8 surgical fixes R1–R8)',
    draftText,
    questions: QUESTIONS,
    seed: 'self-renewal-v4-ratification-2026-05-17',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();
  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const t = result.tally;
  const lines = [`# Panel — Self-Renewal v4 ADVERSARIAL RATIFICATION (2026-05-17)`, ``,
    `**Spec:** docs/specs/SELF_RENEWAL_SPEC.md (commit ab01583)`,
    `**Mode:** ADVERSARIAL — locked W5b format. Re-rates G-Q1/G-Q3/G-Q4/G-Q6/G-Q7. G-Q2 + G-Q5 carry RATIFIED.`,
    `**Started:** ${startedAt}  ·  **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §10+§11+§15.1 canonical + full v4 spec).`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``,
    `## 🚨 RATIFICATION VERDICT — \`${ratification.status}\``,
    ratification.headline, ``,
    `## DISSENT-FLOOR`,
    `Alignment ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = **${(result.dissentFloor.alignedPct*100).toFixed(1)}%** · objections **${t.distinctObjections}** · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`, ``,
    `## Per-question tally`,
    `| Q | Top key | Top / Engaged | Verdict |`, `|---|---|---|---|`,
    ...QUESTIONS.map((q) => `| **${q.id}** | \`${result.perVerdicts[q.id].topKey || '—'}\` | ${result.perVerdicts[q.id].topCount} / ${t.engagedTotal} | \`${result.perVerdicts[q.id].verdict}\` |`),
    ``,
    `## Per-question detail`,
    ...QUESTIONS.map((q) => {
      const v = result.perVerdicts[q.id]; const c = t.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 180)}"  →  **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` (free-text) → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id} — ${q.topic}\n\nTally (ENGAGED-only, ${t.engagedTotal}):\n${tally.join('\n')}\n\n**Verdict:** \`${v.verdict}\` — ${v.detail}.\n`;
    }),
    ``,
    `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded / parse-failure)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('### Adversarial pass', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`**Objection ${i + 1} — ${o.title}**`, '', `> ${(o.detail || '').replace(/\n/g, '\n> ')}`, '');
        out.push(`**Worse-than-status-quo:** ${r.adversarial.worse_than_status_quo}`, '', `**Precedent:** ${r.adversarial.precedent}`, '');
      }
      if (r.rejection_steelman) out.push('### Rejection steelman', '', `> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`, '');
      out.push('### Votes', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 100) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n---\n\n')];
  await writeFile(OUTPUT_PATH, lines.join('\n'), 'utf8');
  const sidecar = { schema: 'self-renewal-v4.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, perReviewer: result.perReviewer, questions: QUESTIONS };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[self-renewal-v4] wrote outputs · status=${ratification.status} · alignment=${(result.dissentFloor.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = result.perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[self-renewal-v4] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
