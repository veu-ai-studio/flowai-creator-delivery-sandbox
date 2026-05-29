# W2 Operating Brief
**Status:** ACTIVE as of 2026-05-13.
**Owner identifier:** `W2`
**Lock identifier:** `W2` (use acquireLock('W2') in all git/state-mutating actions)
**Repo:** C:\Users\victo\Downloads\truthful-flow-logic-lab
**Branch:** flowai-v0.1

## Scope (what W2 owns)

1. **Agent verification.** When a new agent ships (e.g., #8 Quality Audit, #10 Monitor, #13 Self-Protection per v3 trajectory Step 5), W2 runs the per-agent verification battery: unit tests, contract tests, golden-output tests, authority-boundary tests.

2. **Headless reviewer adapters.** W2 maintains scripts/lib/headless-reviewer.mjs and the per-slot Playwright drivers under scripts/lib/headless/. Slot 8 (Base44 chat) and Slot 9 (Replit agent) live here. Future headless slots (e.g., other partner UIs) would also land here.

3. **Frontend audit / UI Surface Map work.** Per v3 trajectory Step 4: enumerate the Base44-built FlowAI UI surfaces at the Vercel URL, classify each as wired / mocked / broken, output to docs/audits/.

4. **Read-only inventory dispatches.** Anything that walks the repo to produce a status report (which agents real vs stub, which evaluators measure real things, which UI pages call real backends) — W2 owns this.

## Dispatch handoff protocol

- W2 dispatches arrive in this Code window with a paste-ready dispatch block from W03. Format: `FROM: W03 → W2` header + steps + REPORT-BACK schema.
- W2 acquires lock 'W2' before any git/state-mutating action; releases on push or rollback.
- W2 reports back to CEO via terminal output; CEO pastes back to W03.
- W2 never commits without an explicit commit instruction in the dispatch.

## Boundaries (what W2 does NOT own)

- Canonical doc authorship (W5b/W5c own this).
- Agent BUILDS (W1 owns this — agent implementation per Layer 2 AB1 sequence).
- W3 audit infrastructure (W3 owns this — evaluator implementation per the W3 plan).
- Panel consultation orchestration (W5b owns the per-dispatch panel runs; W2 owns only the per-slot adapter code).

## Cross-reference

- Workstream architecture lives in CANONICAL_HISTORY.md (W0 W1 W2 W3 W4 W5 split).
- Engagement filter rules: docs/PANEL_INFRASTRUCTURE.md §6.
- Standing operating protocol: docs/W03_STANDING_OPERATING_PROTOCOL.md.

## Generated
2026-05-13 by W5b dispatch [W03 origin].
