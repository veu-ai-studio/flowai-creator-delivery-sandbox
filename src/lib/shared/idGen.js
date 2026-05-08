/**
 * idGen — minimal opaque-ID minter for FlowAI.
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/shared/idGen.js  (W5 territory)
 * Replaces: BaseAgent._mintRunId; the `Math.random().toString(36).slice(2,N)`
 *           + clock-prefix idiom in MessageSchema, JobContext, etc.
 *
 * Surface
 *   mintId(prefix, opts?)  — `<prefix>_<base36ms>_<base36rand>`
 *
 * Format chosen because:
 *   - sortable: base-36 ms is monotonic per session
 *   - inspectable: prefix tells you the kind of ID
 *   - test-deterministic: clock + random are injectable
 *
 * `opts` is optional; defaults are systemClock + Math.random.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { systemClock } from './clock.js';

const DEFAULT_SUFFIX_LEN = 8;
const MIN_SUFFIX_LEN = 4;

export function mintId(prefix, opts = {}) {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new TypeError('mintId: prefix must be a non-empty string');
  }
  const clock = opts.clock ?? systemClock;
  const random = opts.random ?? Math.random;
  const suffixLen = opts.suffixLen ?? DEFAULT_SUFFIX_LEN;

  if (typeof clock !== 'object' || typeof clock.now !== 'function') {
    throw new TypeError('mintId: clock must expose .now()');
  }
  if (typeof random !== 'function') {
    throw new TypeError('mintId: random must be a function');
  }
  if (!Number.isInteger(suffixLen) || suffixLen < MIN_SUFFIX_LEN) {
    throw new RangeError(`mintId: suffixLen must be an integer >= ${MIN_SUFFIX_LEN}`);
  }

  const now = clock.now();
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    throw new TypeError('mintId: clock.now() must return a finite number');
  }
  const ms36 = Math.floor(now).toString(36);
  const suffix = randomBase36(random, suffixLen);
  return `${prefix}_${ms36}_${suffix}`;
}

function randomBase36(random, len) {
  let out = '';
  while (out.length < len) {
    const r = random();
    if (typeof r !== 'number' || r < 0 || r >= 1) {
      throw new RangeError('mintId: random() must return a number in [0, 1)');
    }
    // Each call yields up to ~10 base-36 chars; keep slicing until we hit len.
    out += r.toString(36).slice(2);
  }
  return out.slice(0, len);
}
