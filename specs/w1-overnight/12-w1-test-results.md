# 12 — W1 utility test scaffolding

Date: 2026-05-07

## 1. Discovery — what W1 utility files exist?

| Path | Status |
|---|---|
| `src/lib/credentials/` | **MISSING** — directory does not exist |
| `src/lib/vault/` | **MISSING** |
| `src/lib/secrets/` | **MISSING** |
| `src/lib/shared/CredentialAdapter.js` | **PRESENT** — 192 lines, the canonical W1 utility |
| Other W1-territory files in `src/lib/` | None |

`src/lib/shared/CredentialAdapter.js` is the only W1-owned utility on disk. Other `src/lib/*` files belong to W2 (agents, governance) or W4/W5 (UI / shared infra) territories.

## 2. Existing test coverage of `CredentialAdapter`

| Test file | Tests | What it covers |
|---|---|---|
| `tests/baseagent.test.js` | 4 CredentialAdapter tests | Browser-safe construction, expected-key probe, missing-key probe, providerId rejection, flowai+demo rejection |
| `tests/credentialadapter-integration.test.js` | 22 tests | DI happy paths: doppler-source resolution, env-fallback, error fall-through, provider/customer/Stripe paths, probe, getAll, declareExpected, singleton, project/env validation |

## 3. New file authored

**`tests/w1-utilities.test.js`** — 66 tests, focused on boundary conditions not covered by the existing two files.

Test coverage breakdown:

| Suite | Tests | Focus |
|---|---|---|
| `exports` | 2 | Class + singleton helpers exported |
| `constructor argument validation` | 3 | Missing project / missing environment / unknown project |
| `per-project environment allowlist` | 31 | flowai accepts {prod,staging}; flowai rejects {demo,live-demo,sales-demo}; each of the 5 product scopes accepts each of the 5 product envs; product rejects unknown env |
| `slug-safety regex boundaries` | 12 | providerId accepts alphanumeric and hyphens; rejects underscore, dot, whitespace, empty; subkey accepts underscores; rejects punctuation and empty; customer + stripe variants |
| `frozen-result invariants` | 3 | All return shapes are `Object.freeze`'d for missing / expected / present |
| `get() input validation` | 2 | Empty / non-string keys rejected |
| `getAll() behaviour` | 3 | Map shape; empty array; non-array rejection |
| `declareExpected() idempotency` | 3 | Double-declare is a no-op; undefined/empty inputs; constructor-supplied keys |
| `probe() return-shape consistency` | 1 | Always returns plain string (not object) |
| `singleton lifecycle (isolated)` | 4 | Throws before set; rejects non-instance; round-trip; reset |
| `clock injection` | 1 | `fetchedAt` reflects injected clock |
| `envFallback edge cases` | 2 | Non-string and empty-string values fall through to missing |
| **TOTAL** | **66** | |

## 4. Test run result

Command:
```
npx vitest run tests/w1-utilities.test.js
```

Result:
```
RUN  v4.1.5
Test Files  1 passed (1)
     Tests  66 passed (66)
  Start at  00:59:14
  Duration  448ms
```

**All 66 tests pass.** Wall-clock duration 448ms.

## 5. What the new tests pin down

1. **Each of the 6 product projects (`flowai`, `saige`, `reltwin`, `reachsms`, `pressai`, `mybirthsafe`) is exercised with the right environment allowlist.** The matrix is enforced explicitly so any future change to either set will fail loudly.
2. **The slug-safety regex is pinned at three classes of input:** allowed (alphanumeric, hyphens), forbidden (underscore, dot, whitespace), and edge (empty string). This protects the Doppler path scheme from collision-prone IDs.
3. **All return shapes are frozen.** Callers cannot accidentally mutate a credential record. If `_resolve()` ever forgets to `Object.freeze`, the test will fail.
4. **`getAll()` and `declareExpected()` edge cases are pinned.** Empty-array, non-array input, double-declare, undefined input.
5. **The default singleton lifecycle is pinned in isolation** — each test resets the singleton so they don't interact with the integration test file's expectations.
6. **`envFallback` value-type guards are pinned.** Non-string or empty-string fallback values fall through to `missing` instead of being treated as a present credential. This protects against malformed env injection.
7. **Injected clock is honored** — important for any audit-log integration that needs deterministic `fetchedAt` timestamps.

## 6. What was NOT added (and why)

- **Doppler-client integration tests** — already covered by `tests/credentialadapter-integration.test.js` with `StubDoppler`. Duplicating would be noise.
- **End-to-end with real Doppler** — would require an outbound API call (forbidden by job constraints).
- **`requiredCredentials` → `declareExpected` bridge tests** — that bridge does not exist in code yet (per `specs/w1-overnight/02-vault-spec-compliance.md §8 item 3`). Writing tests for a non-existent feature would be premature.
- **CSP / security-header / DNS / Cloudflare tests** — those workstreams have no committed code to test (per Jobs 4, 5).

## 7. Verdict

| Item | Status |
|---|---|
| New test file authored | YES — `tests/w1-utilities.test.js` |
| Test count | 66 |
| Test result | All passing |
| Existing W1 test count (other files) | 26 (4 in `baseagent.test.js` + 22 in `credentialadapter-integration.test.js`) |
| Total W1 test surface after this run | 92 tests across 3 files |
| Source files modified | NONE (only `tests/w1-utilities.test.js` created) |
