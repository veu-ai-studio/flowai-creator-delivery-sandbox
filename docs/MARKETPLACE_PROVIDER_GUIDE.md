# Marketplace — Provider Integration Guide

How to integrate the Tool Intelligence Marketplace into your provider workflow. Covers the four use-cases providers actually have, end-to-end, with curl examples.

For the conceptual overview see `TOOL_MARKETPLACE.md`. For the full taxonomy see `MARKETPLACE_TAXONOMY.md`.

---

## Use case 1 — Browse the marketplace

Show your client which tools are available for a given step. UI-driven; no commitment yet.

```bash
# Categories that serve lifecycle step 3 (Build)
curl "https://flowai-dun.vercel.app/api/marketplace/categories?step=3&include_counts=true"

# Tools in the hosting category, scored for the African market
curl "https://flowai-dun.vercel.app/api/marketplace/tools?category=hosting&region=africa"

# Drill into a specific tool's history
curl "https://flowai-dun.vercel.app/api/marketplace/tool-history/cloudflare-pages" \
  -H "x-flowai-org-id: your-org-id"
```

The `tools` response sorts by overall score sum across the 7 dimensions. Each entry includes:

- 7-dimension `rankings.scores`
- `evidence_count` and `has_outcome_data` (≥3 runs)
- Static facts: pricing, compliance certs, region strengths, integration complexity, vendor health

---

## Use case 2 — Get a contextual recommendation

Tell the marketplace what you're building. Get the best tool for that specific context.

```bash
curl -X POST "https://flowai-dun.vercel.app/api/marketplace/recommend" \
  -H "content-type: application/json" \
  -H "x-flowai-org-id: your-org-id" \
  -d '{
    "step_number": 3,
    "category": "payments",
    "context": {
      "region": "africa",
      "expected_scale": "100k_mau",
      "end_customer_size": "smb",
      "sensitivity_level": "medium",
      "prefer_low_cost": true
    },
    "top_n": 3,
    "product_id": "pressai",
    "lifecycle_run_id": "run_xyz"
  }'
```

Returns:

```json
{
  "recommendation_id": "rec_abc123",
  "recommendations": [
    {
      "rank": 1,
      "tool": { "slug": "paystack", "name": "Paystack", "vendor": "Paystack (Stripe)" },
      "score": 87,
      "score_breakdown": { "cost": 90, "quality": 82, "data_residency": 98, ... },
      "rationale": "For African SMB merchants...",
      "tradeoffs": "US/EU coverage limited compared to Stripe.",
      "evidence_count": 0
    }
  ],
  "context_applied": { "weights": {...}, "filters": {...} }
}
```

The `recommendation_id` is what you persist. Use it to:

- Mark which tool was actually picked (`/recommend/:rec_id` PATCH — V2)
- Pull the buyer-grade PDF brief (see use case 4)
- Tie subsequent outcomes + feedback back to the original recommendation

### Context fields the engine understands

| Field | Effect on weights |
|---|---|
| `region` | Stronger pull on `data_residency` dimension |
| `prefer_low_cost: true` | Bumps `cost` weight, dampens `quality` |
| `prefer_high_quality: true` | Bumps `quality`, dampens `cost` |
| `prefer_no_lock_in: true` | Bumps `lock_in_risk` |
| `prefer_data_sovereignty: true` | Bumps `data_residency`; can hard-filter |
| `sensitivity_level: high` | Bumps `data_residency`, `vendor_health` |
| `expected_scale: 100k_mau` etc. | Bumps `latency`, `quality` |
| `end_customer_size: enterprise` | Bumps `vendor_health`, `quality` |

Provider's saved `weight_overrides` from `marketplace_provider_preferences` win over context-derived values.

---

## Use case 3 — Close the loop with outcomes + feedback

After the lifecycle step runs and the tool is in production, send back signal so the marketplace gets smarter.

### Programmatic outcomes (the lifecycle engine emits these)

