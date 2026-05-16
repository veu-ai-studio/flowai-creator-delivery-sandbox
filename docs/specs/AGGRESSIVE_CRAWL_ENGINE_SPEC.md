# Aggressive Crawl Engine — Architectural Spec

**Status:** DRAFT (read-only architectural spec for next engineering dispatch). NOT canonical SSOT. NOT engineering-ready — Open Questions §G require CEO disposition first.
**Author:** W3, 2026-05-15.
**Lineage:** Closes parking-lot ENTRY 002 (CEO 2026-05-14) at the engineering-spec level — "GTM-readiness test bar." Operationalises SSOT Rev-2.1 §6 Aggressive Crawling Contract canonically + §7 Output Contract (extended per CA-10-A §7 amendment in flight). This spec assumes CA-10 Product SSOT promotes — the per-product readiness state lives in ProductSSOT's `architecture_snapshot` + `governance_record`.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` Rev-2.1 (commit `9495b26`).
**Inputs read:** `docs/CANONICAL_REFERENCE.md` §6/§7/§9/§11/§15.1/§15.2/§15.3/§15.4/§16, `docs/SSOT_PARKING_LOT.md` ENTRY 002 (+ ENTRY 003 gap b), `api/_lib/crawler.js` (422 LOC; Browserless `/content` + `richCapture` via `/function`), `api/_lib/inputAdapters/url.js` (280 LOC; current `aggressiveCrawl()` is depth-bounded default depth=2 maxPages=8, hard cap depth≤3 maxPages≤50), `api/_lib/issueDetector.js` (339 LOC; current 14 detectors), `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §3 (Per-Step Capability Matrix), `docs/specs/SSOT_AMENDMENT_CA10_DRAFT.md` (Product SSOT — ProductSSOT.architecture_snapshot + governance_record consumed here).
**Scope:** read-only research + doc writing. No code changes. No canonical SSOT changes.

---

## A — Crawl Scope (Exhaustive)

### A.1 Current vs target depth + page-count

| Knob | Current (`inputAdapters/url.js`) | Target (this spec) |
|---|---:|---:|
| Depth (default) | 2 | **8** |
| Depth (hard cap) | 3 | **12** (engineering may raise via Doppler `flowai/<env>/CRAWL_DEPTH_HARD_CAP`) |
| Pages per product (default) | 8 | **200** |
| Pages per product (hard cap) | 50 | **2000** (engineering may raise via Doppler `flowai/<env>/CRAWL_MAX_PAGES_HARD_CAP`) |
| Render method | Browserless `/content` (single page) | **Browserless `/function`** via `richCapture` for **every** page (richer surfaces; console + network errors captured) |
| Click-everything | Not implemented | **Yes** — every link, button, card, tile, interactive element clicked once per surface |
| Modal probing | Not implemented | **Yes** — every `[role="dialog"]`, `.modal`, `[aria-modal="true"]` opened + state explored |
| AI-agent probing | Not implemented (current `issueDetector.ai-agent-unreachable` only checks existence) | **Yes** — send benign probe prompt, capture response, classify reachability + responsiveness |
| Authenticated crawl | Credentials session-only via `inputArtifact.raw.description.login*` but not used in url.js | **Yes** — Playwright `storageState` per credentials block in `InputArtifact.raw.description.{loginEmail,loginPassword}`; credentials scrubbed pre-persist per §6 |
| Viewports | Desktop only (default Browserless viewport) | **Desktop (1920×1080) + Mobile (375×667)** — every page rendered + interacted in both |
| Error states | Not deliberately triggered | **Yes** — deliberate triggers per §A.7 |

### A.2 Traversal algorithm (full-site spider with click expansion)

```
function aggressiveCrawl(startUrl, opts):
  state = {
    frontier: [ { url: startUrl, depth: 0, viewport: 'desktop' } ],
    visited: Map<normalisedUrl, PageRecord>,
    pendingClicks: Queue<{ pageUrl, selector, viewport }>,
    pendingModals: Queue<{ pageUrl, modalSelector, viewport }>,
    pendingAgentProbes: Queue<{ pageUrl, inputSelector, viewport }>,
    errors: [],
    networkLog: [],
    sessionStorageState: opts.credentials ? loadOrCreate(opts.credentials) : null,
  }

  while frontier not empty AND visited.size < maxPages AND not timed out:
    next = frontier.dequeue()
    if normalisedUrl(next) ∈ visited: continue
    pageRecord = await crawlPageWithFullInteraction(next, state)
    visited.set(normalisedUrl, pageRecord)
    for link ∈ pageRecord.surfaces.links where isSameOrigin AND not visited:
      if next.depth + 1 ≤ depth: frontier.enqueue({ url: link, depth: next.depth + 1, viewport: next.viewport })

    # In a second pass per page, also enqueue the mobile-viewport equivalent
    if next.viewport === 'desktop' AND mobile not yet visited: frontier.enqueue({ ..., viewport: 'mobile' })

  return { ok, visited, errors, networkLog, sessionStorageState }
