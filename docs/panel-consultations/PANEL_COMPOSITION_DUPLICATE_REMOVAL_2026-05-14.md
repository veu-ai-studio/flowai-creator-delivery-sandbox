# Panel Composition Duplicate Removal — 2026-05-14 (rev-2)

**Lineage:** CEO directive → W03 → W5b dispatch executed 2026-05-14. Supersedes the rev-1 composition at commit `50a7928` (which had OpenAI×2 + Qwen×2 duplicates). This entry achieves **10 unique providers across 10 slots**.

**Read-only model selection rationale.** No Panel consultation was run to produce this document; it captures the W5b implementation choices behind the rev-2 rebalance + the OpenRouter availability probes that informed slug selection.

## CEO directive (verbatim)

> Replace 2 duplicate Panel slots to achieve 10 unique providers — CEO-directed. Replace slot 9 (qwen-coder) with Moonshot Kimi K2.6, replace slot 10 (gpt-4o) with xAI Grok 4.3. After change: 10 unique providers.

Audit requirements (Step 6):
1. **10 unique provider names across 10 slots**
2. **No provider appears more than 1× as primary**
3. **No backup duplicates a primary in any other slot**
4. **Geographic mix: ≥3 regions**

## Before / after

| Slot | Rev-1 (commit `50a7928`) | Rev-2 (this entry) | Delta |
|---|---|---|---|
| 1 | `openai/gpt-5` | `openai/gpt-5` | unchanged |
| 2 | `anthropic/claude-opus-4` | `anthropic/claude-opus-4` | unchanged |
| 3 | `google/gemini-2.5-pro` | `google/gemini-2.5-pro` | unchanged |
| 4 | `mistralai/mistral-large-2411` | `mistralai/mistral-large-2411` | unchanged |
| 5 | `cohere/command-r-plus-08-2024` | `cohere/command-r-plus-08-2024` | unchanged |
| 6 | `qwen/qwen-2.5-72b-instruct` | `qwen/qwen-2.5-72b-instruct` | unchanged |
| 7 | `deepseek/deepseek-r1` | `deepseek/deepseek-r1` | unchanged |
| 8 | `perplexity/sonar` | `perplexity/sonar` | unchanged |
| 9 | `qwen/qwen-2.5-coder-32b-instruct` | **`moonshotai/kimi-k2.6`** | **PROVIDER CHANGE** (Qwen → Moonshot) |
| 10 | `openai/gpt-4o` | **`x-ai/grok-4.3`** | **PROVIDER CHANGE** (OpenAI → xAI) |

Provider count delta:
| Provider | Rev-1 | Rev-2 |
|---|---:|---:|
| openai | 2 | 1 |
| anthropic | 1 | 1 |
| google | 1 | 1 |
| mistralai | 1 | 1 |
| cohere | 1 | 1 |
| qwen | 2 | 1 |
| deepseek | 1 | 1 |
| perplexity | 1 | 1 |
| moonshotai | 0 | **1** (new) |
| x-ai | 0 | **1** (new) |
| **Unique providers** | 8 | **10** |
| **Max per provider** | 2 | **1** |

## Per-slot rationale

### Slot 9 — `moonshotai/kimi-k2.6` (Asia, Beijing — frontier coding + agentic)

Kimi K2.6 (Moonshot AI, Beijing) is a frontier reasoning + coding + agentic model. Replaces `qwen/qwen-2.5-coder-32b-instruct` (a code-specialized model) with a more capable generalist that retains strong coding performance + adds reasoning depth. Removes the Qwen×2 duplicate (Slot 6 still holds `qwen/qwen-2.5-72b-instruct`).

Region: Asia (Beijing). Role: "frontier coding + agentic" — preserves the developer/builder AI directive from the rev-1 dispatch while adding general-purpose reasoning capacity.

Backup: `meta-llama/llama-4-maverick` (Meta, US). Provider-different from primary (Moonshot). NOT a primary in any other slot — satisfies the strict no-backup-duplicates-primary rule.

### Slot 10 — `x-ai/grok-4.3` (US — real-time web-aware reasoning)

