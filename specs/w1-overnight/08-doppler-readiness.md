# 08 — Doppler readiness assessment

Date: 2026-05-07
**No outbound API calls performed.**

## 1. Search basis

Patterns checked:
- `package.json` scripts wrapped in `doppler run`
- `.doppler.yaml` / `doppler.yaml` at any depth
- `@dopplerhq/*` / `doppler-cli` / `doppler-sdk` in dependencies
- `import .* from .*doppler.*` and `require('doppler*')` in JS/TS
- `DOPPLER_*` env-var reads in code
- `.github/workflows/*` referencing Doppler
- Service-token / mount references

## 2. Findings table

| Signal | Present? | Evidence |
|---|---|---|
| `doppler` CLI in any `package.json` script | **NO** | `package.json` scripts: `dev`, `build`, `lint`, `lint:fix`, `typecheck`, `preview`, `test`, `test:smoke`, `test:watch`. None wrap a `doppler run`. |
| `.doppler.yaml` / `doppler.yaml` at root | **NO** | `ls -la` of repo root + Glob `.doppler*` find no match |
| `@dopplerhq/*` package | **NO** | `package.json` lists no Doppler-namespaced package |
| `doppler-cli` / `doppler-sdk` package | **NO** | Same — no Doppler npm package |
| `import ... from 'doppler...'` / `require('doppler...')` in JS/TS | **NO** | Grep over `src/`, `api/`, `base44/`, `tests/`, `scripts/` — 0 hits |
| `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG`, etc. env reads | **NO** | Grep `DOPPLER_` in code — 0 hits |
| GitHub Actions / CI workflow referencing Doppler | **NO** | `.github/` directory does not exist |
| Vercel `installCommand` / `buildCommand` wrapping `doppler run` | **NO** | Root `vercel.json` has no `buildCommand`; `src/vercel.json:3` declares `"buildCommand": "npm run build"` (no Doppler wrap) |
| Conceptual / interface references to Doppler | **YES** | `src/lib/shared/CredentialAdapter.js:1–25` (docblock spec), L55 (`this.dopplerClient = opts.dopplerClient ?? null`), L149–155 (calls `dopplerClient.fetchSecret`); `src/docs/w2/v3-defect-register.md:104, 121, 124`; `src/pages/BaseAgentTest.jsx:77`; `tests/credentialadapter-integration.test.js:10–17` (`StubDoppler` test fixture); `specs/w3-overnight/11-doppler-compat.md` (entire file) |
| Concrete `dopplerClient` implementation | **NO** | Only `tests/credentialadapter-integration.test.js:10` declares `class StubDoppler` for tests; no production client |
| `setDefaultCredentialAdapter()` invocation in any production file | **NO** | Grep finds the export and 1 test setting; 0 production callers |

## 3. Mode A — Doppler CLI integrated

**Definition:** local dev + Vercel build wrap commands in `doppler run --`. Doppler CLI sources secrets just-in-time. No `process.env.SECRET` materialisation outside the wrapped process.

| Required artifact | Present? | Gap |
|---|---|---|
| `.doppler.yaml` at root linking the project + default config | NO | Author file; e.g. `setup: { project: 'flowai', config: 'dev' }` |
| `package.json` scripts wrapped in `doppler run --` for `dev`, `test`, `test:smoke` | NO | Edit each script to prefix `doppler run --` |
| Vercel install/build wrapped in `doppler run` (or Vercel-Doppler integration enabled at the dashboard) | NO | Configure Vercel project to use Doppler integration **OR** prefix `buildCommand` |
| `DOPPLER_TOKEN` set as a CI/Vercel env var (service token) | NO | Provision via Doppler dashboard; add to Vercel env |
| `dopplerClient` implementation in `src/lib/shared/` (HTTP-API or CLI-shell) | NO | Author concrete client implementing `fetchSecret({project, config, name})` returning a string |
| Bootstrap module that builds the client and calls `setDefaultCredentialAdapter()` per `(project, environment)` | NO | Author e.g. `src/lib/shared/credentials.bootstrap.js` |
| Vault provisioning: 6 Doppler projects (`flowai`, `saige`, `reltwin`, `reachsms`, `pressai`, `mybirthsafe`) × per-env configs × ~30 inventoried + ~9 uninventoried secrets | NO | Out-of-repo provisioning; depends on inventory completeness from Job 1 §2 |
| `doppler_compat` field on every `TOOL_REGISTRY` entry | NO | Per `specs/w3-overnight/11-doppler-compat.md` — 61/61 tools fail this check |

