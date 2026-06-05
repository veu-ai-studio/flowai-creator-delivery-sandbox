import { describe, it, expect } from 'vitest';
import {
  ENVELOPE_VERSION,
  TOPICS,
  PAYLOAD_VALIDATORS,
  validateEnvelope,
  makeEnvelope,
} from '../src/lib/agents/MessageSchema.js';

const validFrom = { agentId: 10, productScope: 'flowai' };
const validAt = 1700000000000;

function baseEnvelope(overrides = {}) {
  return {
    messageId: 'msg_test_abcdef',
    topic: '10.health.v1',
    payload: { ok: true },
    from: { ...validFrom },
    runId: null,
    traceId: 'trace_test_123',
    at: validAt,
    schemaVersion: ENVELOPE_VERSION,
    ...overrides,
  };
}

describe('MessageSchema envelope validation', () => {
  it('accepts a well-formed envelope', () => {
    expect(validateEnvelope(baseEnvelope())).toBe(true);
  });

  it('rejects non-object envelopes', () => {
    expect(() => validateEnvelope(null)).toThrow(/envelope must be object/);
    expect(() => validateEnvelope('string')).toThrow(/envelope must be object/);
  });

  it('rejects envelopes with wrong schemaVersion', () => {
    expect(() => validateEnvelope(baseEnvelope({ schemaVersion: '2.0.0' })))
      .toThrow(/schemaVersion must be 1.0.0/);
  });

  it('rejects envelopes whose `from` is not an object', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: 'not-object' })))
      .toThrow(/envelope.from must be object/);
  });

  it('rejects envelopes with non-finite `at`', () => {
    expect(() => validateEnvelope(baseEnvelope({ at: 'now' })))
      .toThrow(/envelope.at must be a finite Unix ms timestamp/);
    expect(() => validateEnvelope(baseEnvelope({ at: NaN })))
      .toThrow(/envelope.at must be a finite Unix ms timestamp/);
  });
});

describe('MessageSchema required field enforcement', () => {
  const requiredFields = ['messageId', 'topic', 'payload', 'from', 'traceId', 'at', 'schemaVersion'];

  for (const field of requiredFields) {
    it(`rejects envelope missing required field "${field}"`, () => {
      const env = baseEnvelope();
      delete env[field];
      expect(() => validateEnvelope(env)).toThrow(
        new RegExp(`missing required field "${field}"`)
      );
    });
  }

  it('rejects envelope.from missing agentId', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: { productScope: 'flowai' } })))
      .toThrow(/missing required field "agentId"/);
  });

  it('rejects envelope.from missing productScope', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 10 } })))
      .toThrow(/missing required field "productScope"/);
  });

  it('accepts agentId 26 and rejects out-of-range agentIds', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 26, productScope: 'flowai' } })))
      .not.toThrow();
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 27, productScope: 'flowai' } })))
      .toThrow(/agentId invalid/);
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 0, productScope: 'flowai' } })))
      .toThrow(/agentId invalid/);
  });

  it('accepts agentId="system" and "portfolio"', () => {
    expect(validateEnvelope(baseEnvelope({ from: { agentId: 'system', productScope: 'flowai' } })))
      .toBe(true);
    expect(validateEnvelope(baseEnvelope({ from: { agentId: 'portfolio', productScope: 'flowai' } })))
      .toBe(true);
  });

  it('accepts runtime metadata-driven productScope values', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 10, productScope: 'tenant-alpha-42' } })))
      .not.toThrow();
  });

  it('rejects malformed productScope values', () => {
    expect(() => validateEnvelope(baseEnvelope({ from: { agentId: 10, productScope: 'Bad Scope!' } })))
      .toThrow(/productScope invalid/);
  });
});

