# 11 — EIN / tax setup readiness

Date: 2026-05-07

## 1. Search basis

Patterns: `\bEIN\b`, `\bW-?8\b`, `\bW-?9\b`, `\b1099\b`, `tax form`, `tax compliance`, `tax-form`, `withholding`, `W-9`, `W-8BEN`, `W-8BEN-E`, `1099-K`, `1099-NEC`, `1099-MISC`, `IRS`, `FATCA`.

The broader `tax|Tax|TAX` match (26 files) is dominated by `taxonomy`, `marketplace_taxonomy`, etc. — none are tax-compliance references.

## 2. Findings

| Item | Present? | Evidence |
|---|---|---|
| `EIN` mention | NO | Zero substantive matches |
| `W-9` form handling | NO | Zero matches |
| `W-8` (BEN / BEN-E) form handling | NO | Zero matches |
| `1099-K` (third-party network transactions) | NO | Zero matches |
| `1099-NEC` (non-employee compensation) | NO | Zero matches |
| `1099-MISC` (misc) | NO | Zero matches |
| `withholding` for non-US providers | NO | Zero matches |
| `IRS` / `IRS-form` references | NO | Zero matches |
| FATCA / CRS reporting | NO | Zero matches |
| Tax-rate / VAT / GST handling | NO | Zero matches |
| Sales-tax engine integration (Stripe Tax, Avalara, TaxJar) | NO | Zero matches |
| Statement / payout statement generation | NO | Zero matches (only forward-reference in `10-stripe-integration-status.md:75`) |
| Provider tax-status onboarding flow | NO | No `/onboarding/tax`, `/api/tax/*`, `/api/forms/*` endpoint |
| `tax_id` / `tin` field on any user/provider record | NO | No such field in `api/_lib/productDomains.js`, `api/admin/seed.js`, marketplace seed, or Supabase migrations |

## 3. Tax-relevant artifacts that DO exist

| Artifact | Location | Tax relevance |
|---|---|---|
| Org metadata | `api/_lib/productDomains.js:34–40` (`ORG = { id: 'veu-ai-studio', name: 'VEU AI Studio', plan: 'free' }`) | No legal entity name, no EIN, no jurisdiction |
| Privacy policy / Terms | `src/pages/PrivacyPolicy.jsx`, `src/pages/TermsOfUse.jsx` | Static pages — no tax-status disclosure, no merchant-of-record statement |
| Provider onboarding flow | (charter only — Agent #4 charter not implemented per Job 6) | Eventually needs to collect tax forms |
| Stripe Connect path | `CredentialAdapter.js:96–104` | Stripe Connect itself surfaces tax forms (Stripe collects W-9/W-8 from connected accounts), but no integration exercises this |

## 4. What VEU AI Studio LLC tax compliance requires (gap checklist)

Mapped against typical SaaS-with-marketplace tax obligations.

### 4.1 Federal income / employment

| Item | Spec | Implementation |
|---|---|---|
| EIN registered with IRS (CEO confirmed acquired) | NOT IN REPO | NOT IN REPO |
| EIN displayed on tax documents | NOT DEFINED | No tax-document generator |
| Quarterly federal estimated tax filing reminders | NOT DEFINED | None |

### 4.2 1099 reporting (we → providers / contractors)

| Item | Status |
|---|---|
| Threshold tracking (1099-NEC: $600/yr/contractor; 1099-K: 2026 lower threshold for payment networks) | **MISSING** — no per-provider revenue ledger exists; see `10-stripe-integration-status.md §6` |
| W-9 collection from US providers | **MISSING** — no form handler |
| W-8BEN / W-8BEN-E collection from non-US providers | **MISSING** — no form handler |
| Year-end 1099-NEC generation pipeline | **MISSING** |
| Stripe-issued 1099-K (Stripe Connect Express/Custom) reliance | **POSSIBLE BUT UNCONFIGURED** — Stripe Connect can issue 1099-Ks on connected accounts' behalf, but this requires the Connect onboarding to be live; per Job 10, that flow does not exist |
| TIN matching (IRS API) | **MISSING** |

### 4.3 Sales tax / VAT

| Item | Status |
|---|---|
| Tax-rate engine | **MISSING** — no Stripe Tax / Avalara / TaxJar integration |
| Per-jurisdiction nexus tracking | **MISSING** |
| EU VAT MOSS / IOSS handling | **MISSING** |
| AI Act-related disclosure (EU) | NOT TAX, but flagged by `docs/ENV_VARS.md` for PressAI; not implemented |

### 4.4 State / local

| Item | Status |
|---|---|
| Sales-tax permit registrations | NOT IN REPO |
| Per-state nexus thresholds | NOT IN REPO |
| Marketplace facilitator obligations (when operating PressAI / SAIGE marketplace surfaces) | NOT IN REPO |

### 4.5 International (Africa-first product positioning)

`api/_lib/productDomains.js` lists MyPregLife (Africa-focused) and `src/lib/toolRegistry.js` lists Africa-tier payment vendors (Paystack, Flutterwave, Termii, Africa's Talking).

| Item | Status |
|---|---|
| Per-country VAT registration triggers (Nigeria VAT, South Africa VAT) | NOT IN REPO |
| African market tax nexus mapping | NOT IN REPO |
| Cross-border withholding for non-US providers paid in USD | NOT IN REPO |

## 5. Verdict

VEU AI Studio LLC tax compliance code surface is **at zero**. Even though the CEO has acquired the EIN out-of-repo, the codebase has:

- **No EIN constant or org-tax-metadata field** anywhere
- **No tax-form intake** (W-9, W-8BEN, W-8BEN-E)
- **No 1099 generation pipeline** (NEC, K, MISC)
- **No sales-tax / VAT engine** (no Stripe Tax, Avalara, or TaxJar integration)
- **No per-provider revenue ledger** to compute thresholds against (cf. `10-stripe-integration-status.md §6`)
- **No statement / payout statement generator**
- **No tax-jurisdiction onboarding flow** for providers or end-customers

## 6. Required additions (priority-ordered)

1. **Add legal-entity record** to `api/_lib/productDomains.js` ORG block (or a new `api/_lib/legalEntity.js`): `legal_name`, `ein`, `jurisdiction`, `formation_date`, `merchant_of_record` flag.
2. **Surface EIN on terms and privacy pages** (`src/pages/TermsOfUse.jsx`, `src/pages/PrivacyPolicy.jsx`) per legal recommendations.
3. **When Stripe Connect lands per Job 10**, enable Stripe-issued 1099-K on connected accounts (Stripe handles US tax reporting for the connected accounts when configured).
4. **Add `tax_id` field** to provider onboarding (Agent #4 — currently absent per Job 6 §2).
5. **Decide merchant-of-record stance**: VEU AI Studio LLC vs the connected providers. This decision drives whether VEU collects sales tax or each provider does.
6. **Sales-tax engine choice** before any paid product launches — Stripe Tax is the lowest-friction option since Stripe is already procured.
7. **Annual 1099 cycle automation** once year-end 2026 approaches (assuming any provider crosses the threshold during the year).

## 7. Verdict line

**Tax-compliance code surface: 0/0 implemented out of approximately 8–10 components needed.** The CEO's EIN acquisition unblocks the legal-entity record but does not unblock any of the form handling, 1099 generation, sales-tax engine, or provider tax onboarding. All are downstream of Stripe Connect (Job 10) being implemented first.
