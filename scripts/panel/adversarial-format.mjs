// scripts/panel/adversarial-format.mjs
//
// Locked adversarial Panel format. Added 2026-05-15 (W5b dispatch — Panel
// Infra Repair + Adversarial Format Lock). After CA-1 through CA-10 returned
// near-unanimous all-(a) "(as drafted)" verdicts — a rubber-stamp pattern
// the runner could not detect — the Panel runner now REQUIRES every
// consultation to use this module to build its prompt + criteria. The
// runtime anchor-phrase guard in run-panel-consultation.mjs rejects any
// bundle containing "(as drafted)" / "(recommended)" / similar labels;
// the only sanctioned way to ship a consultation is through here.
//
// Five controls (per W05 dispatch 2026-05-15):
//   2A  NO ANCHORING       — option text stripped of "(as drafted)" labels.
//                            Options shuffled per a deterministic seed.
//                            Reviewers quote option TEXT verbatim — no
//                            letter labels — so they cannot anchor on
//                            ordering either.
//   2B  ADVERSARIAL PASS   — every reviewer must produce ≥3 specific
//                            objections + ≥1 worse-than-status-quo
//                            scenario + 1 real-world precedent (or honest
//                            "no precedent known") BEFORE any vote is
//                            counted. Failure = votes DISCARDED.
//   2C  STEELMAN REJECTION — every reviewer must include a good-faith
//                            argument for REJECTING/DEFERRING the
//                            proposal, even if their final vote is to
//                            promote. Failure = votes DISCARDED.
//   2D  DISSENT FLOOR      — if alignment with the spec-author's preferred
//                            direction exceeds 80 % AND distinct
//                            substantive objections < 5, the consultation
//                            is FLAGGED `INSUFFICIENT_ADVERSARIAL_SIGNAL —
//                            re-run required` rather than a clean verdict.
//   2E  DEFAULT            — these controls are the default runner
//                            behaviour (locked) — there is no flag to
//                            disable them. The only opt-out is the
//                            runtime `allowAnchorPhrases: true` panic
//                            switch in run-panel-consultation.mjs, which
//                            logs a warning.
//
// Public surface:
//   buildAdversarialQuestionBody({ topic, draftText, questions, seed })
//     → prompt body to pass as the consultation artifact (combine with
//       loadCanonicalReference() + buildArtifactWithCanonical()).
//   buildAdversarialCriteria({ schemaIntro })
//     → reviewer instruction text (criteria) — pass as criteria to the
//       runner. The schemaIntro is the JSON envelope shape unique to the
//       caller's question set; the rest of the criteria is locked.
//   classifyAdversarialReviewer(parsed, idx, degraded, parseFailure, modelTag, questions)
//     → ENGAGED/INVALID/TANGENTIAL/SILENT per reviewer (controls 2B+2C).
//   tallyAdversarial(perReviewer, questions)
//     → per-question vote tally + dedup'd distinct objections (control 2D
//       evaluation input).
//   evaluateDissentFloor({ tally, questions, draftedQs, alignmentBar=0.8,
//                          objectionFloor=5 })
//     → { triggered, alignedPct, alignedCount, totalPossible, reason }
//   computeVerdict(counts, engagedTotal, qOptions)
//     → per-question verdict (UNANIMOUS / SUPERMAJORITY / QUORUM_PLURALITY /
//       PLURALITY / SPLIT / NO_QUORUM).
//   makeDeterministicShuffler(seed)
//     → seeded xorshift32 + Fisher-Yates shuffler for option ordering.
//   safeParseReviewerResponse(rawOutput)
//     → JSON envelope extractor (handles fences, greedy slice).
//
// Question schema (required by every caller):
//   [{ id: 'Q1',
//      topic: '<short description>',
//      options: [{ key: 'Q1-X', text: '<verbatim option text, NO anchor labels>' }, ...],
//      draftedKey: 'Q1-X' | null  // null = open-ended question, excluded from dissent floor
//   }]

