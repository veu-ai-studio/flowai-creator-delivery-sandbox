# 13 — EIN / tax setup readiness (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `11-tax-readiness.md`. Part 1 catalogued zero implementation; Part 2 turns that into a concrete starter-state plan.

## 1. Re-verified search

Patterns: `\bEIN\b`, `\bW-?8\b`, `\bW-?9\b`, `\b1099\b`, `tax form`, `tax compliance`, `tax-form`, `withholding`, `IRS`, `FATCA`, `1099-K`, `1099-NEC`, `1099-MISC`.

**Result:** zero substantive hits. The broader `tax|Tax|TAX` set (26 files) is dominated by `taxonomy` / `marketplace_taxonomy`. No genuine tax-compliance code exists.

## 2. What "the CEO has acquired EIN" unblocks (and doesn't)

| Item | Unblocked by EIN? | Status |
|---|---|---|
| Add `legal_entity` block to `api/_lib/legalEntity.js` (new) with `ein`, `legal_name`, `jurisdiction` | YES | Code change available — just need the EIN value to commit (likely better stored as env var, not literal) |
| Open Stripe Connect platform account | YES | Per `10-stripe-status.md`, the implementation surface still needs to be built |
| Open business bank account | YES (out-of-repo) | N/A in code |
| File W-9 with vendors that pay VEU | YES (out-of-repo manual) | N/A in code |
| Issue 1099s to non-employee providers | NO — needs revenue ledger first | Per `10-stripe-status.md §3.5`, `provider_payouts` table proposed |
| Collect W-9 / W-8 from VEU's connected providers | NO — needs onboarding flow | Stripe Connect onboarding handles for connected accounts; otherwise needs custom UI |
| Sales tax / VAT collection | NO — needs tax engine | Stripe Tax recommended once Stripe is integrated |

**Rule:** EIN unblocks legal-entity identification. It does not unblock any of the form intake / 1099 generation / sales-tax engine code work. Those remain a green-field build.

## 3. Concrete starter-state proposal

### 3.1 `api/_lib/legalEntity.js` (new file)

```js
// api/_lib/legalEntity.js
// Single source of truth for VEU AI Studio LLC legal entity metadata.
// EIN is stored as an env var (LEGAL_EIN) rather than committed literal,
// because while EIN is not technically a secret, it appears on tax docs
// and isn't appropriate for browser bundles.

export const LEGAL_ENTITY = Object.freeze({
  legal_name: 'VEU AI Studio LLC',
  jurisdiction: 'Delaware',                 // confirm with formation docs
  formation_date: '2025-XX-XX',             // fill in once known
  ein: process.env.LEGAL_EIN || null,       // server-side only
  registered_agent: '<TBD>',
  designated_agent: {                       // for DMCA per 07-dmca-inventory.md §3.1
    name: '<TBD>',
    email: 'dmca@veuaistudio.com',
    address: '<TBD>',
    phone: '<TBD>',
  },
  merchant_of_record: 'platform',           // 'platform' = VEU is MoR; 'connected_account' = each provider is MoR
});
```

**Note on `merchant_of_record`:** this is the single most important tax-policy decision. It drives whether VEU collects sales tax (MoR=platform) or each provider does (MoR=connected_account). Stripe Connect supports both.

### 3.2 Add `LEGAL_EIN` to inventory (per `12-inventory-expansion.md`)

Proposed section in `docs/ENV_VARS.md`:

```markdown
## 15. Legal entity (server-side only)

| Var | Required for activation | Purpose |
|---|---|---|
| `LEGAL_EIN` | optional | EIN of VEU AI Studio LLC. Surfaced on receipts, 1099s, and DMCA Designated Agent registration. Server-side only — never exposed to browser bundle. |
```

### 3.3 Surface EIN on legal pages

Update (in implementation sprint, not in this Part 2 read-only report):

- `src/pages/PrivacyPolicy.jsx` — add `<p>EIN: {LEGAL_ENTITY.ein || '<not yet provisioned>'}</p>` next to the company name
- `src/pages/TermsOfUse.jsx` — same
- New `src/pages/DMCAPolicy.jsx` (per `07-dmca-inventory.md §3.1`) — Designated Agent block

### 3.4 W-9 / W-8 form intake (when Stripe Connect onboarding lands)

Stripe Connect Express collects these forms automatically as part of its hosted onboarding (Stripe is the merchant of the onboarding flow). The implementation already drafted in `10-stripe-status.md §3.6` covers the onboarding step.

For non-Connect contractors (e.g., individual consultants paid directly), VEU still needs:

- A simple form at `/admin/contractors/new` (admin-gated via `ADMIN_SEED_KEY`) with W-9 / W-8BEN fields
- A `contractors` table to persist
- An end-of-year 1099-NEC export job

