// HubSpot client for VEU lead capture.
//
// Public API:
//   - VEU_HUBSPOT_PROPERTIES — frozen list of the 8 W0-ruled property names
//   - leadToHubspotProperties(lead)  — pure field-mapper (no IO)
//   - createHubspotClient({ apiKey, fetcher, baseUrl, log }) — DI-friendly factory
//
// Per W0 ruling, every custom property name is veu_-prefixed:
//   veu_product_interest, veu_lead_source, veu_demo_requested,
//   veu_demo_scheduled_at, veu_utm_source, veu_utm_medium,
//   veu_utm_campaign, veu_message
//
// IMPORTANT: this module never references globalThis.fetch directly outside
// of the createHubspotClient() default. Tests MUST inject a stub fetcher.
// The factory throws if no fetcher is available, so an unconfigured prod
// instance cannot silently call out.

export const VEU_HUBSPOT_PROPERTIES = Object.freeze([
  'veu_product_interest',
  'veu_lead_source',
  'veu_demo_requested',
  'veu_demo_scheduled_at',
  'veu_utm_source',
  'veu_utm_medium',
  'veu_utm_campaign',
  'veu_message',
]);

// Source-of-truth mapping from the internal lead shape to HubSpot property names.
// Keep this object frozen so tests can detect drift.
export const FIELD_MAP = Object.freeze({
  product_interest:  'veu_product_interest',
  lead_source:       'veu_lead_source',
  demo_requested:    'veu_demo_requested',
  demo_scheduled_at: 'veu_demo_scheduled_at',
  utm_source:        'veu_utm_source',
  utm_medium:        'veu_utm_medium',
  utm_campaign:      'veu_utm_campaign',
  message:           'veu_message',
});

// Pure mapper from the internal lead shape (matching api/leads/capture.js)
// to a HubSpot Contact properties payload.
//
// Lead shape (input):
//   {
//     email,                         // required
//     product_id,                    // → veu_product_interest
//     source_page,                   // → veu_lead_source (fallback: metadata.form)
//     metadata: {
//       demo_requested,              // → veu_demo_requested (Boolean coercion)
//       demo_scheduled_at,           // → veu_demo_scheduled_at
//       utm_source / source,         // → veu_utm_source
//       utm_medium,                  // → veu_utm_medium
//       utm_campaign / campaign,     // → veu_utm_campaign
//       message,                     // → veu_message
//     }
//   }
export function leadToHubspotProperties(lead) {
  if (!lead || typeof lead !== 'object') {
    throw new TypeError('leadToHubspotProperties: lead must be an object');
  }
  const meta = (lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata))
    ? lead.metadata
    : {};

  return {
    email: lead.email,
    [FIELD_MAP.product_interest]:  lead.product_id || null,
    [FIELD_MAP.lead_source]:       lead.source_page || meta.form || meta.source || null,
    [FIELD_MAP.demo_requested]:    Boolean(meta.demo_requested),
    [FIELD_MAP.demo_scheduled_at]: meta.demo_scheduled_at || null,
    [FIELD_MAP.utm_source]:        meta.utm_source || meta.source || null,
    [FIELD_MAP.utm_medium]:        meta.utm_medium || null,
    [FIELD_MAP.utm_campaign]:      meta.utm_campaign || meta.campaign || null,
    [FIELD_MAP.message]:           meta.message || null,
  };
}

// Factory. Returns a client object with `upsertContact(lead)`.
//
// `fetcher` is required (defaults to globalThis.fetch when present). The
// constructor throws if neither is provided so a misconfigured prod
// instance fails closed instead of silently no-op'ing.
export function createHubspotClient(opts = {}) {
  const {
    apiKey,
    fetcher = (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined),
    baseUrl = 'https://api.hubapi.com',
    log,
  } = opts;

  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('createHubspotClient: apiKey is required');
  }
  if (typeof fetcher !== 'function') {
    throw new Error('createHubspotClient: fetcher (or globalThis.fetch) is required');
  }

  const headers = Object.freeze({
    'authorization': `Bearer ${apiKey}`,
    'content-type': 'application/json',
    'accept': 'application/json',
  });

  // Build the create-or-update request body. HubSpot's contacts API accepts
  // POST /crm/v3/objects/contacts to create; 409 on duplicate. On 409 we
  // fall back to PATCH .../<email>?idProperty=email to update.
  function buildBody(properties) {
    return JSON.stringify({ properties });
  }

  async function upsertContact(lead) {
    const properties = leadToHubspotProperties(lead);

    // Step 1 — try to create.
    const createUrl = `${baseUrl}/crm/v3/objects/contacts`;
    const createRes = await fetcher(createUrl, {
      method: 'POST',
      headers,
      body: buildBody(properties),
    });

    if (createRes.status === 201 || createRes.status === 200) {
      const data = await createRes.json().catch(() => ({}));
      return { ok: true, action: 'created', id: data?.id || null, properties };
    }

    // 409 → existing contact. Update by email.
    if (createRes.status === 409) {
      const encodedEmail = encodeURIComponent(properties.email);
      const updateUrl = `${baseUrl}/crm/v3/objects/contacts/${encodedEmail}?idProperty=email`;
      const updateRes = await fetcher(updateUrl, {
        method: 'PATCH',
        headers,
        body: buildBody(properties),
      });
      if (updateRes.status === 200) {
        const data = await updateRes.json().catch(() => ({}));
        return { ok: true, action: 'updated', id: data?.id || null, properties };
      }
      const txt = await safeText(updateRes);
      log?.warn?.('hubspot.upsert.update_failed', { status: updateRes.status, body: txt.slice(0, 300) });
      return { ok: false, action: 'update_failed', status: updateRes.status, error: txt.slice(0, 300) };
    }

    // Anything else is a hard error.
    const txt = await safeText(createRes);
    log?.warn?.('hubspot.upsert.create_failed', { status: createRes.status, body: txt.slice(0, 300) });
    return { ok: false, action: 'create_failed', status: createRes.status, error: txt.slice(0, 300) };
  }

  return Object.freeze({
    upsertContact,
    // Expose for diagnostics / tests
    _baseUrl: baseUrl,
    _hasFetcher: typeof fetcher === 'function',
  });
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}
