# W6 — Dedicated Panel Workstream Operating Brief
Version: 1.0 | Date: 2026-05-14 | Authority: CEO-Accepted (W03 proposal)

PURPOSE: W6 is the dedicated workstream for all FlowAI Panel consultations. No Panel consultation runs outside W6. No other workstream runs Panel consultations.

SCOPE:
- Execute all Panel consultations via scripts/panel/run-panel-consultation.mjs
- Maintain Panel infrastructure (adapters, slot health, retry logic)
- Save all consultation outputs to docs/panel-consultations/
- Commit all outputs to flowai-v0.1
- Report results to W0x for CEO review

PANEL COMPOSITION: 10 slots. Quorum: 7 of 10. Supermajority: 8 of 8. Slot 5 and Slot 7 backup adapters required (previously DEGRADED).

STANDING RULES:
- Every consultation must receive full CANONICAL_REFERENCE.md as context
- Sessions without SSOT attached are invalid and must be re-run
- Panel consensus grants write-authority to propose SSOT amendments (CA-n cycle)
- W0x dispatches. W6 executes. CEO approves.
