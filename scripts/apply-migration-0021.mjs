// D40 — apply migration 0021 to live prd via direct Postgres.
import pg from 'pg';
import { readFile } from 'node:fs/promises';

const url = process.env.SUPABASE_DB_URL;
if (!url) { console.error('SUPABASE_DB_URL missing from env'); process.exit(1); }

const sql = await readFile(new URL('../supabase/migrations/0021_product_registry_product_url.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(`select product_id, product_url from public.product_registry order by product_id`);
  console.log('product_registry product_url state:');
  for (const r of rows) console.log(`  ${r.product_id} | ${r.product_url}`);
} finally {
  await client.end();
}
