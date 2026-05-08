# 06 — DMCA infrastructure inventory

Date: 2026-05-07

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-dmca/*` | **MISSING** — directory does not exist |
| `docs/w1-dmca*` | **MISSING** |
| Any DMCA template, takedown letter, vendor matrix, response procedure committed to disk | **NONE** |
| References to "DMCA" / "Designated Agent" / "takedown" anywhere | 3 hits, all from upstream specs/code referring to Agent #13's eventual role |

Direct hits:
- `src/lib/agents/MessageSchema.js:71` — registers topic `'13.dmca.filed.v1'` with description "DMCA takedown filed"
- `src/lib/governance/ScoreEvaluator.js:64` — `gov.ip_protection` description includes "DMCA-ready templates. Verified by Agent #13 cross-check"
- `specs/w3-overnight/06-score-eval-integration.md:29` — flags `gov.ip_protection` as "Missing. Agent #13 surface absent."

## 2. Agent #13 Self-Protection charter — does the implementation exist?

| Item | Status |
|---|---|
| `src/lib/agents/13-self-protection.js` | **MISSING** — Glob `src/lib/agents/[0-9]*` returns no files. The directory only contains `BaseAgent.js` and `MessageSchema.js`. |
| Agent #13 in roster (`BaseAgent.AGENT_IDS`) | YES — `SELF_PROTECTION: 13` (`src/lib/agents/BaseAgent.js:30`) |
| Agent #13 in `EMBEDDED_AGENTS` partition | YES — `src/lib/agents/BaseAgent.js:41` |
| Charter implementation | **NONE.** No `static charter()` defined for #13 anywhere. The 20-agent roster is declared but only #11 (`tests/baseagent.test.js`, `tests/credentialadapter-integration.test.js`) is exercised in tests via a `TestAgent` / `CredsAgent` stub. |
| Topics registered for #13 | 3: `'13.threat.detected.v1'`, `'13.signature.update.v1'`, `'13.dmca.filed.v1'` (`src/lib/agents/MessageSchema.js:69–71`) |
| Required credentials per charter | **UNKNOWN** — no charter exists |
| Marketplace tools per charter | **UNKNOWN** — no charter exists |

## 3. Required components for a working DMCA flow (per industry standard)

For each component: "Spec status" = whether the (missing) W1 DMCA spec defines it; "Repo evidence" = what is committed today.

### 3.1 Designated Agent registration (US Copyright Office)

| Item | Spec status | Repo evidence |
|---|---|---|
| Designated Agent name + address | NOT DEFINED | None |
| US Copyright Office DMCA Agent registration record (`https://dmca.copyright.gov/`) | NOT DEFINED | None |
| Per-domain Notice page (`/dmca`, `/copyright-policy`) | NOT DEFINED | No `/dmca` route in `src/pages/*`; only `src/pages/PrivacyPolicy.jsx` and `src/pages/TermsOfUse.jsx` exist for legal surface |
| Email contact (e.g. `dmca@veuaistudio.com`) | NOT DEFINED | None — `src/pages/PrivacyPolicy.jsx:24, 32` references `privacy@veuaistudio.com`; no DMCA mailbox in code |

### 3.2 Takedown notice templates

| Template | Spec status | Repo evidence |
|---|---|---|
| Outbound takedown notice (we send) | NOT DEFINED | None |
| Counter-notice template (we receive) | NOT DEFINED | None |
| Repeat-infringer policy text | NOT DEFINED | None |
| 17 USC §512(c) compliance checklist | NOT DEFINED | None |

### 3.3 Vendor matrix (monitoring + enforcement)

| Vendor | W0-locked? | In `TOOL_REGISTRY`? | Repo integration? |
|---|---|---|---|
| Markify (trademark watch) | YES (`specs/w3-overnight/03-vendor-locks.md:14`) | NO (`specs/w3-overnight/03-vendor-locks.md:32`) | None |
| Cloudflare Bot Management (anti-scraping) | YES (`specs/w3-overnight/03-vendor-locks.md:14`) | NO | None |
| Recorded Future (threat intel) | Not in W0 lock list per Job 7 — review | NO | None |
| Flashpoint (deep / dark web monitoring) | Not in W0 lock list per Job 7 — review | NO | None |
| ZeroFox (brand-protection takedowns) | Not in W0 lock list per Job 7 — review | NO | None |
| Cease-and-desist letter automation vendor | NOT DEFINED | None |

### 3.4 Detection / signal sources

| Source | Spec status | Repo evidence |
|---|---|---|
| Crawler-observed copies of VEU site/source | NOT DEFINED | `api/_lib/crawler.js` exists for outbound crawl; no inbound monitoring of mirrored sites |
| Hash / watermark detection | NOT DEFINED | `selfProtection/entry.ts:59` LLM prompt mentions "AI content watermarking" as a recommendation; no implementation |
| Trademark / domain-watch alerts | NOT DEFINED | None |
| User-submitted reports | NOT DEFINED | No `/api/dmca/*` endpoint in `api/`; no UI form |

### 3.5 Response procedures

| Procedure | Spec status | Repo evidence |
|---|---|---|
| Triage flow on inbound notice | NOT DEFINED | None |
| 24-hour acknowledgement SLA | NOT DEFINED | None |
| 48-hour content removal SLA | NOT DEFINED | None |
| Repeat-infringer counter | NOT DEFINED | None |
| Archive of received notices (audit-trail) | NOT DEFINED | `api/_lib/auditLogger.js`-style infrastructure exists for general audit, but no DMCA-specific schema |
| `13.dmca.filed.v1` event consumer | **TOPIC DEFINED ONLY** | `MessageSchema.js:71` registers the topic; no producer or subscriber implemented anywhere |

### 3.6 Outbound takedown automation (us → infringer)

| Item | Spec status | Repo evidence |
|---|---|---|
| Auto-generated notice with URL list | NOT DEFINED | None |
| Notarisation / timestamp service | NOT DEFINED | None |
| Submission portal integration (Google, Meta, Cloudflare host abuse, registrar abuse) | NOT DEFINED | None |
| Status tracker (sent → acknowledged → removed) | NOT DEFINED | None |

### 3.7 Auditor-side cross-check (Score Evaluator)

| Item | Spec status | Repo evidence |
|---|---|---|
| `gov.ip_protection` evaluator function | Defined as criterion (`ScoreEvaluator.js:58–65`); evaluator implementation **MISSING** per `specs/w3-overnight/06-score-eval-integration.md:29` | None — `src/lib/audits/` directory does not exist |
| Replay over `13.dmca.filed.v1` events | NOT DEFINED | None — no consumer of the topic |

## 4. Gaps relative to charter requirements

Even though no #13 charter exists in code, `ScoreEvaluator.js:60–64` documents the implicit requirement:

> **Standard stack present:** robots.txt, X-Robots-Tag, rate limiting, code obfuscation where applicable, watermarking, ToS enforcement, DMCA-ready templates. Verified by Agent #13 cross-check.

| Charter requirement | Met? | Where to look |
|---|---|---|
| `robots.txt` per domain | NO | See `04-cloudflare-checklist.md §3.3` — no robots.txt anywhere in repo |
| `X-Robots-Tag` per route | NO | See `04-cloudflare-checklist.md §3.4` |
| Rate limiting | PARTIAL | `api/leads/capture.js` has app-level "8/min/IP" per `tests/W4_OVERNIGHT_REPORT.md:68`; no zone-level rule |
| Code obfuscation | NO | `vite.config.js` does not enable any obfuscation plugin; default Vite minify only |
| Watermarking | NO | Only mentioned in LLM prompt at `base44/functions/selfProtection/entry.ts:59` |
| ToS enforcement | PARTIAL | `src/pages/TermsOfUse.jsx` exists as static page; no enforcement logic |
| DMCA-ready templates | NO | None on disk |
| Agent #13 cross-checker | NO | No charter, no evaluator, no audit module |

## 5. Verdict

DMCA infrastructure is at **zero implementation**. The only artifacts are:
- A reserved topic `'13.dmca.filed.v1'` in `MessageSchema.js`
- A reference to "DMCA-ready templates" in the `gov.ip_protection` rubric description
- The `selfProtection/entry.ts` Base44 function which is an **LLM-prompt-based scanner** that emits hypothetical recommendations including DMCA — not a real DMCA pipeline

**Required to reach minimum DMCA viability:**

1. Author `specs/w1-dmca/*` covering Designated Agent registration, vendor matrix, response SLAs, takedown templates.
2. Implement Agent #13 Self-Protection (`src/lib/agents/13-self-protection.js`) with `static charter()` declaring `requiredCredentials` (Markify, Cloudflare Bot Management, etc.) and `produces: ['13.threat.detected.v1', '13.signature.update.v1', '13.dmca.filed.v1']`.
3. Author `gov.ip_protection` evaluator (or stub) under `src/lib/audits/`.
4. Add `/dmca` page + `dmca@veuaistudio.com` mailbox to corporate identity surface.
5. Provision robots.txt and X-Robots-Tag once W1 Cloudflare spec lands (cross-dependency on `04-cloudflare-checklist.md`).
6. Procure Markify (W0-locked, currently absent from registry per `specs/w3-overnight/03-vendor-locks.md:32`).
7. Register Designated Agent with US Copyright Office.

**No part of the DMCA flow is wired today.** This is a complete green-field workstream within W1.
