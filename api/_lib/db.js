// Database abstraction layer.
//
// Endpoints import from this file — never directly from supabase.js or the
// in-memory ring buffers. That way we can flip the backend with a single env
// var when credentials land tomorrow.
//
// Backend selection:
//   DB_BACKEND=supabase     → use Supabase (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//   DB_BACKEND=memory       → in-process module memory (today's default for /api/products etc.)
//   DB_BACKEND unset        → auto: 'supabase' if configured, else 'memory'
//
// Multi-tenant contract: every write accepts an `orgId` and `productId` and
// must persist them. Reads accept the same as scoping filters. The in-memory
// adapter today *records* both fields so scoping works identically the moment
// Supabase is enabled.

import { getSupabase, isSupabaseConfigured } from './supabase.js';
import * as memProducts from './products.js';
import { append as appendAudit, readLog as readAuditLog } from './auditlog.js';
import { recordCost as recordCostMem, readLog as readCostLog, summarise as summariseCost } from './cost.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_REGISTRY_BASE_SELECT = [
  'product_id',
  'org_id',
  'github_repo_url',
  'vercel_project_id',
  'product_url',
  'environment',
  'self_renewal_enabled',
  'self_renewal_branch',
  'created_at',
  'updated_at',
];

const PRODUCT_REGISTRY_OPTIONAL_DELIVERY_SELECT = [
  'original_repo',
  'original_url',
  'original_status',
  'upgrade_repo',
  'upgrade_url',
  'upgrade_status',
  'upgrade_architecture',
  'deployment_url',
  'deployment_status',
  'upgrade_repo_status',
];

const PRODUCT_REGISTRY_SELECT = [
  ...PRODUCT_REGISTRY_BASE_SELECT,
  ...PRODUCT_REGISTRY_OPTIONAL_DELIVERY_SELECT,
].join(',');

const PRODUCT_REGISTRY_BASE_SELECT_STRING = PRODUCT_REGISTRY_BASE_SELECT.join(',');

export function selectedBackend() {
  const explicit = process.env.DB_BACKEND;
  if (explicit === 'supabase') return 'supabase';
  if (explicit === 'memory') return 'memory';
  return isSupabaseConfigured() ? 'supabase' : 'memory';
}

// Axiom-backed structured logger (console fallback when AXIOM_TOKEN unset).
import { logger as _logger } from './logger.js';
function log(scope, msg, extra) {
  _logger.debug(`db.${scope}: ${msg}`, extra || {});
}

// ─── Products ────────────────────────────────────────────────────────────

// Memory adapter doesn't natively scope by org_id. We tag the in-memory
// product on create and filter on read so scoping behaviour matches Supabase.

function isUuidString(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function cleanString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function nameFromProductId(productId) {
  const value = cleanString(productId);
  if (!value) return 'Product';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2) return part.toUpperCase();
      return part.slice(0, 1).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function latestScoreFromProductSsot(row) {
  const records = Array.isArray(row?.governance_record) ? row.governance_record : [];
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (!record || typeof record !== 'object') continue;
    const candidates = [
      record.finalScore,
      record.currentScore,
      record.score,
      record.artifact?.finalScore,
      record.artifact?.currentScore,
      record.artifact?.score,
      record.artifact?.result?.finalScore,
      record.artifact?.result?.currentScore,
      record.result?.finalScore,
      record.result?.currentScore,
      record.scores?.current,
      record.scores?.final,
    ];
    const score = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
    if (score !== undefined) {
      return {
        score,
        recordedAt: cleanString(record.recordedAt ?? record.completedAt ?? record.createdAt, null),
      };
    }
  }
  return { score: null, recordedAt: null };
}

function isMissingProductRegistryColumnError(error) {
  if (!error) return false;
  const message = String(error.message ?? error.details ?? '');
  return error.code === '42703'
    && /column\s+product_registry\.[a-z0-9_]+\s+does\s+not\s+exist/i.test(message);
}

