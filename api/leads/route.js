// POST /api/leads/route — production lead-capture surface.
//
// Filesystem mount note:
//   Vercel mounts this file at the path `/api/leads/route`. The existing UI
//   POSTs to `/api/leads` (see src/pages/{DemoSandbox,EnterpriseDemo}.jsx).
//   To make `/api/leads` reach this handler, vercel.json needs a rewrite —
//   that file edit is OUT OF SCOPE for this commit (W4 Phase 3 + 4b scope is
//   /api/leads/, /src/lib/leads/, /tests/, /specs/, productDomains.js only).
//   The route is fully reachable today at `/api/leads/route` and via direct
//   handler invocation in tests (see tests/leads-route.test.js).
//
// Behavior:
//   1. Validate payload (src/lib/leads/validate.js)
//   2. Resolve environment (src/lib/leads/resolveEnv.js — the W0 three patterns:
//      saigedemo.com, .demo.veuaistudio.com, sandbox.*)
//   3. environment === 'demo' → 202; do NOT call HubSpot (sandbox quarantine)
//   4. environment === 'production':
//        - Fail closed on missing HUBSPOT_API_KEY → 503
//        - createHubspotClient().upsertContact() → 201 / 502 / 500
//
// Safety guarantees:
//   - No outbound HTTP unless (HUBSPOT_API_KEY is set) AND (env === 'production')
//   - createClient is dependency-injected so tests cannot accidentally hit a
//     real HubSpot endpoint.

import { setCorsHeaders } from '../_lib/claude.js';
import { logger } from '../_lib/logger.js';
import { validateLead } from '../../src/lib/leads/validate.js';
import { resolveEnvFromReq, ENV_DEMO } from '../../src/lib/leads/resolveEnv.js';
import { createHubspotClient } from '../../src/lib/leads/hubspot-client.js';

export function createHandler(opts = {}) {
  const {
    createClient = createHubspotClient,
    env = process.env,
    log = logger,
  } = opts;

  return async function handler(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, reason: 'method_not_allowed', error: 'Use POST' });
    }

    const body = (req && typeof req.body === 'object' && req.body) || {};

    const v = validateLead(body);
    if (!v.ok) {
      return res.status(400).json({ ok: false, reason: 'validation_failed', errors: v.errors });
    }

    const environment = resolveEnvFromReq(req);

    // ── Demo-namespace short-circuit ─────────────────────────────────────
    // The W0 ruling quarantines demo writes from any production CRM. We
    // acknowledge the lead so the UI gets a 2xx (no broken state) but do
    // NOT route it to HubSpot.
    if (environment === ENV_DEMO) {
      log?.info?.('leads.route.demo_acknowledged', {
        product_id: body.product_id,
        environment,
        source_page: body.source_page || null,
      });
      return res.status(202).json({
        ok: true,
        action: 'demo_acknowledged',
        environment,
        message: 'Sandbox capture — not routed to CRM.',
      });
    }

    // ── Production path ──────────────────────────────────────────────────
    const apiKey = env.HUBSPOT_API_KEY;
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
      log?.warn?.('leads.route.hubspot_unconfigured', { environment });
      return res.status(503).json({
        ok: false,
        reason: 'hubspot_unconfigured',
        message: 'Lead routing is temporarily disabled; please retry shortly.',
      });
    }

    let client;
    try {
      client = createClient({ apiKey, log });
    } catch (e) {
      log?.error?.('leads.route.client_init_failed', { error: e?.message || String(e) });
      return res.status(500).json({ ok: false, reason: 'client_init_failed' });
    }

    let result;
    try {
      result = await client.upsertContact({
        email: body.email,
        product_id: body.product_id,
        source_page: body.source_page,
        org_id: body.org_id,
        metadata: body.metadata,
      });
    } catch (e) {
      log?.error?.('leads.route.upsert_threw', { error: e?.message || String(e) });
      return res.status(500).json({ ok: false, reason: 'upsert_threw' });
    }

    if (!result || !result.ok) {
      log?.warn?.('leads.route.upsert_failed', {
        action: result?.action || null,
        status: result?.status || null,
      });
      return res.status(502).json({
        ok: false,
        reason: result?.action || 'upsert_failed',
        status: result?.status || null,
      });
    }

    log?.info?.('leads.route.upsert_succeeded', {
      action: result.action,
      contact_id: result.id || null,
      product_id: body.product_id,
      environment,
    });

    return res.status(201).json({
      ok: true,
      action: result.action,
      environment,
      contact_id: result.id || null,
    });
  };
}

export default createHandler();

export const config = {
  api: { bodyParser: { sizeLimit: '8kb' } },
};
