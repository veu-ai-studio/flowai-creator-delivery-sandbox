/**
 * MessageBus — Pre-Agent Foundation
 * ---------------------------------------------------------------------------
 * Owner:   /src/lib/agents/MessageBus.ts (W5 territory)
 * Status:  Pure in-memory pub/sub with backpressure + TTL. None of the 20
 *          agents use it yet; this is the contract they will publish/subscribe
 *          against.
 *
 * Per dispatch:
 *   - max queue size per topic: 10,000
 *   - message TTL: 1 hour (3,600,000 ms)
 *   - drop oldest on overflow with warning log
 *   - purge expired on each publish
 *
 * Design notes:
 *   - Subscribers receive messages synchronously on publish (in declaration
 *     order). Sync handlers may return void; async handlers return promises
 *     which the bus does NOT await — failures inside handlers do not affect
 *     other handlers or the publisher.
 *   - The per-topic queue is an audit/replay buffer + the source of truth
 *     for backpressure accounting. Subscribed handlers fire on `publish`,
 *     not on queue read. The queue does not redeliver messages on
 *     subscribe-after-publish — late subscribers see only future messages.
 *   - Clock is injectable so tests can advance time deterministically.
 *   - The warning log is injectable so tests can capture overflow signals.
 *
 * What this is NOT:
 *   - Not durable across process restarts.
 *   - Not multi-writer-safe across nodes.
 *   - Not ordered across topics (each topic is independently FIFO).
 *   The dispatch covers single-process orchestration. Cross-node fan-out
 *   is a future ticket and will replace this implementation.
 * ---------------------------------------------------------------------------
 */

export type MessageHandler = (payload: unknown, meta: MessageMeta) => void | Promise<void>;

export interface MessageMeta {
  readonly topic: string;
  readonly at: number;
  readonly seq: number;
}

export interface MessageBusOpts {
  readonly maxQueueSize?: number;
  readonly ttlMs?: number;
  readonly clock?: () => number;
  readonly warn?: (msg: string, ctx?: Record<string, unknown>) => void;
}

interface QueuedMessage {
  readonly at: number;
  readonly seq: number;
  readonly payload: unknown;
}

interface TopicState {
  queue: QueuedMessage[];
  handlers: Set<MessageHandler>;
  nextSeq: number;
}

/**
 * Broadcast handler signature — receives every published message regardless
 * of topic. Used by Agent #1 (always-on lifecycle supervisor) per PA #2.7.
 */
export type BroadcastHandler = (
  payload: unknown,
  meta: MessageMeta,
) => void | Promise<void>;

