# SSOT Parking Lot

## Purpose
Items identified during operating sessions that should be considered for inclusion in future SSOT amendment cycles. This file is NOT canonical SSOT. Items here are CANDIDATES awaiting Panel review and MG2 disposition.

## Workflow
1. When CEO or W03 identifies an item that belongs in a future SSOT amendment, W03 dispatches an APPEND-only entry to this file BEFORE responding further to the CEO.
2. Every SSOT amendment cycle reviews this file. Items with sufficient evidence are promoted to Panel consultation per bias-management rules.
3. Disposed items (accepted into canonical SSOT, rejected, or merged with other amendments) are marked with their disposition + the commit/dispatch that resolved them. They remain in the file for audit history; nothing is deleted.

## Entry format
Each entry includes:
- ID (sequential: ENTRY 001, 002, ...)
- Date identified
- Source (CEO or W03 + brief context)
- Description (1-3 sentences)
- Disposition (NEW | UNDER REVIEW | ACCEPTED [commit hash] | REJECTED [rationale] | MERGED [into which other entry])

## Entries

### ENTRY 001 — 2026-05-14
- **Source**: CEO 2026-05-13 (during deployed FlowAI manual test session, after W03 conflated Lovable's "Ready to build, Victor?" greeting with FlowAI's non-personalized dashboard)
- **Description**: Personalization affordance requirement. FlowAI's dashboard AND every product FlowAI generates (Native App, Mobile App, SaaS, Agentic AI) must surface a personalized greeting to authenticated users by default. Pattern reference: Lovable's "Ready to build, [Name]?". Apply at FlowAI UI layer AND at FlowAI's output product template, so personalization is inherited by every vendor-built product downstream.
- **Disposition**: NEW (awaiting next SSOT amendment cycle review)

---

### ENTRY 002 — 2026-05-14
- **Source**: CEO 2026-05-14 (in response to W1 BROWSERLESS_API_KEY sync dispatch, after observing that FlowAI's current crawler stops at homepage-level content)
- **Description**: FlowAI crawler must perform AGGRESSIVE EXHAUSTIVE traversal of every URL provided. Scope per URL includes: every link, every card, every modal, every page, every interactive engine, every AI agent surface. Partial crawls or homepage-only fetches are insufficient. This is the GTM-readiness test bar for VEU's 5 products (saigedemo, pressai, reltwin, smscommunities, mybirthsafe) AND for FlowAI itself dogfooding on its own URL. Required capabilities: full-site spider with depth control, modal/dialog state exploration, authenticated-session crawling, JS interaction simulation (clicks, scrolls, form interactions), AI agent surface probing (chat inputs, prompt boxes), per-route Quality Audit. Today's simple-fetch + Browserless setup is the minimum viable crawler, not the GTM-ready one.
- **Trajectory implications**: Agent #21 Crawl Conductor (DORMANT) becomes critical path; Agent #6 Research scope must expand beyond homepage fetch; Playwright pool (v3 trajectory Step 6) required for interaction simulation.
- **Disposition**: NEW (awaiting next SSOT amendment cycle review)

---

### ENTRY 003 — 2026-05-14
- **Source**: CEO 2026-05-14 (in response to observing Auto Run on saigedemo.com run all 8 agents on a null-body crawl input)
- **Description**: Three architectural gaps in FlowAI's current Auto Runner pipeline: (a) **No hard gates between steps** — when Step 1 Research identified "CRITICAL: page content insufficient, null body," the Auto Runner proceeded through all 7 downstream steps producing 7 redundant "couldn't assess" reports. Per FlowAI's own 6-step Product Clearance Protocol with 95/95 scoring threshold, agents should be able to return a `block` semantic that halts downstream execution OR re-routes to fix-first mode OR escalates. None of this exists in the current AutoRunner.jsx code. (b) **Self-Renewal Agent (#3) produces reports, not fixes** — the current Self-Renewal output is an ISSUE register with HEAL action DESCRIPTIONS, not executed fixes. For Self-Renewal to be real, it must: detect issue → generate fix code/config → apply fix to source → verify → loop until resolved or escalate. Current agent stops at "detect + describe." (c) **Remediation semantics undefined** — SSOT today says FlowAI is "remediation orchestration infrastructure" but the actual semantics of HOW remediation happens are unspecified. Possible models: (i) Recommendation-only mode (current state); (ii) Code-generation mode (produces patches/PRs); (iii) Direct-write mode (FlowAI has source credentials and pushes fixes); (iv) Fork-and-fix mode (produces a new URL that's a fixed version of the source). Each has different security, IP, and operational implications and the SSOT must specify which model(s) are canonical.
- **Trajectory implications**: Gap (a) is smallest-scope fix — agent return contract change + AutoRunner gate logic, ~hours. Gap (b) requires new agent code, days-to-weeks. Gap (c) requires architectural decision affecting all 25 agents and the entire FlowAI security/IP model — likely weeks of design before any code.
- **Disposition**: NEW (awaiting next SSOT amendment cycle review; overlaps directly with Panel review's "FlowAI category definition" gap surfaced in 4-part review commit b512293)

---

*File created 2026-05-14 by W5b per W03 dispatch. First entry logged at creation.*
