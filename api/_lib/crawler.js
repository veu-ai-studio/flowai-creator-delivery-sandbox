// Shared crawler — picks the best available method and renders the page.
//
// Priority:
//   1. BROWSERLESS_API_KEY  → Browserless.io REST API (full headless render)
//   2. PLAYWRIGHT_ENDPOINT  → caller-hosted Playwright service
//   3. simple HTTP fetch    → last resort, no JS execution
//
// All paths return a normalised shape:
//   { ok, method, status?, html?, title, metaDescription, headings, bodyText,
//     links?, jsRendered, warnings: [] }

import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { extractTextFromHtml } from './claude.js';

const BROWSERLESS_TIMEOUT_MS = 30000;
const PLAYWRIGHT_TIMEOUT_MS = 30000;
const SIMPLE_FETCH_TIMEOUT_MS = 15000;
const MAX_SAFE_REDIRECTS = 5;

function isBlockedIpv4(address) {
  const parts = String(address).split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || (a === 100 && b >= 64 && b <= 127);
}

function isBlockedIpv6(address) {
  const value = String(address).toLowerCase();
  if (value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length);
    return net.isIP(mapped) === 4 ? isBlockedIpv4(mapped) : true;
  }
  return false;
}

function isBlockedIp(address) {
  const version = net.isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

export function createSsrGuardedLookup({ hostname, pinnedAddress = null, resolver = dns.lookup } = {}) {
  return async (_hostname, opts, callback) => {
    try {
      const resolved = pinnedAddress
        ? { address: pinnedAddress, family: net.isIP(pinnedAddress) }
        : await resolver(hostname || _hostname, { ...(opts || {}), all: false });
      const address = typeof resolved === 'string' ? resolved : resolved?.address;
      const family = typeof resolved === 'object' && resolved?.family
        ? resolved.family
        : net.isIP(address);
      if (!address || isBlockedIp(address)) {
        const error = new Error(`blocked_private_ip:${address || 'unresolved'}`);
        error.code = 'ERR_FLOWAI_SSRF_BLOCKED';
        callback(error);
        return;
      }
      callback(null, address, family);
    } catch (error) {
      callback(error);
    }
  };
}

export async function assertPublicHttpUrl(inputUrl) {
  let parsed;
  try {
    parsed = new URL(String(inputUrl || '').trim());
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'blocked_non_http_scheme' };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, reason: 'blocked_localhost' };
  }
  if (net.isIP(host) && isBlockedIp(host)) {
    return { ok: false, reason: `blocked_private_ip:${host}` };
  }
  if (process.env.NODE_ENV === 'test' && host.endsWith('.example')) {
    return {
      ok: true,
      url: parsed.toString(),
      hostname: parsed.hostname,
      addresses: ['93.184.216.34'],
      pinnedAddress: '93.184.216.34',
    };
  }
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch (error) {
    const reason = `dns_lookup_failed:${error?.code ?? error?.message ?? 'unknown'}`;
    return {
      ok: true,
      url: parsed.toString(),
      hostname: parsed.hostname,
      addresses: [],
      pinnedAddress: null,
      dnsWarning: reason,
    };
  }
  const blocked = addresses.find((entry) => isBlockedIp(entry.address));
  if (blocked) {
    return { ok: false, reason: `blocked_private_ip:${blocked.address}` };
  }
  return {
    ok: true,
    url: parsed.toString(),
    hostname: parsed.hostname,
    addresses: addresses.map((entry) => entry.address),
    pinnedAddress: addresses[0]?.address ?? null,
  };
}