const DEFAULT_MAX_QUEUE = 10_000;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export class MessageBus {
  private readonly maxQueueSize: number;
  private readonly ttlMs: number;
  private readonly clock: () => number;
  private readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  private readonly topics: Map<string, TopicState> = new Map();
  // Broadcast handlers fire on EVERY publish across all topics. Used for
  // always-on supervisors (Agent #1). Isolated from per-topic handlers so
  // subscribe-all and subscribe-to-topic semantics don't conflict.
  private readonly broadcastHandlers: Set<BroadcastHandler> = new Set();

  constructor(opts: MessageBusOpts = {}) {
    this.maxQueueSize = opts.maxQueueSize ?? DEFAULT_MAX_QUEUE;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.clock = opts.clock ?? (() => Date.now());
    this.warn = opts.warn ?? defaultWarn;

    if (this.maxQueueSize < 1) {
      throw new RangeError('MessageBus: maxQueueSize must be >= 1');
    }
    if (this.ttlMs < 0) {
      throw new RangeError('MessageBus: ttlMs must be >= 0');
    }
  }

  /**
   * Publish a payload to a topic. Steps in order:
   *   1. Get/create topic state.
   *   2. Purge expired messages from this topic's queue.
   *   3. If at capacity, drop the oldest message and emit overflow warning.
   *   4. Append the new message.
   *   5. Notify all current handlers (sync and async — async ones are not
   *      awaited; their failures are isolated).
   */
  publish(topic: string, payload: unknown): void {
    if (typeof topic !== 'string' || !topic) {
      throw new TypeError('MessageBus.publish: topic must be a non-empty string');
    }
    const state = this.getOrCreate(topic);
    const now = this.clock();

    // Purge expired before account check.
    this.purgeExpired(state, now);

    // Drop oldest on overflow (after purge).
    if (state.queue.length >= this.maxQueueSize) {
      const dropped = state.queue.shift();
      this.warn('messagebus.overflow', {
        topic,
        droppedSeq: dropped?.seq,
        droppedAt: dropped?.at,
        queueSize: state.queue.length,
        maxQueueSize: this.maxQueueSize,
      });
    }

    const seq = state.nextSeq++;
    // PA #2.7 peer must-fix #2: shallow-freeze the payload before fan-out so
    // one handler can't mutate the value observed by others. Object.freeze
    // is non-recursive — nested mutation is still possible — but it catches
    // top-level field reassignment which is the common bug.
    const safePayload = freezeIfObject(payload);
    const message: QueuedMessage = Object.freeze({ at: now, seq, payload: safePayload });
    state.queue.push(message);

    // Snapshot handlers so unsubscribes during iteration don't break us.
    const handlers = [...state.handlers];
    const broadcasts = [...this.broadcastHandlers];
    const meta: MessageMeta = Object.freeze({ topic, at: now, seq });
    for (const h of handlers) {
      try {
        const r = h(safePayload, meta);
        if (r && typeof (r as Promise<void>).catch === 'function') {
          (r as Promise<void>).catch((e) => {
            this.warn('messagebus.handler_error_async', {
              topic,
              error: e instanceof Error ? e.message : String(e),
            });
          });
        }
      } catch (e) {
        this.warn('messagebus.handler_error_sync', {
          topic,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    // PA #2.7 — broadcast handlers fire on every publish across all topics.
    // Isolated from per-topic handlers; one bad broadcast never blocks others.
    for (const bh of broadcasts) {
      try {
        const r = bh(safePayload, meta);
        if (r && typeof (r as Promise<void>).catch === 'function') {
          (r as Promise<void>).catch((e) => {
            this.warn('messagebus.broadcast_error_async', {
              topic,
              error: e instanceof Error ? e.message : String(e),
            });
          });
        }
      } catch (e) {
        this.warn('messagebus.broadcast_error_sync', {
          topic,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  /**
   * Subscribe to a topic. Returns an unsubscribe function. Handlers do NOT
   * see prior queued messages — they receive only future publishes.
   */
  subscribe(topic: string, handler: MessageHandler): () => void {
    if (typeof topic !== 'string' || !topic) {
      throw new TypeError('MessageBus.subscribe: topic must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('MessageBus.subscribe: handler must be a function');
    }
    const state = this.getOrCreate(topic);
    state.handlers.add(handler);
    return () => {
      state.handlers.delete(handler);
    };
  }

  /**
   * Broadcast subscribe — handler fires on EVERY publish across all topics.
   * Returns an unsubscribe function. Handlers see only future publishes;
   * the queue is not replayed. PA #2.7 — used by Agent #1 (always-on
   * lifecycle supervisor).
   */
  subscribeAll(handler: BroadcastHandler): () => void {
    if (typeof handler !== 'function') {
      throw new TypeError('MessageBus.subscribeAll: handler must be a function');
    }
    this.broadcastHandlers.add(handler);
    return () => {
      this.broadcastHandlers.delete(handler);
    };
  }

  /**
   * Count of currently-attached broadcast handlers. Useful for tests and
   * health probes.
   */
  broadcastHandlerCount(): number {
    return this.broadcastHandlers.size;
  }

  // ── Introspection ─────────────────────────────────────────────────────────

  queueSize(topic: string): number {
    const state = this.topics.get(topic);
    if (!state) return 0;
    this.purgeExpired(state, this.clock());
    return state.queue.length;
  }

  hasTopic(topic: string): boolean {
    return this.topics.has(topic);
  }

  topicCount(): number {
    return this.topics.size;
  }

  /**
   * Manually purge expired messages from all topics. Normally not needed —
   * publish triggers per-topic purge — but exposed for housekeeping cron.
   */
  purgeAllExpired(): number {
    const now = this.clock();
    let purged = 0;
    for (const state of this.topics.values()) {
      const before = state.queue.length;
      this.purgeExpired(state, now);
      purged += before - state.queue.length;
    }
    return purged;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private getOrCreate(topic: string): TopicState {
    let state = this.topics.get(topic);
    if (!state) {
      state = { queue: [], handlers: new Set(), nextSeq: 0 };
      this.topics.set(topic, state);
    }
    return state;
  }

  private purgeExpired(state: TopicState, now: number): void {
    const cutoff = now - this.ttlMs;
    let i = 0;
    while (i < state.queue.length && state.queue[i].at < cutoff) {
      i++;
    }
    if (i > 0) {
      state.queue.splice(0, i);
    }
  }
}

// PA #2.7 peer must-fix #2 — shallow-freeze any object payload before
// fan-out. Primitive payloads (string / number / boolean / null / undefined)
// are returned untouched. Already-frozen objects are returned as-is. Arrays
// are frozen at the top level only (Object.freeze is shallow by design).
function freezeIfObject<T>(value: T): T {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t !== 'object') return value;
  // value is non-null object.
  if (Object.isFrozen(value)) return value;
  try {
    Object.freeze(value);
  } catch {
    // Some host objects refuse freeze; treat as best-effort.
  }
  return value;
}

function defaultWarn(msg: string, ctx?: Record<string, unknown>): void {
  // Non-blocking, non-throwing. Console use is intentional and confined to
  // this module — this is the bus's lone observability surface.
  // eslint-disable-next-line no-console
  console.warn(`[MessageBus] ${msg}`, ctx ?? {});
}
