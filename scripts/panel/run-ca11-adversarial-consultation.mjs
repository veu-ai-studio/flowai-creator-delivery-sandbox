// scripts/panel/run-ca11-adversarial-consultation.mjs
//
// W6 ADVERSARIAL Panel consultation on CA-11 — anti-rubber-stamp controls
// per W05 dispatch 2026-05-16:
//   Control 1 — NO ANCHORING: option labels stripped of "(as drafted)" /
//               "(recommended)" / author preferences. Options presented in
//               neutral, deterministically-shuffled order (seeded by date),
//               with no a/b/c/d letter labels — reviewers pick option TEXT
//               verbatim so they cannot anchor on letter ordering either.
//   Control 2 — MANDATORY ADVERSARIAL PASS: every reviewer must produce
//               ≥3 concrete objections + 1 worse-than-status-quo scenario
//               + 1 real-world precedent (or "no precedent known") BEFORE
//               any vote is counted. Missing adversarial pass = votes
//               discarded.
//   Control 3 — STEELMAN THE REJECTION: every reviewer must include a
//               rejection_steelman field arguing the REJECT/DEFER case in
//               good faith. Missing = votes discarded.
//   Control 4 — DISSENT FLOOR: post-tally, if > 80 % of ENGAGED votes
//               aligned with the spec-author position across Q1, Q2, Q3,
//               Q4, Q6 (5 drafted-direction questions) AND total distinct
//               objections < 5, the consultation is FLAGGED INVALID and
//               reported as "INSUFFICIENT_ADVERSARIAL_SIGNAL — re-run
//               required" rather than a clean verdict.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runPanelConsultationWithBackups,
  loadCanonicalReference,
  buildArtifactWithCanonical,
  PANEL,
} from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DRAFT_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_AMENDMENT_CA11_DRAFT.md');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ca11-adversarial-2026-05-16.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'ca11-adversarial-2026-05-16.sidecar.json');

// ── Question definitions ─────────────────────────────────────────────────
//
// `draftedKey` identifies the option that matches the W3 spec author's
// preferred direction — used for the dissent-floor metric. Q5 has no
// drafted answer (open-ended risk identification), so its draftedKey is null.
//
// Options are presented to the Panel in a deterministically-shuffled order
// (seeded by date) WITHOUT a/b/c/d labels. The wrapper matches the
// reviewer's `pick_text` back to canonical keys.

const QUESTIONS = [
  {
    id: 'Q1', topic: 'Minimum ToolMenu size per agent',
    options: [
      { key: 'Q1-3',    text: '3 tools' },
      { key: 'Q1-5',    text: '5 tools' },
      { key: 'Q1-VAR',  text: 'Variable by agent mode' },
      { key: 'Q1-NONE', text: 'No minimum (let it emerge)' },
    ],
    draftedKey: 'Q1-3',
  },
  {
    id: 'Q2', topic: 'When is the tool chosen',
    options: [
      { key: 'Q2-UPFRONT',  text: 'Once per step, ranked upfront' },
      { key: 'Q2-ADAPTIVE', text: 'Adaptively at each invocation' },
      { key: 'Q2-HYBRID',   text: 'Hybrid' },
      { key: 'Q2-STATIC',   text: 'Tool choice should not be dynamic at all' },
    ],
    draftedKey: 'Q2-UPFRONT',
  },
  {
    id: 'Q3', topic: 'Does per-agent self-orchestration add more risk than value vs central OrchestratorHub routing',
    options: [
      { key: 'Q3-POS',     text: 'Net positive, ship it' },
      { key: 'Q3-NEG',     text: 'Net negative, centralized is safer' },
      { key: 'Q3-GUARDS',  text: 'Depends on guardrails not yet specified' },
      { key: 'Q3-UNKNOWN', text: 'Cannot determine from spec' },
    ],
    draftedKey: 'Q3-POS',
  },
  {
    id: 'Q4', topic: 'Tool list maintenance model',
    options: [
      { key: 'Q4-AUTO',   text: 'Auto-updated quarterly by agents' },
      { key: 'Q4-FROZEN', text: 'Frozen, manual changes only' },
      { key: 'Q4-PANEL',  text: 'Panel-reviewed every change' },
      { key: 'Q4-NOTCAN', text: 'Tool list should not be canonical at all' },
    ],
    draftedKey: 'Q4-AUTO',
  },
  {
    id: 'Q5', topic: 'Biggest unmitigated risk in CA-11',
    options: [
      { key: 'Q5-COST',    text: 'Cost blowout from fallback chains' },
      { key: 'Q5-NONDET',  text: 'Non-determinism / unreproducible runs' },
      { key: 'Q5-SPARSE',  text: 'Per-agent scoring data sparsity' },
      { key: 'Q5-COMPLEX', text: 'Complexity exceeding maintenance capacity' },
    ],
    draftedKey: null, // open-ended risk identification, no drafted answer
  },
  {
    id: 'Q6', topic: 'Disposition',
    options: [
      { key: 'Q6-PROMOTE', text: 'Promote all 5 sub-amendments' },
      { key: 'Q6-REDUCED', text: 'Promote a reduced subset' },
      { key: 'Q6-DEFER',   text: 'Defer pending a prototype/spike' },
      { key: 'Q6-REJECT',  text: 'Reject — concept is unsound as specified' },
    ],
    draftedKey: 'Q6-PROMOTE',
  },
];

