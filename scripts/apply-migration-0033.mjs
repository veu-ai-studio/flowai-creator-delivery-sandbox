// Apply generated-product persistence substrate migration to live prd.
// Reads SUPABASE_DB_URL from Doppler env. Idempotent by design.

import pg from 'pg';
import { readFile } from 'node:fs/promises';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL missing from env');
  process.exit(1);
}

const sql = await readFile(new URL('../supabase/migrations/0033_generated_product_records.sql', import.meta.url), 'utf8');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(`
    select
      to_regclass('public.generated_product_records')::text as table_name,
      count(*)::int as existing_rows
    from public.generated_product_records
  `);
  console.log('generated_product_records migration state:');
  console.log(JSON.stringify(rows[0] || null));
} finally {
  await client.end();
}