describe('MessageSchema topic format validation', () => {
  it('rejects unknown topics not in TOPICS registry', () => {
    expect(() => validateEnvelope(baseEnvelope({ topic: '99.fake.event.v1' })))
      .toThrow(/unknown topic/);
  });

  it('accepts every topic registered in TOPICS', () => {
    for (const topic of Object.keys(TOPICS)) {
      const validator = PAYLOAD_VALIDATORS[topic];
      let payload = { ok: true };
      if (validator) {
        if (topic === '10.metric.v1') {
          payload = { surface: 's', metric: 'm', value: 1, unit: 'ms' };
        } else if (topic === '10.anomaly.v1') {
          payload = { surface: 's', metric: 'm', observed: 1, expected: 2, severity: 'low' };
        } else if (topic === '12.fire.p0.v1' || topic === '12.fire.p1.v1') {
          payload = { title: 't', affectedSurfaces: ['x'], detectedAt: validAt, evidence: [] };
        } else if (topic === '12.fire.p2.v1') {
          payload = { title: 't', pattern: 'p', window: '7d' };
        } else if (topic === '13.threat.detected.v1') {
          payload = { signatureId: 'sig', surface: 's', evidence: [] };
        } else if (topic === '13.signature.update.v1') {
          payload = { signatureId: 'sig', pattern: 'p', severity: 'low' };
        } else if (topic === '14.regulation.new.v1') {
          payload = { jurisdiction: 'US', citation: 'c', summary: 's', effectiveDate: validAt };
        } else if (topic === 'system.governance.score.v1' || topic === 'system.readiness.score.v1') {
          payload = { targetType: 'agent', targetId: '1', score: 99, rubricVersion: 'v1' };
        } else if (topic === 'system.clearance.decision.v1') {
          payload = { targetType: 'agent', targetId: '1', governanceScore: 99, readinessScore: 99, decision: 'CLEAR' };
        }
      }
      expect(() => validateEnvelope(baseEnvelope({ topic, payload }))).not.toThrow();
    }
  });

  it('TOPICS registry is frozen', () => {
    expect(Object.isFrozen(TOPICS)).toBe(true);
  });

  it('PAYLOAD_VALIDATORS registry is frozen', () => {
    expect(Object.isFrozen(PAYLOAD_VALIDATORS)).toBe(true);
  });
});

describe('MessageSchema payload-specific validators', () => {
  it('10.metric.v1: rejects non-finite value', () => {
    expect(() => validateEnvelope(baseEnvelope({
      topic: '10.metric.v1',
      payload: { surface: 's', metric: 'm', value: NaN, unit: 'ms' },
    }))).toThrow(/value must be finite number/);
  });

  it('10.anomaly.v1: rejects severity outside enum', () => {
    expect(() => validateEnvelope(baseEnvelope({
      topic: '10.anomaly.v1',
      payload: { surface: 's', metric: 'm', observed: 1, expected: 2, severity: 'extreme' },
    }))).toThrow(/severity must be low\|medium\|high/);
  });

  it('12.fire.p0.v1: rejects empty affectedSurfaces array', () => {
    expect(() => validateEnvelope(baseEnvelope({
      topic: '12.fire.p0.v1',
      payload: { title: 't', affectedSurfaces: [], detectedAt: validAt, evidence: [] },
    }))).toThrow(/affectedSurfaces must be non-empty array/);
  });

  it('system.governance.score.v1: rejects score above 100', () => {
    expect(() => validateEnvelope(baseEnvelope({
      topic: 'system.governance.score.v1',
      payload: { targetType: 'agent', targetId: '1', score: 101, rubricVersion: 'v1' },
    }))).toThrow(/score must be number in \[0,100\]/);
  });

  it('system.clearance.decision.v1: rejects decision outside enum', () => {
    expect(() => validateEnvelope(baseEnvelope({
      topic: 'system.clearance.decision.v1',
      payload: {
        targetType: 'agent', targetId: '1',
        governanceScore: 99, readinessScore: 99, decision: 'MAYBE',
      },
    }))).toThrow(/decision must be CLEAR or DO_NOT_ACCEPT/);
  });
});

describe('MessageSchema makeEnvelope', () => {
  it('builds a frozen envelope with messageId, traceId, schemaVersion populated', () => {
    const env = makeEnvelope({
      topic: '10.health.v1',
      payload: { ok: true },
      from: { ...validFrom },
      at: validAt,
    });
    expect(Object.isFrozen(env)).toBe(true);
    expect(env.schemaVersion).toBe(ENVELOPE_VERSION);
    expect(env.messageId).toMatch(/^msg_/);
    expect(env.traceId).toMatch(/^trace_/);
  });

  it('preserves a caller-supplied traceId', () => {
    const env = makeEnvelope({
      topic: '10.health.v1',
      payload: {},
      from: { ...validFrom },
      traceId: 'trace_caller_xyz',
      at: validAt,
    });
    expect(env.traceId).toBe('trace_caller_xyz');
  });

  it('throws when constructed with an invalid topic', () => {
    expect(() => makeEnvelope({
      topic: '99.bad.v1',
      payload: {},
      from: { ...validFrom },
      at: validAt,
    })).toThrow(/unknown topic/);
  });
});
