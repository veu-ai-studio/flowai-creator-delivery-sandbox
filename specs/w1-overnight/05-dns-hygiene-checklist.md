# 05 — DNS hygiene cross-check

Date: 2026-05-07
**No DNS lookups performed.** This is a spec-only review.

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-dns/*` | **MISSING** — directory does not exist |
| `docs/w1-dns*` | **MISSING** |
| `dnsconfig.js`, `octodns.yaml`, `dns-zones/*`, BIND zone files | **MISSING** at every depth |

Repo-wide grep for `\bSPF\b`, `\bDKIM\b`, `\bDMARC\b`, `\bCAA\b`:
- **Zero substantive hits.** The only match is `specs/w1-overnight/04-cloudflare-checklist.md:119` (this overnight pack itself).

`MX` / `TXT` substring matches in `src/**` are all incidental (JSX class names, identifier substrings) — none describe a DNS record.

## 2. The 8 VEU domains and their email-sending posture

Per Job 1 §1 and `docs/ENV_VARS.md:88–99`, the only outbound email integration in code today is **Resend** (`api/_lib/email.js`). When `RESEND_API_KEY` and `EMAIL_FROM` are set, mail is sent from `EMAIL_FROM` (default `'FlowAI <hello@veu.ai>'` per `api/_lib/email.js`).

This means:
- The **send-from domain** is `veu.ai` (default) or whatever Victor configures via `EMAIL_FROM`. All eight VEU domains are *recipient domains* in code today. None are wired as send-from in the committed defaults.
- However, every product email pattern in code uses `<product>@veuaistudio.com` (e.g. `saige@veuaistudio.com`, `pressai@veuaistudio.com` per `src/pages/CapabilityInstallSelfRenewal.jsx:23, 30, 37`; `privacy@veuaistudio.com`, `legal@veuaistudio.com`, `demo@veuaistudio.com` per `src/pages/PrivacyPolicy.jsx:24, 32`, `src/pages/TermsOfUse.jsx:32`, `src/pages/EnterpriseDemo.jsx:307–313`). So `veuaistudio.com` is the **de facto** send-from domain that needs SPF/DKIM/DMARC alignment with Resend.

## 3. Per-record per-domain spec status

For each record type, "Spec status" = whether the (missing) W1 spec defines it. "Recommended" = the standard hygiene posture for the role the domain plays.

### 3.1 SPF (TXT @ root)

| Domain | Spec status | Recommended (gap until spec lands) |
|---|---|---|
| `saigeplatform.com` | NOT DEFINED | `v=spf1 include:_spf.resend.com -all` (assuming Resend is the sender) |
| `saigedemo.com` | NOT DEFINED | Same — until cutover redirect, mail is sent from `*@veuaistudio.com` so `saigedemo.com` only needs SPF if it ever sends mail; otherwise `v=spf1 -all` (reject) |
| `ourpublishingai.com` | NOT DEFINED | If product does send mail: `v=spf1 include:_spf.resend.com -all`; otherwise `v=spf1 -all` |
| `reltwin.com` | NOT DEFINED | Same |
| `victorudo.com` | NOT DEFINED | Personal — pick send-from MTA, configure accordingly |
| `veuaistudio.com` | NOT DEFINED | **Mandatory** — `v=spf1 include:_spf.resend.com -all` since this is the de facto send-from domain in code |
| `ourcommunitiesai.com` | NOT DEFINED | Domain not in DNS at all per audit; SPF moot until registered |
| `sustainabilityleadership.com` | NOT DEFINED | Domain not referenced anywhere in code; ownership unverified |

### 3.2 DKIM (CNAME or TXT, selector-based)

| Domain | Spec status | Recommended |
|---|---|---|
| `saigeplatform.com` | NOT DEFINED | If sender: Resend will issue `resend._domainkey` selector + provide CNAME pair. Action: provision via Resend dashboard once domain is verified. |
| `saigedemo.com` | NOT DEFINED | Same as above (only if it sends) |
| `ourpublishingai.com` | NOT DEFINED | Same |
| `reltwin.com` | NOT DEFINED | Same |
| `victorudo.com` | NOT DEFINED | Per chosen MTA |
| `veuaistudio.com` | NOT DEFINED | **Mandatory** — Resend selector CNAMEs |
| `ourcommunitiesai.com` | NOT DEFINED | Moot until registered |
| `sustainabilityleadership.com` | NOT DEFINED | Ownership unverified |

### 3.3 DMARC (TXT _dmarc.<domain>)

| Domain | Spec status | Recommended |
|---|---|---|
| `saigeplatform.com` | NOT DEFINED | Start `v=DMARC1; p=none; rua=mailto:dmarc@veuaistudio.com; pct=100`; tighten to `quarantine` then `reject` once aligned |
| `saigedemo.com` | NOT DEFINED | Same — but if domain never sends, jump to `p=reject` |
| `ourpublishingai.com` | NOT DEFINED | Same monitoring-first approach |
| `reltwin.com` | NOT DEFINED | Same |
| `victorudo.com` | NOT DEFINED | Personal — at minimum `p=none` with rua aggregator |
| `veuaistudio.com` | NOT DEFINED | **Mandatory** — start at `p=none`, tighten after aggregate reports show 100% alignment |
| `ourcommunitiesai.com` | NOT DEFINED | Moot until registered |
| `sustainabilityleadership.com` | NOT DEFINED | Ownership unverified |

### 3.4 CAA (TXT 0 issue, 0 issuewild)

| Domain | Spec status | Recommended |
|---|---|---|
| `saigeplatform.com` | NOT DEFINED | `0 issue "letsencrypt.org"` + `0 issue "digicert.com"` (or whichever Vercel uses) + `0 iodef "mailto:security@veuaistudio.com"` |
| `saigedemo.com` | NOT DEFINED | Same — pin to whichever CA Cloudflare/Vercel issues from |
| `ourpublishingai.com` | NOT DEFINED | Same |
| `reltwin.com` | NOT DEFINED | Same |
| `victorudo.com` | NOT DEFINED | Same |
| `veuaistudio.com` | NOT DEFINED | Same — must include any wildcard issuance for `*.demo.veuaistudio.com` per `specs/w4-overnight/09-demo-namespace.md:104` |
| `ourcommunitiesai.com` | NOT DEFINED | Moot |
| `sustainabilityleadership.com` | NOT DEFINED | Ownership unverified |

### 3.5 Auxiliary (BIMI, MTA-STS, TLS-RPT) — not requested but flagged for completeness

Spec is silent on all three across all 8 domains. These are post-DMARC-reject hardening; not blocking for W1, but should be added to the spec scope.

## 4. Gaps where spec is silent

The spec is silent on **every** record type for **every** domain. Specifically:

1. No SPF posture authored for any domain.
2. No DKIM key/selector decision documented.
3. No DMARC reporting address chosen (`rua=mailto:?`); no rollout schedule (`p=none → quarantine → reject`).
4. No CAA pinning chosen — production zones are wide open to any CA.
5. No mail-flow contract documenting whether `saigeplatform.com`, `saigedemo.com`, `ourpublishingai.com`, `reltwin.com`, `ourcommunitiesai.com`, `sustainabilityleadership.com` are intended to ever send mail. Until that decision is made, the spec cannot pick between "configure SPF/DKIM/DMARC for sender alignment" and "configure null-SPF + reject DMARC" for each.
6. No DNSSEC posture (signed vs unsigned zones). Cloudflare DNS supports DNSSEC one-click; spec should declare on/off per zone.
7. No mail-recipient hygiene (`MX` records) audited.
8. No reverse-DNS / PTR posture for any send-from origin.

## 5. Per-domain readiness

| Domain | DNS records spec'd | Sender role spec'd | Net |
|---|---|---|---|
| `saigeplatform.com` | NO | NO | **Blocked on spec** |
| `saigedemo.com` | NO | NO | **Blocked on spec** |
| `ourpublishingai.com` | NO | NO | **Blocked on spec** |
| `reltwin.com` | NO | NO | **Blocked on spec + domain confirmation** |
| `victorudo.com` | NO | NO | **Blocked on spec** |
| `veuaistudio.com` | NO | **De facto sender per code** but no records spec'd | **Critical — corporate identity domain has no SPF/DKIM/DMARC/CAA spec** |
| `ourcommunitiesai.com` | NO | NO | **Blocked on registration** |
| `sustainabilityleadership.com` | NO | NO | **Blocked on inventory + spec** |

## 6. Verdict

Zero of the 8 domains has documented SPF / DKIM / DMARC / CAA posture in the repo. The most urgent gap is `veuaistudio.com`, which is referenced in code as the from-address for at least 7 distinct outbound flows (privacy, legal, demo, per-product self-renewal contacts) and would suffer DMARC failure if Resend ever sends without aligned DKIM. The W1 DNS spec must be authored, and the mail-flow contract must declare which domains send mail before any record can be pinned.
