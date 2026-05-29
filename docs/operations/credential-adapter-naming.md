# CredentialAdapter — Doppler config naming

**Status:** Live as of 2026-05-12 (commit landing this doc).
**Owner:** W5 (CredentialAdapter) · W1 (Doppler workspace).
**Source of truth in code:**
- `src/lib/shared/CredentialAdapter.js` lines 32–37 (`VALID_FLOWAI_ENVS`, `VALID_PRODUCT_ENVS`)
- `src/lib/agents/BaseAgent.js` lines 76–95 (`ENVIRONMENTS`, `FLOWAI_VALID_ENVS`, `PRODUCT_VALID_ENVS`, `isValidEnvironmentForScope`)
- `tests/w1-utilities.test.js` lines 45–83 (whitelist regression tests)

## TL;DR

Production environment is named **`prd`** (three letters) in the Doppler workspace.
The CredentialAdapter accepts both **`prd`** (canonical) and **`prod`** (backwards-compat alias) so callers that pre-date this fix still resolve.

```text
project=flowai     → environment ∈ { prd, prod, staging }
project=<product>  → environment ∈ { prd, prod, staging, demo, live-demo, sales-demo }
```

Anything else throws `CredentialAdapter: environment "<value>" invalid for project "<project>"`.

## Why this matters

The Doppler workspace was provisioned with config name `prd`. The CredentialAdapter whitelist (pre-2026-05-12) accepted only `prod`. When server-side callers (e.g. the W1 Vercel bypass driver) constructed an adapter with `environment: 'prd'` to match the live Doppler config name, the constructor rejected it. To the caller this looked like an **authentication failure** — the path `flowai/prd/<KEY>` was never queried because the adapter never finished initialization. The actual fault was naming, not auth.

This patch widens the whitelist to accept both names so the existing `prd` Doppler config resolves without any Doppler-side rename.

## What changed

| File | Before | After |
|---|---|---|
| `src/lib/shared/CredentialAdapter.js:32` | `new Set(['prod', 'staging'])` | `new Set(['prd', 'prod', 'staging'])` |
| `src/lib/shared/CredentialAdapter.js:33` | `new Set(['prod', 'staging', 'demo', 'live-demo', 'sales-demo'])` | `new Set(['prd', 'prod', 'staging', 'demo', 'live-demo', 'sales-demo'])` |
| `src/lib/agents/BaseAgent.js` `ENVIRONMENTS` | `PROD: 'prod'` | `PRD: 'prd'` (new, canonical) + `PROD: 'prod'` (retained as alias) |
| `src/lib/agents/BaseAgent.js` `FLOWAI_VALID_ENVS` | `Set(['prod', 'staging'])` | `Set(['prd', 'prod', 'staging'])` |
| `src/lib/agents/BaseAgent.js` `PRODUCT_VALID_ENVS` | `Set(['prod', 'staging', 'demo', 'live-demo', 'sales-demo'])` | `Set(['prd', 'prod', 'staging', 'demo', 'live-demo', 'sales-demo'])` |
| `tests/w1-utilities.test.js` `flowaiEnvs` | `['prod', 'staging']` | `['prd', 'prod', 'staging']` (+1 new accept test per project = +6 tests total) |

Full vitest delta: 1115 → 1121 passing (+6 new `prd` accept tests, zero regressions).

## Doppler path layout (reference)

The Doppler path layout itself does not change:

```text
Static keys (embedded agents):  <productScope>/<environment>/<key>
Static keys (FlowAI-only):      flowai/<environment>/<key>
Provider-scoped:                flowai/<environment>/PROVIDERS_<providerId>_<subkey>
Customer-scoped:                flowai/<environment>/CUSTOMERS_<providerId>_<customerId>_<subkey>
Stripe Connect:                 flowai/<environment>/STRIPE_CONNECT_<providerId>
```

The `<environment>` segment resolves to whatever string the caller supplied (`prd`, `prod`, `staging`, etc.) — the adapter never rewrites it on the way to Doppler. If the caller says `environment: 'prd'`, the lookup is `flowai/prd/<KEY>`. If they say `'prod'`, it's `flowai/prod/<KEY>`. **The Doppler workspace must have a config matching the supplied name** — see "Migration plan" below for what to do if the configs are renamed in the future.

## Migration plan — if we ever rename Doppler configs

Two reasonable futures:

### Future A — keep `prd` permanently

The current state is the long-term answer. No further work needed; `prod` stays as a soft alias indefinitely so older code paths and old test fixtures never trip.

### Future B — rename Doppler `prd` → `prod` (or any other canonical)

If we ever decide to bring the Doppler config name in line with conventional `prod`:

1. **Add the new config in Doppler** alongside `prd`. Do not delete `prd` yet.
2. **Mirror all secrets** from `flowai/prd/*` to `flowai/<new>/*` using `doppler secrets get` + `doppler secrets set` per key. Verify counts match.
3. **Update the whitelist** in `CredentialAdapter.js` + `BaseAgent.js` to add the new name. Leave `prd` and `prod` in place — they're cheap, and removing them is a separate decision.
4. **Update consumer call sites** to construct adapters with the new name. Search for `environment: 'prd'` and `environment: 'prod'` and update where canonical naming matters (e.g. log messages, error messages, dashboards). The adapter itself doesn't care.
5. **Soak for ≥ 7 days** with both configs receiving the same writes. Watch `doppler me` audit log (`doppler activity` if available) for residual lookups against the old name.
6. **Remove the old config** from Doppler only after the soak passes with zero observed reads.
7. **Optional cleanup:** remove `prd` from the whitelist (one-line PR). `prod` stays as the backwards-compat alias forever — that's the cheapest possible insurance against a future surprise.

The reverse migration (`prod` → `prd`) follows the same steps.

### Future C — separate `prd` config per agent / per tenant

Out of scope for this doc. If we ever shard by tenant (one Doppler config per provider org), the path layout changes too, not just the whitelist. That's a Layer-3 multi-tenancy decision flagged in `docs/FLOWAI_ENGINEERING_SPEC_DRAFT_v1.md` § MT1.

## What this fix does NOT do

- It does **not** alias `prd ↔ prod` at the lookup layer. The Doppler call uses the exact string the caller supplied. If the workspace only has `prd` and the caller passes `'prod'`, the lookup will fail with "secret not found" — not an adapter-level rejection. The fix only widens the constructor-time whitelist.
- It does **not** auto-detect Doppler-side config names. There is no `doppler configs list` call in the adapter. Adding one would be a separate fix and would require Doppler API auth at construction time, which crosses the browser-safety contract documented in `CredentialAdapter.js` § BROWSER SAFETY.
- It does **not** change the FlowAI-only env restriction. `flowai` still rejects `demo` / `live-demo` / `sales-demo`; only the production / staging axis was affected.

## Verifying after a Doppler-side change

If you suspect the whitelist is out of sync with the Doppler workspace:

```text
# what configs exist on the Doppler side
$ doppler configs list --project flowai

# what configs the adapter will accept (in src code)
$ rg "VALID_FLOWAI_ENVS|VALID_PRODUCT_ENVS" src/lib/shared/CredentialAdapter.js src/lib/agents/BaseAgent.js
```

The two outputs must overlap for production paths to resolve. The adapter's set should be a **superset** of the Doppler-side set (defensive — if Doppler has `prd`, the adapter must accept `prd`; the reverse — adapter accepts a name Doppler doesn't have — is fine, just resolves to "missing").
