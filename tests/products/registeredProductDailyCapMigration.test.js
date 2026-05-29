import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  resolve(__dirname, '../../supabase/migrations/0029_product_registry_daily_cap_50.sql'),
  'utf8',
);

describe('registered product daily cap migration', () => {
  it('raises default and existing lower caps to 50 without lowering higher caps', () => {
    expect(migration).toContain('alter column self_renewal_max_per_day set default 50');
    expect(migration).toContain('set self_renewal_max_per_day = 50');
    expect(migration).toContain('where self_renewal_max_per_day < 50');
  });
});