// ── Deterministic shuffle (xorshift32 seeded by date) ────────────────────

function makeRng(seedStr) {
  let state = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    state ^= seedStr.charCodeAt(i);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return function rng() {
    state ^= state << 13;  state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5;   state >>>= 0;
    return state / 0xFFFFFFFF;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SEED = 'ca11-adversarial-2026-05-16';
const shuffledOptions = {};
{
  const rng = makeRng(SEED);
  for (const q of QUESTIONS) shuffledOptions[q.id] = shuffle(q.options, rng);
}

// ── Prompt body ──────────────────────────────────────────────────────────

function buildQuestionBody(draftText) {
  const lines = [];
  lines.push('═══════════════ CA-11 ADVERSARIAL PANEL REVIEW (2026-05-16) ═══════════════');
  lines.push('');
  lines.push('This is an ADVERSARIAL consultation — NOT a ratification exercise.');
  lines.push('You are explicitly being asked to find problems with the CA-11 draft.');
  lines.push('A response that rubber-stamps the spec without independent scrutiny');
  lines.push('will be DISCARDED.');
  lines.push('');
  lines.push('Mandatory protocol (any vote that does NOT satisfy ALL of these is INVALID');
  lines.push('and will not be tallied):');
  lines.push('');
  lines.push('  1. ADVERSARIAL PASS — produce, FOR THE WHOLE CA-11 SPEC, three things');
  lines.push('     BEFORE answering any of the multi-choice questions:');
  lines.push('     • At least 3 CONCRETE, SPECIFIC objections or failure modes');
  lines.push('       (not generic caveats like "complexity"; each objection must name');
  lines.push('       a section / mechanism / metric / risk surface from CA-11 itself).');
  lines.push('     • At least 1 scenario where CA-11 makes FlowAI WORSE than the');
  lines.push('       status quo (current centralised OrchestratorHub routing).');
  lines.push('     • 1 named REAL-WORLD PRECEDENT where a similar "every-component-');
  lines.push('       self-orchestrates" design caused problems — OR an explicit');
  lines.push('       declaration "no precedent known" (your honest answer; do not');
  lines.push('       fabricate).');
  lines.push('');
  lines.push('  2. REJECTION STEELMAN — produce a GOOD-FAITH argument for REJECTING');
  lines.push('     or DEFERRING CA-11 entirely. Even if your final disposition is to');
  lines.push('     promote, you must articulate the strongest available counter-case.');
  lines.push('');
  lines.push('  3. ONLY AFTER (1) and (2), answer the 6 multi-choice questions below.');
  lines.push('');
  lines.push('Option ordering note: options are presented in NEUTRAL order. No option');
  lines.push('is marked "as drafted" / "recommended" / author-preferred. Vote on the');
  lines.push('substantive merits, not on perceived author preference. You MUST quote');
  lines.push('the option TEXT verbatim in your answer (no letter labels).');
  lines.push('');
  lines.push('═══════════════ W3 CA-11 DRAFT (verbatim, under adversarial scrutiny) ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END W3 DRAFT ═══════════════');
  lines.push('');
  lines.push('═══════════════ SIX MULTIPLE-CHOICE QUESTIONS (neutral, shuffled) ═══════════════');
  lines.push('');
  for (const q of QUESTIONS) {
    lines.push(`### ${q.id} — ${q.topic}`);
    lines.push('');
    lines.push('Options (pick exactly one — quote the option TEXT verbatim in your answer):');
    for (const o of shuffledOptions[q.id]) {
      lines.push(`  • ${o.text}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const CRITERIA = `
You are a Panel reviewer running an ADVERSARIAL review of CA-11 (verbatim
attached above). The full FlowAI CANONICAL_REFERENCE.md (Rev-2.1) is also
attached at the top of the bundle.

Mandatory protocol (read it again — non-compliant responses are DISCARDED):

  1. ADVERSARIAL PASS first: ≥3 concrete objections + 1 worse-than-status-
     quo scenario + 1 real-world precedent (or honest "no precedent known").
  2. REJECTION STEELMAN: a good-faith argument for rejecting / deferring CA-11.
  3. Then answer the 6 MC questions by quoting the option TEXT verbatim.

A vote unsupported by an adversarial pass is INVALID. You will not be
"rewarded" for picking the W3-preferred option — you will be SCORED on
the depth + specificity of your objections.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "adversarial_pass": {
    "objections": [
      { "title": "<≤8 words>", "detail": "<2-4 sentences naming a specific CA-11 section / mechanism / metric>" },
      { "title": "<≤8 words>", "detail": "<2-4 sentences>" },
      { "title": "<≤8 words>", "detail": "<2-4 sentences>" }
    ],
    "worse_than_status_quo": "<1-3 sentences describing a scenario where CA-11 makes FlowAI worse than the current central OrchestratorHub routing>",
    "precedent": "<1-2 sentences naming a real-world system / project / failure where similar 'every-component-self-orchestrates' design caused trouble — OR the literal string 'no precedent known' if you don't have one>"
  },
  "rejection_steelman": "<2-4 sentences: the strongest available argument FOR rejecting or deferring CA-11, made in good faith even if you ultimately vote to promote>",
  "answers": {
    "Q1": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" },
    "Q2": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" },
    "Q3": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" },
    "Q4": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" },
    "Q5": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" },
    "Q6": { "pick_text": "<verbatim option text>", "rationale": "<1-2 sentences>" }
  },
  "overall_notes": "<optional 1-2 sentences>"
}

Notes on the objections list:
  - You may include MORE than 3 objections; minimum is 3.
  - Each objection must be SPECIFIC — name a §-letter from CA-11
    (CA-11-A through CA-11-E), a sub-section, a metric, a topic name,
    or a mechanism. "It's too complex" alone is NOT specific; "CA-11-D's
    quarterly auto-update via Agent #26+#11+#15 has no rollback path
    if the auto-update inserts a malicious adapter" IS specific.
  - Surface objections that are NEW and SPECIFIC to CA-11. Generic
    objections that apply to any change ("change has risk") will be
    discarded in the distinct-objections count.

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character
MUST be '{', last MUST be '}'. No prose before, no prose after, no
\`\`\`json fences.
`.trim();

// ── Parsing helpers ──────────────────────────────────────────────────────

function safeParseReviewerResponse(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') return { ok: false, reason: 'empty_output', parsed: null };
  let s = rawOutput.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return { ok: true, reason: 'direct', parsed: JSON.parse(s) }; }
  catch { /* fall through */ }
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b > a) {
    try { return { ok: true, reason: 'greedy_slice', parsed: JSON.parse(s.slice(a, b + 1)) }; }
    catch { /* fall through */ }
  }
  return { ok: false, reason: 'unparseable', parsed: null };
}

// Match reviewer's pick_text back to canonical option key per question.
// Strategy: exact match → case-insensitive match → fuzzy substring match
// against the option text.
function matchPick(qId, pickText) {
  if (typeof pickText !== 'string') return null;
  const t = pickText.trim();
  const opts = QUESTIONS.find((q) => q.id === qId).options;
  for (const o of opts) if (o.text === t) return o.key;
  const lower = t.toLowerCase();
  for (const o of opts) if (o.text.toLowerCase() === lower) return o.key;
  // Substring match — pick the option whose text is most contained in the
  // reviewer's response.
  let bestKey = null, bestLen = 0;
  for (const o of opts) {
    const ol = o.text.toLowerCase();
    if (lower.includes(ol) || ol.includes(lower)) {
      const overlap = Math.min(ol.length, lower.length);
      if (overlap > bestLen) { bestLen = overlap; bestKey = o.key; }
    }
  }
  return bestKey;
}

function validAdversarialPass(parsed) {
  const a = parsed?.adversarial_pass;
  if (!a || typeof a !== 'object') return { valid: false, reason: 'adversarial_pass missing' };
  const objs = Array.isArray(a.objections) ? a.objections : [];
  const validObjs = objs.filter((o) => o && typeof o === 'object' && typeof o.title === 'string' && typeof o.detail === 'string' && o.detail.trim().length >= 30);
  if (validObjs.length < 3) return { valid: false, reason: `only ${validObjs.length} valid objections (need ≥3)` };
  const worse = typeof a.worse_than_status_quo === 'string' ? a.worse_than_status_quo.trim() : '';
  if (worse.length < 20) return { valid: false, reason: 'worse_than_status_quo missing or too short' };
  const prec = typeof a.precedent === 'string' ? a.precedent.trim() : '';
  if (prec.length < 5) return { valid: false, reason: 'precedent missing' };
  return { valid: true, objections: validObjs, worse_than_status_quo: worse, precedent: prec };
}

function classifyReviewer(parsed, idx, degraded, parseFailure, modelTag) {
  const slot = idx + 1;
  if (degraded) return { slot, state: 'SILENT', votes: {}, adversarial: null, rejection_steelman: null, degraded: true, parseFailure: false, modelTag };
  if (parseFailure) return { slot, state: 'SILENT', votes: {}, adversarial: null, rejection_steelman: null, degraded: false, parseFailure: true, modelTag };

  const advCheck = validAdversarialPass(parsed);
  const rejSteelman = typeof parsed?.rejection_steelman === 'string' ? parsed.rejection_steelman.trim() : '';
  const rejValid = rejSteelman.length >= 30;

  const votes = {};
  let validVoteCount = 0;
  for (const q of QUESTIONS) {
    const a = parsed?.answers?.[q.id];
    const key = matchPick(q.id, a?.pick_text);
    const rationale = typeof a?.rationale === 'string' ? a.rationale.trim() : null;
    if (key) validVoteCount += 1;
    votes[q.id] = { key, pick_text: typeof a?.pick_text === 'string' ? a.pick_text.trim() : null, rationale };
  }

  // Engagement classification (strict — controls 2 + 3 enforced):
  //   ENGAGED  — adversarial pass complete AND rejection steelman ≥ 30 chars
  //               AND all 6 votes parsed to a canonical key
  //   INVALID  — adversarial pass missing/insufficient OR steelman missing.
  //               Votes DISCARDED. State reported as 'INVALID' (treated as
  //               non-engaged for tallying).
  //   TANGENTIAL — passed controls but ≤5 valid votes
  let state = 'INVALID';
  let invalid_reason = null;
  if (!advCheck.valid) { invalid_reason = `adversarial pass: ${advCheck.reason}`; }
  else if (!rejValid) { invalid_reason = 'rejection_steelman missing or <30 chars'; }
  else if (validVoteCount === QUESTIONS.length) state = 'ENGAGED';
  else { state = 'TANGENTIAL'; invalid_reason = `${validVoteCount}/${QUESTIONS.length} votes parsed`; }

  return {
    slot, state,
    adversarial: advCheck.valid ? advCheck : { valid: false, reason: advCheck.reason },
    rejection_steelman: rejValid ? rejSteelman : null,
    votes,
    overallNotes: typeof parsed?.overall_notes === 'string' ? parsed.overall_notes.trim() : '',
    invalid_reason,
    degraded: false, parseFailure: false, modelTag,
  };
}

// ── Distinct-objection deduplication ────────────────────────────────────
// Normalise objection titles to first 60 chars of detail (lowercased,
// punctuation stripped). Two objections with the same normalised key are
// considered substantively duplicate.
function normaliseObjection(o) {
  const src = `${o.title || ''} ${o.detail || ''}`.toLowerCase();
  return src.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function tallyEngaged(perReviewer) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const invalid = perReviewer.filter((r) => r.state === 'INVALID').length;
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const perQuestion = {};
  for (const q of QUESTIONS) {
    const counts = {};
    for (const o of q.options) counts[o.key] = 0;
    counts.unmatched = 0;
    for (const r of engaged) {
      const k = r.votes[q.id]?.key;
      if (k && counts[k] !== undefined) counts[k] += 1;
      else counts.unmatched += 1;
    }
    perQuestion[q.id] = counts;
  }
  // Distinct objection dedupe across ENGAGED + TANGENTIAL reviewers (anyone
  // who submitted a valid adversarial pass counts toward the dissent floor).
  const allObjections = [];
  const objSeen = new Map();
  for (const r of perReviewer) {
    if (!r.adversarial?.valid) continue;
    for (const o of r.adversarial.objections) {
      const norm = normaliseObjection(o);
      if (!objSeen.has(norm)) {
        objSeen.set(norm, { norm, title: o.title, detail: o.detail, contributedBySlot: r.slot });
        allObjections.push({ slot: r.slot, title: o.title, detail: o.detail });
      }
    }
  }
  return { engagedTotal: engaged.length, invalid, tangential, silent, perQuestion, distinctObjections: objSeen.size, allObjections };
}

function computeVerdict(counts, engagedTotal, qOptions) {
  if (engagedTotal === 0) return { verdict: 'NO_QUORUM', detail: '0 ENGAGED', topKey: null, topCount: 0 };
  const sorted = qOptions.map((o) => [o.key, counts[o.key] || 0]).sort((a, b) => b[1] - a[1]);
  const [topKey, topCount] = sorted[0];
  if (topCount === engagedTotal) return { verdict: `UNANIMOUS_${topKey}`, detail: `${topCount} of ${engagedTotal} ENGAGED on ${topKey} (unanimous)`, topKey, topCount };
  if (topCount >= 8) return { verdict: `SUPERMAJORITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (≥ 8/10)`, topKey, topCount };
  if (topCount >= 7) return { verdict: `QUORUM_PLURALITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (≥ quorum 7/10)`, topKey, topCount };
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}`, topKey: tied[0], topCount: sorted[0][1] };
  }
  if (topCount === 0) return { verdict: 'NO_QUORUM', detail: '0 votes on any option', topKey: null, topCount: 0 };
  return { verdict: `PLURALITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (below 7/10 quorum)`, topKey, topCount };
}

// ── Dissent-floor evaluation (Control 4) ─────────────────────────────────
function evaluateDissentFloor(t) {
  // Use Q1, Q2, Q3, Q4, Q6 — five questions with a drafted direction.
  const draftedQs = ['Q1', 'Q2', 'Q3', 'Q4', 'Q6'];
  const totalPossible = draftedQs.length * t.engagedTotal;
  if (totalPossible === 0) return { triggered: false, reason: '0 ENGAGED — no votes to evaluate', alignedPct: 0, alignedCount: 0, totalPossible: 0 };
  let alignedCount = 0;
  for (const qId of draftedQs) {
    const q = QUESTIONS.find((qq) => qq.id === qId);
    alignedCount += (t.perQuestion[qId]?.[q.draftedKey] || 0);
  }
  const alignedPct = alignedCount / totalPossible;
  const triggered = alignedPct > 0.80 && t.distinctObjections < 5;
  return { triggered, reason: triggered ? `alignment ${(alignedPct*100).toFixed(1)} % > 80 % AND distinct objections ${t.distinctObjections} < 5` : `alignment ${(alignedPct*100).toFixed(1)} %, distinct objections ${t.distinctObjections}`, alignedPct, alignedCount, totalPossible };
}

// ── Rendering ────────────────────────────────────────────────────────────

function renderQuestionTable(t, perVerdicts) {
  const rows = [];
  rows.push(`| Q | Topic | Top option | Top count | Verdict |`);
  rows.push(`|---|---|---|---:|---|`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const topText = v.topKey ? (q.options.find((o) => o.key === v.topKey)?.text || v.topKey) : '—';
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 50)} | ${topText} | ${v.topCount} / ${t.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderPerQuestionDetail(t, perVerdicts) {
  return QUESTIONS.map((q) => {
    const v = perVerdicts[q.id];
    const c = t.perQuestion[q.id];
    const tallyLines = q.options.map((o) => `  - "${o.text}"  →  ${c[o.key] || 0}`);
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
  if (allObjections.length === 0) return '_(no objections submitted)_';
  return allObjections.map((o, i) =>
    `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${o.detail.replace(/\n/g, '\n> ')}\n`
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
        lines.push(`> ${o.detail.replace(/\n/g, '\n> ')}`);
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
        const optText = v.key ? (q.options.find((o) => o.key === v.key)?.text || v.key) : (v.pick_text || '—');
        lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` ("${optText}")`);
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
    out.push(r.raw_output ?? '(no output)');
    out.push('```');
    out.push('');
    return out.join('\n');
  }).join('\n---\n\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ca11-adversarial] started ${startedAt}\n`);

  const audit = auditDiversity();
  process.stdout.write(`[ca11-adversarial] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    throw new Error(`Panel composition not the 10-unique-provider roster — maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting.`);
  }

  if (!existsSync(DRAFT_PATH)) throw new Error(`CA-11 draft not found at ${DRAFT_PATH}`);
  const draftText = await readFile(DRAFT_PATH, 'utf8');
  const canonical = await loadCanonicalReference();
  const questionBody = buildQuestionBody(draftText);
  const artifact = buildArtifactWithCanonical(canonical, questionBody);
  process.stdout.write(`[ca11-adversarial] bundle: ${artifact.length} chars\n`);

  // Larger per-reviewer timeout — adversarial protocol asks for substantial
  // free-form output before votes.
  const result = await runPanelConsultationWithBackups({
    artifact, criteria: CRITERIA, panel: PANEL,
    perReviewerTimeoutMs: 180_000,
    backupRetryTimeoutMs: 210_000,
  });
  const finishedAt = new Date().toISOString();

  const perReviewer = result.reviewers.map((r, idx) => {
    const modelTag = `${r.provider}:${(r.model || '').split(':').slice(1).join(':') || (r.model || '')}`;
    if (r.degraded) return classifyReviewer(null, idx, true, false, modelTag);
    const parsed = safeParseReviewerResponse(r.raw_output);
    if (!parsed.ok) return classifyReviewer(null, idx, false, true, modelTag);
    return classifyReviewer(parsed.parsed, idx, false, false, modelTag);
  });

  const t = tallyEngaged(perReviewer);
  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const perVerdicts = {};
  for (const q of QUESTIONS) perVerdicts[q.id] = computeVerdict(t.perQuestion[q.id], t.engagedTotal, q.options);
  const dissent = evaluateDissentFloor(t);

  // Strongest argument against = strongest rejection_steelman (longest /
  // most specific); also surface the most-cited objection.
  const strongestRejection = perReviewer
    .filter((r) => typeof r.rejection_steelman === 'string')
    .map((r) => ({ slot: r.slot, model: r.modelTag, text: r.rejection_steelman }))
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# Panel Consultation — CA-11 ADVERSARIAL (de-anchored, dissent-floor enforced) — 2026-05-16`,
    ``,
    `**Mode:** ADVERSARIAL — anti-rubber-stamp controls active. Options shown without "(as drafted)" tags; options shuffled deterministically (seed \`${SEED}\`); reviewers MUST produce ≥3 concrete objections + 1 worse-than-status-quo scenario + 1 real-world precedent + a rejection steelman BEFORE any vote is counted; dissent floor of <5 distinct objections + > 80 % drafted-direction alignment triggers \`INVALID — re-run required\`.`,
    ``,
    `**Lineage:** W05 dispatch → W6 execution. Review of W3 draft \`docs/specs/SSOT_AMENDMENT_CA11_DRAFT.md\` (commit \`1a020f7\`). Canonical anchor: Rev-2.1 \`docs/CANONICAL_REFERENCE.md\` (\`9495b26\`).`,
    ``,
    `**Bundle:** ${artifact.length} chars (full CANONICAL_REFERENCE + CA-11 draft).`,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Panel audit:** ${JSON.stringify(audit)} — strict 10-unique-provider roster.`,
    ``,
    `---`,
    ``,
    `## DISSENT-FLOOR EVALUATION (Control 4)`,
    ``,
    `Drafted-direction alignment across Q1+Q2+Q3+Q4+Q6 (Q5 excluded — no drafted answer):`,
    `  Aligned: **${dissent.alignedCount} of ${dissent.totalPossible}** ENGAGED votes  (${(dissent.alignedPct*100).toFixed(1)} %)`,
    `Distinct substantive objections across all reviewers: **${t.distinctObjections}**`,
    `Trigger condition: alignment > 80 % AND distinct objections < 5.`,
    ``,
    dissent.triggered
      ? `**🚨 RESULT: \`INSUFFICIENT_ADVERSARIAL_SIGNAL\` — re-run required.** ${dissent.reason}.`
      : `**✅ RESULT: Adversarial signal passes dissent floor.** ${dissent.reason}.`,
    ``,
    `---`,
    ``,
    `## Slot status`,
    ``,
    `| Slot | Provider | Model | Region/Role | Backup? | Status | State | Invalid reason |`,
    `|------|----------|-------|-------------|---------|--------|-------|----------------|`,
    ...result.reviewers.map((r, idx) => {
      const slot = idx + 1;
      const cfg = SLOT_CONFIG[idx];
      const status = r.degraded ? 'DEGRADED' : 'LIVE-OK';
      const backup = r.slot_backup_applied ? `YES → ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || r.model}` : '—';
      const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
      const region = cfg ? `${cfg.region} · ${cfg.role}` : '';
      const pr = perReviewer[idx];
      return `| ${slot} | ${r.provider} | \`${modelStr}\` | ${region} | ${backup} | ${status} | \`${pr.state}\` | ${pr.invalid_reason ?? '—'} |`;
    }),
    ``,
    `LIVE-OK: ${liveOk}/${PANEL.length}. Backups applied: ${result.w6_metadata.backups_applied}. Quorum met (≥7 LIVE-OK): ${result.w6_metadata.quorum_met}.`,
    ``,
    `Adversarial-protocol classification:`,
    `  **ENGAGED** (adversarial pass complete + steelman + all 6 votes parsed): ${t.engagedTotal} / ${PANEL.length}`,
    `  TANGENTIAL: ${t.tangential}`,
    `  INVALID (controls failed — votes DISCARDED): ${t.invalid}`,
    `  SILENT: ${t.silent}`,
    ``,
    `---`,
    ``,
    `## Per-question tally (ENGAGED only, controls 1+2+3 enforced)`,
    ``,
    renderQuestionTable(t, perVerdicts),
    ``,
    `### Per-question detail`,
    ``,
    renderPerQuestionDetail(t, perVerdicts),
    ``,
    `---`,
    ``,
    `## All distinct substantive objections (verbatim, deduplicated, contributing-slot tagged)`,
    ``,
    `Total distinct: **${t.distinctObjections}**`,
    ``,
    renderObjections(t.allObjections),
    ``,
    `---`,
    ``,
    `## Strongest single argument AGAINST CA-11 (longest rejection steelman)`,
    ``,
    strongestRejection
      ? `**From Slot ${strongestRejection.slot} (${strongestRejection.model}):**\n\n> ${strongestRejection.text.replace(/\n/g, '\n> ')}`
      : '_(no rejection steelman submitted by any reviewer)_',
    ``,
    `---`,
    ``,
    `## Per-reviewer adversarial pass + steelman + votes`,
    ``,
    renderPerReviewer(perReviewer),
    ``,
    `---`,
    ``,
    `## Raw reviewer responses`,
    ``,
    renderRawResponses(result.reviewers),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[ca11-adversarial] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'ca11-adversarial.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_size: artifact.length,
    liveOk,
    w6_metadata: result.w6_metadata,
    tally: t,
    per_question_verdicts: perVerdicts,
    dissent_floor: dissent,
    consultation_valid: !dissent.triggered,
    strongest_rejection_argument: strongestRejection,
    shuffled_options: shuffledOptions,
    perReviewer,
    questions: QUESTIONS,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[ca11-adversarial] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ CA-11 ADVERSARIAL SUMMARY ═══════\n');
  process.stdout.write(`LIVE-OK:                 ${liveOk}/${PANEL.length}\n`);
  process.stdout.write(`ENGAGED (controls met):  ${t.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`INVALID (votes discarded): ${t.invalid}\n`);
  process.stdout.write(`Distinct objections:     ${t.distinctObjections}\n`);
  process.stdout.write(`Drafted-direction alignment: ${(dissent.alignedPct*100).toFixed(1)} %\n`);
  process.stdout.write(`Dissent floor result:    ${dissent.triggered ? 'INSUFFICIENT_ADVERSARIAL_SIGNAL — re-run required' : 'PASS — signal valid'}\n`);
  for (const q of QUESTIONS) {
    const v = perVerdicts[q.id];
    const topText = v.topKey ? q.options.find((o) => o.key === v.topKey)?.text : '—';
    process.stdout.write(`  ${q.id}: ${v.verdict} — "${topText}" ${v.topCount}/${t.engagedTotal}\n`);
  }
  process.stdout.write('═════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[ca11-adversarial] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
