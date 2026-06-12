/**
 * Monitor-text producer — the KEYSTONE for real scoring.
 *
 * Server-side equivalent of AutoRunner Step 8 (Monitor). Takes a URL,
 * fetches its content, calls Claude to produce a Five-Layer assessment
 * in the exact format that operationsEngine.computeMonitorClearance
 * expects (text containing `[L1] ... X/10` ... `[L5] ... X/10`).
 *
 * Without this module, `preScoreAdapter.computeScore` returns a zero-
 * score envelope (error: 'monitor_text_required') because it has no
 * Monitor text to parse. With this module wired in, the orchestrator's
 * pre/post scores become REAL numbers that move with real fixes.
 *
 * Phase A scope: simple fetch() of public URLs. No Browserless, no auth
 * traversal, no chatbot/modal probing. That's Phase B+ work — Phase A
 * is "make the scoring loop terminate honestly."
 *
 * DISPATCH 6 — GitHub source enrichment.
 *   When githubRepoUrl + token are supplied, the producer ALSO reads a
 *   curated subset of the product's GitHub source code (README, package
 *   manifest, top src/pages + src/components files) and threads it into
 *   the Claude prompt alongside the live-URL content. This gives Claude
 *   real code signal across all five layers — Layer 2 (operational
 *   posture from package.json scripts / deps), Layer 3 (monetization
 *   surfaces in source), Layer 4 (component count = feature surface),
 *   Layer 5 (page count = GTM surface). Without enrichment, scores are
 *   dominated by what's visible on the landing page (often a glossy
 *   marketing shell), so the model under-scores. With enrichment, the
 *   model evaluates against the actual product.
 *
 *   The enrichment path is opt-in: omit githubRepoUrl OR token and the
 *   producer falls back to URL-only scoring (returns the same envelope
 *   shape minus the enrichment metadata).
 *
 * Anthropic/OpenAI API keys never logged. GitHub App installation token
 * never logged, never persisted, never appears in error messages.
 */

'use strict';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const OPENAI_API_BASE = 'https://api.openai.com';
const FINAL_FALLBACK_MODEL = 'claude-sonnet-4-6';
const OPENAI_MONITOR_FALLBACK_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_PAGE_TEXT_CHARS = 50_000;

// GitHub enrichment caps. Bounded so the producer can't OOM on a giant
// monorepo or blow the Anthropic prompt budget.
const GITHUB_API_BASE = 'https://api.github.com';
const MAX_GITHUB_FILES = 10;          // README + package.json + up to 8 source files
const MAX_FILE_CONTENT_CHARS = 8_000; // per-file char cap in the prompt
const MAX_SOURCE_DIR_LISTING = 50;    // cap on src/pages and src/components listings

const FIVE_LAYER_FRAMEWORK = `
━━━ FIVE-LAYER INTELLIGENCE REQUIREMENT ━━━
Every finding section MUST cover all five intelligence layers:

LAYER 1 — FUNCTIONALITY: Does it work? What breaks? What interactions fail? What is missing?
LAYER 2 — OPERATIONAL: Infrastructure risks, reliability signals, monitoring presence, uptime indicators.
LAYER 3 — FINANCIAL: Monetization model, pricing clarity, payment processing, revenue potential, unit economics signals.
LAYER 4 — BUSINESS: Competitive positioning, top 3 competitors, defensible moat, key business risks, partnerships/integrations.
LAYER 5 — GTM: Ideal customer profile, sales motion (self-serve/inside sales/enterprise), CAC signals, active/missing channels, demo readiness score for this step.

Label each insight with [L1], [L2], [L3], [L4], or [L5] so findings are clearly layered.
━━━ END FIVE-LAYER REQUIREMENT ━━━
`;

// Belt-and-suspenders: scrub anything that looks like a credential
// before it goes into a Claude prompt. Source files in src/pages and
// src/components shouldn't carry secrets (those live in .env, which
// is gitignored), but a stray hardcoded key in dev code shouldn't
// leak through to the LLM either.
const CREDENTIAL_REDACT_PATTERNS = [
  /sk-[A-Za-z0-9-_]{20,}/g,                // OpenAI / Anthropic-style
  /AKIA[0-9A-Z]{16}/g,                     // AWS access key
  /ghp_[A-Za-z0-9]{36,}/g,                 // GitHub PAT
  /github_pat_[A-Za-z0-9_]{82,}/g,         // GitHub fine-grained PAT
  /ghs_[A-Za-z0-9]{36,}/g,                 // GitHub server-to-server
  /Bearer\s+[A-Za-z0-9_.-]{20,}/gi,        // generic bearer
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
];

function scrubCredentials(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const re of CREDENTIAL_REDACT_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) {
    if (k !== 'apiKey' && k !== 'api_key' && k !== 'authorization' && k !== 'x-api-key' && k !== 'token') {
      err[k] = v;
    }
  }
  return err;
}

/**
 * Strip HTML tags + collapse whitespace from raw HTML, returning the
 * visible text. Conservative; preserves structure markers (newlines
 * for headings, list items).
 *
 * @param {string} html
 * @returns {string}
 */
export function extractVisibleText(html) {
  if (typeof html !== 'string') return '';
  let text = html;
  // Drop <script>, <style>, <noscript> blocks entirely.
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  // Drop HTML comments.
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  // Preserve newlines for headings + list items + block elements.
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining tags.
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities.
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // Collapse runs of whitespace.
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n+/g, '\n\n');
  return text.trim();
}

