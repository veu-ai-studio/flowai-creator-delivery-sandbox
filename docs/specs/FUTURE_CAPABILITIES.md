# FlowAI Future Capabilities — NOT canonical SSOT

**Status:** Non-canonical capability catalogue. Items here are **target future capabilities** that are NOT in canonical SSOT (`docs/CANONICAL_REFERENCE.md`). This document exists per CEO Decision D3 on CA-12 v2 (2026-05-16) — to honestly track capabilities that are NOT built, NOT promised, NOT canonical — but are intentionally scoped for future consideration.

**Author:** W3, 2026-05-16 (initial creation per CA-12 v2 Dispatch).

## What this document is NOT

- It is **not canonical SSOT**. Nothing here is a contract, a promise, or a binding architectural commitment.
- It is **not a roadmap** in the project-management sense — there are no dates, no priorities, no resource allocations.
- It is **not the CA-n parking lot** (`docs/SSOT_PARKING_LOT.md`) — parking-lot items are candidate SSOT amendments. Items in this document are NOT candidates for the SSOT amendment cycle until they reach "prototype landed" status, at which point they may be promoted via a fresh CA-n.
- It is **not a spec** in the engineering sense — items here have NO design, NO implementation, NO tests, NO operator-facing surface.

## What this document IS

- An **honest inventory** of capabilities considered, named, but explicitly NOT built and NOT in canonical SSOT.
- A way to **preserve clarity** in the SSOT by removing aspirational items from canonical text.
- A **historical record** of what was considered + when + why deferred.

## Status taxonomy (used in entries below)

| Status | Meaning |
|---|---|
| **NOT BUILT** | Zero implementation. Definition exists in text only. |
| **PARTIAL SCAFFOLD** | Some implementation exists (e.g., a stub function, an unused module) but no end-to-end path. |
| **NOT CANONICAL SSOT** | Explicit declaration that this is NOT in `docs/CANONICAL_REFERENCE.md`. |
| **TARGET FUTURE CAPABILITY** | The team considers this a desirable capability eventually. No commitment to dates or resources. |
| **NO PROTOTYPE** | No working prototype, even partial. (`PARTIAL SCAFFOLD` items have something to point at; `NO PROTOTYPE` items have nothing.) |

---

## Entry 1 — Mode 2 SUB-2B (Full Build + Deploy from Description)

**Date entered:** 2026-05-16 (per CA-12 v2 dispatch, deferred from CA-12 v1 SSOT per CEO Decision D3 + Panel `QUORUM_PLURALITY_GQ4-DEFER` verdict 7/9).

**Definition (for reference; NOT a contract):**

Mode 2 SUB-2B BUILD would be a capability where FlowAI accepts a product description (no existing URL) and **writes + deploys a real working product** to a brand new URL. The user provides description / spec / content / voice / screenshots; FlowAI generates code; deploys.

Input: description / spec / content / voice / screenshots (no existing URL).
Output: live product at brand new URL.
Pipeline behaviour (if it were built):
- Step 1: Agent #6 — market research + competitive intel + audience analysis.
- Step 2: Agent #7 — generate UX/visual specifications.
- Step 3: Agent #2 + Agent #7 Phase 2 executor — emit code.
- Step 4: Agent #8 — full 5-dim audit on real generated code.
- Step 5: deploy via Orchestra `dispatch('deploy', ...)` member (Vercel canonical).
- Step 6: Agent #3 — iterate on QA findings.
- Step 7: Agent #9 — GTM readiness for the new product.
- Step 8: Agent #10 — final clearance + ProductSSOT write.

**Status:**
- **NOT BUILT** — code-generation pipeline does not exist end-to-end.
- **NO PROTOTYPE** — no partial end-to-end working path. `api/renew.js` (commit `9b4e511`) handles renewal (Mode 1 SUB-1B PREVIEW path); it does NOT handle from-scratch build.
- **NOT CANONICAL SSOT** — explicitly removed from `docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md` v2 per CEO Decision D3 + Panel verdict.
- **TARGET FUTURE CAPABILITY** — the team considers this desirable eventually. No commitment.

**Why deferred (from CA-12 v1 SSOT):**

Per W6 Panel ratification 2026-05-16 (commit `5c2324f`):
- Panel verdict on G-Q4: `QUORUM_PLURALITY_GQ4-DEFER` (7 of 9 ENGAGED) — defer Mode 2 SUB-2B from SSOT until at least one prototype implementation lands.
- Panel rationale (from 26 distinct objections): catalogue of ROADMAP capabilities in canonical SSOT erodes the credibility of the BUILT entries. Items without a prototype path should not appear in canonical SSOT.
- CEO Decision D3 (2026-05-16): defer SUB-2B from SSOT entirely; relocate to `FUTURE_CAPABILITIES.md` (this document); promote Mode 2 SUB-2A SPEC only (which is built and proven).

**Conditions for re-consideration (would re-open a CA-n cycle):**

The team may re-open Mode 2 SUB-2B for SSOT canonical consideration only when ALL of the following are demonstrably true:

1. A working end-to-end code-generation prototype exists for at least one of the 5 VEU products (proving the path is possible in practice, not just in principle).
2. The prototype passes a `MockBrowserless` / `MockPlaywright` adversarial test pass (per `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` patterns).
3. A cost-envelope estimate is grounded in real observed runs (not extrapolation from Mode 1 + Mode 2 SUB-2A separately).
4. The Orchestra `dispatch('generate-from-scratch', ...)` chain (v0 / Lovable / Bolt / Claude Code / etc. per `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`) has at least one ranked adapter at `BUILT` or `PARTIAL` status (today: all `DEFERRED` or unavailable per Rev-2.1 §8.1 Archived states).
5. Agent #7 Phase 2 executor charter is drafted + ratified.
6. Agent #2 BUILD-Authority elevation pattern (per CA-12 v2 §A.2.1) has at least one production deployment under it.

Until ALL six conditions are demonstrably true, Mode 2 SUB-2B remains in this document and OUT of canonical SSOT.

**Cross-references:**
- CA-12 v1 (commit `f9a62a0`) §A.1.2 — original Mode 2 SUB-2B definition (now removed in v2).
- CA-12 v2 (this CA cycle) — Panel rationale + CEO D3.
- `docs/specs/agent-blueprints/AGENT_07_Design.md` Phase 2 — design-side dependency.
- `docs/specs/agent-blueprints/AGENT_02_*` (Agent #2 spec, if drafted) — code-side dependency.
- `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §8.1 — Archived adapter status (Lovable, Replit).

---

## Document maintenance

- **Adding entries:** when a capability is intentionally removed from canonical SSOT, the removing CA-n cycle MUST add an entry here describing what was removed, when, why, and re-consideration conditions. Without this discipline, the canonical SSOT erodes silently.
- **Removing entries:** an entry is removed from this document ONLY when the capability is promoted to canonical SSOT via a fresh CA-n cycle. The CA-n promotion commit must explicitly call out the `FUTURE_CAPABILITIES.md` removal.
- **No silent deletions:** this document is append-only in spirit. Entries may be amended (status updates, re-consideration condition refinements) but not deleted without an explicit CA-n.

*End of FUTURE_CAPABILITIES.md. Non-canonical. Honest scope.*
