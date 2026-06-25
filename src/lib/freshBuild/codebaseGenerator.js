import { FRESH_BUILD_VERSION } from './constants.js';
import { UNKNOWN, validateFeatureInventory } from './types/featureInventory.js';
import { validateDesignSpec } from './designSynthesizer.js';

export const DEFAULT_TARGET_STACK = 'react-vite-tailwind-vercel';
export const MAX_GENERATOR_API_CALLS = 200;

const ALLOWED_DEPENDENCIES = Object.freeze(new Set([
  '@vitejs/plugin-react',
  'vite',
  'typescript',
  'tailwindcss',
  'postcss',
  'autoprefixer',
  'react',
  'react-dom',
  'lucide-react',
]));

const FORBIDDEN_PLATFORM_PATTERNS = [
  /@base44\/sdk/i,
  /\bbase44Client\b/i,
  /\bbase44\b/i,
  /\bwix\b/i,
  /\bwebflow\b/i,
  /\bbubble\b/i,
  /\bsquarespace\b/i,
  /\bplatform-sdk\b/i,
  /\bsdk-client\b/i,
];

const SECRET_PATTERNS = [
  /\b(?:api[_-]?key|secret|token|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /\bpassword\b\s*[:=]\s*['"][^'"]{4,}['"]/i,
  /sk-[A-Za-z0-9_-]{16,}/,
  /ghp_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
];

function isoTimestamp(now) {
  return now ? new Date(now).toISOString() : new Date().toISOString();
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toPascalCase(value, fallback = 'GeneratedComponent') {
  const clean = normalizeWhitespace(value)
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
  const result = clean
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
  const withFallback = result || fallback;
  return /^[A-Za-z]/.test(withFallback) ? withFallback : `${fallback}${withFallback}`;
}

function toKebabCase(value, fallback = 'page') {
  const clean = normalizeWhitespace(value)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return clean || fallback;
}

function escapeJsString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
}

function escapeGeneratedText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\(/g, '&#40;')
    .replace(/\)/g, '&#41;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function encodeGeneratedUrlValue(value) {
  return String(value ?? '')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/\{/g, '%7B')
    .replace(/\}/g, '%7D');
}

function safeGeneratedText(value, fallback = UNKNOWN) {
  return escapeGeneratedText(safeText(value, fallback));
}

function stripPlatformTerms(value) {
  let out = String(value ?? '');
  for (const pattern of FORBIDDEN_PLATFORM_PATTERNS) {
    out = out.replace(pattern, 'platform dependency');
  }
  return out;
}

function safeText(value, fallback = UNKNOWN) {
  const text = normalizeWhitespace(stripPlatformTerms(value));
  if (!text || text === UNKNOWN) return fallback;
  return text;
}

function normalizeHex(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function extractPalette(designSpec) {
  const primary = normalizeHex(designSpec?.visualSystem?.primaryColors?.[0]?.hex, '#2563eb');
  const accent = normalizeHex(
    designSpec?.visualSystem?.accentColors?.[0]?.hex
      || designSpec?.visualSystem?.primaryColors?.[1]?.hex,
    '#f97316',
  );
  const background = normalizeHex(designSpec?.visualSystem?.backgroundColors?.[0]?.hex, '#f8fafc');
  const foreground = normalizeHex(designSpec?.visualSystem?.textColors?.[0]?.hex, '#111827');
  return { primary, accent, background, foreground };
}

function createFile(path, content) {
  return { path, content: `${String(content).trim()}\n` };
}

function validatePath(path) {
  return typeof path === 'string'
    && path.length > 0
    && !path.startsWith('/')
    && !path.includes('..')
    && /^[A-Za-z0-9_./-]+$/.test(path);
}

function collectForbiddenPlatformMatches(content) {
  return FORBIDDEN_PLATFORM_PATTERNS
    .filter((pattern) => pattern.test(content))
    .map((pattern) => pattern.source);
}

function collectSecretMatches(content) {
  return SECRET_PATTERNS
    .filter((pattern) => pattern.test(content))
    .map((pattern) => pattern.source);
}

function validatePackageDependencies(file) {
  if (!file || file.path !== 'package.json') return [];
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(file.content);
  } catch {
    return ['package.json must be valid JSON'];
  }
  const dependencyNames = [
    ...Object.keys(parsed.dependencies || {}),
    ...Object.keys(parsed.devDependencies || {}),
  ];
  for (const dependencyName of dependencyNames) {
    if (!ALLOWED_DEPENDENCIES.has(dependencyName)) {
      errors.push(`Dependency is not allowlisted: ${dependencyName}`);
    }
  }
  return errors;
}

