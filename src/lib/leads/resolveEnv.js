// Demo-namespace resolver.
//
// Per W0 ruling, exactly THREE patterns identify the demo namespace:
//   1. saigedemo.com           — exact host match (and www.)
//   2. *.demo.veuaistudio.com  — suffix match
//   3. sandbox.*               — prefix match
//
// Anything else resolves to 'production'.
//
// Inputs are an object of header-derived strings: { origin, referer, host }.
// Each is a *URL or hostname* string; we normalize internally.
//
// Lookup order: host → origin → referer. The first usable hostname wins.
// This matches the typical proxy chain — `host` is the request line, `origin`
// is the browser's claim, `referer` is the prior page.

export const DEMO_PATTERNS = Object.freeze([
  { kind: 'host_exact',  value: 'saigedemo.com' },
  { kind: 'host_exact',  value: 'www.saigedemo.com' },
  { kind: 'host_suffix', value: '.demo.veuaistudio.com' },
  { kind: 'host_prefix', value: 'sandbox.' },
]);

const PRODUCTION = 'production';
const DEMO       = 'demo';

// Strip protocol / path / port / userinfo / fragment / query, lowercase.
function hostnameOf(input) {
  if (typeof input !== 'string' || input.length === 0) return null;
  let s = input.trim().toLowerCase();
  // Strip scheme
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  // Strip userinfo (user:pass@)
  const at = s.indexOf('@');
  if (at !== -1 && at < s.indexOf('/') || (at !== -1 && s.indexOf('/') === -1)) {
    s = s.slice(at + 1);
  }
  // Strip path / fragment / query
  s = s.replace(/[\/?#].*$/, '');
  // Strip port
  s = s.replace(/:\d+$/, '');
  return s.length === 0 ? null : s;
}

// Apply the W0-ruled patterns. Returns true iff the hostname is a demo.
export function isDemoHost(hostname) {
  if (typeof hostname !== 'string' || hostname.length === 0) return false;
  const h = hostname.toLowerCase();
  for (const p of DEMO_PATTERNS) {
    if (p.kind === 'host_exact' && h === p.value) return true;
    if (p.kind === 'host_suffix' && h.endsWith(p.value)) return true;
    if (p.kind === 'host_prefix' && h.startsWith(p.value)) return true;
  }
  return false;
}

// Main resolver. Pure: does not read process.env, does not read globals.
//
// `signals` may include any of:
//   { origin, referer, host }
// Order of precedence: host → origin → referer.
export function resolveEnv(signals = {}) {
  const candidates = [signals.host, signals.origin, signals.referer];
  for (const c of candidates) {
    const h = hostnameOf(c);
    if (h && isDemoHost(h)) return DEMO;
  }
  return PRODUCTION;
}

// Convenience for Vercel-style req objects. Reads headers.host /
// headers.origin / headers.referer (case-insensitive over arbitrary header
// key casing).
export function resolveEnvFromReq(req) {
  if (!req || typeof req !== 'object') return PRODUCTION;
  const headers = req.headers || {};
  // Build a lowercase-keyed snapshot so any casing of the input keys works.
  const lower = {};
  for (const k of Object.keys(headers)) lower[k.toLowerCase()] = headers[k];
  return resolveEnv({
    host:    lower['host'] || null,
    origin:  lower['origin'] || null,
    referer: lower['referer'] || lower['referrer'] || null,
  });
}

export const ENV_PRODUCTION = PRODUCTION;
export const ENV_DEMO       = DEMO;
