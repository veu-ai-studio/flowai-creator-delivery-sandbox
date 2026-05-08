# 02 — Vercel deployment config

**Generated:** 2026-05-07. **Repo:** `truthful-flow-logic-lab`.

## Contents of `vercel.json` (199 b)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

## What's configured

- **Rewrites:**
  - `/api/*` → `/api/$1` (passthrough — relies on filesystem routing).
  - `/(non-api)*` → `/index.html` (SPA fallback for the Vite build).
- **Build command:** none in `vercel.json`. Inferred from `package.json:8`:
  `npm run build` → `vite build`.
- **Output directory:** none specified. Vite's default `dist/` is used.
- **Functions / runtime:** none in `vercel.json`. Per-function overrides set
  inline:
  - `api/diagnostic.js:213` → `export const config = { maxDuration: 30 }`
  - `api/inngest.js:20-25` → `bodyParser.sizeLimit: '4mb'`, `maxDuration: 60`

## Environment variables referenced (in code, not declared in `vercel.json`)

The following env names are read somewhere under `api/`:

`ADMIN_SEED_KEY`, `ANTHROPIC_API_KEY`, `AUTH_REQUIRED`, `AXIOM_DATASET`,
`AXIOM_DRY_RUN`, `AXIOM_TOKEN`, `BROWSERLESS_API_KEY`, `CLERK_SECRET_KEY`,
`DB_BACKEND`, `EMAIL_DRY_RUN`, `EMAIL_FROM`, `EMAIL_TEST_ENABLED`,
`FLOWAI_SERVICE_KEY`, `INNGEST_BACKEND`, `INNGEST_EVENT_KEY`,
`INNGEST_SIGNING_KEY`, `LOG_LEVEL`, `NODE_ENV`, `REPLIT_PROXY_DISABLED`,
`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`,
`VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_COMMIT_SHA`,
`VERCEL_REGION`, `VERCEL_URL`, `VOYAGE_API_KEY`, `VOYAGE_MODEL`.

`vercel.json` does not declare or pin any of these — they're managed via the
Vercel project settings.

## Cross-check `vercel.json` ↔ `api/`

Because `vercel.json` defines no explicit route list, every `api/**.js` file
auto-mounts. **There are therefore zero "configured but missing" routes** —
the rewrite is generic.

### Routes in code that are not reachable as requested by the UI

| UI call site | Path the UI POSTs to | Path mounted by filesystem | Result |
|---|---|---|---|
| `src/pages/DemoSandbox.jsx:48` | `/api/leads` | `/api/leads/capture` | **404** (no `api/leads.js`, no rewrite) |
| `src/pages/EnterpriseDemo.jsx:104` | `/api/leads` | `/api/leads/capture` | **404** |

Both call sites silently swallow the failure (`try { ... } catch {}`), so
demo flows appear successful but no lead is persisted. This is the silent
lead-loss failure mode that the SAIGE/PressAI audits already flagged.

### Fix options (each resolves the gap)

1. **UI fix (cheapest):** update `DemoSandbox.jsx:48` and
   `EnterpriseDemo.jsx:104` to POST to `/api/leads/capture`.
2. **Backend rename:** move `api/leads/capture.js` → `api/leads.js`.
3. **vercel.json rewrite:**
   ```json
   { "source": "/api/leads", "destination": "/api/leads/capture" }
   ```

Option (1) is recommended because the file is structured to coexist with
future `/api/leads/<other>` siblings and the UI currently has no other
consumers of the wrong path.

## Other observations

- `vercel.json` does not set a `regions` block or `framework` field, so Vercel
  auto-detects: `framework: vite`, region per project default.
- No `headers` block — security headers (CSP, X-Frame-Options, HSTS) are not
  configured in vercel.json. They could be added per the W3 audit recommendation
  (D-017 IP-protection baseline).
- No `cleanUrls`, no `trailingSlash` setting — defaults apply.
- The `$schema` link is correct (`https://openapi.vercel.sh/vercel.json`).
