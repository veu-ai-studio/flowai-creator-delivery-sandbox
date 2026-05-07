# 04 — Cloudflare configuration deep dive

Date: 2026-05-07

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-cloudflare/*` | **MISSING** — directory does not exist |
| `docs/w1-cloudflare*` | **MISSING** |
| `cloudflare.toml`, `wrangler.toml`, `_headers`, `_redirects`, `cloudflare.json` | **MISSING** at every depth (Glob `**/cloudflare*` returns only `node_modules/inngest/cloudflare.*`) |
| Cloudflare-related code | None |

References to Cloudflare across the repo (informational only, no live integration):

| File:line | What it says |
|---|---|
| `specs/w3-overnight/03-vendor-locks.md:14, 32, 57` | Lists "Cloudflare Bot Management" as a W0-locked vendor; reports "Missing from `TOOL_REGISTRY`" |
| `src/docs/w2/v3-defect-register.md:79` | D-017 IP-protection baseline mentions "W1 Cloudflare baseline" as the interim solution |
| `base44/functions/selfProtection/entry.ts:64` | LLM prompt-string mentions "Enable Cloudflare or similar WAF" as a recommendation the model should suggest — not a real integration |
| `docs/RUNBOOK.md`, `docs/MIGRATION_PLAYBOOK.md`, `docs/audits/saige-cutover-plan.md` | Cloudflare named in context of future cutover; no concrete config |
| `scripts/generate-marketplace-taxonomy.mjs`, `docs/MARKETPLACE_TAXONOMY.md`, `docs/MARKETPLACE_PROVIDER_GUIDE.md`, `api/_lib/marketplaceSeed.js` | Marketplace taxonomy mentions Cloudflare as a vendor name |

**There is no W1 Cloudflare specification in this repo, and no Cloudflare configuration committed to disk.** The report below is therefore a **gap checklist**: for every standard Cloudflare-zone control, it states whether the spec defines the policy explicitly, by default, or not at all.

## 2. The 8 VEU domains

Source for the canonical list: user-supplied; cross-referenced against `api/_lib/productDomains.js`, `src/pages/ProductRegistry.jsx`, `src/components/governance/PortfolioQuickSelect.jsx`, `src/pages/DomainManager.jsx`, `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md`.

| # | Domain | Role per code/docs | Evidence |
|---|---|---|---|
| 1 | `saigeplatform.com` | SAIGE — planned canonical (target_url) | `api/_lib/productDomains.js:53` |
| 2 | `saigedemo.com` | SAIGE — current live (legacy) | `api/_lib/productDomains.js:52, 56` |
| 3 | `ourpublishingai.com` | PressAI — current live | `api/_lib/productDomains.js:74` |
| 4 | `reltwin.com` | RelTwin — canonical (TBD per code; live_url empty in `productDomains.js:103`) | mentioned by user; not yet set in `productDomains.js` |
| 5 | `victorudo.com` | Victor Udo personal hub | `src/components/governance/PortfolioQuickSelect.jsx:13` |
| 6 | `veuaistudio.com` | VEU AI Studio LLC — corporate root | `src/pages/TermsOfUse.jsx:32`, `src/pages/PrivacyPolicy.jsx:24, 32`, `src/pages/OrgSettings.jsx:33`, `src/pages/EnterpriseDemo.jsx:307`, `src/pages/CapabilityInstallSelfRenewal.jsx:23, 30, 37`, `specs/w4-overnight/09-demo-namespace.md:104, 149` |
| 7 | `ourcommunitiesai.com` | ReachSMS — registry says "active" but DNS fails (per audit) | `src/pages/ProductRegistry.jsx:16`, `src/pages/PortfolioDashboard.jsx:17`, `src/pages/Clearance.jsx:19`, `src/data/demo/products.json:36`, `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:23, 93` (ERR_NAME_NOT_RESOLVED) |
| 8 | `sustainabilityleadership.com` | Not referenced anywhere in the repo | (zero matches) |

Two flags worth surfacing:
- `reltwin.com` is named by the user but `api/_lib/productDomains.js:103` lists `live_url: ''` for RelTwin. Domain ownership unverified in code.
- `ourcommunitiesai.com` failed DNS lookup at audit time (per `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:23`). Cloudflare configuration cannot proceed until registration/DNS is established.
- `sustainabilityleadership.com` is not mentioned anywhere in the codebase.

## 3. Configuration checklist (per Cloudflare control)

For each control: "Spec status" answers *what does the W1 spec say?*; "Repo evidence" answers *what is committed today?*. No live Cloudflare API was queried.

### 3.1 WAF (Web Application Firewall)

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC.** `specs/w1-cloudflare/*` does not exist. The only WAF mention is `D-017` in `src/docs/w2/v3-defect-register.md:79` ("Interim: W4 headers + W1 Cloudflare baseline") which is aspirational. | None |

**Required when spec lands:** managed ruleset (OWASP Core), custom challenge for `/api/admin/*` and `/api/marketplace/admin/*`, per-zone exceptions for `/api/inngest/*` (signed callbacks).

### 3.2 Bot management

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC.** "Cloudflare Bot Management" is W0-locked per `specs/w3-overnight/03-vendor-locks.md:14` but listed as **missing from registry** in the same file (line 32). | None |

**Required when spec lands:** verified-bot allow-list (Googlebot, Bingbot), challenge mode for unverified bots, allow-list for the Browserless rendering origin (referenced by `api/_lib/crawler.js:83, 269, 365`).

### 3.3 robots.txt

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC.** No robots.txt mentioned in any W1 doc. The string `robots.txt` appears only in `base44/functions/selfProtection/entry.ts:42, 53` as an LLM-generated recommendation, not as a real artifact. | No `robots.txt` file in `public/`, `dist/`, or any repo root. |

**Required when spec lands:** per-domain robots.txt — for `*.demo.veuaistudio.com` (per `specs/w4-overnight/09-demo-namespace.md:104`) the convention should be `Disallow: /` to keep demos out of search indices; for `veuaistudio.com` and `saigeplatform.com` corporate marketing, the standard `Allow: /` with sitemap reference.

### 3.4 X-Robots-Tag header

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC.** Zero mentions of `X-Robots-Tag` anywhere in the repo. | None |

**Required when spec lands:** `X-Robots-Tag: noindex, nofollow` for `*.demo.veuaistudio.com` and any `/admin*` paths; default behaviour for production marketing pages.

### 3.5 Rate limiting

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO ZONE-LEVEL SPEC.** No Cloudflare rate-limit rule defined anywhere. | App-level rate limits present in code: `api/leads/capture.js` ("Rate-limit 8/min/IP" per `tests/W4_OVERNIGHT_REPORT.md:68`); selfProtection prompt-string mentions "Rate limiting enabled: 100 req/min per IP" but that's a fictitious applied-rule the LLM emits. |

**Required when spec lands:** zone-level rate limit on `/api/leads*`, `/api/admin*`, `/api/configuration/*`, `/api/contact*`. Provider-specific limits should mirror the app-level limits already in code.

### 3.6 Security headers

| Header | Spec status | Repo evidence |
|---|---|---|
| `Strict-Transport-Security` (HSTS) | **NO SPEC** | None — Grep returns 0 hits |
| `Content-Security-Policy` | **NO SPEC**; only `selfProtection/entry.ts:67` LLM prompt mentions "Enable Content Security Policy headers" as a recommendation | None enforced |
| `X-Frame-Options` | **NO SPEC** | None — Grep returns 0 hits in code; `specs/w4-overnight/02-vercel-config.md:81` notes the absence ("security headers (CSP, X-Frame-Options, HSTS) are not configured in vercel.json") |
| `X-Content-Type-Options` | **NO SPEC** | None |
| `Referrer-Policy` | **NO SPEC** | None |
| `Access-Control-Allow-Origin: *` | **PRESENT (and overly permissive)** | `src/vercel.json:54–60` declares `Access-Control-Allow-Origin: *`, `Methods: GET,POST,OPTIONS`, `Headers: Content-Type` |

**Required when spec lands:** at minimum HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a CSP that pins the Vite asset host + Anthropic / Browserless / Inngest API hosts. The `Access-Control-Allow-Origin: *` in `src/vercel.json` should be tightened to a per-product allow-list.

### 3.7 SSL/TLS configuration

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC** for SSL mode (Full / Full strict / Flexible), TLS version floor, cipher suite, automatic HTTPS rewrites, Always-Use-HTTPS, ECH, 0-RTT. | None |

**Required when spec lands:** Full (strict) mode, TLS 1.2 floor (1.3 preferred), Always-Use-HTTPS on, automatic HTTPS rewrites on. Origin certificate pinning per Vercel-fronted backend.

### 3.8 Page Rules / Transform Rules / Workers / Cache

| Domain | Spec status | Repo evidence |
|---|---|---|
| All 8 | **NO SPEC.** No page rule / transform rule / worker / cache policy defined. | The only routing logic in the repo is the SPA fallback rewrite in `vercel.json:5` and `src/vercel.json:39–48`. Cloudflare cache TTLs not addressed. |

**Required when spec lands:** legacy-domain redirect rules per `api/_lib/productDomains.js:listActiveLegacyRedirects()` (e.g. `saigedemo.com/*` → `saigeplatform.com/live-demo`), API-path cache bypass, asset-host long-cache.

### 3.9 DNSSEC + CAA (called out separately in DNS report)

See `05-dns-hygiene-checklist.md`.

## 4. Per-domain readiness matrix

| Domain | DNS exists? | Cloudflare-fronted today? | W1 spec covers it? | Net readiness |
|---|---|---|---|---|
| `saigeplatform.com` | Unknown (planned canonical) | Unknown | NO | **Blocked on spec** |
| `saigedemo.com` | Yes (per `live_url`) | Unknown | NO | **Blocked on spec** |
| `ourpublishingai.com` | Yes (live URL in code) | Unknown | NO | **Blocked on spec** |
| `reltwin.com` | Unknown — `productDomains.js:103` shows empty `live_url` | Unknown | NO | **Blocked on domain confirmation + spec** |
| `victorudo.com` | Yes (referenced) | Unknown | NO | **Blocked on spec** |
| `veuaistudio.com` | Yes (email domain in use across `src/pages/*`) | Unknown | NO | **Blocked on spec** |
| `ourcommunitiesai.com` | **NO** — DNS fail per `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:23` | N/A | NO | **Blocked on registration** |
| `sustainabilityleadership.com` | Not referenced in repo | Unknown | NO | **Blocked on inventory + spec** |

## 5. Verdict

| Control | Spec status across all 8 domains |
|---|---|
| WAF rules | NO SPEC |
| Bot management | NO SPEC |
| robots.txt | NO SPEC, no artifact |
| X-Robots-Tag | NO SPEC |
| Rate limiting (zone-level) | NO SPEC; app-level present for `/api/leads/capture` only |
| HSTS | NO SPEC |
| CSP | NO SPEC |
| X-Frame-Options | NO SPEC |
| X-Content-Type-Options | NO SPEC |
| Referrer-Policy | NO SPEC |
| TLS / SSL mode | NO SPEC |
| Page Rules / Transform Rules | NO SPEC |
| Legacy domain 301 redirects | Partial — codified in `api/_lib/productDomains.js:listActiveLegacyRedirects()` but not provisioned at Cloudflare |
| Per-domain inventory | Partial — 7 of 8 domains referenced; `sustainabilityleadership.com` absent; `ourcommunitiesai.com` DNS-broken; `reltwin.com` `live_url` empty in code |

**Overall:** Cloudflare configuration is at "specification gap" stage. The W1 spec must be authored before any control can be checked off as ready. Three independent blockers exist before configuration can begin: (1) the spec itself, (2) DNS for `ourcommunitiesai.com`, (3) inventory for `sustainabilityleadership.com` and `reltwin.com`.
