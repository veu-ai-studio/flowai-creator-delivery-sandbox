# Vercel Deployment Protection Bypass — Operations

**Date:** 2026-05-13
**Owner:** W1 (Credentials & Ops)
**Project:** `truthful-flow-logic-lab` (Vercel team `veu-ai-studio`)
**Branch:** flowai-v0.1

## Purpose

The `truthful-flow-logic-lab` Vercel project runs with **SSO Protection
(`all_except_custom_domains`)** active on every preview deployment. This
gate blocks anonymous traffic with HTTP 401 — including W4's smoke-test
runner, which needs programmatic access to preview URLs to validate
each deployment before merge.

The **Protection Bypass for Automation** secret is a Vercel-managed
header value that, when included on a request, instructs Vercel's edge
to skip the protection gate for that specific request. The production
gate remains ON for all non-bypass traffic.

This mechanism replaces lifting protection entirely. Production access
controls are unchanged.

## Mechanism

Vercel's edge accepts the bypass via either:

1. **HTTP header** (the supported, recommended form):

   ```
   x-vercel-protection-bypass: <secret>
   ```

   Returns the underlying resource directly with HTTP 200 (or 308 →
   200 on redirect).

2. **Query parameter** (with companion cookie flag):

   ```
   ?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true
   ```

   This form installs a `_vercel_jwt` cookie for subsequent same-origin
   requests. **Per current verification, the query-param form returns
   401 in single-request HEAD tests on this project; use the header
   form for programmatic smoke tests.**

The bypass list lives at the project level on Vercel. One entry is
currently configured (`scope: automation-bypass`).

## Secret location

**Source of truth:** Vercel project (`prj_5ekolTZZmKCyorR8mOIVL6qtduji`)
→ Settings → Deployment Protection → Protection Bypass for Automation.

**Synced to:**

- **Doppler:** `flowai/prd` config, secret name `VERCEL_AUTOMATION_BYPASS_SECRET`
- **Vercel runtime env:** Vercel auto-designates the same name as a
  System Environment Variable when a bypass exists, so the value is
  also available at deployment runtime (per project env vars list).

Doppler is the source W4 smoke runners read from. Doppler-Vercel
sync (configuration ID `icfg_zvHsaM1AwrPypa7Io0cJWX7X`) keeps
Vercel's project env var in line with Doppler.

**Drift hazard:** When the secret is rotated via the Vercel dashboard
UI, Vercel auto-updates the System Environment Variable but DOES NOT
push back to Doppler. W1 must run the W1 bypass-sync correction
script (`scripts/w1-bypass-doppler-sync.mjs`) to re-align Doppler.
This was the bug surfaced on the 2026-05-13 verification run: Doppler
held a 148-byte string that did not match Vercel's 32-byte canonical
bypass value, so smoke tests reading from Doppler would have failed.
The correction script restores match in under five seconds.

## Access scope

- **W4 smoke runner only.** No other process is authorized to use this
  bypass.
- W4 reads the secret from Doppler `flowai/prd`
  `VERCEL_AUTOMATION_BYPASS_SECRET` at smoke-test invocation.
- The secret is **header-only** in W4's smoke flow. Do not embed the
  value in URLs, logs, GitHub workflow `echo` calls, or shell history.
- Treat the value as a service-role credential — its leak is
  equivalent to disabling the gate for any caller who has it.

## Rotation cadence

- **90 days** (deploy/CI-token class per
  `specs/w1-overnight/09-rotation-completeness.md`).
- Rotation procedure:
  1. Vercel dashboard → Project → Settings → Deployment Protection →
     **Protection Bypass for Automation** → **+ Add Bypass** (creates
     new entry without revoking old).
  2. Run `node scripts/w1-bypass-doppler-sync.mjs` under
     `doppler run --project flowai --config prd` to update Doppler
     with the new canonical Vercel value (script picks the newest
     entry).
  3. Validate W4 smoke pass.
  4. Vercel dashboard → revoke the old bypass entry.
- **On-incident rotation:** rotate immediately on any suspected leak.

## Verification commands

Sanitized — secret value never appears on the command line.

### Positive smoke (header form — expected: 200)

```bash
# Read secret from Doppler into shell variable; never echo
BYPASS=$(doppler secrets get VERCEL_AUTOMATION_BYPASS_SECRET \
  --project flowai --config prd --plain | tr -d '\r\n')

# Find latest READY preview URL
PREVIEW_URL="https://<latest-preview>.vercel.app"

# Status-only smoke (no body, no headers echoed)
curl -sS -L -o /dev/null -w "status=%{http_code}\n" \
  -H "x-vercel-protection-bypass: ${BYPASS}" \
  "${PREVIEW_URL}/"

unset BYPASS
```

Expected output: `status=200`.

### Negative control (no bypass — expected: 401)

```bash
curl -sS -o /dev/null -w "status=%{http_code}\n" "${PREVIEW_URL}/"
```

Expected output: `status=401`. This proves the protection gate is
still active for non-bypass traffic.

### Doppler ↔ Vercel match check (no values echoed)

```bash
doppler run --project flowai --config prd -- \
  node scripts/w1-bypass-diag-and-verify.mjs
```

The diag script computes SHA-256 of both values and logs only the
first 8 hex characters of each plus a boolean `match`. It also runs
the positive + negative smoke automatically.

## Most recent verification (this commit)

- **Date:** 2026-05-13
- **Preview URL tested:** `https://truthful-flow-logic-hohkw7vdm-veu-ai-studio.vercel.app/`
- **Doppler ↔ Vercel match:** TRUE (`sha8=9cc181d3` on both, 32 bytes
  each)
- **Positive (header form):** 200
- **Positive (query-param form):** 401 (form not supported in
  single-request HEAD against this project — header form only)
- **Negative control:** 401
- **Overall verdict:** PASS

## Files referenced

| Path | Role |
|---|---|
| `scripts/w1-bypass-diag-and-verify.mjs` | Diagnose Doppler ↔ Vercel alignment + run positive/negative smokes. Never echoes secret. |
| `scripts/w1-bypass-doppler-sync.mjs` | Correct Doppler value to canonical Vercel bypass entry. Use after dashboard-side rotation. |
| `scripts/w1-vercel-bypass-setup.mjs` | Programmatic bypass-creation script (currently unused — Vercel's public REST API doesn't expose this endpoint on Pro plan; CEO generates via dashboard instead). Retained for reference. |

## Why not REST-API creation

The Vercel REST API endpoint `POST /v1/projects/{id}/protection-bypass`
documented in some Vercel material returns 404 on this team's Pro
plan; the `protectionBypass` field is not in the project's PATCH
schema (Vercel responds `should NOT have additional property
protectionBypass`). Confirmed via three prior W1 dispatches across
multiple endpoint variants. CEO action via Vercel dashboard is the
working path.

## Production gate confirmation

`ssoProtection` on the project remains
`{ deploymentType: "all_except_custom_domains" }`. The bypass is a
narrow per-request exception, not a relaxation of the gate.
