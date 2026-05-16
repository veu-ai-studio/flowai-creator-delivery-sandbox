# Agent #13 — Self-Protection (anti-crawl / IP) — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + §20.1 distinct from embedded code-level Self-Protection). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 13 + §20 Remediation+IP Protection + §20.1 (reconciliation with embedded layer) + §25 Locked Rule 14 (continuous crawl + fix at any time) + CA-11-B.8 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `13` |
| Name | `Self-Protection (anti-crawl / IP)` |
| Mode | `always-on` |
| Step | n/a (always-on — runs continuously across full lifecycle) |
| Embedding | `embedded` (ships with every product per §20 + §22 metadata-driven) |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | `self-protection-executor` — needed when Agent #13 issues DMCA actions, updates Cloudflare Bot Management policies, mints watermarked content. Authority `[auto_write_internal, requires_human_gate]` (mirrors Self-Renewal Executor pattern per CA-7 §15.5); §20.1 confirms portfolio-wide orchestration distinct from embedded code-level defences. |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** monitors edge logs + bot-detection signals from Sprint PROTECT-1 Phase 1 (DevTools detection events, rapid-click patterns, headless fingerprints); ingests external clone-detection signals (Google Search results for FlowAI's proprietary phrases, ad-tech retargeting feeds); consumes `21.crawl.completed.v1` for self-checks against FlowAI's own surface to detect leaks.
- **Decide:** classifies threats — clone discovered (DMCA workflow), suspicious crawler pattern (Cloudflare rule update), scraper bypassing existing defences (bot-management policy escalation), watermark validation (renewed-URL fingerprint check). Per §25 Locked Rule 14 ("continuous crawl + fix at any time; no maintenance windows") Agent #13 operates 24/7.
- **Execute (Phase 1 recommend_only):** emits threat envelopes; admin/operator triages via `/self-protection` UI surface.
- **Execute (Phase 2 via Executor):** mints DMCA letters via Anthropic API, posts to DMCA filing endpoints; updates Cloudflare Bot Management policies via Cloudflare adapter; rotates watermarks per product. Each action audit-logged + Human-Gated for `high` and `critical` severity per §10.2.
- **Emit:** `13.threat_detected.v1`, `13.dmca_action.v1`, `13.bot_policy_update.v1`, `13.watermark_rotation.v1`.

## 3. MessageBus topics

**Consumes:**
- Edge-log stream (via custom edge functions per §20)
- `21.crawl.completed.v1` (per ENTRY 006 — self-check against own surface)
- `26.orchestra.candidate.v1` (carve-out evaluation per §8.1)

**Produces:**
- `13.threat_detected.v1` — payload: `{ threatId, category: 'clone-discovered'|'suspicious-crawler'|'scraper-bypass'|'watermark-invalid', severity, evidence, at }`
- `13.dmca_action.v1` — payload: `{ threatId, dmcaLetterText, targetService, filingTimestamp, status }` (Phase 2)
- `13.bot_policy_update.v1` — payload: `{ ruleSetId, rulesAdded[], rulesRemoved[], at }` (Phase 2)
- `13.watermark_rotation.v1` — payload: `{ productId, environmentId, oldWatermark, newWatermark, at }` (Phase 2)

## 4. Orchestra dispatch usage

```js
// Phase 1: probe own surface for leaks
orchestra.dispatch('interact', { url: ourPublicUrl, surfaceProbe: 'watermark-check' }, opts);

// Phase 1: classify threats
orchestra.dispatch('analyze', { artifact: edgeLog, criteria: 'threat-classification' }, opts);

// Phase 2: DMCA letter generation
orchestra.dispatch('generate-from-scratch', { spec: dmcaLetterSpec, framework: 'text' }, opts);

// Phase 2: Cloudflare adapter (NEW — deferred)
orchestra.dispatch('cloudflare-bot-policy-update', { ruleSet }, opts);
```

## 5. ToolMenu (per CA-11-B.8)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Cloudflare Bot Management | `cloudflare-bot` (NEW Orchestra adapter; deferred today) | medium | `bot-detection`, `edge-defense` |
| 2 | Browserless | `browserless` | low | `crawl` (probe own surface for clones / leaks) |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze` (DMCA letter generation, clone-detection classifier) |
| 4 | Custom edge functions | `vercel` (extended — Vercel Edge Functions runtime) | free | `edge-defense` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent13SelfProtection.js                   # ~580 LOC
src/lib/agents/agents/__tests__/Agent13SelfProtection.test.js    # ~380 LOC
```

