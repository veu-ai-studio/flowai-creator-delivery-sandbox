// D34 T1 — apply migration 0019 to live prd via direct Postgres connection.
// Reads SUPABASE_DB_URL from Doppler env. Idempotent (ADD COLUMN IF NOT
// EXISTS + UPDATE WHERE NULL).

import pg from 'pg';
import { readFile } from 'node:fs/promises';

const url = process.env.SUPABASE_DB_URL;
if (!url) { console.error('SUPABASE_DB_URL missing from env'); process.exit(1); }

const sql = await readFile(new URL('../supabase/migrations/0019_product_registry_branch.sql', import.meta.url), 'utf8');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(
    `select product_id, environment, self_renewal_branch from public.product_registry order by product_id`,
  );
  console.log('product_registry branch column state:');
  for (const r of rows) {
    console.log(`  ${r.product_id} | env=${r.environment} | branch=${r.self_renewal_branch}`);
  }
} finally {
  await client.end();
}
