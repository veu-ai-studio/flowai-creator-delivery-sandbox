import { describe, expect, it } from 'vitest';
import { __internals } from '../../../src/lib/agents/renewal/orchestrator.js';

const { buildUpgradeDeliveryEnvelope } = __internals;

describe('upgrade delivery envelope', () => {
  it('prefers the latest preview URL from the run iterations', () => {
    const envelope = buildUpgradeDeliveryEnvelope({
      product: {
        original_url: 'https://original.example',
        deployment_url: 'https://registry-v2.example',
        deployment_status: 'deployed',
      },
      iterations: [
        { previewUrl: 'https://older-preview.example' },
        { previewUrl: 'https://latest-preview.example' },
      ],
    });

    expect(envelope).toMatchObject({
      originalUrl: 'https://original.example',
      upgradedUrl: 'https://latest-preview.example',
      upgradeDeployed: true,
      upgradeDeployStatus: 'deployed',
      upgradeDeployReason: null,
    });
  });

  it('keeps deployed registry URLs as context when no current-run preview was produced', () => {
    const envelope = buildUpgradeDeliveryEnvelope({
      product: {
        original_url: 'https://saige-platform.vercel.app',
        upgrade_url: 'https://saige-v2.vercel.app',
        deployment_status: 'deployed',
      },
      iterations: [],
    });

    expect(envelope).toMatchObject({
      originalUrl: 'https://saige-platform.vercel.app',
      upgradedUrl: null,
      upgradeDeployed: false,
      upgradeDeployStatus: 'not_deployed',
      upgradeDeployReason: 'NO_CURRENT_RUN_DEPLOYMENT',
      registryUpgradeUrl: 'https://saige-v2.vercel.app',
      registryUpgradeStatus: 'deployed',
    });
  });

  it('reports platform-boundary blocked when no preview was produced', () => {
    const envelope = buildUpgradeDeliveryEnvelope({
      product: {
        original_url: 'https://saige-platform.vercel.app',
        upgrade_url: 'https://saige-v2.vercel.app',
        deployment_status: 'deployed',
      },
      iterations: [],
      exitReason: 'PLATFORM_BOUNDARY_BLOCKED',
    });

    expect(envelope).toMatchObject({
      upgradedUrl: null,
      upgradeDeployed: false,
      upgradeDeployStatus: 'blocked',
      upgradeDeployReason: 'PLATFORM_BOUNDARY_BLOCKED',
      registryUpgradeUrl: 'https://saige-v2.vercel.app',
    });
    expect(envelope.upgradeDeployDetail).toMatch(/platform boundary/i);
  });

  it('keeps an upgrade repo link as context before reporting no current-run deployment', () => {
    const envelope = buildUpgradeDeliveryEnvelope({
      product: {
        product_url: 'https://product.example',
        upgrade_repo: 'https://github.com/example/product-v2',
      },
      iterations: [],
    });

    expect(envelope).toMatchObject({
      originalUrl: 'https://product.example',
      upgradedUrl: null,
      upgradeDeployed: false,
      upgradeDeployStatus: 'not_deployed',
      upgradeDeployReason: 'NO_CURRENT_RUN_DEPLOYMENT',
      registryUpgradeUrl: 'https://github.com/example/product-v2',
      registryUpgradeStatus: 'repo_available',
    });
  });
});
