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
  return route.startsWith('/') ? route : `/${route}`;
}

function componentNameFor(component, index) {
  return toPascalCase(`${component.type || 'component'} ${component.id || index}`, `GeneratedComponent${index + 1}`);
}

function buildComponentFile(component, index) {
  const componentName = componentNameFor(component, index);
  const content = safeText(component.content, 'Content unavailable');
  const purpose = safeText(component.purpose, 'Purpose unavailable');
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

function buildPageFile(page, index, componentImports) {
  const pageName = index === 0 ? 'HomePage' : toPascalCase(page.title || page.purpose || `Page ${index + 1}`, `Page${index + 1}`);
  const title = safeText(page.title, 'Untitled page');
  const primaryContent = safeText(page.primaryContent, 'No primary content detected.');
  const navLinks = Array.isArray(page.navigation) ? page.navigation.slice(0, 8) : [];
  const componentsMarkup = componentImports.length
    ? componentImports.map((item) => `<${item.name} />`).join('\n        ')
    : '<div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No components detected.</div>';

  return createFile(`src/pages/${pageName}.jsx`, `
${componentImports.map((item) => `import ${item.name} from '../components/${item.name}.jsx';`).join('\n')}

export default function ${pageName}() {
  const links = ${JSON.stringify(navLinks.map((link) => ({
    label: safeText(link.label, 'Link'),
    target: safeText(link.target, '#'),
  })), null, 2)};

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">${escapeJsString(page.purpose || UNKNOWN)}</p>
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

function buildAppFile(pages) {
  const pageImports = pages.map((page, index) => {
    const pageName = index === 0 ? 'HomePage' : toPascalCase(page.title || page.purpose || `Page ${index + 1}`, `Page${index + 1}`);
    return { pageName, route: routeForPage(page, index) };
  });
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
  const fontFamily = safeText(designSpec?.typography?.fontFamilies?.[0]?.family, 'Inter, system-ui, sans-serif');
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
  const description = safeText(featureInventory?.pages?.[0]?.primaryContent, 'Generated platform-free product.');
  return createFile('README.md', `
# ${safeText(productName, 'Fresh Build Output')}

${description}

Generated by FlowAI Fresh Build local Codebase Generator.

## Commands

- npm install
- npm run build
`);
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

function buildGeneratedFiles(featureInventory, designSpec, productName) {
  const pages = Array.isArray(featureInventory.pages) && featureInventory.pages.length
    ? featureInventory.pages
    : [{ url: featureInventory.url, title: productName, purpose: UNKNOWN, primaryContent: UNKNOWN, navigation: [] }];
  const components = Array.isArray(featureInventory.components) ? featureInventory.components : [];
  const componentNameById = new Map(components.map((component, index) => [component.id, componentNameFor(component, index)]));
  const componentFiles = components.map(buildComponentFile);
  const pageFiles = pages.map((page, pageIndex) => {
    const pageComponents = components
      .filter((component) => Array.isArray(component.pages) && component.pages.includes(page.url))
      .map((component) => ({ name: componentNameById.get(component.id) }));
    return buildPageFile(page, pageIndex, pageComponents);
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
    <title>${safeText(productName, 'Fresh Build Output')}</title>
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
    buildAppFile(pages),
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
  for (const file of codebase.files || []) {
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

  const files = buildGeneratedFiles(featureInventory, designSpec, productName);
  const codebase = {
    status: 'READY',
    files,
    stack: options.targetStack || DEFAULT_TARGET_STACK,
    pageCount: featureInventory.pages.length,
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
    },
  };

  const validation = validateGeneratedCodebase(codebase);
  if (!validation.ok) {
    throw new Error(`GeneratedCodebase failed safety validation: ${validation.errors.join('; ')}`);
  }
  return codebase;
}