async function safeFetchUrlAsText(url, { timeoutMs = SIMPLE_FETCH_TIMEOUT_MS, redirects = 0 } = {}) {
  if (redirects > MAX_SAFE_REDIRECTS) {
    return { ok: false, reason: 'too_many_redirects' };
  }
  const verdict = await assertPublicHttpUrl(url);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };
  const target = new URL(verdict.url);
  if (process.env.NODE_ENV === 'test') {
    const response = await fetch(target.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; FlowAI/1.0; +https://flowai-dun.vercel.app)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
    }).catch((error) => ({ ok: false, __error: error }));
    if (response.__error) return { ok: false, reason: response.__error?.message || String(response.__error) };
    const status = Number(response.status || 0);
    const location = response.headers?.get?.('location');
    if (status >= 300 && status < 400 && location) {
      return safeFetchUrlAsText(new URL(location, target).toString(), { timeoutMs, redirects: redirects + 1 });
    }
    if (!response.ok) return { ok: false, status, reason: `HTTP ${status}` };
    return { ok: true, html: await response.text(), status };
  }
  const transport = target.protocol === 'https:' ? https : http;
  const pinnedAddress = verdict.pinnedAddress;

  return new Promise((resolve) => {
    const requestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      headers: {
        host: target.host,
        'user-agent': 'Mozilla/5.0 (compatible; FlowAI/1.0; +https://flowai-dun.vercel.app)',
        accept: 'text/html,application/xhtml+xml',
      },
      servername: target.hostname,
      timeout: timeoutMs,
    };
    requestOptions.lookup = createSsrGuardedLookup({ hostname: target.hostname, pinnedAddress });
    const req = transport.request(requestOptions, (response) => {
      const status = Number(response.statusCode || 0);
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        const nextUrl = new URL(location, target).toString();
        safeFetchUrlAsText(nextUrl, { timeoutMs, redirects: redirects + 1 }).then(resolve);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        resolve({ ok: false, status, reason: `HTTP ${status}` });
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        ok: true,
        html: Buffer.concat(chunks).toString('utf8'),
        status,
      }));
    });
    req.on('timeout', () => {
      req.destroy(new Error('Fetch timed out'));
    });
    req.on('error', (error) => {
      resolve({ ok: false, reason: error?.message || String(error) });
    });
    req.end();
  });
}

// Detect crude JS-SPA shells: nearly empty body + script tags hint at a
// CSR-only app where simple fetch will miss the real content.
function looksLikeJsShell(page) {
  const tooShort = (page.bodyText || '').length < 250;
  const noHeadings = !page.headings || page.headings.length === 0;
  return tooShort && noHeadings;
}

