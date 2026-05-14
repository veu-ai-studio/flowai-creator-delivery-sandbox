# Self-Renewal Agent #3 — Architectural Spec

**Status:** DRAFT (read-only architectural spec for the next engineering dispatch). NOT canonical SSOT. NOT yet engineering-ready — Open Questions §6 require CEO disposition first.
**Author:** W3, 2026-05-13, per W03 dispatch.
**Inputs read:** `docs/FLOWAI_SSOT.md` (canonical 2026-05-11, amended 2026-05-14), `docs/SSOT_PARKING_LOT.md` ENTRY 003/004/005/006, `docs/panel-consultations/ssot-finalization-and-agent-roadmap-priority-2026-05-14.md`, `src/lib/agents/BaseAgent.js`, `src/lib/agents/agents/Agent3SelfRenewal.js` (shipped commit `68a0c75`), `src/pages/AutoRunner.jsx` (wiring commit `31f3522`), `src/lib/orchestra/{index,member,claudeCode}.js` (W2 Orchestra adapters, shipped commit `9b4e511`), `api/_lib/{remediationEngine,sourceAcquisition,issueDetector,renewalEngine}.js` (W2 renewal pipeline), `src/lib/renewal/inputArtifact.js`.
**Scope:** read-only research + doc writing. No code changes. No canonical SSOT changes.
**Lineage:** Closes parking-lot ENTRY 003 gap (b) [Self-Renewal-as-fixer] from `docs/SSOT_PARKING_LOT.md` at the engineering-spec level; remains pending CEO disposition on Open Questions §6.

---

## 1. Current State (verified from code)

### 1.1 Shipping artifact

