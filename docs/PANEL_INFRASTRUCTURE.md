# Panel Infrastructure — 10-AI Multi-Reviewer Spec

**Owner:** W5 Code · **Branch:** flowai-v0.1 · **Status:** Draft (no commits this dispatch)
**Related:** `scripts/lib/peer-review.mjs` (multi-AI utility), Locked Rule 5 (multi-AI baseline)

The 10-AI panel mixes three channels:

| Channel | Reach | Used For |
|---|---|---|
| **OpenRouter** | Frontier models via one API key | gpt-5, gpt-4o, gemini-2.5-pro, claude-opus-4 |
| **Direct vendor API** | Vendor-specific models / quotas / SLAs | v0, GitHub Models |
| **Headless browser** | Platforms with no public API | Base44 AI, Replit AI |

Railway exposes no LLM inference endpoint and is **not a panel member**; reviewer-style commentary on Railway-specific topics is handled via web-search-grounded review by an OpenRouter reviewer (see § 3.10).

---

## 1. Panel Composition

| # | Slot | Channel | Model ID | Auth env var | Free-tier? |
|---|------|---------|----------|--------------|------------|
| 1 | `openrouter:openai/gpt-5` | OpenRouter | `openai/gpt-5` | `OPENROUTER_API_KEY` | paid |
| 2 | `openrouter:openai/gpt-4o` | OpenRouter | `openai/gpt-4o` | `OPENROUTER_API_KEY` | paid |
| 3 | `openrouter:google/gemini-2.5-pro` | OpenRouter | `google/gemini-2.5-pro` | `OPENROUTER_API_KEY` | paid |
| 4 | `openrouter:anthropic/claude-opus-4` | OpenRouter | `anthropic/claude-opus-4` | `OPENROUTER_API_KEY` | paid |
| 5 | `vercel_v0:v0-1.5-md` | Direct API | `v0-1.5-md` (panel label); modelConfiguration.modelId from `v0-auto`/`v0-mini`/`v0-pro`/`v0-max`/`v0-max-fast`, else default | `VERCEL_V0_TOKEN` | paid (Premium req'd) |
| 6 | `github_models:openai/gpt-4.1` | Direct API | `openai/gpt-4.1` | `GITHUB_MODELS_PAT` | free w/ Copilot subscription |
| 7 | `github_models:microsoft/Phi-3.5-mini-instruct` | Direct API | `microsoft/Phi-3.5-mini-instruct` (low-tier) | `GITHUB_MODELS_PAT` | free w/ Copilot subscription |
| 8 | `base44_chat` | Headless (Playwright) | Base44 chat assistant | `BASE44_SESSION_PATH` + login | n/a (browser session) |
| 9 | `replit_agent` | Headless (Playwright) | Replit Agent | `REPLIT_SESSION_PATH` + login | n/a (browser session) |
| 10 | `openrouter:openai/gpt-4o` (web-grounded variant) | OpenRouter with explicit web-search prompting | `openai/gpt-4o` | `OPENROUTER_API_KEY` | paid |

> **Slot 10 note.** Originally reserved for Railway-hosted inference; Railway is deployment-only with no LLM API. The slot is therefore allocated to a **second gpt-4o invocation under a web-grounded review brief** — distinct system-prompt mandate (search-the-web-for-the-claim before reviewing). Cheap, fast, and answers the gap that the Railway slot was meant to fill.

---

## 2. Per-platform spec

### 2.1 OpenRouter (slots 1–4 + 10)

- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer ${OPENROUTER_API_KEY}` (read from `.env.openrouter-handoff`)
- **Headers:** `HTTP-Referer`, `X-Title` per OpenRouter analytics convention
- **Request shape:** OpenAI-compatible (`{ model, messages, temperature }`)
- **Rate limits:** vary by model; standard tier ≥ 200 req/min on most frontier models
- **Pricing:** pay-per-token, per OpenRouter pricing page
- **Already wired:** YES (`scripts/lib/peer-review.mjs` runSingle / runMulti paths)

### 2.2 Vercel v0 (slot 5)

- **Status:** **LIVE** (B1 / W5c, 2026-05-11) — smoke test passed (HTTP 200, ~9 s latency, valid summary returned).
- **Endpoint (raw HTTP):** `POST https://api.v0.dev/v1/chats` — **NOT** OpenAI-compatible. The earlier `…/v1/chat/completions` reference in this doc was incorrect and has been corrected.
- **Endpoint (SDK):** `v0-sdk` npm package — `v0.chats.create({ message, system })`
- **Auth:** `Authorization: Bearer ${VERCEL_V0_TOKEN}`
- **Token source:** `https://v0.app/chat/settings/keys` (requires v0 Premium subscription per platform docs)
- **Request shape (verified against v0-sdk `ChatsCreateRequest`):**
  ```json
  {
    "message": "<full user prompt — the artifact-under-review block>",
    "system": "<system / review-criteria prompt>",
    "responseMode": "sync",
    "modelConfiguration": { "modelId": "v0-auto" }
  }
  ```
  `modelConfiguration.modelId` accepts only the new enum: `v0-auto`, `v0-mini`, `v0-pro`, `v0-max`, `v0-max-fast`. The adapter omits the field when the panel entry uses an older marketing ID (e.g. `v0-1.5-md`) so v0 picks its default.
- **Response shape (verified against v0-sdk `ChatDetail`):** `{ id, object: "chat", text, messages, latestVersion: { files: [...] }, files?, demo?, webUrl, apiUrl, … }`. Extraction priority in `extractV0Content()`: `text` → last assistant `messages` entry → joined `latestVersion.files` (or top-level `files`). The W02 assumption of an OpenAI chat-completion envelope (`choices[0].message.content`) was wrong.
- **Model identifiers (legacy labels still used in panel slot keys):** `v0-1.0-md`, `v0-1.5-md`, `v0-1.5-lg` — kept as the panel's stable slot identifier; not sent to the API.
- **Rate limits:** not published; Premium tier req'd for API access
- **Special trait:** trained for React + Tailwind + Next.js generation — strong on UI/scaffolding review angle
- **Required CEO env var:** `VERCEL_V0_TOKEN`
- **Smoke driver:** `scripts/run-slot5-smoke.mjs` (3-line artifact → canonical envelope `{ provider, model, latency_ms, status, content }`).

### 2.3 GitHub Models (slots 6 + 7)

- **Endpoint (new):** `POST https://models.github.ai/inference/chat/completions`
- **Endpoint (legacy Azure-hosted, still functional but being migrated):** `POST https://models.inference.ai.azure.com/chat/completions`
- **Auth:** `Authorization: Bearer ${GITHUB_MODELS_PAT}` — PAT with **`models:read`** scope
- **Required headers (new endpoint):** `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2026-03-10`
- **Token source:** `https://github.com/settings/tokens` (classic or fine-grained PAT)
- **Request shape:** Azure AI Inference / OpenAI-compatible — `{ model, messages, temperature, stream }`
- **Model catalog (subset relevant to the panel):**
  - High-tier: `openai/gpt-4.1`, `openai/gpt-4o`, `microsoft/MAI-DS-R1`, `meta/Meta-Llama-3.1-405B-Instruct`, `mistral-ai/Mistral-Large-2411`
  - Low-tier: `microsoft/Phi-3.5-mini-instruct`, `microsoft/Phi-3-small-8k-instruct`, `meta/Meta-Llama-3.1-8B-Instruct`
  - Embedding: `cohere/Cohere-embed-v3-english`, `openai/text-embedding-3-small`
- **Rate limits (Copilot Free tier):**
  - **Low-tier models:** 15 req/min, 150 req/day
  - **High-tier models:** 10 req/min, 50 req/day
  - **Embedding:** 15 req/min, 150 req/day
- **Pricing:** Free with active GitHub Copilot subscription (or Copilot Free); production use beyond free tier requires Azure account upgrade per Microsoft docs
- **Required CEO env var:** `GITHUB_MODELS_PAT`

### 2.4 Base44 AI (slot 8 — HEADLESS)

- **API status:** No public chat API documented. Base44 docs reference an AI chat in-platform only.
- **Programmatic access:** Headless browser session against the Base44 web UI
- **Login URL:** `https://app.base44.com/` (or whichever Wix-acquired tenant root)
- **Chat surface:** in-editor right-rail chat (selectors will need to be captured by a one-time session-recording pass)
- **Session strategy:** Playwright `storageState` JSON saved to disk; loaded on each invocation
- **Required CEO env vars / paths:**
  - `BASE44_SESSION_PATH` — filesystem path to a saved Playwright storage-state JSON (cookies + localStorage)
  - `BASE44_CHAT_URL` — exact URL to land on a chat session ready to receive a prompt
- **One-time setup:** CEO runs `npx playwright codegen https://app.base44.com/` once, signs in, saves `storageState`. W5 to write the codegen wrapper as a follow-up.

### 2.5 Replit AI / Replit Agent (slot 9 — HEADLESS)

- **API status:** No public external API. Community feature requests open (2025–2026); no ETA.
- **Available primitives:** Replit Extensions API can orchestrate workspace operations but does NOT include programmatic Agent invocation with prompt input.
- **Programmatic access:** Headless browser session against the Replit workspace UI, invoking Agent in Build mode
- **Login URL:** `https://replit.com/login`
- **Chat surface:** Agent panel inside a Repl
- **Required CEO env vars / paths:**
  - `REPLIT_SESSION_PATH` — Playwright storage-state JSON
  - `REPLIT_TARGET_REPL_URL` — exact URL of a stable Repl whose Agent will be used as the reviewer
- **Alternative path:** Replit's **External Access Tokens** (announced 2025) allow trusted services to call private apps — could enable a CEO-built Replit-app reviewer that proxies Agent. Out of scope for this dispatch.

### 2.6 Railway (NOT a panel member)

- **API status:** No LLM inference offering. Railway is a deployment + infrastructure platform.
- **Railway Agent:** internal tool for deployment/ops automation, not inference.
- **Railway MCP server:** allows AI assistants (e.g., Claude Code) to manage Railway resources — input-side, not output-side.
- **Decision:** Skip from panel. Slot 10 reallocated to web-grounded gpt-4o.

---

## 3. Integration architecture (proposed)

### 3.1 peerReview API extension

```js
peerReview({
  artifact, criteria,
  panel: [
    { provider: 'openrouter', model: 'openai/gpt-5' },
    { provider: 'openrouter', model: 'openai/gpt-4o' },
    { provider: 'openrouter', model: 'google/gemini-2.5-pro' },
    { provider: 'openrouter', model: 'anthropic/claude-opus-4' },
    { provider: 'vercel_v0',     model: 'v0-1.5-md' },
    { provider: 'github_models', model: 'openai/gpt-4.1' },
    { provider: 'github_models', model: 'microsoft/Phi-3.5-mini-instruct' },
    { provider: 'headless',      model: 'base44_chat' },
    { provider: 'headless',      model: 'replit_agent' },
    { provider: 'openrouter',    model: 'openai/gpt-4o', system_override: 'WEB_GROUNDED_REVIEWER' },
  ],
  perReviewerTimeoutMs: 240_000,
})
```

Back-compat preserved: `models: [string]` continues to imply `{ provider: 'openrouter', model: string }` for each.

### 3.2 Per-provider adapter contract

Every adapter is an async function with this signature:

```js
async function callReviewer({ provider, model, system, user, timeoutMs, signal }) {
  // returns: { ok: boolean, status?: number, latency_ms: number,
  //           text: string, parsed?: object, error?: string }
}
```

The OpenRouter adapter is the existing `callOnce`. New adapters wrap the same shape so the synthesizer is unchanged.

### 3.3 Smoke test

A bundled smoke driver at `scripts/run-panel-smoke.mjs` (Phase C) calls a 1-paragraph artifact + criteria `"Summarize this paragraph in one sentence."` against each newly-wired provider. Each smoke result reports `provider, model, latency_ms, ok, error?`. Smoke is skipped silently when the required env var is unset (so a partial-credentials environment doesn't fail the test).

### 3.4 Synthesis

No change to `synthesizeReviewers()` — it operates on the unified reviewer-result shape. The aggregation rule scales to N reviewers; consensus threshold (`minCount=2`) holds. For 10 reviewers, consider raising consensus threshold to 3 for noisier panels — out of scope for this dispatch.

---

## 4. Operating cost & latency estimate (per substantive dispatch)

| Slot | Avg latency | Cost (est.) per dispatch |
|------|------------:|-------------------------:|
| 1 gpt-5 | 60–120 s | $0.05–$0.20 |
| 2 gpt-4o | 3–10 s | $0.01–$0.04 |
| 3 gemini-2.5-pro | 30–60 s | $0.03–$0.10 |
| 4 claude-opus-4 | 30–50 s | $0.05–$0.15 |
| 5 v0-1.5-md | 5–20 s | included in Premium |
| 6 github_models gpt-4.1 | 2–10 s | free (Copilot) |
| 7 github_models phi-3.5 | 1–5 s | free (Copilot) |
| 8 base44 headless | 30–90 s | n/a (browser-time only) |
| 9 replit headless | 30–90 s | n/a (browser-time only) |
| 10 gpt-4o web-grounded | 5–15 s | $0.02–$0.05 |
| **Total (parallel)** | **bounded by slowest API ≈ 120 s** | **~$0.20–$0.55** |

All headless slots run in parallel with the API slots since Playwright workers are independent processes.

---

## 5. Required CEO env vars (next dispatch)

```
OPENROUTER_API_KEY     # already configured
VERCEL_V0_TOKEN        # NEW — from https://v0.app/chat/settings/keys (Premium req'd)
GITHUB_MODELS_PAT      # NEW — from https://github.com/settings/tokens, scope: models:read
BASE44_SESSION_PATH    # NEW — Playwright storageState JSON path (one-time codegen)
BASE44_CHAT_URL        # NEW — URL of pre-warmed chat session
REPLIT_SESSION_PATH    # NEW — Playwright storageState JSON path (one-time codegen)
REPLIT_TARGET_REPL_URL # NEW — URL of pre-prepared Repl whose Agent is the reviewer
```

Env vars are read by adapters at runtime; adapters that find their env var missing are gracefully skipped with `degraded=true` and a `not_configured` error string. Existing 4-OpenRouter coverage remains the operating minimum.

---

## 6. Parallel Commit Protocol

**Status:** Added 2026-05-11 by W5b after the Phase 1.0 race incident.
**Module:** `scripts/lib/wx-stage-lock.mjs`
**Lock file:** `<repo_root>/.wx-staging.lock` (gitignored)

### 6.1 Background

In Phase 1.0, W5b and W5c ran concurrent commits. Between W5b's
`git add` and `git commit`, W5c executed its own `git add` for a
different file set, which replaced the index contents. W5b's commit
then captured only the files W5c had staged plus W5b's earlier
untracked-file adds, dropping the source/test edits that W5b had
prepared. Both workers recovered with follow-up commits, but the
race will recur whenever two Wx windows touch the working tree at
the same time.

### 6.2 Rule

Every W5x window that runs `git add` / `git commit` against this
repo **MUST** wrap the sequence with the advisory staging lock:

```js
import { acquireLock, releaseLock } from './scripts/lib/wx-stage-lock.mjs';

await acquireLock('W5b');
try {
  // git add <files>
  // git commit -m "..."
  // git push origin <branch>
} finally {
  await releaseLock('W5b');
}
```

- `acquireLock(wx_id)` is **blocking but bounded** — it polls every
  3 seconds for up to 120 seconds. After 120 seconds of unbroken
  contention it throws; the caller decides whether to retry.
- If the held lock is older than 120 seconds it is treated as
  **stale** (crashed worker) and the new caller takes it over.
- `releaseLock(wx_id)` is idempotent and **only releases the lock
  if we own it** — passing the wrong `wx_id` is a safe no-op that
  prints a warning.
- The lock is **advisory**. Enforcement is discipline, not kernel
  semantics. A worker that bypasses the protocol can still clobber
  the index. Code review and CI should call out commits that don't
  obey the rule.

### 6.3 Where to apply it

| Context | Required? |
|---|---|
| Wx automation that drives `git add` + `git commit` in one shot | **Yes** |
| Interactive human commits during an active multi-Wx run | **Yes** |
| Read-only operations (`git status`, `git diff`, `git log`) | No |
| Push-only operations (lock can be released before `git push`) | Recommended — keep the lock through the push so a parallel worker doesn't push between your local commit and your push |

### 6.4 Diagnostics

- `inspectLock()` returns `{ owner, ts, ageMs, stale, path }` or
  `null`. Useful for "who's holding it right now?" checks without
  acquiring.
- If two workers report `LOCK HELD BY "W5x"` indefinitely, the
  worker named in `owner` likely crashed without releasing — wait
  120 seconds and the next caller will take it over automatically.

---

## 7. Sources consulted

- v0 SDK + Platform API: [v0-sdk npm](https://www.npmjs.com/package/v0-sdk), [vercel/v0-sdk on GitHub](https://github.com/vercel/v0-sdk), [v0.app docs index](https://v0.app/docs/api), [apidog v0-1.0-md walk-through](https://apidog.com/blog/vercel-v0-1-0-md-api/)
- GitHub Models: [docs.github.com index](https://docs.github.com/en/github-models), [REST endpoint walk-through (Microsoft community)](https://techcommunity.microsoft.com/blog/educatordeveloperblog/github-model-catalog---getting-started/4212711), [REST API reference](https://docs.github.com/en/rest/models/inference)
- Replit Agent external access: [discourse — programmatic Create App from Prompt](https://replit.discourse.group/t/programmatic-create-app-from-prompt-api-agent-workspace/7895), [discourse — extension API + Agent invocation](https://replit.discourse.group/t/extensions-api-require-programmatic-agent-invocation-with-prompt-text-support-in-build-mode/6963), [Replit External Access Tokens blog](https://blog.replit.com/secure-more-apps)
- Base44: [docs.base44.com](https://docs.base44.com) (UI-focused; no API surface documented at fetch time)
- Railway: [docs.railway.com](https://docs.railway.com) (no inference offering; ops AI tools only)
