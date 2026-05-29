import { crawlSite } from '../crawl/multiPageCrawler.js';
import { connectBrowserless } from '../agents/auth/browserlessAdapter.js';
import { FRESH_BUILD_VERSION } from './constants.js';
import { AUTH_REQUIRED, UNKNOWN, validateFeatureInventory } from './types/featureInventory.js';

const PUBLIC_ACCESS = 'PUBLIC';

function requireUrl(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new TypeError('extractFeatures requires a non-empty url string');
  }
  return url.trim();
}

function isoTimestamp(now) {
  return now ? new Date(now).toISOString() : new Date().toISOString();
}

function boundedConfidence(value, fallback = 0) {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function getPageHtml(page) {
  return typeof page?.html === 'string'
    ? page.html
    : typeof page?.body === 'string'
      ? page.body
      : typeof page?.bodyText === 'string'
        ? page.bodyText
        : '';
}

function stripTags(html) {
  return normalizeWhitespace(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function clip(value, max = 280) {
  const text = normalizeWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function inferPurpose(url, title, text) {
  const haystack = `${url} ${title} ${text}`.toLowerCase();
  if (/pricing|plans|subscription/.test(haystack)) return 'pricing';
  if (/login|sign in|signin/.test(haystack)) return 'login';
  if (/sign up|signup|register|create account/.test(haystack)) return 'sign up';
  if (/checkout|payment|cart/.test(haystack)) return 'checkout';
  if (/search|find/.test(haystack)) return 'search';
  if (/contact|support/.test(haystack)) return 'contact';
  if (/dashboard|account|profile/.test(haystack)) return 'dashboard';
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/' || parsed.pathname === '') return 'home';
  } catch {
    // Keep UNKNOWN below.
  }
  return UNKNOWN;
}

function isAuthRequired(page) {
  if (page?.access === AUTH_REQUIRED) return true;
  if (page?.status === 'auth_required') return true;
  if (page?.httpStatus === 401 || page?.httpStatus === 403) return true;
  return false;
}

function extractAttributes(markup) {
  const attributes = {};
  const attrPattern = /([a-z0-9:-]+)\s*=\s*["']([^"']*)["']/gi;
  let match;
  while ((match = attrPattern.exec(markup)) !== null) {
    attributes[match[1].toLowerCase()] = match[2];
  }
  return attributes;
}

function extractLinks(html, pageUrl) {
  const links = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const attributes = extractAttributes(match[1]);
    if (!attributes.href) continue;
    let target = attributes.href;
    try {
      target = new URL(attributes.href, pageUrl).toString();
    } catch {
      // Keep the raw target when URL normalization fails.
    }
    const label = clip(stripTags(match[2]), 120) || UNKNOWN;
    links.push({ label, target, confidence: 0.8 });
  }
  return links;
}

function extractImages(html, pageUrl) {
  const images = [];
  const imagePattern = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imagePattern.exec(html)) !== null) {
    const attributes = extractAttributes(match[1]);
    if (!attributes.src) continue;
    let src = attributes.src;
    try {
      src = new URL(attributes.src, pageUrl).toString();
    } catch {
      // Keep the raw src when URL normalization fails.
    }
    images.push({
      pageUrl,
      src,
      purpose: attributes.alt ? clip(attributes.alt, 160) : UNKNOWN,
      confidence: attributes.alt ? 0.75 : 0.45,
    });
  }
  return images;
}

function extractFormFields(html) {
  const fields = [];
  const inputPattern = /<(input|select|textarea)\b([^>]*)>/gi;
  let match;
  while ((match = inputPattern.exec(html)) !== null) {
    const attributes = extractAttributes(match[2]);
    const name = attributes.name || attributes.id || attributes.placeholder || UNKNOWN;
    fields.push({
      name,
      type: attributes.type || match[1].toLowerCase(),
      required: /\srequired(\s|>|$)/i.test(match[0]) || attributes.required === 'true',
      confidence: name === UNKNOWN ? 0.45 : 0.8,
    });
  }
  return fields;
}

function extractValidationRules(html, pageUrl) {
  return extractFormFields(html)
    .filter((field) => field.required || field.name !== UNKNOWN)
    .map((field) => ({
      pageUrl,
      field: field.name,
      rule: field.required ? 'required' : UNKNOWN,
      confidence: field.required ? 0.8 : 0.45,
    }));
}

