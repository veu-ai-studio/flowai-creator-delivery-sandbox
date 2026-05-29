# SSOT Amendment Draft — CA-11 (Agent Self-Orchestration + Per-Agent Tool Intelligence)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-15.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` Rev-2.1 + ENTRY 003–006 (commit `66149da` and predecessors).
**Target sections amended:**
- §8 The Orchestra (CA-11-D — extend Locked Rule 18 application from Orchestra-level to per-agent ToolMenu).
- §15.1 Agent roster (CA-11-B — add ToolMenu column to all 26 agent rows + new sub-section §15.5 documenting the per-agent self-orchestration model).
- §15.2 Interaction model (CA-11-A — `OrchestratorHub.selectTool()` new method documented alongside `invokeStepOwner()`).
- §25 Locked Rule 18 (CA-11-D — extension language).
- §22 Product-Agnostic Rule (CA-11-E — `agentToolConstraints` metadata field added as canonical override mechanism; no code changes).
- §14 GovernanceAuditLog (CA-11-A audit-log topics for tool selection + fallback).

**Lineage:** CEO-locked feature spec 2026-05-15. Five sub-amendments bundled:
- **CA-11-A:** Agent Self-Orchestration Model — every agent maintains its own ranked ToolRegistry; Locked Rule 18 formula applied at invocation time; fallback chain; audit-log.
- **CA-11-B:** Per-Agent Tool Menus — best-in-industry tool list per agent role (26 agents).
- **CA-11-C:** AgentRegistry schema extension — `toolMenu: ToolEntry[]` field + validator (≥3 entries) + `OrchestratorHub.selectTool()` method.
- **CA-11-D:** Locked Rule 18 extension — formula applies BOTH at Orchestra level (cross-product adapter ranking per §8) AND at per-agent ToolMenu level (per-invocation selection per CA-11-A); separate performance-score tracking.
- **CA-11-E:** CEO constraint mechanism — `agentToolConstraints` metadata in ProductRegistry rows (allowedTools + blockedTools per agent); zero code changes per §22.

