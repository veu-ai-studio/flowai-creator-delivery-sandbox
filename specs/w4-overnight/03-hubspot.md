# 03 — HubSpot integration audit

**Generated:** 2026-05-07.

## Search for HubSpot code

Patterns searched: `hubspot`, `HubSpot`, `HUBSPOT`, `hsapi`, `@hubspot`.

### Matches

All matches are in **documentation only**:

| File | What it says |
|---|---|
| `docs/audits/pressai-2026-05-05/VICTOR_DECISIONS_NEEDED.md:40-44` | "Recommendation: Dispatch the form component + endpoint; route stored emails to whatever PressAI uses for its existing newsletter signups (HubSpot most likely; verify in the PressAI repo first)." Lists HubSpot vs Mailchimp vs Supabase as candidate backends. |
| `docs/audits/saige-2026-05-05/EXECUTIVE_SUMMARY.md:43,108` | "Wire both forms… to a verified backend (HubSpot / Mailchimp / Notion API) with success + error states and an internal email confirmation". |
| `docs/audits/saige-2026-05-05/CLAUDE_CODE_BACKLOG.md:119` | "Pick the backend: HubSpot (best for B2B + investor diligence), Mailchimp (cheapest), or a simple Supabase / Notion API endpoint. HubSpot recommended." |
| `docs/audits/saige-2026-05-05/raw-captures/aggregate-text.md:11` | Original audit recommendation. |
| `src/docs/FLOWAI_MIGRATION_PLAN.md` | Listed as a candidate CRM. |

### Code matches

**Zero.** No HubSpot SDK is imported anywhere. No `import` or `require`
mentions `@hubspot/*`, `hubspot`, or `hsapi`. `package.json` lists no
`@hubspot/*` dependency (verified — search of `package.json` returned no
match outside Stripe/marketplace seed prose).

## `src/lib/leads/`

**Does not exist.** The full `src/lib/` listing:

```
src/lib/AgenticModeContext.jsx
src/lib/AuthContext.jsx
src/lib/JobContext.jsx
src/lib/OrchestrationContext.jsx
src/lib/PageNotFound.jsx
src/lib/SessionContext.jsx
src/lib/agents/BaseAgent.js
src/lib/agents/MessageSchema.js
src/lib/app-params.js
src/lib/auditLogger.js
src/lib/contentProtection.js
src/lib/flowExecutor.js
src/lib/flowSimulator.js
src/lib/flowStore.jsx
src/lib/flowValidator.js
src/lib/governance/ScoreEvaluator.js
src/lib/jobRunners.js
src/lib/operationsEngine.js
src/lib/qaEngine.js
src/lib/query-client.js
src/lib/safeStr.js
src/lib/searchIndex.js
src/lib/shared/CredentialAdapter.js
src/lib/templates.js
src/lib/toolRegistry.js
src/lib/utils.js
src/lib/veuProducts.js
```

No `leads/` subdirectory. No HubSpot field map. No HubSpot client.

## Field-mapping audit (W0 ruling on `veu_`-prefixed property names)

W0 ruling specifies these custom-property names on the HubSpot Contact:

```
veu_product_interest      ← which VEU product the lead is for (saige, pressai, …)
veu_lead_source           ← marketing source / source_page / form id
veu_demo_requested        ← bool: did the lead ask for a demo?
veu_demo_scheduled_at     ← ISO-8601 timestamp of the scheduled demo (if any)
veu_utm_source
veu_utm_medium
veu_utm_campaign
veu_message               ← free-text note / message from the form
```

### Status of each property

| veu_ property | Implemented? | Where | Notes |
|---|---|---|---|
| `veu_product_interest` | ❌ | n/a | The capture handler stores `product_id` on the lead; nothing maps it to `veu_product_interest`. |
| `veu_lead_source` | ❌ | n/a | `source_page` is stored on the lead; no mapping to a HubSpot property. |
| `veu_demo_requested` | ❌ | n/a | No `demo_requested` field is read or written anywhere. |
| `veu_demo_scheduled_at` | ❌ | n/a | No scheduling field anywhere. |
| `veu_utm_source` | ❌ | n/a | UTM params are not parsed by the backend; the SAIGE BASE44_FIX_QUEUE.md sample payload has the UI inject `metadata.campaign / source` but the backend stores them as opaque metadata, not as named fields. |
| `veu_utm_medium` | ❌ | n/a | Same as above. |
| `veu_utm_campaign` | ❌ | n/a | The SAIGE fix queue payload references `metadata.campaign` (informally) but backend has no extractor. |
| `veu_message` | ❌ | n/a | No `message` field is captured anywhere. |

### Existing lead-record shape (`api/leads/capture.js:53-63`)

```js
const lead = {
  id: 'lead_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex'),
  email: email.toLowerCase().trim(),
  product_id: productId,
  org_id: orgId,
  source_page: sourcePage || null,
  ip,
  user_agent: req.headers?.['user-agent'] || null,
  metadata: metadata && typeof metadata === 'object' ? metadata : {},
  created_at: new Date().toISOString(),
};
```

**Mismatch with W0 ruling:** none of the eight `veu_`-prefixed names are
present in the lead shape, in any helper, or in any HubSpot client (because no
HubSpot client exists).

## What W4 needs (recommendation, not implemented here)

When HubSpot is wired up, the cheapest place is a new
`api/_lib/leads/hubspot.js` (or `src/lib/leads/hubspot.js` if any browser-side
preview is needed) with two pure functions:

```js
// Maps the existing in-memory lead shape to the HubSpot Contact properties
// (W0-ruled veu_-prefixed names), without performing any HTTP call.
export function leadToHubspotProperties(lead) {
  return {
    email: lead.email,
    veu_product_interest: lead.product_id || null,
    veu_lead_source: lead.source_page || lead.metadata?.form || null,
    veu_demo_requested: Boolean(lead.metadata?.demo_requested),
    veu_demo_scheduled_at: lead.metadata?.demo_scheduled_at || null,
    veu_utm_source: lead.metadata?.utm_source || lead.metadata?.source || null,
    veu_utm_medium: lead.metadata?.utm_medium || null,
    veu_utm_campaign: lead.metadata?.utm_campaign || lead.metadata?.campaign || null,
    veu_message: lead.metadata?.message || null,
  };
}

// Calls hsapi POST /crm/v3/objects/contacts (with x-flowai-org-id propagated
// to a HubSpot pipeline mapping). Network call should be injectable for tests.
export async function upsertHubspotContact(lead, { fetcher = fetch } = {}) { ... }
```

That gives `tests/leads.test.js` a pure unit test target (the field map) and
isolates the network surface to a single mockable function.

## Verdict

HubSpot integration **is not started**. Zero of the eight W0-ruled `veu_`
properties are wired. There is no field map, no SDK dependency, and no
network call site. Audit-doc recommendations exist; code does not.

Naming compliance gate: when the integration ships, every custom property
must be `veu_*`-prefixed per W0 ruling. The W0 list above is the canonical
target.