async function viaBrowserless(url, apiKey) {
  const verdict = await assertPublicHttpUrl(url);
  if (!verdict.ok) return { ok: false, method: 'browserless', reason: verdict.reason };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), BROWSERLESS_TIMEOUT_MS);
  try {
    // Browserless `/content` endpoint returns the post-render HTML directly.
    const r = await fetch(`https://chrome.browserless.io/content?token=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
      }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, method: 'browserless', reason: `Browserless ${r.status}: ${txt.slice(0, 200)}` };
    }
    const html = await r.text();
    const page = extractTextFromHtml(html, url);
    return {
      ok: true,
      method: 'browserless',
      jsRendered: true,
      html,
      ...page,
      warnings: [],
    };
  } catch (e) {
    return { ok: false, method: 'browserless', reason: e.name === 'AbortError' ? 'Browserless timed out' : (e.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}

// Rich capture via Browserless /function endpoint. Runs custom JS inside a
// Puppeteer page context: fetches HTML, screenshot, structured DOM signals,
// console errors, performance timing, and identifies all clickable elements
// + forms in one round-trip. This is the primary capture used by the Super
// Customer Agent — much richer than /content alone.
//
// Returns: {
//   ok, status, url, finalUrl,
//   html, title, metaDescription,
//   screenshot: { sizeKB, dataUrl?, capturedAt },
//   timing: { navigationMs, loadMs, domContentLoadedMs },
//   consoleErrors: [{ text, location? }],
//   networkErrors: [{ url, error }],
//   surfaces: {
//     links: [{ text, href, isInternal }],
//     buttons: [{ text, role, type }],
//     forms: [{ action, method, fields: [{ name, type, required }] }],
//     images: [{ src, alt, broken }],
//     headings: [{ tag, text }],
//   },
//   accessibility: { headingHierarchyOk, totalImages, imagesMissingAlt }
// }
export async function richCapture(url, { fullPage = false, includeScreenshot = true, timeoutMs = 30000 } = {}) {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  if (!apiKey) return { ok: false, reason: 'BROWSERLESS_API_KEY not set' };
  const verdict = await assertPublicHttpUrl(url);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };

  // Code that runs INSIDE Browserless's Puppeteer page context.
  // Must be self-contained — no closure over outer vars except via context.
  const code = `
export default async function ({ page, context }) {
  const targetUrl = context.url;
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.message, location: { source: 'pageerror' } });
  });
  page.on('requestfailed', (req) => {
    networkErrors.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
  });

  const navStart = Date.now();
  let response;
  try {
    response = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 25000 });
  } catch (e) {
    return { ok: false, reason: 'goto failed: ' + e.message, consoleErrors, networkErrors };
  }
  const navigationMs = Date.now() - navStart;
  const status = response?.status() ?? 0;
  const finalUrl = page.url();

  // Performance timing
  let timing = { navigationMs, loadMs: null, domContentLoadedMs: null };
  try {
    const perf = await page.evaluate(() => {
      const t = performance.timing;
      return {
        load: t.loadEventEnd - t.navigationStart,
        dcl: t.domContentLoadedEventEnd - t.navigationStart,
      };
    });
    timing.loadMs = perf.load > 0 ? perf.load : null;
    timing.domContentLoadedMs = perf.dcl > 0 ? perf.dcl : null;
  } catch {}

  // Document signals
  const docInfo = await page.evaluate(() => {
    const origin = location.origin;
    const trim = (s, n) => (s || '').toString().trim().slice(0, n);

    // Links
    const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 200).map((a) => {
      const href = a.getAttribute('href') || '';
      let absolute = href;
      try { absolute = new URL(href, location.href).href; } catch {}
      const isInternal = absolute.startsWith(origin);
      return {
        text: trim(a.innerText || a.textContent, 120),
        href: absolute,
        isInternal,
      };
    });

    // Buttons
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')).slice(0, 100).map((b) => ({
      text: trim(b.innerText || b.textContent || b.value, 120),
      role: b.getAttribute('role') || b.tagName.toLowerCase(),
      type: b.getAttribute('type') || null,
    }));

    // Forms
    const forms = Array.from(document.querySelectorAll('form')).slice(0, 25).map((f) => ({
      action: f.getAttribute('action') || null,
      method: (f.getAttribute('method') || 'get').toLowerCase(),
      fields: Array.from(f.querySelectorAll('input, textarea, select')).slice(0, 30).map((el) => ({
        name: el.getAttribute('name') || null,
        type: (el.getAttribute('type') || el.tagName).toLowerCase(),
        required: el.hasAttribute('required'),
        placeholder: trim(el.getAttribute('placeholder') || '', 60),
      })),
    }));

    // Images
    const imgs = Array.from(document.querySelectorAll('img')).slice(0, 100).map((img) => ({
      src: img.currentSrc || img.src || '',
      alt: img.alt || '',
      broken: !img.complete || (img.naturalWidth === 0),
    }));
    const imagesMissingAlt = imgs.filter((i) => !i.alt && i.src).length;

    // Headings + hierarchy check
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).slice(0, 60).map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: trim(h.innerText || h.textContent, 200),
    }));
    let headingHierarchyOk = true;
    for (let i = 1; i < headings.length; i++) {
      const cur = parseInt(headings[i].tag.slice(1), 10);
      const prev = parseInt(headings[i - 1].tag.slice(1), 10);
      if (cur > prev + 1) { headingHierarchyOk = false; break; }
    }

    return {
      title: trim(document.title, 200),
      metaDescription: trim(document.querySelector('meta[name="description"]')?.content || '', 400),
      bodyText: trim(document.body?.innerText || '', 50000),
      links, buttons, forms, images: imgs.map((i) => ({ src: (i.src||'').slice(0,200), alt: i.alt, broken: i.broken })),
      headings, imagesMissingAlt,
      headingHierarchyOk,
      htmlLength: document.documentElement.outerHTML.length,
    };
  }).catch(() => ({}));

  // Screenshot (optional — costs time + bytes)
  let screenshot = null;
  if (context.includeScreenshot !== false) {
    try {
      const ssBuf = await page.screenshot({ fullPage: false, type: 'png' });
      screenshot = {
        sizeKB: Math.round((ssBuf.byteLength || ssBuf.length) / 1024),
        dataUrl: 'data:image/png;base64,' + ssBuf.toString('base64'),
        capturedAt: new Date().toISOString(),
      };
    } catch {}
  }

  return {
    ok: true,
    status,
    url: targetUrl,
    finalUrl,
    timing,
    consoleErrors: consoleErrors.slice(0, 50),
    networkErrors: networkErrors.slice(0, 50),
    surfaces: {
      links: docInfo.links || [],
      buttons: docInfo.buttons || [],
      forms: docInfo.forms || [],
      images: docInfo.images || [],
      headings: docInfo.headings || [],
    },
    accessibility: {
      headingHierarchyOk: docInfo.headingHierarchyOk ?? null,
      totalImages: (docInfo.images || []).length,
      imagesMissingAlt: docInfo.imagesMissingAlt ?? 0,
    },
    title: docInfo.title || '',
    metaDescription: docInfo.metaDescription || '',
    bodyText: docInfo.bodyText || '',
    htmlLength: docInfo.htmlLength || 0,
    screenshot,
  };
};
`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs + 5000);
  try {
    const r = await fetch(`https://chrome.browserless.io/function?token=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, context: { url, includeScreenshot, fullPage } }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, reason: `Browserless /function ${r.status}: ${txt.slice(0, 300)}` };
    }
    const data = await r.json();
    if (!data.ok) return { ok: false, reason: data.reason || 'function returned !ok', detail: data };
    return data;
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? 'richCapture timed out' : (e.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}

