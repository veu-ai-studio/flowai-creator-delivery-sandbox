// api/_lib/messageBus.js
//
// Singleton accessor for the in-process MessageBus used by all server-
// side handlers + Inngest jobs. Replaces the four P0 no-op stubs flagged
// by Panel ruling FA-Q2 UNANIMOUS (commit 708e59d):
//
//   1. api/research-url.js:30          (Agent #21 Conductor — unauth path)
//   2. api/agent/21/execute.js:282     (Agent #21 Executor — credentialed crawl)
//   3. api/agent/3/execute.js:188      (Agent #3 Self-Renewal Executor)
//   4. api/_lib/inngest.js:207         (async Inngest job path)
//
// The singleton is one MessageBus instance per server process. In the
// Vercel serverless model, each cold-started function gets its own
// process and therefore its own bus instance — there's no cross-
// function pub/sub guarantee. That's the same posture as the
// recommend-only stubs replaced here; this wiring just makes intra-
// handler agent communication real.
//
// SHAPE ADAPTER: the real MessageBus exposes publish(topic, payload).
// Some agents (Agent #21 Conductor + Agent #21 Executor) currently
// call bus.publish({ topic, payload, from, at }) with a single object.
// Other agents (#2/#3/#4/#5) call bus.publish(topic, payload) — the
// canonical two-arg shape. The adapter below accepts BOTH shapes and
// forwards to the underlying MessageBus correctly, so wiring the real
// bus in does not require touching any agent file.

import { MessageBus } from '../../src/lib/agents/MessageBus.js';

let _bus;
let _adapter;

function buildAdapter(bus) {
  return {
    publish(topicOrEnv, maybePayload) {
      // Canonical two-arg shape: bus.publish(topic, payload).
      if (typeof topicOrEnv === 'string') {
        return bus.publish(topicOrEnv, maybePayload);
      }
      // Legacy single-object envelope shape:
      //   bus.publish({ topic, payload, from?, at? })
      // The `from` + `at` fields are preserved on the payload so
      // downstream subscribers retain provenance metadata.
      if (topicOrEnv && typeof topicOrEnv === 'object'
          && typeof topicOrEnv.topic === 'string') {
        const enrichedPayload = topicOrEnv.from || topicOrEnv.at
          ? { ...(topicOrEnv.payload ?? {}), __from: topicOrEnv.from, __at: topicOrEnv.at }
          : topicOrEnv.payload;
        return bus.publish(topicOrEnv.topic, enrichedPayload);
      }
      throw new TypeError(
        'messageBus.publish: expected (topic, payload) or ({ topic, payload, ... })',
      );
    },
    subscribe(topic, handler) { return bus.subscribe(topic, handler); },
    subscribeAll(handler) { return bus.subscribeAll?.(handler); },
    // Surface the underlying instance for tests that need direct access.
    __unwrap() { return bus; },
  };
}

/**
 * Get the process-singleton MessageBus (wrapped with a shape adapter).
 * Idempotent — repeat calls return the same adapter referencing the
 * same underlying bus instance.
 */
export function getServerMessageBus() {
  if (!_bus) {
    _bus = new MessageBus();
    _adapter = buildAdapter(_bus);
  }
  return _adapter;
}

/**
 * Test-only: reset the singleton. Wired so unit tests can isolate
 * pub/sub state between cases. Production paths never call this.
 */
export function __resetServerMessageBusForTests() {
  _bus = undefined;
  _adapter = undefined;
}
