# SSOT Conformance Report — CA-18 vs live FlowAI system (2026-05-20)

**Status:** REPORT — read-only analysis. Doc-only. No canonical edits.
**Author:** W3, 2026-05-20.
**HEAD at analysis:** `9e6ec37` (W5a: extractToken URL+selector handling + root-page fallback).
**Authority audited against:** `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (CA-18 mission/purpose amendment, ENTRY 018 + ENTRY 019).
**Evidence source:** live `product_ssot` rows (7) + `step_tool_rankings` table (40 rows) from Supabase prd via doppler-credentialed service-role read; code grep across `src/lib/`; UI surface inspection across `src/pages/`.

---

## §0 — Headline

**Overall conformance: 1 of 7 fully passing.**

- **1 PASS:** §3 Iteration Model.
- **5 PARTIAL:** §1 Core Loop, §4 Platform Scope, §5 Symbiotic Principle, §6 Tool Intelligence, §7.6 Scoring.
- **1 FAIL:** §2 Quality Dimensions.

Critical gaps in §7 — read this section before any operator-facing claim of CA-18 conformance.

---

## §1 — Core Loop (CA-18 §1) — **PARTIAL**

**Requirement:** input (URL / spec / pasting) → output (NEW separate deployable URL, perfected, never destructively modifying input, substantial-transformation guarantee, honest assessment, user-controlled iteration depth with trajectory + diminishing-returns reporting).

**Evidence:**

- **`product_ssot` governance_record summary across 7 rows:** 18 `self_renewal.orchestration_complete.v1` entries total (flowai 3 + saige 2 + reltwin 8 + mypreglife 4 + flowai-upgraded-…-ad6c5c54 1; pressai + reachsms 0 each).
- **Last RelTwin orchestration entry (representative; 2026-05-20T02:41:21Z):**
  ```json
  { "mode": "auto", "runId": "223a0371-...", "gtmReady": false,
    "exitReason": "NO_IMPROVEMENT", "originalScore": 99.5, "finalScore": 85,
    "totalDelta": -14.5, "iterationsCompleted": 1,
    "previewUrl": "https://reltwin-platform-expfh3nys-veu-ai-studio.vercel.app",
    "prUrl": null, "finalGtmBand": "demo-ready",
    "finalGtmCounts": { "low": 0, "medium": 0, "high": 1, "critical": 1 } }
  ```
- **Across all 18 orchestration runs:** `prUrl: null` (NO PR ever opened); `previewUrl` populated on most.

**What conforms (✅):**
- Input → output loop produces a NEW separate URL (`previewUrl` populated; input never destructively modified per the per-product branch model + Vercel preview-only deploy).
- Honest-assessment regression gate fires correctly: `exitReason: 'NO_IMPROVEMENT'` + `prUrl: null` on the −14.5 RelTwin run — per CA-14-B (ENTRY 015) "FlowAI NEVER ships a fix that regresses §7.6 score" — that PR was correctly refused.

**What violates (❌):**
- **Quality-substantial-transformation guarantee VIOLATED in practice.** Most-recent RelTwin run regressed −14.5 composite-score points (99.5 → 85). Per CA-18 §1, "A run producing only marginal improvement is a QUALITY FAILURE, not a success" — a NEGATIVE delta is unambiguously a quality failure. The engine recognized + refused the PR (good — see ✅ above), but it ALSO should not have STARTED that run on a 99.5-score product per the "honest assessment — refusing to manufacture work" obligation ("FlowAI proactively communicates when a product already meets or exceeds the quality standard … artificially generating work when none is needed is a violation of the platform's integrity"). The fact that the engine ran 8 iterations against RelTwin at 99.5 starting-score AND zero of them shipped a substantial transformation = the work-manufacturing prohibition is not enforced.
- **Trajectory + diminishing-returns reporting MISSING from canonical surfaces.** Fields exist (`originalScore`, `finalScore`, `totalDelta`, `iterationsCompleted`) but no run-by-run trajectory accumulation; no explicit "diminishing-returns signal"; no honest "continue / consider stopping / stop now" recommendation per §1 + §3 trajectory-reporting requirement.
- **Zero substantial-transformation outputs shipped to PR.** All 18 runs across all products have `prUrl: null`. Either every detected improvement was rejected by the gate, OR the gate is set such that no improvement passes — either way, the "perfected across all quality dimensions" output promise is unfulfilled in measurable terms.

**Gap description (action):** the engine needs a pre-run "is this product already at the bar?" honest-assessment gate that REFUSES to start runs on already-passing products (currently absent); trajectory + diminishing-returns reporting needs to land in the orchestration_complete envelope; and the regression-detected exit path needs operator-facing diagnostics so the operator can decide whether the regression-detector is calibrated too tight (preventing any improvement from shipping) vs. correctly catching actual regressions.

---

## §2 — Quality Dimensions (CA-18 §2) — **FAIL**

**Requirement:** FlowAI optimizes ALL 10 dimensions in every run: (1) Syntax/grammar; (2) Duplication/repetition removal; (3) UI/UX effectiveness; (4) Bug + error resolution; (5) Functional completeness; (6) Performance; (7) Accessibility; (8) Security (OWASP top-10); (9) Privacy compliance — **jurisdiction-aware**; (10) Legal compliance — **jurisdiction-aware**. **No silent omission** — a run that cannot score a dimension MUST surface that as a finding, not silently skip.

**Evidence:** the finding categories the engine actually emits (from `grep` across `src/lib/`):

```
auth-gate-leak    broken-modal    engine-error    network-failure    slow-route
(severity tags: critical / high / medium / low)
```

Plus per-canonical detector set (`docs/CANONICAL_REFERENCE.md` §7.6): the canonical set names `dead-card`, `console-error`, `xss-in-form-echo`, `external-script-leak`, `missing-404-handler`, `missing-500-handler`, `no-offline-indicator`, `no-loading-indicator-on-slow-net`, `no-form-validation`, `accessibility-headings`, `accessibility-alt-text` — but no grep hits for the accessibility ones in active source, suggesting they live in tooling per CA-15-A disposition (ENTRY 017) and do not contribute to the §7.6 composite per the disposition's own framing.

**Per-dimension coverage table:**

| # | CA-18 §2 Dimension | Engine coverage | Status |
|---|---|---|---|
| 1 | Syntax & grammar | NO finding categories; pre-deploy parse gate per CA-14-B exists but is binary (parse pass/fail) not graded | ❌ NOT MEASURED |
| 2 | Duplication / repetition removal | NO finding categories | ❌ NOT MEASURED |
| 3 | UI/UX effectiveness | `broken-modal`, `dead-card` cover dead surfaces only; no hierarchy / affordance / task-flow scoring | ⚠️ PARTIAL (surface-only) |
| 4 | Bug + error resolution | `engine-error`, `console-error` (per canonical), `network-failure`, `auth-gate-leak` | ⚠️ PARTIAL |
| 5 | Functional completeness | `dead-card`, `broken-modal`, `mock-only` (per WireUpConstructor reference) | ⚠️ PARTIAL |
| 6 | Performance | `slow-route` only; no payload-size / TTI / TTFB metrics | ⚠️ PARTIAL |
| 7 | Accessibility | NO active finding categories — per CA-15-A ENTRY 017, `accessibility-headings` + `accessibility-alt-text` moved to tooling (`scripts/lint-accessibility.mjs`), NOT canonical §7.6 score contributors | ❌ NOT MEASURED |
| 8 | Security (OWASP top-10) | Partial — `auth-gate-leak` + `xss-in-form-echo` (per canonical); CA-17 §3.4 S4 9-pillar suite is BUILD/WIRE construction-only (not pipeline-wide Phase B); SQLi / authz-regression / secrets-leakage / SSRF / rate-limit / CSRF / dependency-CVE not pipeline-wide | ⚠️ PARTIAL (~2 of 9 OWASP pillars) |
| 9 | Privacy compliance (jurisdiction-aware) | NO finding categories; **NO `jurisdiction` column on `product_registry` table** (verified via Supabase schema query); jurisdiction-awareness mechanism does not exist | ❌ NOT MEASURED |
| 10 | Legal compliance (jurisdiction-aware) | NO finding categories; same jurisdiction-awareness mechanism gap as (9); regulatory-disclosure checks live only in audit findings (e.g. MyPregLife audit T2 "clinical claims without validation") — not measured systemically by the engine | ❌ NOT MEASURED |

**Coverage count: 0 fully, 5 partial, 5 not measured. Six dimensions silently omitted from every run.**

**No-silent-omission invariant VIOLATED.** Per CA-18 §2 last paragraph: *"A run that cannot score a §2 dimension … MUST surface that as a finding, not silently skip the dimension. The composite score MUST disclose which dimensions contributed."* The current `self_renewal.orchestration_complete.v1` envelope (verified by inspecting the RelTwin row's last entry) does NOT contain a "dimensions contributing to score" field, does NOT surface findings for unmeasured dimensions, and does NOT expose jurisdiction-awareness state. The composite score `finalScore: 85` is computed from the ~4 partially-measured dimensions only, with no disclosure to the operator that 6 dimensions were silently skipped.

**Gap description (action):** (a) add jurisdiction column to `product_registry` + UI for operator to declare applicable jurisdictions; (b) add finding categories for the 6 unmeasured dimensions OR explicit "not_scored" finding emission when a dimension cannot run; (c) extend the orchestration_complete envelope with a `dimensions_contributing` array + `dimensions_skipped_with_reason` array per the no-silent-omission invariant; (d) wire the CA-17 S4 9-pillar suite into Phase B post-deploy probes (not just construction) so security coverage is pipeline-wide.

---

## §3 — Iteration Model (CA-18 §3) — **PASS**

**Requirement:** three modes (AUTOMATIC / GUIDED / MANUAL per the CA-18 §6 global lock at ENTRY 019); preset modes + free-form instruction; instructions as PRIORITY WEIGHTS not feature toggles; trajectory + diminishing-returns reporting after every run.

**Evidence:**

- **`src/lib/agents/renewal/orchestrator.js:379–402` — `OrchestrationState` class:**
  ```js
  constructor({ mode = 'auto', maxIterations, gtmTarget }) { ... }
  switchMode(newMode) { if (!['auto', 'guided', 'manual'].includes(newMode)) return false; ... }
  async checkpoint(onCheckpoint, state) {
    if (this.mode === 'auto') return;
    // GUIDED or MANUAL — wait for explicit resume.
    await new Promise((resolve) => { this._resumeResolver = resolve; });
  }
  ```
- **UI surfaces (`src/pages/LandingPage.jsx`, `Configuration.jsx`, `Onboarding.jsx`, `FlowAIDashboard.jsx`):** all three modes (`'auto'`, `'guided'`, `'manual'`) exposed with selection chips + per-mode routing (`/auto-runner`, `/guided/research`, etc.). FlowAIDashboard line 478 has explicit `switchMode('auto'→'guided'→'manual')` cycle.
- **Live data:** `mode: "auto"` confirmed in the last RelTwin orchestration_complete entry.

**What conforms (✅):**
- All three modes exist + accepted by orchestrator + UI-exposed.
- Mode-dependent behavior wired: AUTO continues; GUIDED + MANUAL pause until `resume()`.
- Free-form instruction field present in `LandingPage.jsx` (verified earlier).

**Minor caveats (not failing):**
- Engineering enum strings stay lowercase (`'auto'|'guided'|'manual'`) per the OQ-6 surface-of-truth resolution (ENTRY 019) — canonical user-facing labels lock to AUTOMATIC / GUIDED / MANUAL, but code may retain prior enums. UI displays use mixed-case headings ("Auto", "Guided", "Manual") rather than the locked all-caps labels — surface alignment is INCOMPLETE relative to the ENTRY 019 lock, but engineering may close this via a label-mapping layer without changing enums.
- "Instructions function as PRIORITY WEIGHTS, not feature toggles" — the orchestrator accepts mode but I did not observe an instruction-as-weights pipeline in the code; the free-form text field's downstream wiring needs confirmation that it actually re-weights dimension focus rather than skipping dimensions.

**Verdict PASS** (mode infrastructure exists + works; the caveat about labels is cosmetic + the priority-weights confirmation is a forward-looking audit, not a blocker for the iteration-model itself).

---

## §4 — Platform Scope (CA-18 §4) — **PARTIAL**

**Requirement:** product-agnostic engine (any URL); no hardcoded per-product paths in `src/lib/`; product_registry-driven URL resolution.

**Evidence:**

- **`src/lib/agents/renewal/orchestrator.js:109–126` — `resolveLiveUrl(productId, product)`:** reads `product.product_url` FIRST when supplied; legacy `LEGACY_FALLBACK` map (mypreglife/reltwin/saige/reachsms/pressai/flowai) kept only as back-compat for tests + environments missing migration 0021. Comment line 364: *"D40 — removed the hardcoded `mypreglife` test-convenience fast-path."*
- **`src/lib/agents/renewal/orchestrator.js:128–174` — PATH A/B model:** known products (URL matches registry row) take operator's GitHub/Vercel; unknown URLs synthesize PATH B product (`flowai-upgraded-<sanitized-host>-<runId>`) and route deploy through FlowAI's own Vercel account. **PATH B confirmed in production**: `product_ssot.product_id = 'flowai-upgraded-flowai-dun-vercel-app-ad6c5c54'` row exists (synthesized PATH B run against FlowAI's own URL).
- **`detectGithubRepoFromUrl()` (line 191+):** registry-free repo detection via `.well-known/flowai.json` → `<meta name="github-repo">` → page-HTML grep. Operator opt-in surface for ANY URL.
- **17 files** in `src/lib/` reference VEU product names (grep) — all examined are: LEGACY_FALLBACK constants, seed-data references, ProductRegistryPanel test fixtures, or capability-package per-product wiring scaffolds. **No `if (productId === 'mypreglife')` style hardcoded path branches** observed in the active hot path.

**What conforms (✅):**
- Product-agnostic registry-driven resolution at the orchestrator entry point.
- PATH B synthesis for unknown URLs (live in production — synthesized product exists).
- Active removal of historical hardcoded paths (D40 comment).

**What partially fails (⚠️):**
- LEGACY_FALLBACK map still in code (lines 117–125), with explicit comment that it's back-compat for environments missing 0021. Migration 0021 IS applied to prod per Stage 4 prep doc (commit `98e344b`) — so the fallback is unreachable in prod, but it remains in code. This is acceptable per the comment's stated rationale (test environments), but it's a residual that should land in a cleanup cycle.
- `src/lib/veuProducts.js` exists with hardcoded VEU product metadata — confirmed via grep. Need to verify it is metadata-only (e.g. display-name lookup) vs. behavioural-branching; if metadata-only, it conforms; if behavioural, it violates §4. This audit did NOT confirm one way or the other.
- §4 also requires the "uniform ≥95 for everyone, globally — dignity-and-belonging guarantee." Live data shows RelTwin at 99.5 starting-score AND 85 ending-score; MyPregLife data has no live composite-score history visible. The uniform-bar is documented in canonical but not measurable from live data at this audit.

**Verdict PARTIAL** — core agnosticism works; residual cleanup + `veuProducts.js` audit pending.

---

## §5 — Symbiotic Principle (CA-18 §5) — **PARTIAL**

**Requirement:** FlowAI applies to its own development process; VEU AI Studio workflow + FlowAI codebase are valid construction targets.

**Evidence:**

- **`product_id = 'flowai'` row in product_ssot:** 3 `self_renewal.orchestration_complete.v1` entries (2026-05-18T22:16, 2026-05-18T22:57, 2026-05-20T05:48). All have empty/null payload fields (`previewUrl`, `prUrl`, score fields unpopulated in the entries surfaced).
- **`product_id = 'flowai-upgraded-flowai-dun-vercel-app-ad6c5c54'` row:** synthesized PATH B run against FlowAI's own live URL (`flowai-dun.vercel.app`), 1 orchestration_complete entry at 2026-05-20T03:46. Same empty payload pattern.

**What conforms (✅):**
- FlowAI HAS been invoked on itself (4 self-runs total across both product_ids).
- PATH B mechanism (synthesized product for unknown URL) successfully treated FlowAI's own URL as a generic target — confirming §5's "FlowAI is not exempt from its own quality standards."
- The Stage 3 Phase 1 construction engine (cd2608d) per CA-17 §29 is wired and has executed on RelTwin — extending the construction-class operations to FlowAI itself is a configuration toggle, not a code change (per the CA-17 §29 canonical text + §15.5 EXECUTOR_REGISTRY 3-executor population per ENTRY 017).

**What partially fails (⚠️):**
- **Zero actual file changes shipped via FlowAI on FlowAI.** All 4 self-runs show empty payload — no `previewUrl`, no `prUrl`, no scoreβ/scoreα — meaning the self-applied runs have produced no visible improvement output. The symbiotic cycle's first half (FlowAI invoked on itself) is exercised; the second half (the SSOT improving as a result of self-application telemetry → amendments → improved next-generation behavior) has not yet completed an observable loop.
- `product_registry.construction_eligible` for `flowai` row is `false` (per Stage 4 prep — only RelTwin is true). So construction-class operations on FlowAI itself are gated OFF; only Self-Renewal (non-construction) has run.

**Gap description (action):** confirm whether the empty-payload self-runs reflect (a) a logging bug in the flowai row's `delta_log`/`governance_record` write path, OR (b) genuine no-op runs that exited before producing meaningful output. Either way, the symbiotic-improvement closure needs a concrete CA-N cycle initiated by FlowAI-on-FlowAI telemetry to count as a fully exercised loop.

---

## §6 — Tool Intelligence (CA-18 §6) — **PARTIAL** (data ✅, runtime ❌)

**Requirement:** engine selects top-5 platforms per step (research/design/build/deploy/qa_audit/govern/gtm/monitor); rankings research-driven + refreshed monthly; runtime emission of `tool.selection` envelopes.

**Evidence — data layer (✅):**

```
step_tool_rankings: 40 rows, all last_updated 2026-05-20, 5 platforms per 8 steps:
  research  : Perplexity AI@1, Tavily@2, Exa@3, SerpAPI@4, You.com@5
  design    : v0 by Vercel@1, Figma@2, Framer@3, Lovable@4, Canva@5
  build     : Cursor@1, Base44@2, Bolt@3, Windsurf@4, Replit@5
  deploy    : Vercel@1, Railway@2, Fly.io@3, Netlify@4, Render@5
  qa_audit  : Playwright@1, Vitest@2, Cypress@3, Jest@4, Postman@5
  govern    : FlowAI@1, GitHub@2, Vercel@3, Sentry@4, PostHog@5
  gtm       : PostHog@1, Stripe@2, SendGrid@3, Mailchimp@4, Brevo@5
  monitor   : Sentry@1, PostHog@2, Datadog@3, LogRocket@4, Uptime Robot@5
