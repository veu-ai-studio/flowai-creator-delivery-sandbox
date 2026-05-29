// src/lib/evaluation/deepBrowserAnalysis.js
//
// U3 — Deep runtime engineering analysis. This module captures browser
// evidence from a rendered page without claiming source-code ownership.
// It emits bounded, redacted runtime/DOM/asset evidence only.

import { createHash } from 'node:crypto';
import { EVALUATOR_IDS } from './evaluatorIds.js';

const MAX_CONSOLE = 100;
const MAX_NETWORK = 200;
const MAX_FOCUSABLE = 100;
const MAX_ASSETS = 80;
const DEFAULT_SLOW_MS = 2_000;
const DEFAULT_LARGE_BYTES = 1_000_000;

const SECRET_PATTERNS = [
  /(authorization\s*[:=]\s*bearer\s+)[^\s"'<>]+/gi,
  /(bearer\s+)[A-Za-z0-9._~+/-]+=*/gi,
  /(token\s*[:=]\s*)[^\s"'<>]+/gi,
  /(apiKey\s*[:=]\s*)[^\s"'<>]+/gi,
  /(api_key\s*[:=]\s*)[^\s"'<>]+/gi,
  /(password\s*[:=]\s*)[^\s"'<>]+/gi,
  /(secret\s*[:=]\s*)[^\s"'<>]+/gi,
  /sk-[A-Za-z0-9_-]{12,}/g,
  /ghp_[A-Za-z0-9_]{12,}/g,
  /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9._-]+/g,
];

export function redactEvidence(value) {
  let text = typeof value === 'string' ? value : String(value ?? '');
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix) => prefix ? `${prefix}***REDACTED***` : '***REDACTED***');
  }
  return text;
}

function safeSlice(value, max = 1_000) {
  return redactEvidence(value).slice(0, max);
}

function hashText(text) {
  return createHash('sha256').update(String(text ?? '')).digest('hex');
}

function pushCapped(list, value, max) {
  if (list.length < max) list.push(value);
}

function locationFromConsoleMessage(msg) {
  try {
    const loc = typeof msg.location === 'function' ? msg.location() : null;
    return loc ? {
      url: redactEvidence(loc.url ?? ''),
      line: loc.lineNumber ?? null,
      column: loc.columnNumber ?? null,
    } : { url: '', line: null, column: null };
  } catch {
    return { url: '', line: null, column: null };
  }
}

function requestUrl(req) {
  try { return redactEvidence(typeof req.url === 'function' ? req.url() : req.url); } catch { return ''; }
}

function requestMethod(req) {
  try { return typeof req.method === 'function' ? req.method() : (req.method ?? 'GET'); } catch { return 'GET'; }
}

function responseHeaders(res) {
  try { return typeof res.headers === 'function' ? res.headers() : {}; } catch { return {}; }
}

function responseStatus(res) {
  try { return typeof res.status === 'function' ? res.status() : Number(res.status ?? 0); } catch { return 0; }
}

function responseUrl(res) {
  try { return redactEvidence(typeof res.url === 'function' ? res.url() : res.url); } catch { return ''; }
}

function responseRequest(res) {
  try { return typeof res.request === 'function' ? res.request() : null; } catch { return null; }
}

function parseSize(headers) {
  const raw = headers?.['content-length'] ?? headers?.['Content-Length'];
  const size = Number(raw);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

export function detectFrameworkFromSignals(signals = {}) {
  const evidence = [];
  let framework = 'unknown';
  let confidence = 'LOW';

  if (signals.nextData) {
    framework = 'Next.js'; confidence = 'HIGH'; evidence.push('window.__NEXT_DATA__ present');
  } else if (signals.nuxt) {
    framework = 'Nuxt'; confidence = 'HIGH'; evidence.push('window.__NUXT__ present');
  } else if (signals.vue) {
    framework = 'Vue'; confidence = 'MEDIUM'; evidence.push('Vue runtime marker present');
  } else if (signals.angular) {
    framework = 'Angular'; confidence = 'MEDIUM'; evidence.push('Angular root attributes present');
  } else if (signals.ember) {
    framework = 'Ember'; confidence = 'MEDIUM'; evidence.push('window.Ember present');
  } else if (signals.reactRoot || signals.reactFiber) {
    framework = 'React'; confidence = signals.reactFiber ? 'HIGH' : 'MEDIUM';
    evidence.push(signals.reactFiber ? 'React fiber marker present' : 'React root marker present');
  } else if (signals.scriptHints?.some((s) => /react|vite|next|webpack/i.test(s))) {
    framework = 'React/SPA'; confidence = 'LOW'; evidence.push('script URL hints reference React/Vite/Next/Webpack');
  } else {
    framework = 'vanilla/unknown'; confidence = 'LOW'; evidence.push('no framework-specific runtime marker observed');
  }

  return { framework, confidence, evidence };
}

function buildFinding({ category, severity, location, description, detail, evidenceLevel }) {
  return {
    category,
    severity,
    location,
    description,
    detail,
    source: 'deep-browser-analysis',
    generated_by: 'deep-browser-analysis',
    evaluator_id: EVALUATOR_IDS.DEEP_BROWSER,
    evaluatorVersion: 'deep-browser-analysis-1',
    confidence: evidenceLevel === 'INFERRED' ? 0.45 : 0.8,
    evidenceType: category,
    evidenceLevel,
    dimension: category === 'slow-resource' || category === 'large-resource'
      ? 'performance'
      : 'bugs_errors_detector',
  };
}
export function buildFindingsFromDeepAnalysis(analysis) {
  const findings = [];
  for (const item of analysis.consoleFindings ?? []) {
    if (item.type === 'error' || item.type === 'pageerror') {
      findings.push(buildFinding({
        category: 'console-error',
        severity: 'high',
        location: item.location?.url || analysis.url,
        description: item.type === 'pageerror' ? 'Uncaught page exception observed' : 'Console error observed',
        detail: item.stackTrace || item.message,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }));
    }
  }
  for (const item of analysis.networkFindings ?? []) {
    if (item.error) {
      findings.push(buildFinding({
        category: 'failed-network-request',
        severity: 'high',
        location: item.url,
        description: 'Network request failed in browser runtime',
        detail: item.error,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }));
    } else if (item.status >= 500) {
      findings.push(buildFinding({
        category: 'failed-network-request',
        severity: 'high',
        location: item.url,
        description: `Server error response observed (${item.status})`,
        detail: `HTTP ${item.status}`,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }));
    } else if (item.status >= 400) {
      findings.push(buildFinding({
        category: 'failed-network-request',
        severity: 'medium',
        location: item.url,
        description: `Client error response observed (${item.status})`,
        detail: `HTTP ${item.status}`,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }));
    } else if (item.durationMs > DEFAULT_SLOW_MS) {
      findings.push(buildFinding({
        category: 'slow-resource',
        severity: 'medium',
        location: item.url,
        description: `Slow response observed (${item.durationMs}ms)`,
        detail: `${item.method || 'GET'} ${item.url}`,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }));
    } else if ((item.sizeBytes ?? 0) > DEFAULT_LARGE_BYTES) {
      findings.push(buildFinding({
        category: 'large-resource',
        severity: 'low',
        location: item.url,
        description: `Large response observed (${item.sizeBytes} bytes)`,
        detail: `${item.method || 'GET'} ${item.url}`,
        evidenceLevel: 'ASSET_OBSERVED',
      }));
    }
  }
  if ((analysis.accessibilityFindings?.focusableElements ?? []).length === 0) {
    findings.push(buildFinding({
      category: 'keyboard-focusability',
      severity: 'medium',
      location: analysis.url,
      description: 'No keyboard-focusable controls observed on the rendered page',
      detail: 'Basic focus inventory returned zero elements',
      evidenceLevel: 'DOM_OBSERVED',
    }));
  }
  return findings;
}

async function collectAssetInventory(page, opts = {}) {
  const inventory = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]')).map((el) => el.src).filter(Boolean);
    const stylesheets = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]')).map((el) => el.href).filter(Boolean);
    return { scripts, stylesheets };
  });
  const scripts = Array.from(new Set(inventory.scripts || [])).slice(0, MAX_ASSETS);
  const stylesheets = Array.from(new Set(inventory.stylesheets || [])).slice(0, MAX_ASSETS);
  const scriptMetadata = scripts.map((url) => ({
    url: redactEvidence(url),
    hasSourceMapHint: /\.map(?:$|[?#])/i.test(url),
    sourceMapCommentObserved: false,
  }));

  const probeLimit = Number.isFinite(opts.sourceMapProbeLimit) ? opts.sourceMapProbeLimit : 5;
  if (opts.probeSourceMaps !== false && typeof fetch === 'function') {
    for (const asset of scriptMetadata.slice(0, probeLimit)) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), opts.assetFetchTimeoutMs ?? 5_000);
        const res = await fetch(asset.url, { signal: ac.signal });
        clearTimeout(t);
        const len = Number(res.headers.get('content-length'));
        asset.sizeBytes = Number.isFinite(len) ? len : null;
        if (!Number.isFinite(len) || len <= (opts.maxAssetProbeBytes ?? 512_000)) {
          const text = await res.text();
          asset.sourceMapCommentObserved = /sourceMappingURL\s*=/.test(text.slice(-8_000));
        }
      } catch {
        asset.probeError = 'asset_probe_failed';
      }
    }
  }

  return { scripts: scriptMetadata, stylesheets: stylesheets.map((url) => ({ url: redactEvidence(url) })) };
}