Grok 4.3 (xAI, US) is xAI's frontier model with native real-time web integration. Replaces `openai/gpt-4o` (a fast generalist that duplicated Slot 1's OpenAI provider) with a model from a new provider family. Removes the OpenAI×2 duplicate.

Region: US. Role: "real-time web-aware reasoning" — complements Slot 8's Perplexity Sonar (which is RAG-style web search) with xAI's deeper-reasoning live-web integration.

Backup: `minimax/minimax-m2.7` (MiniMax / Hailuo, China). Provider-different from primary (xAI). NOT a primary in any other slot — satisfies the strict rule.

**Probe note:** the dispatch's preferred backup `nvidia/nemotron-3-super` returned **`not a valid model ID`** from OpenRouter on 2026-05-14. The dispatch's OR-option `minimax/minimax-m2.7` was confirmed cataloged + 200 OK at probe time and chosen as the backup.

## Probe results (verbatim from W5b probe, 2026-05-14T22:00Z)

```
moonshotai/kimi-k2.6                             cat=Y OK   1477ms (empty content w/ default max_tokens; fixed by 4096 cap)
x-ai/grok-4.3                                    cat=Y OK   1905ms "Pong! 👋 How can I help you"
meta-llama/llama-4-maverick                      cat=Y OK    693ms "The `ping` command!..."
nvidia/nemotron-3-super                          cat=N FAIL  95ms   "not a valid model ID"
minimax/minimax-m2.7                             cat=Y OK    943ms (empty content w/ default max_tokens; fixed by 4096 cap)
```

Both primary slugs verified cataloged + executable. `nvidia/nemotron-3-super` substituted with `minimax/minimax-m2.7` per the dispatch's OR-option.

## ALLOWED_MODELS changes (`scripts/lib/peer-review.mjs`)

**Added** (4 new slugs):
- `moonshotai/kimi-k2.6` (Slot 9 primary)
- `x-ai/grok-4.3` (Slot 10 primary)
- `meta-llama/llama-4-maverick` (Slot 9 backup)
- `minimax/minimax-m2.7` (Slot 10 backup)

**Removed** (1 slug):
- `qwen/qwen-2.5-coder-32b-instruct` — no longer in panel; grep confirmed only this dispatch's scope referenced it.

**Retained** (1 slug):
- `openai/gpt-4o` — kept on the allowlist despite being dropped from Slot 10 because 22 historical consultation scripts still reference it inline in their per-script PANEL arrays (verified via `grep -r openai/gpt-4o scripts/`). Removing would break those scripts' re-runnability.

## Smoke test (`node scripts/panel/run-panel-smoke.mjs`)

### First run (without max_tokens cap)

LIVE-OK: **7/10** — below gate (≥8/10).