/**
 * Extract <title> from HTML, returning '' if absent or unparseable.
 *
 * @param {string} html
 * @returns {string}
 */
export function extractPageTitle(html) {
  if (typeof html !== 'string') return '';
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().slice(0, 200) : '';
}

/**
 * Fetch a URL's content. Returns { html, status, contentType }.
 * Throws MONITOR_FETCH_FAILED on network error or non-2xx status.
 *
 * @param {string} url
 * @param {object} [opts]
 * @returns {Promise<{ html: string, status: number, contentType: string }>}
 */
/**
 * Resolve a Vercel Deployment Protection bypass secret for a given product.
 * Lookup convention (W1 #2): VERCEL_BYPASS_SECRET_<productId.toUpperCase()>.
 * Returns the secret string OR null. NEVER logged; callers must not echo
 * the return value into error messages or step logs.
 *
 * Product-agnostic: any product_registry.product_id resolves the same way.
 * No hardcoded product names.
 *
 * @param {string|null|undefined} productId
 * @param {object} [env]   — default: process.env
 * @returns {string|null}
 */
export function resolveVercelBypassSecret(productId, env = process.env) {
  if (typeof productId !== 'string' || productId.length === 0) {
    // DISPATCH 31: no productId — fall back to the Vercel-canonical
    // VERCEL_AUTOMATION_BYPASS_SECRET so the FlowAI self-test (and any
    // other unscoped self-crawl) can read its OWN protected preview
    // URLs without 401. Returns null if the canonical secret is also
    // absent — caller proceeds without the header and the fetch will
    // see whatever Deployment Protection returns.
    const fallback = env.VERCEL_AUTOMATION_BYPASS_SECRET;
    return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
  }
  const key = `VERCEL_BYPASS_SECRET_${productId.toUpperCase()}`;
  const secret = env[key];
  if (typeof secret === 'string' && secret.length > 0) return secret;
  // DISPATCH 31: per-product secret missing → fall through to the
  // Vercel-canonical VERCEL_AUTOMATION_BYPASS_SECRET. Same rationale as
  // the no-productId path: lets the FlowAI self-test (productId =
  // 'flowai' for telemetry but no dedicated per-product secret seeded
  // in Doppler) read its own protected previews. Per-product secrets
  // still take precedence when set.
  const fallback = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}

/**
 * Determine whether a URL targets a Vercel deployment (preview or prod).
 * Vercel uses *.vercel.app for previews and custom domains otherwise; this
 * heuristic catches the .vercel.app shape that's the typical FlowAI
 * Self-Renewal preview-deploy output. Custom-domain Vercel deployments
 * would need explicit per-product host mapping — out of Phase A scope.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isVercelDeploymentUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    const u = new URL(url);
    return /\.vercel\.app$/i.test(u.hostname);
  } catch { return false; }
}

export async function fetchUrlContent(url, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('MONITOR_FETCH_FAILED',
      'fetchUrlContent: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller && typeof setTimeout === 'function'
    ? setTimeout(() => controller.abort(), opts.timeoutMs ?? FETCH_TIMEOUT_MS)
    : null;

  // ── Vercel Deployment Protection bypass (DISPATCH 27) ──────────────────────
  // When the URL targets a *.vercel.app host AND a productId is supplied AND
  // the per-product bypass secret is set in env, inject the
  // x-vercel-protection-bypass header so Protection-enabled preview URLs
  // return their real content instead of a 401. The secret is read via
  // resolveVercelBypassSecret() — convention: VERCEL_BYPASS_SECRET_<UPPER>.
  // Secret NEVER logged; never copied into error messages or return value.
  const headers = {
    'User-Agent': 'FlowAI-MonitorTextProducer/1.0 (+https://flowai)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  let bypassInjected = false;
  if (isVercelDeploymentUrl(url)) {
    const secret = resolveVercelBypassSecret(opts.productId);
    if (secret) {
      headers['x-vercel-protection-bypass'] = secret;
      bypassInjected = true;
    }
  }

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal: controller?.signal,
      redirect: 'follow',
    });
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    throw makeError('MONITOR_FETCH_FAILED',
      `fetchUrlContent: network error fetching ${url} — ${e?.message ?? String(e)}`);
  }
  if (timeoutId) clearTimeout(timeoutId);
  if (!response.ok) {
    // Error message names the URL + status + whether bypass was attempted
    // (boolean only; the secret itself is never surfaced).
    const bypassNote = bypassInjected ? ' (vercel-protection-bypass attempted)' : '';
    throw makeError('MONITOR_FETCH_FAILED',
      `fetchUrlContent: ${url} returned ${response.status} ${response.statusText}${bypassNote}`,
      { status: response.status, bypassAttempted: bypassInjected });
  }
  const contentType = response.headers.get('content-type') ?? '';
  const html = await response.text();
  return { html, status: response.status, contentType, bypassAttempted: bypassInjected };
}

// ─── GitHub enrichment ─────────────────────────────────────────────────────

/**
 * Parse `owner` and `repo` from a GitHub repo URL. Returns null if the
 * URL doesn't look like a github.com/owner/repo[.git] shape.
 */
