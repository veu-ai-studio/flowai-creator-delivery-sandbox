import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/0032_step_tool_rankings_build_codex.sql'),
  'utf8',
);

describe('0032 Build tool ranking migration', () => {
  it('reorders Build tools without overwriting observed score history by rank', () => {
    expect(migrationSql).toContain('existing_build_rows as');
    expect(migrationSql).toContain("where step_name = 'build'");
    expect(migrationSql).toContain('delete from public.step_tool_rankings');
    expect(migrationSql).toContain('on e.platform_key = lower(trim(c.platform_name))');

    for (const scoreColumn of [
      'performance_score',
      'cost_score',
      'speed_score',
      'reliability_score',
    ]) {
      expect(migrationSql).toContain(`coalesce(e.${scoreColumn}, c.${scoreColumn})`);
    }

    expect(migrationSql).not.toMatch(/on conflict\s*\(step_name,\s*rank\)/i);
    expect(migrationSql).not.toContain('performance_score = excluded.performance_score');
  });
});
