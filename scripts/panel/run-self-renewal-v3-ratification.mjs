// scripts/panel/run-self-renewal-v3-ratification.mjs
//
// W6 ADVERSARIAL Panel — Self-Renewal Spec v3 (commit 79e4499)
// Re-rates only G-Q1, G-Q3, G-Q4, G-Q6, G-Q7 (5 questions).
// G-Q2 and G-Q5 carry RATIFIED from prior cycles.

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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'self-renewal-v3-ratification-2026-05-17.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'self-renewal-v3-ratification-2026-05-17.sidecar.json');

const QUESTIONS = [
  {
    id: 'G-Q1', topic: 'Self-Renewal §4.3 v3 — single-file fix scope (MAX_FILES reverted from 3 → 1) with diff-parse-time enforcement; Phase B graduation at ≥30 days × ≥3 of 5 products. Is this the right scope boundary for Phase A?',
    options: [
      { key: 'GQ1v3-A', text: 'Single-file scope with diff-parse-time enforcement and the defined Phase B graduation trigger is correct — minimum production risk, structural guarantee, clear path to expansion once Phase A is proven.' },
      { key: 'GQ1v3-B', text: 'Single-file is too restrictive given typecheck + preview-smoke MUST gates already catch most multi-file regressions — Phase A should re-raise to 2 files (component + companion test only).' },
      { key: 'GQ1v3-C', text: 'Single-file is correct for Phase A but the 30-day / 3-product graduation trigger is too quick — Phase B should require ≥90 days × ≥4 of 5 products since multi-file fixes are categorically higher-risk.' },
      { key: 'GQ1v3-D', text: 'The Phase A → Phase B transition should not be time-gated at all — Phase B should require a separate Panel ratification of a new spec, preserving adversarial review at each authority expansion.' },
    ],
    draftedKey: 'GQ1v3-A',
  },
  {
    id: 'G-Q3', topic: 'Self-Renewal §3.2 v3 — GitHub App ONLY credential model (fine-grained PAT fallback dropped). Products without a GitHub App installation are directed to install on first failed run. No Doppler PAT path; no `flowai-self-renewal` machine user. Is this the right credential model for Phase A?',
    options: [
      { key: 'GQ3v3-A', text: 'App-only from day one is correct — install-flow friction is acceptable because the App is the long-term safe path; a temporary fallback would only require a later removal dispatch.' },
      { key: 'GQ3v3-B', text: 'Insufficient — Phase A should additionally pin the App\'s manifest in-repo (e.g. .github/flowai-app-manifest.yml) so any change to the App\'s permission set produces an auditable diff before the operator accepts the next installation update.' },
      { key: 'GQ3v3-C', text: 'Too restrictive — Phase A should retain a branch-scoped PAT path behind a per-product feature flag so an operator stuck mid-install can still get an emergency renewal run; the App remains the default.' },
      { key: 'GQ3v3-D', text: 'Wrong shape — drop the GitHub App entirely and use a per-renewal-run device-flow OAuth that asks the operator to authorise each run individually; strictly minimises standing authority.' },
    ],
    draftedKey: 'GQ3v3-A',
  },
  {
    id: 'G-Q4', topic: 'Self-Renewal §6.4 v3 — collapses v2\'s two-field design (selfRenewalNegativeDeltaPolicy + selfRenewalMinimumDelta) into ONE per-product enum: `selfRenewalOpenPolicy ∈ { ALL (default), IMPROVEMENTS_ONLY, SUBSTANTIAL_ONLY }`. Is the 3-state enum the right shape for the negative-delta dimension?',
    options: [
      { key: 'GQ4v3-A', text: 'Single 3-state enum is correct — replaces two coupled fields with one, eliminates illegal combinations, keeps ALL as transparency-first default, and exposes only the three states operators actually want.' },
      { key: 'GQ4v3-B', text: 'Insufficient — Phase A still needs a fourth state IMPROVEMENTS_ONLY_NO_BANNER (silent suppression of regression banners on zero-delta runs that just barely cleared the bar) so operators reviewing borderline PRs aren\'t visually pulled toward "this might be a regression" framing on neutral runs.' },
      { key: 'GQ4v3-C', text: 'Too coarse — three states cannot capture the per-product reviewer-bandwidth nuance the v2 two-field design supported (e.g. "open everything but only beep me if delta_total ≥ +3"); restore the two-field model and accept the cross-field validation cost.' },
      { key: 'GQ4v3-D', text: 'Wrong default — IMPROVEMENTS_ONLY should be the default, not ALL; defaulting to "surface every run" trains operator review queues to ignore renewal PRs and erodes the merge-gate over time.' },
    ],
    draftedKey: 'GQ4v3-A',
  },
  {
    id: 'G-Q6', topic: 'Self-Renewal §6.4 v3 — collapses v2\'s free-integer `selfRenewalMinimumDelta` into the discrete `SUBSTANTIAL_ONLY` state with a Panel-fixed threshold `delta_total >= 5`. Is `+5` the right threshold value for "substantial improvement"?',
    options: [
      { key: 'GQ6v3-A', text: '`+5` is correct — matches v1 G-Q4 option (d) framing ("Panel-ratified threshold for what \'substantial\' means"); large enough that LLM-noise-floor runs don\'t qualify, small enough that real wins do.' },
      { key: 'GQ6v3-B', text: '`+5` is too high — a real fix that improves one Five-Layer L by ~3 points (common when one finding category is addressed cleanly) would close as below_threshold; `+3` is the better fixed threshold.' },
      { key: 'GQ6v3-C', text: '`+5` is too low — given the cost envelope of ~$0.65–$5.00 per run, SUBSTANTIAL_ONLY should mean delta covers at least one run\'s worth of value-per-point; `+10` is the better fixed threshold.' },
      { key: 'GQ6v3-D', text: 'Any fixed integer is wrong — SUBSTANTIAL_ONLY should require a configurable per-product `selfRenewalSubstantialThreshold` integer (defaulting to `+5`) so operators tune to their own value model; collapse loses information that Q6\'s free integer carried.' },
    ],
    draftedKey: 'GQ6v3-A',
  },
  {
    id: 'G-Q7', topic: 'Self-Renewal v3 disposition: v3 applies 3 surgical fixes to address v2 NOT_RATIFIED conditions — App-only credential model (Q3), single-file fix scope restored with Phase B graduation trigger (Q1), and 3-state enum with `+5` SUBSTANTIAL_ONLY threshold (Q4 + Q6 collapse). G-Q2 + G-Q5 carried unchanged. Given these 3 changes, the appropriate Panel disposition for v3 is:',
    options: [
      { key: 'GQ7v3-A', text: 'Promote — the 3 conditions are addressed cleanly and Option C v3 is ready for Phase A engineering dispatch.' },
      { key: 'GQ7v3-B', text: 'Promote-with-Reservations — the 3 conditions are addressed but the Panel surfaces residual issues that the engineering dispatch should track (specify in rationale, non-blocking).' },
      { key: 'GQ7v3-C', text: 'Revise — one or more of the 3 surgical fixes is incomplete, inconsistent, or introduces a new defect that must be fixed before promotion (specify which condition and the defect).' },
      { key: 'GQ7v3-D', text: 'Reject — the 3 fixes expose a deeper architectural problem with Option C that surgical revisions cannot fix; the spec needs ground-up rework or replacement.' },
    ],
    draftedKey: 'GQ7v3-A',
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
    '# FlowAI SSOT — COMPACT EXCERPT (Self-Renewal v3 context)',
    'Sections: §10 (AgentState), §11 (post-§10 catalogue), §15.1 (26-Agent Roster).',
    '', '---', '',
    slice('## 10. ', '## 11. ', 7000), '',
    slice('## 11. ', '## 12. ', 7000), '',
    slice('## 15. ', '## 16. ', 7000),
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
  if (conditions.length === 0 && alternativeWins.length === 0) return { status: 'RATIFIED', headline: 'v3 ratified — all 5 re-rated questions land on draft position with quorum or stronger.', conditions: [], alternativeWins: [] };
  if (conditions.length === 0) return { status: 'RATIFIED_WITH_SUBSTITUTIONS', headline: `v3 ratified with ${alternativeWins.length} substitution(s).`, conditions: [], alternativeWins };
  return { status: 'NOT_RATIFIED', headline: `${conditions.length} of 5 re-rated question(s) lack clear Panel majority.`, conditions, alternativeWins };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[self-renewal-v3] started ${startedAt}\n`);
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
  process.stdout.write(`[self-renewal-v3] compact canonical: ${compactCanonical.length} chars · draft: ${draftText.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Self-Renewal Spec v3 ratification — G-Q1/G-Q3/G-Q4/G-Q6/G-Q7 (3 surgical fixes)',
    draftText,
    questions: QUESTIONS,
    seed: 'self-renewal-v3-ratification-2026-05-17',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();
  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const t = result.tally;
  const lines = [`# Panel — Self-Renewal v3 ADVERSARIAL RATIFICATION (2026-05-17)`, ``,
    `**Spec:** docs/specs/SELF_RENEWAL_SPEC.md (commit 79e4499)`,
    `**Mode:** ADVERSARIAL — locked W5b format. Re-rates G-Q1/G-Q3/G-Q4/G-Q6/G-Q7. G-Q2 + G-Q5 carry RATIFIED.`,
    `**Started:** ${startedAt}  ·  **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (compact §10+§11+§15.1 canonical + full v3 spec).`,
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
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 160)}"  →  **${c[o.key] || 0}**`);
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
  const sidecar = { schema: 'self-renewal-v3.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, ratification, perReviewer: result.perReviewer, questions: QUESTIONS };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[self-renewal-v3] wrote outputs · status=${ratification.status} · alignment=${(result.dissentFloor.alignedPct*100).toFixed(1)}%\n`);
  for (const q of QUESTIONS) { const v = result.perVerdicts[q.id]; process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`); }
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[self-renewal-v3] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
