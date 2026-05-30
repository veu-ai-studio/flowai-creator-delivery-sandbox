function presentString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function tryParseURL(url) {
  const value = presentString(url);
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
}

function titleCase(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function firstDomainLabel(url) {
  const parsed = tryParseURL(url);
  if (!parsed) return 'product';
  const labels = parsed.hostname.toLowerCase().split('.').filter(Boolean);
  const label = labels[0] === 'www' && labels[1] ? labels[1] : labels[0];
  return slugify(label);
}

function hostnameLabel(url) {
  const parsed = tryParseURL(url);
  return parsed ? firstDomainLabel(parsed.href) : 'product';
}

function normalizeUrls(input) {
  const explicit = Array.isArray(input?.urls) ? input.urls.filter(presentString).map(value => value.trim()) : [];
  const single = presentString(input?.url);
  return explicit.length > 0 ? explicit : (single ? [single] : []);
}

function detectInputMode(url, urls, description, attachments) {
  if (urls.length >= 2) return 'synthesize';
  if (url) return 'clone';
  if (attachments.length > 0) return 'paste';
  if (description) return 'describe';
  return 'describe';
}

function detectPlatform(url, description) {
  const parsed = tryParseURL(url);
  if (parsed?.hostname.includes('play.google.com') || parsed?.hostname.includes('apps.apple.com')) {
    return 'mobile_app';
  }
  if (parsed?.hostname.startsWith('app.') || parsed?.pathname === '/app' || parsed?.pathname.startsWith('/app/')) {
    return 'SaaS';
  }

  const text = String(description ?? '').toLowerCase();
  if (text.includes('ai agent') || text.includes('autonomous')) return 'agentic_ai';
  if (text.includes('mobile')) return 'mobile_app';
  if (text.includes('native')) return 'native_app';
  return 'web';
}

function deriveId(inputMode, url, urls, description) {
  if (inputMode === 'clone') return firstDomainLabel(url);
  if (inputMode === 'synthesize') return slugify(urls.map(hostnameLabel).join('--'));
  if (inputMode === 'paste') return `paste-${Date.now().toString(36)}`;
  return slugify(String(description ?? '').slice(0, 50));
}

function deriveName(inputMode, url, urls, description) {
  if (inputMode === 'clone') return titleCase(firstDomainLabel(url));
  if (inputMode === 'synthesize') return `Synthesis of ${urls.map(hostnameLabel).join(', ')}`;
  if (inputMode === 'paste') return 'Uploaded Product';
  return titleCase(String(description ?? '').slice(0, 40));
}

export function resolveProductContext(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const description = presentString(source.description);
  const attachments = Array.isArray(source.attachments) ? source.attachments : [];
  const urls = normalizeUrls(source);
  const url = urls.length >= 2 ? null : (presentString(source.url) ?? urls[0] ?? null);
  const inputMode = detectInputMode(url, urls, description, attachments);
  const id = deriveId(inputMode, url, urls, description);

  return Object.freeze({
    id,
    name: deriveName(inputMode, url, urls, description),
    url,
    sourceUrls: Object.freeze([...urls]),
    description: description ?? '',
    platform: detectPlatform(url ?? urls[0] ?? null, description),
    inputMode,
    attachments: Object.freeze([...attachments]),
    outputUrl: null,
  });
}