/** Deterministic xorshift32 RNG seeded from a string. Same input → same
 *  output, so reviewers see the same shuffled order across re-runs of a
 *  given consultation but a different order across consultations. */
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

/** Fisher-Yates shuffle with a supplied RNG. */
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDeterministicShuffler(seed) {
  const rng = makeRng(seed);
  return (arr) => shuffle(arr, rng);
}

// ── Anchor-text sanitiser (runtime safety net) ──────────────────────────
// If a caller forgets to strip "(as drafted)" from option text, strip it
// here before the runner sees the bundle. This is a belt-and-braces
// complement to the runner's anchor-phrase guard.

const ANCHOR_STRIP_RE = /\s*\(\s*(?:as\s+drafted|recommended|spec[\s-]?author[\s-]?(?:recommends?|prefers?|preferred)|W[\s\-_]?\d+\s+(?:recommends?|prefers?|preferred)|author[\s-]?preferred|author[\s-]?recommends?|drafted)\s*\)/gi;

export function stripAnchorLabels(text) {
  if (typeof text !== 'string') return text;
  return text.replace(ANCHOR_STRIP_RE, '').replace(/\s+/g, ' ').trim();
}

// ── Required question schema validator ─────────────────────────────────

export function validateQuestionSchema(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new TypeError('adversarial-format: questions must be a non-empty array');
  }
  const ids = new Set();
  for (const q of questions) {
    if (!q || typeof q.id !== 'string' || q.id.length === 0) {
      throw new TypeError('adversarial-format: every question requires a non-empty `id` string');
    }
    if (ids.has(q.id)) {
      throw new TypeError(`adversarial-format: duplicate question id "${q.id}"`);
    }
    ids.add(q.id);
    if (typeof q.topic !== 'string' || q.topic.length === 0) {
      throw new TypeError(`adversarial-format: question ${q.id} requires a non-empty topic`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new TypeError(`adversarial-format: question ${q.id} requires ≥2 options`);
    }
    const keySet = new Set();
    for (const o of q.options) {
      if (!o || typeof o.key !== 'string' || typeof o.text !== 'string') {
        throw new TypeError(`adversarial-format: question ${q.id} option missing key/text`);
      }
      if (keySet.has(o.key)) {
        throw new TypeError(`adversarial-format: question ${q.id} duplicate option key "${o.key}"`);
      }
      keySet.add(o.key);
      if (ANCHOR_STRIP_RE.test(o.text)) {
        throw new TypeError(
          `adversarial-format: question ${q.id} option "${o.key}" text contains anchor phrase ` +
          `(matches /${ANCHOR_STRIP_RE.source}/i). Strip with stripAnchorLabels() before passing.`,
        );
      }
      // Reset regex global state for the next test (RegExp .test with /g is stateful).
      ANCHOR_STRIP_RE.lastIndex = 0;
    }
    if (q.draftedKey !== null && q.draftedKey !== undefined) {
      if (typeof q.draftedKey !== 'string' || !keySet.has(q.draftedKey)) {
        throw new TypeError(
          `adversarial-format: question ${q.id} draftedKey "${q.draftedKey}" not in option keys`,
        );
      }
    }
  }
}

// ── Prompt body builder (Control 2A) ───────────────────────────────────

/** Build the consultation prompt body. Options are deterministically
 *  shuffled per a seed (default: question-id-derived) so all reviewers in
 *  one run see the same order, but different runs see different orders. */
