# Job 1 — Audit and Marketplace Inventory

Generated: 2026-05-07 · Repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab` · Read-only

## `src/lib/audits/`

**Status:** ❌ DIRECTORY DOES NOT EXIST.

Verification:
- `Glob src/lib/audits/**/*` → no matches.
- Directory listing of `src/lib/` does not contain an `audits` entry.
- The only audit-named source file in the entire `src/lib/` tree is `src/lib/auditLogger.js` (not nested in an `audits/` directory).

| File | Size | Imports | Exports |
|------|------|---------|---------|
| `src/lib/auditLogger.js` *(adjacent, NOT in audits/)* | 719 B | `base44` from `@/api/base44Client` | `logAction({ actionType, actionDetail, stepName, sessionId, productUrl, outcome, mode })` |

`auditLogger.js` is a Base44 entity wrapper around `GovernanceAuditLog.create`. It has no pure functions and never throws — out of scope for the W3 audits/* surface area.

## `src/lib/marketplace/`

**Status:** ❌ DIRECTORY DOES NOT EXIST.

Verification:
- `Glob src/lib/marketplace/**/*` → no matches.
- Directory listing of `src/lib/` does not contain a `marketplace` entry.
- The de-facto marketplace registry is the top-level data module `src/lib/toolRegistry.js`.

| File | Size | Imports | Exports |
|------|------|---------|---------|
| `src/lib/toolRegistry.js` *(adjacent, NOT in marketplace/)* | 26,536 B | (none — pure data module) | `TOOL_REGISTRY` (Tool[]), `CATEGORIES` (string[]), `VEU_STACKS` (per-product stacks) |

## `/specs/w3*` and `/docs/w3*`

**Status:** ❌ NEITHER EXISTS.

- `/specs/` — directory does not exist at the repo root. (The repo's `src/docs/w2/` tree exists but is W2-owned.)
- `/docs/w3*` — no matches under the top-level `docs/` tree.

This `specs/w3-overnight/` directory is being created **by this audit** as the reporting destination. Before this audit, no `specs/` tree existed in the repository.

## Adjacent files referenced by Job 4 / Job 6

For context (these are NOT in `src/lib/audits/` but are inputs to the Score Evaluator integration analysis):

| File | Size | Exports |
|------|------|---------|
| `src/lib/governance/ScoreEvaluator.js` | 10,536 B | `CLEARANCE_THRESHOLD`, `NO_GRANDFATHERING`, `TARGET_TYPES`, `GOVERNANCE_RUBRIC_V1`, `READINESS_RUBRIC_V1`, `ScoreEvaluator`, `clearanceDecision` |
| `src/lib/agents/BaseAgent.js` | ~9 KB | `AGENT_IDS`, `FLOWAI_ONLY_AGENTS`, `EMBEDDED_AGENTS`, `AUTHORITY`, `PRODUCT_SCOPES`, `ENVIRONMENTS`, `isValidEnvironmentForScope`, `BaseAgent` |
| `src/lib/agents/MessageSchema.js` | ~7 KB | `ENVELOPE_VERSION`, `TOPICS`, `PAYLOAD_VALIDATORS`, `validateEnvelope`, `makeEnvelope` |
| `src/lib/shared/CredentialAdapter.js` | ~6 KB | `CredentialAdapter`, `getDefaultCredentialAdapter`, `setDefaultCredentialAdapter`, `_resetDefaultCredentialAdapter` |

**Bottom line:** the W3 surface area (audits/*, marketplace/*) is **entirely unbuilt**. Only adjacent W2/W5 modules exist.
