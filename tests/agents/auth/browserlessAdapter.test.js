// tests/agents/auth/browserlessAdapter.test.js
//
// Verifies the URL builder picks the right Browserless V2 endpoint and
// honors the BROWSERLESS_WSS_URL / BROWSERLESS_WSS_BASE overrides.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildBrowserlessWssUrl,
  normalizeBrowserlessApiKey,
  redactBrowserlessWssUrl,
} from '../../../src/lib/agents/auth/browserlessAdapter.js';

const SAVED = {
  BROWSERLESS_WSS_URL: process.env.BROWSERLESS_WSS_URL,
  BROWSERLESS_WSS_BASE: process.env.BROWSERLESS_WSS_BASE,
};

function clearOverrides() {
  delete process.env.BROWSERLESS_WSS_URL;
  delete process.env.BROWSERLESS_WSS_BASE;
}

describe('buildBrowserlessWssUrl', () => {
  beforeEach(() => { clearOverrides(); });
  afterEach(() => {
    clearOverrides();
    if (SAVED.BROWSERLESS_WSS_URL !== undefined) process.env.BROWSERLESS_WSS_URL = SAVED.BROWSERLESS_WSS_URL;
    if (SAVED.BROWSERLESS_WSS_BASE !== undefined) process.env.BROWSERLESS_WSS_BASE = SAVED.BROWSERLESS_WSS_BASE;
  });

  it('defaults to the Browserless V2 production-sfo CDP endpoint', () => {
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).toBe('wss://production-sfo.browserless.io?token=TOKEN123');
  });

  it('honors BROWSERLESS_WSS_URL (canonical V2 knob)', () => {
    process.env.BROWSERLESS_WSS_URL = 'wss://custom.example.com/chromium';
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).toBe('wss://custom.example.com/chromium?token=TOKEN123');
  });

  it('falls back to BROWSERLESS_WSS_BASE when WSS_URL is unset (legacy)', () => {
    process.env.BROWSERLESS_WSS_BASE = 'wss://self-hosted.example/chromium';
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).toBe('wss://self-hosted.example/chromium?token=TOKEN123');
  });

  it('prefers BROWSERLESS_WSS_URL over BROWSERLESS_WSS_BASE when both set', () => {
    process.env.BROWSERLESS_WSS_URL = 'wss://primary.example/chromium';
    process.env.BROWSERLESS_WSS_BASE = 'wss://legacy.example/chromium';
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).toBe('wss://primary.example/chromium?token=TOKEN123');
  });

  it('uses `&` when the configured base already carries a query string', () => {
    process.env.BROWSERLESS_WSS_URL = 'wss://example.com/chromium?launch=foo';
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).toBe('wss://example.com/chromium?launch=foo&token=TOKEN123');
  });

  it('URL-encodes the token so reserved characters do not break the query string', () => {
    const url = buildBrowserlessWssUrl('tok+with/reserved=chars');
    expect(url).toBe('wss://production-sfo.browserless.io?token=tok%2Bwith%2Freserved%3Dchars');
  });

  it('normalizes copied dashboard token values before building the WSS URL', () => {
    expect(normalizeBrowserlessApiKey(' "TOKEN123" ')).toBe('TOKEN123');
    expect(normalizeBrowserlessApiKey('token=TOKEN123')).toBe('TOKEN123');
    expect(normalizeBrowserlessApiKey('wss://production-sfo.browserless.io?token=TOKEN123')).toBe('TOKEN123');
    expect(buildBrowserlessWssUrl('token=tok+with/reserved=chars'))
      .toBe('wss://production-sfo.browserless.io?token=tok%2Bwith%2Freserved%3Dchars');
  });

  it('redacts the final Browserless endpoint while preserving endpoint shape', () => {
    expect(redactBrowserlessWssUrl('wss://production-sfo.browserless.io?token=TOKEN123'))
      .toBe('wss://production-sfo.browserless.io?token=***BROWSERLESS_TOKEN***');
    expect(redactBrowserlessWssUrl('wss://example.com/chromium?launch=foo&token=TOKEN123'))
      .toBe('wss://example.com/chromium?launch=foo&token=***BROWSERLESS_TOKEN***');
  });

  it('throws on empty or non-string apiKey', () => {
    expect(() => buildBrowserlessWssUrl('')).toThrow();
    expect(() => buildBrowserlessWssUrl('   ')).toThrow();
    expect(() => buildBrowserlessWssUrl(null)).toThrow();
    expect(() => buildBrowserlessWssUrl(undefined)).toThrow();
    expect(() => buildBrowserlessWssUrl(42)).toThrow();
  });

  it('default URL no longer points at the retired V1 chrome.browserless.io cloud', () => {
    const url = buildBrowserlessWssUrl('TOKEN123');
    expect(url).not.toContain('chrome.browserless.io');
  });
});
