// scripts/panel/run-auth-spec-ratification.mjs
//
// W6 ADVERSARIAL Panel ratification — Phase 2 Auth-Traversal Security Spec
// docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md (commit d8d1239).
// HARD GATE 2 of the master phased build (commit 30e5edb).
// Uses the W5b-locked adversarial format (b1cd827 / ad2ab28 / 3f9dede).
//
// 7 questions taken verbatim from §12 of the spec.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runAdversarialPanelConsultation,
  PANEL,
} from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SPEC_PATH = path.join(repoRoot, 'docs', 'specs', 'AUTH_TRAVERSAL_SECURITY_SPEC.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'auth-spec-ratification-2026-05-16.sidecar.json');

// Questions from §12 of the spec, verbatim option text. The
// "W5a recommendation" labels in the spec text are intentionally NOT
// passed to the Panel — the locked anchor guard rejects them and the
// adversarial protocol bans drafted-direction signalling. The
// draftedKey is recorded for dissent-floor evaluation ONLY and is not
// presented to reviewers.
const QUESTIONS = [
  {
    id: 'G-Q1',
    topic: 'Cross-origin handling (§4.3 + Invariant 4)',
    options: [
      { key: 'GQ1-REFUSE', text: 'Refuse cross-origin entirely; consistent with same-origin policy as a hard boundary; simplest implementation; loses information about external linking.' },
      { key: 'GQ1-FRESH',  text: 'Fresh anonymous context for cross-origin requests; richer signal; harder to verify correctness; additional implementation complexity.' },
      { key: 'GQ1-MIXED',  text: 'Mixed: refuse by default, allow operator opt-in; auditable via per-run flag; per-product whitelist.' },
      { key: 'GQ1-OTHER',  text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ1-REFUSE',
  },
  {
    id: 'G-Q2',
    topic: 'MFA handling — Invariant 3 / §10 declares MFA out of scope',
    options: [
      { key: 'GQ2-SILENT',     text: 'Fail silently — single-attempt login failure causes the run to continue unauthenticated; matches single-attempt rule.' },
      { key: 'GQ2-LOUD',       text: 'Fail loudly — return ok:false on the entire run with authFailureReason:"mfa_required"; operator must rerun without MFA on the target product.' },
      { key: 'GQ2-CONFIG',     text: 'Configurable per run — operator picks the failure semantic at launch.' },
      { key: 'GQ2-OTHER',      text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ2-SILENT',
  },
  {
    id: 'G-Q3',
    topic: 'Screenshot scrub — §6.2 documents that PNG screenshots are NOT scrubbed (DOM dumps are)',
    options: [
      { key: 'GQ3-ACCEPT',     text: 'Accept as proposed — rely on operator review; defer OCR-scrub to a future phase.' },
      { key: 'GQ3-NO-PNG',     text: 'Reject screenshots from the artifact set entirely until OCR-scrub is implemented; Phase 3 ships without screenshots.' },
      { key: 'GQ3-WATERMARK',  text: 'Watermark every PNG with an "AUTHENTICATED CRAWL — DO NOT SHARE" overlay before persistence.' },
      { key: 'GQ3-OTHER',      text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ3-ACCEPT',
  },
  {
    id: 'G-Q4',
    topic: 'storageState filesystem encryption (§2 T5 + Invariant 7)',
    options: [
      { key: 'GQ4-EPHEM',  text: 'Accept Vercel ephemerality as sufficient — storageState.json on shared host filesystem for ≤ 20-min run window; auto-delete on run end is verified.' },
      { key: 'GQ4-ENCRYPT',text: 'Require encryption-at-rest — Phase 3 dispatch adds Node-side encrypt-before-write + decrypt-on-Playwright-load (~50 LOC + key management).' },
      { key: 'GQ4-MEMORY', text: 'Move storageState into memory-only — Playwright supports in-memory storageState as an object; eliminates §8.3 cleanup-verification path entirely.' },
      { key: 'GQ4-OTHER',  text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ4-EPHEM',
  },
  {
    id: 'G-Q5',
    topic: 'Same-eTLD+1 subdomains — §7.3 default is strict same-origin',
    options: [
      { key: 'GQ5-STRICT', text: 'Strict same-origin by default; admin-role flag to opt in to same-eTLD-1 traversal; safest stance.' },
      { key: 'GQ5-ETLD1',  text: 'Same-eTLD-1 by default; admin-role flag to tighten to strict same-origin; richer crawl by default, weaker isolation.' },
      { key: 'GQ5-WHITE',  text: 'Per-product whitelist of allowed subdomain wildcards specified at product registration.' },
      { key: 'GQ5-OTHER',  text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ5-STRICT',
  },
  {
    id: 'G-Q6',
    topic: 'Destructive-action denylist completeness — Invariant 5 (conservative heuristic; i18n + custom CSS gaps)',
    options: [
      { key: 'GQ6-ACCEPT',  text: 'Accept current denylist; document false-negative risk; rely on Invariant 4 (same-origin) + Invariant 8 (one-shot credentials) to bound blast radius.' },
      { key: 'GQ6-I18N',    text: 'Extend denylist with i18n: localised "delete / cancel / sign out" in the 5 most common languages (en, es, fr, de, ja).' },
      { key: 'GQ6-ALLOW',   text: 'Pure allowlist — Conductor clicks ONLY elements explicitly tagged data-crawl-safe="true"; zero false negatives; near-total loss of click-everything coverage.' },
      { key: 'GQ6-OTHER',   text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ6-ACCEPT',
  },
  {
    id: 'G-Q7',
    topic: 'Audit-log retention for credentialed runs — §5 + CA-10-E retention (365 days hot + 7 years cold)',
    options: [
      { key: 'GQ7-STD',    text: 'Standard retention (365 + 7) — same as other GovernanceAuditLog records.' },
      { key: 'GQ7-SHORT',  text: 'Shorter retention for credentialed-run records (30 days hot, no cold) — minimises window where an old record could surface.' },
      { key: 'GQ7-SEG',    text: 'Longer / segregated retention with restricted access (admin-only, separate Supabase table with stricter RLS).' },
      { key: 'GQ7-OTHER',  text: 'Different option — describe in rationale.' },
    ],
    draftedKey: 'GQ7-STD',
  },
];

// ── Rendering helpers (same shape as the scope-ruling wrapper) ───────────

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | Top option key | Top count | Verdict |`);
  rows.push(`|---|---|---|---:|---|`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 55)} | \`${v.topKey || '—'}\` | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderPerQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const c = t.perQuestion[q.id];
    const tallyLines = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 110)}"  →  **${c[o.key] || 0}**`);
    if (c.unmatched) tallyLines.push(`  - _(unmatched)_ →  ${c.unmatched}`);
    return [
      `### ${q.id} — ${q.topic}`,
      ``,
      `Tally (ENGAGED-only, ${t.engagedTotal} reviewers):`,
      ...tallyLines,
      ``,
      `**Verdict:** \`${v.verdict}\` — ${v.detail}.`,
      ``,
    ].join('\n');
  }).join('\n');
}

function renderObjections(allObjections) {
  if (!allObjections || allObjections.length === 0) return '_(no objections submitted)_';
  return allObjections.map((o, i) =>
    `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`
  ).join('\n');
}

function renderPerReviewer(perReviewer) {
  return perReviewer.map((r) => {
    const head = `## Slot ${r.slot} — ${r.modelTag} — state: \`${r.state}\``;
    const lines = [head, ''];
    if (r.state === 'SILENT') {
      lines.push(`_(degraded / parse-failure)_`);
      lines.push('');
      return lines.join('\n');
    }
    if (r.invalid_reason) {
      lines.push(`**Invalid reason:** ${r.invalid_reason}`);
      lines.push('');
    }
    if (r.adversarial?.valid) {
      lines.push(`### Adversarial pass`);
      lines.push('');
      for (const [i, o] of r.adversarial.objections.entries()) {
        lines.push(`**Objection ${i + 1} — ${o.title}**`);
        lines.push('');
        lines.push(`> ${(o.detail || '').replace(/\n/g, '\n> ')}`);
        lines.push('');
      }
      lines.push(`**Worse-than-status-quo scenario:** ${r.adversarial.worse_than_status_quo}`);
      lines.push('');
      lines.push(`**Precedent:** ${r.adversarial.precedent}`);
      lines.push('');
    }
    if (r.rejection_steelman) {
      lines.push(`### Rejection steelman`);
      lines.push('');
      lines.push(`> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    if (r.state === 'ENGAGED' || r.state === 'TANGENTIAL') {
      lines.push(`### Votes`);
      lines.push('');
      for (const q of QUESTIONS) {
        const v = r.votes[q.id] || {};
        const optText = v.key ? (q.options.find((o) => o.key === v.key)?.text.slice(0, 90) || v.key) : (v.pick_text || '—');
        lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` — ${optText}`);
        if (v.rationale) lines.push(`  > ${v.rationale}`);
      }
      lines.push('');
    }
    if (r.overallNotes) {
      lines.push(`Overall: ${r.overallNotes}`);
      lines.push('');
    }
    return lines.join('\n');
  }).join('\n---\n\n');
}

function renderRawResponses(reviewers) {
  return reviewers.map((r, idx) => {
    const slot = idx + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP FIRED]' : '';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    const out = [];
    out.push(`### Slot ${slot}${tag} — ${r.provider}:${modelStr}`);
    out.push('');
    out.push(`- Provider: \`${r.provider}\``);
    out.push(`- Latency: ${r.latency_ms} ms`);
    out.push(`- HTTP status: ${r.degraded ? 'DEGRADED' : 'OK'}`);
    if (r.slot_backup_applied) out.push(`- Primary that failed: \`${r.primary_slot_provider}:${r.primary_slot_model}\` (error: ${r.primary_slot_error ?? 'unknown'})`);
    if (r.error) out.push(`- Error: ${r.error}`);
    out.push('');
    out.push('```');
    out.push((r.raw_output ?? '(no output)').slice(0, 8000));
    out.push('```');
    out.push('');
    return out.join('\n');
  }).join('\n---\n\n');
}

// ── Ratification verdict logic ──────────────────────────────────────────
//
// "Spec IS ratified — Phase 3 may proceed" requires:
//   1. Dissent floor PASSES (otherwise INVALID).
//   2. Every question reaches QUORUM_PLURALITY or higher on its drafted
//      option, OR a clear-majority alternative wins (in which case the
//      spec is ratified with that condition substituted for the drafted
//      position).
//
// Sub-quorum-on-drafted with no alternative winning quorum = condition
// (W5a must address before Phase 3 can begin).
function computeRatificationVerdict(perVerdicts, dissentFloor) {
  if (dissentFloor.triggered) {
    return {
      status: 'INVALID',
      headline: 'Consultation INVALID — re-run required (insufficient adversarial signal).',
      conditions: [],
    };
  }
  const conditions = [];
  const alternativeWins = [];
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const wonDrafted = v.topKey === q.draftedKey;
    const isStrong = /^(UNANIMOUS|SUPERMAJORITY|QUORUM_PLURALITY)/.test(v.verdict);
    if (wonDrafted && isStrong) continue; // ratified for this question
    if (!wonDrafted && isStrong) {
      // A non-drafted option won quorum or better. Ratify with that as a
      // substitute condition.
      const opt = q.options.find((o) => o.key === v.topKey);
      alternativeWins.push({ qId: q.id, topic: q.topic, newPosition: opt?.text, verdict: v.verdict });
      continue;
    }
    // Sub-quorum on drafted with no alternative winning quorum.
    conditions.push({
      qId: q.id, topic: q.topic, verdict: v.verdict,
      draftedKey: q.draftedKey,
      draftedText: q.options.find((o) => o.key === q.draftedKey)?.text,
      detail: v.detail,
    });
  }
  if (conditions.length === 0 && alternativeWins.length === 0) {
    return {
      status: 'RATIFIED',
      headline: 'Spec IS ratified — Phase 3 may proceed (every question cleared quorum on the spec author\'s position).',
      conditions: [], alternativeWins: [],
    };
  }
  if (conditions.length === 0 && alternativeWins.length > 0) {
    return {
      status: 'RATIFIED_WITH_SUBSTITUTIONS',
      headline: `Spec IS ratified — Phase 3 may proceed, BUT ${alternativeWins.length} question(s) returned a clear-majority alternative; substitute these positions before writing Phase 3 code.`,
      conditions: [], alternativeWins,
    };
  }
  return {
    status: 'NOT_RATIFIED',
    headline: `Spec NOT ratified — ${conditions.length} question(s) returned no clear Panel majority. W5a must address each before Phase 3 may proceed.`,
    conditions, alternativeWins,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[auth-spec-ratification] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[auth-spec-ratification] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error('Panel composition not the 10-unique-provider roster — halting.');
  }

  if (!existsSync(SPEC_PATH)) throw new Error(`Spec not found at ${SPEC_PATH}`);
  const specText = await readFile(SPEC_PATH, 'utf8');

  // The full CANONICAL_REFERENCE.md is 104K chars; combined with the
  // 37K spec it would produce a 146K bundle that exceeds the W5b
  // 120K hard cap (b1cd827 — silent slot drop prevention). Pass a
  // compact canonical excerpt covering only the sections this spec
  // is anchored to: §6 (Crawl + Resolution Contract — line 110
  // verbatim), §13 (Auth + Role Model), §14 (GovernanceAuditLog),
  // §22 (Product-Agnostic Rule), §25 (Locked Rules). The spec's own
  // §9 quotes §6 line 110 verbatim so reviewers see the SSOT
  // alignment claim too.
  const canonicalRaw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const canonicalLines = canonicalRaw.split(/\r?\n/);
  function sliceSection(startMarker, endMarker) {
    const s = canonicalLines.findIndex((l) => l.startsWith(startMarker));
    if (s === -1) return '';
    const e = canonicalLines.findIndex((l, i) => i > s && l.startsWith(endMarker));
    return canonicalLines.slice(s, e === -1 ? undefined : e).join('\n');
  }
  const compactCanonical = [
    '# FlowAI SSOT — COMPACT EXCERPT (auth-spec-relevant sections only)',
    '',
    'Lineage: derived from docs/CANONICAL_REFERENCE.md Rev-2.1 (full 104K canonical).',
    'This excerpt covers ONLY the sections the auth-traversal security spec is anchored to.',
    'Full canonical is omitted from this bundle to satisfy the W5b 120K hard cap.',
    'Sections included: §6 (Crawl Contract), §13 (Auth+Role Model), §14 (GovernanceAuditLog),',
    '§22 (Product-Agnostic Rule), §25 (Locked Rules). The spec under review quotes §6 line 110',
    'verbatim in its §9 — reviewers see the SSOT alignment claim inside the spec.',
    '',
    '---',
    '',
    sliceSection('## 6. ', '## 7. '),
    '',
    sliceSection('## 13. ', '## 14. '),
    '',
    sliceSection('## 14. ', '## 15. '),
    '',
    sliceSection('## 22. ', '## 23. '),
    '',
    sliceSection('## 25. ', '## 26. '),
  ].join('\n');
  process.stdout.write(`[auth-spec-ratification] compact canonical: ${compactCanonical.length} chars (vs full ${canonicalRaw.length} chars)\n`);

  const result = await runAdversarialPanelConsultation({
    topic: 'Phase 2 auth-traversal security spec — HARD GATE 2 ratification',
    draftText: specText,
    questions: QUESTIONS,
    seed: 'auth-spec-ratification-2026-05-16',
    panel: PANEL,
    canonical: compactCanonical,
  });
  const finishedAt = new Date().toISOString();

  const strongestRejection = result.perReviewer
    .filter((r) => typeof r.rejection_steelman === 'string')
    .map((r) => ({ slot: r.slot, model: r.modelTag, text: r.rejection_steelman }))
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  const ratification = computeRatificationVerdict(result.perVerdicts, result.dissentFloor);

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const t = result.tally;
  const perVerdicts = result.perVerdicts;
  const dissent = result.dissentFloor;

  const md = [
    `# Panel Consultation — Phase 2 Auth-Traversal Security Spec — ADVERSARIAL RATIFICATION (2026-05-16)`,
    ``,
    `**Mode:** ADVERSARIAL — locked W5b format (commits \`b1cd827\` / \`ad2ab28\` / \`3f9dede\` precondition MET). HARD GATE 2 of the master phased build (commit \`30e5edb\`).`,
    ``,
    `**Spec under ratification:** \`docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md\` (commit \`d8d1239\`, 531 lines).`,
    ``,
    `**Anti-rubber-stamp controls active:** anchor-phrase guard, mandatory adversarial pass (≥3 concrete objections + 1 worse-than-status-quo scenario + 1 precedent or honest "no precedent known"), mandatory rejection steelman, dissent floor (\`> 80 %\` drafted-direction alignment combined with \`< 5\` distinct objections triggers INVALID).`,
    ``,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Bundle size:** ${result.bundle_chars} chars (full CANONICAL_REFERENCE.md + spec body).`,
    `**Panel audit:** ${JSON.stringify(audit)}`,
    `**Seed:** \`${result.seed}\``,
    ``,
    `**W6 thresholds:** Quorum = 7/10 · Supermajority = 8/10 · Unanimous = all-ENGAGED on one option.`,
    ``,
    `---`,
    ``,
    `## 🚨 PLAIN RATIFICATION VERDICT`,
    ``,
    `**Status:** \`${ratification.status}\``,
    ``,
    `${ratification.headline}`,
    ``,
    ratification.conditions.length > 0 ? `**Conditions W5a MUST address before Phase 3 code may be written:**\n` + ratification.conditions.map((c, i) => `${i + 1}. **${c.qId}** — ${c.topic}\n   - Verdict: \`${c.verdict}\`. The spec-author's preferred position ("${c.draftedText?.slice(0, 120)}…") did not reach Panel quorum. ${c.detail}.\n   - W5a action: either (a) re-Panel this question with revised options after engineering analysis, OR (b) adopt one of the dissenting alternatives, OR (c) take the question to CEO arbitration.`).join('\n\n') : '',
    ``,
    ratification.alternativeWins?.length > 0 ? `**Alternative-winning positions to substitute before Phase 3:**\n` + ratification.alternativeWins.map((a, i) => `${i + 1}. **${a.qId}** — ${a.topic}\n   - Substitute: "${a.newPosition}"\n   - Verdict: \`${a.verdict}\``).join('\n\n') : '',
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION (Control 4)`,
    ``,
    `Drafted-direction alignment across all 7 questions:`,
    `  Aligned: **${dissent.alignedCount} of ${dissent.totalPossible}** ENGAGED votes = ${(dissent.alignedPct * 100).toFixed(1)} %`,
    `  Distinct substantive objections: **${t.distinctObjections}**`,
    `  Trigger: alignment > 80 % AND objections < 5`,
    ``,
    dissent.triggered
      ? `**🚨 RESULT: \`INSUFFICIENT_ADVERSARIAL_SIGNAL\` — consultation INVALID.** ${dissent.reason}.`
      : `**✅ RESULT: Dissent floor PASSED — adversarial signal valid.** ${dissent.reason}.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
    ``,
    `| Slot | Provider | Model | Region/Role | Backup? | Status | Adv state | Invalid reason |`,
    `|------|----------|-------|-------------|---------|--------|-----------|----------------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const cfg = SLOT_CONFIG[idx];
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? `YES → ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || r.model}` : '—';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      const region = cfg ? `${cfg.region} · ${cfg.role}` : '';
      const pr = result.perReviewer[idx];
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${region} | ${backup} | ${status} | \`${pr.state}\` | ${pr.invalid_reason ?? '—'} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (≥7 LIVE-OK): ${result.w6_metadata.quorum_met}.`,
    ``,
    `Adversarial classification: **ENGAGED**=${t.engagedTotal}, TANGENTIAL=${t.tangential}, INVALID (votes discarded)=${t.invalid}, SILENT=${t.silent}`,
    ``,
    `---`,
    ``,
    `## Per-question tally`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `### Per-question detail`,
    ``,
    renderPerQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## All distinct substantive objections (verbatim, deduplicated)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument against the spec (longest rejection steelman)`,
    ``,
    strongestRejection
      ? `**From Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}`
      : '_(no rejection steelman submitted)_',
    ``,
    `---`,
    ``,
    `## Per-reviewer adversarial pass + steelman + votes`,
    ``,
    renderPerReviewer(result.perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses (first 8K chars each)`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[auth-spec-ratification] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'auth-spec-ratification.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_size: result.bundle_chars,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: result.tally,
    per_question_verdicts: result.perVerdicts,
    dissent_floor: result.dissentFloor,
    consultation_valid: result.consultation_valid,
    ratification,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: result.shuffledOptions,
    seed: result.seed,
    perReviewer: result.perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[auth-spec-ratification] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ AUTH SPEC RATIFICATION — ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED (controls met):  ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`INVALID:                 ${t.invalid}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Drafted alignment:       ${(dissent.alignedPct * 100).toFixed(1)} %\n`);
  process.stdout.write(`Dissent-floor result:    ${dissent.triggered ? 'INVALID' : 'PASS'}\n`);
  process.stdout.write(`Ratification status:     ${ratification.status}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    process.stdout.write(`  ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${t.engagedTotal})\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[auth-spec-ratification] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
