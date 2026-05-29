# Orchestra Integration — Architectural Spec (Rev-2 conformant)

**Status:** DRAFT (read-only architectural spec). NOT canonical SSOT. NOT engineering-ready — Open Questions §12 require CEO disposition first.
**Author:** W3, 2026-05-14.
**Supersedes:** prior version at commit `38b1a23` (which predated SSOT W04-Rev-2 and used the old `Auto / Guided / Manual` Orchestra axis labels). This revision conforms to SSOT W04-Rev-2 §8 (Orchestra Selection axis renamed to `Auto / Recommended / User-Choice`) and §15.3 (OrchestratorHub vs Orchestra boundary).
**Lineage:** Closes parking-lot ENTRY 004 (10-member AI Orchestra) at the engineering-spec level. Implements Locked Rule 18 (Tool Intelligence Marketplace ranking) for the per-pipeline-step Orchestra surface. Builds on `src/lib/orchestra/*` adapters shipped by W2 at commit `9b4e511`.
**Anchor canonical inputs read:** `docs/SSOT_W04_REV2_DRAFT.md` (commit `10890b9`), `docs/FLOWAI_SSOT.md` (canonical 2026-05-11 + CA-1/CA-2/CA-3 ratified), `docs/SSOT_PARKING_LOT.md` ENTRY 004, W03 opening package Locked Rule 18, `src/lib/orchestra/{index,member,claudeCode,vercel,browserless,playwright,stubs}.js`, `src/lib/operationsEngine.js` (canonical 8-step `STEPS` array), `src/lib/toolRegistry.js` (61-tool downstream Marketplace), `src/lib/agents/orchestrator/OrchestratorHub.ts`, `src/lib/agents/MessageBus.ts`, `src/pages/AutoRunner.jsx` (mode wiring), `api/_lib/{remediationEngine,sourceAcquisition,issueDetector}.js`.
**Scope:** read-only research + doc writing. No code changes. No canonical SSOT changes. No adapter wiring.

---

## 1. Current State (verified from code)

### 1.1 Shipping artifact

| File | Status | Lines |
|---|---|---|
| `src/lib/orchestra/index.js` | Dispatcher + registry | 76 |
| `src/lib/orchestra/member.js` | Shared `OrchestraMember` interface contract | 81 |
| `src/lib/orchestra/claudeCode.js` | WIRED — Anthropic Messages API via `api/_lib/claude.js` | 292 |
| `src/lib/orchestra/vercel.js` | WIRED — Vercel REST `/v13/deployments` | 248 |
| `src/lib/orchestra/browserless.js` | WIRED — wraps `api/_lib/crawler.js` `crawl` + `screenshot` | 47 |
| `src/lib/orchestra/playwright.js` | WIRED — wraps `api/_lib/crawler.js` `richCapture` | 32 |
| `src/lib/orchestra/stubs.js` | 6 deferred stubs (base44, lovable, v0, cursor, replit, openrouter) | 32 |
| `src/lib/agents/orchestrator/OrchestratorHub.ts` | WIRED — agent dispatcher (separate concern; see §6) | (existing) |

### 1.2 The `OrchestraMember` interface (canonical contract)

Per `src/lib/orchestra/member.js`:

```js
// Every member module exports:
//   id:           string  (kebab-case, unique)
//   displayName:  string
//   capabilities: string[]
//   wired:        boolean
//   invoke(action: string, payload: object): Promise<MemberResult>
//
// MemberResult shape:
//   { ok: boolean, action: string, member: string,
//     data?: any,             // present on ok:true
//     error?: string,         // present on ok:false
//     deferred?: boolean }    // true for stub-only members
```

The contract is **already capability-typed**. Canonical capability strings today:

```
code-patch · generate-from-scratch · source-retrieval ·
deploy · crawl · screenshot · interact
```

### 1.3 Existing dispatcher behaviour

`src/lib/orchestra/index.js` `dispatch(action, payload, opts)`:

1. If `opts.memberId` is set → call that member's `invoke()` directly.
2. Else consult the hard-coded `preferred` table: `code-patch → claudeCode`, `generate-from-scratch → claudeCode`, `deploy → vercel`, `crawl → browserless`, `screenshot → browserless`, `interact → playwright`, `source-retrieval → vercel`.
3. Else scan `MEMBERS` for the first `wired === true` member whose `capabilities[]` includes the action.
4. Else return `{ ok: false, error: 'no member supports action "..."' }`.

### 1.4 The gap (what this spec adds)

The current dispatcher is **hard-coded preferences** with no ranking, no health, no cost, no mode awareness, no UI surface, and no formal handshake with the agent-side `OrchestratorHub`. Locked Rule 18 requires:

> Top 3 tools attached to each step result as `recommended_tools[]`. Auto: FlowAI selects #1-ranked tool per step automatically. Recommended: user sees ranked list with FlowAI's pick highlighted; user accepts/overrides. User-Choice: user sees full ranked list per step and selects independently. Continuous ranking update via Agents #11 + #15 + #17 per Locked Rule 16.

(Locked Rule 18 verbatim used `Guided` / `Manual`; SSOT W04-Rev-2 §8 renamed those surfaces to `Recommended` / `User-Choice` to eliminate the Manual collision with the System Operation axis §8a. The ranking semantics are unchanged.)

This spec is the architectural plan to graduate the dispatcher from a hard-coded lookup table into a ranked, mode-aware, health-monitored, cost-tracked, fallback-chained Orchestra surface that integrates cleanly with the agent-side `OrchestratorHub`.

---

## 2. The 10-Member Orchestra (canonical roster)

Per SSOT W04-Rev-2 §8 + parking-lot ENTRY 004 (CEO 2026-05-14):

> "FlowAI operates a 10-member AI Orchestra at each pipeline step: Claude Code, Base44, Lovable, v0, Cursor, OpenRouter, Browserless, Anthropic API direct, Replit, Playwright."

### 2.1 Mapping ENTRY 004 → existing adapter files

| # | ENTRY 004 name | Existing adapter id | File | Wired today? |
|---|---|---|---|---|
| 1 | Claude Code | `claude-code` | `claudeCode.js` | YES |
| 2 | Base44 | `base44` | `stubs.js` | NO (stub) |
| 3 | Lovable | `lovable` | `stubs.js` | NO (stub) |
| 4 | v0 | `v0` | `stubs.js` | NO (stub) |
| 5 | Cursor | `cursor` | `stubs.js` | NO (stub) |
| 6 | OpenRouter | `openrouter` | `stubs.js` | NO (stub) |
| 7 | Browserless | `browserless` | `browserless.js` | YES |
| 8 | Anthropic API direct | **NEW** | (to be added) | N/A — see §12 Q2 |
| 9 | Replit | `replit` | `stubs.js` | NO (stub) |
| 10 | Playwright | `playwright` | `playwright.js` | YES |

**Note 1 — Vercel exclusion.** ENTRY 004's list omits Vercel, but `vercel.js` is already wired and powers the `deploy` + `source-retrieval` capabilities critical to fork-and-fix. This spec keeps Vercel as a wired 11th internal member (not surfaced in the user-facing per-step picker) until CEO resolves §12 Q1.

**Note 2 — Claude Code vs Anthropic API direct.** Today `claudeCode.js` is the only Anthropic adapter and it specialises in two actions (`code-patch`, `generate-from-scratch`) with code-gen-specific prompting. ENTRY 004 lists Claude Code AND Anthropic API direct as separate members. This spec treats them as two members with different prompting profiles: **Claude Code** = code-gen specialist (current behaviour); **Anthropic API direct** = generic Messages API for `analyze`, `summarize`, `extract-structured` (new). See §12 Q2.

### 2.2 Capability declarations (target state)