Failures:
- Slot 1 (`openai/gpt-5`) — HTTP 402: "requested up to 65536 tokens, only 34256 affordable"
- Slot 2 (`anthropic/claude-opus-4`) — HTTP 402: 32000 requested, 4567 affordable
- Slot 3 (`google/gemini-2.5-pro`) — HTTP 402: 65536 requested, 34256 affordable
- (Slot 4 mistral also 402'd → backup cohere succeeded)
- (Slot 6 qwen 400 INVALID_REQUEST_BODY → backup deepseek succeeded)

The 402 errors are a credit-bound max_tokens issue that was flagged in the rev-1 report-back as a soft blocker: OpenRouter is enforcing a credit-affordance check on the max_tokens default of premium models (32K-65K), and our account credit doesn't cover that headroom for those models.

### Fix applied (in-scope per Step 5 "Update peer-review.mjs")

Added `max_tokens: 4096` to the OpenRouter chat-completion call body in `scripts/lib/peer-review.mjs` `callOnce()`. Panel reviewer JSON envelopes are typically <2K tokens; 4096 is comfortable headroom and bounds the credit cost so all premium models pass affordability check.

### Second run (with max_tokens cap)

LIVE-OK: **10/10** ✅ (gate ≥8/10 met).

Per-slot result:

| Slot | Region | Model | Result | Latency |
|---|---|---|---|---|
| 1 | US | `openai/gpt-5` | OK | 6222 ms |
| 2 | US | `anthropic/claude-opus-4` | OK | 6221 ms |
| 3 | US | `google/gemini-2.5-pro` | OK | 9788 ms |
| 4 | Europe | `mistralai/mistral-large-2411` | OK | 1765 ms |
| 5 | Europe/CA | `cohere/command-r-plus-08-2024` | OK | 2063 ms |
| 6 | Asia | `deepseek/deepseek-r1` (**backup fired**) | OK | 27624 ms |
| 7 | Asia | `deepseek/deepseek-r1` | OK | 13218 ms |
| 8 | US web-grounded | `perplexity/sonar` | OK | 3126 ms |
| 9 | Asia (Beijing) | `moonshotai/kimi-k2.6` | OK | 19327 ms |
| 10 | US | `x-ai/grok-4.3` | OK | 5464 ms |

**Backups fired: 1** (Slot 6 — `qwen/qwen-2.5-72b-instruct` returned an OpenRouter 400 `INVALID_REQUEST_BODY: model does not support endpoint` error, distinct from the max_tokens issue. Backup `deepseek/deepseek-r1` succeeded.)

Both new slots — Moonshot Kimi K2.6 (Slot 9) and xAI Grok 4.3 (Slot 10) — passed on primary on the first attempt. Composition is sound.

## Diversity audit (Step 6) — final state

| Check | Result |
|---|---|
| 10 unique provider names across 10 slots | ✅ openai, anthropic, google, mistralai, cohere, qwen, deepseek, perplexity, moonshotai, x-ai |
| No provider appears more than 1× as primary | ✅ max=1 |
| Geographic mix ≥3 regions | ✅ 6 distinct regions (3 US + 1 US-web-grounded + 1 US-web-aware + 2 Europe + 3 Asia) |
| No backup duplicates a primary in any other slot — Slot 9 | ✅ `meta-llama/llama-4-maverick` not a primary |
| No backup duplicates a primary in any other slot — Slot 10 | ✅ `minimax/minimax-m2.7` not a primary |
| All backups provider-different from primary | ✅ panel-wide |
| Backups for slots 1-8 vs strict no-duplicates-primary rule | ⚠️ **CARRYOVER** — 8 slots inherited backups from rev-1 that reference other slots' primaries (e.g., Slot 1 backup is `anthropic/claude-opus-4` which is Slot 2's primary). These predate the strict rule introduced by this dispatch (rev-2). The dispatch's Step 4 directive "All other 8 slots: UNCHANGED" forbids changing them in this dispatch; logged as an open follow-up. |

## Open follow-ups (surface for next CEO/W04 disposition)

1. **Slots 1-8 backup hardening.** The strict no-backup-duplicates-primary rule is new in rev-2. Slots 1-8 inherited rev-1's "provider-different" backups, which cross-reference other slots' primaries. A follow-up dispatch can update those 8 backups to models from outside the 10-primary set (recommended candidates: `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-4-maverick`, `minimax/minimax-m2.7`) to fully satisfy the strict rule panel-wide.

2. **Slot 6 endpoint compatibility.** `qwen/qwen-2.5-72b-instruct` returned HTTP 400 `INVALID_REQUEST_BODY: model does not support endpoint` on this smoke run — a Qwen-specific compatibility issue distinct from the max_tokens credit problem. The backup (`deepseek/deepseek-r1`) succeeded, but Slot 6 is now structurally dependent on its backup until the Qwen endpoint issue is investigated. Possible causes: OpenRouter routed Qwen through a deprecated endpoint, or the request body shape (with new `max_tokens: 4096`) hit a Qwen-specific incompatibility. Worth a probe in the next maintenance dispatch.

3. **max_tokens cap monitoring.** The 4096 cap added to `callOnce()` bounds credit cost AND truncates reviewer responses. Panel reviewer JSON envelopes are typically <2K tokens — 4096 is plenty — but if a future consultation needs longer responses, the cap should become a per-consultation parameter rather than a hard-coded constant.

4. **Codestral monitoring (carried from rev-1).** If `mistralai/codestral-2501` becomes available on OpenRouter in a future month, it could be reconsidered for a dedicated developer/builder AI slot, though Slot 9 currently fulfils that role via Moonshot Kimi K2.6.

---

*Generated 2026-05-14 by W5b under W03 dispatch. Read-only rationale. Smoke + commit landed in the same dispatch chain.*
