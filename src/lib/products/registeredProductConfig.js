export const REGISTERED_PRODUCT_CONFIG = Object.freeze([
  Object.freeze({
    name: 'SAIGE',
    domain: 'saigeplatform.com',
    repo: 'https://github.com/veu-ai-studio/saige-v2',
    branch: 'main',
    status: 'registered',
    original_repo: 'https://github.com/veu-ai-studio/saige',
    original_url: 'https://saige-platform.vercel.app',
    original_status: 'frozen_read_only',
    upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
    upgrade_url: 'https://saige-v2.vercel.app',
    upgrade_status: 'active_upgrade_target',
    upgrade_repo_status: 'provisioned',
    deployment_url: 'https://saige-v2.vercel.app',
    deployment_status: 'deployed',
    upgrade_architecture: 'fork_based_upgrade',
    self_renewal_max_per_day: 1000,
    systemNote: 'SAIGE upgrade architecture active. OLD repo github.com/veu-ai-studio/saige is read-only rollback/baseline. NEW repo github.com/veu-ai-studio/saige-v2 is the FlowAI upgrade target for U5/U6 fixes.',
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
