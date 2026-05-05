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

export function selectedBackend() {
  const explicit = process.env.DB_BACKEND;
  if (explicit === 'supabase') return 'supabase';
  if (explicit === 'memory') return 'memory';
  return isSupabaseConfigured() ? 'supabase' : 'memory';
}

function log(scope, msg, extra) {
  // Replaced by Axiom logger in /api/_lib/logger.js once that's in.
  if (process.env.NODE_ENV !== 'test') console.log(`[db:${scope}] ${msg}`, extra || '');
}

// ─── Products ────────────────────────────────────────────────────────────

// Memory adapter doesn't natively scope by org_id. We tag the in-memory
// product on create and filter on read so scoping behaviour matches Supabase.

export async function listProducts({ orgId, status, q, sort, limit, offset } = {}) {
  if (selectedBackend() === 'supabase') {
    const sb = getSupabase();
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
    query = query.range(offset || 0, (offset || 0) + (limit || 1000) - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { items: data || [], total: count || 0, limit: limit || 1000, offset: offset || 0 };
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
