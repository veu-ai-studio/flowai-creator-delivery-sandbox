import { describe, it, expect, vi } from 'vitest';
import { MessageBus } from '../src/lib/agents/MessageBus.ts';

function makeClock(start = 1_700_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => { t += ms; },
    set: (n) => { t = n; },
  };
}

describe('MessageBus — basic pub/sub', () => {
  it('delivers a published message to a subscriber', () => {
    const bus = new MessageBus();
    const seen = [];
    bus.subscribe('topic.a', (payload) => seen.push(payload));
    bus.publish('topic.a', { x: 1 });
    expect(seen).toEqual([{ x: 1 }]);
  });

  it('passes meta with topic, at, seq', () => {
    const clock = makeClock(1_700_000_000_000);
    const bus = new MessageBus({ clock: clock.now });
    const metas = [];
    bus.subscribe('t', (_p, m) => metas.push(m));
    bus.publish('t', 'a');
    bus.publish('t', 'b');
    expect(metas).toEqual([
      { topic: 't', at: 1_700_000_000_000, seq: 0 },
      { topic: 't', at: 1_700_000_000_000, seq: 1 },
    ]);
    expect(Object.isFrozen(metas[0])).toBe(true);
  });

  it('multiple subscribers all receive the message', () => {
    const bus = new MessageBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe('t', a);
    bus.subscribe('t', b);
    bus.publish('t', 'x');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops further deliveries', () => {
    const bus = new MessageBus();
    const handler = vi.fn();
    const off = bus.subscribe('t', handler);
    bus.publish('t', 'first');
    off();
    bus.publish('t', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('late subscribers see only future publishes (not historical queue)', () => {
    const bus = new MessageBus();
    bus.publish('t', 'old');
    const seen = [];
    bus.subscribe('t', (p) => seen.push(p));
    bus.publish('t', 'new');
    expect(seen).toEqual(['new']);
  });

  it('rejects empty/non-string topic and non-function handler', () => {
    const bus = new MessageBus();
    expect(() => bus.publish('', 'x')).toThrow();
    expect(() => bus.publish(123, 'x')).toThrow();
    expect(() => bus.subscribe('', () => 0)).toThrow();
    expect(() => bus.subscribe('t', null)).toThrow();
  });
});

describe('MessageBus — queue + introspection', () => {
  it('queueSize reflects published messages on a topic', () => {
    const bus = new MessageBus();
    expect(bus.queueSize('t')).toBe(0);
    bus.publish('t', 1);
    bus.publish('t', 2);
    expect(bus.queueSize('t')).toBe(2);
  });

  it('hasTopic / topicCount track topic creation', () => {
    const bus = new MessageBus();
    expect(bus.hasTopic('t')).toBe(false);
    expect(bus.topicCount()).toBe(0);
    bus.publish('t', 1);
    bus.publish('u', 1);
    expect(bus.hasTopic('t')).toBe(true);
    expect(bus.topicCount()).toBe(2);
  });
});

describe('MessageBus — backpressure (drop-oldest at maxQueueSize)', () => {
  it('drops the oldest message when queue exceeds max, emits warning', () => {
    const warn = vi.fn();
    const bus = new MessageBus({ maxQueueSize: 3, warn });
    bus.publish('t', 'a'); // seq 0
    bus.publish('t', 'b'); // seq 1
    bus.publish('t', 'c'); // seq 2 — queue at 3 (full)
    expect(warn).not.toHaveBeenCalled();
    bus.publish('t', 'd'); // overflow → drop oldest (a, seq 0)
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe('messagebus.overflow');
    expect(warn.mock.calls[0][1].topic).toBe('t');
    expect(warn.mock.calls[0][1].droppedSeq).toBe(0);
    expect(bus.queueSize('t')).toBe(3);
  });

  it('continues to drop oldest as more messages flood in', () => {
    const warn = vi.fn();
    const bus = new MessageBus({ maxQueueSize: 2, warn });
    for (let i = 0; i < 5; i++) bus.publish('t', i);
    expect(bus.queueSize('t')).toBe(2);
    expect(warn).toHaveBeenCalledTimes(3); // 3 overflows after the first 2 fill the queue
  });

  it('overflow on one topic does not affect another', () => {
    const bus = new MessageBus({ maxQueueSize: 2 });
    bus.publish('t', 1);
    bus.publish('t', 2);
    bus.publish('t', 3); // overflow t
    bus.publish('u', 1);
    expect(bus.queueSize('t')).toBe(2);
    expect(bus.queueSize('u')).toBe(1);
  });

  it('subscribers still see the new message even when overflow drops an old one', () => {
    const bus = new MessageBus({ maxQueueSize: 1 });
    const seen = [];
    bus.subscribe('t', (p) => seen.push(p));
    bus.publish('t', 'a');
    bus.publish('t', 'b'); // drops a
    expect(seen).toEqual(['a', 'b']);
    expect(bus.queueSize('t')).toBe(1);
  });
});

describe('MessageBus — TTL purge', () => {
  it('purges expired messages on the next publish to that topic', () => {
    const clock = makeClock(0);
    const bus = new MessageBus({ ttlMs: 1000, clock: clock.now });
    bus.publish('t', 'old');
    expect(bus.queueSize('t')).toBe(1);
    clock.advance(1500);
    bus.publish('t', 'fresh'); // triggers purge of 'old'
    expect(bus.queueSize('t')).toBe(1); // only 'fresh' remains
  });

  it('queueSize itself triggers a purge', () => {
    const clock = makeClock(0);
    const bus = new MessageBus({ ttlMs: 1000, clock: clock.now });
    bus.publish('t', 'old');
    clock.advance(2000);
    expect(bus.queueSize('t')).toBe(0);
  });

  it('purgeAllExpired sweeps every topic and reports count', () => {
    const clock = makeClock(0);
    const bus = new MessageBus({ ttlMs: 1000, clock: clock.now });
    bus.publish('t', 1);
    bus.publish('u', 2);
    bus.publish('v', 3);
    clock.advance(2000);
    const purged = bus.purgeAllExpired();
    expect(purged).toBe(3);
    expect(bus.queueSize('t')).toBe(0);
    expect(bus.queueSize('u')).toBe(0);
    expect(bus.queueSize('v')).toBe(0);
  });

  it('TTL purge runs BEFORE backpressure check (so expired messages do not occupy capacity)', () => {
    const clock = makeClock(0);
    const warn = vi.fn();
    const bus = new MessageBus({ ttlMs: 1000, maxQueueSize: 2, clock: clock.now, warn });
    bus.publish('t', 'a');
    bus.publish('t', 'b');
    clock.advance(1500); // a, b expire
    bus.publish('t', 'c'); // purge first (queue 0), then add c (queue 1) — no warn
    expect(warn).not.toHaveBeenCalled();
    expect(bus.queueSize('t')).toBe(1);
  });
});

describe('MessageBus — handler isolation', () => {
  it('synchronous handler error is caught and warned, other handlers still run', () => {
    const warn = vi.fn();
    const bus = new MessageBus({ warn });
    const ok = vi.fn();
    bus.subscribe('t', () => { throw new Error('boom'); });
    bus.subscribe('t', ok);
    bus.publish('t', 'x');
    expect(ok).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe('messagebus.handler_error_sync');
  });

  it('async handler rejection is caught and warned without blocking publish', async () => {
    const warn = vi.fn();
    const bus = new MessageBus({ warn });
    bus.subscribe('t', async () => { throw new Error('async-boom'); });
    bus.publish('t', 'x');
    // Wait one microtask cycle so the rejection lands.
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith(
      'messagebus.handler_error_async',
      expect.objectContaining({ topic: 't' }),
    );
  });

  it('handler unsubscribing during iteration does not break delivery to others', () => {
    const bus = new MessageBus();
    const a = vi.fn();
    const b = vi.fn();
    let off;
    off = bus.subscribe('t', () => { off(); }); // self-unsubscribes
    bus.subscribe('t', a);
    bus.subscribe('t', b);
    bus.publish('t', 1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    bus.publish('t', 2);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });
});

describe('MessageBus — option validation', () => {
  it('rejects maxQueueSize < 1', () => {
    expect(() => new MessageBus({ maxQueueSize: 0 })).toThrow();
  });

  it('rejects negative ttlMs', () => {
    expect(() => new MessageBus({ ttlMs: -1 })).toThrow();
  });
});
