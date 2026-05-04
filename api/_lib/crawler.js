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