export function buildAdversarialQuestionBody({ topic, draftText, questions, seed }) {
  validateQuestionSchema(questions);
  if (typeof topic !== 'string' || topic.length === 0) {
    throw new TypeError('buildAdversarialQuestionBody: topic required');
  }
  if (typeof draftText !== 'string' || draftText.length === 0) {
    throw new TypeError('buildAdversarialQuestionBody: draftText required');
  }
  const effectiveSeed = typeof seed === 'string' && seed.length > 0
    ? seed
    : `adv-${questions.map((q) => q.id).join('-')}`;
  const shuffler = makeDeterministicShuffler(effectiveSeed);
  const shuffledOptions = {};
  for (const q of questions) shuffledOptions[q.id] = shuffler(q.options);

  const lines = [];
  lines.push(`═══════════════ ${topic} — ADVERSARIAL PANEL REVIEW ═══════════════`);
  lines.push('');
  lines.push('This is an ADVERSARIAL consultation — NOT a ratification exercise.');
  lines.push('You are explicitly being asked to find problems with the proposal under review.');
  lines.push('A response that rubber-stamps the proposal without independent scrutiny will be DISCARDED.');
  lines.push('');
  lines.push('Mandatory protocol (any vote that does NOT satisfy ALL of these is INVALID and will not be tallied):');
  lines.push('');
  lines.push('  1. ADVERSARIAL PASS — produce, for the WHOLE proposal, three things BEFORE');
  lines.push('     answering any of the multi-choice questions:');
  lines.push('     • At least 3 CONCRETE, SPECIFIC objections or failure modes (not generic');
  lines.push('       caveats; each objection must name a section / mechanism / metric / risk');
  lines.push('       surface from the proposal itself).');
  lines.push('     • At least 1 scenario where the proposal makes the system WORSE than the');
  lines.push('       status quo.');
  lines.push('     • 1 named REAL-WORLD PRECEDENT where a similar design caused problems — OR');
  lines.push('       an explicit declaration "no precedent known" (honest answer; do not fabricate).');
  lines.push('');
  lines.push('  2. REJECTION STEELMAN — produce a GOOD-FAITH argument for REJECTING or DEFERRING');
  lines.push('     the proposal entirely. Even if your final disposition is to promote, you must');
  lines.push('     articulate the strongest available counter-case.');
  lines.push('');
  lines.push('  3. ONLY AFTER (1) and (2), answer the multi-choice questions below.');
  lines.push('');
  lines.push('Option ordering note: options are presented in NEUTRAL order. No option is marked');
  lines.push('"as drafted" / "recommended" / author-preferred. Vote on the substantive merits,');
  lines.push('not on perceived author preference. You MUST quote the option TEXT verbatim in your');
  lines.push('answer (no letter labels — there are no letter labels).');
  lines.push('');
  lines.push('Every question carries an implicit REJECT/DEFER option even when not enumerated:');
  lines.push('if you believe NONE of the listed options is acceptable, vote "REJECT — none of the');
  lines.push('listed options is acceptable as specified" in your pick_text field; the runner will');
  lines.push('record this as a REJECT vote.');
  lines.push('');
  lines.push('═══════════════ PROPOSAL UNDER ADVERSARIAL SCRUTINY ═══════════════');
  lines.push('');
  lines.push(draftText.trim());
  lines.push('');
  lines.push('═══════════════ END PROPOSAL ═══════════════');
  lines.push('');
  lines.push('═══════════════ MULTIPLE-CHOICE QUESTIONS (neutral, deterministically shuffled) ═══════════════');
  lines.push('');
  for (const q of questions) {
    lines.push(`### ${q.id} — ${q.topic}`);
    lines.push('');
    lines.push('Options (pick exactly one — quote the option TEXT verbatim in your answer):');
    for (const o of shuffledOptions[q.id]) {
      lines.push(`  • ${o.text}`);
    }
    lines.push(`  • REJECT — none of the listed options is acceptable as specified`);
    lines.push('');
  }
  return { body: lines.join('\n'), shuffledOptions, seed: effectiveSeed };
}

// ── Criteria builder (Controls 2B + 2C + 2E) ───────────────────────────

