import { crawlSite } from '../crawl/multiPageCrawler.js';
import { connectBrowserless } from '../agents/auth/browserlessAdapter.js';
import { extractFeatures } from './featureExtractor.js';
import { FRESH_BUILD_VERSION } from './constants.js';
import { UNKNOWN, validateFeatureInventory } from './types/featureInventory.js';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function requireUrl(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new TypeError('synthesizeDesign requires a non-empty url string');
  }
  return url.trim();
}

function isoTimestamp(now) {
  return now ? new Date(now).toISOString() : new Date().toISOString();
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function clip(value, max = 220) {
  const text = normalizeWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
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

function rgbToHex(r, g, b) {
  const toHex = (value) => Number(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractStyles(html) {
  return [
    ...String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
  ].map((match) => match[1]).join('\n');
}

function extractColors(html) {
  const source = `${html}\n${extractStyles(html)}`;
  const colors = [];
  const hexPattern = /#[0-9a-f]{3,8}\b/gi;
  const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;

  for (const match of source.matchAll(hexPattern)) {
    let hex = match[0].toLowerCase();
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (hex.length > 7) hex = hex.slice(0, 7);
    const before = source.slice(Math.max(0, match.index - 80), match.index).toLowerCase();
    colors.push({
      hex,
      usageContext: inferColorUsage(before),
      confidence: HEX_COLOR.test(hex) ? 0.8 : 0.45,
    });
  }

  for (const match of source.matchAll(rgbPattern)) {
    const hex = rgbToHex(match[1], match[2], match[3]);
    const before = source.slice(Math.max(0, match.index - 80), match.index).toLowerCase();
    colors.push({
      hex,
      usageContext: inferColorUsage(before),
      confidence: 0.75,
    });
  }

  return uniqueBy(colors, (color) => `${color.hex}:${color.usageContext}`);
}

function inferColorUsage(context) {
  if (/background|bg-/.test(context)) return 'background';
  if (/color|text-/.test(context)) return 'text';
  if (/border/.test(context)) return 'border';
  if (/accent|primary|button|cta/.test(context)) return 'accent';
  return UNKNOWN;
}

function bucketColors(colors) {
  const backgroundColors = colors.filter((color) => color.usageContext === 'background');
  const textColors = colors.filter((color) => color.usageContext === 'text');
  const accentColors = colors.filter((color) => color.usageContext === 'accent');
  const borderColors = colors.filter((color) => color.usageContext === 'border');
  const primaryColors = colors.slice(0, 3);

  return {
    primaryColors: primaryColors.length ? primaryColors : [{ hex: UNKNOWN, usageContext: UNKNOWN, confidence: 0 }],
    secondaryColors: colors.slice(3, 7),
    accentColors,
    backgroundColors,
    textColors,
    borders: borderColors.length
      ? borderColors.map((color) => ({ color: color.hex, style: UNKNOWN, confidence: color.confidence }))
      : [{ color: UNKNOWN, style: UNKNOWN, confidence: 0 }],
    shadows: extractShadowTokens(colors),
    confidence: colors.length ? 0.7 : 0,
  };
}

function extractShadowTokens() {
  return [{ value: UNKNOWN, usageContext: UNKNOWN, confidence: 0 }];
}

function extractTypography(html) {
  const source = `${html}\n${extractStyles(html)}`;
  const families = [];
  const sizes = [];
  const weights = [];
  const lineHeights = [];

  for (const match of source.matchAll(/font-family\s*:\s*([^;}"']+)/gi)) {
    families.push({
      role: UNKNOWN,
      family: clip(match[1].replace(/['"]/g, ''), 120),
      confidence: 0.75,
    });
  }

  for (const match of source.matchAll(/font-size\s*:\s*([0-9.]+(?:px|rem|em|%))/gi)) {
    sizes.push({ value: match[1], usageContext: UNKNOWN, confidence: 0.75 });
  }

  for (const match of source.matchAll(/font-weight\s*:\s*([0-9]{3}|bold|normal|medium|semibold)/gi)) {
    weights.push({ value: match[1], usageContext: UNKNOWN, confidence: 0.75 });
  }

  for (const match of source.matchAll(/line-height\s*:\s*([0-9.]+(?:px|rem|em|%)?)/gi)) {
    lineHeights.push({ value: match[1], usageContext: UNKNOWN, confidence: 0.7 });
  }

  const hierarchy = [];
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const count = (source.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
    hierarchy.push({ tag, count, confidence: count > 0 ? 0.75 : 0.35 });
  }

  return {
    fontFamilies: uniqueBy(families, (item) => item.family),
    fontSizes: uniqueBy(sizes, (item) => item.value),
    fontWeights: uniqueBy(weights, (item) => item.value),
    lineHeights: uniqueBy(lineHeights, (item) => item.value),
    hierarchy,
    confidence: families.length || sizes.length || weights.length ? 0.7 : 0,
  };
}

function extractLayout(html) {
  const source = String(html);
  const lower = source.toLowerCase();
  const css = extractStyles(source);
  const maxWidthMatch = css.match(/max-width\s*:\s*([0-9.]+(?:px|rem|em|%))/i);
  const spacingMatches = Array.from(css.matchAll(/\b(?:padding|margin)(?:-[a-z]+)?\s*:\s*([^;]+)/gi))
    .slice(0, 12)
    .map((match) => ({ property: match[0].split(':')[0], value: clip(match[1], 80), confidence: 0.65 }));
  const breakpoints = Array.from(css.matchAll(/@media[^{]*\(([^)]+)\)/gi))
    .map((match) => ({ query: clip(match[1], 120), confidence: 0.7 }));

  return {
    pattern: inferLayoutPattern(lower),
    maxContentWidth: maxWidthMatch ? { value: maxWidthMatch[1], confidence: 0.75 } : { value: UNKNOWN, confidence: 0 },
    spacingSystem: spacingMatches.length ? spacingMatches : [{ property: UNKNOWN, value: UNKNOWN, confidence: 0 }],
    breakpoints,
    responsiveBehavior: breakpoints.length ? 'media queries observed' : UNKNOWN,
    navigation: lower.includes('<nav') ? { position: UNKNOWN, style: 'nav element observed', confidence: 0.65 } : { position: UNKNOWN, style: UNKNOWN, confidence: 0 },
    confidence: source ? 0.6 : 0,
  };
}

function inferLayoutPattern(lowerHtml) {
  if (/dashboard|sidebar|aside|grid-cols|sidebar/.test(lowerHtml)) return 'dashboard_or_sidebar';
  if (/display\s*:\s*grid|grid /.test(lowerHtml)) return 'grid';
  if (/display\s*:\s*flex|flex /.test(lowerHtml)) return 'flex';
  if (/<main\b|<section\b/.test(lowerHtml)) return 'sectioned_single_page';
  return UNKNOWN;
}

function extractComponentSpecs(featureInventory, html, visualSystem) {
  const components = Array.isArray(featureInventory?.components) ? featureInventory.components : [];
  const lower = String(html).toLowerCase();
  return components.map((component) => ({
    componentId: component.id || UNKNOWN,
    type: component.type || UNKNOWN,
    pages: Array.isArray(component.pages) ? component.pages : [],
    visualStyle: inferComponentStyle(component, lower),
    sizeVariants: inferSizeVariants(lower),
    colorUsage: visualSystem.primaryColors.slice(0, 3),
    interactiveStates: {
      hover: /\bhover[:_-]|:hover/.test(lower) ? 'hover state observed' : UNKNOWN,
      active: /\bactive[:_-]|:active/.test(lower) ? 'active state observed' : UNKNOWN,
      disabled: /\bdisabled[:_-]|:disabled|disabled>/.test(lower) ? 'disabled state observed' : UNKNOWN,
      confidence: /\bhover[:_-]|:hover|\bactive[:_-]|:active|\bdisabled[:_-]|:disabled|disabled>/.test(lower) ? 0.6 : 0,
    },
    confidence: component.confidence ? Math.min(0.75, component.confidence) : 0.45,
  }));
}

function inferComponentStyle(component, lowerHtml) {
  const type = String(component?.type || '').toLowerCase();
  const styles = [];
  if (/rounded|border-radius/.test(lowerHtml)) styles.push('rounded');
  if (/border|outline/.test(lowerHtml)) styles.push('outlined');
  if (/background|bg-/.test(lowerHtml)) styles.push('filled');
  if (type === 'button' || type === 'form') styles.push('interactive');
  return styles.length ? styles.join(', ') : UNKNOWN;
}

function inferSizeVariants(lowerHtml) {
  const variants = [];
  if (/\bsm:|small|text-sm/.test(lowerHtml)) variants.push('small');
  if (/\blg:|large|text-lg/.test(lowerHtml)) variants.push('large');
  if (/\bxl:|extra-large|text-xl/.test(lowerHtml)) variants.push('extra_large');
  return variants.length ? variants : [UNKNOWN];
}

function extractUxPatterns(html) {
  const text = stripTags(html).toLowerCase();
  const lower = String(html).toLowerCase();
  return {
    loadingStates: /loading|spinner|skeleton/.test(text) ? ['loading state observed'] : [UNKNOWN],
    errorStates: /error|required|invalid|failed/.test(text) ? ['error or validation state observed'] : [UNKNOWN],
    emptyStates: /empty|no results|nothing here/.test(text) ? ['empty state observed'] : [UNKNOWN],
    feedbackPatterns: /toast|alert|modal|dialog/.test(lower) ? ['toast/modal/alert feedback observed'] : [UNKNOWN],
    formValidationStyle: /required|aria-invalid|invalid/.test(lower) ? 'inline validation signals observed' : UNKNOWN,
    confidence: /loading|spinner|skeleton|error|required|invalid|toast|alert|modal|dialog/.test(`${text} ${lower}`) ? 0.65 : 0,
  };
}

function extractTechnologySignals(html) {
  const lower = String(html).toLowerCase();
  return {
    cssFramework: inferCssFramework(lower),
    componentLibrary: inferComponentLibrary(lower),
    animationLibrary: inferAnimationLibrary(lower),
    iconLibrary: inferIconLibrary(lower),
    confidence: lower ? 0.55 : 0,
  };
}

function inferCssFramework(lower) {
  if (/\b(?:sm|md|lg|xl):|bg-|text-|rounded-|grid-cols-|font-/.test(lower)) return { name: 'Tailwind CSS signal', confidence: 0.65 };
  if (/bootstrap|container-fluid|btn-primary/.test(lower)) return { name: 'Bootstrap signal', confidence: 0.65 };
  return { name: UNKNOWN, confidence: 0 };
}

function inferComponentLibrary(lower) {
  if (/radix|data-radix|shadcn/.test(lower)) return { name: 'Radix/shadcn signal', confidence: 0.65 };
  if (/mui|material-ui/.test(lower)) return { name: 'Material UI signal', confidence: 0.65 };
  return { name: UNKNOWN, confidence: 0 };
}

function inferAnimationLibrary(lower) {
  if (/framer-motion|motion\./.test(lower)) return { name: 'Framer Motion signal', confidence: 0.65 };
  return { name: UNKNOWN, confidence: 0 };
}

function inferIconLibrary(lower) {
  if (/lucide|data-lucide|heroicon|icon-/.test(lower)) return { name: 'Icon library signal', confidence: 0.55 };
  return { name: UNKNOWN, confidence: 0 };
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
        // Browserless session cleanup failure should not invalidate the design spec.
      }
    }
  }
}

function validateDesignSpec(spec) {
  const errors = [];
  const required = ['url', 'visualSystem', 'typography', 'layout', 'components', 'uxPatterns', 'technologySignals', 'metadata'];
  for (const field of required) {
    if (!(field in spec)) errors.push(`Missing required field: ${field}`);
  }
  if (!Array.isArray(spec.components)) errors.push('components must be an array');
  if (spec.metadata?.url && spec.metadata.url !== spec.url) errors.push('metadata.url must match url');
  return { ok: errors.length === 0, errors };
}

/**
 * Synthesize a DesignSpec from a live URL and optional FeatureInventory.
 *
 * The deterministic path accepts injected crawler and Browserless adapters.
 * Production uses the existing multiPageCrawler and Browserless client.
 *
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function synthesizeDesign(url, options = {}) {
  const normalizedUrl = requireUrl(url);
  const timestamp = isoTimestamp(options.now);
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
  const html = (Array.isArray(crawlReport?.pages) ? crawlReport.pages : []).map(getPageHtml).join('\n');
  const featureInventory = options.featureInventory || await extractFeatures(normalizedUrl, {
    now: timestamp,
    crawlSiteImpl: async () => crawlReport,
    skipCrawl: false,
  });
  const featureValidation = validateFeatureInventory(featureInventory);
  if (!featureValidation.ok) {
    throw new Error(`Design Synthesizer received invalid FeatureInventory: ${featureValidation.errors.join('; ')}`);
  }

  const colors = extractColors(html);
  const visualSystem = bucketColors(colors);
  const spec = {
    url: normalizedUrl,
    visualSystem,
    typography: extractTypography(html),
    layout: extractLayout(html),
    components: extractComponentSpecs(featureInventory, html, visualSystem),
    uxPatterns: extractUxPatterns(html),
    technologySignals: extractTechnologySignals(html),
    metadata: {
      url: normalizedUrl,
      extractionMethod: 'multiPageCrawler+BrowserlessAdapter',
      timestamp,
      version: FRESH_BUILD_VERSION,
      confidence: html ? 0.65 : 0,
      crawl: {
        ok: Boolean(crawlReport?.ok),
        pagesActuallyCrawled: crawlReport?.pagesActuallyCrawled ?? 0,
        pagesDiscovered: crawlReport?.pagesDiscovered ?? 0,
        reasonStopped: crawlReport?.reasonStopped || UNKNOWN,
      },
      browserless,
    },
  };

  const validation = validateDesignSpec(spec);
  if (!validation.ok) {
    throw new Error(`DesignSpec failed validation: ${validation.errors.join('; ')}`);
  }
  return spec;
}

export { validateDesignSpec };
