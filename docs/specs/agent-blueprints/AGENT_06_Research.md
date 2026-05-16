# Agent #6 — Research — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + commit `0fc8851` block-semantic wiring). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern (`src/lib/agents/agents/Agent3SelfRenewal.js`, commit `68a0c75`).
**Anchor canonical:** Rev-2.1 §15.1 row 6 + §9 step 1 research + CA-11-B.2 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `6` |
| Name | `Research` |
| Mode | `step-owner` |
| Step | **1 — `research`** (collab with Agent #1 Lifecycle) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — Research is read-only by design; never elevates |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** receives `1.crawl.request.v1` from AutoRunner step 1 entry; receives raw crawl output from Orchestra dispatch.
- **Decide:** classifies the crawl artifact along five Layers per Rev-2.1 §6 framework (Functionality / Operational / Financial / Business / GTM); produces structured research findings keyed by Layer.
- **Execute:** writes findings to ColdStore lineage (audit only); emits `6.research.findings.v1` on MessageBus; block-semantic on content-insufficient already wired per commit `0fc8851` (returns `block` outcome so AutoRunner halts downstream steps when crawl returned null body).
- **Emit:** `6.research.findings.v1` consumed by Agent #2 Code Builder + Agent #7 Design + Agent #8 Quality Audit downstream.

## 3. MessageBus topics

**Consumes:**
- `1.crawl.request.v1` — entry signal from AutoRunner step 1
- `21.crawl.completed.v1` — when Aggressive Crawl Engine has run (per ENTRY 006), Research consumes its enriched output rather than crawling again

**Produces:**
- `6.research.findings.v1` — payload: `{ runId, productId, layers: { L1, L2, L3, L4, L5 }, marketContext, competitiveSet, confidence, at }`
- `6.research.block.v1` — payload: `{ runId, productId, reason: 'content-insufficient'|'crawl-failed'|'auth-required', at }` (per existing `0fc8851` block-semantic)

## 4. Orchestra dispatch usage (per §15.4)

```js
// Crawl (skip if 21.crawl.completed.v1 already in-stream)
orchestra.dispatch('crawl', { url, force }, opts);

// Analyse the crawl
orchestra.dispatch('analyze', { artifact, criteria: 'five-layer-framework' }, opts);

// Summarise findings into structured envelope
orchestra.dispatch('summarize', { text, maxTokens: 2000 }, opts);
```

## 5. ToolMenu (per CA-11-B.2)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Browserless | `browserless` | low | `crawl` |
| 2 | Playwright | `playwright` | low | `crawl`, `interact` |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize`, `extract-structured` |
| 4 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent6Research.js                 # ~520 LOC mirroring Agent3SelfRenewal.js
src/lib/agents/agents/__tests__/Agent6Research.test.js  # ~350 LOC test suite
```

**Class skeleton (mirrors Agent #3):**

```js
import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';
import { dispatchWithFallback } from '../dispatchWithFallback.js';  // per CA-11-A.4

const HOT_TTL_SECONDS = 24 * 60 * 60;
const HOT_KEYS = Object.freeze({ run: (runId) => `research:run:${runId}` });

export class Agent6Research extends BaseAgent {
  static charterId = 6;
  static charter() {
    const r = getAgent(6);
    return Object.freeze({
      id: r.id, name: r.name,
      flowAiOnly: false, authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  constructor(deps) {
    super(deps);
    if (!deps.hot || !deps.cold || !deps.messageBus) throw new Error('Agent6Research: hot/cold/bus required');
    this.hot = deps.hot; this.cold = deps.cold; this.bus = deps.messageBus;
  }
  async plan(ctx) { /* classify crawl artifact along 5 layers; emit block on content-insufficient */ }
  async act(ctx, plan)  { /* persist + emit 6.research.findings.v1 OR 6.research.block.v1 */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entrypoint */ }
}

export function analyzeFindings(crawlArtifact) { /* pure helper, exported for unit tests */ }
```

## 7. OrchestratorHub wire-in pattern (per PA #2.7)

```js
// src/pages/AutoRunner.jsx — extend getOrchestratorBundle():
import { Agent6Research } from '@/lib/agents/agents/Agent6Research';
const agent6 = new Agent6Research({ logger, messageBus, auditLog, clock, productScope, environment, hot, cold });
hub.registerStepOwner('research', (ctx) => agent6.recommend(ctx));
```

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A6-N1 | Nominal | plan() over a complete crawl artifact returns findings with all 5 layers populated |
| A6-N2 | Nominal | plan() consumes `21.crawl.completed.v1` envelope; skips re-crawl |
| A6-M1 | Malformed | input missing runId throws explicit error caught in BaseAgent.run() |
| A6-M2 | Malformed | crawl artifact `null` triggers `6.research.block.v1` emission with reason `content-insufficient` |
| A6-E1 | Edge | crawl artifact with 100 KB body summarises within token budget |
| A6-E2 | Edge | partial-content crawl (3 of 8 pages) still produces best-effort findings + flags incomplete |
| A6-X1 | Adversarial | prompt-injection in crawl body does NOT take over Claude analyze prompt |
| A6-X2 | Adversarial | hostile getter on ctx fields caught in recommend() extraction try/catch |
| A6-X3 | Adversarial | Orchestra dispatch returns 429 → fallback to next ToolMenu entry per CA-11-A.4 |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- ≥30 vitest invocations land + 0 failing
- `validateRosterPartition()` passes at module load
- AutoRunner step 1 invokes Agent #6 instead of (or alongside) Agent #1 Lifecycle's research role
- 5 neutral-fixture full runs end-to-end produce non-null `6.research.findings.v1` payloads
- W4 adversarial test plan §3 covers Agent #6 with ≥7 test cases passing (mirrors Agent #3's §3.3 9-test set)
- 7 consecutive clean Auto Runner runs on dev SUT without `act.error` on phase 'research'

## 10. Dependencies + sequencing notes

- **Hard depends on:** ToolMenu schema CA-11-C (post-promotion `toolMenu` field on AgentRecord); dispatchWithFallback module CA-11-A.4
- **Soft depends on:** Agent #21 ACE Conductor wired (per ENTRY 006) — when ACE produces `21.crawl.completed.v1`, Research consumes it; otherwise Research dispatches `crawl` itself
- **Blocks downstream:** Agent #8 Quality Audit (consumes findings); Agent #2 Code Builder (consumes findings as build context)

## 11. Estimated build effort

**~8 W-hours** (Agent #6 has the cleanest charter of the dormant set — read-only analyzer; no Executor needed; block semantic already shipped).

## 12. Open clarification flags

None. Charter is unambiguous in Rev-2.1 + commit `0fc8851`.
