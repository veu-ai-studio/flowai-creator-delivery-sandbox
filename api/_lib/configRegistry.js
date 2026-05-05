// In-memory configuration registry — products, objectives, runs, snapshots.
//
// This is the storage backend for /api/configuration/* when DB_BACKEND is
// 'memory'. db.js routes through here. Once Supabase is wired, the same
// shape lives in Postgres tables with org_id / product_id FKs.
//
// All collections are scoped by org_id at read time.

const products = new Map();      // slug -> product
const objectives = new Map();    // id -> objective
const runs = new Map();          // id -> run record (clone/synthesize/describe)
const snapshots = new Map();     // run_id -> snapshot (heavy: html + screenshots)

const PRODUCT_HARD_CAP = 10000;
const SNAPSHOT_HARD_CAP = 2000;

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(name) {
  return String(name || '').toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

// ─── Products ────────────────────────────────────────────────────────────

export function listProducts({ orgId, status, q, limit = 1000, offset = 0 } = {}) {
  let arr = Array.from(products.values());
  if (orgId) arr = arr.filter((p) => p.org_id === orgId);
  if (status) arr = arr.filter((p) => p.status === status);
  if (q) {
    const needle = String(q).toLowerCase();
    arr = arr.filter((p) =>
      (p.name || '').toLowerCase().includes(needle) ||
      (p.slug || '').toLowerCase().includes(needle) ||
      (p.live_url || '').toLowerCase().includes(needle) ||
      (p.description || '').toLowerCase().includes(needle),
    );
  }
  arr.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  return {
    total: arr.length,
    limit, offset,
    items: arr.slice(offset, offset + limit),
  };
}

export function getProduct(idOrSlug, { orgId } = {}) {
  // Allow lookup by slug OR by id (id starts with prod_)
  let p = products.get(idOrSlug);
  if (!p) {
    for (const candidate of products.values()) {
      if (candidate.id === idOrSlug) { p = candidate; break; }
    }
  }
  if (!p) return null;
  if (orgId && p.org_id && p.org_id !== orgId) return null;
  return p;
}

export function createProduct(input, { orgId } = {}) {
  if (products.size >= PRODUCT_HARD_CAP) throw new Error(`Registry at hard cap of ${PRODUCT_HARD_CAP}`);
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('name is required');
  const slug = (input?.slug && slugify(input.slug)) || slugify(name);
  if (!slug) throw new Error('slug is required');
  if (products.has(slug)) throw new Error(`Product with slug "${slug}" already exists`);

  const product = {
    id: newId('prod'),
    org_id: orgId || input?.org_id || null,
    name,
    slug,
    live_url: String(input?.live_url || '').trim(),
    description: String(input?.description || ''),
    org: input?.org || 'VEU AI Studio',                 // legacy display field
    type: input?.type || 'web',
    status: input?.status || 'active',
    tags: Array.isArray(input?.tags) ? input.tags : [],
    last_audit_at: null,
    last_audit_score: null,
    last_run_id: null,
    cost_to_date_usd: 0,
    metadata: input?.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: Date.now(),
  };
  products.set(slug, product);
  return product;
}

export function updateProduct(idOrSlug, patch = {}, { orgId } = {}) {
  const existing = getProduct(idOrSlug, { orgId });
  if (!existing) return null;
  // Slug rename: shift the Map key
  if (patch.slug && patch.slug !== existing.slug) {
    const newSlug = slugify(patch.slug);
    if (products.has(newSlug)) throw new Error(`Slug "${newSlug}" already in use`);
    products.delete(existing.slug);
    existing.slug = newSlug;
    products.set(newSlug, existing);
  }
  Object.assign(existing, patch, { updated_at: Date.now() });
  return existing;
}

export function deleteProduct(idOrSlug, { orgId } = {}) {
  const existing = getProduct(idOrSlug, { orgId });
  if (!existing) return false;
  return products.delete(existing.slug);
}

export function recordProductAudit(idOrSlug, { score, costUSD, lastRunId } = {}, { orgId } = {}) {
  const existing = getProduct(idOrSlug, { orgId });
  if (!existing) return null;
  existing.last_audit_at = new Date().toISOString();
  if (typeof score === 'number') existing.last_audit_score = score;
  existing.cost_to_date_usd = (existing.cost_to_date_usd || 0) + (Number(costUSD) || 0);
  if (lastRunId) existing.last_run_id = lastRunId;
  existing.status = 'audited';
  existing.updated_at = Date.now();
  return existing;
}

export function productsStats({ orgId } = {}) {
  let total = 0, active = 0, audited = 0, archived = 0, beta = 0, totalCost = 0;
  for (const p of products.values()) {
    if (orgId && p.org_id && p.org_id !== orgId) continue;
    total += 1;
    totalCost += p.cost_to_date_usd || 0;
    if (p.status === 'active') active += 1;
    else if (p.status === 'audited') audited += 1;
    else if (p.status === 'archived') archived += 1;
    else if (p.status === 'beta') beta += 1;
  }
  return { total, active, audited, archived, beta, totalCostUSD: Number(totalCost.toFixed(6)) };
}

// ─── Objectives (per-product settings) ──────────────────────────────────

export function listObjectives({ orgId, productId } = {}) {
  let arr = Array.from(objectives.values());
  if (orgId) arr = arr.filter((o) => o.org_id === orgId);
  if (productId) arr = arr.filter((o) => o.product_id === productId);
  arr.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  return arr;
}

export function getObjective(id) {
  return objectives.get(id) || null;
}

export function upsertObjective(input, { orgId } = {}) {
  const productId = input?.product_id;
  if (!productId) throw new Error('product_id required');
  if (!input?.type) throw new Error('type required (goal|constraint|preference)');
  if (input?.id && objectives.has(input.id)) {
    const existing = objectives.get(input.id);
    Object.assign(existing, input, { org_id: orgId || existing.org_id, updated_at: Date.now() });
    return existing;
  }
  const obj = {
    id: input.id || newId('obj'),
    org_id: orgId || input.org_id || null,
    product_id: productId,
    type: input.type,                  // 'goal' | 'constraint' | 'preference'
    value: input.value || '',
    weight: typeof input.weight === 'number' ? input.weight : 1,
    metadata: input.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: Date.now(),
  };
  objectives.set(obj.id, obj);
  return obj;
}

export function deleteObjective(id, { orgId } = {}) {
  const existing = objectives.get(id);
  if (!existing) return false;
  if (orgId && existing.org_id && existing.org_id !== orgId) return false;
  return objectives.delete(id);
}

// ─── Configuration runs (clone / synthesize / describe) ─────────────────

export function createRun({ mode, orgId, productId, status = 'running', input, metadata } = {}) {
  const run = {
    id: newId(`${mode || 'run'}`),
    org_id: orgId || null,
    product_id: productId || null,
    mode,                                  // 'clone' | 'synthesize' | 'describe'
    status,                                // 'queued' | 'running' | 'completed' | 'failed'
    input: input || null,
    output: null,
    error: null,
    metadata: metadata || {},
    cost_usd: 0,
    quality_score: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_ms: null,
  };
  runs.set(run.id, run);
  return run;
}

export function updateRun(id, patch = {}) {
  const existing = runs.get(id);
  if (!existing) return null;
  Object.assign(existing, patch);
  if (patch.status === 'completed' || patch.status === 'failed') {
    existing.completed_at = new Date().toISOString();
    if (existing.started_at) {
      existing.duration_ms = new Date(existing.completed_at).getTime() - new Date(existing.started_at).getTime();
    }
  }
  return existing;
}

export function getRun(id) {
  return runs.get(id) || null;
}

export function listRuns({ orgId, productId, mode, status, limit = 100 } = {}) {
  let arr = Array.from(runs.values());
  if (orgId) arr = arr.filter((r) => r.org_id === orgId);
  if (productId) arr = arr.filter((r) => r.product_id === productId);
  if (mode) arr = arr.filter((r) => r.mode === mode);
  if (status) arr = arr.filter((r) => r.status === status);
  arr.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  return arr.slice(0, limit);
}

// ─── Snapshots (heavy data — kept separate to keep run records light) ───

export function saveSnapshot(runId, snapshot) {
  if (snapshots.size >= SNAPSHOT_HARD_CAP) {
    // Evict oldest. Tomorrow on Supabase: large objects → object storage.
    const oldest = snapshots.keys().next().value;
    if (oldest) snapshots.delete(oldest);
  }
  snapshots.set(runId, { ...snapshot, _stored_at: new Date().toISOString() });
  return snapshots.get(runId);
}

export function getSnapshot(runId) {
  return snapshots.get(runId) || null;
}

// ─── Seed VEU portfolio (idempotent) ────────────────────────────────────

const VEU_SEED = [
  { name: 'SAIGE',       slug: 'saige',       live_url: 'https://saigedemo.com',         description: 'Sustainability + ESG + EHS + CSR enterprise impact platform', tags: ['sustainability', 'esg'], org_id: 'veu-ai-studio' },
  { name: 'PressAI',     slug: 'pressai',     live_url: 'https://ourpublishingai.com',   description: 'AI publishing platform for authors and publishers',           tags: ['publishing'],            org_id: 'veu-ai-studio' },
  { name: 'ReachSMS',    slug: 'reachsms',    live_url: 'https://ourcommunitiesai.com',  description: 'SMS community engagement for nonprofits',                     tags: ['sms', 'nonprofit'],      org_id: 'veu-ai-studio' },
  { name: 'RelTwin',     slug: 'reltwin',     live_url: 'https://reltwin.com',           description: 'Relationship intelligence for coaches and HR',                tags: ['hr', 'coaching'],        org_id: 'veu-ai-studio' },
  { name: 'MyBirthSafe', slug: 'mybirthsafe', live_url: 'https://safe-path.base44.app',  description: 'Maternal health platform for Africa',                         tags: ['health', 'maternal'],    org_id: 'veu-ai-studio' },
];

export function seedVeuPortfolio() {
  const created = [];
  for (const seed of VEU_SEED) {
    if (products.has(seed.slug)) continue;
    created.push(createProduct(seed, { orgId: 'veu-ai-studio' }));
  }
  return created;
}

// Auto-seed on first module load so /api/products always returns the VEU
// portfolio even before anyone explicitly seeds.
seedVeuPortfolio();
