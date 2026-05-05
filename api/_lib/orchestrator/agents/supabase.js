// Supabase agent — generic table read/write/upsert.

import { getSupabase, isSupabaseConfigured } from '../../supabase.js';
import { successEnvelope, envelope, ErrorCodes, validateDbWriteInput } from '../contracts.js';

export const supabaseAgent = {
  description: 'Supabase persistence (Postgres + pgvector + Row-Level Security)',
  isEnabled: isSupabaseConfigured,
  validate(input) {
    if (input?.op === 'select') {
      if (!input?.table) return { ok: false, error: 'input.table required for select' };
      return null;
    }
    return validateDbWriteInput(input);
  },
  retry: { attempts: 2, backoffMs: 500 },
  async run({ op = 'insert', table, row, rows, filters, select = '*' }) {
    const sb = getSupabase();
    if (!sb) return envelope({ agent: 'supabase', code: ErrorCodes.AGENT_DISABLED, message: 'Supabase not configured' });
    try {
      if (op === 'select') {
        let q = sb.from(table).select(select);
        for (const [k, v] of Object.entries(filters || {})) q = q.eq(k, v);
        const { data, error } = await q;
        if (error) throw error;
        return successEnvelope({ agent: 'supabase', output: { rows: data || [] } });
      }
      if (op === 'insert') {
        const { data, error } = await sb.from(table).insert(row).select().single();
        if (error) throw error;
        return successEnvelope({ agent: 'supabase', output: { row: data } });
      }
      if (op === 'upsert') {
        const { data, error } = await sb.from(table).upsert(rows || row).select();
        if (error) throw error;
        return successEnvelope({ agent: 'supabase', output: { rows: data || [] } });
      }
      if (op === 'update') {
        let q = sb.from(table).update(row);
        for (const [k, v] of Object.entries(filters || {})) q = q.eq(k, v);
        const { data, error } = await q.select();
        if (error) throw error;
        return successEnvelope({ agent: 'supabase', output: { rows: data || [] } });
      }
      if (op === 'delete') {
        let q = sb.from(table).delete();
        for (const [k, v] of Object.entries(filters || {})) q = q.eq(k, v);
        const { error } = await q;
        if (error) throw error;
        return successEnvelope({ agent: 'supabase', output: { deleted: true } });
      }
      return envelope({ agent: 'supabase', code: ErrorCodes.INVALID_INPUT, message: `Unknown op: ${op}` });
    } catch (e) {
      return envelope({ agent: 'supabase', code: ErrorCodes.UPSTREAM_ERROR, message: e.message || String(e), retriable: true });
    }
  },
  async health() {
    if (!isSupabaseConfigured()) return { ok: false, reason: 'not configured' };
    const sb = getSupabase();
    try {
      const { error } = await sb.from('organizations').select('id', { count: 'exact', head: true });
      return { ok: !error, error: error?.message };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
