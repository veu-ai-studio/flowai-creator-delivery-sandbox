# SAIGE v2 Remediation Brief

**Product:** SAIGE  
**Live URL:** https://saigeplatform.com  
**Repo:** https://github.com/victor2081new-cloud/saige (`main`)  
**Source of evidence:** FlowAI W07 clean run against `saigeplatform.com`  
**Document status:** Recommendation only. No SAIGE source changes are made by this brief.

## Executive Summary

FlowAI's first clean live run on SAIGE found four actionable engineering issues:

1. `network.http_401` - failed network request, high risk.
2. `console-error` - resource load returned HTTP 401.
3. `broken-modal` - UI modal component did not render or respond correctly.
4. `dead-card` - clickable card/component did not produce an observable state change.

The highest-leverage remediation path is to fix the authorization failure first. The 401 is probably upstream of the broken UI states: if an authenticated data/resource request fails, a modal or card may render an empty shell, fail to hydrate, or no-op when clicked.

## Prioritized Remediation Plan

| Priority | Finding | Five-Layer impact | Likely source area | Proposed fix |
|---|---|---|---|---|
| P0 | `network.http_401` | L1 functionality, L2 operations, L3 financial | API client, auth middleware, protected route/data loader | Identify the failing request, confirm expected auth mechanism, and ensure public demo resources use either a valid public endpoint or a deliberate auth gate with friendly fallback. |
| P0 | `console-error` 401 resource load | L1 functionality, L5 trust/UX | App bootstrap, asset/data fetch, Supabase/API client | Remove unauthorized boot-time fetches from public pages; add error handling so 401s do not surface as console noise on public flows. |
| P1 | `broken-modal` | L1 functionality, L5 UX | Modal/dialog component, trigger handler, data dependency | Ensure trigger opens the modal with deterministic state; guard missing data; add loading/error/empty states. |
| P1 | `dead-card` | L1 functionality, L4 business workflow, L5 UX | Dashboard/card component, CTA/card click handler, route mapping | Wire card click to a route, modal, or action; add disabled state if action is unavailable; test click outcome. |

## Finding 1 - `network.http_401`

**Observed behavior:** FlowAI detected a failed network request returning HTTP 401.

**Risk:** High. A 401 during a public product run suggests either a protected endpoint is being called without credentials, an expired/misconfigured token is shipped to the client, or a private resource is referenced from a public page.

**Likely source files or areas:**

- `src/lib/api*`, `src/api/*`, `src/services/*`, or equivalent API client module.
- `src/lib/supabase*`, `src/integrations/supabase/*`, or equivalent auth/data adapter.
- `src/App.*`, `src/main.*`, route loader files, or page-level effects that fetch data on mount.
- Serverless/API route auth middleware if SAIGE uses Vercel functions.

**Recommended fix:**

1. Inspect browser network logs for the exact 401 URL.
2. Classify the request:
   - Public resource: make it public, proxy it through a public read endpoint, or remove it from public boot.
   - Auth-required resource: move it behind an authenticated user journey and render a friendly login/locked state.
   - Third-party resource: verify token/domain allowlist/environment variable.
3. Add a typed error boundary or fetch wrapper that catches 401 and reports a user-safe state instead of leaving the UI broken.
4. Add regression coverage for unauthenticated public page load.

## Finding 2 - `console-error`: 401 Resource Load

**Observed behavior:** Console error records a failed resource load with status 401.

**Likely source files or areas:**

- Same request source as `network.http_401`.
- App bootstrap code that eagerly loads private data.
- Analytics, asset, or generated config reference that points at a protected URL.

**Recommended fix:**

1. Deduplicate with the `network.http_401` fix; these are probably the same root cause.
2. Ensure production public pages load with zero uncaught console errors.
3. Add a smoke test that opens `https://saigeplatform.com` unauthenticated and asserts no 401 console/resource failures for required UI.

## Finding 3 - `broken-modal`

**Observed behavior:** FlowAI exercised an interactive surface and classified a modal flow as broken or non-rendering.

**Likely source files or areas:**

- `src/components/*Modal*`, `src/components/*Dialog*`, `src/components/ui/dialog*`.
- Page component containing the trigger button/card.
- Data hook feeding the modal content.

**Recommended fix:**

1. Identify the trigger FlowAI clicked from the run log or browser replay.
2. Confirm the trigger has a stable `onClick`, `aria-controls`, or route action.
3. Ensure modal state is controlled by React state rather than depending on a failed data fetch.
4. Add fallback content when required data is missing.
5. Add Playwright coverage: click trigger, assert modal/dialog is visible, assert no console error.

## Finding 4 - `dead-card`

**Observed behavior:** FlowAI clicked a card-like UI element and observed no meaningful DOM, route, modal, or network change.

**Likely source files or areas:**

- `src/components/*Card*`, `src/pages/*Dashboard*`, `src/pages/Home*`, or landing page card grid.
- Route map if card should navigate.
- CTA handler if card should open a modal or start a flow.

**Recommended fix:**

1. Decide whether the card is intended to be interactive.
2. If interactive, wire it to a route, modal, or action with a visible success/loading/error state.
3. If not interactive, remove pointer/click affordance and expose it as static content.
4. Add keyboard accessibility: `button`/`a` semantics, focus ring, Enter/Space behavior.

## Suggested Source-Mapping Workflow

Because this brief is generated from FlowAI runtime findings, the next SAIGE engineering pass should confirm exact files before editing:

1. Clone or open `github.com/victor2081new-cloud/saige` at `main`.
2. Search for the failing 401 URL or endpoint path from browser Network logs.
3. Search modal/card trigger text from FlowAI's finding evidence.
4. Map each finding to exact file path and line number.
5. Apply fixes in the order P0 auth/resource failures first, then P1 UI interaction failures.
6. Deploy SAIGE v2 preview.
7. Re-run FlowAI against the preview and compare findings.

## Acceptance Criteria

- Public SAIGE load has no required-resource 401s.
- Console is free of uncaught 401 resource load errors on the public path.
- Modal trigger opens visible content or presents an honest disabled/locked state.
- Card click either performs an action or is no longer styled as interactive.
- FlowAI re-run shows `network.http_401`, 401 `console-error`, `broken-modal`, and `dead-card` resolved or downgraded with evidence.

