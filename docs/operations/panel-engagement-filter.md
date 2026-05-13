# Operations — Panel Engagement Filter

**Phase:** 1 (manual classification). Phase 3 will replace the manual step with a code-level classifier — see § 7 hand-off.
**Status:** Active operating rule as of 2026-05-13.
**Source of truth:** `docs/PANEL_INFRASTRUCTURE.md` § 6 is the canonical definition of the four states and the vote-counting rule. This doc is the working procedure that synthesis drivers follow during a dispatch.

## 1. Purpose

To prevent false-consensus signals in Panel-driven synthesis. Reviewer responses frequently touch a question without engaging it — adjacent principle, related-but-different answer, polite-but-empty acknowledgment, complete silence. Naive vote-counting that treats every response as a vote inflates the apparent agreement and drives downstream decisions on a phantom majority. The engagement filter classifies each (reviewer, question) cell before any tally is computed, so the consensus number a CEO reads is the consensus that actually exists.

In one sentence: **never let TANGENTIAL / SILENT / EVASIVE responses sit in the denominator of an "X of Y" statement.**

## 2. When to apply

Apply on **every** Panel synthesis output. Concretely:

- Layer-N specification syntheses (Layer 1 SSOT, Layer 2 implementation plan, Layer 3 engineering spec).
- Panel consultation draft plans (e.g. `docs/W3_STUB_REPLACEMENT_PLAN_DRAFT_v1.md`).
- Decision memos that cite Panel votes ("4 of 5 reviewers said …").
- Any document where a count like "N of M reviewers" appears.

It is also applied retroactively when an earlier synthesis is being promoted from draft to canonical — that promotion is the natural moment to redo the counts under the filter and reissue.

It is NOT applied to:

- Internal scratch notes / working drafts not promoted to a `docs/` artifact.
- Single-reviewer artifacts (no tally to inflate).
- Smoke-test outputs that report raw provider responses without a synthesis layer.

## 3. The four states (recap)

(Full definitions live in `docs/PANEL_INFRASTRUCTURE.md` § 6.2.)

| Code | State | Counts toward "X of Y"? | Reported in matrix as |
|---|---|---|---|
| `E` | ENGAGED | Yes | `E` |
| `T` | TANGENTIAL | No | `T` + one-line gloss |
| `S` | SILENT | No | `S` |
| `X` | EVASIVE | No | `X` + one-line gloss |

The classification is **per (reviewer, question) cell** — the same reviewer can be ENGAGED on Q1 and SILENT on Q2.

## 4. How to classify — decision flow

For each (reviewer, question) cell:

1. **Did the reviewer mention the specific question's subject?** No → `SILENT`.
2. **Did they pick one of the options the question put forward?** (Or supply a concrete value, where the question is open-ended.) Yes → `ENGAGED`. The pick must be identifiable without inferring from adjacent prose.
3. **Did they explicitly decline to pick?** ("Depends on X", "out of scope", "more context needed.") → `EVASIVE`.
4. **Otherwise, they wrote about the topic but didn't pick.** → `TANGENTIAL`.

When in doubt between `T` and `S`: if the reviewer's response contains words that map to the question's subject vocabulary at all, lean `TANGENTIAL`. Reserve `SILENT` for the case where the response simply doesn't mention the question's subject.

## 5. Edge cases

### 5.1 Reviewer picks two options on the same question

If the reviewer explicitly says "either A or B works" or hedges between options — classify as `ENGAGED`, but record both picks in the synthesis output and call out the hedge in a one-line gloss. The vote counts toward whichever option(s) they named; if the synthesis later needs a single position, the reviewer is reported as `ENGAGED — hedged: A or B`.

### 5.2 Reviewer answers a question that wasn't asked but is adjacent

