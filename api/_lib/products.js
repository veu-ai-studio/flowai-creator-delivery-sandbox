// In-memory product registry. Lives in module memory across warm function
// invocations. Does NOT survive cold starts or redeploys, so callers
// (and the UI) must mirror writes to localStorage / their own DB.
//
// This is the "shape" the UI and a future Postgres adapter must agree on.
//
// Product = {
//   id: 'p_xxx',
//   name: string,
//   url: string,                  // public URL or ''
//   description: string,
//   type: string,                 // free-form: 'web', 'mobile', 'demo', etc.
//   status: 'draft'|'active'|'archived'|'audited',
//   lastAuditAt: number|null,     // ms epoch
//   lastAuditScore: number|null,
//   costToDateUSD: number,
//   tags: string[],
//   createdAt: number,
//   updatedAt: number,
// }

const REGISTRY = new Map();
const MAX = 5000; // hard cap; well above the 1000+ requirement.

function newId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export function listProducts({ status, q, sort = '-updatedAt', limit = 1000, offset = 0 } = {}) {
  let arr = Array.from(REGISTRY.values());
  if (status) arr = arr.filter((p) => p.status === status);
  if (q) {
    const needle = q.toLowerCase();
    arr = arr.filter((p) =>
      (p.name || '').toLowerCase().includes(needle) ||
      (p.url || '').toLowerCase().includes(needle) ||
      (p.description || '').toLowerCase().includes(needle),
    );
  }
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  arr.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (desc ? -1 : 1));
  return {
    total: arr.length,
    limit,
    offset,
    items: arr.slice(offset, offset + limit),
  };
}

export function getProduct(id) {
  return REGISTRY.get(id) || null;
}

export function createProduct({ name, url = '', description = '', type = 'web', status = 'draft', tags = [] } = {}) {
  if (!name || !name.trim()) throw new Error('name is required');
  if (REGISTRY.size >= MAX) throw new Error(`Registry at hard cap of ${MAX} products`);
  const product = {
    id: newId(),
    name: name.trim(),
    url: (url || '').trim(),
    description: description || '',
    type,
    status,
    tags,
    lastAuditAt: null,
    lastAuditScore: null,
    costToDateUSD: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  REGISTRY.set(product.id, product);
  return product;
}

export function updateProduct(id, patch = {}) {
  const existing = REGISTRY.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: Date.now() };
  REGISTRY.set(id, updated);
  return updated;
}

export function deleteProduct(id) {
  return REGISTRY.delete(id);
}

export function bulkUpsert(items = []) {
  const out = [];
  for (const item of items) {
    if (item.id && REGISTRY.has(item.id)) {
      out.push(updateProduct(item.id, item));
    } else {
      out.push(createProduct(item));
    }
  }
  return out;
}

export function recordAudit(id, { score, costUSD = 0 } = {}) {
  const existing = REGISTRY.get(id);
  if (!existing) return null;
  existing.lastAuditAt = Date.now();
  existing.lastAuditScore = typeof score === 'number' ? score : existing.lastAuditScore;
  existing.costToDateUSD = (existing.costToDateUSD || 0) + (Number(costUSD) || 0);
  existing.status = 'audited';
  existing.updatedAt = Date.now();
  REGISTRY.set(id, existing);
  return existing;
}

export function stats() {
  let totalCost = 0, audited = 0, draft = 0, active = 0, archived = 0;
  for (const p of REGISTRY.values()) {
    totalCost += p.costToDateUSD || 0;
    if (p.status === 'audited') audited += 1;
    else if (p.status === 'draft') draft += 1;
    else if (p.status === 'active') active += 1;
    else if (p.status === 'archived') archived += 1;
  }
  return {
    total: REGISTRY.size,
    cap: MAX,
    audited, draft, active, archived,
    totalCostUSD: Number(totalCost.toFixed(6)),
  };
}
