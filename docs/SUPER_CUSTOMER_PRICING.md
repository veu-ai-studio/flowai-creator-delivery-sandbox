# Super Customer Agent — VEUaaS Pricing Strategy

When VEUaaS launches commercially (post-Clerk activation, post-Stripe wiring), the Super Customer Agent becomes a primary monetised capability — operators pay per audit and per month for portfolio coverage.

This document defines the tier structure, what each tier includes, and how the backend enforces it.

---

## Pricing principles

1. **Audits are the headline product.** A signed PDF audit report is the artifact a buyer pays for. Everything else in VEUaaS supports producing or consuming audits.
2. **Cost is bounded.** Hard cap $25/run server-side regardless of tier; tiers gate quantity, depth, and feature access — not raw spend.
3. **Self-serve at the bottom, gated upward.** Free tier audits are Quick depth with public attribution; Enterprise gets all depths + SOC 2 audit bundle + custom branding.
4. **Cross-sell with the rest of the platform.** Audits feed Configuration / Clearance / Self-Renewal — paying for audits unlocks the broader governance loop.

---

## Tier matrix

| Tier | Price | Audits/month | Max depth | Max products tracked | PDF export | Custom brand | Recurring schedule | Multi-org | Support |
|---|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | 3 | quick | 1 | watermarked | no | no | no | community |
| **Starter** | $99/mo | 25 | standard | 5 | yes | no | weekly | no | email |
| **Professional** | $499/mo | 150 | full | 25 | yes | yes | daily | no | priority email |
| **Team** | $1,999/mo | 750 | full | 150 | yes | yes | daily | up to 5 | shared Slack |
| **Enterprise** | custom | unlimited | full | unlimited | yes | yes | per-product | unlimited | dedicated CSM |

**Add-ons (any tier):**
- Additional audit credits: $5 each (one quick audit) / $20 each (one full audit)
- Branded PDF white-label: +$199/mo (any tier)
- Compliance bundle (SOC 2 evidence pack alongside each audit): +$499/mo (Pro+)

---

## Tier enforcement (backend contract)

```ts
// Stored on organizations.metadata.subscription
interface Subscription {
  tier: 'free' | 'starter' | 'professional' | 'team' | 'enterprise';
  audits_per_month: number;            // 3 | 25 | 150 | 750 | -1 (unlimited)
  max_depth: 'quick' | 'standard' | 'full';
  max_products: number;                 // 1 | 5 | 25 | 150 | -1
  pdf_export_enabled: boolean;
  custom_branding_enabled: boolean;
  recurring_audits_enabled: boolean;
  multi_org_enabled: boolean;
  add_ons: { branded_pdf: boolean; compliance_bundle: boolean };
  audit_credits_balance: number;        // pre-purchased extra audits
  current_period_start: string;
  current_period_audits_consumed: number;
}
```

### Enforcement points

| Endpoint | Check |
|---|---|
| `POST /api/audits/super-customer/run` | (a) `audits_consumed < audits_per_month` OR `audit_credits_balance > 0`. (b) requested `depth <= subscription.max_depth`. (c) target product is one of `<max_products>`. (d) increment counter atomically before dispatch. |
| `GET .../results/:run_id/pdf` | `pdf_export_enabled === true` OR (Free tier returns PDF with "Free Tier — Audit by VEU AI Studio" watermark on every page). |
| `POST /api/products` (registration) | total active products under org `<= max_products`. |
| Inngest scheduled audit dispatcher | `recurring_audits_enabled === true` AND product has `audit_schedule` set. |
| Custom branding enforcement | If `custom_branding_enabled === true` and org has set a brand profile, render PDF with that brand instead of "VEU AI Studio". |

### Free-tier watermark

Free-tier PDFs include:
- A diagonal watermark on every page: "FREE TIER — AUDIT BY VEU AI STUDIO"
- A footer link "Upgrade to remove watermark and unlock standard + full depth audits"
- Links back to the SaaS signup

Implementation: branch in `/api/audits/super-customer/results/:run_id/pdf.js` based on `subscription.tier === 'free'`.

---

## Cost economics per tier (rough)

Assumes audits at the average depth ceiling.