| Adapter | Wired status | Capabilities (target) | Notes |
|---|---|---|---|
| `claude-code` | WIRED | `code-patch`, `generate-from-scratch` | Code-gen specialist. Anthropic Messages API. |
| `anthropic-api` | NEW — to wire | `analyze`, `summarize`, `extract-structured`, `score` | Generic Anthropic Messages API. |
| `base44` | DEFERRED | `source-retrieval`, `build` | Empirically failed headless probe 2026-05-13 (commit `9143f82` body); needs API-surface confirmation. |
| `lovable` | DEFERRED | `generate-from-scratch`, `build` | Empirically failed (same commit). |
| `v0` | DEFERRED | `generate-from-scratch`, `code-patch`, `design` | API exists (`/v1/chats`); needs adapter. |
| `cursor` | DEFERRED | `code-patch` | IDE-bound; no public API for batched code-patch invocation today. |
| `openrouter` | DEFERRED | `code-patch`, `generate-from-scratch`, `analyze`, `summarize` | Gateway to GPT/Gemini/Mistral/DeepSeek/Llama/Qwen via single API. |
| `replit` | DEFERRED | `source-retrieval`, `deploy` | Cloudflare WAF blocked headless 2026-05-13; External Access Tokens may unblock. |
| `browserless` | WIRED | `crawl`, `screenshot` | Pay-per-minute Browserless cloud. |
| `playwright` | WIRED | `interact`, `crawl` | Wraps Browserless `/function` for rich capture. |
| `vercel` (internal #11) | WIRED | `deploy`, `source-retrieval` | Not surfaced in per-step picker; auto-selected for `deploy`. |

### 2.3 New capability strings introduced by this spec

- `analyze` — produce a structured analysis envelope from an artifact (LLM reasoning step).
- `summarize` — compress an artifact to a bounded-length summary.
- `extract-structured` — extract a typed object from text (e.g. `{ productConcept, targetUsers, coreClaims[] }`).
- `score` — produce a numeric quality score against a rubric (used by Step 4 QA Audit; ties to the 5-dimension Self-Audit per Rev-2 §10.1).
- `build` — adapter-native build path (Base44 / Replit project build).
- `design` — adapter-native UI design generation (v0 / Lovable / Base44 specialise here).

Adding a capability string requires updating `member.js`'s "Known capability strings" comment + every adapter's exported `capabilities` array. Engineering dispatch should ship this in one commit.

---

## 3. Per-Step Capability Matrix

The canonical 8 pipeline steps from `src/lib/operationsEngine.js` `STEPS` (per Rev-2 §9, code-canonical order):

| Step | Key | Required capabilities | Eligible adapters |
|---|---|---|---|
| 1. Research | `research` | `crawl`, `analyze`, `summarize` | browserless, playwright, anthropic-api, openrouter |
| 2. Design | `design` | `design`, `generate-from-scratch`, `code-patch` | v0, lovable, base44, claude-code, openrouter |
| 3. Build | `build` | `generate-from-scratch`, `code-patch`, `build` | claude-code, v0, lovable, base44, cursor, replit, openrouter |
| 4. Quality Audit | `qa_audit` | `analyze`, `score`, `interact` | anthropic-api, openrouter, claude-code, playwright |
| 5. Deploy | `deploy` | `deploy` | vercel, replit |
| 6. Self-Renewal | `govern` | `analyze`, `code-patch`, `interact` | anthropic-api, openrouter, claude-code, playwright |
| 7. Go To Market | `gtm` | `analyze`, `summarize`, `crawl` | anthropic-api, openrouter, browserless, playwright |
| 8. Monitor | `monitor` | `analyze`, `interact`, `crawl` | anthropic-api, openrouter, playwright, browserless |

**Eligibility rule:** an adapter is eligible for a step iff at least one of its declared `capabilities[]` matches a step-required capability AND the adapter is `wired === true` AND its health is not `red` (see §7).

**Multi-capability steps:** several steps need multiple capabilities (e.g. Research needs both `crawl` and `analyze`). The picker surfaces adapters per capability slot, not per step — the UI shows a sub-picker for each required capability, and the step run uses one adapter per slot. Engineering dispatch can simplify by collapsing to one picker per step (using the highest-ranked adapter for the **primary** capability of that step) as a v1 if multi-slot proves heavy.

---

## 4. Per-Step Ranking Algorithm (Locked Rule 18)

### 4.1 Formula (verbatim canonical)

```
rank_score = (performance_score × 0.6) + (price_weight × 0.4)

performance_score ∈ [0.0, 1.0]   per-adapter per-capability
price_tier        ∈ { free, low, medium, high, enterprise }
price_weight      from tier:    free=1.0, low=0.8, medium=0.6, high=0.3, enterprise=0.1

Top 3 adapters by rank_score are attached as recommended_adapters[] on each step.
```

### 4.2 Performance score sourcing

Performance score is per `(adapter, capability)` pair, not per adapter alone — e.g. v0 may rate 0.9 for `design` but 0.6 for `code-patch`. Three sources are blended:

1. **Bootstrap baseline** (CEO + Panel disposition) — initial 0.0–1.0 number set at adapter registration. Defaults below.
2. **Rolling outcome score** (24-hour exponentially-weighted moving average of `MemberResult.ok` calls divided by total calls). Multiplied into the baseline at 0.3 weight once ≥30 calls observed.
3. **Continuous marketplace intelligence** (Agents #11 + #15 + #17 per Locked Rule 16) — monthly re-baselining via external benchmarks.

Formula:

```
performance_score(adapter, capability) =
    0.7 × bootstrap_baseline(adapter, capability)
  + 0.3 × rolling_outcome_score(adapter, capability)          // when n_calls ≥ 30
  + monthly_marketplace_delta(adapter, capability)             // ∈ [-0.1, +0.1]

Clamped to [0.0, 1.0].
```

### 4.3 Bootstrap baselines (canonical starting values)

Set at engineering-dispatch time, ratified by Panel before the picker ships. Suggested starting values (CEO disposition expected — §12 Q3):

| Adapter | code-patch | generate-from-scratch | analyze | summarize | crawl | interact | deploy | design | source-retrieval |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| claude-code | 0.92 | 0.88 | — | — | — | — | — | — | — |
| anthropic-api | — | — | 0.92 | 0.90 | — | — | — | — | — |
| openrouter (gpt-5) | 0.85 | 0.82 | 0.88 | 0.85 | — | — | — | — | — |
| openrouter (gemini-2.5-pro) | 0.80 | 0.78 | 0.85 | 0.82 | — | — | — | — | — |
| v0 | 0.75 | 0.85 | — | — | — | — | — | 0.92 | — |
| lovable | 0.65 | 0.78 | — | — | — | — | — | 0.85 | — |
| base44 | 0.70 | 0.75 | — | — | — | — | — | 0.80 | 0.85 |
| cursor | 0.78 | — | — | — | — | — | — | — | — |
| replit | — | — | — | — | — | — | 0.70 | — | 0.75 |
| browserless | — | — | — | — | 0.90 | — | — | — | — |
| playwright | — | — | — | — | 0.85 | 0.95 | — | — | — |
| vercel (internal) | — | — | — | — | — | — | 0.95 | — | 0.60 |

A `—` means the adapter does not declare that capability and is therefore not ranked for it. The picker filters by capability first, then ranks.

### 4.4 Price tier baselines (suggested)

| Adapter | Price tier | Source / rationale |
|---|---|---|
| claude-code | high | $3/$15 per M tokens (Sonnet); $15/$75 (Opus). Per-call cost ≥ $0.01 typically. |
| anthropic-api | high | Same model pricing as claude-code. |
| openrouter | high | Per-model pricing; aggregate to `high` for frontier models, `medium` for mid-tier. Caller can override `price_tier` per-model when ranking. |
| v0 | medium | Premium subscription required; per-call covered. |
| lovable | medium | Starter $20/month; per-call covered. |
| base44 | medium | Pro $29/month; per-call covered. |
| cursor | medium | Pro $20/month; per-call covered. |
| replit | low | Core $7/month; effectively-free for most calls. |
| browserless | low | Pay-per-minute (~$0.0008/sec wall-clock). |
| playwright | low | Same as browserless (same underlying provider). |
| vercel | free | Within plan; no per-call charge for deploys. |

### 4.5 Tie-breakers

After `rank_score` sort:
1. Lower `p50_latency_ms` wins.
2. If still tied, lower `consecutiveFailures` wins.
3. If still tied, lexicographic ascending on adapter `id`.

### 4.6 Stability requirement

`getRankedAdapters({ stepKey, capability })` returns the same ordering for the same inputs within a 60-second window (cached in HotStore key `orchestra:ranking:{stepKey}:{capability}` TTL 60s). Otherwise the UI flickers as scores recompute mid-render.

---

## 5. Auto / Recommended / User-Choice Mode Contract (Orchestra Selection axis — Rev-2 §8)

### 5.1 Mode definitions (per Rev-2 §8, supersedes Rev-1 Auto/Guided/Manual)

> **Auto:** FlowAI selects the #1-ranked adapter per step automatically.
> **Recommended:** user sees ranked list with #1 highlighted; can accept or override.
> **User-Choice:** user sees full eligible list; must pick before run.

Rev-2 §8 renamed "Guided" → "Recommended" and "Manual" → "User-Choice" to eliminate the **Manual collision** with the System Operation axis (Rev-2 §8a uses Hands-On / Reviewed / Hands-Off). The ranking semantics defined here are unchanged; only the user-facing labels and (optionally — see §12 Q6) the enum strings change.

**Enum migration discipline (engineering decision per §12 Q6).** Option A — full rename: enum strings `'guided'` and `'manual'` migrate to `'recommended'` and `'user_choice'`; affects `AgenticModeContext.jsx`, `OrchestrationContext.jsx`, persisted `flowai_adapter_preferences.mode` rows, and the UI mode-selector. Option B — surface-only rename: enum strings unchanged; only user-facing labels (`<ModeSelector>` button text, picker headings) updated; a small mode-label map (`{ 'guided': 'Recommended', 'manual': 'User-Choice' }`) lives in one component. This spec is written assuming Option A is canonical, but the implementation can ship as Option B if migration cost on persisted rows is high.

### 5.2 Public API contract

```js
// src/lib/orchestra/ranking.js (NEW)

export async function getRankedAdapters({
  stepKey,         // 'research' | 'design' | 'build' | 'qa_audit' | 'deploy' | 'govern' | 'gtm' | 'monitor'
  capability,      // 'code-patch' | 'generate-from-scratch' | 'analyze' | ...
  productId?,      // for per-product overrides (e.g. SAIGE pinned to Base44 build)
  excludeMembers?, // string[] of member ids to skip
  topN = 3,        // default top 3 per Locked Rule 18
}) {
  // Returns:
  // [
  //   {
  //     memberId: 'claude-code',
  //     displayName: 'Claude Code (Anthropic API direct)',
  //     capability: 'code-patch',
  //     rank_score: 0.832,
  //     performance_score: 0.92,
  //     price_tier: 'high',
  //     price_weight: 0.3,
  //     health: { status: 'green', p50LatencyMs: 1850, lastSuccessfulAt: '...' },
  //     cost_estimate_usd: 0.012,   // for this single invocation (rough)
  //     wired: true,
  //   },
  //   ...
  // ]
}

export async function selectAdapter({ stepKey, capability, mode, productId?, userPick? }) {
  // Mode: 'auto' | 'recommended' | 'user_choice'   (engineering enums; user-facing labels per §5.1)
  //   auto         → returns ranked[0].memberId
  //   recommended  → if userPick provided AND userPick ∈ ranked, returns userPick (overrideAccepted=true);
  //                   otherwise returns ranked[0].memberId AND surfaces "highlighted" flag
  //   user_choice  → requires userPick; throws if not provided
  // Returns: { memberId, rank_score, mode, userOverride: <bool> }
}
```

### 5.3 UI contract per mode

| Mode | Pre-run UI | Post-run UI |
|---|---|---|
| **Auto** | Hidden picker; step runs immediately on entering the step | Footer "Adapter: claude-code (rank 0.832) — change in Settings → Adapter Preferences" |
| **Recommended** | 3-row ranked card list with #1 pre-selected and highlighted; "Accept & Run" CTA, "Override" expands the list to all eligible adapters | Footer "Adapter: claude-code (Recommended pick accepted) — change for next step" |
| **User-Choice** | Full eligible-adapter list (no pre-selection); user must pick before "Run Step" CTA enables | Footer "Adapter: claude-code (User-Choice pick by user)" |

Component path: `src/components/orchestra/AdapterPicker.jsx` (NEW). Lives alongside the existing `src/components/orchestrator/ModeSelector.jsx`. The two components serve orthogonal axes — `ModeSelector` picks the **System Operation** (Hands-On / Reviewed / Hands-Off per Rev-2 §8a); `AdapterPicker` picks the **Orchestra Selection** (Auto / Recommended / User-Choice per Rev-2 §8) plus per-step adapter when the mode allows.

### 5.4 Persistence

User picks persist per-product per-step in Supabase table `flowai_adapter_preferences` (productId, stepKey, capability, memberId, mode, setBy, setAt). Auto-run reads from this table; if no preference set, falls back to `ranking[0]`.

If Option A migration (§5.1) is canonical, a one-shot migration step backfills existing `mode='guided'` rows to `mode='recommended'` and `mode='manual'` rows to `mode='user_choice'` before the picker ships. RLS policy unchanged.

### 5.5 Inheritance

If a user sets `productId=SAIGE`, `stepKey=build`, `memberId=base44` once (Recommended override), every subsequent build for SAIGE uses Base44 by default unless re-overridden. The Recommended UI surfaces "(default for this product)" badge on the inherited pick.

---

## 6. Integration with OrchestratorHub (Rev-2 §15.3)

This is the new section added in this revision per Rev-2 §15.3, which made the OrchestratorHub-vs-Orchestra boundary explicit. The two layers must coordinate cleanly; this section specifies the handshake.

### 6.1 Two distinct concerns

| Concern | OrchestratorHub (agent-side) | The Orchestra (tool-side) |
|---|---|---|
| Scope | Agent dispatch (FlowAI's contract layer) | External tool dispatch (third-party adapters) |
| File | `src/lib/agents/orchestrator/OrchestratorHub.ts` | `src/lib/orchestra/index.js` + `member.js` + per-adapter files |
| What it routes | `invokeStepOwner(stepKey, ctx)` → the agent registered as step-owner of that step | `dispatch(action, payload, opts)` → the wired member (or fallback) for that action |
| Return shape | Step-owner envelope: `{ agent_id, agent_name, mode, step, authority, recommendation, ..., metadata }` | `MemberResult`: `{ ok, action, member, data?, error?, deferred? }` |
| Who calls it | `AutoRunner.jsx` at every step boundary; cross-agent invocation; W03 compliance probe | Agents inside `act()`; user-facing pickers (§5); the unified `remediate()` engine |
| Ranking? | No — agents are step-owner-locked or cross-step by charter per `BaseAgent.js` | Yes — Locked Rule 18 ranking; 10 members + 1 internal Vercel |
| Authority model | `BaseAgent.js` `AUTHORITY.*` enums; `RECOMMEND_ONLY` is the default | None at the Orchestra layer — authority is owned by the calling agent |

### 6.2 The canonical handshake

```
AutoRunner step boundary fires
        │
        ▼
hub.invokeStepOwner(stepKey, ctx)              ← OrchestratorHub
        │
        ▼
Agent #N.recommend(ctx)                         ← BaseAgent contract
        │
        │  (agent may call zero, one, or many Orchestra dispatches
        │   inside its act() phase, each with explicit per-action
        │   intent and authority check)
        │
        ▼
orchestra.dispatch(action, payload, opts)       ← The Orchestra
        │
        ▼
ranked = getRankedAdapters({ stepKey, capability: action, productId, mode })   ← §5
selected = selectAdapter({ ...ranked, mode, userPick })                          ← §5
        │
        ▼
selected.invoke(action, payload)                ← per-adapter
        │
        ▼
MemberResult bubbles back up through Agent envelope to AutoRunner
```

Concrete example — Agent #3 Self-Renewal in fork-and-fix mode (per `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2):

1. AutoRunner step 6 calls `hub.invokeStepOwner('govern', { runId, productId, issueList, mode: 'fork_and_fix', sourceHints })`.
2. OrchestratorHub routes to `Agent3SelfRenewal.recommend(ctx)`.
3. Agent #3's `act()` invokes `remediate({ artifact, issues, sourceHints })` (from `api/_lib/remediationEngine.js`).
4. `remediate()` calls `orchestra.dispatch('code-patch', { ... }, { productId, runId, stepKey: 'govern' })` per issue.
5. Orchestra dispatch consults `getRankedAdapters({ stepKey: 'govern', capability: 'code-patch', productId })` if the user is in Recommended or User-Choice mode; in Auto mode it picks `ranked[0]` silently.
6. Selected adapter (typically `claude-code`) invokes; returns `MemberResult`.
7. Result bubbles back into Agent #3's envelope, which OrchestratorHub returns to AutoRunner.
8. AutoRunner persists, audits, and advances to step 7.

### 6.3 Who owns what

| Responsibility | Owner |
|---|---|
| Authority enforcement (`RECOMMEND_ONLY` cannot dispatch with side effects) | Agent (`BaseAgent.guard()`) |
| Audit-log writes for agent phases (`run.start` / `plan.ok` / `act.ok` / etc.) | Agent (`BaseAgent.run()`) |
| Audit-log writes for adapter calls (`orchestra.dispatch.*` topics) | Orchestra (`dispatch()` wrapper per §8) |
| Cost ledger writes (`flowai_adapter_cost` rows) | Orchestra (`logAdapterCall()` per §8) |
| Health record updates (`orchestra:health:{memberId}:{capability}`) | Orchestra (`logAdapterCall()` per §7) |
| Fallback chain execution | Orchestra (`dispatch()` per §9) |
| Run-budget enforcement (`flowai_run_budgets` ceiling) | Orchestra (`dispatch()` checks ceiling before invoke) |
| Per-product preference inheritance | Orchestra (`selectAdapter()` reads `flowai_adapter_preferences`) |
| Step-owner registration / agent registry validation | OrchestratorHub + `_registry.ts` |
| Cross-agent message routing (`MessageBus` topics) | `MessageBus` (separate from both layers) |

### 6.4 The two contracts never call each other directly

A subtle but important rule: `OrchestratorHub` does **not** call `orchestra.dispatch()`. The Orchestra is consumed inside an agent's `act()` phase, never by the hub. And the Orchestra does **not** call back into the hub. The boundary stays clean: hub talks to agents, agents talk to the Orchestra. Tests must enforce this — a future grep-based lint rule could fail any import of `orchestra/index.js` from `src/lib/agents/orchestrator/`.

### 6.5 Cross-cutting: opts thread-through

Every `orchestra.dispatch()` call must receive a context bundle:

```js
opts = {
  productId,        // multi-tenant attribution + per-product preference lookup
  runId,            // audit-log linkage to the originating AutoRunner run
  stepKey,          // for ranking lookup (which step capability matrix to use)
  callerAgentId,    // which agent owns this dispatch (for cost attribution + escalation)
  mode,             // 'auto' | 'recommended' | 'user_choice' (per §5)
  userPick?,        // explicit memberId when mode === 'user_choice'
  budgetUsdRemaining?, // optional; defaults to the run's remaining budget from flowai_run_budgets
}
```

The agent's `act()` is responsible for threading `opts` through. AutoRunner is responsible for seeding `opts` at the step boundary. Failure to thread `productId` is a contract violation — the cost ledger row will fail RLS and the dispatch will return `{ ok: false, error: 'productId required' }`.

---

## 7. Adapter Health Monitoring

### 7.1 Health record shape

Per-adapter, per-capability (because a single adapter may be healthy on `crawl` but degraded on `screenshot`):

```js
{
  memberId:               'browserless',
  capability:             'crawl',
  lastSuccessfulAt:       '2026-05-14T17:42:18.000Z',
  lastFailureAt:          '2026-05-14T16:30:02.000Z',
  consecutiveFailures:    0,
  rollingErrorRate24h:    0.012,             // fraction in [0.0, 1.0]
  rollingCallCount24h:    412,
  p50LatencyMs:           1850,
  p95LatencyMs:           4200,
  p99LatencyMs:           7800,
  status:                 'green',            // 'green' | 'degraded' | 'red'
  statusReason:           null,               // string when degraded/red
  lastHealthEvalAt:       '2026-05-14T17:43:00.000Z',
}
```

### 7.2 Status thresholds

```
green:     rollingErrorRate24h < 0.02  AND  p50LatencyMs < 5000   AND consecutiveFailures < 3
degraded:  rollingErrorRate24h ∈ [0.02, 0.15)  OR  p50LatencyMs ∈ [5000, 30000)  OR consecutiveFailures ∈ [3, 5)
red:       rollingErrorRate24h ≥ 0.15  OR  p50LatencyMs ≥ 30000   OR consecutiveFailures ≥ 5
```

Health re-evaluates on every `MemberResult` write to the audit log. Persisted to HotStore key `orchestra:health:{memberId}:{capability}` with TTL 7 days; nightly snapshot to ColdStore for trend analysis.

### 7.3 Effect on ranking + dispatch

- **green**: full rank, no penalty.
- **degraded**: rank_score multiplied by 0.7 (still in the running but de-prioritised).
- **red**: excluded from ranking entirely; Auto mode skips; Recommended/User-Choice show with strikethrough + "degraded" badge but allow user override.

### 7.4 Health badges in UI

Each picker row renders a coloured status dot + tooltip with p50 latency + last successful invocation timestamp. Red rows include a "Why is this red?" link that opens the rolling 24h call log for that capability.

### 7.5 Synthetic health probes

A cron job runs every 15 minutes calling each wired adapter with a no-op probe payload (e.g. `claudeCode.invoke('code-patch', { filePath: '/tmp/probe.txt', sourceContent: 'hello', issueSpec: {category:'noop', fixSpec:{kind:'no-op'}} })`). Probe results update the health record without consuming end-user-attributed token budget. Probe cost is attributed to a system productId `_orchestra_probe`.

---

## 8. Per-Call Cost Tracking

### 8.1 Cost ledger schema (new Supabase table)

```sql
CREATE TABLE flowai_adapter_cost (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL,
  run_id          text NOT NULL,
  step_key        text NOT NULL,
  member_id       text NOT NULL,
  capability      text NOT NULL,
  action          text NOT NULL,
  dollars_usd     numeric(10,6) NOT NULL,
  tokens_in       integer,
  tokens_out      integer,
  latency_ms      integer NOT NULL,
  ok              boolean NOT NULL,
  caller_agent_id integer,                       -- per §6.5 opts.callerAgentId
  at              timestamptz NOT NULL DEFAULT now(),
  meta            jsonb
);

CREATE INDEX flowai_adapter_cost_product_run ON flowai_adapter_cost(product_id, run_id);
CREATE INDEX flowai_adapter_cost_at          ON flowai_adapter_cost(at DESC);
CREATE INDEX flowai_adapter_cost_caller      ON flowai_adapter_cost(caller_agent_id);
```

RLS: rows visible only to the owning provider org (multi-tenant invariant per Rev-2 §22). Insert allowed only by `service_role` (server-only writes).

### 8.2 Cost computation per adapter

Each adapter declares its pricing schedule in a new file `src/lib/orchestra/pricing.js`:

```js
export const PRICING = {
  'claude-code': {
    model: 'claude-sonnet-4-6',
    inputPerMTokens:  3.00,
    outputPerMTokens: 15.00,
  },
  'anthropic-api': { /* same shape, may vary per model */ },
  'openrouter':    { /* per-model lookup, see openrouter.js */ },
  'browserless':   { perSecond: 0.0008 },
  'playwright':    { perSecond: 0.0008 },
  'vercel':        { perDeploy: 0.0 },
  'v0':            { perCall: 0.0 },      // covered by Premium subscription
  'lovable':       { perCall: 0.0 },      // covered by subscription
  'base44':        { perCall: 0.0 },      // covered by subscription
  'cursor':        { perCall: 0.0 },      // covered by subscription
  'replit':        { perCall: 0.0 },      // covered by subscription
};
```

Cost calc helper:

```js
// src/lib/orchestra/cost.js (NEW)
export function computeCost({ memberId, action, usage, latencyMs }) {
  const schedule = PRICING[memberId];
  if (!schedule) return 0;
  if (schedule.perCall != null) return schedule.perCall;
  if (schedule.perSecond != null) return schedule.perSecond * (latencyMs / 1000);
  if (schedule.inputPerMTokens != null && usage?.input_tokens != null) {
    return (usage.input_tokens / 1_000_000) * schedule.inputPerMTokens
         + (usage.output_tokens / 1_000_000) * schedule.outputPerMTokens;
  }
  return 0;
}
```

### 8.3 Logging integration

Wrap `dispatch()`:

```js
// src/lib/orchestra/index.js (amendment)
export async function dispatch(action, payload, opts = {}) {
  const startedAt = Date.now();
  const result = await /* existing dispatch logic */;
  const latencyMs = Date.now() - startedAt;
  await logAdapterCall({
    memberId:        result.member,
    action,
    ok:              result.ok,
    usage:           result.data?.usage,
    latencyMs,
    productId:       opts.productId,
    runId:           opts.runId,
    stepKey:         opts.stepKey,
    callerAgentId:   opts.callerAgentId,
  });
  return result;
}
```

`logAdapterCall()` writes to the ledger (server-only) and updates the rolling health record. Browser-side dispatch (rare; only for recommend-only paths) skips the ledger write.

### 8.4 Cost ceiling per run

A per-run budget ceiling lives in `flowai_run_budgets` (productId, runId, ceilingUsd, spentUsd, exceededAt?). Default ceiling: **$5.00 per run**. When `spentUsd ≥ ceilingUsd × 0.8`, dispatch warns; when exceeded, dispatch returns `{ ok: false, error: 'run_budget_exceeded' }` and emits `runner.budget.exceeded.v1` to the message bus. User-facing UI shows progress bar.

Ceiling is configurable per product in Settings; default applies if unset. See §12 Q6 for the default-value question.

### 8.5 Cost dashboard

New page `src/pages/CostDashboard.jsx`: rollups per product / per run / per adapter / per step / per caller-agent. Filterable by date range. Read-only Vitest tests cover the SQL aggregations.

---

## 9. Fallback Chain

### 9.1 Canonical per-action fallback ordering

When the dispatcher's preferred adapter fails or is degraded, try the next-best per this table (left-to-right):

| Action | Fallback chain |
|---|---|
| `code-patch` | claude-code → cursor → openrouter → v0 → lovable → **FAIL** |
| `generate-from-scratch` | claude-code → v0 → lovable → openrouter → base44 → **FAIL** |
| `source-retrieval` | vercel (git link follow) → base44 → replit → sourceAcquisition git-tarball → **FAIL** |
| `deploy` | vercel → replit → **FAIL** |
| `crawl` | browserless → playwright → **FAIL** |
| `screenshot` | browserless → playwright → **FAIL** |
| `interact` | playwright → browserless → **FAIL** |
| `analyze` | anthropic-api → openrouter → claude-code → **FAIL** |
| `summarize` | anthropic-api → openrouter → claude-code → **FAIL** |
| `extract-structured` | anthropic-api → openrouter → claude-code → **FAIL** |
| `score` | anthropic-api → openrouter → claude-code → **FAIL** |
| `design` | v0 → lovable → base44 → claude-code → **FAIL** |
| `build` | claude-code (generate-from-scratch + Vercel deploy) → base44 → replit → **FAIL** |

### 9.2 Fallback trigger conditions

Move to the next adapter in the chain when ANY of:

1. `member.wired === false` (it's a stub).
2. `health.status === 'red'` for that adapter+capability.
3. `MemberResult.ok === false` AND `MemberResult.error` matches retryable patterns (`429`, `503`, `5xx`, `ECONNRESET`, `not yet wired`, `timeout`).
4. `invoke()` threw (caught by dispatcher).
5. Adapter exceeded per-call timeout (default 60 s; configurable per action).

Non-retryable failures (`401`/`403` auth, malformed payload, schema validation) terminate the chain with the original error — no fallback.

### 9.3 Audit trail

Every fallback hop logs to the GovernanceAuditLog (Rev-2 §14) under topic `orchestra.fallback`:

```js
{
  topic: 'orchestra.fallback',
  runId, stepKey, action,
  attempts: [
    { memberId: 'claude-code', ok: false, error: '429 rate_limited', latencyMs: 380 },
    { memberId: 'cursor',      ok: false, error: 'not yet wired',     latencyMs: 5 },
    { memberId: 'openrouter',  ok: true,  latencyMs: 2230 },
  ],
  finalMember: 'openrouter',
  totalLatencyMs: 2615,
  callerAgentId: 3,
  at: '...',
}
```

### 9.4 Auto-mode silent fallback vs Recommended/User-Choice surfacing

- **Auto**: fallback happens silently; envelope footer shows `via openrouter (claude-code unavailable)`.
- **Recommended**: fallback prompts the user "Claude Code was rate-limited; OpenRouter accepted. Continue or retry primary?"
- **User-Choice**: fallback always prompts. User-Choice users explicitly chose; surfacing the failure respects that.

### 9.5 Maximum-fallback-hops guard

Cap fallback at **3 hops** per action invocation to prevent thundering-herd cascades. If all 3 fail, return the first non-retryable error (or the last `ok:false` if all were retryable). Engineering dispatch can tune.

---

## 10. Detailed Adapter Interfaces

Each adapter's per-action payload and return-data shape. Code references existing files where wired; **NEW** marks shapes to be implemented.

### 10.1 `claude-code` (WIRED)

| Action | Payload | Return data |
|---|---|---|
| `code-patch` | `{ filePath, sourceContent, issueSpec, framework? }` | `{ filePath, patchedContent, rationale, model, usage }` |
| `generate-from-scratch` | `{ spec, framework }` (framework='vite-react' only) | `{ files: [{path, content}], framework, rationale, model, usage }` |

### 10.2 `anthropic-api` (NEW)

| Action | Payload | Return data |
|---|---|---|
| `analyze` | `{ artifact, criteria }` | `{ findings: [...], confidence, model, usage }` |
| `summarize` | `{ text, maxTokens }` | `{ summary, model, usage }` |
| `extract-structured` | `{ text, schema }` | `{ extracted, model, usage }` |
| `score` | `{ artifact, rubric }` | `{ score, breakdown, model, usage }` |

Wraps `api/_lib/claude.js#callClaude` directly with task-specific prompts. Distinct from `claude-code` because the prompting profile is different (no JSON-only contract for code).

### 10.3 `openrouter` (DEFERRED → wire)

| Action | Payload | Return data |
|---|---|---|
| Any LLM action above | `{ ..., model: 'openai/gpt-5' \| 'google/gemini-2.5-pro' \| ...}` | Same as anthropic-api / claude-code |

Reuses `scripts/lib/peer-review.mjs`'s OpenRouter adapter pattern (`callOnce`); ported into `src/lib/orchestra/openrouter.js`. Model selection passes through to the OpenRouter `/v1/chat/completions` body; price tier resolved dynamically per model.

### 10.4 `v0` (DEFERRED → wire)

| Action | Payload | Return data |
|---|---|---|
| `design` | `{ spec, framework? }` | `{ files, demoUrl, rationale }` |
| `generate-from-scratch` | `{ spec }` | `{ files, demoUrl }` |
| `code-patch` | `{ filePath, sourceContent, issueSpec }` | `{ patchedContent, rationale }` |

Per `PANEL_INFRASTRUCTURE.md` §2.2: endpoint is `POST https://api.v0.dev/v1/chats` (NOT OpenAI-compatible). Adapter shape: `{ message, system, responseMode: 'sync', modelConfiguration: { modelId: 'v0-auto' } }`. Response: `{ text, latestVersion: { files: [...] }, demo?, webUrl }`. Bundle-size constraint: skip when artifact >10K tokens.

### 10.5 `lovable` (DEFERRED — headless empirically failed)

Per commit `9143f82` body, Lovable headless probe found Build-mode chat with no free-text-chat tier. Wiring requires either an API surface (not currently public) or a tier upgrade. **Recommend defer until Lovable ships a public API** — track in parking lot.

### 10.6 `cursor` (DEFERRED — no batched API)

Cursor's value is IDE-bound; the public surface today is the IDE itself + remote `cursor agent` CLI. No batched-invocation API for `code-patch`. Defer until Cursor ships a server API.

### 10.7 `base44` (DEFERRED — headless empirically failed)

Per commit `9143f82` body, post-login surface is the app-builder editor, not free-text chat. Parking-lot ENTRY 005 (CEO 2026-05-14) explicitly calls out Base44 source-export as required. **Need:** Base44 API surface confirmation OR Base44 source-export mechanism.

### 10.8 `replit` (DEFERRED — Cloudflare WAF blocked)

Per commit `9143f82`, Replit's Cloudflare WAF rejects headless Chromium fingerprints regardless of valid storageState cookies. Replit's **External Access Tokens** (announced 2025) may provide an authenticated API path. Defer pending that wiring.

### 10.9 `browserless` (WIRED)

| Action | Payload | Return data |
|---|---|---|
| `crawl` | `{ url, force? }` | crawler.crawl() envelope |
| `screenshot` | `{ url, fullPage? }` | crawler.captureScreenshot() envelope |

Pay-per-minute. Wraps `api/_lib/crawler.js`.

### 10.10 `playwright` (WIRED)

| Action | Payload | Return data |
|---|---|---|
| `interact` | `{ url, includeScreenshot?, fullPage? }` | `richCapture()` envelope |
| `crawl` | (alias to `interact`) | same |

### 10.11 `vercel` (WIRED — internal #11)

| Action | Payload | Return data |
|---|---|---|
| `deploy` | `{ files, projectName?, target?, framework?, teamId? }` | `{ url, deploymentId, target, projectName, readyState }` |
| `source-retrieval` | `{ projectId, teamId? }` | `{ projectId, framework, gitRepoUrl, hint }` |

Surfaced ONLY for `deploy` and `source-retrieval`. Not user-pickable in the per-step Orchestra UI (auto-selected when needed).

### 10.12 Environment variable inventory

| Member | Required env var(s) | Source | Notes |
|---|---|---|---|
| claude-code | `ANTHROPIC_API_KEY` | Doppler `prd` | Already wired (commit `ae0441c`). |
| anthropic-api | `ANTHROPIC_API_KEY` | Doppler `prd` | Shares with claude-code. |
| openrouter | `OPENROUTER_API_KEY` | `.env.openrouter-handoff` | Already wired. |
| v0 | `VERCEL_V0_TOKEN` | `.env.openrouter-handoff` | Already wired. |
| lovable | TBD | — | Adapter deferred. |
| base44 | `VITE_BASE44_TOKEN`, `VITE_BASE44_APP_ID` | Doppler `prd` | Token present (commit `ae0441c`); source-export API surface TBD. |
| cursor | TBD | — | Adapter deferred. |
| replit | `REPLIT_EXTERNAL_ACCESS_TOKEN` (proposed) | TBD | Adapter deferred. |
| browserless | `BROWSERLESS_API_KEY` | Doppler `prd` | Already wired (commit `c533e2d`). |
| playwright | `BROWSERLESS_API_KEY` | Doppler `prd` | Shares with browserless. |
| vercel | `VERCEL_TOKEN`, `VERCEL_TEAM?` | Doppler `prd` | Already wired. |

---

## 11. Test Surface

Mirror the `src/lib/agents/*` test patterns. All tests use `MockOrchestra` (~120 LOC) + Vitest fixtures. No live external calls.

### 11.1 Ranking tests

| ID | Test |
|---|---|
| T-R1 | `getRankedAdapters({ stepKey: 'build' })` returns top-3 with `rank_score` descending |
| T-R2 | Tie-breaker on equal rank_score uses lower p50 latency |
| T-R3 | Capability filter excludes members lacking the required capability |
| T-R4 | Red-health adapters excluded; degraded adapters de-prioritised by 0.7 multiplier |
| T-R5 | Cached ranking returns same order within 60s; recomputes after TTL |
| T-R6 | `productId`-pinned preference appears as `default for this product` badge metadata |

### 11.2 Mode tests (Rev-2 §8 axis labels)

| ID | Test |
|---|---|
| T-M1 | Auto mode `selectAdapter()` returns ranked[0].memberId |
| T-M2 | Recommended mode with no userPick returns ranked[0] + `highlighted=true` |
| T-M3 | Recommended mode with valid userPick returns userPick + `userOverride=true` |
| T-M4 | User-Choice mode without userPick throws |
| T-M5 | Persisted preference inherited on subsequent same-product/same-step runs |
| T-M6 | Legacy persisted `mode='guided'` rows backfill cleanly to `'recommended'` (if §5.1 Option A canonical) |

### 11.3 OrchestratorHub integration tests (NEW per §6)

| ID | Test |
|---|---|
| T-O1 | `AutoRunner` step boundary calls `hub.invokeStepOwner(stepKey, ctx)` exactly once per step |
| T-O2 | Agent #3 `act()` calling `orchestra.dispatch('code-patch', ...)` threads `opts.productId`, `opts.runId`, `opts.stepKey`, `opts.callerAgentId=3` correctly |
| T-O3 | Cost ledger row written for the dispatch has `caller_agent_id = 3` |
| T-O4 | OrchestratorHub never imports `src/lib/orchestra/*` directly (grep-lint check) |
| T-O5 | Orchestra never imports `src/lib/agents/*` directly (grep-lint check) |
| T-O6 | Missing `opts.productId` → dispatch returns `{ ok: false, error: 'productId required' }` |

### 11.4 Health tests

| ID | Test |
|---|---|
| T-H1 | Adapter health record initialises green on first call success |
| T-H2 | 3 consecutive failures within 5 minutes → status degraded |
| T-H3 | 5 consecutive failures → status red |
| T-H4 | Rolling error rate crosses 15% → status red even with recent successes |
| T-H5 | p50 latency >30s → status red |
| T-H6 | Synthetic probe attributes cost to `_orchestra_probe` |

### 11.5 Cost tests

| ID | Test |
|---|---|
| T-C1 | claude-code call with usage `{input:1000, output:500}` yields $0.003 + $0.0075 = $0.0105 |
| T-C2 | Browserless 12s call yields $0.0096 (12 × $0.0008) |
| T-C3 | Free-tier adapter yields $0 |
| T-C4 | Run budget warning fires at 80% of ceiling |
| T-C5 | Run budget exceeded blocks subsequent dispatch with `run_budget_exceeded` |
| T-C6 | Cost ledger row written exactly once per `dispatch()` call |
| T-C7 | RLS forbids cross-tenant ledger reads |

### 11.6 Fallback tests

| ID | Test |
|---|---|
| T-F1 | code-patch primary 429 → falls back to cursor; cursor stub-not-wired → openrouter; openrouter succeeds |
| T-F2 | Non-retryable 401 terminates chain immediately |
| T-F3 | After 3 hops without success, dispatch returns last error |
| T-F4 | Fallback hop logged to GovernanceAuditLog under `orchestra.fallback` topic with attempts[] in order |
| T-F5 | Auto mode surfaces silent fallback in result footer; Recommended prompts user |

### 11.7 UI tests

| ID | Test |
|---|---|
| T-U1 | `AdapterPicker` Auto-mode renders nothing inline; shows footer post-run |
| T-U2 | `AdapterPicker` Recommended-mode renders 3-row card list with #1 highlighted |
| T-U3 | `AdapterPicker` User-Choice-mode renders full eligible list; run CTA disabled until pick |
| T-U4 | Health badges render correctly (green dot / orange dot / red dot + tooltip) |
| T-U5 | Cost estimate visible per row in Recommended/User-Choice |
| T-U6 | `AdapterPicker` does NOT render or alter the `ModeSelector` (System Operation axis is orthogonal — Rev-2 §8a) |

Total: ~32 tests. Estimated implementation: 1.5 days for the ranking + mode + fallback core; 1 day for cost tracking + SQL migration + RLS; 0.5 day for health probe cron; 1 day for UI + persistence; 0.5 day for OrchestratorHub integration tests.

---

## 12. Open Questions (CEO disposition / Panel review required)

### Q1. Vercel — 11th member surfaced or kept internal?

ENTRY 004's list explicitly enumerates 10 members and omits Vercel. But `vercel.js` is wired and powers `deploy` + `source-retrieval`. Two options:

- **(a)** Keep Vercel as a wired **internal-only** 11th member — never user-pickable; auto-selected for deploy. Spec assumed this.
- **(b)** Surface Vercel as a user-pickable Orchestra member alongside the 10, and amend ENTRY 004 to enumerate 11.

Recommendation: (a) — `deploy` is rarely user-overridable in practice (no other deploy adapters wired today; Replit deferred), and surfacing it adds UI noise without value. CEO ratifies.

### Q2. Claude Code vs Anthropic API direct — same adapter or two?

ENTRY 004 lists both. This spec proposes splitting into:

- `claude-code` (code-gen specialist, current adapter) — capabilities `code-patch`, `generate-from-scratch`.
- `anthropic-api` (NEW) — generic Messages API for `analyze`, `summarize`, `extract-structured`, `score`.

Alternative: keep as one adapter (`claude-code`) and add the generic actions to its `capabilities[]`. Less surface, but the ranking matrix gets noisier because the same memberId would compete against itself across capabilities.

Recommendation: split (as specced). CEO ratifies.

### Q3. Bootstrap performance baselines — Panel ratification needed

The performance-score matrix in §4.3 is W3's bootstrap estimate based on public reputation, model benchmarks, and recent commit-body empirical results. These numbers seed the ranking; they must be Panel-ratified (10-AI panel verdict ≥7/10 per Locked Rule 17) before the picker ships. Specifically:

- claude-code `code-patch` at 0.92 (W3 estimate) vs Panel signal.
- v0 `design` at 0.92 (W3 estimate) — Panel may push higher or lower.
- openrouter scoring depends on which model is selected; the matrix collapses gpt-5 / gemini-2.5-pro for simplicity but the actual `getRankedAdapters` may need per-model rows.

Recommendation: dispatch a Panel consultation explicitly on §4.3 + §4.4 before engineering dispatch ships the picker.

### Q4. Two-marketplace question (deferred from ENTRY 004)

ENTRY 004 ends with: "Amendment cycle must decide: single extended Marketplace OR two parallel marketplaces."

This spec assumes **two parallel marketplaces**:
- **Orchestra** (10-member set, this spec) — per-pipeline-step adapters with `wired` capability dispatch.
- **Downstream Marketplace** (61 tools, 14 categories per `src/lib/toolRegistry.js`) — UI-surface recommendations for the end-user product's own tech stack (Figma, Stripe, Supabase, etc.); not invokable by FlowAI.

The two have different audiences: Orchestra is FlowAI's own infrastructure; the 61-tool Marketplace is the end-customer's vendor selection. Merging them would conflate "tools FlowAI dispatches" with "tools FlowAI recommends to its users."

Recommendation: keep two parallel marketplaces. Engineering dispatch builds the Orchestra picker (this spec); the existing toolRegistry.js continues to drive the existing per-stack recommendation UI in `src/pages/MasterOrchestrator.jsx` and elsewhere. CEO ratifies.

### Q5. Headless adapter strategy — defer indefinitely, retry with new technique, or drop?

`base44`, `lovable`, `replit` headless probes empirically failed 2026-05-13 (commit `9143f82`). Three paths:

- **(a) Defer indefinitely.** Stubs stay as stubs; rely on the 7 other adapters. Risk: parking-lot ENTRY 005 (FlowAI source-acquisition contract) calls out Base44 source-export as required.
- **(b) Retry with new technique.** Wire Base44 via the documented Base44 API (if it exists at all per docs.base44.com); wire Replit via External Access Tokens; wire Lovable via direct API once they ship one. Risk: weeks of engineering against moving targets.
- **(c) Drop from Orchestra.** Remove them from ENTRY 004's roster; Orchestra is officially 7-member (plus Anthropic-API-as-eleventh-distinct + Vercel internal = 9 total). Risk: ENTRY 004 is CEO-authored; dropping requires CEO sign-off.

Recommendation: (a) for v1 (ship Orchestra picker with 7 wired members + 3 deferred); revisit per ENTRY 005 trajectory. CEO disposes.

### Q6. Axis-rename enum migration discipline (Rev-2 §8)

Rev-2 §8 renamed the Orchestra Selection axis from Auto/Guided/Manual to Auto/Recommended/User-Choice. Implementation options per §5.1:

- **(a) Full rename (canonical):** enum strings `'guided'` → `'recommended'`, `'manual'` → `'user_choice'`. Affects `AgenticModeContext.jsx`, `OrchestrationContext.jsx`, all consumer components, persisted `flowai_adapter_preferences.mode` rows (one-shot migration), and the UI. Larger blast radius; cleaner long-term.
- **(b) Surface-only rename:** enum strings retained at `'guided'` / `'manual'`; only user-facing labels updated via a small label map in `<ModeSelector>` and `<AdapterPicker>`. Lower blast radius; technical-debt note carried forward.

This spec assumes (a) but is written in a way that works for either. CEO ratifies before engineering dispatch.

### Q7. Cost ceiling default per run — $5 reasonable?

Spec defaults to **$5.00 per run** (per §8.4). Rationale: a typical 8-step run with claude-code + browserless + vercel costs ~$0.50–$1.50 today; $5 gives 3-5× headroom before warn-fire. A fork-and-fix execution adds another $0.30–$1.00.

Alternatives:
- $2.50 — tighter, will catch runaway loops sooner.
- $10.00 — looser, fewer false-positive aborts.
- Per-product configurable only (no global default) — most flexible, more setup overhead.

Recommendation: $5 default, configurable per product. CEO ratifies.

### Q8. Adapter health data source — Supabase vs audit log?

Spec uses HotStore key `orchestra:health:{memberId}:{capability}` (TTL 7 days) + nightly ColdStore snapshot. Alternative: a dedicated Supabase table `flowai_adapter_health` (single row per memberId+capability, upserted on every call).

Trade-off: HotStore is fast and ephemeral; Supabase is queryable and durable. For the picker UI's per-request lookup, HotStore is right. For trend dashboards, Supabase is right.

Recommendation: BOTH — HotStore for the picker's hot path; Supabase upsert for trend queries. Engineering dispatch sizes appropriately.

### Q9. Per-step picker UI — separate panel, inline, or global selector?

Three UI placements:

- **(a) Per-step inline picker.** Each step's controls expand to show the picker before "Run Step." Highest user awareness; most clicks.
- **(b) Per-product Settings → Adapter Preferences.** Pre-configured once, applied across all runs for that product. Lowest interruption; lowest visibility.
- **(c) Both.** Settings-pre-config + per-step override under a collapsible "Adapter" toggle.

Recommendation: (c). Auto mode hides everything; Recommended/User-Choice surface the per-step picker; Settings page lets power-users pre-configure. CEO ratifies.

---

## 13. Engineering-dispatch readiness checklist

Once CEO dispositions Q1–Q9, the engineering dispatch produces in this order:

1. `src/lib/orchestra/openrouter.js` — wire OpenRouter adapter (port from `scripts/lib/peer-review.mjs` patterns).
2. `src/lib/orchestra/anthropic-api.js` — new generic Anthropic adapter (analyze/summarize/extract-structured/score).
3. `src/lib/orchestra/v0.js` — wire v0 adapter per `PANEL_INFRASTRUCTURE.md` §2.2 (NOT OpenAI-compatible).
4. Update each adapter's `capabilities[]` to include new strings (`analyze`, `summarize`, `extract-structured`, `score`, `build`, `design`).
5. `src/lib/orchestra/pricing.js` (new) — pricing schedules per Panel-ratified §4.4.
6. `src/lib/orchestra/cost.js` (new) — `computeCost()` helper + budget enforcement.
7. `src/lib/orchestra/health.js` (new) — health record CRUD + status threshold logic + synthetic probe job.
8. `src/lib/orchestra/ranking.js` (new) — `getRankedAdapters()` + `selectAdapter()` + 60s caching.
9. `src/lib/orchestra/index.js` — amend `dispatch()` to thread `opts.productId/runId/stepKey/callerAgentId/mode/userPick`, log cost, update health, implement fallback chain per §9.
10. Enum migration per §12 Q6 disposition: if (a) full rename, update `AgenticModeContext.jsx` + `OrchestrationContext.jsx` + `flowai_adapter_preferences` backfill migration; if (b) surface-only, update label map only.
11. `supabase/migrations/00NN_orchestra_cost_ledger.sql` — `flowai_adapter_cost`, `flowai_run_budgets`, `flowai_adapter_preferences`, RLS policies.
12. `src/components/orchestra/AdapterPicker.jsx` (new) + integration into AutoRunner per Q9 disposition.
13. `src/pages/Settings/AdapterPreferences.jsx` (new) — per-product pre-configuration UI.
14. `src/pages/CostDashboard.jsx` (new) — rollup queries + UI.
15. Tests per §11 (~32 tests; `MockOrchestra` shared helper).
16. Grep-lint rules (T-O4 + T-O5) — prevent imports across the OrchestratorHub-vs-Orchestra boundary.
17. Doc updates: `docs/PANEL_INFRASTRUCTURE.md` reference; `docs/CANONICAL_REFERENCE.md` Orchestra section to reflect the picker surface; `docs/SSOT_W04_REV2_DRAFT.md` §8 cross-link once Rev-2 is canonical.
18. Promote canonical bootstrap performance + price matrices to `docs/FLOWAI_SSOT.md` Locked Rule 18 appendix after Panel ratification.

Estimated engineering effort: **5–7 days** for the wired-adapter expansion + ranking + cost + health + UI + OrchestratorHub integration tests. Excludes adapter-by-adapter wiring of base44 / replit / lovable / cursor (those are deferred per Q5).

---

## 14. Out of scope (intentional)

- Headless adapters (base44, lovable, replit) — pending Q5 disposition; spec keeps them as stubs.
- Cursor adapter — pending public API.
- Replacing the existing `src/components/orchestrator/ModeSelector.jsx` — that component selects the **System Operation** axis per Rev-2 §8a (Hands-On / Reviewed / Hands-Off); the new `AdapterPicker.jsx` selects the **Orchestra Selection** axis per Rev-2 §8 plus per-step adapter. Two distinct concerns.
- Continuous-marketplace-intelligence integration with Agents #11 / #15 / #17 — that work is per Locked Rule 16 and ships as a separate dispatch.
- Multi-tenant RLS on the new tables beyond the basic policies in §8.1 — Production Hardening track per Panel Q4 verdict.
- Mobile-responsive picker UI — desktop-first v1; mobile adaptation as a follow-up.
- Agents #11 / #15 / #17 actually feeding the rolling-outcome-score updates — they're DORMANT today. Spec assumes outcome scores will be empty until those agents wake up; ranking falls back to bootstrap baselines + 24h call-success rate from the cost ledger.
- Refactoring `OrchestratorHub.ts` to call Orchestra directly — explicitly forbidden by §6.4. The hub-Orchestra separation is canonical.

---

## 15. Relation to other Rev-2-conformant specs

This spec is one of three co-canonical engineering specs that operationalise SSOT W04-Rev-2:

| Spec | Path | Commit | Rev-2 sections operationalised |
|---|---|---|---|
| Self-Renewal Agent #3 graduation | `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` | `446ddb5` | §10 Self-Governance Layer, §12 Remediation Modes, §14 GovernanceAuditLog, §15 Agent #3 row |
| Orchestra Integration (THIS doc) | `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` | (new commit) | §8 Orchestra Selection axis, §15.3 OrchestratorHub-vs-Orchestra boundary, Locked Rule 18 |
| (Future) Production Hardening | `docs/specs/PRODUCTION_HARDENING_SPEC.md` | (not yet drafted) | §13 Auth+Roles, §14 GovernanceAuditLog hardening, §16 Deployment Infra, §22 Multi-tenant RLS enforcement |

The Self-Renewal Agent #3 spec consumes this Orchestra surface heavily:

- Agent #3's fork-and-fix path dispatches via `orchestra.dispatch('code-patch', ...)` and `orchestra.dispatch('generate-from-scratch', ...)` — both will pick up the new ranking + health + cost + fallback machinery once this spec ships.
- Agent #3 §6 Q4 (execution surface) becomes simpler when Orchestra has health + fallback: a degraded primary adapter no longer blocks fork-and-fix; the chain finds a healthy member.
- Cost ceilings in §8.4 apply equally to Agent #3 invocations, with `caller_agent_id = 3` recorded.

Engineering dispatches should sequence Orchestra picker BEFORE Agent #3 graduation, because the latter benefits from the former being in place.

---

*End of spec. Pending CEO disposition on Open Questions §12 + W6 re-Panel of SSOT W04-Rev-2 (which this spec depends on) before engineering dispatch.*