function buildProductRegistryPortfolioQuery({ supabase, orgId, status, limit, offset }, selectColumns) {
  let registryQuery = supabase
    .from('product_registry')
    .select(selectColumns, { count: 'exact' });
  if (orgId) registryQuery = registryQuery.eq('org_id', orgId);
  if (status) {
    const enabled = status === 'active' || status === 'audited';
    if (enabled || status === 'draft') registryQuery = registryQuery.eq('self_renewal_enabled', enabled);
  }
  return registryQuery
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

function mapProductRegistryRowToProduct(row, ssotRow = null) {
  const identity = ssotRow?.identity_block && typeof ssotRow.identity_block === 'object'
    ? ssotRow.identity_block
    : {};
  const buildBrief = ssotRow?.build_brief && typeof ssotRow.build_brief === 'object'
    ? ssotRow.build_brief
    : {};
  const latestScore = latestScoreFromProductSsot(ssotRow);
  const productId = cleanString(row?.product_id, 'unknown-product');
  const name = cleanString(identity.productName ?? identity.name, nameFromProductId(productId));
  const canonicalUrl = cleanString(row?.product_url ?? identity.productUrl ?? row?.original_url ?? row?.deployment_url ?? row?.upgrade_url, '');

  return {
    id: productId,
    org_id: cleanString(row?.org_id, null),
    name,
    slug: productId,
    url: canonicalUrl,
    live_url: canonicalUrl,
    original_url: cleanString(row?.original_url ?? identity.productUrl ?? row?.product_url, null),
    description: cleanString(buildBrief.normalizedConcept ?? buildBrief.description, ''),
    type: 'web',
    status: row?.self_renewal_enabled === false ? 'draft' : 'active',
    tags: [],
    last_audit_at: latestScore.recordedAt ?? row?.updated_at ?? ssotRow?.updated_at ?? null,
    last_audit_score: latestScore.score,
    cost_to_date_usd: 0,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? ssotRow?.updated_at ?? null,
    github_repo_url: row?.github_repo_url ?? null,
    original_repo_url: row?.original_repo ?? null,
    upgrade_repo_url: row?.upgrade_repo ?? row?.github_repo_url ?? null,
    upgrade_url: row?.upgrade_url ?? null,
    deployment_url: row?.deployment_url ?? row?.upgrade_url ?? null,
    canonical_url: canonicalUrl,
    upgrade_repo_status: row?.upgrade_repo_status ?? (row?.upgrade_repo || row?.github_repo_url ? 'provisioned' : null),
    deployment_status: row?.deployment_status ?? (row?.deployment_url || row?.upgrade_url ? 'deployed' : null),
    source: 'product_registry',
  };
}

async function listProductRegistryPortfolio({ supabase, orgId, status, q, limit = 1000, offset = 0 } = {}) {
  let deliveryColumnsAvailable = true;
  let { data: registryRows, count, error } = await buildProductRegistryPortfolioQuery(
    { supabase, orgId, status, limit, offset },
    PRODUCT_REGISTRY_SELECT,
  );
  if (isMissingProductRegistryColumnError(error)) {
    deliveryColumnsAvailable = false;
    ({ data: registryRows, count, error } = await buildProductRegistryPortfolioQuery(
      { supabase, orgId, status, limit, offset },
      PRODUCT_REGISTRY_BASE_SELECT_STRING,
    ));
  }
  if (error) throw error;
  const rows = Array.isArray(registryRows) ? registryRows : [];
  if (rows.length === 0) {
    return {
      items: [],
      total: count || 0,
      limit,
      offset,
      stats: { total: count || 0, source: 'product_registry', deliveryColumnsAvailable },
    };
  }

  const productIds = rows.map((row) => row.product_id).filter(Boolean);
  const { data: ssotRows, error: ssotError } = await supabase
    .from('product_ssot')
    .select('product_id,environment,identity_block,build_brief,governance_record,updated_at')
    .in('product_id', productIds);
  if (ssotError) throw ssotError;
  const ssotByProduct = new Map((Array.isArray(ssotRows) ? ssotRows : [])
    .filter((row) => row?.environment === 'prd' || !row?.environment)
    .map((row) => [row.product_id, row]));
  let items = rows.map((row) => mapProductRegistryRowToProduct(row, ssotByProduct.get(row.product_id)));
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter((item) =>
      (item.name || '').toLowerCase().includes(needle)
      || (item.slug || '').toLowerCase().includes(needle)
      || (item.url || '').toLowerCase().includes(needle)
      || (item.description || '').toLowerCase().includes(needle));
  }

  return {
    items,
    total: typeof count === 'number' ? count : items.length,
    limit,
    offset,
    stats: {
      total: items.length,
      active: items.filter((item) => item.status === 'active').length,
      audited: items.filter((item) => typeof item.last_audit_score === 'number').length,
      archived: 0,
      draft: items.filter((item) => item.status === 'draft').length,
      totalCostUSD: 0,
      source: 'product_registry',
      deliveryColumnsAvailable,
    },
  };
}

