// scripts/panel/run-buildwire-v2-4runs.mjs
//
// W6 BUILD/WIRE v2 — 4×2-Q re-Panel on BUILD_WIRE_ENGINE_SPEC_V2_DRAFT.md
// (commit 448932b). One run per S-invariant pair. Bundles ≤30K each.
// NON-OVERRIDABLE S2/S4/S5/S6 (strengthen-only, no reject path).
// PANEL-RATIFIABLE S1/S3/S7/S8 (reject path present).
// Quorum ≥7/10 ENGAGED per Locked Rule 17.

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
const CONS_PATH = path.join(OUTPUT_DIR, 'buildwire-v2-4runs-2026-05-19.md');
const CONS_SIDECAR = path.join(OUTPUT_DIR, 'buildwire-v2-4runs-2026-05-19.sidecar.json');
const QUORUM = 7;
const SPEC = path.join(repoRoot, 'docs', 'specs', 'BUILD_WIRE_ENGINE_SPEC_V2_DRAFT.md');

// =========================================================================
// 8 Questions (verbatim from §8.x of v2 spec)
// =========================================================================
const Q_S1 = {
  id: 'J2v2-S1', topic: 'J2v2-S1 — v2 extends S1 to a 10-field baseline (v1 6-field + runtime-config + feature-flag state + background-job inventory + external contract checksums). Right scope? (PANEL-RATIFIABLE — reject path present.)',
  options: [
    { key: 'S1V2-RATIFY',     text: 'Ratify S1 v2 as drafted (10-field baseline per the 4 NEW v2 hidden-state fields).' },
    { key: 'S1V2-USERJOURNEY', text: 'Strengthen further — also require operator-declared user-journey baseline (sequence of named flows the product is expected to serve; baseline captures whether each flow is presently functional).' },
    { key: 'S1V2-SIMPLIFY',   text: 'Simplify — keep v1\'s 6-field baseline; v2\'s 4 NEW hidden-state fields move to a separate "extended baseline" admin-opt-in (default OFF) per CA-15-A v2 dims-6+7 pattern.' },
    { key: 'S1V2-REJECT',     text: 'Reject the 4 NEW fields entirely — v1\'s 6-field baseline is sufficient; the hidden-state failure mode is theoretical, not observed.' },
  ],
  draftedKey: 'S1V2-RATIFY',
};

const Q_S2 = {
  id: 'J2v2-S2', topic: 'J2v2-S2 — v2 tightens system caps to 15/1500/3/4 + adds per-file density ceiling 150 lines + explicit upper bound for redesign_implementation operator-declared scope. NON-OVERRIDABLE per CEO Locked Rule 13 (strengthen-only). Right caps?',
  options: [
    { key: 'S2V2-RATIFY',  text: 'Ratify S2 v2 as drafted (15/1500/3/4 system caps + 150 lines/file density + redesign_implementation clamped to system cap).' },
    { key: 'S2V2-TIGHTER', text: 'Strengthen further — tighten system caps to 10/1000/2/3 (half-step beyond v2 drafted) + density ceiling to 100 lines/file.' },
    { key: 'S2V2-DENSITY', text: 'Strengthen via density-only — keep v2 system caps 15/1500/3/4 but tighten density to 100 lines/file.' },
    { key: 'S2V2-PERCLASS', text: 'Strengthen via per-class only — keep v2 system caps + density 150, reduce per-class defaults to half (wire_up=3/100/0/2 etc.).' },
  ],
  draftedKey: 'S2V2-RATIFY',
};

