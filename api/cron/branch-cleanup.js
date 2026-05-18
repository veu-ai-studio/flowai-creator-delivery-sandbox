// api/cron/branch-cleanup.js
//
// Vercel Cron endpoint — daily branch-cleanup sweep across every
// product in product_registry with self_renewal_enabled = true.
//
// Schedule (per vercel.json): `0 2 * * *` (02:00 UTC daily).
//
// Auth:
//   x-flowai-internal: true + Authorization: Bearer ${FLOWAI_INTERNAL_SECRET}
//   Vercel Cron sends `x-vercel-cron: 1` on scheduled invocations; we
//   accept that as proof-of-origin when the internal secret is present.
//
// Behaviour:
//   - GET / POST accepted (Vercel Cron uses GET by default).
//   - Loads every operator product from product_registry where
//     self_renewal_enabled = true AND branchCleanupEnabled !== false.
//   - For each, mints a GitHub App installation token and invokes
//     cleanupStaleBranches() with retentionDays from the product row
//     (default 7) per spec §8.1.
//   - Returns aggregated summary across all products.
//   - On a per-product failure: records the failure in the response,
//     continues to the next product. One bad token doesn't halt the
//     whole sweep.
//
// Security:
//   - GitHub App token NEVER returned in the response.
//   - product_id + counts only — no token bytes leak through.
//   - Internal-secret check rejects unauthenticated callers; vercel-
//     cron header is the secondary signal (defence in depth).

import { cleanupStaleBranches } from '../../src/lib/agents/renewal/branchCleanup.js';
import { getInstallationToken } from '../../src/lib/agents/renewal/githubApp.js';
import { getSupabase } from '../_lib/supabase.js';

const BOUND_MIN = 1;
const BOUND_MAX = 90;
const DEFAULT_RETENTION_DAYS = 7;

function clampRetentionDays(value) {
  if (!Number.isFinite(value)) return DEFAULT_RETENTION_DAYS;
  if (value < BOUND_MIN) return BOUND_MIN;
  if (value > BOUND_MAX) return BOUND_MAX;
  return Math.floor(value);
}

function parseGithubRepoUrl(repoUrl) {
  if (typeof repoUrl !== 'string') return null;
  const m = repoUrl.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/.?#]+)(?:\.git)?/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

function authOk(req) {
  // Either:
  //   (a) Vercel Cron header + matching internal secret
  //   (b) Manual call with internal secret header pair
  const isCron = req.headers?.['x-vercel-cron'] === '1' || req.headers?.['x-vercel-cron'] === 'true';
  const isInternal = req.headers?.['x-flowai-internal'] === 'true' || req.headers?.['x-flowai-internal'] === '1';
  if (!isCron && !isInternal) return false;
  const expected = process.env.FLOWAI_INTERNAL_SECRET ?? '';
  const presented = (req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!expected) return false;
  return presented === expected;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader?.('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!authOk(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized', hint: 'requires x-flowai-internal + bearer + matching FLOWAI_INTERNAL_SECRET (or Vercel-Cron-originated invocation with same secret)' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'supabase_not_configured', hint: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required for product_registry lookup' });
  }

  // Load operator products.
  let products;
  try {
    const { data, error } = await supabase
      .from('product_registry')
      .select('product_id, github_repo_url, branch_retention_days, branch_cleanup_enabled, self_renewal_enabled')
      .eq('self_renewal_enabled', true);
    if (error) throw new Error(error.message ?? String(error));
    products = Array.isArray(data) ? data : [];
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'product_registry_query_failed', detail: String(e?.message ?? e) });
  }

  const startedAt = new Date().toISOString();
  const perProduct = [];
  let totalDeleted = 0;
  let totalPreserved = 0;
  let totalFailed = 0;

  for (const p of products) {
    if (p.branch_cleanup_enabled === false) {
      perProduct.push({
        product_id: p.product_id,
        skipped: true,
        reason: 'branch_cleanup_enabled=false',
      });
      continue;
    }
    const parsed = parseGithubRepoUrl(p.github_repo_url);
    if (!parsed) {
      perProduct.push({
        product_id: p.product_id,
        skipped: true,
        reason: 'unparseable_github_repo_url',
      });
      continue;
    }
    let token;
    try {
      const minted = await getInstallationToken();
      token = minted.token;
    } catch (e) {
      perProduct.push({
        product_id: p.product_id,
        error: 'token_mint_failed',
        detail: String(e?.message ?? e),
      });
      totalFailed += 1;
      continue;
    }
    const retentionDays = clampRetentionDays(
      typeof p.branch_retention_days === 'number' ? p.branch_retention_days : DEFAULT_RETENTION_DAYS,
    );
    let result;
    try {
      result = await cleanupStaleBranches({
        owner: parsed.owner,
        repo: parsed.repo,
        retentionDays,
        token,
        supabase,
        productId: p.product_id,
        trigger: req.headers?.['x-vercel-cron'] ? 'scheduled' : 'admin_on_demand',
      });
    } catch (e) {
      perProduct.push({
        product_id: p.product_id,
        error: 'cleanup_threw',
        detail: String(e?.message ?? e),
      });
      totalFailed += 1;
      continue;
    } finally {
      // Defensive: ensure token is not referenced after this block.
      token = null;
    }
    perProduct.push({
      product_id: p.product_id,
      owner: parsed.owner,
      repo: parsed.repo,
      retentionDaysApplied: retentionDays,
      inspected: result.inspected,
      eligibleForDeletion: result.eligibleForDeletion,
      deleted: result.deleted.length,
      preservedByOpenPR: result.preservedByOpenPR.length,
      preservedByAge: result.preservedByAge.length,
      failed: result.failed.length,
      // NOTE: per-branch details intentionally omitted from the response
      // (governance_record carries the full audit trail). Surface counts
      // only so the cron's HTTP body stays compact + no PII leaks.
    });
    totalDeleted += result.deleted.length;
    totalPreserved += result.preservedByOpenPR.length + result.preservedByAge.length;
    totalFailed += result.failed.length;
  }

  return res.status(200).json({
    ok: true,
    startedAt,
    completedAt: new Date().toISOString(),
    productsScanned: products.length,
    totalDeleted,
    totalPreserved,
    totalFailed,
    perProduct,
  });
}
