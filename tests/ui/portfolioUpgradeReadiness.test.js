import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registrySrc = readFileSync(resolve(__dirname, '../../src/pages/ProductRegistry.jsx'), 'utf8');
const portfolioSrc = readFileSync(resolve(__dirname, '../../src/pages/PortfolioDashboard.jsx'), 'utf8');

describe('portfolio upgrade readiness UI', () => {
  it('shows readiness columns in Product Registry', () => {
    expect(registrySrc).toContain("import { productUpgradeReadiness } from '@/lib/products/portfolioReadiness'");
    expect(registrySrc).toContain('Upgrade Repo');
    expect(registrySrc).toContain('Deployment');
    expect(registrySrc).toContain('Ready');
    expect(registrySrc).toContain('const readiness = productUpgradeReadiness(p, reg)');
  });

  it('shows portfolio readiness summary and table in Portfolio Dashboard', () => {
    expect(portfolioSrc).toContain('summarizePortfolioUpgradeReadiness');
    expect(portfolioSrc).toContain('Upgrade Ready');
    expect(portfolioSrc).toContain('Portfolio Upgrade Readiness');
    expect(portfolioSrc).toContain('const readiness = productUpgradeReadiness(product)');
    expect(portfolioSrc).toContain('stats.upgradeReady');
  });
});