function extractApiEndpoints(html, pageUrl) {
  const endpoints = new Set();
  const apiPattern = /["'`](\/api\/[^"'`\s)]+|https?:\/\/[^"'`\s)]+\/api\/[^"'`\s)]+)["'`]/gi;
  let match;
  while ((match = apiPattern.exec(html)) !== null) {
    let endpoint = match[1];
    try {
      endpoint = new URL(endpoint, pageUrl).toString();
    } catch {
      // Keep raw endpoint.
    }
    endpoints.add(endpoint);
  }
  return Array.from(endpoints).map((endpoint) => ({
    endpoint,
    observedOn: pageUrl,
    confidence: 0.65,
  }));
}

function detectComponentBlocks(html, pageUrl) {
  const components = [];
  const rules = [
    { type: 'nav', pattern: /<nav\b[\s\S]*?<\/nav>/gi, interactive: true, purpose: 'navigation' },
    { type: 'hero', pattern: /<section\b[^>]*(hero|headline|banner)[^>]*>[\s\S]*?<\/section>/gi, interactive: false, purpose: 'primary message' },
    { type: 'form', pattern: /<form\b[\s\S]*?<\/form>/gi, interactive: true, purpose: 'user input' },
    { type: 'table', pattern: /<table\b[\s\S]*?<\/table>/gi, interactive: false, purpose: 'tabular data' },
    { type: 'list', pattern: /<(ul|ol)\b[\s\S]*?<\/\1>/gi, interactive: false, purpose: 'listed content' },
    { type: 'card', pattern: /<[^>]*class=["'][^"']*\bcard\b[^"']*["'][\s\S]*?<\/[^>]+>/gi, interactive: false, purpose: UNKNOWN },
    { type: 'footer', pattern: /<footer\b[\s\S]*?<\/footer>/gi, interactive: false, purpose: 'footer information' },
    { type: 'button', pattern: /<button\b[\s\S]*?<\/button>/gi, interactive: true, purpose: 'call to action' },
  ];

  for (const rule of rules) {
    let match;
    while ((match = rule.pattern.exec(html)) !== null) {
      const content = clip(stripTags(match[0]), 220) || UNKNOWN;
      components.push({
        id: `${rule.type}-${simpleHash(`${pageUrl}:${match.index}:${content}`)}`,
        type: rule.type,
        content,
        purpose: rule.purpose,
        pages: [pageUrl],
        interactive: rule.interactive,
        confidence: content === UNKNOWN ? 0.45 : 0.75,
      });
    }
  }

  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && !components.some((component) => component.type === 'hero')) {
    components.push({
      id: `hero-${simpleHash(`${pageUrl}:h1:${h1Match[0]}`)}`,
      type: 'hero',
      content: clip(stripTags(h1Match[1]), 220) || UNKNOWN,
      purpose: 'primary message',
      pages: [pageUrl],
      interactive: false,
      confidence: 0.65,
    });
  }

  return components;
}

function inferUserFlows({ html, pageUrl, title, links }) {
  const text = stripTags(html).toLowerCase();
  const fields = extractFormFields(html);
  const flows = [];

  const candidates = [
    { name: 'login', pattern: /login|sign in|signin|password/ },
    { name: 'sign up', pattern: /sign up|signup|register|create account/ },
    { name: 'search', pattern: /search|query/ },
    { name: 'checkout', pattern: /checkout|payment|cart/ },
    { name: 'submit', pattern: /submit|contact|send/ },
  ];

  for (const candidate of candidates) {
    const matchesText = candidate.pattern.test(`${title} ${text}`);
    const matchesLink = links.some((link) => candidate.pattern.test(`${link.label} ${link.target}`.toLowerCase()));
    const matchesForm = fields.length > 0 && candidate.pattern.test(fields.map((field) => `${field.name} ${field.type}`).join(' ').toLowerCase());
    if (!matchesText && !matchesLink && !matchesForm) continue;

    flows.push({
      id: `${candidate.name.replace(/\s+/g, '-')}-${simpleHash(pageUrl)}`,
      name: candidate.name,
      steps: [{ label: candidate.name, url: pageUrl, confidence: 0.65 }],
      entryPoint: pageUrl,
      exitPoint: UNKNOWN,
      formFields: fields,
      states: { success: UNKNOWN, error: UNKNOWN, confidence: 0 },
      confidence: fields.length > 0 ? 0.75 : 0.55,
    });
  }

  return flows;
}

function mergeComponents(components) {
  const bySignature = new Map();
  for (const component of components) {
    const signature = `${component.type}:${component.content}`;
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, { ...component, pages: Array.from(new Set(component.pages)) });
      continue;
    }
    existing.pages = Array.from(new Set([...existing.pages, ...component.pages]));
    existing.confidence = Math.max(existing.confidence, component.confidence);
  }
  return Array.from(bySignature.values());
}

function summarizePricing(text) {
  if (/\$\s?\d+|pricing|plan|subscription|per month|monthly|annual/i.test(text)) {
    return { summary: 'Pricing or plan language observed on crawled pages', confidence: 0.65 };
  }
  return { summary: UNKNOWN, confidence: 0 };
}