function validateSyntax(file) {
  const errors = [];
  const content = file.content || '';
  const pairs = [
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ];
  for (const [open, close] of pairs) {
    const openCount = (content.match(new RegExp(`\\${open}`, 'g')) || []).length;
    const closeCount = (content.match(new RegExp(`\\${close}`, 'g')) || []).length;
    if (openCount !== closeCount) {
      errors.push(`${file.path} has unbalanced ${open}${close}`);
    }
  }
  if (/\b(import|export)\b/.test(content) && !/\.(jsx?|mjs|cjs|ts|tsx)$|^tailwind\.config\.js$|^postcss\.config\.js$/.test(file.path)) {
    errors.push(`${file.path} contains module syntax but is not a JS/TS file`);
  }
  return errors;
}

function parseValidationError(error) {
  const text = String(error || '');
  const match = text.match(/^(.+?) has (.+)$/);
  return {
    filePath: match?.[1] || null,
    reason: match?.[2] || text,
  };
}

function summarizeValidationErrors(errors) {
  const first = parseValidationError(errors?.[0] || 'GeneratedCodebase failed safety validation');
  return {
    stage: 'codebase_generator',
    code: 'GENERATED_CODEBASE_INVALID',
    invalidFilePath: first.filePath,
    validationReason: first.reason,
    validationErrors: (errors || []).slice(0, 10),
  };
}

function validateGeneratedFile(file) {
  const errors = [];
  if (!validatePath(file.path)) errors.push(`Invalid generated file path: ${file.path}`);
  if (typeof file.content !== 'string' || file.content.trim().length === 0) {
    errors.push(`Generated file content is empty: ${file.path}`);
  }
  const platformMatches = collectForbiddenPlatformMatches(file.content);
  if (platformMatches.length) errors.push(`Platform dependency reference found in ${file.path}`);
  const secretMatches = collectSecretMatches(file.content);
  if (secretMatches.length) errors.push(`Secret-like value found in ${file.path}`);
  errors.push(...validatePackageDependencies(file));
  errors.push(...validateSyntax(file));
  return errors;
}

function routeForPage(page, index) {
  if (index === 0) return '/';
  let pathname = '';
  try {
    pathname = new URL(page.url).pathname;
  } catch {
    pathname = `/${toKebabCase(page.title || page.purpose || `page-${index}`)}`;
  }
  const route = pathname && pathname !== '/' ? pathname : `/${toKebabCase(page.title || page.purpose || `page-${index}`)}`;
  const safeRoute = encodeGeneratedUrlValue(route);
  return safeRoute.startsWith('/') ? safeRoute : `/${safeRoute}`;
}

function pageNameFor(page, index) {
  return index === 0 ? 'HomePage' : toPascalCase(page.title || page.purpose || `Page ${index + 1}`, `Page${index + 1}`);
}

function uniqueName(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  let suffix = 2;
  let nextName = `${baseName}${suffix}`;
  while (usedNames.has(nextName)) {
    suffix += 1;
    nextName = `${baseName}${suffix}`;
  }
  usedNames.add(nextName);
  return nextName;
}

function normalizeRouteKey(route) {
  return String(route || '/').replace(/\/+$/g, '') || '/';
}

function createPageDescriptors(pages) {
  const descriptors = [];
  const descriptorsByRoute = new Map();
  const usedNames = new Set();

  for (const [index, page] of pages.entries()) {
    const route = routeForPage(page, index);
    const routeKey = normalizeRouteKey(route);
    const existing = descriptorsByRoute.get(routeKey);
    if (existing) {
      if (page?.url) existing.sourceUrls.push(page.url);
      continue;
    }

    const pageName = uniqueName(pageNameFor(page, index), usedNames);
    const descriptor = {
      page,
      pageName,
      route,
      sourceUrls: page?.url ? [page.url] : [],
    };
    descriptors.push(descriptor);
    descriptorsByRoute.set(routeKey, descriptor);
  }

  return descriptors.length ? descriptors : [{
    page: pages[0],
    pageName: 'HomePage',
    route: '/',
    sourceUrls: pages[0]?.url ? [pages[0].url] : [],
  }];
}

function componentNameFor(component, index) {
  return toPascalCase(`${component.type || 'component'} ${component.id || index}`, `GeneratedComponent${index + 1}`);
}

function buildComponentFile(component, index) {
  const componentName = componentNameFor(component, index);
  const content = safeGeneratedText(component.content, 'Content unavailable');
  const purpose = safeGeneratedText(component.purpose, 'Purpose unavailable');
  const interactive = component.interactive === true;
  const body = interactive
    ? `<button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">${escapeJsString(content)}</button>`
    : `<div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900">${escapeJsString(content)}</div>`;

  return createFile(`src/components/${componentName}.jsx`, `
export default function ${componentName}() {
  return (
    <section className="space-y-2" aria-label="${escapeJsString(purpose)}">
      ${body}
    </section>
  );
}
`);
}

