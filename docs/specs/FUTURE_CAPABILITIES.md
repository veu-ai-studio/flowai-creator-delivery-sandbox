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

## Entry 2 — Mode 3B (Cross-Product Synthesis from Operator-Owned Inputs)

**Date entered:** 2026-05-16 (per CA-12 v3 dispatch, deferred from CA-12 v2 SSOT per CEO Decision D1 + Panel `PLURALITY_GQ5v2-3PV` verdict 6/8 — Panel preferred third-party verification mechanism over operator self-attestation; CEO opted to defer entirely rather than ship a self-attestation mechanism Panel did not endorse).

**Definition (for reference; NOT a contract):**

Mode 3B SYNTHESIZE would be a capability where the operator submits 2 or more URLs that they own or have explicit license to use, FlowAI assesses each, extracts the best elements across the set, and produces a synthesized product specification (or, in a future variant, a deployed synthesized product). The capability addresses use cases like "combine the best UX of my old marketing site + the best information architecture of my new product page + the best CTA structure of my landing page into a unified new product spec."

Input: 2 or more operator-owned URLs + ownership/license attestation per URL.
Output: synthesized product specification (in canonical CA-12 v2 framing) OR — in a deeper-roadmap variant — a deployed new product at a new URL.

Pipeline behaviour (if it were built):
- Steps 1–5: per-URL Mode 1 SUB-1A behavior (Agent #21 × N parallel crawls + Agent #6/#7/#8 analyses on each).
- Step 6: synthesis logic — extract best elements from all attested-owned inputs → produce synthesized spec (the Mode 2 SUB-2A output shape).
- Steps 7–8: GTM + Monitor on the synthesized spec.

**Status:**
- **NOT BUILT** — synthesis engine does not exist; cross-URL "best element extraction" classifier does not exist; operator ownership-verification mechanism does not exist.
- **NO PROTOTYPE** — no working partial path. v2 attempted operator self-attestation; Panel rejected (preferred third-party verification).
- **NOT CANONICAL SSOT** — explicitly removed from `docs/specs/SSOT_AMENDMENT_CA12_DRAFT.md` v3 per CEO Decision D1.
- **TARGET FUTURE CAPABILITY** — the team considers this desirable eventually. No commitment.

**Why deferred (from CA-12 v2 SSOT):**

Per W6 Panel ratification of v2 (2026-05-16, `ca12-ratification-v2-2026-05-16.md`):
- Panel verdict on G-Q5-v2: `PLURALITY_GQ5v2-3PV` (6 of 8 ENGAGED) — Panel preferred third-party verification (e.g., DNS-TXT proof of ownership) over the v2 operator self-attestation mechanism.
- Panel rationale: operator self-attestation provides no protection against false attestation (the operator can simply tick the "I own this" box for any URL). For a capability that produces a deployable artifact from third-party-influenced inputs, the ownership-verification mechanism must be cryptographically sound, not honor-system.
- CEO Decision D1 (2026-05-16): defer Mode 3B entirely; relocate to FUTURE_CAPABILITIES.md alongside SUB-2B; do not ship the self-attestation mechanism Panel did not endorse; do not redesign the verification mechanism inline in CA-12 (designing it properly is a separate project).

**Conditions for re-consideration (would re-open a CA-n cycle):**

Mode 3B may re-open for SSOT canonical consideration only when ALL of the following are demonstrably true:

1. A cryptographic URL ownership-verification mechanism is designed (typical candidates: DNS-TXT record verification per RFC pattern, signed attestation chain rooted in a trusted certificate authority, or an equivalent cryptographic proof).
2. The mechanism is implemented end-to-end (issuer flow + verifier flow + revocation handling).
3. The mechanism is Panel-ratified separately (W6 adversarial Panel review specifically on the verification mechanism + threat model).
4. At least one operator-owned synthesis prototype runs end-to-end with verified ownership across all input URLs (proving the synthesis engine itself is implementable; not just the verification layer).
5. The synthesis engine handles the "best element extraction" step with auditable provenance (every element in the synthesized output traces back to a specific verified-ownership source URL).

Until ALL five conditions are demonstrably true, Mode 3B remains in this document and OUT of canonical SSOT.

**Shared-future-CA pathway with Entry 1 (per CA-12 v3 §A.1.2 cross-reference):**

Per CA-12 v3 §A.1.2, Mode 3B (this entry) and Mode 2 SUB-2B (Entry 1) are catalogued together with the commitment that they return to canonical SSOT via a **single future CA amendment** when their respective blockers resolve — not via separate CA cycles. The pairing reflects shared architectural dependency on autonomous-build infrastructure: both items require the Build-Authority Autonomous configuration + autonomous deploy pipeline + synthesis (3B) or generation (2B) engines that are absent today. Re-opening one without the other would create the same Authority-axis instability that drove CA-12 v1 + v2 toward rework.

**Cross-references:**
- CA-12 v1 (`f9a62a0`) §A.1.4 — original Mode 3B definition with SUB-3B-SPEC + SUB-3B-BUILD sub-modes (removed in v2 per Panel C1 overlap fix).
- CA-12 v2 (`ce13629`) §A.1.4 — restricted-to-operator-owned Mode 3B with operator self-attestation (rejected by Panel v2 per `PLURALITY_GQ5v2-3PV`).
- CA-12 v3 (current) — Mode 3B removed from SSOT entirely per CEO D1.
- `docs/specs/agent-blueprints/AGENT_03_*` (Self-Renewal) — Step 6 cross-URL synthesis logic dependency.
- `docs/specs/agent-blueprints/AGENT_14_PublicPolicy.md` — Agent #14 must independently classify ownership-attestation legitimacy in any future Mode 3B design.
- This document Entry 1 — paired-deferral relationship.

---

## Document maintenance

- **Adding entries:** when a capability is intentionally removed from canonical SSOT, the removing CA-n cycle MUST add an entry here describing what was removed, when, why, and re-consideration conditions. Without this discipline, the canonical SSOT erodes silently.
- **Removing entries:** an entry is removed from this document ONLY when the capability is promoted to canonical SSOT via a fresh CA-n cycle. The CA-n promotion commit must explicitly call out the `FUTURE_CAPABILITIES.md` removal.
- **No silent deletions:** this document is append-only in spirit. Entries may be amended (status updates, re-consideration condition refinements) but not deleted without an explicit CA-n.

*End of FUTURE_CAPABILITIES.md. Non-canonical. Honest scope.*
