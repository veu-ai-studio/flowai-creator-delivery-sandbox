import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';

describe('browser-facing Supabase credential guard', () => {
  it('does not reference the Supabase service-role key in src/pages or src/components', () => {
    let output = '';
    try {
      output = execSync(
        'git grep -n "SUPABASE_SERVICE_ROLE_KEY" -- src/pages src/components',
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      if (error.status !== 1) throw error;
      output = '';
    }
    expect(output.trim()).toBe('');
  });

  it('Forge browser code never uses service-role credentials', () => {
    const research = readFileSync('src/pages/ForgeResearchForm.jsx', 'utf8');
    const build = readFileSync('src/pages/ForgeBuildForm.jsx', 'utf8');
    expect(research).toContain("fetch('/api/forge/stage'");
    expect(research).not.toContain('SUPABASE_');
    expect(build).toContain('import.meta.env.VITE_SUPABASE_ANON_KEY');
    expect(research).not.toContain('import.meta.env.SUPABASE_SERVICE_ROLE_KEY');
    expect(build).not.toContain('import.meta.env.SUPABASE_SERVICE_ROLE_KEY');
  });
});
