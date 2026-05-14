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
  // Slot 1 — US frontier reasoning
  Object.freeze({
    provider: 'openrouter',
    model: 'openai/gpt-5',
    region: 'US',
    role: 'frontier reasoning',
    backup: Object.freeze({ provider: 'openrouter', model: 'anthropic/claude-opus-4' }),
  }),
  // Slot 2 — US reasoning (different family from slot 1)
  Object.freeze({
    provider: 'openrouter',
    model: 'anthropic/claude-opus-4',
    region: 'US',
    role: 'reasoning',
    backup: Object.freeze({ provider: 'openrouter', model: 'openai/gpt-5' }),
  }),
  // Slot 3 — US frontier (Google family)
  Object.freeze({
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro',
    region: 'US',
    role: 'frontier multimodal',
    backup: Object.freeze({ provider: 'openrouter', model: 'mistralai/mistral-large-2411' }),
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
  // Slot 6 — Asia generalist (Alibaba Qwen)
  Object.freeze({
    provider: 'openrouter',
    model: 'qwen/qwen-2.5-72b-instruct',
    region: 'Asia',
    role: 'Asia generalist',
    backup: Object.freeze({ provider: 'openrouter', model: 'deepseek/deepseek-r1' }),
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
  // Slot 9 — Moonshot Kimi K2.6 (Asia frontier coding + agentic).
  // Replaces qwen/qwen-2.5-coder-32b-instruct (2026-05-14 rev-2) to
  // remove the Qwen×2 provider duplicate. Backup llama-4-maverick is
  // NOT a primary in any other slot — satisfies the strict
  // no-backup-duplicates-primary rule.
  Object.freeze({
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.6',
    region: 'Asia (Beijing)',
    role: 'frontier coding + agentic',
    backup: Object.freeze({ provider: 'openrouter', model: 'meta-llama/llama-4-maverick' }),
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

/** Provider-count audit. Useful for self-tests + the W6 brief.
 *  Returns { providerCounts: { openai: 2, anthropic: 1, ... },
 *            maxPerProvider: 2, slots: 10 }. */
export function auditDiversity() {
  const counts = {};
  for (const s of SLOT_CONFIG) {
    const family = s.model.split('/')[0];
    counts[family] = (counts[family] || 0) + 1;
  }
  const maxPerProvider = Math.max(...Object.values(counts));
  return { providerCounts: counts, maxPerProvider, slots: SLOT_CONFIG.length };
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
