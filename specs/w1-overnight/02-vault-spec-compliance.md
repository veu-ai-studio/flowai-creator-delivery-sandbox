# 02 — Doppler vault spec compliance

Date: 2026-05-07

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-vault/architecture.md` | **MISSING** — directory does not exist |
| `specs/w1-vault/*` (any file) | **MISSING** |
| `docs/w1-vault*` | **MISSING** |
| Reference to `/specs/w1-vault/architecture.md` | Present in `src/docs/w2/v3-defect-register.md:104` ("Vault: Doppler. Specs at `/specs/w1-vault/architecture.md`") |
| Embedded docblock spec | `src/lib/shared/CredentialAdapter.js:1–25` |
| Test-suite contract | `tests/credentialadapter-integration.test.js` (256 lines, 22 tests) |
| Companion env-spec on BaseAgent | `src/lib/agents/BaseAgent.js:66–80` (`PRODUCT_SCOPES`, `ENVIRONMENTS`, `isValidEnvironmentForScope`) |

Because the canonical W1 vault spec is not on disk, this report compares the **embedded docblock + integration test contract** against the **`CredentialAdapter` implementation**. Both are in `src/lib/shared/CredentialAdapter.js`, so this is a self-consistency check, not an independent spec audit.

## 2. Project structure (the 6 projects)

Spec source: `BaseAgent.js:57–64` `PRODUCT_SCOPES` and CredentialAdapter docblock L8–13.

Six declared projects: `flowai`, `saige`, `reltwin`, `reachsms`, `pressai`, `mybirthsafe`.

| Project | In `BaseAgent.PRODUCT_SCOPES` | In `CredentialAdapter.VALID_PRODUCT_PROJECTS` | Match |
|---|---|---|---|
| flowai | YES (L58) | YES (L35) | ✓ |
| saige | YES (L59) | YES (L35) | ✓ |
| reltwin | YES (L60) | YES (L35) | ✓ |
| reachsms | YES (L61) | YES (L35) | ✓ |
| pressai | YES (L62) | YES (L35) | ✓ |
| mybirthsafe | YES (L63) | YES (L35) | ✓ |

Both modules carry the identical 6-project allowlist. **No drift.**

## 3. Environment naming

Spec source: `BaseAgent.js:66–75` `ENVIRONMENTS`, `FLOWAI_VALID_ENVS`, `PRODUCT_VALID_ENVS`; CredentialAdapter docblock L8–13.

| Env | Allowed for `flowai` | Allowed for product scopes |
|---|---|---|
| `prod` | YES (BaseAgent L74; Adapter L32) | YES (BaseAgent L75; Adapter L33) |
| `staging` | YES | YES |
| `demo` | NO | YES (Adapter L33; BaseAgent L75) |
| `live-demo` | NO | YES |
| `sales-demo` | NO | YES |

Implementation enforcement:
- `CredentialAdapter` constructor (L42–51) raises with `environment "X" invalid for project "Y"` when violation detected.
- Integration test `tests/credentialadapter-integration.test.js:247–249` confirms `flowai + demo` is rejected.
- Integration test `tests/credentialadapter-integration.test.js:252–255` confirms `saige + sales-demo` is accepted.

**No drift.**

## 4. Secret naming patterns

Spec source: CredentialAdapter docblock `src/lib/shared/CredentialAdapter.js:8–13`.

| Path category | Spec template | Implementation builder | Test that pins behaviour |
|---|---|---|---|
| Static (embedded) | `<productScope>/<environment>/<key>` | `get(key)` builds `{project: this.project, config: this.environment, secret: key}` (L65–71) | `tests/credentialadapter-integration.test.js:54–65` (calls `agent.fetchKey('SOME_API_KEY')`, expects `source: 'doppler'`) |
| Static (FlowAI-only) | `flowai/<environment>/<key>` | Same `get()` invoked with `project: 'flowai'` | Covered by tests where `project: 'flowai'` |
| Provider-scoped | `flowai/<environment>/PROVIDERS_<providerId>_<subkey>` | `getProviderSecret()` (L73–82) — forces `project: FLOWAI_PROJECT`, builds `secret: PROVIDERS_${providerId}_${subkey}` | `tests/credentialadapter-integration.test.js:118–130` — asserts `name: 'PROVIDERS_acme_API_KEY'`, `project: 'flowai'`, `config: 'prod'` |
| Customer-scoped | `flowai/<environment>/CUSTOMERS_<providerId>_<customerId>_<subkey>` | `getCustomerSecret()` (L84–94) — builds `secret: CUSTOMERS_${providerId}_${customerId}_${subkey}` | `tests/credentialadapter-integration.test.js:148–157` — asserts `name: 'CUSTOMERS_acme_cust1_TOKEN'` |
| Stripe Connect | `flowai/<environment>/STRIPE_CONNECT_<providerId>` | `getStripeConnect()` (L96–104) — builds `secret: STRIPE_CONNECT_${providerId}` | `tests/credentialadapter-integration.test.js:168–177` — asserts `name: 'STRIPE_CONNECT_acme'` |

**No drift in path construction.** Every spec template has a matching implementation method, and each method has a pinning test.

## 5. ID and subkey rules

Spec source: docblock L15–16:
> `provider_id` and `customer_id` MUST be slug-safe (no underscores). Subkeys may contain underscores (`API_KEY`, `WEBHOOK_SECRET`, etc.).

Implementation:
- `ID_SLUG_RE = /^[a-zA-Z0-9-]+$/` (L29) — rejects underscores in IDs
- `SUBKEY_RE = /^[a-zA-Z0-9_-]+$/` (L30) — allows underscores in subkeys
- `_assertId()` (L122–133) raises with explicit "Underscores forbidden in IDs (would create ambiguous Doppler secret names)"
- `_assertSubkey()` (L135–144) raises if subkey is empty or contains other punctuation

Tests:
- `tests/credentialadapter-integration.test.js:132–137` — `getProviderSecret('bad_id', 'API_KEY')` rejects with `/not slug-safe/`
- `tests/credentialadapter-integration.test.js:139–144` — empty providerId rejects with `/non-empty string/`
- `tests/credentialadapter-integration.test.js:159–164` — `getCustomerSecret('acme', 'bad_id', 'TOKEN')` rejects with `/customerId.*not slug-safe/`

**No drift.**

## 6. Resolution semantics

Spec source: docblock L18–24 (browser safety), embedded behaviour notes, integration test expectations.

| Behaviour | Spec | Implementation | Test |
|---|---|---|---|
| Doppler client first | "Doppler-backed credential interface" | `_resolve()` (L146–162) calls `dopplerClient.fetchSecret()` first if injected | `tests/credentialadapter-integration.test.js:54–65` — `source: 'doppler'` |
| `envFallback` second | "envFallback parameter still exists for callers that explicitly inject a fallback object" (L20–22) | `_resolve()` (L164–167) — only after Doppler returns nothing | `tests/credentialadapter-integration.test.js:87–98` — `source: 'env_fallback'` |
| Doppler errors swallow gracefully | docblock implies error tolerance via "Doppler fetch error" warn log (L158) | `_resolve()` `try/catch` around `fetchSecret`; warns through `this.logger?.warn?.()` | `tests/credentialadapter-integration.test.js:100–114` — Doppler throws, falls through to env_fallback |
| `expected` for declared keys with no source | implied by `expectedKeys` constructor opt | `_resolve()` (L169–171) returns `status: 'expected'` if `expectedKeys.has(secret)` | `tests/credentialadapter-integration.test.js:67–78` — declared key returns `'expected'` |
| `missing` for undeclared keys with no source | implied by default fallthrough | `_resolve()` (L173) returns `status: 'missing'` | `tests/credentialadapter-integration.test.js:80–85` |
| Browser-safe (no `process.env`) | docblock L18–24 explicit | `envFallback` defaults to `{}` (L60); `process` token absent from file | (No direct test — verified by `Grep "process" src/lib/shared/CredentialAdapter.js` returning 0) |

**No drift.**

## 7. Singleton contract

Spec source: `getDefaultCredentialAdapter()` / `setDefaultCredentialAdapter()` exports (L177–192).

Implementation behaviour:
- `getDefaultCredentialAdapter()` throws if singleton not set
- `setDefaultCredentialAdapter()` rejects non-instances
- `_resetDefaultCredentialAdapter()` exported for tests

Tests:
- `tests/credentialadapter-integration.test.js:226–228` — `get` before `set` throws
- `tests/credentialadapter-integration.test.js:230–232` — `set({})` rejects
- `tests/credentialadapter-integration.test.js:234–238` — round-trip a real instance

**No drift in contract**, but a runtime gap remains:

## 8. Drift: production-runtime gaps

These are not spec-↔-implementation drift inside the file itself; they are gaps between the spec and the rest of the system.

1. **No production caller of `setDefaultCredentialAdapter()`.** Grep across the repo finds zero invocations outside tests. Result: any production code that calls `getDefaultCredentialAdapter()` will throw at runtime. Currently nothing calls it.
2. **No `dopplerClient` implementation.** The `_resolve` method calls `this.dopplerClient.fetchSecret({project, config, name})` but no concrete implementation of that interface exists in the repo. Tests use `StubDoppler` (declared inline at `tests/credentialadapter-integration.test.js:10–17`).
3. **No bridge from `BaseAgent.charter.requiredCredentials` → `CredentialAdapter.declareExpected`.** `BaseAgent._validateCharter()` (`src/lib/agents/BaseAgent.js:246`) requires `requiredCredentials` to be an array but no constructor or factory iterates it and calls `adapter.declareExpected(...)`. The expected/missing distinction therefore won't fire end-to-end without explicit wiring.
4. **Doppler `config` name convention is undocumented.** The implementation passes `prod` / `staging` / `demo` / `live-demo` / `sales-demo` verbatim as the `config:` field. Doppler convention is `prd` / `stg` / `dev`. The vault provisioning side must mirror this exact naming or every fetch will return undefined. This contract is implicit, not documented.
5. **One-Doppler-project-per-product vs single-project ambiguity.** Spec reads `<productScope>/<environment>/<key>`. Implementation passes `this.project` straight to `project:` of the fetch payload, which would mean six Doppler projects. Whether this matches the W1 vault provisioning intent is unstated.
6. **`STRIPE_CONNECT_<providerId>` vs `getProviderSecret(<providerId>, 'STRIPE_CONNECT')` collision.** Both functions can read different paths for the same logical Stripe Connect account. Caller convention must pick one; the spec doesn't.
7. **`envFallback` mismatched with Node-side `process.env` consumers.** The 152 `process.env.*` reads in `api/_lib/*` and `src/api/*` are not wired through the adapter at all. If Doppler becomes the source of truth, every endpoint must either move to `getDefaultCredentialAdapter()` or be passed an `envFallback` containing the materialised env. No code does either.

## 9. Verdict

| Area | Spec ↔ implementation drift |
|---|---|
| 6-project allowlist | None |
| 5-env allowlist + flowai 2-env restriction | None |
| Path templates (static / provider / customer / Stripe Connect) | None |
| Slug-safety rules | None |
| Resolution semantics (doppler → envFallback → expected → missing) | None |
| Singleton contract | None |
| Production caller wiring | **MAJOR — not implemented** |
| `dopplerClient` concrete implementation | **MAJOR — not implemented** |
| Charter→adapter `declareExpected` bridge | **MEDIUM — not implemented** |
| Doppler config-name convention contract | **MEDIUM — undocumented; implementation locks in long names** |
| One-vs-six Doppler projects ambiguity | **MEDIUM — undocumented** |
| `STRIPE_CONNECT` path collision risk | **LOW — caller convention undefined** |
| Existing `process.env` consumers vs adapter | **MAJOR — disjoint** |

The CredentialAdapter implementation matches its embedded spec exactly. The drift is entirely on the **integration plane** — there is no `dopplerClient`, no production caller, and no migration path from the 152 in-line `process.env` reads to the adapter.