export async function listProducts({ orgId, status, q, sort, limit, offset } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const pageLimit = limit || 1000;
    const pageOffset = offset || 0;
    if (!orgId || isUuidString(orgId)) {
      let query = sb.from('products').select('*', { count: 'exact' });
      if (orgId) query = query.eq('org_id', orgId);
      if (status) query = query.eq('status', status);
      if (q) query = query.or(`name.ilike.%${q}%,url.ilike.%${q}%,description.ilike.%${q}%`);
      if (sort) {
        const desc = sort.startsWith('-');
        const col = desc ? sort.slice(1) : sort;
        query = query.order(col, { ascending: !desc });
      } else {
        query = query.order('updated_at', { ascending: false });
      }
      query = query.range(pageOffset, pageOffset + pageLimit - 1);
      const { data, count, error } = await query;
      if (error) throw error;
      if ((data || []).length > 0) {
        return { items: data || [], total: count || 0, limit: pageLimit, offset: pageOffset };
      }
    }
    return listProductRegistryPortfolio({ supabase: sb, orgId, status, q, limit: pageLimit, offset: pageOffset });
  }

  // Memory adapter
  const all = memProducts.listProducts({ status, q, sort, limit, offset });
  if (orgId) {
    const filtered = (all.items || []).filter((p) => !p.org_id || p.org_id === orgId);
    return { ...all, items: filtered };
  }
  return all;
}

export async function getProduct(id, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let query = sb.from('products').select('*').eq('id', id);
    if (orgId) query = query.eq('org_id', orgId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }
  const item = memProducts.getProduct(id);
  if (orgId && item && item.org_id && item.org_id !== orgId) return null;
  return item;
}

export async function createProduct(input, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      org_id: orgId,
      name: input.name,
      url: input.url || '',
      description: input.description || '',
      type: input.type || 'web',
      status: input.status || 'draft',
      tags: input.tags || [],
    };
    const { data, error } = await sb.from('products').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  const item = memProducts.createProduct(input);
  item.org_id = orgId || null;
  return item;
}

export async function updateProduct(id, patch, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('products').update(patch).eq('id', id);
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  }
  const item = memProducts.updateProduct(id, patch);
  if (orgId && item && item.org_id && item.org_id !== orgId) return null;
  return item;
}

export async function deleteProduct(id, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('products').delete().eq('id', id);
    if (orgId) q = q.eq('org_id', orgId);
    const { error } = await q;
    if (error) throw error;
    return true;
  }
  const item = memProducts.getProduct(id);
  if (orgId && item && item.org_id && item.org_id !== orgId) return false;
  return memProducts.deleteProduct(id);
}

export async function recordProductAudit(id, { score, costUSD } = {}, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('products').update({
      last_audit_at: new Date().toISOString(),
      last_audit_score: score ?? null,
      cost_to_date_usd: undefined, // computed in DB via trigger or RPC; left for tomorrow
      status: 'audited',
    }).eq('id', id);
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q.select().single();
    if (error) throw error;
    // Roll cost separately
    if (costUSD) {
      await sb.rpc('increment_product_cost', { p_id: id, p_amount: costUSD }).catch(() => {});
    }
    return data;
  }
  return memProducts.recordAudit(id, { score, costUSD });
}

// ─── Audit log ───────────────────────────────────────────────────────────

export async function appendAuditEntry(entry) {
  // entry: { actionType, severity, sessionId?, productId?, productUrl?, detail?, actor?, orgId? }
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      org_id: entry.orgId || null,
      product_id: entry.productId || null,
      run_id: entry.sessionId || null,
      actor: entry.actor || 'flowai-engine',
      action_type: entry.actionType,
      severity: entry.severity || 'info',
      product_url: entry.productUrl || null,
      detail: entry.detail || null,
    };
    const { data, error } = await sb.from('audit_log').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  return appendAudit({ ...entry });
}

export async function listAuditEntries({ orgId, productId, sessionId, severity, actionType, since, limit } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('audit_log').select('*').order('created_at', { ascending: false });
    if (orgId) q = q.eq('org_id', orgId);
    if (productId) q = q.eq('product_id', productId);
    if (sessionId) q = q.eq('run_id', sessionId);
    if (severity) q = q.eq('severity', severity);
    if (actionType) q = q.eq('action_type', actionType);
    if (since) q = q.gte('created_at', new Date(Number(since)).toISOString());
    q = q.limit(limit || 200);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  return readAuditLog({ orgId, productId, sessionId, severity, actionType, since, limit });
}

// ─── Cost events ─────────────────────────────────────────────────────────

