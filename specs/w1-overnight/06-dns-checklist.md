# 06 — DNS hygiene cross-check (Part 2)

Date: 2026-05-07
**No DNS lookups performed.**
**Supersedes** Part 1's `05-dns-hygiene-checklist.md`. Part 1 confirmed the spec gap. Part 2 produces concrete record values the W1 spec author can lift directly.

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-dns/*` | **MISSING** (re-verified) |
| `docs/w1-dns*` | **MISSING** |
| `dnsconfig.js`, `octodns.yaml`, BIND zone files | **MISSING** |
| `\bSPF\b` / `\bDKIM\b` / `\bDMARC\b` / `\bCAA\b` substantive matches in repo | 0 |

## 2. Sender-vs-recipient classification

The repo's actual mail-sending posture (per Job 1 §1 and `api/_lib/email.js:143`):

- `EMAIL_FROM` default `'FlowAI <hello@veu.ai>'` — but Victor's product code uses `<product>@veuaistudio.com` for every product mailbox (`src/pages/CapabilityInstallSelfRenewal.jsx:23, 30, 37`; `src/pages/PrivacyPolicy.jsx:24, 32`; `src/pages/TermsOfUse.jsx:32`; `src/pages/EnterpriseDemo.jsx:307–313`; `src/pages/CapabilityPackageSelfProtection.jsx:191, 202`; `src/pages/OrgSettings.jsx:33`). **Practical send-from domain: `veuaistudio.com`.**

| Domain | Send mail? | Receive mail? | Posture |
|---|---|---|---|
| `saigeplatform.com` | NO (decision needed) | NO | If never-sender: null SPF + reject DMARC |
| `saigedemo.com` | NO | NO | Same — null SPF + reject DMARC |
| `ourpublishingai.com` | UNKNOWN — PressAI may want product email | UNKNOWN | Default: null SPF + reject DMARC; switch to send-from when activated |
| `reltwin.com` | UNKNOWN | UNKNOWN | Same |
| `victorudo.com` | UNKNOWN — personal brand may want email | UNKNOWN | Same |
| `veuaistudio.com` | **YES — primary** | YES (legal@, privacy@, demo@, dmarc@, dmca@, security@) | Active sender; full alignment required |
| `ourcommunitiesai.com` | NO (DNS broken) | NO | N/A until registered |
| `sustainabilityleadership.com` | UNKNOWN | UNKNOWN | N/A until verified |

## 3. Recommended records — `veuaistudio.com` (the only active sender)

These values assume Resend is the MTA (per `api/_lib/email.js:22, 26`).

### 3.1 MX

```
@                           IN  MX  10 inbound.mxprovider.example.com.
```
Pick a real inbound MX once decided. Microsoft 365 / Google Workspace / Fastmail are the standard options. Spec must declare which.

### 3.2 SPF

```
@                           IN  TXT  "v=spf1 include:_spf.resend.com -all"
```

`-all` (hard fail) is correct for a primary sender domain with one MTA. Add additional `include:` entries when secondary senders (Stripe receipts via `noreply@stripe.com`, Sentry alerts, etc.) are added — never widen to `~all` or `?all` once enforced.

### 3.3 DKIM (Resend)

Resend issues two CNAMEs per domain. Spec template (replace selector tokens with values from Resend dashboard at provisioning time):

```
resend._domainkey           IN  CNAME  resend._domainkey.resend.com.
resend2._domainkey          IN  CNAME  resend2._domainkey.resend.com.
```

(Resend uses two selectors for key rotation. Both must be published before Resend will activate the domain.)

### 3.4 DMARC

Three-stage rollout. Start at stage 1, observe `dmarc@veuaistudio.com` aggregate reports for 14 days, then progress.

```
# Stage 1 — Monitor (week 0–2)
_dmarc                     IN  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@veuaistudio.com; ruf=mailto:dmarc@veuaistudio.com; fo=1; pct=100; sp=none; aspf=r; adkim=r"

# Stage 2 — Quarantine (week 2–6)
_dmarc                     IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@veuaistudio.com; pct=100; sp=quarantine; aspf=s; adkim=s"

# Stage 3 — Reject (week 6+)
_dmarc                     IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@veuaistudio.com; pct=100; sp=reject; aspf=s; adkim=s"
```

`sp=` controls policy for subdomains (including `*.demo.veuaistudio.com`). Aligned mode (`s` for strict) only after monitoring confirms 100% alignment.

### 3.5 CAA

```
@                           IN  CAA  0 issue "letsencrypt.org"
@                           IN  CAA  0 issue "digicert.com"
@                           IN  CAA  0 issuewild "letsencrypt.org"
@                           IN  CAA  0 iodef "mailto:security@veuaistudio.com"
```

`issuewild` line is required because `*.demo.veuaistudio.com` will need wildcard issuance (per `specs/w4-overnight/09-demo-namespace.md:104`). If Vercel's CA is something other than Let's Encrypt or DigiCert, add it; CAA defaults to "any CA" only when no record is present.

### 3.6 MTA-STS (post-DMARC-reject hardening)

Once DMARC is at `p=reject`:

```
_mta-sts                   IN  TXT  "v=STSv1; id=20260507"
```

Plus an HTTPS-served policy file at `https://mta-sts.veuaistudio.com/.well-known/mta-sts.txt`:

```
version: STSv1
mode: enforce
mx: <inbound MX hostname pattern>
max_age: 86400
```

### 3.7 TLS-RPT

```
_smtp._tls                 IN  TXT  "v=TLSRPTv1; rua=mailto:tls-rpt@veuaistudio.com"
```

### 3.8 BIMI (optional, post-DMARC-reject)

```
default._bimi              IN  TXT  "v=BIMI1; l=https://veuaistudio.com/.well-known/bimi-logo.svg; a=https://veuaistudio.com/.well-known/bimi-vmc.pem"
```

VMC issuance is paid; defer until brand maturity justifies it.

## 4. Recommended records — non-sender product zones (template)

Apply to: `saigeplatform.com`, `saigedemo.com`, `ourpublishingai.com`, `reltwin.com`, `victorudo.com`. (Adjust if any of these is decided to be a sender.)

### 4.1 SPF (null sender)

```
@                           IN  TXT  "v=spf1 -all"
```

### 4.2 DKIM

None published (no sender → no key needed).

### 4.3 DMARC (reject from day one — the domain doesn't send)

```
_dmarc                     IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@veuaistudio.com; pct=100; sp=reject; aspf=s; adkim=s"
```

(Aggregates still go to the main `dmarc@veuaistudio.com` mailbox so all VEU domains report to a single inbox.)

### 4.4 CAA

```
@                           IN  CAA  0 issue "letsencrypt.org"
@                           IN  CAA  0 issue "digicert.com"
@                           IN  CAA  0 iodef "mailto:security@veuaistudio.com"
```

(No `issuewild` unless wildcard cert is needed.)

## 5. Recommended records — `ourcommunitiesai.com` (currently DNS-broken)

Until the domain is registered or removed from `productDomains.js:16, 17`:

| Record | Value |
|---|---|
| Any | None — domain doesn't resolve |

**Action:** decide per `docs/VEU_PORTFOLIO_HEALTH_2026-05-05.md:23, 93, 98, 150`:

1. Register `ourcommunitiesai.com`, then apply the non-sender template (§4) plus product config
2. OR change `live_url` for ReachSMS to a working domain (e.g. `reachsms.base44.app`) and remove the broken entry from registry

## 6. Recommended records — `sustainabilityleadership.com`

Until ownership confirmed:

| Record | Value |
|---|---|
| Any | **Hold** |

**Action:** confirm ownership, then either apply non-sender template (§4) or transfer / remove from VEU portfolio.

## 7. Per-record per-domain matrix (concrete values)

| Domain | SPF | DKIM | DMARC | CAA |
|---|---|---|---|---|
| `saigeplatform.com` | `v=spf1 -all` | (none) | `v=DMARC1; p=reject; rua=mailto:dmarc@veuaistudio.com; pct=100; sp=reject; aspf=s; adkim=s` | LE + DigiCert + iodef |
| `saigedemo.com` | `v=spf1 -all` | (none) | Same as above | Same |
| `ourpublishingai.com` | `v=spf1 -all` (until activated as sender) | (none until activated) | Same | Same |
| `reltwin.com` | `v=spf1 -all` | (none) | Same | Same |
| `victorudo.com` | `v=spf1 -all` | (none) | Same | Same |
| `veuaistudio.com` | `v=spf1 include:_spf.resend.com -all` | `resend._domainkey` + `resend2._domainkey` (Resend CNAMEs) | Three-stage rollout (§3.4); end at `p=reject` | LE + DigiCert (incl. `issuewild`) + iodef |
| `ourcommunitiesai.com` | N/A | N/A | N/A | N/A |
| `sustainabilityleadership.com` | N/A | N/A | N/A | N/A |

## 8. Gaps where spec is silent (delta from Part 1)

Part 1 listed 8 gaps; Part 2 closes the most actionable ones with concrete values above. Remaining gaps:

1. **Inbound MX choice** — Workspace vs Fastmail vs Microsoft. Spec must pick.
2. **Inbox provisioning checklist for `veuaistudio.com`** — `dmarc@`, `legal@`, `privacy@`, `dmca@`, `demo@`, `security@`, `tls-rpt@` (plus per-product mailboxes).
3. **Vercel CA identity** — confirm so CAA `issue` line can be authoritative (not just the conservative LE+DigiCert pair).
4. **DKIM rotation cadence** — Resend handles automatically with the dual-selector pattern; spec should still note it.
5. **Decision: do `ourpublishingai.com`, `reltwin.com`, `victorudo.com` ever send mail?** Until decided, default is null SPF + reject DMARC (§4).

## 9. Verdict

Part 1 said "no records spec'd". Part 2 provides the records. Net status:

| Domain | Records spec'd in this report | Records published in DNS | Net |
|---|---|---|---|
| `saigeplatform.com` | YES | UNKNOWN | Ready to publish |
| `saigedemo.com` | YES | UNKNOWN | Ready to publish |
| `ourpublishingai.com` | YES (default non-sender) | UNKNOWN | Ready to publish; revisit if PressAI activates email |
| `reltwin.com` | YES | UNKNOWN | Ready to publish |
| `victorudo.com` | YES | UNKNOWN | Ready to publish |
| `veuaistudio.com` | YES (full sender alignment) | UNKNOWN | Ready to publish — start at DMARC stage 1 |
| `ourcommunitiesai.com` | DEFERRED (DNS-broken) | N/A | Blocked on registration decision |
| `sustainabilityleadership.com` | DEFERRED (unverified) | N/A | Blocked on ownership |

DNS hygiene now has concrete recommended values for 6 of 8 zones. The remaining 2 are blocked by domain-ownership decisions outside this report's scope.
