export const REGISTERED_PRODUCT_CONFIG = Object.freeze([
  Object.freeze({
    name: 'SAIGE',
    domain: 'saigeplatform.com',
    repo: 'https://github.com/victor2081new-cloud/saige',
    branch: 'main',
    status: 'registered',
    note: 'repo contains zip only - source mapping limited until codebase extracted',
    systemNote: 'SAIGE repo registered. Full source codebase available at github.com/victor2081new-cloud/saige (main). U5 fix generation enabled.',
  }),
]);

export function findRegisteredProductConfigForUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let host = '';
  try {
    host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }
  return REGISTERED_PRODUCT_CONFIG.find((product) =>
    host === product.domain || host.endsWith(`.${product.domain}`)) || null;
}
