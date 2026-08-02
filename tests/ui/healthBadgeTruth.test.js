import { describe, expect, it } from 'vitest';

import { classifyHealthResponse } from '../../src/components/layout/FlowAIHealthBadge.jsx';

describe('FlowAI health badge truthfulness', () => {
  it('shows healthy only when every reported subsystem passes', () => {
    expect(classifyHealthResponse({
      responseOk: true,
      latency: 100,
      body: { ok: true, status: 'ready', checks: { auth: { status: 'PASS' }, supabase: { status: 'PASS' } } },
    })).toBe('ok');
  });

  it.each(['DEGRADED', 'NOT_WIRED', 'FAIL'])('does not show green for a 200 response containing %s', (status) => {
    expect(classifyHealthResponse({
      responseOk: true,
      latency: 100,
      body: { ok: true, status: 'ready', checks: { optional: { status } } },
    })).toBe('slow');
  });

  it('detects degraded members inside the orchestra report', () => {
    expect(classifyHealthResponse({
      responseOk: true,
      latency: 100,
      body: {
        ok: true,
        status: 'ready',
        checks: { orchestra: { members: [{ status: 'PASS' }, { status: 'DEGRADED' }] } },
      },
    })).toBe('slow');
  });

  it('treats invalid or failed health responses as errors', () => {
    expect(classifyHealthResponse({ responseOk: false, body: null, latency: 20 })).toBe('error');
  });
});
