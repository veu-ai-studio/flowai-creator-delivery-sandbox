import { describe, expect, it } from 'vitest';

import { __test as forgeBuildApiTest } from '../api/forge/build.js';

describe('api/forge/build proof controls', () => {
  it('wraps dispatch with a single forced hang for the named Build member', async () => {
    const calls = [];
    const dispatch = forgeBuildApiTest.createBuildProofDispatch({
      forceHangOnce: {
        action: 'code-patch',
        memberId: 'codex',
      },
    }, async (action, payload, opts) => {
      calls.push({ action, payload, opts });
      return { ok: true, action, member: opts.memberId, data: { patchedContent: 'ok' } };
    });

    const hanging = dispatch('code-patch', {}, { memberId: 'codex' });
    const fallback = await dispatch('code-patch', {}, { memberId: 'claude-code' });
    const secondCodex = await dispatch('code-patch', {}, { memberId: 'codex' });

    await expect(Promise.race([
      hanging.then(() => 'resolved'),
      new Promise(resolve => setTimeout(() => resolve('still-pending'), 10)),
    ])).resolves.toBe('still-pending');
    expect(fallback).toMatchObject({ ok: true, member: 'claude-code' });
    expect(secondCodex).toMatchObject({ ok: true, member: 'codex' });
    expect(calls.map(call => call.opts.memberId)).toEqual(['claude-code', 'codex']);
  });

  it('bounds proof dispatch timeout overrides', () => {
    expect(forgeBuildApiTest.resolveToolDispatchTimeoutMs({ toolDispatchTimeoutMs: 5000 })).toBe(5000);
    expect(forgeBuildApiTest.resolveToolDispatchTimeoutMs({})).toBeUndefined();
    expect(() => forgeBuildApiTest.resolveToolDispatchTimeoutMs({ toolDispatchTimeoutMs: 50 })).toThrow(/between 1000 and 60000/);
  });
});
