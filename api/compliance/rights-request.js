// POST /api/compliance/rights-request
// Body: {
//   email, product_id, org_id?,
//   request_type: 'access' | 'deletion' | 'correction' | 'portability' | 'objection' | 'restriction',
//   details?: string,           // free-text describing the request
//   country?: string,           // ISO-3166 alpha-2 (e.g. 'US', 'DE')
//   verification?: any          // optional identity verification payload
// }
//
// Generic GDPR / CCPA rights-request submission endpoint. Closes the backend
// half of audit issue P1-004 (PressAI's privacy policy currently forces users
// to email privacy@ourpublishingai.com — violates GDPR's "easy means" rule).
//
// Stores the request with a tracking reference number. Returns the reference
// + estimated response time. When Resend activates, also fires:
//   - Auto-confirmation email to the requester with the reference number
//   - Internal notification to the privacy team
//
// GET /api/compliance/rights-request?product_id=&org_id=&limit=  — list
//   submissions (admin-gated).

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { isValidEmail, rateLimitOk, clientIp } from '../_lib/authBackend.js';
import { appendAuditEntry } from '../_lib/db.js';
import { logger } from '../_lib/logger.js';
import { randomBytes } from 'crypto';

const REQUESTS = new Map();   // id -> request
const MAX_STORE = 5000;

const DEFAULT_ORG = 'veu-ai-studio';

const VALID_TYPES = new Set([
  'access',         // GDPR Art. 15 / CCPA right to know
  'deletion',       // GDPR Art. 17 / CCPA right to delete
  'correction',     // GDPR Art. 16 / CCPA right to correct
  'portability',    // GDPR Art. 20
  'objection',      // GDPR Art. 21
  'restriction',    // GDPR Art. 18
]);

function newRef() {
  // Human-friendly reference like RR-7K9X3M-A2Q
  const part1 = randomBytes(3).toString('hex').toUpperCase();
  const part2 = randomBytes(2).toString('hex').toUpperCase();
  return `RR-${part1}-${part2}`;
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    const ip = clientIp(req);
    if (!rateLimitOk({ ip, endpoint: 'rights-request', max: 5, windowMs: 60 * 60_000 })) {
      return res.status(429).json({ error: 'Too many rights requests from this IP. Please contact privacy@ directly if this is urgent.' });
    }

    const {
      email, product_id: productId, org_id: bodyOrgId,
      request_type: requestType, details, country, verification,
    } = req.body || {};
    const orgId = resolveOrgId(req) || bodyOrgId || DEFAULT_ORG;

    if (!productId) return res.status(400).json({ error: 'product_id required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!VALID_TYPES.has(requestType)) {
      return res.status(400).json({ error: `request_type must be one of: ${[...VALID_TYPES].join(', ')}` });
    }

    if (REQUESTS.size >= MAX_STORE) {
      const oldestKey = REQUESTS.keys().next().value;
      if (oldestKey) REQUESTS.delete(oldestKey);
    }

    const request = {
      id: 'req_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex'),
      reference: newRef(),
      email: email.toLowerCase().trim(),
      product_id: productId,
      org_id: orgId,
      request_type: requestType,
      details: typeof details === 'string' ? details.slice(0, 4000) : null,
      country: typeof country === 'string' ? country.toUpperCase().slice(0, 2) : null,
      verification: verification || null,
      ip,
      user_agent: req.headers?.['user-agent'] || null,
      status: 'received',
      created_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),  // 30-day GDPR window
      resolved_at: null,
    };
    REQUESTS.set(request.id, request);

    await appendAuditEntry({
      actionType: 'compliance.rights_request',
      severity: 'info',
      orgId, productId,
      detail: { request_id: request.id, reference: request.reference, request_type: requestType, country: request.country },
    }).catch(() => {});

    logger.info('compliance.rights_request', { orgId, productId, requestId: request.id, requestType, country: request.country });

    // TODO Resend: when RESEND_API_KEY is set, fire two emails:
    //   1. Auto-confirmation to the requester:
    //      "We received your <type> request. Reference: <ref>.
    //       We'll respond within 30 days (by <due_at>)."
    //   2. Internal notification to privacy@<product domain>:
    //      "New rights request: <ref> from <email> (country: <country>)"
    //
    // Until Resend activates, the audit_log entry above is the operator's
    // notification path. Manually scan via:
    //   GET /api/audit-log?actionType=compliance.rights_request

    return res.status(201).json({
      ok: true,
      reference: request.reference,
      message: `We received your ${requestType} request. Reference: ${request.reference}. We'll respond within 30 days (by ${request.due_at.slice(0, 10)}).`,
      due_at: request.due_at,
    });
  }

  if (req.method === 'GET') {
    const adminKey = req.headers['x-flowai-admin-key'];
    if (!process.env.ADMIN_SEED_KEY || adminKey !== process.env.ADMIN_SEED_KEY) {
      return res.status(401).json({ error: 'Admin key required' });
    }

    const orgId = resolveOrgId(req) || DEFAULT_ORG;
    const { product_id: productId, status, request_type: requestType, limit } = req.query || {};
    const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

    let arr = Array.from(REQUESTS.values());
    if (orgId) arr = arr.filter((r) => r.org_id === orgId);
    if (productId) arr = arr.filter((r) => r.product_id === productId);
    if (status) arr = arr.filter((r) => r.status === status);
    if (requestType) arr = arr.filter((r) => r.request_type === requestType);
    arr.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.status(200).json({ total: arr.length, requests: arr.slice(0, cap) });
  }

  return res.status(405).json({ error: 'Use POST or GET' });
}

export default withRequestLog(handler, { endpoint: '/api/compliance/rights-request' });
