// src/lib/orchestra/browserless.js
//
// Browserless adapter — wraps the existing api/_lib/crawler.js stack
// behind the OrchestraMember interface.  Already-functional capability:
// "crawl" (page extraction) and "screenshot" (PNG capture).
//
// Server-only.  Requires BROWSERLESS_API_KEY.

import { memberOk, memberError } from './member.js';

export const id = 'browserless';
export const displayName = 'Browserless (page render + screenshot)';
export const capabilities = Object.freeze(['crawl', 'screenshot']);
export const wired = true;

export async function invoke(action, payload) {
  if (action === 'crawl')      return crawlAction(payload);
  if (action === 'screenshot') return screenshotAction(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

async function crawlAction(payload) {
  const { url, force } = payload || {};
  if (typeof url !== 'string' || !url.trim()) return memberError(id, 'crawl', 'url required');
  const { crawl } = await import('../../../api/_lib/crawler.js');
  try {
    const r = await crawl(url, { force });
    if (!r.ok) return memberError(id, 'crawl', r.reason || 'crawl failed', { attempts: r.attempts });
    return memberOk(id, 'crawl', r);
  } catch (e) {
    return memberError(id, 'crawl', e.message || String(e));
  }
}

async function screenshotAction(payload) {
  const { url, fullPage } = payload || {};
  if (typeof url !== 'string' || !url.trim()) return memberError(id, 'screenshot', 'url required');
  const { captureScreenshot } = await import('../../../api/_lib/crawler.js');
  try {
    const r = await captureScreenshot(url, { fullPage });
    if (!r.ok) return memberError(id, 'screenshot', r.reason || 'screenshot failed');
    return memberOk(id, 'screenshot', r);
  } catch (e) {
    return memberError(id, 'screenshot', e.message || String(e));
  }
}
