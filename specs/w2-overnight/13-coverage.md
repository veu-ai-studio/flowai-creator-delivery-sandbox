# Job 13 — Coverage Analysis

## Tool availability

```
$ npx vitest run --coverage
 MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
```

Coverage tooling is not installed. Falling back to file-count analysis.

## Repo-wide file count

| Category | Count |
|---|---|
| All `.js`/`.jsx` files under `src/` | 371 |
| `.js` files under `src/lib/` (non-React modules) | 20 |
| `.js` files under `src/lib/agents/` + `src/lib/shared/` + `src/lib/governance/` (W2 territory) | 4 |
| Test files (`*.test.js`) | 9 |

Repo-wide test-to-source ratio: **9 / 371 ≈ 2.4 %** of files have a dedicated test file. Most of the count is React UI components in `src/components/` and `src/pages/`, which are out of W2 scope.

## W2-territory coverage (the relevant view)

| W2 source file | Tests covering it | Status |
|---|---|---|
| `src/lib/agents/BaseAgent.js` | `tests/baseagent.test.js` (11), `tests/authority-guard.test.js` (15), `tests/credentialadapter-integration.test.js` (DI exercise) | **Strong** |
| `src/lib/agents/MessageSchema.js` | `tests/messageschema.test.js` (29) | **Strong** |
| `src/lib/governance/ScoreEvaluator.js` | `tests/scoreevaluator.test.js` (20) | **Strong** |
| `src/lib/shared/CredentialAdapter.js` | `tests/baseagent.test.js` (5), `tests/credentialadapter-integration.test.js` (21) | **Strong** |

**W2 file coverage: 4 / 4 = 100 %** of W2-owned source files have direct tests.

## Untested non-W2 modules (informational)

These `src/lib/` modules have no dedicated `.test.js` file. They are out of W2 scope but worth noting for the broader picture:

- `src/lib/app-params.js`
- `src/lib/auditLogger.js`
- `src/lib/contentProtection.js`
- `src/lib/flowExecutor.js`
- `src/lib/flowSimulator.js`
- `src/lib/flowValidator.js`
- `src/lib/jobRunners.js`
- `src/lib/operationsEngine.js`
- `src/lib/qaEngine.js`
- `src/lib/query-client.js`
- `src/lib/safeStr.js`
- `src/lib/searchIndex.js`
- `src/lib/templates.js`
- `src/lib/toolRegistry.js` — exercised indirectly via `tests/marketplace_inventory.test.js`
- `src/lib/utils.js`
- `src/lib/veuProducts.js`

## Recommendation

To get real branch/line coverage:

```
npm install --save-dev @vitest/coverage-v8
npx vitest run --coverage
```

Once installed, target ≥ 90 % line coverage on the four W2 files before charters and per-agent files start landing. Per-agent files should ship with their own test alongside.
