// src/lib/evaluation/runtimeDiagnostics.js — PHASE B1 STEP 5
//
// Capture runtime signals during a Playwright navigation:
//   - page.on('console')      → JS console warnings + errors
//   - page.on('pageerror')    → uncaught exceptions
//   - page.on('requestfailed') → failed network requests (4xx/5xx/etc)
//
// Returns normalized findings. Critical contract: listeners MUST be
// attached BEFORE the page navigates so we don't miss the boot-time
// errors that often hold the most signal.
//
// Public:
//   attachRuntimeDiagnostics(page)
//     → { stop({ url }) → Promise<{ ok, findings, raw, error? }> }
//
// Use site (typical):
//   const probe = attachRuntimeDiagnostics(page);
//   await page.goto(url);
//   // ...let the page settle, scroll, interact...
//   const { findings } = await probe.stop({ url });
//
// CA-18 §2 dimension mapping:
//   console.error / pageerror   → 'bugs_errors_detector'
//   requestfailed                → 'functional_completeness'

import { EVALUATOR_IDS } from './evaluatorIds.js';

const MAX_PER_TYPE = 60;        // cap to keep payload bounded
const MAX_TEXT = 400;           // truncate each entry

function safeString(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function clipText(s) {
  const str = safeString(s);
  return str.length > MAX_TEXT ? `${str.slice(0, MAX_TEXT)}…` : str;
}

function consoleSeverity(type) {
  if (type === 'error') return 'high';
  if (type === 'warning' || type === 'warn') return 'medium';
  return 'low';
}

function networkSeverity(status) {
  if (typeof status !== 'number') return 'medium';
  if (status >= 500) return 'high';
  if (status >= 400) return 'medium';
  return 'low';
}

/**
 * Build a normalized finding from a console event.
 */
function consoleFinding({ url, msg }) {
  const type = (msg?.type?.() ?? msg?.type ?? 'log').toString().toLowerCase();
  const text = clipText(msg?.text?.() ?? msg?.text ?? '');
  const sev = consoleSeverity(type);
  if (sev === 'low') return null;   // drop console.log — too noisy
  return {
    category: `console:${type}`,
    severity: sev,
    location: url,
    description: `console.${type}: ${text}`,
    source: 'runtime-diagnostics',
    evaluator_id: EVALUATOR_IDS.RUNTIME_DIAGNOSTICS,
    evaluatorVersion: 'rt-1',
    confidence: type === 'error' ? 0.9 : 0.75,
    evidenceType: `console-${type}`,
    dimension: 'bugs_errors_detector',
    detail: { type, text },
  };
}

function pageErrorFinding({ url, error }) {
  const text = clipText(error?.message ?? error?.toString?.() ?? String(error));
  return {
    category: 'pageerror:uncaught_exception',
    severity: 'high',
    location: url,
    description: `Uncaught exception: ${text}`,
    source: 'runtime-diagnostics',
    evaluator_id: EVALUATOR_IDS.RUNTIME_DIAGNOSTICS,
    evaluatorVersion: 'rt-1',
    confidence: 0.95,
    evidenceType: 'uncaught-exception',
    dimension: 'bugs_errors_detector',
    detail: { message: text, stack: clipText(error?.stack ?? '') },
  };
}

function requestFailedFinding({ pageUrl, request }) {
  const reqUrl = request?.url?.() ?? request?.url ?? '';
  const failure = request?.failure?.() ?? null;
  const errorText = failure?.errorText ?? 'request_failed';
  const method = request?.method?.() ?? request?.method ?? 'GET';
  return {
    category: 'network:request_failed',
    severity: 'medium',
    location: pageUrl,
    description: `Failed ${method} ${reqUrl} (${errorText})`,
    source: 'runtime-diagnostics',
    evaluator_id: EVALUATOR_IDS.RUNTIME_DIAGNOSTICS,
    evaluatorVersion: 'rt-1',
    confidence: 0.85,
    evidenceType: 'request-failed',
    dimension: 'functional_completeness',
    detail: { url: reqUrl, method, errorText },
  };
}

function responseStatusFinding({ pageUrl, response }) {
  const status = response?.status?.() ?? response?.status ?? 0;
  if (typeof status !== 'number' || status < 400) return null;
  const reqUrl = response?.url?.() ?? '';
  const sev = networkSeverity(status);
  return {
    category: `network:http_${status}`,
    severity: sev,
    location: pageUrl,
    description: `HTTP ${status} on ${reqUrl}`,
    source: 'runtime-diagnostics',
    evaluator_id: EVALUATOR_IDS.RUNTIME_DIAGNOSTICS,
    evaluatorVersion: 'rt-1',
    confidence: 0.85,
    evidenceType: 'network-status',
    dimension: 'functional_completeness',
    detail: { url: reqUrl, status },
  };
}

/**
 * Attach listeners to a Playwright Page. Returns an object with stop()
 * which detaches + returns the captured findings.
 *
 * @param {object} page — Playwright Page
 */
export function attachRuntimeDiagnostics(page) {
  if (!page || typeof page.on !== 'function') {
    return {
      async stop() { return { ok: false, findings: [], raw: null, error: 'page_required' }; },
    };
  }
  const consoleMsgs = [];
  const pageErrors = [];
  const failedRequests = [];
  const statusEvents = [];

  const onConsole = (msg) => {
    if (consoleMsgs.length < MAX_PER_TYPE) consoleMsgs.push(msg);
  };
  const onPageError = (err) => {
    if (pageErrors.length < MAX_PER_TYPE) pageErrors.push(err);
  };
  const onRequestFailed = (req) => {
    if (failedRequests.length < MAX_PER_TYPE) failedRequests.push(req);
  };
  const onResponse = (res) => {
    if (statusEvents.length < MAX_PER_TYPE) statusEvents.push(res);
  };

  try {
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);
  } catch (e) {
    return {
      async stop() { return { ok: false, findings: [], raw: null, error: `attach_failed:${e?.message}` }; },
    };
  }

  return {
    async stop({ url } = {}) {
      try {
        try { page.off('console', onConsole); } catch { /* page may be closed */ }
        try { page.off('pageerror', onPageError); } catch { /* ignore */ }
        try { page.off('requestfailed', onRequestFailed); } catch { /* ignore */ }
        try { page.off('response', onResponse); } catch { /* ignore */ }
      } catch { /* swallow */ }

      const pageUrl = url ?? (typeof page.url === 'function' ? page.url() : '');
      const findings = [];
      for (const msg of consoleMsgs) {
        const f = consoleFinding({ url: pageUrl, msg });
        if (f) findings.push(f);
      }
      for (const err of pageErrors) {
        findings.push(pageErrorFinding({ url: pageUrl, error: err }));
      }
      for (const req of failedRequests) {
        findings.push(requestFailedFinding({ pageUrl, request: req }));
      }
      for (const res of statusEvents) {
        const f = responseStatusFinding({ pageUrl, response: res });
        if (f) findings.push(f);
      }
      return {
        ok: true,
        findings,
        raw: {
          consoleCount: consoleMsgs.length,
          pageErrorCount: pageErrors.length,
          requestFailedCount: failedRequests.length,
          responseCount: statusEvents.length,
        },
      };
    },
  };
}

/**
 * Convenience helper for callers that own the navigation:
 *   const { findings } = await runRuntimeDiagnostics({ page, url, navigate: async () => page.goto(url) });
 */
export async function runRuntimeDiagnostics({ page, url, navigate, waitMs = 1500 } = {}) {
  if (!page) return { ok: false, findings: [], error: 'page_required' };
  const probe = attachRuntimeDiagnostics(page);
  try {
    if (typeof navigate === 'function') await navigate();
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  } catch (e) {
    const r = await probe.stop({ url });
    return { ...r, error: r.error ?? (e?.message ?? String(e)).slice(0, 200) };
  }
  return probe.stop({ url });
}

export const __internals = Object.freeze({
  consoleSeverity, networkSeverity,
  consoleFinding, pageErrorFinding, requestFailedFinding, responseStatusFinding,
});
