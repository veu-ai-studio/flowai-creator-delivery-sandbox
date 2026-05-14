# W6 — Dedicated Panel Workstream Operating Brief
Version: 1.0 | Date: 2026-05-14 | Authority: CEO-Accepted (W03 proposal)

PURPOSE: W6 is the dedicated workstream for all FlowAI Panel consultations. No Panel consultation runs outside W6. No other workstream runs Panel consultations.

SCOPE:
- Execute all Panel consultations via scripts/panel/run-panel-consultation.mjs
- Maintain Panel infrastructure (adapters, slot health, retry logic)
- Save all consultation outputs to docs/panel-consultations/
- Commit all outputs to flowai-v0.1
- Report results to W0x for CEO review

PANEL COMPOSITION (rebalanced 2026-05-14): 10 slots. Quorum: 7 of 10. Supermajority: 8 of 10. Every primary slot has a provider-different backup adapter declared in `scripts/panel/slot-config.mjs`; backups fire automatically when a primary returns DEGRADED. Composition rationale + per-slot model selection: `docs/panel-consultations/PANEL_COMPOSITION_REBALANCE_2026-05-14.md`.

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
| 9 | qwen | `qwen/qwen-2.5-coder-32b-instruct` | Asia (developer/builder) | developer/builder AI | `mistralai/mistral-large-2411` |
| 10 | openai | `openai/gpt-4o` | US | fast generalist | `anthropic/claude-opus-4` |

Provider counts (≤2 cap per CEO directive): OpenAI=2, Anthropic=1, Google=1, Mistral=1, Cohere=1, Qwen=2, DeepSeek=1, Perplexity=1. Eight distinct providers across ten slots. Geographic coverage: 4 US + 1 US-web-grounded + 2 Europe + 3 Asia.

STANDING RULES:
- Every consultation must receive full CANONICAL_REFERENCE.md as context
- Sessions without SSOT attached are invalid and must be re-run
- Panel consensus grants write-authority to propose SSOT amendments (CA-n cycle)
- W0x dispatches. W6 executes. CEO approves.
