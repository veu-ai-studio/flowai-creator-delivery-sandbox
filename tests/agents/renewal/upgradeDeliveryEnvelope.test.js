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

  it('uses a verified deployed registry URL when no preview was produced', () => {
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
      upgradedUrl: 'https://saige-v2.vercel.app',
      upgradeDeployed: true,
      upgradeDeployStatus: 'deployed',
      upgradeDeployReason: null,
    });
  });

  it('falls back to the upgrade repo link before reporting unknown', () => {
    const envelope = buildUpgradeDeliveryEnvelope({
      product: {
        product_url: 'https://product.example',
        upgrade_repo: 'https://github.com/example/product-v2',
      },
      iterations: [],
    });

    expect(envelope).toMatchObject({
      originalUrl: 'https://product.example',
      upgradedUrl: 'https://github.com/example/product-v2',
      upgradeDeployed: false,
      upgradeDeployStatus: 'repo_available',
      upgradeDeployReason: 'UPGRADE_REPO_AVAILABLE',
    });
  });
});