export function parseGithubRepoUrl(repoUrl) {
  if (typeof repoUrl !== 'string') return null;
  // Tolerate trailing slash, `.git`, and arbitrary path segments after owner/repo.
  const m = repoUrl.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/.?#]+)(?:\.git)?/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function githubFetch(path, token, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('GITHUB_ENRICHMENT_FAILED',
      'githubFetch: fetch unavailable on globalThis. Node 18+ required.');
  }
  const url = `${GITHUB_API_BASE}${path}`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'FlowAI-MonitorTextProducer/1.0',
      },
    });
  } catch (e) {
    throw makeError('GITHUB_ENRICHMENT_FAILED',
      `githubFetch: network error fetching ${path} — ${e?.message ?? String(e)}`);
  }
  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch { /* ignore */ }
    throw makeError('GITHUB_ENRICHMENT_FAILED',
      `githubFetch: GitHub returned ${response.status} ${response.statusText} for ${path}. ` +
      `Body: ${body.slice(0, 200)}`,
      { status: response.status });
  }
  try { return await response.json(); }
  catch (e) {
    throw makeError('GITHUB_ENRICHMENT_FAILED',
      `githubFetch: GitHub response for ${path} was not JSON — ${e?.message ?? String(e)}`);
  }
}

function decodeContentEntry(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (entry.encoding !== 'base64' || typeof entry.content !== 'string') return '';
  try {
    return Buffer.from(entry.content, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Probe a single directory (e.g. 'src/pages'). Returns an array of file
 * entries from the GitHub contents API, or [] if the directory does
 * not exist. Errors other than 404 are swallowed — we don't want a
 * single bad directory to fail the entire enrichment.
 */
async function listDirectorySafely({ owner, repo, dirPath, token, opts }) {
  try {
    const out = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(dirPath)}`,
      token,
      opts,
    );
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

/**
 * Compose the GitHub-enrichment block for the monitor prompt. Returns
 * { block, filesRead, sources, sourceDirsListed }. Never throws — on
 * any failure, returns { block: '', filesRead: 0, sources: [], ... }
 * so the URL-only fallback path still produces a clean monitor text.
 *
 * @param {{ githubRepoUrl: string, token: string, opts?: object }} args
 */
export async function fetchGithubSourceBundle({ githubRepoUrl, token, opts = {} }) {
  const parsed = parseGithubRepoUrl(githubRepoUrl);
  if (!parsed) return { block: '', filesRead: 0, sources: [], sourceDirsListed: [] };
  if (typeof token !== 'string' || token.length === 0) {
    return { block: '', filesRead: 0, sources: [], sourceDirsListed: [] };
  }
  const { owner, repo } = parsed;

  // 1. Root listing → identify README.md + package.json + src/ directory presence.
  let rootListing;
  try {
    rootListing = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`,
      token,
      opts,
    );
  } catch (e) {
    return {
      block: '',
      filesRead: 0,
      sources: [],
      sourceDirsListed: [],
      error: `root listing failed: ${e?.message ?? String(e)}`,
    };
  }
  if (!Array.isArray(rootListing)) {
    return { block: '', filesRead: 0, sources: [], sourceDirsListed: [] };
  }

  const rootByName = new Map(rootListing.map((e) => [String(e?.name ?? ''), e]));
  const hasSrcDir = (rootByName.get('src')?.type === 'dir');

  // 2. Probe src/pages and src/components in parallel for the file listings.
  const [pagesListing, componentsListing] = hasSrcDir
    ? await Promise.all([
        listDirectorySafely({ owner, repo, dirPath: 'src/pages', token, opts }),
        listDirectorySafely({ owner, repo, dirPath: 'src/components', token, opts }),
      ])
    : [[], []];

  // 3. Build the "top N source files" set: prefer .jsx/.tsx files in
  //    pages, then components, ordered by size descending so the
  //    largest (and most informative) files win the per-file caps.
  const isJsxOrTsx = (name) => /\.(jsx|tsx)$/i.test(String(name ?? ''));
  const sourceFileCandidates = [
    ...pagesListing
      .filter((e) => e?.type === 'file' && isJsxOrTsx(e.name))
      .map((e) => ({ type: 'file', path: e.path, name: e.name, size: e.size ?? 0, dir: 'src/pages' })),
    ...componentsListing
      .filter((e) => e?.type === 'file' && isJsxOrTsx(e.name))
      .map((e) => ({ type: 'file', path: e.path, name: e.name, size: e.size ?? 0, dir: 'src/components' })),
  ].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));

  // 4. README + package.json fetches (parallel, tolerant of 404).
  const readmeEntry = rootByName.get('README.md') ?? rootByName.get('readme.md') ?? rootByName.get('README');
  const packageEntry = rootByName.get('package.json');

  async function fetchFileContents(entry) {
    if (!entry || entry.type !== 'file') return null;
    try {
      const full = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(entry.path)}`,
        token,
        opts,
      );
      return decodeContentEntry(full);
    } catch {
      return null;
    }
  }

  // High-signal files: README + package.json claim 2 of the MAX_GITHUB_FILES
  // slots; the remaining slots go to .jsx/.tsx source files (top 8).
  const sourceFileSlots = MAX_GITHUB_FILES - 2;
  const pickedSourceFiles = sourceFileCandidates.slice(0, Math.max(0, sourceFileSlots));

  const [readmeText, packageJsonText, ...sourceFileTexts] = await Promise.all([
    fetchFileContents(readmeEntry),
    fetchFileContents(packageEntry),
    ...pickedSourceFiles.map(fetchFileContents),
  ]);

  // 5. Parse package.json safely.
  let packageJsonParsed = null;
  if (typeof packageJsonText === 'string' && packageJsonText.length > 0) {
    try { packageJsonParsed = JSON.parse(packageJsonText); }
    catch { /* malformed package.json — surface as 'unparseable' below */ }
  }

  // 6. Extract unique component names from imports across the picked
  //    source files. Heuristic but cheap.
  const componentNameSet = new Set();
  const importRe = /import\s+(?:\{([^}]+)\}|([A-Z][A-Za-z0-9_]*))(?:\s*,\s*\{([^}]+)\})?\s+from\s+['"][^'"]+['"]/g;
  for (let i = 0; i < pickedSourceFiles.length; i++) {
    const src = sourceFileTexts[i];
    if (typeof src !== 'string') continue;
    let m;
    while ((m = importRe.exec(src)) !== null) {
      const namedGroups = [m[1], m[3]].filter(Boolean);
      for (const grp of namedGroups) {
        for (const name of grp.split(',')) {
          const trimmed = name.trim().split(/\s+as\s+/i)[0].trim();
          if (/^[A-Z][A-Za-z0-9_]*$/.test(trimmed)) componentNameSet.add(trimmed);
        }
      }
      if (m[2]) componentNameSet.add(m[2]);
    }
  }
  const uniqueComponentNames = [...componentNameSet].sort().slice(0, 80);

  // 7. Build the enrichment block.
  const lines = [];
  lines.push('━━━ GITHUB SOURCE ENRICHMENT ━━━');
  lines.push(`Repo: ${owner}/${repo}`);

  if (packageJsonParsed) {
    const deps = packageJsonParsed.dependencies || {};
    const devDeps = packageJsonParsed.devDependencies || {};
    const scripts = packageJsonParsed.scripts || {};
    lines.push('');
    lines.push('PACKAGE.JSON SUMMARY');
    lines.push(`  name: ${packageJsonParsed.name ?? '(unspecified)'}`);
    lines.push(`  description: ${packageJsonParsed.description ?? '(unspecified)'}`);
    lines.push(`  dependencies: ${Object.keys(deps).length} runtime, ${Object.keys(devDeps).length} dev`);
    lines.push(`  scripts: ${Object.keys(scripts).join(', ') || '(none)'}`);
  } else if (packageJsonText) {
    lines.push('');
    lines.push('PACKAGE.JSON: present but unparseable as JSON.');
  } else {
    lines.push('');
    lines.push('PACKAGE.JSON: not present at repo root.');
  }

  if (typeof readmeText === 'string' && readmeText.length > 0) {
    lines.push('');
    lines.push('README.md (full, redacted)');
    lines.push(scrubCredentials(readmeText).slice(0, MAX_FILE_CONTENT_CHARS));
  } else {
    lines.push('');
    lines.push('README.md: not present at repo root.');
  }

  lines.push('');
  lines.push('SOURCE FILE INVENTORY');
  if (pagesListing.length === 0 && componentsListing.length === 0) {
    lines.push('  (no src/pages or src/components directory found)');
  } else {
    if (pagesListing.length > 0) {
      lines.push(`  src/pages (${pagesListing.length} entries; ${pagesListing.filter((e) => isJsxOrTsx(e.name)).length} .jsx/.tsx):`);
      for (const e of pagesListing.filter((e) => isJsxOrTsx(e.name)).slice(0, MAX_SOURCE_DIR_LISTING)) {
        lines.push(`    - ${e.name} (${e.size ?? 0} bytes)`);
      }
    }
    if (componentsListing.length > 0) {
      lines.push(`  src/components (${componentsListing.length} entries; ${componentsListing.filter((e) => isJsxOrTsx(e.name)).length} .jsx/.tsx):`);
      for (const e of componentsListing.filter((e) => isJsxOrTsx(e.name)).slice(0, MAX_SOURCE_DIR_LISTING)) {
        lines.push(`    - ${e.name} (${e.size ?? 0} bytes)`);
      }
    }
  }

  lines.push('');
  lines.push('FEATURE SURFACE');
  lines.push(`  Pages (count): ${pagesListing.filter((e) => isJsxOrTsx(e.name)).length}`);
  lines.push(`  Components (count): ${componentsListing.filter((e) => isJsxOrTsx(e.name)).length}`);
  lines.push(`  Unique component names referenced via imports (top 80): ${uniqueComponentNames.join(', ') || '(none discovered)'}`);

  lines.push('');
  lines.push('TOP SOURCE FILES (truncated, redacted)');
  let filesActuallyRead = 0;
  if (typeof readmeText === 'string' && readmeText.length > 0) filesActuallyRead += 1;
  if (typeof packageJsonText === 'string' && packageJsonText.length > 0) filesActuallyRead += 1;
  for (let i = 0; i < pickedSourceFiles.length; i++) {
    const text = sourceFileTexts[i];
    if (typeof text !== 'string' || text.length === 0) continue;
    filesActuallyRead += 1;
    lines.push('');
    lines.push(`--- ${pickedSourceFiles[i].path} (${pickedSourceFiles[i].size} bytes) ---`);
    lines.push(scrubCredentials(text).slice(0, MAX_FILE_CONTENT_CHARS));
  }
  lines.push('');
  lines.push('━━━ END GITHUB SOURCE ENRICHMENT ━━━');

  return {
    block: lines.join('\n'),
    filesRead: filesActuallyRead,
    sources: ['github'],
    sourceDirsListed: [
      pagesListing.length > 0 ? 'src/pages' : null,
      componentsListing.length > 0 ? 'src/components' : null,
    ].filter(Boolean),
  };
}

/**
 * Build the Monitor-style prompt for Claude. Same shape as the
 * AutoRunner Step 8 prompt — the per-layer score lines `[L1] ... X/10`
 * are the parsed scoring authority for computeMonitorClearance.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} args.pageTitle
 * @param {string} args.pageText
 * @param {string} [args.githubBlock] — optional GitHub enrichment block
 *                                       produced by fetchGithubSourceBundle.
 * @returns {string}
 */
/**
 * Build a Claude-readable block from a CrawlReport (the shape Agent #21's
 * conductCrawl produces). DISPATCH 24 — feeds multi-page crawl signal into
 * scoring so Claude scores against the real product surface, not the
 * landing-page title alone.
 *
 * Input shape (from src/lib/agents/agents/Agent21AggressiveCrawlConductor.js):
 *   {
 *     pages: [{ url, title, metaDescription, bodyText, headings,
 *               surfaces: { links, buttons, forms, images },
 *               authGated, method, jsRendered, warnings }],
 *     pagesCrawled, depth, errors: [], warnings: [], durationMs
 *   }
 *
 * Caps the total block at ~10000 chars to stay inside Claude's token budget
 * without crowding out the FIVE_LAYER_FRAMEWORK + scoring directives.
 *
 * @param {object|null} crawlReport
 * @returns {string} the block, or '' if crawlReport is unusable
 */
export function buildCrawlReportBlock(crawlReport) {
  if (!crawlReport || typeof crawlReport !== 'object') return '';
  const pages = Array.isArray(crawlReport.pages) ? crawlReport.pages : [];
  if (pages.length === 0) return '';

  const TOTAL_CHAR_CAP = 10_000;
  const PER_PAGE_BODY_CAP = 600;
  const MAX_HEADINGS_PER_PAGE = 8;
  const MAX_PAGES_RENDERED = 30;
  const MAX_LINKS_LISTED = 50;
  const MAX_FORMS_RENDERED = 10;

  const lines = [];
  lines.push('━━━ MULTI-PAGE CRAWL REPORT (Agent #21 BFS) ━━━');
  lines.push(`Pages crawled: ${crawlReport.pagesCrawled ?? pages.length}`);
  lines.push(`Depth: ${crawlReport.depth ?? '?'}`);
  if (Array.isArray(crawlReport.errors) && crawlReport.errors.length > 0) {
    lines.push(`Errors found: ${crawlReport.errors.length}`);
    for (const err of crawlReport.errors.slice(0, 10)) {
      const reason = err?.reason || err?.message || JSON.stringify(err);
      const where  = err?.url || err?.phase || '';
      lines.push(`  - [${where}] ${String(reason).slice(0, 200)}`);
    }
  }
  if (Array.isArray(crawlReport.warnings) && crawlReport.warnings.length > 0) {
    lines.push(`Warnings: ${crawlReport.warnings.length}`);
    for (const w of crawlReport.warnings.slice(0, 5)) {
      lines.push(`  - ${String(w).slice(0, 200)}`);
    }
  }
  lines.push('');

  // Aggregate inventories across pages (link union, form count, button count).
  const allLinks = new Set();
  let totalButtons = 0;
  const allForms = [];

  const renderedPages = pages.slice(0, MAX_PAGES_RENDERED);
  for (const p of renderedPages) {
    if (!p || typeof p !== 'object') continue;
    const u = p.url ?? '(unknown url)';
    const title = (p.title ?? '').toString().slice(0, 200);
    const headings = Array.isArray(p.headings) ? p.headings.slice(0, MAX_HEADINGS_PER_PAGE) : [];
    const body = typeof p.bodyText === 'string' ? p.bodyText.slice(0, PER_PAGE_BODY_CAP) : '';
    const surfaces = p.surfaces && typeof p.surfaces === 'object' ? p.surfaces : {};
    const links = Array.isArray(surfaces.links) ? surfaces.links : (Array.isArray(p.links) ? p.links : []);
    const buttons = Array.isArray(surfaces.buttons) ? surfaces.buttons : [];
    const forms = Array.isArray(surfaces.forms) ? surfaces.forms : [];

    lines.push(`━━ Page: ${u} ━━`);
    if (title) lines.push(`Title: ${title}`);
    if (p.authGated) lines.push('[auth-gated]');
    if (headings.length > 0) {
      lines.push(`Headings: ${headings.map((h) => String(h).trim().slice(0, 120)).filter(Boolean).join(' | ')}`);
    }
    if (body) lines.push(`Body excerpt: ${body.replace(/\s+/g, ' ').trim()}`);

    for (const l of links) allLinks.add(typeof l === 'string' ? l : (l?.href ?? ''));
    totalButtons += Array.isArray(buttons) ? buttons.length : 0;
    for (const f of forms.slice(0, 3)) {
      allForms.push({ pageUrl: u, ...f });
    }
    lines.push('');
    if (lines.join('\n').length > TOTAL_CHAR_CAP * 0.7) break; // stop adding pages once we're nearing the cap
  }

  // Link inventory across pages.
  const linksList = Array.from(allLinks).filter(Boolean).slice(0, MAX_LINKS_LISTED);
  if (linksList.length > 0) {
    lines.push('━━ Discovered links (union across pages, capped) ━━');
    for (const l of linksList) lines.push(`  - ${String(l).slice(0, 200)}`);
    if (allLinks.size > MAX_LINKS_LISTED) {
      lines.push(`  ... and ${allLinks.size - MAX_LINKS_LISTED} more`);
    }
    lines.push('');
  }

  if (totalButtons > 0) {
    lines.push(`Interactive button count (across pages): ${totalButtons}`);
    lines.push('');
  }

  if (allForms.length > 0) {
    lines.push('━━ Forms detected ━━');
    for (const f of allForms.slice(0, MAX_FORMS_RENDERED)) {
      const fields = Array.isArray(f.fields) ? f.fields.map((x) => x?.name ?? '').filter(Boolean).join(', ') : '';
      const button = f.submitLabel || f.button || '';
      lines.push(`  - [${f.pageUrl}] action=${f.action ?? '?'} method=${f.method ?? '?'}${fields ? ` fields=${fields}` : ''}${button ? ` submit="${button}"` : ''}`);
    }
    lines.push('');
  }

  lines.push('━━━ END MULTI-PAGE CRAWL REPORT ━━━');

  let out = lines.join('\n');
  if (out.length > TOTAL_CHAR_CAP) {
    out = `${out.slice(0, TOTAL_CHAR_CAP)}\n[truncated at ${TOTAL_CHAR_CAP} chars]`;
  }
  return out;
}

export function buildMonitorPrompt({ url, pageTitle, pageText, githubBlock = '', crawlBlock = '' }) {
  const hasGithub = typeof githubBlock === 'string' && githubBlock.length > 0;
  const hasCrawl  = typeof crawlBlock  === 'string' && crawlBlock.length  > 0;
  let combinedSignalNote = null;
  if (hasGithub && hasCrawl) {
    combinedSignalNote = 'You have THREE signals above: the live URL content (what the user sees on the landing page), the full multi-page crawl (titles, headings, links, forms, errors across all crawled pages), AND the GitHub source code. Score against the COMBINED signal — the crawl shows operational surface; the source shows what the product actually does.';
  } else if (hasGithub) {
    combinedSignalNote = 'You have BOTH the live URL content AND the GitHub source code above. Use BOTH: the URL shows what the user sees; the source shows what the product actually does. Score against the combined signal.';
  } else if (hasCrawl) {
    combinedSignalNote = 'You have BOTH the live URL content AND the full multi-page crawl above. The crawl shows the real product surface (titles, headings, forms, errors across all pages). Score against the combined signal — DO NOT under-score because the landing page is sparse; weigh the full crawled surface.';
  }
  return [
    "You are FlowAI's final reporting engine. Compile a complete five-layer intelligence final report for this URL.",
    '',
    `URL: ${url}`,
    `TITLE: ${pageTitle || '(no title)'}`,
    '',
    '━━━ PAGE CONTENT ━━━',
    pageText.slice(0, MAX_PAGE_TEXT_CHARS),
    '━━━ END PAGE CONTENT ━━━',
    hasCrawl ? '' : null,
    hasCrawl ? crawlBlock : null,
    hasGithub ? '' : null,
    hasGithub ? githubBlock : null,
    '',
    FIVE_LAYER_FRAMEWORK,
    '',
    'Compile a comprehensive final assessment for this specific product across all five intelligence layers.',
    combinedSignalNote,
    '',
    '1. EXECUTIVE SUMMARY — 3-4 sentences about THIS product\'s state, referencing specific findings from the page content above.',
    '',
    '2. FIVE-LAYER SCORES SUMMARY (output EXACTLY this block, one score per line, integers only):',
    '   [L1] Functionality Score: X/10',
    '   [L2] Operational Score: X/10',
    '   [L3] Financial Score: X/10',
    '   [L4] Business Score: X/10',
    '   [L5] GTM Score: X/10',
    '',
    '3. CRITICAL ISSUES — All CRITICAL severity issues with exact locations and fixes specific to this product',
    '',
    '4. HIGH PRIORITY ISSUES — All HIGH severity issues',
    '',
    '5. RECOMMENDED NEXT ACTIONS — Top 5 ordered actions specific to this product, one per intelligence layer',
    '',
    'STRICT OUTPUT RULES — these are not suggestions:',
    '- Do NOT output a "TOTAL" line. Code sums the per-layer scores deterministically.',
    '- Do NOT output a "DEMO READINESS SCORE" or any aggregate /50 number. Code computes it.',
    '- Do NOT output a "CLEARANCE DECISION" or verdict (CLEARED/CONDITIONAL/NOT CLEARED). Code computes it from the sum.',
    '- Do NOT output a "scoring note" or any text that reconciles, adjusts, or grants discretionary aggregate credit on top of the per-layer scores.',
    '- Do NOT include band/threshold text (e.g. "45-50", "above 30"). You are evaluating, not adjudicating.',
    '- The per-layer scores you output are the ONLY scoring authority. Code will sum and decide. Your aggregate opinion is not part of the report.',
  ].filter((s) => s !== null).join('\n');
}

/**
 * Call Claude to produce the Monitor text from a page-content prompt.
 *
 * @param {object} args
 * @param {string} args.prompt
 * @param {object} [args.opts]
 * @returns {Promise<{ text: string, model: string, usage: object }>}
 */
async function callClaudeForMonitor({ prompt, opts = {} }) {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: ANTHROPIC_API_KEY is required. Set process.env.ANTHROPIC_API_KEY (Doppler key in production).');
  }
  const model = typeof opts.model === 'string' && opts.model ? opts.model : FINAL_FALLBACK_MODEL;
  const maxTokens = Number.isFinite(opts.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: fetch is not available on globalThis. Node 18+ required.');
  }
  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: network error calling Anthropic — ${e?.message ?? String(e)}`);
  }
  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: Anthropic returned ${response.status} ${response.statusText}. Upstream body omitted for secret safety (${bodyText.length} chars).`,
      { status: response.status });
  }
  let parsed;
  try {
    parsed = await response.json();
  } catch (e) {
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: Anthropic response was not JSON — ${e?.message ?? String(e)}`);
  }
  const textBlocks = Array.isArray(parsed.content)
    ? parsed.content.filter((b) => b && b.type === 'text').map((b) => b.text ?? '')
    : [];
  const text = textBlocks.join('');
  if (typeof text !== 'string' || text.length === 0) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: Anthropic returned empty content');
  }
  return {
    text,
    model: parsed.model ?? model,
    usage: parsed.usage ?? {},
    provider: 'anthropic',
  };
}

