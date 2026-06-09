import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { asArray, asObject, resolveArray } from '../../src/lib/uiDataGuards.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('sidebar page data resilience', () => {
  it('normalizes malformed API results before array operations', () => {
    expect(asArray([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(asArray({ items: [] })).toEqual([]);
    expect(asArray(null)).toEqual([]);
    expect(asObject({ ok: true })).toEqual({ ok: true });
    expect(asObject([])).toEqual({});
  });

  it('converts rejected and hung list calls into an empty array fallback', async () => {
    vi.useFakeTimers();
    const rejected = await resolveArray(Promise.reject(new Error('bad')));
    expect(rejected).toEqual([]);

    const pending = resolveArray(new Promise(() => {}), { timeoutMs: 25 });
    await vi.advanceTimersByTimeAsync(25);
    await expect(pending).resolves.toEqual([]);
    vi.useRealTimers();
  });

  it('keeps Pipeline Run History from spinning forever on Base44 list calls', () => {
    const source = read('src/pages/RunsHistory.jsx');
    expect(source).toContain("import { asArray, resolveArray } from '@/lib/uiDataGuards';");
    expect(source).toContain("resolveArray(base44.entities.AutoSession.list('-started_at', 100))");
    expect(source).toContain("resolveArray(base44.entities.GuidedSession.list('-last_active_at', 100))");
    expect(source).toContain("finally");
    expect(source).toContain("if (!cancelled) setLoading(false)");
    expect(source).toContain("const safeSessions = asArray(sessions)");
  });

  it('guards sidebar-reachable pages that previously trusted array-shaped data', () => {
    for (const file of [
      'src/pages/RunHistory.jsx',
      'src/pages/RunsHistory.jsx',
      'src/pages/Configuration.jsx',
      'src/pages/ProductRegistry.jsx',
      'src/pages/PortfolioDashboard.jsx',
      'src/pages/Dashboard.jsx',
      'src/pages/MainDashboard.jsx',
      'src/pages/Governance.jsx',
      'src/pages/Clearance.jsx',
      'src/pages/MyCreations.jsx',
      'src/pages/Workspace.jsx',
      'src/components/governance/PortfolioQuickSelect.jsx',
      'src/components/operations/ClearanceProtocolPrompt.jsx',
      'src/components/qa/RoleBasedAccess.jsx',
    ]) {
      expect(read(file), file).toContain("uiDataGuards");
    }
  });
});