const Q_S3 = {
  id: 'J2v2-S3', topic: 'J2v2-S3 — v2 adds a 5th pillar to S3: Data-Loss Prevention. DROP COLUMN / DROP TABLE / TRUNCATE require explicit rationale citation + verified pg_dump backup + admin role. Right scope? (PANEL-RATIFIABLE — reject path present.)',
  options: [
    { key: 'S3V2-RATIFY',    text: 'Ratify S3 v2 as drafted (5 pillars including DLP).' },
    { key: 'S3V2-COOLDOWN',  text: 'Strengthen further — DLP MUST also require a 24-hour operator-cooldown window between approval and execution.' },
    { key: 'S3V2-FULLBACKUP', text: 'Strengthen via backup verification — require backup-restore-and-row-count-match (full restore + count diff < 0.1%) BEFORE the destructive migration runs.' },
    { key: 'S3V2-REJECT',    text: 'Reject the 5th pillar — destructive migrations belong in a separate W5x dispatch with manual operator review; the build/wire engine should not handle them.' },
  ],
  draftedKey: 'S3V2-RATIFY',
};

const Q_S4 = {
  id: 'J2v2-S4', topic: 'J2v2-S4 — v2 extends S4 to 8 pillars (drafted 6 + SSRF + rate-limit) + authz-regression extended to cover REMOVAL. NON-OVERRIDABLE per CEO Locked Rule 13 (strengthen-only). Right scope?',
  options: [
    { key: 'S4V2-RATIFY',   text: 'Ratify S4 v2 as drafted (8 pillars including SSRF + rate-limit + extended authz).' },
    { key: 'S4V2-CSRF',     text: 'Strengthen further — add 9th pillar CSRF probes for state-changing endpoints lacking CSRF-token or SameSite enforcement.' },
    { key: 'S4V2-PROTO',    text: 'Strengthen further — add 9th pillar prototype-pollution probes for Node.js endpoints that merge user-supplied objects.' },
    { key: 'S4V2-BOTH',     text: 'Strengthen further — both — 10-pillar S4 (drafted 8 + CSRF + prototype-pollution).' },
  ],
  draftedKey: 'S4V2-RATIFY',
};

const Q_S5 = {
  id: 'J2v2-S5', topic: 'J2v2-S5 — v2 strengthens S5 with: real-rollback execution in CI (replacing simulation) + 30-day retention + automatic rollback on Phase B post-merge failure within 1h. NON-OVERRIDABLE per CEO Locked Rule 13 (strengthen-only). Right mechanism?',
  options: [
    { key: 'S5V2-RATIFY',   text: 'Ratify S5 v2 as drafted (real-rollback execution + 30-day retention + auto-rollback on post-merge Phase B failure within 1h).' },
    { key: 'S5V2-RETAIN90', text: 'Strengthen retention — 90-day retention (instead of 30-day); covers longer-tail defect-discovery windows.' },
    { key: 'S5V2-WINDOW24', text: 'Strengthen auto-rollback trigger window — auto-rollback on Phase B failure within 24 hours of PR merge (instead of 1h).' },
    { key: 'S5V2-BOTH',     text: 'Strengthen via belt-and-suspenders — both — 90-day retention + 24h auto-rollback window.' },
  ],
  draftedKey: 'S5V2-RATIFY',
};

const Q_S6 = {
  id: 'J2v2-S6', topic: 'J2v2-S6 — v2 strengthens S6 with: admin-required for ALL 4 classes + 15-min freshness + rationale-quality validation + in-flight context-change invalidation. NON-OVERRIDABLE per CEO Locked Rule 13 (strengthen-only). Right approval model?',
  options: [
    { key: 'S6V2-RATIFY',  text: 'Ratify S6 v2 as drafted (admin-all + 15-min + rationale-quality + in-flight invalidation).' },
    { key: 'S6V2-TWOADMIN', text: 'Strengthen further — require two-admin sign-off for schema_migration + redesign_implementation; single-admin OK for wire_up + endpoint_generation.' },
    { key: 'S6V2-LLMRAT',  text: 'Strengthen rationale — require LLM-judged rationale quality (LLM-judge score ≥0.8 with admin override).' },
    { key: 'S6V2-BOTH',    text: 'Strengthen via belt-and-suspenders — both — two-admin for heavy classes + LLM-judged rationale.' },
  ],
  draftedKey: 'S6V2-RATIFY',
};

