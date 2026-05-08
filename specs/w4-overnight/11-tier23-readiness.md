# 11 — Tier 2 / Tier 3 sandbox readiness

**Generated:** 2026-05-07.

## Spec sources

There is no `specs/w4-pressai/` directory in the repo. The tier model is
documented in two places:

- `src/docs/FLOWAI_GTM_DEMO.md` — defines the four-tier demo stack used by
  this codebase (1 marketing, 2 sandbox, 3 live demo, 4 enterprise sales).
- `docs/MIGRATION_PLAYBOOK.md` — defines the cutover from `saigedemo.com`
  (legacy demo) to `saigeplatform.com` under the same four-tier standard
  (Tier 2 = waitlist, Tier 3 = audited demo).

The two documents converge on the same Tier 2 / Tier 3 contract: Tier 2 is
the email-capture / waitlist surface; Tier 3 is the public sandbox that
lets a visitor exercise a real backend at a quarantined `org_id`.

## Tier 2 — Mid-funnel sandbox (`/demo`)

### What the spec says

`src/docs/FLOWAI_GTM_DEMO.md:43-57`:

- Route `/demo`, file `pages/DemoSandbox.jsx`.
- Self-serve sandbox loaded with mocked data from
  `src/data/demo/{products,runs,costs}.json`.
- "Save my session" → email capture → `POST /api/leads` → Resend follow-up.
- Persistent sandbox banner.

### Component cross-reference

| Spec component | Built? | Path |
|---|---|---|
| `pages/DemoSandbox.jsx` | ✅ | `src/pages/DemoSandbox.jsx` (11843 b) |
| `data/demo/products.json` | ✅ | `src/data/demo/products.json` |
| `data/demo/runs.json` | ✅ | `src/data/demo/runs.json` |
| `data/demo/costs.json` | ✅ | `src/data/demo/costs.json` |
| `components/demo/SandboxBanner.jsx` | ✅ | `src/components/demo/SandboxBanner.jsx` |
| `components/demo/DemoFooter.jsx` | ✅ | `src/components/demo/DemoFooter.jsx` |
| `components/demo/ClearanceSimulator.jsx` | ✅ | `src/components/demo/ClearanceSimulator.jsx` |
| `components/demo/CostChart.jsx` | ✅ | `src/components/demo/CostChart.jsx` |
| `POST /api/leads` (lead capture) | ⚠️ partial | `api/leads/capture.js` exists; UI POSTs to wrong path `/api/leads` (404). |
| Resend follow-up notification | ❌ | `api/leads/capture.js` does not call Resend. `api/_lib/email.js` exists but `RESEND_API_KEY` is unset. |
| Video demo placeholder (16:9 frame) | ⚠️ | `DemoSandbox.jsx` does not render a video frame; the "video demo placeholder" line in the spec is unimplemented. |
| Persistent sandbox banner | ✅ | rendered with `color="amber"` |

### Tier 2 verdict

**Mostly built; backend wiring is the gap.** Components and mock data are
in place. The lead-capture POST goes to the wrong path; Resend isn't
wired. No video frame.

## Tier 3 — Live demo with real backend (`/live-demo`)

### What the spec says

`src/docs/FLOWAI_GTM_DEMO.md:60-75`:

- Route `/live-demo`, file `pages/LiveDemo.jsx`.
- Real product + real backend; quarantined to `org_id: "demo-org-public"`.
- Visitor registers their own URL → clone-and-improve run.
- Daily seeded demo data via `GET /api/admin/seed-demo`.
- Run cap: 1 run per email per day (backend-enforced).
- Prominent public-data warning banner.

### Component cross-reference

| Spec component | Built? | Path |
|---|---|---|
| `pages/LiveDemo.jsx` | ✅ | `src/pages/LiveDemo.jsx` (7950 b) |
| Sends `org_id: "demo-org-public"` | ✅ | `LiveDemo.jsx:15` constant `DEMO_ORG = 'demo-org-public'`. |
| Clone-and-improve POST | ✅ | `LiveDemo.jsx:30` POSTs `/api/configuration/clone` with `mode:'clone'`, `objective:'audit_demo'`, `requester_email`. |
| `GET /api/admin/seed-demo` (daily seeding) | ❌ | **Does not exist.** Closest is `POST /api/admin/seed` (admin-key-gated) which seeds the five flagship products, not a per-day demo refresh. |
| Daily cron (06:00 UTC seed) | ❌ | No Inngest function named `seed-demo`. `api/_lib/jobs/scheduledClearance.js` exists but does not seed. |
| Run cap (1 / email / day) | ❌ | `api/configuration/clone.js` accepts the request and does not enforce a per-email rate limit. The lead-capture handler has 8/min/IP rate limit but that's a different surface. |
| Sandbox banner (red) | ✅ | `LiveDemo.jsx:54` `<SandboxBanner color="red"…/>`. |
| Demo-org quarantine enforced server-side | ❌ | Server trusts the `org_id` string from the request body. No allowlist. (See `09-demo-namespace.md`.) |
| Public-data warning copy | ✅ | "your URL and results may be visible to other visitors" |

### Tier 3 verdict

**Front-end shipped; back-end half-built.** The page wires to a real backend
endpoint, but the daily-seed cron, the per-email rate limit, and the
server-side org quarantine are all unimplemented.

## Cross-tier checklist (Tier 2 + Tier 3)

| Concern | Tier 2 | Tier 3 |
|---|---|---|
| Page component shipped | ✅ | ✅ |
| Mock data present | ✅ | ✅ (uses same products.json) |
| Sandbox banner | ✅ | ✅ |
| Lead capture wired | ⚠️ wrong path | n/a (Tier 3 captures via clone request) |
| Real backend call | n/a | ✅ |
| Daily seed cron | n/a | ❌ |
| Per-email rate limit | ❌ | ❌ |
| Demo namespace isolation | ❌ | ❌ |
| Resend notification | ❌ | n/a |
| Video frame placeholder | ❌ | n/a |
| Public-data warning copy | n/a | ✅ |

## What's required to close W4 readiness for Tier 2 / Tier 3

1. **Tier 2 lead-capture path mismatch** — fix in
   `src/pages/DemoSandbox.jsx:48` and `EnterpriseDemo.jsx:104`: change
   `'/api/leads'` to `'/api/leads/capture'`. (See `02-vercel-config.md`.)
2. **Tier 3 daily seed** — add `api/admin/seed-demo.js`:
   - `GET` only.
   - Generates fresh demo runs / cost rows under `org_id: 'demo-org-public'`
     each day; idempotent within the same UTC day.
   - Inngest cron at `0 6 * * *` UTC calls it (extend `api/_lib/jobs/`).
3. **Tier 3 per-email rate limit** — extend
   `api/configuration/clone.js` to enforce `1 run / requester_email / day`
   when `org_id === 'demo-org-public'`. The simplest implementation is a
   keyed map in `api/_lib/clone.js` with a 24-hour TTL bucket.
4. **Tier 3 server-side org quarantine** — add `resolveEnv(req)` to
   `api/_lib/tenant.js` (see `09-demo-namespace.md`) and reject any write
   to `org_id: 'demo-org-public'` that doesn't come from a recognized
   demo-namespace host.
5. **Resend wiring** — set `RESEND_API_KEY` in Vercel project settings;
   extend `api/leads/capture.js` to send a confirmation through
   `api/_lib/email.js` after the lead is persisted.

These five steps close the spec gap. None are blockers for the tier-1
marketing surface.
