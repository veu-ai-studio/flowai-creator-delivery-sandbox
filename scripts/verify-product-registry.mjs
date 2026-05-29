import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();
try {
  const r = await c.query(
    "SELECT product_id, self_renewal_enabled, github_repo_url FROM product_registry ORDER BY product_id"
  );
  console.log('product_registry rows:', r.rowCount);
  for (const row of r.rows) {
    console.log(`  ${row.product_id.padEnd(12)} enabled=${row.self_renewal_enabled} ${row.github_repo_url || '(no repo)'}`);
  }
} catch (e) {
  console.error('QUERY_FAILED:', e?.code || '', e?.message);
} finally {
  await c.end();
}
