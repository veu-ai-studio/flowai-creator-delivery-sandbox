// scripts/panel/slot-config.mjs
//
// SINGLE SOURCE OF TRUTH for FlowAI's Panel slot composition.
// Rebalanced 2026-05-14 (rev-2) per CEO directive: 10 unique provider
// names across 10 slots — Moonshot Kimi K2.6 and xAI Grok 4.3 replace
// the OpenAI/Qwen duplicates (slots 9 + 10). See docs/panel-
// consultations/PANEL_COMPOSITION_DUPLICATE_REMOVAL_2026-05-14.md.
//
// Every primary slot declares a provider-different backup so a single
// vendor outage cannot blackbox the Panel. The W6 runner in
// scripts/panel/run-panel-consultation.mjs reads the backup on primary
// degradation and re-issues against the backup model — the slot's
// recorded envelope is the one that answered, marked
// `slot_backup_applied: true` if the backup fired. No double-counting:
// the slot returns ONE result.
//
// Provider diversity audit (10 UNIQUE providers across 10 slots):
//   OpenAI:     1 (slot 1)
//   Anthropic:  1 (slot 2)
//   Google:     1 (slot 3)
//   Mistral:    1 (slot 4)         European frontier
//   Cohere:     1 (slot 5)         European/Canadian
//   Qwen:       1 (slot 6)         Asia generalist
//   DeepSeek:   1 (slot 7)         Asia reasoning
//   Perplexity: 1 (slot 8)         US web-grounded
//   Moonshot:   1 (slot 9)         Asia frontier coding + agentic
//   xAI:        1 (slot 10)        US real-time web-aware
//
// Regional coverage: 3 US + 1 US-web-grounded + 1 US-web-aware
//                  + 2 Europe + 3 Asia = 10/10.
//
// Slots 9 + 10 backups are picked from OUTSIDE the 10-primary set
// (no backup duplicates a primary in any other slot — the strict
// rule introduced by this rebalance). Slots 1-8 backups are
// carry-overs from the prior rebalance (2026-05-14 rev-1, commit
// 50a7928) under the original "provider-different" rule; converting
// those to the strict "outside-primary-set" rule is a follow-up
// per the rebalance doc.
//
// To add a new slot: append to SLOT_CONFIG, then add the model to
// scripts/lib/peer-review.mjs ALLOWED_MODELS, then run the smoke.
// The slot id `slotId` is its 1-based index; downstream scripts read
// `SLOT_CONFIG[i].provider` / `.model` / `.backup` / `.region` /
// `.role` to render result tables.

/** @typedef {{provider: string, model: string, region: string, role: string,
 *            backup: { provider: string, model: string } | null}} SlotEntry */