**Coupled with:** CA-7 (EXECUTOR_REGISTRY — Self-Renewal Executor's `toolMenu` inherits sibling-namespace pattern), CA-9-B (Agent #26 ToolMenu + Agent #11/#15/#17 expansions), CA-10-D (Symbiotic Feed-Back Loop — ProductSSOT annotations + overrides can shape per-agent tool selection per CA-10-D.2 CEO-equivalent-directive treatment), ACE/ENTRY 006 (Agent #21 ToolMenu = `playwright` + `browserless` + `anthropic-api` already documented; CA-11-B canonicalises into the new schema).

---

## CA-11-A — Agent Self-Orchestration Model

### CA-11-A.1 Background — current state vs target

**Today (post-ENTRY 006):** the Orchestra registry (`src/lib/orchestra/index.js`) holds a single global ranked list of 10 adapters (§8 + Orchestra Integration Spec). Agents dispatch via `orchestra.dispatch(action, payload, opts)` and the dispatcher consults a hard-coded `preferred` table per action. There is NO per-agent ToolMenu — every agent uses the same global preferred-adapter routing. This is acceptable for early shipping but does not allow:
- Per-agent customisation of preferred adapter ordering (e.g. Agent #2 Code Builder prefers `claude-code` over `cursor`; Agent #7 Design prefers `v0` over `lovable` — both currently bundled in the same global routing).
- Per-product override of agent tool selection (e.g. tenant A wants Agent #6 Research to use Perplexity not Anthropic API).
- Audit trail of WHY a given adapter was selected for a given invocation.

**Target (per CA-11):** every agent maintains its own canonical **ToolMenu** — a ranked array of `ToolEntry` records, minimum 3 entries per (agent, step) pair, expanded where the industry offers more. At every invocation, `OrchestratorHub.selectTool(agentId, stepKey, ctx)` applies the Locked Rule 18 ranking formula (per CA-11-D extension), respects CEO constraints from `ProductRegistry.agentToolConstraints` (CA-11-E), and falls back through the ranked list on failure (per CA-11-A.4 below). Every selection + fallback emits an audit-log entry.

### CA-11-A.2 ToolMenu shape

```ts
interface ToolEntry {
  readonly name: string;            // human label, e.g. "Claude Code"
  readonly adapterId: string;       // Orchestra member id, e.g. 'claude-code'
  readonly rankScore: number;       // [0.0, 1.0], computed per Locked Rule 18 + CA-11-D
  readonly costTier: 'free' | 'low' | 'medium' | 'high' | 'enterprise';
  readonly contextTypes: readonly string[];   // capability hints, e.g. ['code-patch', 'generate-from-scratch']
  readonly ceoConstrained?: boolean;          // true if subject to ProductRegistry override per CA-11-E
}

interface AgentRecord {              // EXTENDED per CA-11-C
  // ... existing fields ...
  readonly toolMenu: readonly ToolEntry[];    // MUST have ≥ 3 entries per validator
}
```

**Ranking ordering:** the ToolMenu is stored as an array sorted by `rankScore` descending; tie-breakers per Orchestra Integration Spec §4.5 (lower p50 latency wins; then lower consecutiveFailures; then lexicographic adapter id).

### CA-11-A.3 Selection algorithm (canonical)

```
OrchestratorHub.selectTool(agentId, stepKey, ctx):
  agent = getAgent(agentId) OR getExecutor(<key resolved by mapping table>)
  if !agent.toolMenu OR agent.toolMenu.length < 3:
    throw RegistryError("agent #N lacks valid ToolMenu (≥3 entries required per CA-11-C validator)")

  # CA-11-E: apply ProductRegistry overrides if present
  constraints = readProductRegistry(ctx.productId).agentToolConstraints?.find(c => c.agentId === agentId)
  candidates = agent.toolMenu
  if constraints?.blockedTools: candidates = candidates.filter(t => !constraints.blockedTools.includes(t.adapterId))
  if constraints?.allowedTools: candidates = candidates.filter(t => constraints.allowedTools.includes(t.adapterId))

  if candidates.length === 0:
    emit audit-log { topic: 'agent.tool_selection.no_candidates.v1', agentId, stepKey, ctx, blockedAll: true }
    throw RegistryError("CEO constraints eliminated all ToolMenu candidates for agent #N — operator must revise ProductRegistry.agentToolConstraints")

  # Apply Locked Rule 18 ranking (per CA-11-D — per-agent rolling outcome scores blend with bootstrap baseline)
  ranked = candidates.map(t => ({ ...t, currentRankScore: computePerAgentRank(t, agentId, stepKey) }))
                     .sort(descBy('currentRankScore'))

  # Recommended/Auto/User-Choice mode interaction per Rev-2.1 §8 (Orchestra Selection axis)
  switch (ctx.orchestraSelectionMode):
    case 'auto':          return ranked[0]
    case 'recommended':   return { primary: ranked[0], userPick: ctx.userPick, highlighted: true }
    case 'user_choice':   if !ctx.userPick: throw ValidationError("user_choice mode requires userPick")
                          return ranked.find(t => t.adapterId === ctx.userPick)
```

### CA-11-A.4 Fallback chain on failure

Every `orchestra.dispatch()` invocation from inside an agent's `act()` is wrapped by `selectTool()` + fallback logic:

```
async function dispatchWithFallback(agentId, stepKey, action, payload, ctx):
  ranked = OrchestratorHub.selectTool(agentId, stepKey, ctx).rankedList
  for (i, tool) in ranked:
    result = await orchestra.dispatch(action, payload, { ...ctx, memberId: tool.adapterId })
    audit-log {
      topic: 'agent.tool_selection.attempt.v1',
      agentId, stepKey, action, adapterId: tool.adapterId, rank_position: i,
      ok: result.ok, latency_ms, at
    }
    if result.ok: return result
    # On retryable failure: try next tool in ranked order
    if isRetryable(result.error): continue
    # Non-retryable (401, 403, schema-mismatch) → halt, surface
    break

  # All tools exhausted
  audit-log {
    topic: 'agent.tool_selection.exhausted.v1',
    agentId, stepKey, action, attempts: ranked.length, last_error, at
  }
  return { ok: false, error: 'all_tools_exhausted', tried: ranked.map(t => t.adapterId) }
```

**Retryable error patterns** (mirrors Orchestra Integration Spec §9.2): `429`, `5xx`, `ECONNRESET`, `not yet wired`, `timeout`, `deferred:true` (stub-only members).

**Non-retryable patterns:** `401`/`403` auth, `400` malformed payload, schema validation error, `xss-attempt-blocked` (security-policy violation).

**Max fallback hops:** capped at **min(toolMenu.length, 3)** — same 3-hop cap as Orchestra Integration Spec §9.5 to prevent thundering-herd cascades.

### CA-11-A.5 New audit-log topics (per §14.1 ripple)

| Topic | Source | Fields |
|---|---|---|
| `agent.tool_selection.attempt.v1` | Every `dispatchWithFallback()` per-tool attempt | `{ agentId, stepKey, action, adapterId, rank_position, ok, latency_ms, at }` |
| `agent.tool_selection.no_candidates.v1` | `selectTool()` when CEO constraints eliminated all options | `{ agentId, stepKey, ctx_productId, blockedAll: true, at }` |
| `agent.tool_selection.exhausted.v1` | Fallback chain exhausted; all candidates failed | `{ agentId, stepKey, action, attempts, last_error, at }` |
| `agent.tool_selection.ceo_constrained.v1` | Audit signal when ProductRegistry constraints applied | `{ agentId, ctx_productId, blockedTools, allowedTools, effectiveCandidates, at }` |

Four new topics. Combined with prior ENTRY 005 + ENTRY 006 deltas: MessageBus topic count **65 → 69** after CA-11 promotion.

---

## CA-11-B — Per-Agent Tool Menus (all 26 agents)

ToolMenu entries below use current best-in-industry 2026 landscape (per CEO-locked dispatch). Each entry is a `ToolEntry` with `name`, `adapterId` (Orchestra member id where wired; placeholder where deferred), `rankScore` (bootstrap baseline; refined per CA-11-D over time), `costTier`, `contextTypes`. **Validator-enforced minimum: ≥3 entries per agent.** Where the industry offers more, additional entries listed up to the practical ceiling.

### CA-11-B.1 Coding / Build agents

**Agent #2 Code Builder** (step-owner step 3 build; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Claude Code | `claude-code` | high | `code-patch`, `generate-from-scratch` | 0.92 |
| 2 | OpenAI Codex | `openai-codex` (Orchestra candidate per CA-9-A seed list) | high | `code-patch`, `generate-from-scratch`, `deploy` | 0.86 |
| 3 | Cursor | `cursor` (deferred stub today; CA-9-A re-evaluation pending) | medium | `code-patch` | 0.78 |
| 4 | GitHub Copilot Workspace | `github-copilot-workspace` (Orchestra candidate, Tier 1) | medium | `code-patch`, `generate-from-scratch`, `build` | 0.82 |
| 5 | Devin (Cognition Labs) | `devin` (Orchestra candidate, Tier 1) | enterprise | `generate-from-scratch`, `code-patch`, `build`, `deploy` | 0.83 |
| 6 | Amazon Kiro | `kiro` (Orchestra candidate, Tier 1) | medium | `generate-from-scratch`, `build`, `deploy` (AWS-native) | 0.79 |

**Agent #21 Ops Runner Alpha — Aggressive Crawl Conductor** (per ENTRY 006):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Playwright | `playwright` | low | `interact`, `crawl` | 0.95 |
| 2 | Browserless | `browserless` | low | `crawl`, `screenshot` | 0.90 |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze`, `score` (used for surface classification + novel-category detection) | 0.92 |

Already canonical per §15.1 row 21 (ENTRY 006); CA-11-B canonicalises into the ToolMenu schema.

### CA-11-B.2 Research / Analysis agents

**Agent #1 Lifecycle Engine** (always-on; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize`, `extract-structured` | 0.92 |
| 2 | OpenAI API (GPT-5) | `openrouter` (model `openai/gpt-5`) | high | `analyze`, `summarize` | 0.88 |
| 3 | Perplexity | `openrouter` (model `perplexity/sonar`) — also reach-able directly via `perplexity` adapter when wired | high | `analyze`, `web-grounded-research` | 0.85 |

**Agent #6 Research** (step-owner step 1 research; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Browserless | `browserless` | low | `crawl` | 0.90 |
| 2 | Playwright | `playwright` | low | `crawl`, `interact` | 0.85 |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize`, `extract-structured` | 0.92 |
| 4 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` | 0.85 |

**Agent #11 Strategic Intelligence** (cross-step; recommend_only; per CA-9-B charter expansion — global AI-platform discovery):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research`, `analyze` | 0.88 |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` | 0.92 |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, `summarize`, multimodal | 0.85 |
| 4 | Browserless | `browserless` | low | `crawl` (vendor changelog poll per CA-9-A) | 0.90 |

**Agent #15 Benchmarking** (cross-step; recommend_only; per CA-9-B — continuous head-to-head scoring):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `score` (rubric-based benchmark scoring) | 0.92 |
| 2 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `score`, `analyze` | 0.88 |
| 3 | Browserless | `browserless` | low | `crawl` (vendor performance evidence gathering) | 0.90 |

### CA-11-B.3 Design agents

**Agent #7 Design** (step-owner step 2 design; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | v0 (Vercel) | `v0` | medium | `design`, `generate-from-scratch`, `code-patch` (React/Tailwind/Next specialist) | 0.92 |
| 2 | Lovable | `lovable` (Archived per §8.1; re-activation pending) | medium | `design`, `generate-from-scratch` | 0.85 |
| 3 | Bolt.new | `bolt-new` (Orchestra candidate, Tier 2) | medium | `design`, `generate-from-scratch`, `build`, `deploy` | 0.80 |
| 4 | Firebase Studio | `firebase-studio` (Orchestra candidate, Tier 2) | medium | `design`, `generate-from-scratch`, `build`, `deploy` | 0.78 |
| 5 | Base44 | `base44` (deferred per §8.1) | medium | `design`, `source-retrieval`, `build` | 0.80 |

### CA-11-B.4 QA / Testing agents

**Agent #8 Quality Audit** (step-owner step 4 qa_audit; flowai-only; recommend_only — owns 5-dimension scoring engine):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `score` (5-dimension rubric per §10.1) | 0.92 |
| 2 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `analyze`, `score` | 0.88 |
| 3 | Claude Code | `claude-code` | high | `code-patch` (for fix proposals on Security Posture dim) | 0.88 |
| 4 | Playwright | `playwright` | low | `interact` (live functional probing during audit) | 0.95 |

**W4 Smoke Testing Harness** (workstream, NOT an agent — listed for completeness; uses these tools as part of the W4 dispatched test execution per `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md`):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Playwright | `playwright` | low | `interact`, `crawl` (446 adversarial tests per spec §10) | 0.95 |
| 2 | Browserless | `browserless` | low | `crawl`, `screenshot` | 0.90 |
| 3 | Vitest | `vitest` (internal test framework, not an Orchestra adapter — bundled with Vitest module) | free | `unit-test`, `integration-test` | n/a |
| 4 | Anthropic API direct (MockClaude per LD-6) | `anthropic-api` | high (real) / free (mock) | `analyze` (real Claude only on prompt-injection cases A2-X1 / A4-X1 / A5-X1 / SURF-ADV-5) | 0.92 |

W4 is intentionally a workstream not an agent; the table above provides its canonical tool inventory for cross-reference.

### CA-11-B.5 Deployment agents (Step 5 Deploy)

Step 5 Deploy is owned by no agent today (it's orchestrator-only per `_registry.ts` mode classification comment). CA-11-B does NOT introduce a new agent for it — the deployment ToolMenu is consumed by whichever agent emits `2.build.completed.v1` and chains to deploy.

**Deploy ToolMenu** (referenced canonically; bound to the deploy-step orchestrator-only path):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Vercel | `vercel` (internal 11th member per §8 note) | free | `deploy`, `source-retrieval` | 0.95 |
| 2 | Netlify | `netlify` (Orchestra candidate, NEW for CA-11-B; ENTRY 005 cohort did not enumerate) | low | `deploy` | 0.85 |
| 3 | Railway | `railway` (note: Rev-2.1 §8 + PANEL_INFRASTRUCTURE.md §2.6 confirmed Railway is NOT a panel/LLM member — distinct context here: deployment-platform, not LLM-inference; CA-11-B permits Railway as a deploy adapter despite the panel exclusion) | low | `deploy` | 0.83 |
| 4 | Render | `render` (Orchestra candidate, NEW) | low | `deploy` | 0.80 |
| 5 | AWS Amplify | `aws-amplify` (Orchestra candidate, NEW; carve-out evaluation by Agent #11 + #14 required per §8.1 — AWS-bound data-residency) | medium | `deploy` | 0.78 |

### CA-11-B.6 Monitoring agents

**Agent #10 Monitor** (step-owner step 8 monitor; embedded; recommend_only; per CA-9-C charter expansion):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Sentry | `sentry` (NEW Orchestra adapter proposed; deferred stub today) | low | `monitor-errors`, `track-performance` | 0.92 |
| 2 | Datadog | `datadog` (NEW; carve-out for cost — `enterprise` tier weighting drops rank_score) | enterprise | `monitor-infrastructure`, `monitor-logs`, `monitor-traces` | 0.88 |
| 3 | Vercel Analytics | `vercel` (extended capabilities — same adapter as deploy) | free | `monitor-page-views`, `monitor-web-vitals` | 0.85 |
| 4 | PostHog | `posthog` (NEW; open-source — `low` tier) | low | `monitor-product-analytics`, `feature-flags` | 0.87 |
| 5 | New Relic | `new-relic` (NEW) | high | `monitor-infrastructure`, `monitor-apm` | 0.83 |
| 6 | Browserless | `browserless` | low | `crawl` (customer review scraping per CA-9-C) | 0.90 |
| 7 | Anthropic API direct | `anthropic-api` | high | `analyze` (sentiment classification on customer-feedback per CA-9-C / LD-6 real-Claude-only) | 0.92 |

**Agent #16 Productivity / HR** (cross-step; flowai-only; recommend_only — not yet expanded):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` | 0.92 |
| 2 | Sentry | `sentry` | low | `monitor-errors` (developer-productivity signal) | 0.92 |
| 3 | PostHog | `posthog` | low | `monitor-product-analytics` (engagement signal) | 0.87 |

### CA-11-B.7 GTM / Business agents

**Agent #9 Go-to-Market** (step-owner step 7 gtm; embedded; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` | 0.92 |
| 2 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `analyze`, `summarize` | 0.88 |
| 3 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (competitive intel) | 0.85 |
| 4 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal | 0.85 |

**Agent #14 Public Policy** (cross-step; flowai-only; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (regulatory tracking) | 0.88 |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` (policy-text comprehension) | 0.92 |
| 3 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `analyze` | 0.88 |
| 4 | Browserless | `browserless` | low | `crawl` (regulatory site monitoring) | 0.90 |

**Agent #18 Business Planning** (cross-step; flowai-only; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` | 0.92 |
| 2 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `analyze` | 0.88 |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal | 0.85 |

### CA-11-B.8 Self-Protection (#13)

**Agent #13 Self-Protection (anti-crawl / IP)** (always-on; embedded; recommend_only):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Cloudflare Bot Management | `cloudflare-bot` (NEW Orchestra adapter proposed; deferred) | medium | `bot-detection`, `edge-defense` | 0.92 |
| 2 | Browserless | `browserless` | low | `crawl` (probe own surface for clones/leaks) | 0.90 |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze` (DMCA letter generation, clone-detection classifier) | 0.92 |
| 4 | Custom edge functions | `vercel` (extended — Vercel Edge Functions as Self-Protection runtime; deferred stub for `edge-defense` capability) | free | `edge-defense` | 0.85 |

### CA-11-B.9 Orchestra Research (#26)

**Agent #26 Orchestra Research Agent** (always-on; embedded; dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` per CA-9-Q4=(b)):

| # | Name | adapterId | costTier | contextTypes | Baseline rankScore |
|---|---|---|---|---|---:|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research`, `vendor-tracking` | 0.88 |
| 2 | Browserless | `browserless` | low | `crawl` (vendor changelog poll + curated tracker URLs) | 0.90 |
| 3 | OpenRouter (frontier models) | `openrouter` | high | `analyze`, `summarize`, `extract-structured` | 0.85 |
| 4 | Anthropic API direct | `anthropic-api` | high | `analyze` (candidate fit assessment) | 0.92 |

### CA-11-B.10 Other agents (charter ToolMenus)

The remaining agents inherit their ToolMenus from charter analysis:

| Agent | ToolMenu top-3 (canonical) |
|---|---|
| #3 Self-Renewal | `anthropic-api` (analyze), `claude-code` (code-patch via Executor per CA-7), `browserless` (re-crawl verification) |
| #4 Provider Onboarding | `anthropic-api` (analyze), `stripe-connect` (NEW deferred adapter — wires per CA-9-C LD-3 sandbox/mock split), `openrouter` (fallback analyze) |
| #5 End-Customer Intake | `anthropic-api` (analyze), `browserless` (verification crawl), `openrouter` (fallback) |
| #12 Portfolio Risk | `anthropic-api`, `openrouter` (`openai/gpt-5`), `openrouter` (`google/gemini-2.5-pro`) |
| #17 Product Evolution | `perplexity`, `anthropic-api`, `openrouter` |
| #19 Technological Evolution | `perplexity`, `anthropic-api`, `browserless` |
| #20 Environmental Impacts | `anthropic-api`, `perplexity`, `openrouter` (`google/gemini-2.5-pro`) |
| #22 Ops Runner Beta | TBD per step assignment (OQ-2 from Rev-2.1 §27); placeholder `playwright`, `browserless`, `anthropic-api` |
| #23 Ops Runner Gamma — Cost Governor (per Layer 2 PG1 hint) | `anthropic-api` (analyze cost ledgers), `openrouter` (forecasting), `vercel` (deployment-cost signal) |
| #24 Ops Runner Delta | TBD; placeholder same as #22 |
| #25 Ops Runner Epsilon | TBD; placeholder same as #22 |

All TBD-tagged ToolMenus need refinement once the corresponding agent's step binding is canonicalised (per Rev-2.1 §27 OQ-2).

---

## CA-11-C — AgentRegistry Schema Extension

### CA-11-C.1 Type contract amendments

`src/lib/agents/_registry.ts`:

```ts
// EXTEND existing AgentRecord interface
export interface AgentRecord {
  // ... all existing fields unchanged ...
  readonly toolMenu: readonly ToolEntry[];   // NEW per CA-11-C
}

export interface ToolEntry {
  readonly name: string;
  readonly adapterId: string;
  readonly rankScore: number;                // [0.0, 1.0]
  readonly costTier: 'free' | 'low' | 'medium' | 'high' | 'enterprise';
  readonly contextTypes: readonly string[];
  readonly ceoConstrained?: boolean;
}

// Extend EXECUTOR_REGISTRY's ExecutorRecord interface analogously (CA-7 sibling)
export interface ExecutorRecord {
  // ... all existing fields unchanged ...
  readonly toolMenu: readonly ToolEntry[];   // executors get their own ToolMenu too
}
```

### CA-11-C.2 Validator extension

Extend `validateRosterPartition()` IIFE in `BaseAgent.js` AND `validateExecutors()` IIFE in `_registry.ts` to enforce per-record:

```js
for (const a of AGENT_REGISTRY) {
  if (!Array.isArray(a.toolMenu)) throw new Error(`Agent #${a.id} missing toolMenu array`);
  if (a.toolMenu.length < 3) throw new Error(`Agent #${a.id} toolMenu has only ${a.toolMenu.length} entries (≥3 required per CA-11-C)`);
  const ids = new Set();
  for (const t of a.toolMenu) {
    if (typeof t.adapterId !== 'string' || !t.adapterId) throw new Error(`Agent #${a.id} toolMenu entry missing adapterId`);
    if (ids.has(t.adapterId)) throw new Error(`Agent #${a.id} toolMenu duplicate adapterId "${t.adapterId}"`);
    ids.add(t.adapterId);
    if (typeof t.rankScore !== 'number' || t.rankScore < 0 || t.rankScore > 1) throw new Error(`Agent #${a.id} toolMenu entry "${t.adapterId}" invalid rankScore`);
    if (!['free','low','medium','high','enterprise'].includes(t.costTier)) throw new Error(`Agent #${a.id} toolMenu entry "${t.adapterId}" invalid costTier`);
    if (!Array.isArray(t.contextTypes) || t.contextTypes.length === 0) throw new Error(`Agent #${a.id} toolMenu entry "${t.adapterId}" must declare ≥1 contextType`);
  }
}
```

### CA-11-C.3 OrchestratorHub.selectTool() method

New public method on `OrchestratorHub` (`src/lib/agents/orchestrator/OrchestratorHub.ts`):

```ts
public async selectTool(
  agentId: number,
  stepKey: string | null,
  ctx: { productId: string; runId: string; orchestraSelectionMode?: 'auto'|'recommended'|'user_choice'; userPick?: string }
): Promise<{ primary: ToolEntry; rankedList: ToolEntry[]; constraintsApplied: AgentToolConstraints | null }> {
  // Implementation per CA-11-A.3 algorithm
}
```

`AgentToolConstraints` shape per CA-11-E:

```ts
interface AgentToolConstraints {
  readonly agentId: number;
  readonly allowedTools?: readonly string[];    // adapterId allowlist; if set, only these
  readonly blockedTools?: readonly string[];    // adapterId blocklist; if set, these excluded
}
```

### CA-11-C.4 Dispatch-with-fallback wrapper

New helper module `src/lib/agents/dispatchWithFallback.ts`:

```ts
export async function dispatchWithFallback(
  hub: OrchestratorHub,
  agentId: number,
  stepKey: string | null,
  action: string,
  payload: object,
  ctx: { productId: string; runId: string; callerAgentId: number; ... }
): Promise<MemberResult>;
```

Implementation per CA-11-A.4. Cap fallback at `min(toolMenu.length, 3)`. Emits 4 audit-log topics per CA-11-A.5.

---

## CA-11-D — Locked Rule 18 Extension

### CA-11-D.1 Current state

Rev-2.1 Locked Rule 18 (per ENTRY 005 amendment): "Tool Intelligence Marketplace ranking formula canonical per §8 + `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`. **Orchestra self-expansion (auto-admission) per §8.1 + CA-9-A — admission gate is deterministic threshold; deprecation + capability remapping + carve-out remain Panel-gated per Locked Rule 13.**"

The rule applies at **Orchestra-level** — i.e. cross-product adapter ranking + auto-admission to the 10-member roster.

### CA-11-D.2 Proposed extension (per CA-11-D)

Amend Locked Rule 18 to add the per-agent ToolMenu application:

```md
18. Tool Intelligence Marketplace ranking formula canonical per §8 +
    `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`. **Orchestra
    self-expansion (auto-admission) per §8.1 + CA-9-A — admission gate
    is deterministic threshold; deprecation + capability remapping +
    carve-out remain Panel-gated per Locked Rule 13.** **Per-agent
    ToolMenu selection per §15.5 + CA-11-A applies the same
    `rank_score = (performance × 0.6) + (price × 0.4)` formula at
    invocation time within each agent's ranked ToolMenu (≥3 entries
    per agent per CA-11-C validator); per-agent performance scores
    track separately from global Orchestra scores per CA-11-D.3.
    CEO constraints from `ProductRegistry.agentToolConstraints` per
    CA-11-E may narrow the ToolMenu before ranking applies.**
```

### CA-11-D.3 Per-agent vs global score tracking

Today the Orchestra Integration Spec §4.2 + §7 specify rolling outcome scores per `(adapter, capability)`. CA-11-D adds an orthogonal dimension: rolling outcome scores per `(agent, adapter, capability)` triple.

| Dimension | Updates on | Used by |
|---|---|---|
| Global `(adapter, capability)` score | Every Orchestra dispatch | §8 auto-admission gate; cross-product ranking |
| Per-agent `(agent, adapter, capability)` score | Every `dispatchWithFallback()` invocation | CA-11-A.3 `selectTool()` ranking |

The per-agent dimension allows an adapter to be ranked differently inside Agent #2 Code Builder vs Agent #21 Aggressive Crawl Conductor — e.g. claude-code may rank 0.95 for Agent #2 (code-patch specialist context) but 0.88 for Agent #21 (analyze + score in the surface-classification path).

Storage: Supabase `flowai_agent_tool_outcome` table per Orchestra spec §7.1 schema extended with `agent_id INTEGER NOT NULL` column.

---

## CA-11-E — CEO Constraint Mechanism

### CA-11-E.1 Metadata extension to ProductRegistry

`ProductRegistry` row schema extended with optional field:

```ts
interface ProductRegistryRow {
  id: string;                                   // productId
  // ... existing fields ...
  agentToolConstraints?: AgentToolConstraints[];   // NEW per CA-11-E
}

interface AgentToolConstraints {
  agentId: number;                              // 1..26 + executor keys (string)
  allowedTools?: string[];                      // adapterId allowlist
  blockedTools?: string[];                      // adapterId blocklist
  rationale?: string;                           // free-text — appears in audit log
  setBy: string;                                // userId of CEO/admin who set the constraint
  setAt: string;                                // ISO-8601 timestamp
}
```

### CA-11-E.2 Zero code changes per §22

Constraints live in the **metadata layer** per Rev-2.1 §22 Product-Agnostic Rule (and §3 metadata-driven architecture pattern). The constraint is a Supabase row in `flowai_product_config` (existing table per §22) keyed by `(productId, 'agentToolConstraints')`; OR a Doppler-vault path `flowai/<env>/PRODUCTS_<productId>_AGENT_TOOL_CONSTRAINTS` (JSON-encoded).

**No `src/` code is product-specific.** `OrchestratorHub.selectTool()` reads the metadata at invocation time; the engine treats `productId` as a runtime parameter. Adding a constraint for the 6th, 10th, 100th product is a metadata write — zero code change. This passes the §22 test of correctness.

### CA-11-E.3 Audit-log on every constraint application

Per CA-11-A.5, the topic `agent.tool_selection.ceo_constrained.v1` emits whenever a constraint is applied. Operator sees in `/audit-trail`:

> 2026-05-15T14:23:11Z — Agent #2 Code Builder ToolMenu narrowed by CEO constraint
> productId: tenant_saige
> blockedTools: ['devin']
> rationale: "Devin's autonomy level not aligned with SAIGE compliance posture per CEO 2026-05-14"
> effectiveCandidates: ['claude-code', 'openai-codex', 'cursor', 'github-copilot-workspace', 'kiro']

### CA-11-E.4 Constraint precedence

If both `allowedTools` and `blockedTools` are set:
1. Apply `blockedTools` first (subtract from ToolMenu).
2. Apply `allowedTools` second (intersect remaining with allow-list).

If `blockedTools` eliminates all entries → `agent.tool_selection.no_candidates.v1` audit event; selectTool throws explicit `RegistryError`.

### CA-11-E.5 Override durability + scope

Constraints persist until explicitly removed by admin. They are **per-product**, NOT per-run — once set, every subsequent pipeline run on that product respects them. Operator/admin can revise via:
- Admin UI on `/settings/agent-tool-constraints` (NEW page).
- Direct Supabase write via `service_role`.
- Doppler vault edit (for env-suffixed alternative storage).

Every revision audit-logged with the prior+next values + admin userId.

---

## CA-11-Q — Panel Questions (5–8, standard 4-option + INSUFFICIENT_INFORMATION frame)

### CA-11-Q1 — ToolMenu validator threshold

CA-11-C validator enforces ≥3 entries per agent. Is this the right minimum?

- (a) Adopt as proposed: **≥3 entries** per agent (W3 recommendation; balances coverage with charter discipline).
- (b) Tighten: ≥5 entries per agent (more fallback redundancy; harder for niche agents like #16 Productivity / HR to populate).
- (c) Flexible per agent mode: always-on agents ≥5; step-owner agents ≥3; cross-step agents ≥2.
- (d) Different threshold — specify in rationale.

### CA-11-Q2 — Tool selection timing

CA-11-A.3 has `selectTool()` run once at the start of `dispatchWithFallback()` and fall back to next-best on failure. Should it instead be **real-time adaptive** (re-rank during fallback based on observed latency / cost in the current run)?

- (a) Adopt pre-step ranking as proposed (deterministic; cheap; W3 recommendation).
- (b) Real-time adaptive — re-rank between fallback attempts using in-run observed signals.
- (c) Hybrid — pre-step ranking, but if a fallback attempt fails with a retryable error, re-rank the remaining candidates by current observed latency.
- (d) Different — specify in rationale.

### CA-11-Q3 — Cross-step agent tool scope

CA-11-B.10 assigns cross-step agents (#11, #12, #14, #17, #19, #20) a flat ToolMenu (not stepKey-conditional). Should cross-step agents instead have a stepKey-conditional ToolMenu (different tools for different steps the agent intervenes in)?

- (a) Adopt flat ToolMenu for cross-step agents (W3 recommendation; simpler schema).
- (b) StepKey-conditional ToolMenu — cross-step agents declare `toolMenu: { [stepKey: string]: ToolEntry[] }` instead of flat array.
- (c) Hybrid — flat ToolMenu by default; agents may opt into stepKey-conditional via charter declaration.
- (d) Different — specify in rationale.

### CA-11-Q4 — Industry tool list canonicalisation

CA-11-B's per-agent tool lists reflect the 2026 best-in-industry landscape. Should the canonical lists be **frozen** at promotion time, **updated quarterly**, or **Panel-reviewed on every change**?

- (a) Frozen until next CA-n promotion (immutable canonical; explicit amendment cycle to update).
- (b) Updated quarterly via Agent #26 + Agent #11 + Agent #15 automated pipeline (per CA-9-A self-expansion + CA-9-B charter expansions); audit-logged at update time.
- (c) Panel-reviewed on every change (every addition / removal / re-ranking goes through W6).
- (d) Hybrid — automated quarterly refresh per (b), Panel-reviewed only on material changes (e.g. swapping a Tier 1 primary tool); per Locked Rule 17.

### CA-11-Q5 — CEO constraint granularity

CA-11-E proposes per-agent constraints (`agentId` → `allowedTools`/`blockedTools`). Should the constraint surface be more granular?

- (a) Per-agent only (as proposed; W3 recommendation; simple model).
- (b) Per-agent per-step (constraints can target a specific stepKey for a step-owner agent).
- (c) Per-product per-agent per-step (3-dimensional; maximum flexibility; UI complexity).
- (d) All three levels — start with per-agent default; allow per-step override; allow per-product override; constraint precedence: per-step beats per-agent beats per-product default.

### CA-11-Q6 — Fallback failure handling

CA-11-A.4 caps fallback at 3 hops; if all exhausted, returns `{ok: false, error: 'all_tools_exhausted'}`. What should the caller (agent's `act()`) do then?

- (a) Surface to operator as `'medium'` severity finding; document; continue agent run (W3 recommendation — non-blocking).
- (b) Human gate — escalate to admin per §10.2 Human Gates; halt agent run.
- (c) Halt entire pipeline run — `xss-in-form-echo`-style critical halt + Self-Renewal alert.
- (d) Different — specify in rationale.

### CA-11-Q7 — Combined CA-11 disposition

Should CA-11-A + B + C + D + E be promoted as a single unit, or split?

- (a) Promote all five together (recommended — they form one coherent capability).
- (b) Promote A + C + D (mechanism + schema + Locked Rule extension); defer B (tool lists) + E (CEO constraints) to follow-up CA-n.
- (c) Promote A + B + C (mechanism + lists + schema); defer D (Locked Rule extension) + E (CEO constraints) to follow-up CA-n.
- (d) Defer all five (re-Panel after addressing dissent).

---

## Provenance

| Source | Used for |
|---|---|
| CEO-locked feature spec 2026-05-15 | CA-11-A / B / C / D / E scope + ToolMenu industry landscape |
| Rev-2.1 §8 + ENTRY 005 §8.1 (Orchestra self-expansion) + ENTRY 006 §6 (ACE) | CA-11-D Locked Rule 18 extension + cross-link to per-agent application |
| Rev-2.1 §15.1 (26-agent roster) + §15.2 (MessageBus) | CA-11-B per-agent ToolMenu canonicalisation + CA-11-A audit-log topics |
| Rev-2.1 §15.5 (EXECUTOR_REGISTRY per CA-7) | CA-11-C ExecutorRecord ToolMenu parallel extension |
| Rev-2.1 §22 (Product-Agnostic Rule) + §3 (metadata-driven architecture) | CA-11-E zero-code-change constraint mechanism |
| Rev-2.1 §25 Locked Rule 18 | CA-11-D extension target |
| `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §4.2 (rolling outcome scores) + §4.5 (tie-breakers) + §7 (cost tracking) + §9 (fallback chain) | CA-11-A selection algorithm + CA-11-D per-agent score storage extension |
| `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` §E.2 (Agent #21 Orchestra wiring) | CA-11-B.1 Agent #21 ToolMenu canonicalisation; ENTRY 006 alignment |
| `docs/panel-consultations/ssot-finalization-and-agent-roadmap-priority-2026-05-14.md` Recommendation 3 + CEO Decision 2 (4 remediation modes) | CA-11-A model selection acknowledgement; modes (ii)+(iii) remain deferred per Panel Q3 (c) |
| CEO seed evaluation list 2026-05-15 (CA-9-A.2.1 — Tier 1 + Tier 2 candidates) | CA-11-B includes seed-list candidates in Coding/Build + Design + Deploy agent ToolMenus |

---

## Engineering scope estimate

| Surface | Effort (W-days) |
|---|---:|
| `src/lib/agents/_registry.ts` — extend `AgentRecord` + `ExecutorRecord` with `toolMenu`; populate all 26 agents + 1 executor with CA-11-B menus | 2 |
| `BaseAgent.js` + `_registry.ts` validators — extend `validateRosterPartition()` + `validateExecutors()` per CA-11-C.2 | 1 |
| `OrchestratorHub.ts` — new `selectTool()` method per CA-11-A.3 | 1 |
| `src/lib/agents/dispatchWithFallback.ts` (NEW) — wrapper per CA-11-A.4 | 1 |
| `src/lib/agents/MessageSchema.js` — +4 topic constants (65 → 69) | 0.5 |
| `supabase/migrations/00NN_agent_tool_outcome.sql` — `flowai_agent_tool_outcome` table per CA-11-D.3 + `agentToolConstraints` column on ProductRegistry per CA-11-E.1 | 1 |
| `src/lib/orchestra/ranking.js` (per Orchestra spec §5.2) — extend `getRankedAdapters()` to compute per-agent rank scores per CA-11-D.3 | 1 |
| `src/pages/Settings/AgentToolConstraints.jsx` (NEW UI) — admin can set per-agent constraints per CA-11-E.5 | 1 |
| All existing agent `act()` methods updated to use `dispatchWithFallback()` instead of direct `orchestra.dispatch()` — affects Agent #1/#2/#3 + Agent #3 Self-Renewal Executor + future agents | 2 |
| Test suite — `MockOrchestra` extended for `selectTool()` + fallback chain; per-agent ToolMenu validator tests (≥3 enforcement); CEO-constraint application tests (allowlist + blocklist + no-candidates throw); 4-topic audit-log emission tests | 2 |
| Documentation + canonical updates post-promotion | 1 |
| **TOTAL** | **~13 W-days** |

Depends on: CA-7 / CA-9 / CA-10 / ENTRY 006 already promoted (all are — per CANONICAL_REFERENCE §18.4). No upstream blockers. ~3 weeks of engineering at 1 W/day; ~7 calendar days at 2 W parallel.

---

## Co-sequencing

CA-11 is **independent** of CA-7 / CA-8 / CA-9 / CA-10 / ENTRY 006 (all promoted). It introduces NO new prerequisites and breaks no existing canonical contracts. Promotion order: W6 Panel review → CEO disposition → W2/W5x engineering dispatch → first nightly invocation against the 5 VEU products' agent runs.

---

*End of CA-11 draft. Pending Panel review per §19 + CEO ratification per §18.*
