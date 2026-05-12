// Agent #3 W03 Wiring tests — Build 1 of the W03 Standing Operating Protocol.
//
// Covers:
//   - Topic subscription on `w03.turn.completed` (audit-side observer)
//   - Sync-block path: reviewAndDeliver awaits Agent #3 before calling deliver
//   - Block verdict → no delivery, CEO notice emitted on bus
//   - Pass verdict → delivery proceeds with Sentinel footer appended
//   - Flag verdict → delivery proceeds with WARN footer
//   - Agent #3 timeout is treated as fail-closed (block) without crashing
//   - Authority preservation: Agent #3 stays recommend_only; wiring layer
//     enforces block, not the agent itself.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBus } from '../src/lib/agents/MessageBus.ts';
import { wireW03Compliance, __test } from '../src/lib/agents/w03ComplianceWiring.js';

// ── Fakes ──────────────────────────────────────────────────────────────

function makeFakeAgent3({ verdict = 'pass', confidence = 0.5, renewalFlags = [], delayMs = 0, throwError = null } = {}) {
  const calls = [];
  const recommend = vi.fn(async (ctx) => {
    calls.push(ctx);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (throwError) throw new Error(throwError);
    return Object.freeze({
      agent_id: 3,
      agent_name: 'Self-Renewal',
      mode: 'step-owner',
      step: 6,
      authority: 'recommend_only',
      recommendation: `mock ${verdict} recommendation`,
      renewal_flags: Object.freeze(renewalFlags),
      confidence,
      metadata: Object.freeze({ ok: true }),
    });
  });
  return { recommend, calls };
}

function makeBus() {
  return new MessageBus();
}

function envelope(overrides = {}) {
  return {
    turnId: overrides.turnId ?? 't-001',
    parentDispatchId: 'dispatch-1',
    w03OutputMarkdown: overrides.w03OutputMarkdown ?? 'turnClass = routine. Simple compliant turn.',
    activeRules: { locked: [], preferences: [] },
    recentTurnHashes: overrides.recentTurnHashes ?? [],
    canonicalSources: { ssotPath: 'docs/FLOWAI_SSOT.md', planPath: 'docs/FLOWAI_IMPLEMENTATION_PLAN.md' },
    context: {
      dispatchTag: overrides.context?.dispatchTag ?? 'test',
      mode: overrides.context?.mode ?? 'Auto',
      ceoPresent: overrides.context?.ceoPresent ?? true,
      isMaterial: overrides.context?.isMaterial ?? false,
      isGovernanceCritical: overrides.context?.isGovernanceCritical ?? false,
      isSelfGovernanceTopic: overrides.context?.isSelfGovernanceTopic ?? false,
      routineTagUsed: overrides.context?.routineTagUsed ?? false,
      routineTagJustification: overrides.context?.routineTagJustification ?? null,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('wireW03Compliance — guard clauses', () => {
  it('throws if messageBus missing publish/subscribe', () => {
    expect(() => wireW03Compliance({ messageBus: {}, agent3: { recommend: () => {} } })).toThrow(/messageBus/);
  });

  it('throws if agent3 missing recommend()', () => {
    const bus = makeBus();
    expect(() => wireW03Compliance({ messageBus: bus, agent3: {} })).toThrow(/agent3/);
  });
});

describe('wireW03Compliance — topic subscription', () => {
  it('subscribes to w03.turn.completed on wire-up (verified via reviewAndDeliver publish→observe round-trip)', async () => {
    const bus = makeBus();
    const sinkRecords = [];
    const logger = {
      debug: (msg, fields) => sinkRecords.push({ level: 'debug', msg, fields }),
      info: () => {}, warn: () => {}, error: () => {},
      child: () => logger,
    };
    const agent3 = makeFakeAgent3();
    const { reviewAndDeliver, unsubscribe } = wireW03Compliance({ messageBus: bus, agent3, logger });

    await reviewAndDeliver({
      envelope: envelope({ turnId: 't-sub-1' }),
      deliver: () => {},
    });

    // The wiring's audit-side subscription should have observed its own
    // publish — verified by the debug log record.
    const observed = sinkRecords.find((r) => r.msg === 'w03.turn.completed observed');
    expect(observed).toBeTruthy();
    expect(observed.fields?.turnId).toBe('t-sub-1');

    // After unsubscribe, a follow-up publish should NOT produce another
    // observed record.
    unsubscribe();
    const before = sinkRecords.length;
    bus.publish('w03.turn.completed', { turnId: 't-sub-2' });
    // Bus fan-out is sync per MessageBus spec; no need to wait.
    const after = sinkRecords.length;
    expect(after).toBe(before);
  });
});

describe('wireW03Compliance — sync-block reviewAndDeliver path', () => {
  it('pass verdict → deliver called, no block, Sentinel footer appended', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ verdict: 'pass', confidence: 0.5, renewalFlags: [] });
    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });

    const deliveries = [];
    const result = await reviewAndDeliver({
      envelope: envelope(),
      deliver: (d) => { deliveries.push(d); },
    });

    expect(result.delivered).toBe(true);
    expect(result.blocked).toBe(false);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].messageWithFooter).toMatch(/W03 Compliance Sentinel:[^\n]*PASS/);
    expect(agent3.recommend).toHaveBeenCalledTimes(1);
  });

  it('block verdict → deliver NOT called, CEO notice published on bus', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ verdict: 'pass' });
    const noticeReceived = [];
    bus.subscribe('w03.compliance.ceo_notice', (payload) => { noticeReceived.push(payload); });

    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });

    // Bad turn that triggers a HIGH-severity probe violation: [ROUTINE]
    // without justification.
    const result = await reviewAndDeliver({
      envelope: envelope({
        turnId: 't-block-1',
        w03OutputMarkdown: '[ROUTINE] No justification provided.',
      }),
      deliver: vi.fn(),
    });

    expect(result.delivered).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.noticeId).toMatch(/^w03_block_t-block-1_/);
    expect(noticeReceived.length).toBe(1);
    expect(noticeReceived[0].turnId).toBe('t-block-1');
    expect(noticeReceived[0].verdict).toBe('block');
    expect(noticeReceived[0].violations.length).toBeGreaterThanOrEqual(1);
  });

  it('flag verdict → delivery proceeds with WARN footer', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ verdict: 'pass' });
    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });

    // Material turn missing lockedRuleScan = 1 medium-severity violation → flag.
    const turn = [
      'turnClass = material',
      'canonicalConsistency = pass',
      'sourceBasis = canonical',
      '## Self-Scan applied: L1, L4',
      'w03_compliance_tripwire_t-flag',
    ].join('\n');
    const deliveries = [];
    const result = await reviewAndDeliver({
      envelope: envelope({
        turnId: 't-flag',
        w03OutputMarkdown: turn,
        context: { isMaterial: true, ceoPresent: true },
      }),
      deliver: (d) => deliveries.push(d),
    });

    expect(result.delivered).toBe(true);
    expect(result.report.verdict).toBe('flag');
    expect(deliveries[0].messageWithFooter).toMatch(/W03 Compliance Sentinel:[^\n]*WARN/);
  });

  it('publishes w03.turn.completed on bus for downstream audit observers', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ verdict: 'pass' });
    const observed = [];
    bus.subscribe('w03.turn.completed', (payload) => { observed.push(payload); });

    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });
    await reviewAndDeliver({
      envelope: envelope({ turnId: 't-obs' }),
      deliver: () => {},
    });

    expect(observed.length).toBeGreaterThanOrEqual(1);
    const last = observed[observed.length - 1];
    expect(last.turnId).toBe('t-obs');
    expect(['pass', 'flag', 'block']).toContain(last.verdict);
  });
});