async function callOpenAIForMonitor({ prompt, opts = {} }) {
  const apiKey = opts.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: OPENAI_API_KEY is required for OpenAI monitor fallback.');
  }
  const model = typeof opts.openaiModel === 'string' && opts.openaiModel
    ? opts.openaiModel
    : (process.env.OPENAI_MONITOR_MODEL || process.env.OPENAI_MODEL || OPENAI_MONITOR_FALLBACK_MODEL);
  const maxTokens = Number.isFinite(opts.maxTokens) ? opts.maxTokens : DEFAULT_MAX_TOKENS;
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: fetch is not available on globalThis. Node 18+ required.');
  }

  let response;
  try {
    response = await fetchImpl(`${OPENAI_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are FlowAI Monitor. Return the requested five-layer assessment text exactly; do not include markdown fences.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (e) {
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: network error calling OpenAI — ${e?.message ?? String(e)}`);
  }
  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: OpenAI returned ${response.status} ${response.statusText}. Upstream body omitted for secret safety (${bodyText.length} chars).`,
      { status: response.status });
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (e) {
    throw makeError('MONITOR_SCORE_FAILED',
      `monitorTextProducer: OpenAI response was not JSON — ${e?.message ?? String(e)}`);
  }
  const text = parsed?.choices?.[0]?.message?.content ?? '';
  if (typeof text !== 'string' || text.length === 0) {
    throw makeError('MONITOR_SCORE_FAILED',
      'monitorTextProducer: OpenAI returned empty content');
  }
  return {
    text,
    model: parsed.model ?? model,
    usage: parsed.usage ?? {},
    provider: 'openai',
  };
}

function safeProviderFailure(error) {
  return {
    provider: error?.provider ?? null,
    code: error?.code ?? 'MONITOR_SCORE_FAILED',
    status: typeof error?.status === 'number' ? error.status : null,
    message: (error?.message ?? String(error)).slice(0, 300),
  };
}

async function callLlmForMonitor({ prompt, opts = {} }) {
  const failures = [];

  if (opts.apiKey || process.env.ANTHROPIC_API_KEY) {
    try {
      return await callClaudeForMonitor({ prompt, opts });
    } catch (e) {
      e.provider = 'anthropic';
      failures.push(safeProviderFailure(e));
      if (!(opts.openaiApiKey || process.env.OPENAI_API_KEY)) throw e;
    }
  }

  if (opts.openaiApiKey || process.env.OPENAI_API_KEY) {
    try {
      const openai = await callOpenAIForMonitor({ prompt, opts });
      return Object.freeze({
        ...openai,
        fallbackFrom: failures.length > 0 ? failures : undefined,
      });
    } catch (e) {
      e.provider = 'openai';
      failures.push(safeProviderFailure(e));
      throw makeError('MONITOR_SCORE_FAILED',
        `monitorTextProducer: no configured monitor LLM provider succeeded. Failures: ${JSON.stringify(failures)}`,
        { providerFailures: failures });
    }
  }

  throw makeError('MONITOR_SCORE_FAILED',
    'monitorTextProducer: no monitor LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
}

/**
 * Produce Monitor text for a URL — the KEYSTONE call.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} args.productId
 * @param {string} args.runId
 * @param {string} [args.githubRepoUrl]  — DISPATCH 6: when present alongside
 *                                          `token`, enriches the prompt with
 *                                          curated GitHub source code.
 * @param {string} [args.token]          — DISPATCH 6: GitHub App installation
 *                                          token (≤1h TTL). Never logged.
 * @param {object} [args.opts]    — { fetch?, model?, apiKey?, maxTokens? }
 *
 * @returns {Promise<{
 *   monitorText, rawContent, url, fetchedAt, wordCount, pageTitle,
 *   contentType, provider, model, usage,
 *   sources: ('url'|'github')[], filesRead: number,
 *   sourceDirsListed?: string[], enrichmentError?: string
 * }>}
 */
export async function produceMonitorText(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('MONITOR_FETCH_FAILED', 'produceMonitorText: args object required');
  }
  const required = ['url', 'productId', 'runId'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('MONITOR_FETCH_FAILED',
        `produceMonitorText: ${k} must be a non-empty string`);
    }
  }
  const opts = args.opts ?? {};

  // 1. Fetch the URL content.
  // DISPATCH 27: thread productId into fetchUrlContent so the Vercel
  // Deployment Protection bypass header is injected when the URL targets
  // a *.vercel.app host (Phase A preview deploys for registered products).
  const fetchOpts = { ...opts, productId: args.productId };
  const { html, status, contentType } = await fetchUrlContent(args.url, fetchOpts);
  const pageTitle = extractPageTitle(html);
  const pageText = extractVisibleText(html);
  const wordCount = pageText.split(/\s+/).filter(Boolean).length;

  // DISPATCH 24: relax the SSR-empty guard when a multi-page crawl was
  // provided — the crawl contains real rendered content from Agent #21
  // even when the landing page itself is a JS-shell. Only throw when the
  // landing page is empty AND no crawl signal is available.
  const hasCrawlSignal = !!(args.crawlReport
    && Array.isArray(args.crawlReport.pages)
    && args.crawlReport.pages.length > 0);
  if (wordCount < 5 && !hasCrawlSignal) {
    // Degenerate page (empty, JS-rendered SPA shell with no SSR, error page).
    // Surface honestly rather than asking Claude to score an empty string.
    throw makeError('MONITOR_FETCH_FAILED',
      `produceMonitorText: ${args.url} returned ${status} but extracted only ${wordCount} words of visible text (likely JS-rendered SPA without SSR; pass crawlReport from Agent #21 or wait for Phase B Browserless wiring)`,
      { status, wordCount });
  }

  // 2. Optionally enrich with GitHub source. Both githubRepoUrl + token
  //    must be present; either missing → URL-only path. The enrichment
  //    call NEVER throws — internal failures surface via the bundle's
  //    `error` field and degrade to URL-only.
  let githubBundle = { block: '', filesRead: 0, sources: [], sourceDirsListed: [] };
  let enrichmentError;
  if (typeof args.githubRepoUrl === 'string' && args.githubRepoUrl.length > 0 &&
      typeof args.token === 'string' && args.token.length > 0) {
    try {
      githubBundle = await fetchGithubSourceBundle({
        githubRepoUrl: args.githubRepoUrl,
        token: args.token,
        opts,
      });
      if (githubBundle.error) enrichmentError = githubBundle.error;
    } catch (e) {
      // Defensive — fetchGithubSourceBundle promises not to throw, but
      // belt-and-suspenders: degrade gracefully on any unexpected throw.
      enrichmentError = e?.message ?? String(e);
      githubBundle = { block: '', filesRead: 0, sources: [], sourceDirsListed: [] };
    }
  }

  // 2b. DISPATCH 24: build the multi-page crawl block when the orchestrator
  //     passed a crawlReport from Agent #21. Empty string when absent,
  //     which the prompt builder treats as "skip the crawl section".
  const crawlBlock = buildCrawlReportBlock(args.crawlReport);

  // 3. Build the Monitor prompt (with crawl enrichment + optional GitHub).
  const prompt = buildMonitorPrompt({
    url: args.url, pageTitle, pageText,
    githubBlock: githubBundle.block,
    crawlBlock,
  });

  // 4. Call a configured monitor LLM to produce real Monitor text.
  const llm = await callLlmForMonitor({ prompt, opts });

  const sources = ['url', ...(githubBundle.sources || [])];

  return {
    monitorText: llm.text,
    rawContent: pageText.slice(0, MAX_PAGE_TEXT_CHARS),
    url: args.url,
    fetchedAt: new Date().toISOString(),
    wordCount,
    pageTitle,
    contentType,
    provider: llm.provider,
    model: llm.model,
    usage: llm.usage,
    sources,
    filesRead: githubBundle.filesRead || 0,
    sourceDirsListed: githubBundle.sourceDirsListed || [],
    ...(llm.fallbackFrom ? { fallbackFrom: llm.fallbackFrom } : {}),
    ...(enrichmentError ? { enrichmentError } : {}),
  };
}

export const __internals = Object.freeze({
  ANTHROPIC_API_BASE,
  OPENAI_API_BASE,
  FINAL_FALLBACK_MODEL,
  OPENAI_MONITOR_FALLBACK_MODEL,
  DEFAULT_MAX_TOKENS,
  FETCH_TIMEOUT_MS,
  MAX_PAGE_TEXT_CHARS,
  GITHUB_API_BASE,
  MAX_GITHUB_FILES,
  MAX_FILE_CONTENT_CHARS,
  MAX_SOURCE_DIR_LISTING,
  FIVE_LAYER_FRAMEWORK,
  CREDENTIAL_REDACT_PATTERNS,
  scrubCredentials,
  extractVisibleText,
  extractPageTitle,
  fetchUrlContent,
  buildMonitorPrompt,
  callClaudeForMonitor,
  callOpenAIForMonitor,
  callLlmForMonitor,
  makeError,
  parseGithubRepoUrl,
  decodeContentEntry,
});
