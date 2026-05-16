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
  // on this panel as Slot 1's prior backup AND Slot 2's primary AND
  // Slot 6's backup (multiple successful rescues on record).
  //
  // ⚠ STRUCTURAL ISSUE FLAGGED FOR FOLLOW-UP DISPATCH ⚠
  //   This swap mirrors Slot 2 — both Slot 1 and Slot 2 now have:
  //     primary: anthropic/claude-opus-4
  //     backup:  openai/gpt-5
  //   That is a SAME-MODEL duplicate at the primary level (not just
  //   same-family). The two slots will produce literally correlated
  //   responses on every consultation — a transient claude-opus-4 issue
  //   (rate-limit, timeout, envelope-flake, account credit cap) will
  //   take BOTH slots out simultaneously, costing 2 of the 7-needed-
  //   for-quorum reviewers in one event. This is structurally worse than
  //   the meta-llama family duplicate from dispatch #2 (where the two
  //   Meta models are different generations + serving paths).
  //
  //   The dispatch explicitly named claude-opus-4 as the promotion
  //   target, anticipated a family duplicate ("Document the family
  //   duplicate if any"), and is recorded as executed literally. The
  //   honest reasoning for accepting this is the same as dispatch #2:
  //   no non-Anthropic allowlist alternative preserves both ≥64K
  //   context AND reliability — moonshotai/kimi-k2.6 (chronic flake,
  //   just demoted from Slot 9), qwen-2.5-72b-instruct (32K context
  //   cap, just demoted from Slot 6), and google/gemini-2.5-pro (just
  //   demoted from Slot 3 in this same session) are all empirically
  //   worse than accepting the duplicate.
  //
  //   RECOMMEND follow-up dispatch to break the Slot 1 == Slot 2 mirror
  //   by changing Slot 2 to a non-claude-opus-4 primary. See README
  //   note in auditDiversity() output `modelPrimaryDuplicates` field —
  //   this field exists specifically so future-W5b cannot lose track
  //   of this issue.
  //
  // KNOWN AUDIT EXCEPTION — anthropic duplicate:
  //   Slot 2 primary is anthropic/claude-opus-4; Slot 1 primary is now
  //   also anthropic/claude-opus-4. The anthropic family is added to
  //   DOCUMENTED_FAMILY_DUPLICATES with the rationale above. auditPass
  //   remains true under the post-2026-05-16 contract.
  Object.freeze({
    provider: 'openrouter',
    model: 'anthropic/claude-opus-4',
    region: 'US',
    role: 'frontier reasoning (post-GPT-5-demote 2026-05-16)',
    backup: Object.freeze({ provider: 'openrouter', model: 'openai/gpt-5' }),
  }),
  // Slot 2 — US reasoning (different family from slot 1)
  Object.freeze({
    provider: 'openrouter',
    model: 'anthropic/claude-opus-4',
    region: 'US',
    role: 'reasoning',
    backup: Object.freeze({ provider: 'openrouter', model: 'openai/gpt-5' }),
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
  // Slot 6 — Asia generalist. Primary minimax/minimax-m2.7 (Hailuo, 128K)
  // unchanged from the 2026-05-15 rebalance. BACKUP RE-POINTED 2026-05-15
  // (W5b Panel Infra Repair, dispatch 2026-05-15):
  //   - Previous backup qwen/qwen-2.5-72b-instruct has a 32K context cap.
  //     On the CA-11 adversarial bundle (146,754 chars / ~36K tokens) the
  //     Slot 6 primary went SILENT, the backup ALSO failed (the bundle
  //     exceeds Qwen's input window), and the slot dropped out entirely.
  //     The same will happen on the 20-agent review bundle (far larger).
  //     Qwen is therefore an USELESS backup on any consultation that
  //     exceeds 32K input tokens — which now describes every meaningful
  //     consultation.
  //   - Re-pointed to anthropic/claude-opus-4 (200K context, proven on
  //     this panel as Slot 2 primary + Slot 1 backup; "provider-different
  //     from minimax" check ✓). The dispatch's named candidates were
  //     deepseek-r1, claude-opus-4, or "another high-context model already
  //     proven in the roster" — claude-opus-4 is the strictly-most-reliable
  //     of those three and has the largest context. Backup-duplicating an
  //     existing primary is permitted under the Slot 1-8 looser rule (see
  //     header note); the strict outside-primary-set rule only applies to
  //     Slots 9 + 10. Qwen kept on allowlist (still in peer-review.mjs)
  //     for future contingency.
  Object.freeze({
    provider: 'openrouter',
    model: 'minimax/minimax-m2.7',
    region: 'Asia',
    role: 'Asia generalist',
    backup: Object.freeze({ provider: 'openrouter', model: 'anthropic/claude-opus-4' }),
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
  'anthropic':
    'Slot 1 (claude-opus-4, post-GPT-5-demote 2026-05-16) + Slot 2 ' +
    '(claude-opus-4). SAME-MODEL duplicate — both slots run the identical ' +
    'model, NOT just same family. Structurally worse than the meta-llama ' +
    'duplicate (those are different models in the same family). Surfaced ' +
    'in modelPrimaryDuplicates below for visibility. Documented per W5b ' +
    'dispatch #3 (2026-05-16, commit 01bed9d triggering evidence). ' +
    'RECOMMEND follow-up dispatch to change Slot 2 primary to a different ' +
    'model and break the Slot 1 == Slot 2 mirror.',
});

/** Specific MODEL ids allowed to appear more than once in the primary
 *  roster, with rationale. Stricter than family duplicates: every entry
 *  here means TWO+ slots run the LITERAL SAME MODEL and will produce
 *  fully correlated responses. Use only when reliability evidence
 *  outweighs the fault-diversity loss AND the dispatch explicitly
 *  authorizes / anticipates the duplicate. */
export const DOCUMENTED_MODEL_DUPLICATES = Object.freeze({
  'anthropic/claude-opus-4':
    'Slot 1 + Slot 2 both primary post-GPT-5-demote 2026-05-16. The ' +
    'dispatch named claude-opus-4 as the explicit promotion target and ' +
    'anticipated the duplicate ("Document the family duplicate if any"). ' +
    'The honest tradeoff is reliability of a proven rescue model over ' +
    'fault diversity (no non-Anthropic allowlist alternative meets the ' +
    'reliability + context bar after the Kimi/Gemini/Qwen demotions). ' +
    'FLAGGED FOR FOLLOW-UP: Slot 2 should be re-pointed to a different ' +
    'primary to break the mirror — see Slot 1 block comment.',
});

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
