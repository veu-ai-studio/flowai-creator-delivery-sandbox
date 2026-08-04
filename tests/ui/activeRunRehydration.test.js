import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectRecoverableActiveRun } from '../../src/lib/flowaiRunStore.js';

const dashboardSource = readFileSync(resolve('src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('active FlowAI run rehydration', () => {
  it('recovers the newest durable active run and ignores terminal history', () => {
    const selected = selectRecoverableActiveRun([
      { id: 'failed', status: 'failed', startedAt: '2026-08-04T10:00:00Z' },
      { id: 'older', status: 'running', url: 'https://older.example', startedAt: '2026-08-04T10:01:00Z' },
      { id: 'newer', status: 'paused', url: 'https://newer.example', startedAt: '2026-08-04T10:02:00Z' },
    ]);
    expect(selected).toMatchObject({ id: 'newer', status: 'paused' });
  });

  it('prefers the active run for the current input URL', () => {
    const selected = selectRecoverableActiveRun([
      { id: 'newer', status: 'running', url: 'https://newer.example', startedAt: '2026-08-04T10:02:00Z' },
      { id: 'matching', status: 'cancelling', url: 'https://target.example', startedAt: '2026-08-04T10:01:00Z' },
    ], 'https://target.example');
    expect(selected).toMatchObject({ id: 'matching', status: 'cancelling' });
  });

  it('labels non-cleared numerical output as assessment rather than readiness', () => {
    expect(dashboardSource).toContain('NOT CLEARED');
    expect(dashboardSource).toContain('assessment only — not clearance');
    expect(dashboardSource).toMatch(/score:\s*payload\.result\?\.gtmReady === true/);
  });

  it('does not pass the React click event as the run idempotency key', () => {
    expect(dashboardSource).toContain('onClick={() => launch()}');
    expect(dashboardSource).not.toContain('onClick={launch}');
  });
});
