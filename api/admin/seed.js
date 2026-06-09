// POST /api/admin/seed
// Body: { reset?: boolean }
// Headers: x-flowai-admin-key: <ADMIN_SEED_KEY>
//
// Gated by ADMIN_SEED_KEY env var. When called with the right key, populates
// Supabase (or the in-memory registry when Supabase isn't configured) with
// the five VEU flagship products. Designed for tomorrow's first-run setup
// after Supabase activation.
//
// Idempotent — re-running is safe. Existing products are upserted by slug;
// new objectives are added if missing.

import { setCorsHeaders } from '../_lib/claude.js';
import { selectedBackend } from '../_lib/db.js';
import { getSupabase, isSupabaseConfigured } from '../_lib/supabase.js';
import {
  createProduct as createMemoryProduct,
  getProduct as getMemoryProduct,
  upsertObjective as upsertMemoryObjective,
} from '../_lib/configRegistry.js';
import { logger } from '../_lib/logger.js';
import { ORG, VEU_PRODUCTS } from '../_lib/productDomains.js';

// Canonical VEU portfolio comes from productDomains.js. Update domains there,
// not here. The seed shape mirrors the schema configRegistry.createProduct
// expects; objectives are seeded separately for the memory adapter.
const VEU_SEED = VEU_PRODUCTS.map((p) => ({
  name: p.name,
  slug: p.slug,
  live_url: p.live_url,
  description: p.description,
  type: p.type,
  status: p.status,
  tags: p.tags,
  objectives: p.objectives || [],
}));

// ─── Supabase seeders ────────────────────────────────────────────────

async function ensureSupabaseOrg() {
  const sb = getSupabase();
  // Try to find by slug; insert if missing.
  const { data: existing } = await sb.from('organizations').select('id').eq('slug', ORG.slug).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await sb.from('organizations').insert({
    name: ORG.name, slug: ORG.slug, plan: ORG.plan, clerk_org_id: ORG.clerk_org_id,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function seedSupabase({ reset }) {
  const sb = getSupabase();
  const orgId = await ensureSupabaseOrg();
  const summary = { backend: 'supabase', orgId, products: [], objectives: [] };

  if (reset) {
    // Be careful — only resets within this org.
    await sb.from('clearance_checks').delete().eq('org_id', orgId);
    await sb.from('audit_log').delete().eq('org_id', orgId);
    await sb.from('cost_events').delete().eq('org_id', orgId);
    await sb.from('run_steps').delete().eq('org_id', orgId);
    await sb.from('workspace_runs').delete().eq('org_id', orgId);
    await sb.from('products').delete().eq('org_id', orgId);
    summary.reset = true;
  }

  for (const p of VEU_SEED) {
    const row = {
      org_id: orgId,
      name: p.name,
      slug: p.slug,
      url: p.live_url,
      description: p.description,
      type: p.type,
      status: p.status,
      tags: p.tags,
    };
    const { data: existing } = await sb.from('products').select('id').eq('org_id', orgId).eq('slug', p.slug).maybeSingle();
    let productId;
    if (existing) {
      const { data, error } = await sb.from('products').update(row).eq('id', existing.id).select('id').single();
      if (error) throw error;
      productId = data.id;
      summary.products.push({ slug: p.slug, productId, action: 'updated' });
    } else {
      const { data, error } = await sb.from('products').insert(row).select('id').single();
      if (error) throw error;
      productId = data.id;
      summary.products.push({ slug: p.slug, productId, action: 'created' });
    }

    // Note: objectives table doesn't exist in 0001_initial.sql — they live
    // in configRegistry only today. When objectives table lands in a future
    // migration, the loop below uses sb.from('objectives'). For now we
    // skip Supabase-side objective seeding and only seed memory objectives
    // (idempotent there).
  }
  return summary;
}

// ─── Memory seeders ──────────────────────────────────────────────────

function seedMemory({ reset }) {
  const summary = { backend: 'memory', orgId: ORG.id, products: [], objectives: [] };
  for (const p of VEU_SEED) {
    const existing = getMemoryProduct(p.slug, { orgId: ORG.id });
    if (existing && reset) {
      // Memory adapter doesn't have a clean reset — mutate fields in place.
      Object.assign(existing, {
        live_url: p.live_url,
        description: p.description,
        type: p.type,
        status: p.status,
        tags: p.tags,
      });
      summary.products.push({ slug: p.slug, productId: existing.id, action: 'updated' });
    } else if (!existing) {
      const created = createMemoryProduct(
        { name: p.name, slug: p.slug, live_url: p.live_url, description: p.description, type: p.type, status: p.status, tags: p.tags },
        { orgId: ORG.id },
      );
      summary.products.push({ slug: p.slug, productId: created.id, action: 'created' });
    } else {
      summary.products.push({ slug: p.slug, productId: existing.id, action: 'kept' });
    }

    const productId = (summary.products[summary.products.length - 1] || {}).productId;
    for (const obj of (p.objectives || [])) {
      const o = upsertMemoryObjective({ product_id: productId, type: obj.type, value: obj.value, weight: obj.weight }, { orgId: ORG.id });
      summary.objectives.push({ slug: p.slug, type: obj.type, id: o.id });
    }
  }
  return summary;
}

// ─── Handler ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const adminKey = req.headers['x-flowai-admin-key'];
  if (!process.env.ADMIN_SEED_KEY) {
    return res.status(503).json({
      ok: false,
      error: 'admin_seed_unavailable',
      message: 'ADMIN_SEED_KEY not configured on the server',
    });
  }
  if (!adminKey || adminKey !== process.env.ADMIN_SEED_KEY) {
    return res.status(401).json({ error: 'Invalid x-flowai-admin-key' });
  }

  const reset = Boolean(req.body?.reset);
  const backend = selectedBackend();

  try {
    const summary = backend === 'supabase' && isSupabaseConfigured()
      ? await seedSupabase({ reset })
      : seedMemory({ reset });
    logger.info('admin.seed.completed', { orgId: ORG.id, backend, products: summary.products.length, objectives: summary.objectives.length });
    return res.status(200).json({ ok: true, ...summary });
  } catch (e) {
    logger.error('admin.seed.failed', { orgId: ORG.id, backend, error: e.message });
    return res.status(500).json({ ok: false, error: 'seed failed', details: e.message || String(e), backend });
  }
}

export const config = { maxDuration: 30 };
