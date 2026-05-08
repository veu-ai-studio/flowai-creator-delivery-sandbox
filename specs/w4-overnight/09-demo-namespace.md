# 09 — Demo namespace isolation audit

**Generated:** 2026-05-07.

## Patterns searched

`resolveEnv`, `isDemo`, `sandbox.`, `demo.veuaistudio`, `saigedemo`,
`productScope`, plus all places that set or read an `environment` value.

## Inventory of demo / sandbox detection sites

### 1. `BaseAgent.js` — environment validation, not host detection

`src/lib/agents/BaseAgent.js:66-80`:

```js
export const ENVIRONMENTS = Object.freeze({
  PROD:        'prod',
  STAGING:     'staging',
  DEMO:        'demo',
  LIVE_DEMO:   'live-demo',
  SALES_DEMO:  'sales-demo',
});

const FLOWAI_VALID_ENVS  = new Set(['prod', 'staging']);
const PRODUCT_VALID_ENVS = new Set(['prod', 'staging', 'demo', 'live-demo', 'sales-demo']);

export function isValidEnvironmentForScope(productScope, environment) {
  if (productScope === 'flowai') return FLOWAI_VALID_ENVS.has(environment);
  return PRODUCT_VALID_ENVS.has(environment);
}
```

- Validates the `environment` *string* against an allowed set per
  `productScope`. Does not derive `environment` from a hostname.
- The `environment` is passed in by the caller (constructor `deps`), so the
  upstream caller is responsible for deciding whether it's `demo` /
  `live-demo` / `sales-demo`.

### 2. `CredentialAdapter.js` — same env validation, no host detection

`src/lib/shared/CredentialAdapter.js:32-50` redeclares the same env sets and
validates `opts.environment` in the constructor. Used to build Doppler
secret paths (`<productScope>/<environment>/<key>`). Same upstream-caller
contract as BaseAgent.

### 3. `productDomains.js` — legacy-domain registry, not a resolver

`api/_lib/productDomains.js:153-172`:

```js
export function resolveLegacyDomain(host) {
  const normalised = (host || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  for (const p of VEU_PRODUCTS) {
    for (const legacy of (p.legacy_domains || [])) {
      if (legacy.domain === normalised) return { /* product, target_url, target_path, … */ };
    }
  }
  return null;
}
```

- Recognizes `saigedemo.com` (the only currently registered legacy domain).
- Output is a redirect target, not an `environment` flag. Never read by
  any handler today; it's a tooling helper for the cutover plan.

### 4. `LiveDemo.jsx` — hard-coded org_id

`src/pages/LiveDemo.jsx:15`:

```js
const DEMO_ORG = 'demo-org-public';
```

Sent on every `POST /api/configuration/clone` call as `org_id`. The server
trusts this string. There is no allowlist; no sniffing of `Origin` /
`Referer` headers; no rejection if the same `org_id` arrives from a
non-demo origin.

### 5. `DemoSandbox.jsx` and `EnterpriseDemo.jsx` — body shape, no namespace

Both POST `{email, source: 'sandbox' | 'enterprise_demo', tier: 2 | 4}` to
`/api/leads` (which 404s — see `02-vercel-config.md`). Even on the correct
path, the backend treats `source` and `tier` as opaque metadata and does
not reject or quarantine.

### 6. `SandboxBanner` component

`src/components/demo/SandboxBanner.jsx`. Visual-only. No state effect
beyond a banner.

### 7. Backend env detection

`api/diagnostic.js:189`, `api/version.js:59` read `process.env.VERCEL_ENV`
(Vercel-supplied: `production` | `preview` | `development`). This is the
hosting environment, not the **demo** namespace concept. There is no place
in `api/` that reads a *request* hostname to decide a `demo` flag.

## Patterns the user named, and what's recognized

The W0 ruling identifies **three demo-namespace patterns**:

1. `saigedemo.com` (and similar product-specific demo domains)
2. `*.demo.veuaistudio.com`
3. `sandbox.*` subdomains

### Recognition status of each pattern

| Pattern | Recognized in any backend code? | Treated as demo namespace? | Where |
|---|---|---|---|
| `saigedemo.com` | Yes — by `productDomains.resolveLegacyDomain('saigedemo.com')` only. | **No** — output is a redirect target, not a "this is a demo, quarantine writes" flag. | `api/_lib/productDomains.js:55-59` (legacy_domains entry). |
| `*.demo.veuaistudio.com` | **No.** Zero matches in any code path. | No. | n/a |
| `sandbox.*` (subdomain prefix) | **No.** The string `sandbox.` matches only as part of `SandboxBanner` (a component name). No backend reads `req.headers.host` for a `sandbox.` prefix. | No. | n/a |

## Cross-reference: PA-DEMO-01

The user-supplied ID `PA-DEMO-01` does not appear in the codebase or docs.
No `specs/w4-pressai/` exists. Best inference: this is the requirement that
the backend recognize the three demo-namespace patterns and treat
identified demo requests differently (e.g., quarantine the lead, route to a
demo audit log, refuse to bill, etc.).

### Status

**Unaddressed.**

Concretely missing:
- A `resolveEnv(req)` helper in `api/_lib/auth.js` or
  `api/_lib/tenant.js` that inspects `req.headers.host` (and possibly
  `req.headers.origin` / `referer`) and returns one of `prod | staging |
  demo | live-demo | sales-demo`.
- A check in `requireAuth` / `getRequestContext` that rejects writes when
  the resolved `environment` is `demo` / `live-demo` / `sales-demo` and the
  endpoint is a "real" billing or production-data endpoint.
- A propagation channel: once resolved, store the `environment` on every
  `appendAuditEntry` and every lead so demo records are filterable.

The current code recognizes `'demo' / 'live-demo' / 'sales-demo'` only as
**string values** (BaseAgent + CredentialAdapter validate them), never as
**hostnames**. The W0-ruled three patterns are not recognized.

## Recommended `resolveEnv` shape (not implemented)

```js
// api/_lib/tenant.js — extend
export function resolveEnv(req) {
  const host = (req.headers?.host || '').toLowerCase();
  // Order matters — most specific first.
  if (host.endsWith('.demo.veuaistudio.com')) return 'demo';
  if (host.startsWith('sandbox.')) return 'sales-demo';
  if (host === 'saigedemo.com' || host === 'www.saigedemo.com') return 'live-demo';
  // (extend as more product-specific demo domains land)
  return 'prod';
}
```

Wired into `getRequestContext`:

```js
// api/_lib/auth.js
const env = resolveEnv(req);
return { ...ctx, environment: env };
```

And surfaced through every `withRequestLog` line so audit + cost rollups
can filter demo traffic out of billing aggregations.

## Verdict

There is **no central demo-namespace resolver** in the backend today. The
three W0-ruled patterns are recognized only by string comparison in the
agent-config layer (BaseAgent / CredentialAdapter), never against an
incoming HTTP request's host. **`PA-DEMO-01` is unaddressed.**

Demo isolation today is best-effort and client-driven (the UI writes
`org_id: 'demo-org-public'` literally, the server trusts it). For a server
that processes any real cost or stores any real identifying lead data, this
is a soft-quarantine that an attacker could trivially bypass by spoofing
the `org_id`.
