// Audit log — append-only ring buffer (server memory) for governance events
// emitted by the various engine endpoints.

const RING = [];
const MAX = 1000;

export function append(entry) {
  const e = {
    ts: Date.now(),
    actor: entry.actor || 'flowai-engine',
    actionType: entry.actionType || 'unknown',
    sessionId: entry.sessionId || null,
    productId: entry.productId || null,
    productUrl: entry.productUrl || null,
    detail: entry.detail || null,
    severity: entry.severity || 'info',
  };
  RING.push(e);
  if (RING.length > MAX) RING.splice(0, RING.length - MAX);
  return e;
}

export function readLog({ since, sessionId, productId, severity, actionType, limit = 200 } = {}) {
  let out = RING.slice();
  if (since) out = out.filter((e) => e.ts >= since);
  if (sessionId) out = out.filter((e) => e.sessionId === sessionId);
  if (productId) out = out.filter((e) => e.productId === productId);
  if (severity) out = out.filter((e) => e.severity === severity);
  if (actionType) out = out.filter((e) => e.actionType === actionType);
  return out.slice(-limit);
}