- File: `src/lib/agents/agents/Agent3SelfRenewal.js` (510 lines)
- Shipped: commit `68a0c75` (Agent #3 step-owner) + commit `31f3522` (Auto Runner step 6 wiring) + commit `511493e` (W03 compliance probe Build 1 wiring)
- Class: `Agent3SelfRenewal extends BaseAgent`, charterId = 3

### 1.2 Charter (per `_registry.ts` + `BaseAgent.js` static charter())

| Field | Value |
|---|---|
| `id` | `3` |
| `name` | `Self-Renewal` |
| `flowAiOnly` | `false` (Agent #3 is in `EMBEDDED_AGENTS` per `BaseAgent.js` L56) |
| `authority` | `[AUTHORITY.RECOMMEND_ONLY]` — single-element array |
| `requiredCredentials` | `[]` |
| `marketplaceTools` | `[]` |
| `consumes` | `8.audit.completed.v1`, `10.anomaly.v1`, `17.evolution.proposal.v1` |
| `produces` | `3.renewal.candidate.v1` (emitted); `3.renewal.applied.v1` (docstring-promised but **NOT YET EMITTED** by any code path) |
| Mode | `step-owner` at step `6` (`govern`) |

### 1.3 Behaviour today

The agent is a **pure analyzer** over `(run_summary, step_results)`:

1. `plan(ctx)` accepts `{ kind: 'renewal.request', runId, run_summary?, step_results? }`.
2. `analyzeRun(runSummary, stepResults)` runs five heuristics: `buildFailures`, `auditIssues`, `anomalySeverity`, `evolutionProposal`, `staleConfig`. Each heuristic either returns null or a flag `{ area, severity: 'low'|'medium'|'high', reason }`.
3. Confidence is a single-number function of `max(severity_rank)` across flags: `high → 0.9 · medium → 0.6 · low → 0.4 · no flags → 0.2 · no signal → 0.0`.
4. `act(ctx, plan)` writes `renewal:run:{runId}` to HotStore (TTL 24 h), appends a `govern / step.success` row to ColdStore, and publishes `3.renewal.candidate.v1`. **No remediation. No deploy. No source mutation.**
5. `recommend(ctx)` is the OrchestratorHub step-owner entrypoint (PA #2.7-analogous). It accepts both camel- and snake-case keys, never throws (two nested try/catch envelopes around extraction + analysis), and returns the canonical step-owner envelope:
   ```
   { agent_id: 3, agent_name: 'Self-Renewal', mode: 'step-owner', step: 6,
     authority: 'recommend_only', recommendation: <string>,
     renewal_flags: [<area>, ...], confidence: <0.0–0.9>,
     metadata: { ok, runId, productId, flag_details, signals_observed } }
   ```

### 1.4 BaseAgent guard rail (the hard wall today)

`BaseAgent.js` L221–227:

```js
if (declared.size === 1 && declared.has(AUTHORITY.RECOMMEND_ONLY)) {
  if ((plan.sideEffects ?? []).length > 0) {
    throw new Error(
      `Agent #${this.charter.id}: charter is RECOMMEND_ONLY; plan declared sideEffects=${plan.sideEffects.length}`
    );
  }
}
```

Agent #3 cannot today emit a plan with any non-empty `sideEffects[]`. The charter must be widened **or** the agent must be split (see §4) before any real fix path can be wired.

### 1.5 Auto Runner integration

`src/pages/AutoRunner.jsx` step 6 (`govern`) calls `hub.invokeStepOwner('govern', ctx)`. The returned envelope is treated as informational by the page; `renewal_flags[]` are not yet routed to any downstream consumer. No remediation action is triggered, regardless of the flag content or confidence.

### 1.6 Confirmed gap (matches parking-lot ENTRY 003 gap b)

> "Self-Renewal Agent (#3) produces reports, not fixes — the current Self-Renewal output is an ISSUE register with HEAL action DESCRIPTIONS, not executed fixes. For Self-Renewal to be real, it must: detect issue → generate fix code/config → apply fix to source → verify → loop until resolved or escalate. Current agent stops at 'detect + describe.'"

This spec is the architectural plan for closing that gap.

---

## 2. Target State

### 2.1 Mode menu (Panel verdict Q3 — verified against the consultation file)

CEO Decision 2 (2026-05-14) committed FlowAI to **four** remediation modes canonical, user picks per session:

```
(i)   recommend-only
(ii)  code-generation       (produces patches / PRs)
(iii) direct-write          (FlowAI has source credentials and pushes fixes)
(iv)  fork-and-fix          (produces a new URL that's a fixed version of the source)
```

Panel Q3.3 ENGAGED verdict was `PLURALITY_(c)` — 3 of 5 reviewers endorsed: **start with 2 modes (recommend-only + fork-and-fix); add code-gen + direct-write incrementally.** Slot 4 (`claude-opus-4`) was the one Q3-ADV-induced flip from (b) → (c), validating incrementalism under adversarial pressure. Engagement was 4/10 ENGAGED on the MC (below 8/10 soft-signal floor) — read with caution.

Per W5a Recommendation 3 (`ssot-finalization-and-agent-roadmap-priority-2026-05-14.md` lines 974–990), **CEO disposition is required** between (1) over-ride Panel and re-affirm Decision 2 as-written (all 4 modes from day one) or (2) accept Panel's (c) phased framing (modes i + iv first, ii + iii deferred). This spec assumes path (2) but flags the ambiguity in Open Questions §6 Q1.

> **Naming clarification.** The W03 dispatch text uses the phrase "Orchestra direct-write" as shorthand for the fork-and-fix path's writes into a *new Vercel deployment* via Orchestra dispatch (not into the user's source repo). The SSOT-canonical mode (iii) "direct-write" is a separate, **deferred** mode that writes patches back to the user's own source. This spec uses **fork-and-fix** for the active mode and **direct-write** strictly for the deferred mode (iii). See Open Questions §6 Q1.

### 2.2 Input contract (new)

Agent #3's `recommend(ctx)` extends today's shape:

```js
{
  // existing (retained):
  runId, productId, run_summary?, step_results?,

  // new for fork-and-fix:
  mode: 'recommend_only' | 'fork_and_fix',         // default 'recommend_only'
  issueList?: Array<W2.Issue>,                     // per api/_lib/issueDetector.js
  inputArtifact?: W2.InputArtifact,                // per src/lib/renewal/inputArtifact.js
  sourceHints?: { gitUrl?, vercelProject?, base44Project?, teamId? },
  requestOrigin?: string,                          // for deploy aliasing
}
```

`W2.Issue` shape (verified in `issueDetector.js`):

```
{ id: 'ISSUE-NNN', severity: 'critical'|'high'|'medium',
  category: <one of the locked detector names>, location: <descriptor>,
  evidence: <verbatim snippet>, autoFixable: <bool>,
  fixSpec?: <renewal hint, present iff autoFixable> }
```

Upstream agents feed `issueList[]`:

- **Agent #6 Research** — emits findings post-crawl (today emits via the AutoRunner research-step result envelope; W2 commit `0fc8851` added `block` semantic on `content-insufficient`).
- **Agent #8 Quality Audit** — emits `8.audit.completed.v1` (already in Agent #3's `consumes`); payload extraction to `issueList[]` is new wiring.
- **Agent #10 Monitor** — emits `10.anomaly.v1` (already in `consumes`); same wiring.

`inputArtifact` is only required when neither `issueList[]` nor an Auto Runner `run_summary` is present (i.e. when Agent #3 is invoked directly by `/api/renew.js` instead of by step 6 of Auto Runner).

### 2.3 Decision flow

```
recommend(ctx):
  if ctx.mode === 'recommend_only' OR ctx.mode missing:
    → existing path (analyzeRun + renewal_flags + 3.renewal.candidate.v1)
    → NO source acquisition, NO remediation, NO deploy
    → return existing envelope

  else if ctx.mode === 'fork_and_fix':
    require: ctx.issueList[] (or ctx.inputArtifact for spec composition)
    require: charter.authority includes AUTO_WRITE_INTERNAL (see §4)

    severityGate(ctx.issueList):
      'critical'  → requires_human_gate=true; SKIP dispatch; emit candidate; return
      'high'      → requires_human_gate=true; emit candidate + plan; SKIP deploy; return
      'medium'    → proceed
      'low'       → proceed

    backoffGate(productId):
      if hotStore.get(`renewal:backoff:{productId}`) >= 2 build-failures in last 24h:
        DISABLE fork_and_fix; revert to recommend_only; emit 3.renewal.disabled.v1; return

    remediation = await remediate({
      artifact:    ctx.inputArtifact,
      issues:      ctx.issueList.filter(i => i.autoFixable && severity in {'low','medium'}),
      sourceHints: ctx.sourceHints,
      requestOrigin: ctx.requestOrigin,
    })
    // remediationEngine.js auto-routes: patch-existing-source if acquireSource succeeds,
    // else generate-from-scratch; both paths return { ok, path, renewedUrl?, deploymentId?, ... }

    if !remediation.ok:
      hotStore.incr(`renewal:backoff:{productId}`, 24h)
      emit 3.renewal.build_failed.v1 { productId, runId, reason, buildLog }
      escalate per charter.escalationPolicy
      return envelope with remediation.ok=false

    delta = await verifyRecrawl(remediation.renewedUrl, ctx.issueList)
    emit 3.renewal.applied.v1 { productId, runId, renewedUrl, deploymentId, path, deployedAt }
    emit 3.renewal.delta.v1 { productId, runId, before: ctx.issueList, after: delta.after,
                              resolved: delta.resolved, unresolved: delta.unresolved,
                              regressions: delta.regressions }
    return envelope with remediation block + before_after_delta block
```

### 2.4 Output envelope extension

```js
{
  // existing fields (unchanged):
  agent_id: 3, agent_name: 'Self-Renewal', mode: 'step-owner', step: 6,
  authority: <'recommend_only' | 'auto_write_internal'>,   // depends on path taken
  recommendation: <string>,
  renewal_flags: [<area>, ...],
  confidence: <0.0–0.9>,

  // new — mode echoed back so callers can audit:
  invocation_mode: 'recommend_only' | 'fork_and_fix',
  requires_human_gate: <bool>,         // true on severity 'high' or 'critical' in fork-and-fix

  // new — present iff invocation_mode === 'fork_and_fix' AND no gate fired:
  remediation: {
    ok: <bool>,
    path: 'patch-existing-source' | 'generate-from-scratch',
    renewedUrl?:    <string>,
    deploymentId?:  <string>,
    patchedFiles?:  <string[]>,         // present on patch-existing-source
    generatedFiles?: <string[]>,        // present on generate-from-scratch
    buildLog?:      <string>,           // present on ok:false
    sourceDisclosure: <string>,         // verbatim from remediationEngine
    deployedAt:     <ISO-8601>,
  },

  // new — present iff remediation.ok === true:
  before_after_delta: {
    issuesBefore:  <W2.Issue[]>,
    issuesAfter:   <W2.Issue[]>,
    resolved:      <issueId[]>,
    unresolved:    <issueId[]>,
    regressions:   <issueId[]>,         // issues present in after but not in before
  },

  metadata: { ok, runId, productId, flag_details, signals_observed,
              backoffActive: <bool>, escalated: <bool> },
}
```

### 2.5 Verification re-crawl (post-deploy)

```
verifyRecrawl(renewedUrl, originalIssueList):
  artifact = await buildVerificationArtifact(renewedUrl)
    // calls dispatch('crawl', { url: renewedUrl }) via Orchestra browserless adapter
    // re-normalizes via Anthropic the same way url.js inputAdapter did originally
  newIssues = issueDetector.detect(artifact, evidence)
  resolved = originalIssueList.filter(o => o.autoFixable && !newIssues.some(n => n.category === o.category))
  unresolved = originalIssueList.filter(o => o.autoFixable && newIssues.some(n => n.category === o.category))
  regressions = newIssues.filter(n => !originalIssueList.some(o => o.category === n.category))
  return { after: newIssues, resolved: resolved.map(i => i.id),
           unresolved: unresolved.map(i => i.id), regressions: regressions.map(n => n.id) }
```

Cost note: each fork-and-fix execution adds 1 Orchestra `crawl` + 1 Claude normalization + 1 IssueDetector pass. See Open Questions §6 Q5 for sampling vs always-on.

---

## 3. Integration with W2's Renewal Pipeline

### 3.1 What Agent #3 imports from W2 (unchanged)

| Module | Purpose | Path |
|---|---|---|
| Orchestra dispatcher | Capability routing | `src/lib/orchestra/index.js` |
| Orchestra member contract | `MemberResult` shape, `notYetWired` helper | `src/lib/orchestra/member.js` |
| Claude Code adapter | `code-patch`, `generate-from-scratch` | `src/lib/orchestra/claudeCode.js` |
| Vercel adapter | `deploy`, `source-retrieval` | `src/lib/orchestra/vercel.js` |
| Browserless adapter | `crawl`, `screenshot` | `src/lib/orchestra/browserless.js` |
| Playwright adapter | `interact` | `src/lib/orchestra/playwright.js` |
| Source acquisition layer | Git tarball + Vercel project → in-memory file tree | `api/_lib/sourceAcquisition.js` |
| Remediation engine | Orchestrates code-patch + generate + deploy | `api/_lib/remediationEngine.js` |
| Issue detector | Produces canonical IssueList | `api/_lib/issueDetector.js` |
| Renewal engine (static-HTML legacy) | Pre-Orchestra static renderer | `api/_lib/renewalEngine.js` |
| Before/after report composer | Side-by-side iframe + delta | `api/_lib/beforeAfterReport.js` |
| InputArtifact contract | Unified shape across URL / Description / Content / Synth | `src/lib/renewal/inputArtifact.js` |

Agent #3 reuses these modules **as-is**. No duplication. No re-implementation. Agent #3's job is to be the **agent-contract-layer gateway** to `remediate()`, with the BaseAgent authority/guard/audit-log machinery wrapped around the call.

### 3.2 What is new (must be built by the engineering dispatch)

1. **Charter widening or split** (one of):
   - **Option A** (single agent, dual authority): `Agent3SelfRenewal.charter().authority = [RECOMMEND_ONLY, AUTO_WRITE_INTERNAL]`, plus a `BaseAgent.guard()` amendment so per-invocation `plan.mode` selects which authority is active. Today's guard is `if (declared.size === 1 && declared.has(RECOMMEND_ONLY)) { reject sideEffects }`; the new guard must read the requested authority from the plan and check `declared.has(requestedAuthority)`. Implementation cost: ~30 LOC across `BaseAgent.js` + the existing tests.
   - **Option B** (split agents): Keep `Agent3SelfRenewal` at `RECOMMEND_ONLY`. Add `Agent3SelfRenewalExecutor` (new file, same charter id `3` but separate class, or repurpose Ops Runner Alpha `#21`) with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. Executor subscribes to `3.renewal.candidate.v1`, fetches the IssueList from HotStore, dispatches `remediate()`, emits `3.renewal.applied.v1`. Implementation cost: full new file (~400 LOC) + registry update + Roster validator amendment.

   See §4 below and Open Questions §6 Q2 — CEO disposition required.

2. **Server-side execution surface.** `remediationEngine.js` imports the Claude SDK + Vercel SDK indirectly via the Orchestra adapters and is **not browser-bundleable** (same constraint as Agent #2's `node:crypto` reliance, documented at `AutoRunner.jsx` L21–32). Fork-and-fix mode therefore MUST run server-side. Two viable surfaces:
   - **Path X — new endpoint `/api/agent/3/execute`**: thin wrapper that takes `{ runId, productId, issueList, mode, sourceHints }`, constructs the agent on the server (with real `auditLog`, `hot`, `cold`, `messageBus` instances), and calls `agent.recommend(ctx)`. Mirrors the `/api/renew.js` pattern.
   - **Path Y — Inngest job**: enqueue `agent.3.execute` via the existing `api/_lib/inngest.js` job runner; status polled by client. Fits the long-running-deploy reality (Vercel deploys can take 30–120 s) and avoids serverless timeout pressure.
   - Recommendation: **Path Y** for long-running fork-and-fix paths; **Path X** for synchronous recommend-only invocations. Bus integration ensures both produce the same `3.renewal.*` events.

3. **AutoRunner step 6 graduation** (decision required — see Open Questions §6 Q4):
   - **Path P — passive**: Auto Runner step 6 stays `recommend_only` forever; fork-and-fix happens ONLY via the `/api/renew.js` workflow driven from the Renewal page (`src/pages/Renewal.jsx`).
   - **Path Q — active**: Auto Runner step 6 gains a mode toggle (UI-level) that, when set to fork-and-fix, enqueues the Inngest job and shows the renewedUrl + delta inline. Auto Runner becomes the single end-user surface for both recommend and fix paths; Renewal page becomes a deeper-dive variant.

4. **`3.renewal.applied.v1` and `3.renewal.delta.v1` schemas in `MessageSchema.js`.** Currently `MessageSchema.js` only validates the `.candidate.v1` topic for Agent #3. New topics need payload schemas:

   ```js
   '3.renewal.applied.v1': {
     required: ['productId', 'runId', 'renewedUrl', 'deploymentId', 'path', 'deployedAt'],
     validators: { path: v => ['patch-existing-source','generate-from-scratch'].includes(v) }
   }
   '3.renewal.delta.v1': {
     required: ['productId', 'runId', 'resolved', 'unresolved', 'regressions'],
   }
   '3.renewal.build_failed.v1': {
     required: ['productId', 'runId', 'reason'],
   }
   '3.renewal.disabled.v1': {
     required: ['productId', 'reason', 'backoffExpiresAt'],
   }
   ```

5. **HotStore key namespace** (new keys, additive):
   - `renewal:run:{runId}` — already used.
   - `renewal:backoff:{productId}` — counter + TTL 24 h for build-failure backoff.
   - `renewal:delta:{runId}` — before/after IssueList delta cache for the UI.

6. **ColdStore lineage rows** (additive): `phase` values `remediation.dispatched`, `remediation.deployed`, `remediation.build_failed`, `verification.recrawled`, `delta.computed`, `escalated`. All under `agentId: 3`, `authority` reflecting whichever charter authority was active for the row.

7. **AuthN at `/api/agent/3/execute`** (new): the endpoint MUST verify the caller is either (a) the FlowAI internal Auto Runner identity OR (b) an authenticated end-user who owns the `productId` in question. Reuse `api/_lib/authBackend.js` patterns. No anonymous fork-and-fix.

### 3.3 What is **NOT** in scope for this engineering dispatch

- Modes (ii) code-generation-as-PR and (iii) direct-write to user's source — Panel deferred (verdict (c) on Q3).
- The agent-roadmap doc (covers the remaining 20 dormant agents; Panel Q4 verdict `(b)` Production Hardening first).
- Multi-tenant RLS enforcement on the new endpoint — that's a Production Hardening line item, but the endpoint MUST be designed to be RLS-enforceable (no shared writes to a global namespace).
- Replacing the legacy `api/_lib/renewalEngine.js` static-HTML path — kept as fallback while Orchestra adapters stabilise.

---

## 4. Authority + Escalation

### 4.1 Existing authority model

`BaseAgent.js` defines five authority levels:

```js
RECOMMEND_ONLY     // produces output; no side effects
DRAFT_ONLY         // produces drafts in HotStore; no externally visible side effects
AUTO_CONTAIN_KNOWN // can mitigate a known incident (rate-limit, isolate)
AUTO_WRITE_INTERNAL// can write to internal stores / FlowAI-owned infra
REQUIRES_HUMAN_GATE// holds a step open pending human approval
```

Agent #3's charter today is `[RECOMMEND_ONLY]`. Fork-and-fix needs `AUTO_WRITE_INTERNAL` (the renewedUrl is a FlowAI-owned Vercel deployment), and high-severity gating needs `REQUIRES_HUMAN_GATE`.

### 4.2 Proposed charter (Option A — single agent, dual authority)

```js
// in _registry.ts entry for id=3:
{
  id: 3, name: 'Self-Renewal', flowAiOnly: false,
  authority: ['recommend_only', 'auto_write_internal', 'requires_human_gate'],
  requiredCredentials: ['ANTHROPIC_API_KEY', 'VERCEL_TOKEN', 'GITHUB_TOKEN?'],
  marketplaceTools: ['claude-code', 'vercel'],
  consumes: ['6.research.findings.v1', '8.audit.completed.v1', '10.anomaly.v1', '17.evolution.proposal.v1'],
  produces: ['3.renewal.candidate.v1', '3.renewal.applied.v1', '3.renewal.delta.v1',
             '3.renewal.build_failed.v1', '3.renewal.disabled.v1'],
  escalationPolicy: 'severity-high-or-critical → emit candidate + remediation_plan, hold for human gate.
                     two consecutive build_failed within 24h → disable fork-and-fix, alert oncall.
                     remediation throws → escalate to ops runner #21 (alpha).',
}
```

Plus `BaseAgent.guard()` patch:

```js
guard(plan) {
  const declared = new Set(this.charter.authority);
  const requested = Array.isArray(plan.authorityNeeded) ? plan.authorityNeeded : [];
  for (const need of requested) {
    if (!declared.has(need)) {
      throw new Error(`Agent #${this.charter.id}: authority "${need}" not declared (charter=[${[...declared]}])`);
    }
  }
  // RECOMMEND_ONLY hard-wall stays in place ONLY when no other authority is requested:
  const needsRecommendOnlyOnly =
    requested.length === 1 && requested[0] === AUTHORITY.RECOMMEND_ONLY;
  if (needsRecommendOnlyOnly && (plan.sideEffects ?? []).length > 0) {
    throw new Error(`Agent #${this.charter.id}: RECOMMEND_ONLY plan declared sideEffects=${plan.sideEffects.length}`);
  }
  // AUTO_WRITE_INTERNAL plans MUST declare their side effects (audit trail):
  if (requested.includes(AUTHORITY.AUTO_WRITE_INTERNAL)) {
    if (!Array.isArray(plan.sideEffects) || plan.sideEffects.length === 0) {
      throw new Error(`Agent #${this.charter.id}: AUTO_WRITE_INTERNAL plan must declare sideEffects[]`);
    }
  }
}
```

### 4.3 Proposed charter (Option B — split agents)

- `Agent3SelfRenewal` (id `3`, EMBEDDED) — unchanged charter `[RECOMMEND_ONLY]`. Continues to be step-owner at step 6 'govern'. Emits `3.renewal.candidate.v1` only.
- `Agent3SelfRenewalExecutor` (NEW class; one of):
  - Sub-option B1 — share `id: 3` but register as a second class with topic-subscriber mode (not step-owner). Roster partition validator needs an exception: "id 3 may have two registered classes if their modes differ."
  - Sub-option B2 — repurpose `Ops Runner Alpha` (id `21`, EMBEDDED) as the executor. Charter `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]`. No roster-validator change needed; consistent with Ops-Runner-as-executor framing.
- Executor subscribes to `3.renewal.candidate.v1`, looks up the IssueList in HotStore, dispatches `remediate()`, emits `3.renewal.applied.v1` + downstream events.

Trade-off: Option A is fewer files but requires `BaseAgent.guard()` change (affects all 25 agents). Option B preserves single-authority-per-charter invariant but introduces an extra agent class. **Recommend Option A unless Locked-Rule-2 partition invariant is judged inviolable** — but see Open Questions §6 Q2.

### 4.4 Severity → action mapping

`issueDetector.js` emits 3 tiers: `critical | high | medium`. (No `low` tier today — `analyzeRun()` produces `low` but that's a separate `renewal_flag` severity, not an `Issue.severity`. Names happen to overlap.)

| Issue severity | Action in fork-and-fix |
|---|---|
| `critical` | NEVER auto-deploy. Emit candidate + remediation plan; `requires_human_gate=true`. |
| `high` | NEVER auto-deploy. Emit candidate + remediation plan; `requires_human_gate=true`. Human ACK via separate endpoint advances to deploy. |
| `medium` | Auto-deploy in fork-and-fix mode. Emit `3.renewal.applied.v1`. |
| (none) | No remediation invoked; envelope returns recommend-only path. |

The split point sits between `high` and `medium` deliberately: `high` issues (`missing-cta`, `missing-trust-signals`, `missing-h1` on URL input, `unclear-target-users`, `missing-legal`) include claims the user is **making about themselves** — auto-rewriting them is reputational and legal risk. `medium` issues are presentation-level (readability, headline hierarchy, copy length) and are safer to auto-fix into a *preview* URL.

Note this differs from the Auto Runner step 6 `govern` analyzer severity (which maps onto operational/build/audit signals, not user-facing claim accuracy). The two severity scales are deliberately separate.

### 4.5 Escalation paths

```
remediation failed (remediate() returned ok:false):
  → emit 3.renewal.build_failed.v1 with buildLog
  → increment backoff counter for productId (TTL 24h)
  → continue invocation, return envelope with remediation.ok=false

