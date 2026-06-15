# CB Dispatch - Dashboard Health Console Cleanup

FROM: CTO
TO: CB
DATE: 2026-06-15
ACTION: Runtime follow-up fix after CT2 product-card PASS-WITH-FINDINGS

Branch: `fix/dashboard-health-console-cleanup`
Base: current `origin/main` after docs commit `fbd2e71`
Canonical docs: do not edit
matrixArtifact / VERIFIED / WIRED: do not edit

## Context

CT2 reran the SAIGE product-card post-hotfix browser acceptance on production commit `55a53f3cd3dd0ffae25b41eaa6fc5c3e5f12bf27`.

Result: `PASS-WITH-FINDINGS`.

Passed:

- `/api/products` is HTTP `200`.
- SAIGE API row has `last_audit_score:98`.
- `/portfolio`, `/dashboard`, and `/products` show SAIGE with visible numeric score as `10/10`.
- `/flow-hub/production` shows all 8 steps.
- `/flowai` accepts `https://saigeplatform.com`, shows upgrade-target context, and enables `Launch Forge`.

Findings:

- `/dashboard` still emits `g.filter is not a function`.
- Browser console also shows a local-resource health request: `file:///C:/Program%20Files/Git/api/health`.

## Boundary Chain To Fix

Likely source files:

- `src/pages/MainDashboard.jsx`
- `src/components/dashboard/PlatformHealthWidget.jsx`
- `src/lib/platform-health/proxy-url.js`
- Focused tests for dashboard/proxy guards if existing test harness supports them.

Known diagnosis:

1. `MainDashboard` mounts `PlatformHealthWidget`.
2. `PlatformHealthWidget.loadData()` currently does:
   - `base44.entities.GovernanceAuditLog.filter({}, '-timestamp', 50).catch(() => [])`
   - then `auditLogs.filter(...)`
3. If the Base44 adapter returns an envelope/object instead of an array, `auditLogs.filter` throws and surfaces as `g.filter is not a function` after minification.
4. The repo already has `asArray` and `resolveArray` in `src/lib/uiDataGuards.js`; use that existing pattern instead of ad hoc guards.
5. `resolveProxyBaseUrl()` currently trusts `VITE_FLOWAI_FETCH_PROXY_URL` verbatim. Production browser evidence shows a bad local-resource health request resolving to `file:///C:/Program%20Files/Git/api/health`. Harden proxy resolution so only same-origin absolute paths starting with `/` or absolute `http://` / `https://` URLs are accepted. Invalid configured values must fall back to `/api`.

## Scope

Do:

- Make `PlatformHealthWidget` robust to array, envelope, null, error, or timeout returns from Base44 audit-log reads.
- Make `resolveProxyBaseUrl` reject Windows paths, `file://` URLs, shell-expanded paths, blank values, and other non-HTTP/non-same-origin values.
- Preserve the default same-origin `/api/health` behavior.
- Add focused tests for proxy URL resolution and the audit-log data guard if practical.
- Verify `/dashboard` no longer emits `g.filter is not a function`.
- Verify `/dashboard` no longer attempts `file:///.../api/health`.
- Verify SAIGE score visibility remains intact on `/dashboard`, `/products`, and `/portfolio`.

Do not:

- Change `/api/products`, scoring formulas, ProductSSOT, governance writes, deploy logic, branch creation, canonical docs, `matrixArtifact`, VERIFIED, or WIRED.
- Add SAIGE-specific, VEU-specific, or product-specific runtime logic.
- Hide errors by swallowing all exceptions without setting a truthful degraded/offline UI state.

## Required Verification

Run at minimum:

1. Focused tests covering changed dashboard/proxy code.
2. Any existing product-card route tests touched by this area.
3. Full `npm run preflight`.
4. Restore timestamp-only `src/lib/orchestratorFramework/matrixArtifact.json` churn if generated.

Then push branch and write evidence to:

`docs/cto/cb-dashboard-health-console-cleanup-result-20260615.md`

Report:

- branch head SHA
- files changed
- focused tests
- full preflight result
- confirmation that no canonical docs, ProductSSOT, scoring, deploy, `matrixArtifact`, VERIFIED, or WIRED movement occurred