export function buildAdversarialCriteria({ questions, schemaIntro }) {
  validateQuestionSchema(questions);
  const answerLines = questions.map(
    (q) => `    "${q.id}": { "pick_text": "<verbatim option text OR 'REJECT — none of the listed options is acceptable as specified'>", "rationale": "<1-2 sentences>" }`,
  ).join(',\n');
  const intro = typeof schemaIntro === 'string' && schemaIntro.length > 0
    ? schemaIntro.trim() + '\n\n'
    : '';
  return `${intro}You are a Panel reviewer running an ADVERSARIAL review of the proposal
attached above (verbatim). The full FlowAI CANONICAL_REFERENCE.md is also
attached at the top of the bundle.

Mandatory protocol (read it again — non-compliant responses are DISCARDED):

  1. ADVERSARIAL PASS first: ≥3 concrete objections + 1 worse-than-status-
     quo scenario + 1 real-world precedent (or honest "no precedent known").
  2. REJECTION STEELMAN: a good-faith argument for rejecting / deferring
     the proposal.
  3. Then answer the multi-choice questions by quoting the option TEXT
     verbatim, OR voting "REJECT — none of the listed options is acceptable
     as specified" if you believe no listed option is acceptable.

A vote unsupported by an adversarial pass is INVALID. You will not be
"rewarded" for picking the spec-author's preferred option — you will be
SCORED on the depth + specificity of your objections.

Return ONLY a JSON object (no surrounding prose, no markdown fences)
matching this shape EXACTLY:

{
  "reviewer_slot": <integer>,
  "adversarial_pass": {
    "objections": [
      { "title": "<≤8 words>", "detail": "<2-4 sentences naming a specific section / mechanism / metric>" },
      { "title": "<≤8 words>", "detail": "<2-4 sentences>" },
      { "title": "<≤8 words>", "detail": "<2-4 sentences>" }
    ],
    "worse_than_status_quo": "<1-3 sentences describing a scenario where the proposal makes the system worse than the status quo>",
    "precedent": "<1-2 sentences naming a real-world system / project / failure where a similar design caused trouble — OR the literal string 'no precedent known' if you don't have one>"
  },
  "rejection_steelman": "<2-4 sentences: the strongest available argument FOR rejecting or deferring the proposal, made in good faith even if you ultimately vote to promote>",
  "answers": {
${answerLines}
  },
  "overall_notes": "<optional 1-2 sentences>"
}

Notes on the objections list:
  - You may include MORE than 3 objections; minimum is 3.
  - Each objection must be SPECIFIC — name a section, sub-section, metric,
    topic name, or mechanism from the proposal. "It's too complex" alone
    is NOT specific; "<§3.2 quarterly auto-update> has no rollback path if
    the auto-update inserts a malicious adapter" IS specific.
  - Surface objections that are NEW and SPECIFIC. Generic objections that
    apply to any change ("change has risk") will be discarded in the
    distinct-objections count.

JSON ENVELOPE HARDENING: return ONLY the JSON object. First character MUST
be '{', last MUST be '}'. No prose before, no prose after, no \`\`\`json
fences.`.trim();
}

// ── Reviewer response parsing ──────────────────────────────────────────

export function safeParseReviewerResponse(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return { ok: false, reason: 'empty_output', parsed: null };
  }
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
// Recognises the literal REJECT vote as a synthetic 'REJECT' key.
const REJECT_PICK_RE = /^\s*REJECT\b/i;

export function matchPick(qId, pickText, questions) {
  if (typeof pickText !== 'string') return null;
  const t = pickText.trim();
  if (REJECT_PICK_RE.test(t)) return 'REJECT';
  const q = questions.find((qq) => qq.id === qId);
  if (!q) return null;
  for (const o of q.options) if (o.text === t) return o.key;
  const lower = t.toLowerCase();
  for (const o of q.options) if (o.text.toLowerCase() === lower) return o.key;
  // Substring match — pick the option whose text is most contained in / contains the response.
  let bestKey = null, bestLen = 0;
  for (const o of q.options) {
    const ol = o.text.toLowerCase();
    if (lower.includes(ol) || ol.includes(lower)) {
      const overlap = Math.min(ol.length, lower.length);
      if (overlap > bestLen) { bestLen = overlap; bestKey = o.key; }
    }
  }
  return bestKey;
}

