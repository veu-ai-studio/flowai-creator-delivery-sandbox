'use strict';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values) {
  return values.map(text).find(Boolean) ?? '';
}

function arrayOfStrings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return firstText(item.text, item.label, item.title, item.href, item.url);
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 80);
}

function normalizeFindings(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map((finding) => {
      if (typeof finding === 'string') {
        const detail = finding.trim();
        return detail ? Object.freeze({
          severity: 'medium',
          category: 'external-research-finding',
          location: '',
          evidence: detail,
        }) : null;
      }
      if (!finding || typeof finding !== 'object') return null;
      const evidence = firstText(finding.evidence, finding.detail, finding.summary, finding.description);
      if (!evidence) return null;
      return Object.freeze({
        severity: firstText(finding.severity) || 'medium',
        category: firstText(finding.category, finding.type) || 'external-research-finding',
        location: firstText(finding.location, finding.url),
        evidence,
      });
    })
    .filter(Boolean)
    .slice(0, 50);
}

function normalizeHeadingList(page, fallbackTitle) {
  const headings = arrayOfStrings(page?.headings);
  if (headings.length > 0) return headings;
  const title = firstText(page?.title, fallbackTitle);
  return title ? [`h1: ${title}`] : [];
}

function normalizePage(page, { url, fallbackTitle, fallbackBody }) {
  const bodyText = firstText(
    page?.bodyText,
    page?.text,
    page?.summary,
    fallbackBody,
  );
  const pageUrl = firstText(page?.url, url);
  let host = 'recovered page';
  try { host = new URL(pageUrl).hostname; } catch { /* keep fallback */ }
  const title = firstText(page?.title, fallbackTitle, host);
  return Object.freeze({
    ok: true,
    url: pageUrl,
    title,
    bodyText,
    headings: normalizeHeadingList(page, title),
    statusCode: Number.isFinite(Number(page?.statusCode)) ? Number(page.statusCode) : 200,
    timing: Number.isFinite(Number(page?.loadTimeMs)) ? Number(page.loadTimeMs) : 0,
    warnings: Object.freeze(['external_research_recovery']),
    surfaces: Object.freeze({
      links: Object.freeze(arrayOfStrings(page?.links).map((href) => Object.freeze({ href, text: href }))),
      buttons: Object.freeze(arrayOfStrings(page?.buttons).map((label) => Object.freeze({ label }))),
      forms: Object.freeze(Array.isArray(page?.forms) ? page.forms : []),
    }),
    consoleErrors: Object.freeze([]),
    networkErrors: Object.freeze([]),
  });
}

export function normalizeResearchRecoveryToCrawlerReport(rawOutput = {}, payload = {}, meta = {}) {
  const url = firstText(payload.url, rawOutput.url);
  if (!url) {
    return Object.freeze({
      ok: false,
      method: 'external-research-recovery',
      errors: Object.freeze([{ phase: 'normalization', reason: 'url required' }]),
      pages: Object.freeze([]),
      pagesCrawled: 0,
      depth: 0,
      findings: Object.freeze([]),
      evidenceRecovered: false,
    });
  }

  let host = 'recovered product';
  try { host = new URL(url).hostname; } catch { /* keep fallback */ }
  const title = firstText(rawOutput.title, rawOutput.productName, host);
  const findings = normalizeFindings(rawOutput.findings);
  const findingText = findings.map((finding) => `${finding.category}: ${finding.evidence}`).join('\n');
  const body = firstText(
    rawOutput.bodyText,
    rawOutput.text,
    rawOutput.summary,
    rawOutput.description,
    findingText,
    `External research recovered usable evidence for ${url}.`,
  );
  const sourcePages = Array.isArray(rawOutput.pages) && rawOutput.pages.length > 0
    ? rawOutput.pages
    : [{ url, title, bodyText: body, headings: [`h1: ${title}`] }];
  const pages = sourcePages
    .map((page) => normalizePage(page, { url, fallbackTitle: title, fallbackBody: body }))
    .filter((page) => page.bodyText.length > 0)
    .slice(0, 10);

  return Object.freeze({
    ok: pages.length > 0,
    method: 'external-research-recovery',
    member: meta.member ?? null,
    model: meta.model ?? rawOutput.model ?? null,
    evidenceRef: firstText(rawOutput.evidenceRef, meta.evidenceRef) || 'external-research-recovery',
    evidenceRecovered: true,
    evidenceRecoveryKind: 'external_research_to_crawl_report',
    evidenceSource: meta.member ?? 'external-research',
    pagesCrawled: pages.length,
    pagesActuallyCrawled: pages.length,
    pagesDiscovered: pages.length,
    maxPages: pages.length,
    reasonStopped: 'external_research_recovery',
    depth: 1,
    pages: Object.freeze(pages),
    findings: Object.freeze(findings),
    errors: Object.freeze([]),
    usage: rawOutput.usage ?? meta.usage ?? null,
  });
}

export function buildExternalResearchPrompt({ url, purpose = 'crawl' } = /** @type {any} */ ({})) {
  return `Research the public product URL below and return STRICT JSON only.

URL: ${url}
Purpose: ${purpose}

Schema:
{
  "title": "<page or product title>",
  "summary": "<concise evidence summary grounded in the URL>",
  "pages": [
    {
      "url": "<observed URL>",
      "title": "<page title>",
      "bodyText": "<visible product/page evidence, at least 200 characters when possible>",
      "headings": ["<heading text>"],
      "links": ["<public link URL or label>"],
      "buttons": ["<visible CTA/button label>"]
    }
  ],
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "category": "<readiness category>",
      "location": "<URL or page section>",
      "evidence": "<specific observed evidence>"
    }
  ],
  "evidenceRef": "<short source reference>"
}

Do not invent private data, credentials, analytics, or unobserved behavior.`;
}

export const __test = Object.freeze({
  normalizeFindings,
  normalizeResearchRecoveryToCrawlerReport,
  buildExternalResearchPrompt,
});
