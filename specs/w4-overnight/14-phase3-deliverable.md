# 14 — W4 Phase 3 + 4b deliverable report

**Branch:** `flowai-v0.1`. Single commit. No push, no main, no production promote.

**Date:** 2026-05-08.

---

## Scope (per W01 dispatch)

Authorized:
- `/api/leads/`
- `/src/lib/leads/`
- `/tests/`
- `/specs/`
- `productDomains.js` (legacy_domain entry edit only)

Out of scope from this window (need SAIGE repo): Tier 1 / 2 / 4 / 5 / 6 UI work.

---

## Files added / changed in this commit

| File | Status | Purpose |
|---|---|---|
| `src/lib/leads/validate.js` | NEW | Pure validator for the lead-capture payload. Returns `{ ok, errors[] }`. Hard limits + slug-safe checks + cheap XSS guard on `metadata.message`. Never throws. |
| `tests/leads-validate.test.js` | NEW | 36 tests — schema, payload-shape, email, product_id, source_page, org_id, metadata, XSS guard, multi-error aggregation. |
| `api/leads/route.js` | NEW | Vercel POST handler. Validates → resolves env → demo-namespace short-circuit OR HubSpot upsert. DI factory `createHandler({createClient,env,log})` for tests. Fail-closed on missing `HUBSPOT_API_KEY`. |
| `tests/leads-route.test.js` | NEW | 25 tests — handler shape, OPTIONS, method gating, validation, demo short-circuit (all 3 W0 patterns), fail-closed, production happy path, production failure modes, no-network contracts. |
| `api/_lib/productDomains.js` | EDIT | **Phase 4b only** — single field: `legacy_domains[0].status: 'active' → 'redirected'`. Notes prose updated to reflect cutover. No other config touched. |

Reused (already shipped earlier in W4):
- `src/lib/leads/hubspot-client.js` — VEU 8-property field map, `createHubspotClient({apiKey,fetcher,baseUrl,log})`.
- `src/lib/leads/resolveEnv.js` — W0 three-pattern resolver: `saigedemo.com`, `*.demo.veuaistudio.com`, `sandbox.*`.

---

## Test results

```
$ npx vitest run tests/leads-validate.test.js tests/leads-route.test.js
 Test Files  2 passed (2)
      Tests  61 passed (61)

$ npx vitest run tests/leads.test.js tests/auth.test.js \
                  tests/leads-hubspot-client.test.js \
                  tests/leads-resolveenv.test.js \
                  tests/leads-validate.test.js \
                  tests/leads-route.test.js
 Test Files  6 passed (6)
      Tests  174 passed (174)
```

W4 leads + auth surface: **174/174 passing.** No regressions in W4 scope.

---

## Phase 3 — `/api/leads` path fix

**What works today:**
- The handler is mounted by Vercel filesystem routing at **`/api/leads/route`** (file lives at `api/leads/route.js`).
- The handler validates payload, resolves environment via the W0 three-pattern resolver, and either short-circuits (demo) or calls HubSpot.

**What's still broken (out of scope for this commit):**
- The existing UI POSTs to **`/api/leads`** (see `src/pages/DemoSandbox.jsx:48` and `src/pages/EnterpriseDemo.jsx:104`). Vercel does not auto-mount `route.js` as the directory root, so `POST /api/leads` continues to silently 404 today.

**Three options to close the UI ↔ filesystem gap (each requires a different scope expansion):**

1. **vercel.json rewrite** *(out of scope for this commit; Phase 3 scope excluded `vercel.json`)*:
   ```json
   { "source": "/api/leads", "destination": "/api/leads/route" }
   ```
2. **UI edit** *(out of scope: SAIGE repo plus `src/pages/`)* — change two call sites from `/api/leads` to `/api/leads/route` (or `/api/leads/capture` for the existing in-memory store).
3. **Top-level handler** *(out of scope: `api/leads.js` would live outside `api/leads/`)* — a re-export shim at `api/leads.js`.

W01 sign-off needed before any of the three lands.

---

## Phase 3 — HubSpot field map (FlowAI-side)

`src/lib/leads/hubspot-client.js` (already shipped) wires every body POSTed to HubSpot through `leadToHubspotProperties(lead)`, which produces the 8 W0-ruled `veu_`-prefixed properties:

```
veu_product_interest, veu_lead_source, veu_demo_requested,
veu_demo_scheduled_at, veu_utm_source, veu_utm_medium,
veu_utm_campaign, veu_message
```

`api/leads/route.js` calls `client.upsertContact(lead)` only when:
- payload validates,
- environment resolves to `production` (not demo),
- `process.env.HUBSPOT_API_KEY` is a non-empty string.

If any of those three preconditions is unmet, **no client is constructed and no network call is made**. This is verified by three explicit "no-network" tests in `tests/leads-route.test.js`.

Per locked decision #4 (W5 ships the shared `veu_*` field-map module), the FlowAI-side wiring delivered today consumes the field map directly from `src/lib/leads/hubspot-client.js`. When W5 ships its shared module, `hubspot-client.js` should re-export the field map from there to retire the local copy.

---

## Phase 3 — Demo-namespace resolver

`src/lib/leads/resolveEnv.js` (already shipped) provides:
- `resolveEnv({ origin, referer, host })` — pure
- `resolveEnvFromReq(req)` — case-insensitive header lookup

Patterns recognized **(exactly the W0-ruled three, no others)**:
1. `saigedemo.com` and `www.saigedemo.com` (host_exact)
2. `*.demo.veuaistudio.com` (host_suffix)
3. `sandbox.*` (host_prefix)

