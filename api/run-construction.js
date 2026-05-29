// api/run-construction.js — W6 INTEGRATION (STEP 6)
//
// Vercel function entry point for POST /api/run-construction. Vercel
// only discovers top-level `api/` for functions; the actual handler
// implementation (W5b Track B + Track-E PR2 rate-limit) lives at
// src/api/run-construction.js. This shim re-exports the default
// handler so the route is reachable in production without duplicating
// the SSE / rate-limit / orchestrator-wiring code.
//
// Relative imports inside src/api/run-construction.js (./_lib/rateLimit.js,
// ../lib/agents/...) resolve relative to that module's own directory, so
// they continue to work unchanged.

import handler, { ensureProductRegistryRow, __test } from '../src/api/run-construction.js';

export default handler;
export { ensureProductRegistryRow, __test };
