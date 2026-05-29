# Panel Composition Rebalance — 2026-05-14

**Lineage:** CEO directive → W03 → W5b dispatch executed 2026-05-14. Production Hardening Phase 1.5 (Panel diversity).

**Read-only model selection rationale.** No Panel consultation was run to produce this document; it captures the W5b implementation choices behind the rebalance + the empirical OpenRouter availability probes that informed which models landed in each slot. Authority to ratify the composition as canonical sits with W6 + CEO disposition per MG2.

## Directive

CEO 2026-05-14: redesign the Panel to remove bias, increase global diversity, and add developer/builder coverage. Specifically:

1. **≤2 slots per AI provider** — no single vendor can dominate the matrix.
2. **Include**: OpenAI, Anthropic, Google, Mistral or Cohere (European), Qwen or Yi (Asian), DeepSeek, Perplexity.
3. **Include developer/builder AIs**: GitHub Copilot, Codestral, or equivalent.
4. **Backup adapter for each primary slot** — provider-different from primary.
5. **No double-counting** when backup fires.

## Final composition

| Slot | Provider | Model | Region | Role | Backup |
|---|---|---|---|---|---|
| 1 | openai | `openai/gpt-5` | US | frontier reasoning | `anthropic/claude-opus-4` |
| 2 | anthropic | `anthropic/claude-opus-4` | US | reasoning | `openai/gpt-5` |
| 3 | google | `google/gemini-2.5-pro` | US | frontier multimodal | `mistralai/mistral-large-2411` |
| 4 | mistral | `mistralai/mistral-large-2411` | Europe | European frontier | `cohere/command-r-plus-08-2024` |
| 5 | cohere | `cohere/command-r-plus-08-2024` | Europe/CA | European RAG-tuned | `mistralai/mistral-large-2411` |
| 6 | qwen | `qwen/qwen-2.5-72b-instruct` | Asia | Asia generalist | `deepseek/deepseek-r1` |
| 7 | deepseek | `deepseek/deepseek-r1` | Asia | Asia reasoning | `qwen/qwen-2.5-72b-instruct` |
| 8 | perplexity | `perplexity/sonar` | US web-grounded | web-grounded research | `google/gemini-2.5-pro` |
| 9 | qwen | `qwen/qwen-2.5-coder-32b-instruct` | Asia/dev | developer/builder AI | `mistralai/mistral-large-2411` |
| 10 | openai | `openai/gpt-4o` | US | fast generalist | `anthropic/claude-opus-4` |

Provider distribution: **OpenAI 2, Anthropic 1, Google 1, Mistral 1, Cohere 1, Qwen 2, DeepSeek 1, Perplexity 1**. Eight distinct providers across ten slots; cap of 2 honored. Every backup is from a different provider family than its primary.

## Per-slot rationale

### Slot 1 — `openai/gpt-5` (US, frontier reasoning)
The strongest single-model reasoner currently available on OpenRouter. Retained from prior composition. Backup is Anthropic's frontier model — cross-family fallback that won't share an OpenAI outage.

### Slot 2 — `anthropic/claude-opus-4` (US, reasoning)
Independently-trained reasoner with different RLHF lineage than GPT-5. Pairs with Slot 1 for non-correlated US-frontier coverage. Backup is GPT-5 — the other US frontier reasoner.

### Slot 3 — `google/gemini-2.5-pro` (US, frontier multimodal)
Google family for vendor diversity at the US-frontier tier. Multimodal capability is a side benefit (smoke + most consultations are text-only today, but consultations involving screenshots — e.g. UI audit dispatches — will route here). Backup is Mistral Large for cross-continental diversity.

### Slot 4 — `mistralai/mistral-large-2411` (Europe, French frontier)
Primary European representative. Mistral is the only European frontier-tier lab with consistent OpenRouter availability and meaningful capability. Retained from the prior composition. Backup is Cohere — the other Europe-anchored provider.

### Slot 5 — `cohere/command-r-plus-08-2024` (Europe/Canada, RAG-tuned)
Second European-anchored slot, satisfying the "Mistral OR Cohere (European)" directive by including both. Command R+ is explicitly RAG-tuned — strong on factual retrieval and citation-heavy reasoning, complementing Mistral's open-ended generation. Cohere is HQ Toronto with significant UK presence; counted as Europe/CA. Backup is Mistral Large.

**Probe note:** `cohere/command-r-plus` returned 404 from OpenRouter on 2026-05-14. The dated variant `cohere/command-r-plus-08-2024` is the live slug.