remediation threw:
  → catch in act(); audit-log phase='act.error'
  → emit 3.renewal.build_failed.v1 with reason='exception'
  → escalate per charter.escalationPolicy

backoff counter ≥ 2 within 24h on same productId:
  → disable fork-and-fix for productId; emit 3.renewal.disabled.v1
  → next 24 h: all fork-and-fix requests on this productId revert to recommend_only

regression detected (delta.regressions.length > 0):
  → DO NOT auto-rollback (renewedUrl is a separate Vercel preview; original is untouched)
  → emit 3.renewal.delta.v1 with regressions[] populated
  → flag requires_human_gate=true so UI surfaces the regression before user accepts
```

---

## 5. Test Surface

All tests use neutral fixtures only. No live Anthropic / Vercel / Browserless calls. A `MockOrchestra` is required (~80 LOC) that returns deterministic `MemberResult` shapes per action. Test paths under `tests/agents/` to match existing convention.

### 5.1 Regression tests (must remain green)

| ID | Test | Source |
|---|---|---|
| T-R1 | `plan()` recommend-only on neutral run-summary returns expected flags | existing `Agent3SelfRenewal.test.js` |
| T-R2 | `act()` recommend-only emits `3.renewal.candidate.v1` and writes HotStore | existing |
| T-R3 | `recommend()` survives hostile-getter ctx without throwing | existing peer-review must-fix #1 |
| T-R4 | `analyzeRun()` heuristic-individual outputs (5 heuristics × pos/neg cases) | existing `__test` export |

### 5.2 New tests (charter + mode)

| ID | Test |
|---|---|
| T-N1 | Charter widened to dual authority validates without partition-validator errors |
| T-N2 | `plan({mode:'fork_and_fix'})` with no `issueList` throws explicit error |
| T-N3 | `guard()` rejects fork-and-fix plan if charter still `[RECOMMEND_ONLY]` |
| T-N4 | `guard()` rejects auto_write_internal plan with empty `sideEffects[]` |

### 5.3 New tests (fork-and-fix happy path)

| ID | Test |
|---|---|
| T-F1 | Neutral IssueList with 1 medium auto-fixable → MockOrchestra returns successful patch + deploy → envelope contains `remediation.ok=true, renewedUrl, deploymentId` |
| T-F2 | Neutral IssueList with no autoFixable issues → no Orchestra dispatch called; envelope has `remediation.ok=true, path='no-op'` (or recommend-only fallback — TBD by engineering dispatch) |
| T-F3 | `before_after_delta.resolved.length === 1` when MockOrchestra's stub patch removes the issue category from the re-crawl |
| T-F4 | `3.renewal.applied.v1` published with deploymentId and renewedUrl populated |
| T-F5 | Source acquisition succeeds (mocked git tarball) → `remediation.path === 'patch-existing-source'` |
| T-F6 | Source acquisition fails (mocked tarball-404) → `remediation.path === 'generate-from-scratch'` |

### 5.4 New tests (gates + escalation)

| ID | Test |
|---|---|
| T-G1 | Critical issue → no dispatch('deploy', ...) called; envelope `requires_human_gate=true` |
| T-G2 | High issue → no dispatch('deploy', ...) called; envelope `requires_human_gate=true` |
| T-G3 | Build failure → `3.renewal.build_failed.v1` published; backoff counter incremented |
| T-G4 | 2 consecutive build failures within 24 h → fork-and-fix disabled; `3.renewal.disabled.v1` published |
| T-G5 | Regression detected in delta → `requires_human_gate=true` even on successful deploy |
| T-G6 | `remediate()` throws → caught, audit-logged, `3.renewal.build_failed.v1` emitted, agent does NOT propagate the exception |

### 5.5 Bundling / surface tests

| ID | Test |
|---|---|
| T-B1 | Importing `Agent3SelfRenewal` in the browser path (vitest browser env) does NOT pull in Anthropic SDK or `remediationEngine.js` |
| T-B2 | Server-side path (vitest node env) successfully imports `remediationEngine.js` and `claudeCode.js` |
| T-B3 | Browser invocation of `recommend({mode:'fork_and_fix'})` short-circuits with a clear error ("fork-and-fix requires server execution") instead of attempting a browser dispatch |

### 5.6 Endpoint tests (if Path X chosen)

| ID | Test |
|---|---|
| T-E1 | `/api/agent/3/execute` rejects unauthenticated requests with 401 |
| T-E2 | `/api/agent/3/execute` rejects mode=fork_and_fix without `productId` ownership with 403 |
| T-E3 | `/api/agent/3/execute` mode=recommend_only with valid ctx returns 200 + envelope |
| T-E4 | `/api/agent/3/execute` mode=fork_and_fix with valid ctx returns 202 + job id (Inngest path) OR 200 + envelope (synchronous path) |

Total: ~25 tests. Estimated implementation: half-day to one day per `MockOrchestra` + new endpoint, plus the charter widening / guard changes.

---

## 6. Open Questions (CEO disposition / Panel review required before engineering dispatch)

### Q1. Mode (iv) interpretation clash + Panel-(c) ratification

The W03 dispatch text refers to "Orchestra direct-write path" as the active fork-and-fix mechanism, but the SSOT-canonical mode (iii) is named "direct-write" (write patches to user's source). Reading the Panel verdict (Q3 PLURALITY_(c)) plus the dispatch's mention of "modes iii + iv deferred per Panel" — the deferred set must actually be **(ii) + (iii)**, not (iii) + (iv), because Panel (c) explicitly endorsed recommend-only + fork-and-fix as the initial pair. Confirm: **active modes = (i) recommend-only + (iv) fork-and-fix; deferred = (ii) code-gen-as-PR + (iii) direct-write to user source.** Or CEO over-rides Panel per Recommendation 3 path (1) and we build all 4 modes from day one. *This spec assumed the Panel-(c) phased path throughout; engineering dispatch is blocked until ratified.*

### Q2. Charter authority shape — Option A (dual authority) vs Option B (split agents)

Option A widens Agent #3's charter to `[RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` and amends `BaseAgent.guard()` per-invocation. Side effect: changes guard contract for all 25 agents — needs roster-validator review and a regression sweep. Implementation: ~50 LOC + tests, mostly in one file.

Option B keeps Agent #3 at `[RECOMMEND_ONLY]` and adds a new executor — either as a second class registered under id 3 (requires roster-validator exception) OR by repurposing Ops Runner Alpha #21 as the executor (charters #21 today are proposal-only per `BaseAgent.js` L19). Side effect: introduces a second agent identity for what users will think of as one feature. Implementation: ~400 LOC new file + registry + tests.

This spec recommends Option A for surface simplicity, but the Locked Rule 2 partition invariant ("BaseAgent.js compile-time validates EXACTLY 25 agents") + the single-authority-per-charter convention argue for Option B. **CEO call.**

### Q3. Severity tier extension

`issueDetector.js` emits `critical | high | medium`. Should fork-and-fix introduce a new bottom tier (`low`) for issues currently graded `medium` but with low remediation risk (e.g. headline hierarchy adjustment), to widen the auto-deploy window? OR should we keep the 3-tier scale and the rule "medium auto-deploys; high+critical gate" exactly as specified above? *This spec assumed the 3-tier scale unchanged.*

### Q4. Surface — `/api/agent/3/execute` vs Inngest job vs AutoRunner step 6 mode toggle

Three surfaces are viable; they are not mutually exclusive but the first engineering dispatch should pick one:

- **Path X — `/api/agent/3/execute`** synchronous endpoint. Simplest. Risk: serverless timeout on deploy (~30–120 s).
- **Path Y — Inngest job** queued via `api/_lib/inngest.js`. Job polled by client. Best fit for the actual deploy latency. Risk: more moving parts; new failure modes (job stuck, polling never resolves).
- **Path Q — AutoRunner step 6 mode toggle** that, when set to fork-and-fix, enqueues Path Y. Best end-user experience (single page) but couples Auto Runner UX to renewal pipeline maturity.

This spec assumes the engineering dispatch chooses **Path Y + Path Q** (Inngest job + Auto Runner mode toggle) for a coherent end-user flow, but Path X is faster to ship for an MVP. **CEO call.**

### Q5. Verification re-crawl — always, on-demand, or sampled?

Each fork-and-fix execution adds: 1 Orchestra `crawl` (Browserless minutes) + 1 Claude normalization (API tokens) + 1 IssueDetector pass (CPU). At 5 products × continuous-crawl cadence × every renewal cycle, this is non-trivial. Three options:

- (a) **Always run** verification — canonical, cleanest delta, highest cost.
- (b) **On-demand** — user clicks "Verify fix worked" in the UI; surface returns delta only on demand.
- (c) **Sampled** — every Nth renewal verified; others trusted on deploy success only.

This spec assumed (a). Locked Rule 14 ("crawls at any time, no maintenance windows") implies (a). Locked Rule 16 ("monthly minimum marketplace scan") implies (a) or sampled at least monthly. **CEO disposition.**

---

## 7. Engineering-dispatch readiness checklist

Once CEO dispositions Q1–Q5, the engineering dispatch should produce, in this order:

1. `BaseAgent.guard()` amendment + tests (Option A) OR new `Agent3SelfRenewalExecutor` class + tests (Option B).
2. `_registry.ts` entry update for id 3 (Option A) or new id (Option B). Locked Rule 2 partition validator re-runs clean.
3. `MessageSchema.js` payload schemas for the four new `3.renewal.*` topics.
4. New Agent #3 method (`executeRemediation` or equivalent) wired to `remediate()` import from `api/_lib/remediationEngine.js`.
5. `verifyRecrawl()` helper (new file `api/_lib/verifyRecrawl.js` ~120 LOC).
6. Server-side endpoint surface per Q4 disposition.
7. AutoRunner step 6 mode toggle per Q4 disposition (UI work in `src/pages/AutoRunner.jsx` + `src/components/operations/`).
8. `MockOrchestra` test helper + the 25 tests in §5.
9. Doc update: `docs/CANONICAL_REFERENCE.md` Agent #3 section to reflect the dual-authority / executor split.

Estimated engineering effort: 2-3 days for Option A path X; 4-5 days for Option B path Y. (Excludes W2's continued work on the renewal pipeline itself, which is upstream and already in flight.)

---

## 8. Out of scope (intentional)

- Multi-tenant RLS enforcement at the new endpoint — Production Hardening track.
- Modes (ii) and (iii) — Panel-deferred.
- Replacing the legacy static-HTML `renewalEngine.js` — runs in parallel until Orchestra adapters stabilise.
- Agent #6 / #8 / #10 emitting IssueList payloads on their existing topics — separate dispatches once their charters are graduated.
- Stripe / commercial-rail integration for renewedUrl monetisation — distinct from this feature.
- The agent-roadmap doc for the 20 dormant agents — Panel Q4 verdict says Production Hardening first.

---

*End of spec. Pending CEO disposition on Open Questions §6 before engineering dispatch.*