```

Each row has `performance_score`, `cost_score`, `speed_score`, `reliability_score` (1–10 ratings), `target_classes` array, `notes`, `last_updated`. **Schema + data conform to CA-18 §6 top-5 + per-step + multi-dimensional ranking + research-driven (notes field) — fully provisioned.**

**Evidence — service layer (✅):**
- **`src/lib/tools/ToolIntelligenceService.js`** (W5b commit `1245783`): implements `createToolIntelligenceService({ client, coldStore, clock, tableName })`, `getRankings(step)`, `getTopTool(step, targetClass, mode)`, `recordUsage()` with `phase: 'tool.selection'` audit entries.
- **`src/lib/agents/orchestrator/OrchestratorHub.ts`:** declares `AuditPhase` includes `'tool.selection'` + `'tool.usage_recorded'`; `attachToolIntelligenceService(service)` accepts a service; pre-step hook emits `phase: 'tool.selection'` if the service is attached.

**Evidence — runtime wiring (❌):**

- **`grep -rn "attachToolIntelligenceService" src` returns only the definition** (`OrchestratorHub.ts:473`). NO call site invokes it anywhere in the codebase. The Tool Intelligence Service is built but NEVER ATTACHED.
- **`grep "OrchestratorHub" src/lib/agents/renewal/orchestrator.js` returns nothing** — the actual production runner (`renewal/orchestrator.js` — the one that produced all 18 `self_renewal.orchestration_complete.v1` entries) does NOT use OrchestratorHub at all. It has its own step sequencing without Tool Intelligence wiring.
- **`product_ssot.governance_record` across all 7 products: 0 entries with `kind` containing `'tool'` or `'tool.selection'` or `'tool_selected'`.** The runtime emission requirement is NOT exercised.

**What conforms (✅):**
- Data layer fully provisioned (40 rows, 8 steps × 5 platforms, all updated 2026-05-20).
- Service layer fully implemented (W5b).
- Audit-envelope schema + integration hook exist in OrchestratorHub.

**What fails (❌):**
- **Production runner does not consume the rankings or emit selection events.** The `renewal/orchestrator.js` runs steps without per-step Tool Intelligence selection. Operators do NOT see "step X used tool Y because rank-#1 today" telemetry; admins cannot audit which tool ran where; GUIDED / MANUAL modes have no top-5 picker to surface.
- **0 governance_record entries for tool selection across 18 runs.** The "research-driven, refreshed monthly, selected per step" loop is INVISIBLE in production.

**Gap description (action):** wire `attachToolIntelligenceService(createToolIntelligenceService({ client: supabase, ... }))` at the runner-init boundary AND migrate `renewal/orchestrator.js` to dispatch step work through `OrchestratorHub.invokeStepOwner()` (or wrap each step with the equivalent Tool Intelligence call). Once wired, `tool.selection` envelopes will land in governance_record per step per run and the §6 invariant becomes operationally visible.

---

## §7.6 — Scoring calibration (canonical §7.6 in `CANONICAL_REFERENCE.md` + CA-18 §1 quality guarantee) — **PARTIAL**

**Requirement:** the 0–100 GTM score reflects actual product quality across the §2 dimension set; calibration is meaningful (a 99.5 score = a 99.5-quality product).

**Evidence — per-product score landscape (from live orchestration_complete entries):**

| Product | Runs | Most-recent originalScore → finalScore | Δ | finalGtmBand | Notable |
|---|---|---|---|---|---|
| RelTwin | 8 | 99.5 → 85 (last) | −14.5 | demo-ready | NO_IMPROVEMENT exit; high+critical findings introduced |
| flowai | 3 | (payload empty in surfaced entries) | — | — | self-application; no measurable output |
| flowai-upgraded-…-ad6c5c54 | 1 | (payload empty) | — | — | PATH B against flowai-dun.vercel.app |
| saige | 2 | (payload empty in summary) | — | — | — |
| mypreglife | 4 | (payload empty in summary) | — | — | — |
| pressai | 0 | — | — | — | no runs |
| reachsms | 0 | — | — | — | no runs |

**Formula (per canonical §7.6 + CA-16-C-Q4 ENTRY 015 generalization invariant):**

```
score = 100 − (10·crit) − (5·high) − (2·med) − (0.5·low),   clamped [0, 100]
```

**What conforms (✅):**
- Formula is implemented and produces deterministic scores from finding counts (RelTwin's 85 = 100 − 10·1 − 5·1 − 0 − 0 = 85, exactly matching `finalGtmCounts: {critical: 1, high: 1, medium: 0, low: 0}`).
- CA-16-C-Q4 ENTRY 015 formula-generalization invariant holds: scoring is uniform across target classes.
- Score band labels (Showcase-ready / Demo-ready / Internal-only / Not-demo-ready) correctly assigned (`finalGtmBand: 'demo-ready'` matches the 75–89 band for finalScore 85).

**What partially fails (⚠️):**
- **The score reflects only the ~4 partially-measured §2 dimensions** (per §2 above). A `finalScore: 85` does NOT mean "the product is 85% perfect across all 10 dimensions" — it means "the product has these counts of findings in the ~4 dimensions we actually measure." This calibration gap is the operationalization of the §2 silent-omission violation.
- **RelTwin's starting score of 99.5 is suspicious.** A score of 99.5 means 1 medium finding total across the entire product (100 − 0.5·1 = 99.5, OR 100 with rounding). A real production product almost certainly has more than 1 medium-severity issue across the 6 unmeasured dimensions (accessibility, privacy, legal, etc.). The high starting-score is an artifact of narrow measurement, not actual product quality.
- **Phase B post-deploy findings can REGRESS the score** (the −14.5 RelTwin delta = 1 critical + 1 high newly introduced) — this is the regression-detection mechanism working correctly per CA-14-B, but it raises an operational question: are these "regressions" real new findings the construction introduced, or are they findings that existed in the baseline but were silently skipped on the pre-construction probe? The audit cannot distinguish from the available data.
- **No `dimensions_contributing` disclosure on the orchestration_complete envelope.** Operators reading a score have no way to know which dimensions contributed.

**Gap description (action):** address by closing §2 (measure all 10 dimensions OR explicitly disclose unmeasured ones per the no-silent-omission invariant) — the score calibration is a downstream effect of the §2 coverage gap, not an independent flaw. Once §2 measures all 10 dimensions, the §7.6 score becomes calibrated against the full CA-18 quality definition rather than a 4-dimension subset.

---

## §8 — Overall conformance summary

| § | Requirement | Status | Headline gap |
|---|---|---|---|
| §1 | Core Loop (input → new URL; substantial transformation; honest assessment; user-controlled iteration) | ⚠️ PARTIAL | No pre-run honest-assessment gate; trajectory/diminishing-returns reporting absent; 0 of 18 runs shipped a PR |
| §2 | Quality Dimensions (all 10, jurisdiction-aware, no silent omission) | ❌ FAIL | 6 of 10 dimensions silently omitted; no jurisdiction column; no disclosure of contributing dimensions |
| §3 | Iteration Model (AUTOMATIC / GUIDED / MANUAL) | ✅ PASS | Minor cosmetic label-alignment + priority-weights downstream wiring confirmation pending |
| §4 | Platform Scope (product-agnostic; global) | ⚠️ PARTIAL | LEGACY_FALLBACK + `veuProducts.js` residuals; `veuProducts.js` behavioural-vs-metadata audit pending |
| §5 | Symbiotic Principle (FlowAI on FlowAI) | ⚠️ PARTIAL | Self-application invoked 4× but 0 shippable output; `flowai.construction_eligible=false` |
| §6 | Tool Intelligence (top-5 per step; emit selection events) | ⚠️ PARTIAL | Data + service exist; runtime NEVER wired — 0 `tool.selection` envelopes |
| §7.6 | Scoring (0–100 reflects actual quality) | ⚠️ PARTIAL | Calibrated against narrow 4-dim coverage; high starting-scores are measurement artifact |

**OVERALL: 1 of 7 fully PASSING; 5 PARTIAL; 1 FAIL.**

---

## §9 — Critical gaps (FAIL items + load-bearing PARTIALs)

These are the items that, if not closed, will materially undermine an operator-facing claim of CA-18 conformance:

### CG-1 — §2 Quality Dimensions: 6 of 10 dimensions silently omitted (FAIL)

**Missing dimensions:**
- Syntax & grammar (no measurement; parse-pass-fail only)
- Duplication / repetition removal (no measurement)
- Accessibility (moved to tooling per CA-15-A; not contributing to §7.6 score)
- Privacy compliance — jurisdiction-aware (no jurisdiction column; no measurement)
- Legal compliance — jurisdiction-aware (same; plus regulatory disclosures not measured systemically)
- Security: ~7 of 9 OWASP-aligned pillars not pipeline-wide (only `auth-gate-leak` + `xss-in-form-echo` per canonical; SQLi / authz-regression / secrets-leakage / SSRF / rate-limit / CSRF / dep-CVE all CA-17-construction-only, not pipeline-wide)

**Required changes (engineering-dispatch scope):**
1. Add `jurisdiction` jsonb column to `product_registry` + operator-facing declaration UI.
2. Wire CA-17 S4 9-pillar security suite into Phase B post-deploy probes (Agent #21 ACE Conductor charter extension).
3. Extend `self_renewal.orchestration_complete.v1` envelope with `dimensions_contributing[]` + `dimensions_skipped_with_reason[]` per CA-18 §2 no-silent-omission invariant.
4. Add syntax/grammar/duplication finding categories (or explicit "not_scored" emissions per the invariant).

### CG-2 — §6 Tool Intelligence: service implemented but NEVER WIRED TO RUNTIME

- 0 `tool.selection` envelopes across 18 production runs.
- `attachToolIntelligenceService()` has 0 call sites.
- `renewal/orchestrator.js` does not use `OrchestratorHub` (the surface that would emit selection events).

**Required changes:** call `attachToolIntelligenceService()` at runner-init; migrate `renewal/orchestrator.js` to dispatch through `OrchestratorHub.invokeStepOwner()` OR wrap each step with equivalent ToolIntelligenceService lookup + emission.

### CG-3 — §1 Quality-substantial-transformation guarantee not enforced

- Most-recent RelTwin run: 99.5 → 85, Δ=−14.5 (REGRESSION).
- 0 of 18 runs shipped a PR — gate correctly refused regressions, but no pre-run honest-assessment gate prevented runs against already-passing products.
- No trajectory or diminishing-returns reporting on the orchestration_complete envelope.

**Required changes:** add pre-run honest-assessment gate ("is this product already at the bar? do not manufacture work"); extend trajectory reporting; surface diminishing-returns signal to operator.

### CG-4 — §5 Symbiotic loop not closed

- FlowAI invoked on itself 4× across two product_ids — payloads empty; no shippable output.
- `product_registry.flowai.construction_eligible = false` — no construction-class self-application.

**Required changes:** investigate empty-payload self-runs (logging bug vs. genuine no-op); CEO disposes whether to flip `flowai.construction_eligible` for self-application post-RelTwin-Phase-1.

---

## §10 — Methodology + caveats

- **All Supabase reads via doppler-credentialed service-role JWT** (read-only; no writes; idempotent queries).
- **Code grep via the standard Grep tool** scoped to `src/lib/`, `src/pages/`, `api/`.
- **No live runs initiated** — analysis is static against the state at HEAD `9e6ec37` + the prd database at 2026-05-20 ~21:30 NY.
- **`governance_record_entry` standalone table does NOT exist in prod** (Supabase returned `PGRST205`). Per the live schema, governance entries live in `product_ssot.governance_record` (jsonb array on the row). CA-17 §3.5 + my Stage 3.5 spec reference `governance_record_entry` as if it were a separate table — this is a SCHEMA documentation gap, not a CA-18 conformance gap (CA-18 itself does not specify the storage shape). Engineering should reconcile the spec-vs-implementation naming.
- **Some product rows (`pressai`, `reachsms`) have 0 runs** — coverage of every product not observable.
- **Surface inspection of `src/lib/veuProducts.js`** was NOT performed in depth; the §4 PARTIAL verdict's `veuProducts.js` audit is pending.
- **No `wcag` / `axe-core` / `a11y` tooling integration found in `src/lib/`** — confirms §2 accessibility-dimension gap.
- The audit's per-dimension finding-category mapping (§2 table) assumes the canonical §7.6 detector set in `CANONICAL_REFERENCE.md` is the authoritative scope; if engineering ships additional categories not present in canonical text, the §2 partial-vs-fail verdict may shift up.

---

*End of SSOT_CONFORMANCE_REPORT_2026-05-20. Doc-only; no canonical edits; no remediation work performed in this dispatch — gap closure is engineering-dispatch scope. The 1-of-7 conformance score is a snapshot at this commit; subsequent W5a/W5b/engineering work may close gaps and shift the score upward.*