```bash
curl -X POST "https://flowai-dun.vercel.app/api/marketplace/outcomes" \
  -H "content-type: application/json" \
  -H "x-flowai-org-id: your-org-id" \
  -d '{
    "tool_slug": "paystack",
    "lifecycle_run_id": "run_xyz",
    "step_number": 3,
    "success": true,
    "cost_usd": 0.42,
    "latency_ms": 1180,
    "quality_score": 88,
    "metadata": { "transactions": 47, "failed": 2 }
  }'
```

### Provider's qualitative rating (you collect this in the UI)

```bash
curl -X POST "https://flowai-dun.vercel.app/api/marketplace/feedback" \
  -H "content-type: application/json" \
  -H "x-flowai-org-id: your-org-id" \
  -d '{
    "tool_slug": "paystack",
    "lifecycle_run_id": "run_xyz",
    "recommendation_id": "rec_abc123",
    "rating": 5,
    "comment": "Onboarding flow took 3 days vs Stripe quoting 2 weeks. KYC handled cleanly.",
    "tags": ["onboarding-fast", "kyc-clean"],
    "would_recommend": true
  }'
```

Both signals feed the weekly Inngest re-rank job. After 3+ runs, baseline scores blend with observed outcomes; after 10+ runs, the dynamic signal dominates.

---

## Use case 4 — Hand the brief to your client

Every recommendation has a print-ready buyer brief.

```bash
curl "https://flowai-dun.vercel.app/api/marketplace/recommend/rec_abc123/pdf" \
  -H "x-flowai-org-id: your-org-id" \
  -o paystack-brief.html

# Then in a browser: open paystack-brief.html → File → Save as PDF
```

The brief includes: top-pick card with rationale + tradeoffs, score breakdown across 7 dimensions, tool facts (pricing, compliance, region availability, vendor health), decision context, weights applied, alternatives considered, methodology.

---

## Provider preferences (per-org config)

```bash
# V2 — coming soon. The conceptual API:
curl -X PUT "/api/marketplace/preferences" \
  -H "x-flowai-org-id: your-org-id" \
  -d '{
    "weight_overrides": {
      "data_residency": 0.30,
      "cost": 0.05
    },
    "preferred_tool_slugs": ["paystack", "supabase"],
    "blocked_tool_slugs": ["paypal"],
    "data_sovereignty_required": ["africa"]
  }'
```

For now, set preferences via `setProviderPrefs` directly on the in-process store (V1) or insert into `marketplace_provider_preferences` (V2 with Supabase).

---

## Multi-tenancy: how the engine knows it's you

Every endpoint resolves your org via `resolveOrgId(req)` which reads (in priority order):

1. `x-flowai-org-id` header
2. Clerk JWT claim if present
3. Falls back to `veu-ai-studio` (default org)

All persisted records carry `org_id` + `product_id` + `lifecycle_run_id`. Cross-org reads are gated:

- `/tool-history/:slug?org_scope=all` requires `x-flowai-admin-key`
- `/feedback` GET only returns your org's records
- `/recommend/:rec_id/pdf` returns 404 if the recommendation belongs to another org

---

## Common pitfalls

**"Why am I getting baseline-only scoring?"** — Need ≥3 outcomes for that tool before dynamic adjustments kick in. Check `evidence_count` in the response. If it's <3, send /outcomes after each run.

**"My region's tools score low"** — Check `region_strengths[your_region]` in the seed. If a tool you trust is under-scored for your region, the seed is wrong; raise an issue against the seed PR.

**"The same context gives different recommendations week-to-week"** — That's the continuous-learning loop working. The weekly re-rank diffs against last week's snapshot and emits `marketplace.ranking_changed` audit entries for changes ≥5 points. Pull `/api/audit-log?action=marketplace.ranking_changed` to see what shifted.

**"How do I override the top pick for autonomous runs?"** — Add the slug to `preferred_tool_slugs` in your org's preferences, or block alternatives via `blocked_tool_slugs`. Both feed into hard filters before scoring.