Anti-attack pinning (covered by `tests/leads-resolveenv.test.js`):
- `saigedemo.com.attacker.test` → production (no suffix overflow)
- `attacker-saigedemo.com` → production (no exact-match weakening)
- `mydemo.veuaistudio.com` → production (no suffix overflow without the leading dot)
- `not-sandbox.example.com` → production (prefix is `sandbox.`, with the dot)
- `sandboxx.example.com` → production (typo near-miss does not match)

`api/leads/route.js` uses this resolver to decide whether to acknowledge the lead as a demo (HTTP 202, no HubSpot call) or route it to HubSpot (production path).

---

## Phase 4b — productDomains.js legacy entry

**Diff (one entry, two fields):**

```diff
   legacy_domains: [
     {
       domain: 'saigedemo.com',
       target_path: '/live-demo',
-      status: 'active',                // not yet redirected; cutover planned
-      notes: 'Pre-dates the four-tier demo standard. Contains the SAIGE waitlist + animated EIP scoring widget. After cutover, redirects to saigeplatform.com/live-demo.',
+      status: 'redirected',            // W4 Phase 4b cutover landed; saigedemo.com 301 → saigeplatform.com/live-demo
+      notes: 'Pre-dates the four-tier demo standard. Contained the SAIGE waitlist + animated EIP scoring widget. As of W4 Phase 4b cutover, 301-redirected to saigeplatform.com/live-demo.',
     },
   ],
```

**No other lines in `productDomains.js` were touched.** The rest of the SAIGE entry (slug, name, status, tags, live_url, target_url, objectives) is unchanged. The other four product entries (PressAI, ReachSMS, RelTwin, MyBirthSafe) are unchanged.

**Note on registry consistency:** the SAIGE entry's `live_url` is still `https://saigedemo.com`. Now that the legacy_domains status is `redirected`, the live_url could be flipped to `target_url` value (`https://saigeplatform.com`) — but that's a registry semantics decision (`live_url` = "currently reachable" vs "canonical product URL post-cutover") and is out of scope for this single-field edit. Flagging for W01 review.

---

## Production runtime requirements (CEO morning checklist)

For `api/leads/route.js` to upsert real HubSpot contacts, the following must be in place. The route fails closed (HTTP 503) until they are:

1. **HubSpot custom properties** — manually create in the HubSpot dashboard (Settings → Properties → Contact properties → Create property):

   | Property name | Type | Field type | Notes |
   |---|---|---|---|
   | `veu_product_interest` | Single-line text | dropdown or text | Allowed values: `saige`, `pressai`, `reachsms`, `reltwin`, `mybirthsafe` |
   | `veu_lead_source` | Single-line text | text | e.g. `home_hero`, `pricing_inline`, `enterprise_demo` |
   | `veu_demo_requested` | Boolean | radio | true / false |
   | `veu_demo_scheduled_at` | Date picker | date | ISO-8601 |
   | `veu_utm_source` | Single-line text | text | e.g. `google`, `linkedin`, `pitch-deck` |
   | `veu_utm_medium` | Single-line text | text | e.g. `cpc`, `email`, `social` |
   | `veu_utm_campaign` | Single-line text | text | e.g. `q2-launch`, `investor-week` |
   | `veu_message` | Multi-line text | textarea | free text from the form |

   Property names **must match exactly** — the field map is contract-pinned in `tests/leads-hubspot-client.test.js`. A drift in HubSpot will cause a 400 from the API ("PROPERTY_VALIDATION_FAILED").

2. **HubSpot API key** — create a Private App in HubSpot with `crm.objects.contacts.write` and `crm.objects.contacts.read` scopes. Copy the access token.

3. **Vercel env var** — in the Vercel project settings, set `HUBSPOT_API_KEY` to the access token from step 2 (Production environment only; leave Preview/Development unset).

4. **Confirm endpoint reachability** — until the `/api/leads` ↔ `/api/leads/route` rewrite question is decided (option 1, 2, or 3 above), the route is reachable at:
   - `POST https://flowai-dun.vercel.app/api/leads/route` (filesystem-routed)
   - NOT `POST https://flowai-dun.vercel.app/api/leads` (404 until rewrite lands)

5. **Smoke test (post-deploy)** — once HubSpot key is set:
   ```bash
   curl -X POST https://flowai-dun.vercel.app/api/leads/route \
     -H 'Content-Type: application/json' \
     -d '{"email":"smoketest+veu@example.com","product_id":"saige","source_page":"/","metadata":{"utm_source":"smoketest"}}'
   ```
   Expected: `201 {"ok":true,"action":"created","environment":"production","contact_id":"<id>"}`. Then verify the contact exists in HubSpot with all 8 `veu_*` properties populated.

---

## Status

**Phase 3 + 4b complete.** Stopping per W01's "Stop and report — W01 verifies before any next dispatch" rule. No push, no main, no production promote.

Remaining open items requiring W01 sign-off before the next dispatch:

1. Which of the three options closes the `/api/leads` ↔ `/api/leads/route` mount gap?
2. Should `productDomains.js` SAIGE entry's `live_url` flip from `saigedemo.com` to `saigeplatform.com` now that the legacy is redirected? (Registry semantics decision.)
3. SAIGE-side phases (1 / 2 / 4 / 5 / 6) — confirm dispatch path. SAIGE repo URL or alternative engineer/agent ownership.