```

`crawlPageWithFullInteraction()` does, per page, per viewport, in sequence:

1. **Initial render** via `richCapture(url, { fullPage: true, includeScreenshot: true })`. Captures HTML + screenshot + console errors + network errors + surfaces { links, buttons, forms, images, headings }.
2. **Auth handling** — if `sessionStorageState` is set, hydrate page context with it; if the page redirects to a login surface, attempt one credentialed login (per `InputArtifact.raw.description.login*`), save updated `storageState`, retry render; otherwise mark the page record `authGated: true` and continue.
3. **Click-everything pass** — for each `surfaces.buttons[]` and `surfaces.links[]` that is INTERNAL to the same origin AND not yet visited, dispatch a click + wait for either navigation (→ enqueue to frontier) or DOM mutation (→ inspect for newly-visible modal or content).
4. **Modal probing pass** — enumerate `[role="dialog"]`, `.modal`, `[aria-modal="true"]` selectors visible after the click pass. For each modal, capture its state (text, fields, buttons), attempt to close it via Esc / close-button / backdrop click; assert it closes cleanly.
5. **AI-agent probing pass** — find selectors `[data-ai-input]`, `.chat-input`, `textarea[placeholder*="ask" i]`, `textarea[placeholder*="prompt" i]`, `textarea[name*="message" i]`, `input[type="text"][placeholder*="ask" i]`. For each, send the benign probe prompt **`"Reply with the single word: ACK"`** and capture the response within a 30-second window (configurable). Classify per §B.
6. **Form catalog pass** — every form's fields enumerated (name, type, required). **No submit.** Cataloged for the GTM readiness report.
7. **Network log capture** — every API call observed during the page lifecycle; status code, duration, response-size logged.
8. **External script catalog** — every `<script src="...">` whose origin is external is logged (third-party leak surface).
9. **Error-state triggers** — see §A.7.

### A.3 Card / interactive tile coverage

Cards are detected by class/role heuristics: `.card`, `[role="article"]`, `[data-card]`, plus visual heuristic (`div` with both a heading and a button/link descendant, contained within a flex/grid layout). Each detected card has its primary CTA (last `button` or `a` descendant) clicked once per viewport. Card-level state (collapsed/expanded, hover-revealed content) explored via a second click after a brief delay.

### A.4 AI agent surface probing (selectors)

| Selector | Coverage |
|---|---|
| `[data-ai-input]` | Explicit FlowAI / partner-product marker |
| `.chat-input`, `.prompt-input`, `.ai-chat-textarea` | Common third-party convention |
| `textarea[placeholder*="ask" i]` | Heuristic — placeholder mentions "ask" |
| `textarea[placeholder*="prompt" i]` | Heuristic — placeholder mentions "prompt" |
| `textarea[placeholder*="message" i]` | Common chat-widget pattern |
| `textarea[name*="message" i]`, `textarea[name*="prompt" i]` | Name-attribute heuristic |
| `[contenteditable="true"][role="textbox"]` | Contenteditable chat input |
| `iframe[src*="chat" i]`, `iframe[src*="intercom" i]`, `iframe[src*="zendesk" i]` | Third-party chat widget iframes |

Each match receives the benign probe prompt + capture window. The probe is intentionally innocuous ("Reply with the single word: ACK") so:
- No off-tenant cost is incurred (a real LLM-backed widget replies cheaply).
- No content-policy violations are tripped.
- A non-LLM widget (e.g. plain form) produces no response → classified `ai-agent-no-response`.
- A widget that responds with anything other than `ACK` is still considered REACHABLE for the purpose of the GTM readiness report (the response content is logged but not scored).

### A.5 Authenticated vs unauthenticated paths

- **Default:** the spider attempts every URL in both unauthenticated and (if credentials supplied) authenticated states.
- **Credentialed run:** Playwright `storageState` JSON persisted between pages within a single crawl session; never persisted to disk beyond `tmp/playwright-state-<runId>/`; auto-deleted at run end. Credentials in `InputArtifact.raw.description.login*` are scrubbed per §6 of Rev-2.1 before any persist / log / external send.
- **Auth-gate-leak detection:** an unauthenticated request that returns a page with content that should require auth (heuristic: page contains `[data-tenant-private]`, internal-only routes per discovery from the authenticated crawl, or contains substring "${userName}" indicating a placeholder leak) triggers an `auth-gate-leak` issue per §B.

### A.6 Mobile + desktop viewport coverage

Every page crawled at TWO viewports: desktop 1920×1080 and mobile 375×667. The mobile crawl uses the same Playwright session but resizes the viewport + sets the `Sec-CH-UA-Mobile: ?1` hint. Findings tagged per viewport so the GTM readiness report (§D) can surface "Desktop OK, Mobile clipped" etc.

### A.7 Deliberate error-state triggers

For every page, in addition to the happy-path interaction passes, the engine SHALL deliberately trigger and observe:

| Trigger | Mechanism | Expected behaviour | Issue category if missing |
|---|---|---|---|
| **404 page** | Navigate to `<origin>/__flowai-probe-nonexistent-${runId}` | Custom 404 page renders within 5s; no crash | `missing-404-handler` |
| **500 page** | Inject `Accept: invalid/garbage` header on a GET that the SUT renders | Custom 500 page OR upstream 500 surfaces gracefully | `missing-500-handler` |
| **Network offline mid-load** | Playwright `page.context.setOffline(true)` after first paint | UI shows offline indicator within 10s | `no-offline-indicator` |
| **Slow network** | Playwright `page.context.route(..., r => r.continue({ delay: 5000 }))` for a critical resource | Loading state UI shown >2s | `no-loading-indicator-on-slow-net` |
| **Form submit with empty required field** | Locate first form with a required field; submit empty | Inline validation error shows | `no-form-validation` |
| **Form submit with malformed input** | Submit `<script>alert(1)</script>` into a text field | Input either rejected OR sanitised in echo (no XSS) | `xss-in-form-echo` |

All triggers are **per-product opt-in** via a `runOpts.errorStateTriggers: 'full' | 'safe' | 'none'` flag. Default for new products: `'safe'` (only triggers that don't write state — the 404 + 500 + offline + slow-network). `'full'` (includes form-submit triggers) only fires when the operator confirms the SUT is in dev or staging environment, never prd (per §13 role-gate + §A.5 environment annotation in the run-context).

---

## B — Issue Detection Engine Expansion (§B)

### B.1 New detector categories (12 new + tightening 2 existing)

Current `api/_lib/issueDetector.js` covers 14 categories. Aggressive Crawl Engine adds 12 new + tightens 2:

| Category (NEW) | Severity default | Detection signal | Maps to surface |
|---|---|---|---|
| `ai-agent-unreachable` (TIGHTEN) | critical | Probe sent; no response within 30s | AI agent surface |
| `ai-agent-no-response` (NEW) | high | Probe sent; widget present but returned empty / non-response | AI agent surface |
| `broken-modal` | high | Modal opened but Esc / close-button / backdrop click fails OR modal traps focus indefinitely | Modal |
| `dead-card` | medium | Card's primary CTA target is 404 OR no navigation effect OR no modal open | Card |
| `engine-error` | high | Any in-page "engine" or "tool" surface (heuristic: `.engine`, `[data-engine]`, page route containing `/engine` or `/tool`) returns a runtime error during interaction | Engine |
| `auth-gate-leak` | critical | Unauthenticated request returns content that includes tenant-private markers or placeholder strings — see §A.5 | Page |
| `console-error` | medium | Browserless `richCapture.consoleErrors[]` non-empty on the page | Page |
| `network-failure` | medium | Browserless `richCapture.networkErrors[]` non-empty OR ≥1 sub-resource 5xx | Page |
| `slow-route` | medium | Browserless `richCapture.timing.loadMs > 3000` on prd; > 6000 on dev | Page |
| `missing-404-handler` | medium | Deliberate 404 probe returned default browser 404 OR upstream HTTP error | Page |
| `missing-500-handler` | medium | Deliberate 500 probe surfaced raw stack trace OR no graceful UI | Page |
| `no-offline-indicator` | low | Network-offline trigger; no offline UI within 10s | Page |
| `no-loading-indicator-on-slow-net` | low | Slow-network trigger; no loading UI > 2s | Page |
| `no-form-validation` | medium | Form submit with empty required field; no inline validation error | Form |
| `xss-in-form-echo` | **critical** | Submit `<script>alert(1)</script>`; appears unescaped in echoed page DOM | Form |
| `external-script-leak` | medium | `<script src="...">` to non-allowlisted external origin without SRI hash | Page |
| `accessibility-headings` (TIGHTEN) | low | `richCapture.accessibility.headingHierarchyOk === false` | Page |
| `accessibility-alt-text` | low | `richCapture.accessibility.imagesMissingAlt > 0` | Page |

### B.2 Severity mapping per Rev-2.1 §12

Issues route through Self-Renewal per §12:
- `critical` → never auto-deploy; emit candidate + plan; `requires_human_gate=true`.
- `high` → never auto-deploy; `requires_human_gate=true`; human Approves/Modifies/Skips.
- `medium` → fork-and-fix auto-deploy in fork-and-fix mode.
- `low` → fork-and-fix auto-deploy.

XSS is hard-classified `critical` (not promotable to lower severity even via admin override per CA-10-Q3 — security-fundamental signal).

---

## C — Resolution + Fix Loop (per Rev-2.1 §6)

### C.1 Terminal-decision contract

Every issue from §B reaches one of three terminal decisions per Rev-2.1 §6:

| Terminal decision | When | Mechanism |
|---|---|---|
| **Resolved** | autoFixable AND severity ∈ {`low`, `medium`} | Fork-and-fix via Self-Renewal Executor (per CA-7); re-crawl confirms issue category absent in the renewed URL |
| **Human-gated** | severity ∈ {`high`, `critical`} OR category in human-gated set (legal / trust / value-proposition) | Human Approves / Modifies / Skips per §10.2 Sprint ARCH-1 flow |
| **Documented limitation** | Issue cannot be addressed within input scope (e.g. mobile responsiveness flagged but only desktop assets supplied) | Verbatim entry in renewed delivery's LIMITATIONS section per §6 + §7 |

### C.2 Re-crawl verification after fix

After every fork-and-fix auto-deploy, the Aggressive Crawl Engine re-runs against the renewedUrl with the SAME scope parameters but a tighter time budget (≤50% of original wall-clock, since most surfaces unchanged). Outputs:

- `issuesResolved[]` — issues whose category was present in the original crawl and is absent in re-crawl.
- `issuesUnresolved[]` — issues whose category persists.
- `issuesRegressed[]` — NEW issues introduced by the fix (regression detection).

### C.3 Before/After delta report — wiring to CA-10-A ProductSSOT

The delta report is written as a `delta_log_entry` to the affected ProductSSOT row (per CA-10-A.2). Atomic with the run output per §7 (amended Output Contract — see CA-10-A.4). If the ProductSSOT write fails, the entire run is rolled back per §10 Self-Protect snapshot pattern.

---

## D — GTM Readiness Report (the deliverable)

### D.1 Top-level scoring

A per-product readiness score in `[0, 100]` computed per environment (dev + prd separate). Formula:

```
score = 100
     − (10 × count_critical)
     − (5  × count_high)
     − (2  × count_medium)
     − (0.5 × count_low)
     clamped to [0, 100]