function buildScaffoldInventory(normalizedUrl, crawlTimestamp) {
  return {
    url: normalizedUrl,
    pages: [
      {
        url: normalizedUrl,
        title: UNKNOWN,
        purpose: UNKNOWN,
        primaryContent: UNKNOWN,
        navigation: [],
        hierarchy: { parent: UNKNOWN, children: [], confidence: 0 },
        access: UNKNOWN,
        confidence: 0,
      },
      {
        url: UNKNOWN,
        title: UNKNOWN,
        purpose: AUTH_REQUIRED,
        primaryContent: AUTH_REQUIRED,
        navigation: [],
        hierarchy: { parent: normalizedUrl, children: [], confidence: 0 },
        access: AUTH_REQUIRED,
        confidence: 0,
      },
    ],
    components: [],
    userFlows: [],
    content: {
      textByPage: {},
      imageReferences: [],
      ctas: [],
      toneAndStyle: { summary: UNKNOWN, confidence: 0 },
      confidence: 0,
    },
    businessRules: {
      accessControl: { summary: UNKNOWN, confidence: 0 },
      pricing: { summary: UNKNOWN, confidence: 0 },
      validationRules: [],
      apiEndpoints: [],
      dataEntities: [],
      confidence: 0,
    },
    metadata: {
      url: normalizedUrl,
      totalPagesDiscovered: 0,
      totalComponentsIdentified: 0,
      totalUserFlowsMapped: 0,
      crawlTimestamp,
      version: FRESH_BUILD_VERSION,
      confidence: 0,
    },
  };
}

async function inspectBrowserless(options) {
  if (options.connectBrowserless !== true) {
    return { status: 'not_requested', confidence: 1 };
  }

  const browserlessConnector = options.browserlessConnector || connectBrowserless;
  let browser;
  try {
    browser = await browserlessConnector(options.browserlessOptions || {});
    return { status: 'connected', confidence: 0.8 };
  } catch (error) {
    return {
      status: 'unavailable',
      error: clip(String(error?.message ?? error), 200),
      confidence: 0.4,
    };
  } finally {
    if (browser && typeof browser.close === 'function') {
      try {
        await browser.close();
      } catch {
        // Browserless session cleanup failure should not invalidate the inventory.
      }
    }
  }
}

