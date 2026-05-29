// src/lib/orchestra/playwright.js
//
// Playwright adapter — wraps Browserless's /function endpoint via the
// existing crawler.richCapture path.  Provides advanced interactions
// (DOM probing, accessibility signals, structured surfaces) in addition
// to basic rendering.

import { memberOk, memberError } from './member.js';

export const id = 'playwright';
export const displayName = 'Playwright (Browserless /function)';
export const capabilities = Object.freeze(['interact', 'crawl']);
export const wired = true;

export async function invoke(action, payload) {
  if (action === 'interact' || action === 'crawl') return richCaptureAction(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

async function richCaptureAction(payload) {
  const { url, includeScreenshot, fullPage } = payload || {};
  if (typeof url !== 'string' || !url.trim()) return memberError(id, 'interact', 'url required');
  const { richCapture } = await import('../../../api/_lib/crawler.js');
  try {
    const r = await richCapture(url, { includeScreenshot, fullPage });
    if (!r.ok) return memberError(id, 'interact', r.reason || 'richCapture failed');
    return memberOk(id, 'interact', r);
  } catch (e) {
    return memberError(id, 'interact', e.message || String(e));
  }
}