These are out of scope for current MVP; flagged here for the post-MVP tax sprint.

### 3.5 1099 generation pipeline

Sources of 1099-issuance data in priority order:

1. **Stripe Connect (1099-K)** — Stripe issues these on connected accounts' behalf when configured. Activate via Stripe dashboard once Connect is live.
2. **Direct contractor payments (1099-NEC)** — would need the `contractors` table from §3.4. Year-end batch job reads `provider_payouts` + `contractors` and emits 1099-NEC PDFs. Not in scope for MVP.
3. **Misc payments (1099-MISC)** — even rarer; defer.

Recommendation: rely on Stripe-issued 1099-Ks for the next 12 months. Build the `contractors` + 1099-NEC pipeline only when contractor count > 5 or annual contractor spend > $10k.

### 3.6 Sales tax / VAT engine

When Stripe Connect lands, enable **Stripe Tax** as the sales-tax engine:

- Stripe handles tax-rate calculation per jurisdiction
- Stripe handles VAT reverse-charge mechanics for EU B2B
- Stripe handles US sales-tax nexus thresholds
- Cost: 0.5% per transaction on top of standard Stripe fees

Alternative: TaxJar / Avalara if Stripe Tax doesn't cover Africa-tier requirements (Nigeria VAT, South Africa VAT). Per `09-cloudflare-checklist.md` and Africa-first products (`MyPregLife`), confirm Stripe Tax coverage of those jurisdictions before committing.

### 3.7 Africa-tier tax considerations

Per `api/_lib/productDomains.js:111` (MyPregLife live in Africa), and `src/lib/toolRegistry.js:47, 48, 57` (Africa-tier payment vendors Paystack / Flutterwave / Termii):

- **Nigeria VAT (7.5%)** — Paystack handles invoice-side VAT for Nigerian customers, but VEU as the platform must still register if revenue threshold is crossed.
- **South Africa VAT (15%)** — registration required at ZAR 1M revenue threshold.
- **No 1099 equivalent in African jurisdictions** — replaced by per-country tax-clearance certificates which the connected providers handle locally.

Spec-level decision: Stripe Tax covers North America + Europe. For Africa, defer to country-specific Paystack / Flutterwave reporting and per-country registration. Document in `docs/ARCHITECTURE.md` once the merchant-of-record decision (§3.1 above) is made.

## 4. Cross-references

| Item | File |
|---|---|
| Stripe Connect implementation gating 1099-K issuance | `10-stripe-status.md` |
| `LEGAL_EIN` inventory entry | `12-inventory-expansion.md` (new Section 15) |
| DMCA Designated Agent (uses same legal-entity record) | `07-dmca-inventory.md §3.1` |
| `provider_payouts` schema (drives 1099-K data) | `10-stripe-status.md §3.5` |

## 5. Sequenced build (post-MVP, 2-day sprint)

1. **Day 1 morning** — Author `api/_lib/legalEntity.js` with §3.1 shape; surface on `PrivacyPolicy.jsx` and `TermsOfUse.jsx`.
2. **Day 1 afternoon** — Add `LEGAL_EIN` to `docs/ENV_VARS.md` per §3.2; provision in Vercel env.
3. **Day 2 morning** — When Stripe Connect lands per `10-stripe-status.md`, activate Stripe Tax in dashboard.
4. **Day 2 afternoon** — Document Africa-tier tax stance (§3.7) in `docs/ARCHITECTURE.md`. Decision: VEU as merchant-of-record for North America / Europe; connected accounts as MoR for African transactions.
5. **Post-MVP** — `contractors` table + 1099-NEC pipeline only if contractor count grows.

## 6. Verdict

| Aspect | Part 1 status | Part 2 status |
|---|---|---|
| EIN integration | NOT IN REPO | DRAFTED §3.1 + §3.2 |
| Legal-entity record | NOT IN REPO | DRAFTED §3.1 |
| W-9 / W-8 intake | NOT IN REPO | DEFERRED to Stripe Connect onboarding (handled by Stripe) for MoR=platform; DRAFTED §3.4 for direct contractors |
| 1099 generation | NOT IN REPO | DEFERRED to Stripe-issued 1099-K for first 12 months |
| Sales tax engine | NOT IN REPO | RECOMMENDED Stripe Tax once Connect lands |
| Africa-tier consideration | NOT IN REPO | DOCUMENTED §3.7 |
| `merchant_of_record` decision | NOT MADE | FLAGGED §3.1 as the gating decision |

**Net:** tax compliance code surface remains at 0% implemented, but Part 2 now has a concrete starter-state proposal that fits into a 2-day sprint after Stripe Connect lands. The EIN unblocks the legal-entity record; everything else is downstream of `10-stripe-status.md`.