| Tier | Avg cost / audit | Audits / mo | COGS / mo | Price | Gross margin |
|---|---|---|---|---|---|
| Free | $0.50 (quick) | 3 | $1.50 | $0 | -$1.50 (acquisition cost) |
| Starter | $2.00 (standard) | 25 | $50 | $99 | $49 (49%) |
| Professional | $7.50 (full) | 150 | $1,125 | $499 | -$626 (loss leader) |
| Team | $7.50 (full) | 750 | $5,625 | $1,999 | -$3,626 (loss leader) |
| Enterprise | varies | unlimited | $5k-$15k | $20k+ | bands |

**Implication: Professional and Team tiers are loss-leading on raw audit COGS — they monetise via the broader VEUaaS workflow (Configuration, Clearance, Self-Renewal, GTM Engine) which they unlock alongside audits.** That's the strategic frame: audits open the door, the platform retains.

The pricing levers that change this math:
- Anthropic prompt caching (which we already account for in cost tracking) — drops Claude costs ~30% for repeat audits of the same product.
- Browserless rate optimisation — at high volume, dedicated Browserless contract drops capture cost ~50%.
- Voyage embeddings + dedup: don't re-analyse identical surfaces across daily audits — only re-analyse when content changes.

---

## Discounting + commercial flexibility

- **Annual prepay:** -2 months on monthly price (save ~17%).
- **Founding-customer agreements:** 50% off Year 1 for design partners (capped at 10 orgs).
- **Non-profit / education:** 50% off any tier; require IRS 501(c)(3) or accredited institution proof.
- **Audit credits gift-card:** 10-pack of standard audits for $50 (= $5/audit, vs $20 add-on price). Conversion lever to upgrade.

---

## Public pricing page contract (for Base44's marketing site)

When the VEUaaS marketing pages get built, this is the canonical pricing data:

```ts
export const TIERS = [
  { id: 'free', name: 'Free', monthly_usd: 0, audits_per_month: 3, max_depth: 'quick' as const, max_products: 1 },
  { id: 'starter', name: 'Starter', monthly_usd: 99, audits_per_month: 25, max_depth: 'standard' as const, max_products: 5 },
  { id: 'professional', name: 'Professional', monthly_usd: 499, audits_per_month: 150, max_depth: 'full' as const, max_products: 25 },
  { id: 'team', name: 'Team', monthly_usd: 1999, audits_per_month: 750, max_depth: 'full' as const, max_products: 150 },
  { id: 'enterprise', name: 'Enterprise', monthly_usd: null /* contact sales */, audits_per_month: -1, max_depth: 'full' as const, max_products: -1 },
];
```

Mirror this constant on the backend via `/api/_lib/pricing.js` (TODO: build alongside Stripe wiring).

---

## What we don't gate (free for everyone, even free tier)

- The `/api/orchestrator/health` endpoint
- The `/api/diagnostic` endpoint  
- The product Configuration mode endpoints (`/api/configuration/products`, `/describe`, `/clone`, `/synthesize`, `/objectives`)

Why: these are platform-level capabilities. Audits are the differentiated paid artifact; the rest builds dependence on the platform.

---

## Sales motion

1. **Free trial drives self-serve adoption** — operators run an audit on their product, see findings, share the PDF internally.
2. **Starter is the natural upgrade for solo founders** — 25 audits/month covers typical pre-launch product cadence.
3. **Professional is the natural upgrade for teams** — covers a full portfolio (5-25 products) with daily-cadence recurring audits.
4. **Team is the natural upgrade for studios + portcos** — 5 client orgs with full audit capability.
5. **Enterprise is consultative sales** — bundled with onboarding services + custom integrations.

VEU AI Studio's own internal use sits in the **Team** tier — 5 portfolio products + recurring audits + multi-org (when SAIGE / RelTwin / etc become legally separate entities).

---

## Stripe / billing wiring (deferred)

Not in scope tonight. When billing activates:

1. Stripe products + prices created for each tier (monthly + annual variants).
2. Stripe checkout linked from the marketing pricing page.
3. Webhook `/api/billing/stripe-webhook` handles `subscription.created/updated/deleted` events; updates `organizations.metadata.subscription`.
4. Add-on credits: separate Stripe product (`audit_credits_pack_10`), purchased independently of subscription. Increment `audit_credits_balance` on payment.
5. Subscription enforcement: `getRequestContext()` populates `req.subscription` from the org record; downstream endpoints read that.

The runbook (`/docs/RUNBOOK.md` Step 7) flags this as the post-launch monetisation track.
