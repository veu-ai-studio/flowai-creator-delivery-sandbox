// In-process cost tracking. Logs every Claude call to a bounded ring buffer
// in module memory. Vercel functions are stateless across cold starts, so this
// is best-effort — clients also save their own copy in localStorage.
//
// Cost per million tokens (USD). Update if Anthropic changes pricing.
const PRICES = {
  'claude-sonnet-4-6':  { input: 3.0,  output: 15.0 },
  'claude-opus-4-7':    { input: 15.0, output: 75.0 },
  'claude-haiku-4-5':   { input: 0.8,  output: 4.0  },
};

const RING = [];
const MAX = 500;

export function estimateCost({ model, usage }) {
  const p = PRICES[model] || PRICES['claude-sonnet-4-6'];
  const input = usage?.input_tokens || 0;
  const output = usage?.output_tokens || 0;
  const cacheCreate = usage?.cache_creation_input_tokens || 0;
  const cacheRead = usage?.cache_read_input_tokens || 0;
  // Anthropic billing: cache writes 25% premium, reads 90% discount.
  const inCost = ((input - cacheCreate - cacheRead) * p.input
                  + cacheCreate * p.input * 1.25
                  + cacheRead * p.input * 0.10) / 1_000_000;
  const outCost = (output * p.output) / 1_000_000;
  return Number((inCost + outCost).toFixed(6));
}

export function recordCost({ endpoint, sessionId, model, usage, text, stop_reason }) {
  const entry = {
    ts: Date.now(),
    endpoint,
    sessionId: sessionId || null,
    model,
    inputTokens: usage?.input_tokens || 0,
    outputTokens: usage?.output_tokens || 0,
    cacheCreate: usage?.cache_creation_input_tokens || 0,
    cacheRead: usage?.cache_read_input_tokens || 0,
    estUSD: estimateCost({ model, usage }),
    stop_reason: stop_reason || null,
    outputChars: typeof text === 'string' ? text.length : 0,
  };
  RING.push(entry);
  if (RING.length > MAX) RING.splice(0, RING.length - MAX);
  return entry;
}

export function readLog({ since, sessionId, endpoint, limit = 200 } = {}) {
  let out = RING.slice();
  if (since) out = out.filter((e) => e.ts >= since);
  if (sessionId) out = out.filter((e) => e.sessionId === sessionId);
  if (endpoint) out = out.filter((e) => e.endpoint === endpoint);
  return out.slice(-limit);
}

export function summarise(entries = RING) {
  let inputTokens = 0, outputTokens = 0, estUSD = 0, calls = 0;
  const perEndpoint = {};
  const perModel = {};
  for (const e of entries) {
    inputTokens += e.inputTokens || 0;
    outputTokens += e.outputTokens || 0;
    estUSD += e.estUSD || 0;
    calls += 1;
    perEndpoint[e.endpoint] = (perEndpoint[e.endpoint] || 0) + (e.estUSD || 0);
    perModel[e.model] = (perModel[e.model] || 0) + (e.estUSD || 0);
  }
  return {
    calls,
    inputTokens,
    outputTokens,
    estUSD: Number(estUSD.toFixed(6)),
    perEndpoint,
    perModel,
  };
}
