const DEFAULT_PRODUCT_ID = 'flowai';
const DEFAULT_ENVIRONMENT = 'prd';

async function createSupabaseFromEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function createKvFromEnv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  const mod = await import('@vercel/kv');
  return mod.kv || null;
}

async function appendViaSupabase({ entry, productId, environment, supabase }) {
  const { data: row, error: selectError } = await supabase
    .from('product_ssot')
    .select('id, governance_record')
    .eq('product_id', productId)
    .eq('environment', environment)
    .maybeSingle();

  if (selectError) {
    return { written: false, transport: 'supabase', reason: `select_failed:${selectError.message}` };
  }
  if (!row?.id) {
    return { written: false, transport: 'supabase', reason: 'no_product_ssot_row' };
  }

  const prior = Array.isArray(row.governance_record) ? row.governance_record : [];
  const { error: updateError } = await supabase
    .from('product_ssot')
    .update({
      governance_record: [...prior, entry],
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (updateError) {
    return { written: false, transport: 'supabase', reason: `update_failed:${updateError.message}` };
  }
  return { written: true, transport: 'supabase', rowId: row.id };
}

async function appendViaKv({ entry, kv }) {
  const checkedAt = entry?.checkedAt || new Date().toISOString();
  const key = `flowai:governance:deploy-truth:${checkedAt}`;
  await kv.set(key, entry);
  return { written: true, transport: 'kv', key };
}

export async function appendGovernanceEntryLight({
  entry,
  productId = DEFAULT_PRODUCT_ID,
  environment = DEFAULT_ENVIRONMENT,
  supabase,
  kv,
  consoleImpl = console,
} = {}) {
  if (!entry || typeof entry !== 'object') {
    return { written: false, transport: null, reason: 'invalid_governance_entry' };
  }

  const supabaseClient = supabase ?? await createSupabaseFromEnv();
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    return appendViaSupabase({ entry, productId, environment, supabase: supabaseClient });
  }

  const kvClient = kv ?? await createKvFromEnv();
  if (kvClient && typeof kvClient.set === 'function') {
    return appendViaKv({ entry, kv: kvClient });
  }

  consoleImpl.log?.(JSON.stringify({
    kind: 'governance_artifact.console_fallback.v1',
    reason: 'governance_store_unavailable',
    entry,
  }));
  return { written: false, transport: 'console', reason: 'governance_store_unavailable' };
}

export const LIGHT_GOVERNANCE_DEFAULTS = Object.freeze({
  PRODUCT_ID: DEFAULT_PRODUCT_ID,
  ENVIRONMENT: DEFAULT_ENVIRONMENT,
});

export const __lightGovernanceInternals = Object.freeze({
  appendViaSupabase,
  appendViaKv,
});
