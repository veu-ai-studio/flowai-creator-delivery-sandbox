# FlowAI Implementation Plan
**Version:** 1.0 | **Authority:** docs/CANONICAL_REFERENCE.md + docs/BUILD_PROTOCOL.md
**Goal:** SSOT-complete FlowAI to 95/100 evidence
**Every Phase dispatch begins with:** Read docs/BUILD_PROTOCOL.md +
docs/CANONICAL_REFERENCE.md + this file.

---

## Phase Sequence

| Phase | Name | Scope | Depends on |
|-------|------|-------|-----------|
| P0 | Foundation | SSOT + BUILD_PROTOCOL.md + this file | — |
| P1 | Integrity Fixes | summarizeCurrentState leak + buildStepScorer + matrixArtifact VERIFIED-without-evidence + Agent #26 registry | — |
| P2 | Live Execution | Wire research/design/build/audit runners to real tool adapters via Orchestra | P1 |
| P3 | ProductSSOT Minimal | Forge write adapter + Supabase persistence for forge artifacts | P1 |
| P4 | Forge Step 5: Deploy | Deploy runner/template/scorer/logger/page/route + Vercel adapter + distribution registry | P2, P3 |
| P5 | Forge Step 6: Self-Renewal | Wrap Agent #3 executor as forge step | P3, P4 |
| P6 | Forge Step 7: GTM | GTM runner/template/scorer/logger/page | P3, P4 |
| P7 | Forge Step 8: Monitor | Monitor runner + store-review signal + ProductSSOT write | P3, P4 |
| P8 | Symbiotic Loop | Full ProductSSOT + run-to-run continuity in AutoRunner | P3–P7 |
| P9 | Vertical Slice | SAIGE + MyPregLife fixtures through product-agnostic contracts steps 1–8 | P1–P8 |
| P10 | Claim Promotion | matrixArtifact + CANONICAL_REFERENCE update (evidence-gated only) | P9 |
| P11 | Agent Graduation | Agents #6–#10 via OrchestratorHub step-owner wiring | P2–P8 |
| P12 | Ring-A Expansion | Remove 16 hardcoded VEU allowlists; registry-driven onboarding | P9 |

---

## Per-Phase Dispatch Requirements

Each phase dispatch must include:
- Scope: files and areas affected
- SSOT sections affected (cited by number)
- Acceptance criteria with evidence tags (CODE/TEST/RUNTIME/PRODUCTION)
- Evidence needed to mark each claim VERIFIED (Tier A/B)
- SSOT claims affected and expected tier movement
- Action label: BUILD / CLEANUP / READ-ONLY
- STOP conditions for unexpected state
- Dependencies confirmed before dispatch issued

---

## Evidence Standards

| Tier | Type | Counts as VERIFIED |
|------|------|-------------------|
| A | Persistent (DB record, deployed URL, audit log) | YES |
| B | Behavioral (test passes, code assertion) | YES |
| C | Ephemeral (console log, one-time observation) | NEVER |

WIRED ≠ VERIFIED. A feature is WIRED when code exists.
It is VERIFIED only when Tier A or B evidence exists.

---

## 95/100 Definition

FlowAI reaches 95/100 when:
- All 8 forge steps produce Tier A evidence on a live deployment
- ProductSSOT persists across runs for at least 2 products
- SAIGE and MyPregLife complete the full 8-step loop via
  product-agnostic contracts with zero product-specific code paths
- matrixArtifact has 95+ entries at status=VERIFIED with
  evidenceUrl and verifiedAt populated
- §26 phase status table reflects all phases complete
- Monitor step produces live signals from at least one deployed product

---
*Canonical authority: docs/CANONICAL_REFERENCE.md*
*Protocol: docs/BUILD_PROTOCOL.md*
*Plan version: 1.0 — 2026-06-01*

---