const Q_S7 = {
  id: 'J2v2-S7', topic: 'J2v2-S7 — v2 adds per-session sub-branches within per-product `self_renewal_branch` for CA-16-B multi-construction redesign sessions; squash-merge to per-product branch on operator approval; per-product branch remains merge target. Right discipline? (PANEL-RATIFIABLE.)',
  options: [
    { key: 'S7V2-RATIFY',     text: 'Ratify S7 v2 as drafted (sub-branches for multi-construction; squash-merge; per-product branch remains target).' },
    { key: 'S7V2-EVERY',      text: 'Strengthen — every construction (not just multi-construction sessions) uses a per-construction sub-branch; squash-merges to per-product branch on PR approval.' },
    { key: 'S7V2-REJECT',     text: 'Reject sub-branches — keep v1 behavior (every construction commits directly to per-product `self_renewal_branch`); sub-branches add complexity without commensurate safety gain.' },
    { key: 'S7V2-PERCLASS',   text: 'Adjust — sub-branches per construction-class instead of per-session (`<self_renewal_branch>/<class>/<runId>`).' },
  ],
  draftedKey: 'S7V2-RATIFY',
};

const Q_S8 = {
  id: 'J2v2-S8', topic: 'J2v2-S8 — v2 extends S8 with: live-preview Phase B post-PR-merge (auto-rollback on failure within 1h) + dual-load testing for endpoint_generation + backend probes (connection-pool / memory-leak / transaction-deadlock). PANEL-RATIFIABLE per §3.8 (reject path present). Right scope?',
  options: [
    { key: 'S8V2-RATIFY',  text: 'Ratify S8 v2 as drafted (3 Phase B runs incl live-preview; dual-load; backend probes).' },
    { key: 'S8V2-STRENGTHEN', text: 'Strengthen further — add load-profile-shadow-traffic (replay 30 minutes of real production traffic against preview URL before merge) OR fail-injection (kill DB connection mid-request, network-partition, simulate disk-full; assert graceful degradation) OR both.' },
    { key: 'S8V2-SIMPLIFY', text: 'Simplify — keep v1\'s pre-PR-only Phase B; drop v2 additions (live-preview post-merge + dual-load + backend probes); rely on post-deploy monitoring.' },
    { key: 'S8V2-REJECT',  text: 'Reject S8 v2 — Phase B against construction artifacts is duplicative of S4 + S3 + operator PR review; remove the mandatory Phase B step entirely.' },
  ],
  draftedKey: 'S8V2-RATIFY',
};

