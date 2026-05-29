// src/lib/agents/verificationAdapters.js
//
// Verification adapter registry consumed by
// src/lib/agents/verification.js#runVerificationRecrawl().
//
// The verification helper requires three injectable adapters:
//   - issueDetector:   { detect(artifact, evidence) => Issue[] }    REQUIRED
//   - orchestraDispatch: async ({capability, ...args}) => MemberResult  REQUIRED
//   - claudeNormalize: async (rawArtifact) => normalizedArtifact   OPTIONAL
//
// This module provides production wiring for all three, layered on the
// existing Orchestra dispatcher + IssueDetector. The Agent #3 Self-Renewal
// Executor (api/agent/3/execute.js#buildExecutor) imports this default
// export and passes it through to the Executor constructor.
//
// Lineage:
//   - Agent3SelfRenewalExecutor.js (commit 176d870) — consumer
//   - verification.js — helper, defines the contract (see header)
//   - api/_lib/issueDetector.js — wraps detectIssues() to match the
//                                 helper's `detect(artifact, evidence) => Issue[]`
//                                 signature (helper expects an array, not the
//                                 detectIssues `{ issues: [] }` envelope)
//   - src/lib/orchestra/index.js — wraps dispatch('crawl', ...) and normalizes
//                                  the MemberResult into the verification
//                                  helper's expected `{ ok, artifact, evidence, error? }`
//                                  shape
//   - src/lib/orchestra/claudeCode.js — best-effort artifact normalization
//                                       via the existing safeJson helper
//
// ESM only. Server-side; the verificationAdapters object is constructed
// once per Executor instance.

import { detectIssues } from '../../../api/_lib/issueDetector.js';
import { dispatch } from '../orchestra/index.js';
import { safeJson } from '../orchestra/claudeCode.js';

/**
 * IssueDetector adapter: wraps detectIssues() and unwraps its
 * `{ issues: [...] }` envelope to match the verification helper's
 * `detect(artifact, evidence) => Issue[]` contract.
 */
export const issueDetector = Object.freeze({
  detect(artifact, evidence) {
    if (!artifact || typeof artifact !== 'object') return [];
    let r;
    try {
      r = detectIssues(artifact, evidence ?? null);
    } catch {
      return [];
    }
    if (Array.isArray(r?.issues)) return r.issues;
    return [];
  },
});

/**
 * Orchestra dispatcher adapter. Receives the verification helper's call
 * shape and routes through the canonical Orchestra dispatch().
 *
 * Verification helper calls:
 *   await adapters.orchestraDispatch({ capability: 'crawl', url, productScope })
 *
 * Orchestra dispatch() returns:
 *   MemberResult { ok, action, member, data?, error?, deferred? }
 *
 * verification.js expects:
 *   { ok, artifact|body|text?, evidence?, error? }
 *
 * The mapping pulls the crawled body / page metadata out of data.
 */
export async function orchestraDispatch({ capability, url, productScope, ...rest }) {
  if (typeof capability !== 'string' || !capability) {
    return { ok: false, error: 'capability required' };
  }
  let r;
  try {
    if (capability === 'crawl') {
      r = await dispatch('crawl', { url, ...rest });
    } else {
      r = await dispatch(capability, { url, productScope, ...rest });
    }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
  if (!r || r.ok !== true || r.deferred) {
    return { ok: false, error: r?.error || 'orchestra dispatch failed' };
  }
  // crawl MemberResult.data shape from src/lib/orchestra/browserless.js +
  // api/_lib/crawler.js: { ok, method, jsRendered, title, metaDescription,
  // headings, bodyText, links, html, warnings }.
  const data = r.data || {};
  const artifact = {
    inputType: 'url',
    raw: { url },
    normalized: {
      productConcept: data.title || data.metaDescription || '',
      targetUsers: '',
      coreClaims: [],
      detectedFeatures: [],
      observedSurfaces: 'crawl',
    },
  };
  const evidence = {
    pages: [{
      ok: true,
      url: data.url || url,
      title: data.title || '',
      metaDescription: data.metaDescription || '',
      headings: Array.isArray(data.headings) ? data.headings : [],
      bodyText: data.bodyText || '',
      links: Array.isArray(data.links) ? data.links : [],
      method: data.method,
      jsRendered: !!data.jsRendered,
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    }],
    pagesCrawled: 1,
    depth: 0,
  };
  return {
    ok: true,
    artifact,
    evidence,
    body: data.bodyText || '',
    text: data.bodyText || '',
  };
}

/**
 * Claude-normalization adapter (optional per verification.js contract).
 *
 * The verification helper calls this AFTER orchestraDispatch when present.
 * For now this is a passthrough — the orchestraDispatch wrapper already
 * produces a normalized artifact directly from the crawl MemberResult, so
 * a second normalization pass would re-do work. We keep the hook in place
 * so that future variants of orchestraDispatch (e.g. returning raw HTML)
 * can be augmented here without changing the verification helper.
 *
 * Best-effort: if a string is passed, attempt safeJson parse before
 * returning; if the input is already a normalized artifact object, return
 * it unchanged.
 */
export async function claudeNormalize(rawArtifact) {
  if (rawArtifact && typeof rawArtifact === 'object') return rawArtifact;
  if (typeof rawArtifact === 'string') {
    const parsed = safeJson(rawArtifact);
    if (parsed && typeof parsed === 'object') return parsed;
  }
  return rawArtifact;
}

const verificationAdapters = Object.freeze({
  issueDetector,
  orchestraDispatch,
  claudeNormalize,
});

export default verificationAdapters;