// ── Reviewer classification (Controls 2B + 2C) ─────────────────────────

export function validAdversarialPass(parsed) {
  const a = parsed?.adversarial_pass;
  if (!a || typeof a !== 'object') return { valid: false, reason: 'adversarial_pass missing' };
  const objs = Array.isArray(a.objections) ? a.objections : [];
  const validObjs = objs.filter(
    (o) => o && typeof o === 'object' && typeof o.title === 'string'
      && typeof o.detail === 'string' && o.detail.trim().length >= 30,
  );
  if (validObjs.length < 3) {
    return { valid: false, reason: `only ${validObjs.length} valid objections (need ≥3)` };
  }
  const worse = typeof a.worse_than_status_quo === 'string' ? a.worse_than_status_quo.trim() : '';
  if (worse.length < 20) return { valid: false, reason: 'worse_than_status_quo missing or too short' };
  const prec = typeof a.precedent === 'string' ? a.precedent.trim() : '';
  if (prec.length < 5) return { valid: false, reason: 'precedent missing' };
  return { valid: true, objections: validObjs, worse_than_status_quo: worse, precedent: prec };
}

export function classifyAdversarialReviewer(parsed, idx, degraded, parseFailure, modelTag, questions) {
  const slot = idx + 1;
  if (degraded) {
    return { slot, state: 'SILENT', votes: {}, adversarial: null, rejection_steelman: null,
             degraded: true, parseFailure: false, modelTag };
  }
  if (parseFailure) {
    return { slot, state: 'SILENT', votes: {}, adversarial: null, rejection_steelman: null,
             degraded: false, parseFailure: true, modelTag };
  }

  const advCheck = validAdversarialPass(parsed);
  const rejSteelman = typeof parsed?.rejection_steelman === 'string'
    ? parsed.rejection_steelman.trim() : '';
  const rejValid = rejSteelman.length >= 30;

  const votes = {};
  let validVoteCount = 0;
  for (const q of questions) {
    const a = parsed?.answers?.[q.id];
    const key = matchPick(q.id, a?.pick_text, questions);
    const rationale = typeof a?.rationale === 'string' ? a.rationale.trim() : null;
    if (key) validVoteCount += 1;
    votes[q.id] = {
      key,
      pick_text: typeof a?.pick_text === 'string' ? a.pick_text.trim() : null,
      rationale,
    };
  }

  let state = 'INVALID';
  let invalid_reason = null;
  if (!advCheck.valid) { invalid_reason = `adversarial pass: ${advCheck.reason}`; }
  else if (!rejValid) { invalid_reason = 'rejection_steelman missing or <30 chars'; }
  else if (validVoteCount === questions.length) state = 'ENGAGED';
  else { state = 'TANGENTIAL'; invalid_reason = `${validVoteCount}/${questions.length} votes parsed`; }

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

// ── Distinct-objection dedup (Control 2D input) ────────────────────────

function normaliseObjection(o) {
  const src = `${o.title || ''} ${o.detail || ''}`.toLowerCase();
  return src.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function tallyAdversarial(perReviewer, questions) {
  const engaged = perReviewer.filter((r) => r.state === 'ENGAGED');
  const invalid = perReviewer.filter((r) => r.state === 'INVALID').length;
  const tangential = perReviewer.filter((r) => r.state === 'TANGENTIAL').length;
  const silent = perReviewer.filter((r) => r.state === 'SILENT').length;
  const perQuestion = {};
  for (const q of questions) {
    const counts = {};
    for (const o of q.options) counts[o.key] = 0;
    counts.REJECT = 0;
    counts.unmatched = 0;
    for (const r of engaged) {
      const k = r.votes[q.id]?.key;
      if (k && counts[k] !== undefined) counts[k] += 1;
      else if (k === 'REJECT') counts.REJECT += 1;
      else counts.unmatched += 1;
    }
    perQuestion[q.id] = counts;
  }
  // Distinct objection dedup across anyone who submitted a valid adversarial pass.
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
  return {
    engagedTotal: engaged.length, invalid, tangential, silent,
    perQuestion, distinctObjections: objSeen.size, allObjections,
  };
}

// ── Per-question verdict ───────────────────────────────────────────────

export function computeVerdict(counts, engagedTotal, qOptions) {
  if (engagedTotal === 0) {
    return { verdict: 'NO_QUORUM', detail: '0 ENGAGED', topKey: null, topCount: 0 };
  }
  // Build sortable [key, count] including REJECT as a real option.
  const allKeys = qOptions.map((o) => [o.key, counts[o.key] || 0]);
  if (counts.REJECT && counts.REJECT > 0) allKeys.push(['REJECT', counts.REJECT]);
  const sorted = allKeys.sort((a, b) => b[1] - a[1]);
  const [topKey, topCount] = sorted[0];
  if (topCount === engagedTotal) {
    return { verdict: `UNANIMOUS_${topKey}`, detail: `${topCount} of ${engagedTotal} ENGAGED on ${topKey} (unanimous)`, topKey, topCount };
  }
  if (topCount >= 8) {
    return { verdict: `SUPERMAJORITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (≥ 8/10)`, topKey, topCount };
  }
  if (topCount >= 7) {
    return { verdict: `QUORUM_PLURALITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (≥ quorum 7/10)`, topKey, topCount };
  }
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    const tied = sorted.filter((s) => s[1] === sorted[0][1]).map((s) => s[0]);
    return { verdict: 'SPLIT', detail: `top tie at ${sorted[0][1]} between ${tied.join(' / ')}`, topKey: tied[0], topCount: sorted[0][1] };
  }
  if (topCount === 0) {
    return { verdict: 'NO_QUORUM', detail: '0 votes on any option', topKey: null, topCount: 0 };
  }
  return { verdict: `PLURALITY_${topKey}`, detail: `${topCount} of ${engagedTotal} on ${topKey} (below 7/10 quorum)`, topKey, topCount };
}

// ── Dissent floor (Control 2D) ─────────────────────────────────────────

export function evaluateDissentFloor({
  tally, questions, draftedQs = null,
  alignmentBar = 0.80, objectionFloor = 5,
}) {
  // Default draftedQs = every question with a non-null draftedKey.
  const effectiveDraftedQs = Array.isArray(draftedQs) && draftedQs.length > 0
    ? draftedQs
    : questions.filter((q) => q.draftedKey).map((q) => q.id);
  const totalPossible = effectiveDraftedQs.length * tally.engagedTotal;
  if (totalPossible === 0) {
    return {
      triggered: false, alignedPct: 0, alignedCount: 0, totalPossible: 0,
      draftedQs: effectiveDraftedQs, alignmentBar, objectionFloor,
      reason: '0 ENGAGED or 0 drafted questions — no votes to evaluate',
    };
  }
  let alignedCount = 0;
  for (const qId of effectiveDraftedQs) {
    const q = questions.find((qq) => qq.id === qId);
    if (!q || !q.draftedKey) continue;
    alignedCount += (tally.perQuestion[qId]?.[q.draftedKey] || 0);
  }
  const alignedPct = alignedCount / totalPossible;
  const triggered = alignedPct > alignmentBar && tally.distinctObjections < objectionFloor;
  return {
    triggered, alignedPct, alignedCount, totalPossible,
    draftedQs: effectiveDraftedQs, alignmentBar, objectionFloor,
    reason: triggered
      ? `alignment ${(alignedPct * 100).toFixed(1)} % > ${(alignmentBar * 100).toFixed(0)} % AND distinct objections ${tally.distinctObjections} < ${objectionFloor}`
      : `alignment ${(alignedPct * 100).toFixed(1)} %, distinct objections ${tally.distinctObjections}`,
  };
}