const RUNS = [
  { name: 'run-1-S1-S2', questions: [Q_S1, Q_S2], sectionIds: ['§3.1', '§3.2'] },
  { name: 'run-2-S3-S4', questions: [Q_S3, Q_S4], sectionIds: ['§3.3', '§3.4'] },
  { name: 'run-3-S5-S6', questions: [Q_S5, Q_S6], sectionIds: ['§3.5', '§3.6'] },
  { name: 'run-4-S7-S8', questions: [Q_S7, Q_S8], sectionIds: ['§3.7', '§3.8'] },
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

async function buildSpecExcerpt(sectionIds) {
  // Always include §1 (Purpose) + §2 (Construction Classes taxonomy) + the two §3.x sub-sections
  const raw = await readFile(SPEC, 'utf8');
  const lines = raw.split(/\r?\n/);
  function findSec(re) {
    const s = lines.findIndex((l) => re.test(l));
    if (s === -1) return null;
    let e = lines.findIndex((l, i) => i > s && /^(##|###)\s+§?\d/.test(l));
    if (e === -1) e = lines.length;
    return { s, e };
  }
  const titleLine = lines[0];
  const parts = [titleLine, ''];
  const s1 = findSec(/^## §1\b/);
  const s2 = findSec(/^## §2\b/);
  if (s1) parts.push(...lines.slice(s1.s, s1.e));
  if (s2) parts.push(...lines.slice(s2.s, s2.e));
  for (const id of sectionIds) {
    const sec = findSec(new RegExp('^### ' + id.replace('.', '\\.') + '\\b'));
    if (sec) parts.push('', ...lines.slice(sec.s, sec.e));
  }
  return stripAnchor(parts.join('\n'));
}

async function buildCanonical() {
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
  return ['# FlowAI SSOT COMPACT EXCERPT (build/wire v2 run context)',
          'Sections: §7 (Output Contract incl §7.5 ProductSSOT), §10 (Self-Governance), §25 (Locked Rules).',
          '', '---', '',
          slice('## 7. ', '## 8. ', 3000), '',
          slice('## 10. ', '## 11. ', 2500), '',
          slice('## 25. ', '## 26. ', 2500)].join('\n');
}

async function runOne(run, canonical) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[${run.name}] starting · ${startedAt}\n`);
  let draftText = await buildSpecExcerpt(run.sectionIds);
  const MAX = 19000;
  if (draftText.length > MAX) draftText = draftText.slice(0, MAX) + '\n\n_[…spec excerpt truncated for bundle-cap]_';
  process.stdout.write(`[${run.name}] spec excerpt: ${draftText.length} chars · canonical: ${canonical.length} chars\n`);
  // Verify NON-OVERRIDABLE invariants have no reject path in questions
  for (const q of run.questions) {
    const isNonOverride = /^(J2v2-S2|J2v2-S4|J2v2-S5|J2v2-S6)$/.test(q.id);
    const hasReject = q.options.some((o) => /-REJECT$/i.test(o.key));
    if (isNonOverride && hasReject) throw new Error(`NON-OVERRIDABLE invariant ${q.id} has a REJECT option — violates Locked Rule 13`);
    if (!isNonOverride && !hasReject) process.stdout.write(`[${run.name}] note: ${q.id} is PANEL-RATIFIABLE but has no REJECT option in this draft\n`);
  }
  const result = await runAdversarialPanelConsultation({
    topic: `Build/Wire Engine v2 re-Panel — ${run.name}. NON-OVERRIDABLE S2/S4/S5/S6 (Path H ENTRY 014).`,
    draftText,
    questions: run.questions,
    seed: `buildwire-v2-${run.name}-2026-05-19`,
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();
  process.stdout.write(`[${run.name}] complete · bundle=${result.bundle_chars} · engaged=${result.tally.engagedTotal}/10 · objs=${result.tally.distinctObjections}\n`);
  for (const q of run.questions) {
    const v = result.perVerdicts[q.id];
    const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
    process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${result.tally.engagedTotal}) cleared=${cleared}\n`);
  }
  return { run, startedAt, finishedAt, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[buildwire-v2-4runs] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');
  const canonical = await buildCanonical();

  const RESULTS = [];
  for (const run of RUNS) {
    const out = await runOne(run, canonical);
    RESULTS.push(out);
    // per-run transcript
    const t = out.result.tally;
    const md = [`# Panel — Build/Wire v2 re-Panel · ${run.name} (2026-05-19)`, '',
      `**Spec:** docs/specs/BUILD_WIRE_ENGINE_SPEC_V2_DRAFT.md (commit 448932b)`,
      `**Started:** ${out.startedAt} · **Finished:** ${out.finishedAt}`,
      `**Bundle:** ${out.result.bundle_chars} chars (target ≤30K)`,
      `**Engaged:** ${t.engagedTotal}/10 · Tangential: ${t.tangential} · Silent: ${t.silent}`,
      `**Objections:** ${t.distinctObjections}`,
      `**Alignment:** ${(out.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${out.result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
      '',
      `## Per-invariant`,
      `| Q | Verdict | Top key | Top / Engaged | Cleared (≥${QUORUM}) | NON-OVERRIDABLE |`,
      `|---|---|---|---|---|---|`,
      ...run.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
        const isNon = /^(J2v2-S2|J2v2-S4|J2v2-S5|J2v2-S6)$/.test(q.id);
        return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} | ${isNon ? '🔒' : ''} |`;
      }),
      ``,
      `## Detail`,
      ...run.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const c = out.result.tally.perQuestion[q.id];
        const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
        for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
        if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
        return `### ${q.id}\n${q.topic}\n\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
      }),
      ``,
      `## All distinct objections (${t.distinctObjections})`,
      (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
      ``,
      `## Per-reviewer`,
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
        for (const q of run.questions) {
          const vt = r.votes?.[q.id] || {};
          const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
          lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
          if (vt.rationale) lines.push(`  > ${vt.rationale}`);
        }
        return lines.join('\n');
      }).join('\n\n')];
    await writeFile(path.join(OUTPUT_DIR, `buildwire-v2-${run.name}-2026-05-19.md`), md.join('\n'), 'utf8');
    await writeFile(path.join(OUTPUT_DIR, `buildwire-v2-${run.name}-2026-05-19.sidecar.json`), JSON.stringify({ schema: 'buildwire-v2.sidecar.v1', run: run.name, bundle_size: out.result.bundle_chars, startedAt: out.startedAt, finishedAt: out.finishedAt, w6_metadata: out.result.w6_metadata, tally: out.result.tally, per_question_verdicts: out.result.perVerdicts, dissent_floor: out.result.dissentFloor, perReviewer: out.result.perReviewer, questions: run.questions }, null, 2), 'utf8');
  }
  const finishedAt = new Date().toISOString();

  // Consolidated
  const consolidated = [`# W6 Build/Wire v2 — 4×2-Q re-Panel · Consolidated (2026-05-19)`, '',
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Quorum:** ≥${QUORUM}/10 engaged per Locked Rule 17`,
    `**NON-OVERRIDABLE:** S2 / S4 / S5 / S6 (Path H ENTRY 014)`, '',
    `## Cross-run summary`,
    `| Run | Bundle | Engaged | Objs | Cleared / Total |`, `|---|--:|--:|--:|--:|`,
    ...RESULTS.map((r) => {
      const t = r.result.tally;
      const cleared = r.run.questions.filter((q) => { const v=r.result.perVerdicts[q.id]; return v.topCount>=QUORUM && v.topKey===q.draftedKey; }).length;
      return `| **${r.run.name}** | ${r.result.bundle_chars} | ${t.engagedTotal}/10 | ${t.distinctObjections} | ${cleared}/${r.run.questions.length} |`;
    }),
    '',
    ...RESULTS.map((r) => {
      const t = r.result.tally;
      return [`## ${r.run.name}`, '',
        `| Q | Verdict | Top key | Top/Engaged | Cleared | NON-OVERRIDABLE |`, `|---|---|---|---|---|---|`,
        ...r.run.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
          const isNon = /^(J2v2-S2|J2v2-S4|J2v2-S5|J2v2-S6)$/.test(q.id);
          return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} | ${isNon ? '🔒' : ''} |`;
        }),
        ''].join('\n');
    })];
  await writeFile(CONS_PATH, consolidated.join('\n'), 'utf8');
  await writeFile(CONS_SIDECAR, JSON.stringify({ schema: 'buildwire-v2-consolidated.sidecar.v1', startedAt, finishedAt, audit, runs: RESULTS.map((r) => ({ name: r.run.name, bundle: r.result.bundle_chars, tally: r.result.tally, per_question_verdicts: r.result.perVerdicts, dissent_floor: r.result.dissentFloor, questions: r.run.questions })) }, null, 2), 'utf8');
  process.stdout.write(`[buildwire-v2-4runs] DONE · consolidated → ${CONS_PATH}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[buildwire-v2-4runs] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
