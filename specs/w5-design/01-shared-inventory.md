# 01 — Shared Inventory (`src/lib/shared/`)

**Generated:** 2026-05-07 · **Repo HEAD:** `main` @ `3b6a0f5` · **Read-only**

## Directory contents

`src/lib/shared/` contains exactly **one** file.

| File | Size (bytes) | Imports | Exports |
| --- | ---: | --- | --- |
| `CredentialAdapter.js` | 7,302 | *(none — zero `import` statements; pure ESM)* | `class CredentialAdapter` (named); `function getDefaultCredentialAdapter()` (named); `function setDefaultCredentialAdapter(adapter)` (named); `function _resetDefaultCredentialAdapter()` (named) |

## File detail — `CredentialAdapter.js`

### Module-level constants (not exported)
- `FLOWAI_PROJECT = 'flowai'`
- `ID_SLUG_RE = /^[a-zA-Z0-9-]+$/`
- `SUBKEY_RE = /^[a-zA-Z0-9_-]+$/`
- `VALID_FLOWAI_ENVS = new Set(['prod', 'staging'])`
- `VALID_PRODUCT_ENVS = new Set(['prod', 'staging', 'demo', 'live-demo', 'sales-demo'])`
- `VALID_PRODUCT_PROJECTS = new Set(['flowai', 'saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife'])`

### Class members
- Constructor opts: `project`, `environment`, `dopplerClient?`, `expectedKeys?`, `envFallback?`, `clock?`, `logger?`
- Public async: `get(key)`, `getProviderSecret(providerId, subkey)`, `getCustomerSecret(providerId, customerId, subkey)`, `getStripeConnect(providerId)`, `probe(key)`, `getAll(keys)`
- Public sync: `declareExpected(keys)`
- Private: `_assertId(label, value)`, `_assertSubkey(value)`, `_resolve(path)`

### Module-default singleton
- `_default` (private mutable) backing `getDefaultCredentialAdapter` / `setDefaultCredentialAdapter` / `_resetDefaultCredentialAdapter` (last is test-only).

### Browser-safety claim
Line 18-24: docs note that `process.env` is NOT referenced. Verified — no `process.env`, no `globalThis.process`, no Node-specific imports. `envFallback` defaults to `{}`.

### Coverage
Already covered by 5 cases under `describe('CredentialAdapter')` in `tests/baseagent.test.js:61-99`.

## Bottom line

**Total file count: 1.** This is the entire current W5 surface.
