# W6 — Dedicated Panel Workstream Operating Brief
Version: 1.0 | Date: 2026-05-14 | Authority: CEO-Accepted (W03 proposal)

PURPOSE: W6 is the dedicated workstream for all FlowAI Panel consultations. No Panel consultation runs outside W6. No other workstream runs Panel consultations.

SCOPE:
- Execute all Panel consultations via scripts/panel/run-panel-consultation.mjs
- Maintain Panel infrastructure (adapters, slot health, retry logic)
- Save all consultation outputs to docs/panel-consultations/
- Commit all outputs to flowai-v0.1
- Report results to W0x for CEO review

PANEL COMPOSITION (rebalanced 2026-05-14 rev-2): 10 slots, **10 unique providers**. Quorum: 7 of 10. Supermajority: 8 of 10. Every primary slot has a provider-different backup adapter declared in `scripts/panel/slot-config.mjs`; backups fire automatically when a primary returns DEGRADED. **Lineage:** prior rev-1 at commit `50a7928` had OpenAI×2 + Qwen×2 duplicates; rev-2 (this entry) replaces Slot 9 with Moonshot Kimi K2.6 and Slot 10 with xAI Grok 4.3 to achieve 10-unique-providers. Composition rationale: `docs/panel-consultations/PANEL_COMPOSITION_DUPLICATE_REMOVAL_2026-05-14.md`.

| Slot | Provider | Model | Region | Role | Backup (provider-different) |
|---|---|---|---|---|---|
| 1 | openai | `openai/gpt-5` | US | frontier reasoning | `anthropic/claude-opus-4` |
| 2 | anthropic | `anthropic/claude-opus-4` | US | reasoning | `openai/gpt-5` |
| 3 | google | `google/gemini-2.5-pro` | US | frontier multimodal | `mistralai/mistral-large-2411` |
| 4 | mistral | `mistralai/mistral-large-2411` | Europe | European frontier | `cohere/command-r-plus-08-2024` |
| 5 | cohere | `cohere/command-r-plus-08-2024` | Europe/CA | European RAG-tuned | `mistralai/mistral-large-2411` |
| 6 | qwen | `qwen/qwen-2.5-72b-instruct` | Asia | Asia generalist | `deepseek/deepseek-r1` |
| 7 | deepseek | `deepseek/deepseek-r1` | Asia | Asia reasoning | `qwen/qwen-2.5-72b-instruct` |
| 8 | perplexity | `perplexity/sonar` | US (web-grounded) | web-grounded research | `google/gemini-2.5-pro` |
| 9 | moonshotai | `moonshotai/kimi-k2.6` | Asia (Beijing) | frontier coding + agentic | `meta-llama/llama-4-maverick` |
| 10 | x-ai | `x-ai/grok-4.3` | US | real-time web-aware reasoning | `minimax/minimax-m2.7` |

Provider audit (rev-2): OpenAI=1, Anthropic=1, Google=1, Mistral=1, Cohere=1, Qwen=1, DeepSeek=1, Perplexity=1, Moonshot=1, xAI=1. **Max per provider: 1**. **10 unique providers across 10 slots.** Geographic coverage: 3 US + 1 US-web-grounded + 1 US-web-aware + 2 Europe + 3 Asia (6 distinct regions).

STANDING RULES:
- Every consultation must receive full CANONICAL_REFERENCE.md as context
- Sessions without SSOT attached are invalid and must be re-run
- Panel consensus grants write-authority to propose SSOT amendments (CA-n cycle)
- W0x dispatches. W6 executes. CEO approves.
