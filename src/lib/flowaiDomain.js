// Canonical public URLs for the FlowAI operating system.
//
// flowai-dun.vercel.app remains a supported legacy deployment URL until
// Vercel/DNS cutover is complete.

'use strict';

export const FLOWAI_CANONICAL_DOMAIN = 'flowai.veuaistudio.com';
export const FLOWAI_CANONICAL_URL = `https://${FLOWAI_CANONICAL_DOMAIN}`;

export const FLOWAI_LEGACY_DOMAIN = 'flowai-dun.vercel.app';
export const FLOWAI_LEGACY_URL = `https://${FLOWAI_LEGACY_DOMAIN}`;

export const FLOWAI_GTM_DEMO_TARGET = 'https://saigeplatform.com';
export const FLOWAI_GTM_DEMO_URL = `${FLOWAI_CANONICAL_URL}/flowai?url=${encodeURIComponent(FLOWAI_GTM_DEMO_TARGET)}`;

export function getFlowAIPublicUrls() {
  return Object.freeze({
    canonicalDomain: FLOWAI_CANONICAL_DOMAIN,
    canonicalUrl: FLOWAI_CANONICAL_URL,
    legacyDomain: FLOWAI_LEGACY_DOMAIN,
    legacyUrl: FLOWAI_LEGACY_URL,
    gtmDemoTarget: FLOWAI_GTM_DEMO_TARGET,
    gtmDemoUrl: FLOWAI_GTM_DEMO_URL,
  });
}