function inventoryFromCrawl(normalizedUrl, crawlTimestamp, crawlReport, browserless) {
  const crawledPages = Array.isArray(crawlReport?.pages) ? crawlReport.pages : [];
  const pages = [];
  const allComponents = [];
  const allFlows = [];
  const textByPage = {};
  const imageReferences = [];
  const ctas = [];
  const validationRules = [];
  const apiEndpoints = [];
  const allText = [];

  for (const page of crawledPages) {
    const pageUrl = page?.url || UNKNOWN;
    const authRequired = isAuthRequired(page);
    const html = authRequired ? '' : getPageHtml(page);
    const text = html ? stripTags(html) : '';
    const title = authRequired ? AUTH_REQUIRED : (page?.title || UNKNOWN);
    const navigation = authRequired ? [] : extractLinks(html, pageUrl);
    const purpose = authRequired ? AUTH_REQUIRED : inferPurpose(pageUrl, title, text);
    const primaryContent = authRequired ? AUTH_REQUIRED : (text ? clip(text, 420) : UNKNOWN);
    const pageConfidence = authRequired ? 0.6 : (html || page?.title ? 0.75 : 0.35);

    pages.push({
      url: pageUrl,
      title,
      purpose,
      primaryContent,
      navigation,
      hierarchy: {
        parent: page?.depth > 0 ? normalizedUrl : UNKNOWN,
        children: [],
        confidence: page?.depth > 0 ? 0.35 : 0,
      },
      access: authRequired ? AUTH_REQUIRED : PUBLIC_ACCESS,
      confidence: boundedConfidence(page?.confidence, pageConfidence),
    });

    if (!authRequired) {
      allComponents.push(...detectComponentBlocks(html, pageUrl));
      const pageImages = extractImages(html, pageUrl);
      const pageCtas = navigation.filter((link) => /start|sign|try|buy|contact|submit|learn|demo|book/i.test(link.label));
      const pageValidation = extractValidationRules(html, pageUrl);
      const pageEndpoints = extractApiEndpoints(html, pageUrl);
      imageReferences.push(...pageImages);
      ctas.push(...pageCtas.map((cta) => ({ ...cta, pageUrl })));
      validationRules.push(...pageValidation);
      apiEndpoints.push(...pageEndpoints);
      allFlows.push(...inferUserFlows({ html, pageUrl, title, links: navigation }));
      allText.push(text);
      textByPage[pageUrl] = {
        text: text ? clip(text, 1200) : UNKNOWN,
        confidence: text ? 0.75 : 0,
      };
    } else {
      textByPage[pageUrl] = { text: AUTH_REQUIRED, confidence: 0.6 };
    }
  }

  if (pages.length === 0) {
    pages.push(buildScaffoldInventory(normalizedUrl, crawlTimestamp).pages[0]);
  }

  const components = mergeComponents(allComponents);
  const authCount = pages.filter((page) => page.access === AUTH_REQUIRED).length;
  const contentConfidence = pages.length > 0 ? 0.65 : 0;
  const businessRuleConfidence = validationRules.length || apiEndpoints.length || authCount ? 0.6 : 0;

  const inventory = {
    url: normalizedUrl,
    pages,
    components,
    userFlows: allFlows,
    content: {
      textByPage,
      imageReferences,
      ctas,
      toneAndStyle: { summary: UNKNOWN, confidence: 0 },
      confidence: contentConfidence,
    },
    businessRules: {
      accessControl: {
        summary: authCount > 0 ? `${authCount} crawled page(s) require authentication` : UNKNOWN,
        confidence: authCount > 0 ? 0.7 : 0,
      },
      pricing: summarizePricing(allText.join(' ')),
      validationRules,
      apiEndpoints,
      dataEntities: [],
      confidence: businessRuleConfidence,
    },
    metadata: {
      url: normalizedUrl,
      totalPagesDiscovered: Number.isFinite(crawlReport?.pagesDiscovered)
        ? crawlReport.pagesDiscovered
        : pages.length,
      totalComponentsIdentified: components.length,
      totalUserFlowsMapped: allFlows.length,
      crawlTimestamp,
      version: FRESH_BUILD_VERSION,
      confidence: pages.length > 0 ? 0.7 : 0,
      crawl: {
        ok: Boolean(crawlReport?.ok),
        pagesActuallyCrawled: Number.isFinite(crawlReport?.pagesActuallyCrawled)
          ? crawlReport.pagesActuallyCrawled
          : pages.length,
        reasonStopped: crawlReport?.reasonStopped || UNKNOWN,
        maxPages: crawlReport?.maxPages ?? UNKNOWN,
        maxDepth: crawlReport?.maxDepth ?? UNKNOWN,
      },
      browserless,
    },
  };

  const validation = validateFeatureInventory(inventory);
  if (!validation.ok) {
    throw new Error(`FeatureInventory extraction failed validation: ${validation.errors.join('; ')}`);
  }

  return inventory;
}

/**
 * Extract a structured FeatureInventory from a product URL.
 *
 * The production path uses the existing multi-page crawler and imported
 * Browserless adapter. Deterministic tests can inject crawlSiteImpl and
 * browserlessConnector. Passing skipCrawl preserves the explicit UNKNOWN
 * scaffold contract without calling network or browser services.
 *
 * @param {string} url - Public product URL submitted for extraction.
 * @param {Object} [options]
 * @param {Date|string} [options.now] - Timestamp override for deterministic tests.
 * @param {boolean} [options.skipCrawl] - Return UNKNOWN/AUTH_REQUIRED scaffold only.
 * @param {(url:string, opts?:object) => Promise<object>} [options.crawlSiteImpl]
 * @param {(opts?:object) => Promise<object>} [options.browserlessConnector]
 * @returns {Promise<import('./types/featureInventory.js').FeatureInventory>}
 */
export async function extractFeatures(url, options = {}) {
  const normalizedUrl = requireUrl(url);
  const crawlTimestamp = isoTimestamp(options.now);

  if (options.skipCrawl === true) {
    const scaffold = buildScaffoldInventory(normalizedUrl, crawlTimestamp);
    const validation = validateFeatureInventory(scaffold);
    if (!validation.ok) {
      throw new Error(`FeatureInventory scaffold failed validation: ${validation.errors.join('; ')}`);
    }
    return scaffold;
  }

  const crawlSiteImpl = options.crawlSiteImpl || crawlSite;
  const browserless = await inspectBrowserless(options);
  const crawlReport = await crawlSiteImpl(normalizedUrl, {
    maxPages: options.maxPages,
    maxDepth: options.maxDepth,
    sameOriginOnly: options.sameOriginOnly,
    respectRobotsTxt: options.respectRobotsTxt,
    onPage: options.onPage,
    crawlImpl: options.crawlImpl,
    fetchRobotsImpl: options.fetchRobotsImpl,
    signal: options.signal,
  });

  return inventoryFromCrawl(normalizedUrl, crawlTimestamp, crawlReport, browserless);
}