export async function appendCostEvent(entry) {
  // entry: { endpoint, sessionId?, model, usage, text, stop_reason, orgId?, productId? }
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      org_id: entry.orgId || null,
      product_id: entry.productId || null,
      run_id: entry.sessionId || null,
      endpoint: entry.endpoint,
      model: entry.model,
      input_tokens: entry.usage?.input_tokens || 0,
      output_tokens: entry.usage?.output_tokens || 0,
      cache_creation_tokens: entry.usage?.cache_creation_input_tokens || 0,
      cache_read_tokens: entry.usage?.cache_read_input_tokens || 0,
      est_usd: entry.estUSD || 0,
      stop_reason: entry.stop_reason || null,
    };
    const { data, error } = await sb.from('cost_events').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  return recordCostMem(entry);
}

export async function listCostEvents({ orgId, sessionId, endpoint, since, limit } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('cost_events').select('*').order('created_at', { ascending: false });
    if (orgId) q = q.eq('org_id', orgId);
    if (sessionId) q = q.eq('run_id', sessionId);
    if (endpoint) q = q.eq('endpoint', endpoint);
    if (since) q = q.gte('created_at', new Date(Number(since)).toISOString());
    q = q.limit(limit || 200);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  return readCostLog({ sessionId, endpoint, since, limit });
}

export async function costSummary({ orgId, sessionId, endpoint, since, entries: extraEntries = [] } = {}) {
  const native = await listCostEvents({ orgId, sessionId, endpoint, since, limit: 1000 });
  const merged = [...native, ...extraEntries];
  return summariseCost(merged);
}

// ─── Workspace runs (Auto Runner sessions) ────────────────────────────────

export async function createRun({ orgId, productId, mode, inputs, objective, autoParams, multiMode } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      org_id: orgId || null,
      product_id: productId || null,
      mode: mode || 'auto',
      status: 'running',
      inputs: inputs || [],
      objective: objective || null,
      auto_params: autoParams || null,
      multi_mode: multiMode || null,
      current_step: 0,
    };
    const { data, error } = await sb.from('workspace_runs').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  log('memory', 'createRun (no-op for memory adapter; UI persists to localStorage)');
  return {
    id: 'mem_' + Date.now().toString(36),
    org_id: orgId, product_id: productId, mode, status: 'running',
    inputs, objective, auto_params: autoParams, multi_mode: multiMode,
    current_step: 0, created_at: new Date().toISOString(),
  };
}

export async function recordRunStep({ runId, stepKey, stepNumber, score, verdict, output, json, costUSD, orgId, productId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      run_id: runId,
      org_id: orgId || null,
      product_id: productId || null,
      step_key: stepKey,
      step_number: stepNumber || null,
      score: score ?? null,
      verdict: verdict ?? null,
      output_text: (output || '').slice(0, 32000),
      output_json: json || null,
      est_usd: costUSD ?? 0,
    };
    const { data, error } = await sb.from('run_steps').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  return null; // memory adapter: caller's responsibility
}

export async function updateRun(runId, patch = {}, { orgId } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    let q = sb.from('workspace_runs').update(patch).eq('id', runId);
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  }
  return null;
}

// ─── Clearance checks ────────────────────────────────────────────────────

export async function appendClearanceCheck({ orgId, productId, runId, decision, score, conditions, output } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
    const row = {
      org_id: orgId || null,
      product_id: productId || null,
      run_id: runId || null,
      decision,
      score: score ?? null,
      conditions: conditions || [],
      output_text: (output || '').slice(0, 32000),
    };
    const { data, error } = await sb.from('clearance_checks').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  // For memory mode we surface this via audit-log so governance dashboard sees it.
  return appendAuditEntry({
    actionType: 'clearance_run',
    severity: decision === 'NOT CLEARED' ? 'warning' : 'info',
    orgId, productId, sessionId: runId,
    detail: { decision, score, conditions },
  });
}

// ─── Health ──────────────────────────────────────────────────────────────

export async function healthcheck() {
  const backend = selectedBackend();
  const result = { backend, ok: true, details: {} };
  if (backend === 'supabase') {
    try {
      const sb = getSupabase();
      const { error } = await sb.from('organizations').select('id', { count: 'exact', head: true });
      if (error) {
        result.ok = false;
        result.details.error = error.message;
      } else {
        result.details.connection = 'ok';
      }
    } catch (e) {
      result.ok = false;
      result.details.error = e.message || String(e);
    }
  } else {
    result.details.note = 'in-memory adapter (no persistence across cold starts)';
  }
  return result;
}

export const __internals = Object.freeze({
  isUuidString,
  isMissingProductRegistryColumnError,
  latestScoreFromProductSsot,
  listProductRegistryPortfolio,
  mapProductRegistryRowToProduct,
  nameFromProductId,
});
