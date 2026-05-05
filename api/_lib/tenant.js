// Tenant context resolution.
//
// Today: reads org_id from `x-flowai-org-id` header, body.orgId, or query.orgId.
// Tomorrow: replaced/extended by /api/_lib/auth.js with the Clerk session flow.
//
// Returning null means "single-tenant fallback" — db.js still scopes correctly
// because the in-memory adapter ignores the filter and Supabase service role
// queries can pass null.

export function resolveOrgId(req) {
  if (!req) return null;
  const headerOrg = req.headers?.['x-flowai-org-id'] || req.headers?.['X-FlowAI-Org-Id'];
  if (headerOrg) return String(headerOrg);
  if (req.body?.orgId) return String(req.body.orgId);
  if (req.query?.orgId) return String(req.query.orgId);
  return null;
}

export function resolveProductId(req) {
  if (!req) return null;
  return req.body?.productId || req.query?.productId || null;
}