This is the most common `TANGENTIAL` case. Example: dispatch asked "what threshold should we set for X?", reviewer answered "we shouldn't set a threshold at all — use a curve." Classify as `TANGENTIAL`; in the one-line gloss, summarize their adjacent answer. If the adjacent answer is itself important, the synthesis driver may surface it as **an additional CEO flag** (a question the panel surfaced that the dispatch didn't ask) — but it does NOT count toward the original question's tally.

### 5.3 Reviewer answers the right question with a wrong-shaped value

Example: dispatch asked for a number, reviewer gave a qualitative description ("small", "low"). Classify as `ENGAGED` only if the qualitative answer maps unambiguously to one of the offered options; otherwise `TANGENTIAL`. When in doubt, ask: *would a downstream consumer of this synthesis be able to act on this response as if it were a vote?* If no — `TANGENTIAL`.

### 5.4 Reviewer's response is partially redacted, truncated, or HTTP-413'd

Treat as `SILENT` for the questions that fell inside the truncated region. Note in the matrix footnote: `Slot 6 / Q4–Q7 (SILENT): response truncated by github_models 413 too-large`. Do NOT extrapolate the reviewer's likely answer from earlier questions.

### 5.5 Reviewer is non-responsive for the entire panel run

Mark every cell `SILENT`. Note once at the top of the engagement matrix: `Slot 8 / 9: panel-wide SILENT — headless adapter not yet wired` (or whatever the cause is).

### 5.6 Question has no clear "options" — open-ended ask

The synthesis driver chooses one of two paths:

- **Reframe the question as a forced-choice** before classifying (e.g. "what threshold?" → "did they specify a number? Yes / No"). Then apply the four-state rule normally. Most open-ended questions can be reframed.
- **Keep open-ended and classify as `ENGAGED` if the reviewer produced a concrete actionable answer**; `TANGENTIAL` if they produced commentary without action. This is harder to apply consistently and should be the fallback, not the default.

The reframing is documented in the synthesis output so a reader can audit the classification.

### 5.7 Reviewer engages but contradicts themselves

If the reviewer's response contains two mutually exclusive picks (e.g. "use A" in one paragraph, "use B" three paragraphs later) and there is no obvious chronological "they changed their mind" structure — classify as `EVASIVE` (deliberate non-pick by way of self-cancellation). Note the contradiction in the footnote.

## 6. Integration with synthesis dispatches

A synthesis dispatch using this filter follows this sequence:

1. **Read all reviewer responses.** Do not classify yet.
2. **List the questions.** For each question, identify the option set (or reframe open-ended → forced-choice per § 5.6).
3. **Build the engagement matrix.** One row per reviewer, one column per question. Fill cells with `E` / `T` / `S` / `X`. Do this BEFORE any tally.
4. **Write the per-non-`E` gloss.** One line per non-`E` cell, factually describing what the reviewer did say.
5. **Compute tallies on `E` cells only.** Report as `"X of <engaged_total> ENGAGED reviewers picked option Y"` and never as `"X of <total_reviewers>"`.
6. **Surface low-engagement questions.** Any question with `engaged_total < ⌈total_reviewers / 2⌉` gets an explicit CEO flag: "no Panel signal" rather than a thin majority.
7. **Include both the matrix and the tallies in the output.** A synthesis without the matrix is incomplete.

The matrix typically lives at the end of each Section / Question block, or in a dedicated Appendix at the end of the document — synthesis drivers pick whichever placement keeps the document readable. Either placement is acceptable; what matters is that it ships.

## 7. Phase 3 hand-off

A code-level classifier is planned for Phase 3 — most likely an evaluator under `src/lib/audits/criteria/panel/` that consumes panel-consultation Markdown and emits the engagement matrix as a JSON artifact. Until that ships, **the manual rule in this document is normative**.

The Phase 3 design will likely:

- Parse each reviewer block from the consultation Markdown.
- Match the dispatch's question text against the reviewer block by keyword + LLM-assisted classification.
- Emit `{ slot, question_id, state: 'E'|'T'|'S'|'X', evidence: "<excerpt>" }` rows.
- Aggregate into the engagement matrix that today's synthesis drivers compose by hand.

The hand-off criterion is: when the code classifier disagrees with the manual classifier in < 5% of cells across a back-test corpus of 3 prior syntheses, code wins; the manual rule retires. Until then, manual is the primary signal and the code classifier (when it exists) is a secondary check.

## 8. Quick checklist for synthesis drivers

Use this as a pre-commit sanity check before pushing a synthesis draft:

- [ ] Every reviewer in the panel has a row in the engagement matrix.
- [ ] Every question in the dispatch has a column in the engagement matrix.
- [ ] Every non-`E` cell has a one-line gloss explaining what the reviewer said.
- [ ] Every "X of Y" statement in the doc uses `engaged_total` as Y, not `total_reviewers`.
- [ ] Every question with `engaged_total < ⌈total_reviewers / 2⌉` is flagged as "no Panel signal" rather than reported as a thin majority.
- [ ] The matrix is visible in the document (not buried in a hidden appendix or external file).
- [ ] The doc says `Phase 1 manual classification` somewhere if applying this filter rather than Phase 3 code output.

A synthesis output that fails any of these should not be promoted to a `docs/` artifact until the gaps are closed.

## 9. References

- `docs/PANEL_INFRASTRUCTURE.md` § 6 — canonical definition (this doc is the working procedure).
- `docs/W3_STUB_REPLACEMENT_PLAN_DRAFT_v1.md` § 5 Flag 2 — the worked example that motivated formalizing the filter.
- Prior Panel synthesis dispatches that predate the filter: `docs/FLOWAI_SSOT.md`, `docs/FLOWAI_IMPLEMENTATION_PLAN.md`, `docs/FLOWAI_ENGINEERING_SPEC_DRAFT_v1.md`. These are NOT being retro-classified here; the next promotion-to-canonical pass on each is the natural moment to apply the filter and reissue.