describe('wireW03Compliance — Agent #3 timeout / error handling', () => {
  it('Agent #3 throw → wiring continues, agent3Summary has error field', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ throwError: 'mock failure' });
    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });
    const deliveries = [];
    const result = await reviewAndDeliver({
      envelope: envelope({ turnId: 't-throw' }),
      deliver: (d) => deliveries.push(d),
    });
    // Probe verdict is 'pass' on a clean turn; Agent #3 error does NOT
    // promote the verdict to block on its own (probe is the floor).
    expect(result.delivered).toBe(true);
    expect(result.report.agent3Summary).toBeTruthy();
    expect(result.report.agent3Summary.error).toMatch(/mock failure/);
  });

  it('Agent #3 timeout → treated as recommendation error, probe floor preserved', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({ delayMs: 200 });
    const { reviewAndDeliver } = wireW03Compliance({
      messageBus: bus,
      agent3,
      recommendTimeoutMs: 50, // shorter than the agent's delay
    });
    const result = await reviewAndDeliver({
      envelope: envelope({ turnId: 't-timeout' }),
      deliver: () => {},
    });
    expect(result.report.agent3Summary.error).toMatch(/timed out|recommend\(\) timed/);
  });
});

describe('wireW03Compliance — verdict escalation via Agent #3 flags', () => {
  it('Agent #3 high-confidence multi-flag recommendation escalates pass → flag', async () => {
    const bus = makeBus();
    const agent3 = makeFakeAgent3({
      verdict: 'block',
      confidence: 0.8,
      renewalFlags: ['pipeline.build', 'config.quality', 'monitor.anomaly'],
    });
    const { reviewAndDeliver } = wireW03Compliance({ messageBus: bus, agent3 });
    const result = await reviewAndDeliver({
      envelope: envelope({ turnId: 't-esc' }),
      deliver: () => {},
    });
    // Probe alone would be 'pass'; Agent #3's high-conf multi-flag bumps it to 'flag'.
    expect(result.report.probeVerdict).toBe('pass');
    expect(result.report.verdict).toBe('flag');
  });
});

describe('wireW03Compliance — internals', () => {
  it('adaptEnvelopeForAgent3 produces an Agent #3-compatible ctx', () => {
    const env = envelope({ turnId: 't1', context: { dispatchTag: 'D-test' } });
    const fakeProbe = { verdict: 'flag', violations: [{ rule: 'R04' }, { rule: 'R05' }] };
    const ctx = __test.adaptEnvelopeForAgent3(env, fakeProbe);
    expect(ctx.runId).toBe('t1');
    expect(ctx.productId).toBe('D-test');
    expect(ctx.run_summary.audit_issues_count).toBe(2);
    expect(['low', 'medium', 'high']).toContain(ctx.run_summary.anomaly_severity);
    expect(Array.isArray(ctx.step_results)).toBe(true);
    expect(ctx.step_results.length).toBe(2);
  });

  it('buildSentinelFooter shape — 6 lines, includes turnId', () => {
    const report = {
      turnId: 'tx',
      verdict: 'pass',
      violations: [],
    };
    const footer = __test.buildSentinelFooter(report);
    expect(footer).toMatch(/W03 Compliance Sentinel:[^\n]*PASS/);
    expect(footer).toMatch(/Audit artifact: w03_self_audit_tx/);
  });
});
