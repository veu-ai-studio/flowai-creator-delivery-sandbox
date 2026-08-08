import { describe, expect, it } from 'vitest';

import {
  approvePendingAction,
  createMemoryApprovalStore,
  createPendingApproval,
  dispatchToolAction,
  normalizeDispatchCandidates,
  redactSecrets,
  resolveMemberId,
  resolveDispatchEligibility,
} from '../../src/lib/tools/toolDispatchContract.js';

const env = {
  OPENAI_API_KEY: 'openai-secret',
  ANTHROPIC_API_KEY: 'anthropic-secret',
  BROWSERLESS_API_KEY: 'browser-secret',
  VERCEL_OPERATOR_TOKEN: 'vercel-secret',
};

describe('P13-A tool dispatch contract', () => {
  it('marks wired read-only adapters callable when server credentials exist', () => {
    const [candidate] = normalizeDispatchCandidates([
      { platform_name: 'Browserless', rank: 1 },
    ], { env });

    expect(candidate.dispatchState).toBe('callable');
    expect(candidate.credentialStatus.BROWSERLESS_API_KEY).toBe('PRESENT');
  });

  it('marks missing credentials unavailable without exposing secret values', () => {
    const [candidate] = normalizeDispatchCandidates([
      { platform_name: 'Browserless', rank: 1 },
    ], { env: {} });

    expect(candidate.dispatchState).toBe('missing_credentials');
    expect(candidate.credentialStatus.BROWSERLESS_API_KEY).toBe('MISSING');
    expect(JSON.stringify(candidate)).not.toContain('browser-secret');
  });

  it('allows only public crawl through the existing crawler when Browserless credentials are absent', () => {
    const [crawl] = normalizeDispatchCandidates([
      { platform_name: 'Browserless', rank: 1 },
    ], { env: {}, action: 'crawl' });
    const [screenshot] = normalizeDispatchCandidates([
      { platform_name: 'Browserless', rank: 1 },
    ], { env: {}, action: 'screenshot' });

    expect(crawl).toMatchObject({
      dispatchState: 'callable',
      executionMode: 'credential_free_public_fetch',
      credentialStatus: { BROWSERLESS_API_KEY: 'MISSING' },
      selectionFactors: {
        taskFit: 'crawl',
        evidenceQuality: 'public_html',
        availability: 'available',
        privacy: 'direct_public_url_only',
        cost: 'no_provider_charge',
        latency: 'single_http_fetch',
        credentialReadiness: 'missing',
      },
      selectionScores: {
        taskFit: 10,
        evidenceQuality: 6,
        availability: 10,
        privacy: 10,
        cost: 10,
        latency: 9,
        credentialReadiness: 0,
      },
      guidedSetup: {
        provider: 'Browserless',
        consoleUrl: 'https://www.browserless.io/account',
        secretName: 'BROWSERLESS_API_KEY',
        resumeCheckpoint: 'research.structured_crawl',
      },
    });
    expect(screenshot.dispatchState).toBe('missing_credentials');
  });

  it('resolves Codex aliases to the codex member', () => {
    expect(resolveMemberId('Codex')).toBe('codex');
    expect(resolveMemberId('OpenAI Codex')).toBe('codex');
    expect(resolveMemberId('codex')).toBe('codex');
  });

  it('marks Codex missing credentials honestly when OPENAI_API_KEY is absent', () => {
    const [candidate] = normalizeDispatchCandidates([
      { platform_name: 'Codex', rank: 1 },
    ], { env: {} });

    expect(candidate.memberId).toBe('codex');
    expect(candidate.dispatchState).toBe('missing_credentials');
    expect(candidate.dispatchCallable).toBe(false);
    expect(candidate.credentialStatus.OPENAI_API_KEY).toBe('MISSING');
  });

  it('marks Codex callable only when OPENAI_API_KEY is present', () => {
    const [candidate] = normalizeDispatchCandidates([
      { platform_name: 'Codex', rank: 1 },
    ], { env });

    expect(candidate.memberId).toBe('codex');
    expect(candidate.dispatchState).toBe('callable');
    expect(candidate.dispatchCallable).toBe(true);
    expect(candidate.credentialStatus.OPENAI_API_KEY).toBe('PRESENT');
  });

  it('marks Cursor and v0 as stub unavailable unless real adapters exist', () => {
    const candidates = normalizeDispatchCandidates([
      { platform_name: 'Cursor', rank: 1 },
      { platform_name: 'v0 by Vercel', rank: 2 },
    ], { env });

    expect(candidates.map(candidate => candidate.dispatchState)).toEqual([
      'stub_unavailable',
      'stub_unavailable',
    ]);
  });

  it('AUTO non-mutating dispatch becomes callable only when explicitly enabled', async () => {
    const pending = await resolveDispatchEligibility({
      mode: 'AUTO',
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      env,
    });
    expect(pending.state).toBe('pending_operator_gate');

    const callable = await resolveDispatchEligibility({
      mode: 'AUTO',
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      operatorEnabledAuto: true,
      env,
    });
    expect(callable.state).toBe('callable');
    expect(callable.callable).toBe(true);
  });

  it('AUTO mutating actions are deferred in P13-A', async () => {
    const eligibility = await resolveDispatchEligibility({
      mode: 'AUTO',
      action: 'code-patch',
      selectedTool: { platform_name: 'Claude Code' },
      operatorEnabledAuto: true,
      env,
    });

    expect(eligibility.state).toBe('mutation_deferred_until_P13C');
    expect(eligibility.callable).toBe(false);
  });

  it('GUIDED requires server-side approval before dispatch', async () => {
    const store = createMemoryApprovalStore();
    const before = await resolveDispatchEligibility({
      mode: 'GUIDED',
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      approvalStore: store,
      env,
    });
    expect(before.state).toBe('pending_operator_gate');

    const approval = await createPendingApproval({
      store,
      operatorId: 'operator-1',
      mode: 'GUIDED',
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      env,
    });
    await approvePendingAction({ store, approvalId: approval.id, operatorId: 'operator-1' });

    const after = await resolveDispatchEligibility({
      mode: 'GUIDED',
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      approvalId: approval.id,
      approvalStore: store,
      env,
    });
    expect(after.state).toBe('callable');
  });

  it('MANUAL uses the selected tool and does not silently substitute', async () => {
    const result = await resolveDispatchEligibility({
      mode: 'MANUAL',
      action: 'crawl',
      selectedTool: { platform_name: 'Cursor' },
      candidates: [{ platform_name: 'Browserless' }],
      env,
    });

    expect(result.selectedTool.platform_name).toBe('Cursor');
    expect(result.state).toBe('stub_unavailable');
    expect(result.callable).toBe(false);
  });

  it('redacts secret values recursively', () => {
    const redacted = redactSecrets({
      message: 'token anthropic-secret appeared',
      nested: { apiKey: 'browser-secret' },
    }, env);

    expect(JSON.stringify(redacted)).not.toContain('anthropic-secret');
    expect(JSON.stringify(redacted)).not.toContain('browser-secret');
    expect(redacted.nested.apiKey).toBe('PRESENT');
  });

  it('integration chain selects, gates, dispatches, and reports result truthfully', async () => {
    const dispatchCalls = [];
    const result = await dispatchToolAction({
      mode: 'AUTO',
      operatorEnabledAuto: true,
      action: 'crawl',
      selectedTool: { platform_name: 'Browserless' },
      payload: { url: 'https://example.com' },
      env,
      dispatchFn: async (action, payload, opts) => {
        dispatchCalls.push({ action, payload, opts });
        return { ok: true, action, member: opts.memberId, data: { tokenEcho: 'anthropic-secret' } };
      },
    });

    expect(result.ok).toBe(true);
    expect(dispatchCalls).toHaveLength(1);
    expect(dispatchCalls[0].opts.memberId).toBe('browserless');
    expect(result.eligibility.state).toBe('callable');
    expect(JSON.stringify(result)).not.toContain('anthropic-secret');
  });
});