### Slot 6 — `qwen/qwen-2.5-72b-instruct` (Asia generalist)
Alibaba's general-purpose 72B model. Asia primary. Strong Chinese-language coverage + competitive English performance. Retained from prior composition. Backup is DeepSeek-R1 (the other major Asia provider).

### Slot 7 — `deepseek/deepseek-r1` (Asia reasoning)
DeepSeek's reasoning-tuned R1. Different lab + training-corpus than Qwen — genuine triangulation diversity within Asia. Retained from prior composition. Backup is Qwen-72B.

### Slot 8 — `perplexity/sonar` (US, web-grounded)
NEW slot. Perplexity's Sonar is the only Panel reviewer with live web-search grounding. Adds a fundamentally different reasoning mode (citations from current web pages) to the matrix. Backup is Gemini Pro (closest Panel-resident model with Google's first-party web integration via search APIs, even if not as natively grounded).

**Probe note:** `perplexity/llama-3.1-sonar-large-128k-online` returned 404 from OpenRouter on 2026-05-14. The current canonical slug is `perplexity/sonar`.

### Slot 9 — `qwen/qwen-2.5-coder-32b-instruct` (Asia, developer/builder AI)
NEW slot. CEO directive named Codestral or GitHub Copilot as the developer/builder AI. Empirical findings:

- **Codestral (`mistralai/codestral-2501`, `mistralai/codestral-latest`)**: both returned **404 from OpenRouter** on 2026-05-14. Not currently routable through our Panel infrastructure.
- **GitHub Copilot**: no public LLM API equivalent. Copilot is consumed via IDE extensions only; the closest OpenRouter exposure is via the broader GitHub Models surface (`GITHUB_MODELS_PAT` already in Doppler), but that surface had an 8K token-cap limit that retired it from Slots 6/7 earlier this month (commit `32cd109`).
- **Qwen-2.5-Coder-32b** (`qwen/qwen-2.5-coder-32b-instruct`): **OK at probe** (355 ms, valid response).

