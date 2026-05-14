// scripts/panel/slot-config.mjs
//
// SINGLE SOURCE OF TRUTH for FlowAI's Panel slot composition.
// Rebalanced 2026-05-14 per CEO directive: ≤2 slots per AI provider,
// include OpenAI / Anthropic / Google / Mistral or Cohere (European) /
// Qwen or Yi (Asian) / DeepSeek / Perplexity, plus developer/builder AI.
//
// Every primary slot declares a provider-different backup so a single
// vendor outage cannot blackbox the Panel. The Panel runner in
// scripts/lib/peer-review.mjs reads the `backup` field on primary failure
// and re-issues against the backup model — the slot's recorded result
// reflects which model actually answered, with `backup_fired: true` set
// on the reviewer envelope when the backup ran. No double-counting:
// the slot returns ONE result, not two.
//
// Provider diversity audit:
//   OpenAI:     2 (slots 1 + 10)   at-limit
//   Anthropic:  1 (slot 2)
//   Google:     1 (slot 3)
//   Mistral:    1 (slot 4)         European frontier
//   Cohere:     1 (slot 5)         European/Canadian
//   Qwen:       2 (slots 6 + 9)    at-limit; covers Asia generalist + Asia developer/builder
//   DeepSeek:   1 (slot 7)         Asia reasoning
//   Perplexity: 1 (slot 8)         US web-grounded
//
// Regional coverage: 4 US + 1 US-web-grounded + 2 Europe + 3 Asia = 10/10.
//
// Developer/builder coverage: slot 9 (qwen/qwen-2.5-coder-32b-instruct).
//   Codestral (CEO's first-choice) is unavailable on OpenRouter at probe
//   time 2026-05-14 (mistralai/codestral-2501 → 404). Qwen Coder is the
//   "or equivalent" substitute per dispatch wording. GitHub Copilot has
//   no public LLM API equivalent — see PANEL_COMPOSITION_REBALANCE_
//   2026-05-14.md for the Copilot blocker discussion.
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
  // Slot 9 — Developer/builder AI (Qwen Coder — Codestral substitute)
  Object.freeze({
    provider: 'openrouter',
    model: 'qwen/qwen-2.5-coder-32b-instruct',
    region: 'Asia/dev',
    role: 'developer/builder AI',
    backup: Object.freeze({ provider: 'openrouter', model: 'mistralai/mistral-large-2411' }),
  }),
  // Slot 10 — US fast generalist (web-search-friendly default)
  Object.freeze({
    provider: 'openrouter',
    model: 'openai/gpt-4o',
    region: 'US',
    role: 'fast generalist',
    backup: Object.freeze({ provider: 'openrouter', model: 'anthropic/claude-opus-4' }),
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