async function detectFramework(page) {
  const signals = await page.evaluate(() => {
    const root = document.querySelector('#__next, [data-reactroot], #root, #app');
    const anyReactFiber = Array.from(document.querySelectorAll('body *')).slice(0, 200)
      .some((el) => Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')));
    return {
      nextData: !!window.__NEXT_DATA__ || !!document.querySelector('#__next'),
      nuxt: !!window.__NUXT__ || !!document.querySelector('#__nuxt'),
      reactRoot: !!document.querySelector('[data-reactroot]') || !!root,
      reactFiber: anyReactFiber,
      vue: !!window.__VUE__ || !!document.querySelector('[data-v-app]') || Array.from(document.querySelectorAll('*')).some((el) => !!el.__vue__),
      ember: !!window.Ember,
      angular: !!document.querySelector('[ng-version], [ng-app], app-root'),
      scriptHints: Array.from(document.querySelectorAll('script[src]')).map((el) => el.src).slice(0, 20),
    };
  });
  return detectFrameworkFromSignals(signals);
}

async function collectFocusable(page, opts = {}) {
  const focusableElements = await page.evaluate((max) => {
    const selector = [
      'a[href]', 'button', 'input', 'select', 'textarea',
      '[tabindex]:not([tabindex="-1"])', '[role="button"]',
    ].join(',');
    return Array.from(document.querySelectorAll(selector)).slice(0, max).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 120),
      selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
    }));
  }, MAX_FOCUSABLE);

  const tabSequence = [];
  const maxTabs = Number.isFinite(opts.maxTabPresses) ? opts.maxTabPresses : 12;
  if (page.keyboard?.press) {
    for (let i = 0; i < maxTabs; i += 1) {
      try {
        await page.keyboard.press('Tab');
        const active = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          return {
            tag: el.tagName?.toLowerCase?.() || '',
            text: (el.innerText || el.getAttribute?.('aria-label') || '').trim().slice(0, 80),
            id: el.id || '',
          };
        });
        if (active) tabSequence.push(active);
      } catch { break; }
    }
  }

  return { focusableElements, tabSequence };
}