function buildPageFile(descriptor, componentImports) {
  const { page, pageName } = descriptor;
  const title = safeGeneratedText(page.title, 'Untitled page');
  const purpose = safeGeneratedText(page.purpose || UNKNOWN);
  const primaryContent = safeGeneratedText(page.primaryContent, 'No primary content detected.');
  const navLinks = Array.isArray(page.navigation) ? page.navigation.slice(0, 8) : [];
  const componentsMarkup = componentImports.length
    ? componentImports.map((item) => `<${item.name} />`).join('\n        ')
    : '<div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No components detected.</div>';

  return createFile(`src/pages/${pageName}.jsx`, `
${componentImports.map((item) => `import ${item.name} from '../components/${item.name}.jsx';`).join('\n')}

export default function ${pageName}() {
  const links = ${JSON.stringify(navLinks.map((link) => ({
    label: safeGeneratedText(link.label, 'Link'),
    target: encodeGeneratedUrlValue(safeText(link.target, '#')),
  })), null, 2)};

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">${escapeJsString(purpose)}</p>
        <h1 className="text-4xl font-bold text-slate-950">${escapeJsString(title)}</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-700">${escapeJsString(primaryContent)}</p>
      </header>
      {links.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Page navigation">
          {links.map((link) => (
            <a key={link.target} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" href={link.target}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
      <section className="mt-8 grid gap-4">
        ${componentsMarkup}
      </section>
    </main>
  );
}
`);
}

function buildAppFile(pageDescriptors) {
  const pageImports = pageDescriptors.map(({ pageName, route }) => ({ pageName, route }));
  return createFile('src/App.jsx', `
${pageImports.map((item) => `import ${item.pageName} from './pages/${item.pageName}.jsx';`).join('\n')}

const routes = ${JSON.stringify(pageImports, null, 2)};

export default function App() {
  const currentPath = window.location.pathname;
  const route = routes.find((item) => item.route === currentPath) || routes[0];
  const Page = {
    ${pageImports.map((item) => `${item.pageName}: ${item.pageName}`).join(',\n    ')}
  }[route.pageName];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-4">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-3" aria-label="Site navigation">
          {routes.map((item) => (
            <a key={item.route} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href={item.route}>
              {item.route === '/' ? 'Home' : item.route.replace(/^\\//, '')}
            </a>
          ))}
        </nav>
      </header>
      <Page />
    </div>
  );
}
`);
}

function buildTailwindConfig(designSpec) {
  const palette = extractPalette(designSpec);
  return createFile('tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${palette.primary}',
        accent: '${palette.accent}',
        background: '${palette.background}',
        foreground: '${palette.foreground}',
      },
    },
  },
  plugins: [],
};
`);
}

function buildGlobalCss(designSpec) {
  const palette = extractPalette(designSpec);
  const fontFamily = safeText(designSpec?.typography?.fontFamilies?.[0]?.family, 'Inter, system-ui, sans-serif')
    .replace(/[()[\]{}]/g, '');
  return createFile('src/index.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: ${fontFamily};
  color: ${palette.foreground};
  background: ${palette.background};
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
`);
}

function buildPackageJson(productName) {
  return createFile('package.json', JSON.stringify({
    name: toKebabCase(productName, 'fresh-build-output'),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      vite: '^6.1.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'lucide-react': '^0.475.0',
    },
    devDependencies: {
      tailwindcss: '^3.4.17',
      postcss: '^8.5.3',
      autoprefixer: '^10.4.20',
    },
  }, null, 2));
}

