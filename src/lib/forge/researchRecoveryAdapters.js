'use strict';

const PUBLIC_SEARCH_ENDPOINT = 'https://html.duckduckgo.com/html/?q=';
const MIN_PUBLIC_SOURCE_TEXT = 160;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values) {
  return values.map(text).find(Boolean) ?? '';
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripMarkup(value = '') {
  return decodeXml(String(value))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicTokens(value = '') {
  return [...new Set(String(value).toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])]
    .filter((token) => ![
      'https', 'www', 'com', 'platform', 'product', 'capabilities', 'documentation',
      'alternatives', 'vendor', 'neutral', 'operations', 'bound',
    ].includes(token));
}

function canonicalPublicUrl(value) {
  try {
    const parsed = new URL(String(value));
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch { return null; }
}

function attributableDomain(hostname = '') {
  const labels = String(hostname).toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const suffix2 = labels.slice(-2).join('.');
  return /^(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(suffix2)
    ? labels.slice(-3).join('.')
    : suffix2;
}

function parsePublicSearchFeed(xml = '') {
  const items = [];
  for (const match of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const body = match[1];
    const field = (name) => decodeXml(body.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? '').trim();
    const url = canonicalPublicUrl(field('link'));
    if (url) items.push({ url, title: stripMarkup(field('title')), snippet: stripMarkup(field('description')) });
  }
  return items;
}

function parseDuckDuckGoResults(html = '') {
  const items = [];
  const pattern = /<a\b(?=[^>]*\bclass=["'][^"']*\bresult__a\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html).matchAll(pattern)) {
    const rawHref = decodeXml(match[1]);
    let url = rawHref;
    try {
      const redirect = new URL(rawHref.startsWith('//') ? `https:${rawHref}` : rawHref, 'https://duckduckgo.com');
      url = redirect.searchParams.get('uddg') || redirect.toString();
    } catch { /* canonicalPublicUrl rejects malformed results */ }
    const canonical = canonicalPublicUrl(url);
    if (canonical) items.push({ url: canonical, title: stripMarkup(match[2]), snippet: '' });
  }
  return items;
}

function parsePublicSearchResults(body = '') {
  const rss = parsePublicSearchFeed(body);
  return rss.length > 0 ? rss : parseDuckDuckGoResults(body);
}

function relevanceScore(candidate, tokens) {
  const haystack = `${candidate.url} ${candidate.title} ${candidate.snippet} ${candidate.bodyText}`.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export async function discoverPublicResearchSources({
  url,
  topic = '',
  fetchImpl = globalThis.fetch,
  minimumSources = 3,
  maxCandidates = 18,
} = {}) {
  const registeredUrl = canonicalPublicUrl(url);
  if (!registeredUrl) throw new TypeError('discoverPublicResearchSources: valid public URL required');
  if (typeof fetchImpl !== 'function') throw new TypeError('discoverPublicResearchSources: fetch required');
  const registeredHost = new URL(registeredUrl).hostname.replace(/^www\./, '');
  const topicText = topic || registeredHost;
  const queries = [
    `"${topicText}"`,
    `"vendor-neutral" AI orchestration operations evidence`,
    `AI orchestration durable evidence observability operations platform`,
  ];
  const candidateByUrl = new Map();
  for (const query of queries) {
    const searchUrl = `${PUBLIC_SEARCH_ENDPOINT}${encodeURIComponent(query)}`;
    const searchResponse = await fetchImpl(searchUrl, {
      headers: {
        accept: 'text/html, application/rss+xml;q=0.8, application/xml;q=0.7',
        'user-agent': 'Mozilla/5.0 (compatible; FlowAIResearch/1.0; +https://flowai.flowaiplatform.com)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!searchResponse?.ok) throw new Error(`PUBLIC_RESEARCH_DISCOVERY_HTTP_${searchResponse?.status ?? 'unknown'}`);
    for (const candidate of parsePublicSearchResults(await searchResponse.text())) {
      if (!candidateByUrl.has(candidate.url)) candidateByUrl.set(candidate.url, { ...candidate, discoveryQuery: query });
    }
  }
  const tokens = topicTokens(topic || registeredHost);
  const candidates = [...candidateByUrl.values()]
    .sort((left, right) => relevanceScore(right, tokens) - relevanceScore(left, tokens) || left.url.localeCompare(right.url))
    .slice(0, maxCandidates);
  const accepted = [];
  const seenDomains = new Set();
  const seenContent = new Set();
  const attempts = [];

  for (const candidate of candidates) {
    if (accepted.length >= minimumSources) break;
    const host = new URL(candidate.url).hostname.replace(/^www\./, '');
    const domain = attributableDomain(host);
    if (seenDomains.has(domain)) {
      attempts.push({ url: candidate.url, domain, state: 'rejected', reason: 'duplicate_domain' });
      continue;
    }
    try {
      const response = await fetchImpl(candidate.url, {
        headers: { accept: 'text/html, text/plain;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      });
      const contentType = response?.headers?.get?.('content-type') ?? '';
      const bodyText = stripMarkup(await response.text()).slice(0, 12_000);
      const fingerprint = bodyText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 800);
      const score = relevanceScore({ ...candidate, bodyText }, tokens);
      let reason = null;
      if (!response?.ok) reason = `http_${response?.status ?? 'unknown'}`;
      else if (contentType && !/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType)) reason = 'unsupported_content_type';
      else if (bodyText.length < MIN_PUBLIC_SOURCE_TEXT) reason = 'insufficient_public_text';
      else if (seenContent.has(fingerprint)) reason = 'duplicate_content';
      else if (tokens.length > 1 && score < 2) reason = 'topic_irrelevant';
      else if (tokens.length === 1 && score === 0) reason = 'topic_irrelevant';
      if (reason) {
        attempts.push({ url: candidate.url, domain, state: 'rejected', reason });
        continue;
      }
      seenDomains.add(domain);
      seenContent.add(fingerprint);
      accepted.push(Object.freeze({
        ok: true,
        url: candidate.url,
        title: candidate.title || host,
        bodyText,
        text: bodyText,
        statusCode: Number(response.status),
        sourceType: 'credential_free_public_discovery',
        discoveryQuery: candidate.discoveryQuery,
        relevanceScore: score,
      }));
      attempts.push({ url: candidate.url, domain, state: 'accepted', relevanceScore: score });
    } catch (error) {
      attempts.push({ url: candidate.url, domain, state: 'failed', reason: error?.name === 'TimeoutError' ? 'timeout' : 'fetch_failed' });
    }
  }

  accepted.sort((left, right) => right.relevanceScore - left.relevanceScore || left.url.localeCompare(right.url));
  return Object.freeze({
    ok: accepted.length >= minimumSources,
    kind: 'research.credential_free_public_discovery.v1',
    query: queries[0],
    queries: Object.freeze(queries),
    minimumSources,
    sourceCount: accepted.length,
    pages: Object.freeze(accepted),
    attempts: Object.freeze(attempts),
    exhaustionKind: accepted.length >= minimumSources ? null : 'internet_source_exhausted',
  });
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
  parsePublicSearchFeed,
  parseDuckDuckGoResults,
  parsePublicSearchResults,
  stripMarkup,
  relevanceScore,
  attributableDomain,
});
