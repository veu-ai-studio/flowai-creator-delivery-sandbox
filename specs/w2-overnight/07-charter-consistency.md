# Job 7 — Charter Consistency Audit

## Scope

The audit is supposed to walk every agent file, extract its static `charter()` return, and cross-check it against:
- filename ID
- `FLOWAI_ONLY_AGENTS` set in `BaseAgent.js`
- `AUTHORITY` enum
- `PRODUCT_SCOPES` enum
- `MessageSchema` topic registry (for `consumes`/`produces`)

## Inventory

`src/lib/agents/` contains:

| File | Defines a static charter? |
|---|---|
| `BaseAgent.js` | No — base class only; declares the contract the subclasses must satisfy |
| `MessageSchema.js` | No — schema module, not an agent |

**There are no per-agent files (no `01-lifecycle.js`, `08-quality-audit.js`, etc.).**

## Cross-checks performed

- **Roster partition self-validation:** `BaseAgent.js` has an IIFE on construction that asserts `FLOWAI_ONLY_AGENTS ∪ EMBEDDED_AGENTS == {1..20}` and that the union has size 20. This passes (verified by syntax check + every test that imports BaseAgent loading without error).
- **Authority enum closure:** `BaseAgent._validateCharter()` enforces every charter `authority` value to be in `AUTHORITY`. With no agent files to charter, this guard is exercised only by the test fixtures in `tests/baseagent.test.js` and `tests/authority-guard.test.js`.
- **flowAiOnly canonical match:** `BaseAgent._validateCharter()` rejects any charter whose `flowAiOnly` does not match `FLOWAI_ONLY_AGENTS.has(c.id)`. Same caveat — no real agent charters to check.
- **Charter required-fields shape:** `_validateCharter` requires `id, name, flowAiOnly, authority, requiredCredentials, marketplaceTools, consumes, produces, escalationPolicy`.

## Findings

1. **Zero real charters exist.** Every audit row that would compare a real `charter()` return to canonical sets is empty. The only charters in the repo are stubs in test files.
2. **The contract is sound** — `_validateCharter` itself enforces every check this audit was supposed to perform. So once charters are written, they cannot ship with violations of the listed cross-checks (id range, flowAiOnly correctness, authority enum, required arrays, escalationPolicy presence).
3. **Defect-register claim mismatch.** D-009 and D-015 in the W2 defect register declare files at `/src/lib/agents/06-research.js`, `/src/lib/agents/07-design.js`, and `/src/lib/agents/AgentRegistry.js` as delivered. Those files do not exist. See `11-defect-validation.md`.

## Violations (none, vacuously)

No charter exists to violate any rule. This is itself the defect: the entire 20-agent fleet is not implemented in `src/`.
