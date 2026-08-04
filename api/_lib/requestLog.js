// Request logging middleware.
//
// Wraps a serverless handler with structured before/after logging to the
// Axiom-backed logger (or console fallback). Every /api/* request gets:
//   { ts, method, path, status, durationMs, orgId, productId, runId, costUSD,
//     ip, userAgent, requestId }
//
// Tomorrow this is our operator audit trail. Today it goes to Vercel
// function logs via console.log; once AXIOM_TOKEN lands, the same lines
// stream to Axiom in parallel.
//
// Usage:
//   import { withRequestLog } from '../_lib/requestLog.js';
//   export default withRequestLog(async function handler(req, res) {
//     // ... endpoint logic
//   }, { endpoint: '/api/<your-endpoint>' });
//
// The wrapper inspects res after the handler resolves to capture status,
// content-length, and any { cost_usd } / { run_id } fields the handler
// chose to expose for telemetry-rich endpoints.

import { logger } from './logger.js';

let _requestSeq = 0;
function newRequestId() {
  _requestSeq = (_requestSeq + 1) & 0xffffff;
  return Date.now().toString(36) + '-' + _requestSeq.toString(36);
}

// Capture body fields by sniffing res.json() / res.send() calls. We keep the
// original methods bound to res but also stash the last body so the
// post-handler logger can read cost_usd / run_id / quality_score.
function instrumentRes(res) {
  const original = {
    json: res.json && res.json.bind(res),
    send: res.send && res.send.bind(res),
    end: res.end && res.end.bind(res),
  };
  res._capturedBody = null;
  res._capturedStatus = 200;

  if (original.json) {
    res.json = (body) => {
      res._capturedBody = body;
      // status() returns the res object; track via res.statusCode which the
      // express-like interface keeps in sync.
      res._capturedStatus = res.statusCode || 200;
      return original.json(body);
    };
  }
  if (original.send) {
    res.send = (body) => {
      res._capturedBody = typeof body === 'object' ? body : null;
      res._capturedStatus = res.statusCode || 200;
      return original.send(body);
    };
  }
  if (original.end) {
    res.end = (...args) => {
      res._capturedStatus = res.statusCode || 200;
      return original.end(...args);
    };
  }
  return res;
}

function pickTelemetry(body) {
  if (!body || typeof body !== 'object') return {};
  const out = {};
  if (typeof body.cost_usd === 'number') out.costUSD = body.cost_usd;
  if (typeof body.estUSD === 'number') out.costUSD = body.estUSD;
  if (body.run_id) out.runId = body.run_id;
  if (body.runId) out.runId = body.runId;
  if (typeof body.quality_score === 'number') out.qualityScore = body.quality_score;
  if (body.cost && typeof body.cost.estUSD === 'number') out.costUSD = body.cost.estUSD;
  return out;
}

function clientIp(req) {
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

export function withRequestLog(handler, { endpoint } = {}) {
  return async function wrapped(req, res) {
    const t0 = Date.now();
    const requestId = newRequestId();
    const path = endpoint || req.url || 'unknown';

    // Set a request-id header so downstream logs / errors / clients can
    // correlate with this entry.
    try { res.setHeader('x-flowai-request-id', requestId); } catch {}

    instrumentRes(res);

    logger.debug('request.received', {
      requestId,
      method: req.method,
      path,
      orgId: null,
      productId: null,
      ip: clientIp(req),
      userAgent: req.headers?.['user-agent'] || null,
      endpoint: path,
    });

    let error = null;
    try {
      await handler(req, res);
    } catch (e) {
      error = e;
      // Don't double-respond if the handler already wrote one.
      if (!res.writableEnded && !res.headersSent) {
        res.status(500).json({ error: 'unhandled', details: e.message || String(e), requestId });
      }
    }

    const status = res._capturedStatus || res.statusCode || 0;
    const telemetry = pickTelemetry(res._capturedBody);
    const durationMs = Date.now() - t0;
    const level = error ? 'error' : status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const verifiedContext = req.flowaiAuthContext;
    const orgId = verifiedContext?.authenticated ? verifiedContext.orgId || null : null;
    const productId = verifiedContext?.authenticated ? verifiedContext.productId || null : null;
    const userId = verifiedContext?.authenticated ? verifiedContext.userId || null : null;
    const authMode = verifiedContext?.authMode || 'anonymous';

    logger[level]('request.completed', {
      requestId,
      method: req.method,
      path,
      status,
      durationMs,
      orgId,
      productId,
      userId,
      authMode,
      ip: clientIp(req),
      userAgent: req.headers?.['user-agent'] || null,
      endpoint: path,
      ...telemetry,
      ...(error ? { error: error.message || String(error) } : {}),
    });
  };
}
