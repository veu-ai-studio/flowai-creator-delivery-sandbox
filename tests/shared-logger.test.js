/**
 * TDD scaffold for src/lib/shared/logger.js.
 * Spec: specs/w5-design/04-logging-convention.md
 *
 * Expected to fail until implemented.
 */
import { describe, it, expect, vi } from 'vitest';

const MODULE = '../src/lib/shared/logger.js';
const load = () => import(MODULE);

describe('logger — surface', () => {
  it('exports makeLogger', async () => {
    const m = await load();
    expect(typeof m.makeLogger).toBe('function');
  });

  it('exports NOOP_LOGGER with 4 levels and child', async () => {
    const m = await load();
    for (const lvl of ['debug', 'info', 'warn', 'error']) {
      expect(typeof m.NOOP_LOGGER[lvl]).toBe('function');
    }
    expect(typeof m.NOOP_LOGGER.child).toBe('function');
  });

  it('exports bindLogger', async () => {
    const m = await load();
    expect(typeof m.bindLogger).toBe('function');
  });
});

describe('logger — NOOP_LOGGER', () => {
  it('does not throw for any level', async () => {
    const { NOOP_LOGGER } = await load();
    expect(() => NOOP_LOGGER.debug('x', { a: 1 })).not.toThrow();
    expect(() => NOOP_LOGGER.info('x')).not.toThrow();
    expect(() => NOOP_LOGGER.warn('x', null)).not.toThrow();
    expect(() => NOOP_LOGGER.error('x', { e: new Error('y') })).not.toThrow();
  });

  it('child returns a logger with all levels', async () => {
    const { NOOP_LOGGER } = await load();
    const child = NOOP_LOGGER.child({ runId: 'r1' });
    for (const lvl of ['debug', 'info', 'warn', 'error']) {
      expect(typeof child[lvl]).toBe('function');
    }
  });
});

describe('logger — makeLogger emit + redaction', () => {
  it('emits to provided sink', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink });
    log.info('hello', { runId: 'r1' });
    expect(sink).toHaveBeenCalledOnce();
    const [record] = sink.mock.calls[0];
    expect(record.level).toBe('info');
    expect(record.msg).toBe('hello');
    expect(record.fields).toMatchObject({ runId: 'r1' });
  });

  it('redacts configured keys', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink, redact: ['apiKey', 'value'] });
    log.warn('ouch', { apiKey: 'sk-secret', user: 'u1', value: 'still-secret' });
    const record = sink.mock.calls[0][0];
    expect(record.fields.apiKey).toBe('[REDACTED]');
    expect(record.fields.value).toBe('[REDACTED]');
    expect(record.fields.user).toBe('u1');
  });

  it('redacts deep keys', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink, redact: ['secret'] });
    log.info('x', { nested: { secret: 'shh', ok: 1 } });
    const record = sink.mock.calls[0][0];
    expect(record.fields.nested.secret).toBe('[REDACTED]');
    expect(record.fields.nested.ok).toBe(1);
  });

  it('default redact list is non-empty', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink });
    log.info('x', { apiKey: 'sk-xxx' });
    expect(sink.mock.calls[0][0].fields.apiKey).toBe('[REDACTED]');
  });
});

describe('logger — child / bindLogger', () => {
  it('child merges base fields into every emit', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink }).child({ runId: 'r1', agentId: 11 });
    log.info('event', { phase: 'plan' });
    const r = sink.mock.calls[0][0];
    expect(r.fields).toMatchObject({ runId: 'r1', agentId: 11, phase: 'plan' });
  });

  it('child fields are overridden by call-site fields on conflict', async () => {
    const { makeLogger } = await load();
    const sink = vi.fn();
    const log = makeLogger({ sink }).child({ runId: 'r1' });
    log.info('event', { runId: 'r2' });
    expect(sink.mock.calls[0][0].fields.runId).toBe('r2');
  });
});
