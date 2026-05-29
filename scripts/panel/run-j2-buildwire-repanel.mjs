// scripts/panel/run-j2-buildwire-repanel.mjs
//
// W6 ADVERSARIAL Panel — J2 build/wire re-Panel on the 8 S-invariant questions
// (S1–S8) from §7 of BUILD_WIRE_ENGINE_SPEC_DRAFT.md (commit 4e6260b).
//
// CONTEXT — Path H disposition (CEO Locked Rule 13):
//   - S2 (bounded scope), S4 (construction security suite), S5 (rollback
//     substrate), S6 (pre-construction operator approval) are NON-OVERRIDABLE.
//     Panel may TIGHTEN; cannot ELIMINATE. Their options reflect this:
//     no reject path.
//   - S1, S3, S7, S8 are PANEL-RATIFIABLE.
//   - S7's per-product branch-of-record dependency is already cleared by
//     CA-14-D-Q1 quorum-RATIFY (cc14a8f, 8/10).
//
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
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'j2-buildwire-repanel-2026-05-19.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'j2-buildwire-repanel-2026-05-19.sidecar.json');
const QUORUM = 7;
const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'BUILD_WIRE_ENGINE_SPEC_DRAFT.md');

const QUESTIONS = [
  // ============= S1 — PANEL-RATIFIABLE =============
  {
    id: 'J2-S1', topic: 'J2-S1 — Pre-construction Phase A baseline (PANEL-RATIFIABLE). S1 captures Phase A baseline (score + findings + DOM/endpoint/schema/deps hashes) before any construction. Conformance tests S1-CT-1 through S1-CT-3 enforce. Right invariant?',
    options: [
      { key: 'J2S1-RATIFY',     text: 'Ratify S1 as drafted.' },
      { key: 'J2S1-SIMPLIFY',   text: 'Ratify with simplification — capture score + findings only; drop DOM/endpoint/schema/deps hashes (engineering can rebuild from runId).' },
      { key: 'J2S1-REJECT',     text: 'Reject S1 — pre-baseline is unnecessary; post-construction Phase B verification (S8) suffices.' },
      { key: 'J2S1-STRENGTHEN', text: 'Strengthen S1 — also require pre-construction multi-dim audit baseline per CA-15-A.' },
    ],
    draftedKey: 'J2S1-RATIFY',
  },
  // ============= S2 — NON-OVERRIDABLE (no reject path) =============
  {
    id: 'J2-S2', topic: 'J2-S2 — Bounded scope (NON-OVERRIDABLE per CEO Locked Rule 13 / Path H). S2 declares hard caps (file_count / line_count / new_dependency / dep_graph_radius) before construction; enforced at fix-generator boundary. Panel may strengthen / tighten but cannot eliminate. Right caps?',
    options: [
      { key: 'J2S2-RATIFY',  text: 'Ratify per-class defaults + hard system caps as drafted (wire_up=5/200/0/3; endpoint_generation=10/500/2/3; schema_migration=3/200/0/3; redesign=operator-declared; system caps 25/2000/5/5).' },
      { key: 'J2S2-TIGHTEN', text: 'Tighten — reduce per-class defaults to half the drafted values (wire_up=3/100/0/2 etc.); operator-override still permitted up to system caps.' },
      { key: 'J2S2-SYSCAPS', text: 'Strengthen system caps — 15/1500/3/4 (currently 25/2000/5/5).' },
      { key: 'J2S2-LOOSEN',  text: 'Loosen per-class defaults — wire_up=10/400/1/3 etc. (Panel believes defaults too restrictive for real-world construction).' },
    ],
    draftedKey: 'J2S2-RATIFY',
  },
  // ============= S3 — PANEL-RATIFIABLE =============
  {
    id: 'J2-S3', topic: 'J2-S3 — Schema migration testing (PANEL-RATIFIABLE). S3 requires every schema_migration to pass idempotency / drift / lock-contention / reversibility tests before PR. Conformance tests S3-CT-1 through S3-CT-4. Right scope?',
    options: [
      { key: 'J2S3-RATIFY',   text: 'Ratify S3 as drafted (4-pillar test suite).' },
      { key: 'J2S3-ADD5TH',   text: 'Add a 5th pillar — data-loss-prevention test (no DROP COLUMN / DROP TABLE without explicit operator confirmation + backup verification).' },
      { key: 'J2S3-REJECT',   text: 'Reject S3 — schema migrations belong in a separate W5x dispatch with operator manual review, not in the build/wire engine.' },
      { key: 'J2S3-MANUAL',   text: 'Replace S3 with operator-driven manual approval — engineer reviews schema migrations manually; no automated suite.' },
    ],
    draftedKey: 'J2S3-RATIFY',
  },
  // ============= S4 — NON-OVERRIDABLE (no reject path) =============
  {
    id: 'J2-S4', topic: 'J2-S4 — Construction security suite (NON-OVERRIDABLE per CEO Locked Rule 13 / Path H). S4 requires SQLi / XSS / auth-bypass / secrets / dep-CVE / authz-regression scans before PR. Panel may strengthen but cannot eliminate. Right scope?',
    options: [
      { key: 'J2S4-RATIFY',   text: 'Ratify S4 6-pillar suite as drafted.' },
      { key: 'J2S4-ADDSSRF',  text: 'Strengthen S4 — add a 7th pillar (SSRF probes for endpoints that fetch external URLs).' },
      { key: 'J2S4-ADDRATE',  text: 'Strengthen S4 — add an 8th pillar (rate-limit / abuse probes for endpoints exposed publicly).' },
      { key: 'J2S4-BOTH',     text: 'Both — 8-pillar S4 (drafted 6 + SSRF + rate-limit).' },
    ],
    draftedKey: 'J2S4-RATIFY',
  },
  // ============= S5 — NON-OVERRIDABLE (no reject path) =============
  {
    id: 'J2-S5', topic: 'J2-S5 — Rollback substrate (NON-OVERRIDABLE per CEO Locked Rule 13 / Path H). S5 requires pre-commit snapshot + CAS commit + rollback dry-run before PR; operator may invoke actual rollback post-PR. Panel may strengthen but cannot eliminate. Right mechanism?',
    options: [
      { key: 'J2S5-RATIFY', text: 'Ratify S5 as drafted (snapshot + CAS + dry-run + post-PR operator-invoked actual rollback).' },
      { key: 'J2S5-AUTO',   text: 'Add automatic rollback — if post-deploy Phase B fails within 1 hour of PR merge, engine auto-rolls-back without operator intervention.' },
      { key: 'J2S5-RETAIN', text: 'Strengthen rollback retention — snapshot persists for 30 days post-merge (explicit retention specified).' },
      { key: 'J2S5-BOTH',   text: 'Both — automatic + 30-day retention.' },
    ],
    draftedKey: 'J2S5-RATIFY',
  },
  // ============= S6 — NON-OVERRIDABLE (no reject path) =============
  {
    id: 'J2-S6', topic: 'J2-S6 — Pre-construction operator approval (NON-OVERRIDABLE per CEO Locked Rule 13 / Path H). S6 requires per-construction operator approval before fix-generator runs; admin-only for schema_migration; ≤1h freshness. Panel may strengthen but cannot eliminate. Right approval model?',
    options: [
      { key: 'J2S6-RATIFY',    text: 'Ratify S6 as drafted (per-construction approval; admin-required for schema_migration; 1h freshness).' },
      { key: 'J2S6-ADMINALL',  text: 'Tighten — admin-required for ALL construction classes (not just schema_migration).' },
      { key: 'J2S6-FRESH15',   text: 'Tighten freshness — 15-minute approval freshness (currently 1h).' },
      { key: 'J2S6-BOTH',      text: 'Both — admin-required all classes + 15-minute freshness.' },
    ],
    draftedKey: 'J2S6-RATIFY',
  },
  // ============= S7 — PANEL-RATIFIABLE; CA-14-D dependency RESOLVED =============
  {
    id: 'J2-S7', topic: 'J2-S7 — Branch-of-record interaction (PANEL-RATIFIABLE). S7 requires construction commits land on per-product `self_renewal_branch` (per CA-14-D Invariant 1, which CLEARED Panel quorum 8/10 in commit cc14a8f); never `main` direct. The previously-open S7 dependency is now resolved. Right discipline?',
    options: [
      { key: 'J2S7-RATIFY',     text: 'Ratify S7 as drafted (per-product branch; never main; CAS-protected).' },
      { key: 'J2S7-SUBBRANCH',  text: 'Strengthen — every multi-construction sequence (CA-16-B redesign session) writes to a per-session sub-branch within the per-product branch, then squash-merges to the per-product branch after operator approval.' },
      { key: 'J2S7-REJECT',     text: 'Reject S7 — construction should write to a separate construction-only branch (e.g. `flowai-construction-<runId>`), not the per-product self_renewal_branch.' },
      { key: 'J2S7-SUBPATHS',   text: 'Adjust — per-product branch is fine but require per-construction-class sub-paths (e.g. `flowai/construction/<class>/<runId>`).' },
    ],
    draftedKey: 'J2S7-RATIFY',
  },
  // ============= S8 — PANEL-RATIFIABLE =============
  {
    id: 'J2-S8', topic: 'J2-S8 — Post-construction Phase B mandatory (PANEL-RATIFIABLE). S8 requires Phase B run on construction artifacts before PR opens. Per-class coverage drafted. Right approach?',
    options: [
      { key: 'J2S8-RATIFY',    text: 'Ratify S8 as drafted (per-class Phase B coverage; PR blocks on failure).' },
      { key: 'J2S8-LIVEPREV',  text: 'Strengthen — also require Phase B AGAIN on the live preview URL post-PR-merge; covers the "construction passes Phase B in CI but breaks on prd deploy" failure mode.' },
      { key: 'J2S8-DUALLOAD',  text: 'Strengthen — for endpoint_generation, require Phase B against TWO load profiles (light + heavy), not just one; surfaces concurrency bugs.' },
      { key: 'J2S8-BOTH',      text: 'Both — live-preview Phase B AND dual-load testing.' },
    ],
    draftedKey: 'J2S8-RATIFY',
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

async function buildSpecExcerpt() {
  const raw = await readFile(SPEC_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);
  function findSec(re) {
    const s = lines.findIndex((l) => re.test(l));
    if (s === -1) return null;
    let e = lines.findIndex((l, i) => i > s && /^## §\d/.test(l));
    if (e === -1) e = lines.length;
    return { s, e };
  }
  const titleLine = lines[0];
  const s13 = findSec(/^### §1\.3\b/);
  const s2 = findSec(/^## §2\b/);
  const s3 = findSec(/^## §3\b/);
  const s4 = findSec(/^## §4\b/);
  const parts = [titleLine, ''];
  if (s13) parts.push(...lines.slice(s13.s, s13.e));
  if (s2) parts.push(...lines.slice(s2.s, s2.e));
  if (s3) parts.push(...lines.slice(s3.s, s3.e));
  if (s4) parts.push(...lines.slice(s4.s, s4.e));
  return stripAnchor(parts.join('\n'));
}

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
  return ['# FlowAI SSOT COMPACT EXCERPT (J2 build/wire re-Panel context)',
          'Sections: §7 (Output Contract / §7.5 ProductSSOT), §10 (Self-Governance), §11 (Six-Step Clearance), §25 (Locked Rules).',
          '', '---', '',
          slice('## 7. ', '## 8. ', 3500), '',
          slice('## 10. ', '## 11. ', 2500), '',
          slice('## 11. ', '## 12. ', 2500), '',
          slice('## 25. ', '## 26. ', 2500)].join('\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[j2-buildwire-repanel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const specExcerpt = await buildSpecExcerpt();
  const canonical = await buildCompactCanonical();
  process.stdout.write(`[j2-buildwire-repanel] spec excerpt: ${specExcerpt.length} chars · canonical: ${canonical.length} chars\n`);

  // Cap spec excerpt to stay ≤35K total bundle (question overhead ~6K)
  const SPEC_CAP = 23000;
  const finalSpec = specExcerpt.length > SPEC_CAP
    ? specExcerpt.slice(0, SPEC_CAP) + '\n\n_[…spec excerpt truncated for bundle-cap]_'
    : specExcerpt;
  process.stdout.write(`[j2-buildwire-repanel] final spec: ${finalSpec.length} chars\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'J2 build/wire re-Panel — 8 S-invariants (S1–S8). Path H locks S2/S4/S5/S6 NON-OVERRIDABLE (strengthen-only). CA-14-D-Q1 resolved S7\'s prior dependency at 8/10 quorum (cc14a8f).',
    draftText: finalSpec,
    questions: QUESTIONS,
    seed: 'j2-buildwire-repanel-2026-05-19',
    panel: PANEL,
    canonical,
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
      tallyByOption: c,
      hasRejectOption: q.options.some((o) => /REJECT/i.test(o.key)),
      nonOverridable: !q.options.some((o) => /REJECT/i.test(o.key)),
    };
  });

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const t = result.tally;
  const cleared = summary.filter((s) => s.cleared);
  const md = [`# Panel — J2 Build/Wire Re-Panel · 8 S-invariants (2026-05-19)`, ``,
    `**Spec:** docs/specs/BUILD_WIRE_ENGINE_SPEC_DRAFT.md (commit 4e6260b)`,
    `**Path H lock (CEO Locked Rule 13):** S2 / S4 / S5 / S6 NON-OVERRIDABLE (strengthen-only).`,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (target ≤35K)`,
    `**Quorum:** ≥${QUORUM}/10 ENGAGED + drafted-(a) ≥${QUORUM}/engaged for plain ratification.`,
    `**Audit:** ${JSON.stringify(audit)}`,
    ``, `## SUMMARY`,
    `- Engaged: ${t.engagedTotal}/10 · Tangential: ${t.tangential} · Silent: ${t.silent}`,
    `- Distinct objections: ${t.distinctObjections}`,
    `- Dissent floor: ${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible} = ${(result.dissentFloor.alignedPct*100).toFixed(1)}% · ${result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
    `- Cleared (quorum-RATIFY drafted): ${cleared.length} of ${QUESTIONS.length}`,
    ``, `## Per-invariant verdicts`,
    `| Q | Verdict | Top key | Top / Engaged | Cleared (≥${QUORUM}) | NON-OVERRIDABLE |`,
    `|---|---|---|---|---|---|`,
    ...summary.map((s) => `| **${s.qId}** | \`${s.verdict}\` | \`${s.top || '—'}\` | ${s.topCount}/${s.engaged} | ${s.cleared ? '✅' : '—'} | ${s.nonOverridable ? '🔒' : '' } |`),
    ``, `## Detail per invariant`,
    ...QUESTIONS.map((q) => {
      const s = summary.find((x) => x.qId === q.id);
      const c = result.tally.perQuestion[q.id];
      const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 160)}" → **${c[o.key] || 0}**`);
      for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
      if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
      return `### ${q.id}\n\n${q.topic}\n\nTally (n=${s.engaged}):\n${tally.join('\n')}\n\n**Verdict:** ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged}) · cleared: ${s.cleared ? '✅' : '—'} · NON-OVERRIDABLE: ${s.nonOverridable ? '🔒' : 'panel-ratifiable'}\n`;
    }),
    ``, `## All distinct objections (${t.distinctObjections})`,
    (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
    ``, `## Per-reviewer`,
    result.perReviewer.map((r) => {
      const out = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') return out.concat(['_(degraded)_', '']).join('\n');
      if (r.adversarial?.valid) {
        out.push('**Adversarial pass:**', '');
        for (const [i, o] of r.adversarial.objections.entries()) out.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
        out.push('');
      }
      if (r.rejection_steelman) out.push('**Steelman:**', '', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
      out.push('**Votes:**', '');
      for (const q of QUESTIONS) {
        const vt = r.votes?.[q.id] || {};
        const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
        out.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
        if (vt.rationale) out.push(`  > ${vt.rationale}`);
      }
      return out.join('\n');
    }).join('\n\n')];
  await writeFile(OUTPUT_PATH, md.join('\n'), 'utf8');
  await writeFile(SIDECAR_PATH, JSON.stringify({ schema: 'j2-buildwire-repanel.sidecar.v1', startedAt, finishedAt, audit, bundle_size: result.bundle_chars, w6_metadata: result.w6_metadata, tally: result.tally, per_question_verdicts: result.perVerdicts, dissent_floor: result.dissentFloor, summary, perReviewer: result.perReviewer, questions: QUESTIONS, quorum_floor: QUORUM, cleared_count: cleared.length }, null, 2), 'utf8');
  process.stdout.write(`[j2-buildwire-repanel] DONE · engaged=${t.engagedTotal}/10 · bundle=${result.bundle_chars} · cleared=${cleared.length}/${QUESTIONS.length}\n`);
  for (const s of summary) process.stdout.write(`  ${s.qId}: ${s.verdict} (top=${s.top} ${s.topCount}/${s.engaged}) cleared=${s.cleared} non-overridable=${s.nonOverridable}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[j2-buildwire-repanel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
