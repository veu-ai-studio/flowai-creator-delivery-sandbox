# SAIGE saigeplatform.com — Claude Code Backlog (Code-side, paste-ready)

Generated from the FlowAI Super Customer independent verification audit on 2026-05-05.
Source: [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) · raw captures in `raw-captures/`.

This file lists ONLY the issues with a Code-side fix component (in `/api/*`, routing, redirects, server-side validation, or backend wiring). Pure UI / copy / visual issues route to [`BASE44_FIX_QUEUE.md`](BASE44_FIX_QUEUE.md).

---

## P0-001 — Decide and apply the routing strategy for `/investor` and `/app`

**Severity:** P0 (functional — buyer demo killer)
**Surfaces:** `https://saigeplatform.com/investor` · `https://saigeplatform.com/app`
**Estimated effort:** small (the routing decision is the work; the implementation is one config commit)
**Decision-gated:** see [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) — Victor must pick the strategy

### Task

> Two URLs that the SAIGE marketing copy implies exist (Tier 4 investor demo, Tier 1 live app) currently return soft-404s — the page returns HTTP 200 but renders the application's "Page Not Found" component. This is a buyer-credibility killer: any thoughtful buyer's first move is to manually try `/investor` and `/app` and they'll see broken state.
>
> Pick the strategy per surface (Victor decides — see VICTOR_DECISIONS_NEEDED.md):
>
> **Strategy A — Build the surface (proper fix):**
> - Tier 4 `/investor`: ship a minimum-viable investor page (thesis + 1-line traction + team headshots + contact button). Effort: 2-3 days.
> - Tier 1 `/app`: ship the auth-gated app shell, OR a public "Sign in to access your dashboard" landing that routes to `/sign-in`. Effort: 1-2 days.
>
> **Strategy B — Redirect to existing surface (interim):**
> - In SAIGE's routing config (Next.js `next.config.js`, vercel.json, or framework equivalent), add 301 redirects:
>   ```js
>   // next.config.js
>   async redirects() {
>     return [
>       { source: '/investor', destination: '/live-demo?from=investor', permanent: false },
>       { source: '/app',      destination: '/live-demo?from=app',      permanent: false },
>     ];
>   }
>   ```
> - Use `permanent: false` (302) so the redirect can be reversed when Strategy A ships.
> - Update home / nav / footer to remove direct links to `/investor` and `/app` until they ship as real surfaces.
>
> **Strategy C — Remove all references (cleanest interim):**
> - Audit the home page DOM for any `<a href="/investor">` or `<a href="/app">`.
> - Remove them entirely. Do not redirect — let `/investor` and `/app` continue to soft-404, but ensure no one sees them advertised in the first place.

### Acceptance criteria

- Either `/investor` and `/app` return 200 with real content, OR they return a 301/302 to a working surface, OR no link in any rendered page points at either URL.
- A re-audit run via `/api/audits/super-customer/run` does not flag these surfaces as soft-404 (because either they're fixed or they're no longer advertised).

### Note on Code's territory

This routing fix lives in **SAIGE's** repo, not FlowAI's. SAIGE's framework (likely Next.js or Vite-React per the captures showing JS-rendered pages) determines whether the fix is in `next.config.js`, `vercel.json`, `vite.config.js` rewrites, or a custom router config. The decision (A/B/C) and the framework-specific implementation are SAIGE-side; this backlog item is the routing-layer half of the fix.

---

## P1-001 — Wire the home hero email-capture form (when Base44 ships it)

**Severity:** P1 (conversion — backend half of audit issue P0-004 above)
**Surface:** `https://saigeplatform.com/`
**Estimated effort:** trivial — the endpoint is already shipped

### Task

> The home hero "Request Demo" CTA currently has no inline form. Base44 will ship the form (see BASE44_FIX_QUEUE.md). Code's only role here is to confirm the form's `onSubmit` handler points at the existing `/api/leads/capture` endpoint with `product_id: 'saige'`.
>
> Endpoint: `POST https://flowai-dun.vercel.app/api/leads/capture`
>
> Sample payload Base44's form should send:
> ```json
> {
>   "email": "<from form>",
>   "product_id": "saige",
>   "source_page": "/",
>   "metadata": {
>     "form": "home_hero",
>     "campaign": "<from utm_campaign>",
>     "company": "<from form, optional>"
>   }
> }
> ```
>
> Header: `x-flowai-org-id: veu-ai-studio`
>
> Endpoint already returns:
> - `201` on success with `{ ok: true, message, lead_id }`
> - `429` on rate-limited (8/min per IP)
> - `400` on invalid email
>
> No code changes needed in `/api`. This is a verification task — confirm the wiring once Base44 commits.

### Acceptance criteria

- A submission from the SAIGE home hero produces a `lead.captured` audit log entry with `org_id: 'veu-ai-studio'` and `product_id: 'saige'`.
- Verifiable via: `curl 'https://flowai-dun.vercel.app/api/audit-log?orgId=veu-ai-studio&actionType=lead.captured&limit=10'`

---

## Suggested execution order

1. **Day 0 (immediate, before buyer demo):** Strategy C from P0-001 — remove all `<a>` references to `/investor` and `/app` from the home / nav / footer. Stops the buyer from discovering the soft-404s. Effort: <1 hour.
2. **Day 1-2:** Strategy B from P0-001 — add 302 redirects from `/investor` and `/app` → `/live-demo` so direct URL hits don't 404 either.
3. **Day 3-7:** Strategy A from P0-001 — build the real `/investor` and `/app` surfaces. When they ship, remove the redirects from step 2.
4. **Continuous:** P1-001 verification — confirm Base44's hero form submits to `/api/leads/capture` once the form ships.

---

## Re-audit invocation

```bash
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://saigeplatform.com",
    "product_id": "saige",
    "depth": "quick",
    "max_page_count": 4,
    "objective": "Verify /investor and /app no longer soft-404; verify home placeholder strings removed",
    "sync": true
  }'
```

Expect post-fix score to land at **65-75** (quick wins) or **75-85** (full Strategy A on both tiers + Base44's UI fixes shipped).
