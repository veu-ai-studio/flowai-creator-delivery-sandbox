# Agent #19 — Technological Evolution — Build Blueprint

**Status:** DORMANT. Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 19 + CA-11-B.10 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `19` |
| Name | `Technological Evolution` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces tech-evolution proposals; never executes upgrades directly (Self-Renewal Executor handles fixes per CA-7) |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** tracks underlying tech-stack evolution — runtime versions (Node 24 → 25 → 26), framework releases (Vite, React, Next), database engine versions (Supabase Postgres major releases), security CVE feeds across dependencies; consumes ProductSSOT `architecture_snapshot.dependencies[]` for per-product baselines.
- **Decide:** identifies products whose dependencies have drifted; classifies upgrade urgency (security-critical → high; performance-improvement → medium; minor-version → low).
- **Execute:** emits per-product upgrade proposals + per-portfolio aggregate.
- **Emit:** `19.tech_upgrade_proposal.v1`, `19.cve_alert.v1`.

## 3. MessageBus topics

**Consumes:**
- Per-product `architecture_snapshot` updates via `10.ssot.updated.v1`
- External CVE feeds (NVD, GitHub Security Advisories) — own dispatch
- Vendor release feeds (own dispatch)

**Produces:**
- `19.tech_upgrade_proposal.v1` — payload: `{ productId, dependency, currentVersion, targetVersion, urgency: 'low'|'medium'|'high'|'critical', evidence, at }`
- `19.cve_alert.v1` — payload: `{ cveId, affectedDependency, severity, productsAffected: [], remediationVersion, at }`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: nvdFeedUrl }, opts);
orchestra.dispatch('analyze', { artifact: cveCorpus, criteria: 'upgrade-priority' }, opts);
orchestra.dispatch('extract-structured', { text, schema: cveSchema }, opts);
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (CVE + vendor release tracking) |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` |
| 3 | Browserless | `browserless` | low | `crawl` (NVD, GitHub Security Advisories feeds) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent19TechnologicalEvolution.js                   # ~440 LOC
src/lib/agents/agents/__tests__/Agent19TechnologicalEvolution.test.js    # ~280 LOC
```

**Class skeleton:** mirrors Agent #17 cross-step pattern (`embedded`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('technological-evolution', agent)`. Cadence: daily 07:00 UTC for CVE feed + weekly Sundays 02:00 UTC for vendor releases.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A19-N1 | Nominal | Critical CVE in known dependency → `19.cve_alert.v1` severity `critical` + per-product `19.tech_upgrade_proposal.v1` for each affected product |
| A19-N2 | Nominal | Vendor minor-version release → `19.tech_upgrade_proposal.v1` urgency `low` |
| A19-M1 | Malformed | CVE feed unreachable → fallback per CA-11-A.4; log warning |
| A19-E1 | Edge | Same CVE alerted twice within 24h → de-duped; single alert |
| A19-X1 | Adversarial | Hostile CVE-feed content does NOT trigger automated upgrade — proposal stays advisory only |
| A19-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A19-* tests passing
- Daily CVE invocation runs ≥30 consecutive days
- At least one `19.cve_alert.v1` accepted + remediation acted on per quarter (real CVE)
- W4 adversarial coverage ≥4 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #10 Monitor SHIPPED-GREEN (consumes its `10.ssot.updated.v1` for architecture_snapshot.dependencies[] feed)
- **Provides to:** Agent #3 Self-Renewal (consumes `19.cve_alert.v1` for security-driven renewal); Agent #17 Product Evolution (consumes tech-upgrade-proposal stream)

## 11. Estimated build effort

**~9 W-hours** Phase 1.

## 12. Open clarification flags

- **Q:** CVE feed allowlist — NVD + GitHub Security Advisories is canonical; add Snyk / Dependabot signals? **CLARIFICATION RECOMMENDED.**