**Mode A status:** **NOT READY.** Six independent blockers. None are blocked on Doppler itself; all are repo-side or provisioning-side.

## 4. Mode B — Manual env paste (Vercel dashboard + local `.env`)

**Definition:** secrets entered into Vercel project settings + local `.env`. Code reads `process.env.SECRET` directly. No vault tool in the loop.

| Required artifact | Present? | Gap |
|---|---|---|
| `process.env.<NAME>` reads at every consumer | YES | 152 reads across 43 files (Job 1 §1) |
| `Deno.env.get('<NAME>')` reads at Base44-side consumers | YES | 28 reads across 16 entry files |
| `import.meta.env.<NAME>` reads at Vite-side consumers | YES | 4 reads in 2 files |
| Canonical paste-list of names | PARTIAL | `docs/ENV_VARS.md` (30 entries) — incomplete: missing `OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET`, `GITHUB_TOKEN`, `REPLIT_ENDPOINT`, `BASE44_LEGACY_SDK_IMPORTS`, `FLOWAI_BASE_URL`, `VITE_USE_API_BACKEND` per Job 3 §4 |
| Vercel project secrets for the 30 inventoried names | UNKNOWN (out-of-repo) | Verify per `docs/ENV_VARS.md:164–193` checklist |
| `.env` file for local Vite vars | YES (1 entry) | `.env:1` contains `VITE_BASE44_APP_BASE_URL=https://app.base44.com` only |
| Vercel `vercel.json` env block | PARTIAL / SPLIT | Root `vercel.json` declares no env block; `src/vercel.json:5–8` declares `OPENAI_API_KEY=@openai_api_key`, `VERCEL_TOKEN=@vercel_token`. Whichever Vercel discovers first is what's wired. |
| Per-environment `.env.production`, `.env.staging`, `.env.development` separation | NO | Only `.env` exists (and is gitignored) |

**Mode B status:** **PARTIAL.** Sufficient for the 3 currently-live integrations (Anthropic, Browserless, Base44 SDK URL). Inventory must be extended by ~9 entries before activating the rest of the integration set; the split `vercel.json` ambiguity should be resolved before adding any new `@`-secret reference.

## 5. Mode comparison

| Dimension | Mode A (Doppler CLI) | Mode B (Manual paste) |
|---|---|---|
| Today's deployable state | Not possible | **Possible** for 3 live secrets; partial for the other 27 |
| Code changes required | New `dopplerClient` impl + bootstrap; no consumer-side change (existing `process.env` reads continue to work because Doppler injects them) | None for currently-live; for new vars: zero code change, just paste into Vercel + `.env` |
| Risk surface | Bootstrap correctness; Doppler service-token rotation; CI build-time CLI availability | Inventory drift; manual rotation discipline; Vercel/code drift on `vercel.json` env mapping |
| Rotation ergonomics | Single point of rotation in Doppler; redeploys pick up new values | Per-environment manual update in Vercel dashboard plus local `.env` for dev |
| Audit trail | Doppler-side audit log of who-set-what-when | Vercel-side activity log; less granular per-secret |
| Aligns with `CredentialAdapter` contract | YES (designed for it) | Partial — `envFallback` works but `dopplerClient` path is bypassed |

## 6. Migration path

1. Stay in Mode B for the production cutover. Extend `docs/ENV_VARS.md` to cover all 9 missing entries identified in Job 3 §4.
2. Resolve the root-vs-`src/` `vercel.json` env-block split.
3. Author concrete `dopplerClient` (HTTP API; service-token-authed) and `credentials.bootstrap.js`.
4. Add a `doppler_compat` field to `TOOL_REGISTRY` and backfill 61 entries (per `specs/w3-overnight/11-doppler-compat.md`).
5. Provision 6 Doppler projects × per-env configs.
6. Add `.doppler.yaml` and wrap `package.json` scripts.
7. Cut over Mode A behind a feature flag; observe; remove the Mode B path.

## 7. Verdict

| Mode | Status |
|---|---|
| Mode A (Doppler CLI integrated) | **NOT READY.** Zero on-disk Doppler artifacts. The consumer-side adapter is sound and tested, but no producer / bootstrap / provisioning exists. |
| Mode B (Manual env paste) | **PARTIAL.** Live for 3 secrets; ready to extend to all 30 inventoried entries plus the 9 currently-uninventoried-but-referenced entries once `docs/ENV_VARS.md` is updated and the `vercel.json` split is resolved. |

Recommendation: **ship Mode B for cutover, schedule Mode A as a follow-on workstream.**