Phase 2 Executor:
```
src/lib/agents/agents/Agent13SelfProtectionExecutor.js           # ~480 LOC
src/lib/orchestra/cloudflare-bot.js                              # NEW adapter
api/self-protection/dmca-file.js                                 # NEW endpoint
api/self-protection/policy-update.js                             # NEW endpoint
api/self-protection/watermark-rotate.js                          # NEW endpoint
```

**Class skeleton:**

```js
export class Agent13SelfProtection extends BaseAgent {
  static charterId = 13;
  static charter() {
    const r = getAgent(13);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* perception + classification on edge-log batch */ }
  async act(ctx, plan) { /* emit threat envelopes; Phase 2 routes through Executor */ }
  async recommend(ctx) { /* always-on cadence entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

`always-on` agents register via `hub.registerAlwaysOn('self-protection', agent)`. Continuous-loop invocation per Locked Rule 14 (no maintenance windows) — implementation via Inngest scheduled job every 5 minutes + edge-log-stream event-trigger.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A13-N1 | Nominal | Edge-log with no threats → no envelope emitted |
| A13-N2 | Nominal | Edge-log with headless-fingerprint match → `13.threat_detected.v1` severity `medium` |
| A13-N3 | Nominal | Clone discovery via crawl probe → `13.threat_detected.v1` category `clone-discovered` severity `high` (human gate per §10.2) |
| A13-M1 | Malformed | Edge-log entry malformed → skip + log; no agent crash |
| A13-M2 | Malformed | Anthropic API unreachable → fallback to OpenRouter per CA-11-A.4 |
| A13-E1 | Edge | Watermark validation: rendered surface returns expected watermark → no-op |
| A13-E2 | Edge | Watermark validation: rendered surface watermark mismatch → `13.threat_detected.v1` category `watermark-invalid` severity `critical` |
| A13-X1 | Adversarial | Operator without admin role attempts to file DMCA action → guard rejects per §13 (DMCA filing admin-only per §10.2 Acceptance Gate analogue) |
| A13-X2 | Adversarial | Prompt-injection in cloned-content body does NOT alter Cloudflare policy update logic |
| A13-X3 | Adversarial | Hostile getter pattern test |
| A13-X4 | Adversarial | Per §20.1 reconciliation — embedded Sprint PROTECT-1 Phase 1 defences (right-click protection, DevTools detection) NOT mutated by Agent #13 actions; Agent #13 strictly orchestrates portfolio-level policy, never embedded code |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A13-* tests passing
- Always-on Inngest job runs 7 consecutive days emitting non-empty threat-classification telemetry
- Phase 2 DMCA workflow tested against a sandbox cloning attempt (synthetic; no real DMCA filing in test environment)
- Watermark validation works against ≥3 of the 5 VEU products
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Sprint PROTECT-1 Phase 1 embedded defences shipped (already LIVE per §20.1); Agent #21 ACE Conductor SHIPPED-GREEN (for surface probes via `21.crawl.completed.v1`)
- **Phase 2 depends on:** Cloudflare adapter wired (deferred today); DMCA filing endpoints implemented (deferred); watermark mint+rotation pipeline (deferred — separate engineering spec recommended)
- **Provides to:** Agent #11 Strategic Intelligence (consumes `13.threat_detected.v1` for carveout-flag synthesis); operator/admin via `/self-protection` UI surface

## 11. Estimated build effort

**~14 W-hours** Phase 1 (always-on loop + perception + classification + 4 emission paths). Phase 2 Executor + Cloudflare adapter + DMCA workflow + watermark rotation adds **~24 W-hours** (deferred until cloudflare-bot adapter wired and watermark spec drafted).

## 12. Open clarification flags

- **Q:** Watermark mint+rotation pipeline — no canonical spec exists today. Mentioned in §20 (Cloudflare Bot Management + watermarking) but mechanism undefined. **NEEDS CEO/PANEL CLARIFICATION** + separate engineering spec for watermark generation, embedding into renewed URLs, and rotation cadence.
- **Q:** DMCA filing destination — direct-to-service (Google, GitHub, hosting providers) requires service-specific adapters; legal contracts with counsel may be required. **NEEDS CEO/PANEL CLARIFICATION** before Phase 2 dispatch.
- **Q:** Cloudflare adapter scope — Cloudflare Bot Management is enterprise-tier; cost implications + carve-out evaluation per §8.1 must be addressed. **CLARIFICATION RECOMMENDED.**