```

Empty-product baseline = 100. Each `critical` finding deducts 10; each `high` deducts 5; each `medium` deducts 2; each `low` deducts 0.5. Floor 0.

| Score band | Label | Demo guidance |
|---|---|---|
| 90–100 | **Showcase-ready** | Safe to send to any prospect demo; passes Clearance Step 5 cleanly |
| 75–89 | **Demo-ready** | Safe with named caveats; LIMITATIONS section MUST be shown |
| 60–74 | **Internal-only** | Not for external demo; surface to Clearance Step 5 as "conditional" |
| 0–59 | **Not demo-ready** | Blocks Clearance Step 5; Self-Renewal must close `critical` + `high` before demo |

### D.2 Findings grouped by surface

The report renders findings in six surface sections:

1. **Links** — broken-link, missing-href, external-script-leak (non-link sub-rows folded here for UX coherence).
2. **Cards** — dead-card, card-CTA-404.
3. **Modals** — broken-modal, modal-focus-trap (folded), modal-keyboard-trap.
4. **Pages** — auth-gate-leak, missing-404-handler, missing-500-handler, no-offline-indicator, no-loading-indicator-on-slow-net, slow-route, console-error, network-failure, accessibility-headings, accessibility-alt-text.
5. **Engines** — engine-error.
6. **AI agents** — ai-agent-unreachable, ai-agent-no-response.

Per surface section: severity-grouped tabular view (Showstopper / Critical / High / Medium / Low) with one finding per row.

### D.3 "Top fixes before any prospect demo" ranked

A computed view at the report's top: the **top 5 highest-severity findings ranked by impact**. Ranking formula (within severity tier):

```
impact_score = severity_weight + 0.5 × (visibility_weight) + 0.2 × (effort_to_fix_weight)
  severity_weight: critical=10 · high=5 · medium=2 · low=0.5
  visibility_weight: surface frequency × 0.1 (e.g. a finding on the landing page weighs more than one on a deep route)
  effort_to_fix_weight: 1.0 if autoFixable else 0.3 (preferring auto-fixable for "top fixes" ranking — these can be deployed immediately via fork-and-fix)