function buildViteConfig() {
  return createFile('vite.config.js', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`);
}

function buildGitignore() {
  return createFile('.gitignore', `
node_modules
dist
dist-ssr
*.local
.env
.env.*
.vite
.vercel
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
`);
}

function buildReadme(productName, featureInventory) {
  const description = safeGeneratedText(featureInventory?.pages?.[0]?.primaryContent, 'Generated platform-free product.');
  return createFile('README.md', `
# ${safeGeneratedText(productName, 'Fresh Build Output')}

${description}

Generated by FlowAI Fresh Build local Codebase Generator.

## Commands

- npm install
- npm run build
`);
}

function descriptionSourceText(featureInventory) {
  const parts = [
    featureInventory?.pages?.[0]?.primaryContent,
    featureInventory?.components?.map((component) => component?.content).join(' '),
    featureInventory?.metadata?.source,
  ];
  return normalizeWhitespace(parts.filter(Boolean).join(' '));
}

function isDescriptionOnlyInventory(featureInventory) {
  return String(featureInventory?.metadata?.source || '').toLowerCase() === 'description_build_brief'
    || String(featureInventory?.url || '').startsWith('flowai-description://');
}

function requiresBackendPersistence(featureInventory) {
  if (!isDescriptionOnlyInventory(featureInventory)) return false;
  const text = descriptionSourceText(featureInventory).toLowerCase();
  return /\b(persist|persistence|database|server-side|server side|cold reload|fresh session|retrieve|saved requests?|store records?)\b/.test(text);
}

function shouldBuildGuidedRecommendationApp(featureInventory, productName) {
  if (!isDescriptionOnlyInventory(featureInventory)) return false;
  const text = `${descriptionSourceText(featureInventory)} ${productName || ''}`.toLowerCase();
  return /\b(resource|navigator|assistance|aid|service|community|referral|recommendation|next step)\b/.test(text);
}

function createPersistenceUnsupportedResult({ featureInventory, designSpec, productName, now }) {
  return {
    status: 'BLOCKED',
    reason: 'PERSISTENCE_PROVISIONING_UNSUPPORTED',
    failureStage: 'codebase_generator',
    failure: {
      stage: 'codebase_generator',
      code: 'PERSISTENCE_PROVISIONING_UNSUPPORTED',
      message: 'SSOT Fresh Build codebaseGenerator is limited to the allowlisted frontend Vite stack and cannot provision backend persistence for a description-only Creator request.',
      invalidFilePath: null,
      validationReason: 'backend persistence substrate unavailable',
      deploymentId: null,
      readyState: null,
      attempts: null,
    },
    files: [],
    stack: DEFAULT_TARGET_STACK,
    pageCount: 0,
    componentCount: 0,
    flowCount: 0,
    platformDependencies: [],
    generatedAt: isoTimestamp(now),
    sourceInventoryId: featureInventory?.id || featureInventory?.metadata?.id || featureInventory?.url || UNKNOWN,
    sourceDesignId: designSpec?.id || designSpec?.metadata?.id || designSpec?.url || UNKNOWN,
    productName: safeText(productName, 'Fresh Build Output'),
    metadata: {
      blocked: true,
      version: FRESH_BUILD_VERSION,
      creatorType: 'description-only',
      persistence: {
        requested: true,
        supported: false,
        reason: 'codebaseGenerator has no backend persistence substrate',
      },
    },
  };
}

function buildGuidedRecommendationAppFile(productName, featureInventory) {
  const title = safeText(productName, 'Community Resource Navigator');
  const brief = safeText(
    featureInventory?.pages?.[0]?.primaryContent,
    'Describe a need, choose a category, and receive a practical next step.',
  );
  return createFile('src/App.jsx', `
import { useMemo, useState } from 'react';

const recommendationSets = {
  housing: {
    label: 'Housing',
    keywords: ['rent', 'housing', 'shelter', 'eviction', 'landlord'],
    nextStep: 'Call 211 and ask for emergency rental assistance, then collect your lease, notice, and proof of income before the appointment.',
    followUp: 'If you mention eviction or a shutoff notice, ask for same-day legal aid screening.'
  },
  food: {
    label: 'Food',
    keywords: ['food', 'meal', 'groceries', 'pantry', 'hungry'],
    nextStep: 'Visit the nearest food pantry intake desk this week and bring an ID plus proof of household size if available.',
    followUp: 'If transportation is difficult, ask the pantry about delivery partners or a mobile distribution route.'
  },
  health: {
    label: 'Health',
    keywords: ['health', 'clinic', 'medicine', 'doctor', 'pregnancy'],
    nextStep: 'Contact a community health center and request a sliding-scale appointment or benefits navigator intake.',
    followUp: 'If medication is urgent, ask about same-day pharmacy assistance or sample programs.'
  },
  work: {
    label: 'Work',
    keywords: ['job', 'work', 'resume', 'training', 'income'],
    nextStep: 'Book a workforce center intake and ask for resume review, transportation support, and training eligibility in the same visit.',
    followUp: 'If you need immediate income, ask for rapid placement employers and short-term credential programs.'
  }
};

const categories = Object.entries(recommendationSets).map(([value, item]) => ({
  value,
  label: item.label
}));

function pickRecommendation(need, category) {
  const normalized = need.toLowerCase();
  const selected = recommendationSets[category] || recommendationSets.housing;
  const keywordMatch = Object.values(recommendationSets).find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  );
  const result = keywordMatch || selected;
  return {
    label: result.label,
    nextStep: result.nextStep,
    followUp: result.followUp,
    summary: normalized.trim()
      ? 'Matched from your need and category.'
      : 'Choose a category and add a short need to sharpen this recommendation.'
  };
}

export default function App() {
  const [need, setNeed] = useState('');
  const [category, setCategory] = useState('housing');
  const [submitted, setSubmitted] = useState(false);
  const recommendation = useMemo(() => pickRecommendation(need, category), [need, category]);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">FlowAI Creator Type 2</p>
          <h1 className="text-4xl font-bold text-slate-950">${escapeJsString(title)}</h1>
          <p className="text-base leading-7 text-slate-700">${escapeJsString(brief)}</p>
          <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
            FlowAI M4 Creator Type 2 verified description-only static path
          </p>
        </div>

        <form
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Describe your need</span>
            <textarea
              className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder="Example: I need help with rent before an eviction notice deadline."
              aria-label="Describe your need"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Resource category</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Resource category"
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <button
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
            type="submit"
          >
            Recommend next step
          </button>
        </form>

        <section className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite">
          <p className="text-sm font-semibold text-accent">{submitted ? recommendation.summary : 'Ready for a need and category.'}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{submitted ? recommendation.label : 'Recommended next step'}</h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {submitted ? recommendation.nextStep : 'Submit the form to generate a targeted recommendation.'}
          </p>
          {submitted && (
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{recommendation.followUp}</p>
          )}
        </section>
      </section>
    </main>
  );
}
`);
}

function buildPersistentResourceNavigatorApiFile(productName) {
  const projectId = toKebabCase(productName, 'generated-product');
  return createFile('api/resource-requests.js', `