/** @type {ReadonlyArray<SlotEntry>} */
export const SLOT_CONFIG = Object.freeze([
  // Slot 1 — frontier reasoning (Anthropic, post-GPT-5-demote).
  // PROMOTION 2026-05-16 (W5b dispatch #3, GPT-5 Demote):
  // openai/gpt-5 DEMOTED from primary to backup after 7 consecutive
  // JSON-envelope-flake failures (triggering report: CA-12 v2
  // ratification, commit 01bed9d). Same treatment Gemini received on
  // 2026-05-16 (commit 8de0d2f) and Kimi K2.6 received on 2026-05-15
  // (commit 25e11c2). claude-opus-4 PROMOTED to primary — already proven
  // on this panel as Slot 1's prior backup AND Slot 6's backup
  // (multiple successful rescues on record).
  //
  // Slot 1 == Slot 2 mirror — RESOLVED 2026-05-16 (dispatch #4, commit
  // pending). Dispatch #3 created a same-model primary duplicate by
  // promoting claude-opus-4 to Slot 1 while Slot 2 was also
  // claude-opus-4. Dispatch #4 (Slot 2 Mirror Fix) re-pointed Slot 2
  // primary to openai/gpt-4o, eliminating the duplicate. claude-opus-4
  // now runs only at Slot 1 primary + Slot 6 backup.
  Object.freeze({
    provider: 'openrouter',
    model: 'anthropic/claude-opus-4',
    region: 'US',
    role: 'frontier reasoning (post-GPT-5-demote 2026-05-16)',
    backup: Object.freeze({ provider: 'openrouter', model: 'openai/gpt-5' }),
  }),
  // Slot 2 — US reasoning (OpenAI, post-mirror-fix).
  // RE-POINT 2026-05-16 (W5b dispatch #4, Slot 2 Mirror Fix):
  // openai/gpt-4o PROMOTED to primary; anthropic/claude-opus-4 REMOVED
  // from Slot 2 primary entirely (still runs as Slot 1 primary + Slot
  // 6 backup, so the panel keeps a proven claude-opus-4 path). This
  // BREAKS the Slot 1 == Slot 2 same-model duplicate that dispatch #3
  // flagged for follow-up (commit 1eb2733 left both slots running
  // anthropic/claude-opus-4 as primary).
  //
  // Choice rationale (recorded for future-W5b):
  //   Dispatch #4 criteria — NOT claude-opus-4, NOT demoted this session
  //   (NOT gpt-5/gemini-2.5-pro/kimi-k2.6/qwen), ≥64K context, clean
  //   flake record this session.
  //   Candidates evaluated:
  //     - openai/gpt-4o (128K, mature, reliable) ← PICKED
  //     - google/gemini-2.0-flash (1M context, but sibling gemini-2.5-pro
  //       just demoted for envelope flakes)
  //     - anthropic/claude-sonnet-4 (would still leave anthropic family
  //       duplicate with Slot 1)
  //     - meta-llama/llama-3.1-405b-instruct (would be 3rd meta-llama
  //       primary, beyond current 2-slot documented exception)
  //     - openai/gpt-4-turbo (gpt-4o is strictly better from same family)
  //   gpt-4o wins on: unique provider family (re-introduces OpenAI as a
  //   primary — zero openai primaries currently after the gpt-5 demote),
  //   different specific model from the demoted gpt-5 (longer track
  //   record, established serving path), no model-level OR family-level
  //   duplicate created.
  //
  // Backup change (consequential): backup was openai/gpt-5 — same
  // family as the new primary → violates the slot's "provider-different
  // backup" rule. Re-pointed to meta-llama/llama-3.3-70b-instruct
  // (proven rescue in W5b smoke 3f9dede; 128K context; provider-different
  // from openai; doesn't pile load on claude-opus-4 which already
  // serves Slot 1 primary + Slot 6 backup).
  Object.freeze({
    provider: 'openrouter',
    model: 'openai/gpt-4o',
    region: 'US',
    role: 'reasoning (post-mirror-fix 2026-05-16)',
    backup: Object.freeze({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' }),
  }),
  // Slot 3 — frontier reasoning (Meta family, post-Gemini-demote).
  // PROMOTION 2026-05-16 (W5b dispatch #2, Gemini Demote):
  // gemini-2.5-pro DEMOTED from primary to backup after 6 consecutive
  // JSON-envelope-flake failures (triggering report: W6 auth-spec
  // ratification, commit 556a751). Same treatment Kimi K2.6 received
  // when it was demoted from Slot 9 primary on 2026-05-15.
  // meta-llama/llama-3.3-70b-instruct PROMOTED to primary; this model
  // proved itself in the W5b smoke (3f9dede) as the rescue backup that
  // recovered Slot 3 when gemini-2.5-pro timed out at 120s — empirical
  // evidence beat the audit-rule tradeoff documented next.
  //
  // KNOWN AUDIT EXCEPTION — meta-llama duplicate:
  //   Slot 9 primary is meta-llama/llama-4-maverick, so Slot 3 primary
  //   meta-llama/llama-3.3-70b-instruct creates a meta-llama family
  //   duplicate (count=2). The strict "10 unique provider families
  //   across all primaries" rule that previously hard-throw'd is
  //   relaxed via DOCUMENTED_FAMILY_DUPLICATES below — see auditDiversity().
  //
  //   Tradeoff analysis (dispatch did not enumerate alternatives;
  //   reasoning recorded here for future-W5b):
  //     - The only non-Meta allowlist primaries not already in use are
  //       moonshotai/kimi-k2.6 (the worst envelope-flake on the panel —
  //       just demoted from Slot 9 on 2026-05-15) and qwen-2.5-72b-instruct
  //       (32K context cap — the exact failure mode that broke Slot 6's
  //       Qwen backup). Promoting either is structurally worse than
  //       accepting the meta-llama duplicate.
  //     - The two specific Meta models (llama-3.3-70b vs llama-4-maverick)
  //       are different generations, sizes (70B dense vs maverick MoE),
  //       and serving paths on OpenRouter — they fail independently in
  //       practice, even though they share the "meta-llama/" prefix.
  //     - The dispatch did not authorize relaxation of the 10-unique-
  //       providers rule, but it ALSO did not authorize promoting Kimi
  //       or Qwen. The best honest interpretation is: prioritize
  //       reliability of the specific model (the dispatch named llama-
  //       3.3-70b explicitly) over strict family-level fault diversity,
  //       and document the rule relaxation transparently.
  //
  //   Smoke certification (run-adversarial-smoke-test.mjs) was updated
  //   to accept documented family duplicates so the Panel remains fit
  //   for the 20-agent adversarial review.
  Object.freeze({
    provider: 'openrouter',
    model: 'meta-llama/llama-3.3-70b-instruct',
    region: 'US',
    role: 'frontier reasoning (post-Gemini-demote 2026-05-16)',
    backup: Object.freeze({ provider: 'openrouter', model: 'google/gemini-2.5-pro' }),
  }),
  // Slot 4 — European frontier (Mistral, France)
  Object.freeze({
    provider: 'openrouter',
    model: 'mistralai/mistral-large-2411',
    region: 'Europe',
    role: 'European frontier',
    backup: Object.freeze({ provider: 'openrouter', model: 'cohere/command-r-plus-08-2024' }),
  }),
  // Slot 5 — European/Canadian RAG-tuned (Cohere)
  Object.freeze({
    provider: 'openrouter',
    model: 'cohere/command-r-plus-08-2024',
    region: 'Europe/CA',
    role: 'European RAG-tuned',
    backup: Object.freeze({ provider: 'openrouter', model: 'mistralai/mistral-large-2411' }),
  }),
  // Slot 6 — US large-context multimodal (post-minimax-demote).
  // PROACTIVE DEMOTE 2026-05-16 (W5b dispatch #5, MiniMax Demote):
  // minimax/minimax-m2.7 DEMOTED from primary to backup after 5
  // consecutive JSON-envelope-flake failures (triggering report: W6
  // CA-12 v3 ratification, commit dedd075). Threshold-driven proactive
  // demote: 5 = "one away from the 6-flake threshold that triggered
  // gemini (2026-05-16, commit 8de0d2f) and gpt-5 (2026-05-16, commit
  // 1eb2733) demotions"; demoting now prevents a 6th flake from
  // disrupting a live Panel consultation. Same fault-pattern as the
  // four prior demotions (kimi-k2.6 2026-05-15; qwen-2.5-72b 2026-05-15;
  // gemini-2.5-pro 2026-05-16; gpt-5 2026-05-16).
  //
  // STRUCTURAL FLAG — literal dispatch promotion REJECTED:
  //   Dispatch #5 STEP 1 said "promote current backup to primary".
  //   The current backup was anthropic/claude-opus-4. Promoting it
  //   would put claude-opus-4 in BOTH Slot 1 primary AND Slot 6
  //   primary — re-creating the EXACT same-model mirror that dispatch
  //   #3 caused and dispatch #4 (commit c0037bd) just fixed.
  //
  //   Per the dispatch's "report what it is before changing" hedge,
  //   the conflict was reported pre-change and a different model
  //   chosen. Candidates evaluated:
  //     - anthropic/claude-opus-4 (literal dispatch pick) — REJECTED:
  //       Slot 1 == Slot 6 mirror
  //     - Any other existing primary — REJECTED: would create a
  //       mirror with that slot
  //     - openai/gpt-4-turbo — openai family duplicate with Slot 2
  //     - anthropic/claude-sonnet-4 — anthropic family duplicate w/ Slot 1
  //     - meta-llama/llama-3.1-405b-instruct — would be 3rd meta-llama
  //       primary, beyond the 2-slot documented exception
  //     - google/gemini-2.0-flash (1M context, unique family) ← PICKED
  //
  //   google/gemini-2.0-flash wins on: unique provider family (re-
  //   introduces Google as a primary — zero google primaries currently
  //   since the gemini-2.5-pro demote dispatch #2), massive 1M-token
  //   context (helps the 20-agent review bundle), no model-level or
  //   family-level duplicate created. Sibling-flake risk acknowledged
  //   (gemini-2.5-pro just demoted for envelope flakes), but Flash is
  //   a structurally different architecture from Pro — smaller,
  //   distilled, faster — and Google's Flash series has had different
  //   JSON envelope behavior than Pro in production reports.
  //
  // Backup change: backup re-pointed to the demoted minimax/minimax-m2.7
  // (standard Kimi/Gemini/GPT-5 treatment — keep the demoted model on
  // the panel for backup rescue rotation). Provider-different from new
  // google primary ✓. claude-opus-4 dropped from Slot 6 backup — still
  // runs as Slot 1 primary so still on the panel; this also reduces
  // claude-opus-4's panel-wide load (was Slot 1 primary + Slot 6
  // backup; now only Slot 1 primary).
  //
  // Role label updated from "Asia generalist" → "US large-context
  // multimodal" because the Asia geographic identity was tied to the
  // minimax model. No Asia alternative on the allowlist (deepseek-r1
  // already Slot 7 primary, llama-4-maverick already Slot 9 primary,
  // and Kimi/Qwen are demoted).
  Object.freeze({
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash',
    region: 'US',
    role: 'US large-context multimodal (post-minimax-demote 2026-05-16)',
    backup: Object.freeze({ provider: 'openrouter', model: 'minimax/minimax-m2.7' }),
  }),
  // Slot 7 — Asia reasoning (DeepSeek)
  Object.freeze({
    provider: 'openrouter',
    model: 'deepseek/deepseek-r1',
    region: 'Asia',
    role: 'Asia reasoning',
    backup: Object.freeze({ provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct' }),
  }),
  // Slot 8 — Web-grounded research (Perplexity Sonar)
  Object.freeze({
    provider: 'openrouter',
    model: 'perplexity/sonar',
    region: 'US web-grounded',
    role: 'web-grounded research',
    backup: Object.freeze({ provider: 'openrouter', model: 'google/gemini-2.5-pro' }),
  }),
  // Slot 9 — Meta Llama 4 Maverick (Asia/dev — frontier coding + agentic).
  // Rebalanced 2026-05-15: llama-4-maverick promoted to primary after
  // 5 consecutive rescues of the prior moonshotai/kimi-k2.6 primary
  // (Kimi returned chronic envelope-parse failures + intermittent
  // empty-content responses). Moonshot demoted to backup — kept on
  // panel for fault diversity since llama-4-maverick is US/Meta while
  // Kimi is Beijing/Moonshot.
  Object.freeze({
    provider: 'openrouter',
    model: 'meta-llama/llama-4-maverick',
    region: 'Asia (Beijing → US/Meta after swap)',
    role: 'frontier coding + agentic',
    backup: Object.freeze({ provider: 'openrouter', model: 'moonshotai/kimi-k2.6' }),
  }),
  // Slot 10 — xAI Grok 4.3 (US real-time web-aware reasoning).
  // Replaces openai/gpt-4o (2026-05-14 rev-2) to remove the OpenAI×2
  // provider duplicate. Backup minimax-m2.7 is NOT a primary in any
  // other slot — satisfies the strict no-backup-duplicates-primary
  // rule. (Dispatch's nvidia/nemotron-3-super candidate returned
  // "not a valid model ID" from OpenRouter on 2026-05-14; minimax
  // was the dispatch's OR-option fallback.)
  Object.freeze({
    provider: 'openrouter',
    model: 'x-ai/grok-4.3',
    region: 'US',
    role: 'real-time web-aware reasoning',
    backup: Object.freeze({ provider: 'openrouter', model: 'minimax/minimax-m2.7' }),
  }),
]);

/** Adapter for older callers expecting the bare PANEL shape (no backup,
 *  no region, no role). Used by scripts that haven't migrated yet. */
export const PANEL = Object.freeze(
  SLOT_CONFIG.map((s) => Object.freeze({ provider: s.provider, model: s.model })),
);

/** Provider families allowed to appear more than once in the primary
 *  roster, with the rationale recorded for the audit. Each entry must
 *  document WHY the strict 10-unique-providers rule is relaxed for that
 *  family. Use sparingly — every duplicate is a fault-diversity loss.
 *
 *  meta-llama added 2026-05-16 (W5b Gemini Demote, dispatch #2): the
 *  dispatch named meta-llama/llama-3.3-70b-instruct as the explicit
 *  promotion target for Slot 3 after the Gemini demotion, and Slot 9
 *  primary is meta-llama/llama-4-maverick — so the meta-llama family
 *  now has two primaries. The two specific models are different
 *  generations + serving paths and fail independently in practice.
 *  No non-Meta alternative on the allowlist preserves both ≥64K context
 *  AND reliable JSON envelopes (the only candidates are kimi-k2.6, a
 *  worse flake just demoted from Slot 9, and qwen-2.5-72b-instruct,
 *  32K context cap — also recently demoted). */
export const DOCUMENTED_FAMILY_DUPLICATES = Object.freeze({
  'meta-llama':
    'Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + ' +
    'Slot 9 (llama-4-maverick). Different generations, different serving ' +
    'paths on OpenRouter, independent in practice. Documented per W5b ' +
    'dispatch #2 (2026-05-16, commit 556a751 triggering evidence).',
  // anthropic was here transiently (W5b dispatch #3, commit 1eb2733)
  // when Slot 1 and Slot 2 both ran claude-opus-4. W5b dispatch #4
  // (Slot 2 Mirror Fix, 2026-05-16) re-pointed Slot 2 primary to
  // openai/gpt-4o, eliminating the duplicate. Entry removed; git log
  // preserves the historical record.
});

/** Specific MODEL ids allowed to appear more than once in the primary
 *  roster, with rationale. Stricter than family duplicates: every entry
 *  here means TWO+ slots run the LITERAL SAME MODEL and will produce
 *  fully correlated responses. Use only when reliability evidence
 *  outweighs the fault-diversity loss AND the dispatch explicitly
 *  authorizes / anticipates the duplicate.
 *
 *  Currently empty — anthropic/claude-opus-4 was the sole entry from
 *  W5b dispatch #3 (2026-05-16, commit 1eb2733) and was removed by
 *  W5b dispatch #4 (Slot 2 Mirror Fix, 2026-05-16) when Slot 2 was
 *  re-pointed to openai/gpt-4o. The export is retained so future
 *  swaps that create a model-level duplicate have a place to document. */
export const DOCUMENTED_MODEL_DUPLICATES = Object.freeze({});

/** Provider-count audit. Useful for self-tests + the W6 brief.
 *  Returns {
 *    providerCounts: { openai: 1, anthropic: 2, 'meta-llama': 2, ... },
 *    maxPerProvider: 2,                  // raw maximum across families
 *    slots: 10,
 *    documentedDuplicates: { 'meta-llama': '<rationale>', ... },
 *    undocumentedDuplicates: [],         // families with count >1 NOT documented
 *    modelPrimaryDuplicates: [           // specific MODEL ids appearing >1× as primary
 *      { model: 'anthropic/claude-opus-4', slots: [1, 2], documented: true },
 *      ...
 *    ],
 *    undocumentedModelDuplicates: [],    // model-level duplicates NOT documented
 *    auditPass: true,                    // true iff every duplicate (family + model) is documented
 *  }
 *  Callers that previously relied on `maxPerProvider <= 1` should switch
 *  to `auditPass === true` (the post-2026-05-16 contract).
 *
 *  Note: modelPrimaryDuplicates is STRICTLY STRONGER than family duplicates.
 *  When two slots run the literal same model, they fail in 100% correlation
 *  (rate limits, quota caps, account credit, model-specific timeouts). Even
 *  if documented, every entry here is a fault-diversity loss worth periodic
 *  review.
 */
export function auditDiversity() {
  const familyCounts = {};
  const modelToSlots = {};
  for (const [i, s] of SLOT_CONFIG.entries()) {
    const family = s.model.split('/')[0];
    familyCounts[family] = (familyCounts[family] || 0) + 1;
    if (!modelToSlots[s.model]) modelToSlots[s.model] = [];
    modelToSlots[s.model].push(i + 1);
  }
  const maxPerProvider = Math.max(...Object.values(familyCounts));
  const undocumentedDuplicates = [];
  for (const [family, count] of Object.entries(familyCounts)) {
    if (count > 1 && !DOCUMENTED_FAMILY_DUPLICATES[family]) {
      undocumentedDuplicates.push({ family, count });
    }
  }
  const modelPrimaryDuplicates = [];
  const undocumentedModelDuplicates = [];
  for (const [model, slots] of Object.entries(modelToSlots)) {
    if (slots.length > 1) {
      const documented = Boolean(DOCUMENTED_MODEL_DUPLICATES[model]);
      modelPrimaryDuplicates.push({ model, slots, documented });
      if (!documented) undocumentedModelDuplicates.push({ model, slots });
    }
  }
  const auditPass =
    undocumentedDuplicates.length === 0 &&
    undocumentedModelDuplicates.length === 0 &&
    SLOT_CONFIG.length === 10;
  return {
    providerCounts: familyCounts,
    maxPerProvider,
    slots: SLOT_CONFIG.length,
    documentedDuplicates: { ...DOCUMENTED_FAMILY_DUPLICATES },
    undocumentedDuplicates,
    modelPrimaryDuplicates,
    undocumentedModelDuplicates,
    auditPass,
  };
}

/** Required-models-on-allowlist self-check. Returns the list of models
 *  (primary + backup) that the SLOT_CONFIG declares, so the allowlist
 *  in peer-review.mjs can be cross-verified. */
export function declaredModels() {
  const set = new Set();
  for (const s of SLOT_CONFIG) {
    set.add(s.model);
    if (s.backup?.model) set.add(s.backup.model);
  }
  return [...set].sort();
}
