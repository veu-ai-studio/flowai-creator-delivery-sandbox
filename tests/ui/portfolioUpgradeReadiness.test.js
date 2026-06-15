import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registrySrc = readFileSync(resolve(__dirname, '../../src/pages/ProductRegistry.jsx'), 'utf8');
const portfolioSrc = readFileSync(resolve(__dirname, '../../src/pages/PortfolioDashboard.jsx'), 'utf8');
const mainDashboardSrc = readFileSync(resolve(__dirname, '../../src/pages/MainDashboard.jsx'), 'utf8');

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

  it('surfaces ProductSSOT-backed scores in Product Registry and Main Dashboard', () => {
    expect(registrySrc).toContain("import { deriveSlug, normalizeScore } from '@/lib/products/registry'");
    expect(registrySrc).toContain('function productFromApiRow(product = {})');
    expect(registrySrc).toContain('Array.isArray(apiProducts?.items) ? apiProducts.items : asArray(apiProducts)');
    expect(registrySrc).toContain('setProducts(apiProductRows.map(productFromApiRow))');
    expect(registrySrc).toContain('const productScore = (product) => {');
    expect(registrySrc).toContain('const score = product?.last_score ?? product?.last_audit_score');
    expect(registrySrc).toContain('const score = productScore(p)');
    expect(registrySrc).not.toContain('registryRow?.last_score');
    expect(registrySrc).not.toContain('productScore(p, reg)');
    expect(registrySrc).toContain('{score}/10');
    expect(registrySrc).not.toContain('const VEU_SEED');
    expect(registrySrc).not.toContain('https://saigeplatform.com');

    expect(mainDashboardSrc).toContain("import { listProducts, normalizeScore, deriveSlug } from '@/lib/products/registry'");
    expect(mainDashboardSrc).toContain('function dashboardProductFromRegistry(product)');
    expect(mainDashboardSrc).toContain("listProducts({ sort: '-updated_at', limit: 20 })");
    expect(mainDashboardSrc).not.toContain('base44.entities.ProductRegistry.list');
  });
});
