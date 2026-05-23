export const REGISTERED_PRODUCT_CONFIG = Object.freeze([
  Object.freeze({
    name: 'SAIGE',
    domain: 'saigeplatform.com',
    repo: 'https://github.com/veu-ai-studio/saige',
    branch: 'main',
    status: 'registered',
    systemNote: 'SAIGE repo registered. Full source codebase available at github.com/veu-ai-studio/saige (main). U5/U6 fix generation enabled.',
  }),
  Object.freeze({
    name: 'RelTwin',
    domain: 'reltwin.com',
    repo: 'https://github.com/veu-ai-studio/rel-twin',
    branch: 'main',
    status: 'registered',
  }),
  Object.freeze({
    name: 'ReachSMS',
    domain: 'ourcommunitiesai.com',
    repo: 'https://github.com/veu-ai-studio/reachsms',
    branch: 'main',
    status: 'registered',
  }),
  Object.freeze({
    name: 'PressAI',
    domain: 'ourpublishingai.com',
    repo: 'https://github.com/veu-ai-studio/press-ai',
    branch: 'main',
    status: 'registered',
  }),
  Object.freeze({
    name: 'MyPregLife',
    domain: 'preglife.com',
    repo: 'https://github.com/veu-ai-studio/my-preg-life',
    branch: 'main',
    status: 'registered',
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
