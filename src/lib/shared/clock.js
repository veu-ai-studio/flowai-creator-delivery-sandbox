/**
 * Clock — shared time interface for FlowAI.
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/shared/clock.js  (W5 territory)
 * Replaces: ad-hoc `Date.now()` and `{ now: () => Date.now() }` patterns
 *           sprinkled across CredentialAdapter, BaseAgent, ScoreEvaluator.
 *
 * Surface
 *   systemClock           — singleton wrapping wall-clock time.
 *   fixedClock(ts)        — factory for tests; `.now()` returns `ts`.
 *                           `.advance(deltaMs)` mutates forward.
 *   isClock(value)        — duck-typed check (has `.now()` returning number).
 *
 * Both clocks expose: `.now() => number` (Unix ms).
 *
 * Browser- and Node-safe. No external deps.
 * ---------------------------------------------------------------------------
 */

'use strict';

export const systemClock = Object.freeze({
  now() { return Date.now(); },
});

export function fixedClock(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new TypeError('fixedClock: timestamp must be a finite number');
  }
  let t = timestamp;
  return {
    now() { return t; },
    advance(deltaMs) {
      if (typeof deltaMs !== 'number' || !Number.isFinite(deltaMs)) {
        throw new TypeError('fixedClock.advance: deltaMs must be a finite number');
      }
      t += deltaMs;
      return t;
    },
  };
}

export function isClock(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.now === 'function';
}