export function createDeepBrowserAnalysisProbe(page, opts = {}) {
  const consoleFindings = [];
  const networkFindings = [];
  const started = new Map();
  const startedAt = Date.now();
  const url = opts.url ?? '';

  const onConsole = (msg) => {
    const type = typeof msg.type === 'function' ? msg.type() : (msg.type ?? 'log');
    const text = typeof msg.text === 'function' ? msg.text() : String(msg.text ?? '');
    pushCapped(consoleFindings, {
      type,
      message: safeSlice(text),
      stackTrace: null,
      location: locationFromConsoleMessage(msg),
      timestamp: new Date().toISOString(),
      evidenceLevel: 'RUNTIME_OBSERVED',
    }, MAX_CONSOLE);
  };
  const onPageError = (err) => {
    pushCapped(consoleFindings, {
      type: 'pageerror',
      message: safeSlice(err?.message ?? err),
      stackTrace: safeSlice(err?.stack ?? err?.message ?? err, 2_000),
      location: { url, line: null, column: null },
      timestamp: new Date().toISOString(),
      evidenceLevel: 'RUNTIME_OBSERVED',
    }, MAX_CONSOLE);
  };
  const onRequest = (req) => started.set(req, Date.now());
  const onRequestFailed = (req) => {
    const failure = typeof req.failure === 'function' ? req.failure() : null;
    pushCapped(networkFindings, {
      url: requestUrl(req),
      method: requestMethod(req),
      status: null,
      durationMs: Date.now() - (started.get(req) ?? Date.now()),
      sizeBytes: null,
      error: safeSlice(failure?.errorText ?? 'request_failed'),
      evidenceLevel: 'RUNTIME_OBSERVED',
    }, MAX_NETWORK);
  };
  const onResponse = (res) => {
    const req = responseRequest(res);
    const durationMs = req && started.has(req) ? Date.now() - started.get(req) : null;
    const headers = responseHeaders(res);
    const sizeBytes = parseSize(headers);
    const status = responseStatus(res);
    if (status >= 400 || (durationMs ?? 0) > DEFAULT_SLOW_MS || (sizeBytes ?? 0) > DEFAULT_LARGE_BYTES) {
      pushCapped(networkFindings, {
        url: responseUrl(res),
        method: req ? requestMethod(req) : 'GET',
        status,
        durationMs,
        sizeBytes,
        error: null,
        evidenceLevel: 'RUNTIME_OBSERVED',
      }, MAX_NETWORK);
    }
  };

  page?.on?.('console', onConsole);
  page?.on?.('pageerror', onPageError);
  page?.on?.('request', onRequest);
  page?.on?.('requestfailed', onRequestFailed);
  page?.on?.('response', onResponse);

  return {
    async stop(stopOpts = {}) {
      page?.off?.('console', onConsole);
      page?.off?.('pageerror', onPageError);
      page?.off?.('request', onRequest);
      page?.off?.('requestfailed', onRequestFailed);
      page?.off?.('response', onResponse);

      try {
        const html = await page.content();
        const assetInventory = await collectAssetInventory(page, stopOpts);
        const frameworkDetection = await detectFramework(page);
        const accessibilityFindings = await collectFocusable(page, stopOpts);
        const analysis = {
          ok: true,
          generated_by: 'deep-browser-analysis',
          url: stopOpts.url ?? url,
          consoleFindings,
          networkFindings,
          assetInventory: {
            htmlLength: html.length,
            htmlSha256: hashText(html),
            scripts: assetInventory.scripts,
            stylesheets: assetInventory.stylesheets,
          },
          frameworkDetection,
          accessibilityFindings,
          summary: {
            consoleCount: consoleFindings.length,
            networkCount: networkFindings.length,
            scriptCount: assetInventory.scripts.length,
            stylesheetCount: assetInventory.stylesheets.length,
            focusableCount: accessibilityFindings.focusableElements.length,
            durationMs: Date.now() - startedAt,
          },
        };
        return { ...analysis, findings: buildFindingsFromDeepAnalysis(analysis) };
      } catch (e) {
        return {
          ok: false,
          generated_by: 'deep-browser-analysis',
          url: stopOpts.url ?? url,
          consoleFindings,
          networkFindings,
          assetInventory: {},
          frameworkDetection: { framework: 'unknown', confidence: 'LOW', evidence: ['deep analysis stop failed'] },
          accessibilityFindings: { focusableElements: [], tabSequence: [] },
          findings: [],
          summary: { consoleCount: consoleFindings.length, networkCount: networkFindings.length, durationMs: Date.now() - startedAt },
          error: safeSlice(e?.message ?? e, 300),
        };
      }
    },
  };
}
