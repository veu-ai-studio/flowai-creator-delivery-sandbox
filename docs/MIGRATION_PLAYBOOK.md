# VEU AI Studio — Universal Migration Playbook

This playbook is the standard sequence VEU AI Studio runs every time a portfolio product migrates to the four-tier demo standard. It applies to SAIGE, PressAI, MyBirthSafe, RelTwin, ReachSMS, and any future products.

**The four-tier demo standard:** every VEU product lives at one canonical domain serving four tiers from the same root:
1. **Live** — the real authenticated product (root or `/`)
2. **Waitlist / marketing** — the public-facing landing page
3. **Audited demo** — sandbox demo with synthetic data, accessible without login
4. **Investor demo** — gated, scripted walkthrough surface for diligence conversations

Demos are tiered extensions of the real product, not separate domains. Legacy domains pointing at any of these tiers from before this standard existed are retired via 301 redirect at migration cutover.

---

## Table of contents

1. [Legacy Domain Retirement Pattern](#1-legacy-domain-retirement-pattern)
2. [Pre-migration audit checklist](#2-pre-migration-audit-checklist)
3. [Cutover execution](#3-cutover-execution-cross-link-to-runbook)
4. [Post-cutover monitoring](#4-post-cutover-monitoring)
5. [Per-product migration metadata](#5-per-product-migration-metadata)

---

## 1. Legacy Domain Retirement Pattern

Standard approach for any product where a legacy demo or marketing domain exists pre-migration.

### Step 1 — Identify all legacy domains pointing at the product

Run an inventory. For each product, surface:

- Domains the product has been served at historically
- Subdomains under `*.base44.app` from prior platform iterations
- Any `*.demo.veu.ai` / `*-demo.com` / `*-public.com` style aliases
- Marketing or campaign-specific domains
- Domains referenced in any partnership materials, press releases, or pitch decks

**Where to look:**
- DNS records at the provider (Cloudflare, Vercel, Route 53)
- Vercel project `Domains` tab
- The product's own marketing footer / privacy policy / contact pages
- Search Google + LinkedIn for the product name to find press references
- Per-product config in `/api/_lib/productDomains.js` — the `legacy_domains` array on each entry should already capture known cases

**Output:** add or verify each legacy domain is captured in `productDomains.js` under the relevant product's `legacy_domains` array with status `active` (still serving content) or `redirected` (already 301'd).

### Step 2 — Map each legacy domain to its closest equivalent in the new four-tier structure

For every legacy domain, decide which tier its content most cleanly maps to:

| Legacy content | Likely target tier | Example |
|---|---|---|
| Marketing / waitlist landing | Tier 2 (Waitlist) | `saigedemo.com` → `saigeplatform.com/` |
| Animated demo or scoring widget | Tier 3 (Audited Demo) | `saigedemo.com` → `saigeplatform.com/live-demo` |
| Investor pitch / detailed walkthrough | Tier 4 (Investor Demo) | `saige-pitch.com` → `saigeplatform.com/investor` |
| Authenticated dashboard | Tier 1 (Live) | `app.product.com` → `productplatform.com/app` |

**Default if unclear:** map to the homepage (`/`) and document the decision in the `target_path` field. A homepage redirect is always safe — it never 404s.

**Captured in:** `legacy_domains[].target_path` per product in `productDomains.js`.

### Step 3 — Plan a 301 permanent redirect at DNS / hosting level

Pick the redirect mechanism based on where the legacy domain is hosted:

- **Cloudflare DNS:** Page Rules → Forwarding URL → 301 permanent. Best for full-domain redirects.
- **Vercel:** project Settings → Domains → add legacy domain to its OWN Vercel project → vercel.json with `redirects` block. Useful when both domains live on Vercel and per-path mappings are needed.
- **Hosting provider config files:** for Apache/Nginx-hosted legacy domains, write the rewrite rule directly.

**Standard rule:** every path on the legacy domain → the corresponding `target_url + target_path` on the canonical domain. Default catch-all to the homepage if no specific path mapping exists.

**Verification before cutover:** test the rule against a staging variant (e.g., point a `redirect-staging.legacy.com` at the same rule first). Confirm the 301 emits the correct `Location` header.

### Step 4 — Verify the redirect works before flipping production traffic

```bash
# Each legacy domain × at least 3 representative paths
curl -sI https://saigedemo.com/ | head -10
curl -sI https://saigedemo.com/some/sub/path | head -10
curl -sI https://saigedemo.com/?utm_source=pitch | head -10

# Expect: HTTP/1.1 301 Moved Permanently
# Location: https://saigeplatform.com/live-demo[/some/sub/path][?utm_source=pitch]

# Then verify the destination resolves
curl -sI https://saigeplatform.com/live-demo | head -10
# Expect: HTTP/1.1 200 OK
```

**Pre-cutover acceptance criteria:**
- Every legacy domain emits `301 Moved Permanently`
- The `Location` header points at the documented target URL
- The destination returns 200 (not 404)
- Query strings + sub-paths are preserved through the redirect (when needed)

### Step 5 — Monitor 404 logs for 30 days post-cutover to catch missed paths

Set up a 30-day monitoring window after cutover. Goal: find any legacy URL pattern the redirect rule didn't catch.

**Where the signal lives:**
- Vercel `Logs` for the canonical domain — filter by 404
- Cloudflare Analytics — Top URLs by status code
- Axiom dataset (when active) — `path:404` queries on `/api/*` and rendered pages

**Action loop:**
- Each unique 404 path on the canonical domain → check whether it was a known legacy URL
- If yes → add a specific path mapping to `legacy_domains[].redirects` and re-deploy
- After 30 days with no new patterns → mark `legacy_domains[].status: 'retired'` in `productDomains.js`

After 30 days at status `retired` and no inbound traffic on the legacy domain, the DNS record itself can be deleted.

---

## 2. Pre-migration audit checklist

Before initiating a cutover, run the Super Customer Agent against BOTH the legacy domain and the new canonical domain. Compare findings.

```bash
# Audit the new canonical
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://saigeplatform.com",
    "product_id": "saige",
    "depth": "full",
    "max_page_count": 50,
    "objective": "Pre-migration buyer-readiness audit"
  }'

# And the legacy (for comparison + to confirm no functionality is being lost)
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://saigedemo.com",
    "product_id": "saige",
    "depth": "quick",
    "max_page_count": 5,
    "objective": "Pre-migration baseline of legacy domain"
  }'
```

**Cutover-blocking criteria** (any one is a hold):
- New canonical health score < legacy health score
- Any P0 issue on the new canonical that wasn't on the legacy (regression introduced by the migration)
- Any auth-funnel regression (sign-up / sign-in working on legacy but not on new canonical)
- Compliance gaps on new canonical that were resolved on legacy
- Demo-tier surfaces present on legacy but missing or broken on new canonical

**Cutover-proceed criteria:**
- New canonical health score ≥ legacy health score AND ≥ 65/100 minimum
- All four demo tiers render correctly at the new domain
- No P0 issues on the new canonical
- Legacy 301 redirects pre-staged + tested

---

## 3. Cutover execution (cross-link to RUNBOOK)

The day-of-cutover step-by-step lives in [`/docs/RUNBOOK.md`](RUNBOOK.md) under the **Migration Cutover Checklist** section. That checklist is the actual procedure operators follow on the day each product migrates.

This playbook (`MIGRATION_PLAYBOOK.md`) is the strategic / pattern-level document; the runbook is the tactical / step-by-step.

---

## 4. Post-cutover monitoring

For the 30 days after cutover:

| Day | Check | Action if failing |
|---|---|---|
| Day 0 (cutover day) | All 4 tiers render at new canonical | Rollback per the per-product cutover plan |
| Day 0 + 1 hour | Legacy 301 emits correctly | Re-apply redirect rule; verify DNS propagation |
| Day 1 | First-day 404 log review | Add missing path mappings |
| Day 7 | First weekly review — 404 trends + audit re-run | Compare audit health score to pre-cutover baseline; investigate regressions |
| Day 14 | Second weekly review | Retire any one-off path mappings that no longer fire |
| Day 30 | Final review | Mark legacy domain `status: 'retired'` in `productDomains.js` |
| Day 60 | Optional — delete legacy DNS record | Only after confirming zero traffic |

**Do not delete the legacy DNS record before day 60.** Search engines, partner integrations, press references, and bookmarks take that long to fully re-index.

---

## 5. Per-product migration metadata

Source of truth: [`/api/_lib/productDomains.js`](../api/_lib/productDomains.js)

| Product | Live today | Target | Legacy domains | Status |
|---|---|---|---|---|
| **SAIGE** | `saigedemo.com` | `saigeplatform.com` | `saigedemo.com → /live-demo` | Cutover planned — see [`saige-cutover-plan.md`](audits/saige-cutover-plan.md) |
| **PressAI** | `ourpublishingai.com` | TBD | none captured | Decision pending — Victor |
| **MyBirthSafe** | `safe-path.base44.app` | TBD | none captured | Pre-launch — restore from error state first |
| **RelTwin** | unknown | TBD | none captured | URL confirmation pending — Victor |
| **ReachSMS** | unknown | TBD | none captured | URL confirmation pending — Victor |

When any of these change, update `productDomains.js`. The seed loaders in `configRegistry.js` and `admin/seed.js` automatically pick up the change.

---

## Appendix — Generic 301 redirect rule template

For Cloudflare Page Rules:

```
URL pattern:   *legacy.com/*
Setting:       Forwarding URL
Status:        301 Permanent Redirect
Destination:   https://canonical.com/$1
```

For Vercel `vercel.json` (when both legacy + canonical are on Vercel):

```json
{
  "redirects": [
    { "source": "/(.*)", "destination": "https://canonical.com/target-path/$1", "permanent": true, "has": [{ "type": "host", "value": "legacy.com" }] }
  ]
}
```

For Apache `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^legacy\.com$ [NC]
RewriteRule ^(.*)$ https://canonical.com/$1 [R=301,L]
```

For Nginx:

```nginx
server {
    server_name legacy.com;
    return 301 https://canonical.com$request_uri;
}
```

---

## Open questions queued for Victor

- **PressAI domain strategy:** Is `ourpublishingai.com` the canonical going forward, or migrating to a new domain (e.g., `pressai.com` if available)? Decision affects whether legacy redirect work applies.
- **MyBirthSafe:** Once the Base44 app is restored, which domain is canonical going forward? Today's `safe-path.base44.app` is functional but reads as a placeholder.
- **RelTwin / ReachSMS:** Confirm canonical URLs so cutover plans can be drafted.
