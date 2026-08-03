export const REGISTERED_PRODUCT_CONFIG = /** @type {readonly any[]} */ (Object.freeze([
  Object.freeze({
    name: 'FlowAI',
    domain: 'flowai.flowaiplatform.com',
    aliases: ['flowai-veu-ai-studio.vercel.app', 'flowai.flowaiplatform.com'],
    repo: 'https://github.com/victor2081new-cloud/flowai',
    branch: 'codex/p0-external-mvp-recovery',
    status: 'registered',
    original_url: 'https://flowai.flowaiplatform.com',
    upgrade_repo: 'https://github.com/victor2081new-cloud/flowai',
    upgrade_url: 'https://flowai.flowaiplatform.com',
    upgrade_status: 'active_upgrade_target',
    upgrade_repo_status: 'provisioned',
    deployment_url: 'https://flowai.flowaiplatform.com',
    deployment_status: 'deployed',
    vercel_project_id: 'prj_qtqajKmblq1cZILD66jVbTVC4Uo5',
    systemNote: 'FlowAI self-renewal targets isolated branches in the authoritative repository; production promotion remains separately gated.',
  }),
  Object.freeze({
    name: 'SAIGE',
    domain: 'saigeplatform.com',
    aliases: ['saige-v2.vercel.app'],
    repo: 'https://github.com/veu-ai-studio/saige-v2',
    branch: 'main',
    status: 'registered',
    original_repo: 'https://github.com/veu-ai-studio/saige',
    original_url: 'https://saigeplatform.com',
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
]));

export function findRegisteredProductConfigForUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let host = '';
  try {
    host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }
  return REGISTERED_PRODUCT_CONFIG.find((product) => {
    const domains = [product.domain, ...(Array.isArray(product.aliases) ? product.aliases : [])]
      .filter((domain) => typeof domain === 'string' && domain.trim())
      .map((domain) => domain.toLowerCase());
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }) || null;
}