const TABLE = 'generated_product_records';
const PROJECT_ID = process.env.FLOWAI_GENERATED_PRODUCT_ID || '${projectId}';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function cleanText(value, max = 800) {
  return String(value || '').replace(/\\s+/g, ' ').trim().slice(0, max);
}

function backendConfig() {
  const url = cleanText(process.env.FLOWAI_GENERATED_SUPABASE_URL || process.env.SUPABASE_URL, 300).replace(/\\/$/, '');
  const serviceKey = cleanText(process.env.FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, 2000);
  return { url, serviceKey };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

async function supabaseFetch(path, init = {}) {
  const config = backendConfig();
  if (!config.url || !config.serviceKey) {
    const error = new Error('Generated product persistence is not configured.');
    error.code = 'PERSISTENCE_NOT_CONFIGURED';
    throw error;
  }
  const response = await fetch(\`\${config.url}/rest/v1/\${path}\`, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: \`Bearer \${config.serviceKey}\`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.raw || \`Supabase request failed with \${response.status}\`);
    error.code = 'PERSISTENCE_UPSTREAM_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

function recommendationFor(need, category) {
  const normalized = cleanText(need, 1200).toLowerCase();
  const selected = cleanText(category, 80) || 'housing';
  if (normalized.includes('food') || normalized.includes('meal') || selected === 'food') {
    return {
      label: 'Food',
      nextStep: 'Visit the nearest food pantry intake desk this week and bring an ID plus proof of household size if available.',
      followUp: 'Ask about mobile pantry routes if transportation is difficult.',
    };
  }
  if (normalized.includes('clinic') || normalized.includes('medicine') || normalized.includes('health') || selected === 'health') {
    return {
      label: 'Health',
      nextStep: 'Contact a community health center and request a sliding-scale appointment or benefits navigator intake.',
      followUp: 'Ask about same-day pharmacy assistance if medication is urgent.',
    };
  }
  if (normalized.includes('job') || normalized.includes('work') || selected === 'work') {
    return {
      label: 'Work',
      nextStep: 'Book a workforce center intake and ask for resume review, transportation support, and training eligibility in the same visit.',
      followUp: 'Ask for rapid placement employers if income is urgent.',
    };
  }
  return {
    label: 'Housing',
    nextStep: 'Call 211 and ask for emergency rental assistance, then collect your lease, notice, and proof of income before the appointment.',
    followUp: 'Ask for same-day legal aid screening if eviction is mentioned.',
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  try {
    if (req.method === 'GET') {
      const rows = await supabaseFetch(\`\${TABLE}?project_id=eq.\${encodeURIComponent(PROJECT_ID)}&record_type=eq.resource_request&select=id,payload,created_at&order=created_at.desc&limit=20\`, {
        method: 'GET',
      });
      return json(res, 200, { ok: true, projectId: PROJECT_ID, records: Array.isArray(rows) ? rows : [] });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
    const body = await readBody(req);
    const need = cleanText(body.need, 1200);
    const category = cleanText(body.category, 80);
    if (!need) return json(res, 400, { ok: false, error: 'need_required' });
    const recommendation = recommendationFor(need, category);
    const payload = {
      need,
      category,
      recommendation,
      proofMarker: 'FlowAI M4 Creator Type 2 persistence-backed',
    };
    const inserted = await supabaseFetch(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        project_id: PROJECT_ID,
        record_type: 'resource_request',
        payload,
        source: 'flowai-generated-product',
      }]),
    });
    return json(res, 200, { ok: true, projectId: PROJECT_ID, record: Array.isArray(inserted) ? inserted[0] : inserted });
  } catch (error) {
    return json(res, error?.code === 'PERSISTENCE_NOT_CONFIGURED' ? 503 : 502, {
      ok: false,
      error: error?.code || 'PERSISTENCE_FAILED',
      message: String(error?.message || error).slice(0, 300),
    });
  }
}
`);
}

function buildPersistentResourceNavigatorAppFile(productName, featureInventory) {
  const title = safeText(productName, 'Community Resource Navigator');
  const brief = safeText(
    featureInventory?.pages?.[0]?.primaryContent,
    'Describe a need, choose a category, save it, and retrieve persisted recommendations.',
  );
  return createFile('src/App.jsx', `
import { useEffect, useMemo, useState } from 'react';

const categories = [
  { value: 'housing', label: 'Housing' },
  { value: 'food', label: 'Food' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' }
];

function fallbackRecommendation(need, category) {
  const normalized = need.toLowerCase();
  if (normalized.includes('food') || category === 'food') {
    return 'Visit the nearest food pantry intake desk this week and ask about mobile distribution routes.';
  }
  if (normalized.includes('health') || normalized.includes('clinic') || category === 'health') {
    return 'Contact a community health center and request a sliding-scale appointment plus benefits navigator intake.';
  }
  if (normalized.includes('job') || normalized.includes('work') || category === 'work') {
    return 'Book a workforce center intake for resume review, transport support, and training eligibility.';
  }
  return 'Call 211 for emergency rental assistance and collect your lease, notice, and proof of income.';
}

export default function App() {
  const [need, setNeed] = useState('');
  const [category, setCategory] = useState('housing');
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => fallbackRecommendation(need, category), [need, category]);

  async function loadRecords() {
    const response = await fetch('/api/resource-requests', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || data.error || 'Unable to load saved requests');
    setRecords(data.records || []);
    return data.records || [];
  }

  useEffect(() => {
    loadRecords()
      .then((items) => setStatus(items.length ? 'Saved requests loaded from backend.' : 'No saved requests yet.'))
      .catch((error) => setStatus(error.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('Saving to backend...');
    try {
      const response = await fetch('/api/resource-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ need, category })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Save failed');
      const fresh = await loadRecords();
      setStatus(\`Saved and retrieved from backend. \${fresh.length} request\${fresh.length === 1 ? '' : 's'} available.\`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">FlowAI Creator Type 2</p>
          <h1 className="text-4xl font-bold text-slate-950">${escapeJsString(title)}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">${escapeJsString(brief)}</p>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            FlowAI M4 Creator Type 2 verified persistence-backed path
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Backend status</p>
            <p className="mt-2 text-sm text-slate-700">{status}</p>
          </div>
        </div>

        <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Describe your need</span>
            <textarea
              className="min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder="Example: I need help with rent before an eviction notice deadline."
              aria-label="Describe your need"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Resource category</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Resource category"
            >
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Preview: </span>{preview}
          </div>
          <button
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={saving || !need.trim()}
          >
            {saving ? 'Saving...' : 'Save and recommend'}
          </button>
        </form>

        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Saved requests</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Backend-retrieved recommendations</h2>
            </div>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={() => loadRecords()}>
              Reload
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {records.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">No saved requests have been retrieved yet.</p>
            ) : records.map((record) => {
              const payload = record.payload || {};
              const recommendation = payload.recommendation || {};
              return (
                <article className="rounded-md border border-slate-200 p-4" key={record.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{recommendation.label || payload.category || 'Resource'}</p>
                  <p className="mt-2 text-sm text-slate-700">{payload.need}</p>
                  <p className="mt-3 font-medium text-slate-950">{recommendation.nextStep || 'Recommendation pending'}</p>
                  {recommendation.followUp && <p className="mt-2 text-sm text-slate-600">{recommendation.followUp}</p>}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
`);
}

function buildGuidedRecommendationAppFiles(featureInventory, designSpec, productName, options = {}) {
  const persistence = options.persistence === true;
  return [
    buildPackageJson(productName),
    buildViteConfig(),
    buildGitignore(),
    createFile('index.html', `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeGeneratedText(productName, 'Fresh Build Output')}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`),
    createFile('src/main.jsx', `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`),
    persistence
      ? buildPersistentResourceNavigatorAppFile(productName, featureInventory)
      : buildGuidedRecommendationAppFile(productName, featureInventory),
    ...(persistence ? [buildPersistentResourceNavigatorApiFile(productName)] : []),
    buildGlobalCss(designSpec),
    buildTailwindConfig(designSpec),
    createFile('postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`),
    createFile('vercel.json', JSON.stringify({
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      framework: 'vite',
      rewrites: [{ source: '/(.*)', destination: '/' }],
    }, null, 2)),
    buildReadme(productName, featureInventory),
  ];
}

function validateInputs(featureInventory, designSpec) {
  const inventoryValidation = validateFeatureInventory(featureInventory);
  if (!inventoryValidation.ok) {
    throw new Error(`Codebase Generator received invalid FeatureInventory: ${inventoryValidation.errors.join('; ')}`);
  }
  const designValidation = validateDesignSpec(designSpec);
  if (!designValidation.ok) {
    throw new Error(`Codebase Generator received invalid DesignSpec: ${designValidation.errors.join('; ')}`);
  }
}

function normalizeApiCallCount(options) {
  const apiCallsUsed = Number.isFinite(options.apiCallsUsed) ? options.apiCallsUsed : 0;
  const apiCallCap = Number.isFinite(options.apiCallCap) ? options.apiCallCap : MAX_GENERATOR_API_CALLS;
  if (apiCallsUsed > apiCallCap) {
    return { blocked: true, apiCallsUsed, apiCallCap };
  }
  return { blocked: false, apiCallsUsed, apiCallCap };
}

function createBlockedResult({ featureInventory, designSpec, productName, apiCallsUsed, apiCallCap, now }) {
  return {
    status: 'BLOCKED',
    reason: 'API_CALL_CAP_EXCEEDED',
    files: [],
    stack: DEFAULT_TARGET_STACK,
    pageCount: 0,
    componentCount: 0,
    flowCount: 0,
    platformDependencies: [],
    generatedAt: isoTimestamp(now),
    sourceInventoryId: featureInventory?.id || featureInventory?.metadata?.id || featureInventory?.url || UNKNOWN,
    sourceDesignId: designSpec?.id || designSpec?.metadata?.id || designSpec?.url || UNKNOWN,
    productName: safeText(productName, 'Fresh Build Output'),
    metadata: {
      apiCallsUsed,
      apiCallCap,
      blocked: true,
      version: FRESH_BUILD_VERSION,
    },
  };
}

function createValidationBlockedResult({ featureInventory, designSpec, productName, errors, now }) {
  const validation = summarizeValidationErrors(errors);
  return {
    status: 'BLOCKED',
    reason: validation.code,
    failureStage: validation.stage,
    failure: {
      stage: validation.stage,
      code: validation.code,
      message: `GeneratedCodebase failed safety validation: ${errors.join('; ')}`.slice(0, 400),
      invalidFilePath: validation.invalidFilePath,
      validationReason: validation.validationReason,
      deploymentId: null,
      readyState: null,
      attempts: null,
    },
    files: [],
    stack: DEFAULT_TARGET_STACK,
    pageCount: 0,
    componentCount: 0,
    flowCount: 0,
    platformDependencies: [],
    generatedAt: isoTimestamp(now),
    sourceInventoryId: featureInventory?.id || featureInventory?.metadata?.id || featureInventory?.url || UNKNOWN,
    sourceDesignId: designSpec?.id || designSpec?.metadata?.id || designSpec?.url || UNKNOWN,
    productName: safeText(productName, 'Fresh Build Output'),
    metadata: {
      blocked: true,
      version: FRESH_BUILD_VERSION,
      validation,
    },
  };
}

function buildGeneratedFiles(featureInventory, designSpec, productName) {
  const pages = Array.isArray(featureInventory.pages) && featureInventory.pages.length
    ? featureInventory.pages
    : [{ url: featureInventory.url, title: productName, purpose: UNKNOWN, primaryContent: UNKNOWN, navigation: [] }];
  const pageDescriptors = createPageDescriptors(pages);
  const components = Array.isArray(featureInventory.components) ? featureInventory.components : [];
  const componentNameById = new Map(components.map((component, index) => [component.id, componentNameFor(component, index)]));
  const componentFiles = components.map(buildComponentFile);
  const pageFiles = pageDescriptors.map((descriptor) => {
    const pageComponents = components
      .filter((component) => Array.isArray(component.pages) && component.pages.some((pageUrl) => descriptor.sourceUrls.includes(pageUrl)))
      .map((component) => ({ name: componentNameById.get(component.id) }));
    return buildPageFile(descriptor, pageComponents);
  });

  return [
    buildPackageJson(productName),
    buildViteConfig(),
    buildGitignore(),
    createFile('index.html', `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeGeneratedText(productName, 'Fresh Build Output')}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`),
    createFile('src/main.jsx', `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`),
    buildAppFile(pageDescriptors),
    buildGlobalCss(designSpec),
    buildTailwindConfig(designSpec),
    createFile('postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`),
    createFile('vercel.json', JSON.stringify({
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      framework: 'vite',
      rewrites: [{ source: '/(.*)', destination: '/' }],
    }, null, 2)),
    buildReadme(productName, featureInventory),
    ...componentFiles,
    ...pageFiles,
  ];
}

export function validateGeneratedCodebase(codebase) {
  const errors = [];
  if (!codebase || typeof codebase !== 'object') return { ok: false, errors: ['GeneratedCodebase must be an object'] };
  if (!Array.isArray(codebase.files)) errors.push('files must be an array');
  if (!Array.isArray(codebase.platformDependencies)) errors.push('platformDependencies must be an array');
  if (Array.isArray(codebase.platformDependencies) && codebase.platformDependencies.length !== 0) {
    errors.push('platformDependencies must be empty');
  }
  const seenPaths = new Set();
  for (const file of codebase.files || []) {
    if (seenPaths.has(file?.path)) errors.push(`Duplicate generated file path: ${file.path}`);
    seenPaths.add(file?.path);
    errors.push(...validateGeneratedFile(file));
  }
  return { ok: errors.length === 0, errors };
}

export function generateCodebase(featureInventory, designSpec, options = {}) {
  validateInputs(featureInventory, designSpec);
  const productName = safeText(options.productName || featureInventory?.metadata?.productName || 'Fresh Build Output');
  const apiCallState = normalizeApiCallCount(options);
  if (apiCallState.blocked) {
    return createBlockedResult({
      featureInventory,
      designSpec,
      productName,
      apiCallsUsed: apiCallState.apiCallsUsed,
      apiCallCap: apiCallState.apiCallCap,
      now: options.now,
    });
  }

  const persistenceRequested = requiresBackendPersistence(featureInventory);
  const shouldBuildWorkflowApp = shouldBuildGuidedRecommendationApp(featureInventory, productName)
    || (isDescriptionOnlyInventory(featureInventory) && persistenceRequested);
  const files = shouldBuildWorkflowApp
    ? buildGuidedRecommendationAppFiles(featureInventory, designSpec, productName, {
      persistence: persistenceRequested,
    })
    : buildGeneratedFiles(featureInventory, designSpec, productName);
  const generatedPageCount = Math.max(
    1,
    files.filter((file) => String(file?.path || '').startsWith('src/pages/')).length,
  );
  const codebase = {
    status: 'READY',
    files,
    stack: options.targetStack || DEFAULT_TARGET_STACK,
    pageCount: generatedPageCount,
    componentCount: featureInventory.components.length,
    flowCount: featureInventory.userFlows.length,
    platformDependencies: [],
    generatedAt: isoTimestamp(options.now),
    sourceInventoryId: featureInventory.id || featureInventory.metadata?.id || featureInventory.url || UNKNOWN,
    sourceDesignId: designSpec.id || designSpec.metadata?.id || designSpec.url || UNKNOWN,
    metadata: {
      apiCallsUsed: apiCallState.apiCallsUsed,
      apiCallCap: apiCallState.apiCallCap,
      safetyGates: {
        zeroPlatformSdkImports: true,
        dependencyAllowlist: true,
        secretScan: true,
        syntacticValidation: true,
        platformDependenciesEmpty: true,
      },
      version: FRESH_BUILD_VERSION,
      creatorType: isDescriptionOnlyInventory(featureInventory) ? 'description-only' : null,
      persistence: isDescriptionOnlyInventory(featureInventory)
        ? {
          requested: persistenceRequested,
          supported: persistenceRequested,
          substrate: persistenceRequested ? 'vercel-serverless-supabase' : 'static frontend codebase only',
        }
        : null,
    },
  };

  const validation = validateGeneratedCodebase(codebase);
  if (!validation.ok) {
    return createValidationBlockedResult({
      featureInventory,
      designSpec,
      productName,
      errors: validation.errors,
      now: options.now,
    });
  }
  return codebase;
}

export const __test = Object.freeze({
  encodeGeneratedUrlValue,
  escapeGeneratedText,
  parseValidationError,
  safeGeneratedText,
  summarizeValidationErrors,
});
