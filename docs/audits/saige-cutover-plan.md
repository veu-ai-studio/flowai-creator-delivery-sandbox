# SAIGE — Migration Cutover Plan

**Product:** SAIGE — Enterprise Impact Performance Platform
**Status:** Planned (cutover date TBD by Victor)
**Strategic context:** [`/docs/MIGRATION_PLAYBOOK.md`](../MIGRATION_PLAYBOOK.md)
**Day-of-cutover steps:** [`/docs/RUNBOOK.md`](../RUNBOOK.md) section 5
**Source of truth for product domains:** [`/api/_lib/productDomains.js`](../../api/_lib/productDomains.js)

---

## Domain mapping

| Role | Domain | Status today | Status after cutover |
|---|---|---|---|
| **Canonical (target)** | `saigeplatform.com` | TBD (not confirmed live) | Hosts all four tiers |
| **Legacy (retired)** | `saigedemo.com` | Active — hosts the waitlist + animated EIP scoring widget | 301 → `saigeplatform.com/live-demo` |

**Why retire `saigedemo.com`:** the domain pre-dates the four-tier demo standard. Demos are tiered extensions of the real product, not separate domains. Continuing to serve `saigedemo.com` long-term creates a forked-funnel problem (waitlist signups split across two domains) and a credibility issue (a "demo" subdomain on a compliance product reads as preview-grade).

**Why `/live-demo` as the target path:** the content of `saigedemo.com` is the audited live demo (animated EIP scoring widget cycling through org types). It maps cleanly to **Tier 3 — Audited Demo** under the four-tier standard.

---

## DNS records to add at the provider holding `saigeplatform.com`

> **Provider TBD** — Victor please confirm where `saigeplatform.com` is registered + DNS-managed (Cloudflare, Route 53, GoDaddy, Squarespace Domains, etc.). Records below assume Cloudflare; adapt for the actual provider.

### A. Records for the new canonical (`saigeplatform.com`)

If hosted on Vercel:

