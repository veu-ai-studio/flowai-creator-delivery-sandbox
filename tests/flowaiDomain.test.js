import { describe, expect, it } from 'vitest';
import {
  FLOWAI_CANONICAL_DOMAIN,
  FLOWAI_CANONICAL_URL,
  FLOWAI_GTM_DEMO_TARGET,
  FLOWAI_GTM_DEMO_URL,
  FLOWAI_LEGACY_URL,
  getFlowAIPublicUrls,
} from '../src/lib/flowaiDomain.js';

describe('FlowAI public domain constants', () => {
  it('defines the renewed canonical product URL while preserving the legacy URL', () => {
    expect(FLOWAI_CANONICAL_DOMAIN).toBe('flowai.veuaistudio.com');
    expect(FLOWAI_CANONICAL_URL).toBe('https://flowai.veuaistudio.com');
    expect(FLOWAI_LEGACY_URL).toBe('https://flowai-dun.vercel.app');
  });

  it('provides the GTM demo link for SAIGE live proof', () => {
    expect(FLOWAI_GTM_DEMO_TARGET).toBe('https://saigeplatform.com');
    expect(FLOWAI_GTM_DEMO_URL).toBe(
      'https://flowai.veuaistudio.com/flowai?url=https%3A%2F%2Fsaigeplatform.com',
    );
  });

  it('returns a frozen public URL envelope for UI and report consumers', () => {
    const urls = getFlowAIPublicUrls();
    expect(urls).toMatchObject({
      canonicalDomain: 'flowai.veuaistudio.com',
      canonicalUrl: 'https://flowai.veuaistudio.com',
      legacyDomain: 'flowai-dun.vercel.app',
      legacyUrl: 'https://flowai-dun.vercel.app',
      gtmDemoTarget: 'https://saigeplatform.com',
      gtmDemoUrl: FLOWAI_GTM_DEMO_URL,
    });
    expect(Object.isFrozen(urls)).toBe(true);
  });
});
