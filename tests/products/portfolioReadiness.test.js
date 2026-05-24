import { describe, expect, it } from 'vitest';
import {
  productUpgradeReadiness,
  registeredConfigForProduct,
  summarizePortfolioUpgradeReadiness,
} from '../../src/lib/products/portfolioReadiness.js';

describe('portfolioReadiness', () => {
  it('uses registered product upgrade config when product rows omit deployment fields', () => {
    const config = registeredConfigForProduct({ name: 'SAIGE', live_url: 'https://saigeplatform.com' });
    expect(config?.upgrade_repo).toContain('saige-v2');

    const readiness = productUpgradeReadiness({ name: 'SAIGE', live_url: 'https://saigeplatform.com' });
    expect(readiness).toMatchObject({
      ready: true,
      readyLabel: 'YES',
      upgradeRepoLabel: 'Provisioned',
      deploymentLabel: 'Deployed',
    });
  });

  it('reports missing readiness honestly for products without upgrade targets', () => {
    const readiness = productUpgradeReadiness({ name: 'Example', live_url: 'https://example.com' });
    expect(readiness).toMatchObject({
      ready: false,
      readyLabel: 'NO',
      upgradeRepoLabel: 'Missing',
      deploymentLabel: 'Missing',
    });
  });

  it('summarizes ready product count for portfolio tables', () => {
    const summary = summarizePortfolioUpgradeReadiness([
      { name: 'SAIGE', live_url: 'https://saigeplatform.com' },
      { name: 'Example', live_url: 'https://example.com' },
    ]);

    expect(summary.readyCount).toBe(1);
    expect(summary.totalCount).toBe(2);
  });
});