// Capture a PNG screenshot via Browserless /screenshot endpoint. Returns
// { ok, contentType, sizeBytes, base64? } — we don't persist the binary in
// memory, only the metadata; the report records "captured: <bytes>". When
// Vercel Blob / Supabase storage activates tomorrow, this is where we'd save.
export async function captureScreenshot(url, { fullPage = true, viewport = { width: 1280, height: 800 } } = {}) {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  if (!apiKey) return { ok: false, reason: 'BROWSERLESS_API_KEY not set' };
  const verdict = await assertPublicHttpUrl(url);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), BROWSERLESS_TIMEOUT_MS);
  try {
    const r = await fetch(`https://chrome.browserless.io/screenshot?token=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: { fullPage, type: 'png', omitBackground: false },
        viewport,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
      }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, reason: `Browserless screenshot ${r.status}: ${txt.slice(0, 200)}` };
    }
    const buf = await r.arrayBuffer();
    const sizeBytes = buf.byteLength;
    // Don't return the full base64 (would balloon JSON responses); just stats.
    return {
      ok: true,
      contentType: r.headers.get('content-type') || 'image/png',
      sizeBytes,
      sizeKB: Math.round(sizeBytes / 1024),
      capturedAt: new Date().toISOString(),
      // TODO: when object storage is wired, upload buffer here and return URL.
      storage: 'not-persisted-in-v1',
    };
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? 'Browserless screenshot timed out' : (e.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}

async function viaPlaywrightEndpoint(url, endpoint) {
  const verdict = await assertPublicHttpUrl(url);
  if (!verdict.ok) return { ok: false, method: 'playwright-endpoint', reason: verdict.reason };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PLAYWRIGHT_TIMEOUT_MS);
  try {
    const r = await fetch(`${endpoint.replace(/\/$/, '')}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, waitUntil: 'networkidle' }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, method: 'playwright-endpoint', reason: `Endpoint ${r.status}: ${txt.slice(0, 200)}` };
    }
    const data = await r.json().catch(() => null);
    // Accept either { html } or { content }
    const html = data?.html || data?.content || '';
    if (!html) {
      return { ok: false, method: 'playwright-endpoint', reason: 'Endpoint returned no HTML' };
    }
    const page = extractTextFromHtml(html, url);
    return { ok: true, method: 'playwright-endpoint', jsRendered: true, html, ...page, warnings: [] };
  } catch (e) {
    return { ok: false, method: 'playwright-endpoint', reason: e.name === 'AbortError' ? 'Playwright endpoint timed out' : (e.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}

async function viaSimpleFetch(url) {
  const r = await safeFetchUrlAsText(url);
  if (!r.ok) {
    return { ok: false, method: 'simple-fetch', reason: r.reason, status: r.status };
  }
  const page = extractTextFromHtml(r.html, url);
  const warnings = [];
  if (looksLikeJsShell(page)) {
    warnings.push('Page may be JavaScript-rendered. Provide a Browserless API key for full crawling — set BROWSERLESS_API_KEY in Vercel env.');
  }
  return { ok: true, method: 'simple-fetch', jsRendered: false, html: r.html, ...page, warnings };
}

// Public entry: pick the best available method automatically.
//
// `force` lets a caller pin a method (useful for testing) — values:
//   'browserless' | 'playwright-endpoint' | 'simple-fetch'
//
// Behavior:
//   - If a richer method is configured, try it first.
//   - If a richer method fails (network, 5xx, timeout) we fall back to simple-fetch
//     so the call still returns *something* the model can analyse.
export async function crawl(url, { force } = {}) {
  if (!url) return { ok: false, reason: 'No URL provided' };

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  const playwrightEndpoint = process.env.PLAYWRIGHT_ENDPOINT;

  const order = [];
  if (force) {
    order.push(force);
  } else {
    if (browserlessKey) order.push('browserless');
    if (playwrightEndpoint) order.push('playwright-endpoint');
    order.push('simple-fetch');
  }

  const attempts = [];
  for (const method of order) {
    let result;
    if (method === 'browserless') {
      if (!browserlessKey) { attempts.push({ method, reason: 'BROWSERLESS_API_KEY not set' }); continue; }
      result = await viaBrowserless(target, browserlessKey);
    } else if (method === 'playwright-endpoint') {
      if (!playwrightEndpoint) { attempts.push({ method, reason: 'PLAYWRIGHT_ENDPOINT not set' }); continue; }
      result = await viaPlaywrightEndpoint(target, playwrightEndpoint);
    } else {
      result = await viaSimpleFetch(target);
    }

    if (result.ok) {
      result.url = target;
      result.attempts = attempts;
      // If simple-fetch was used but a richer method was configured, surface that.
      if (method === 'simple-fetch' && (browserlessKey || playwrightEndpoint)) {
        result.warnings = [...(result.warnings || []), 'Richer crawler was configured but failed; degraded to simple HTTP fetch.'];
      }
      return result;
    }
    attempts.push({ method, reason: result.reason });
  }

  return { ok: false, url: target, reason: 'All crawl methods failed', attempts };
}

// ─── Aggressive Crawl Engine (ACE) Phase 1 ───────────────────────────────
//
// Generic, product-agnostic JS-rendered BFS spider. Accepts ANY URL passed
// at runtime. Phase 1 scope: per-page render via Browserless `/function`
// (`richCapture` already runs `networkidle2` waits + extracts title, meta,
// headings, body text, links, buttons, forms, images, accessibility
// signals, console/network errors). BFS across same-origin internal
// links up to the canonical depth/page caps per CANONICAL_REFERENCE §6
// (default depth=8 / hard cap=12; default pages=200 / hard cap=2000).
// Hard caps overridable via Doppler `flowai/<env>/CRAWL_DEPTH_HARD_CAP`
// and `flowai/<env>/CRAWL_MAX_PAGES_HARD_CAP`.
//
// Phase 1 NOT-YET-IMPLEMENTED (per spec §A.2-§A.7 + engineering scope
// estimate; later dispatches):
//   - click-everything pass over internal links + buttons + cards
//   - modal probing (`[role="dialog"]`, `.modal`, `[aria-modal="true"]`)
//   - AI-agent benign-probe pass
//   - desktop+mobile dual-viewport crawl
//   - authenticated `storageState` re-render
//   - deliberate error-state triggers (404 / 500 / offline / slow-net /
//     form-validation / XSS)
//
// Phase 1 IS sufficient to replace the prior static-fetch path in
// `inputAdapters/url.js` with full JS rendering at the canonical caps —
// the immediate dispatch ask. Later phases extend without changing the
// CrawlReport JSON shape (only adding optional fields).
//
// CrawlReport JSON shape (returned by `aggressiveCrawl`):
//   {
//     ok, startUrl, origin,
//     depth: <configured depth>, pageCap: <configured maxPages>,
//     pagesCrawled, pages: [PageRecord, ...],
//     errors: [{ phase, url, reason }],
//     warnings: [...],
//     startedAt: <ISO>, finishedAt: <ISO>, durationMs,
//   }
// PageRecord (rendered via `richCapture`):
//   {
//     url, normalisedUrl, depth, parent,
//     title, metaDescription, bodyText,
//     headings, surfaces: { links, buttons, forms, images },
//     accessibility, timing, consoleErrors, networkErrors,
//     method: 'browserless-function' | 'browserless-content' | 'simple-fetch',
//     jsRendered, ok, reason?,
//   }
//
// PRODUCT-AGNOSTIC PER §22: this code references zero product names, zero
// VEU references, zero hardcoded URLs. URLs flow in at runtime via
// caller arguments; defaults + caps flow in via env (Doppler).

export const ACE_DEFAULTS = Object.freeze({
  depth: 8,                  // CANONICAL_REFERENCE §6 default depth
  maxPages: 200,             // CANONICAL_REFERENCE §6 default pages-per-product
  depthHardCap: 12,          // §6 hard cap (override env CRAWL_DEPTH_HARD_CAP)
  maxPagesHardCap: 2000,     // §6 hard cap (override env CRAWL_MAX_PAGES_HARD_CAP)
  perPageTimeoutMs: 30_000,
  totalWallClockMs: 20 * 60_000,  // spec §E.3 — 20 min per crawl
  includeScreenshot: false,  // Phase 1 default off — screenshots are GTM-readiness-track
});

function resolveHardCaps() {
  const depthHardCap = parseIntOrDefault(process.env.CRAWL_DEPTH_HARD_CAP, ACE_DEFAULTS.depthHardCap);
  const maxPagesHardCap = parseIntOrDefault(process.env.CRAWL_MAX_PAGES_HARD_CAP, ACE_DEFAULTS.maxPagesHardCap);
  return { depthHardCap, maxPagesHardCap };
}

function parseIntOrDefault(raw, dflt) {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

function normaliseForCompare(href) {
  try {
    const u = new URL(href);
    return (u.origin + u.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return null;
  }
}

function isSameOriginUrl(href, origin) {
  if (!origin) return false;
  try {
    return new URL(href).origin === origin;
  } catch {
    return false;
  }
}

function extractInternalLinks(page, origin) {
  // richCapture returns `surfaces.links: [{ text, href, isInternal }]`
  // The `/content` path (viaBrowserless) returns the flat `links` shape via
  // extractTextFromHtml. Handle both.
  const fromSurfaces = page?.surfaces?.links;
  if (Array.isArray(fromSurfaces)) {
    return fromSurfaces
      .filter((l) => l && typeof l.href === 'string')
      .map((l) => l.href)
      .filter((href) => isSameOriginUrl(href, origin));
  }
  const flat = page?.links;
  if (Array.isArray(flat)) {
    return flat
      .map((l) => (typeof l === 'string' ? l : l?.href))
      .filter((href) => typeof href === 'string')
      .filter((href) => isSameOriginUrl(href, origin));
  }
  return [];
}

function buildPageRecord({ url, normalisedUrl, depth, parent, capture, fallback }) {
  if (capture && capture.ok) {
    return {
      url: capture.finalUrl ?? url,
      normalisedUrl,
      depth,
      parent: parent ?? null,
      title: capture.title ?? '',
      metaDescription: capture.metaDescription ?? '',
      bodyText: capture.bodyText ?? '',
      headings: capture.surfaces?.headings ?? [],
      surfaces: {
        links: capture.surfaces?.links ?? [],
        buttons: capture.surfaces?.buttons ?? [],
        forms: capture.surfaces?.forms ?? [],
        images: capture.surfaces?.images ?? [],
      },
      accessibility: capture.accessibility ?? {},
      timing: capture.timing ?? {},
      consoleErrors: capture.consoleErrors ?? [],
      networkErrors: capture.networkErrors ?? [],
      method: 'browserless-function',
      jsRendered: true,
      ok: true,
    };
  }
  // richCapture failed — fall back to the legacy `crawl()` path so the
  // BFS still produces something analysable downstream.
  if (fallback && fallback.ok) {
    return {
      url: fallback.url ?? url,
      normalisedUrl,
      depth,
      parent: parent ?? null,
      title: fallback.title ?? '',
      metaDescription: fallback.metaDescription ?? '',
      bodyText: fallback.bodyText ?? '',
      headings: fallback.headings ?? [],
      surfaces: { links: fallback.links ?? [], buttons: [], forms: [], images: [] },
      accessibility: {},
      timing: {},
      consoleErrors: [],
      networkErrors: [],
      method: fallback.method ?? 'simple-fetch',
      jsRendered: !!fallback.jsRendered,
      ok: true,
      warnings: fallback.warnings ?? [],
    };
  }
  return {
    url, normalisedUrl, depth, parent: parent ?? null,
    title: '', metaDescription: '', bodyText: '',
    headings: [],
    surfaces: { links: [], buttons: [], forms: [], images: [] },
    accessibility: {},
    timing: {},
    consoleErrors: [],
    networkErrors: [],
    method: 'none',
    jsRendered: false,
    ok: false,
    reason: capture?.reason || fallback?.reason || 'render_failed',
  };
}

/**
 * Phase 1 Aggressive Crawl Engine. Accepts any URL at runtime and walks
 * its same-origin link graph up to the canonical depth/page caps.
 *
 * @param {string} startUrl
 * @param {object} [opts]
 * @param {number} [opts.depth=8]              — soft depth (clamped to hard cap)
 * @param {number} [opts.maxPages=200]         — soft pages (clamped to hard cap)
 * @param {boolean} [opts.includeScreenshot=false]
 * @param {number} [opts.perPageTimeoutMs=30000]
 * @param {number} [opts.totalWallClockMs=1200000]  — 20 min default
 * @param {string} [opts.force]                — pin a method (testing only)
 * @returns {Promise<object>} CrawlReport
 */
export async function aggressiveCrawl(startUrl, opts = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  if (typeof startUrl !== 'string' || !startUrl.trim()) {
    return {
      ok: false,
      startUrl: '',
      origin: '',
      depth: 0,
      pageCap: 0,
      pagesCrawled: 0,
      pages: [],
      errors: [{ phase: 'input', url: '', reason: 'startUrl_required' }],
      warnings: [],
      startedAt,
      finishedAt: startedAt,
      durationMs: 0,
    };
  }
  let normalisedStart = startUrl.trim();
  if (!/^https?:\/\//i.test(normalisedStart)) normalisedStart = 'https://' + normalisedStart;

  const { depthHardCap, maxPagesHardCap } = resolveHardCaps();
  const depth = Math.max(0, Math.min(depthHardCap, opts.depth ?? ACE_DEFAULTS.depth));
  const maxPages = Math.max(1, Math.min(maxPagesHardCap, opts.maxPages ?? ACE_DEFAULTS.maxPages));
  const perPageTimeoutMs = opts.perPageTimeoutMs ?? ACE_DEFAULTS.perPageTimeoutMs;
  const totalWallClockMs = opts.totalWallClockMs ?? ACE_DEFAULTS.totalWallClockMs;
  const includeScreenshot = opts.includeScreenshot ?? ACE_DEFAULTS.includeScreenshot;
  const deadlineMs = startedAtMs + totalWallClockMs;

  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  let origin;
  try { origin = new URL(normalisedStart).origin; }
  catch {
    return {
      ok: false,
      startUrl: normalisedStart,
      origin: '',
      depth,
      pageCap: maxPages,
      pagesCrawled: 0,
      pages: [],
      errors: [{ phase: 'input', url: normalisedStart, reason: 'invalid_url' }],
      warnings: [],
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
    };
  }

  const visited = new Map();   // normalisedUrl → PageRecord
  const errors = [];
  const warnings = [];
  const frontier = [{ url: normalisedStart, depth: 0, parent: null }];

  if (!browserlessKey && !opts.force) {
    warnings.push(
      'BROWSERLESS_API_KEY not set — falling back to simple HTTP fetch per page. ' +
      'JS-rendered surfaces will be missed; configure BROWSERLESS_API_KEY in Doppler for full Phase 1 coverage.',
    );
  }

  while (frontier.length > 0 && visited.size < maxPages) {
    if (Date.now() > deadlineMs) {
      warnings.push(`crawl wall-clock budget exceeded (${totalWallClockMs}ms) — terminated early at ${visited.size} pages`);
      break;
    }
    const next = frontier.shift();
    const norm = normaliseForCompare(next.url);
    if (!norm || visited.has(norm)) continue;

    let capture = null;
    let fallback = null;
    if (browserlessKey) {
      capture = await richCapture(next.url, {
        fullPage: true,
        includeScreenshot,
        timeoutMs: perPageTimeoutMs,
      });
    }
    if (!capture || !capture.ok) {
      // Try the legacy crawl() so we still get a body for this page.
      try {
        fallback = await crawl(next.url, opts.force ? { force: opts.force } : undefined);
      } catch (e) {
        errors.push({ phase: 'render', url: next.url, reason: String(e?.message ?? e) });
      }
    }
    const record = buildPageRecord({
      url: next.url, normalisedUrl: norm, depth: next.depth, parent: next.parent,
      capture, fallback,
    });
    visited.set(norm, record);

    if (!record.ok) {
      errors.push({ phase: 'render', url: next.url, reason: record.reason ?? 'render_failed' });
      continue;
    }

    // Enqueue same-origin internal links at the next depth.
    if (next.depth + 1 <= depth) {
      const candidates = extractInternalLinks(capture && capture.ok ? capture : fallback, origin);
      for (const href of candidates) {
        const childNorm = normaliseForCompare(href);
        if (!childNorm || visited.has(childNorm)) continue;
        if (frontier.some((f) => normaliseForCompare(f.url) === childNorm)) continue;
        frontier.push({ url: href, depth: next.depth + 1, parent: next.url });
        if (visited.size + frontier.length >= maxPages * 2) break;  // soft frontier cap
      }
    }
  }

  const finishedAtMs = Date.now();
  return {
    ok: true,
    startUrl: normalisedStart,
    origin,
    depth,
    pageCap: maxPages,
    pagesCrawled: [...visited.values()].filter((p) => p.ok).length,
    pages: [...visited.values()],
    errors,
    warnings,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
  };
}

export function summarisePageForPrompt(page) {
  if (!page || !page.ok) {
    return `Page fetch failed: ${page?.reason || 'unknown'}`;
  }
  const headings = (page.headings || []).map((h) => `${h.tag}: ${h.text}`).join(' | ');
  const warnings = (page.warnings || []).join(' ');
  const meta = `Method: ${page.method}${page.jsRendered ? ' (JS-rendered)' : ''}${warnings ? ' — ' + warnings : ''}`;
  // Defect A 2026-05-16: body cap raised from 8k → 50k. At 8k the
  // research/scoring prompts were scoring on a partial DOM and marking
  // products "incomplete content" when the real SPA had finished rendering.
  // 50k covers every observed real SPA's visible text; Claude's context
  // window handles it comfortably.
  return [
    meta,
    `URL: ${page.url}`,
    `Title: ${page.title || ''}`,
    `Meta: ${page.metaDescription || ''}`,
    `Headings: ${headings}`,
    '',
    'Body:',
    (page.bodyText || '').slice(0, 50000),
  ].join('\n');
}
