// Daily cost rollup. Aggregates the previous 24h of cost events per org and
// writes a daily summary row. Today: a no-op when on memory backend (rolling
// window already in process). Tomorrow: writes a `cost_daily_rollups` row.

import { selectedBackend } from '../db.js';
import { listCostEvents } from '../db.js';

export async function rollupYesterdayCosts() {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const entries = await listCostEvents({ since, limit: 5000 }).catch(() => []);

  // Group by orgId
  const byOrg = new Map();
  for (const e of entries) {
    const orgId = e.org_id || e.orgId || null;
    const cur = byOrg.get(orgId) || { calls: 0, inputTokens: 0, outputTokens: 0, estUSD: 0 };
    cur.calls += 1;
    cur.inputTokens += e.input_tokens || e.inputTokens || 0;
    cur.outputTokens += e.output_tokens || e.outputTokens || 0;
    cur.estUSD += Number(e.est_usd || e.estUSD || 0);
    byOrg.set(orgId, cur);
  }

  const rollups = Array.from(byOrg.entries()).map(([orgId, agg]) => ({ orgId, ...agg, ts: Date.now() }));

  // Persistence: TODO(supabase) — once a `cost_daily_rollups` table is added,
  // upsert one row per (org_id, date). Today we just return the rollups so
  // the Inngest dashboard logs them.
  return { backend: selectedBackend(), rollups };
}
