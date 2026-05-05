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

import { extractTextFromHtml, fetchUrlAsText } from './claude.js';

const BROWSERLESS_TIMEOUT_MS = 30000;
const PLAYWRIGHT_TIMEOUT_MS = 30000;

// Detect crude JS-SPA shells: nearly empty body + script tags hint at a
// CSR-only app where simple fetch will miss the real content.
function looksLikeJsShell(page) {
  const tooShort = (page.bodyText || '').length < 250;
  const noHeadings = !page.headings || page.headings.length === 0;
  return tooShort && noHeadings;
}

async function viaBrowserless(url, apiKey) {
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
      bodyText: trim(document.body?.innerText || '', 12000),
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
  const r = await fetchUrlAsText(url);
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

export function summarisePageForPrompt(page) {
  if (!page || !page.ok) {
    return `Page fetch failed: ${page?.reason || 'unknown'}`;
  }
  const headings = (page.headings || []).map((h) => `${h.tag}: ${h.text}`).join(' | ');
  const warnings = (page.warnings || []).join(' ');
  const meta = `Method: ${page.method}${page.jsRendered ? ' (JS-rendered)' : ''}${warnings ? ' — ' + warnings : ''}`;
  return [
    meta,
    `URL: ${page.url}`,
    `Title: ${page.title || ''}`,
    `Meta: ${page.metaDescription || ''}`,
    `Headings: ${headings}`,
    '',
    'Body (truncated to 8000 chars):',
    (page.bodyText || '').slice(0, 8000),
  ].join('\n');
}