```

### D.4 Maps to §11 Clearance Step 5 (Demo Readiness)

Rev-2.1 §11 Step 5 "Demo Readiness" is canonically gated by "Synthetic-data demo microsite generates; guided tour script renders; per Sprint 7 Demo Builder." CA-Aggressive-Crawl extends Step 5 to require:

- GTM Readiness Report exists for the product in the current environment.
- Report score ≥75 (Demo-ready band) AND no `critical` findings open.
- Self-Renewal cycle on all findings ≥`high` has reached a terminal decision (Resolved / Human-gated / Documented).
- LIMITATIONS section published.

Failure of any of the four prerequisites blocks Clearance Step 5 with explicit error.

---

## E — Agent Ownership + Orchestra Wiring

### E.1 Agent ownership decision (Option A vs B vs C)

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Agent #6 Research expansion** | Extend Agent #6 (Research) charter to include aggressive crawl as primary capability. | Simplest — #6 already consumes crawl results. | #6's scope balloons; cross-step responsibilities (research + crawl + audit) couple. Single agent owns too much. |
| **B. Agent #21 Ops Runner Alpha** | Assign Ops Runner Alpha (currently un-pinned per Rev-2.1 §27 OQ-2) as the Aggressive Crawl owner. | Clean separation; Ops Runners are step-owner-by-charter; #21 graduates from DORMANT into a real role. | Ops Runner Alpha currently has no step binding; pinning it here resolves OQ-2 partially. |
| **C. New Executor** in EXECUTOR_REGISTRY (per CA-7) | Treat Aggressive Crawl as a sibling executor of Agent #6, similar to Self-Renewal Executor model. | Preserves Agent #6's existing recommend_only scope; the executor handles the elevated-cost crawl operations (Browserless minutes, parallel sessions). | Adds another executor; complexity proliferation. |

**W3 recommendation:** Option **B**. Aggressive Crawl is a substantial cross-product capability that aligns with the Ops Runner role (per Layer 2 plan PG1 — Ops Runners as substrate-level operators). Pinning #21 to "Aggressive Crawl Conductor" closes Rev-2.1 OQ-2 partially.

If Option B chosen, Agent #21's charter (per `_registry.ts`):

```js
{
  id: 21,
  name: 'Ops Runner Alpha — Aggressive Crawl Conductor',
  mode: 'step-owner',   // for the crawl phase of step 1 research
  flowAiOnly: false,    // embedded
  authority: ['recommend_only', 'auto_write_internal'],   // recommend_only by default; auto_write_internal only for ProductSSOT.architecture_snapshot writes per CA-10-B
  requiredCredentials: ['BROWSERLESS_API_KEY', 'ANTHROPIC_API_KEY'],
  marketplaceTools: ['browserless', 'playwright', 'anthropic-api'],
  consumes: ['1.crawl.request.v1', '10.ssot.updated.v1'],
  produces: ['21.crawl.completed.v1', '21.issues.detected.v1', '21.gtm.readiness.v1', '10.ssot.updated.v1'],
  escalationPolicy: 'crawl budget exceeded → emit candidate + escalate to Ops Runner Beta. xss-in-form-echo detected → escalate to admin gate IMMEDIATELY (security-critical). auth-gate-leak detected → escalate to admin gate. 3 consecutive crawl failures on same product → disable crawl for that product 24h.',
}
```

This requires CA-9-B-style BaseAgent.guard() dual-authority amendment (already proposed in CA-9-B.6).

### E.2 Orchestra wiring (per Rev-2.1 §15.4 + Orchestra spec §3)

Agent #21 dispatches via Orchestra:

| Capability | Adapter | Used for |
|---|---|---|
| `crawl` | `playwright` (preferred for full interaction) → `browserless` fallback | Per-page render + click + modal probe |
| `interact` | `playwright` | Click-everything pass + form catalog + error-state triggers |
| `screenshot` | `browserless` | GTM Readiness Report visual evidence per finding |
| `analyze` | `anthropic-api` (CA-9-B new generic adapter) | Surface classification + Issue Detection LLM-assist for novel categories |

Cost ceiling per Aggressive Crawl run (per Orchestra spec §7.4): **$15/run** (3× the default $5; aggressive crawls are 5–10× heavier than nominal pipeline runs). Configurable per product per environment via Doppler.

### E.3 Performance budget + parallelization

| Surface | Budget |
|---|---|
| Wall-clock per product per environment | 20 min (hard cap; ≥1 crawl per day per product feasible) |
| Browserless minutes per run | 30 min (parallel sessions count individually) |
| Parallelism | Up to 5 concurrent pages per product (Browserless session pool) |
| Probe latency budget per AI-agent | 30s (configurable) |
| Re-crawl wall-clock | ≤10 min (50% of original) |

Cost estimate at 5-product × 2-env × daily cadence: ~$15/run × 10 runs/day = ~$150/day → ~$4500/month. Reduced by ~70% once the Symbiotic Feed-Back Loop from CA-10-D narrows scope to delta surfaces (≤3 prior runs / 30d AND no drift flag → narrow crawl). Realistic post-CA-10 steady-state: ~$1500/month.

---

## F — Test Plan against All 5 VEU Products (using neutral fixtures per §22)

Per Rev-2.1 §22 Product-Agnostic Rule: zero VEU product names hardcoded in engine. Per the dispatch directive, all 5 products will be exercised under generic `productScope` per `ProductRegistry` row metadata. The 5 productIds (kept ONLY in operator-side `ProductRegistry` rows, never in `src/` code):

| productScope (operator-set) | Production URL (operator-supplied) |
|---|---|
| `tenant_saige` | (operator sets) |
| `tenant_press` | (operator sets) |
| `tenant_reltwin` | (operator sets) |
| `tenant_reachsms` | (operator sets) |
| `tenant_mbsafe` | (operator sets) |

Test plan invocation:

1. **Pre-flight** — each product registered in `ProductRegistry` with `environment='dev'` first (never prd); URLs allowlisted per Rev-2.1 §13 URL Whitelist entity.
2. **Run** — `POST /api/agent/21/run-aggressive-crawl` per product per environment. Total: 5 products × 2 envs = 10 runs.
3. **GTM Readiness Reports** generated per `(productId, environment)` pair = 10 reports.
4. **Acceptance criteria for this initial sweep:**
   - All 10 runs complete within 20-min wall-clock each.
   - At least 80% of `critical` findings on dev get auto-deployed fork-and-fix or human-gated terminal decision within 4h.
   - No `xss-in-form-echo` or `auth-gate-leak` findings on PROD (immediate halt + admin alert if so).
   - GTM Readiness score ≥60 (Internal-only band) on dev for all 5 products before the prd sweep begins.
   - GTM Readiness score ≥75 (Demo-ready band) on prd for at least 3 of 5 products.

5. **Test fixtures (neutral, no product names hardcoded):**
   - Probe prompt: `"Reply with the single word: ACK"` — literal string, no product context.
   - Error-state triggers: `<origin>/__flowai-probe-nonexistent-${runId}` — synthetic.
   - XSS probe: `<script>alert(1)</script>` — generic.
   - Form-submit empty-required probe: empty string — generic.

6. **Continuity:** the test plan against the 5 products is a one-time-sweep validation. Steady-state operation per §E.3 budget runs all 5 on a daily 03:00 UTC cadence.

---

## G — Open Questions for Panel (5–8, standard 4-option + INSUFFICIENT_INFORMATION frame)

### G-Q1 — Depth + page-count hard caps

§A.1 proposes default depth=8 / pages=200, hard cap depth=12 / pages=2000. Are these the right ceilings?

- (a) Adopt as proposed (W3 recommendation; balances coverage with cost).
- (b) Tighten — default depth=5 / pages=100; hard cap depth=8 / pages=500.
- (c) Loosen — default depth=12 / pages=500; hard cap depth=20 / pages=5000 (more thorough, much higher cost).
- (d) Different caps — specify in rationale.

### G-Q2 — Agent ownership

Per §E.1, three options for who owns Aggressive Crawl: A (Agent #6 expansion), B (Agent #21 Ops Runner Alpha pinning), C (new Executor in EXECUTOR_REGISTRY).

- (a) Option B — Agent #21 Ops Runner Alpha (W3 recommendation; resolves Rev-2.1 OQ-2 partially).
- (b) Option A — extend Agent #6 Research.
- (c) Option C — new executor in EXECUTOR_REGISTRY.
- (d) Different — specify in rationale.

### G-Q3 — AI-agent probe safety

§A.4 sends a benign probe prompt to any detected AI-agent surface. Is this safe enough?

- (a) Adopt benign probe as proposed (W3 recommendation; minimal cost + content-policy risk).
- (b) Stricter — only probe surfaces with `[data-ai-input]` (explicit marker); skip heuristic-detected surfaces.
- (c) No probe — only detect surface presence, never invoke (`ai-agent-no-response` is therefore unmeasurable).
- (d) Configurable per product — operator opts in to probe at product registration time.

### G-Q4 — Parallelization scope

§E.3 proposes up to 5 concurrent pages per product (single product per run). Is this the right parallelism?

- (a) Adopt as proposed (5 concurrent pages, 1 product at a time).
- (b) Tighten — 3 concurrent pages, 1 product at a time (less Browserless burst).
- (c) Loosen — 5 concurrent pages, up to 3 products simultaneously (faster overall throughput; more Browserless burst).
- (d) Different — specify in rationale.

### G-Q5 — Fix-loop autonomy

§C.1 routes `low` + `medium` to auto fork-and-fix; `high` + `critical` to human gate. Should `medium` be human-gated too for the initial sweep?

- (a) Adopt as proposed (medium auto-fixes; W3 recommendation per Rev-2.1 §12 + Self-Renewal spec §4.4).
- (b) Conservative — auto-fix only `low` for the initial sweep; `medium` human-gated until 30 days of clean operation.
- (c) Aggressive — auto-fix `low` + `medium` + `high` (only `critical` human-gated).
- (d) Different — specify in rationale.

### G-Q6 — Error-state trigger defaults

§A.7 defaults to `'safe'` (state-non-mutating triggers only) for new products. Is this the right default?

- (a) Adopt as proposed (`'safe'` default; `'full'` requires operator opt-in + dev/staging env).
- (b) Stricter default — `'none'` for new products; operator must opt into `'safe'` or `'full'`.
- (c) Looser default — `'full'` for dev/staging; `'safe'` for prd (no operator opt-in needed).
- (d) Different — specify in rationale.

### G-Q7 — GTM Readiness score formula

§D.1 formula deducts 10/5/2/0.5 per critical/high/medium/low. Is this the right weighting?

- (a) Adopt as proposed.
- (b) Tighter — 20/10/4/1 (higher penalty; fewer products reach Demo-ready band).
- (c) Looser — 5/2/1/0.25 (lower penalty; easier to reach Demo-ready band).
- (d) Different — specify in rationale.

### G-Q8 — Per-run cost ceiling

§E.2 proposes $15/run cost ceiling (3× nominal pipeline). Is this the right ceiling?

- (a) Adopt as proposed ($15/run; per-product per-env override available).
- (b) Tighter — $10/run.
- (c) Looser — $25/run (more thorough probes).
- (d) Per-product configurable only (no global default).

---

## H — Engineering scope estimate

| Surface | Effort (W-days) |
|---|---:|
| New crawler module `api/_lib/aggressiveCrawlEngine.js` (full-site spider with click + modal + AI-probe + viewport + auth + error-trigger passes) | 5 |
| `inputAdapters/url.js` graduation (replace current `aggressiveCrawl()` with the engine; keep the function name + return shape for backwards compat) | 1 |
| `issueDetector.js` expansion — 12 new categories + 2 tightenings + severity routing per §B | 2 |
| GTM Readiness Report generator (`api/_lib/gtmReadinessReport.js`) + Markdown/JSON renderer + visual evidence (screenshots per finding) | 2 |
| New endpoint `/api/agent/21/run-aggressive-crawl` (Inngest-backed long-running job per Orchestra spec §6.2 Path Y) | 1 |
| Agent #21 charter wiring (assuming CA-9-B-style BaseAgent.guard() amendment lands first; otherwise +1 W-day for that amendment) | 1 |
| MessageBus topic registration + audit-log integration | 0.5 |
| ProductSSOT integration (per CA-10-A.4 atomic-write + CA-10-B `21.crawl.completed.v1` topic) — assumes CA-10 promotes first | 1 |
| Clearance Step 5 amendment (gating per §D.4) | 0.5 |
| Test plan execution against 5 products + neutral-fixture test suite | 2 |
| `MockBrowserless` + `MockPlaywright` fixtures for Vitest | 1 |
| Documentation: spec → reference cross-links, Architecture page `/architecture` updates per §16 | 1 |
| Rollout to prd (canary 1 product → 3 products → all 5; per Rev-2.1 §16.3 dual-deployment) | 1 |
| **TOTAL** | **~18 W-days** (~3.5 weeks at 1 W per day; ~9 calendar days at 2 W parallel) |

Depends on: CA-7 + CA-9-B (for BaseAgent.guard() amendment + Agent #26 charter pattern reuse) and CA-10 (for ProductSSOT integration) ratified upstream. If those amendments are NOT yet promoted, add ~3 W-days for inline shim.

---

## I — Related canonical references

| Section | Why referenced |
|---|---|
| Rev-2.1 §6 (Aggressive Crawling + Resolution Contract) | This spec operationalises §6 canonically. |
| Rev-2.1 §7 Output Contract | §C.3 + §D.4 amend the contract (deferred to CA-Aggressive-Crawl when this spec promotes). |
| Rev-2.1 §9 Pipeline Steps + §11 Clearance Step 5 | §D.4 — Aggressive Crawl gates Demo Readiness. |
| Rev-2.1 §12 Remediation Modes | §C.1 routes per severity-mapped fork-and-fix gates. |
| Rev-2.1 §13 Auth + Role Model + URL Whitelist | §A.5 + §F.1 pre-flight URL allowlist. |
| Rev-2.1 §15.4 Agent → Orchestra wiring + §27 OQ-2 (Ops Runner step assignments) | §E.1 Option B pins #21. |
| Rev-2.1 §16.1 Readiness Checker (Sprint 6 Phase 2) | §D — GTM Readiness Report supplements the existing 6-dimension Readiness Checker with a 100-point Demo-Readiness score (different focus: integration / dev-readiness vs prospect-demo readiness). |
| `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §3 (Per-Step Capability Matrix) + §7 Cost Tracking + §8 Fallback Chain | §E.2 + §E.3 — wiring + cost-ceiling. |
| `docs/specs/SSOT_AMENDMENT_CA10_DRAFT.md` (Product SSOT) | §C.3 + ProductSSOT integration assumption. |
| `docs/specs/SSOT_AMENDMENT_CA9_DRAFT.md` (Agent #26 + CA-9-B dual-authority guard) | §E.1 Option B inherits dual-authority pattern. |
| `docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md` (EXECUTOR_REGISTRY) | §E.1 Option C alternative — sibling executor pattern. |
| `docs/SSOT_PARKING_LOT.md` ENTRY 002 + ENTRY 003 gap b | The CEO-stated source of this spec; gap b (Self-Renewal as fixer) covered by Self-Renewal Executor per CA-7. |

---

## J — Co-sequencing with other in-flight CA-n + specs

The cleanest landing order:

1. **CA-7** (EXECUTOR_REGISTRY + Self-Renewal Executor) — Self-Renewal Executor needed for §C.1 fork-and-fix.
2. **CA-8** (X-Test-Bypass-Token canonicalisation) — needed if the Aggressive Crawl Engine runs in prod against the SUT (it would trip its own bot detection without the token, mirroring the test plan §9.1).
3. **CA-9** (Orchestra self-expansion + customer feedback) — Agent #26 + BaseAgent.guard() amendment + customer-issue → crawl-trigger inheritance.
4. **CA-10** (Product SSOT) — `architecture_snapshot` + `delta_log` integration; required for §C.3 + §D atomic-write.
5. **THIS SPEC** (Aggressive Crawl Engine) — engineering dispatch after the above promote.

Total time to landing if all five flow through Panel + CEO in the same cycle: ~3-4 weeks Panel → ~3-4 weeks engineering = ~2 months from disposition to first production sweep against the 5 VEU products.

---

*End of Aggressive Crawl Engine spec. Pending Panel review per §19 + CEO ratification per §18 + co-sequencing with CA-7 / CA-8 / CA-9 / CA-10.*
