# 05 — Cloudflare configuration deep dive (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `04-cloudflare-checklist.md`. Part 1 confirmed the spec gap; Part 2 turns that into concrete per-domain recommended config the W1 spec author can lift directly.

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-cloudflare/*` | **MISSING** (re-verified) |
| `docs/w1-cloudflare*` | **MISSING** |
| `wrangler.toml`, `_headers`, `_redirects`, `cloudflare.toml`, `cloudflare.json` | **MISSING** at every depth |

## 2. Domain-role classification (drives policy)

Per `api/_lib/productDomains.js`, `src/pages/ProductRegistry.jsx`, `src/components/governance/PortfolioQuickSelect.jsx`, audit reports, and the user's brief:

| Domain | Role class | Indexability | Public-facing? | Notes |
|---|---|---|---|---|
| `saigeplatform.com` | Product canonical (planned) | Public | YES | SAIGE target_url; not yet redirected |
| `saigedemo.com` | Product live (legacy) | Public | YES | SAIGE current; legacy 301 to `saigeplatform.com/live-demo` planned |
| `ourpublishingai.com` | Product live | Public | YES | PressAI live |
| `reltwin.com` | Product canonical (TBD) | Public | UNKNOWN | `live_url` empty in `productDomains.js:103` |
| `victorudo.com` | Personal / thought-leadership | Public | YES | `PortfolioQuickSelect.jsx:13` |
| `veuaistudio.com` | Corporate root + email-sender + demo subdomain root | Public + sender | YES | Critical — used as `*.demo.veuaistudio.com` (`specs/w4-overnight/09-demo-namespace.md:104`) |
| `ourcommunitiesai.com` | ReachSMS (DNS-broken) | N/A | NO | `ERR_NAME_NOT_RESOLVED` per `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:23` |
| `sustainabilityleadership.com` | Unknown | N/A | UNKNOWN | Zero matches in repo; ownership unverified |

## 3. Per-control recommended config

Recommended values are written so the W1 spec author can paste them into a Cloudflare Terraform module or the dashboard's UI directly.

### 3.1 SSL / TLS

Apply identically across all 8 zones:

| Setting | Value |
|---|---|
| SSL/TLS encryption mode | **Full (strict)** |
| Minimum TLS version | **1.2** |
| TLS 1.3 | **Enabled** |
| Opportunistic encryption | **On** |
| Automatic HTTPS Rewrites | **On** |
| Always Use HTTPS | **On** |
| HSTS | See §3.2 |
| Authenticated Origin Pulls | **On** for the 4 product domains where origin is Vercel; **N/A** for `ourcommunitiesai.com` (no origin yet) and `sustainabilityleadership.com` (unverified) |

### 3.2 Security headers

Set via Cloudflare Transform Rules (Modify Response Header) at the zone level. Apply to all production zones except where noted.

| Header | Value | Apply to |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | All zones once HTTPS is verified end-to-end. Add `preload` only after submitting to hstspreload.org. |
| `X-Content-Type-Options` | `nosniff` | All zones |
| `X-Frame-Options` | `DENY` for all except embed-friendly demos; `SAMEORIGIN` for `*.demo.veuaistudio.com` if iframed live | All zones |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | All zones |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | All zones |
| `Content-Security-Policy` | See §3.3 (per-domain template) | All zones |
| `Cross-Origin-Opener-Policy` | `same-origin` | All zones |
| `Cross-Origin-Resource-Policy` | `same-site` | All zones |

`src/vercel.json:54–60` currently sets `Access-Control-Allow-Origin: *`. **Tighten to per-product allow-list** before HSTS preload.

### 3.3 CSP template (per product zone)

Replace `<asset-host>` with the actual Vercel asset host once known.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.base44.com https://*.base44.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self'
    https://api.anthropic.com
    https://chrome.browserless.io
    https://api.openai.com
    https://api.inngest.com
    https://*.supabase.co
    https://api.resend.com
    https://api.voyageai.com
    https://api.axiom.co
    https://app.base44.com
    https://*.base44.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
  report-uri /api/csp-report;
```

`'unsafe-inline'` and `'unsafe-eval'` will need a tightening pass after Vite's hashed-bundle strategy is verified. Start with report-only mode (`Content-Security-Policy-Report-Only`) for 7 days, fix violations, then enforce.

### 3.4 WAF — Managed Rules + custom

| Rule | Setting |
|---|---|
| Cloudflare Managed Ruleset | **Enabled, default sensitivity** |
| OWASP Core Ruleset | **Enabled, paranoia 1, action: block** for matches >= score 60 |
| Custom rule: admin path challenge | `(http.request.uri.path matches "^/api/admin/.*") or (http.request.uri.path matches "^/api/marketplace/admin/.*") → Managed Challenge` |
| Custom rule: Inngest callback bypass | `(http.request.uri.path eq "/api/inngest") and (cf.bot_management.verified_bot) → Skip WAF` (path receives signed payloads from Inngest's control plane; sig verified by `INNGEST_SIGNING_KEY` per `api/_lib/inngest.js:152`) |
| Custom rule: Stripe webhook bypass (when integrated) | `(http.request.uri.path eq "/api/billing/stripe-webhook") and (ip.src in $stripe_webhook_ips) → Skip WAF` |
| Country block list | None initially. Add only on incident. |

### 3.5 Bot management

| Setting | Value |
|---|---|
| Bot Fight Mode | **Enabled** for `victorudo.com`, `sustainabilityleadership.com` (low-traffic personal/marketing) |
| Super Bot Fight Mode | **Enabled** for `saigeplatform.com`, `saigedemo.com`, `ourpublishingai.com`, `reltwin.com`, `veuaistudio.com` once paid plan is in place. Until then, Bot Fight Mode. |
| Verified-bots allow list | Googlebot, Bingbot, DuckDuckBot, AnthropicAI, OAI-SearchBot, ClaudeBot |
| Custom UA allow-list | Browserless rendering origin (see `api/_lib/crawler.js:83, 269, 365`); GitHub webhook UA |
| AI Crawler control | **Block** for product canonical zones (`saigeplatform.com`, `ourpublishingai.com`, `reltwin.com`); **Allow** for marketing zones (`victorudo.com`, `veuaistudio.com`) |

### 3.6 Rate limiting (Cloudflare Rate Limiting Rules)

| Path pattern | Threshold | Action |
|---|---|---|
| `/api/leads/capture` | 8 req / IP / minute | **Block** (mirrors app-level limit per `api/leads/capture.js`) |
| `/api/admin/*`, `/api/marketplace/admin/*` | 30 req / IP / minute | **Managed Challenge** |
| `/api/configuration/*` | 60 req / IP / minute | Block |
| `/api/contact*` | 5 req / IP / minute | Block |
| `/api/orchestrator/*` | 120 req / IP / minute | Block |
| `/api/diagnostic`, `/api/version`, `/api/health` | 240 req / IP / minute | Block (these are status pings) |
| Anything under `/admin*` (UI) | 30 req / IP / minute | Managed Challenge |
| Default for `/api/*` | 600 req / IP / hour | Log only |

### 3.7 robots.txt (per zone)

#### Product canonical zones (`saigeplatform.com`, `ourpublishingai.com`, `reltwin.com`)

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Sitemap: https://<zone>/sitemap.xml
```

#### Demo / legacy zones (`saigedemo.com`)

Until cutover-redirected:

```
User-agent: *
Disallow: /
```

After 301 cutover to `saigeplatform.com/live-demo`, robots.txt becomes irrelevant (308/301 follows).

#### Corporate / sender zone (`veuaistudio.com`)

```
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://veuaistudio.com/sitemap.xml
```

For demo subdomains under `*.demo.veuaistudio.com`:

```
User-agent: *
Disallow: /
```

#### Personal zone (`victorudo.com`)

```
User-agent: *
Allow: /
Sitemap: https://victorudo.com/sitemap.xml
```

#### Reserved / unverified zones (`ourcommunitiesai.com`, `sustainabilityleadership.com`)

Until ownership / DNS confirmed, block all:

```
User-agent: *
Disallow: /
```

### 3.8 X-Robots-Tag (response header)

Set via Cloudflare Transform Rule:

| Zone / path | Header value |
|---|---|
| `*.demo.veuaistudio.com` (any path) | `noindex, nofollow, noarchive` |
| `<zone>/admin*`, `<zone>/api/admin/*` for any product zone | `noindex, nofollow` |
| `<zone>/api/*` | `noindex` (API responses shouldn't appear in any index) |
| `saigedemo.com` until cutover | `noindex` |
| `ourcommunitiesai.com`, `sustainabilityleadership.com` | `noindex, nofollow` (ownership unverified) |
| All other paths on production zones | (none — let default indexing apply) |

### 3.9 Page Rules / Transform Rules

Apply at the zone level:

| Rule | Setting |
|---|---|
| `saigedemo.com/*` (legacy) | 301 → `https://saigeplatform.com/live-demo` (driven by `api/_lib/productDomains.js:listActiveLegacyRedirects()`) |
| `<zone>/api/*` | Cache Level: **Bypass** |
| `<zone>/assets/*`, `<zone>/_next/*`, `<zone>/*.js`, `<zone>/*.css` | Cache Level: **Cache Everything**; Edge TTL 30 days |
| `<zone>/index.html`, `<zone>/` | Cache Level: **Bypass** (SPA index — must always serve fresh) |

### 3.10 DNSSEC

| Zone | DNSSEC | Notes |
|---|---|---|
| `saigeplatform.com` | **Enable** | One-click via Cloudflare DNS once registrar DS record is published |
| `saigedemo.com` | **Enable** | Same |
| `ourpublishingai.com` | **Enable** | Same |
| `reltwin.com` | **Enable** | Same — but only after registrar confirmed |
| `victorudo.com` | **Enable** | Same |
| `veuaistudio.com` | **Enable** | Same — high priority since it's the email sender |
| `ourcommunitiesai.com` | N/A | Domain not in DNS yet |
| `sustainabilityleadership.com` | N/A | Ownership unverified |

## 4. Per-domain readiness matrix

Rows are domains; columns are control families. Cells show **what spec must say** then **what's required to deploy**.

| Domain | TLS | Headers | WAF | Bots | Rate-limit | robots.txt | X-Robots-Tag | Page Rules | DNSSEC |
|---|---|---|---|---|---|---|---|---|---|
| `saigeplatform.com` | §3.1 | §3.2 + §3.3 | §3.4 | §3.5 (Super) | §3.6 | §3.7 product | §3.8 admin paths | §3.9 (incl. demo legacy 301 if both zones share) | §3.10 enable |
| `saigedemo.com` | §3.1 | §3.2 (no preload until redirected) | §3.4 | §3.5 (Super) | §3.6 | §3.7 demo (Disallow /) | §3.8 noindex zone-wide | §3.9 — legacy 301 to `saigeplatform.com/live-demo` | §3.10 enable |
| `ourpublishingai.com` | §3.1 | §3.2 + §3.3 | §3.4 | §3.5 (Super) | §3.6 | §3.7 product | §3.8 admin paths | §3.9 | §3.10 enable |
| `reltwin.com` | §3.1 | §3.2 + §3.3 | §3.4 | §3.5 (Super) | §3.6 | §3.7 product | §3.8 admin paths | §3.9 | §3.10 enable; **blocked on `live_url` confirmation** |
| `victorudo.com` | §3.1 | §3.2 + §3.3 (relaxed) | §3.4 | §3.5 (Bot Fight) | §3.6 (relaxed) | §3.7 personal | §3.8 admin paths | §3.9 | §3.10 enable |
| `veuaistudio.com` | §3.1 | §3.2 + §3.3 | §3.4 | §3.5 (Super) | §3.6 | §3.7 corp + demo subdomain block | §3.8 demo subdomain noindex | §3.9 | §3.10 enable — **highest priority** |
| `ourcommunitiesai.com` | N/A until registered | N/A | N/A | N/A | N/A | §3.7 reserved (Disallow /) | §3.8 noindex,nofollow | N/A | N/A |
| `sustainabilityleadership.com` | N/A until verified | N/A | N/A | N/A | N/A | §3.7 reserved (Disallow /) | §3.8 noindex,nofollow | N/A | N/A |

## 5. Provisioning checklist (in order)

1. Verify ownership of all 8 domains; register `ourcommunitiesai.com` or remove from `productDomains.js`; verify `sustainabilityleadership.com`
2. Confirm `reltwin.com` `live_url` (currently empty in `productDomains.js:103`)
3. Add all zones to a single Cloudflare account
4. Enable DNSSEC per §3.10 for the 6 verified zones
5. Set TLS / headers per §3.1, §3.2, §3.3 (CSP in report-only mode for 7 days first)
6. Enable WAF + bot management per §3.4, §3.5
7. Author and deploy robots.txt + X-Robots-Tag rules per §3.7, §3.8
8. Configure rate-limit rules per §3.6
9. Configure transform/page rules per §3.9 (especially the `saigedemo.com` legacy 301)
10. Tighten CSP from report-only to enforce after observing 7 days of reports
11. Submit `veuaistudio.com` (and other ready zones) to hstspreload.org

## 6. Verdict

| Aspect | State |
|---|---|
| Specification | NOT WRITTEN — this report is the closest thing to a draft spec |
| Cloudflare account / zones | Status unknown (out-of-repo) |
| Pre-deploy blockers | Domain registration (`ourcommunitiesai.com`), ownership confirmation (`sustainabilityleadership.com`), `reltwin.com` URL confirmation |

This file plus a ~2-day Cloudflare provisioning sprint would close the W1 Cloudflare workstream. Most of the work is configuration, not code. The largest risk is the CSP — start with report-only mode and budget time for fixing violations before enforcement.