| Type | Name | Value | TTL | Proxy |
|---|---|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` | Auto | DNS only (gray cloud at Cloudflare — Vercel handles SSL/CDN) |
| `CNAME` | `www` | `cname.vercel-dns.com` | Auto | DNS only |

Then in Vercel:
- Project Settings → Domains → add `saigeplatform.com` and `www.saigeplatform.com`
- Pick the apex variant as primary; `www` redirects to apex automatically

### B. 301 redirect rule for `saigedemo.com` → `saigeplatform.com/live-demo`

#### Option B1 — Cloudflare Page Rules (recommended if `saigedemo.com` is on Cloudflare)

1. Cloudflare Dashboard → `saigedemo.com` → Rules → Page Rules → Create Page Rule.
2. **URL pattern:** `*saigedemo.com/*`
3. **Setting:** Forwarding URL
4. **Status code:** 301 — Permanent Redirect
5. **Destination URL:** `https://saigeplatform.com/live-demo/$1`
6. Save and **enable**. (Pre-cutover: save and leave **disabled** until step 5 of the cutover.)

This rule preserves sub-paths and query strings: `https://saigedemo.com/foo?utm=bar` redirects to `https://saigeplatform.com/live-demo/foo?utm=bar`.

#### Option B2 — Vercel `vercel.json` (when `saigedemo.com` is migrated to a Vercel project)

If `saigedemo.com` is added as an alias to the SAIGE Vercel project, add this to `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://saigeplatform.com/live-demo/$1",
      "permanent": true,
      "has": [{ "type": "host", "value": "saigedemo.com" }]
    },
    {
      "source": "/(.*)",
      "destination": "https://saigeplatform.com/live-demo/$1",
      "permanent": true,
      "has": [{ "type": "host", "value": "www.saigedemo.com" }]
    }
  ]
}
```

#### Option B3 — Hosting-provider redirect at `saigedemo.com`

If `saigedemo.com` is hosted somewhere with native redirect support (Netlify, Cloudflare Pages, etc.), use the provider's redirect config:

**Netlify `_redirects`:**
```
/*  https://saigeplatform.com/live-demo/:splat  301!
```

**Cloudflare Pages `_redirects`:** same syntax as Netlify.

---

## Verification commands (run pre-cutover and post-cutover)

```bash
# 1. Confirm new canonical is live with all four tiers
echo "=== Tier 2 (Waitlist / marketing — root) ==="
curl -sI https://saigeplatform.com/ | head -3

echo "=== Tier 3 (Audited Demo) ==="
curl -sI https://saigeplatform.com/live-demo | head -3

echo "=== Tier 4 (Investor Demo) ==="
curl -sI https://saigeplatform.com/investor | head -3

echo "=== Tier 1 (Live / authenticated app) ==="
curl -sI https://saigeplatform.com/app | head -3

# Each must return 200 (or, for /app, the login page at 200 — not 404).

# 2. Verify legacy 301 redirect (post-cutover only — fails pre-cutover by design)
echo "=== Legacy redirect — root ==="
curl -sI https://saigedemo.com/ | head -10
# Expected: HTTP/1.1 301 Moved Permanently
#           Location: https://saigeplatform.com/live-demo/

echo "=== Legacy redirect — sub-path ==="
curl -sI https://saigedemo.com/some/path | head -10
# Expected: Location: https://saigeplatform.com/live-demo/some/path

echo "=== Legacy redirect — query string ==="
curl -sI 'https://saigedemo.com/?utm_source=pitch' | head -10
# Expected: Location: https://saigeplatform.com/live-demo/?utm_source=pitch

# 3. Full chain check — follow redirect and confirm 200 at the destination
curl -sIL https://saigedemo.com/ | grep -E '^(HTTP|Location)'
# Expected:
#   HTTP/1.1 301 Moved Permanently
#   Location: https://saigeplatform.com/live-demo/
#   HTTP/1.1 200 OK

# 4. Re-audit via Super Customer Agent (regression check)
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://saigeplatform.com",
    "product_id": "saige",
    "depth": "quick",
    "max_page_count": 5,
    "objective": "Post-cutover regression check vs pre-cutover saigedemo.com baseline"
  }'

# 5. Compare audit health score to pre-cutover baseline
# Pre-cutover saigedemo.com baseline (from this morning's run):
#   Health score: 58 / 100 — see /docs/audits/saige-2026-05-05/EXECUTIVE_SUMMARY.md
# Post-cutover saigeplatform.com target:
#   Health score >= 58 (no regressions); ideally >= 65 with the cutover-paired
#   improvements (Privacy Policy, cookie consent, real legal entity disclosure).
```

---

## Code-side changes already in place

These do not need to be touched at cutover — they're already config-driven:

- ✅ [`/api/_lib/productDomains.js`](../../api/_lib/productDomains.js) — SAIGE entry has `live_url: 'https://saigedemo.com'`, `target_url: 'https://saigeplatform.com'`, and `legacy_domains: [{ domain: 'saigedemo.com', target_path: '/live-demo', status: 'active' }]`.
- ✅ [`/api/_lib/configRegistry.js`](../../api/_lib/configRegistry.js) — imports VEU portfolio from productDomains.js. No SAIGE-specific code.
- ✅ [`/api/admin/seed.js`](../../api/admin/seed.js) — imports VEU_PRODUCTS from productDomains.js. No SAIGE-specific code.

**Cutover-day code change (single-line):** in `productDomains.js`, flip the SAIGE legacy entry's `status` from `'active'` to `'redirected'`:

```diff
   {
     slug: 'saige',
     ...
     live_url: 'https://saigedemo.com',
+    live_url: 'https://saigeplatform.com',
     target_url: 'https://saigeplatform.com',
     legacy_domains: [
       {
         domain: 'saigedemo.com',
         target_path: '/live-demo',
-        status: 'active',
+        status: 'redirected',
         notes: '...',
       },
     ],
   },
```

Push, redeploy, done.

---

## Hardcoded references audit (this repo)

Audit run on commit `7a77bb3` of the FlowAI repo. Search pattern: `saigedemo\.com|saigeplatform\.com`.

**Found in `/api`** (3 references):
- `api/_lib/productDomains.js` line 52: `live_url: 'https://saigedemo.com'` (canonical config — correct)
- `api/_lib/productDomains.js` line 53: `target_url: 'https://saigeplatform.com'` (canonical config — correct)
- `api/_lib/productDomains.js` line 56: `domain: 'saigedemo.com'` (legacy entry — correct)

**Other `/api` files:** zero hardcoded references. Confirmed via:
```bash
grep -r "saigedemo\.com\|saigeplatform\.com" api --exclude-dir=node_modules
# Only matches productDomains.js
```

**`/src`** (Base44 territory — not editable from backend):
- Multiple references in `src/lib/veuProducts.js`, `src/components/governance/PortfolioQuickSelect.jsx`, `src/components/marketplace/AIRecommendationPanel.jsx`, `src/pages/Architecture.jsx`. These are Base44's responsibility; queue a Base44 task to import canonical URLs from a UI-side mirror of `productDomains.js` instead of hardcoding.

**Docs** (informational only — references are intentional):
- `/docs/audits/saige-2026-05-05/EXECUTIVE_SUMMARY.md` and others. Audit reports reference URLs as evidence — leave as-is.

---

## Rollback plan

If post-cutover verification fails:

### Hour 0-1 (immediate rollback)

1. **Disable the 301 redirect:**
   - Cloudflare: Page Rule → toggle off
   - Vercel: revert the vercel.json change + redeploy
2. **Verify `saigedemo.com` serves original content again:**
   ```bash
   curl -sI https://saigedemo.com/ | head -3
   # Expect: HTTP/1.1 200 OK (not 301)
   ```
3. **Verify `saigeplatform.com` still works** (it should — DNS doesn't move during a redirect-only rollback).
4. **Document the failure mode** in a new section at the bottom of this file under "Cutover attempts log".

### Hour 1-24 (deeper rollback if needed)

If the new canonical itself is failing (not just the redirect):

1. Take the SAIGE Vercel project offline (Settings → Pause Project) so users hitting `saigeplatform.com` get an honest "service temporarily unavailable" rather than a broken experience.
2. Keep `saigedemo.com` serving its original content.
3. Update [`productDomains.js`](../../api/_lib/productDomains.js) to revert the `live_url` change (set back to `https://saigedemo.com`).
4. Push the revert + redeploy FlowAI so the orchestrator + admin/seed continue to scope SAIGE audits at the working domain.

### Day 1+ (if the cutover is fundamentally blocked)

If `saigeplatform.com` cannot be made to work for some reason (e.g., domain verification fails at Vercel, certificate issuance hangs, etc.):

1. Pause the cutover indefinitely.
2. Open a [`saige-cutover-attempt-{date}.md`](.) post-mortem capturing what happened.
3. `productDomains.js` stays with `live_url: 'https://saigedemo.com'` and `legacy_domains` unchanged.
4. Re-attempt only after the blocking issue is reproducible + resolved in a non-production environment.

---

## Cutover attempts log

*(Empty — no cutover attempt yet.)*

When the first cutover happens, append an entry here:

```markdown
### 2026-MM-DD attempt
- **Outcome:** [success / partial / rollback]
- **Steps executed:** [1-7 from RUNBOOK section 5]
- **Verification results:** [pass/fail per step]
- **Issues encountered:** [...]
- **Resolution:** [...]
```

---

## Pre-cutover decisions queued for Victor

1. **Confirm DNS provider** for `saigeplatform.com` (Cloudflare? Route 53? GoDaddy?). Affects which redirect mechanism in section B above applies.
2. **Confirm hosting** for `saigeplatform.com` (Vercel? Cloudflare Pages? Netlify?). Affects DNS records in section A.
3. **Confirm cutover date.** The audit findings at [`/docs/audits/saige-2026-05-05/EXECUTIVE_SUMMARY.md`](saige-2026-05-05/EXECUTIVE_SUMMARY.md) flag P0 compliance issues (no cookie consent, no real privacy policy) on `saigedemo.com` — the cutover is a natural moment to land both. Coupling them shortens the path to a clean post-cutover audit.
4. **Decide whether to migrate `saigedemo.com`'s waitlist captures.** If the legacy domain has been collecting emails into a spreadsheet / form backend, those should be exported and re-imported into the canonical's lead store before the redirect lands. Otherwise the captures stay siloed at the legacy.
