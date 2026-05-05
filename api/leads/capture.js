// POST /api/leads/capture
// Body: { email, product_id, source_page?, org_id?, metadata? }
//
// Generic lead-capture endpoint. The hero email-capture form (audit issue
// P0-003) POSTs here when Base44 ships it. Stores the lead with timestamp
// + source page + IP for retargeting. Multi-tenant; per-product scoped.
//
// V1 storage: in-process Map. V2: switches to Supabase 'leads' table when
// DB_BACKEND flips. Schema mirrors the future Postgres shape.
//
// GET /api/leads/capture?product_id=&org_id=&limit=  — list captured leads
//   (gated by ADMIN_SEED_KEY — same admin gate as /api/admin/seed)

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { isValidEmail, rateLimitOk, clientIp } from '../_lib/authBackend.js';
import { appendAuditEntry } from '../_lib/db.js';
import { logger } from '../_lib/logger.js';
import { randomBytes } from 'crypto';

const LEADS = new Map();   // id -> lead
const MAX_STORE = 10000;

const DEFAULT_ORG = 'veu-ai-studio';

function newId() {
  return 'lead_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex');
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    const ip = clientIp(req);
    if (!rateLimitOk({ ip, endpoint: 'leads-capture', max: 8, windowMs: 60_000 })) {
      return res.status(429).json({ error: 'Too many submissions. Please retry in a minute.' });
    }

    const { email, product_id: productId, source_page: sourcePage, org_id: bodyOrgId, metadata } = req.body || {};
    const orgId = resolveOrgId(req) || bodyOrgId || DEFAULT_ORG;

    if (!productId) return res.status(400).json({ error: 'product_id required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });

    if (LEADS.size >= MAX_STORE) {
      // Evict oldest. Tomorrow on Supabase: just insert.
      const oldestKey = LEADS.keys().next().value;
      if (oldestKey) LEADS.delete(oldestKey);
    }

    const lead = {
      id: newId(),
      email: email.toLowerCase().trim(),
      product_id: productId,
      org_id: orgId,
      source_page: sourcePage || null,
      ip,
      user_agent: req.headers?.['user-agent'] || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      created_at: new Date().toISOString(),
    };
    LEADS.set(lead.id, lead);

    await appendAuditEntry({
      actionType: 'lead.captured',
      severity: 'info',
      orgId, productId,
      detail: { lead_id: lead.id, source_page: sourcePage, email_domain: email.split('@')[1] },
    }).catch(() => {});

    logger.info('lead.captured', { orgId, productId, leadId: lead.id, sourcePage });

    return res.status(201).json({
      ok: true,
      message: "You're on the list. We'll email confirmation within 24 hours.",
      lead_id: lead.id,
    });
  }

  if (req.method === 'GET') {
    // Admin-gated list.
    const adminKey = req.headers['x-flowai-admin-key'];
    if (!process.env.ADMIN_SEED_KEY || adminKey !== process.env.ADMIN_SEED_KEY) {
      return res.status(401).json({ error: 'Admin key required' });
    }

    const orgId = resolveOrgId(req) || DEFAULT_ORG;
    const { product_id: productId, limit } = req.query || {};
    const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);

    let arr = Array.from(LEADS.values());
    if (orgId) arr = arr.filter((l) => l.org_id === orgId);
    if (productId) arr = arr.filter((l) => l.product_id === productId);
    arr.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.status(200).json({ total: arr.length, leads: arr.slice(0, cap) });
  }

  return res.status(405).json({ error: 'Use POST or GET' });
}

export default withRequestLog(handler, { endpoint: '/api/leads/capture' });