Qwen Coder is the "or equivalent" substitute. It is a purpose-built code model trained on a large corpus of programming languages and code-completion patterns, with strong benchmark performance on HumanEval / MBPP / LiveCodeBench. Adds developer/builder coverage **and** preserves Asian provider diversity. Backup is Mistral Large (Mistral's generalist model, since Codestral is unavailable as a routable backup).

### Slot 10 — `openai/gpt-4o` (US, fast generalist)
OpenAI's fast generalist. Retained from prior composition (was the Slot 10 web-grounded role; that role has moved to Slot 8 Perplexity). The remaining function — fast first-pass summarization + reliable JSON-envelope production — is what gpt-4o does best. Counts as the second OpenAI slot (at the ≤2-per-provider cap). Backup is Claude Opus.

## Changes from prior composition (commit `9143f82`)

| Action | Slot | From | To | Reason |
|---|---|---|---|---|
| Removed | (Slot 5 prior) | `vercel_v0` / `v0-1.5-md` | `cohere/command-r-plus-08-2024` | v0 frequently 429-throttled; replaced with a second European-anchored slot for provider diversity + reliability. |
| Removed | (Slot 8 prior) | `meta-llama/llama-3.3-70b-instruct` | `perplexity/sonar` | Llama is US-anchored (Meta); replaced with the directive's Perplexity slot to add web-grounded research mode. |
| Added | Slot 5 | (n/a) | `cohere/command-r-plus-08-2024` | Second European representative per directive. |
| Added | Slot 8 | (n/a) | `perplexity/sonar` | Web-grounded research mode per directive. |
| Added | Slot 9 | (n/a) | `qwen/qwen-2.5-coder-32b-instruct` | Developer/builder AI per directive. |
| Pinned | Slots 1, 2, 3, 4, 6, 7, 10 | (same) | (same) | Provider coverage already correct for these slots. |
| Pinned | All 10 | (no backup declared) | per-slot `backup` field in `scripts/panel/slot-config.mjs` | Every primary now has a provider-different backup. |

OpenAI provider count: was **3** (slots 1, 2, 10 prior), now **2** (slots 1, 10). Mistral count: was 1, now 1 (no change despite slot reshuffling).

## Backup-firing semantics ("no double-counting")

`scripts/panel/run-panel-consultation.mjs` `runPanelConsultationWithBackups()` is the single layer that fires backups. Flow:

1. **Primary pass**: every slot called once with its declared `{provider, model}`. Each returns a degraded boolean (true on timeout, error, non-2xx, or unparseable JSON).
2. **Backup pass**: for every degraded slot whose `slot-config.mjs[i].backup` is declared (currently all 10 slots have one), the backup is fired with a longer timeout budget (`BACKUP_RETRY_TIMEOUT_MS = 90s` vs `DEFAULT_PER_REVIEWER_TIMEOUT_MS = 60s` primary).
3. **Result**: the slot returns **one** envelope. If the primary succeeded, that envelope is the primary's result. If the primary failed and the backup succeeded, the envelope is the backup's result, marked `slot_backup_applied: true` with the original primary's provider/model/error preserved as `primary_slot_provider` / `primary_slot_model` / `primary_slot_error` for audit.
4. **If both fail**, the primary's degraded envelope is returned unchanged. The slot counts as degraded in the LIVE-OK tally.

The synthesizer (`synthesizeReviewers` in `scripts/lib/peer-review.mjs`) reads `reviewers[i].findings` ONCE per slot — there is no path by which a slot's vote is counted twice.

## Allowlist updates

`scripts/lib/peer-review.mjs` `ALLOWED_MODELS` set extended with three new model slugs:

```
'cohere/command-r-plus-08-2024'
'perplexity/sonar'
'qwen/qwen-2.5-coder-32b-instruct'
```

Existing entries retained (no allowlist removals — backups for slots 1–4, 6, 7, 10 all reference models already on the allowlist).

## Probe evidence (verbatim from W5b probe, 2026-05-14T19:32Z)

```
cohere/command-r-plus                                      FAIL   337ms  No endpoints found for cohere/command-r-plus.
cohere/command-r-plus-08-2024                              OK     1716ms "I'm sorry,"
perplexity/llama-3.1-sonar-large-128k-online               FAIL   61ms   No endpoints found for perplexity/llama-3.1-sonar-large-128k-online.
perplexity/sonar                                           OK     3245ms "# Ping"
mistralai/codestral-2501                                   FAIL   59ms   No endpoints found for mistralai/codestral-2501.
mistralai/codestral-latest                                 FAIL   47ms   mistralai/codestral-latest is not a valid model ID
deepseek/deepseek-coder                                    FAIL   172ms  deepseek/deepseek-coder is not a valid model ID
qwen/qwen-2.5-coder-32b-instruct                           OK     355ms  "Pong! How"
```

Three candidates were dropped due to OpenRouter unavailability (Codestral, deepseek-coder, perplexity sonar large 128k online). Substitutes were chosen from the same family where possible; the directive's "or equivalent" clause covers the Qwen-Coder substitution for Codestral.

## Blockers + follow-up

### GitHub Copilot adapter access

CEO directive named **GitHub Copilot** as a desired developer/builder AI. Status:

- **No public Copilot LLM API exists.** GitHub Copilot is consumed via IDE extensions (VS Code, JetBrains, etc.) and the GitHub.com web Copilot Chat surface. There is no `https://api.github.com/copilot/chat/completions` analog.
- **GitHub Models** (`models.github.ai/inference`) offers a curated set of models including Codestral, but the free-tier 8K token cap retired this surface from Slots 6/7 at commit `32cd109`. Re-enabling it would require either a paid GitHub Models plan or bundling discipline (SSOT context bundles exceed 8K tokens).
- **Workaround chosen**: substitute Qwen Coder 32B for the developer/builder slot. It is a purpose-built code model, available on OpenRouter without a token cap, and benchmarks competitively with Codestral on coding tasks.

If CEO wants Copilot specifically (not "or equivalent"), the follow-up dispatch should either:
1. Negotiate paid GitHub Models access for the API surface that includes Copilot-family models with extended token limits, **or**
2. Build a headless adapter against the GitHub.com Copilot Chat web surface (parallel to the archived Lovable/Replit headless adapters, with the same Cloudflare-WAF + Playwright-fingerprint risks).

Neither workaround is in scope for this dispatch.

### Backup runtime exercise

The `runPanelConsultationWithBackups` wrapper has been firing backups since W5a's initial implementation (slots 5 + 7 only). This rebalance expands coverage to all 10 slots by reading `slot-config.mjs[i].backup`. **First real test**: this dispatch's smoke run (see report-back commit's stdout log).

### Codestral monitoring

If Codestral becomes available on OpenRouter in a future month (slug change, new endpoint), Slot 9 should switch from Qwen Coder to Codestral to honor the original CEO directive verbatim. This is a one-line change in `scripts/panel/slot-config.mjs` once the slug is published.

---

*Generated 2026-05-14 by W5b under W03 dispatch. Read-only model selection rationale. Smoke + commit landed in the same dispatch chain.*
